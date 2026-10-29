import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { createLead } from '../backend/services/leadService.js';
import { cleanupTestRecords } from '../e2e/support/cleanupTestRecords.js';

describe('test fixture cleanup', () => {
  it('removes linked fixtures and automation in dependency order while keeping unrelated records', async () => {
    const suffix = randomUUID();
    const leadId = `cleanup-lead-${suffix}`;
    const parentId = `cleanup-parent-${suffix}`;
    const childId = `cleanup-child-${suffix}`;
    const controlId = `cleanup-control-${suffix}`;
    try {
      await createLead({ id: leadId, title: `Cleanup test ${suffix}` });
      await prisma.lead.create({ data: { id: controlId, title: 'Unrelated control record' } });
      await prisma.deal.create({ data: { id: parentId, leadId, title: 'Cleanup parent', stageId: 'stg-1', stageName: 'New Lead' } });
      await prisma.deal.create({ data: { id: childId, parentDealId: parentId, title: 'Cleanup child', stageId: 'stg-1', stageName: 'New Lead' } });
      await prisma.activity.create({ data: { id: `cleanup-act-${suffix}`, type: 'Call', description: 'Cleanup activity', linkedType: 'Deal', linkedId: childId } });
      await prisma.note.create({ data: { id: `cleanup-note-${suffix}`, text: 'Cleanup note', linkedType: 'Lead', linkedId: leadId } });
      const removed = await cleanupTestRecords({ leadIds: [leadId] });
      expect(removed).toMatchObject({ leads: 1, deals: 2 });
      expect(await prisma.lead.findUnique({ where: { id: controlId } })).not.toBeNull();
      expect(await prisma.task.count({ where: { linkedId: { in: [leadId, parentId, childId] } } })).toBe(0);
      expect(await prisma.activity.count({ where: { linkedId: childId } })).toBe(0);
      expect(await prisma.note.count({ where: { linkedId: leadId } })).toBe(0);
      expect(await prisma.auditLog.count({ where: { entityId: leadId } })).toBe(0);
      expect(await prisma.automationEvent.count({ where: { context: { path: ['id'], equals: leadId } } })).toBe(0);
      await expect(cleanupTestRecords({ leadIds: [leadId] })).resolves.toMatchObject({ leads: 0, tasks: 0 });
    } finally {
      await cleanupTestRecords({ leadIds: [leadId, controlId], dealIds: [parentId, childId] });
    }
  });
});
