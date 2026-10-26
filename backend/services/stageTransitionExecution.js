import { randomUUID } from 'node:crypto';
import { getLocalDateString, getLocalDateStringAfterDays, followUpOffsetDays } from '../utils/dateUtils.js';
import { isLostStage, isWonStage, semanticStageCode, isBackwardStageMove } from '../constants/stageConstants.js';
import { DEFAULT_FOLLOW_UP_RULES } from './followUpEngine.js';

const render = (template, deal) => String(template || '')
  .replace(/\{\{contactName\}\}/g, deal.contactName || 'Key Contact')
  .replace(/\{\{companyName\}\}/g, deal.companyName || 'Corporate Client')
  .replace(/\{\{entityName\}\}/g, deal.title)
  .replace(/\{\{stageName\}\}/g, deal.stageName || 'Current Stage');

// The caller owns the transaction and locks the deal before calling this function.
// Every record caused by the move is committed or rolled back with the deal.
export async function executeStageTransition(tx, {
  deal, source, target, actor, eventId = randomUUID(), approval = false,
  overrideReason, demotionReason, lostReason, note, answers,
}) {
  const today = getLocalDateString();
  const won = isWonStage(target);
  const lost = isLostStage(target);
  const backward = isBackwardStageMove(source, target);
  const updatedDeal = await tx.deal.update({ where: { id: deal.id }, data: {
    stageId: target.id, stageName: target.name,
    status: lost ? 'Lost' : won ? 'Won' : 'Active',
    daysInStage: 0, updatedAt: today, lastActivityDate: today,
    actualCloseDate: won ? today : null,
    lostReason: lost ? (lostReason || overrideReason || 'Unspecified') : null,
    lostReasonNote: lost ? (note || '') : null,
    lostStageId: lost ? source.id : null,
    lostStageName: lost ? source.name : null,
    pendingGateCheck: null,
  } });

  if (deal.leadId) await tx.lead.updateMany({ where: { id: deal.leadId }, data: {
    status: lost ? 'Unqualified' : 'Converted',
    lastActivityDate: today, pendingGateCheck: null,
  } });

  const taskPrefix = approval ? `tsk-gate-${eventId}` : `tsk-transition-${eventId}`;
  if (won) await tx.task.create({ data: {
    id: approval ? `tsk-post-sale-${eventId}` : `${taskPrefix}-post-sale`,
    title: `[Post-Sale Check-in] Fulfillment & Delivery check for ${deal.companyName || deal.title}`,
    dueDate: getLocalDateStringAfterDays(7), type: 'Follow-up', linkedType: 'Deal',
    linkedId: deal.id, linkedTitle: deal.title, ownerId: deal.ownerId,
    ownerName: deal.ownerName, status: 'pending', createdAt: today,
    note: 'Confirm order delivery and client satisfaction.',
  } });

  const event = !won && !lost && !backward && ['SAMPLE_SENT', 'PROPOSAL_SENT'].includes(semanticStageCode(target))
    ? semanticStageCode(target) : null;
  if (event) {
    const branding = await tx.branding.findUnique({ where: { id: 'default' } });
    const rules = Array.isArray(branding?.customFields?.followUpRules)
      ? branding.customFields.followUpRules : DEFAULT_FOLLOW_UP_RULES;
    for (const rule of rules.filter(item => item.isActive && item.triggerEvent === event)) {
      await tx.task.create({ data: {
        id: `${taskPrefix}-${rule.id}`, title: render(rule.taskTitleTemplate, deal),
        dueDate: getLocalDateStringAfterDays(followUpOffsetDays(rule.offsetDays)),
        type: rule.taskType || 'Call', linkedType: 'Deal', linkedId: deal.id,
        linkedTitle: deal.title, ownerId: deal.ownerId, ownerName: deal.ownerName,
        status: 'pending', createdAt: today,
        note: `[Automated Task: ${rule.name}] ${render(rule.noteTemplate, deal)}`,
      } });
    }
  }

  const activityType = backward ? 'Stage Demoted' : won ? 'Deal Won' : lost ? 'Deal Lost' : 'Stage Advanced';
  await tx.activity.create({ data: {
    id: approval ? `act-gate-${eventId}` : `act-transition-${eventId}`,
    type: activityType,
    description: approval ? `Approval executed: ${source.name} to ${target.name}.`
      : backward ? `Stage demoted to "${target.name}". Reason: ${demotionReason || overrideReason}. Note: ${note || 'N/A'}`
      : overrideReason ? `[Admin Override] Stage changed to "${target.name}". Reason: ${overrideReason}`
      : `Stage changed from "${source.name}" to "${target.name}". Note: ${note || 'N/A'}`,
    timestamp: new Date().toISOString(), linkedType: 'Deal', linkedId: deal.id,
    linkedTitle: deal.title, authorId: actor.id, authorName: actor.name,
    performedByName: actor.name, createdAt: new Date().toISOString(),
  } });
  await tx.auditLog.create({ data: {
    id: approval ? `aud-gate-${eventId}` : `aud-transition-${eventId}`,
    timestamp: new Date().toISOString(), actorId: actor.id, actorName: actor.name,
    action: approval ? 'APPROVAL_APPROVED' : backward ? 'STAGE_DEMOTED'
      : overrideReason ? 'ADMIN_OVERRIDE' : won ? 'DEAL_WON' : lost ? 'DEAL_LOST' : 'STAGE_TRANSITION',
    entityType: 'Deal', entityId: deal.id, entityTitle: deal.title,
    fromStage: source.name, toStage: target.name,
    reason: approval ? 'Stage approval executed.'
      : overrideReason || demotionReason || lostReason || note || 'Stage transition executed.',
    metadata: { fromStageId: source.id, toStageId: target.id,
      ...(approval ? { checkId: eventId, decision: 'approved' } : { overrideReason, demotionReason, answers }) },
  } });
  return updatedDeal;
}
