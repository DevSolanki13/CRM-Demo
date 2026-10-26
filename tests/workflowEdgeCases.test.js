import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { createActivity, createNote } from '../backend/services/activityNoteService.js';
import { createPipeline, updatePipeline } from '../backend/services/pipelineService.js';
import { createStage, updateStage } from '../backend/services/stageService.js';
import { importContacts } from '../backend/services/contactService.js';
import { transitionDealStage, closeLostDeal } from '../backend/services/dealService.js';
import { createApprovalRequest, decideApproval } from '../backend/services/approvalExecutionService.js';
import { ensureRebuyDeal } from '../backend/services/renewalService.js';
import { triggerFollowUp } from '../backend/services/followUpEngine.js';
import { getLocalDateString } from '../backend/utils/dateUtils.js';
import { allowedStageTargets, semanticStageCode, isBackwardStageMove } from '../backend/constants/stageConstants.js';
import { defaultStageProbability } from '../frontend/utils/reportMetrics.js';

const prefix = `edge-${randomUUID()}`;
const pipelineIds = [];
let sequence = 0;
const nextId = () => `${prefix}-${sequence++}`;
const actor = { id: 'u-1', name: 'Alex Vance', role: 'Admin' };
const fixture = async (data = {}) => prisma.deal.create({ data: {
  id: nextId(), title: 'Workflow edge case', ownerId: actor.id, ownerName: actor.name,
  stageId: 'stg-2', stageName: 'Contacted', status: 'Active', ...data,
} });
const activityFor = deal => ({ type: 'Call', description: 'Could not reach the decision-maker',
  linkedType: 'Deal', linkedId: deal.id, linkedTitle: deal.title, authorId: actor.id, authorName: actor.name,
  followUp: { requestId: randomUUID(), reason: 'disconnected', expectedStageId: deal.stageId,
    ownerId: actor.id, dueDate: getLocalDateString(), answers: { decisionMaker: false } },
});

afterEach(async () => {
  vi.restoreAllMocks();
  const deals = await prisma.deal.findMany({ where: { OR: [
    { id: { startsWith: prefix } }, { parentDealId: { startsWith: prefix } },
  ] }, select: { id: true } });
  const linkedIds = [...deals.map(deal => deal.id), prefix];
  await prisma.task.deleteMany({ where: { linkedId: { in: linkedIds } } });
  await prisma.activity.deleteMany({ where: { linkedId: { in: linkedIds } } });
  await prisma.note.deleteMany({ where: { linkedId: { in: linkedIds } } });
  await prisma.auditLog.deleteMany({ where: { entityId: { in: linkedIds } } });
  await prisma.stageGateCheck.deleteMany({ where: { dealId: { in: linkedIds } } });
  await prisma.deal.deleteMany({ where: { id: { in: linkedIds } } });
  await prisma.lead.deleteMany({ where: { id: prefix } });
  await prisma.automationEvent.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.contact.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.stage.deleteMany({ where: { pipelineId: { in: pipelineIds } } });
  await prisma.pipeline.deleteMany({ where: { id: { in: pipelineIds.splice(0) } } });
});

describe('qualification follow-ups', () => {
  it('commits one unchanged-stage outcome and one reminder across competing retries', async () => {
    const deal = await fixture();
    const input = activityFor(deal);
    const saved = await Promise.all([createActivity(input), createActivity(input)]);
    expect(saved[0].id).toBe(saved[1].id);
    expect(await prisma.deal.findUnique({ where: { id: deal.id } })).toMatchObject({ stageId: deal.stageId, status: 'Follow up' });
    expect(await prisma.task.count({ where: { linkedId: deal.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: deal.id } })).toBe(1);
    await expect(createActivity({ ...input, description: 'Changed retry payload' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rolls back activity, status and reminder when the audit fails', async () => {
    const deal = await fixture();
    const transaction = prisma.$transaction.bind(prisma);
    vi.spyOn(prisma, '$transaction').mockImplementation((callback, options) => transaction(tx => callback(new Proxy(tx, {
      get(target, key) { return key === 'auditLog' ? { create: () => { throw new Error('Injected failure'); } } : target[key]; },
    })), options));
    await expect(createActivity(activityFor(deal))).rejects.toThrow('Injected failure');
    expect((await prisma.deal.findUnique({ where: { id: deal.id } })).status).toBe('Active');
    expect(await prisma.activity.count({ where: { linkedId: deal.id } })).toBe(0);
    expect(await prisma.task.count({ where: { linkedId: deal.id } })).toBe(0);
  });

  it('rejects stale, pending, and closed deal outcomes without partial writes', async () => {
    const deal = await fixture();
    const input = activityFor(deal);
    await expect(createActivity({ ...input, followUp: { ...input.followUp, expectedStageId: 'stg-1' } }))
      .rejects.toMatchObject({ statusCode: 409 });
    await prisma.deal.update({ where: { id: deal.id }, data: { status: 'Pending Review' } });
    await expect(createActivity(input)).rejects.toMatchObject({ statusCode: 409 });
    await prisma.deal.update({ where: { id: deal.id }, data: { status: 'Won', stageId: 'stg-6' } });
    await expect(createActivity({ ...input, followUp: { ...input.followUp, expectedStageId: 'stg-6' } }))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(await prisma.activity.count({ where: { linkedId: deal.id } })).toBe(0);
    expect(await prisma.task.count({ where: { linkedId: deal.id } })).toBe(0);
  });

  it('records failed qualification for a lead and its deal atomically', async () => {
    await prisma.lead.create({ data: { id: prefix, title: 'Linked lead', ownerId: actor.id } });
    const deal = await fixture({ leadId: prefix });
    const input = activityFor(deal);
    await createActivity({ ...input, linkedType: 'Lead', linkedId: prefix,
      followUp: { ...input.followUp, dealId: deal.id, reason: 'qualification_failed' } });
    expect((await prisma.lead.findUnique({ where: { id: prefix } })).status).toBe('Follow up');
    expect(await prisma.deal.findUnique({ where: { id: deal.id } })).toMatchObject({ status: 'Follow up', stageId: deal.stageId });
    expect(await prisma.task.count({ where: { linkedId: prefix } })).toBe(1);
  });
});

describe('custom pipeline lifecycle', () => {
  it('uses category and configured order through qualification, approval, demotion, won, lost and renewal', async () => {
    const pipeline = await createPipeline({ name: prefix, stages: [
      { name: 'Closed Won', category: 'New' },
      { name: 'Review', category: 'Pipeline' },
      { name: 'Sample Sent', category: 'Won' },
      { name: 'Closed Lost', category: 'Buy Again' },
      { name: 'Renewal', category: 'Lost' },
    ] });
    pipelineIds.push(pipeline.id);
    const [first, review, won, renewal, lost] = pipeline.stages;
    expect(semanticStageCode(first)).not.toBe('CLOSED_WON');
    expect(defaultStageProbability(first)).toBeLessThan(100);
    expect(defaultStageProbability(won)).toBe(100);
    expect(allowedStageTargets(first, pipeline.stages).map(stage => stage.id)).toEqual([review.id, lost.id]);
    const deal = await fixture({ pipelineId: pipeline.id, stageId: first.id, stageName: first.name,
      expectedCloseDate: null, isRecurring: true, recurrenceDays: 1 });
    await updatePipeline(pipeline.id, { qualificationRules: { [review.code]: ['expectedCloseDate'] } });
    await expect(transitionDealStage(deal.id, { targetStageId: review.id, user: actor })).rejects.toMatchObject({ statusCode: 409 });
    await prisma.deal.update({ where: { id: deal.id }, data: { expectedCloseDate: getLocalDateString() } });
    const request = await createApprovalRequest({ dealId: deal.id, fromStageId: first.id, targetStageId: review.id,
      submittedBy: actor.id, submittedByName: actor.name, answers: { complete: true } });
    await decideApproval(request.id, actor, 'approved');
    await expect(transitionDealStage(deal.id, { targetStageId: first.id, user: actor })).rejects.toMatchObject({ statusCode: 400 });
    await transitionDealStage(deal.id, { targetStageId: first.id, demotionReason: 'Recheck discovery', user: actor });
    await transitionDealStage(deal.id, { targetStageId: review.id, user: actor });
    expect((await transitionDealStage(deal.id, { targetStageId: won.id, user: actor })).deal.status).toBe('Won');
    expect(await prisma.task.count({ where: { linkedId: deal.id } })).toBeGreaterThan(0);
    await prisma.deal.update({ where: { id: deal.id }, data: { actualCloseDate: '2020-01-01' } });
    const rebuy = await ensureRebuyDeal(deal.id, actor);
    expect(rebuy.deal.stageId).toBe(renewal.id);
    expect(isBackwardStageMove(renewal, review)).toBe(false);
    await transitionDealStage(rebuy.deal.id, { targetStageId: review.id, user: actor });
    expect((await closeLostDeal(rebuy.deal.id, { lostReason: 'Budget withdrawn', user: actor })).deal.stageId).toBe(lost.id);
  }, 30000);
});

describe('service validation and same-day automation', () => {
  it('rejects malformed direct inputs, unknown categories and qualification keys', async () => {
    for (const action of [
      () => createActivity({ type: 'Call', description: 42 }),
      () => createActivity({ type: 'Call', description: 'Test', linkedType: 'Bogus', linkedId: prefix }),
      () => createNote({ text: ' ', linkedType: 'Lead', linkedId: prefix }),
      () => createStage({ name: null }),
      () => createStage({ name: 'Bad', category: 'Unknown' }),
      () => updateStage('stg-1', { order: -1 }),
      () => createPipeline({ name: 12 }),
      () => createPipeline({ name: 'Invalid rules', qualificationRules: { UNKNOWN: ['companyId'] } }),
      () => importContacts([{ id: nextId(), name: 'Valid' }, { name: 'Invalid', email: 'bad' }]),
    ]) await expect(action()).rejects.toMatchObject({ statusCode: 400 });
    expect(await prisma.contact.count({ where: { id: { startsWith: prefix } } })).toBe(0);
    await expect(createStage({ name: prefix, category: 'Won' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rolls back a whole contact import when a later relation is invalid', async () => {
    await expect(importContacts([{ id: nextId(), name: 'Valid' },
      { id: nextId(), name: 'Bad relation', companyId: nextId() }])).rejects.toThrow();
    expect(await prisma.contact.count({ where: { id: { startsWith: prefix } } })).toBe(0);
  });

  it('schedules zero-day reminders today for transitions, queue events and renewals', async () => {
    const rules = ['SAMPLE_SENT', 'LEAD_CREATED', 'RENEWAL_APPROACHING'].map(triggerEvent => ({
      id: triggerEvent, name: triggerEvent, triggerEvent, offsetDays: 0, taskType: 'Call',
      taskTitleTemplate: 'Same day', noteTemplate: '', isActive: true,
    }));
    const branding = { customFields: { followUpRules: rules } };
    vi.spyOn(prisma.branding, 'findUnique').mockResolvedValue(branding);
    const transaction = prisma.$transaction.bind(prisma);
    vi.spyOn(prisma, '$transaction').mockImplementation((callback, options) => transaction(tx => callback(new Proxy(tx, {
      get(target, key) { return key === 'branding' ? { findUnique: async () => branding } : target[key]; },
    })), options));
    const deal = await fixture();
    await transitionDealStage(deal.id, { targetStageId: 'stg-3', user: actor });
    await triggerFollowUp('LEAD_CREATED', { id: deal.id, eventId: `${prefix}-event`, title: deal.title, value: 0, ownerId: actor.id });
    await prisma.deal.update({ where: { id: deal.id }, data: { stageId: 'stg-6', status: 'Won',
      isRecurring: true, recurrenceDays: 1, actualCloseDate: '2020-01-01' } });
    const rebuy = await ensureRebuyDeal(deal.id, actor);
    const tasks = await prisma.task.findMany({ where: { linkedId: { in: [deal.id, rebuy.deal.id] } } });
    expect(tasks).toHaveLength(3);
    expect(tasks.every(task => task.dueDate === getLocalDateString())).toBe(true);
  }, 30000);
});
