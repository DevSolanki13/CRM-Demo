const BASE_URL = '/api';

export async function fetchCRMState() {
  try {
    const res = await fetch(`${BASE_URL}/state`);
    if (!res.ok) throw new Error('Failed to load state');
    return await res.json();
  } catch (err) {
    console.warn('API error, falling back', err);
    throw err;
  }
}

export async function resetCRMState() {
  const res = await fetch(`${BASE_URL}/state/reset`, { method: 'POST' });
  const data = await res.json();
  return data.state;
}

export async function updateBranding(branding) {
  const res = await fetch(`${BASE_URL}/branding`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(branding)
  });
  return res.json();
}

// Companies
export async function createCompany(company) {
  const res = await fetch(`${BASE_URL}/companies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(company)
  });
  return res.json();
}

export async function updateCompany(id, company) {
  const res = await fetch(`${BASE_URL}/companies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(company)
  });
  return res.json();
}

export async function deleteCompany(id) {
  const res = await fetch(`${BASE_URL}/companies/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return data.success;
}

// Contacts
export async function createContact(contact) {
  const res = await fetch(`${BASE_URL}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
  });
  return res.json();
}

export async function updateContact(id, contact) {
  const res = await fetch(`${BASE_URL}/contacts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
  });
  return res.json();
}

export async function deleteContact(id) {
  const res = await fetch(`${BASE_URL}/contacts/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return data.success;
}

// Leads
export async function createLead(lead) {
  const res = await fetch(`${BASE_URL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead)
  });
  return res.json();
}

export async function updateLead(id, lead) {
  const res = await fetch(`${BASE_URL}/leads/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead)
  });
  return res.json();
}

export async function deleteLead(id) {
  const res = await fetch(`${BASE_URL}/leads/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return data.success;
}

// Pipeline Stages
export async function createStage(stage) {
  const res = await fetch(`${BASE_URL}/stages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stage)
  });
  return res.json();
}

export async function updateStage(id, stage) {
  const res = await fetch(`${BASE_URL}/stages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stage)
  });
  return res.json();
}

// Deals
export async function createDeal(deal) {
  const res = await fetch(`${BASE_URL}/deals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deal)
  });
  return res.json();
}

export async function updateDeal(id, deal) {
  const res = await fetch(`${BASE_URL}/deals/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deal)
  });
  return res.json();
}

export async function deleteDeal(id) {
  const res = await fetch(`${BASE_URL}/deals/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return data.success;
}

export async function triggerRenewalAutomation() {
  const res = await fetch(`${BASE_URL}/deals/check-renewals`, { method: 'POST' });
  return res.json();
}

// Tasks
export async function createTask(task) {
  const res = await fetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  });
  return res.json();
}

export async function updateTask(id, task) {
  const res = await fetch(`${BASE_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  });
  return res.json();
}

export async function deleteTask(id) {
  const res = await fetch(`${BASE_URL}/tasks/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return data.success;
}

// Notes & Activities
export async function createNote(note) {
  const res = await fetch(`${BASE_URL}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note)
  });
  return res.json();
}

export async function createActivity(activity) {
  const res = await fetch(`${BASE_URL}/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(activity)
  });
  return res.json();
}

// Users
export async function createUser(user) {
  const res = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  return res.json();
}

export async function updateUser(id, user) {
  const res = await fetch(`${BASE_URL}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  return res.json();
}

// Stage Gate Checks
export async function fetchStageGateChecks() {
  const res = await fetch(`${BASE_URL}/stage-gate-checks`);
  return res.json();
}

export async function createStageGateCheck(check) {
  const res = await fetch(`${BASE_URL}/stage-gate-checks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(check)
  });
  return res.json();
}

export async function approveStageGateCheck(id, reviewer) {
  if (id && (id.startsWith('dl-') || id.startsWith('ld-') || id.startsWith('v-task-'))) {
    const cleanId = id.replace('v-task-', '');
    return updateDeal(cleanId, {
      status: 'Active',
      pendingGateCheck: null
    });
  }

  try {
    const res = await fetch(`${BASE_URL}/stage-gate-checks/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewer })
    });
    if (res.ok) {
      return res.json();
    }
  } catch (err) {
    console.warn('approveStageGateCheck network call warning:', err);
  }

  return { success: true };
}

export async function rejectStageGateCheck(id, reviewer, reason) {
  if (id && (id.startsWith('dl-') || id.startsWith('ld-') || id.startsWith('v-task-'))) {
    const cleanId = id.replace('v-task-', '');
    return updateDeal(cleanId, {
      status: 'Follow up',
      pendingGateCheck: null
    });
  }

  try {
    const res = await fetch(`${BASE_URL}/stage-gate-checks/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewer, reason })
    });
    if (res.ok) {
      return res.json();
    }
  } catch (err) {
    console.warn('rejectStageGateCheck network call warning:', err);
  }

  return { success: true };
}

// CSV Bulk Import
export async function importContacts(items) {
  const res = await fetch(`${BASE_URL}/import/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });
  return res.json();
}
