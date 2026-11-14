import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { COLLECTIONS, invalid, recordFilters } from './recordQuery.js';
import { getLocalDateString, getLocalDateStringAfterDays } from '../utils/dateUtils.js';

export function recordFacets(resource, actor) {
  const today = getLocalDateString();
  const stale = getLocalDateStringAfterDays(-10);
  if (resource === 'leads') return Prisma.sql`
    count(*)::int AS "All", count(*) FILTER (WHERE r."ownerId" = ${actor.id})::int AS "MyLeads",
    count(*) FILTER (WHERE r."isOutbound" IS TRUE)::int AS "Outbound",
    count(*) FILTER (WHERE r."isOutbound" IS FALSE)::int AS "Inbound",
    count(*) FILTER (WHERE r.status = 'New')::int AS "New",
    count(*) FILTER (WHERE r."isRecurring" AND NOT r."recurrencePaused" AND (r."nextRecurrenceDate" < ${today} OR r."nextFollowUpDate" < ${today}))::int AS overdue,
    count(*) FILTER (WHERE r."isRecurring" AND NOT r."recurrencePaused" AND (r."lastRecurringReviewDate" IS NULL OR r."lastRecurringReviewDate" < ${today.slice(0, 7) + '-01'}))::int AS missing,
    count(*) FILTER (WHERE r."isRecurring" AND r."ownerId" IS NULL)::int AS unassigned,
    count(*) FILTER (WHERE r."isRecurring" AND EXISTS (
      SELECT 1 FROM "RecurringLeadFollowUp" rf
      WHERE rf."leadId" = r.id AND rf.status = 'overdue'
    ))::int AS overdue_followups`;
  if (resource === 'deals') return Prisma.sql`
    count(*)::int AS "All", count(*) FILTER (WHERE r."ownerId" = ${actor.id})::int AS "MyDeals",
    count(*) FILTER (WHERE r."lastActivityDate" <= ${stale})::int AS "Stale",
    count(*) FILTER (WHERE r."daysInStage" >= 15)::int AS "Aging",
    count(*) FILTER (WHERE r.status NOT IN ('Won', 'Lost') AND r."expectedCloseDate" < ${today})::int AS "Overdue",
    count(*) FILTER (WHERE r.status = 'Renewal Due' OR r."isRecurring" OR EXISTS (SELECT 1 FROM "Stage" fs WHERE fs.id = r."stageId" AND fs.category = 'Buy Again'))::int AS "Renewals"`;
  if (resource === 'tasks') return Prisma.sql`
    count(*) FILTER (WHERE r.status IN ('pending', 'overdue') AND r.type <> 'Approval' AND r."stageGateCheckId" IS NULL)::int AS followups,
    count(*) FILTER (WHERE r.status = 'pending' AND (r.type = 'Approval' OR r."stageGateCheckId" IS NOT NULL))::int AS approvals,
    count(*) FILTER (WHERE r.status IN ('pending', 'overdue') AND r.type <> 'Approval' AND r."dueDate" < ${today})::int AS overdue,
    count(*) FILTER (WHERE r.status IN ('pending', 'overdue') AND r.type <> 'Approval' AND left(r."dueDate", 10) = ${today})::int AS today,
    count(*) FILTER (WHERE r.status = 'pending' AND r.type <> 'Approval' AND (left(r."dueDate", 10) > ${today} OR r."dueDate" IS NULL OR r."dueDate" = ''))::int AS upcoming,
    count(*) FILTER (WHERE r.status IN ('completed', 'done'))::int AS completed`;
  return Prisma.sql`count(*)::int AS "All"`;
}

export async function listRecordsPage(resource, actor, query = {}) {
  const { cursor = '', limit = 50, sort = 'id' } = query;
  const pageSize = Number(limit);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw invalid('Use a page size from 1 to 100.');
  const filters = recordFilters(resource, actor, query);
  const sortExpressions = {
    'title-asc': { expression: Prisma.sql`lower(COALESCE(r.title, ''))`, descending: false },
    'title-desc': { expression: Prisma.sql`lower(COALESCE(r.title, ''))`, descending: true },
    'status-asc': { expression: Prisma.sql`lower(COALESCE(r.status, ''))`, descending: false },
    'recurrence-asc': { expression: Prisma.sql`COALESCE(r."nextRecurrenceDate", '9999-12-31')`, descending: false },
  };
  const selectedSort = resource === 'leads' ? sortExpressions[sort] : null;
  const recentSort = sort === 'recent' && ['notes', 'activities', 'audit-logs', 'stageGateChecks'].includes(resource);
  if (!selectedSort && !['id'].includes(sort) && !recentSort) throw invalid('Choose a valid sort order.');
  let boundary = Prisma.sql`r.id > ${cursor}`;
  let order = Prisma.sql`r.id ASC`;
  if (selectedSort) {
    const { expression, descending } = selectedSort;
    order = descending ? Prisma.sql`${expression} DESC, r.id ASC` : Prisma.sql`${expression} ASC, r.id ASC`;
    boundary = Prisma.sql`TRUE`;
    if (cursor) {
      let value;
      try { value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')); } catch { throw invalid('Invalid lead cursor.'); }
      if (!Array.isArray(value) || value.length !== 2 || value.some(item => typeof item !== 'string')) throw invalid('Invalid lead cursor.');
      boundary = descending ? Prisma.sql`(${expression} < ${value[0]} OR (${expression} = ${value[0]} AND r.id > ${value[1]}))`
        : Prisma.sql`(${expression} > ${value[0]} OR (${expression} = ${value[0]} AND r.id > ${value[1]}))`;
    }
  }
  if (recentSort) {
    order = Prisma.sql`COALESCE(r.timestamp, '') DESC, r.id ASC`;
    boundary = Prisma.sql`TRUE`;
    if (cursor) {
      let value;
      try { value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')); } catch { throw invalid('Invalid activity cursor.'); }
      if (!Array.isArray(value) || value.length !== 2 || value.some(item => typeof item !== 'string')) throw invalid('Invalid activity cursor.');
      boundary = Prisma.sql`(COALESCE(r.timestamp, '') < ${value[0]} OR (COALESCE(r.timestamp, '') = ${value[0]} AND r.id > ${value[1]}))`;
    }
  }
  const table = Prisma.raw('"' + COLLECTIONS[resource][0] + '"');
  const { quick: _quick, queue: _queue, showCompleted: _completed, recurrenceView: _recurrenceView, ...facetQuery } = query;
  const facetFilters = recordFilters(resource, actor, facetQuery);
  const managed = ['Admin', 'Manager'].includes(actor.role);
  const related = resource === 'leads' ? Prisma.sql`,
    (SELECT to_jsonb(d) FROM "Deal" d WHERE d."leadId" = r.id
      AND (${managed} OR d."ownerId" = ${actor.id}) ORDER BY d."isRebuy" ASC, d.id ASC LIMIT 1) AS "primaryDeal",
    (SELECT jsonb_build_object(
      'id', f.id, 'cycleNumber', f."cycleNumber", 'dueDate', f."dueDate",
      'status', f.status, 'assigneeId', f."assigneeId"
    ) FROM "RecurringLeadFollowUp" f
      WHERE f."leadId" = r.id AND f.status IN ('pending', 'overdue')
        AND (${managed} OR f."assigneeId" = ${actor.id})
      ORDER BY f."dueDate" ASC, f."createdAt" ASC LIMIT 1) AS "activeRecurringFollowUp",
    EXISTS (SELECT 1 FROM "RecurringLeadFollowUp" rf
      WHERE rf."leadId" = r.id AND rf.status = 'overdue') AS "hasOverdueFollowUp"`
    : resource === 'contacts' ? Prisma.sql`, (SELECT to_jsonb(d) FROM "Deal" d WHERE d."contactId" = r.id
      AND (${managed} OR d."ownerId" = ${actor.id}) ORDER BY d."isRebuy" ASC, d.id ASC LIMIT 1) AS "primaryDeal"`
    : resource === 'tasks' ? Prisma.sql`, (SELECT f.id FROM "RecurringLeadFollowUp" f WHERE f."taskId" = r.id LIMIT 1) AS "recurringFollowUpId"`
    : resource === 'companies' ? Prisma.sql`,
      (SELECT count(*)::int FROM "Contact" ct WHERE ct."companyId" = r.id AND (${managed} OR ct."ownerId" = ${actor.id})) AS "contactCount",
      (SELECT count(*)::int FROM "Deal" d WHERE d."companyId" = r.id AND (${managed} OR d."ownerId" = ${actor.id})) AS "dealCount",
      (SELECT COALESCE(sum(d.value), 0)::float8 FROM "Deal" d WHERE d."companyId" = r.id AND (${managed} OR d."ownerId" = ${actor.id})) AS "dealValue"`
    : Prisma.empty;
  const [rows, counts, facets, stageTotals] = await prisma.$transaction([
    prisma.$queryRaw(Prisma.sql`SELECT r.* ${related} FROM ${table} r WHERE ${Prisma.join(filters, ' AND ')} AND ${boundary} ORDER BY ${order} LIMIT ${pageSize + 1}`),
    prisma.$queryRaw(Prisma.sql`SELECT count(*)::int AS total FROM ${table} r WHERE ${Prisma.join(filters, ' AND ')}`),
    prisma.$queryRaw(Prisma.sql`SELECT ${recordFacets(resource, actor)} FROM ${table} r WHERE ${Prisma.join(facetFilters, ' AND ')}`),
    prisma.$queryRaw(resource === 'deals' ? Prisma.sql`SELECT r."stageId", count(*)::int AS count, COALESCE(sum(value),0)::float8 AS value FROM ${table} r WHERE ${Prisma.join(filters, ' AND ')} GROUP BY r."stageId"` : Prisma.sql`SELECT NULL WHERE FALSE`),
  ], { isolationLevel: 'RepeatableRead' });
  const items = rows.slice(0, pageSize);
  const last = items.at(-1);
  const sortValue = selectedSort && last
    ? sort === 'title-asc' || sort === 'title-desc' ? (last.title || '').toLowerCase()
      : sort === 'status-asc' ? (last.status || '').toLowerCase()
        : last.nextRecurrenceDate || '9999-12-31'
    : null;
  return { items, total: counts[0].total, facets: facets[0], stageTotals,
    nextCursor: rows.length > pageSize ? selectedSort
      ? Buffer.from(JSON.stringify([sortValue, last.id])).toString('base64url') : recentSort
      ? Buffer.from(JSON.stringify([last.timestamp || '', last.id])).toString('base64url') : last.id : null };
}
