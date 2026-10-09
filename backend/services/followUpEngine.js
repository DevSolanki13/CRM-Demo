import { prisma } from '../prisma.js';
import { getLocalDateStringAfterDays, getLocalDateString } from '../utils/dateUtils.js';
import { createTask } from './taskService.js';
import { logAudit } from './activityNoteService.js';

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
  
  if (Array.isArray(customFields.followUpRules) && customFields.followUpRules.length > 0) {
    return customFields.followUpRules;
  }
  
  return DEFAULT_FOLLOW_UP_RULES;
};

/**
 * Update and save follow-up rules
 */
export const updateFollowUpRules = async (rules) => {
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
export const triggerFollowUp = async (triggerEvent, context = {}) => {
  try {
    const rules = await getFollowUpRules();
    const activeRules = rules.filter(r => r.isActive && r.triggerEvent === triggerEvent);

    if (activeRules.length === 0) return [];

    const createdTasks = [];
    const linkedType = context.leadId || context.contactPhone ? 'Lead' : (context.value !== undefined ? 'Deal' : 'Lead');
    const linkedId = context.id || context.dealId || context.leadId || '';
    const linkedTitle = context.title || context.name || context.companyName || 'CRM Opportunity';
    const ownerId = context.ownerId || 'u-3';
    const ownerName = context.ownerName || 'Sales Rep';

    for (const rule of activeRules) {
      const taskTitle = renderTemplate(rule.taskTitleTemplate, context);
      const taskNote = renderTemplate(rule.noteTemplate, context);
      const dueDate = getLocalDateStringAfterDays(Number(rule.offsetDays) || 1);

      // Check if a similar pending task already exists for this entity to prevent duplicate spamming
      const existingTask = await prisma.task.findFirst({
        where: {
          linkedId,
          title: taskTitle,
          status: 'pending'
        }
      });

      if (!existingTask) {
        const newTask = await createTask({
          id: `tsk-auto-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          title: taskTitle,
          dueDate,
          type: rule.taskType || 'Call',
          priority: rule.priority || 'Medium',
          linkedType,
          linkedId,
          linkedTitle,
          ownerId,
          ownerName,
          status: 'pending',
          note: `[Automated Task: ${rule.name}] ${taskNote}`,
          createdAt: getLocalDateString()
        });

        createdTasks.push(newTask);

        // Log audit event for automated task generation
        await logAudit({
          actorId: 'system-automation',
          actorName: 'Follow-Up Engine',
          action: 'AUTOMATION_TASK_CREATED',
          entityType: linkedType,
          entityId: linkedId,
          entityTitle: linkedTitle,
          reason: `Auto-generated "${rule.name}" task scheduled for ${dueDate}`,
          metadata: { ruleId: rule.id, triggerEvent, taskId: newTask.id }
        });
      }
    }

    return createdTasks;
  } catch (error) {
    console.error(`[FollowUpEngine Error] Failed to process trigger ${triggerEvent}:`, error);
    return [];
  }
};
