import { randomUUID } from 'node:crypto';
import { prisma } from '../prisma.js';
import { validatedInput, recurrenceUpdateSchema, recurrenceControlSchema } from '../middleware/validation.js';
import { getLocalDateString } from '../utils/dateUtils.js';
import { isTransactionConflict } from './transactionRetry.js';
import { CLOSED_CYCLE_STATUSES, CYCLE_OUTCOMES, getNextLeadRecurrenceDate, reminderOffsets, shiftDate } from '../../shared/leadRecurrence.js';

const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };
const privileged = actor => ['Admin', 'Manager'].includes(actor?.role);
const activeWhere = { status: { notIn: CLOSED_CYCLE_STATUSES } };

// Serialize schedule, ownership, outcome, and reminder changes for the same lead.
export async function withRecurringLead(id, actor, operation, database = prisma) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await database.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "Lead" WHERE id = ${id} FOR UPDATE`;
        const lead = await tx.lead.findUnique({ where: { id } });
        if (!lead || (actor && !privileged(actor) && lead.ownerId !== actor.id)) fail(404, 'Lead not found.');
        if (!lead.isRecurring) fail(409, 'This lead does not have a recurring schedule.');
        return operation(tx, lead);
      }, { isolationLevel: 'Serializable', timeout: 15000 });
    } catch (error) {
      if (isTransactionConflict(error)) {
        if (attempt < 2) continue;
        fail(409, 'Another update changed this lead. Reload the cycle and try again.');
      }
      throw error;
    }
  }
}

async function task(tx, lead, id, title, dueDate, note, today) {
  await tx.task.upsert({ where: { id }, update: {}, create: {
    id, title, dueDate, note, type: 'Call', linkedType: 'Lead', linkedId: lead.id,
    linkedTitle: lead.title, ownerId: lead.ownerId, ownerName: lead.ownerName,
    status: 'pending', createdAt: today,
  } });
}

export async function syncRecurringLead(tx, lead, today = getLocalDateString()) {
  if (!lead.isRecurring || lead.recurrencePaused) return null;
  let cycle = await tx.leadRecurrenceCycle.findFirst({ where: { leadId: lead.id, ...activeWhere }, orderBy: { createdAt: 'desc' } });
  if (!cycle) {
    const expectedDate = lead.nextRecurrenceDate || lead.recurrenceDate || today;
    const firstFollowUp = lead.nextFollowUpDate || shiftDate(expectedDate, -reminderOffsets(lead)[0]);
    cycle = await tx.leadRecurrenceCycle.upsert({
      where: { leadId_originalDate: { leadId: lead.id, originalDate: expectedDate } }, update: {},
      create: { id: `lrc-${randomUUID()}`, leadId: lead.id, originalDate: expectedDate,
        expectedDate, nextActionDate: firstFollowUp, status: 'awaiting', createdAt: new Date().toISOString() },
    });
    // A closed occurrence is never reopened by a scheduler retry.
    if (CLOSED_CYCLE_STATUSES.includes(cycle.status)) return null;
    await tx.lead.update({ where: { id: lead.id }, data: { nextRecurrenceDate: expectedDate,
      nextFollowUpDate: firstFollowUp, recurrenceState: cycle.status } });
  }
  if (!lead.ownerId) return cycle;
  await tx.task.updateMany({ where: { linkedType: 'Lead', linkedId: lead.id, status: 'pending',
    OR: [{ id: { startsWith: 'recurrence:' } }, { id: { startsWith: 'recurrence-review:' } }, { id: { startsWith: 'recurrence-action:' } }] },
  data: { ownerId: lead.ownerId, ownerName: lead.ownerName } });

  const [first, second] = reminderOffsets(lead);
  if (cycle.status !== 'confirmed') {
    for (const offset of [...new Set([first, second])]) {
      const due = shiftDate(cycle.expectedDate, -offset);
      if (due <= today) await task(tx, lead, `recurrence:${cycle.id}:${cycle.expectedDate}:${offset}`,
        `Confirm rebuy: ${lead.title} (${cycle.expectedDate})`, due,
        `${offset}-day reminder. Expected purchase: ${cycle.expectedDate}. Open Leads → Recurring Leads → Update cycle to record the outcome.`, today);
    }
  } else if (cycle.expectedDate <= today) {
    await task(tx, lead, `recurrence:${cycle.id}:${cycle.expectedDate}:purchase`, `Verify purchase received: ${lead.title}`,
      cycle.expectedDate, 'Confirmation is not a completed purchase. Record the won deal in Update cycle.', today);
  }
  const month = today.slice(0, 7);
  if (!lead.lastRecurringReviewDate || lead.lastRecurringReviewDate.slice(0, 7) < month) {
    const lastDay = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0)).getUTCDate();
    await task(tx, lead, `recurrence-review:${lead.id}:${month}`, `Monthly lead review: ${lead.title}`,
      `${month}-${lastDay}`, 'Record a meaningful cycle update this month, even when the next purchase is several months away.', today);
  }
  return cycle;
}

export async function processRecurringLeads(today = getLocalDateString(), database = prisma) {
  let cursor;
  let processed = 0;
  // Bounded batches; failures are surfaced so the existing automation runner retries.
  while (true) {
    const leads = await database.lead.findMany({ where: { isRecurring: true, recurrencePaused: false },
      select: { id: true }, take: 100, orderBy: { id: 'asc' }, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    if (!leads.length) break;
    for (const lead of leads) {
      await withRecurringLead(lead.id, null, (tx, current) => syncRecurringLead(tx, current, today), database);
      processed++;
    }
    cursor = leads.at(-1).id;
  }
  return { processed };
}

export async function getRecurringLeadHistory(id, actor) {
  return withRecurringLead(id, actor, async (tx, lead) => {
    const current = await syncRecurringLead(tx, lead);
    const cycles = await tx.leadRecurrenceCycle.findMany({ where: { leadId: id }, orderBy: { createdAt: 'desc' }, take: 24 });
    const activities = await tx.activity.findMany({ where: { linkedType: 'Lead', linkedId: id, type: 'Recurrence update' }, orderBy: { timestamp: 'desc' }, take: 30 });
    const deals = await tx.deal.findMany({ where: { leadId: id, ...(privileged(actor) ? {} : { ownerId: actor.id }) },
      select: { id: true, title: true, status: true }, take: 100, orderBy: { id: 'asc' } });
    return { lead: await tx.lead.findUnique({ where: { id } }), current, cycles, activities, deals };
  });
}

export async function updateRecurringCycle(id, input, actor, today = getLocalDateString()) {
  const data = validatedInput(recurrenceUpdateSchema, input);
  return withRecurringLead(id, actor, async (tx, lead) => {
    if (lead.recurrencePaused) fail(409, 'Resume this schedule before updating a cycle.');
    const cycle = await syncRecurringLead(tx, lead, today);
    if (!cycle || cycle.id !== data.cycleId || cycle.reviewedAt !== data.expectedReviewedAt) fail(409, 'This cycle changed. Reload it before saving.');
    const closed = CLOSED_CYCLE_STATUSES.includes(data.outcome);
    if (!closed && (!data.nextActionDate || data.nextActionDate < today)) fail(400, 'Choose a next follow-up date today or later.');
    if (data.outcome === 'postponed' && (!data.expectedDate || data.expectedDate === cycle.expectedDate || data.expectedDate < today)) fail(400, 'Choose a different expected purchase date today or later.');
    if (data.outcome === 'postponed' && data.nextActionDate > data.expectedDate) fail(400, 'Follow up on or before the postponed purchase date.');
    let deal = null;
    if (data.dealId) {
      deal = await tx.deal.findFirst({ where: { id: data.dealId, leadId: id,
        ...(privileged(actor) ? {} : { ownerId: actor.id }) } });
      if (!deal) fail(400, 'Choose a deal linked to this lead that you can access.');
    }
    if (data.outcome === 'purchased' && (!deal || deal.status !== 'Won')) fail(400, 'Select the linked won deal to record an actual purchase.');
    if (data.outcome === 'purchased' && await tx.leadRecurrenceCycle.findFirst({ where: {
      confirmedDealId: deal.id, status: 'purchased', id: { not: cycle.id },
    } })) fail(409, 'This won deal was already recorded for another purchase cycle. Choose the deal for this purchase.');
    const timestamp = new Date(Math.max(Date.now(), cycle.reviewedAt ? Date.parse(cycle.reviewedAt) + 1 : 0)).toISOString();
    const expectedDate = data.outcome === 'postponed' ? data.expectedDate : cycle.expectedDate;
    const saved = await tx.leadRecurrenceCycle.update({ where: { id: cycle.id }, data: {
      status: data.outcome, expectedDate, nextActionDate: closed ? null : data.nextActionDate,
      note: data.note, reviewedAt: timestamp, reviewedById: actor.id, reviewedByName: actor.name,
      ...(deal ? { confirmedDealId: deal.id } : {}),
    } });
    await tx.task.updateMany({ where: { linkedType: 'Lead', linkedId: id, status: 'pending',
      OR: [{ id: { startsWith: `recurrence:${cycle.id}:` } }, { id: `recurrence-action:${cycle.id}` }, { id: { startsWith: `recurrence-review:${id}:` } }] },
    data: { status: 'completed', resolution: `${CYCLE_OUTCOMES[data.outcome]}: ${data.note}` } });
    const nextDate = closed ? getNextLeadRecurrenceDate(lead.recurrenceDate, lead.recurrenceFrequency,
      lead.recurrenceInterval || 1, expectedDate > today ? expectedDate : today, lead.recurrenceDays) : expectedDate;
    if (!nextDate) fail(400, 'The schedule cannot produce a next purchase date. Ask a manager to correct it.');
    const updated = await tx.lead.update({ where: { id }, data: {
      nextRecurrenceDate: nextDate, recurrenceState: closed ? 'awaiting' : data.outcome,
      lastRecurringReviewDate: today, lastActivityDate: today,
      nextFollowUpDate: closed ? null : data.nextActionDate,
    } });
    await tx.activity.create({ data: { id: `act-${randomUUID()}`, type: 'Recurrence update',
      description: `${CYCLE_OUTCOMES[data.outcome]}: ${data.note}`, timestamp, createdAt: today,
      linkedType: 'Lead', linkedId: id, linkedTitle: lead.title, authorId: actor.id, authorName: actor.name,
      metadata: { cycleId: cycle.id, originalDate: cycle.originalDate, expectedDate,
        nextActionDate: data.nextActionDate || null, outcome: data.outcome, dealId: deal?.id || null } } });
    await tx.auditLog.create({ data: { id: `aud-${randomUUID()}`, timestamp, actorId: actor.id, actorName: actor.name,
      action: 'RECURRING_CYCLE_UPDATED', entityType: 'Lead', entityId: id, entityTitle: lead.title,
      reason: data.note, metadata: { cycleId: cycle.id, outcome: data.outcome, fromDate: cycle.expectedDate, toDate: expectedDate } } });
    if (!closed && updated.ownerId) {
      await tx.task.upsert({ where: { id: `recurrence-action:${cycle.id}` },
        create: { id: `recurrence-action:${cycle.id}`, title: `Follow up rebuy: ${lead.title}`, dueDate: data.nextActionDate,
          type: 'Call', linkedType: 'Lead', linkedId: id, linkedTitle: lead.title, ownerId: updated.ownerId,
          ownerName: updated.ownerName, status: 'pending', note: data.note, createdAt: today },
        update: { status: 'pending', dueDate: data.nextActionDate, note: data.note, resolution: null } });
    }
    if (closed) await syncRecurringLead(tx, updated, today);
    return { cycle: saved, lead: await tx.lead.findUnique({ where: { id } }) };
  });
}

export async function controlRecurringLead(id, input, actor) {
  if (!privileged(actor)) fail(403, 'A manager must approve pausing or resuming a recurring lead.');
  const data = validatedInput(recurrenceControlSchema, input);
  return withRecurringLead(id, actor, async (tx, lead) => {
    const updated = await tx.lead.update({ where: { id }, data: { recurrencePaused: data.paused, recurrencePauseReason: data.reason } });
    // Preserve missed tasks and history; pausing suspends future reminder creation.
    await tx.auditLog.create({ data: { id: `aud-${randomUUID()}`, timestamp: new Date().toISOString(), actorId: actor.id,
      actorName: actor.name, action: data.paused ? 'RECURRENCE_PAUSED' : 'RECURRENCE_RESUMED',
      entityType: 'Lead', entityId: id, entityTitle: lead.title, reason: data.reason } });
    if (!data.paused) await syncRecurringLead(tx, updated);
    return updated;
  });
}
