import { actorContext } from '../auth/identity.js';
import { prisma } from '../prisma.js';
import { randomUUID } from 'node:crypto';
import { validatedInput, noteSchema, activitySchema } from '../middleware/validation.js';
import { saveActivityFollowUp } from './activityFollowUpService.js';

async function requireLinkedRecord(tx, type, id) {
  if (!id) return;
  const model = { Deal: tx.deal, Lead: tx.lead, Contact: tx.contact, Company: tx.company }[type];
  if (!model || !await model.findUnique({ where: { id }, select: { id: true } })) {
    throw Object.assign(new Error('Choose an existing linked record.'), { statusCode: 400 });
  }
}

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
  note = validatedInput(noteSchema, note);
  const newNote = {
    id: note.id || `nt-${randomUUID()}`,
    text: note.text || '',
    timestamp: new Date().toISOString(),
    authorId: note.authorId || 'u-1',
    authorName: note.authorName || 'Alex Vance',
    linkedType: note.linkedType || 'Contact',
    linkedId: note.linkedId || '',
  };
  return prisma.$transaction(async tx => {
    await requireLinkedRecord(tx, newNote.linkedType, newNote.linkedId);
    return tx.note.create({ data: newNote });
  });
};

export const getActivities = async () => {
  return await prisma.activity.findMany({
    orderBy: { timestamp: 'desc' }
  });
};

export const createActivity = async (activity) => {
  activity = validatedInput(activitySchema, activity);
  const todayStr = new Date().toISOString().split('T')[0];
  const newActivity = {
    id: activity.id || `act-${randomUUID()}`,
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

  if (activity.followUp) return saveActivityFollowUp(newActivity, activity.followUp);
  return prisma.$transaction(async tx => {
    await requireLinkedRecord(tx, newActivity.linkedType, newActivity.linkedId);
    if (newActivity.stageId && !await tx.stage.findUnique({ where: { id: newActivity.stageId } })) {
      throw Object.assign(new Error('Choose an existing stage.'), { statusCode: 400 });
    }
    const saved = await tx.activity.create({ data: newActivity });
    const model = { Deal: tx.deal, Lead: tx.lead }[newActivity.linkedType];
    if (model && newActivity.linkedId) await model.update({ where: { id: newActivity.linkedId }, data: { lastActivityDate: todayStr } });
    return saved;
  });
};

export const deleteActivity = async (id) => {
  const existing = await prisma.activity.findUnique({ where: { id } });
  if (!existing) return false;
  throw Object.assign(new Error('Activity history cannot be deleted.'), { statusCode: 409 });
};
