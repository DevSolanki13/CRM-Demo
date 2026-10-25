import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { updateStage } from '../backend/services/stageService.js';

describe('stage rename consistency', () => {
  it('updates current deal labels and preserves the historical audit label', async () => {
    const suffix = randomUUID();
    const stageId = `stg-test-${suffix}`;
    const dealId = `dl-test-${suffix}`;
    const auditId = `aud-test-${suffix}`;
    const checkId = `sgc-test-${suffix}`;
    const taskId = `tsk-test-${suffix}`;
    const oldName = `Test Stage ${suffix}`;
    const newName = `Renamed Stage ${suffix}`;
    try {
      await prisma.stage.create({ data: {
        id: stageId, code: `TEST_${suffix}`, name: oldName, order: 99, category: 'Pipeline'
      } });
      await prisma.deal.create({ data: {
        id: dealId, title: 'Stage rename test', stageId,
        stageName: oldName, value: 10
      } });
      await prisma.auditLog.create({ data: {
        id: auditId, timestamp: new Date().toISOString(), actorId: 'test',
        actorName: 'Test', action: 'STAGE_TRANSITION', entityType: 'Deal',
        entityId: dealId, fromStage: oldName, toStage: oldName,
      } });
      await prisma.stageGateCheck.create({ data: {
        id: checkId, dealId, fromStageId: stageId, fromStageName: oldName,
        targetStageId: 'stg-1', targetStageName: 'New Lead', status: 'pending_review'
      } });
      await prisma.deal.update({ where: { id: dealId }, data: {
        status: 'Pending Review', pendingGateCheck: {
          id: checkId, fromStageId: stageId, fromStageName: oldName,
          targetStageId: 'stg-1', targetStageName: 'New Lead'
        }
      } });
      await prisma.task.create({ data: {
        id: taskId, title: 'Approval', type: 'Approval', status: 'pending',
        stageGateCheckId: checkId, linkedType: 'Deal', linkedId: dealId, linkedTitle: 'Stage rename test',
        fromStageName: oldName, targetStageName: 'New Lead'
      } });
      const stage = await updateStage(stageId, { name: newName });
      expect(stage.name).toBe(newName);
      expect(stage.code).toBe(`TEST_${suffix}`);
      const deal = await prisma.deal.findUnique({ where: { id: dealId } });
      expect(deal.stageName).toBe(newName);
      expect(deal.pendingGateCheck.fromStageName).toBe(newName);
      expect((await prisma.stageGateCheck.findUnique({ where: { id: checkId } })).fromStageName).toBe(newName);
      expect((await prisma.task.findUnique({ where: { id: taskId } })).fromStageName).toBe(newName);
      expect((await prisma.auditLog.findUnique({ where: { id: auditId } })).toStage).toBe(oldName);
    } finally {
      await prisma.task.deleteMany({ where: { id: taskId } });
      await prisma.stageGateCheck.deleteMany({ where: { id: checkId } });
      await prisma.auditLog.deleteMany({ where: { id: auditId } });
      await prisma.deal.deleteMany({ where: { id: dealId } });
      await prisma.stage.deleteMany({ where: { id: stageId } });
    }
  });
});
