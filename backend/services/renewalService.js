import { randomUUID } from 'node:crypto';
import { prisma } from '../prisma.js';
import { getLocalDateString } from '../utils/dateUtils.js';
import { DEFAULT_FOLLOW_UP_RULES } from './followUpEngine.js';

const conflict = (message) => Object.assign(new Error(message), { statusCode: 409 });

export const addCalendarDays = (dateText, days) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText || '')) return null;
  const date = new Date(`${dateText}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateText) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const nextRenewalDate = (wonOrders, cycle) => {
  if (!Number.isInteger(cycle) || cycle < 1 || !wonOrders.length ||
      wonOrders.some(order => !addCalendarDays(order.actualCloseDate, 0))) return null;
  const latest = wonOrders.reduce((left, right) =>
    left.actualCloseDate > right.actualCloseDate ? left : right);
  return addCalendarDays(latest.actualCloseDate, cycle);
};

const render = (template, deal) => (template || '')
  .replace(/\{\{entityName\}\}/g, deal.title)
  .replace(/\{\{contactName\}\}/g, deal.contactName || 'Key Contact')
  .replace(/\{\{companyName\}\}/g, deal.companyName || 'Corporate Client');

export const ensureRebuyDeal = async (parentDealId, actor = { id: 'system', name: 'System Automation' }) => {
  for (let attempt = 0; attempt < 4; attempt++) {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Deal" WHERE id = ${parentDealId} FOR UPDATE`;
      const parent = await tx.deal.findUnique({ where: { id: parentDealId } });
      if (!parent) return { deal: null, created: false };
      if (parent.parentDealId || !parent.isRecurring || parent.status !== 'Won') {
        throw conflict('Only a won, recurring original deal can generate a rebuy.');
      }
      const children = await tx.deal.findMany({ where: { parentDealId } });
      const active = children.find(child => !['Won', 'Lost'].includes(child.status));
      if (active) return { deal: active, created: false };

      const branding = await tx.branding.findUnique({ where: { id: 'default' } });
      const cycle = parent.recurrenceDays > 0
        ? parent.recurrenceDays : branding?.defaultRecurrenceDays;
      if (!Number.isInteger(cycle) || cycle < 1) throw conflict('A positive recurrence interval is required.');
      const wonOrders = [parent, ...children.filter(child => child.status === 'Won')];
      const dueDate = nextRenewalDate(wonOrders, cycle);
      if (!dueDate) throw conflict('A won order is missing a valid actual close date.');
      const latest = wonOrders.reduce((left, right) =>
        left.actualCloseDate > right.actualCloseDate ? left : right);
      const today = getLocalDateString();
      if (dueDate > today) return { deal: null, created: false, dueDate };

      const renewalStage = await tx.stage.findFirst({ where: { pipelineId: parent.pipelineId, category: 'Buy Again' } });
      if (!renewalStage) throw conflict('A renewal pipeline stage is required.');
      const id = `dl-rebuy-${randomUUID()}`;
      const deal = await tx.deal.create({ data: {
        id, pipelineId: parent.pipelineId, parentDealId, leadId: parent.leadId, title: `${parent.companyName || parent.title} (Renewal Rebuy)`,
        value: parent.value, currency: parent.currency, stageId: renewalStage.id,
        stageName: renewalStage.name, expectedCloseDate: dueDate,
        contactId: parent.contactId, contactName: parent.contactName,
        companyId: parent.companyId, companyName: parent.companyName,
        ownerId: parent.ownerId, ownerName: parent.ownerName,
        isRecurring: true, isRebuy: true, recurrenceDays: cycle,
        status: 'Renewal Due', createdAt: today, updatedAt: today,
        lastActivityDate: today, daysInStage: 0,
        valueHistory: [{ date: today, value: parent.value, stage: renewalStage.name,
          reason: `Renewal due ${dueDate}` }],
        customFields: parent.customFields ?? {},
      } });
      const rules = branding?.customFields?.followUpRules || DEFAULT_FOLLOW_UP_RULES;
      for (const rule of rules.filter(item => item.isActive && item.triggerEvent === 'RENEWAL_APPROACHING')) {
        const taskDueDate = addCalendarDays(today, Number(rule.offsetDays) || 1);
        await tx.task.create({ data: {
          id: `tsk-renewal-${id}-${rule.id}`,
          title: render(rule.taskTitleTemplate, deal), dueDate: taskDueDate,
          type: rule.taskType || 'Call', linkedType: 'Deal', linkedId: id,
          linkedTitle: deal.title, ownerId: deal.ownerId, ownerName: deal.ownerName,
          status: 'pending', createdAt: today,
          note: `[Automated Task: ${rule.name}] ${render(rule.noteTemplate, deal)}`,
        } });
      }
      await tx.auditLog.create({ data: {
        id: `aud-renewal-${id}`, timestamp: new Date().toISOString(),
        actorId: actor?.id || 'system', actorName: actor?.name || 'System Automation',
        action: 'REBUY_CREATED', entityType: 'Deal', entityId: id,
        entityTitle: deal.title, fromStage: latest.stageName, toStage: renewalStage.name,
        reason: `Repeat order opportunity created for renewal due ${dueDate}.`,
        metadata: { parentDealId, latestWonDealId: latest.id, dueDate },
      } });
      return { deal, created: true };
    }, { isolationLevel: 'Serializable', timeout: 15000 });
  } catch (error) {
    const serialConflict = error.code === 'P2034' || error.originalCode === '40001' ||
      error.cause?.originalCode === '40001';
    if (serialConflict && attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, 30 * (attempt + 1)));
      continue;
    }
    if (serialConflict) throw conflict('Another renewal request changed this deal. Refresh and try again.');
    throw error;
  }
  }
};

export const runRenewalCheck = async () => {
  const parents = await prisma.deal.findMany({ where: {
    isRecurring: true, status: 'Won', parentDealId: null
  }, select: { id: true } });
  let createdCount = 0;
  const failures = [];
  for (const parent of parents) {
    try {
      const result = await ensureRebuyDeal(parent.id);
      if (result.created) createdCount++;
    } catch (error) {
      failures.push({ dealId: parent.id, error: error.message });
    }
  }
  return { flippedCount: createdCount, failures };
};
