import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { resolveReference } from '../backend/services/referenceReconciliationService.js';

describe('historical reference repair', () => {
  it('assigns a verified parent and retains the original missing ID', async () => {
    const suffix = randomUUID();
    const parentId = `dl-parent-${suffix}`;
    const childId = `dl-child-${suffix}`;
    const referenceId = `Deal:${childId}:parentDealId`;
    try {
      await prisma.deal.createMany({ data: [
        { id: parentId, title: 'Original order', stageId: 'stg-1', stageName: 'New Lead' },
        { id: childId, title: 'Repeat order', stageId: 'stg-1', stageName: 'New Lead', isRebuy: true },
      ] });
      await prisma.orphanReference.create({ data: { id: referenceId, recordType: 'Deal',
        recordId: childId, field: 'parentDealId', targetType: 'Deal', targetId: 'missing-parent' } });
      await expect(resolveReference(referenceId, childId, { id: 'test', name: 'Test' }))
        .rejects.toMatchObject({ statusCode: 400 });
      await resolveReference(referenceId, parentId, { id: 'test', name: 'Test' });
      expect((await prisma.deal.findUnique({ where: { id: childId } })).parentDealId).toBe(parentId);
      const reference = await prisma.orphanReference.findUnique({ where: { id: referenceId } });
      expect(reference.targetId).toBe('missing-parent');
      expect(reference.resolvedTargetId).toBe(parentId);
      expect(reference.resolvedAt).toBeTruthy();
      await expect(resolveReference(referenceId, parentId, { id: 'test', name: 'Test' }))
        .rejects.toMatchObject({ statusCode: 409 });
    } finally {
      await prisma.auditLog.deleteMany({ where: { entityId: childId, action: 'HISTORICAL_LINK_REPAIRED' } });
      await prisma.orphanReference.deleteMany({ where: { id: referenceId } });
      await prisma.deal.deleteMany({ where: { id: childId } });
      await prisma.deal.deleteMany({ where: { id: parentId } });
    }
  });
});
