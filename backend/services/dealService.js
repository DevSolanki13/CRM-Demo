import { validatedInput, dealSchema, updateDealSchema, dealTransitionSchema, closeLostSchema } from '../middleware/validation.js';
import { prisma } from '../prisma.js';
import { allowedStageTargets, isLostStage, isBackwardStageMove } from '../constants/stageConstants.js';
import { getLocalDateString, getLocalDateStringAfterDays } from '../utils/dateUtils.js';
import { logAudit } from './activityNoteService.js';
import { createApprovalRequestInTransaction } from './approvalExecutionService.js';
import { executeStageTransition } from './stageTransitionExecution.js';
import { ensureRebuyDeal, runRenewalCheck } from './renewalService.js';
import { deleteUnlinkedCustomerRecord } from './deletionPolicy.js';
import { requiresManagerApproval } from './approvalPolicy.js';
import { requirePipelineQualification } from './pipelineRules.js';
import { randomUUID } from 'node:crypto';
import { isTransactionConflict } from './transactionRetry.js';

const DEAL_FIELDS = new Set([
  'id', 'pipelineId', 'parentDealId', 'leadId', 'title', 'value', 'currency', 'stageId',
  'stageName', 'expectedCloseDate', 'actualCloseDate', 'contactId', 'contactName',
  'companyId', 'companyName', 'ownerId', 'ownerName', 'isRecurring', 'isRebuy',
  'recurrenceDays', 'status', 'createdAt', 'updatedAt', 'lastActivityDate',
  'daysInStage', 'valueHistory', 'reason', 'lostReason', 'lostReasonNote',
  'lostStageId', 'lostStageName',
  'proposalExpiryDate', 'pendingGateCheck', 'partialGateState', 'customFields',
  'valueChangeReason', 'updatedById', 'updatedByName'
]);

const validateDealFields = (deal) => {
  const unknown = Object.keys(deal).find(key => !DEAL_FIELDS.has(key));
  if (unknown) throw Object.assign(new Error(`Unknown deal field: ${unknown}`), { statusCode: 400 });
};

export const getDeals = async () => {
  return await prisma.deal.findMany({
    orderBy: { createdAt: 'desc' }
  });
};

export const createDeal = async (deal) => {
  validateDealFields(deal);
  deal = validatedInput(dealSchema, deal);
  const todayStr = getLocalDateString();
  const pipelineId = deal.pipelineId || 'pipeline-sales';
  const pipeline = await prisma.pipeline.findUnique({ where: { id: pipelineId } });
  if (!pipeline?.active) throw Object.assign(new Error('Choose an active pipeline.'), { statusCode: 400 });
  const stages = await prisma.stage.findMany({ where: { pipelineId }, orderBy: { order: 'asc' } });
  const initialStage = stages[0];
  if (!initialStage) throw Object.assign(new Error('No pipeline stages are configured.'), { statusCode: 409 });
  if ((deal.stageId && deal.stageId !== initialStage.id) ||
      (deal.status && !['Active', 'Open'].includes(deal.status)) ||
      deal.pendingGateCheck || deal.parentDealId || deal.isRebuy) {
    throw Object.assign(new Error('New deals must start in the initial pipeline stage.'), { statusCode: 409 });
  }

  const branding = await prisma.branding.findUnique({ where: { id: 'default' } });
  const defaultRecurrenceDays = branding?.defaultRecurrenceDays || 60;

  const newDeal = {
    id: deal.id || `dl-${Date.now()}`,
    pipelineId,
    leadId: deal.leadId || null,
    parentDealId: deal.parentDealId || null,
    title: deal.title || 'New Sales Deal',
    value: Number(deal.value ?? 0),
    currency: deal.currency || 'INR',
    stageId: initialStage.id,
    stageName: initialStage.name,
    expectedCloseDate: deal.expectedCloseDate || getLocalDateStringAfterDays(30),
    proposalExpiryDate: deal.proposalExpiryDate || null,
    contactId: deal.contactId || null,
    contactName: deal.contactName || '',
    companyId: deal.companyId || null,
    companyName: deal.companyName || '',
    ownerId: deal.ownerId || 'u-3',
    ownerName: deal.ownerName || 'Marcus Vance',
    isRecurring: deal.isRecurring ?? false,
    isRebuy: deal.isRebuy ?? false,
    recurrenceDays: deal.recurrenceDays || defaultRecurrenceDays,
    status: 'Active',
    createdAt: deal.createdAt || todayStr,
    updatedAt: deal.updatedAt || todayStr,
    lastActivityDate: deal.lastActivityDate || todayStr,
    daysInStage: deal.daysInStage || 0,
    valueHistory: [
      { date: todayStr, value: Number(deal.value ?? 0), stage: initialStage.name, reason: 'Initial deal creation' }
    ],
    partialGateState: deal.partialGateState || null,
    customFields: deal.customFields ?? {},
    pendingGateCheck: null,
    lostReason: deal.lostReason || null,
    lostReasonNote: deal.lostReasonNote || null,
    lostStageId: null,
    lostStageName: null,
    actualCloseDate: deal.actualCloseDate || null,
  };

  const savedDeal = await prisma.deal.create({ data: newDeal });

  // If deal is tied to a lead, update lead status to 'Converted'
  if (savedDeal.leadId) {
    try {
      await prisma.lead.update({
        where: { id: savedDeal.leadId },
        data: { status: 'Converted', lastActivityDate: todayStr }
      });
    } catch {
      // Ignored if lead not present
    }
  }

  await logAudit({
    actorId: savedDeal.ownerId,
    actorName: savedDeal.ownerName,
    action: 'DEAL_CREATED',
    entityType: 'Deal',
    entityId: savedDeal.id,
    entityTitle: savedDeal.title,
    reason: `New sales opportunity created for ${savedDeal.companyName || 'Client'}`,
    metadata: { value: savedDeal.value, stage: savedDeal.stageName, leadId: savedDeal.leadId }
  });

  return savedDeal;
};

export const updateDeal = async (id, deal) => {
  validateDealFields(deal);
  deal = validatedInput(updateDealSchema, deal);
  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing) return null;

  const managedFields = ['stageId', 'stageName', 'status', 'pendingGateCheck',
    'pipelineId',
    'actualCloseDate', 'lostReason', 'lostReasonNote', 'lostStageId', 'lostStageName', 'parentDealId',
    'leadId', 'isRebuy', 'valueHistory'];
  if (managedFields.some(key => Object.hasOwn(deal, key) &&
      JSON.stringify(deal[key]) !== JSON.stringify(existing[key]))) {
    throw Object.assign(new Error('Pipeline state must be changed through a stage transition or approval decision.'),
      { statusCode: 409 });
  }

  const todayStr = getLocalDateString();
  let valueHistory = Array.isArray(existing.valueHistory) ? [...existing.valueHistory] : [];

  if (deal.value !== undefined && Number(deal.value) !== Number(existing.value)) {
    valueHistory.push({
      date: todayStr,
      oldValue: existing.value,
      value: Number(deal.value),
      stage: deal.stageName || existing.stageName,
      reason: deal.valueChangeReason || 'Deal value adjusted'
    });

    await logAudit({
      actorId: deal.updatedById || 'u-1',
      actorName: deal.updatedByName || 'User',
      action: 'DEAL_VALUE_CHANGED',
      entityType: 'Deal',
      entityId: existing.id,
      entityTitle: existing.title,
      reason: `Value adjusted from ₹${Number(existing.value).toLocaleString('en-IN')} to ₹${Number(deal.value).toLocaleString('en-IN')}`,
      metadata: { oldValue: existing.value, newValue: deal.value }
    });
  }

  const validDealFields = Object.fromEntries(Object.entries(deal).filter(([key]) =>
    !['valueChangeReason', 'updatedById', 'updatedByName', ...managedFields].includes(key)));
  for (const key of ['contactId', 'companyId']) {
    if (validDealFields[key] === '') validDealFields[key] = null;
  }

  const updatedData = {
    ...existing,
    ...validDealFields,
    id,
    value: deal.value !== undefined ? Number(deal.value) : existing.value,
    valueHistory,
    updatedAt: todayStr,
  };

  return await prisma.deal.update({
    where: { id },
    data: updatedData
  });
};

export const deleteDeal = async (id) => {
  return prisma.$transaction(tx => deleteUnlinkedCustomerRecord(tx, 'Deal', id),
    { isolationLevel: 'Serializable' });
};

export const createRebuyDeal = async (parentDealId, user) => {
  const result = await ensureRebuyDeal(parentDealId, user);
  if (result.dueDate) {
    throw Object.assign(new Error(`The next renewal is due on ${result.dueDate}.`), { statusCode: 409 });
  }
  return result.deal;
};

export const triggerRenewalCheck = runRenewalCheck;

export const transitionDealStage = async (dealId, payload) => {
  payload = validatedInput(dealTransitionSchema, payload);
  const { targetStageId, user, answers, overrideReason, demotionReason, note, lostReason } = payload;
  const eventId = randomUUID();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        const locked = await tx.$queryRaw`SELECT id FROM "Deal" WHERE id = ${dealId} FOR UPDATE`;
        if (!locked.length) throw Object.assign(new Error('Deal not found.'), { statusCode: 404 });
        const deal = await tx.deal.findUnique({ where: { id: dealId } });
        if (payload.expectedStageId && payload.expectedStageId !== deal.stageId) {
          throw Object.assign(new Error('The deal moved since this view was loaded. Refresh before moving it again.'), { statusCode: 409 });
        }
        if (deal.pendingGateCheck || deal.status === 'Pending Review') {
          throw Object.assign(new Error('Resolve the pending approval before moving this deal.'), { statusCode: 409 });
        }
        const stages = await tx.stage.findMany({ where: { pipelineId: deal.pipelineId }, orderBy: { order: 'asc' } });
        const source = stages.find(stage => stage.id === deal.stageId);
        const target = stages.find(stage => stage.id === targetStageId);
        if (!source) throw Object.assign(new Error('The deal references a stage that no longer exists.'), { statusCode: 409 });
        if (!target) throw Object.assign(new Error('Target stage is not in this deals pipeline.'), { statusCode: 409 });
        const pipeline = await tx.pipeline.findUnique({ where: { id: deal.pipelineId } });
        if (!pipeline?.active) throw Object.assign(new Error('This pipeline is inactive.'), { statusCode: 409 });
        requirePipelineQualification(deal, target, pipeline);

        const backward = isBackwardStageMove(source, target);
        const allowedForward = allowedStageTargets(source, stages);
        const permitted = allowedForward.some(stage => stage.id === target.id);
        const isAdmin = user?.role === 'Admin';
        const isManager = user?.role === 'Manager';
        if (!permitted && !backward && (!isAdmin || !overrideReason?.trim() || target.id === source.id)) {
          throw Object.assign(new Error(`Invalid stage transition from "${source.name}" to "${target.name}". Allowed next stages: ${allowedForward.map(stage => stage.name).join(', ') || 'None'}`), { statusCode: 409 });
        }
        if (backward && !demotionReason?.trim() && !overrideReason?.trim()) {
          throw Object.assign(new Error('Backward stage demotion requires a mandatory demotion reason.'), { statusCode: 400 });
        }
        if (isLostStage(target) && !lostReason?.trim() && !overrideReason?.trim()) {
          throw Object.assign(new Error('A Closed Lost reason is required.'), { statusCode: 400 });
        }
        const approvalSettings = (await tx.branding.findUnique({ where: { id: 'default' } }))?.customFields?.approvalPolicy;
        if (!isAdmin && !isManager && !backward && !isLostStage(target) &&
            requiresManagerApproval(deal, target.id, answers, approvalSettings)) {
          const check = await createApprovalRequestInTransaction(tx, {
            dealId: deal.id, dealTitle: deal.title,
            fromStageId: source.id, fromStageName: source.name,
            targetStageId: target.id, targetStageName: target.name,
            submittedBy: user?.id || 'u-3', submittedByName: user?.name || 'Sales Rep',
            answers: answers || {}, note: note || '', status: 'pending_review', outcome: 'advanced'
          });
          return { deal: await tx.deal.findUnique({ where: { id: deal.id } }), check, requiresApproval: true };
        }
        const updatedDeal = await executeStageTransition(tx, {
          deal, source, target, actor: { id: user?.id || 'u-1', name: user?.name || 'User' },
          eventId, answers, overrideReason, demotionReason, lostReason, note,
        });
        return { deal: updatedDeal, requiresApproval: false };
      }, { isolationLevel: 'Serializable', timeout: 15000 });
    } catch (error) {
      if (isTransactionConflict(error) && attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 25 * (attempt + 1)));
        continue;
      }
      if (isTransactionConflict(error)) throw Object.assign(new Error('A competing stage move changed this deal. Refresh and try again.'), { statusCode: 409 });
      throw error;
    }
  }
};
export const closeLostDeal = async (dealId, payload) => {
  payload = validatedInput(closeLostSchema, payload);
  const { lostReason, note, user } = payload;
  if (!lostReason) {
    throw Object.assign(new Error('A mandatory Closed Lost reason is required.'), { statusCode: 400 });
  }
  const deal = await prisma.deal.findUnique({ where: { id: dealId }, select: { pipelineId: true } });
  if (!deal) throw Object.assign(new Error('Deal not found.'), { statusCode: 404 });
  const stages = await prisma.stage.findMany({ where: { pipelineId: deal.pipelineId } });
  const lostStage = stages.find(isLostStage);
  if (!lostStage) throw Object.assign(new Error('Closed Lost stage is not configured.'), { statusCode: 409 });
  return await transitionDealStage(dealId, {
    targetStageId: lostStage.id,
    user,
    lostReason,
    note,
    overrideReason: user?.role === 'Admin' ? 'Direct close lost by Admin' : undefined
  });
};
