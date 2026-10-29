import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { recordVisibility, invalid } from './recordQuery.js';
import { canManageTeam } from '../../shared/accessPolicy.js';
import { getLocalDateString, getLocalDateStringAfterDays } from '../utils/dateUtils.js';

function queueQuery(actor) {
  const today = getLocalDateString();
  const week = getLocalDateStringAfterDays(7);
  const stale = getLocalDateStringAfterDays(-10);
  const tasks = recordVisibility('tasks', actor);
  const deals = recordVisibility('deals', actor);
  return Prisma.sql`
    SELECT 'overdue' AS kind, r.id, to_jsonb(r) AS record FROM "Task" r WHERE ${tasks}
      AND r.status = 'pending' AND r.type <> 'Approval' AND r."dueDate" < ${today}
    UNION ALL SELECT 'approval', r.id, to_jsonb(r) FROM "Task" r WHERE ${tasks}
      AND r.status = 'pending' AND r.type = 'Approval'
    UNION ALL SELECT 'closing', r.id, to_jsonb(r) FROM "Deal" r WHERE ${deals}
      AND r.status = 'Active' AND r."expectedCloseDate" BETWEEN ${today} AND ${week}
    UNION ALL SELECT 'renewal', r.id, to_jsonb(r) FROM "Deal" r WHERE ${deals}
      AND (r.status = 'Renewal Due' OR EXISTS (SELECT 1 FROM "Stage" st WHERE st.id = r."stageId" AND st.category = 'Buy Again'))
    UNION ALL SELECT 'stale', r.id, to_jsonb(r) FROM "Deal" r WHERE ${deals}
      AND r.status = 'Active' AND r."lastActivityDate" <= ${stale}`;
}

export async function getWorkspaceSummary(actor) {
  const today = getLocalDateString();
  const stale = getLocalDateStringAfterDays(-10);
  const [leadRows, dealRows, taskRows, activityRows, stageTotals, queues, ownerRows] = await prisma.$transaction([
    prisma.$queryRaw(Prisma.sql`SELECT count(*)::int AS "totalLeads",
      count(*) FILTER (WHERE r."isOutbound")::int AS "outboundLeadsCount" FROM "Lead" r WHERE ${recordVisibility('leads', actor)}`),
    prisma.$queryRaw(Prisma.sql`SELECT count(*) FILTER (WHERE status = 'Active')::int AS "activeDealCount",
      COALESCE(sum(value) FILTER (WHERE status = 'Active'), 0)::float8 AS "totalPipelineValue",
      count(*) FILTER (WHERE status = 'Won')::int AS "wonCount",
      COALESCE(sum(value) FILTER (WHERE status = 'Won'), 0)::float8 AS "wonRevenue",
      count(*) FILTER (WHERE status = 'Renewal Due' OR EXISTS (SELECT 1 FROM "Stage" st WHERE st.id = r."stageId" AND st.category = 'Buy Again'))::int AS "renewalsDueCount",
      COALESCE(sum(value) FILTER (WHERE status = 'Renewal Due' OR EXISTS (SELECT 1 FROM "Stage" st WHERE st.id = r."stageId" AND st.category = 'Buy Again')), 0)::float8 AS "renewalsDueValue",
      count(*) FILTER (WHERE status NOT IN ('Won', 'Lost') AND ("lastActivityDate" <= ${stale} OR "daysInStage" >= 15 OR "expectedCloseDate" < ${today}))::int AS "atRiskCount",
      COALESCE(sum(value) FILTER (WHERE status NOT IN ('Won', 'Lost') AND ("lastActivityDate" <= ${stale} OR "daysInStage" >= 15 OR "expectedCloseDate" < ${today})), 0)::float8 AS "totalAtRiskValue"
      FROM "Deal" r WHERE ${recordVisibility('deals', actor)}`),
    prisma.$queryRaw(Prisma.sql`SELECT count(*) FILTER (WHERE status = 'pending' AND "ownerId" = ${actor.id})::int AS "pendingTasksCount",
      count(*) FILTER (WHERE status = 'pending' AND left("dueDate",10) <= ${today})::int AS "pendingTasksToday"
      FROM "Task" r WHERE ${recordVisibility('tasks', actor)}`),
    prisma.$queryRaw(Prisma.sql`SELECT count(*) FILTER (WHERE type = 'Outbound Call')::int AS "outboundCalls",
      count(*) FILTER (WHERE type = 'Outbound Email')::int AS "outboundEmails",
      count(*) FILTER (WHERE type = 'Sample Sent')::int AS "samplesSent"
      FROM "Activity" r WHERE ${recordVisibility('activities', actor)} AND left(COALESCE(timestamp,"createdAt"), 10) = ${today}`),
    prisma.$queryRaw(Prisma.sql`SELECT "stageId", count(*)::int AS count, COALESCE(sum(value), 0)::float8 AS value FROM "Deal" r WHERE ${recordVisibility('deals', actor)} GROUP BY "stageId"`),
    prisma.$queryRaw(Prisma.sql`WITH queue AS (${queueQuery(actor)}) SELECT kind, count(*)::int AS count FROM queue GROUP BY kind`),
    prisma.$queryRaw(Prisma.sql`SELECT u.id,
      (SELECT count(*)::int FROM "Lead" r WHERE r."ownerId" = u.id AND ${recordVisibility('leads', actor)}) AS leads,
      (SELECT count(*)::int FROM "Deal" r WHERE r."ownerId" = u.id AND status NOT IN ('Won','Lost') AND ${recordVisibility('deals', actor)}) AS deals,
      (SELECT COALESCE(sum(value),0)::float8 FROM "Deal" r WHERE r."ownerId" = u.id AND status NOT IN ('Won','Lost') AND ${recordVisibility('deals', actor)}) AS value FROM "User" u
      WHERE (${canManageTeam(actor)} OR u.id = ${actor.id})`),
  ], { isolationLevel: 'RepeatableRead' });
  const queueCounts = Object.fromEntries(queues.map(row => [row.kind, row.count]));
  queueCounts.all = queues.reduce((sum, row) => sum + row.count, 0);
  return { ...leadRows[0], ...dealRows[0], ...taskRows[0], ...activityRows[0], stageTotals, queueCounts, ownerStats: ownerRows };
}

export async function listDashboardQueue(actor, { type = 'all', cursor = '', limit = 25 } = {}) {
  const category = { all: null, overdue: 'overdue', approvals: 'approval', closing: 'closing', renewals: 'renewal', stale: 'stale' };
  const pageSize = Number(limit);
  if (!Object.hasOwn(category, type) || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100 || typeof cursor !== 'string' || cursor.length > 256) throw invalid('Choose a valid queue and page size.');
  const kind = category[type];
  const [rows, countRows] = await prisma.$transaction([
    prisma.$queryRaw(Prisma.sql`WITH queue AS (${queueQuery(actor)}) SELECT *, kind || ':' || id AS key FROM queue
      WHERE (${kind}::text IS NULL OR kind = ${kind}) AND kind || ':' || id > ${cursor} ORDER BY kind, id LIMIT ${pageSize + 1}`),
    prisma.$queryRaw(Prisma.sql`WITH queue AS (${queueQuery(actor)}) SELECT count(*)::int AS total FROM queue WHERE (${kind}::text IS NULL OR kind = ${kind})`),
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
