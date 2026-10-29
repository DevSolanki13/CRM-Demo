import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { createApprovalRequest, decideApproval } from '../backend/services/approvalExecutionService.js';
import { closeLostDeal, transitionDealStage } from '../backend/services/dealService.js';
import { ensureRebuyDeal } from '../backend/services/renewalService.js';
import { cleanupTestRecords } from '../e2e/support/cleanupTestRecords.js';

describe('database-backed section 2 workflows', () => {
  it('covers qualification, stale movement, demotion, won, lost, and renewal paths', async () => {
    const suffix = randomUUID();
    const qualifiedId = `dl-workflow-qualified-${suffix}`;
    const lostId = `dl-workflow-lost-${suffix}`;
    const ids = [qualifiedId, lostId];
    const reviewer = await prisma.user.findFirst({ where: {
      active: true, role: { in: ['Manager', 'Admin'] }
    } });
    expect(reviewer).toBeTruthy();
    const admin = await prisma.user.findFirst({ where: { active: true, role: 'Admin' } });
    expect(admin).toBeTruthy();
    try {
      for (const id of ids) {
        await prisma.deal.create({ data: {
          id, title: `Workflow test ${suffix}`, value: 100,
          stageId: 'stg-1', stageName: 'New Lead', status: 'Active'
        } });
      }

      await expect(createApprovalRequest({
        dealId: qualifiedId, fromStageId: 'stg-1', targetStageId: 'stg-6'
      })).rejects.toMatchObject({ statusCode: 409 });
      expect((await prisma.deal.findUnique({ where: { id: qualifiedId } })).pendingGateCheck).toBeNull();

      const request = await createApprovalRequest({
        dealId: qualifiedId, fromStageId: 'stg-1', targetStageId: 'stg-2',
        submittedBy: reviewer.id, submittedByName: reviewer.name,
        answers: { discovery: true }
      });
      await expect(transitionDealStage(qualifiedId, {
        targetStageId: 'stg-8', user: admin, lostReason: 'Competitor'
      })).rejects.toMatchObject({ statusCode: 409 });
      await decideApproval(request.id, reviewer, 'approved');
      expect((await prisma.deal.findUnique({ where: { id: qualifiedId } })).stageId).toBe('stg-2');

      await expect(transitionDealStage(qualifiedId, {
        targetStageId: 'stg-1', user: admin
      })).rejects.toMatchObject({ statusCode: 400 });
      expect((await prisma.deal.findUnique({ where: { id: qualifiedId } })).stageId).toBe('stg-2');
      await transitionDealStage(qualifiedId, {
        targetStageId: 'stg-1', user: admin, demotionReason: 'Needs discovery'
      });
      await transitionDealStage(qualifiedId, {
        targetStageId: 'stg-5', user: admin, overrideReason: 'Verified contract'
      });
      const won = await transitionDealStage(qualifiedId, {
        targetStageId: 'stg-6', user: admin
      });
      expect(won.deal.status).toBe('Won');
      expect(won.deal.actualCloseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      await expect(closeLostDeal(lostId, { user: admin })).rejects.toMatchObject({ statusCode: 400 });
      const lost = await closeLostDeal(lostId, {
        user: admin, lostReason: 'No budget', note: 'Customer deferred'
      });
      expect(lost.deal.stageId).toBe('stg-8');
      expect(lost.deal.lostReason).toBe('No budget');

      await prisma.deal.update({ where: { id: qualifiedId }, data: {
        isRecurring: true, recurrenceDays: 30, actualCloseDate: '2020-01-01'
      } });
      const first = await ensureRebuyDeal(qualifiedId);
      const second = await ensureRebuyDeal(qualifiedId);
      expect(first.created).toBe(true);
      expect(second.created).toBe(false);
      expect(second.deal.id).toBe(first.deal.id);
      expect(first.deal.expectedCloseDate).toBe('2020-01-31');
      ids.push(first.deal.id);
    } finally {
      await cleanupTestRecords({ dealIds: ids });
    }
  }, 30000);
});
