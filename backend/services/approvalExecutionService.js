import { randomUUID } from 'node:crypto';
import { prisma } from '../prisma.js';
import { getLocalDateString, getLocalDateStringAfterDays } from '../utils/dateUtils.js';
import { DEFAULT_FOLLOW_UP_RULES } from './followUpEngine.js';
import { ALLOWED_TRANSITION_IDS } from '../constants/stageConstants.js';

const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });

const render = (template, deal) => (template || '')
  .replace(/\{\{contactName\}\}/g, deal.contactName || 'Key Contact')
  .replace(/\{\{companyName\}\}/g, deal.companyName || 'Corporate Client')
  .replace(/\{\{entityName\}\}/g, deal.title);

export const decideApproval = async (id, reviewer, decision, reason) => {
  if (!id || !reviewer?.id) throw fail('A request ID and reviewer are required.', 400);
  if (decision === 'rejected' && !reason?.trim()) throw fail('A rejection reason is required.', 400);

  for (let attempt = 0; attempt < 3; attempt++) {
  try {
  return await prisma.$transaction(async (tx) => {
    const actor = await tx.user.findUnique({ where: { id: reviewer.id } });
    if (!actor?.active || !['Manager', 'Admin'].includes(actor.role)) {
      throw fail('An active manager or administrator must decide this request.', 403);
    }
    // Lock the request before reading it. Competing reviewers then observe the committed decision.
    const rows = await tx.$queryRaw`SELECT id FROM "StageGateCheck" WHERE id = ${id} FOR UPDATE`;
    if (!rows.length) throw fail('Approval request not found.', 404);
    const check = await tx.stageGateCheck.findUnique({ where: { id } });
    if (check.status !== 'pending_review' && check.status !== 'pending') {
      throw fail('This approval request has already been decided.', 409);
    }
    if (!check.fromStageId || !check.targetStageId) {
      throw fail('Approval request has no recorded stage transition.', 409);
    }

    const deal = await tx.deal.findUnique({ where: { id: check.dealId } });
    if (!deal) throw fail('The deal for this approval request no longer exists.', 409);
    // Also lock the deal so a concurrent decision for another request cannot advance it.
    await tx.$queryRaw`SELECT id FROM "Deal" WHERE id = ${deal.id} FOR UPDATE`;
    const current = await tx.deal.findUnique({ where: { id: deal.id } });
    if (current.stageId !== check.fromStageId || current.status !== 'Pending Review' ||
        current.pendingGateCheck?.id !== check.id) {
      throw fail('The deal changed since this approval was requested. Refresh before deciding.', 409);
    }
    const target = await tx.stage.findUnique({ where: { id: check.targetStageId } });
    if (!target) throw fail('The target stage no longer exists.', 409);
    const today = getLocalDateString();
    const won = target.id === 'stg-6' && check.outcome !== 'lost';
    const lost = target.id === 'stg-8' || check.outcome === 'lost';
    const approved = decision === 'approved';
    const nextStage = lost && approved
      ? await tx.stage.findUnique({ where: { id: 'stg-8' } })
      : target;
    if (lost && approved && !nextStage) throw fail('Closed Lost stage no longer exists.', 409);

    if (approved) {
      await tx.deal.update({
        where: { id: current.id },
        data: {
          stageId: nextStage.id, stageName: nextStage.name,
          status: lost ? 'Lost' : won ? 'Won' : 'Active',
          daysInStage: 0, updatedAt: today, lastActivityDate: today,
          actualCloseDate: won ? today : current.actualCloseDate,
          lostReason: lost ? (check.lostReason || 'Unspecified') : current.lostReason,
          lostReasonNote: lost ? (check.note || '') : current.lostReasonNote,
          pendingGateCheck: null,
        }
      });
    } else {
      await tx.deal.update({
        where: { id: current.id },
        data: { status: 'Follow up', pendingGateCheck: null, updatedAt: today }
      });
    }

    if (current.leadId) {
      await tx.lead.updateMany({
        where: { id: current.leadId },
        data: {
          status: approved ? lost ? 'Unqualified' : won ? 'Converted' : 'Qualified' : 'Follow up',
          pendingGateCheck: null,
          lastActivityDate: today,
        }
      });
    }

    const updatedCheck = await tx.stageGateCheck.update({
      where: { id },
      data: {
        status: approved ? 'approved_and_executed' : 'rejected',
        reviewedBy: actor.id, reviewedByName: actor.name,
        timestamp: new Date().toISOString(),
        ...(!approved ? { note: reason, lostReason: reason } : {}),
      }
    });
    await tx.task.updateMany({
      where: { stageGateCheckId: id, type: 'Approval', status: 'pending' },
      data: { status: 'completed', reviewedByName: actor.name,
        resolution: approved ? 'Approved' : 'Rejected', ...(!approved ? { note: reason } : {}) }
    });

    if (approved) {
      if (won) {
        await tx.task.create({ data: {
          id: `tsk-post-sale-${id}`, title: `[Post-Sale Check-in] Fulfillment & Delivery check for ${current.companyName || current.title}`,
          dueDate: getLocalDateStringAfterDays(7), type: 'Follow-up', linkedType: 'Deal',
          linkedId: current.id, linkedTitle: current.title, ownerId: current.ownerId,
          ownerName: current.ownerName, status: 'pending', createdAt: today,
          note: 'Confirm order delivery and client satisfaction.'
        } });
      }
      const event = target.id === 'stg-3' ? 'SAMPLE_SENT'
        : target.id === 'stg-4' ? 'PROPOSAL_SENT' : null;
      if (event) {
        const branding = await tx.branding.findUnique({ where: { id: 'default' } });
        const rules = branding?.customFields?.followUpRules || DEFAULT_FOLLOW_UP_RULES;
        for (const rule of rules.filter(r => r.isActive && r.triggerEvent === event)) {
          const dueDate = getLocalDateStringAfterDays(Number(rule.offsetDays) || 1);
          await tx.task.create({ data: {
            id: `tsk-gate-${id}-${rule.id}`, title: render(rule.taskTitleTemplate, current),
            dueDate, type: rule.taskType || 'Call', linkedType: 'Deal',
            linkedId: current.id, linkedTitle: current.title, ownerId: current.ownerId,
            ownerName: current.ownerName, status: 'pending', createdAt: today,
            note: `[Automated Task: ${rule.name}] ${render(rule.noteTemplate, current)}`
          } });
        }
      }
    }

    await tx.activity.create({ data: {
      id: `act-gate-${id}`, type: approved ? lost ? 'Deal Lost' : won ? 'Deal Won' : 'Stage Advanced' : 'Approval Rejected',
      description: approved ? `Approval executed: ${check.fromStageName} to ${nextStage.name}.` : `Approval rejected: ${reason}`,
      timestamp: new Date().toISOString(), linkedType: 'Deal', linkedId: current.id,
      linkedTitle: current.title, authorId: actor.id, authorName: actor.name,
      performedByName: actor.name, createdAt: new Date().toISOString(),
    } });
    await tx.auditLog.create({ data: {
      id: `aud-gate-${id}`, timestamp: new Date().toISOString(),
      actorId: actor.id, actorName: actor.name,
      action: approved ? 'APPROVAL_APPROVED' : 'APPROVAL_REJECTED',
      entityType: 'Deal', entityId: current.id, entityTitle: current.title,
      fromStage: check.fromStageName, toStage: approved ? nextStage.name : check.fromStageName,
      reason: approved ? 'Stage approval executed.' : reason,
      metadata: { checkId: id, decision, fromStageId: check.fromStageId,
        toStageId: approved ? nextStage.id : check.fromStageId },
    } });
    return updatedCheck;
  }, { isolationLevel: 'Serializable', timeout: 15000 });
  } catch (error) {
    if (error.code === 'P2034' && attempt < 2) {
      await new Promise(resolve => setTimeout(resolve, 25 * (attempt + 1)));
      continue;
    }
    if (error.code === 'P2034') {
      throw fail('A competing decision changed this approval request. Refresh and try again.', 409);
    }
    throw error;
  }
  }
};

export const createApprovalRequest = async (input) => {
  if (!input?.dealId || !input?.fromStageId || !input?.targetStageId) {
    throw fail('A deal, source stage, and target stage are required.', 400);
  }
  for (let attempt = 0; attempt < 3; attempt++) {
  try {
  return await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Deal" WHERE id = ${input.dealId} FOR UPDATE`;
    const deal = await tx.deal.findUnique({ where: { id: input.dealId } });
    if (!deal) throw fail('Deal not found.', 404);
    if (deal.stageId !== input.fromStageId) throw fail('The deal has moved since this request was prepared.', 409);
    if (deal.pendingGateCheck || deal.status === 'Pending Review') {
      throw fail('This deal already has a pending approval.', 409);
    }
    const source = await tx.stage.findUnique({ where: { id: input.fromStageId } });
    const target = await tx.stage.findUnique({ where: { id: input.targetStageId } });
    if (!source || !target) throw fail('Source or target stage not found.', 400);
    if (input.outcome === 'demoted') {
      throw fail('Backward movement must use a stage transition with a reason.', 409);
    }
    if (!(ALLOWED_TRANSITION_IDS[source.id] || []).includes(target.id)) {
      throw fail('This approval request is not an allowed pipeline transition.', 409);
    }
    if ((input.outcome === 'lost' || target.id === 'stg-8') && !input.lostReason?.trim()) {
      throw fail('A Closed Lost reason is required.', 400);
    }
    const id = `sgc-${randomUUID()}`;
    const check = await tx.stageGateCheck.create({ data: {
      id, dealId: deal.id, dealTitle: deal.title,
      fromStageId: source.id, fromStageName: source.name,
      targetStageId: target.id, targetStageName: target.name,
      submittedBy: input.submittedBy || null, submittedByName: input.submittedByName || null,
      status: 'pending_review', outcome: input.outcome || 'advanced',
      answers: input.answers || {}, note: input.note || '', lostReason: input.lostReason || null,
      timestamp: new Date().toISOString(), createdAt: getLocalDateString(),
    } });
    await tx.deal.update({ where: { id: deal.id }, data: {
      status: 'Pending Review', pendingGateCheck: check
    } });
    if (deal.leadId) await tx.lead.updateMany({ where: { id: deal.leadId }, data: {
      status: 'Pending Review', pendingGateCheck: check
    } });
    const reviewers = await tx.user.findMany({ where: {
      active: true, role: { in: ['Manager', 'Admin'] }
    } });
    for (const reviewer of reviewers) {
      await tx.task.create({ data: {
        id: `tsk-appr-${id}-${reviewer.id}`,
        title: `[Stage Approval Required] ${deal.title}: ${source.name} → ${target.name}`,
        dueDate: getLocalDateString(), type: 'Approval', linkedType: 'Deal',
        linkedId: deal.id, linkedTitle: deal.title,
        ownerId: reviewer.id, ownerName: reviewer.name, status: 'pending',
        stageGateCheckId: id, answers: check.answers,
        repObservations: check.note, submittedBy: check.submittedBy,
        submittedByName: check.submittedByName, submittedAt: check.timestamp,
        fromStageName: source.name, targetStageName: target.name,
        createdAt: getLocalDateString(),
      } });
    }
    await tx.auditLog.create({ data: {
      id: `aud-request-${id}`, timestamp: new Date().toISOString(),
      actorId: check.submittedBy || 'system', actorName: check.submittedByName || 'System',
      action: 'APPROVAL_REQUESTED', entityType: 'Deal', entityId: deal.id,
      entityTitle: deal.title, fromStage: source.name, toStage: target.name,
      reason: check.note || 'Stage approval requested.', metadata: { checkId: id }
    } });
    return check;
  }, { isolationLevel: 'Serializable', timeout: 15000 });
  } catch (error) {
    if (error.code === 'P2034' && attempt < 2) {
      await new Promise(resolve => setTimeout(resolve, 25 * (attempt + 1)));
      continue;
    }
    if (error.code === 'P2034') throw fail('The deal changed while creating this request. Refresh and try again.', 409);
    throw error;
  }
  }
};
