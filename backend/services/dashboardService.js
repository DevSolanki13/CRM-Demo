import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { recordVisibility, invalid } from './recordQuery.js';
import { canManageTeam } from '../../shared/accessPolicy.js';
import { getLocalDateString, getLocalDateStringAfterDays } from '../utils/dateUtils.js';

function getMockFilters(showMockData) {
  if (showMockData) {
    return {
      lead: Prisma.empty,
      deal: Prisma.empty,
      task: Prisma.empty,
      activity: Prisma.empty,
    };
  }
  const mockDealIds = Prisma.sql`('dl-1', 'dl-2', 'dl-3', 'dl-4', 'dl-5', 'dl-6', 'dl-7', 'dl-8', 'dl-8-parent', 'dl-9')`;
  const mockLeadIds = Prisma.sql`('ld-1', 'ld-2', 'ld-3', 'ld-4', 'ld-5', 'ld-6', 'ld-7', 'ld-8', 'ld-9')`;
  const mockCompanyIds = Prisma.sql`('c-1', 'c-2', 'c-3', 'c-4', 'c-5', 'c-6', 'c-7', 'c-8', 'c-9')`;
  const mockTaskIds = Prisma.sql`('tsk-1', 'tsk-2', 'tsk-3', 'tsk-4', 'tsk-5', 'tsk-appr-1', 'tsk-appr-2', 'tsk-ld6-1', 'tsk-ld6-2', 'tsk-ld7-1', 'tsk-ld7-2', 'tsk-ld9-1', 'tsk-ld5-1', 'tsk-ld4-1')`;

  return {
    lead: Prisma.sql`AND (r."isRecurring" = true OR r.id NOT IN ${mockLeadIds})`,
    deal: Prisma.sql`AND r.id NOT IN ${mockDealIds} AND (r."leadId" IS NULL OR r."leadId" NOT IN ${mockLeadIds}) AND (r."companyId" IS NULL OR r."companyId" NOT IN ${mockCompanyIds})`,
    task: Prisma.sql`AND (r.id LIKE 'recurrence%' OR (r.id NOT IN ${mockTaskIds} AND (r."linkedId" IS NULL OR (r."linkedId" NOT IN ${mockDealIds} AND r."linkedId" NOT IN ${mockLeadIds} AND r."linkedId" NOT IN ${mockCompanyIds}))))`,
    activity: Prisma.sql`AND (r."linkedId" IS NULL OR (r."linkedId" NOT IN ${mockDealIds} AND r."linkedId" NOT IN ${mockLeadIds} AND r."linkedId" NOT IN ${mockCompanyIds}))`,
  };
}

function queueQuery(actor, showMockData = false) {
  const today = getLocalDateString();
  const week = getLocalDateStringAfterDays(7);
  const stale = getLocalDateStringAfterDays(-10);
  const tasks = recordVisibility('tasks', actor);
  const deals = recordVisibility('deals', actor);
  const mockFilters = getMockFilters(showMockData);
  return Prisma.sql`
    SELECT 'overdue' AS kind, r.id, to_jsonb(r) AS record FROM "Task" r WHERE ${tasks} ${mockFilters.task}
      AND r.status IN ('pending', 'overdue') AND r.type <> 'Approval' AND r."dueDate" < ${today}
    UNION ALL SELECT 'approval', r.id, to_jsonb(r) FROM "Task" r WHERE ${tasks} ${mockFilters.task}
      AND r.status = 'pending' AND r.type = 'Approval'
    UNION ALL SELECT 'closing', r.id, to_jsonb(r) FROM "Deal" r WHERE ${deals} ${mockFilters.deal}
      AND r.status = 'Active' AND r."expectedCloseDate" BETWEEN ${today} AND ${week}
    UNION ALL SELECT 'renewal', r.id, to_jsonb(r) FROM "Deal" r WHERE ${deals} ${mockFilters.deal}
      AND (r.status = 'Renewal Due' OR EXISTS (SELECT 1 FROM "Stage" st WHERE st.id = r."stageId" AND st.category = 'Buy Again'))
    UNION ALL SELECT 'renewal', r.id, to_jsonb(r) AS record FROM "Lead" r WHERE ${recordVisibility('leads', actor)} ${mockFilters.lead}
      AND r."isRecurring" = true AND NOT r."recurrencePaused"
      AND (r."nextRecurrenceDate" <= ${today} OR r."nextFollowUpDate" <= ${today})
      AND NOT EXISTS (SELECT 1 FROM (SELECT r.* FROM "Deal" r WHERE ${deals} ${mockFilters.deal}) d WHERE d."leadId" = r.id)
    UNION ALL SELECT 'stale', r.id, to_jsonb(r) FROM "Deal" r WHERE ${deals} ${mockFilters.deal}
      AND r.status = 'Active' AND r."lastActivityDate" <= ${stale}`;
}

export async function getWorkspaceSummary(actor, options = {}) {
  const showMockData = options.showMockData !== undefined
    ? options.showMockData === 'true' || options.showMockData === true
    : false;
  const mockFilters = getMockFilters(showMockData);
  const today = getLocalDateString();
  const stale = getLocalDateStringAfterDays(-10);
  const [leadRows, dealRows, taskRows, activityRows, stageTotals, queues, ownerRows] = await prisma.$transaction([
    prisma.$queryRaw(Prisma.sql`SELECT count(*)::int AS "totalLeads",
      count(*) FILTER (WHERE r."isOutbound")::int AS "outboundLeadsCount" FROM "Lead" r WHERE ${recordVisibility('leads', actor)} ${mockFilters.lead}`),
    prisma.$queryRaw(Prisma.sql`
      WITH deal_summary AS (
        SELECT count(*) FILTER (WHERE status = 'Active')::int AS "activeDealCount",
          COALESCE(sum(value) FILTER (WHERE status = 'Active'), 0)::float8 AS "totalPipelineValue",
          count(*) FILTER (WHERE status = 'Won')::int AS "wonCount",
          COALESCE(sum(value) FILTER (WHERE status = 'Won'), 0)::float8 AS "wonRevenue",
          count(*) FILTER (WHERE status = 'Renewal Due' OR EXISTS (SELECT 1 FROM "Stage" st WHERE st.id = r."stageId" AND st.category = 'Buy Again'))::int AS "dealRenewalsCount",
          COALESCE(sum(value) FILTER (WHERE status = 'Renewal Due' OR EXISTS (SELECT 1 FROM "Stage" st WHERE st.id = r."stageId" AND st.category = 'Buy Again')), 0)::float8 AS "renewalsDueValue",
          count(*) FILTER (WHERE status NOT IN ('Won', 'Lost') AND ("lastActivityDate" <= ${stale} OR "daysInStage" >= 15 OR "expectedCloseDate" < ${today}))::int AS "atRiskCount",
          COALESCE(sum(value) FILTER (WHERE status NOT IN ('Won', 'Lost') AND ("lastActivityDate" <= ${stale} OR "daysInStage" >= 15 OR "expectedCloseDate" < ${today})), 0)::float8 AS "totalAtRiskValue"
        FROM "Deal" r WHERE ${recordVisibility('deals', actor)} ${mockFilters.deal}
      ),
      recurring_summary AS (
        SELECT
          count(*) FILTER (WHERE NOT r."recurrencePaused" AND (r."nextRecurrenceDate" <= ${today} OR r."nextFollowUpDate" <= ${today}))::int AS "recurringDueCount",
          count(*) FILTER (WHERE NOT r."recurrencePaused" AND r."recurrenceState" NOT IN ('purchased', 'not_buying'))::int AS "totalRecurringCount"
        FROM "Lead" r
        WHERE r."isRecurring" = true
          AND ${recordVisibility('leads', actor)} ${mockFilters.lead}
          AND NOT EXISTS (
            SELECT 1 FROM (SELECT r.* FROM "Deal" r
              WHERE ${recordVisibility('deals', actor)} ${mockFilters.deal}) d
            WHERE d."leadId" = r.id
          )
      )
      SELECT
        (ds."activeDealCount" + rs."totalRecurringCount")::int AS "activeDealCount",
        ds."totalPipelineValue",
        ds."wonCount",
        ds."wonRevenue",
        (ds."dealRenewalsCount" + rs."recurringDueCount")::int AS "renewalsDueCount",
        ds."renewalsDueValue",
        ds."atRiskCount",
        ds."totalAtRiskValue"
      FROM deal_summary ds, recurring_summary rs`),
    prisma.$queryRaw(Prisma.sql`SELECT count(*) FILTER (WHERE status IN ('pending', 'overdue') AND "ownerId" = ${actor.id})::int AS "pendingTasksCount",
      count(*) FILTER (WHERE status IN ('pending', 'overdue') AND left("dueDate",10) <= ${today})::int AS "pendingTasksToday"
      FROM "Task" r WHERE ${recordVisibility('tasks', actor)} ${mockFilters.task}`),
    prisma.$queryRaw(Prisma.sql`SELECT count(*) FILTER (WHERE type = 'Outbound Call')::int AS "outboundCalls",
      count(*) FILTER (WHERE type = 'Outbound Email')::int AS "outboundEmails",
      count(*) FILTER (WHERE type = 'Sample Sent')::int AS "samplesSent"
      FROM "Activity" r WHERE ${recordVisibility('activities', actor)} ${mockFilters.activity} AND left(COALESCE(timestamp,"createdAt"), 10) = ${today}`),
    prisma.$queryRaw(Prisma.sql`
      WITH deal_stages AS (
        SELECT r."stageId", count(*)::int AS count, COALESCE(sum(r.value), 0)::float8 AS value
        FROM "Deal" r
        WHERE ${recordVisibility('deals', actor)} ${mockFilters.deal}
        GROUP BY r."stageId"
      ),
      recurring_counts AS (
        SELECT
          count(*) FILTER (WHERE NOT r."recurrencePaused" AND r."recurrenceState" NOT IN ('purchased', 'not_buying'))::int AS renewal_count,
          count(*) FILTER (WHERE r."recurrenceState" = 'purchased')::int AS won_count,
          count(*) FILTER (WHERE r."recurrenceState" = 'not_buying')::int AS lost_count
        FROM "Lead" r
        WHERE r."isRecurring" = true
          AND ${recordVisibility('leads', actor)} ${mockFilters.lead}
          AND NOT EXISTS (
            SELECT 1 FROM (SELECT r.* FROM "Deal" r
              WHERE ${recordVisibility('deals', actor)} ${mockFilters.deal}) d
            WHERE d."leadId" = r.id
          )
      )
      SELECT
        s.id AS "stageId",
        (
          COALESCE(ds.count, 0) +
          CASE
            WHEN s.category = 'Buy Again' OR s.id = 'stg-7' THEN COALESCE(rc.renewal_count, 0)
            WHEN s.category = 'Won' OR s.id = 'stg-6' THEN COALESCE(rc.won_count, 0)
            WHEN s.category = 'Lost' OR s.id = 'stg-8' THEN COALESCE(rc.lost_count, 0)
            ELSE 0
          END
        )::int AS count,
        COALESCE(ds.value, 0)::float8 AS value
      FROM "Stage" s
      CROSS JOIN recurring_counts rc
      LEFT JOIN deal_stages ds ON ds."stageId" = s.id`),
    prisma.$queryRaw(Prisma.sql`WITH queue AS (${queueQuery(actor, showMockData)}) SELECT kind, count(*)::int AS count FROM queue GROUP BY kind`),
    prisma.$queryRaw(Prisma.sql`SELECT u.id,
      (SELECT count(*)::int FROM "Lead" r WHERE r."ownerId" = u.id AND ${recordVisibility('leads', actor)} ${mockFilters.lead}) AS leads,
      (SELECT count(*)::int FROM "Deal" r WHERE r."ownerId" = u.id AND status NOT IN ('Won','Lost') AND ${recordVisibility('deals', actor)} ${mockFilters.deal}) AS deals,
      (SELECT COALESCE(sum(value),0)::float8 FROM "Deal" r WHERE r."ownerId" = u.id AND status NOT IN ('Won','Lost') AND ${recordVisibility('deals', actor)} ${mockFilters.deal}) AS value FROM "User" u
      WHERE (${canManageTeam(actor)} OR u.id = ${actor.id})`),
  ], { isolationLevel: 'RepeatableRead' });
  const queueCounts = Object.fromEntries(queues.map(row => [row.kind, row.count]));
  queueCounts.all = queues.reduce((sum, row) => sum + row.count, 0);
  return { ...leadRows[0], ...dealRows[0], ...taskRows[0], ...activityRows[0], stageTotals, queueCounts, ownerStats: ownerRows };
}

export async function listDashboardQueue(actor, { type = 'all', cursor = '', limit = 25, showMockData: queryShowMock } = {}) {
  const showMockData = queryShowMock !== undefined
    ? queryShowMock === 'true' || queryShowMock === true
    : false;
  const category = { all: null, overdue: 'overdue', approvals: 'approval', closing: 'closing', renewals: 'renewal', stale: 'stale' };
  const pageSize = Number(limit);
  if (!Object.hasOwn(category, type) || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100 || typeof cursor !== 'string' || cursor.length > 256) throw invalid('Choose a valid queue and page size.');
  const kind = category[type];
  const [rows, countRows] = await prisma.$transaction([
    prisma.$queryRaw(Prisma.sql`WITH queue AS (${queueQuery(actor, showMockData)}) SELECT *, kind || ':' || id AS key FROM queue
      WHERE (${kind}::text IS NULL OR kind = ${kind}) AND kind || ':' || id > ${cursor} ORDER BY kind, id LIMIT ${pageSize + 1}`),
    prisma.$queryRaw(Prisma.sql`WITH queue AS (${queueQuery(actor, showMockData)}) SELECT count(*)::int AS total FROM queue WHERE (${kind}::text IS NULL OR kind = ${kind})`),
  ], { isolationLevel: 'RepeatableRead' });
  const today = getLocalDateString();
  const labels = { overdue: 'Overdue Follow-Up', approval: 'Pending Approval', closing: 'Closing Soon', renewal: 'Renewal Due', stale: 'No Recent Activity' };
  const items = rows.slice(0, pageSize).map(({ record, kind, key }) => ({
    id: record.id, key, type: kind, raw: record, categoryLabel: labels[kind], title: record.title,
    subtitle: record.linkedTitle || record.companyName || record.stageName || '',
    meta: kind === 'overdue' ? `${Math.max(1, Math.floor((new Date(today) - new Date(record.dueDate)) / 86400000))}d overdue`
      : kind === 'closing' ? `Closes ${record.expectedCloseDate}` : kind === 'stale' ? `Last touch ${record.lastActivityDate}`
      : kind === 'approval' ? 'Awaiting sign-off' : 'Cycle mature',
    urgency: ['overdue', 'approval'].includes(kind) ? 'high' : 'medium',
    targetTab: ['overdue', 'approval'].includes(kind) ? 'tasks' : 'pipeline',
    entityType: record.linkedType || 'Deal', entityId: record.linkedId || record.id,
  }));
  return { items, total: countRows[0].total, nextCursor: rows.length > pageSize ? rows[pageSize - 1].key : null };
}
