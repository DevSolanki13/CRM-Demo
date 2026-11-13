import { Prisma } from '@prisma/client';
import { getLocalDateString, getLocalDateStringAfterDays } from '../utils/dateUtils.js';

export const COLLECTIONS = {
  companies: ['Company', ['name', 'industry', 'website']],
  contacts: ['Contact', ['name', 'email', 'phone', 'companyName']],
  leads: ['Lead', ['title', 'contactName', 'companyName', 'contactEmail', 'contactPhone', 'alternatePhone', 'location', 'category']],
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
    'recurring', 'recurrenceDate', 'type', 'queue', 'showCompleted', 'linkedType', 'linkedId', 'leadId',
    'companyId', 'contactId', 'id', 'sort', 'recurrenceView', 'showMockData'];
  if (Object.keys(query).some(key => !supported.includes(key)) || Object.entries(query)
    .some(([key, value]) => key !== 'limit' && (typeof value !== 'string' || value.length > (key === 'cursor' ? 2048 : 256)))) {
    throw invalid('Use supported text filters of up to 256 characters.');
  }

  // Demo records stay hidden unless a caller explicitly opts in. Recurring
  // leads are always actual data and remain visible.
  if (query.showMockData !== 'true') {
    const mockDealIds = Prisma.sql`('dl-1', 'dl-2', 'dl-3', 'dl-4', 'dl-5', 'dl-6', 'dl-7', 'dl-8', 'dl-8-parent', 'dl-9')`;
    const mockLeadIds = Prisma.sql`('ld-1', 'ld-2', 'ld-3', 'ld-4', 'ld-5', 'ld-6', 'ld-7', 'ld-8', 'ld-9')`;
    const mockTaskIds = Prisma.sql`('tsk-1', 'tsk-2', 'tsk-3', 'tsk-4', 'tsk-5', 'tsk-appr-1', 'tsk-appr-2', 'tsk-ld6-1', 'tsk-ld6-2', 'tsk-ld7-1', 'tsk-ld7-2', 'tsk-ld9-1', 'tsk-ld5-1', 'tsk-ld4-1')`;
    const mockCompanyIds = Prisma.sql`('c-1', 'c-2', 'c-3', 'c-4', 'c-5', 'c-6', 'c-7', 'c-8', 'c-9')`;
    const mockContactIds = Prisma.sql`('cnt-1', 'cnt-2', 'cnt-3', 'cnt-4', 'cnt-5', 'cnt-6', 'cnt-7', 'cnt-8', 'cnt-9')`;

    if (resource === 'leads') {
      filters.push(Prisma.sql`(r."isRecurring" = true OR r.id NOT IN ${mockLeadIds})`);
    } else if (resource === 'deals') {
      filters.push(Prisma.sql`r.id NOT IN ${mockDealIds} AND (r."leadId" IS NULL OR r."leadId" NOT IN ${mockLeadIds}) AND (r."companyId" IS NULL OR r."companyId" NOT IN ${mockCompanyIds})`);
    } else if (resource === 'tasks') {
      filters.push(Prisma.sql`(r.id LIKE 'recurrence%' OR (r.id NOT IN ${mockTaskIds} AND (r."linkedId" IS NULL OR (r."linkedId" NOT IN ${mockDealIds} AND r."linkedId" NOT IN ${mockLeadIds} AND r."linkedId" NOT IN ${mockCompanyIds}))))`);
    } else if (resource === 'companies') {
      filters.push(Prisma.sql`r.id NOT IN ${mockCompanyIds}`);
    } else if (resource === 'contacts') {
      filters.push(Prisma.sql`r.id NOT IN ${mockContactIds}`);
    } else if (resource === 'activities') {
      filters.push(Prisma.sql`(r."linkedId" IS NULL OR (r."linkedId" NOT IN ${mockDealIds} AND r."linkedId" NOT IN ${mockLeadIds} AND r."linkedId" NOT IN ${mockCompanyIds}))`);
    }
  }
  const { q = '', owner, status, stage, pipeline, source, quick, recurring, recurrenceDate, type, queue, showCompleted } = query;
  const requireResource = (choices, label) => {
    if (!choices.includes(resource)) throw invalid(`${label} filtering is unavailable for this collection.`);
  };
  if (q.trim()) filters.push(Prisma.sql`(${Prisma.join(COLLECTIONS[resource][1].map(field =>
    Prisma.sql`strpos(lower(COALESCE(${col(field)}, '')), lower(${q.trim()})) > 0`), ' OR ')})`);
  if (owner && owner !== 'All') {
    requireResource(['companies', 'contacts', 'leads', 'deals', 'tasks'], 'Owner');
    filters.push(owner === '__unassigned'
      ? Prisma.sql`NULLIF(r."ownerId", '') IS NULL`
      : Prisma.sql`r."ownerId" = ${owner}`);
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
  if (recurring && recurring !== 'All') {
    requireResource(['leads'], 'Recurring lead');
    if (!['true', 'false'].includes(recurring)) throw invalid('Use true or false for recurring leads.');
    filters.push(Prisma.sql`r."isRecurring" = ${recurring === 'true'}`);
  }
  if (recurrenceDate && recurrenceDate !== 'All') {
    requireResource(['leads'], 'Recurrence date');
    filters.push(Prisma.sql`r."recurrenceDate" = ${recurrenceDate}`);
  }
  if (query.recurrenceView && query.recurrenceView !== 'All') {
    requireResource(['leads'], 'Recurring view');
    const today = getLocalDateString();
    const views = {
      overdue: Prisma.sql`NOT r."recurrencePaused" AND (r."nextRecurrenceDate" < ${today} OR r."nextFollowUpDate" < ${today})`,
      today: Prisma.sql`NOT r."recurrencePaused" AND (r."nextRecurrenceDate" = ${today} OR r."nextFollowUpDate" = ${today})`,
      upcoming: Prisma.sql`NOT r."recurrencePaused" AND r."nextRecurrenceDate" >= ${today} AND r."nextRecurrenceDate" <= ${getLocalDateStringAfterDays(10)}`,
      awaiting: Prisma.sql`NOT r."recurrencePaused" AND r."recurrenceState" <> 'confirmed'`,
      missing: Prisma.sql`NOT r."recurrencePaused" AND (r."lastRecurringReviewDate" IS NULL OR r."lastRecurringReviewDate" < ${today.slice(0, 7) + '-01'})`,
      paused: Prisma.sql`r."recurrencePaused"`,
      unassigned: Prisma.sql`r."ownerId" IS NULL`,
    };
    if (!views[query.recurrenceView]) throw invalid('Choose a valid recurring view.');
    filters.push(Prisma.sql`r."isRecurring" = TRUE`, views[query.recurrenceView]);
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
