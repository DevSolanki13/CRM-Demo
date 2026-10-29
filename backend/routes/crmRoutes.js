import { protectWrites } from '../auth/sessions.js';
import { attachWorkspaceActor, getWorkspaceIdentity } from '../auth/demoActor.js';
import { authorizeCRM } from '../auth/permissions.js';
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
  pipelineSchema,
  updatePipelineSchema,
  attachmentSchema,
  closeLostSchema,
  rebuyRequestSchema,
  userSchema,
  updateUserSchema,
  mergeCustomerSchema,
  resolveReferenceSchema,
} from '../middleware/validation.js';

export const crmRouter = Router();

// Health & System State
crmRouter.get('/health', crmController.getHealth);
crmRouter.get('/ready', crmController.getReadiness);
crmRouter.get('/workspace-summary', attachWorkspaceActor, crmController.getWorkspaceSummary);
crmRouter.get('/pages/:resource', attachWorkspaceActor, crmController.getRecordsPage);
// Legacy collection URLs use the same bounded envelope and visibility policy.
for (const resource of ['companies', 'contacts', 'leads', 'deals', 'tasks', 'notes', 'activities', 'audit-logs', 'stage-gate-checks']) {
  crmRouter.get(`/${resource}`, attachWorkspaceActor, (req, res, next) => {
    req.params.resource = resource === 'stage-gate-checks' ? 'stageGateChecks' : resource;
    return crmController.getRecordsPage(req, res, next);
  });
}
crmRouter.get('/reports/summary', attachWorkspaceActor, crmController.getReportSummary);
crmRouter.get('/reports/audit', attachWorkspaceActor, crmController.getReportAuditPage);
crmRouter.get('/me', attachWorkspaceActor, getWorkspaceIdentity);
crmRouter.get('/state', attachWorkspaceActor, crmController.getState);
crmRouter.use(protectWrites, attachWorkspaceActor, authorizeCRM);
crmRouter.post('/state/reset', crmController.resetState);

// Branding & Settings
crmRouter.put('/branding', validateBody(brandingSchema), crmController.updateBranding);

// Companies
crmRouter.post('/companies', validateBody(companySchema), crmController.createCompany);
crmRouter.put('/companies/:id', validateBody(updateCompanySchema), crmController.updateCompany);
crmRouter.delete('/companies/:id', crmController.deleteCompany);
crmRouter.post('/companies/:id/merge', validateBody(mergeCustomerSchema), crmController.mergeCompanies);

// Contacts
crmRouter.get('/contacts/duplicates', crmController.duplicateContacts);
crmRouter.post('/contacts', validateBody(contactSchema), crmController.createContact);
crmRouter.put('/contacts/:id', validateBody(updateContactSchema), crmController.updateContact);
crmRouter.delete('/contacts/:id', crmController.deleteContact);
crmRouter.post('/contacts/:id/merge', validateBody(mergeCustomerSchema), crmController.mergeContacts);

// Leads
crmRouter.post('/leads', validateBody(leadSchema), crmController.createLead);
crmRouter.put('/leads/:id', validateBody(updateLeadSchema), crmController.updateLead);
crmRouter.delete('/leads/:id', crmController.deleteLead);

// Pipeline Stages
crmRouter.get('/stages', crmController.getStages);
crmRouter.post('/stages', validateBody(stageSchema), crmController.createStage);
crmRouter.put('/stages/:id', validateBody(updateStageSchema), crmController.updateStage);
crmRouter.get('/pipelines', crmController.getPipelines);
crmRouter.post('/pipelines', validateBody(pipelineSchema), crmController.createPipeline);
crmRouter.put('/pipelines/:id', validateBody(updatePipelineSchema), crmController.updatePipeline);

// Deals
crmRouter.post('/deals', validateBody(dealSchema), crmController.createDeal);
crmRouter.put('/deals/:id', validateBody(updateDealSchema), crmController.updateDeal);
crmRouter.delete('/deals/:id', crmController.deleteDeal);
crmRouter.post('/deals/check-renewals', crmController.checkRenewals);
crmRouter.post('/deals/:id/stage-transition', validateBody(dealTransitionSchema), crmController.transitionDealStage);
crmRouter.post('/deals/:id/close-lost', validateBody(closeLostSchema), crmController.closeLostDeal);
crmRouter.post('/deals/:id/create-rebuy', validateBody(rebuyRequestSchema), crmController.createRebuyDeal);

// Audit Logs

// Tasks
crmRouter.post('/tasks', validateBody(taskSchema), crmController.createTask);
crmRouter.put('/tasks/:id', validateBody(updateTaskSchema), crmController.updateTask);
crmRouter.delete('/tasks/:id', crmController.deleteTask);

// Notes & Activity Logs
crmRouter.post('/notes', validateBody(noteSchema), crmController.createNote);
crmRouter.post('/activities', validateBody(activitySchema), crmController.createActivity);
crmRouter.delete('/activities/:id', crmController.deleteActivity);
crmRouter.get('/attachments', crmController.getAttachments);
crmRouter.post('/attachments', validateBody(attachmentSchema), crmController.uploadAttachment);
crmRouter.get('/attachments/:id/download', crmController.downloadAttachment);
crmRouter.delete('/attachments/:id', crmController.deleteAttachment);

// Users / Employees
crmRouter.get('/users', crmController.getUsers);
crmRouter.post('/users', validateBody(userSchema), crmController.createUser);
crmRouter.put('/users/:id', validateBody(updateUserSchema), crmController.updateUser);
crmRouter.post('/users/:id/invite', crmController.createAccountInvitation);

// Stage Gate Checks
crmRouter.post('/stage-gate-checks', validateBody(approvalRequestSchema), crmController.createStageGateCheck);
crmRouter.post('/stage-gate-checks/:id/approve', validateBody(approvalDecisionSchema), crmController.approveStageGateCheck);
crmRouter.post('/stage-gate-checks/:id/reject', validateBody(approvalRejectionSchema), crmController.rejectStageGateCheck);

// Bulk Import
crmRouter.post('/import/contacts', validateBody(contactImportSchema), crmController.importContacts);

// Unified Customer Activity Timeline
crmRouter.get('/timeline', crmController.getTimeline);

// Automation & Follow-up Rules
crmRouter.get('/settings/automation-rules', crmController.getAutomationRules);
crmRouter.get('/settings/automation-status', crmController.getAutomationRunStatus);
crmRouter.put('/settings/automation-rules', validateBody(automationRulesSchema), crmController.updateAutomationRules);
crmRouter.get('/settings/unresolved-links', crmController.getUnresolvedLinks);
crmRouter.post('/settings/unresolved-links/:id/resolve', validateBody(resolveReferenceSchema), crmController.resolveHistoricalLink);
