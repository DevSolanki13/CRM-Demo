import { prisma } from '../prisma.js';
import { randomUUID } from 'node:crypto';
import { normalizeStageColor, stageCode } from '../constants/stageConstants.js';

export const getStages = async () => {
  const stages = await prisma.stage.findMany({
    orderBy: [{ pipelineId: 'asc' }, { order: 'asc' }]
  });
  return stages.map(stg => ({
    ...stg,
    code: stageCode(stg),
    color: normalizeStageColor(stg.color, stg.name)
  }));
};

export const createStage = async (stage) => {
  const pipelineId = stage.pipelineId || 'pipeline-sales';
  const pipeline = await prisma.pipeline.findUnique({ where: { id: pipelineId } });
  if (!pipeline?.active) throw Object.assign(new Error('Choose an active pipeline.'), { statusCode: 400 });
  const count = await prisma.stage.count({ where: { pipelineId } });
  const terminal = pipelineId === 'pipeline-sales' ? null : await prisma.stage.findFirst({
    where: { pipelineId, category: { in: ['Won', 'Lost'] } }, orderBy: { order: 'asc' },
  });
  const newStage = {
    id: `stg-${randomUUID()}`,
    pipelineId,
    code: `${stage.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 35)}_${randomUUID().slice(0, 6).toUpperCase()}`,
    name: stage.name || 'New Stage',
    order: terminal?.order || stage.order || count + 1,
    category: stage.category || 'Pipeline',
    color: normalizeStageColor(stage.color, stage.name),
  };
  const saved = await prisma.$transaction(async tx => {
    if (terminal) await tx.stage.updateMany({ where: { pipelineId, order: { gte: terminal.order } },
      data: { order: { increment: 1 } } });
    return tx.stage.create({ data: newStage });
  });
  return { ...saved, code: stageCode(saved) };
};

export const updateStage = async (id, stage) => {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Stage" WHERE id = ${id} FOR UPDATE`;
    const existing = await tx.stage.findUnique({ where: { id } });
    if (!existing) return null;
    if (stage.pipelineId && stage.pipelineId !== existing.pipelineId) {
      throw Object.assign(new Error('A stage cannot move to another pipeline.'), { statusCode: 409 });
    }
    if (stage.category && stage.category !== existing.category) {
      throw Object.assign(new Error('Stage type cannot change after creation.'), { statusCode: 409 });
    }
    const name = stage.name?.trim() || existing.name;
    const saved = await tx.stage.update({ where: { id }, data: {
      name,
      order: stage.order ?? existing.order,
      category: stage.category ?? existing.category,
      color: stage.color ? normalizeStageColor(stage.color, name) : existing.color,
    } });
    if (name !== existing.name) {
      await tx.deal.updateMany({ where: { stageId: id }, data: { stageName: name } });
      await tx.stageGateCheck.updateMany({
        where: { fromStageId: id, status: { in: ['pending', 'pending_review'] } },
        data: { fromStageName: name }
      });
      await tx.stageGateCheck.updateMany({
        where: { targetStageId: id, status: { in: ['pending', 'pending_review'] } },
        data: { targetStageName: name }
      });
      const pendingDeals = await tx.deal.findMany({ where: {
        status: 'Pending Review',
        OR: [
          { pendingGateCheck: { path: ['fromStageId'], equals: id } },
          { pendingGateCheck: { path: ['targetStageId'], equals: id } }
        ]
      } });
      for (const deal of pendingDeals) {
        const check = deal.pendingGateCheck;
        if (!check) continue;
        const updated = { ...check };
        if (check.fromStageId === id) updated.fromStageName = name;
        if (check.targetStageId === id) updated.targetStageName = name;
        if (updated.fromStageName !== check.fromStageName || updated.targetStageName !== check.targetStageName) {
          await tx.deal.update({ where: { id: deal.id }, data: { pendingGateCheck: updated } });
          if (deal.leadId) await tx.lead.updateMany({ where: { id: deal.leadId }, data: { pendingGateCheck: updated } });
        }
      }
      const pendingChecks = await tx.stageGateCheck.findMany({
        where: {
          status: { in: ['pending', 'pending_review'] },
          OR: [{ fromStageId: id }, { targetStageId: id }]
        },
        select: { id: true, fromStageId: true, targetStageId: true }
      });
      const approvalTasks = await tx.task.findMany({ where: {
        type: 'Approval', status: 'pending',
        stageGateCheckId: { in: pendingChecks.map(check => check.id) }
      } });
      for (const task of approvalTasks) {
        const check = pendingChecks.find(item => item.id === task.stageGateCheckId);
        const fromStageName = check.fromStageId === id ? name : task.fromStageName;
        const targetStageName = check.targetStageId === id ? name : task.targetStageName;
        await tx.task.update({ where: { id: task.id }, data: {
          fromStageName, targetStageName,
          title: `[Stage Approval Required] ${task.linkedTitle}: ${fromStageName} → ${targetStageName}`
        } });
      }
    }
    return { ...saved, code: stageCode(saved) };
  }, { timeout: 15000 });
};
