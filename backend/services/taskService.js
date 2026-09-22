import { prisma } from '../prisma.js';
import { getLocalDateString } from '../utils/dateUtils.js';

export const getTasks = async () => {
  return await prisma.task.findMany({
    orderBy: { createdAt: 'desc' }
  });
};

export const createTask = async (task) => {
  const newTask = {
    id: task.id || `tsk-${Date.now()}`,
    title: task.title || 'Follow up action item',
    dueDate: task.dueDate || getLocalDateString(),
    type: task.type || 'Call',
    linkedType: task.linkedType || 'Deal',
    linkedId: task.linkedId || '',
    linkedTitle: task.linkedTitle || 'General',
    ownerId: task.ownerId || 'u-1',
    ownerName: task.ownerName || 'Alex Vance',
    status: task.status || 'pending',
    priority: task.priority || 'Medium',
    completed: task.completed ?? false,
    stageGateCheckId: task.stageGateCheckId || null,
    answers: task.answers || null,
    repObservations: task.repObservations || null,
    submittedBy: task.submittedBy || null,
    submittedByName: task.submittedByName || null,
    submittedAt: task.submittedAt || null,
    reviewedByName: task.reviewedByName || null,
    resolution: task.resolution || null,
    note: task.note || null,
    fromStageName: task.fromStageName || null,
    targetStageName: task.targetStageName || null,
    createdAt: task.createdAt || getLocalDateString(),
  };
  return await prisma.task.upsert({
    where: { id: newTask.id },
    update: newTask,
    create: newTask,
  });
};

export const updateTask = async (id, task) => {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return null;
  return await prisma.task.update({
    where: { id },
    data: {
      ...existing,
      ...task,
      id,
    }
  });
};

export const deleteTask = async (id) => {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.task.delete({ where: { id } });
  return true;
};
