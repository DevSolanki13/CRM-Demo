import { 
  CRMState, 
  CRMBrandingSettings, 
  Company, 
  Contact, 
  Lead, 
  PipelineStage, 
  Deal, 
  Task, 
  Note, 
  ActivityLog, 
  User 
} from '../types/crm';

const BASE_URL = '/api';

export async function fetchCRMState(): Promise<CRMState> {
  try {
    const res = await fetch(`${BASE_URL}/state`);
    if (!res.ok) throw new Error('Failed to load state');
    return await res.json();
  } catch (err) {
    console.warn('API error, falling back', err);
    throw err;
  }
}

export async function resetCRMState(): Promise<CRMState> {
  const res = await fetch(`${BASE_URL}/state/reset`, { method: 'POST' });
  const data = await res.json();
  return data.state;
}

export async function updateBranding(branding: Partial<CRMBrandingSettings>): Promise<CRMBrandingSettings> {
  const res = await fetch(`${BASE_URL}/branding`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(branding)
  });
  return res.json();
}

// Companies
export async function createCompany(company: Partial<Company>): Promise<Company> {
  const res = await fetch(`${BASE_URL}/companies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(company)
  });
  return res.json();
}

export async function updateCompany(id: string, company: Partial<Company>): Promise<Company> {
  const res = await fetch(`${BASE_URL}/companies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(company)
  });
  return res.json();
}

export async function deleteCompany(id: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/companies/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return data.success;
}

// Contacts
export async function createContact(contact: Partial<Contact>): Promise<Contact> {
  const res = await fetch(`${BASE_URL}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
  });
  return res.json();
}

export async function updateContact(id: string, contact: Partial<Contact>): Promise<Contact> {
  const res = await fetch(`${BASE_URL}/contacts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
  });
  return res.json();
}

export async function deleteContact(id: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/contacts/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return data.success;
}

// Leads
export async function createLead(lead: Partial<Lead>): Promise<Lead> {
  const res = await fetch(`${BASE_URL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead)
  });
  return res.json();
}

export async function updateLead(id: string, lead: Partial<Lead>): Promise<Lead> {
  const res = await fetch(`${BASE_URL}/leads/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead)
  });
  return res.json();
}

export async function deleteLead(id: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/leads/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return data.success;
}

// Pipeline Stages
export async function createStage(stage: Partial<PipelineStage>): Promise<PipelineStage> {
  const res = await fetch(`${BASE_URL}/stages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stage)
  });
  return res.json();
}

export async function updateStage(id: string, stage: Partial<PipelineStage>): Promise<PipelineStage> {
  const res = await fetch(`${BASE_URL}/stages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stage)
  });
  return res.json();
}

// Deals
export async function createDeal(deal: Partial<Deal>): Promise<Deal> {
  const res = await fetch(`${BASE_URL}/deals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deal)
  });
  return res.json();
}

export async function updateDeal(id: string, deal: Partial<Deal>): Promise<Deal> {
  const res = await fetch(`${BASE_URL}/deals/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deal)
  });
  return res.json();
}

export async function deleteDeal(id: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/deals/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return data.success;
}

export async function triggerRenewalAutomation(): Promise<{ flippedCount: number; state: CRMState }> {
  const res = await fetch(`${BASE_URL}/deals/check-renewals`, { method: 'POST' });
  return res.json();
}

// Tasks
export async function createTask(task: Partial<Task>): Promise<Task> {
  const res = await fetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  });
  return res.json();
}

export async function updateTask(id: string, task: Partial<Task>): Promise<Task> {
  const res = await fetch(`${BASE_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  });
  return res.json();
}

export async function deleteTask(id: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/tasks/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return data.success;
}

// Notes & Activities
export async function createNote(note: Partial<Note>): Promise<Note> {
  const res = await fetch(`${BASE_URL}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note)
  });
  return res.json();
}

export async function createActivity(activity: Partial<ActivityLog>): Promise<ActivityLog> {
  const res = await fetch(`${BASE_URL}/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(activity)
  });
  return res.json();
}

// Users
export async function createUser(user: Partial<User>): Promise<User> {
  const res = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  return res.json();
}

export async function updateUser(id: string, user: Partial<User>): Promise<User> {
  const res = await fetch(`${BASE_URL}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  return res.json();
}

// CSV Bulk Import
export async function importContacts(items: any[]): Promise<{ count: number; contacts: Contact[] }> {
  const res = await fetch(`${BASE_URL}/import/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });
  return res.json();
}
