import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { createPipeline, updatePipeline } from '../backend/services/pipelineService.js';
import { createDeal, transitionDealStage } from '../backend/services/dealService.js';
import { getReportSummary } from '../backend/services/reportService.js';

describe('independent pipelines', () => {
  it('keeps deal stages, qualification and reports inside their pipeline', async () => {
    const suffix = randomUUID();
    let pipeline;
    let deal;
    const companyId = `co-pipeline-${suffix}`;
    try {
      pipeline = await createPipeline({ name: `Service pipeline ${suffix}`, stages: [
        { name: 'New request', category: 'New' },
        { name: 'Review', category: 'Pipeline' },
        { name: 'Won', category: 'Won' },
        { name: 'Lost', category: 'Lost' },
      ] });
      const first = pipeline.stages[0];
      const review = pipeline.stages[1];
      deal = await createDeal({ pipelineId: pipeline.id, title: `Pipeline test ${suffix}`,
        companyName: `Account ${suffix}`, stageId: first.id, ownerId: 'u-1',
        ownerName: 'Alex Vance', isRecurring: false });
      expect(deal.pipelineId).toBe(pipeline.id);
      expect(deal.stageId).toBe(first.id);

      await expect(transitionDealStage(deal.id, { targetStageId: 'stg-2',
        user: { id: 'u-1', name: 'Alex Vance', role: 'Admin' } }))
        .rejects.toMatchObject({ statusCode: 409 });
      await expect(prisma.deal.update({ where: { id: deal.id }, data: { stageId: 'stg-2' } }))
        .rejects.toThrow();

      await updatePipeline(pipeline.id, { qualificationRules: { [review.code]: ['companyId'] } });
      await expect(transitionDealStage(deal.id, { targetStageId: review.id,
        user: { id: 'u-1', name: 'Alex Vance', role: 'Admin' } }))
        .rejects.toMatchObject({ statusCode: 409 });

      await prisma.company.create({ data: { id: companyId, name: `Account ${suffix}` } });
      await prisma.deal.update({ where: { id: deal.id }, data: { companyId } });
      const moved = await transitionDealStage(deal.id, { targetStageId: review.id,
        user: { id: 'u-1', name: 'Alex Vance', role: 'Admin' } });
      expect(moved.deal.stageId).toBe(review.id);

      const report = await getReportSummary({ id: 'u-1', role: 'Admin' }, {
        pipeline: pipeline.id, month: new Date().toISOString().slice(0, 7),
      });
      expect(report.accountCount).toBe(1);
      expect(report.accountLTV[0].name).toBe(`Account ${suffix}`);
      expect(report.lostByStage.every(row => row.stage.pipelineId === pipeline.id)).toBe(true);
    } finally {
      if (deal) {
        await prisma.activity.deleteMany({ where: { linkedType: 'Deal', linkedId: deal.id } });
        await prisma.auditLog.deleteMany({ where: { entityType: 'Deal', entityId: deal.id } });
        await prisma.deal.deleteMany({ where: { id: deal.id } });
      }
      await prisma.company.deleteMany({ where: { id: companyId } });
      if (pipeline) {
        await prisma.stage.deleteMany({ where: { pipelineId: pipeline.id } });
        await prisma.pipeline.delete({ where: { id: pipeline.id } });
      }
    }
  });
});
