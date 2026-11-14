import React, { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getLocalDateInputValueAfterDays } from './utils/crmHelpers.js';
import {
  fetchCRMState,
  fetchWorkspaceSummary,
  fetchRecordsPage,
  fetchRecord,
  fetchCurrentUser,
  selectWorkspaceAccount,
  getWorkspaceAccountId,
  clearWorkspaceAccount,
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
  archiveRecurringLead,
  importRecurringLeads as importRecurringLeadCompanies,
  clearRecurringLeads as clearRecurringLeadRecords,
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
import { clearRecordsCache } from './api/recordsCache.js';
import { viewImports, prefetchView, whenIdle, warmDefaultPages } from './viewPrefetch.js';
import { PageSkeleton } from './components/skeletons/PageSkeleton.jsx';
import { Header } from './components/Header.jsx';
import { LoginView, AcceptInvitationView } from './components/LoginView.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { DashboardView } from './components/DashboardView.jsx';
const LeadsView = lazy(() => viewImports.leads().then(module => ({ default: module.LeadsView })));
const LeadJourneyView = lazy(() => viewImports.journey().then(module => ({ default: module.LeadJourneyView })));
const PipelineView = lazy(() => viewImports.pipeline().then(module => ({ default: module.PipelineView })));
const ContactsView = lazy(() => viewImports.contacts().then(module => ({ default: module.ContactsView })));
const CompaniesView = lazy(() => viewImports.companies().then(module => ({ default: module.CompaniesView })));
const TasksView = lazy(() => viewImports.tasks().then(module => ({ default: module.TasksView })));
const EmployeesView = lazy(() => viewImports.employees().then(module => ({ default: module.EmployeesView })));
const ReportsView = lazy(() => viewImports.reports().then(module => ({ default: module.ReportsView })));
const SettingsView = lazy(() => viewImports.settings().then(module => ({ default: module.SettingsView })));
const ConnectionsView = lazy(() => viewImports.connections().then(module => ({ default: module.ConnectionsView })));
import { ImportExportModal } from './components/ImportExportModal.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { NotFoundView } from './components/NotFoundView.jsx';
import { DetailDrawer } from './components/DetailDrawer.jsx';
import { Toaster, toast } from 'sonner';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Menu 
} from 'lucide-react';

import { normalizeStageColor, isRenewalStage } from '../backend/constants/stageConstants.js';
import { canAccessPage, getRecordUsers } from '../shared/accessPolicy.js';
import { isRecurringTask } from '../shared/leadRecurrence.js';
import { APP_PAGE_PATHS, LEAD_SECTION_PATHS, resolveAppLocation } from './utils/leadRoutes.js';
import { useUrlParamState } from './hooks/useUrlParamState.js';
const RecurringCycleDialog = lazy(() => import('./components/RecurringCycleDialog.jsx').then(module => ({ default: module.RecurringCycleDialog })));

const KNOWN_TABS = Object.keys(APP_PAGE_PATHS);
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
  const location = useLocation();
  const navigate = useNavigate();
  const route = resolveAppLocation(location);
  const activeTab = route.activeTab;
  const leadSection = route.leadSection;
  const [state, setState] = useState(null);
  const [revision, setRevision] = useState(0);
  const [recurringTaskLead, setRecurringTaskLead] = useState(null);
  const [selectedPipelineId, setSelectedPipelineId] = useUrlParamState('pipeline', 'pipeline-sales');
  const [currentUser, setCurrentUser] = useState(null);
  const [canSignOut, setCanSignOut] = useState(false);
  const [workspaceAccounts, setWorkspaceAccounts] = useState([]);
  const [switchingAccountId, setSwitchingAccountId] = useState('');
  const [accountSwitchError, setAccountSwitchError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tabLoadError, setTabLoadError] = useState('');
  const [tabRetry, setTabRetry] = useState(0);
  const [authRequired, setAuthRequired] = useState(false);
  const [inviteToken, setInviteToken] = useState(() => new URLSearchParams(location.hash.slice(1)).get('invite'));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals & Drawer
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [drawerState, setDrawerState] = useState({
    isOpen: false,
    type: 'deal',
    item: null
  });

  const handleOpenDrawer = (type, item) => {
    if (type === 'lead' && item?.id) {
      navigateToLeadDetail(item);
      return;
    }
    setDrawerState({ isOpen: true, type, item });
  };

  const handleCloseDrawer = () => {
    setDrawerState(prev => ({ ...prev, isOpen: false }));
  };

  // Lead Journey Workspace State
  const [selectedLeadForJourney, setSelectedLeadForJourney] = useState(null);
  const [leadCreateRequest, setLeadCreateRequest] = useState(0);
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

  const navigateToLeadSection = section => {
    const path = LEAD_SECTION_PATHS[section] || LEAD_SECTION_PATHS.new;
    const search = activeTab === 'leads' ? location.search : '';
    navigate(`${path}${search}`);
    setSelectedLeadForJourney(null);
    setIsMobileMenuOpen(false);
    setDrawerState(previous => ({ ...previous, isOpen: false }));
  };

  const navigateToLeadDetail = (lead, section = lead?.isRecurring ? 'recurring' : leadSection) => {
    if (!lead?.id) return;
    const basePath = LEAD_SECTION_PATHS[section] || LEAD_SECTION_PATHS.new;
    const search = activeTab === 'leads' ? location.search : '';
    navigate(`${basePath}/${encodeURIComponent(lead.id)}${search}`, {
      state: { from: `${location.pathname}${location.search}` },
    });
    setSelectedLeadForJourney(lead);
    setIsMobileMenuOpen(false);
  };

  const handleOpenLeadFollowUp = (lead, followUpId) => {
    if (!lead?.id || !followUpId) return;
    const query = new URLSearchParams(location.search);
    query.set('followUp', followUpId);
    navigate(`${LEAD_SECTION_PATHS.recurring}/${encodeURIComponent(lead.id)}?${query}`, {
      state: { from: `${location.pathname}${location.search}` },
    });
    setSelectedLeadForJourney(lead);
    setIsMobileMenuOpen(false);
  };

  const handleBackFromLead = () => {
    if (location.state?.from) {
      navigate(-1);
      return;
    }
    navigate(`${LEAD_SECTION_PATHS[leadSection]}${location.search}`, { replace: true });
  };

  const navigateToTab = tab => {
    if (tab === 'leads') {
      navigateToLeadSection('new');
      return;
    }
    navigate(APP_PAGE_PATHS[tab] || APP_PAGE_PATHS.dashboard);
  };

  const handleNavigateTab = (tab, pipelineId) => {
    if (!canAccessPage(currentUser, tab)) return;
    if (tab === 'pipeline' && pipelineId) {
      navigate(`${APP_PAGE_PATHS.pipeline}?pipeline=${encodeURIComponent(pipelineId)}`);
      return;
    }
    navigateToTab(tab);
  };

  useEffect(() => {
    if (loading || !currentUser) return;
    if (!canAccessPage(currentUser, route.activeTab)) {
      navigate(APP_PAGE_PATHS.dashboard, { replace: true });
      return;
    }
    if (route.canonicalUrl) navigate(route.canonicalUrl, { replace: true });
  }, [currentUser, loading, navigate, route.activeTab, route.canonicalUrl]);

  useEffect(() => {
    if (!route.leadId || !currentUser) {
      if (!route.leadId) setSelectedLeadForJourney(null);
      return;
    }
    const lead = state?.leads?.find(item => item.id === route.leadId);
    if (lead) {
      setSelectedLeadForJourney(lead);
      return;
    }
    let cancelled = false;
    fetchRecord('leads', route.leadId).then(item => {
      if (!cancelled) setSelectedLeadForJourney(item);
    }).catch(error => toast.error(error.message));
    return () => { cancelled = true; };
  }, [currentUser, route.leadId, state?.leads]);

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
        const { user, authMode, accounts = [] } = await fetchCurrentUser();
        const [data, overview] = await Promise.all([fetchCRMState(INITIAL_COLLECTIONS), fetchWorkspaceSummary()]);
        if (!cancelled) {
          setState(normalizeStateStages({ ...data, overview, auditLogs: [] }));
          setCurrentUser(user);
          setCanSignOut(authMode === 'session');
          setWorkspaceAccounts(authMode === 'shared' ? accounts : []);
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
    if (!canAccessPage(currentUser, activeTab)) return;
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
  }, [activeTab, state, tabRetry, currentUser]);

  // Warm permitted chunks and default pages without delaying the initial render.
  useEffect(() => {
    if (loading || !currentUser || !state) return;
    const controller = new AbortController();
    const cancel = whenIdle(() => {
      Object.keys(viewImports).forEach(tab => prefetchView(tab, currentUser));
      warmDefaultPages(currentUser, state, controller.signal);
    });
    return () => { cancel(); controller.abort(); };
  }, [loading, currentUser?.id, revision, state?.branding?.customFields?.showMockData, state?.stages?.[0]?.pipelineId]);

  useEffect(() => {
    if (loading || !currentUser || !state) return;
    let cancelled = false;
    const cancel = whenIdle(() => {
      const missing = [...new Set(Object.entries(TAB_COLLECTIONS)
        .filter(([tab]) => canAccessPage(currentUser, tab)).flatMap(([, keys]) => keys))]
        .filter(key => state[key] === undefined);
      if (missing.length) fetchCRMState(missing).then(data => {
        if (!cancelled) setState(previous => normalizeStateStages({ ...previous, ...data }));
      }).catch(() => {}); // Navigation retains its existing retry/error path.
    });
    return () => { cancelled = true; cancel(); };
  }, [loading, currentUser?.id]);

  // Auto-refresh dashboard summary and records on tab switch or window focus
  useEffect(() => {
    if (!loading && currentUser && activeTab === 'dashboard') {
      reloadState();
    }
  }, [activeTab]);

  useEffect(() => {
    const handleFocus = () => {
      if (activeTab === 'dashboard' && !loading && currentUser) {
        reloadState();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeTab, loading, currentUser]);

  // Memoized Pending Tasks and Renewals Count for badges (placed before any early return)
  const pendingTasksCount = state?.overview?.pendingTasksCount || 0;

  const renewalsDueCount = state?.overview?.renewalsDueCount || 0;

  const handleLogin = async (email, password) => {
    const user = await signIn(email, password);
    const [data, overview] = await Promise.all([fetchCRMState(INITIAL_COLLECTIONS), fetchWorkspaceSummary()]);
    setState(normalizeStateStages({ ...data, overview, auditLogs: [] }));
    setCurrentUser(user);
    setCanSignOut(true);
    setWorkspaceAccounts([]);
    setAuthRequired(false);
    setLoadError('');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setState(null);
      setCurrentUser(null);
      setAuthRequired(true);
    } catch (error) {
      toast.error(error.message || 'Could not sign out');
    }
  };

  const handleSwitchAccount = async accountId => {
    if (switchingAccountId || accountId === currentUser.id) return;
    setSwitchingAccountId(accountId);
    setAccountSwitchError('');
    try {
      await selectWorkspaceAccount(accountId);
      window.location.reload();
    } catch (error) {
      setAccountSwitchError(error.message || 'Could not switch accounts. Please try again.');
      setSwitchingAccountId('');
    }
  };

  const handleAcceptInvitation = async password => {
    await acceptInvitation(inviteToken, password);
    await signOut().catch(() => {});
    navigate(`${location.pathname}${location.search}`, { replace: true });
    setInviteToken(null);
    setState(null);
    setCurrentUser(null);
    setAuthRequired(true);
    toast.success('Password set. Sign in to continue.');
  };

  if (inviteToken) return <AcceptInvitationView onAccept={handleAcceptInvitation} />;
  if (authRequired) return <LoginView onLogin={handleLogin} />;
  if (!loading && loadError) return <main className="p-8"><p role="alert">{loadError}</p><button onClick={() => window.location.reload()}>Retry</button>
    {getWorkspaceAccountId() && <button className="ml-4 underline" onClick={() => {
      clearWorkspaceAccount(); window.location.reload();
    }}>Return to default account</button>}
  </main>;
  if (loading || !state || !currentUser) {
    return (
      <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] flex flex-col font-sans select-none" aria-busy="true" role="status" aria-label="Loading CRM Workspace">
        {/* Skeleton Topbar */}
        <div aria-hidden="true" className="bg-[var(--surface)] border-b border-[var(--border)] px-6 py-3.5 flex items-center justify-between">
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
          <div aria-hidden="true" className="crm-sidebar-rail p-4 space-y-3" style={{ height: 'auto' }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-8 bg-[var(--surface-muted)] rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="flex-1 min-w-0 overflow-y-auto bg-[var(--canvas)]"><PageSkeleton tab={activeTab} /></div>

        </div>
      </div>
    );
  }

  // --- HANDLERS ---

  const recordUsers = getRecordUsers(currentUser, state.users);

  const reloadState = async (...collections) => {
    const requested = collections.filter(key => key !== 'auditLogs');
    if (collections.length && !requested.length) return;
    clearRecordsCache();
    const [data, overview] = await Promise.all([fetchCRMState(requested), fetchWorkspaceSummary()]);
    const updated = normalizeStateStages({ ...data, overview });
    setState(prev => requested.length && prev ? { ...prev, ...updated } : updated);
    if (requested.includes('users')) {
      const { user, authMode, accounts = [] } = await fetchCurrentUser();
      setCurrentUser(user);
      setCanSignOut(authMode === 'session');
      setWorkspaceAccounts(authMode === 'shared' ? accounts : []);
    }
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
    await resetCRMState();
    await reloadState(...INITIAL_COLLECTIONS);
  };

  const handleUpdateBranding = async (branding) => {
    const updated = await updateBranding(branding);
    if (Object.hasOwn(branding?.customFields || {}, 'showMockData')) {
      await reloadState(...INITIAL_COLLECTIONS);
    } else {
      await reloadState('branding');
    }
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
      toast.success(lead.isRecurring ? 'Recurring lead created' : 'Lead created');
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
      toast.success(lead.isRecurring === true ? 'Recurring lead updated' : 'Lead updated');
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

  const handleArchiveRecurringLead = async id => {
    try {
      await archiveRecurringLead(id);
      setState(prev => prev ? { ...prev, leads: (prev.leads || []).filter(lead => lead.id !== id) } : prev);
      await reloadState('leads', 'tasks', 'auditLogs');
      toast.success('Recurring lead archived; its history is preserved');
    } catch (error) {
      toast.error(error.message || 'Could not archive recurring lead');
      throw error;
    }
  };

  const handleImportRecurringLeadCompanies = async (rows, schedule) => {
    try {
      const result = await importRecurringLeadCompanies(rows, schedule);
      await reloadState('leads', 'auditLogs');
      const imported = result.stats.successfullyImported;
      if (imported > 0) toast.success(`Imported ${imported} recurring leads`);
      else toast.info('No new recurring leads to import');
      return result;
    } catch (err) {
      console.error('Error importing recurring leads', err);
      toast.error(err.message || 'Could not import recurring leads');
      throw err;
    }
  };

  const handleClearRecurringLeadRecords = async () => {
    try {
      const result = await clearRecurringLeadRecords();
      await reloadState('leads', 'auditLogs');
      toast.success(`Deleted ${result.deletedCount} recurring lead${result.deletedCount === 1 ? '' : 's'}`);
      return result;
    } catch (err) {
      toast.error(err.message || 'Could not clear recurring leads');
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
      if (isRecurringTask(id)) {
        await handleOpenRecurringTask({ id });
        return;
      }
      await updateTask(id, task);
      await reloadState('tasks');
    } catch (err) {
      toast.error(err.message || "Unable to save changes");
      throw err;
    }
  };

  const handleOpenRecurringTask = async task => {
    try {
      const record = task.recurringFollowUpId ? task : await fetchRecord('tasks', task.id);
      const lead = await fetchRecord('leads', record.linkedId);
      if (record.recurringFollowUpId) {
        const query = new URLSearchParams(location.search);
        query.set('followUp', record.recurringFollowUpId);
        navigate(`${LEAD_SECTION_PATHS.recurring}/${encodeURIComponent(lead.id)}?${query}`, {
          state: { from: `${location.pathname}${location.search}` },
        });
        setSelectedLeadForJourney(lead);
        return;
      }
      setRecurringTaskLead(lead);
    } catch (err) { toast.error(err.message || 'Could not open the recurring lead.'); }
  };

  const handleRecurringFollowUpSaved = async () => {
    await reloadState('leads', 'tasks', 'activities', 'auditLogs');
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

  const reportApprovalFailure = async (error, fallback) => {
    if ([404, 409].includes(error.status)) {
      try {
        await reloadState('deals', 'leads', 'tasks', 'activities', 'stageGateChecks');
      } catch {
        // Still invalidate the paginated queues if refreshing the workspace failed.
        setRevision(value => value + 1);
      }
    }
    toast.error(error.message || fallback);
    error.userNotified = true;
  };

  const handleApproveStageGateCheck = async (id, reviewer) => {
    try {
      await approveStageGateCheck(id, reviewer);
      await reloadState('deals', 'leads', 'tasks', 'activities', 'stageGateChecks', 'auditLogs');
      toast.success('Approval completed');
    } catch (err) {
      await reportApprovalFailure(err, 'Approval failed');
      throw err;
    }
  };

  const handleRejectStageGateCheck = async (id, reviewer, reason) => {
    try {
      await rejectStageGateCheck(id, reviewer, reason);
      await reloadState('deals', 'leads', 'tasks', 'activities', 'stageGateChecks', 'auditLogs');
      toast.success('Request rejected');
    } catch (err) {
      await reportApprovalFailure(err, 'Rejection failed');
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
    if (type === 'lead') {
      navigateToLeadSection('new');
      setLeadCreateRequest(request => request + 1);
    }
    else if (type === 'deal') navigateToTab('pipeline');
    else if (type === 'contact') navigateToTab('contacts');
    else if (type === 'activity') navigateToTab('dashboard');
  };

  // Global search result selection
  const handleSelectSearchResult = (type, item) => {
    if (type === 'lead') {
      if (item) navigateToLeadDetail(item);
    } else if (type === 'deal') {
      navigate(item?.pipelineId
        ? `${APP_PAGE_PATHS.pipeline}?pipeline=${encodeURIComponent(item.pipelineId)}`
        : APP_PAGE_PATHS.pipeline);
      if (item) setDrawerState({ isOpen: true, type: 'deal', item });
    } else if (type === 'contact') {
      navigateToTab('contacts');
    } else if (type === 'company') {
      navigateToTab('companies');
    }
  };

  return (
    <ErrorBoundary onResetState={handleResetDemoData}>
      <div className="h-full w-full bg-[var(--canvas)] text-[var(--ink)] flex flex-col font-sans antialiased selection:bg-[var(--primary)] selection:text-white overflow-hidden">
        
        {/* Toast Notification Container */}
        <Toaster position="top-right" richColors closeButton />

        {/* Main Body: Sidebar + Content */}
        <div className="flex-1 flex overflow-hidden">

          {/* Navigation Sidebar */}
          <Sidebar
            onPrefetch={tab => prefetchView(tab, currentUser)}
            activeTab={activeTab}
            setActiveTab={handleNavigateTab}
            navigateToLeadSection={navigateToLeadSection}
            userRole={currentUser.role}
            currentUser={currentUser}
            branding={state.branding}
            onLogout={canSignOut ? handleLogout : undefined}
            pendingTasksCount={pendingTasksCount}
            renewalsDueCount={renewalsDueCount}
            onOpenImportExport={handleOpenImportExport}
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
          />

          <div className="flex min-w-0 flex-1 flex-col">
          <Header activeTab={activeTab} leadSection={leadSection} currentUser={currentUser}
            onLogout={canSignOut ? handleLogout : undefined}
            onNavigateNotification={href => navigate(href)}
            accounts={workspaceAccounts} onSwitchAccount={handleSwitchAccount}
            switchingAccountId={switchingAccountId} accountSwitchError={accountSwitchError}
            onSelectSearchResult={handleSelectSearchResult}
            onOpenQuickAction={handleQuickAction}
            isMobileMenuOpen={isMobileMenuOpen}
            onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)} />
          {/* Dynamic Tab Content View */}
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-[var(--canvas)] overscroll-contain pb-16 md:pb-0">
            <Suspense fallback={<PageSkeleton tab={activeTab} journey={Boolean(selectedLeadForJourney)} stages={state.stages?.filter(stage => stage.pipelineId === selectedPipelineId)} />}>
            {(TAB_COLLECTIONS[activeTab] || []).some(key => state[key] === undefined)
              ? tabLoadError ? <div className="p-8 text-sm text-[#5B6472]" role="alert">{tabLoadError}<button className="ml-3 underline" onClick={() => setTabRetry(value => value + 1)}>Retry</button></div>
                : <PageSkeleton tab={activeTab} stages={state.stages?.filter(stage => stage.pipelineId === selectedPipelineId)} />
              : <>
            {activeTab === 'dashboard' && (
              <DashboardView revision={revision} onOpenRecurringTask={handleOpenRecurringTask}
                state={state}
                currentUser={currentUser}
                onNavigateTab={handleNavigateTab}
                onTriggerRenewalCheck={handleTriggerRenewalCheck}
                onOpenLeadModal={() => handleQuickAction('lead')}
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
                  users={recordUsers}
                  currentUser={currentUser}
                  branding={state.branding}
                  onBack={handleBackFromLead}
                  onOpenDrawer={handleOpenDrawer}
                  onUpdateLead={handleUpdateLead}
                  onUpdateDeal={handleUpdateDeal}
                  onCreateActivity={handleCreateActivity}
                  onCreateTask={handleCreateTask}
                  onUpdateTask={handleUpdateTask}
                  onTransitionDealStage={handleTransitionDealStage}
                  onRecurringFollowUpSaved={handleRecurringFollowUpSaved}
                />
              ) : (
                <LeadsView revision={revision}
                  leadSection={leadSection}
                  onLeadSectionChange={navigateToLeadSection}
                  createRequest={leadCreateRequest}
                  onConsumeCreateRequest={() => setLeadCreateRequest(0)}
                  leads={state.leads}
                  stages={state.stages}
                  deals={state.deals}
                  users={recordUsers}
                  currentUser={currentUser}
                  branding={state.branding}
                  onCreateLead={handleCreateLead}
                  onImportRecurringLeads={handleImportRecurringLeadCompanies}
                  onRecurringChanged={() => reloadState('leads', 'tasks', 'activities', 'auditLogs')}
                  onClearRecurringLeads={handleClearRecurringLeadRecords}
                  onUpdateLead={handleUpdateLead}
                  onDeleteLead={handleDeleteLead}
                  onArchiveRecurringLead={handleArchiveRecurringLead}
                  onConvertToDeal={handleConvertToDeal}
                  onCreateActivity={handleCreateActivity}
                  onCreateNote={handleCreateNote}
                  onTransitionDealStage={handleTransitionDealStage}
                  onCreateTask={handleCreateTask}
                  onSubmitStageGateCheck={handleCreateStageGateCheck}
                  onApproveStageGateCheck={handleApproveStageGateCheck}
                  onRejectStageGateCheck={handleRejectStageGateCheck}
                  onOpenDrawer={handleOpenDrawer}
                  onOpenLeadJourney={navigateToLeadDetail}
                  onOpenRecurringFollowUp={handleOpenLeadFollowUp}
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
              <PipelineView revision={revision} allStages={state.stages}
                deals={state.deals.filter(deal => deal.pipelineId === selectedPipelineId)}
                stages={state.stages.filter(stage => stage.pipelineId === selectedPipelineId)}
                users={recordUsers}
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
                onOpenSettings={() => handleNavigateTab('settings')}
                onTransitionDealStage={handleTransitionDealStage}
                onCloseLostDeal={handleCloseLostDeal}
                onCreateRebuyDeal={handleCreateRebuyDeal}
                onOpenDrawer={handleOpenDrawer}
              />
              </div>
            )}

            {activeTab === 'contacts' && (
              <ContactsView revision={revision}
                branding={state.branding}
                contacts={state.contacts}
                companies={state.companies}
                users={recordUsers}
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
                branding={state.branding}
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
              <TasksView revision={revision} onOpenRecurringTask={handleOpenRecurringTask}
                tasks={state.tasks}
                users={recordUsers}
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

            {activeTab === 'employees' && canAccessPage(currentUser, 'employees') && (
              <EmployeesView
                ownerStats={state.overview?.ownerStats || []}
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

            {activeTab === 'settings' && canAccessPage(currentUser, 'settings') && (
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
                onNavigateTab={handleNavigateTab}
                onOpenSearch={() => document.querySelector('header input')?.focus()}
              />
            )}
            </>}
            </Suspense>
          </main>
          </div>

        </div>

        {/* 360° Slide-Over Detail Drawer */}
        <DetailDrawer
          isOpen={drawerState.isOpen}
          onClose={handleCloseDrawer}
          deal={drawerState.type === 'deal' ? (state.deals.find(d => d.id === drawerState.item?.id) || drawerState.item) : null}
          lead={drawerState.type === 'lead' ? (state.leads.find(l => l.id === drawerState.item?.id) || drawerState.item) : null}
          type={drawerState.type}
          stages={state.stages}
          users={recordUsers}
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
            navigateToTab('pipeline');
            handleCloseDrawer();
          }}
          onCloseLostDeal={handleCloseLostDeal}
          onCreateRebuyDeal={handleCreateRebuyDeal}
        />

        {/* Global Modals */}
        {recurringTaskLead && <Suspense fallback={<PageSkeleton tab="leads" journey />}>
          <RecurringCycleDialog lead={recurringTaskLead} currentUser={currentUser} onClose={() => setRecurringTaskLead(null)}
            onChanged={async () => { await reloadState('leads', 'tasks', 'activities'); toast.success('Cycle update recorded'); }} />
        </Suspense>}
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
            { id: 'tasks', label: 'Tasks', icon: CheckSquare, badge: pendingTasksCount > 0 },
            { id: 'menu', label: 'More', icon: Menu, isAction: true }
          ].map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onMouseEnter={() => prefetchView(item.id, currentUser)}
                onFocus={() => prefetchView(item.id, currentUser)}
                onTouchStart={() => prefetchView(item.id, currentUser)}
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
