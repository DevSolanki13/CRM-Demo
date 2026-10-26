import { z } from 'zod';

const customFieldsSchema = z.record(z.string(), z.union([
  z.string(), z.number().finite(), z.boolean(), z.null()
]));
const optionalDate = z.union([z.iso.date(), z.literal(''), z.null()]).optional();
const optionalTaskDate = z.union([z.iso.date(), z.iso.datetime({ local: true }), z.literal(''), z.null()]).optional();
const optionalText = z.string().max(10000).nullable().optional();
const optionalId = z.string().max(256).nullable().optional();
const optionalEmail = z.union([z.email(), z.literal(''), z.null()]).optional();
const optionalJson = z.json().nullable().optional();
const taskStatus = z.enum(['pending', 'completed', 'done']);
const recordType = z.enum(['Deal', 'Lead', 'Contact', 'Company']);
const recordLinkIsValid = data => Boolean(data.linkedId) === Boolean(data.linkedType);
const followUpSchema = z.object({
  requestId: z.string().trim().min(1).max(256),
  reason: z.enum(['disconnected', 'qualification_failed']),
  dealId: z.string().min(1).max(256).optional(),
  expectedStageId: z.string().min(1).max(256).optional(),
  ownerId: z.string().min(1).max(256),
  dueDate: z.iso.date(),
  answers: z.record(z.string(), z.boolean()).optional(),
}).strict();

export function validatedInput(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) throw Object.assign(new Error('Invalid input: ' + result.error.issues
    .map(issue => `${issue.path.join('.') || 'body'}: ${issue.message}`).join('; ')), { statusCode: 400 });
  return result.data;
}

export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const formatted = result.error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    return res.status(400).json({
      error: 'Validation failed',
      details: formatted,
    });
  }
  // Use parsed/stripped data
  req.body = result.data;
  next();
};

// Zod 4 applies defaults inside optional fields. Update schemas must remove
// creation defaults, otherwise a title-only edit silently resets other fields.
const updateSchema = schema => z.object(Object.fromEntries(
  Object.entries(schema.shape).map(([key, field]) => [key, (field instanceof z.ZodDefault ? field.removeDefault() : field).optional()])
)).strip();

// 1. Companies
export const companySchema = z.object({
  id: z.string().optional(),
  ownerId: optionalId,
  name: z.string().trim().min(1, 'Company name is required').max(200),
  industry: z.string().nullable().optional().default('General'),
  website: z.string().nullable().optional().default(''),
  address: z.string().nullable().optional().default(''),
  notes: z.string().nullable().optional().default(''),
  createdAt: z.string().optional(),
}).strip();

export const updateCompanySchema = updateSchema(companySchema);

// 2. Contacts
export const contactSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Contact name is required').max(200),
  email: optionalEmail.default(''),
  phone: z.string().nullable().optional().default(''),
  jobTitle: z.string().nullable().optional().default(''),
  companyId: z.string().nullable().optional().default(''),
  companyName: z.string().nullable().optional().default(''),
  ownerId: z.string().nullable().optional().default('u-1'),
  ownerName: z.string().nullable().optional().default('Alex Vance'),
  customFields: customFieldsSchema.nullable().optional().default({}),
  createdAt: z.string().optional(),
}).strip();

export const updateContactSchema = updateSchema(contactSchema);

// 3. Leads
export const leadSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, 'Lead title is required').max(300),
  contactName: z.string().nullable().optional().default(''),
  contactEmail: optionalEmail.default(''),
  contactPhone: z.string().nullable().optional().default(''),
  companyName: z.string().nullable().optional().default(''),
  source: z.string().nullable().optional().default('Inbound'),
  isOutbound: z.boolean().optional().default(false),
  status: z.enum(['New', 'Working', 'Qualified', 'Unqualified', 'Converted', 'Follow up', 'Pending Review']).optional().default('New'),
  ownerId: z.string().nullable().optional().default('u-1'),
  ownerName: z.string().nullable().optional().default('Alex Vance'),
  customFields: customFieldsSchema.optional().default({}),
  pendingGateCheck: optionalJson,
  createdAt: z.string().optional(),
  lastActivityDate: z.string().optional(),
}).strip();

export const updateLeadSchema = updateSchema(leadSchema);

// 4. Deals
export const dealSchema = z.object({
  id: z.string().optional(),
  pipelineId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1, 'Deal title is required').max(300),
  companyName: z.string().nullable().optional().default(''),
  companyId: z.string().nullable().optional().default(''),
  contactName: z.string().nullable().optional().default(''),
  contactId: z.string().nullable().optional().default(''),
  stageId: z.string().optional(),
  stageName: z.string().optional(),
  value: z.number().finite().nonnegative().optional().default(0),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  leadId: optionalId,
  isRecurring: z.boolean().optional().default(false),
  recurrenceDays: z.number().int().positive().max(3650).optional().default(60),
  status: z.enum(['Open', 'Active', 'Follow up', 'Pending Review', 'Won', 'Lost', 'Renewal Due']).optional().default('Open'),
  expectedCloseDate: optionalDate,
  ownerId: z.string().nullable().optional().default('u-1'),
  ownerName: z.string().nullable().optional().default('Alex Vance'),
  valueHistory: z.array(z.json()).nullable().optional(),
  customFields: customFieldsSchema.optional(),
  partialGateState: optionalJson,
  pendingGateCheck: optionalJson,
  proposalExpiryDate: optionalDate,
  lostReason: optionalText,
  lostReasonNote: optionalText,
  actualCloseDate: optionalDate,
  parentDealId: optionalId,
  lostStageId: optionalId,
  lostStageName: optionalText,
  lastActivityDate: optionalDate,
  daysInStage: z.number().int().nonnegative().optional(),
  isRebuy: z.boolean().optional(),
  reason: optionalText,
  valueChangeReason: optionalText,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).strip();

export const updateDealSchema = updateSchema(dealSchema);

export const dealTransitionSchema = z.object({
  targetStageId: z.string().min(1, 'Target stage ID is required'),
  expectedStageId: z.string().min(1).optional(),
  user: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    role: z.string().optional(),
  }).optional(),
  answers: z.record(z.string(), z.boolean()).optional(),
  overrideReason: z.string().optional(),
  demotionReason: z.string().optional(),
  note: z.string().optional(),
  lostReason: z.string().optional(),
}).strip();

export const closeLostSchema = z.object({
  lostReason: z.string().trim().min(1, 'A Closed Lost reason is required'),
  note: z.string().optional(),
  user: z.object({ id: z.string().min(1), name: z.string().optional(), role: z.string().optional() }).optional(),
});

export const rebuyRequestSchema = z.object({
  user: z.object({ id: z.string().min(1), name: z.string().optional() }).optional(),
});

// 5. Tasks
export const taskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Task title is required'),
  dueDate: optionalTaskDate,
  type: z.string().optional().default('Call'),
  priority: z.string().optional().default('Medium'),
  assignedToId: z.string().optional().default('u-1'),
  assignedToName: z.string().optional().default('Alex Vance'),
  dealId: z.string().optional(),
  leadId: z.string().optional(),
  companyId: z.string().nullable().optional(),
  linkedTitle: z.string().optional(),
  linkedType: z.enum(['Deal', 'Lead', 'Contact', 'Company']).nullable().optional(),
  linkedId: optionalId,
  ownerId: optionalId,
  ownerName: optionalText,
  note: optionalText,
  stageGateCheckId: optionalId,
  targetStageName: optionalText,
  completed: z.boolean().optional().default(false),
  status: taskStatus.optional(),
  createdAt: z.string().optional(),
}).strip();

export const updateTaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(300).optional(),
  dueDate: optionalTaskDate,
  type: z.string().optional(),
  priority: z.string().optional(),
  assignedToId: z.string().optional(),
  assignedToName: z.string().optional(),
  ownerId: z.string().nullable().optional(),
  ownerName: z.string().nullable().optional(),
  dealId: z.string().optional(),
  leadId: z.string().optional(),
  companyId: z.string().nullable().optional(),
  linkedTitle: z.string().optional(),
  linkedType: z.enum(['Deal', 'Lead', 'Contact', 'Company']).nullable().optional(),
  linkedId: optionalId,
  note: optionalText,
  stageGateCheckId: optionalId,
  status: taskStatus.optional(),
  completed: z.boolean().optional(),
  createdAt: z.string().optional(),
}).strip();

export const approvalRequestSchema = z.object({
  dealId: z.string().min(1, 'A deal is required for approval'),
  fromStageId: z.string().min(1),
  targetStageId: z.string().min(1),
  submittedBy: z.string().optional(),
  submittedByName: z.string().optional(),
  outcome: z.enum(['advanced', 'lost', 'demoted']).optional(),
  answers: z.record(z.string(), z.boolean()).optional(),
  note: z.string().optional(),
  lostReason: z.string().nullable().optional(),
}).strip().refine(data =>
  data.outcome !== 'lost' || Boolean(data.lostReason?.trim()), {
  message: 'A Closed Lost reason is required', path: ['lostReason']
});

export const approvalDecisionSchema = z.object({});

export const approvalRejectionSchema = approvalDecisionSchema.extend({
  reason: z.string().trim().min(1, 'A rejection reason is required'),
});

export const noteSchema = z.object({
  id: z.string().optional(),
  text: z.string().trim().min(1, 'Note text is required').max(10000),
  linkedType: recordType.optional(),
  linkedId: z.string().min(1).max(256).optional(),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
}).strip().refine(recordLinkIsValid, { message: 'Provide both linkedType and linkedId', path: ['linkedId'] });

export const activitySchema = z.object({
  id: z.string().optional(),
  type: z.string().trim().min(1, 'Activity type is required'),
  description: z.string().trim().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
  linkedType: recordType.optional(),
  linkedId: z.string().min(1).max(256).optional(),
  linkedTitle: optionalText,
  dealId: optionalId,
  leadId: optionalId,
  stageId: optionalId,
  stageName: optionalText,
  authorId: optionalId,
  authorName: optionalText,
  actorId: optionalId,
  actorName: optionalText,
  userId: optionalId,
  performedByName: optionalText,
  assignedToName: optionalText,
  metadata: optionalJson,
  followUp: followUpSchema.optional(),
  isOutbound: z.boolean().optional(),
  createdAt: optionalText,
  timestamp: z.string().refine(value => !Number.isNaN(Date.parse(value)), 'Invalid timestamp').optional(),
}).strip().refine(data => Boolean(data.description || data.notes), {
  message: 'Activity description is required', path: ['description']
}).refine(recordLinkIsValid, {
  message: 'Provide both linkedType and linkedId', path: ['linkedId']
}).refine(data => !(data.dealId && data.leadId) &&
  (!data.dealId || !data.linkedId || (data.linkedType === 'Deal' && data.linkedId === data.dealId)) &&
  (!data.leadId || !data.linkedId || (data.linkedType === 'Lead' && data.linkedId === data.leadId)), {
  message: 'Activity links must identify one record', path: ['linkedId']
}).refine(data => !data.followUp || (['Deal', 'Lead'].includes(data.linkedType) && data.linkedId &&
  (!(data.linkedType === 'Deal' || data.followUp.dealId) || data.followUp.expectedStageId)), {
  message: 'A follow-up needs a lead/deal link and the current stage for a deal', path: ['followUp']
});

export const contactImportSchema = z.object({
  items: z.array(contactSchema).min(1).max(500),
});

const automationRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  triggerEvent: z.enum(['LEAD_CREATED', 'SAMPLE_SENT', 'PROPOSAL_SENT', 'RENEWAL_APPROACHING']),
  description: optionalText,
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  offsetDays: z.number().int().min(0).max(3650),
  taskType: z.string().min(1),
  taskTitleTemplate: z.string().min(1),
  noteTemplate: z.string(),
  isActive: z.boolean(),
}).strip();

const automationRuleList = z.array(automationRuleSchema).max(100).refine(rules =>
  new Set(rules.map(rule => rule.id)).size === rules.length, 'Automation rule IDs must be unique');

export const automationRulesSchema = z.object({
  rules: automationRuleList,
});

const approvalPolicySchema = z.object({
  alwaysRequireReview: z.boolean(),
  largeDealThreshold: z.number().nonnegative(),
  discountThresholdPercent: z.number().min(0).max(100),
  requireIncompleteChecklist: z.boolean(),
  requiredAnswersByStage: z.record(z.string(), z.array(z.string().min(1))).optional(),
}).strict();

export const brandingSchema = z.object({
  appName: z.string().trim().min(1).optional(),
  tagline: z.string().optional(),
  logoIcon: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  defaultRecurrenceDays: z.number().int().positive().max(3650).optional(),
  customFields: z.object({
    approvalPolicy: approvalPolicySchema.optional(),
    followUpRules: automationRuleList.optional(),
    reporting: z.object({
      probabilities: z.record(z.string(), z.number().min(0).max(100)).optional(),
      targets: z.record(z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), z.record(z.string(), z.number().finite().nonnegative())).optional(),
    }).strip().optional(),
  }).catchall(z.json()).nullable().optional(),
}).strip();

export const stageSchema = z.object({
  name: z.string().trim().min(1).max(80),
  pipelineId: z.string().trim().min(1).optional(),
  order: z.number().int().positive().optional(),
  category: z.enum(['New', 'Pipeline', 'Won', 'Lost', 'Buy Again']).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const updateStageSchema = stageSchema.partial();

export const pipelineSchema = z.object({
  name: z.string().trim().min(1).max(80),
  stages: z.array(z.object({
    name: z.string().trim().min(1).max(80),
    category: z.enum(['New', 'Pipeline', 'Won', 'Lost', 'Buy Again']),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  })).min(3).max(20).optional(),
  qualificationRules: z.record(z.string(), z.array(z.enum(['contactId', 'companyId', 'expectedCloseDate']))).optional(),
}).strict();

export const updatePipelineSchema = pipelineSchema.pick({ name: true, qualificationRules: true })
  .partial().extend({ active: z.boolean().optional() }).strict();

export const attachmentSchema = z.object({
  recordType: z.enum(['Deal', 'Lead', 'Contact', 'Company']),
  recordId: z.string().min(1).max(180),
  filename: z.string().trim().min(1).max(180),
  contentType: z.enum(['application/pdf', 'image/png', 'image/jpeg', 'text/plain', 'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  size: z.number().int().positive().max(5 * 1024 * 1024),
  data: z.string().min(1).max(7 * 1024 * 1024),
}).strict();

export const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
  email: z.email(),
  role: z.enum(['Sales Rep', 'Manager', 'Admin']),
  active: z.boolean().optional(),
  avatarUrl: z.string().optional(),
  password: z.string().min(12).max(128).optional(),
});

export const updateUserSchema = userSchema.partial();

export const mergeCustomerSchema = z.object({
  sourceId: z.string().trim().min(1),
}).strict();

export const resolveReferenceSchema = z.object({
  targetId: z.string().trim().min(1),
}).strict();
