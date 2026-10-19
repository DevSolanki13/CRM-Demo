import React, { useState, useEffect, useMemo } from 'react';
import { getLocalDateInputValueAfterDays } from './utils/crmHelpers.js';
import {
  fetchCRMState,
  resetCRMState,
  updateBranding,
  createCompany,
  updateCompany,
  deleteCompany,
  createContact,
  updateContact,
  deleteContact,
  createLead,
  updateLead,
  deleteLead,
  createStage,
  updateStage,
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
import { Sidebar } from './components/Sidebar.jsx';
import { DashboardView } from './components/DashboardView.jsx';
import { LeadsView } from './components/LeadsView.jsx';
import { LeadJourneyView } from './components/LeadJourneyView.jsx';
import { PipelineView } from './components/PipelineView.jsx';
import { ContactsView } from './components/ContactsView.jsx';
import { CompaniesView } from './components/CompaniesView.jsx';
import { TasksView } from './components/TasksView.jsx';
import { EmployeesView } from './components/EmployeesView.jsx';
import { ReportsView } from './components/ReportsView.jsx';
import { SettingsView } from './components/SettingsView.jsx';
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

import { normalizeStageColor } from '../backend/constants/stageConstants.js';

const KNOWN_TABS = ['dashboard', 'leads', 'pipeline', 'contacts', 'companies', 'tasks', 'employees', 'reports', 'settings'];

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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
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

  // Initial Load
  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchCRMState();
        const normalized = normalizeStateStages(data);
        setState(normalized);
        if (normalized.users && normalized.users.length > 0) {
          setCurrentUser(normalized.users[0]); // Alex Vance (Admin)
        }
      } catch (err) {
        console.error("Error fetching state", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Memoized Pending Tasks and Renewals Count for badges (placed before any early return)
  const pendingTasksCount = useMemo(() => {
    return (state?.tasks || []).filter(t => t.status === 'pending' && t.ownerId === currentUser?.id).length;
  }, [state?.tasks, currentUser?.id]);

  const renewalsDueCount = useMemo(() => {
    return (state?.deals || []).filter(d => d.status === 'Renewal Due' || d.stageName?.includes('Buy Again')).length;
  }, [state?.deals]);

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

  const reloadState = async () => {
    const updated = await fetchCRMState();
    setState(normalizeStateStages(updated));
  };

  const handleTriggerRenewalCheck = async () => {
    const res = await triggerRenewalAutomation();
    setState(normalizeStateStages(res.state));
  };

  const handleResetDemoData = async () => {
    const res = await resetCRMState();
    setState(normalizeStateStages(res));
  };

  const handleUpdateBranding = async (branding) => {
    const updated = await updateBranding(branding);
    setState(prev => prev ? { ...prev, branding: updated } : prev);
  };

  // Companies CRUD with full state reload
  const handleCreateCompany = async (comp) => {
    try {
      await createCompany(comp);
      await reloadState();
      toast.success("Company created successfully");
    } catch (err) {
      console.error("Error creating company", err);
      await reloadState();
    }
  };

  const handleUpdateCompany = async (id, comp) => {
    try {
      await updateCompany(id, comp);
      await reloadState();
      toast.success("Company updated");
    } catch (err) {
      console.error("Error updating company", err);
      await reloadState();
    }
  };

  const handleDeleteCompany = async (id) => {
    try {
      await deleteCompany(id);
      await reloadState();
      toast.info("Company deleted");
    } catch (err) {
      console.error("Error deleting company", err);
      await reloadState();
    }
  };

  // Contacts CRUD with full state reload
  const handleCreateContact = async (cnt) => {
    try {
      await createContact(cnt);
      await reloadState();
      toast.success("Contact created");
    } catch (err) {
      console.error("Error creating contact", err);
      await reloadState();
    }
  };

  const handleUpdateContact = async (id, cnt) => {
    try {
      await updateContact(id, cnt);
      await reloadState();
      toast.success("Contact updated");
    } catch (err) {
      console.error("Error updating contact", err);
      await reloadState();
    }
  };

  const handleDeleteContact = async (id) => {
    try {
      await deleteContact(id);
      await reloadState();
      toast.info("Contact deleted");
    } catch (err) {
      console.error("Error deleting contact", err);
      await reloadState();
    }
  };

  // Leads CRUD with targeted local state updates
  const handleCreateLead = async (lead) => {
    try {
      await createLead(lead);
      await reloadState();
      toast.success("Lead created");
    } catch (err) {
      console.error("Error creating lead", err);
      await reloadState();
    }
  };

  const handleUpdateLead = async (id, lead) => {
    try {
      const updated = await updateLead(id, lead);
      setState(prev => prev ? {
        ...prev,
        leads: (prev.leads || []).map(l => l.id === id ? { ...l, ...updated } : l)
      } : prev);
      toast.success("Lead updated");
    } catch (err) {
      console.error("Error updating lead", err);
      await reloadState();
    }
  };

  const handleDeleteLead = async (id) => {
    try {
      await deleteLead(id);
      setState(prev => prev ? {
        ...prev,
        leads: (prev.leads || []).filter(l => l.id !== id)
      } : prev);
      toast.info("Lead deleted");
    } catch (err) {
      console.error("Error deleting lead", err);
      await reloadState();
    }
  };

  // Deals Basic CRUD with state reload for complete data synchronization
  const handleCreateDeal = async (deal) => {
    try {
      await createDeal(deal);
      await reloadState();
      toast.success("Opportunity created");
    } catch (err) {
      console.error("Error creating deal", err);
      await reloadState();
    }
  };

  const handleUpdateDeal = async (id, deal) => {
    try {
      await updateDeal(id, deal);
      await reloadState();
      toast.success("Deal updated");
    } catch (err) {
      console.error("Error updating deal", err);
      await reloadState();
    }
  };

  const handleDeleteDeal = async (id) => {
    try {
      await deleteDeal(id);
      await reloadState();
      toast.info("Deal deleted");
    } catch (err) {
      console.error("Error deleting deal", err);
      await reloadState();
    }
  };

  // Stages CRUD
  const handleCreateStage = async (stage) => {
    await createStage(stage);
    await reloadState();
  };

  const handleUpdateStage = async (id, stage) => {
    await updateStage(id, stage);
    await reloadState();
  };

  // Tasks CRUD with full state reload
  const handleCreateTask = async (task) => {
    try {
      await createTask(task);
      await reloadState();
      toast.success("Task created");
    } catch (err) {
      console.error("Error creating task", err);
      await reloadState();
    }
  };

  const handleUpdateTask = async (id, task) => {
    try {
      await updateTask(id, task);
      await reloadState();
    } catch (err) {
      console.error("Error updating task", err);
      await reloadState();
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await deleteTask(id);
      await reloadState();
      toast.info("Task removed");
    } catch (err) {
      console.error("Error deleting task", err);
      await reloadState();
    }
  };

  // Notes & Activities with full state reload
  const handleCreateNote = async (note) => {
    try {
      await createNote(note);
      await reloadState();
      toast.success("Note saved");
    } catch (err) {
      console.error("Error creating note", err);
      await reloadState();
    }
  };

  const handleCreateActivity = async (act) => {
    try {
      await createActivity(act);
      await reloadState();
    } catch (err) {
      console.error("Error creating activity", err);
      await reloadState();
    }
  };

  // Users with full state reload
  const handleCreateUser = async (u) => {
    try {
      await createUser(u);
      await reloadState();
      toast.success("Team member added");
    } catch (err) {
      console.error("Error creating user", err);
      await reloadState();
    }
  };

  const handleUpdateUser = async (id, u) => {
    try {
      await updateUser(id, u);
      await reloadState();
      toast.success("User profile updated");
    } catch (err) {
      console.error("Error updating user", err);
      await reloadState();
    }
  };

  // CSV Import
  const handleImportContacts = async (items) => {
    await importContacts(items);
    await reloadState();
  };

  // Stage Gate Check Handlers
  const handleCreateStageGateCheck = async (check) => {
    await createStageGateCheck(check);
    await reloadState();
  };

  const handleApproveStageGateCheck = async (id, reviewer) => {
    const cleanId = String(id).replace('v-task-', '');
    try {
      await approveStageGateCheck(cleanId, reviewer);
    } catch (err) {
      console.warn('approveStageGateCheck error:', err);
    }
    await reloadState();
  };

  const handleRejectStageGateCheck = async (id, reviewer, reason) => {
    const cleanId = String(id).replace('v-task-', '');
    try {
      await rejectStageGateCheck(cleanId, reviewer, reason);
    } catch (err) {
      console.warn('rejectStageGateCheck error:', err);
    }
    await reloadState();
  };

  const handleSavePartialGateCheck = async (dealId, partialState) => {
    await updateDeal(dealId, { partialGateState: partialState });
    await reloadState();
  };

  // Stage Transition Handlers
  const handleTransitionDealStage = async (dealId, payload) => {
    try {
      const res = await transitionDealStage(dealId, payload);
      await reloadState();
      toast.success("Deal stage updated successfully");
      return res;
    } catch (err) {
      toast.error(err.message || 'Stage transition failed');
      throw err;
    }
  };

  const handleCloseLostDeal = async (dealId, payload) => {
    try {
      const res = await closeLostDeal(dealId, payload);
      await reloadState();
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
      await reloadState();
      toast.success("Child rebuy opportunity generated");
      return res;
    } catch (err) {
      toast.error(err.message || 'Failed to create rebuy deal');
      throw err;
    }
  };

  const handleConvertToDeal = async (lead) => {
    try {
      const initialStage = state.stages.find(s => s.order === 1) || state.stages[0];
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
      await reloadState();
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
          state={state}
          onSelectUser={setCurrentUser}
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
            pendingTasksCount={pendingTasksCount}
            renewalsDueCount={renewalsDueCount}
            onOpenImportExport={() => setIsImportExportOpen(true)}
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
          />

          {/* Dynamic Tab Content View */}
          <main className="flex-1 overflow-y-auto bg-[var(--canvas)] pb-16 md:pb-0">
            {activeTab === 'dashboard' && (
              <DashboardView
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
                  deals={state.deals}
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
                <LeadsView
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
                  onUpdateDeal={handleUpdateDeal}
                  onCreateActivity={handleCreateActivity}
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
              <PipelineView
                deals={state.deals}
                stages={state.stages}
                users={state.users}
                companies={state.companies}
                contacts={state.contacts}
                currentUser={currentUser}
                branding={state.branding}
                onCreateDeal={handleCreateDeal}
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
            )}

            {activeTab === 'contacts' && (
              <ContactsView
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
                onCreateNote={handleCreateNote}
                onCreateActivity={handleCreateActivity}
                onCreateTask={handleCreateTask}
                onUpdateDeal={handleUpdateDeal}
              />
            )}

            {activeTab === 'companies' && (
              <CompaniesView
                companies={state.companies}
                contacts={state.contacts}
                deals={state.deals}
                currentUser={currentUser}
                onCreateCompany={handleCreateCompany}
                onUpdateCompany={handleUpdateCompany}
                onDeleteCompany={handleDeleteCompany}
                onCreateActivity={handleCreateActivity}
              />
            )}

            {activeTab === 'tasks' && (
              <TasksView
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
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                state={state}
                currentUser={currentUser}
                onCreateDeal={handleCreateDeal}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                branding={state.branding}
                stages={state.stages}
                onUpdateBranding={handleUpdateBranding}
                onCreateStage={handleCreateStage}
                onUpdateStage={handleUpdateStage}
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
