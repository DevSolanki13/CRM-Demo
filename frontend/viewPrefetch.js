import { canAccessPage } from '../shared/accessPolicy.js';
import { fetchRecordsPage, fetchReportSummary, fetchReportAuditPage, fetchIntegrationStatus } from './api/crmClient.js';

export const viewImports = {
  leads: () => import('./components/LeadsView.jsx'),
  journey: () => import('./components/LeadJourneyView.jsx'),
  pipeline: () => import('./components/PipelineView.jsx'),
  contacts: () => import('./components/ContactsView.jsx'),
  companies: () => import('./components/CompaniesView.jsx'),
  tasks: () => import('./components/TasksView.jsx'),
  employees: () => import('./components/EmployeesView.jsx'),
  reports: () => import('./components/ReportsView.jsx'),
  settings: () => import('./components/SettingsView.jsx'),
  connections: () => import('./components/ConnectionsView.jsx'),
};

export function prefetchView(tab, user) {
  if (canAccessPage(user, tab === 'journey' ? 'leads' : tab)) viewImports[tab]?.().catch(() => {});
}

export function whenIdle(callback) {
  if (globalThis.requestIdleCallback) {
    const id = globalThis.requestIdleCallback(callback, { timeout: 1500 });
    return () => globalThis.cancelIdleCallback(id);
  }
  const id = setTimeout(callback, 100);
  return () => clearTimeout(id);
}

export function warmDefaultPages(user, state, signal) {
  const showMockData = String(localStorage.getItem('crm.showMockData') === 'true');
  const jobs = [
    ['leads', 'leads', { q: '', source: 'All', owner: 'All', stage: 'All', quick: 'All', recurring: 'All' }],
    ['leads', 'leads', { q: '', owner: 'All', status: 'All', recurrenceDate: 'All', recurring: 'true', sort: 'recurrence-asc', recurrenceView: 'All' }],
    ['pipeline', 'deals', { pipeline: state.stages?.find(stage => stage.pipelineId === 'pipeline-sales')?.pipelineId || state.stages?.[0]?.pipelineId, q: '', status: 'All', quick: 'All', showMockData }],
    ['contacts', 'contacts', { q: '' }],
    ['companies', 'companies', { q: '' }],
    ['tasks', 'tasks', { q: '', owner: user.id, queue: 'followups', type: 'All', showCompleted: 'false', showMockData }],
    ['dashboard', 'dashboard-queue', { type: 'all', limit: 4, showMockData }],
    ['dashboard', 'tasks', { owner: user.id, queue: 'followups', showCompleted: 'false', limit: 4, showMockData }],
    ['dashboard', 'activities', { sort: 'recent', limit: 4, showMockData }],
  ];
  const extras = [];
  if (canAccessPage(user, 'reports')) {
    const rep = user.role === 'Sales Rep' ? user.id : 'All';
    const month = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 7);
    extras.push(fetchReportSummary(rep, month), fetchReportAuditPage(rep, 'All'));
  }
  if (canAccessPage(user, 'connections')) extras.push(fetchIntegrationStatus());
  return Promise.allSettled([...extras, ...jobs.filter(([tab]) => canAccessPage(user, tab))
    .map(([, resource, filters]) => fetchRecordsPage(resource, filters, signal))]);
}
