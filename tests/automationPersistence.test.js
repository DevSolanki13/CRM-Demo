import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { processFollowUpEvent, triggerFollowUp } from '../backend/services/followUpEngine.js';

describe('persistent follow-up events', () => {
  it('keeps task and audit side effects unique across retries', async () => {
    const suffix = randomUUID();
    const leadId = `ld-auto-${suffix}`;
    const eventId = `evt-auto-${suffix}`;
    try {
      await prisma.lead.create({ data: { id: leadId, title: 'Automation test lead' } });
      const context = { id: leadId, eventId, title: 'Automation test lead', contactPhone: '555',
        ownerId: null, ownerName: 'Test' };
      await triggerFollowUp('LEAD_CREATED', context);
      const event = await prisma.automationEvent.findUnique({ where: { id: eventId } });
      expect(event.status).toBe('completed');
      const firstTasks = await prisma.task.findMany({ where: { id: { startsWith: `tsk-auto-${eventId}-` } } });
      expect(firstTasks.length).toBeGreaterThan(0);
      await prisma.automationEvent.update({ where: { id: eventId }, data: {
        status: 'failed', nextRunAt: new Date(Date.now() - 1000), processedAt: null
      } });
      const competing = await Promise.all([processFollowUpEvent(eventId), processFollowUpEvent(eventId)]);
      expect(competing.filter(result => result.claimed)).toHaveLength(1);
      const secondTasks = await prisma.task.findMany({ where: { id: { startsWith: `tsk-auto-${eventId}-` } } });
      expect(secondTasks.map(task => task.id)).toEqual(firstTasks.map(task => task.id));
      expect(await prisma.auditLog.count({ where: { id: { startsWith: `aud-tsk-auto-${eventId}-` } } }))
        .toBe(firstTasks.length);
      await prisma.automationEvent.update({ where: { id: eventId }, data: {
        status: 'running', leaseToken: 'crashed-worker',
        lockedUntil: new Date(Date.now() - 1000), nextRunAt: new Date(Date.now() - 1000)
      } });
      const recovered = await processFollowUpEvent(eventId);
      expect(recovered.claimed).toBe(true);
      expect((await prisma.automationEvent.findUnique({ where: { id: eventId } })).status).toBe('completed');
    } finally {
      await prisma.task.deleteMany({ where: { id: { startsWith: `tsk-auto-${eventId}-` } } });
      await prisma.auditLog.deleteMany({ where: { id: { startsWith: `aud-tsk-auto-${eventId}-` } } });
      await prisma.automationEvent.deleteMany({ where: { id: eventId } });
      await prisma.lead.deleteMany({ where: { id: leadId } });
    }
  });
});
