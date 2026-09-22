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
import { normalizeStageColor } from '../constants/stageConstants.js';

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
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
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
    color: normalizeStageColor(stg.color, stg.name)
  }));

  return {
    branding: branding || initialBranding,
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
  // Re-seed all tables directly in PostgreSQL
  await prisma.branding.upsert({
    where: { id: 'default' },
    update: initialBranding,
    create: { id: 'default', ...initialBranding }
  });

  for (const u of initialUsers) await prisma.user.upsert({ where: { id: u.id }, update: u, create: u });
  for (const s of initialStages) await prisma.stage.upsert({ where: { id: s.id }, update: s, create: s });
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
