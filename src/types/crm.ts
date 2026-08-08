export type UserRole = 'Admin' | 'Manager' | 'Sales Rep';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  active: boolean;
  assignedLeadCount?: number;
  assignedDealValue?: number;
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  website: string;
  address: string;
  notes: string;
  createdAt: string;
  linkedContactsCount?: number;
  totalDealValue?: number;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  companyId: string;
  companyName?: string;
  ownerId: string;
  ownerName?: string;
  customFields?: Record<string, string>;
  createdAt: string;
}

export type LeadSource = 'Website' | 'Referral' | 'Cold Outbound' | 'Inbound Inquiry' | 'Trade Show' | 'LinkedIn';
export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Unqualified' | 'Converted';

export interface Lead {
  id: string;
  title: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  companyName: string;
  source: LeadSource;
  isOutbound: boolean; // true = outbound effort, false = inbound
  status: LeadStatus;
  ownerId: string;
  ownerName?: string;
  customFields?: Record<string, string>;
  notes?: string;
  createdAt: string;
  lastActivityDate: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  category: 'New' | 'Contacted' | 'Sample Sent' | 'Trial' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost' | 'Buy Again';
  color: string;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stageId: string;
  stageName?: string;
  expectedCloseDate: string;
  actualCloseDate?: string;
  contactId: string;
  contactName?: string;
  companyId: string;
  companyName?: string;
  ownerId: string;
  ownerName?: string;
  isRecurring: boolean;
  recurrenceDays?: number; // e.g. 30, 60, 90 days
  nextRenewalDate?: string;
  status: 'Active' | 'Won' | 'Lost' | 'Renewal Due';
  createdAt: string;
  updatedAt: string;
  daysInStage?: number;
}

export type TaskType = 'Call' | 'Email' | 'Meeting' | 'Sample Follow-up' | 'Proposal Follow-up' | 'Renewal Check-in';

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  type: TaskType;
  linkedType: 'Lead' | 'Deal' | 'Contact';
  linkedId: string;
  linkedTitle?: string;
  ownerId: string;
  ownerName?: string;
  status: 'pending' | 'done';
  createdAt: string;
}

export interface Note {
  id: string;
  text: string;
  timestamp: string;
  authorId: string;
  authorName: string;
  linkedType: 'Lead' | 'Deal' | 'Contact' | 'Company';
  linkedId: string;
}

export type ActivityType = 
  | 'Outbound Call'
  | 'Inbound Call'
  | 'Outbound Email'
  | 'Inbound Email'
  | 'Meeting'
  | 'Sample Sent'
  | 'Proposal Sent'
  | 'Status Changed'
  | 'Note Added';

export interface ActivityLog {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  linkedType: 'Lead' | 'Deal' | 'Contact';
  linkedId: string;
  linkedTitle?: string;
  authorId: string;
  authorName: string;
  isOutbound: boolean;
}

export interface CustomFieldDefinition {
  id: string;
  entity: 'Lead' | 'Contact';
  label: string;
  type: 'text' | 'select' | 'number';
  options?: string[];
}

export interface CRMBrandingSettings {
  appName: string;
  tagline: string;
  logoIcon: string; // Lucide icon name or image URL
  primaryColor: string; // Hex color
  accentColor: string;
  defaultRecurrenceDays: number; // default repeat order cycle
  customFields: CustomFieldDefinition[];
}

export interface CRMState {
  branding: CRMBrandingSettings;
  users: User[];
  companies: Company[];
  contacts: Contact[];
  leads: Lead[];
  stages: PipelineStage[];
  deals: Deal[];
  tasks: Task[];
  notes: Note[];
  activities: ActivityLog[];
}
