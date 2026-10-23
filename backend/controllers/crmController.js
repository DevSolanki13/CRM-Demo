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
import * as timelineService from '../services/timelineService.js';
import * as followUpEngine from '../services/followUpEngine.js';

// Health & System State
export const getHealth = (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
};

export const getState = asyncHandler(async (req, res) => {
  const state = req.crmState;
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
export const getCompanies = asyncHandler(async (req, res) => {
  res.json(req.crmState.companies);
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
export const getContacts = asyncHandler(async (req, res) => {
  res.json(req.crmState.contacts);
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
export const getLeads = asyncHandler(async (req, res) => {
  res.json(req.crmState.leads);
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
export const getStages = asyncHandler(async (req, res) => {
  res.json(req.crmState.stages);
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
export const getDeals = asyncHandler(async (req, res) => {
  res.json(req.crmState.deals);
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
  const result = await dealService.transitionDealStage(req.params.id, { ...req.body, user: req.user });
  res.json(result);
});

export const closeLostDeal = asyncHandler(async (req, res) => {
  const result = await dealService.closeLostDeal(req.params.id, { ...req.body, note: req.body.note || req.body.lostNote, user: req.user });
  res.json(result);
});

export const createRebuyDeal = asyncHandler(async (req, res) => {
  const rebuyDeal = await dealService.createRebuyDeal(req.params.id, req.user);
  if (!rebuyDeal) {
    return res.status(404).json({ error: 'Parent deal not found' });
  }
  res.status(201).json(rebuyDeal);
});

export const checkRenewals = asyncHandler(async (_req, res) => {
  const result = await dealService.triggerRenewalCheck();
  const state = await systemService.getState();
  res.json({ success: result.failures.length === 0, ...result, state });
});

// Audit Logs
export const getAuditLogs = asyncHandler(async (req, res) => {
  res.json(req.crmState.auditLogs);
});

// Tasks
export const getTasks = asyncHandler(async (req, res) => {
  res.json(req.crmState.tasks);
});

export const createTask = asyncHandler(async (req, res) => {
  const newTask = await taskService.createTask(req.body);
  res.status(201).json(newTask);
});

export const updateTask = asyncHandler(async (req, res) => {
  const updated = await taskService.updateTask(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Task not found' });
  res.json(updated);
});

export const deleteTask = asyncHandler(async (req, res) => {
  const success = await taskService.deleteTask(req.params.id);
  res.json({ success });
});

// Notes & Activities
export const getNotes = asyncHandler(async (req, res) => {
  res.json(req.crmState.notes);
});

export const createNote = asyncHandler(async (req, res) => {
  const newNote = await activityNoteService.createNote({ ...req.body, authorId: req.user.id, authorName: req.user.name });
  res.status(201).json(newNote);
});

export const getActivities = asyncHandler(async (req, res) => {
  res.json(req.crmState.activities);
});

export const createActivity = asyncHandler(async (req, res) => {
  const newActivity = await activityNoteService.createActivity({ ...req.body, authorId: req.user.id, authorName: req.user.name, performedByName: req.user.name });
  res.status(201).json(newActivity);
});

export const deleteActivity = asyncHandler(async (req, res) => {
  const success = await activityNoteService.deleteActivity(req.params.id);
  res.json({ success });
});

// Users
export const getUsers = asyncHandler(async (req, res) => {
  res.json(req.crmState.users);
});

export const createUser = asyncHandler(async (req, res) => {
  const newUser = await userService.createUser(req.body);
  res.status(201).json(newUser);
});

export const updateUser = asyncHandler(async (req, res) => {
  const updated = await userService.updateUser(req.params.id, req.body, req.user);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Stage Gate Checks
export const getStageGateChecks = asyncHandler(async (req, res) => {
  res.json(req.crmState.stageGateChecks);
});

export const createStageGateCheck = asyncHandler(async (req, res) => {
  const result = await stageGateService.createStageGateCheck({
    ...req.body,
    submittedBy: req.user.id,
    submittedByName: req.user.name,
  });
  res.status(201).json(result);
});

export const approveStageGateCheck = asyncHandler(async (req, res) => {
  const updated = await stageGateService.approveStageGateCheck(req.params.id, req.user);
  res.json(updated || { success: true });
});

export const rejectStageGateCheck = asyncHandler(async (req, res) => {
  const updated = await stageGateService.rejectStageGateCheck(req.params.id, req.user, req.body?.reason);
  res.json(updated || { success: true });
});

// Unified Activity Timeline
export const getTimeline = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.query;
  if (!entityType || !entityId) {
    return res.status(400).json({ error: 'entityType and entityId query parameters are required' });
  }
  const timeline = await timelineService.getEntityTimeline({ entityType, entityId });
  res.json(req.user.role === 'Sales Rep' ? timeline.filter(item => {
    const field = { Deal: 'deals', Lead: 'leads', Contact: 'contacts', Company: 'companies', Task: 'tasks' }[item.linkedType];
    return field && req.crmState[field].some(row => row.id === item.linkedId);
  }) : timeline);
});

// Automation & Follow-up Rules
export const getAutomationRules = asyncHandler(async (_req, res) => {
  const rules = await followUpEngine.getFollowUpRules();
  res.json(rules);
});

export const updateAutomationRules = asyncHandler(async (req, res) => {
  const rules = req.body.rules || req.body;
  const updated = await followUpEngine.updateFollowUpRules(rules);
  res.json(updated);
});
