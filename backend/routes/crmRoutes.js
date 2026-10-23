import { Router } from 'express';
import * as crmController from '../controllers/crmController.js';
import {
  validateBody,
  companySchema,
  updateCompanySchema,
  contactSchema,
  updateContactSchema,
  leadSchema,
  updateLeadSchema,
  dealSchema,
  updateDealSchema,
  dealTransitionSchema,
  taskSchema,
  updateTaskSchema,
  approvalRequestSchema,
  approvalDecisionSchema,
  approvalRejectionSchema,
  noteSchema,
  activitySchema,
  contactImportSchema,
  automationRulesSchema,
  brandingSchema,
  stageSchema,
  updateStageSchema,
  closeLostSchema,
  rebuyRequestSchema,
  userSchema,
  updateUserSchema,
} from '../middleware/validation.js';

export const crmRouter = Router();

// Health & System State
crmRouter.get('/health', crmController.getHealth);
crmRouter.get('/state', crmController.getState);
crmRouter.post('/state/reset', crmController.resetState);

// Branding & Settings
crmRouter.put('/branding', validateBody(brandingSchema), crmController.updateBranding);

// Companies
crmRouter.get('/companies', crmController.getCompanies);
crmRouter.post('/companies', validateBody(companySchema), crmController.createCompany);
crmRouter.put('/companies/:id', validateBody(updateCompanySchema), crmController.updateCompany);
crmRouter.delete('/companies/:id', crmController.deleteCompany);

// Contacts
crmRouter.get('/contacts', crmController.getContacts);
crmRouter.post('/contacts', validateBody(contactSchema), crmController.createContact);
crmRouter.put('/contacts/:id', validateBody(updateContactSchema), crmController.updateContact);
crmRouter.delete('/contacts/:id', crmController.deleteContact);

// Leads
crmRouter.get('/leads', crmController.getLeads);
crmRouter.post('/leads', validateBody(leadSchema), crmController.createLead);
crmRouter.put('/leads/:id', validateBody(updateLeadSchema), crmController.updateLead);
crmRouter.delete('/leads/:id', crmController.deleteLead);

// Pipeline Stages
crmRouter.get('/stages', crmController.getStages);
crmRouter.post('/stages', validateBody(stageSchema), crmController.createStage);
crmRouter.put('/stages/:id', validateBody(updateStageSchema), crmController.updateStage);

// Deals
crmRouter.get('/deals', crmController.getDeals);
crmRouter.post('/deals', validateBody(dealSchema), crmController.createDeal);
crmRouter.put('/deals/:id', validateBody(updateDealSchema), crmController.updateDeal);
crmRouter.delete('/deals/:id', crmController.deleteDeal);
crmRouter.post('/deals/check-renewals', crmController.checkRenewals);
crmRouter.post('/deals/:id/stage-transition', validateBody(dealTransitionSchema), crmController.transitionDealStage);
crmRouter.post('/deals/:id/close-lost', validateBody(closeLostSchema), crmController.closeLostDeal);
crmRouter.post('/deals/:id/create-rebuy', validateBody(rebuyRequestSchema), crmController.createRebuyDeal);

// Audit Logs
crmRouter.get('/audit-logs', crmController.getAuditLogs);

// Tasks
crmRouter.get('/tasks', crmController.getTasks);
crmRouter.post('/tasks', validateBody(taskSchema), crmController.createTask);
crmRouter.put('/tasks/:id', validateBody(updateTaskSchema), crmController.updateTask);
crmRouter.delete('/tasks/:id', crmController.deleteTask);

// Notes & Activity Logs
crmRouter.get('/notes', crmController.getNotes);
crmRouter.post('/notes', validateBody(noteSchema), crmController.createNote);
crmRouter.get('/activities', crmController.getActivities);
crmRouter.post('/activities', validateBody(activitySchema), crmController.createActivity);
crmRouter.delete('/activities/:id', crmController.deleteActivity);

// Users / Employees
crmRouter.get('/users', crmController.getUsers);
crmRouter.post('/users', validateBody(userSchema), crmController.createUser);
crmRouter.put('/users/:id', validateBody(updateUserSchema), crmController.updateUser);

// Stage Gate Checks
crmRouter.get('/stage-gate-checks', crmController.getStageGateChecks);
crmRouter.post('/stage-gate-checks', validateBody(approvalRequestSchema), crmController.createStageGateCheck);
crmRouter.post('/stage-gate-checks/:id/approve', validateBody(approvalDecisionSchema), crmController.approveStageGateCheck);
crmRouter.post('/stage-gate-checks/:id/reject', validateBody(approvalRejectionSchema), crmController.rejectStageGateCheck);

// Bulk Import
crmRouter.post('/import/contacts', validateBody(contactImportSchema), crmController.importContacts);

// Unified Customer Activity Timeline
crmRouter.get('/timeline', crmController.getTimeline);

// Automation & Follow-up Rules
crmRouter.get('/settings/automation-rules', crmController.getAutomationRules);
crmRouter.put('/settings/automation-rules', validateBody(automationRulesSchema), crmController.updateAutomationRules);
