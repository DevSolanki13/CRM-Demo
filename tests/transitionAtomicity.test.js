import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { transitionDealStage } from '../backend/services/dealService.js';

const ids = [];
const actor = { id: 'u-1', name: 'Admin', role: 'Admin' };
const fixture = async () => {
  const id = `atomic-move-${randomUUID()}`;
  ids.push(id);
  await prisma.deal.create({ data: {
    id, title: 'Atomic transition fixture', stageId: 'stg-2', stageName: 'Contacted',
    status: 'Active', ownerId: actor.id, ownerName: actor.name,
  } });
  return id;
};
afterEach(async () => {
  vi.restoreAllMocks();
  const where = { linkedId: { in: ids } };
  await prisma.task.deleteMany({ where });
  await prisma.activity.deleteMany({ where });
  await prisma.auditLog.deleteMany({ where: { entityId: { in: ids } } });
  await prisma.deal.deleteMany({ where: { id: { in: ids.splice(0) } } });
});

describe('ordinary stage transitions commit atomically', () => {
  it('allows one competing move and creates its effects once', async () => {
    const id = await fixture();
    const move = () => transitionDealStage(id, { targetStageId: 'stg-3', user: actor });
    const results = await Promise.allSettled([move(), move()]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find(result => result.status === 'rejected').reason.statusCode).toBe(409);
    expect((await prisma.deal.findUnique({ where: { id } })).stageId).toBe('stg-3');
    expect(await prisma.task.count({ where: { linkedId: id } })).toBe(1);
    expect(await prisma.activity.count({ where: { linkedId: id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: id } })).toBe(1);
  });

  it('rolls back the stage, tasks, and activity if the final audit write fails', async () => {
    const id = await fixture();
    const transaction = prisma.$transaction.bind(prisma);
    vi.spyOn(prisma, '$transaction').mockImplementation((callback, options) => transaction(async tx => {
      const wrapped = new Proxy(tx, { get(target, key) {
        if (key === 'auditLog') return { create: async () => { throw new Error('Injected audit failure'); } };
        return target[key];
      } });
      return callback(wrapped);
    }, options));
    await expect(transitionDealStage(id, { targetStageId: 'stg-3', user: actor }))
      .rejects.toThrow('Injected audit failure');
    expect((await prisma.deal.findUnique({ where: { id } })).stageId).toBe('stg-2');
    expect(await prisma.task.count({ where: { linkedId: id } })).toBe(0);
    expect(await prisma.activity.count({ where: { linkedId: id } })).toBe(0);
  });

  it('rejects a competing target prepared from the previous stage', async () => {
    const id = await fixture();
    const results = await Promise.allSettled(['stg-3', 'stg-4'].map(targetStageId =>
      transitionDealStage(id, { targetStageId, expectedStageId: 'stg-2', user: actor })));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find(result => result.status === 'rejected').reason.statusCode).toBe(409);
    expect(await prisma.task.count({ where: { linkedId: id } })).toBe(1);
  });

  it('retries a serialization abort without duplicating follow-ups', async () => {
    const id = await fixture();
    const transaction = prisma.$transaction.bind(prisma);
    let calls = 0;
    vi.spyOn(prisma, '$transaction').mockImplementation((callback, options) => transaction(async tx => {
      const result = await callback(tx);
      if (calls++ === 0) throw Object.assign(new Error('Injected serialization abort'), { code: 'P2034' });
      return result;
    }, options));
    await transitionDealStage(id, { targetStageId: 'stg-3', user: actor });
    expect(calls).toBe(2);
    expect(await prisma.task.count({ where: { linkedId: id } })).toBe(1);
    expect(await prisma.activity.count({ where: { linkedId: id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: id } })).toBe(1);
  });
});
