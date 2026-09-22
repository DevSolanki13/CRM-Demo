import { asyncHandler } from '../middleware/asyncHandler.js';
import * as systemService from '../services/systemService.js';
import * as companyService from '../services/companyService.js';
import * as contactService from '../services/contactService.js';
import * as leadService from '../services/leadService.js';
import * as stageService from '../services/stageService.js';
import * as dealService from '../services/dealService.js';
import * as taskService from '../services/taskService.js';
import * as activityNoteService from '../services/activityNoteService.js';
import * as userService from '../services/userService.js';
import * as stageGateService from '../services/stageGateService.js';

// Health & System State
export const getHealth = (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
};

export const getState = asyncHandler(async (_req, res) => {
  const state = await systemService.getState();
  res.json(state);
});

export const resetState = asyncHandler(async (_req, res) => {
  const newState = await systemService.resetState();
  res.json({ success: true, state: newState });
});

export const updateBranding = asyncHandler(async (req, res) => {
  const updated = await systemService.updateBranding(req.body);
  res.json(updated);
});

// Companies
export const getCompanies = asyncHandler(async (_req, res) => {
  res.json(await companyService.getCompanies());
});

export const createCompany = asyncHandler(async (req, res) => {
  const newComp = await companyService.createCompany(req.body);
  res.status(201).json(newComp);
});

export const updateCompany = asyncHandler(async (req, res) => {
  const updated = await companyService.updateCompany(req.params.id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Company not found' });
  }
});

export const deleteCompany = asyncHandler(async (req, res) => {
  const success = await companyService.deleteCompany(req.params.id);
  res.json({ success });
});

// Contacts
export const getContacts = asyncHandler(async (_req, res) => {
  res.json(await contactService.getContacts());
});

export const createContact = asyncHandler(async (req, res) => {
  const newContact = await contactService.createContact(req.body);
  res.status(201).json(newContact);
});

export const updateContact = asyncHandler(async (req, res) => {
  const updated = await contactService.updateContact(req.params.id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Contact not found' });
  }
});

export const deleteContact = asyncHandler(async (req, res) => {
  const success = await contactService.deleteContact(req.params.id);
  res.json({ success });
});

export const importContacts = asyncHandler(async (req, res) => {
  const items = req.body.items || [];
  const contacts = await contactService.importContacts(items);
  res.status(201).json({ count: contacts.length, contacts });
});

// Leads
export const getLeads = asyncHandler(async (_req, res) => {
  res.json(await leadService.getLeads());
});

export const createLead = asyncHandler(async (req, res) => {
  const newLead = await leadService.createLead(req.body);
  res.status(201).json(newLead);
});

export const updateLead = asyncHandler(async (req, res) => {
  const updated = await leadService.updateLead(req.params.id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Lead not found' });
  }
});

export const deleteLead = asyncHandler(async (req, res) => {
  const success = await leadService.deleteLead(req.params.id);
  res.json({ success });
});

// Stages
export const getStages = asyncHandler(async (_req, res) => {
  res.json(await stageService.getStages());
});

export const createStage = asyncHandler(async (req, res) => {
  const newStage = await stageService.createStage(req.body);
  res.status(201).json(newStage);
});

export const updateStage = asyncHandler(async (req, res) => {
  const updated = await stageService.updateStage(req.params.id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Stage not found' });
  }
});

// Deals
export const getDeals = asyncHandler(async (_req, res) => {
  res.json(await dealService.getDeals());
});

export const createDeal = asyncHandler(async (req, res) => {
  const newDeal = await dealService.createDeal(req.body);
  res.status(201).json(newDeal);
});

export const updateDeal = asyncHandler(async (req, res) => {
  const updated = await dealService.updateDeal(req.params.id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Deal not found' });
  }
});

export const deleteDeal = asyncHandler(async (req, res) => {
  const success = await dealService.deleteDeal(req.params.id);
  res.json({ success });
});

export const transitionDealStage = asyncHandler(async (req, res) => {
  const result = await dealService.transitionDealStage(req.params.id, req.body);
  res.json(result);
});

export const closeLostDeal = asyncHandler(async (req, res) => {
  const result = await dealService.closeLostDeal(req.params.id, req.body);
  res.json(result);
});

export const createRebuyDeal = asyncHandler(async (req, res) => {
  const rebuyDeal = await dealService.createRebuyDeal(req.params.id, req.body?.user);
  if (!rebuyDeal) {
    return res.status(404).json({ error: 'Parent deal not found' });
  }
  res.status(201).json(rebuyDeal);
});

export const checkRenewals = asyncHandler(async (_req, res) => {
  const result = await dealService.triggerRenewalCheck();
  const state = await systemService.getState();
  res.json({ success: true, flippedCount: result.flippedCount, state });
});

// Audit Logs
export const getAuditLogs = asyncHandler(async (_req, res) => {
  res.json(await activityNoteService.getAuditLogs());
});

// Tasks
export const getTasks = asyncHandler(async (_req, res) => {
  res.json(await taskService.getTasks());
});

export const createTask = asyncHandler(async (req, res) => {
  const newTask = await taskService.createTask(req.body);
  res.status(201).json(newTask);
});

export const updateTask = asyncHandler(async (req, res) => {
  const updated = await taskService.updateTask(req.params.id, req.body);
  res.json(updated || { id: req.params.id, ...req.body });
});

export const deleteTask = asyncHandler(async (req, res) => {
  const success = await taskService.deleteTask(req.params.id);
  res.json({ success });
});

// Notes & Activities
export const getNotes = asyncHandler(async (_req, res) => {
  res.json(await activityNoteService.getNotes());
});

export const createNote = asyncHandler(async (req, res) => {
  const newNote = await activityNoteService.createNote(req.body);
  res.status(201).json(newNote);
});

export const getActivities = asyncHandler(async (_req, res) => {
  res.json(await activityNoteService.getActivities());
});

export const createActivity = asyncHandler(async (req, res) => {
  const newActivity = await activityNoteService.createActivity(req.body);
  res.status(201).json(newActivity);
});

// Users
export const getUsers = asyncHandler(async (_req, res) => {
  res.json(await userService.getUsers());
});

export const createUser = asyncHandler(async (req, res) => {
  const newUser = await userService.createUser(req.body);
  res.status(201).json(newUser);
});

export const updateUser = asyncHandler(async (req, res) => {
  const updated = await userService.updateUser(req.params.id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Stage Gate Checks
export const getStageGateChecks = asyncHandler(async (_req, res) => {
  res.json(await stageGateService.getStageGateChecks());
});

export const createStageGateCheck = asyncHandler(async (req, res) => {
  const newCheck = await stageGateService.createStageGateCheck(req.body);
  res.status(201).json(newCheck);
});

export const approveStageGateCheck = asyncHandler(async (req, res) => {
  const updated = await stageGateService.approveStageGateCheck(req.params.id, req.body?.reviewer);
  res.json(updated || { success: true });
});

export const rejectStageGateCheck = asyncHandler(async (req, res) => {
  const updated = await stageGateService.rejectStageGateCheck(req.params.id, req.body?.reviewer, req.body?.reason);
  res.json(updated || { success: true });
});
