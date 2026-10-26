import React, { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { getLocalDateInputValueAfterDays } from './utils/crmHelpers.js';
import {
  fetchCRMState,
  fetchWorkspaceSummary,
  fetchRecordsPage,
  fetchRecord,
  fetchCurrentUser,
  signIn,
  signOut,
  acceptInvitation,
  createAccountInvitation,
  resetCRMState,
  updateBranding,
  createCompany,
  updateCompany,
  deleteCompany,
  mergeCompanies,
  createContact,
  updateContact,
  deleteContact,
  mergeContacts,
  createLead,
  updateLead,
  deleteLead,
  createStage,
  updateStage,
  createPipeline,
  updatePipeline,
  createDeal,
  updateDeal,
  deleteDeal,
  transitionDealStage,
  closeLostDeal,
  createRebuyDeal,
  triggerRenewalAutomation,
  createTask,
  updateTask,
  deleteTask,
  createNote,
  createActivity,
  createUser,
  updateUser,
  importContacts,
  createStageGateCheck,
  approveStageGateCheck,
  rejectStageGateCheck
} from './api/crmClient.js';
import { Header } from './components/Header.jsx';
import { LoginView, AcceptInvitationView } from './components/LoginView.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { DashboardView } from './components/DashboardView.jsx';
const LeadsView = lazy(() => import('./components/LeadsView.jsx').then(module => ({ default: module.LeadsView })));
const LeadJourneyView = lazy(() => import('./components/LeadJourneyView.jsx').then(module => ({ default: module.LeadJourneyView })));
const PipelineView = lazy(() => import('./components/PipelineView.jsx').then(module => ({ default: module.PipelineView })));
const ContactsView = lazy(() => import('./components/ContactsView.jsx').then(module => ({ default: module.ContactsView })));
const CompaniesView = lazy(() => import('./components/CompaniesView.jsx').then(module => ({ default: module.CompaniesView })));
const TasksView = lazy(() => import('./components/TasksView.jsx').then(module => ({ default: module.TasksView })));
const EmployeesView = lazy(() => import('./components/EmployeesView.jsx').then(module => ({ default: module.EmployeesView })));
const ReportsView = lazy(() => import('./components/ReportsView.jsx').then(module => ({ default: module.ReportsView })));
const SettingsView = lazy(() => import('./components/SettingsView.jsx').then(module => ({ default: module.SettingsView })));
const ConnectionsView = lazy(() => import('./components/ConnectionsView.jsx').then(module => ({ default: module.ConnectionsView })));
import { ImportExportModal } from './components/ImportExportModal.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { NotFoundView } from './components/NotFoundView.jsx';
import { DetailDrawer } from './components/DetailDrawer.jsx';
import { Toaster, toast } from 'sonner';
import { 
  LayoutDashboard, 
  Users, 
  Kanban, 
  CheckSquare, 
  Menu 
} from 'lucide-react';

import { normalizeStageColor, isRenewalStage } from '../backend/constants/stageConstants.js';

const KNOWN_TABS = ['dashboard', 'leads', 'pipeline', 'contacts', 'companies', 'tasks', 'employees', 'reports', 'settings', 'connections'];
const INITIAL_COLLECTIONS = ['branding', 'users', 'stages', 'pipelines', 'leads',
  'deals', 'tasks', 'activities'];
const TAB_COLLECTIONS = {
  pipeline: ['companies', 'contacts', 'stageGateChecks'],
  contacts: ['companies', 'contacts', 'notes'],
  companies: ['companies', 'contacts'],
  settings: ['companies', 'contacts', 'notes', 'stageGateChecks'],
};

const normalizeStateStages = (data) => {
  if (!data || !data.stages) return data;
  const normalizedStages = data.stages.map(stg => ({
    ...stg,
    color: normalizeStageColor(stg.color, stg.name)
  }));
  return { ...data, stages: normalizedStages };
};

export default function App() {
  const [state, setState] = useState(null);
  const [revision, setRevision] = useState(0);
  const [activeTab, setActiveTab] = useState(() => {
    const tab = window.location.hash.slice(1).split('?')[0];
    return KNOWN_TABS.includes(tab) ? tab : 'dashboard';
  });
  const [selectedPipelineId, setSelectedPipelineId] = useState('pipeline-sales');
  const [currentUser, setCurrentUser] = useState(null);
  const [canSignOut, setCanSignOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tabLoadError, setTabLoadError] = useState('');
  const [tabRetry, setTabRetry] = useState(0);
  const [authRequired, setAuthRequired] = useState(false);
  const [inviteToken, setInviteToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('invite'));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals & Drawer
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [drawerState, setDrawerState] = useState({
    isOpen: false,
    type: 'deal',
    item: null
  });

  const handleOpenDrawer = (type, item) => {
    setDrawerState({ isOpen: true, type, item });
  };

  const handleCloseDrawer = () => {
    setDrawerState(prev => ({ ...prev, isOpen: false }));
  };

  // Lead Journey Workspace State
  const [selectedLeadForJourney, setSelectedLeadForJourney] = useState(null);
  const [journeyDeals, setJourneyDeals] = useState([]);

  useEffect(() => {
    if (!selectedLeadForJourney) return;
    let cancelled = false;
    Promise.all([fetchRecordsPage('deals', { leadId: selectedLeadForJourney.id, limit: 100 }),
      fetchRecord('leads', selectedLeadForJourney.id)]).then(([page, lead]) => {
      if (!cancelled) { setJourneyDeals(page.items); setSelectedLeadForJourney(lead); }
    }).catch(error => toast.error(error.message));
    return () => { cancelled = true; };
  }, [selectedLeadForJourney?.id, revision]);

  useEffect(() => {
    if (!drawerState.isOpen || !drawerState.item?.id) return;
    let cancelled = false;
    fetchRecord(drawerState.type === 'deal' ? 'deals' : 'leads', drawerState.item.id).then(item => {
      if (!cancelled) setDrawerState(previous => ({ ...previous, item }));
    }).catch(error => { if (!cancelled) toast.error(error.message); });
    return () => { cancelled = true; };
  }, [drawerState.isOpen, drawerState.item?.id, revision]);

  const currentJourneyLead = useMemo(() => {
    if (!selectedLeadForJourney) return null;
    return state?.leads?.find(l => l.id === selectedLeadForJourney.id) || selectedLeadForJourney;
  }, [selectedLeadForJourney, state?.leads]);

  const handleNavigateTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'leads' && activeTab === 'leads') {
      setSelectedLeadForJourney(null);
    }
  };

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K) focuses header search input
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.querySelector('header input')?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Load the temporary shared workspace identity from the server.
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const { user, authMode } = await fetchCurrentUser();
        const [data, overview] = await Promise.all([fetchCRMState(INITIAL_COLLECTIONS), fetchWorkspaceSummary()]);
        if (!cancelled) {
          setState(normalizeStateStages({ ...data, overview, auditLogs: [] }));
          setCurrentUser(user);
          setCanSignOut(authMode === 'session');
        }
      } catch (err) {
        if (!cancelled) {
          if (err.status === 401) setAuthRequired(true);
          else setLoadError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const missing = (TAB_COLLECTIONS[activeTab] || []).filter(key => state && state[key] === undefined);
    if (!missing.length) return;
    let cancelled = false;
    setTabLoadError('');
    fetchCRMState(missing).then(data => {
      if (!cancelled) setState(previous => normalizeStateStages({ ...previous, ...data }));
    }).catch(error => {
      if (!cancelled) setTabLoadError(error.message || 'Could not load this view.');
    });
    return () => { cancelled = true; };
  }, [activeTab, state, tabRetry]);

  // Memoized Pending Tasks and Renewals Count for badges (placed before any early return)
  const pendingTasksCount = state?.overview?.pendingTasksCount || 0;

  const renewalsDueCount = state?.overview?.renewalsDueCount || 0;

  const handleLogin = async (email, password) => {
    const user = await signIn(email, password);
    const [data, overview] = await Promise.all([fetchCRMState(INITIAL_COLLECTIONS), fetchWorkspaceSummary()]);
    setState(normalizeStateStages({ ...data, overview, auditLogs: [] }));
    setCurrentUser(user);
    setCanSignOut(true);
    setAuthRequired(false);
    setLoadError('');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setState(null);
      setCurrentUser(null);
      setAuthRequired(true);
      setActiveTab('dashboard');
    } catch (error) {
      toast.error(error.message || 'Could not sign out');
    }
  };

  const handleAcceptInvitation = async password => {
    await acceptInvitation(inviteToken, password);
    await signOut().catch(() => {});
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setInviteToken(null);
    setState(null);
    setCurrentUser(null);
    setAuthRequired(true);
    toast.success('Password set. Sign in to continue.');
  };

  if (inviteToken) return <AcceptInvitationView onAccept={handleAcceptInvitation} />;
  if (authRequired) return <LoginView onLogin={handleLogin} />;
  if (!loading && loadError) return <main className="p-8"><p role="alert">{loadError}</p><button onClick={() => window.location.reload()}>Retry</button></main>;
  if (loading || !state || !currentUser) {
    return (
      <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] flex flex-col font-sans select-none" aria-busy="true" aria-label="Loading CRM Workspace">
        {/* Skeleton Topbar */}
        <div className="bg-[var(--surface)] border-b border-[var(--border)] px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--primary-subtle)] animate-pulse" />
            <div className="h-4 w-28 bg-[var(--border)] rounded-md animate-pulse" />
          </div>
          <div className="hidden md:block w-72 h-8 bg-[var(--surface-muted)] rounded-xl border border-[var(--border)] animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="w-20 h-8 bg-[var(--surface-muted)] rounded-xl animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-[var(--border)] animate-pulse" />
          </div>
        </div>

        {/* Skeleton Main Workspace */}
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 bg-[var(--surface)] border-r border-[var(--border)] p-4 space-y-3 hidden lg:block">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-8 bg-[var(--surface-muted)] rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-[var(--canvas)]">
            <div className="h-28 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 flex items-center justify-between animate-pulse">
              <div className="space-y-2">
                <div className="h-5 w-48 bg-[var(--border)] rounded-md" />
                <div className="h-3 w-80 bg-[var(--surface-muted)] rounded-md" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-[var(--surface)] border border-[var(--border)] rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- HANDLERS ---

  const reloadState = async (...collections) => {
    const requested = collections.filter(key => key !== 'auditLogs');
    if (collections.length && !requested.length) return;
    const [data, overview] = await Promise.all([fetchCRMState(requested), fetchWorkspaceSummary()]);
    const updated = normalizeStateStages({ ...data, overview });
    setState(prev => requested.length && prev ? { ...prev, ...updated } : updated);
    setRevision(value => value + 1);
  };

  const handleTriggerRenewalCheck = async () => {
    try {
      const res = await triggerRenewalAutomation();
      await reloadState('deals', 'tasks', 'auditLogs');
      if (res.failures?.length) {
        toast.error(`${res.failures.length} renewal check${res.failures.length === 1 ? '' : 's'} failed: ${res.failures[0].error}`);
      } else {
        toast.success(`${res.flippedCount} renewal opportunit${res.flippedCount === 1 ? 'y' : 'ies'} created`);
      }
    } catch (err) {
      toast.error(err.message || 'Renewal check failed');
    }
  };

  const handleResetDemoData = async () => {
    const res = await resetCRMState();
    setState(normalizeStateStages(res));
  };

  const handleUpdateBranding = async (branding) => {
    const updated = await updateBranding(branding);
    setState(prev => prev ? { ...prev, branding: updated } : prev);
    return updated;
  };

  // Companies CRUD with full state reload
  const handleCreateCompany = async (comp) => {
    try {
      await createCompany(comp);
      await reloadState('companies', 'auditLogs');
      toast.success("Company created successfully");
    } catch (err) {
      toast.error(err.message || "Unable to save changes");
      throw err;
    }
  };

  const handleUpdateCompany = async (id, comp) => {
    try {
      await updateCompany(id, comp);
      await reloadState('companies');
      toast.success("Company updated");
    } catch (err) {
      toast.error(err.message || "Unable to save changes");
      throw err;
    }
  };

  const handleDeleteCompany = async (id) => {
    try {
      await deleteCompany(id);
      await reloadState('companies', 'auditLogs');
      toast.info("Company deleted");
    } catch (err) {
      toast.error(err.message || "Unable to save changes");
      throw err;
    }
  };

  const handleMergeCompanies = async (targetId, sourceId) => {
    await mergeCompanies(targetId, sourceId);
    await reloadState('companies', 'contacts', 'deals', 'tasks', 'notes', 'activities', 'auditLogs');
    toast.success('Companies merged');
  };

  // Contacts CRUD with full state reload
  const handleCreateContact = async (cnt) => {
    try {
      await createContact(cnt);
      await reloadState('contacts');
      toast.success("Contact created");
    } catch (err) {
      toast.error(err.message || "Unable to save changes");
      throw err;
    }
  };

  const handleUpdateContact = async (id, cnt) => {
    try {
      await updateContact(id, cnt);
      await reloadState('contacts');
      toast.success("Contact updated");
    } catch (err) {
      toast.error(err.message || "Unable to save changes");
      throw err;
    }
  };

  const handleDeleteContact = async (id) => {
    try {
      await deleteContact(id);
      await reloadState('contacts', 'auditLogs');
      toast.info("Contact deleted");
    } catch (err) {
      toast.error(err.message || "Unable to save changes");
      throw err;
    }
  };

  const handleMergeContacts = async (targetId, sourceId) => {
    await mergeContacts(targetId, sourceId);
    await reloadState('contacts', 'deals', 'tasks', 'notes', 'activities', 'auditLogs');
    toast.success('Contacts merged');
  };

  // Leads CRUD with targeted local state updates
  const handleCreateLead = async (lead) => {
    try {
      const created = await createLead(lead);
      await reloadState('leads', 'tasks', 'auditLogs');
      toast.success("Lead created");
      return created;
    } catch (err) {
      console.error("Error creating lead", err);
      await reloadState('leads', 'tasks', 'auditLogs');
      toast.error(err.message || 'Could not create lead');
      throw err;
    }
  };

  const handleUpdateLead = async (id, lead) => {
    try {
      const updated = await updateLead(id, lead);
      setState(prev => prev ? {
        ...prev,
        leads: (prev.leads || []).map(l => l.id === id ? { ...l, ...updated } : l)
      } : prev);
      await reloadState('leads');
      toast.success("Lead updated");
      return updated;
    } catch (err) {
      console.error("Error updating lead", err);
      await reloadState('leads');
      toast.error(err.message || 'Could not update lead');
      throw err;
    }
  };

  const handleDeleteLead = async (id) => {
    try {
      await deleteLead(id);
      setState(prev => prev ? {
        ...prev,
        leads: (prev.leads || []).filter(l => l.id !== id)
      } : prev);
      await reloadState('leads');
      toast.info("Lead deleted");
    } catch (err) {
      toast.error(err.message || "Unable to save changes");
      throw err;
    }
  };

  // Deals Basic CRUD with state reload for complete data synchronization
  const handleCreateDeal = async (deal) => {
    try {
      await createDeal(deal);
      await reloadState('deals', 'leads', 'auditLogs');
      toast.success("Opportunity created");
    } catch (err) {
      console.error("Error creating deal", err);
      await reloadState('deals', 'leads', 'auditLogs');
      toast.error(err.message || 'Could not create deal');
      throw err;
    }
  };

  const handleUpdateDeal = async (id, deal) => {
    try {
      const existing = state.deals.find(row => row.id === id) || await fetchRecord('deals', id);
      const changes = { ...deal };
      if (deal.stageId && existing && deal.stageId !== existing.stageId) {
        await transitionDealStage(id, { targetStageId: deal.stageId, note: deal.reason || '', overrideReason: deal.overrideReason, demotionReason: deal.demotionReason });
      }
      // Workflow state is written only by the server's transition service.
      for (const key of ['stageId', 'stageName', 'pendingGateCheck', 'actualCloseDate', 'lostReason', 'lostReasonNote', 'lostStageId', 'lostStageName', 'parentDealId', 'leadId', 'isRebuy', 'valueHistory']) delete changes[key];
      if (deal.stageId && existing && deal.stageId !== existing.stageId) delete changes.status;
      await updateDeal(id, changes);
      await reloadState('deals', 'leads', 'tasks', 'activities', 'auditLogs', 'stageGateChecks');
      toast.success("Deal updated");
    } catch (err) {
      console.error("Error updating deal", err);
      await reloadState('deals', 'leads', 'tasks', 'activities', 'auditLogs', 'stageGateChecks');
      toast.error(err.message || 'Could not update deal');
      throw err;
    }
  };

  const handleDeleteDeal = async (id) => {
    try {
      await deleteDeal(id);
      await reloadState('deals', 'auditLogs');
      toast.info("Deal deleted");
    } catch (err) {
      toast.error(err.message || "Unable to save changes");
      throw err;
    }
  };

  // Stages CRUD
  const handleCreateStage = async (stage) => {
    await createStage(stage);
    await reloadState('stages');
  };

  const handleUpdateStage = async (id, stage) => {
    await updateStage(id, stage);
    await reloadState('stages', 'deals', 'tasks', 'stageGateChecks', 'leads');
  };

  // Tasks CRUD with full state reload
  const handleCreateTask = async (task) => {
    try {
      await createTask(task);
      await reloadState('tasks');
      toast.success("Task created");
    } catch (err) {
      toast.error(err.message || "Unable to save changes");
      throw err;
    }
  };

  const handleUpdateTask = async (id, task) => {
    try {
      await updateTask(id, task);
      await reloadState('tasks');
    } catch (err) {
      toast.error(err.message || "Unable to save changes");
      throw err;
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await deleteTask(id);
      await reloadState('tasks');
      toast.info("Task removed");
    } catch (err) {
      toast.error(err.message || "Unable to save changes");
      throw err;
    }
  };

  // Notes & Activities with full state reload
  const handleCreateNote = async (note) => {
    try {
      await createNote(note);
      await reloadState('notes');
      toast.success("Note saved");
    } catch (err) {
      toast.error(err.message || 'Could not save note');
      throw err;
    }
  };

  const handleCreateActivity = async (act) => {
    await createActivity(act);
    await reloadState('activities', 'deals', 'leads', ...(act.followUp ? ['tasks', 'auditLogs'] : []));
  };

  // Users with full state reload
  const handleCreateUser = async (u) => {
    try {
      const created = await createUser(u);
      await reloadState('users');
      toast.success("Team member added");
      return u.password ? null : createAccountInvitation(created.id);
    } catch (err) {
      toast.error(err.message || "Unable to save changes");
      throw err;
    }
  };

  const handleCreatePipeline = async data => {
    const created = await createPipeline(data);
    await reloadState('pipelines', 'stages');
    setSelectedPipelineId(created.id);
    toast.success('Pipeline created');
    return created;
  };

  const handleUpdatePipeline = async (id, data) => {
    const updated = await updatePipeline(id, data);
    await reloadState('pipelines');
    toast.success('Pipeline updated');
    return updated;
  };

  const handleCreateAccountInvitation = async id => {
    try { return await createAccountInvitation(id); }
    catch (err) { toast.error(err.message || 'Could not create invitation link'); throw err; }
  };

  const handleUpdateUser = async (id, u) => {
    try {
      await updateUser(id, u);
      await reloadState('users');
      toast.success("User profile updated");
    } catch (err) {
      toast.error(err.message || "Unable to save changes");
      throw err;
    }
  };

  // CSV Import
  const handleImportContacts = async (items) => {
    await importContacts(items);
    await reloadState('contacts');
  };

  const handleOpenImportExport = async () => {
    try {
      if (!state.contacts) await reloadState('contacts');
      setIsImportExportOpen(true);
    } catch (error) { toast.error(error.message || 'Could not load records for export'); }
  };

  // Stage Gate Check Handlers
  const handleCreateStageGateCheck = async (check) => {
    try {
      await createStageGateCheck(check);
      await reloadState('deals', 'leads', 'tasks', 'stageGateChecks', 'auditLogs');
      toast.success('Approval request submitted');
    } catch (err) {
      toast.error(err.message || 'Approval request failed');
      throw err;
    }
  };

  const handleApproveStageGateCheck = async (id, reviewer) => {
    try {
      await approveStageGateCheck(id, reviewer);
      await reloadState('deals', 'leads', 'tasks', 'activities', 'stageGateChecks', 'auditLogs');
      toast.success('Approval completed');
    } catch (err) {
      toast.error(err.message || 'Approval failed');
      throw err;
    }
  };

  const handleRejectStageGateCheck = async (id, reviewer, reason) => {
    try {
      await rejectStageGateCheck(id, reviewer, reason);
      await reloadState('deals', 'leads', 'tasks', 'activities', 'stageGateChecks', 'auditLogs');
      toast.success('Request rejected');
    } catch (err) {
      toast.error(err.message || 'Rejection failed');
      throw err;
    }
  };

  const handleSavePartialGateCheck = async (dealId, partialState) => {
    await updateDeal(dealId, { partialGateState: partialState });
    await reloadState('deals');
  };

  // Stage Transition Handlers
  const handleTransitionDealStage = async (dealId, payload) => {
    try {
      const res = await transitionDealStage(dealId, payload);
      await reloadState('deals', 'leads', 'tasks', 'activities', 'stageGateChecks', 'auditLogs');
      if (res.requiresApproval) toast.info('Stage change submitted for approval.');
      else toast.success('Deal stage updated successfully');
      return res;
    } catch (err) {
      toast.error(err.message || 'Stage transition failed');
      throw err;
    }
  };

  const handleCloseLostDeal = async (dealId, payload) => {
    try {
      const res = await closeLostDeal(dealId, payload);
      await reloadState('deals', 'leads', 'tasks', 'activities', 'stageGateChecks', 'auditLogs');
      toast.info("Deal marked as Closed Lost");
      return res;
    } catch (err) {
      toast.error(err.message || 'Close lost failed');
      throw err;
    }
  };

  const handleCreateRebuyDeal = async (parentDealId) => {
    try {
      const res = await createRebuyDeal(parentDealId, currentUser);
      await reloadState('deals', 'tasks', 'auditLogs');
      toast.success("Child rebuy opportunity generated");
      return res;
    } catch (err) {
      toast.error(err.message || 'Failed to create rebuy deal');
      throw err;
    }
  };

  const handleConvertToDeal = async (lead) => {
    try {
      const initialStage = state.stages.find(s => s.pipelineId === 'pipeline-sales' && s.order === 1);
      const newDeal = {
        title: `${lead.companyName || lead.title} - Opportunity`,
        value: 35000,
        stageId: initialStage.id,
        stageName: initialStage.name,
        status: 'Active',
        companyId: lead.companyId || '',
        companyName: lead.companyName || '',
        contactId: lead.contactId || '',
        contactName: lead.contactName || '',
        ownerId: lead.ownerId || currentUser.id,
        ownerName: lead.ownerName || currentUser.name,
        leadId: lead.id,
        expectedCloseDate: getLocalDateInputValueAfterDays(30),
        isRecurring: true,
        recurrenceDays: 60
      };
      await createDeal(newDeal);
      await reloadState('deals', 'leads', 'auditLogs');
      toast.success("Lead converted to Deal successfully");
    } catch (err) {
      toast.error(err.message || 'Failed to convert lead to deal');
    }
  };

  // Quick Action Handler from Header
  const handleQuickAction = (type) => {
    if (type === 'lead') setActiveTab('leads');
    else if (type === 'deal') setActiveTab('pipeline');
    else if (type === 'contact') setActiveTab('contacts');
    else if (type === 'activity') setActiveTab('dashboard');
  };

  // Global search result selection
  const handleSelectSearchResult = (type, item) => {
    if (type === 'lead') {
      setActiveTab('leads');
      if (item) setSelectedLeadForJourney(item);
    } else if (type === 'deal') {
      setActiveTab('pipeline');
      if (item) setDrawerState({ isOpen: true, type: 'deal', item });
    } else if (type === 'contact') {
      setActiveTab('contacts');
    } else if (type === 'company') {
      setActiveTab('companies');
    }
  };

  return (
    <ErrorBoundary onResetState={handleResetDemoData}>
      <div className="h-screen w-screen bg-[var(--canvas)] text-[var(--ink)] flex flex-col font-sans antialiased selection:bg-[var(--primary)] selection:text-white overflow-hidden">
        
        {/* Toast Notification Container */}
        <Toaster position="top-right" richColors closeButton />

        {/* Top Header with Inline Anchored Search Dropdown */}
        <Header
          branding={state.branding}
          users={state.users}
          currentUser={currentUser}
          onLogout={canSignOut ? handleLogout : undefined}
          state={state}
          onSelectSearchResult={handleSelectSearchResult}
          onNavigateTab={handleNavigateTab}
          onOpenQuickAction={handleQuickAction}
          onTriggerRenewalCheck={handleTriggerRenewalCheck}
          renewalsDueCount={renewalsDueCount}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
        />

        {/* Main Body: Sidebar + Content */}
        <div className="flex-1 flex overflow-hidden">

          {/* Navigation Sidebar */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={handleNavigateTab}
            userRole={currentUser.role}
            onLogout={canSignOut ? handleLogout : undefined}
            pendingTasksCount={pendingTasksCount}
            renewalsDueCount={renewalsDueCount}
            onOpenImportExport={handleOpenImportExport}
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
          />

          {/* Dynamic Tab Content View */}
          <main className="flex-1 overflow-y-auto bg-[var(--canvas)] pb-16 md:pb-0">
            <Suspense fallback={<div className="p-8 text-sm text-[#5B6472]" role="status">Loading view…</div>}>
            {(TAB_COLLECTIONS[activeTab] || []).some(key => state[key] === undefined)
              ? <div className="p-8 text-sm text-[#5B6472]" role={tabLoadError ? 'alert' : 'status'}>
                  {tabLoadError || 'Loading view…'}
                  {tabLoadError && <button className="ml-3 underline" onClick={() => setTabRetry(value => value + 1)}>Retry</button>}
                </div>
              : <>
            {activeTab === 'dashboard' && (
              <DashboardView revision={revision}
                state={state}
                currentUser={currentUser}
                onNavigateTab={setActiveTab}
                onTriggerRenewalCheck={handleTriggerRenewalCheck}
                onOpenLeadModal={() => setActiveTab('leads')}
                onOpenDealModal={() => setActiveTab('pipeline')}
                onOpenDrawer={handleOpenDrawer}
                onUpdateTask={handleUpdateTask}
                onApproveStageGateCheck={handleApproveStageGateCheck}
              />
            )}

            {activeTab === 'leads' && (
              currentJourneyLead ? (
                <LeadJourneyView
                  lead={currentJourneyLead}
                  stages={state.stages}
                  deals={journeyDeals}
                  users={state.users}
                  currentUser={currentUser}
                  branding={state.branding}
                  onBack={() => setSelectedLeadForJourney(null)}
                  onOpenDrawer={handleOpenDrawer}
                  onUpdateLead={handleUpdateLead}
                  onUpdateDeal={handleUpdateDeal}
                  onCreateActivity={handleCreateActivity}
                  onCreateTask={handleCreateTask}
                  onUpdateTask={handleUpdateTask}
                  onTransitionDealStage={handleTransitionDealStage}
                />
              ) : (
                <LeadsView revision={revision}
                  leads={state.leads}
                  stages={state.stages}
                  deals={state.deals}
                  users={state.users}
                  currentUser={currentUser}
                  branding={state.branding}
                  onCreateLead={handleCreateLead}
                  onUpdateLead={handleUpdateLead}
                  onDeleteLead={handleDeleteLead}
                  onConvertToDeal={handleConvertToDeal}
                  onCreateActivity={handleCreateActivity}
                  onCreateNote={handleCreateNote}
                  onTransitionDealStage={handleTransitionDealStage}
                  onCreateTask={handleCreateTask}
                  onSubmitStageGateCheck={handleCreateStageGateCheck}
                  onApproveStageGateCheck={handleApproveStageGateCheck}
                  onRejectStageGateCheck={handleRejectStageGateCheck}
                  onOpenDrawer={handleOpenDrawer}
                  onOpenLeadJourney={(lead) => setSelectedLeadForJourney(lead)}
                />
              )
            )}

            {activeTab === 'pipeline' && (
              <div>
              <div className="px-4 pt-4 sm:px-6 md:px-8 flex items-center gap-3 bg-[#F6F7F8]">
                <label htmlFor="active-pipeline" className="text-xs font-bold text-[#5B6472]">Pipeline</label>
                <select id="active-pipeline" value={selectedPipelineId} onChange={event => setSelectedPipelineId(event.target.value)}
                  className="rounded-lg border border-[#CBD2D8] bg-white px-3 py-2 text-sm text-[#12161C] focus-visible:outline-2 focus-visible:outline-[#1D4E63]">
                  {(state.pipelines || []).filter(pipeline => pipeline.active || pipeline.id === selectedPipelineId).map(pipeline =>
                    <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}
                </select>
              </div>
              <PipelineView revision={revision} key={selectedPipelineId}
                deals={state.deals.filter(deal => deal.pipelineId === selectedPipelineId)}
                stages={state.stages.filter(stage => stage.pipelineId === selectedPipelineId)}
                users={state.users}
                companies={state.companies}
                contacts={state.contacts}
                currentUser={currentUser}
                branding={state.branding}
                onCreateDeal={deal => handleCreateDeal({ ...deal, pipelineId: selectedPipelineId })}
                onUpdateDeal={handleUpdateDeal}
                onDeleteDeal={handleDeleteDeal}
                onCreateActivity={handleCreateActivity}
                onCreateTask={handleCreateTask}
                onSubmitStageGateCheck={handleCreateStageGateCheck}
                onApproveStageGateCheck={handleApproveStageGateCheck}
                onRejectStageGateCheck={handleRejectStageGateCheck}
                onSavePartialGateCheck={handleSavePartialGateCheck}
                onOpenSettings={() => setActiveTab('settings')}
                onTransitionDealStage={handleTransitionDealStage}
                onCloseLostDeal={handleCloseLostDeal}
                onCreateRebuyDeal={handleCreateRebuyDeal}
                onOpenDrawer={handleOpenDrawer}
              />
              </div>
            )}

            {activeTab === 'contacts' && (
              <ContactsView revision={revision}
                contacts={state.contacts}
                companies={state.companies}
                users={state.users}
                stages={state.stages}
                deals={state.deals}
                notes={state.notes}
                activities={state.activities}
                currentUser={currentUser}
                onCreateContact={handleCreateContact}
                onUpdateContact={handleUpdateContact}
                onDeleteContact={handleDeleteContact}
                onMergeContacts={handleMergeContacts}
                onCreateNote={handleCreateNote}
                onCreateActivity={handleCreateActivity}
                onCreateTask={handleCreateTask}
                onTransitionDealStage={handleTransitionDealStage}
              />
            )}

            {activeTab === 'companies' && (
              <CompaniesView revision={revision}
                companies={state.companies}
                contacts={state.contacts}
                deals={state.deals}
                currentUser={currentUser}
                onCreateCompany={handleCreateCompany}
                onUpdateCompany={handleUpdateCompany}
                onDeleteCompany={handleDeleteCompany}
                onMergeCompanies={handleMergeCompanies}
                onCreateActivity={handleCreateActivity}
              />
            )}

            {activeTab === 'tasks' && (
              <TasksView revision={revision}
                tasks={state.tasks}
                users={state.users}
                leads={state.leads}
                deals={state.deals}
                stages={state.stages}
                currentUser={currentUser}
                onCreateTask={handleCreateTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onApproveStageGateCheck={handleApproveStageGateCheck}
                onRejectStageGateCheck={handleRejectStageGateCheck}
              />
            )}

            {activeTab === 'employees' && (
              <EmployeesView
                users={state.users}
                leads={state.leads}
                deals={state.deals}
                currentUser={currentUser}
                onCreateUser={handleCreateUser}
                onUpdateUser={handleUpdateUser}
                onCreateAccountInvitation={handleCreateAccountInvitation}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                state={state}
                currentUser={currentUser}
                onCreateDeal={handleCreateDeal}
              />
            )}

            {activeTab === 'connections' && <ConnectionsView />}

            {activeTab === 'settings' && (
              <SettingsView
                branding={state.branding}
                stages={state.stages}
                pipelines={state.pipelines || []}
                users={state.users}
                records={state}
                onHistoricalLinkResolved={() => reloadState('deals', 'tasks', 'activities', 'auditLogs')}
                onUpdateBranding={handleUpdateBranding}
                onCreateStage={handleCreateStage}
                onUpdateStage={handleUpdateStage}
                onCreatePipeline={handleCreatePipeline}
                onUpdatePipeline={handleUpdatePipeline}
                onResetDemoData={handleResetDemoData}
              />
            )}

            {/* Custom 404 View for unrecognized module tabs */}
            {!KNOWN_TABS.includes(activeTab) && (
              <NotFoundView
                requestedTab={activeTab}
                onNavigateTab={setActiveTab}
                onOpenSearch={() => document.querySelector('header input')?.focus()}
              />
            )}
            </>}
            </Suspense>
          </main>

        </div>

        {/* 360° Slide-Over Detail Drawer */}
        <DetailDrawer
          isOpen={drawerState.isOpen}
          onClose={handleCloseDrawer}
          deal={drawerState.type === 'deal' ? (state.deals.find(d => d.id === drawerState.item?.id) || drawerState.item) : null}
          lead={drawerState.type === 'lead' ? (state.leads.find(l => l.id === drawerState.item?.id) || drawerState.item) : null}
          type={drawerState.type}
          stages={state.stages}
          users={state.users}
          companies={state.companies}
          contacts={state.contacts}
          tasks={state.tasks}
          activities={state.activities}
          currentUser={currentUser}
          onUpdateDeal={handleUpdateDeal}
          onUpdateLead={handleUpdateLead}
          onCreateActivity={handleCreateActivity}
          onCreateNote={handleCreateNote}
          onCreateTask={handleCreateTask}
          onUpdateTask={handleUpdateTask}
          onOpenStageGateModal={() => {
            setActiveTab('pipeline');
            handleCloseDrawer();
          }}
          onCloseLostDeal={handleCloseLostDeal}
          onCreateRebuyDeal={handleCreateRebuyDeal}
        />

        {/* Global Modals */}
        <ImportExportModal
          isOpen={isImportExportOpen}
          onClose={() => setIsImportExportOpen(false)}
          state={state}
        />

        {/* Mobile Bottom Navigation Bar (< md) */}
        <nav 
          aria-label="Mobile Navigation Bar"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] border-t border-[#E3E6EA] px-2 py-1.5 flex items-center justify-around shadow-[0_-2px_10px_rgba(18,22,28,0.06)]"
        >
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'leads', label: 'Leads', icon: Users },
            { id: 'pipeline', label: 'Pipeline', icon: Kanban, badge: renewalsDueCount > 0 },
            { id: 'tasks', label: 'Tasks', icon: CheckSquare, badge: pendingTasksCount > 0 },
            { id: 'menu', label: 'More', icon: Menu, isAction: true }
          ].map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.isAction) {
                    setIsMobileMenuOpen(prev => !prev);
                  } else {
                    handleNavigateTab(item.id);
                  }
                }}
                aria-label={item.label}
                aria-current={isActive && !item.isAction ? 'page' : undefined}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative cursor-pointer ${
                  isActive && !item.isAction
                    ? 'text-[#1D4E63] font-bold'
                    : 'text-[#5B6472] hover:text-[#12161C] font-medium'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive && !item.isAction ? 'text-[#1D4E63]' : 'text-[#5B6472]'}`} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#965700]" />
                  )}
                </div>
                <span className="text-[10px] mt-0.5 leading-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>

      </div>
    </ErrorBoundary>
  );
}
