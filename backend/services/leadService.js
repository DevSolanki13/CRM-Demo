import { prisma } from '../prisma.js';
import { getLocalDateString, getLocalDateStringAfterDays } from '../utils/dateUtils.js';
import { createTask } from './taskService.js';
import { logAudit } from './activityNoteService.js';

export const getLeads = async () => {
  return await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' }
  });
};

export const createLead = async (lead) => {
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
    customFields: lead.customFields || {},
    pendingGateCheck: lead.pendingGateCheck || null,
    createdAt: lead.createdAt || todayStr,
    lastActivityDate: lead.lastActivityDate || todayStr,
  };

  const savedLead = await prisma.lead.upsert({
    where: { id: newLead.id },
    update: newLead,
    create: newLead,
  });

  // Automatically create first-contact task when a lead is created
  const tomorrowStr = getLocalDateStringAfterDays(1);
  await createTask({
    title: `First contact outreach for ${savedLead.contactName || savedLead.title}`,
    dueDate: tomorrowStr,
    type: 'Call',
    priority: 'High',
    linkedType: 'Lead',
    linkedId: savedLead.id,
    linkedTitle: savedLead.title,
    ownerId: savedLead.ownerId,
    ownerName: savedLead.ownerName,
    status: 'pending',
    note: `Inbound/outbound lead inquiry via ${savedLead.source}. Initiate first contact.`,
  });

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
  await prisma.lead.delete({ where: { id } });
  return true;
};
