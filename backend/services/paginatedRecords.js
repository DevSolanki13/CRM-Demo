import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { COLLECTIONS, invalid, recordFilters } from './recordQuery.js';
import { getLocalDateString, getLocalDateStringAfterDays } from '../utils/dateUtils.js';

export function recordFacets(resource, actor) {
  const today = getLocalDateString();
  const stale = getLocalDateStringAfterDays(-10);
  if (resource === 'leads') return Prisma.sql`
    count(*)::int AS "All", count(*) FILTER (WHERE r."ownerId" = ${actor.id})::int AS "MyLeads",
    count(*) FILTER (WHERE r."isOutbound")::int AS "Outbound",
    count(*) FILTER (WHERE NOT r."isOutbound")::int AS "Inbound",
    count(*) FILTER (WHERE r.status = 'New')::int AS "New"`;
  if (resource === 'deals') return Prisma.sql`
    count(*)::int AS "All", count(*) FILTER (WHERE r."ownerId" = ${actor.id})::int AS "MyDeals",
    count(*) FILTER (WHERE r."lastActivityDate" <= ${stale})::int AS "Stale",
    count(*) FILTER (WHERE r."daysInStage" >= 15)::int AS "Aging",
    count(*) FILTER (WHERE r.status NOT IN ('Won', 'Lost') AND r."expectedCloseDate" < ${today})::int AS "Overdue",
    count(*) FILTER (WHERE r.status = 'Renewal Due' OR r."isRecurring" OR EXISTS (SELECT 1 FROM "Stage" fs WHERE fs.id = r."stageId" AND fs.category = 'Buy Again'))::int AS "Renewals"`;
  if (resource === 'tasks') return Prisma.sql`
    count(*) FILTER (WHERE r.status = 'pending' AND r.type <> 'Approval' AND r."stageGateCheckId" IS NULL)::int AS followups,
    count(*) FILTER (WHERE r.status = 'pending' AND (r.type = 'Approval' OR r."stageGateCheckId" IS NOT NULL))::int AS approvals,
    count(*) FILTER (WHERE r.status = 'pending' AND r.type <> 'Approval' AND r."dueDate" < ${today})::int AS overdue,
    count(*) FILTER (WHERE r.status = 'pending' AND r.type <> 'Approval' AND left(r."dueDate", 10) = ${today})::int AS today,
    count(*) FILTER (WHERE r.status = 'pending' AND r.type <> 'Approval' AND (left(r."dueDate", 10) > ${today} OR r."dueDate" IS NULL OR r."dueDate" = ''))::int AS upcoming,
    count(*) FILTER (WHERE r.status IN ('completed', 'done'))::int AS completed`;
  return Prisma.sql`count(*)::int AS "All"`;
}

export async function listRecordsPage(resource, actor, query = {}) {
  const { cursor = '', limit = 50, sort = 'id' } = query;
  const pageSize = Number(limit);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw invalid('Use a page size from 1 to 100.');
  const filters = recordFilters(resource, actor, query);
  if (!['id', 'recent'].includes(sort) || (sort === 'recent' && !['notes', 'activities', 'audit-logs', 'stageGateChecks'].includes(resource))) throw invalid('Choose a valid sort order.');
  let boundary = Prisma.sql`r.id > ${cursor}`;
  let order = Prisma.sql`r.id ASC`;
  if (sort === 'recent') {
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
  const { quick: _quick, queue: _queue, showCompleted: _completed, ...facetQuery } = query;
  const facetFilters = recordFilters(resource, actor, facetQuery);
  const managed = ['Admin', 'Manager'].includes(actor.role);
  const related = ['leads', 'contacts'].includes(resource) ? Prisma.sql`, (SELECT to_jsonb(d) FROM "Deal" d WHERE ${resource === 'leads' ? Prisma.sql`d."leadId"` : Prisma.sql`d."contactId"`} = r.id
    AND (${managed} OR d."ownerId" = ${actor.id}) ORDER BY d."isRebuy" ASC, d.id ASC LIMIT 1) AS "primaryDeal"`
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
  return { items, total: counts[0].total, facets: facets[0], stageTotals,
    nextCursor: rows.length > pageSize ? sort === 'recent'
      ? Buffer.from(JSON.stringify([last.timestamp || '', last.id])).toString('base64url') : last.id : null };
}
