import { prisma } from '../prisma.js';
import { getLocalDateString, getLocalDateStringAfterDays } from '../utils/dateUtils.js';
import { logAudit, createActivity } from './activityNoteService.js';
import { createTask } from './taskService.js';

export const getStageGateChecks = async () => {
  return await prisma.stageGateCheck.findMany({
    orderBy: { timestamp: 'desc' }
  });
};

export const createStageGateCheck = async (check) => {
  const newCheck = {
    id: check.id || `sgc-${Date.now()}`,
    dealId: check.dealId || null,
    leadId: check.leadId || null,
    dealTitle: check.dealTitle || null,
    leadTitle: check.leadTitle || null,
    fromStageId: check.fromStageId || null,
    fromStageName: check.fromStageName || null,
    targetStageId: check.targetStageId || null,
    targetStageName: check.targetStageName || null,
    status: check.status || 'pending_review',
    outcome: check.outcome || 'advanced',
    answers: check.answers || {},
    note: check.note || '',
    submittedBy: check.submittedBy || 'u-3',
    submittedByName: check.submittedByName || 'Sales Rep',
    timestamp: check.timestamp || new Date().toISOString(),
  };

  const savedCheck = await prisma.stageGateCheck.upsert({
    where: { id: newCheck.id },
    update: newCheck,
    create: newCheck,
  });

  // If pending review, automatically generate approval task for Manager & Admin users
  if (savedCheck.status === 'pending_review') {
    const reviewers = await prisma.user.findMany({
      where: {
        active: true,
        role: { in: ['Manager', 'Admin'] }
      }
    });

    const todayStr = getLocalDateString();
    const entityTitle = savedCheck.leadTitle || savedCheck.dealTitle || 'Lead Opportunity';
    const entityId = savedCheck.dealId || savedCheck.leadId || '';
    const entityType = savedCheck.dealId ? 'Deal' : 'Lead';

    for (const rev of reviewers) {
      const existingTask = await prisma.task.findFirst({
        where: {
          stageGateCheckId: savedCheck.id,
          ownerId: rev.id,
          status: 'pending'
        }
      });

      if (!existingTask) {
        await createTask({
          id: `tsk-appr-${Date.now()}-${rev.id}`,
          title: `[Stage Approval Required] ${entityTitle}: ${savedCheck.fromStageName || 'Current Stage'} ➔ ${savedCheck.targetStageName || 'Target Stage'}`,
          dueDate: todayStr,
          type: 'Approval',
          linkedType: entityType,
          linkedId: entityId,
          linkedTitle: entityTitle,
          ownerId: rev.id,
          ownerName: rev.name,
          status: 'pending',
          stageGateCheckId: savedCheck.id,
          answers: savedCheck.answers || {},
          repObservations: savedCheck.note || '',
          submittedBy: savedCheck.submittedBy || 'u-3',
          submittedByName: savedCheck.submittedByName || 'Sales Rep',
          submittedAt: savedCheck.timestamp,
          fromStageName: savedCheck.fromStageName || '',
          targetStageName: savedCheck.targetStageName || '',
          createdAt: todayStr,
        });
      }
    }

    await logAudit({
      actorId: savedCheck.submittedBy || 'u-3',
      actorName: savedCheck.submittedByName || 'Sales Rep',
      action: 'APPROVAL_REQUESTED',
      entityType,
      entityId,
      entityTitle,
      fromStage: savedCheck.fromStageName || '',
      toStage: savedCheck.targetStageName || '',
      reason: `Submitted stage advancement request for Manager approval. Note: ${savedCheck.note || 'N/A'}`,
      metadata: { checkId: savedCheck.id, answers: savedCheck.answers }
    });
  }

  return savedCheck;
};

export const approveStageGateCheck = async (id, reviewer) => {
  const cleanId = String(id).replace('v-task-', '');
  let check = await prisma.stageGateCheck.findFirst({
    where: {
      OR: [
        { id: cleanId },
        { dealId: cleanId },
        { leadId: cleanId }
      ]
    }
  });

  const dealObj = await prisma.deal.findFirst({
    where: {
      OR: [
        { id: cleanId },
        { leadId: cleanId },
        ...(check?.dealId ? [{ id: check.dealId }] : [])
      ]
    }
  });

  const leadObj = await prisma.lead.findFirst({
    where: {
      OR: [
        { id: cleanId },
        ...(dealObj?.leadId ? [{ id: dealObj.leadId }] : []),
        ...(check?.leadId ? [{ id: check.leadId }] : [])
      ]
    }
  });

  if (!check && (dealObj || leadObj)) {
    const targetStageId = dealObj?.pendingGateCheck?.targetStageId || leadObj?.pendingGateCheck?.targetStageId;
    const stages = await prisma.stage.findMany({ orderBy: { order: 'asc' } });
    const curStageId = dealObj?.stageId || leadObj?.stageId;
    const curStageName = dealObj?.stageName || leadObj?.stageName;
    const curIdx = stages.findIndex(s => s.id === curStageId || s.name === curStageName);
    const nextStg = targetStageId 
      ? stages.find(s => s.id === targetStageId) 
      : (curIdx !== -1 && curIdx + 1 < stages.length ? stages[curIdx + 1] : stages[0]);

    check = await prisma.stageGateCheck.create({
      data: {
        id: `sgc-${Date.now()}`,
        dealId: dealObj?.id || null,
        leadId: leadObj?.id || null,
        dealTitle: dealObj?.title || null,
        leadTitle: leadObj?.title || null,
        fromStageName: curStageName || 'Current Stage',
        targetStageId: nextStg?.id || null,
        targetStageName: nextStg?.name || null,
        submittedBy: dealObj?.pendingGateCheck?.submittedById || leadObj?.pendingGateCheck?.submittedById || 'u-3',
        submittedByName: dealObj?.pendingGateCheck?.submittedByName || leadObj?.pendingGateCheck?.submittedByName || 'Sales Rep',
        outcome: 'advanced',
        status: 'pending_review'
      }
    });
  }

  if (check) {
    const updatedCheck = await prisma.stageGateCheck.update({
      where: { id: check.id },
      data: {
        status: 'approved_and_executed',
        reviewedBy: reviewer?.id || 'u-1',
        reviewedByName: reviewer?.name || 'Alex Vance',
        reviewedAt: new Date().toISOString()
      }
    });

    // Update associated approval tasks to completed
    const associatedTasks = await prisma.task.findMany({
      where: {
        OR: [
          { stageGateCheckId: check.id },
          { linkedId: check.dealId || '' },
          { linkedId: check.leadId || '' },
          { linkedId: cleanId }
        ],
        type: 'Approval'
      }
    });

    for (const t of associatedTasks) {
      await prisma.task.update({
        where: { id: t.id },
        data: {
          status: 'done',
          reviewedByName: reviewer?.name || 'Alex Vance',
          resolution: 'Approved'
        }
      });
    }

    // Execute gate check transition on deal or lead
    await executeGateCheckTransition(updatedCheck);

    await logAudit({
      actorId: reviewer?.id || 'u-1',
      actorName: reviewer?.name || 'Alex Vance',
      action: 'APPROVAL_APPROVED',
      entityType: check.dealId ? 'Deal' : 'Lead',
      entityId: check.dealId || check.leadId || cleanId,
      entityTitle: check.dealTitle || check.leadTitle || 'Opportunity',
      fromStage: check.fromStageName,
      toStage: check.targetStageName,
      reason: `Stage Gate Check approved by ${reviewer?.name || 'Manager'}. Advanced to "${check.targetStageName}".`,
      metadata: { checkId: check.id }
    });

    return updatedCheck;
  }

  if (dealObj) {
    await prisma.deal.update({
      where: { id: dealObj.id },
      data: { pendingGateCheck: null, status: 'Active' }
    });
  }
  if (leadObj) {
    await prisma.lead.update({
      where: { id: leadObj.id },
      data: { pendingGateCheck: null, status: 'Qualified' }
    });
  }

  return { success: true, id: cleanId };
};

export const rejectStageGateCheck = async (id, reviewer, reason) => {
  const cleanId = String(id).replace('v-task-', '');
  const check = await prisma.stageGateCheck.findFirst({
    where: {
      OR: [
        { id: cleanId },
        { dealId: cleanId },
        { leadId: cleanId }
      ]
    }
  });

  const dealObj = await prisma.deal.findFirst({
    where: {
      OR: [
        { id: cleanId },
        { leadId: cleanId },
        ...(check?.dealId ? [{ id: check.dealId }] : [])
      ]
    }
  });

  if (dealObj) {
    await prisma.deal.update({
      where: { id: dealObj.id },
      data: { pendingGateCheck: null, status: 'Follow up' }
    });

    if (dealObj.leadId) {
      try {
        await prisma.lead.update({
          where: { id: dealObj.leadId },
          data: { pendingGateCheck: null, status: 'Follow up' }
        });
      } catch {
        // Ignored
      }
    }
  }

  const leadObj = await prisma.lead.findFirst({
    where: {
      OR: [
        { id: cleanId },
        ...(check?.leadId ? [{ id: check.leadId }] : [])
      ]
    }
  });

  if (leadObj) {
    await prisma.lead.update({
      where: { id: leadObj.id },
      data: { pendingGateCheck: null, status: 'Follow up' }
    });
  }

  let updatedCheck = check;
  if (check) {
    updatedCheck = await prisma.stageGateCheck.update({
      where: { id: check.id },
      data: {
        status: 'rejected',
        reviewedBy: reviewer?.id || 'u-1',
        reviewedByName: reviewer?.name || 'Alex Vance',
        rejectionReason: reason || 'Requirements not met'
      }
    });
  }

  // Update associated approval tasks
  const associatedTasks = await prisma.task.findMany({
    where: {
      OR: [
        ...(check ? [{ stageGateCheckId: check.id }] : []),
        { linkedId: cleanId },
        ...(check?.dealId ? [{ linkedId: check.dealId }] : []),
        ...(check?.leadId ? [{ linkedId: check.leadId }] : [])
      ],
      type: 'Approval'
    }
  });

  for (const t of associatedTasks) {
    await prisma.task.update({
      where: { id: t.id },
      data: {
        status: 'done',
        reviewedByName: reviewer?.name || 'Alex Vance',
        resolution: 'Rejected',
        rejectionReason: reason || 'Requirements not met'
      }
    });
  }

  await logAudit({
    actorId: reviewer?.id || 'u-1',
    actorName: reviewer?.name || 'Alex Vance',
    action: 'APPROVAL_REJECTED',
    entityType: (dealObj || check?.dealId) ? 'Deal' : 'Lead',
    entityId: dealObj?.id || check?.dealId || leadObj?.id || cleanId,
    entityTitle: dealObj?.title || check?.dealTitle || leadObj?.title || 'Opportunity',
    reason: `Stage Gate Check rejected: ${reason || 'Requirements not met'}`,
    metadata: { checkId: check?.id, rejectionReason: reason }
  });

  return updatedCheck || { success: true, id: cleanId };
};

export const executeGateCheckTransition = async (check) => {
  const todayStr = getLocalDateString();
  const deal = check.dealId ? await prisma.deal.findUnique({ where: { id: check.dealId } }) : null;
  const leadId = check.leadId || deal?.leadId;
  const lead = leadId ? await prisma.lead.findUnique({ where: { id: leadId } }) : null;

  if (deal) {
    if (check.outcome === 'advanced') {
      const isWon = check.targetStageName === 'Closed Won';
      await prisma.deal.update({
        where: { id: deal.id },
        data: {
          stageId: check.targetStageId,
          stageName: check.targetStageName,
          status: isWon ? 'Won' : 'Active',
          daysInStage: 0,
          updatedAt: todayStr,
          lastActivityDate: todayStr,
          actualCloseDate: isWon ? todayStr : deal.actualCloseDate,
          pendingGateCheck: null,
        }
      });

      if (isWon) {
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
      }

      if (lead) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: isWon ? 'Converted' : 'Qualified',
            lastActivityDate: todayStr,
            pendingGateCheck: null,
          }
        });
      }

      await createActivity({
        type: isWon ? 'Deal Won' : 'Stage Advanced',
        description: `Stage Gate Check passed: Deal advanced to "${check.targetStageName}".`,
        linkedType: 'Deal',
        linkedId: deal.id,
        linkedTitle: deal.title,
        actorId: check.submittedBy || 'u-1',
        actorName: check.submittedByName || 'System',
      });
    } else if (check.outcome === 'lost') {
      const stages = await prisma.stage.findMany();
      const lostStage = stages.find(s => s.name === 'Closed Lost') || { id: 'stg-8', name: 'Closed Lost' };

      await prisma.deal.update({
        where: { id: deal.id },
        data: {
          stageId: lostStage.id,
          stageName: lostStage.name,
          status: 'Lost',
          lostReason: check.lostReason || 'Unspecified',
          lostReasonNote: check.note || '',
          daysInStage: 0,
          updatedAt: todayStr,
          lastActivityDate: todayStr,
          pendingGateCheck: null,
        }
      });

      if (lead) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: 'Unqualified',
            lastActivityDate: todayStr,
            pendingGateCheck: null,
          }
        });
      }

      await createActivity({
        type: 'Deal Lost',
        description: `Stage Gate Check failed: Deal moved to Closed Lost. Reason: ${check.lostReason}. Note: ${check.note || 'N/A'}`,
        linkedType: 'Deal',
        linkedId: deal.id,
        linkedTitle: deal.title,
        actorId: check.submittedBy || 'u-1',
        actorName: check.submittedByName || 'System',
      });
    } else if (check.outcome === 'demoted') {
      await prisma.deal.update({
        where: { id: deal.id },
        data: {
          stageId: check.targetStageId,
          stageName: check.targetStageName,
          backwardReason: check.backwardReason || 'Unspecified',
          backwardNote: check.note || '',
          daysInStage: 0,
          updatedAt: todayStr,
          lastActivityDate: todayStr,
          pendingGateCheck: null,
        }
      });

      await createActivity({
        type: 'Stage Demoted',
        description: `Deal moved backwards to "${check.targetStageName}". Reason: ${check.backwardReason}. Note: ${check.note || 'N/A'}`,
        linkedType: 'Deal',
        linkedId: deal.id,
        linkedTitle: deal.title,
        actorId: check.submittedBy || 'u-1',
        actorName: check.submittedByName || 'System',
      });
    }
  } else if (lead) {
    if (check.outcome === 'advanced') {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          stageId: check.targetStageId,
          stageName: check.targetStageName,
          status: check.targetStageName === 'Closed Won' ? 'Converted' : 'Qualified',
          lastActivityDate: todayStr,
          pendingGateCheck: null,
        }
      });

      await createActivity({
        type: 'Stage Advanced',
        description: `Stage Gate Check passed: Lead advanced to "${check.targetStageName}".`,
        linkedType: 'Lead',
        linkedId: lead.id,
        linkedTitle: lead.title,
        actorId: check.submittedBy || 'u-1',
        actorName: check.submittedByName || 'System',
      });
    } else if (check.outcome === 'lost') {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'Unqualified',
          lostReason: check.lostReason || 'Unspecified',
          lastActivityDate: todayStr,
          pendingGateCheck: null,
        }
      });

      await createActivity({
        type: 'Lead Lost',
        description: `Stage Gate Check failed: Lead marked Unqualified. Reason: ${check.lostReason}. Note: ${check.note || 'N/A'}`,
        linkedType: 'Lead',
        linkedId: lead.id,
        linkedTitle: lead.title,
        actorId: check.submittedBy || 'u-1',
        actorName: check.submittedByName || 'System',
      });
    }
  }
};
