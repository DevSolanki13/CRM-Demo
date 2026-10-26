import { createHash } from 'node:crypto';
import { prisma } from '../prisma.js';
import { getLocalDateString } from '../utils/dateUtils.js';
import { isWonStage, isLostStage } from '../constants/stageConstants.js';

const fail = (message, statusCode = 409) => { throw Object.assign(new Error(message), { statusCode }); };

// The request key survives a lost HTTP response. The advisory lock serializes
// retries before checking the existing activity, including competing requests.
export async function saveActivityFollowUp(activity, followUp) {
  const digest = value => createHash('sha256').update(value).digest('hex');
  const id = `act-followup-${digest(`${activity.authorId}:${followUp.requestId}`)}`;
  const fingerprint = digest(JSON.stringify({ type: activity.type, description: activity.description,
    linkedType: activity.linkedType, linkedId: activity.linkedId, followUp }));
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))::text`;
    const existing = await tx.activity.findUnique({ where: { id } });
    if (existing) {
      if (existing.metadata?.followUpFingerprint !== fingerprint) fail('This activity was already saved with different details. Reopen the form to log a new activity.');
      return existing;
    }
    const actor = await tx.user.findUnique({ where: { id: activity.authorId } });
    if (!actor?.active) fail('An active user is required.', 403);
    const manager = ['Admin', 'Manager'].includes(actor.role);
    const owner = await tx.user.findUnique({ where: { id: manager ? followUp.ownerId : actor.id } });
    if (!owner?.active) fail('Choose an active follow-up owner.', 400);

    const dealId = activity.linkedType === 'Deal' ? activity.linkedId : followUp.dealId;
    let deal;
    if (dealId) {
      await tx.$queryRaw`SELECT id FROM "Deal" WHERE id = ${dealId} FOR UPDATE`;
      deal = await tx.deal.findUnique({ where: { id: dealId }, include: { stage: true } });
      if (!deal || (!manager && deal.ownerId !== actor.id) ||
          (activity.linkedType === 'Lead' && deal.leadId !== activity.linkedId)) fail('Linked deal not found.', 404);
      if (deal.stageId !== followUp.expectedStageId) fail('The deal moved since this activity form was opened. Refresh and try again.');
      if (deal.pendingGateCheck || deal.status === 'Pending Review') fail('Resolve the pending approval before logging a qualification outcome.');
      if (isWonStage(deal.stage) || isLostStage(deal.stage)) fail('A closed deal cannot be marked for qualification follow-up.');
      await tx.deal.update({ where: { id: deal.id }, data: {
        status: 'Follow up', updatedAt: getLocalDateString(), lastActivityDate: getLocalDateString(),
      } });
    }
    const leadId = activity.linkedType === 'Lead' ? activity.linkedId : deal?.leadId;
    if (leadId) {
      await tx.$queryRaw`SELECT id FROM "Lead" WHERE id = ${leadId} FOR UPDATE`;
      const lead = await tx.lead.findUnique({ where: { id: leadId } });
      if (!lead || (!manager && lead.ownerId !== actor.id)) fail('Linked lead not found.', 404);
      if (lead.pendingGateCheck || lead.status === 'Pending Review') fail('Resolve the pending approval before logging a qualification outcome.');
      await tx.lead.update({ where: { id: leadId }, data: { status: 'Follow up', lastActivityDate: getLocalDateString() } });
    }
    const saved = await tx.activity.create({ data: { ...activity, id,
      stageId: deal?.stageId || null, stageName: deal?.stageName || null,
      metadata: { followUpReason: followUp.reason, answers: followUp.answers || {}, followUpFingerprint: fingerprint },
    } });
    await tx.task.create({ data: {
      id: `tsk-${id}`, title: `[Follow-up] ${activity.type}: ${activity.linkedTitle}`,
      type: activity.type === 'Meeting' ? 'Meeting' : 'Call', dueDate: followUp.dueDate,
      linkedType: activity.linkedType, linkedId: activity.linkedId, linkedTitle: activity.linkedTitle,
      ownerId: owner.id, ownerName: owner.name, status: 'pending', createdAt: getLocalDateString(),
      note: activity.description,
    } });
    await tx.auditLog.create({ data: {
      id: `aud-${id}`, timestamp: new Date().toISOString(), actorId: actor.id, actorName: actor.name,
      action: 'QUALIFICATION_FOLLOW_UP', entityType: activity.linkedType, entityId: activity.linkedId,
      entityTitle: activity.linkedTitle, fromStage: deal?.stageName, toStage: deal?.stageName,
      reason: followUp.reason, metadata: { activityId: id, taskId: `tsk-${id}`, stageId: deal?.stageId || null },
    } });
    return saved;
  }, { timeout: 15000 });
}
