import { randomUUID } from 'node:crypto';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { createStageGateCheck, approveStageGateCheck, rejectStageGateCheck } from '../backend/services/stageGateService.js';
import { updateTask, deleteTask } from '../backend/services/taskService.js';
import { updateDeal, transitionDealStage } from '../backend/services/dealService.js';
import { cleanupTestRecords } from '../e2e/support/cleanupTestRecords.js';

const reviewer = { id: 'u-2', name: 'Sarah Jenkins' };
const created = [];
let source;
let target;
let sampleStage;

beforeAll(async () => {
  const stages = await prisma.stage.findMany({ orderBy: { order: 'asc' } });
  source = stages.find(s => s.id === 'stg-1');
  target = stages.find(s => s.id === 'stg-2');
  sampleStage = stages.find(s => s.id === 'stg-3');
  if (!source || !target) throw new Error('Approval integration tests require seeded stages stg-1 and stg-2');
});

afterEach(async () => {
  await cleanupTestRecords({ dealIds: created.splice(0).map(record => record.dealId) });
});

const request = async (from = source, to = target) => {
  const dealId = `dl-approval-test-${randomUUID()}`;
  await prisma.deal.create({ data: {
    id: dealId, title: 'Approval integration test', stageId: from.id,
    stageName: from.name, status: 'Active', value: 100
  } });
  created.push({ dealId });
  const check = await createStageGateCheck({
    dealId, fromStageId: from.id, targetStageId: to.id,
    submittedBy: 'test-rep', submittedByName: 'Test Rep'
  });
  return { dealId, check };
};

describe('database-backed approval decisions', () => {
  it('rejects unknown and stale requests without writing a decision', async () => {
    await expect(approveStageGateCheck(`missing-${randomUUID()}`, reviewer))
      .rejects.toMatchObject({ statusCode: 404 });
    const { dealId, check } = await request();
    await prisma.deal.update({ where: { id: dealId }, data: { stageId: target.id, stageName: target.name } });
    await expect(rejectStageGateCheck(check.id, reviewer, 'Too late'))
      .rejects.toMatchObject({ statusCode: 409 });
    expect((await prisma.stageGateCheck.findUnique({ where: { id: check.id } })).status).toBe('pending_review');
  });

  it('executes once and resolves tasks, activity, and audit together', async () => {
    const { dealId, check } = await request();
    await approveStageGateCheck(check.id, reviewer);
    await expect(approveStageGateCheck(check.id, reviewer)).rejects.toMatchObject({ statusCode: 409 });
    expect((await prisma.deal.findUnique({ where: { id: dealId } })).stageId).toBe(target.id);
    expect(await prisma.task.count({ where: { stageGateCheckId: check.id, status: 'pending' } })).toBe(0);
    expect(await prisma.activity.count({ where: { id: `act-gate-${check.id}` } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { id: `aud-gate-${check.id}` } })).toBe(1);
  });

  it('rejects a matching pending request when its deal status is inconsistent', async () => {
    const { dealId, check } = await request();
    await prisma.deal.update({ where: { id: dealId }, data: { status: 'Active' } });
    await expect(approveStageGateCheck(check.id, reviewer)).rejects.toMatchObject({ statusCode: 409 });
    expect((await prisma.deal.findUnique({ where: { id: dealId } })).stageId).toBe(source.id);
    expect(await prisma.auditLog.count({ where: { id: `aud-gate-${check.id}` } })).toBe(0);
  });

  it('allows only one of two competing decisions to commit', async () => {
    const { dealId, check } = await request();
    const results = await Promise.allSettled([
      approveStageGateCheck(check.id, reviewer),
      rejectStageGateCheck(check.id, { id: 'u-1', name: 'Alex Vance' }, 'Needs work')
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    expect(await prisma.auditLog.count({ where: { id: `aud-gate-${check.id}` } })).toBe(1);
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    const decided = await prisma.stageGateCheck.findUnique({ where: { id: check.id } });
    expect(deal.stageId === target.id).toBe(decided.status === 'approved_and_executed');
  });

  it('rolls back the whole decision when an intermediate write fails', async () => {
    const { dealId, check } = await request();
    await prisma.activity.create({ data: {
      id: `act-gate-${check.id}`, type: 'Collision', description: 'Force rollback', linkedType: 'Deal', linkedId: dealId
    } });
    await expect(approveStageGateCheck(check.id, reviewer)).rejects.toThrow();
    expect((await prisma.stageGateCheck.findUnique({ where: { id: check.id } })).status).toBe('pending_review');
    expect((await prisma.deal.findUnique({ where: { id: dealId } })).stageId).toBe(source.id);
    expect(await prisma.auditLog.count({ where: { id: `aud-gate-${check.id}` } })).toBe(0);
  });

  it('creates follow-up tasks once for a successful gate decision', async () => {
    const { dealId, check } = await request(target, sampleStage);
    await approveStageGateCheck(check.id, reviewer);
    await expect(approveStageGateCheck(check.id, reviewer)).rejects.toMatchObject({ statusCode: 409 });
    const tasks = await prisma.task.findMany({ where: {
      linkedId: dealId, id: { startsWith: `tsk-gate-${check.id}-` }
    } });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe(`tsk-gate-${check.id}-rule-sample-sent`);
  });

  it('does not let a task edit decide an approval', async () => {
    const { check } = await request();
    const task = await prisma.task.findFirst({ where: { stageGateCheckId: check.id } });
    expect(task).not.toBeNull();
    await expect(updateTask(task.id, { status: 'completed', resolution: 'Approved' }))
      .rejects.toMatchObject({ statusCode: 409 });
    await expect(deleteTask(task.id)).rejects.toMatchObject({ statusCode: 409 });
    expect((await prisma.stageGateCheck.findUnique({ where: { id: check.id } })).status).toBe('pending_review');
  });

  it('requires an active manager or administrator', async () => {
    const { check } = await request();
    await expect(approveStageGateCheck(check.id, { id: 'u-3', name: 'Sales Rep' }))
      .rejects.toMatchObject({ statusCode: 403 });
    expect((await prisma.stageGateCheck.findUnique({ where: { id: check.id } })).status).toBe('pending_review');
  });

  it('rejects generic edits and stage transitions while approval is pending', async () => {
    const { dealId } = await request();
    await expect(updateDeal(dealId, { stageId: target.id, stageName: target.name }))
      .rejects.toMatchObject({ statusCode: 409 });
    await expect(transitionDealStage(dealId, { targetStageId: target.id, user: { role: 'Admin' } }))
      .rejects.toMatchObject({ statusCode: 409 });
    expect((await prisma.deal.findUnique({ where: { id: dealId } })).stageId).toBe(source.id);
  });
});
