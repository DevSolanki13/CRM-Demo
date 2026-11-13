import { LeadsSkeleton } from './skeletons/LeadsSkeleton.jsx';
import { useRecordsPage } from '../hooks/useRecordsPage.js';
import { RecordPagination } from './RecordPagination.jsx';
import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Building2,
  Edit3,
  Trash2,
  X,
  MoreVertical,
  Calendar,
  ArrowRightLeft,
  AlertTriangle,
  Clock,
  Layers,
  List,
  LayoutGrid,
  ExternalLink,
  Repeat,
  Upload
} from 'lucide-react';
import { formatDate, getStageBadgeStyle, getLocalDateInputValue, getLocalDateInputValueAfterDays, isMockLead } from '../utils/crmHelpers.js';
import { AddActivityModal } from './AddActivityModal.jsx';
import { LeadScheduleFields } from './LeadScheduleFields.jsx';
import { RecurringLeadsPanel } from './RecurringLeadsPanel.jsx';
import { RecurringLeadImportModal } from './RecurringLeadImportModal.jsx';
import { LeadsBoard } from './LeadsBoard.jsx';
import {
  DEFAULT_LEAD_RECURRENCE_FREQUENCY,
  getDefaultLeadRecurrenceDate,
} from '../../shared/leadRecurrence.js';

export const LeadsView = ({
  revision = 0,
  createRequest = 0,
  onConsumeCreateRequest,
  stages = [],
  deals: contextualDeals = [],
  users,
  currentUser,
  branding,
  onCreateLead,
  onImportRecurringLeads,
  onRecurringChanged,
  onClearRecurringLeads,
  onUpdateLead,
  onDeleteLead,
  onConvertToDeal,
  onTransitionDealStage,
  onCreateActivity,
  onCreateNote,
  onCreateTask,
  onSubmitStageGateCheck,
  onApproveStageGateCheck,
  onRejectStageGateCheck,
  onOpenDrawer,
  onOpenLeadJourney
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('All');
  const [selectedOwner, setSelectedOwner] = useState('All');
  const [selectedStage, setSelectedStage] = useState('All');
  const [leadsView, setLeadsView] = useState(() => {
    try { return localStorage.getItem('crm.leadsView') === 'board' ? 'board' : 'detailed'; }
    catch { return 'detailed'; }
  });
  const [quickLeadFilter, setQuickLeadFilter] = useState('All'); // 'All' | 'MyLeads' | 'Outbound' | 'Inbound' | 'New'
  const [leadSection, setLeadSection] = useState('regular');
  const [recurringSearch, setRecurringSearch] = useState('');
  const [recurringStatus, setRecurringStatus] = useState('All');
  const [recurringOwner, setRecurringOwner] = useState('All');
  const [recurringDateFilter, setRecurringDateFilter] = useState('');
  const [recurrenceView, setRecurrenceView] = useState('All');
  const [recurringSort, setRecurringSort] = useState('recurrence-asc');
  const isAdmin = currentUser.role === 'Admin';

  // 3-Dots Menu & Action Modals State
  const [openMenuLeadId, setOpenMenuLeadId] = useState(null);

  // Modals for 3-dots actions
  const [activityModalLead, setActivityModalLead] = useState(null);

  // Close 3-dots dropdown when clicking anywhere outside
  React.useEffect(() => {
    const handleGlobalClick = () => setOpenMenuLeadId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Modal state for Edit/Add Lead
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [formValidationError, setFormValidationError] = useState('');
  const [isSavingLead, setIsSavingLead] = useState(false);
  const [customFieldsText, setCustomFieldsText] = useState('{}');
  const [isRecurringImportOpen, setIsRecurringImportOpen] = useState(false);
  const [isClearingRecurring, setIsClearingRecurring] = useState(false);
  const [recurringClearError, setRecurringClearError] = useState('');

  // Selection state for multi-delete
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    alternatePhone: '',
    companyName: '',
    source: 'Website',
    status: 'New',
    ownerId: currentUser.id,
    notes: '',
    isRecurring: false,
    recurrenceFrequency: null,
    recurrenceDate: '',
    recurrenceInterval: 1,
    recurrenceDays: [],
    category: '',
    location: '',
    lastContactedDate: '',
    nextFollowUpDate: ''
  });

  const page = useRecordsPage('leads', {
    q: searchQuery, source: selectedSource,
    owner: selectedOwner, stage: selectedStage, quick: quickLeadFilter, recurring: 'All'
  }, revision);
  const recurringPage = useRecordsPage('leads', {
    q: recurringSearch,
    owner: recurringOwner,
    status: recurringStatus,
    recurrenceDate: recurringDateFilter || 'All',
    recurring: 'true',
    sort: recurringSort,
    recurrenceView,
  }, revision);
  const showMockData = typeof window !== 'undefined' && localStorage.getItem('crm.showMockData') === 'true';
  const leads = useMemo(() => {
    return showMockData ? page.items : page.items.filter(lead => !isMockLead(lead));
  }, [page.items, showMockData]);
  const deals = [...leads.map(lead => lead.primaryDeal).filter(Boolean), ...contextualDeals];
  const filteredLeads = leads;

  const changeLeadsView = view => {
    setLeadsView(view);
    try { localStorage.setItem('crm.leadsView', view); } catch { /* Keep the current session usable when storage is blocked. */ }
  };
  const { MyLeads: myLeadsCount = 0, Outbound: outboundCount = 0,
    Inbound: inboundCount = 0, New: newCount = 0 } = page.facets || {};

  const handleToggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  const handleToggleSelectLead = (id) => {
    setSelectedLeadIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedLeadIds.length} selected leads?`)) {
      for (const id of selectedLeadIds) {
        await onDeleteLead(id);
      }
      setSelectedLeadIds([]);
    }
  };

  // 3-Dots Action Handlers
  const handleOpenAddActivityModal = (lead) => {
    setOpenMenuLeadId(null);
    setActivityModalLead(lead);
  };

  const handleSubmitActivityFromModal = async (payload) => {
    const { activityData, outcomeData, targetEntity } = payload;

    // 1. Create activity record
    if (onCreateActivity) {
      await onCreateActivity(activityData);
    }
    if (activityData.followUp) {
      setActivityModalLead(null);
      return;
    }

    const leadDeal = deals.find(d => d.leadId === targetEntity.id && !d.isRebuy) || deals.find(d => d.leadId === targetEntity.id);

    // 2. Stage & Status Updates
    if (outcomeData.shouldAdvanceStage && outcomeData.targetStageObj) {
      if (leadDeal && onTransitionDealStage) {
        await onTransitionDealStage(leadDeal.id, {
          targetStageId: outcomeData.targetStageObj.id,
          user: currentUser,
          answers: outcomeData.criteriaAnswers || {},
          note: activityData.description || outcomeData.summaryNote || '',
        });
      } else if (onUpdateLead) {
        await onUpdateLead(targetEntity.id, {
          status: outcomeData.newStatus || 'Qualified'
        });
      }
    } else if (outcomeData.requiresManagerApproval && outcomeData.targetStageObj) {
      const fromStg = outcomeData.fromStageObj || (leadDeal ? stages.find(s => s.id === leadDeal.stageId) : sortedStages[0]);
      const checkPayload = {
        dealId: leadDeal?.id || null,
        leadId: targetEntity.id,
        dealTitle: leadDeal?.title || targetEntity.title,
        leadTitle: targetEntity.title,
        fromStageId: fromStg?.id,
        fromStageName: fromStg?.name || 'New Lead',
        targetStageId: outcomeData.targetStageObj.id,
        targetStageName: outcomeData.targetStageObj.name,
        submittedBy: currentUser.id,
        submittedByName: currentUser.name,
        answers: outcomeData.criteriaAnswers || {},
        note: activityData.description || outcomeData.summaryNote || '',
        status: 'pending_review',
        outcome: 'advanced',
        badgeText: `Pending ${outcomeData.targetStageObj.name} Approval`
      };

      if (onSubmitStageGateCheck) {
        await onSubmitStageGateCheck(checkPayload);
      } else {
        throw new Error('Approval submission is unavailable. Try again after refreshing.');
      }
    } else {
      // Stage remains same, status = 'Follow up'
      if (onUpdateLead) {
        await onUpdateLead(targetEntity.id, {
          status: 'Follow up'
        });
      }
    }

    // 3. Create Follow-up Task for Assigned Rep
    if (onCreateTask && outcomeData.assignedOwnerId) {
      const activityTime = new Date(activityData.timestamp).toTimeString().slice(0, 8);
      await onCreateTask({
        title: `[Follow-up] ${activityData.type}: ${targetEntity.title}`,
        dueDate: `${outcomeData.dueDate || getLocalDateInputValueAfterDays(1)}T${activityTime}`,
        type: activityData.type === 'Meeting' ? 'Meeting' : 'Call',
        linkedType: 'Lead',
        linkedId: targetEntity.id,
        linkedTitle: targetEntity.title,
        ownerId: outcomeData.assignedOwnerId,
        ownerName: outcomeData.assignedOwnerName,
        status: 'pending',
        note: outcomeData.summaryNote
      });
    }

    setActivityModalLead(null);
  };

  const handleOpenAddModal = (isRecurring = false) => {
    setEditingLead(null);
    setFormValidationError('');
    setCustomFieldsText('{}');
    setFormData({
      title: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      alternatePhone: '',
      companyName: '',
      category: '',
      location: '',
      source: isRecurring ? '' : 'Website',
      isOutbound: isRecurring ? null : false,
      status: isRecurring ? '' : 'New',
      ownerId: isRecurring ? '' : currentUser.id,
      notes: '',
      isRecurring,
      recurrenceFrequency: isRecurring ? DEFAULT_LEAD_RECURRENCE_FREQUENCY : null,
      recurrenceDate: isRecurring ? getDefaultLeadRecurrenceDate() : '',
      recurrenceInterval: 1,
      recurrenceDays: [],
      lastContactedDate: '',
      nextFollowUpDate: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (lead) => {
    if (lead.isRecurring && !isAdmin) {
      setLeadSection('recurring');
      return;
    }
    setEditingLead(lead);
    setFormValidationError('');
    setCustomFieldsText(JSON.stringify(lead.customFields || {}, null, 2));
    setFormData({
      ...lead,
      contactName: lead.contactName || '',
      contactEmail: lead.contactEmail || '',
      contactPhone: lead.contactPhone || '',
      alternatePhone: lead.alternatePhone || '',
      companyName: lead.companyName || '',
      category: lead.category || '',
      location: lead.location || '',
      source: lead.source || '',
      ownerId: lead.ownerId || '',
      notes: lead.notes || '',
      recurrenceFrequency: lead.recurrenceFrequency || DEFAULT_LEAD_RECURRENCE_FREQUENCY,
      recurrenceDate: lead.recurrenceDate || getDefaultLeadRecurrenceDate(),
      recurrenceInterval: lead.recurrenceInterval ?? 1,
      recurrenceDays: lead.recurrenceDays || [],
      lastContactedDate: lead.lastContactedDate || '',
      nextFollowUpDate: lead.nextFollowUpDate || '',
    });
    setIsModalOpen(true);
  };

  const handleMoveToRecurring = async (lead) => {
    if (!isAdmin || !window.confirm(`Move "${lead.title}" to Recurring Leads? Existing lead details will be preserved.`)) return;
    await onUpdateLead(lead.id, {
      isRecurring: true,
      recurrenceFrequency: DEFAULT_LEAD_RECURRENCE_FREQUENCY,
      recurrenceDate: getDefaultLeadRecurrenceDate(),
      recurrenceInterval: 1,
      recurrenceDays: [],
    });
  };

  const handleClearRecurringLeads = async () => {
    if (!isAdmin || isClearingRecurring || !window.confirm(
      'Permanently delete all recurring leads in this workspace? This is not limited to the current page or filters. Leads with linked deals, tasks, notes, activity, or active attachments will prevent the entire clear. This cannot be undone.'
    )) return;
    setRecurringClearError('');
    setIsClearingRecurring(true);
    try {
      await onClearRecurringLeads();
      setRecurringSearch('');
      setRecurringStatus('All');
      setRecurringOwner('All');
      setRecurringDateFilter('');
      setRecurringSort('recurrence-asc');
      recurringPage.firstPage();
    } catch (error) {
      setRecurringClearError(error.message || 'Could not clear recurring leads.');
    } finally {
      setIsClearingRecurring(false);
    }
  };

  const handleRecurringImportComplete = result => {
    if (!result?.stats?.successfullyImported) return;
    setRecurringSearch('');
    setRecurringStatus('All');
    setRecurringOwner('All');
    setRecurringDateFilter('');
    setRecurringSort('recurrence-asc');
    recurringPage.firstPage();
  };

  React.useEffect(() => {
    if (!createRequest) return;
    handleOpenAddModal();
    onConsumeCreateRequest?.();
  }, [createRequest]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSavingLead) return;
    setFormValidationError('');

    const titleTrimmed = (formData.title || '').trim();
    const contactTrimmed = (formData.contactName || '').trim();

    if (!titleTrimmed || (!formData.isRecurring && !contactTrimmed)) {
      setFormValidationError(formData.isRecurring ? 'Lead name is required.' : 'Lead title and contact name are required.');
      return;
    }

    // Validation: Lead title cannot consist of only numbers (must include text/letters or string with numbers)
    if (!formData.isRecurring && (/^\d+$/.test(titleTrimmed) || !/[a-zA-Z]/.test(titleTrimmed))) {
      setFormValidationError('Lead Title cannot be purely numeric. Please include letters or descriptive text (e.g. "Lead 101" or "AeroTech Inquiry").');
      return;
    }

    if (!formData.isRecurring && (/^\d+$/.test(contactTrimmed) || !/[a-zA-Z]/.test(contactTrimmed))) {
      setFormValidationError('Contact Name cannot be purely numeric. Please enter a valid name (e.g. "David Miller").');
      return;
    }

    let customFields;
    try {
      customFields = JSON.parse(customFieldsText || '{}');
      if (!customFields || Array.isArray(customFields) || typeof customFields !== 'object' ||
        Object.values(customFields).some(value => !['string', 'number', 'boolean'].includes(typeof value) && value !== null)) {
        throw new Error();
      }
    } catch {
      setFormValidationError('Custom fields must be a JSON object with text, number, boolean, or null values.');
      return;
    }

    const { notes } = formData;
    const editable = ['title', 'contactName', 'contactEmail', 'contactPhone', 'alternatePhone', 'companyName', 'source', 'status', 'ownerId', 'notes', 'isRecurring', 'recurrenceFrequency', 'recurrenceDate', 'recurrenceInterval', 'recurrenceDays', 'category', 'location', 'lastContactedDate', 'nextFollowUpDate', 'isOutbound'];
    const leadFields = Object.fromEntries(editable.filter(key => key in formData).map(key => [key, formData[key]]));
    leadFields.notes = notes || '';
    leadFields.customFields = customFields;
    if (formData.isRecurring) {
      if (editingLead?.isRecurring) delete leadFields.nextFollowUpDate;
      leadFields.ownerId = formData.ownerId || null;
      leadFields.recurrenceInterval = Number(formData.recurrenceInterval) || 1;
      leadFields.recurrenceDays = formData.recurrenceDays || [];
      if (formData.recurrenceFrequency === 'monthly_dates' && !leadFields.recurrenceDays.length) {
        setFormValidationError('Choose at least one day of the month.');
        return;
      }
    } else {
      delete leadFields.recurrenceFrequency;
      delete leadFields.recurrenceDate;
      delete leadFields.recurrenceInterval;
      leadFields.isRecurring = false;
    }
    setIsSavingLead(true);
    try {
      const saved = editingLead
        ? await onUpdateLead(editingLead.id, leadFields)
        : await onCreateLead(leadFields);
      if (!formData.isRecurring && notes?.trim() && saved?.id && onCreateNote) {
        try {
          await onCreateNote({
            text: notes.trim(), linkedType: 'Lead', linkedId: saved.id,
            authorId: currentUser.id, authorName: currentUser.name,
          });
        } catch {
          // The lead was saved; the note endpoint already reports its own error.
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      setFormValidationError(error.message || 'Could not save this lead. Try again.');
    } finally {
      setIsSavingLead(false);
    }
  };

  if ((leadSection === 'recurring' ? recurringPage : page).loading) return <LeadsSkeleton recurring={leadSection === 'recurring'} />;

  return (
    <div className={`p-6 md:p-8 space-y-6 bg-[#F6F7F8] text-[#12161C] ${leadSection === 'recurring' ? 'md:h-full md:flex md:flex-col md:min-h-0 md:overflow-hidden md:space-y-4' : 'min-h-full'}`}>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl shadow-2xs shrink-0">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#12161C] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#1D4E63]" />
            <span>Leads</span>
          </h1>
          <p className="text-xs text-[#5B6472] mt-1 font-medium">
            Manage prospects, repeat opportunities, and follow-up accountability
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {leadSection === 'recurring' && isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setIsRecurringImportOpen(true)}
                className="px-4 py-2 bg-[#FFFFFF] hover:bg-[#F6F7F8] text-[#1D4E63] border border-[#D8E8EF] rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4" aria-hidden="true" />
                <span>Import Companies</span>
              </button>
              <details className="relative">
                <summary className="cursor-pointer rounded-lg border border-[#E3E6EA] px-3 py-2 text-xs font-semibold">More options</summary>
                <button
                  type="button"
                  onClick={handleClearRecurringLeads}
                  disabled={!onClearRecurringLeads || isClearingRecurring}
                  className="px-4 py-2 bg-[#FFFFFF] hover:bg-[#FDF2F1] text-[#922D27] border border-[#F4C4C1] rounded-xl text-xs font-bold flex items-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#922D27] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  <span>{isClearingRecurring ? 'Deleting…' : 'Delete all recurring leads'}</span>
                </button>
              </details>
            </>
          )}
          {leadSection === 'regular' && selectedLeadIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-[#B5423A] hover:bg-[#96342E] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-2xs"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedLeadIds.length})</span>
            </button>
          )}

          {(leadSection === 'regular' || isAdmin) && (
            <button
              onClick={() => handleOpenAddModal(leadSection === 'recurring')}
              className="px-4 py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>{leadSection === 'recurring' ? 'Add Recurring Lead' : 'Add New Lead'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-[#E3E6EA] shrink-0">
        <div role="tablist" aria-label="Lead type" className="flex min-w-0 items-center gap-2">
          {[
            { id: 'regular', label: 'All Leads', count: page.facets?.All || 0 },
            { id: 'recurring', label: 'Recurring Leads', count: recurringPage.total },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={leadSection === tab.id}
              onClick={() => {
                setLeadSection(tab.id);
                setSelectedLeadIds([]);
              }}
              className={`relative -mb-px flex min-h-10 items-center gap-2 border px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4E63] ${leadSection === tab.id
                ? 'border-[#1D4E63] bg-white text-[#1D4E63]'
                : 'border-transparent bg-transparent text-[#5B6472] hover:border-[#D8E8EF] hover:text-[#12161C]'
                }`}
            >
              <span>{tab.label}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${leadSection === tab.id ? 'bg-[#EFF6F9]' : 'bg-[#F6F7F8]'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div role="group" aria-label="Lead view" className="ml-auto inline-flex shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1">
          <button type="button" aria-pressed={leadsView === 'detailed'} onClick={() => changeLeadsView('detailed')}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${leadsView === 'detailed' ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'}`}>
            <List size={15} aria-hidden="true" />Detailed
          </button>
          <button type="button" aria-pressed={leadsView === 'board'} onClick={() => changeLeadsView('board')}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${leadsView === 'board' ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'}`}>
            <LayoutGrid size={15} aria-hidden="true" />Board
          </button>
        </div>
      </div>

      {leadSection === 'regular' && (
        <>
          {/* Filter Bar */}
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#E3E6EA] bg-white p-4">

            {/* Search */}
            <label className="min-w-48 flex-1 text-xs font-semibold text-[#5B6472]">Search leads
              <div className="relative mt-1">
                <Search className="w-4 h-4 text-[#5B6472] absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title, contact, company..."
                  className="min-h-10 w-full rounded-lg border border-[#E3E6EA] bg-white py-2 pl-10 pr-4 text-sm text-[#12161C] placeholder-[#8A929E] focus:outline-none focus:border-[#1D4E63]"
                />
              </div>
            </label>

            {/* Source Filter */}
            <label className="min-w-36 text-xs font-semibold text-[#5B6472]">Type
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="mt-1 block min-h-10 w-full rounded-lg border border-[#E3E6EA] bg-white px-3 py-2 text-sm text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
              >
                <option value="All">All Sources</option>
                <option value="Outbound">Cold Outbound Effort</option>
                <option value="Inbound">Inbound Inquiry</option>
                <option value="Website">Website</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Trade Show">Trade Show</option>
              </select>
            </label>

            {/* Owner Filter */}
            <label className="min-w-36 text-xs font-semibold text-[#5B6472]">Owner
              <select
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="mt-1 block min-h-10 w-full rounded-lg border border-[#E3E6EA] bg-white px-3 py-2 text-sm text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
              >
                <option value="All">{currentUser.role === 'Sales Rep' ? 'My leads' : 'All Reps'}</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </label>

            {/* Pipeline Stage Filter */}
            <label className="min-w-36 text-xs font-semibold text-[#5B6472]">Stage
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="mt-1 block min-h-10 w-full rounded-lg border border-[#E3E6EA] bg-white px-3 py-2 text-sm text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
              >
                <option value="All">All Stages</option>
                {stages.map(stg => (
                  <option key={stg.id} value={stg.id}>{stg.name}</option>
                ))}
              </select>
            </label>

          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'All', label: 'All Leads', count: page.facets?.All || 0 },
              { id: 'MyLeads', label: 'My Leads', count: myLeadsCount },
              { id: 'Outbound', label: 'Outbound Leads', count: outboundCount },
              { id: 'Inbound', label: 'Inbound Inquiries', count: inboundCount },
              { id: 'New', label: 'New Uncontacted', count: newCount }
            ].map(chip => (
              <button
                key={chip.id}
                onClick={() => setQuickLeadFilter(chip.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border ${quickLeadFilter === chip.id
                  ? 'bg-[#1D4E63] text-white border-[#1D4E63] shadow-2xs'
                  : 'bg-[#FFFFFF] hover:bg-[#F6F7F8] text-[#5B6472] hover:text-[#12161C] border-[#E3E6EA]'
                  }`}
              >
                <span>{chip.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-extrabold ${quickLeadFilter === chip.id ? 'bg-white/20 text-white' : 'bg-[#F6F7F8] text-[#5B6472]'
                  }`}>
                  {chip.count}
                </span>
              </button>
            ))}
          </div>

          <RecordPagination page={page} label="leads" />

          {/* Responsive Mobile Cards View (< md) */}
          {leadsView === 'board' && <LeadsBoard leads={filteredLeads} stages={stages} deals={deals} users={users}
            currentUser={currentUser} onOpenLeadJourney={onOpenLeadJourney} onOpenDrawer={onOpenDrawer}
            onTransitionDealStage={onTransitionDealStage} onSubmitStageGateCheck={onSubmitStageGateCheck}
            onApproveStageGateCheck={onApproveStageGateCheck} onRejectStageGateCheck={onRejectStageGateCheck} />}

          <div className={`${leadsView === 'detailed' ? 'block md:hidden' : 'hidden'} space-y-3`}>
            {filteredLeads.length === 0 ? (
              <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl p-6 text-center text-xs text-[#5B6472]">
                No leads found matching criteria.
              </div>
            ) : (
              filteredLeads.map(lead => {
                const isSelected = selectedLeadIds.includes(lead.id);
                const leadDeal = deals.find(d => d.leadId === lead.id && !d.isRebuy) || deals.find(d => d.leadId === lead.id);
                const currentStageName = leadDeal ? leadDeal.stageName : 'New Lead';
                const currentStageObj = stages.find(s => s.id === leadDeal?.stageId);

                return (
                  <div
                    key={lead.id}
                    onClick={(e) => {
                      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) return;
                      if (onOpenLeadJourney) onOpenLeadJourney(lead);
                      else if (onOpenDrawer) onOpenDrawer('lead', lead);
                      else handleOpenEditModal(lead);
                    }}
                    className={`bg-[#FFFFFF] border rounded-2xl p-4 space-y-3 transition-colors cursor-pointer ${isSelected ? 'border-[#1D4E63] bg-[#F6F7F8]' : 'border-[#E3E6EA]'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectLead(lead.id)}
                          className="w-4 h-4 rounded border-[#E3E6EA] bg-[#F6F7F8] text-[#1D4E63] focus:ring-0 cursor-pointer"
                        />
                        <div>
                          <h3 className="font-display font-bold text-xs text-[#12161C]">{lead.title}</h3>
                          {lead.isRecurring && <span className="inline-flex items-center gap-1 text-xs text-[#1D4E63]"><Repeat size={12} />Recurring</span>}
                          <div className="text-[11px] text-[#5B6472] flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-[#5B6472]" />
                            <span>{lead.companyName || 'Unlinked Company'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 relative">
                        <button
                          onClick={() => handleOpenEditModal(lead)}
                          className="p-1.5 text-[#5B6472] hover:text-[#12161C] hover:bg-[#F6F7F8] rounded-lg transition-colors"
                          title="Edit Lead"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuLeadId(openMenuLeadId === lead.id ? null : lead.id);
                            }}
                            className="p-1.5 text-[#5B6472] hover:text-[#12161C] hover:bg-[#F6F7F8] rounded-lg transition-colors"
                            title="Lead Quick Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openMenuLeadId === lead.id && (
                            <div
                              className="absolute right-0 mt-1 w-44 bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl shadow-xl z-50 py-1 text-left text-xs font-semibold text-[#12161C]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  setOpenMenuLeadId(null);
                                  if (onOpenLeadJourney) onOpenLeadJourney(lead);
                                }}
                                className="w-full px-3.5 py-2 hover:bg-[#F6F7F8] flex items-center gap-2 text-[#12161C] transition-colors"
                              >
                                <Layers className="w-3.5 h-3.5 text-[#1D4E63]" />
                                <span>Lead Journey</span>
                              </button>
                              <button
                                onClick={() => {
                                  setOpenMenuLeadId(null);
                                  if (onOpenDrawer) onOpenDrawer('lead', lead);
                                }}
                                className="w-full px-3.5 py-2 hover:bg-[#F6F7F8] flex items-center gap-2 text-[#12161C] transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-[#1D4E63]" />
                                <span>Open Lead 360</span>
                              </button>
                              {isAdmin && !lead.isRecurring && (
                                <button
                                  onClick={() => handleMoveToRecurring(lead)}
                                  className="w-full px-3.5 py-2 hover:bg-[#F6F7F8] flex items-center gap-2 text-[#12161C] transition-colors"
                                >
                                  <Repeat className="w-3.5 h-3.5 text-[#1D4E63]" />
                                  <span>Move to Recurring Leads</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenAddActivityModal(lead)}
                                className="w-full px-3.5 py-2 hover:bg-[#F6F7F8] flex items-center gap-2 text-[#12161C] transition-colors"
                              >
                                <Calendar className="w-3.5 h-3.5 text-[#3F7A5C]" />
                                <span>Add Activity</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-[#5B6472] pt-2 border-t border-[#E3E6EA] gap-2">
                      <div>
                        <span className="font-bold text-[#12161C]">{lead.contactName}</span>
                        {lead.contactEmail && <span className="block text-[10px] text-[#5B6472] font-mono">{lead.contactEmail}</span>}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(() => {
                          const badgeStyle = getStageBadgeStyle(currentStageObj || {});
                          return (
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeStyle.badgeClass}`}>
                              {currentStageName}
                            </span>
                          );
                        })()}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${lead.isOutbound === true
                          ? 'bg-[#FEF8EC] text-[#965700] border-[#F5DDA9]'
                          : 'bg-[#EFF6F9] text-[#1D4E63] border-[#D8E8EF]'
                          }`}>
                          {lead.isOutbound === true ? 'Outbound' : lead.isOutbound === false ? 'Inbound' : 'Unavailable'}
                        </span>
                      </div>
                    </div>



                    <div className="flex items-center justify-between text-[10px] text-[#5B6472] pt-1 font-mono">
                      <span>Assigned: {lead.ownerName || 'Unassigned'}</span>
                      <span>{formatDate(lead.lastActivityDate)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Leads Table (>= md) */}
          <div className={`${leadsView === 'detailed' ? 'hidden md:block' : 'hidden'} bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm`}>
            <div className="overflow-x-auto max-h-[640px] overflow-y-auto no-scrollbar pb-10">
              <table className="w-full text-left text-xs text-[var(--ink)]">
                <thead className="sticky top-0 z-10 bg-[var(--canvas)] text-[var(--ink-muted)] uppercase font-mono font-bold text-[10px] tracking-wider border-b border-[var(--border)] shadow-xs">
                  <tr>
                    <th scope="col" className="px-4 py-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length}
                        onChange={handleToggleSelectAll}
                        aria-label="Select all leads"
                        className="w-4 h-4 rounded border-[var(--border)] bg-[var(--surface)] text-[var(--primary-700)] focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th scope="col" className="px-4 py-3.5">Lead / Company</th>
                    <th scope="col" className="px-4 py-3.5">Pipeline Stage</th>
                    <th scope="col" className="px-4 py-3.5">Contact</th>
                    <th scope="col" className="px-4 py-3.5">Source & Effort</th>
                    <th scope="col" className="px-4 py-3.5">Assigned Owner</th>
                    <th scope="col" className="px-4 py-3.5">Last Activity</th>
                    <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-[#5B6472]">
                        <div className="max-w-xs mx-auto space-y-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-[#EFF6F9] text-[#1D4E63] flex items-center justify-center mx-auto border border-[#D8E8EF]">
                            <Users className="w-5 h-5" />
                          </div>
                          <p className="font-bold text-xs text-[#12161C]">No leads match your active filters</p>
                          <p className="text-[11px] text-[#5B6472]">Try clearing search or switch to another filter chip.</p>
                          <button
                            onClick={handleOpenAddModal}
                            className="mt-1 px-3 py-1.5 bg-[#1D4E63] hover:bg-[#153B4B] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create New Lead</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead, idx) => {
                      const isSelected = selectedLeadIds.includes(lead.id);
                      const leadDeal = deals.find(d => d.leadId === lead.id && !d.isRebuy) || deals.find(d => d.leadId === lead.id);
                      const currentStageName = leadDeal ? leadDeal.stageName : lead.isRecurring ? 'Buy Again (Renewal)' : 'New Lead';
                      const currentStageObj = stages.find(s => s.id === leadDeal?.stageId) || (lead.isRecurring ? stages.find(s => s.category === 'Buy Again' || s.name === 'Buy Again (Renewal)' || s.id === 'stg-7') : null);
                      const isLowerRow = idx >= Math.max(0, filteredLeads.length - 2);

                      return (
                        <tr
                          key={lead.id}
                          onClick={(e) => {
                            if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) return;
                            if (onOpenLeadJourney) onOpenLeadJourney(lead);
                            else if (onOpenDrawer) onOpenDrawer('lead', lead);
                            else handleOpenEditModal(lead);
                          }}
                          className={`transition-colors cursor-pointer ${isSelected ? 'bg-[#EFF6F9]' : 'hover:bg-[#EFF6F9]/50'}`}
                        >
                          {/* Select Checkbox */}
                          <td className="px-4 py-3.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectLead(lead.id)}
                              className="w-4 h-4 rounded border-[#E3E6EA] bg-[#FFFFFF] text-[#1D4E63] focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* Title & Company */}
                          <td className="px-4 py-3.5">
                            <div className="font-display font-bold text-[#12161C]">{lead.title}</div>
                            {lead.isRecurring && <span className="inline-flex items-center gap-1 text-xs text-[#1D4E63]"><Repeat size={12} />Recurring</span>}
                            <div className="text-[11px] text-[#5B6472] flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 text-[#5B6472]" />
                              <span>{lead.companyName || 'Unlinked Company'}</span>
                            </div>
                          </td>

                          {/* Pipeline Stage Badge */}
                          <td className="px-4 py-3.5">
                            {(() => {
                              const badgeStyle = getStageBadgeStyle(currentStageObj || {});
                              const isPendingApproval = lead.status === 'Pending Review' || Boolean(leadDeal?.pendingGateCheck);

                              return (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block shadow-2xs border ${badgeStyle.badgeClass}`}>
                                    {currentStageName}
                                  </span>
                                  {isPendingApproval && (
                                    <span className="text-[10px] font-mono font-bold text-[#965700] bg-[#FEF8EC] border border-[#F5DDA9] px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                      <Clock className="w-3 h-3 text-[#965700]" />
                                      <span>Pending Stage Approval</span>
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>

                          {/* Contact */}
                          <td className="px-4 py-3.5">
                            <div className="text-[#12161C] font-bold">{lead.contactName}</div>
                            <div className="text-[10px] text-[#5B6472] flex items-center gap-2 mt-0.5 font-mono">
                              {lead.contactEmail && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-[#5B6472]" />
                                  {lead.contactEmail}
                                </span>
                              )}
                              {lead.contactPhone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-[#5B6472]" />
                                  {lead.contactPhone}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Source & Effort */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${lead.isOutbound === true
                                ? 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]'
                                : 'bg-[#FFFFFF] text-[#12161C] border-[#E3E6EA]'
                                }`}>
                                {lead.isOutbound === true ? 'Cold Outbound' : lead.isOutbound === false ? 'Inbound' : 'Unavailable'}
                              </span>
                              {lead.source && <span className="text-[10px] text-[#5B6472] font-mono">({lead.source})</span>}
                            </div>
                          </td>

                          {/* Assigned Owner */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-[#1D4E63] text-white text-[10px] font-extrabold flex items-center justify-center">
                                {lead.ownerName ? lead.ownerName.charAt(0) : 'U'}
                              </div>
                              <span className="text-[#12161C] font-semibold">{lead.ownerName || 'Unassigned'}</span>
                            </div>
                          </td>

                          {/* Last Activity */}
                          <td className="px-4 py-3.5 text-[#5B6472] text-[11px] font-mono">
                            {formatDate(lead.lastActivityDate)}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5 relative">
                              {lead.status === 'Qualified' && !leadDeal && onConvertToDeal && (
                                <button
                                  onClick={() => onConvertToDeal(lead)}
                                  className="px-2.5 py-1 bg-[#1D4E63] hover:bg-[#153B4B] text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                                  title="Convert to Deal"
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                  <span>Convert</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEditModal(lead)}
                                className="p-1.5 text-[#5B6472] hover:text-[#12161C] hover:bg-[#F6F7F8] rounded-lg transition-colors"
                                title="Edit Lead"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuLeadId(openMenuLeadId === lead.id ? null : lead.id);
                                  }}
                                  className="p-1.5 text-[#5B6472] hover:text-[#12161C] hover:bg-[#F6F7F8] rounded-lg transition-colors"
                                  title="Lead Quick Actions"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {openMenuLeadId === lead.id && (
                                  <div
                                    className={`absolute right-0 w-44 bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl shadow-xl z-50 py-1 text-left text-xs font-semibold text-[#12161C] ${isLowerRow ? 'bottom-full mb-1' : 'top-full mt-1'
                                      }`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => {
                                        setOpenMenuLeadId(null);
                                        if (onOpenLeadJourney) onOpenLeadJourney(lead);
                                      }}
                                      className="w-full px-3.5 py-2 hover:bg-[#F6F7F8] flex items-center gap-2 text-[#12161C] transition-colors"
                                    >
                                      <Layers className="w-3.5 h-3.5 text-[#1D4E63]" />
                                      <span>Lead Journey</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenMenuLeadId(null);
                                        if (onOpenDrawer) onOpenDrawer('lead', lead);
                                      }}
                                      className="w-full px-3.5 py-2 hover:bg-[#F6F7F8] flex items-center gap-2 text-[#12161C] transition-colors"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5 text-[#1D4E63]" />
                                      <span>Open Lead 360</span>
                                    </button>
                                    {isAdmin && !lead.isRecurring && (
                                      <button
                                        onClick={() => handleMoveToRecurring(lead)}
                                        className="w-full px-3.5 py-2 hover:bg-[#F6F7F8] flex items-center gap-2 text-[#12161C] transition-colors"
                                      >
                                        <Repeat className="w-3.5 h-3.5 text-[#1D4E63]" />
                                        <span>Move to Recurring Leads</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleOpenAddActivityModal(lead)}
                                      className="w-full px-3.5 py-2 hover:bg-[#F6F7F8] flex items-center gap-2 text-[#12161C] transition-colors"
                                    >
                                      <Calendar className="w-3.5 h-3.5 text-[#3F7A5C]" />
                                      <span>Add Activity</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>)}

      {leadSection === 'recurring' && <>
        {recurringClearError && <p role="alert" className="text-sm text-[#922D27]">{recurringClearError}</p>}
        <RecurringLeadsPanel page={recurringPage} search={recurringSearch} onSearch={setRecurringSearch}
          owner={recurringOwner} onOwner={setRecurringOwner} sort={recurringSort} onSort={setRecurringSort}
          view={recurrenceView} onView={setRecurrenceView} users={users} currentUser={currentUser}
          onChanged={onRecurringChanged} onEdit={handleOpenEditModal} onDelete={onDeleteLead} onOpen={lead => onOpenDrawer?.('lead', lead)}
          stages={stages} hideRecords={leadsView === 'board'} />
        {leadsView === 'board' && <LeadsBoard leads={recurringPage.items} stages={stages} deals={deals} users={users}
          currentUser={currentUser} onOpenLeadJourney={onOpenLeadJourney} onOpenDrawer={onOpenDrawer}
          onTransitionDealStage={onTransitionDealStage} onSubmitStageGateCheck={onSubmitStageGateCheck}
          onApproveStageGateCheck={onApproveStageGateCheck} onRejectStageGateCheck={onRejectStageGateCheck} />}
      </>}

      {/* Add / Edit Lead Modal */}
      {isModalOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="lead-form-title" className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl text-[#12161C]">

            <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
              <h2 id="lead-form-title" className="font-display text-sm font-bold text-[#12161C]">
                {editingLead
                  ? formData.isRecurring ? 'Edit Recurring Lead' : 'Edit Lead Opportunity'
                  : formData.isRecurring ? 'Create Recurring Lead' : 'Create New Lead Opportunity'}
              </h2>
              <button
                aria-label="Close lead form"
                disabled={isSavingLead}
                onClick={() => setIsModalOpen(false)}
                className="text-[#5B6472] hover:text-[#12161C] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs max-h-[75vh] overflow-y-auto pr-1">
              {formValidationError && (
                <div className="p-3 bg-[#FDF2F1] border border-[#F4C4C1] rounded-xl text-[#922D27] text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#922D27] shrink-0" />
                  <span>{formValidationError}</span>
                </div>
              )}

              <div>
                <label className="block text-[#5B6472] font-semibold mb-1">
                  {formData.isRecurring ? 'Lead Name *' : 'Lead Opportunity Title *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={formData.isRecurring ? 'Enter the lead name' : 'e.g. AeroTech Circuit Thermal Pads Supply'}
                  className={`w-full bg-[#F6F7F8] border rounded-xl p-2.5 text-[#12161C] focus:outline-none ${!formData.isRecurring && /^\d+$/.test((formData.title || '').trim()) && formData.title.trim().length > 0
                    ? 'border-[#B5423A] focus:border-[#B5423A]'
                    : 'border-[#E3E6EA] focus:border-[#1D4E63]'
                    }`}
                />
                {!formData.isRecurring && /^\d+$/.test((formData.title || '').trim()) && formData.title.trim().length > 0 && (
                  <p className="text-[11px] text-[#922D27] font-semibold mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-[#922D27]" />
                    <span>Title cannot be only numbers. Must include letters or text (e.g. "Lead 123").</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Contact Name{formData.isRecurring ? '' : ' *'}</label>
                  <input
                    type="text"
                    required={!formData.isRecurring}
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="e.g. David Miller"
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                  />
                </div>
                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Company Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. AeroTech Solutions"
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+1 (512) 555-0100"
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
                  >
                    {formData.isRecurring && <option value="">Unavailable</option>}
                    <option value="Website">Website</option>
                    <option value="Cold Outbound">Cold Outbound</option>
                    <option value="Inbound Inquiry">Inbound Inquiry</option>
                    <option value="Referral">Referral</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Trade Show">Trade Show</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Status</label>
                  <select
                    value={formData.status || ''}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
                  >
                    {formData.isRecurring ? (
                      <>
                        <option value="Buy Again (Renewal)">Buy Again (Renewal)</option>
                        <option value="Contact Attempted">Contact Attempted</option>
                        <option value="Purchase Confirmed">Purchase Confirmed</option>
                        <option value="Renewal Postponed">Renewal Postponed</option>
                        <option value="Paused">Paused</option>
                      </>
                    ) : (
                      <>
                        {!formData.status && <option value="">Select status</option>}
                        <option value="New">New</option>
                        <option value="Working">Working</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Unqualified">Unqualified</option>
                        <option value="Converted">Converted</option>
                        <option value="Follow up">Follow up</option>
                        <option value="Pending Review">Pending Review</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label htmlFor="lead-owner" className="block text-[#5B6472] font-semibold mb-1">Assigned Owner</label>
                  <select
                    id="lead-owner"
                    value={formData.ownerId}
                    onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
                  >
                    {formData.isRecurring && <option value="">Unassigned</option>}
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Alternate Phone</label>
                  <input
                    type="text"
                    value={formData.alternatePhone || ''}
                    onChange={event => setFormData({ ...formData, alternatePhone: event.target.value })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                  />
                </div>
                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Lead Category</label>
                  <input
                    type="text"
                    value={formData.category || ''}
                    onChange={event => setFormData({ ...formData, category: event.target.value })}
                    placeholder="Optional"
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={event => setFormData({ ...formData, location: event.target.value })}
                    placeholder="Optional"
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                  />
                </div>
                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Lead Type</label>
                  <select
                    value={formData.isOutbound == null ? '' : formData.isOutbound ? 'outbound' : 'inbound'}
                    onChange={event => setFormData({ ...formData, isOutbound: event.target.value === '' ? null : event.target.value === 'outbound' })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                  >
                    {(formData.isRecurring || formData.isOutbound == null) && <option value="">Unavailable</option>}
                    <option value="inbound">Inbound</option>
                    <option value="outbound">Outbound</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Last Contacted</label>
                  <input
                    type="date"
                    value={formData.lastContactedDate || ''}
                    onChange={event => setFormData({ ...formData, lastContactedDate: event.target.value })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                  />
                </div>
                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Next Follow-up</label>
                  <input
                    type="date"
                    readOnly={Boolean(editingLead?.isRecurring)}
                    value={formData.nextFollowUpDate || ''}
                    onChange={event => setFormData({ ...formData, nextFollowUpDate: event.target.value })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                  />
                </div>
              </div>

              {formData.isRecurring && <LeadScheduleFields value={formData} onChange={setFormData} existingSchedule={Boolean(editingLead?.isRecurring)} />}

              <div>
                <label className="block text-[#5B6472] font-semibold mb-1">Additional custom fields (JSON)</label>
                <textarea
                  rows={3}
                  value={customFieldsText}
                  onChange={event => setCustomFieldsText(event.target.value)}
                  spellCheck="false"
                  placeholder="{}"
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 font-mono text-[11px] text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                />
              </div>

              <div>
                <label className="block text-[#5B6472] font-semibold mb-1">{formData.isRecurring ? 'Notes and remarks' : 'Initial Notes'}</label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Key background info or sample testing requirements..."
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E3E6EA]">
                <button
                  type="button"
                  disabled={isSavingLead}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#F6F7F8] hover:bg-[#EEF0F3] text-[#5B6472] rounded-full font-semibold border border-[#E3E6EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingLead}
                  className="px-5 py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white rounded-full font-bold shadow-2xs"
                >
                  {isSavingLead ? 'Saving…' : 'Save Lead'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 1. ADD ACTIVITY MODAL WITH INTEGRATED STAGE QUALIFICATION & AUTO FOLLOW-UP */}
      {isRecurringImportOpen && (
        <RecurringLeadImportModal
          isOpen
          onClose={() => setIsRecurringImportOpen(false)}
          onImport={onImportRecurringLeads}
          users={users}
          onImported={handleRecurringImportComplete}
        />
      )}

      <AddActivityModal
        isOpen={Boolean(activityModalLead)}
        onClose={() => setActivityModalLead(null)}
        targetEntity={activityModalLead}
        entityType="Lead"
        stages={stages}
        deals={deals}
        users={users}
        currentUser={currentUser}
        onSubmitActivity={handleSubmitActivityFromModal}
      />

    </div>
  );
};
