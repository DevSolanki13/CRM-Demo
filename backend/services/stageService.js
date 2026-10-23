import { prisma } from '../prisma.js';
import { randomUUID } from 'node:crypto';
import { normalizeStageColor, stageCode } from '../constants/stageConstants.js';

export const getStages = async () => {
  const stages = await prisma.stage.findMany({
    orderBy: { order: 'asc' }
  });
  return stages.map(stg => ({
    ...stg,
    code: stageCode(stg),
    color: normalizeStageColor(stg.color, stg.name)
  }));
};

export const createStage = async (stage) => {
  const count = await prisma.stage.count();
  const newStage = {
    id: `stg-${randomUUID()}`,
    name: stage.name || 'New Stage',
    order: stage.order || count + 1,
    category: stage.category || 'Pipeline',
    color: normalizeStageColor(stage.color, stage.name),
  };
  const saved = await prisma.stage.create({ data: newStage });
  return { ...saved, code: stageCode(saved) };
};

export const updateStage = async (id, stage) => {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Stage" WHERE id = ${id} FOR UPDATE`;
    const existing = await tx.stage.findUnique({ where: { id } });
    if (!existing) return null;
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
