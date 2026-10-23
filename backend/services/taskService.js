import { prisma } from '../prisma.js';
import { getLocalDateString } from '../utils/dateUtils.js';

const VALID_TASK_KEYS = new Set([
  'id',
  'title',
  'dueDate',
  'type',
  'linkedType',
  'linkedId',
  'linkedTitle',
  'ownerId',
  'ownerName',
  'status',
  'stageGateCheckId',
  'answers',
  'repObservations',
  'submittedBy',
  'submittedByName',
  'submittedAt',
  'reviewedByName',
  'resolution',
  'note',
  'fromStageName',
  'targetStageName',
  'createdAt'
]);

const sanitizeTaskData = (data = {}) => {
  const sanitized = {};
  const input = { ...data };

  // Map legacy alias fields if present
  if (input.assignedToId && !input.ownerId) input.ownerId = input.assignedToId;
  if (input.assignedToName && !input.ownerName) input.ownerName = input.assignedToName;
  if (input.completed !== undefined && !input.status) {
    input.status = input.completed ? 'completed' : 'pending';
  }

  if (input.status === 'done') input.status = 'completed';

  for (const key of Object.keys(input)) {
    if (VALID_TASK_KEYS.has(key)) {
      sanitized[key] = input[key];
    }
  }
  return sanitized;
};

export const getTasks = async () => {
  return await prisma.task.findMany({
    orderBy: { createdAt: 'desc' }
  });
};

export const createTask = async (task) => {
  const noteContent = task.priority && !task.note?.includes('[Priority:')
    ? `[Priority: ${task.priority}] ${task.note || ''}`.trim()
    : task.note || null;

  const rawTask = {
    id: task.id || `tsk-${Date.now()}`,
    title: task.title || 'Follow up action item',
    dueDate: task.dueDate || getLocalDateString(),
    type: task.type || 'Call',
    linkedType: task.linkedType || 'Deal',
    linkedId: task.linkedId || '',
    linkedTitle: task.linkedTitle || 'General',
    ownerId: task.ownerId || task.assignedToId || 'u-1',
    ownerName: task.ownerName || task.assignedToName || 'Alex Vance',
    status: task.status || (task.completed ? 'completed' : 'pending'),
    stageGateCheckId: task.stageGateCheckId || null,
    answers: task.answers || null,
    repObservations: task.repObservations || null,
    submittedBy: task.submittedBy || null,
    submittedByName: task.submittedByName || null,
    submittedAt: task.submittedAt || null,
    reviewedByName: task.reviewedByName || null,
    resolution: task.resolution || null,
    note: noteContent,
    fromStageName: task.fromStageName || null,
    targetStageName: task.targetStageName || null,
    createdAt: task.createdAt || getLocalDateString(),
  };

  const newTask = sanitizeTaskData(rawTask);

  return await prisma.task.upsert({
    where: { id: newTask.id },
    update: newTask,
    create: newTask,
  });
};

export const updateTask = async (id, task) => {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return null;

  const sanitizedExisting = sanitizeTaskData(existing);
  const sanitizedIncoming = sanitizeTaskData(task);

  const updatePayload = {
    ...sanitizedExisting,
    ...sanitizedIncoming,
    id,
  };

  return await prisma.task.update({
    where: { id },
    data: sanitizeTaskData(updatePayload)
  });
};

export const deleteTask = async (id) => {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.task.delete({ where: { id } });
  return true;
};
