const BASE_URL = '/api';

async function apiFetch(url, options = {}) {
  const write = options.method && !['GET', 'HEAD'].includes(options.method);
  const res = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    ...(write ? { body: options.body ?? '{}', headers: { 'Content-Type': 'application/json', ...options.headers } } : {}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = Object.assign(new Error(data.error || 'Request failed'), { status: res.status, details: data.details });
    throw error;
  }
  return res;
}

export async function fetchCurrentUser() {
  return (await apiFetch(`${BASE_URL}/me`)).json();
}

export async function signIn(email, password) {
  const response = await apiFetch(`${BASE_URL}/auth/login`, {
    method: 'POST', body: JSON.stringify({ email, password }),
  });
  return (await response.json()).user;
}

export async function signOut() {
  await apiFetch(`${BASE_URL}/auth/logout`, { method: 'POST' });
}

export async function acceptInvitation(token, password) {
  return (await apiFetch(`${BASE_URL}/auth/accept-invitation`, {
    method: 'POST', body: JSON.stringify({ token, password }),
  })).json();
}

export async function createAccountInvitation(userId) {
  return (await apiFetch(`${BASE_URL}/users/${encodeURIComponent(userId)}/invite`, {
    method: 'POST',
  })).json();
}

export async function fetchCRMState(collections = []) {
  try {
    const query = collections.length ? `?collections=${encodeURIComponent(collections.join(','))}` : '';
    const res = await apiFetch(`${BASE_URL}/state${query}`);
    if (!res.ok) throw new Error('Failed to load state');
    return await res.json();
  } catch (err) {
    console.warn('API error, falling back', err);
    throw err;
  }
}

export async function fetchRecordsPage(resource, filters = {}, signal) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== null));
  return (await apiFetch(`${BASE_URL}/pages/${encodeURIComponent(resource)}?${query}`, { signal })).json();
}

export async function fetchRecord(resource, id) {
  const page = await fetchRecordsPage(resource, { id, limit: 1 });
  if (!page.items.length) throw new Error('Record no longer exists or is unavailable.');
  return page.items[0];
}

export async function fetchWorkspaceSummary() {
  return (await apiFetch(`${BASE_URL}/workspace-summary`)).json();
}

export async function fetchIntegrationStatus() {
  return (await apiFetch(`${BASE_URL}/integrations/status`)).json();
}

export async function connectGoogleWorkspace() {
  return (await apiFetch(`${BASE_URL}/integrations/google/connect`, { method: 'POST' })).json();
}

export async function queueCommunicationSync(id) {
  return (await apiFetch(`${BASE_URL}/integrations/connections/${encodeURIComponent(id)}/sync`, { method: 'POST' })).json();
}

export async function disconnectCommunication(id) {
  return (await apiFetch(`${BASE_URL}/integrations/connections/${encodeURIComponent(id)}/disconnect`, { method: 'POST' })).json();
}

export async function resetCRMState() {
  const res = await apiFetch(`${BASE_URL}/state/reset`, { method: 'POST' });
  const data = await res.json();
  return data.state;
}

export async function updateBranding(branding) {
  const res = await apiFetch(`${BASE_URL}/branding`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(branding)
  });
  return res.json();
}

// Companies
export async function createCompany(company) {
  const res = await apiFetch(`${BASE_URL}/companies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(company)
  });
  return res.json();
}

export async function updateCompany(id, company) {
  const res = await apiFetch(`${BASE_URL}/companies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(company)
  });
  return res.json();
}

export async function deleteCompany(id) {
  const res = await apiFetch(`${BASE_URL}/companies/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return data.success;
}

export async function mergeCompanies(targetId, sourceId) {
  return (await apiFetch(`${BASE_URL}/companies/${encodeURIComponent(targetId)}/merge`, {
    method: 'POST', body: JSON.stringify({ sourceId }),
  })).json();
}

// Contacts
export async function createContact(contact) {
  const res = await apiFetch(`${BASE_URL}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
  });
  return res.json();
}

export async function updateContact(id, contact) {
  const res = await apiFetch(`${BASE_URL}/contacts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
  });
  return res.json();
}

export async function deleteContact(id) {
  const res = await apiFetch(`${BASE_URL}/contacts/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return data.success;
}

export async function mergeContacts(targetId, sourceId) {
  return (await apiFetch(`${BASE_URL}/contacts/${encodeURIComponent(targetId)}/merge`, {
    method: 'POST', body: JSON.stringify({ sourceId }),
  })).json();
}

// Leads
export async function createLead(lead) {
  const res = await apiFetch(`${BASE_URL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead)
  });
  return res.json();
}

export async function updateLead(id, lead) {
  const res = await apiFetch(`${BASE_URL}/leads/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead)
  });
  return res.json();
}

export async function deleteLead(id) {
  const res = await apiFetch(`${BASE_URL}/leads/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return data.success;
}

// Pipeline Stages
export async function createStage(stage) {
  const res = await apiFetch(`${BASE_URL}/stages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stage)
  });
  return res.json();
}

export async function updateStage(id, stage) {
  const res = await apiFetch(`${BASE_URL}/stages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stage)
  });
  return res.json();
}

// Deals
export async function createDeal(deal) {
  const res = await apiFetch(`${BASE_URL}/deals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deal)
  });
  return res.json();
}

export async function updateDeal(id, deal) {
  const res = await apiFetch(`${BASE_URL}/deals/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deal)
  });
  return res.json();
}

export async function deleteDeal(id) {
  const res = await apiFetch(`${BASE_URL}/deals/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return data.success;
}

export async function transitionDealStage(id, payload) {
  const res = await apiFetch(`${BASE_URL}/deals/${id}/stage-transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to transition stage');
  }
  return res.json();
}

export async function closeLostDeal(id, payload) {
  const res = await apiFetch(`${BASE_URL}/deals/${id}/close-lost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to mark deal as Closed Lost');
  }
  return res.json();
}

export async function createRebuyDeal(id, user) {
  const res = await apiFetch(`${BASE_URL}/deals/${id}/create-rebuy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to create rebuy deal');
  }
  return res.json();
}

export async function triggerRenewalAutomation() {
  const res = await apiFetch(`${BASE_URL}/deals/check-renewals`, { method: 'POST' });
  return res.json();
}

export async function fetchAuditLogs() {
  const res = await apiFetch(`${BASE_URL}/audit-logs`);
  if (!res.ok) throw new Error('Failed to load audit logs');
  return res.json();
}

// Tasks
export async function createTask(task) {
  const res = await apiFetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  });
  return res.json();
}

export async function updateTask(id, task) {
  const res = await apiFetch(`${BASE_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  });
  return res.json();
}

export async function deleteTask(id) {
  const res = await apiFetch(`${BASE_URL}/tasks/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return data.success;
}

// Notes & Activities
export async function createNote(note) {
  const res = await apiFetch(`${BASE_URL}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.details?.[0]?.message || data.error || 'Could not save note');
  return data;
}

export async function createActivity(activity) {
  const res = await apiFetch(`${BASE_URL}/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(activity)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.details?.[0]?.message || data.error || 'Could not log activity');
  return data;
}

// Users
export async function createUser(user) {
  const res = await apiFetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  return res.json();
}

export async function updateUser(id, user) {
  const res = await apiFetch(`${BASE_URL}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  return res.json();
}

// Stage Gate Checks
export async function fetchStageGateChecks() {
  const res = await apiFetch(`${BASE_URL}/stage-gate-checks`);
  return res.json();
}

export async function createStageGateCheck(check) {
  const res = await apiFetch(`${BASE_URL}/stage-gate-checks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(check)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not create approval request');
  return data;
}

export async function approveStageGateCheck(id, _reviewer) {
  const res = await apiFetch(`${BASE_URL}/stage-gate-checks/${encodeURIComponent(id)}/approve`, { method: 'POST' });
  return res.json();
}

export async function createPipeline(pipeline) {
  return (await apiFetch(`${BASE_URL}/pipelines`, {
    method: 'POST', body: JSON.stringify(pipeline),
  })).json();
}

export async function updatePipeline(id, pipeline) {
  return (await apiFetch(`${BASE_URL}/pipelines/${encodeURIComponent(id)}`, {
    method: 'PUT', body: JSON.stringify(pipeline),
  })).json();
}

export async function listAttachments(recordType, recordId) {
  const query = new URLSearchParams({ recordType, recordId });
  return (await apiFetch(`${BASE_URL}/attachments?${query}`)).json();
}

export async function uploadAttachment(attachment) {
  return (await apiFetch(`${BASE_URL}/attachments`, {
    method: 'POST', body: JSON.stringify(attachment),
  })).json();
}

export async function getAttachmentDownload(id) {
  return (await apiFetch(`${BASE_URL}/attachments/${encodeURIComponent(id)}/download`)).json();
}

export async function deleteAttachment(id) {
  return (await apiFetch(`${BASE_URL}/attachments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })).json();
}

export async function fetchReportSummary(rep, month, pipeline = 'All') {
  const query = new URLSearchParams({ rep, month, pipeline });
  return (await apiFetch(`${BASE_URL}/reports/summary?${query}`)).json();
}

export async function fetchReportAuditPage(rep, action, cursor = '', pipeline = 'All') {
  const query = new URLSearchParams({ rep, action, cursor, pipeline, limit: '25' });
  return (await apiFetch(`${BASE_URL}/reports/audit?${query}`)).json();
}

export async function rejectStageGateCheck(id, _reviewer, reason) {
  const res = await apiFetch(`${BASE_URL}/stage-gate-checks/${encodeURIComponent(id)}/reject`, {
    method: 'POST', body: JSON.stringify({ reason })
  });
  return res.json();
}

// CSV Bulk Import
export async function importContacts(items) {
  const res = await apiFetch(`${BASE_URL}/import/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.details?.[0]?.message || data.error || 'Could not import contacts');
  return data;
}

// Unified Activity Timeline
export async function fetchTimeline(entityType, entityId, options = {}) {
  const params = new URLSearchParams({ entityType, entityId, ...options });
  const res = await apiFetch(`${BASE_URL}/timeline?${params}`);
  if (!res.ok) {
    throw new Error('Failed to fetch unified timeline');
  }
  return res.json();
}

// Complete Paginated Fetch for Exports
export async function fetchAllRecords(resource, batchSize = 100) {
  const allItems = [];
  let cursor = '';
  do {
    const page = await fetchRecordsPage(resource, { limit: batchSize, cursor });
    allItems.push(...(page.items || []));
    cursor = page.nextCursor || '';
  } while (cursor);
  return allItems;
}

// Automation & Follow-up Rules
export async function fetchAutomationRules() {
  const res = await apiFetch(`${BASE_URL}/settings/automation-rules`);
  if (!res.ok) {
    throw new Error('Failed to fetch automation rules');
  }
  return res.json();
}

export async function fetchAutomationStatus() {
  return (await apiFetch(`${BASE_URL}/settings/automation-status`)).json();
}

export async function fetchUnresolvedLinks() {
  return (await apiFetch(`${BASE_URL}/settings/unresolved-links`)).json();
}

export async function resolveHistoricalLink(id, targetId) {
  return (await apiFetch(`${BASE_URL}/settings/unresolved-links/${encodeURIComponent(id)}/resolve`, {
    method: 'POST', body: JSON.stringify({ targetId }),
  })).json();
}

export async function updateAutomationRules(rules) {
  const res = await apiFetch(`${BASE_URL}/settings/automation-rules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules })
  });
  if (!res.ok) {
    throw new Error('Failed to save automation rules');
  }
  return res.json();
}
