import { describe, it, expect } from 'vitest';
import { createTask, updateTask, getTasks, deleteTask } from '../backend/services/taskService.js';

describe('Task Service Field Sanitization & Prisma Integration', () => {
  const testTaskId = `tsk-unit-${Date.now()}`;

  it('creates task with legacy alias fields (assignedToId, priority) safely without error', async () => {
    const task = await createTask({
      id: testTaskId,
      title: 'Unit Test Outreach Task',
      assignedToId: 'u-1',
      assignedToName: 'Alex Vance',
      priority: 'High',
      completed: false,
      unknownExtraField: 'should-be-stripped',
    });

    expect(task).toBeDefined();
    expect(task.id).toBe(testTaskId);
    expect(task.ownerId).toBe('u-1');
    expect(task.ownerName).toBe('Alex Vance');
    expect(task.status).toBe('pending');
    expect(task.note).toContain('[Priority: High]');
  });

  it('updates task safely even when passing assignedToId, assignedToName, and completed', async () => {
    const updated = await updateTask(testTaskId, {
      status: 'completed',
      assignedToId: 'u-1',
      assignedToName: 'Alex Vance',
      randomArg: 'ignore-me',
    });

    expect(updated).toBeDefined();
    expect(updated.status).toBe('completed');
  });

  it('cleans up created unit test task', async () => {
    const success = await deleteTask(testTaskId);
    expect(success).toBe(true);
  });
});
