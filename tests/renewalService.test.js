import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { getLocalDateString } from '../backend/utils/dateUtils.js';
import { ensureRebuyDeal } from '../backend/services/renewalService.js';

describe('database-backed renewal creation', () => {
  it('waits for the due date and creates at most one active child under competition', async () => {
    const parentId = `dl-renewal-test-${randomUUID()}`;
    const today = getLocalDateString();
    try {
      await prisma.deal.create({ data: {
        id: parentId, title: 'Renewal test order', value: 100,
        stageId: 'stg-6', stageName: 'Closed Won', status: 'Won',
        isRecurring: true, recurrenceDays: 60, actualCloseDate: today,
      } });
      const early = await ensureRebuyDeal(parentId);
      expect(early.created).toBe(false);
      expect(early.dueDate).toBeTruthy();
      expect(await prisma.deal.count({ where: { parentDealId: parentId } })).toBe(0);

      await prisma.deal.update({ where: { id: parentId }, data: { actualCloseDate: '2020-01-01' } });
      const results = await Promise.allSettled([
        ensureRebuyDeal(parentId), ensureRebuyDeal(parentId)
      ]);
      expect(results.some(result => result.status === 'fulfilled' && result.value.created)).toBe(true);
      expect(await prisma.deal.count({ where: {
        parentDealId: parentId, status: { notIn: ['Won', 'Lost'] }
      } })).toBe(1);
    } finally {
      const children = await prisma.deal.findMany({ where: { parentDealId: parentId }, select: { id: true } });
      for (const child of children) {
        await prisma.task.deleteMany({ where: { linkedId: child.id } });
        await prisma.auditLog.deleteMany({ where: { entityId: child.id } });
      }
      await prisma.deal.deleteMany({ where: { parentDealId: parentId } });
      await prisma.deal.deleteMany({ where: { id: parentId } });
    }
  });
});
