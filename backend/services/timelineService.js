import { prisma } from '../prisma.js';

/**
 * Normalizes different event types into a unified timeline schema
 */
export const getEntityTimeline = async ({ entityType, entityId }) => {
  if (!entityType || !entityId) {
    return [];
  }

  const timelineItems = [];

  // Determine query scope
  let companyId = null;
  let contactIds = [];
  let dealIds = [];
  let leadIds = [];

  if (entityType === 'Company') {
    companyId = entityId;
    const [contacts, deals] = await Promise.all([
      prisma.contact.findMany({ where: { companyId } }),
      prisma.deal.findMany({ where: { companyId } })
    ]);
    contactIds = contacts.map(c => c.id);
    dealIds = deals.map(d => d.id);
  } else if (entityType === 'Deal') {
    dealIds = [entityId];
    const deal = await prisma.deal.findUnique({ where: { id: entityId } });
    if (deal?.contactId) contactIds.push(deal.contactId);
    if (deal?.leadId) leadIds.push(deal.leadId);
  } else if (entityType === 'Contact') {
    contactIds = [entityId];
    const contact = await prisma.contact.findUnique({ where: { id: entityId } });
    if (contact?.companyId) companyId = contact.companyId;
    const deals = await prisma.deal.findMany({ where: { contactId: entityId } });
    dealIds = deals.map(d => d.id);
  } else if (entityType === 'Lead') {
    leadIds = [entityId];
    const deals = await prisma.deal.findMany({ where: { leadId: entityId } });
    dealIds = deals.map(d => d.id);
  }

  // 1. Fetch direct and linked Activities
  const activityConditions = [
    { linkedType: entityType, linkedId: entityId }
  ];
  if (companyId) activityConditions.push({ linkedType: 'Company', linkedId: companyId });
  if (contactIds.length > 0) activityConditions.push({ linkedType: 'Contact', linkedId: { in: contactIds } });
  if (dealIds.length > 0) activityConditions.push({ linkedType: 'Deal', linkedId: { in: dealIds } });
  if (leadIds.length > 0) activityConditions.push({ linkedType: 'Lead', linkedId: { in: leadIds } });

  const activities = await prisma.activity.findMany({
    where: { OR: activityConditions },
    orderBy: { timestamp: 'desc' }
  });

  for (const act of activities) {
    let category = 'communication';
    let icon = 'PhoneCall';
    if (act.type.includes('Email')) {
      category = 'communication';
      icon = 'Mail';
    } else if (act.type.includes('Meeting')) {
      category = 'communication';
      icon = 'Calendar';
    } else if (act.type.includes('Note')) {
      category = 'note';
      icon = 'FileText';
    } else if (act.type.includes('Sample')) {
      category = 'pipeline';
      icon = 'Package';
    }

    timelineItems.push({
      id: act.id,
      sourceType: 'activity',
      eventType: act.type,
      title: `${act.type}: ${act.linkedTitle || act.linkedType}`,
      description: act.description || act.notes || '',
      authorName: act.authorName || act.actorName || 'Sales Rep',
      performedByName: act.performedByName || act.authorName || act.actorName || 'Sales Rep',
      assignedToName: act.assignedToName || null,
      recordedByName: act.authorName || 'Sales Rep',
      stageId: act.stageId || null,
      stageName: act.stageName || null,
      timestamp: act.timestamp || act.createdAt || new Date().toISOString(),
      linkedType: act.linkedType,
      linkedId: act.linkedId,
      linkedTitle: act.linkedTitle,
      category,
      icon,
      metadata: {
        isOutbound: act.isOutbound,
        stageId: act.stageId,
        stageName: act.stageName,
        performedByName: act.performedByName,
        assignedToName: act.assignedToName,
        ...(typeof act.metadata === 'object' && act.metadata ? act.metadata : {})
      }
    });
  }

  // 2. Fetch Notes
  const noteConditions = [
    { linkedType: entityType, linkedId: entityId }
  ];
  if (contactIds.length > 0) noteConditions.push({ linkedType: 'Contact', linkedId: { in: contactIds } });
  if (dealIds.length > 0) noteConditions.push({ linkedType: 'Deal', linkedId: { in: dealIds } });

  const notes = await prisma.note.findMany({
    where: { OR: noteConditions },
    orderBy: { timestamp: 'desc' }
  });

  for (const note of notes) {
    let noteStageName = null;
    const stagePrefixMatch = (note.text || '').match(/^\[(.*?)\]/);
    if (stagePrefixMatch) {
      noteStageName = stagePrefixMatch[1].trim();
    }

    timelineItems.push({
      id: note.id,
      sourceType: 'note',
      eventType: 'Internal Note',
      title: noteStageName ? `Internal Note (${noteStageName})` : 'Internal Account Note',
      description: note.text || '',
      authorName: note.authorName || 'Team Member',
      performedByName: note.authorName || 'Team Member',
      assignedToName: null,
      recordedByName: note.authorName || 'Team Member',
      stageId: null,
      stageName: noteStageName,
      timestamp: note.timestamp || note.createdAt || new Date().toISOString(),
      linkedType: note.linkedType,
      linkedId: note.linkedId,
      category: 'note',
      icon: 'FileText',
      metadata: {
        stageName: noteStageName
      }
    });
  }

  // 3. Fetch Tasks (including completions and approval tasks)
  const taskConditions = [
    { linkedType: entityType, linkedId: entityId }
  ];
  if (contactIds.length > 0) taskConditions.push({ linkedType: 'Contact', linkedId: { in: contactIds } });
  if (dealIds.length > 0) taskConditions.push({ linkedType: 'Deal', linkedId: { in: dealIds } });
  if (leadIds.length > 0) taskConditions.push({ linkedType: 'Lead', linkedId: { in: leadIds } });

  const tasks = await prisma.task.findMany({
    where: { OR: taskConditions },
    orderBy: { createdAt: 'desc' }
  });

  for (const task of tasks) {
    timelineItems.push({
      id: task.id,
      sourceType: 'task',
      eventType: task.type === 'Approval' ? 'Stage Approval Task' : 'Follow-up Task',
      title: task.title,
      description: task.note || (task.type === 'Approval' ? 'Stage gate verification item' : 'Follow-up action item'),
      authorName: task.ownerName || task.submittedByName || 'Assigned Rep',
      performedByName: task.reviewedByName || (task.status === 'done' || task.status === 'completed' ? task.ownerName : null),
      assignedToName: task.ownerName || null,
      recordedByName: task.submittedByName || task.ownerName || null,
      stageId: null,
      stageName: task.targetStageName || task.fromStageName || null,
      fromStageName: task.fromStageName || null,
      targetStageName: task.targetStageName || null,
      timestamp: task.createdAt ? (task.createdAt.includes('T') ? task.createdAt : `${task.createdAt}T12:00:00.000Z`) : new Date().toISOString(),
      status: task.status,
      linkedType: task.linkedType,
      linkedId: task.linkedId,
      category: 'task',
      icon: task.type === 'Approval' ? 'ShieldCheck' : 'CheckSquare',
      metadata: {
        dueDate: task.dueDate,
        priority: task.priority,
        fromStageName: task.fromStageName,
        targetStageName: task.targetStageName,
        reviewedByName: task.reviewedByName
      }
    });
  }

  // 4. Fetch Audit Logs (Stage Transitions, Rebuys, Value Updates, Deals Created)
  const allEntityIds = [entityId, companyId, ...contactIds, ...dealIds, ...leadIds].filter(Boolean);
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityId: { in: allEntityIds } },
        { entityType, entityId }
      ]
    },
    orderBy: { timestamp: 'desc' }
  });

  for (const aud of auditLogs) {
    let eventType = 'System Audit';
    let icon = 'GitCommit';
    let category = 'pipeline';

    if (aud.action === 'STAGE_TRANSITION' || aud.action === 'STAGE_ADVANCED') {
      eventType = 'Stage Transition';
      icon = 'ArrowRight';
    } else if (aud.action === 'DEAL_CREATED') {
      eventType = 'Deal Created';
      icon = 'PlusCircle';
    } else if (aud.action === 'DEAL_VALUE_CHANGED') {
      eventType = 'Deal Value Adjusted';
      icon = 'DollarSign';
    } else if (aud.action === 'REBUY_CREATED') {
      eventType = 'Renewal Cycle Triggered';
      icon = 'RefreshCw';
    } else if (aud.action === 'AUTOMATION_TASK_CREATED') {
      eventType = 'Automated Follow-up Scheduled';
      icon = 'Sparkles';
      category = 'task';
    } else if (aud.action === 'STAGE_GATE_APPROVED') {
      eventType = 'Stage Gate Approved';
      icon = 'ShieldCheck';
      category = 'governance';
    } else if (aud.action === 'STAGE_GATE_REJECTED') {
      eventType = 'Stage Gate Rejected';
      icon = 'AlertTriangle';
      category = 'governance';
    }

    timelineItems.push({
      id: aud.id,
      sourceType: 'audit',
      eventType,
      title: `${eventType}: ${aud.entityTitle || aud.entityType}`,
      description: aud.reason || `Action: ${aud.action}`,
      authorName: aud.actorName || 'System',
      performedByName: aud.actorName || 'System',
      assignedToName: null,
      recordedByName: aud.actorName || 'System',
      stageId: aud.metadata?.toStageId || null,
      stageName: aud.toStage || null,
      fromStageName: aud.fromStage || null,
      toStageName: aud.toStage || null,
      timestamp: aud.timestamp || new Date().toISOString(),
      linkedType: aud.entityType,
      linkedId: aud.entityId,
      category,
      icon,
      metadata: {
        fromStage: aud.fromStage,
        toStage: aud.toStage,
        reason: aud.reason,
        actorName: aud.actorName,
        ...(typeof aud.metadata === 'object' ? aud.metadata : {})
      }
    });
  }

  // 5. Fetch Stage Gate Checks
  if (dealIds.length > 0) {
    const checks = await prisma.stageGateCheck.findMany({
      where: {
        dealId: { in: dealIds }
      },
      orderBy: { timestamp: 'desc' }
    });

    for (const chk of checks) {
      timelineItems.push({
        id: chk.id,
        sourceType: 'stage_gate',
        eventType: `Stage Gate (${chk.status})`,
        title: `Gate Check: ${chk.fromStageName || 'Stage'} ➔ ${chk.targetStageName || 'Target'}`,
        description: chk.note || `Gate evaluation status: ${chk.status}. Outcome: ${chk.outcome || 'None'}`,
        authorName: chk.submittedByName || 'Sales Rep',
        performedByName: chk.reviewedByName || chk.submittedByName || 'Sales Rep',
        assignedToName: chk.reviewedByName || null,
        recordedByName: chk.submittedByName || null,
        stageId: chk.targetStageId || null,
        stageName: chk.targetStageName || chk.fromStageName || null,
        fromStageName: chk.fromStageName || null,
        toStageName: chk.targetStageName || null,
        timestamp: chk.timestamp || chk.createdAt || new Date().toISOString(),
        status: chk.status,
        linkedType: 'Deal',
        linkedId: chk.dealId,
        category: 'governance',
        icon: 'ShieldCheck',
        metadata: {
          fromStageName: chk.fromStageName,
          targetStageName: chk.targetStageName,
          reviewedByName: chk.reviewedByName,
          outcome: chk.outcome,
          answers: chk.answers
        }
      });
    }
  }

  // Deduplicate items by ID and sort descending by timestamp
  const seenIds = new Set();
  const uniqueItems = [];

  for (const item of timelineItems) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      uniqueItems.push(item);
    }
  }

  uniqueItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return uniqueItems;
};
