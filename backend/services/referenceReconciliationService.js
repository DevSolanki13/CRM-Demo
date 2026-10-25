import { randomUUID } from 'node:crypto';
import { prisma } from '../prisma.js';

const conflict = message => Object.assign(new Error(message), { statusCode: 409 });
const invalid = message => Object.assign(new Error(message), { statusCode: 400 });
const models = { Deal: 'deal', Lead: 'lead', Contact: 'contact', Company: 'company' };

export async function listUnresolvedReferences() {
  return prisma.orphanReference.findMany({ where: { resolvedAt: null },
    orderBy: [{ detectedAt: 'asc' }, { id: 'asc' }] });
}

export async function resolveReference(id, targetId, actor) {
  if (typeof targetId !== 'string' || !targetId.trim()) throw invalid('Choose a replacement record.');
  return prisma.$transaction(async tx => {
    const reference = await tx.orphanReference.findUnique({ where: { id } });
    if (!reference || reference.resolvedAt) throw conflict('This link has already been resolved. Refresh the list.');
    const model = models[reference.targetType];
    if (!model || !await tx[model].findUnique({ where: { id: targetId }, select: { id: true } })) {
      throw invalid('The replacement record does not exist.');
    }
    if (reference.recordType === 'Deal' && reference.field === 'parentDealId') {
      if (reference.recordId === targetId) throw invalid('A deal cannot be its own parent.');
      const cycle = await tx.$queryRaw`
        WITH RECURSIVE parents AS (
          SELECT id, "parentDealId" FROM "Deal" WHERE id = ${targetId}
          UNION
          SELECT deal.id, deal."parentDealId" FROM "Deal" deal
          JOIN parents ON deal.id = parents."parentDealId"
        ) SELECT id FROM parents WHERE id = ${reference.recordId} LIMIT 1`;
      if (cycle.length) throw invalid('This parent would create a circular deal relationship.');
      const changed = await tx.deal.updateMany({ where: { id: reference.recordId, parentDealId: null },
        data: { parentDealId: targetId } });
      if (changed.count !== 1) throw conflict('The deal changed while you were resolving its parent.');
    } else if (reference.recordType === 'Task' && reference.field === 'linkedId') {
      const changed = await tx.task.updateMany({ where: { id: reference.recordId,
        linkedId: reference.targetId, linkedType: reference.targetType }, data: { linkedId: targetId } });
      if (changed.count !== 1) throw conflict('The task link changed. Refresh the list.');
    } else if (reference.recordType === 'Activity' && reference.field === 'linkedId') {
      const changed = await tx.activity.updateMany({ where: { id: reference.recordId,
        linkedId: reference.targetId, linkedType: reference.targetType }, data: { linkedId: targetId } });
      if (changed.count !== 1) throw conflict('The activity link changed. Refresh the list.');
    } else throw invalid('Unsupported historical link type.');
    const now = new Date();
    await tx.orphanReference.update({ where: { id }, data: { resolvedAt: now, resolvedTargetId: targetId } });
    await tx.auditLog.create({ data: {
      id: `aud-link-${randomUUID()}`, timestamp: now.toISOString(),
      actorId: actor.id, actorName: actor.name, action: 'HISTORICAL_LINK_REPAIRED',
      entityType: reference.recordType, entityId: reference.recordId,
      reason: `Resolved missing ${reference.targetType} link.`,
      metadata: { field: reference.field, originalTargetId: reference.targetId, targetId },
    } });
    return { success: true };
  }, { isolationLevel: 'Serializable' });
}
