import { prisma } from '../prisma.js';
import { getLocalDateString } from '../utils/dateUtils.js';
import { logAudit } from './activityNoteService.js';
import { triggerFollowUp } from './followUpEngine.js';

const LEAD_FIELDS = new Set([
  'id', 'title', 'contactName', 'contactEmail', 'contactPhone', 'companyName',
  'source', 'isOutbound', 'status', 'ownerId', 'ownerName', 'createdAt',
  'lastActivityDate', 'pendingGateCheck', 'customFields'
]);

const validateLeadFields = (lead) => {
  const unknown = Object.keys(lead).find(key => !LEAD_FIELDS.has(key));
  if (unknown) throw Object.assign(new Error(`Unknown lead field: ${unknown}`), { statusCode: 400 });
};

export const getLeads = async () => {
  return await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' }
  });
};

export const createLead = async (lead) => {
  validateLeadFields(lead);
  let title = (lead.title || 'New Lead Inquiry').trim();
  if (/^\d+$/.test(title) || !/[a-zA-Z]/.test(title)) {
    title = `Lead #${title}`;
  }

  const todayStr = getLocalDateString();
  const newLead = {
    id: lead.id || `ld-${Date.now()}`,
    title,
    contactName: lead.contactName || 'Unknown Prospect',
    contactEmail: lead.contactEmail || '',
    contactPhone: lead.contactPhone || '',
    companyName: lead.companyName || 'Unspecified Co',
    source: lead.source || 'Inbound Inquiry',
    isOutbound: lead.isOutbound ?? false,
    status: lead.status || 'New',
    ownerId: lead.ownerId || 'u-3',
    ownerName: lead.ownerName || 'Marcus Vance',
    pendingGateCheck: lead.pendingGateCheck || null,
    customFields: lead.customFields ?? {},
    createdAt: lead.createdAt || todayStr,
    lastActivityDate: lead.lastActivityDate || todayStr,
  };

  const savedLead = await prisma.lead.upsert({
    where: { id: newLead.id },
    update: newLead,
    create: newLead,
  });

  // Automatically evaluate follow-up engine rules for new lead creation
  await triggerFollowUp('LEAD_CREATED', savedLead);

  await logAudit({
    actorId: savedLead.ownerId,
    actorName: savedLead.ownerName,
    action: 'LEAD_CREATED',
    entityType: 'Lead',
    entityId: savedLead.id,
    entityTitle: savedLead.title,
    reason: `Lead created from source "${savedLead.source}"`,
    metadata: { source: savedLead.source },
  });

  return savedLead;
};

export const updateLead = async (id, lead) => {
  validateLeadFields(lead);
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) return null;

  let title = lead.title ? lead.title.trim() : existing.title;
  if (/^\d+$/.test(title) || !/[a-zA-Z]/.test(title)) {
    title = `Lead #${title}`;
  }

  return await prisma.lead.update({
    where: { id },
    data: {
      ...existing,
      ...lead,
      title,
      id,
      lastActivityDate: getLocalDateString(),
    }
  });
};

export const deleteLead = async (id) => {
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.task.deleteMany({ where: { linkedId: id } });
  await prisma.activity.deleteMany({ where: { linkedId: id } });
  await prisma.auditLog.deleteMany({ where: { entityId: id } });
  await prisma.lead.delete({ where: { id } });
  return true;
};
