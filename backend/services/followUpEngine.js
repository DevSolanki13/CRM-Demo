import { prisma } from '../prisma.js';
import { randomUUID } from 'node:crypto';
import { getLocalDateStringAfterDays, getLocalDateString, followUpOffsetDays } from '../utils/dateUtils.js';
import { validatedInput, automationRulesSchema } from '../middleware/validation.js';

export const DEFAULT_FOLLOW_UP_RULES = [
  {
    id: 'rule-lead-create',
    name: 'New Lead Outreach',
    triggerEvent: 'LEAD_CREATED',
    description: 'Triggered when a new lead is created in the system',
    offsetDays: 1,
    taskType: 'Call',
    priority: 'High',
    taskTitleTemplate: 'First contact outreach for {{entityName}}',
    noteTemplate: 'Inbound/outbound lead inquiry via {{source}}. Initiate first contact outreach.',
    isActive: true
  },
  {
    id: 'rule-sample-sent',
    name: 'Sample Delivery & Testing Check-in',
    triggerEvent: 'SAMPLE_SENT',
    description: 'Triggered when a deal advances to Sample Sent or sample is dispatched',
    offsetDays: 3,
    taskType: 'Call',
    priority: 'High',
    taskTitleTemplate: 'Follow up on sample evaluation with {{contactName}} ({{companyName}})',
    noteTemplate: 'Sample dispatched. Confirm receipt and gather product feedback / qualification data.',
    isActive: true
  },
  {
    id: 'rule-proposal-sent',
    name: 'Proposal & Commercial Terms Review',
    triggerEvent: 'PROPOSAL_SENT',
    description: 'Triggered when a deal moves to Proposal Sent stage',
    offsetDays: 3,
    taskType: 'Meeting',
    priority: 'High',
    taskTitleTemplate: 'Review commercial proposal & pricing terms with {{contactName}}',
    noteTemplate: 'Proposal delivered. Conduct review meeting to address questions before validity expiration.',
    isActive: true
  },
  {
    id: 'rule-renewal-approaching',
    name: 'Recurring Contract Rebuy Outreach',
    triggerEvent: 'RENEWAL_APPROACHING',
    description: 'Triggered when a recurring client approaches their replenishment / renewal cycle',
    offsetDays: 7,
    taskType: 'Renewal Check-in',
    priority: 'Urgent',
    taskTitleTemplate: 'Prepare renewal rebuy quote for {{companyName}}',
    noteTemplate: 'Customer order cycle threshold approaching. Review historical consumption and initiate replenishment.',
    isActive: true
  }
];

/**
 * Fetch configured follow-up rules from Branding.customFields or fallback to defaults
 */
export const getFollowUpRules = async () => {
  const branding = await prisma.branding.findUnique({ where: { id: 'default' } });
  const customFields = branding?.customFields || {};
  
  if (Array.isArray(customFields.followUpRules)) {
    return customFields.followUpRules;
  }
  
  return DEFAULT_FOLLOW_UP_RULES;
};

/**
 * Update and save follow-up rules
 */
export const updateFollowUpRules = async (rules) => {
  rules = validatedInput(automationRulesSchema, { rules }).rules;
  const branding = await prisma.branding.findUnique({ where: { id: 'default' } });
  const customFields = typeof branding?.customFields === 'object' && branding?.customFields !== null
    ? { ...branding.customFields }
    : {};
  
  customFields.followUpRules = rules;

  await prisma.branding.upsert({
    where: { id: 'default' },
    update: { customFields },
    create: {
      id: 'default',
      appName: 'Sales CRM',
      customFields
    }
  });

  return rules;
};

/**
 * Replace placeholders in string template: {{entityName}}, {{contactName}}, {{companyName}}, {{source}}, {{stageName}}
 */
const renderTemplate = (template, context) => {
  if (!template) return '';
  return template
    .replace(/\{\{entityName\}\}/g, context.title || context.name || context.contactName || 'Prospect')
    .replace(/\{\{contactName\}\}/g, context.contactName || context.name || 'Key Contact')
    .replace(/\{\{companyName\}\}/g, context.companyName || 'Corporate Client')
    .replace(/\{\{source\}\}/g, context.source || 'Direct')
    .replace(/\{\{stageName\}\}/g, context.stageName || context.targetStageName || 'Current Stage');
};

/**
 * Process an event trigger across active follow-up rules
 * @param {string} triggerEvent - 'LEAD_CREATED' | 'SAMPLE_SENT' | 'PROPOSAL_SENT' | 'RENEWAL_APPROACHING' | 'STAGE_CHANGED'
 * @param {object} context - Entity information (lead, deal, contact, etc.)
 */
export const processFollowUpEvent = async (id, now = new Date()) => {
  const leaseToken = randomUUID();
  const claim = await prisma.automationEvent.updateMany({
    where: { id, status: { in: ['pending', 'failed', 'running'] }, nextRunAt: { lte: now },
      OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] },
    data: { status: 'running', leaseToken,
      lockedUntil: new Date(now.getTime() + 10 * 60_000), attempts: { increment: 1 } }
  });
  if (!claim.count) return { claimed: false, createdTasks: [] };
  const event = await prisma.automationEvent.findUnique({ where: { id } });
  const context = event.context;
  const createdTasks = [];
  try {
    const rules = (await getFollowUpRules()).filter(rule => rule.isActive && rule.triggerEvent === event.trigger);
    const linkedType = context.leadId || context.contactPhone ? 'Lead'
      : context.value !== undefined ? 'Deal' : 'Lead';
    const linkedId = context.id || context.dealId || context.leadId || '';
    const linkedTitle = context.title || context.name || context.companyName || 'CRM Opportunity';
    for (const rule of rules) {
      const taskId = `tsk-auto-${event.id}-${rule.id}`;
      const dueDate = getLocalDateStringAfterDays(followUpOffsetDays(rule.offsetDays));
      const task = await prisma.$transaction(async tx => {
        const existing = await tx.task.findUnique({ where: { id: taskId } });
        if (existing) return null;
        const saved = await tx.task.create({ data: {
          id: taskId, title: renderTemplate(rule.taskTitleTemplate, context),
          dueDate, type: rule.taskType || 'Call', linkedType, linkedId, linkedTitle,
          ownerId: context.ownerId || null, ownerName: context.ownerName || null,
          status: 'pending', note: `[Automated Task: ${rule.name}] ${renderTemplate(rule.noteTemplate, context)}`,
          createdAt: getLocalDateString()
        } });
        await tx.auditLog.create({ data: {
          id: `aud-${taskId}`, timestamp: new Date().toISOString(),
          actorId: 'system-automation', actorName: 'Follow-Up Engine',
          action: 'AUTOMATION_TASK_CREATED', entityType: linkedType,
          entityId: linkedId, entityTitle: linkedTitle,
          reason: `Auto-generated "${rule.name}" task scheduled for ${dueDate}`,
          metadata: { ruleId: rule.id, triggerEvent: event.trigger, taskId }
        } });
        return saved;
      });
      if (task) createdTasks.push(task);
    }
    await prisma.automationEvent.updateMany({ where: { id, leaseToken }, data: {
      status: 'completed', leaseToken: null, lockedUntil: null,
      lastError: null, processedAt: new Date()
    } });
    return { claimed: true, createdTasks };
  } catch (error) {
    const delay = Math.min(60 * 60_000, 60_000 * 2 ** Math.min(event.attempts, 6));
    await prisma.automationEvent.updateMany({ where: { id, leaseToken }, data: {
      status: 'failed', leaseToken: null, lockedUntil: null,
      nextRunAt: new Date(now.getTime() + delay),
      lastError: String(error.message).slice(0, 2000)
    } });
    console.error(`Follow-up event ${id} failed and is queued for retry:`, error);
    return { claimed: true, createdTasks, failed: true };
  }
};

export const processPendingFollowUps = async () => {
  const pending = await prisma.automationEvent.findMany({
    where: { status: { in: ['pending', 'failed', 'running'] }, nextRunAt: { lte: new Date() },
      OR: [{ lockedUntil: null }, { lockedUntil: { lte: new Date() } }] },
    orderBy: { nextRunAt: 'asc' }, take: 50, select: { id: true }
  });
  let processed = 0;
  let failed = 0;
  for (const event of pending) {
    const result = await processFollowUpEvent(event.id);
    if (result.claimed) processed++;
    if (result.failed) failed++;
  }
  return { processed, failed };
};

export const triggerFollowUp = async (triggerEvent, context = {}) => {
  const linkedId = context.id || context.dealId || context.leadId;
  if (!linkedId) throw new Error('A linked record is required for follow-up automation.');
  const id = context.eventId || `${triggerEvent}:${linkedId}:${context.stageName || ''}`;
  await prisma.automationEvent.upsert({
    where: { id }, create: { id, trigger: triggerEvent, context }, update: {}
  });
  const result = await processFollowUpEvent(id);
  return result.createdTasks;
};
