import React, { useState, useEffect } from 'react';
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
  triggerRenewalAutomation,
  createTask,
  updateTask,
  deleteTask,
  createNote,
  createActivity,
  createUser,
  updateUser,
  importContacts
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
import { GlobalSearchModal } from './components/GlobalSearchModal.jsx';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [state, setState] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  // Initial Load
  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchCRMState();
        setState(data);
        if (data.users && data.users.length > 0) {
          setCurrentUser(data.users[0]); // Alex Vance (Admin)
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
      <div className="min-h-screen bg-[#f5f5f0] text-[#2d2d2a] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#5A5A40] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#5A5A40]">Loading Customizable CRM Demo...</p>
        </div>
      </div>
    );
  }

  // --- HANDLERS ---

  const reloadState = async () => {
    const updated = await fetchCRMState();
    setState(updated);
  };

  const handleTriggerRenewalCheck = async () => {
    const res = await triggerRenewalAutomation();
    setState(res.state);
  };

  const handleResetDemoData = async () => {
    const res = await resetCRMState();
    setState(res);
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

  // Quick Action Handler from Header
  const handleQuickAction = (type) => {
    if (type === 'lead') setActiveTab('leads');
    else if (type === 'deal') setActiveTab('pipeline');
    else if (type === 'contact') setActiveTab('contacts');
    else if (type === 'activity') setActiveTab('dashboard');
  };

  // Global search result selection
  const handleSelectSearchResult = (type, _item) => {
    if (type === 'lead') setActiveTab('leads');
    else if (type === 'deal') setActiveTab('pipeline');
    else if (type === 'contact') setActiveTab('contacts');
    else if (type === 'company') setActiveTab('companies');
  };

  // Pending Tasks and Renewals Count for badges
  const pendingTasksCount = state.tasks.filter(t => t.status === 'pending' && t.ownerId === currentUser.id).length;
  const renewalsDueCount = state.deals.filter(d => d.status === 'Renewal Due' || d.stageName?.includes('Buy Again')).length;

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#2d2d2a] flex flex-col font-sans antialiased selection:bg-[#5A5A40] selection:text-white">

      {/* Top Header */}
      <Header
        branding={state.branding}
        users={state.users}
        currentUser={currentUser}
        onSelectUser={setCurrentUser}
        onOpenSearch={() => setIsSearchOpen(true)}
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
        <main className="flex-1 overflow-y-auto bg-[#f5f5f0]">
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
              onOpenSettings={() => setActiveTab('settings')}
            />
          )}

          {activeTab === 'contacts' && (
            <ContactsView
              contacts={state.contacts}
              companies={state.companies}
              users={state.users}
              deals={state.deals}
              notes={state.notes}
              activities={state.activities}
              currentUser={currentUser}
              onCreateContact={handleCreateContact}
              onUpdateContact={handleUpdateContact}
              onDeleteContact={handleDeleteContact}
              onCreateNote={handleCreateNote}
              onCreateActivity={handleCreateActivity}
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
              currentUser={currentUser}
              onCreateTask={handleCreateTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
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
        </main>

      </div>

      {/* Global Modals */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        state={state}
        onSelectResult={handleSelectSearchResult}
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        state={state}
      />

    </div>
  );
}
