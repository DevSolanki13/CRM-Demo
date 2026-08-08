import React, { useState, useEffect } from 'react';
import { 
  CRMState, 
  User, 
  Lead, 
  Deal, 
  Contact, 
  Company, 
  Task, 
  Note, 
  ActivityLog, 
  PipelineStage, 
  CRMBrandingSettings 
} from './types/crm';
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
} from './api/crmClient';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { LeadsView } from './components/LeadsView';
import { PipelineView } from './components/PipelineView';
import { ContactsView } from './components/ContactsView';
import { CompaniesView } from './components/CompaniesView';
import { TasksView } from './components/TasksView';
import { EmployeesView } from './components/EmployeesView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { ImportExportModal } from './components/ImportExportModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<CRMState | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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

  const handleUpdateBranding = async (branding: Partial<CRMBrandingSettings>) => {
    const updated = await updateBranding(branding);
    setState(prev => prev ? { ...prev, branding: updated } : prev);
  };

  // Companies CRUD
  const handleCreateCompany = async (comp: Partial<Company>) => {
    await createCompany(comp);
    await reloadState();
  };

  const handleUpdateCompany = async (id: string, comp: Partial<Company>) => {
    await updateCompany(id, comp);
    await reloadState();
  };

  const handleDeleteCompany = async (id: string) => {
    await deleteCompany(id);
    await reloadState();
  };

  // Contacts CRUD
  const handleCreateContact = async (cnt: Partial<Contact>) => {
    await createContact(cnt);
    await reloadState();
  };

  const handleUpdateContact = async (id: string, cnt: Partial<Contact>) => {
    await updateContact(id, cnt);
    await reloadState();
  };

  const handleDeleteContact = async (id: string) => {
    await deleteContact(id);
    await reloadState();
  };

  // Leads CRUD
  const handleCreateLead = async (lead: Partial<Lead>) => {
    await createLead(lead);
    await reloadState();
  };

  const handleUpdateLead = async (id: string, lead: Partial<Lead>) => {
    await updateLead(id, lead);
    await reloadState();
  };

  const handleDeleteLead = async (id: string) => {
    await deleteLead(id);
    await reloadState();
  };

  // Deals CRUD
  const handleCreateDeal = async (deal: Partial<Deal>) => {
    await createDeal(deal);
    await reloadState();
  };

  const handleUpdateDeal = async (id: string, deal: Partial<Deal>) => {
    await updateDeal(id, deal);
    await reloadState();
  };

  const handleDeleteDeal = async (id: string) => {
    await deleteDeal(id);
    await reloadState();
  };

  // Stages CRUD
  const handleCreateStage = async (stage: Partial<PipelineStage>) => {
    await createStage(stage);
    await reloadState();
  };

  const handleUpdateStage = async (id: string, stage: Partial<PipelineStage>) => {
    await updateStage(id, stage);
    await reloadState();
  };

  // Tasks CRUD
  const handleCreateTask = async (task: Partial<Task>) => {
    await createTask(task);
    await reloadState();
  };

  const handleUpdateTask = async (id: string, task: Partial<Task>) => {
    await updateTask(id, task);
    await reloadState();
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
    await reloadState();
  };

  // Notes & Activities
  const handleCreateNote = async (note: Partial<Note>) => {
    await createNote(note);
    await reloadState();
  };

  const handleCreateActivity = async (act: Partial<ActivityLog>) => {
    await createActivity(act);
    await reloadState();
  };

  // Users
  const handleCreateUser = async (u: Partial<User>) => {
    await createUser(u);
    await reloadState();
  };

  const handleUpdateUser = async (id: string, u: Partial<User>) => {
    await updateUser(id, u);
    await reloadState();
  };

  // CSV Import
  const handleImportContacts = async (items: any[]) => {
    await importContacts(items);
    await reloadState();
  };

  // Quick Action Handler from Header
  const handleQuickAction = (type: 'lead' | 'deal' | 'contact' | 'activity') => {
    if (type === 'lead') setActiveTab('leads');
    else if (type === 'deal') setActiveTab('pipeline');
    else if (type === 'contact') setActiveTab('contacts');
    else if (type === 'activity') setActiveTab('dashboard');
  };

  // Global search result selection
  const handleSelectSearchResult = (type: 'lead' | 'contact' | 'deal' | 'company', item: any) => {
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
        onImportContacts={handleImportContacts}
      />

    </div>
  );
}
