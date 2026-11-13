import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { getLocalDateString } from '../backend/utils/dateUtils.js';
import { shiftDate, getNextLeadRecurrenceDate, reminderOffsets } from '../shared/leadRecurrence.js';
import { withRecurringLead, syncRecurringLead, updateRecurringCycle, getRecurringLeadHistory, controlRecurringLead } from '../backend/services/leadRecurrenceService.js';
import { listRecordsPage } from '../backend/services/paginatedRecords.js';
import { updateTask, deleteTask } from '../backend/services/taskService.js';
import { createLead, updateLead } from '../backend/services/leadService.js';
import { authorizeCRM } from '../backend/auth/permissions.js';

const suffix = randomUUID();
const actor = { id: `recurrence-rep-${suffix}`, name: 'Recurrence test rep', role: 'Sales Rep' };
const other = { id: `recurrence-other-${suffix}`, name: 'Other recurrence rep', role: 'Sales Rep' };
const manager = { id: 'recurrence-test-manager', name: 'Test manager', role: 'Manager' };
const today = getLocalDateString();
const leadIds = [];
const dealIds = [];
const sync = id => withRecurringLead(id, actor, (tx, lead) => syncRecurringLead(tx, lead, today));
async function lead(patch = {}) {
  const id = `recurrence-test-${randomUUID()}`;
  leadIds.push(id);
  return prisma.lead.create({ data: { id, title: `Recurring QA ${suffix}`, ownerId: actor.id, ownerName: actor.name,
    isRecurring: true, recurrenceFrequency: 'monthly', recurrenceInterval: 1,
    recurrenceDate: shiftDate(today, 10), nextRecurrenceDate: shiftDate(today, 10), createdAt: today, ...patch } });
}
const report = (cycle, patch = {}) => ({ cycleId: cycle.id, expectedReviewedAt: cycle.reviewedAt,
  outcome: 'awaiting', note: 'Customer contacted; awaiting a reply.', nextActionDate: shiftDate(today, 2), ...patch });

beforeAll(async () => {
  for (const user of [actor, other]) await prisma.user.create({ data: { ...user, email: `${user.id}@example.test` } });
}, 30000);
afterAll(async () => {
  await prisma.leadRecurrenceCycle.deleteMany({ where: { leadId: { in: leadIds } } });
  await prisma.task.deleteMany({ where: { linkedType: 'Lead', linkedId: { in: leadIds } } });
  await prisma.activity.deleteMany({ where: { linkedType: 'Lead', linkedId: { in: leadIds } } });
  await prisma.auditLog.deleteMany({ where: { entityId: { in: leadIds } } });
  await prisma.deal.deleteMany({ where: { id: { in: dealIds } } });
  await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });
  await prisma.user.deleteMany({ where: { id: { in: [actor.id, other.id] } } });
}, 30000);

describe('recurring lead accountability', () => {
  it('supports month intervals, weekly cycles, and selected monthly dates', () => {
    expect(getNextLeadRecurrenceDate('2026-01-31', 'monthly', 4, '2026-01-31')).toBe('2026-05-31');
    expect(getNextLeadRecurrenceDate('2026-01-01', 'weekly', 1)).toBe('2026-01-08');
    expect(getNextLeadRecurrenceDate('2026-02-01', 'monthly_dates', 1, '2026-02-01', [5, 15, 25])).toBe('2026-02-05');
    expect(getNextLeadRecurrenceDate('2026-01-31', 'monthly_dates', 1, '2026-01-31', [30, 31])).toBe('2026-02-28');
    expect(reminderOffsets({ recurrenceFrequency: 'monthly' })).toEqual([10, 5]);
    expect(reminderOffsets({ recurrenceFrequency: 'weekly', recurrenceInterval: 1 })).toEqual([3, 1]);
  });
  it('creates the 10-day reminder once and adds the 5-day reminder without advancing the due date', async () => {
    const row = await lead();
    const cycle = await sync(row.id);
    await sync(row.id);
    expect(await prisma.task.count({ where: { id: { startsWith: `recurrence:${cycle.id}:` } } })).toBe(1);
    await withRecurringLead(row.id, actor, (tx, current) => syncRecurringLead(tx, current, shiftDate(today, 5)));
    expect(await prisma.task.count({ where: { id: { startsWith: `recurrence:${cycle.id}:` } } })).toBe(2);
    const saved = await prisma.lead.findUnique({ where: { id: row.id } });
    expect(saved.nextRecurrenceDate).toBe(row.nextRecurrenceDate);
  }, 30000);
  it('keeps missed cycles overdue across list reads and blocks other reps', async () => {
    const row = await lead({ recurrenceDate: shiftDate(today, -40), nextRecurrenceDate: shiftDate(today, -10) });
    await sync(row.id);
    const page = await listRecordsPage('leads', actor, { id: row.id, recurring: 'true', recurrenceView: 'overdue' });
    expect(page.items[0].nextRecurrenceDate).toBe(shiftDate(today, -10));
    expect((await listRecordsPage('leads', other, { id: row.id })).items).toHaveLength(0);
    await expect(getRecurringLeadHistory(row.id, other)).rejects.toMatchObject({ statusCode: 404 });
  }, 30000);
  it('marks a missed reminder overdue even before the expected purchase date', async () => {
    const row = await lead({ nextRecurrenceDate: shiftDate(today, 9), recurrenceDate: shiftDate(today, 9) });
    await sync(row.id);
    const page = await listRecordsPage('leads', actor, { id: row.id, recurrenceView: 'overdue' });
    expect(page.items).toHaveLength(1);
    expect(page.items[0].nextFollowUpDate).toBe(shiftDate(today, -1));
    expect(page.items[0].nextRecurrenceDate).toBe(shiftDate(today, 9));
  }, 30000);
  it('requires notes and a next action; a review does not close the purchase cycle', async () => {
    const row = await lead(); const cycle = await sync(row.id);
    await expect(updateRecurringCycle(row.id, report(cycle, { note: '' }), actor)).rejects.toMatchObject({ statusCode: 400 });
    await expect(updateRecurringCycle(row.id, report(cycle, { nextActionDate: null }), actor)).rejects.toMatchObject({ statusCode: 400 });
    const saved = await updateRecurringCycle(row.id, report(cycle), actor);
    expect(saved.lead.lastRecurringReviewDate).toBe(today);
    expect(saved.lead.nextRecurrenceDate).toBe(row.nextRecurrenceDate);
    expect((await listRecordsPage('leads', actor, { id: row.id, recurrenceView: 'missing' })).items).toHaveLength(0);
    expect(await prisma.activity.count({ where: { linkedId: row.id, type: 'Recurrence update' } })).toBe(1);
    await expect(updateRecurringCycle(row.id, report(cycle), actor)).rejects.toMatchObject({ statusCode: 409 });
  }, 30000);
  it('preserves postponement history and requires manager approval for pause', async () => {
    const row = await lead(); const cycle = await sync(row.id);
    const postponed = await updateRecurringCycle(row.id, report(cycle, { outcome: 'postponed', expectedDate: shiftDate(today, 20) }), actor);
    expect(postponed.cycle.originalDate).toBe(row.nextRecurrenceDate);
    expect(postponed.cycle.expectedDate).toBe(shiftDate(today, 20));
    await expect(controlRecurringLead(row.id, { paused: true, reason: 'Customer requested a pause' }, actor)).rejects.toMatchObject({ statusCode: 403 });
    await controlRecurringLead(row.id, { paused: true, reason: 'Customer requested a pause' }, manager);
    expect(await sync(row.id)).toBeNull();
    await expect(updateRecurringCycle(row.id, report(postponed.cycle), actor)).rejects.toMatchObject({ statusCode: 409 });
    expect((await listRecordsPage('leads', actor, { id: row.id, recurrenceView: 'paused' })).items).toHaveLength(1);
    await controlRecurringLead(row.id, { paused: false, reason: 'Customer ready for contact' }, manager);
    expect((await sync(row.id)).id).toBe(cycle.id);
  }, 30000);
  it('records confirmation separately and requires a linked won deal for a received purchase', async () => {
    const row = await lead(); const cycle = await sync(row.id);
    const confirmed = await updateRecurringCycle(row.id, report(cycle, { outcome: 'confirmed' }), actor);
    expect(confirmed.cycle.status).toBe('confirmed');
    expect(confirmed.lead.nextRecurrenceDate).toBe(row.nextRecurrenceDate);
    await expect(updateRecurringCycle(row.id, report(confirmed.cycle, { outcome: 'purchased' }), actor)).rejects.toMatchObject({ statusCode: 400 });
    const stage = await prisma.stage.findFirst();
    const dealId = `recurrence-deal-${randomUUID()}`; dealIds.push(dealId);
    await prisma.deal.create({ data: { id: dealId, title: 'QA purchase', leadId: row.id,
      ownerId: actor.id, ownerName: actor.name, stageId: stage.id, stageName: stage.name, pipelineId: stage.pipelineId, status: 'Won' } });
    const purchased = await updateRecurringCycle(row.id, report(confirmed.cycle, { outcome: 'purchased', dealId }), actor);
    expect(purchased.cycle.confirmedDealId).toBe(dealId);
    expect(purchased.lead.nextRecurrenceDate > row.nextRecurrenceDate).toBe(true);
    expect(await prisma.leadRecurrenceCycle.count({ where: { leadId: row.id } })).toBe(2);
  }, 30000);
  it('does not allow ordinary task completion or deletion to bypass required cycle updates', async () => {
    const row = await lead(); const cycle = await sync(row.id);
    const reminder = await prisma.task.findFirst({ where: { id: { startsWith: `recurrence:${cycle.id}:` } } });
    await expect(updateTask(reminder.id, { status: 'completed' })).rejects.toMatchObject({ statusCode: 409 });
    await expect(deleteTask(reminder.id)).rejects.toMatchObject({ statusCode: 409 });
    expect((await prisma.task.findUnique({ where: { id: reminder.id } })).status).toBe('pending');
  }, 30000);
  it('allows the assigned rep to report a cycle through the API policy while protecting schedule settings', async () => {
    const row = await lead();
    const request = { path: `/leads/${row.id}/recurrence-update`, method: 'POST', user: actor, body: {} };
    await new Promise((resolve, reject) => authorizeCRM(request, {}, error => error ? reject(error) : resolve()));
    await expect(new Promise((resolve, reject) => authorizeCRM({ ...request, path: `/leads/${row.id}`, body: { recurrenceInterval: 5 } }, {}, error => error ? reject(error) : resolve())))
      .rejects.toMatchObject({ statusCode: 403 });
  }, 30000);
  it('saves a weekly lead and preserves the open cycle when editing its future schedule', async () => {
    const id = `recurrence-test-${randomUUID()}`; leadIds.push(id);
    const created = await createLead({ id, title: 'Weekly QA recurring lead', ownerId: actor.id, ownerName: actor.name,
      isRecurring: true, recurrenceDate: shiftDate(today, 7), recurrenceFrequency: 'weekly', recurrenceInterval: 1 });
    expect(created.nextRecurrenceDate).toBe(shiftDate(today, 7));
    const edited = await updateLead(id, { recurrenceInterval: 2 });
    expect(edited.nextRecurrenceDate).toBe(created.nextRecurrenceDate);
    const changedAnchor = await updateLead(id, { recurrenceDate: shiftDate(today, 15) });
    expect(changedAnchor.nextRecurrenceDate).toBe(created.nextRecurrenceDate);
    await expect(updateLead(id, { nextFollowUpDate: shiftDate(today, 30) })).rejects.toMatchObject({ statusCode: 409 });
  }, 30000);
  it('serializes competing reports without losing or duplicating a recorded outcome', async () => {
    const row = await lead(); const cycle = await sync(row.id);
    const results = await Promise.allSettled([
      updateRecurringCycle(row.id, report(cycle, { note: 'First concurrent outcome recorded.' }), actor),
      updateRecurringCycle(row.id, report(cycle, { note: 'Second concurrent outcome recorded.' }), actor),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find(result => result.status === 'rejected').reason).toMatchObject({ statusCode: 409 });
    expect(await prisma.activity.count({ where: { linkedId: row.id, type: 'Recurrence update' } })).toBe(1);
  }, 30000);
  it('moves pending reminders to a newly assigned rep and preserves a legacy expected date', async () => {
    const row = await lead({ recurrenceDate: shiftDate(today, -20), nextRecurrenceDate: shiftDate(today, 10) });
    // A legacy record can have a next date later than its schedule anchor.
    await updateLead(row.id, { ownerId: other.id, ownerName: other.name, recurrenceDate: row.recurrenceDate, recurrenceFrequency: 'monthly', recurrenceInterval: 1 });
    const saved = await prisma.lead.findUnique({ where: { id: row.id } });
    expect(saved.nextRecurrenceDate).toBe(row.nextRecurrenceDate);
    expect(await prisma.task.count({ where: { linkedId: row.id, status: 'pending', ownerId: other.id } })).toBeGreaterThan(0);
    expect(await prisma.task.count({ where: { linkedId: row.id, status: 'pending', ownerId: actor.id } })).toBe(0);
    await expect(getRecurringLeadHistory(row.id, actor)).rejects.toMatchObject({ statusCode: 404 });
  }, 30000);
});
