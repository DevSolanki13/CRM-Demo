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
  transitionDealStage,
  closeLostDeal,
  createRebuyDeal,
  fetchAuditLogs,
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
import { GlobalSearchModal } from './components/GlobalSearchModal.jsx';
import { Loader2 } from 'lucide-react';

const OLD_HEX_MAP = {
  '#64748b': '#FFFFFF',
  '#0284c7': '#A7F3D0',
  '#8b5cf6': '#6EE7B7',
  '#eab308': '#34D399',
  '#f97316': '#10B981',
  '#10b981': '#16A34A',
  '#ec4899': '#EAB308',
  '#ef4444': '#DC2626',
  '#B9D4DE': '#FFFFFF',
  '#93BECC': '#A7F3D0',
  '#3E7C93': '#6EE7B7',
  '#2A6580': '#34D399',
  '#1D4E63': '#10B981',
  '#3F7A5C': '#16A34A',
  '#C6790A': '#EAB308',
  '#B5423A': '#DC2626',
};

const DEFAULT_STAGE_COLORS = {
  'New Lead': '#FFFFFF',
  'Contacted': '#A7F3D0',
  'Sample Sent': '#6EE7B7',
  'Proposal Sent': '#34D399',
  'Negotiation': '#10B981',
  'Closed Won': '#16A34A',
  'Buy Again (Renewal)': '#EAB308',
  'Closed Lost': '#DC2626',
};

const normalizeStateStages = (data) => {
  if (!data || !data.stages) return data;
  const normalizedStages = data.stages.map(stg => {
    if (OLD_HEX_MAP[stg.color]) {
      return { ...stg, color: OLD_HEX_MAP[stg.color] };
    }
    if (DEFAULT_STAGE_COLORS[stg.name] && OLD_HEX_MAP[stg.color]) {
      return { ...stg, color: DEFAULT_STAGE_COLORS[stg.name] };
    }
    return stg;
  });
  return { ...data, stages: normalizedStages };
};

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
      <div className="min-h-screen bg-[#F6F7F8] text-[#12161C] flex items-center justify-center p-4">
        <div className="text-center space-y-3 bg-[#FFFFFF] border border-[#E3E6EA] p-8 rounded-2xl shadow-xl">
          <Loader2 className="w-8 h-8 text-[#1D4E63] animate-spin mx-auto" />
          <p className="text-sm font-bold text-[#12161C] font-display">Loading NexusCRM Sales Console...</p>
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
      return res;
    } catch (err) {
      alert(err.message || 'Stage transition failed');
      throw err;
    }
  };

  const handleCloseLostDeal = async (dealId, payload) => {
    try {
      const res = await closeLostDeal(dealId, payload);
      await reloadState();
      return res;
    } catch (err) {
      alert(err.message || 'Close lost failed');
      throw err;
    }
  };

  const handleCreateRebuyDeal = async (parentDealId) => {
    try {
      const res = await createRebuyDeal(parentDealId, currentUser);
      await reloadState();
      return res;
    } catch (err) {
      alert(err.message || 'Failed to create rebuy deal');
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
        expectedCloseDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        isRecurring: true,
        recurrenceDays: 60
      };
      await createDeal(newDeal);
      await reloadState();
    } catch (err) {
      alert(err.message || 'Failed to convert lead to deal');
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
    <div className="h-screen w-screen bg-[#F6F7F8] text-[#12161C] flex flex-col font-sans antialiased selection:bg-[#1D4E63] selection:text-white overflow-hidden">

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
