import { prisma } from '../prisma.js';
import { allowedStageTargets, isWonStage, isLostStage, stageCode } from '../constants/stageConstants.js';
import { getLocalDateString, getLocalDateStringAfterDays } from '../utils/dateUtils.js';
import { createTask } from './taskService.js';
import { logAudit, createActivity } from './activityNoteService.js';
import { createStageGateCheck } from './stageGateService.js';
import { triggerFollowUp } from './followUpEngine.js';
import { ensureRebuyDeal, runRenewalCheck } from './renewalService.js';
import { deleteUnlinkedCustomerRecord } from './deletionPolicy.js';
import { requiresManagerApproval } from './approvalPolicy.js';
import { requirePipelineQualification } from './pipelineRules.js';

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
  const { targetStageId, user, answers, overrideReason, demotionReason, note, lostReason } = payload;
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) {
    throw Object.assign(new Error('Deal not found'), { statusCode: 404 });
  }
  if (deal.pendingGateCheck || deal.status === 'Pending Review') {
    throw Object.assign(new Error('Resolve the pending approval before moving this deal.'), { statusCode: 409 });
  }

  const stages = await prisma.stage.findMany({ where: { pipelineId: deal.pipelineId }, orderBy: { order: 'asc' } });
  const fromStage = stages.find(s => s.id === deal.stageId);
  if (!fromStage) {
    throw Object.assign(new Error('The deal references a stage that no longer exists.'), { statusCode: 409 });
  }
  const targetStage = stages.find(s => s.id === targetStageId);
  if (!targetStage) {
    throw Object.assign(new Error('Target stage is not in this deal’s pipeline.'), { statusCode: 409 });
  }
  const pipeline = await prisma.pipeline.findUnique({ where: { id: deal.pipelineId } });
  if (!pipeline?.active) throw Object.assign(new Error('This pipeline is inactive.'), { statusCode: 409 });
  requirePipelineQualification(deal, targetStage, pipeline);

  const fromName = fromStage.name;
  const targetName = targetStage.name;

  const isBackward = targetStage.order < fromStage.order;
  const allowedForward = allowedStageTargets(fromStage, stages);
  const isAllowedForward = allowedForward.some(stage => stage.id === targetStage.id);
  const isAdmin = user?.role === 'Admin';
  const isManager = user?.role === 'Manager';

  // Validate forward jumps against transition matrix
  if (!isAllowedForward && !isBackward) {
    if (!isAdmin || !overrideReason) {
      const allowed = allowedForward.map(stage => stage.name).join(', ');
      throw Object.assign(new Error(`Invalid stage transition from "${fromName}" to "${targetName}". Allowed next stages: ${allowed || 'None'}`), { statusCode: 409 });
    }
  }

  // Require demotion reason for backward movements
  if (isBackward && !demotionReason && !overrideReason) {
    throw Object.assign(new Error('Backward stage demotion requires a mandatory demotion reason.'), { statusCode: 400 });
  }

  const approvalSettings = (await prisma.branding.findUnique({ where: { id: 'default' } }))
    ?.customFields?.approvalPolicy;
  // Review can be focused on exceptions configured by the administrator.
  if (!isAdmin && !isManager && !isBackward && !isLostStage(targetStage) &&
      requiresManagerApproval(deal, targetStage.id, answers, approvalSettings)) {
    const newCheck = await createStageGateCheck({
      dealId: deal.id,
      dealTitle: deal.title,
      fromStageId: fromStage.id,
      fromStageName: fromName,
      targetStageId: targetStage.id,
      targetStageName: targetName,
      submittedBy: user?.id || 'u-3',
      submittedByName: user?.name || 'Sales Rep',
      answers: answers || {},
      note: note || '',
      status: 'pending_review',
      outcome: 'advanced'
    });

    return {
      deal: await prisma.deal.findUnique({ where: { id: deal.id } }),
      check: newCheck,
      requiresApproval: true
    };
  }

  // Execute stage transition immediately
  const todayStr = getLocalDateString();
  let status = 'Active';
  let actualCloseDate = isWonStage(targetStage) ? deal.actualCloseDate : null;
  let dealLostReason = isLostStage(targetStage) ? deal.lostReason : null;
  let dealLostReasonNote = isLostStage(targetStage) ? deal.lostReasonNote : null;

  if (isWonStage(targetStage)) {
    status = 'Won';
    actualCloseDate = todayStr;
    const sevenDaysStr = getLocalDateStringAfterDays(7);
    await createTask({
      title: `[Post-Sale Check-in] Fulfillment & Delivery check for ${deal.companyName || deal.title}`,
      dueDate: sevenDaysStr,
      type: 'Follow-up',
      linkedType: 'Deal',
      linkedId: deal.id,
      linkedTitle: deal.title,
      ownerId: deal.ownerId,
      ownerName: deal.ownerName,
      status: 'pending',
      note: 'Closed Won deal converted. Confirm order delivery and client satisfaction.'
    });
  } else if (isLostStage(targetStage)) {
    status = 'Lost';
    dealLostReason = lostReason || overrideReason || 'Unspecified';
    dealLostReasonNote = note || '';
  } else if (!isBackward) {
    status = 'Active';
    if (stageCode(targetStage) === 'SAMPLE_SENT') {
      await triggerFollowUp('SAMPLE_SENT', {
        id: deal.id,
        title: deal.title,
        contactName: deal.contactName,
        companyName: deal.companyName,
        ownerId: deal.ownerId,
        ownerName: deal.ownerName,
        value: deal.value,
        stageName: targetName
      });
    } else if (stageCode(targetStage) === 'PROPOSAL_SENT') {
      await triggerFollowUp('PROPOSAL_SENT', {
        id: deal.id,
        title: deal.title,
        contactName: deal.contactName,
        companyName: deal.companyName,
        ownerId: deal.ownerId,
        ownerName: deal.ownerName,
        value: deal.value,
        stageName: targetName
      });
    }
  }

  const updatedDeal = await prisma.deal.update({
    where: { id: deal.id },
    data: {
      stageId: targetStage.id,
      stageName: targetStage.name,
      status,
      daysInStage: 0,
      updatedAt: todayStr,
      lastActivityDate: todayStr,
      actualCloseDate,
      lostReason: dealLostReason,
      lostReasonNote: dealLostReasonNote,
      lostStageId: isLostStage(targetStage) ? fromStage.id : null,
      lostStageName: isLostStage(targetStage) ? fromStage.name : null,
      pendingGateCheck: null,
    }
  });

  // Synchronize linked lead status
  if (deal.leadId) {
    try {
      await prisma.lead.update({
        where: { id: deal.leadId },
        data: {
          status: isLostStage(targetStage) ? 'Unqualified' : 'Converted',
          lastActivityDate: todayStr,
          pendingGateCheck: null,
        }
      });
    } catch {
      // Ignored if lead not present
    }
  }

  // Activity Log
  await createActivity({
    type: isBackward ? 'Stage Demoted' : isWonStage(targetStage) ? 'Deal Won' : isLostStage(targetStage) ? 'Deal Lost' : 'Stage Advanced',
    description: isBackward 
      ? `Stage demoted to "${targetName}". Reason: ${demotionReason || 'N/A'}. Note: ${note || 'N/A'}`
      : overrideReason
      ? `[Admin Override] Stage changed to "${targetName}". Reason: ${overrideReason}`
      : `Stage changed from "${fromName}" to "${targetName}". Note: ${note || 'N/A'}`,
    linkedType: 'Deal',
    linkedId: deal.id,
    linkedTitle: deal.title,
    actorId: user?.id || 'u-1',
    actorName: user?.name || 'System',
  });

  // Permanent Audit Log
  await logAudit({
    actorId: user?.id || 'u-1',
    actorName: user?.name || 'User',
    action: isBackward ? 'STAGE_DEMOTED' : overrideReason ? 'ADMIN_OVERRIDE' : isWonStage(targetStage) ? 'DEAL_WON' : isLostStage(targetStage) ? 'DEAL_LOST' : 'STAGE_TRANSITION',
    entityType: 'Deal',
    entityId: deal.id,
    entityTitle: deal.title,
    fromStage: fromName,
    toStage: targetName,
    reason: overrideReason || demotionReason || lostReason || note || 'Stage transition executed.',
    metadata: { fromStageId: fromStage.id, toStageId: targetStage.id,
      overrideReason, demotionReason, answers }
  });

  return { deal: updatedDeal, requiresApproval: false };
};

export const closeLostDeal = async (dealId, payload) => {
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
