import { prisma } from '../prisma.js';
import { ALLOWED_TRANSITIONS } from '../constants/stageConstants.js';
import { getLocalDateString, getLocalDateStringAfterDays } from '../utils/dateUtils.js';
import { createTask } from './taskService.js';
import { logAudit, createActivity } from './activityNoteService.js';
import { createStageGateCheck } from './stageGateService.js';

export const getDeals = async () => {
  return await prisma.deal.findMany({
    orderBy: { createdAt: 'desc' }
  });
};

export const createDeal = async (deal) => {
  const todayStr = getLocalDateString();
  const stages = await prisma.stage.findMany({ orderBy: { order: 'asc' } });
  const initialStage = stages.find(s => s.id === deal.stageId) || stages[0] || { id: 'stg-1', name: 'New Lead' };

  const branding = await prisma.branding.findUnique({ where: { id: 'default' } });
  const defaultRecurrenceDays = branding?.defaultRecurrenceDays || 60;

  const newDeal = {
    id: deal.id || `dl-${Date.now()}`,
    leadId: deal.leadId || null,
    parentDealId: deal.parentDealId || null,
    title: deal.title || 'New Sales Deal',
    value: Number(deal.value) || 10000,
    currency: deal.currency || 'INR',
    stageId: initialStage.id,
    stageName: initialStage.name,
    expectedCloseDate: deal.expectedCloseDate || getLocalDateStringAfterDays(30),
    proposalExpiryDate: deal.proposalExpiryDate || null,
    contactId: deal.contactId || '',
    contactName: deal.contactName || '',
    companyId: deal.companyId || '',
    companyName: deal.companyName || '',
    ownerId: deal.ownerId || 'u-3',
    ownerName: deal.ownerName || 'Marcus Vance',
    isRecurring: deal.isRecurring ?? false,
    isRebuy: deal.isRebuy ?? false,
    recurrenceDays: deal.recurrenceDays || defaultRecurrenceDays,
    status: deal.status || 'Active',
    createdAt: deal.createdAt || todayStr,
    updatedAt: deal.updatedAt || todayStr,
    lastActivityDate: deal.lastActivityDate || todayStr,
    daysInStage: deal.daysInStage || 0,
    valueHistory: deal.valueHistory || [
      { date: todayStr, value: Number(deal.value) || 10000, stage: initialStage.name, reason: 'Initial deal creation' }
    ],
    customFields: deal.customFields || {},
    partialGateState: deal.partialGateState || null,
    pendingGateCheck: deal.pendingGateCheck || null,
    lostReason: deal.lostReason || null,
    lostReasonNote: deal.lostReasonNote || null,
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
  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing) return null;

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

  const updatedData = {
    ...existing,
    ...deal,
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
  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.deal.delete({ where: { id } });
  return true;
};

export const createRebuyDeal = async (parentDealId, user) => {
  const parentDeal = await prisma.deal.findUnique({ where: { id: parentDealId } });
  if (!parentDeal) return null;

  // Check if an active (non-won, non-lost) rebuy deal already exists
  const existingActiveRebuy = await prisma.deal.findFirst({
    where: {
      parentDealId,
      status: { notIn: ['Won', 'Lost'] }
    }
  });
  if (existingActiveRebuy) {
    return existingActiveRebuy;
  }

  const stages = await prisma.stage.findMany({ orderBy: { order: 'asc' } });
  const renewalStage = stages.find((s) => s.category === 'Buy Again' || s.name.includes('Buy Again')) || stages[6] || { id: 'stg-7', name: 'Buy Again (Renewal)' };
  const todayStr = getLocalDateString();
  const expectedClose = getLocalDateStringAfterDays(30);

  const branding = await prisma.branding.findUnique({ where: { id: 'default' } });
  const defaultRecurrenceDays = branding?.defaultRecurrenceDays || 60;

  const newRebuyDeal = {
    id: `dl-rebuy-${Date.now()}`,
    parentDealId: parentDeal.id,
    leadId: parentDeal.leadId || null,
    title: `${parentDeal.companyName || parentDeal.title} (Renewal Rebuy)`,
    value: parentDeal.value,
    currency: parentDeal.currency || 'INR',
    stageId: renewalStage.id,
    stageName: renewalStage.name,
    expectedCloseDate: expectedClose,
    contactId: parentDeal.contactId,
    contactName: parentDeal.contactName,
    companyId: parentDeal.companyId,
    companyName: parentDeal.companyName,
    ownerId: parentDeal.ownerId,
    ownerName: parentDeal.ownerName,
    isRecurring: true,
    isRebuy: true,
    recurrenceDays: parentDeal.recurrenceDays || defaultRecurrenceDays,
    status: 'Renewal Due',
    createdAt: todayStr,
    updatedAt: todayStr,
    lastActivityDate: todayStr,
    daysInStage: 0,
    valueHistory: [
      { date: todayStr, value: parentDeal.value, stage: renewalStage.name, reason: 'Automated repeat purchase cycle created' }
    ]
  };

  const saved = await prisma.deal.create({ data: newRebuyDeal });

  // Proactive automated task for rebuy outreach
  const threeDaysStr = getLocalDateStringAfterDays(3);
  await createTask({
    title: `[Rebuy Outreach] Review renewal contract with ${parentDeal.contactName || parentDeal.companyName}`,
    dueDate: threeDaysStr,
    type: 'Renewal Check-in',
    linkedType: 'Deal',
    linkedId: saved.id,
    linkedTitle: saved.title,
    ownerId: parentDeal.ownerId,
    ownerName: parentDeal.ownerName,
    status: 'pending',
    note: `Recurring customer ${parentDeal.companyName} reached repeat order cycle. Initiate proposal review.`
  });

  await logAudit({
    actorId: user?.id || 'u-1',
    actorName: user?.name || 'System Automation',
    action: 'REBUY_CREATED',
    entityType: 'Deal',
    entityId: saved.id,
    entityTitle: saved.title,
    fromStage: 'Closed Won',
    toStage: renewalStage.name,
    reason: `Automated ${parentDeal.recurrenceDays || defaultRecurrenceDays}-day repeat purchase cycle triggered.`,
    metadata: { parentDealId: parentDeal.id }
  });

  return saved;
};

export const triggerRenewalCheck = async () => {
  let createdCount = 0;
  const now = new Date();

  const deals = await prisma.deal.findMany({
    where: {
      isRecurring: true,
      OR: [{ status: 'Won' }, { stageName: 'Closed Won' }]
    }
  });

  const branding = await prisma.branding.findUnique({ where: { id: 'default' } });
  const defaultRecurrenceDays = branding?.defaultRecurrenceDays || 60;

  for (const deal of deals) {
    const closeDateStr = deal.actualCloseDate || deal.updatedAt || deal.createdAt;
    if (closeDateStr) {
      const lastDate = new Date(closeDateStr);
      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      const cycle = deal.recurrenceDays || defaultRecurrenceDays;

      const hasExistingActive = await prisma.deal.findFirst({
        where: {
          parentDealId: deal.id,
          status: { notIn: ['Won', 'Lost'] }
        }
      });

      if (!hasExistingActive) {
        const hasAnyChild = await prisma.deal.findFirst({
          where: { parentDealId: deal.id }
        });

        if (diffDays >= cycle || !hasAnyChild || deal.recurrenceDays === 0) {
          await createRebuyDeal(deal.id, { id: 'u-1', name: 'System Automation' });
          createdCount++;
        }
      }
    }
  }

  return { flippedCount: createdCount };
};

export const transitionDealStage = async (dealId, payload) => {
  const { targetStageId, user, answers, overrideReason, demotionReason, note, lostReason } = payload;
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) {
    throw new Error('Deal not found');
  }

  const stages = await prisma.stage.findMany({ orderBy: { order: 'asc' } });
  const fromStage = stages.find(s => s.id === deal.stageId || s.name === deal.stageName) || stages[0];
  const targetStage = stages.find(s => s.id === targetStageId);
  if (!targetStage) {
    throw new Error('Target stage not found');
  }

  const fromName = fromStage.name;
  const targetName = targetStage.name;

  const isBackward = targetStage.order < fromStage.order;
  const isAllowedForward = (ALLOWED_TRANSITIONS[fromName] || []).includes(targetName);
  const isAdmin = user?.role === 'Admin';
  const isManager = user?.role === 'Manager';

  // Validate forward jumps against transition matrix
  if (!isAllowedForward && !isBackward) {
    if (!isAdmin || !overrideReason) {
      const allowed = (ALLOWED_TRANSITIONS[fromName] || []).join(', ');
      throw new Error(`Invalid stage transition from "${fromName}" to "${targetName}". Allowed next stages: ${allowed || 'None'}`);
    }
  }

  // Require demotion reason for backward movements
  if (isBackward && !demotionReason && !overrideReason) {
    throw new Error('Backward stage demotion requires a mandatory demotion reason.');
  }

  // If Sales Rep advancing to a forward stage, submit for Manager Review
  if (!isAdmin && !isManager && !isBackward && targetName !== 'Closed Lost') {
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

    const updatedDeal = await prisma.deal.update({
      where: { id: deal.id },
      data: {
        status: 'Pending Review',
        pendingGateCheck: newCheck
      }
    });

    if (deal.leadId) {
      try {
        await prisma.lead.update({
          where: { id: deal.leadId },
          data: {
            status: 'Pending Review',
            pendingGateCheck: newCheck
          }
        });
      } catch {
        // Ignored if lead not present
      }
    }

    await logAudit({
      actorId: user?.id || 'u-3',
      actorName: user?.name || 'Sales Rep',
      action: 'APPROVAL_REQUESTED',
      entityType: 'Deal',
      entityId: deal.id,
      entityTitle: deal.title,
      fromStage: fromName,
      toStage: targetName,
      reason: `Submitted stage advancement request for Manager approval. Note: ${note || 'N/A'}`,
      metadata: { checkId: newCheck.id, answers }
    });

    return { deal: updatedDeal, check: newCheck, requiresApproval: true };
  }

  // Execute stage transition immediately
  const todayStr = getLocalDateString();
  let status = 'Active';
  let actualCloseDate = deal.actualCloseDate;
  let dealLostReason = deal.lostReason;
  let dealLostReasonNote = deal.lostReasonNote;

  if (targetName === 'Closed Won') {
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
  } else if (targetName === 'Closed Lost') {
    status = 'Lost';
    dealLostReason = lostReason || overrideReason || 'Unspecified';
    dealLostReasonNote = note || '';
  } else if (!isBackward) {
    status = 'Active';
    if (targetName === 'Sample Sent') {
      const sampleDue = getLocalDateStringAfterDays(4);
      await createTask({
        title: `[Sample Evaluation Feedback] Collect testing feedback for ${deal.title}`,
        dueDate: sampleDue,
        type: 'Sample Follow-up',
        linkedType: 'Deal',
        linkedId: deal.id,
        linkedTitle: deal.title,
        ownerId: deal.ownerId,
        ownerName: deal.ownerName,
        status: 'pending',
        note: 'Sample dispatched. Follow up with testing engineer on evaluation.'
      });
    } else if (targetName === 'Proposal Sent') {
      const propDue = getLocalDateStringAfterDays(3);
      await createTask({
        title: `[Proposal Review] Follow up on proposal terms with ${deal.contactName || deal.companyName}`,
        dueDate: propDue,
        type: 'Proposal Follow-up',
        linkedType: 'Deal',
        linkedId: deal.id,
        linkedTitle: deal.title,
        ownerId: deal.ownerId,
        ownerName: deal.ownerName,
        status: 'pending',
        note: 'Commercial quotation sent. Follow up with decision maker.'
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
      pendingGateCheck: null,
    }
  });

  // Synchronize linked lead status
  if (deal.leadId) {
    try {
      await prisma.lead.update({
        where: { id: deal.leadId },
        data: {
          status: targetName === 'Closed Won' ? 'Converted' : targetName === 'Closed Lost' ? 'Unqualified' : 'Converted',
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
    type: isBackward ? 'Stage Demoted' : targetName === 'Closed Won' ? 'Deal Won' : targetName === 'Closed Lost' ? 'Deal Lost' : 'Stage Advanced',
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
    action: isBackward ? 'STAGE_DEMOTED' : overrideReason ? 'ADMIN_OVERRIDE' : targetName === 'Closed Won' ? 'DEAL_WON' : targetName === 'Closed Lost' ? 'DEAL_LOST' : 'STAGE_TRANSITION',
    entityType: 'Deal',
    entityId: deal.id,
    entityTitle: deal.title,
    fromStage: fromName,
    toStage: targetName,
    reason: overrideReason || demotionReason || lostReason || note || 'Stage transition executed.',
    metadata: { overrideReason, demotionReason, answers }
  });

  return { deal: updatedDeal, requiresApproval: false };
};

export const closeLostDeal = async (dealId, payload) => {
  const { lostReason, note, user } = payload;
  if (!lostReason) {
    throw new Error('A mandatory Closed Lost reason is required.');
  }
  const stages = await prisma.stage.findMany();
  const lostStage = stages.find(s => s.category === 'Lost' || s.name === 'Closed Lost') || { id: 'stg-8', name: 'Closed Lost' };
  return await transitionDealStage(dealId, {
    targetStageId: lostStage.id,
    user,
    lostReason,
    note,
    overrideReason: user?.role === 'Admin' ? 'Direct close lost by Admin' : undefined
  });
};
