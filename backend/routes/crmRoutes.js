import { Router } from 'express';
import * as crmController from '../controllers/crmController.js';

export const crmRouter = Router();

// Health & System State
crmRouter.get('/health', crmController.getHealth);
crmRouter.get('/state', crmController.getState);
crmRouter.post('/state/reset', crmController.resetState);

// Branding & Settings
crmRouter.put('/branding', crmController.updateBranding);

// Companies
crmRouter.get('/companies', crmController.getCompanies);
crmRouter.post('/companies', crmController.createCompany);
crmRouter.put('/companies/:id', crmController.updateCompany);
crmRouter.delete('/companies/:id', crmController.deleteCompany);

// Contacts
crmRouter.get('/contacts', crmController.getContacts);
crmRouter.post('/contacts', crmController.createContact);
crmRouter.put('/contacts/:id', crmController.updateContact);
crmRouter.delete('/contacts/:id', crmController.deleteContact);

// Leads
crmRouter.get('/leads', crmController.getLeads);
crmRouter.post('/leads', crmController.createLead);
crmRouter.put('/leads/:id', crmController.updateLead);
crmRouter.delete('/leads/:id', crmController.deleteLead);

// Pipeline Stages
crmRouter.get('/stages', crmController.getStages);
crmRouter.post('/stages', crmController.createStage);
crmRouter.put('/stages/:id', crmController.updateStage);

// Deals
crmRouter.get('/deals', crmController.getDeals);
crmRouter.post('/deals', crmController.createDeal);
crmRouter.put('/deals/:id', crmController.updateDeal);
crmRouter.delete('/deals/:id', crmController.deleteDeal);
crmRouter.post('/deals/check-renewals', crmController.checkRenewals);

// Tasks
crmRouter.get('/tasks', crmController.getTasks);
crmRouter.post('/tasks', crmController.createTask);
crmRouter.put('/tasks/:id', crmController.updateTask);
crmRouter.delete('/tasks/:id', crmController.deleteTask);

// Notes & Activity Logs
crmRouter.get('/notes', crmController.getNotes);
crmRouter.post('/notes', crmController.createNote);
crmRouter.get('/activities', crmController.getActivities);
crmRouter.post('/activities', crmController.createActivity);

// Users / Employees
crmRouter.get('/users', crmController.getUsers);
crmRouter.post('/users', crmController.createUser);
crmRouter.put('/users/:id', crmController.updateUser);

// Stage Gate Checks
crmRouter.get('/stage-gate-checks', crmController.getStageGateChecks);
crmRouter.post('/stage-gate-checks', crmController.createStageGateCheck);
crmRouter.post('/stage-gate-checks/:id/approve', crmController.approveStageGateCheck);
crmRouter.post('/stage-gate-checks/:id/reject', crmController.rejectStageGateCheck);

// Bulk Import
crmRouter.post('/import/contacts', crmController.importContacts);
