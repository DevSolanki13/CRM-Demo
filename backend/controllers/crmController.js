import { crmStore } from '../store/crmStore.js';

export const getHealth = (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
};

export const getState = (_req, res) => {
  res.json(crmStore.getState());
};

export const resetState = (_req, res) => {
  const newState = crmStore.resetState();
  res.json({ success: true, state: newState });
};

export const updateBranding = (req, res) => {
  const updated = crmStore.updateBranding(req.body);
  res.json(updated);
};

// Companies
export const getCompanies = (_req, res) => {
  res.json(crmStore.getCompanies());
};

export const createCompany = (req, res) => {
  const newComp = crmStore.createCompany(req.body);
  res.status(201).json(newComp);
};

export const updateCompany = (req, res) => {
  const updated = crmStore.updateCompany(req.params.id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Company not found' });
  }
};

export const deleteCompany = (req, res) => {
  const success = crmStore.deleteCompany(req.params.id);
  res.json({ success });
};

// Contacts
export const getContacts = (_req, res) => {
  res.json(crmStore.getContacts());
};

export const createContact = (req, res) => {
  const newContact = crmStore.createContact(req.body);
  res.status(201).json(newContact);
};

export const updateContact = (req, res) => {
  const updated = crmStore.updateContact(req.params.id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Contact not found' });
  }
};

export const deleteContact = (req, res) => {
  const success = crmStore.deleteContact(req.params.id);
  res.json({ success });
};

// Leads
export const getLeads = (_req, res) => {
  res.json(crmStore.getLeads());
};

export const createLead = (req, res) => {
  const newLead = crmStore.createLead(req.body);
  res.status(201).json(newLead);
};

export const updateLead = (req, res) => {
  const updated = crmStore.updateLead(req.params.id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Lead not found' });
  }
};

export const deleteLead = (req, res) => {
  const success = crmStore.deleteLead(req.params.id);
  res.json({ success });
};

// Stages
export const getStages = (_req, res) => {
  res.json(crmStore.getStages());
};

export const createStage = (req, res) => {
  const newStage = crmStore.createStage(req.body);
  res.status(201).json(newStage);
};

export const updateStage = (req, res) => {
  const updated = crmStore.updateStage(req.params.id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Stage not found' });
  }
};

// Deals
export const getDeals = (_req, res) => {
  res.json(crmStore.getDeals());
};

export const createDeal = (req, res) => {
  const newDeal = crmStore.createDeal(req.body);
  res.status(201).json(newDeal);
};

export const updateDeal = (req, res) => {
  const updated = crmStore.updateDeal(req.params.id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Deal not found' });
  }
};

export const deleteDeal = (req, res) => {
  const success = crmStore.deleteDeal(req.params.id);
  res.json({ success });
};

export const checkRenewals = (_req, res) => {
  const result = crmStore.triggerRenewalCheck();
  res.json({ success: true, flippedCount: result.flippedCount, state: result.state });
};

// Tasks
export const getTasks = (_req, res) => {
  res.json(crmStore.getTasks());
};

export const createTask = (req, res) => {
  const newTask = crmStore.createTask(req.body);
  res.status(201).json(newTask);
};

export const updateTask = (req, res) => {
  const updated = crmStore.updateTask(req.params.id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Task not found' });
  }
};

export const deleteTask = (req, res) => {
  const success = crmStore.deleteTask(req.params.id);
  res.json({ success });
};

// Notes & Activities
export const getNotes = (_req, res) => {
  res.json(crmStore.getNotes());
};

export const createNote = (req, res) => {
  const newNote = crmStore.createNote(req.body);
  res.status(201).json(newNote);
};

export const getActivities = (_req, res) => {
  res.json(crmStore.getActivities());
};

export const createActivity = (req, res) => {
  const newActivity = crmStore.createActivity(req.body);
  res.status(201).json(newActivity);
};

// Users
export const getUsers = (_req, res) => {
  res.json(crmStore.getUsers());
};

export const createUser = (req, res) => {
  const newUser = crmStore.createUser(req.body);
  res.status(201).json(newUser);
};

export const updateUser = (req, res) => {
  const updated = crmStore.updateUser(req.params.id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
};

// Bulk Import
export const importContacts = (req, res) => {
  const items = req.body.items || [];
  const contacts = crmStore.importContacts(items);
  res.status(201).json({ count: contacts.length, contacts });
};
