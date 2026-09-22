import { prisma } from '../prisma.js';

export const logAudit = async (event) => {
  const logEntry = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    actorId: event.actorId || 'u-1',
    actorName: event.actorName || 'System',
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
  const newActivity = {
    id: activity.id || `act-${Date.now()}`,
    type: activity.type || 'Note',
    description: activity.description || 'Logged CRM activity',
    timestamp: new Date().toISOString(),
    actorId: activity.actorId || 'u-1',
    actorName: activity.actorName || 'Alex Vance',
    linkedType: activity.linkedType || 'Deal',
    linkedId: activity.linkedId || '',
    linkedTitle: activity.linkedTitle || 'General',
  };
  return await prisma.activity.create({ data: newActivity });
};
