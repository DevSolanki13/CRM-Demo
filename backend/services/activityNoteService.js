import { actorContext } from '../auth/identity.js';
import { prisma } from '../prisma.js';

export const logAudit = async (event) => {
  const logEntry = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    actorId: actorContext.getStore()?.id || event.actorId || 'u-1',
    actorName: actorContext.getStore()?.name || event.actorName || 'System',
    action: event.action || 'GENERAL_ACTION',
    entityType: event.entityType || 'General',
    entityId: event.entityId || '',
    entityTitle: event.entityTitle || '',
    fromStage: event.fromStage || null,
    toStage: event.toStage || null,
    reason: event.reason || '',
    metadata: event.metadata || null,
  };
  return await prisma.auditLog.create({ data: logEntry });
};

export const getAuditLogs = async () => {
  return await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' }
  });
};

export const getNotes = async () => {
  return await prisma.note.findMany({
    orderBy: { timestamp: 'desc' }
  });
};

export const createNote = async (note) => {
  const newNote = {
    id: note.id || `nt-${Date.now()}`,
    text: note.text || '',
    timestamp: new Date().toISOString(),
    authorId: note.authorId || 'u-1',
    authorName: note.authorName || 'Alex Vance',
    linkedType: note.linkedType || 'Contact',
    linkedId: note.linkedId || '',
  };
  return await prisma.note.create({ data: newNote });
};

export const getActivities = async () => {
  return await prisma.activity.findMany({
    orderBy: { timestamp: 'desc' }
  });
};

export const createActivity = async (activity) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const newActivity = {
    id: activity.id || `act-${Date.now()}`,
    type: activity.type || 'Note',
    description: activity.description || activity.notes || 'Logged CRM activity',
    timestamp: activity.timestamp || activity.createdAt || new Date().toISOString(),
    authorId: activity.authorId || activity.userId || activity.actorId || 'u-1',
    authorName: activity.authorName || activity.actorName || 'Alex Vance',
    performedByName: activity.performedByName || activity.authorName || activity.actorName || 'Sales Rep',
    assignedToName: activity.assignedToName || null,
    stageId: activity.stageId || null,
    stageName: activity.stageName || null,
    metadata: activity.metadata || null,
    linkedType: activity.linkedType || (activity.dealId ? 'Deal' : activity.leadId ? 'Lead' : 'Deal'),
    linkedId: activity.linkedId || activity.dealId || activity.leadId || '',
    linkedTitle: activity.linkedTitle || 'General',
    isOutbound: activity.isOutbound ?? false,
    createdAt: activity.createdAt || new Date().toISOString()
  };

  const saved = await prisma.activity.create({ data: newActivity });

  // Update lastActivityDate on linked Deal or Lead
  if (newActivity.linkedType === 'Deal' && newActivity.linkedId) {
    try {
      await prisma.deal.update({
        where: { id: newActivity.linkedId },
        data: { lastActivityDate: todayStr }
      });
    } catch {
      // Ignore if deal not found
    }
  } else if (newActivity.linkedType === 'Lead' && newActivity.linkedId) {
    try {
      await prisma.lead.update({
        where: { id: newActivity.linkedId },
        data: { lastActivityDate: todayStr }
      });
    } catch {
      // Ignore if lead not found
    }
  }

  return saved;
};

export const deleteActivity = async (id) => {
  const existing = await prisma.activity.findUnique({ where: { id } });
  if (!existing) return false;
  throw Object.assign(new Error('Activity history cannot be deleted.'), { statusCode: 409 });
};
