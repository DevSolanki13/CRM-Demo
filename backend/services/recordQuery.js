import { Prisma } from '@prisma/client';
import { getLocalDateString, getLocalDateStringAfterDays } from '../utils/dateUtils.js';

export const COLLECTIONS = {
  companies: ['Company', ['name', 'industry', 'website']],
  contacts: ['Contact', ['name', 'email', 'phone', 'companyName']],
  leads: ['Lead', ['title', 'contactName', 'companyName', 'contactEmail', 'contactPhone']],
  deals: ['Deal', ['title', 'companyName', 'contactName']],
  tasks: ['Task', ['title', 'linkedTitle', 'note']],
  notes: ['Note', ['text']],
  activities: ['Activity', ['description', 'linkedTitle', 'type']],
  'audit-logs': ['AuditLog', ['entityTitle', 'reason', 'action', 'actorName']],
  stageGateChecks: ['StageGateCheck', ['dealTitle', 'note', 'submittedByName']],
};
export const invalid = message => Object.assign(new Error(message), { statusCode: 400 });
const col = name => Prisma.raw(`r."${name}"`);

// Identifiers are fixed application constants. All user values are parameters.
export function recordVisibility(resource, actor) {
  if (['Admin', 'Manager'].includes(actor.role)) return Prisma.sql`TRUE`;
  const companyAccess = alias => Prisma.sql`(${Prisma.raw(`${alias}."ownerId"`)} = ${actor.id}
    OR EXISTS (SELECT 1 FROM "Deal" vd WHERE vd."companyId" = ${Prisma.raw(`${alias}.id`)} AND vd."ownerId" = ${actor.id})
    OR EXISTS (SELECT 1 FROM "Contact" vc WHERE vc."companyId" = ${Prisma.raw(`${alias}.id`)} AND vc."ownerId" = ${actor.id}))`;
  if (resource === 'companies') return companyAccess('r');
  if (['contacts', 'leads', 'deals'].includes(resource)) return Prisma.sql`r."ownerId" = ${actor.id}`;
  if (resource === 'stageGateChecks') return Prisma.sql`EXISTS (SELECT 1 FROM "Deal" vd WHERE vd.id = r."dealId" AND vd."ownerId" = ${actor.id})`;
  const type = col(resource === 'audit-logs' ? 'entityType' : 'linkedType');
  const id = col(resource === 'audit-logs' ? 'entityId' : 'linkedId');
  const linked = Prisma.sql`(
    (${type} = 'Deal' AND EXISTS (SELECT 1 FROM "Deal" vd WHERE vd.id = ${id} AND vd."ownerId" = ${actor.id}))
    OR (${type} = 'Lead' AND EXISTS (SELECT 1 FROM "Lead" vl WHERE vl.id = ${id} AND vl."ownerId" = ${actor.id}))
    OR (${type} = 'Contact' AND EXISTS (SELECT 1 FROM "Contact" vc WHERE vc.id = ${id} AND vc."ownerId" = ${actor.id}))
    OR (${type} = 'Company' AND EXISTS (SELECT 1 FROM "Company" co WHERE co.id = ${id} AND ${companyAccess('co')})))`;
  if (resource === 'tasks') return Prisma.sql`r."ownerId" = ${actor.id} AND (${id} IS NULL OR ${id} = '' OR ${linked})`;
  if (resource === 'audit-logs') return linked;
  return Prisma.sql`(${linked} OR ((${id} IS NULL OR ${id} = '') AND r."authorId" = ${actor.id}))`;
}

export function recordFilters(resource, actor, query = {}) {
  if (!COLLECTIONS[resource]) throw Object.assign(new Error('Unknown record collection.'), { statusCode: 404 });
  const filters = [recordVisibility(resource, actor)];
  const supported = ['cursor', 'limit', 'q', 'owner', 'status', 'stage', 'pipeline', 'source', 'quick',
    'type', 'queue', 'showCompleted', 'linkedType', 'linkedId', 'leadId', 'companyId', 'contactId', 'id', 'sort'];
  if (Object.keys(query).some(key => !supported.includes(key)) || Object.entries(query)
    .some(([key, value]) => key !== 'limit' && (typeof value !== 'string' || value.length > (key === 'cursor' ? 2048 : 256)))) {
    throw invalid('Use supported text filters of up to 256 characters.');
  }
  const { q = '', owner, status, stage, pipeline, source, quick, type, queue, showCompleted } = query;
  const requireResource = (choices, label) => {
    if (!choices.includes(resource)) throw invalid(`${label} filtering is unavailable for this collection.`);
  };
  if (q.trim()) filters.push(Prisma.sql`(${Prisma.join(COLLECTIONS[resource][1].map(field =>
    Prisma.sql`strpos(lower(COALESCE(${col(field)}, '')), lower(${q.trim()})) > 0`), ' OR ')})`);
  if (owner && owner !== 'All') {
    requireResource(['companies', 'contacts', 'leads', 'deals', 'tasks'], 'Owner');
    filters.push(Prisma.sql`r."ownerId" = ${owner}`);
  }
  if (status && status !== 'All') {
    requireResource(['leads', 'deals', 'tasks', 'stageGateChecks'], 'Status');
    filters.push(Prisma.sql`r.status = ${status}`);
  }
  if (pipeline && pipeline !== 'All') {
    requireResource(['deals', 'leads'], 'Pipeline');
    filters.push(resource === 'deals' ? Prisma.sql`r."pipelineId" = ${pipeline}`
      : Prisma.sql`EXISTS (SELECT 1 FROM "Deal" pd WHERE pd."leadId" = r.id AND pd."pipelineId" = ${pipeline})`);
  }
  if (stage && stage !== 'All') {
    requireResource(['deals', 'leads'], 'Stage');
    filters.push(resource === 'deals' ? Prisma.sql`r."stageId" = ${stage}`
      : Prisma.sql`EXISTS (SELECT 1 FROM "Deal" sd WHERE sd."leadId" = r.id AND sd."stageId" = ${stage})`);
  }
  if (source && source !== 'All') {
    requireResource(['leads'], 'Source');
    filters.push(source === 'Outbound' ? Prisma.sql`r."isOutbound"`
      : source === 'Inbound' ? Prisma.sql`NOT r."isOutbound"` : Prisma.sql`r.source = ${source}`);
  }
  if (quick && quick !== 'All') {
    if ((resource === 'leads' && quick === 'MyLeads') || (resource === 'deals' && quick === 'MyDeals')) filters.push(Prisma.sql`r."ownerId" = ${actor.id}`);
    else if (resource === 'leads' && ['Outbound', 'Inbound'].includes(quick)) filters.push(Prisma.sql`r."isOutbound" = ${quick === 'Outbound'}`);
    else if (resource === 'leads' && quick === 'New') filters.push(Prisma.sql`r.status = 'New'`);
    else if (resource === 'deals' && quick === 'Stale') filters.push(Prisma.sql`r."lastActivityDate" <= ${getLocalDateStringAfterDays(-10)}`);
    else if (resource === 'deals' && quick === 'Aging') filters.push(Prisma.sql`r."daysInStage" >= 15`);
    else if (resource === 'deals' && quick === 'Overdue') filters.push(Prisma.sql`r.status NOT IN ('Won', 'Lost') AND r."expectedCloseDate" < ${getLocalDateString()}`);
    else if (resource === 'deals' && quick === 'Renewals') filters.push(Prisma.sql`(r.status = 'Renewal Due' OR r."isRecurring" OR EXISTS (SELECT 1 FROM "Stage" rs WHERE rs.id = r."stageId" AND rs.category = 'Buy Again'))`);
    else throw invalid('Choose a valid quick filter.');
  }
  if (type && type !== 'All') {
    requireResource(['tasks', 'activities'], 'Type');
    filters.push(Prisma.sql`r.type = ${type}`);
  }
  if (queue) {
    if (resource !== 'tasks' || !['approvals', 'followups'].includes(queue)) throw invalid('Choose a valid task queue.');
    filters.push(queue === 'approvals' ? Prisma.sql`(r.type = 'Approval' OR r."stageGateCheckId" IS NOT NULL)`
      : Prisma.sql`r.type <> 'Approval' AND r."stageGateCheckId" IS NULL`);
  }
  if (showCompleted !== undefined) {
    if (resource !== 'tasks' || !['true', 'false'].includes(showCompleted)) throw invalid('Use true or false for completed tasks.');
    if (showCompleted === 'false') filters.push(Prisma.sql`r.status = 'pending'`);
  }
  for (const field of ['linkedType', 'linkedId', 'leadId', 'companyId', 'contactId', 'id']) {
    if (!query[field]) continue;
    const valid = field === 'id' || (['linkedType', 'linkedId'].includes(field) && ['tasks', 'notes', 'activities'].includes(resource)) ||
      (field === 'companyId' && ['contacts', 'deals'].includes(resource)) || (['leadId', 'contactId'].includes(field) && resource === 'deals');
    if (!valid) throw invalid(`The ${field} filter is unavailable for this collection.`);
    filters.push(Prisma.sql`${col(field)} = ${query[field]}`);
  }
  return filters;
}
