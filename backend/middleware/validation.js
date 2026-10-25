import { z } from 'zod';

const customFieldsSchema = z.record(z.string(), z.union([
  z.string(), z.number().finite(), z.boolean(), z.null()
]));
const optionalDate = z.iso.date().optional();
const taskStatus = z.enum(['pending', 'completed', 'done']);

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
)).passthrough();

// 1. Companies
export const companySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Company name is required'),
  industry: z.string().optional().default('General'),
  website: z.string().optional().default(''),
  address: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  createdAt: z.string().optional(),
}).passthrough();

export const updateCompanySchema = updateSchema(companySchema);

// 2. Contacts
export const contactSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Contact name is required'),
  email: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  jobTitle: z.string().optional().default(''),
  companyId: z.string().optional().default(''),
  companyName: z.string().optional().default(''),
  ownerId: z.string().optional().default('u-1'),
  ownerName: z.string().optional().default('Alex Vance'),
  customFields: customFieldsSchema.optional().default({}),
  createdAt: z.string().optional(),
}).passthrough();

export const updateContactSchema = updateSchema(contactSchema);

// 3. Leads
export const leadSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Lead title is required'),
  contactName: z.string().optional().default(''),
  contactEmail: z.string().optional().default(''),
  contactPhone: z.string().optional().default(''),
  companyName: z.string().optional().default(''),
  source: z.string().optional().default('Inbound'),
  isOutbound: z.boolean().optional().default(false),
  status: z.string().optional().default('New'),
  ownerId: z.string().optional().default('u-1'),
  ownerName: z.string().optional().default('Alex Vance'),
  customFields: customFieldsSchema.optional().default({}),
  pendingGateCheck: z.any().optional(),
  createdAt: z.string().optional(),
  lastActivityDate: z.string().optional(),
}).passthrough();

export const updateLeadSchema = updateSchema(leadSchema);

// 4. Deals
export const dealSchema = z.object({
  id: z.string().optional(),
  pipelineId: z.string().trim().min(1).optional(),
  title: z.string().min(1, 'Deal title is required'),
  companyName: z.string().optional().default(''),
  companyId: z.string().optional().default(''),
  contactName: z.string().optional().default(''),
  contactId: z.string().optional().default(''),
  stageId: z.string().optional(),
  stageName: z.string().optional(),
  value: z.number().finite().nonnegative().optional().default(0),
  leadId: z.string().optional(),
  isRecurring: z.boolean().optional().default(false),
  recurrenceDays: z.number().int().positive().max(3650).optional().default(60),
  status: z.string().optional().default('Open'),
  expectedCloseDate: optionalDate,
  ownerId: z.string().optional().default('u-1'),
  ownerName: z.string().optional().default('Alex Vance'),
  valueHistory: z.array(z.any()).optional(),
  customFields: customFieldsSchema.optional(),
  partialGateState: z.any().optional(),
  pendingGateCheck: z.any().optional(),
  proposalExpiryDate: optionalDate,
  lostReason: z.string().optional(),
  lostReasonNote: z.string().optional(),
  actualCloseDate: z.string().optional(),
  parentDealId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

export const updateDealSchema = updateSchema(dealSchema);

export const dealTransitionSchema = z.object({
  targetStageId: z.string().min(1, 'Target stage ID is required'),
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
}).passthrough();

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
  dueDate: z.string().optional(),
  type: z.string().optional().default('Call'),
  priority: z.string().optional().default('Medium'),
  assignedToId: z.string().optional().default('u-1'),
  assignedToName: z.string().optional().default('Alex Vance'),
  dealId: z.string().optional(),
  leadId: z.string().optional(),
  companyId: z.string().optional(),
  linkedTitle: z.string().optional(),
  completed: z.boolean().optional().default(false),
  status: taskStatus.optional(),
  createdAt: z.string().optional(),
}).passthrough();

export const updateTaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  dueDate: z.string().optional(),
  type: z.string().optional(),
  priority: z.string().optional(),
  assignedToId: z.string().optional(),
  assignedToName: z.string().optional(),
  ownerId: z.string().optional(),
  ownerName: z.string().optional(),
  dealId: z.string().optional(),
  leadId: z.string().optional(),
  companyId: z.string().optional(),
  linkedTitle: z.string().optional(),
  status: taskStatus.optional(),
  completed: z.boolean().optional(),
  createdAt: z.string().optional(),
}).passthrough();

export const approvalRequestSchema = z.object({
  dealId: z.string().min(1, 'A deal is required for approval'),
  fromStageId: z.string().min(1),
  targetStageId: z.string().min(1),
  submittedBy: z.string().optional(),
  submittedByName: z.string().optional(),
  outcome: z.enum(['advanced', 'lost', 'demoted']).optional(),
  answers: z.record(z.string(), z.boolean()).optional(),
  note: z.string().optional(),
  lostReason: z.string().optional(),
}).passthrough().refine(data =>
  (data.outcome !== 'lost' && data.targetStageId !== 'stg-8') || Boolean(data.lostReason?.trim()), {
  message: 'A Closed Lost reason is required', path: ['lostReason']
});

export const approvalDecisionSchema = z.object({});

export const approvalRejectionSchema = approvalDecisionSchema.extend({
  reason: z.string().trim().min(1, 'A rejection reason is required'),
});

export const noteSchema = z.object({
  text: z.string().trim().min(1, 'Note text is required'),
  linkedType: z.string().optional(),
  linkedId: z.string().optional(),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
}).passthrough();

export const activitySchema = z.object({
  type: z.string().trim().min(1, 'Activity type is required'),
  description: z.string().trim().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
  linkedType: z.string().optional(),
  linkedId: z.string().optional(),
  timestamp: z.string().refine(value => !Number.isNaN(Date.parse(value)), 'Invalid timestamp').optional(),
}).passthrough().refine(data => Boolean(data.description || data.notes), {
  message: 'Activity description is required', path: ['description']
});

export const contactImportSchema = z.object({
  items: z.array(contactSchema).min(1).max(500),
});

const automationRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  triggerEvent: z.string().min(1),
  offsetDays: z.number().int().min(0).max(3650),
  taskType: z.string().min(1),
  taskTitleTemplate: z.string().min(1),
  noteTemplate: z.string(),
  isActive: z.boolean(),
}).passthrough();

export const automationRulesSchema = z.object({
  rules: z.array(automationRuleSchema).max(100),
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
  customFields: z.object({ approvalPolicy: approvalPolicySchema.optional() }).passthrough().optional(),
}).passthrough();

export const stageSchema = z.object({
  name: z.string().trim().min(1),
  pipelineId: z.string().trim().min(1).optional(),
  order: z.number().int().positive().optional(),
  category: z.string().trim().min(1).optional(),
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
