import { validatedInput, brandingSchema } from '../middleware/validation.js';
import { PUBLIC_USER_SELECT } from '../auth/identity.js';
import { canManageTeam } from '../../shared/accessPolicy.js';
import { prisma } from '../prisma.js';
import {
  initialBranding,
  initialUsers,
  initialStages,
  initialCompanies,
  initialContacts,
  initialLeads,
  initialDeals,
  initialTasks,
  initialNotes,
  initialActivities,
  initialStageGateChecks,
  initialAuditLogs,
} from '../data/initialData.js';
import { normalizeStageColor, stageCode } from '../constants/stageConstants.js';
import { listRecordsPage } from './paginatedRecords.js';

async function allVisiblePages(resource, user) {
  const rows = [];
  let cursor = '';
  do {
    const page = await listRecordsPage(resource, user, { cursor, limit: 100 });
    rows.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return rows;
}

export const STATE_COLLECTIONS = ['branding', 'users', 'stages', 'companies', 'contacts',
  'leads', 'deals', 'tasks', 'notes', 'activities', 'stageGateChecks', 'auditLogs', 'pipelines'];

export async function getStateCollections(user, requested = STATE_COLLECTIONS) {
  const pages = {};
  const pageCollection = (resource, key = resource) => async () => {
    const page = await listRecordsPage(resource, user, { limit: 50 });
    pages[key] = { total: page.total, nextCursor: page.nextCursor };
    return page.items;
  };
  const queries = {
    branding: () => prisma.branding.findUnique({ where: { id: 'default' } }),
    users: () => prisma.user.findMany({ where: canManageTeam(user) ? {} : { id: user.id },
      orderBy: { name: 'asc' }, select: PUBLIC_USER_SELECT }),
    stages: () => prisma.stage.findMany({ orderBy: { order: 'asc' } }),
    pipelines: () => prisma.pipeline.findMany({ orderBy: { name: 'asc' } }),
    companies: pageCollection('companies'), contacts: pageCollection('contacts'),
    leads: pageCollection('leads'), deals: pageCollection('deals'), tasks: pageCollection('tasks'),
    notes: pageCollection('notes'), activities: pageCollection('activities'),
    auditLogs: pageCollection('audit-logs', 'auditLogs'), stageGateChecks: pageCollection('stageGateChecks'),
  };
  const values = await Promise.all(requested.map(key => queries[key]()));
  const result = { ...Object.fromEntries(requested.map((key, index) => [key, values[index]])), _pages: pages };
  if ('branding' in result) result.branding ||= initialBranding;
  if ('stages' in result) result.stages = result.stages.map(stage => ({ ...stage,
    code: stageCode(stage), color: normalizeStageColor(stage.color, stage.name) }));
  return result;
}

export const getScopedState = async (user) => {
  const [branding, users, stages, companies, contacts, leads, deals,
    tasks, notes, activities, auditLogs] = await Promise.all([
    prisma.branding.findUnique({ where: { id: 'default' } }),
    prisma.user.findMany({ where: canManageTeam(user) ? {} : { id: user.id },
      orderBy: { name: 'asc' }, select: PUBLIC_USER_SELECT }),
    prisma.stage.findMany({ orderBy: { order: 'asc' } }),
    ...['companies', 'contacts', 'leads', 'deals', 'tasks', 'notes', 'activities', 'audit-logs']
      .map(resource => allVisiblePages(resource, user)),
  ]);
  const visibleIds = [...deals, ...leads].map(row => row.id);
  const stageGateChecks = await prisma.stageGateCheck.findMany({
    where: { dealId: { in: visibleIds } }, orderBy: { timestamp: 'desc' }
  });
  return {
    branding: branding || initialBranding, users,
    pipelines: await prisma.pipeline.findMany({ orderBy: { name: 'asc' } }),
    stages: stages.map(stage => ({ ...stage, code: stageCode(stage),
      color: normalizeStageColor(stage.color, stage.name) })),
    companies, contacts, leads, deals, tasks, notes, activities, stageGateChecks, auditLogs,
  };
};

export const getState = async () => {
  const [
    branding,
    users,
    stages,
    companies,
    contacts,
    leads,
    deals,
    tasks,
    notes,
    activities,
    stageGateChecks,
    auditLogs
  ] = await Promise.all([
    prisma.branding.findUnique({ where: { id: 'default' } }),
    prisma.user.findMany({ orderBy: { name: 'asc' }, select: PUBLIC_USER_SELECT }),
    prisma.stage.findMany({ orderBy: { order: 'asc' } }),
    prisma.company.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.contact.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.lead.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.deal.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.task.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.note.findMany({ orderBy: { timestamp: 'desc' } }),
    prisma.activity.findMany({ orderBy: { timestamp: 'desc' } }),
    prisma.stageGateCheck.findMany({ orderBy: { timestamp: 'desc' } }),
    prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' } })
  ]);

  const normalizedStages = (stages || []).map(stg => ({
    ...stg,
    code: stageCode(stg),
    color: normalizeStageColor(stg.color, stg.name)
  }));

  return {
    branding: branding || initialBranding,
    pipelines: await prisma.pipeline.findMany({ orderBy: { name: 'asc' } }),
    users: users || [],
    stages: normalizedStages,
    companies: companies || [],
    contacts: contacts || [],
    leads: leads || [],
    deals: deals || [],
    tasks: tasks || [],
    notes: notes || [],
    activities: activities || [],
    stageGateChecks: stageGateChecks || [],
    auditLogs: auditLogs || [],
  };
};

export const resetState = async () => {
  // Demo data may only be installed into a genuinely empty workspace. An
  // upsert against real records can overwrite customer and audit history.
  const existingRows = await Promise.all([
    prisma.company.count(), prisma.contact.count(), prisma.lead.count(),
    prisma.deal.count(), prisma.task.count(), prisma.note.count(),
    prisma.activity.count(), prisma.stageGateCheck.count(), prisma.auditLog.count(),
  ]);
  if (existingRows.some(Boolean)) {
    throw Object.assign(new Error('The workspace contains records or history. Reset is only available before first use.'),
      { statusCode: 409 });
  }
  await prisma.branding.upsert({
    where: { id: 'default' },
    update: initialBranding,
    create: { id: 'default', ...initialBranding }
  });

  for (const u of initialUsers) await prisma.user.upsert({ where: { id: u.id }, update: u, create: u });
  for (const s of initialStages) {
    const data = { ...s, pipelineId: 'pipeline-sales', code: stageCode(s) };
    await prisma.stage.upsert({ where: { id: s.id }, update: data, create: data });
  }
  for (const c of initialCompanies) await prisma.company.upsert({ where: { id: c.id }, update: c, create: c });
  for (const cnt of initialContacts) await prisma.contact.upsert({ where: { id: cnt.id }, update: cnt, create: cnt });
  for (const ld of initialLeads) await prisma.lead.upsert({ where: { id: ld.id }, update: ld, create: ld });
  for (const dl of initialDeals) await prisma.deal.upsert({ where: { id: dl.id }, update: dl, create: dl });
  for (const t of initialTasks) await prisma.task.upsert({ where: { id: t.id }, update: t, create: t });
  for (const n of initialNotes) await prisma.note.upsert({ where: { id: n.id }, update: n, create: n });
  for (const a of initialActivities) await prisma.activity.upsert({ where: { id: a.id }, update: a, create: a });
  for (const sgc of initialStageGateChecks) await prisma.stageGateCheck.upsert({ where: { id: sgc.id }, update: sgc, create: sgc });
  for (const aud of initialAuditLogs) await prisma.auditLog.upsert({ where: { id: aud.id }, update: aud, create: aud });

  return await getState();
};

export const updateBranding = async (partialBranding) => {
  partialBranding = validatedInput(brandingSchema, partialBranding);
  const current = await prisma.branding.findUnique({ where: { id: 'default' } });
  const updated = {
    ...(current || initialBranding),
    ...partialBranding,
    id: 'default',
  };

  return await prisma.branding.upsert({
    where: { id: 'default' },
    update: updated,
    create: updated,
  });
};
