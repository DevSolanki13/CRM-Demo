import { randomUUID } from 'node:crypto';
import { getScopedState, getStateCollections } from '../services/systemService.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { prisma } from '../prisma.js';

const collections = { Company: 'companies', Contact: 'contacts', Lead: 'leads', Deal: 'deals', Task: 'tasks' };
const managed = user => ['Admin', 'Manager'].includes(user.role);
const ids = rows => new Set(rows.map(row => row.id));

export function canReadEntity(state, type, id) {
  const collection = collections[type];
  return Boolean(collection && state[collection]?.some(row => row.id === id));
}

export function scopeState(state, user) {
  if (managed(user)) return state;
  const leads = state.leads.filter(row => row.ownerId === user.id);
  const deals = state.deals.filter(row => row.ownerId === user.id);
  const contacts = state.contacts.filter(row => row.ownerId === user.id);
  const companyIds = new Set([...deals, ...contacts].map(row => row.companyId).filter(Boolean));
  const companies = state.companies.filter(row => row.ownerId === user.id || companyIds.has(row.id));
  const visible = { ...state, leads, deals, contacts, companies };
  const tasks = state.tasks.filter(row => row.ownerId === user.id && (!row.linkedId || canReadEntity(visible, row.linkedType, row.linkedId)));
  visible.tasks = tasks;
  const related = row => row.linkedId ? canReadEntity(visible, row.linkedType, row.linkedId) : row.authorId === user.id;
  const leadIds = ids(leads);
  const dealIds = ids(deals);
  return {
    ...visible,
    notes: state.notes.filter(related),
    activities: state.activities.filter(related),
    stageGateChecks: state.stageGateChecks.filter(row => dealIds.has(row.dealId) || leadIds.has(row.dealId)),
    auditLogs: state.auditLogs.filter(row => canReadEntity(visible, row.entityType, row.entityId)),
  };
}

const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };

// Writes only need the records named in the request. Loading every customer,
// task and audit row for an access check grows with the entire workspace.
export async function visibleRecord(type, id, user) {
  if (typeof id !== 'string' || !id) return null;
  const privileged = managed(user);
  if (type === 'Company') return prisma.company.findFirst({ where: {
    id, ...(privileged ? {} : { OR: [
      { ownerId: user.id }, { contacts: { some: { ownerId: user.id } } },
      { deals: { some: { ownerId: user.id } } },
    ] }),
  }, select: { id: true, ownerId: true } });
  const model = { Contact: prisma.contact, Lead: prisma.lead, Deal: prisma.deal }[type];
  if (model) return model.findFirst({ where: { id, ...(privileged ? {} : { ownerId: user.id }) },
    select: { id: true, ownerId: true } });
  if (type === 'Task') {
    const task = await prisma.task.findUnique({ where: { id },
      select: { id: true, ownerId: true, type: true, stageGateCheckId: true, linkedType: true, linkedId: true } });
    if (!task || (privileged ? false : task.ownerId !== user.id)) return null;
    if (!privileged && task.linkedId && !await visibleRecord(task.linkedType, task.linkedId, user)) return null;
    return task;
  }
  return null;
}

async function visibleActivity(id, user) {
  const activity = await prisma.activity.findUnique({ where: { id },
    select: { id: true, linkedType: true, linkedId: true, authorId: true } });
  if (!activity || managed(user)) return activity;
  if (activity.linkedId) return await visibleRecord(activity.linkedType, activity.linkedId, user) ? activity : null;
  return activity.authorId === user.id ? activity : null;
}

async function visibleApproval(id, user) {
  const approval = await prisma.stageGateCheck.findUnique({ where: { id },
    select: { id: true, dealId: true } });
  if (!approval || managed(user)) return approval;
  return await visibleRecord('Deal', approval.dealId, user) ? approval : null;
}

// This policy applies before every CRM route. New resources must be added here
// explicitly; they do not inherit unrestricted access by accident.
export const authorizeCRM = asyncHandler(async (req, _res, next) => {
  const [resource, id, action] = req.path.split('/').filter(Boolean);
  const write = !['GET', 'HEAD'].includes(req.method);
  const known = ['state', 'branding', 'companies', 'contacts', 'leads', 'stages', 'pipelines', 'deals', 'audit-logs', 'tasks', 'notes', 'activities', 'attachments', 'users', 'stage-gate-checks', 'import', 'timeline', 'settings'];
  if (!known.includes(resource)) fail(404, 'API endpoint not found');
  const adminOnly = (resource === 'state' && write) || resource === 'branding' || resource === 'settings' || (resource === 'stages' && write) || (resource === 'pipelines' && write) || (resource === 'users' && write);
  if (adminOnly && req.user.role !== 'Admin') fail(403, 'Administrator permission required');
  if (((resource === 'stage-gate-checks' && ['approve', 'reject'].includes(action)) || (resource === 'deals' && id === 'check-renewals')) && !managed(req.user)) fail(403, 'Manager permission required');

  // Collection reads query only the requested collection. The timeline still
  // needs its related records to filter individual events for sales reps.
  const readCollection = {
    companies: 'companies', contacts: 'contacts', leads: 'leads',
    stages: 'stages', pipelines: 'pipelines', deals: 'deals', 'audit-logs': 'auditLogs',
    tasks: 'tasks', notes: 'notes', activities: 'activities',
    users: 'users', 'stage-gate-checks': 'stageGateChecks',
  }[resource];
  const state = write ? null : resource === 'timeline' ? await getScopedState(req.user)
    : readCollection ? await getStateCollections(req.user, [readCollection]) : {};
  if (state) req.crmState = state;
  const assertVisible = async (type, entityId) => {
    const record = write ? await visibleRecord(type, entityId, req.user)
      : canReadEntity(state, type, entityId) ? { id: entityId } : null;
    if (!record) fail(404, 'Record not found');
    return record;
  };
  const resourceType = { companies: 'Company', contacts: 'Contact', leads: 'Lead', deals: 'Deal', tasks: 'Task' }[resource];
  const resourceRecord = resourceType && id && id !== 'check-renewals' && id !== 'duplicates'
    ? await assertVisible(resourceType, id) : null;
  if (action === 'merge' && ['companies', 'contacts'].includes(resource)) {
    if (!managed(req.user)) fail(403, 'Manager permission required to merge customer records');
    await assertVisible(resourceType, req.body?.sourceId);
  }
  if (resource === 'companies' && id && write && !managed(req.user) && resourceRecord.ownerId !== req.user.id) fail(403, 'Only the company owner or a manager can change this company');
  if (resource === 'activities' && id && !(write ? await visibleActivity(id, req.user) : state.activities.some(row => row.id === id))) fail(404, 'Activity not found');
  if (resource === 'stage-gate-checks' && id && !(write ? await visibleApproval(id, req.user) : state.stageGateChecks.some(row => row.id === id))) fail(404, 'Approval request not found');
  if (resource === 'timeline') {
    const { entityType, entityId } = req.query;
    if (typeof entityType !== 'string' || typeof entityId !== 'string') fail(400, 'entityType and entityId are required');
    await assertVisible(entityType, entityId);
  }
  if (!write) return next();
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) fail(400, 'A JSON object is required');

  // Import uses upserts: disallow foreign IDs even when they are supplied inside
  // an array, then allocate fresh IDs so an import cannot overwrite other work.
  if (resource === 'import') {
    if (id !== 'contacts' || !Array.isArray(req.body.items) || req.body.items.length > 1000) fail(400, 'Provide at most 1000 contacts');
    for (const item of req.body.items) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) fail(400, 'Invalid contact');
      if (item.companyId) await assertVisible('Company', item.companyId);
      await assignOwner(item, req.user, true);
      item.id = randomUUID();
    }
    return next();
  }
  for (const [key, type] of Object.entries({ companyId: 'Company', contactId: 'Contact', leadId: 'Lead', parentDealId: 'Deal', dealId: 'Deal' })) {
    if (req.body[key]) await assertVisible(type, req.body[key]);
  }
  if (['notes', 'activities', 'tasks'].includes(resource)) {
    const old = resource === 'tasks' ? resourceRecord : null;
    const linkedId = req.body.linkedId ?? old?.linkedId ?? req.body.dealId ?? req.body.leadId;
    const linkedType = req.body.linkedType ?? old?.linkedType ?? (req.body.leadId ? 'Lead' : 'Deal');
    if (linkedId) await assertVisible(linkedType, linkedId);
    if (resource === 'tasks' && !managed(req.user) && (old?.type === 'Approval' || req.body.type === 'Approval' || old?.stageGateCheckId || req.body.stageGateCheckId)) fail(403, 'Approval tasks are managed by the approval workflow');
  }
  if (['contacts', 'leads', 'deals', 'companies', 'tasks'].includes(resource) && !action && id !== 'check-renewals') {
    await assignOwner(req.body, req.user, !id);
  }
  if (!id && req.method === 'POST' && !['pipelines', 'attachments'].includes(resource)) req.body.id = randomUUID();
  if (id) delete req.body.id;
  // These fields are never authoritative, regardless of caller role.
  for (const key of ['actorId', 'actorName', 'userId', 'updatedById', 'updatedByName', 'authorId', 'authorName', 'reviewedBy', 'reviewedByName', 'submittedBy', 'submittedByName', 'user', 'reviewer']) delete req.body[key];
  next();
});

async function assignOwner(body, user, creating) {
  if (!managed(user)) {
    body.ownerId = user.id;
    body.ownerName = user.name;
    if ('assignedToId' in body) body.assignedToId = user.id;
    if ('assignedToName' in body) body.assignedToName = user.name;
  } else if (creating || 'ownerId' in body || 'assignedToId' in body) {
    const owner = await prisma.user.findFirst({ where: {
      id: body.ownerId || body.assignedToId || user.id, active: true,
    }, select: { id: true, name: true } });
    if (!owner) fail(400, 'Choose an active record owner');
    body.ownerId = owner.id;
    body.ownerName = owner.name;
    if ('assignedToId' in body) body.assignedToId = owner.id;
    if ('assignedToName' in body) body.assignedToName = owner.name;
  }
}
