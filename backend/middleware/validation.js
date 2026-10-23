import { z } from 'zod';

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
  customFields: z.record(z.string(), z.any()).optional().default({}),
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
  customFields: z.record(z.string(), z.any()).optional().default({}),
  pendingGateCheck: z.any().optional(),
  createdAt: z.string().optional(),
  lastActivityDate: z.string().optional(),
}).passthrough();

export const updateLeadSchema = updateSchema(leadSchema);

// 4. Deals
export const dealSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Deal title is required'),
  companyName: z.string().optional().default(''),
  companyId: z.string().optional().default(''),
  contactName: z.string().optional().default(''),
  contactId: z.string().optional().default(''),
  stageId: z.string().optional().default('stg-1'),
  stageName: z.string().optional().default('New Lead'),
  value: z.number().finite().nonnegative().optional().default(0),
  leadId: z.string().optional(),
  isRecurring: z.boolean().optional().default(false),
  recurrenceDays: z.number().optional().default(60),
  status: z.string().optional().default('Open'),
  expectedCloseDate: z.string().optional(),
  ownerId: z.string().optional().default('u-1'),
  ownerName: z.string().optional().default('Alex Vance'),
  valueHistory: z.array(z.any()).optional(),
  customFields: z.record(z.string(), z.any()).optional(),
  partialGateState: z.any().optional(),
  pendingGateCheck: z.any().optional(),
  proposalExpiryDate: z.string().optional(),
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
  answers: z.record(z.string(), z.any()).optional(),
  overrideReason: z.string().optional(),
  demotionReason: z.string().optional(),
  note: z.string().optional(),
  lostReason: z.string().optional(),
}).passthrough();

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
  status: z.enum(['pending', 'completed', 'done']).optional(),
  completed: z.boolean().optional().default(false),
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
  status: z.enum(['pending', 'completed', 'done']).optional(),
  completed: z.boolean().optional(),
  createdAt: z.string().optional(),
}).passthrough();
