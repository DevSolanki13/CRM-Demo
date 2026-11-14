import { randomUUID } from 'node:crypto';
import { prisma } from '../prisma.js';
import { shiftDate, getNextLeadRecurrenceDate } from '../../shared/leadRecurrence.js';
import { withRecurringLead } from './leadRecurrenceService.js';

const MANAGERS = ['Admin', 'Manager'];
const CLOSED_CYCLE_STATUSES = ['purchased', 'not_buying'];
const FOLLOW_UP_STATUSES = ['pending', 'overdue'];
const VALID_CURRENT_STATUSES = ['In Progress', 'On Hold', 'Customer Not Responding', 'Lost'];
const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };
const privileged = actor => MANAGERS.includes(actor?.role);

function localDateInTimeZone(value, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = type => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function dateOffset(date, offset) {
  const result = shiftDate(date, offset);
  if (!result) throw new Error(`Invalid recurring follow-up date: ${date}`);
  return result;
}

function daysBetween(start, end) {
  return Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
}

function followUpUrl(leadId, followUpId) {
  return `/leads/recurring/${encodeURIComponent(leadId)}?followUp=${encodeURIComponent(followUpId)}`;
}

async function appendHistory(tx, lead, data) {
  const dedupeKey = data.dedupeKey || `lead-history:${randomUUID()}`;
  const { dedupeKey: _dedupeKey, ...entry } = data;
  const record = {
      id: `lh-${randomUUID()}`,
      leadId: lead.id,
      leadTitle: lead.title,
      dedupeKey,
      ...entry,
  };
  const existing = await tx.leadHistory.findUnique({ where: { dedupeKey } });
  if (existing) return existing;
  return tx.leadHistory.create({ data: record });
}

async function notify(tx, userId, eventType, title, body, href, dedupeKey) {
  if (!userId) return null;
  return tx.userNotification.upsert({
    where: { dedupeKey },
    create: { id: `ntf-${randomUUID()}`, userId, eventType, title, body, href, dedupeKey },
    update: {},
  });
}

function completionTriggerDate(cycle, timeZone) {
  if (!cycle.reviewedAt) return cycle.expectedDate;
  const reviewedDate = localDateInTimeZone(new Date(cycle.reviewedAt), timeZone);
  return reviewedDate > cycle.expectedDate ? reviewedDate : cycle.expectedDate;
}

export function validateRecurringFollowUpSubmission(input, today) {
  if (!['completed', 'not_completed'].includes(input.outcome)) fail(400, 'Choose a follow-up outcome.');
  if (input.outcome === 'completed') {
    if (!Number.isFinite(input.dealValue) || input.dealValue < 0) fail(400, 'Enter a valid deal value.');
    if (!input.completionDate || input.completionDate > today) fail(400, 'Enter a valid completion date.');
  } else {
    if (!input.updateText?.trim()) fail(400, 'Enter a reason or update.');
    if (!VALID_CURRENT_STATUSES.includes(input.currentStatus)) fail(400, 'Choose a current status.');
    if (!input.nextFollowUpDate || input.nextFollowUpDate < today) fail(400, 'Choose a follow-up date today or later.');
    if (input.currentStatus === 'Lost' && !input.lostReason?.trim()) fail(400, 'Enter a lost reason.');
  }
  return input;
}

async function reassignFollowUp(tx, followUp, lead, owner, actor, now = new Date()) {
  const timeZone = owner?.timeZone || followUp.assigneeTimeZone || 'UTC';
  const settings = await tx.branding.findUnique({ where: { id: 'default' } });
  const dueDate = owner
    ? dateOffset(completionTriggerDate(followUp.cycle, timeZone), settings?.recurringFollowUpDueDays ?? 2)
    : followUp.dueDate;
  const localToday = localDateInTimeZone(now, timeZone);
  const status = owner ? dueDate < localToday ? 'overdue' : 'pending' : followUp.status;
  const updated = await tx.recurringLeadFollowUp.update({
    where: { id: followUp.id },
    data: {
      assigneeId: owner?.id || null,
      assigneeName: owner?.name || null,
      assigneeTimeZone: timeZone,
      dueDate,
      status,
    },
  });
  await tx.task.update({
    where: { id: followUp.taskId },
    data: { ownerId: owner?.id || null, ownerName: owner?.name || null, dueDate, status },
  });
  await appendHistory(tx, lead, {
    cycleId: followUp.cycleId,
    followUpId: followUp.id,
    cycleNumber: followUp.cycleNumber,
    eventType: 'follow_up_reassigned',
    dueDate,
    statusFrom: followUp.assigneeId || 'unassigned',
    statusTo: owner?.id || 'unassigned',
    actorId: actor?.id || null,
    actorName: actor?.name || 'Automation',
    metadata: {
      previousAssigneeId: followUp.assigneeId,
      assigneeId: owner?.id || null,
      previousTimeZone: followUp.assigneeTimeZone,
      timeZone,
      previousDueDate: followUp.dueDate,
      dueDate,
      status,
    },
  });
  if (status === 'overdue' && followUp.status !== 'overdue') {
    await appendHistory(tx, lead, {
      cycleId: followUp.cycleId,
      followUpId: followUp.id,
      cycleNumber: followUp.cycleNumber,
      eventType: 'follow_up_overdue',
      outcome: 'overdue',
      dueDate,
      statusFrom: followUp.status,
      statusTo: 'overdue',
      actorId: actor?.id || null,
      actorName: actor?.name || 'Automation',
      dedupeKey: `follow-up-overdue:${followUp.id}`,
    });
  }
  await notify(tx, owner?.id, 'follow_up_reassigned', 'Recurring lead follow-up reassigned',
    `You are now responsible for ${followUp.task.title}.`, followUpUrl(lead.id, followUp.id),
    `follow-up-reassigned:${followUp.id}:${owner?.id || 'unassigned'}`);
  return updated;
}

async function createFollowUpForCycle(cycleId, now, database) {
  return database.$transaction(async tx => {
    const cycle = await tx.leadRecurrenceCycle.findUnique({
      where: { id: cycleId },
      include: { lead: true },
    });
    if (!cycle || cycle.lead.archivedAt || !cycle.lead.isRecurring || cycle.lead.recurrencePaused) return false;
    if (await tx.recurringLeadFollowUp.findUnique({ where: { cycleId } })) return false;
    const owner = cycle.lead.ownerId
      ? await tx.user.findFirst({ where: { id: cycle.lead.ownerId, active: true } })
      : null;
    if (!owner) return false;
    const timeZone = owner.timeZone || 'UTC';
    const localToday = localDateInTimeZone(now, timeZone);
    if (!CLOSED_CYCLE_STATUSES.includes(cycle.status) && cycle.expectedDate > localToday) return false;

    const settings = await tx.branding.findUnique({ where: { id: 'default' } });
    const dueDays = settings?.recurringFollowUpDueDays ?? 2;
    const dueDate = dateOffset(completionTriggerDate(cycle, timeZone), dueDays);
    const taskId = `recurrence:${cycle.id}:follow-up`;
    const company = cycle.lead.companyName?.trim() || 'No company';
    const title = `Follow-up: ${cycle.lead.title} - ${company} - Cycle ${cycle.cycleNumber}`;
    const createdAt = new Date(now);
    const task = await tx.task.upsert({
      where: { id: taskId },
      create: {
        id: taskId,
        title,
        dueDate,
        type: 'Follow-up',
        linkedType: 'Lead',
        linkedId: cycle.leadId,
        linkedTitle: cycle.lead.title,
        ownerId: owner.id,
        ownerName: owner.name,
        status: dueDate < localToday ? 'overdue' : 'pending',
        note: 'Complete the recurring lead follow-up form to record this cycle outcome.',
        createdAt: localToday,
      },
      update: {
        title,
        dueDate,
        ownerId: owner.id,
        ownerName: owner.name,
      },
    });
    const followUp = await tx.recurringLeadFollowUp.create({
      data: {
        id: `rlf-${randomUUID()}`,
        leadId: cycle.leadId,
        cycleId: cycle.id,
        taskId: task.id,
        cycleNumber: cycle.cycleNumber,
        assigneeId: owner.id,
        assigneeName: owner.name,
        assigneeTimeZone: timeZone,
        dueDate,
        status: dueDate < localToday ? 'overdue' : 'pending',
        createdAt,
      },
    });

    await appendHistory(tx, cycle.lead, {
      cycleId: cycle.id,
      followUpId: followUp.id,
      cycleNumber: cycle.cycleNumber,
      eventType: 'follow_up_created',
      followUpCreatedAt: createdAt,
      dueDate,
      actorId: null,
      actorName: 'Automation',
      dedupeKey: `follow-up-created:${cycle.id}`,
    });
    if (followUp.status === 'overdue') {
      await appendHistory(tx, cycle.lead, {
        cycleId: cycle.id,
        followUpId: followUp.id,
        cycleNumber: cycle.cycleNumber,
        eventType: 'follow_up_overdue',
        outcome: 'overdue',
        dueDate,
        statusFrom: 'pending',
        statusTo: 'overdue',
        actorName: 'Automation',
        dedupeKey: `follow-up-overdue:${followUp.id}`,
      });
    }
    await notify(tx, owner.id, 'follow_up_created', 'Recurring lead follow-up assigned',
      `Complete ${title} by ${dueDate}.`, followUpUrl(cycle.leadId, followUp.id),
      `follow-up-created:${cycle.id}`);
    return true;
  }, { isolationLevel: 'Serializable', timeout: 15000 });
}

async function createDueFollowUps(now, database) {
  let cursor;
  let created = 0;
  while (true) {
    const cycles = await database.leadRecurrenceCycle.findMany({
      where: {
        followUp: null,
        lead: { isRecurring: true, recurrencePaused: false, archivedAt: null },
      },
      select: { id: true },
      orderBy: [{ leadId: 'asc' }, { cycleNumber: 'asc' }],
      take: 100,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (!cycles.length) break;
    for (const cycle of cycles) {
      if (await createFollowUpForCycle(cycle.id, now, database)) created++;
    }
    cursor = cycles.at(-1).id;
  }
  return created;
}

async function cancelFollowUp(tx, followUp, lead, reason, actor) {
  if (!FOLLOW_UP_STATUSES.includes(followUp.status)) return false;
  await tx.recurringLeadFollowUp.update({ where: { id: followUp.id }, data: { status: 'cancelled' } });
  await tx.task.update({ where: { id: followUp.taskId }, data: { status: 'cancelled', resolution: reason } });
  await appendHistory(tx, lead, {
    cycleId: followUp.cycleId,
    followUpId: followUp.id,
    cycleNumber: followUp.cycleNumber,
    eventType: 'follow_up_cancelled',
    dueDate: followUp.dueDate,
    statusFrom: followUp.status,
    statusTo: 'cancelled',
    actorId: actor?.id || null,
    actorName: actor?.name || 'Automation',
    updateText: reason,
  });
  return true;
}

async function processOpenFollowUp(id, now, database) {
  return database.$transaction(async tx => {
    let followUp = await tx.recurringLeadFollowUp.findUnique({
      where: { id },
      include: { lead: true, cycle: true, task: true, assignee: true },
    });
    if (!followUp || !FOLLOW_UP_STATUSES.includes(followUp.status)) return null;
    const lead = followUp.lead;
    if (lead.archivedAt || !lead.isRecurring) {
      await cancelFollowUp(tx, followUp, lead, 'Lead archived or no longer recurring.', null);
      return { status: 'cancelled', reminded: false, escalated: false };
    }

    const owner = lead.ownerId
      ? await tx.user.findFirst({ where: { id: lead.ownerId, active: true } })
      : null;
    if (!owner) return null;
    const timeZone = owner.timeZone || 'UTC';
    const today = localDateInTimeZone(now, timeZone);
    if (followUp.assigneeId !== owner.id || followUp.assigneeTimeZone !== timeZone) {
      followUp = { ...followUp, ...await reassignFollowUp(tx, followUp, lead, owner, null, now) };
    }

    let status = followUp.status;
    if (status === 'pending' && followUp.dueDate < today) {
      status = 'overdue';
      await tx.recurringLeadFollowUp.update({ where: { id }, data: { status } });
      await tx.task.update({ where: { id: followUp.taskId }, data: { status: 'overdue' } });
      await appendHistory(tx, lead, {
        cycleId: followUp.cycleId,
        followUpId: id,
        cycleNumber: followUp.cycleNumber,
        eventType: 'follow_up_overdue',
        outcome: 'overdue',
        dueDate: followUp.dueDate,
        statusFrom: 'pending',
        statusTo: 'overdue',
        actorName: 'Automation',
        dedupeKey: `follow-up-overdue:${id}`,
      });
    }

    const settings = await tx.branding.findUnique({ where: { id: 'default' } });
    const reminderInterval = settings?.recurringFollowUpReminderDays ?? 1;
    const reminderDue = followUp.dueDate <= today &&
      (!followUp.lastReminderDate || daysBetween(followUp.lastReminderDate, today) >= reminderInterval);
    let reminderCount = followUp.reminderCount;
    if (reminderDue) {
      reminderCount++;
      await notify(tx, owner.id, 'follow_up_reminder', 'Recurring lead follow-up is due',
        `${followUp.task.title} is due ${followUp.dueDate}.`, followUpUrl(lead.id, id),
        `follow-up-reminder:${id}:${today}`);
      await appendHistory(tx, lead, {
        cycleId: followUp.cycleId,
        followUpId: id,
        cycleNumber: followUp.cycleNumber,
        eventType: 'follow_up_reminder_sent',
        dueDate: followUp.dueDate,
        actorName: 'Automation',
        metadata: { recipientId: owner.id, reminderNumber: reminderCount, reminderDate: today },
        dedupeKey: `follow-up-reminder:${id}:${today}`,
      });
      await tx.recurringLeadFollowUp.update({ where: { id }, data: { reminderCount, lastReminderDate: today } });
    }

    const escalationDays = settings?.recurringFollowUpEscalationDays ?? 3;
    let escalated = false;
    if (status === 'overdue' && daysBetween(followUp.dueDate, today) >= escalationDays && !followUp.managerNotifiedAt) {
      const managers = await tx.user.findMany({ where: { active: true, role: { in: MANAGERS } }, select: { id: true } });
      if (managers.length) {
        for (const manager of managers) {
          await notify(tx, manager.id, 'follow_up_escalation', 'Recurring lead follow-up is overdue',
            `${owner.name} has an overdue follow-up for ${lead.title}.`, followUpUrl(lead.id, id),
            `follow-up-escalation:${id}:${manager.id}`);
        }
        await appendHistory(tx, lead, {
          cycleId: followUp.cycleId,
          followUpId: id,
          cycleNumber: followUp.cycleNumber,
          eventType: 'manager_escalation_sent',
          dueDate: followUp.dueDate,
          actorName: 'Automation',
          metadata: { recipientIds: managers.map(manager => manager.id), daysOverdue: daysBetween(followUp.dueDate, today) },
          dedupeKey: `follow-up-escalation:${id}`,
        });
        await tx.recurringLeadFollowUp.update({ where: { id }, data: { managerNotifiedAt: now } });
        escalated = true;
      }
    }

    return { status, reminded: reminderDue, escalated };
  });
}

export async function processRecurringFollowUps(now = new Date(), database = prisma) {
  const created = await createDueFollowUps(now, database);
  let cursor;
  let processed = 0;
  const outcomes = { created, overdue: 0, reminders: 0, escalated: 0, cancelled: 0 };
  while (true) {
    const rows = await database.recurringLeadFollowUp.findMany({
      where: { status: { in: FOLLOW_UP_STATUSES } },
      select: { id: true, status: true, dueDate: true, lastReminderDate: true, managerNotifiedAt: true },
      orderBy: { id: 'asc' },
      take: 100,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (!rows.length) break;
    for (const row of rows) {
      const previousStatus = row.status;
      const result = await processOpenFollowUp(row.id, now, database);
      if (result?.status === 'cancelled') outcomes.cancelled++;
      else if (result?.status === 'overdue' && previousStatus !== 'overdue') outcomes.overdue++;
      if (result?.reminded) outcomes.reminders++;
      if (result?.escalated) outcomes.escalated++;
      processed++;
    }
    cursor = rows.at(-1).id;
  }
  return { processed, ...outcomes };
}

async function visibleFollowUp(tx, leadId, followUpId, actor, lock = false) {
  const lead = await tx.lead.findUnique({ where: { id: leadId } });
  if (!lead || (!privileged(actor) && lead.ownerId !== actor.id)) fail(404, 'Lead not found.');
  const followUp = await tx.recurringLeadFollowUp.findFirst({
    where: { id: followUpId, leadId },
    include: { task: true, cycle: true },
  });
  if (!followUp || (!privileged(actor) && followUp.assigneeId !== actor.id)) fail(404, 'Follow-up not found.');
  if (lock) await tx.$queryRaw`SELECT id FROM "RecurringLeadFollowUp" WHERE id = ${followUpId} FOR UPDATE`;
  return { lead, followUp };
}

export async function getRecurringFollowUp(leadId, followUpId, actor) {
  return prisma.$transaction(tx => visibleFollowUp(tx, leadId, followUpId, actor));
}

export async function submitRecurringFollowUp(leadId, followUpId, input, actor, now = new Date()) {
  return withRecurringLead(leadId, actor, async (tx, lead) => {
    if (lead.archivedAt) fail(409, 'This recurring lead is archived.');
    const { followUp } = await visibleFollowUp(tx, leadId, followUpId, actor, true);
    if (actor.id !== followUp.assigneeId) fail(403, 'Only the assigned person can submit this follow-up.');
    if (!FOLLOW_UP_STATUSES.includes(followUp.status)) fail(409, 'This follow-up is no longer pending.');

    const outcome = input.outcome;
    const timeZone = followUp.assigneeTimeZone || 'UTC';
    const today = localDateInTimeZone(now, timeZone);
    validateRecurringFollowUpSubmission(input, today);

    const timestamp = new Date(now);
    const oldLeadStatus = lead.status || '';
    const savedFollowUp = await tx.recurringLeadFollowUp.update({
      where: { id: followUpId },
      data: {
        status: 'completed',
        completedAt: timestamp,
        outcome,
        updateText: input.updateText?.trim() || null,
        dealValue: outcome === 'completed' ? input.dealValue : null,
        completionDate: outcome === 'completed' ? input.completionDate : null,
        currentStatus: outcome === 'not_completed' ? input.currentStatus : null,
        lostReason: input.currentStatus === 'Lost' ? input.lostReason.trim() : null,
        nextFollowUpDate: outcome === 'not_completed' ? input.nextFollowUpDate : null,
        notes: input.notes?.trim() || null,
      },
    });
    await tx.task.update({
      where: { id: followUp.taskId },
      data: { status: 'completed', resolution: outcome === 'completed' ? 'Deal completed' : `Not completed: ${input.currentStatus}` },
    });
    await tx.task.updateMany({
      where: {
        linkedType: 'Lead',
        linkedId: leadId,
        status: { in: ['pending', 'overdue'] },
        AND: [{ id: { not: followUp.taskId } }],
        OR: [
          { id: { startsWith: `recurrence:${followUp.cycleId}:` } },
          { id: `recurrence-action:${followUp.cycleId}` },
          { id: { startsWith: `recurrence-review:${leadId}:` } },
        ],
      },
      data: { status: 'completed', resolution: 'Recurring follow-up submitted.' },
    });

    let statusFrom = followUp.cycle.status;
    let statusTo;
    let updatedLead;
    if (outcome === 'completed') {
      const nextDate = getNextLeadRecurrenceDate(
        lead.recurrenceDate,
        lead.recurrenceFrequency,
        lead.recurrenceInterval || 1,
        input.completionDate > followUp.cycle.expectedDate ? input.completionDate : followUp.cycle.expectedDate,
        lead.recurrenceDays || [],
      );
      if (!nextDate) fail(400, 'The schedule cannot produce a next cycle. Ask a manager to correct it.');
      statusTo = 'purchased';
      await tx.leadRecurrenceCycle.update({
        where: { id: followUp.cycleId },
        data: { status: statusTo, reviewedAt: timestamp.toISOString(), reviewedById: actor.id, reviewedByName: actor.name,
          nextActionDate: null, note: input.notes?.trim() || input.updateText?.trim() || null },
      });
      updatedLead = await tx.lead.update({ where: { id: leadId }, data: {
        nextRecurrenceDate: nextDate,
        recurrenceState: 'awaiting',
        nextFollowUpDate: null,
        lastRecurringReviewDate: today,
        lastActivityDate: today,
      } });
    } else if (input.currentStatus === 'Lost') {
      statusTo = 'not_buying';
      await tx.leadRecurrenceCycle.update({
        where: { id: followUp.cycleId },
        data: { status: statusTo, reviewedAt: timestamp.toISOString(), reviewedById: actor.id, reviewedByName: actor.name,
          nextActionDate: null, note: `${input.updateText.trim()} — Lost: ${input.lostReason.trim()}` },
      });
      updatedLead = await tx.lead.update({ where: { id: leadId }, data: {
        status: 'Lost',
        recurrencePaused: true,
        recurrencePauseReason: input.lostReason.trim(),
        recurrenceState: 'not_buying',
        nextFollowUpDate: null,
        lastRecurringReviewDate: today,
        lastActivityDate: today,
      } });
      const remaining = await tx.recurringLeadFollowUp.findMany({
        where: { leadId, id: { not: followUpId }, status: { in: FOLLOW_UP_STATUSES } },
      });
      for (const pending of remaining) await cancelFollowUp(tx, pending, lead, 'Lead marked Lost.', actor);
      await tx.task.updateMany({
        where: { linkedType: 'Lead', linkedId: leadId, status: { in: ['pending', 'overdue'] } },
        data: { status: 'cancelled', resolution: 'Lead marked Lost.' },
      });
    } else {
      statusTo = input.currentStatus === 'In Progress' ? 'attempted' : 'awaiting';
      await tx.leadRecurrenceCycle.update({
        where: { id: followUp.cycleId },
        data: { status: statusTo, reviewedAt: timestamp.toISOString(), reviewedById: actor.id, reviewedByName: actor.name,
          nextActionDate: input.nextFollowUpDate, note: input.updateText.trim() },
      });
      updatedLead = await tx.lead.update({ where: { id: leadId }, data: {
        status: input.currentStatus,
        recurrenceState: statusTo,
        nextFollowUpDate: input.nextFollowUpDate,
        lastRecurringReviewDate: today,
        lastActivityDate: today,
      } });
      const nextTaskId = `recurrence-action:${followUp.cycleId}`;
      await tx.task.upsert({
        where: { id: nextTaskId },
        create: { id: nextTaskId, title: `Follow up: ${lead.title}`, dueDate: input.nextFollowUpDate,
          type: 'Call', linkedType: 'Lead', linkedId: leadId, linkedTitle: lead.title,
          ownerId: lead.ownerId, ownerName: lead.ownerName, status: 'pending',
          note: input.updateText.trim(), createdAt: today },
        update: { status: 'pending', dueDate: input.nextFollowUpDate, note: input.updateText.trim(),
          ownerId: lead.ownerId, ownerName: lead.ownerName, resolution: null },
      });
    }

    await appendHistory(tx, lead, {
      cycleId: followUp.cycleId,
      followUpId,
      cycleNumber: followUp.cycleNumber,
      eventType: 'follow_up_submitted',
      followUpCreatedAt: followUp.createdAt,
      dueDate: followUp.dueDate,
      completedAt: timestamp,
      outcome,
      updateText: input.updateText?.trim() || null,
      dealValue: outcome === 'completed' ? input.dealValue : null,
      statusFrom,
      statusTo,
      actorId: actor.id,
      actorName: actor.name,
      metadata: {
        completionDate: input.completionDate || null,
        currentStatus: input.currentStatus || null,
        lostReason: input.lostReason || null,
        nextFollowUpDate: input.nextFollowUpDate || null,
        notes: input.notes || null,
      },
      dedupeKey: `follow-up-submitted:${followUpId}`,
    });
    if (oldLeadStatus !== (updatedLead.status || '')) {
      await appendHistory(tx, updatedLead, {
        cycleId: followUp.cycleId,
        followUpId,
        cycleNumber: followUp.cycleNumber,
        eventType: 'lead_status_changed',
        statusFrom: oldLeadStatus,
        statusTo: updatedLead.status || '',
        actorId: actor.id,
        actorName: actor.name,
      });
    }

    return { followUp: savedFollowUp, lead: updatedLead };
  });
}

export async function listLeadHistory(leadId, actor, { cycleNumber, outcome } = {}) {
  const parsedCycleNumber = cycleNumber == null || cycleNumber === '' ? undefined : Number(cycleNumber);
  if (parsedCycleNumber !== undefined && (!Number.isInteger(parsedCycleNumber) || parsedCycleNumber < 1)) {
    fail(400, 'Choose a valid cycle number.');
  }
  if (outcome && !['completed', 'not_completed', 'overdue'].includes(outcome)) {
    fail(400, 'Choose a valid follow-up outcome.');
  }
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, ...(privileged(actor) ? {} : { ownerId: actor.id }) },
    select: { id: true },
  });
  if (!lead) fail(404, 'Lead not found.');
  return prisma.leadHistory.findMany({
    where: {
      leadId,
      ...(parsedCycleNumber ? { cycleNumber: parsedCycleNumber } : {}),
      ...(outcome ? { outcome } : {}),
    },
    orderBy: { timestamp: 'desc' },
    take: 500,
  });
}

export async function markNotificationRead(notificationId, actor) {
  const notification = await prisma.userNotification.findFirst({
    where: { id: notificationId, userId: actor.id },
  });
  if (!notification) fail(404, 'Notification not found.');
  return prisma.userNotification.update({
    where: { id: notificationId },
    data: { readAt: notification.readAt || new Date() },
  });
}

export async function listNotifications(actor) {
  return prisma.userNotification.findMany({
    where: { userId: actor.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function archiveRecurringLead(leadId, actor) {
  if (!privileged(actor)) fail(403, 'Manager permission required to archive a recurring lead.');
  return withRecurringLead(leadId, actor, async (tx, lead) => {
    if (lead.archivedAt) return lead;
    const timestamp = new Date();
    const updatedLead = await tx.lead.update({ where: { id: leadId }, data: { archivedAt: timestamp } });
    const pending = await tx.recurringLeadFollowUp.findMany({
      where: { leadId, status: { in: FOLLOW_UP_STATUSES } },
    });
    for (const followUp of pending) await cancelFollowUp(tx, followUp, lead, 'Lead archived.', actor);
    await tx.task.updateMany({
      where: { linkedType: 'Lead', linkedId: leadId, status: { in: ['pending', 'overdue'] } },
      data: { status: 'cancelled', resolution: 'Lead archived.' },
    });
    await appendHistory(tx, updatedLead, {
      eventType: 'lead_archived',
      statusFrom: 'active',
      statusTo: 'archived',
      actorId: actor.id,
      actorName: actor.name,
      timestamp,
    });
    return updatedLead;
  });
}

export async function recordRecurringLeadStatusChange(tx, before, after, actor) {
  if (!before?.isRecurring || !after || before.status === after.status) return;
  await appendHistory(tx, after, {
    eventType: 'lead_status_changed',
    statusFrom: before.status || '',
    statusTo: after.status || '',
    actorId: actor?.id || null,
    actorName: actor?.name || 'System',
  });
}

export async function recordRecurringLeadReassignment(tx, before, after, actor) {
  if (!before?.isRecurring || !after || before.ownerId === after.ownerId) return;
  const pending = await tx.recurringLeadFollowUp.findMany({
    where: { leadId: before.id, status: { in: FOLLOW_UP_STATUSES } },
    include: { cycle: true, task: true },
  });
  const owner = after.ownerId ? await tx.user.findFirst({ where: { id: after.ownerId, active: true } }) : null;
  for (const followUp of pending) {
    await reassignFollowUp(tx, followUp, after, owner, actor);
  }
}
