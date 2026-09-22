import React, { useState, useEffect } from 'react';
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

  if (loading || !state || !currentUser) {
    return (
      <div className="min-h-screen bg-[#F6F7F8] text-[#12161C] flex flex-col font-sans select-none">
        {/* Skeleton Topbar */}
        <div className="bg-[#FFFFFF] border-b border-[#E3E6EA] px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#EFF6F9] animate-pulse" />
            <div className="h-4 w-28 bg-[#E3E6EA] rounded-md animate-pulse" />
          </div>
          <div className="hidden md:block w-72 h-8 bg-[#F6F7F8] rounded-xl border border-[#E3E6EA] animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="w-20 h-8 bg-[#F6F7F8] rounded-xl animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-[#E3E6EA] animate-pulse" />
          </div>
        </div>

        {/* Skeleton Main Workspace */}
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 bg-[#FFFFFF] border-r border-[#E3E6EA] p-4 space-y-3 hidden lg:block">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-8 bg-[#F6F7F8] rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div className="h-28 bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl p-6 flex items-center justify-between animate-pulse">
              <div className="space-y-2">
                <div className="h-5 w-48 bg-[#E3E6EA] rounded-md" />
                <div className="h-3 w-80 bg-[#F6F7F8] rounded-md" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl animate-pulse" />
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

  // Companies CRUD
  const handleCreateCompany = async (comp) => {
    await createCompany(comp);
    await reloadState();
  };

  const handleUpdateCompany = async (id, comp) => {
    await updateCompany(id, comp);
    await reloadState();
  };

  const handleDeleteCompany = async (id) => {
    await deleteCompany(id);
    await reloadState();
  };

  // Contacts CRUD
  const handleCreateContact = async (cnt) => {
    await createContact(cnt);
    await reloadState();
  };

  const handleUpdateContact = async (id, cnt) => {
    await updateContact(id, cnt);
    await reloadState();
  };

  const handleDeleteContact = async (id) => {
    await deleteContact(id);
    await reloadState();
  };

  // Leads CRUD
  const handleCreateLead = async (lead) => {
    await createLead(lead);
    await reloadState();
  };

  const handleUpdateLead = async (id, lead) => {
    await updateLead(id, lead);
    await reloadState();
  };

  const handleDeleteLead = async (id) => {
    await deleteLead(id);
    await reloadState();
  };

  // Deals CRUD
  const handleCreateDeal = async (deal) => {
    await createDeal(deal);
    await reloadState();
  };

  const handleUpdateDeal = async (id, deal) => {
    await updateDeal(id, deal);
    await reloadState();
  };

  const handleDeleteDeal = async (id) => {
    await deleteDeal(id);
    await reloadState();
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

  // Tasks CRUD
  const handleCreateTask = async (task) => {
    await createTask(task);
    await reloadState();
  };

  const handleUpdateTask = async (id, task) => {
    await updateTask(id, task);
    await reloadState();
  };

  const handleDeleteTask = async (id) => {
    await deleteTask(id);
    await reloadState();
  };

  // Notes & Activities
  const handleCreateNote = async (note) => {
    await createNote(note);
    await reloadState();
  };

  const handleCreateActivity = async (act) => {
    await createActivity(act);
    await reloadState();
  };

  // Users
  const handleCreateUser = async (u) => {
    await createUser(u);
    await reloadState();
  };

  const handleUpdateUser = async (id, u) => {
    await updateUser(id, u);
    await reloadState();
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
      if (item) setDrawerState({ isOpen: true, type: 'lead', item });
    } else if (type === 'deal') {
      setActiveTab('pipeline');
      if (item) setDrawerState({ isOpen: true, type: 'deal', item });
    } else if (type === 'contact') {
      setActiveTab('contacts');
    } else if (type === 'company') {
      setActiveTab('companies');
    }
  };

  // Pending Tasks and Renewals Count for badges
  const pendingTasksCount = state.tasks.filter(t => t.status === 'pending' && t.ownerId === currentUser.id).length;
  const renewalsDueCount = state.deals.filter(d => d.status === 'Renewal Due' || d.stageName?.includes('Buy Again')).length;

  return (
    <ErrorBoundary onResetState={handleResetDemoData}>
      <div className="h-screen w-screen bg-[#F6F7F8] text-[#12161C] flex flex-col font-sans antialiased selection:bg-[#1D4E63] selection:text-white overflow-hidden">
        
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
          onNavigateTab={setActiveTab}
          onOpenQuickAction={handleQuickAction}
          onTriggerRenewalCheck={handleTriggerRenewalCheck}
          renewalsDueCount={renewalsDueCount}
        />

        {/* Main Body: Sidebar + Content */}
        <div className="flex-1 flex overflow-hidden">

          {/* Navigation Sidebar */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            userRole={currentUser.role}
            pendingTasksCount={pendingTasksCount}
            renewalsDueCount={renewalsDueCount}
            onOpenImportExport={() => setIsImportExportOpen(true)}
          />

          {/* Dynamic Tab Content View */}
          <main className="flex-1 overflow-y-auto bg-[#F6F7F8]">
            {activeTab === 'dashboard' && (
              <DashboardView
                state={state}
                currentUser={currentUser}
                onNavigateTab={setActiveTab}
                onTriggerRenewalCheck={handleTriggerRenewalCheck}
                onOpenLeadModal={() => setActiveTab('leads')}
                onOpenDealModal={() => setActiveTab('pipeline')}
              />
            )}

            {activeTab === 'leads' && (
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
              />
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
                onCreateCompany={handleCreateCompany}
                onUpdateCompany={handleUpdateCompany}
                onDeleteCompany={handleDeleteCompany}
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

      </div>
    </ErrorBoundary>
  );
}
