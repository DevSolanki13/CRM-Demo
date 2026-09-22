import { prisma } from '../prisma.js';
import { normalizeStageColor } from '../constants/stageConstants.js';

export const getStages = async () => {
  const stages = await prisma.stage.findMany({
    orderBy: { order: 'asc' }
  });
  return stages.map(stg => ({
    ...stg,
    color: normalizeStageColor(stg.color, stg.name)
  }));
};

export const createStage = async (stage) => {
  const count = await prisma.stage.count();
  const newStage = {
    id: stage.id || `stg-${Date.now()}`,
    name: stage.name || 'New Stage',
    order: stage.order || count + 1,
    category: stage.category || 'Pipeline',
    color: normalizeStageColor(stage.color, stage.name),
  };
  return await prisma.stage.create({ data: newStage });
};

export const updateStage = async (id, stage) => {
  const existing = await prisma.stage.findUnique({ where: { id } });
  if (!existing) return null;
  const color = stage.color ? normalizeStageColor(stage.color, stage.name || existing.name) : existing.color;
  return await prisma.stage.update({
    where: { id },
    data: {
      ...existing,
      ...stage,
      color,
      id,
    }
  });
};
