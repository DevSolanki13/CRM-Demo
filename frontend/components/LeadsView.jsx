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
  ExternalLink,
  Repeat,
  CalendarClock,
  Upload
} from 'lucide-react';
import { formatDate, getStageBadgeStyle, getLocalDateInputValue, getLocalDateInputValueAfterDays } from '../utils/crmHelpers.js';
import { AddActivityModal } from './AddActivityModal.jsx';
import { RecurringLeadImportModal } from './RecurringLeadImportModal.jsx';
import {
  DEFAULT_LEAD_RECURRENCE_FREQUENCY,
  getDefaultLeadRecurrenceDate,
  getNextLeadRecurrenceDate,
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
  const [quickLeadFilter, setQuickLeadFilter] = useState('All'); // 'All' | 'MyLeads' | 'Outbound' | 'Inbound' | 'New'
  const [leadSection, setLeadSection] = useState('regular');
  const [recurringSearch, setRecurringSearch] = useState('');
  const [recurringStatus, setRecurringStatus] = useState('All');
  const [recurringOwner, setRecurringOwner] = useState('All');
  const [recurringDateFilter, setRecurringDateFilter] = useState('');
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
    recurrenceInterval: null,
    category: '',
    location: '',
    lastContactedDate: '',
    nextFollowUpDate: ''
  });

  const page = useRecordsPage('leads', { q: searchQuery, source: selectedSource,
    owner: selectedOwner, stage: selectedStage, quick: quickLeadFilter, recurring: 'false' }, revision, leadSection === 'regular');
  const recurringPage = useRecordsPage('leads', {
    q: recurringSearch,
    owner: recurringOwner,
    status: recurringStatus,
    recurrenceDate: recurringDateFilter || 'All',
    recurring: 'true',
    sort: recurringSort,
  }, revision, leadSection === 'recurring');
  const leads = page.items;
  const deals = [...leads.map(lead => lead.primaryDeal).filter(Boolean), ...contextualDeals];
  const filteredLeads = leads;
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
      recurrenceInterval: null,
      lastContactedDate: '',
      nextFollowUpDate: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (lead) => {
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
      recurrenceInterval: lead.recurrenceInterval ?? '',
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
      recurrenceInterval: null,
    });
  };

  const handleMoveToRegular = async (lead) => {
    if (!isAdmin || !window.confirm(`Move "${lead.title}" back to regular leads? Existing lead details will be preserved.`)) return;
    await onUpdateLead(lead.id, {
      isRecurring: false,
      recurrenceFrequency: null,
      recurrenceDate: null,
      recurrenceInterval: null,
    });
  };

  const handleDeleteRecurring = async (lead) => {
    if (!isAdmin || !window.confirm(`Delete "${lead.title}" permanently? This cannot be undone.`)) return;
    await onDeleteLead(lead.id);
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

    const { notes, ...leadFields } = formData;
    leadFields.notes = notes || '';
    leadFields.customFields = customFields;
    if (formData.isRecurring) {
      leadFields.ownerId = formData.ownerId || null;
      leadFields.recurrenceInterval = formData.recurrenceFrequency === 'custom' && formData.recurrenceInterval !== ''
        ? Number(formData.recurrenceInterval) : null;
      if (formData.recurrenceFrequency === 'custom' && !leadFields.recurrenceInterval) {
        setFormValidationError('Enter the custom recurrence interval in days.');
        return;
      }
    } else {
      delete leadFields.recurrenceFrequency;
      delete leadFields.recurrenceDate;
      delete leadFields.recurrenceInterval;
      leadFields.isRecurring = false;
    }
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
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#F6F7F8] min-h-screen text-[#12161C]">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl shadow-2xs">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#12161C] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#1D4E63]" />
            <span>Lead Management Ledger</span>
          </h1>
          <p className="text-xs text-[#5B6472] mt-1 font-medium">
            Track inbound inquiries & cold outbound lead generation pipeline
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
              <button
                type="button"
                onClick={handleClearRecurringLeads}
                disabled={!onClearRecurringLeads || isClearingRecurring}
                className="px-4 py-2 bg-[#FFFFFF] hover:bg-[#FDF2F1] text-[#922D27] border border-[#F4C4C1] rounded-xl text-xs font-bold flex items-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#922D27] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span>{isClearingRecurring ? 'Clearing…' : 'Clear All'}</span>
              </button>
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

      <div role="tablist" aria-label="Lead type" className="flex items-center gap-2 border-b border-[#E3E6EA]">
        {[
          { id: 'regular', label: 'New / Uncontacted Leads', count: page.facets?.New || 0 },
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
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-[#1D4E63] ${
              leadSection === tab.id
                ? 'border-[#1D4E63] text-[#1D4E63]'
                : 'border-transparent text-[#5B6472] hover:text-[#12161C]'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${leadSection === tab.id ? 'bg-[#EFF6F9]' : 'bg-[#F6F7F8]'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className={`${leadSection === 'regular' ? 'flex' : 'hidden'} bg-[#FFFFFF] border border-[#E3E6EA] p-4 rounded-2xl flex-col md:flex-row items-stretch md:items-center gap-3 shadow-2xs`}>

        {/* Search */}
        <div className="w-full sm:w-64 relative shrink-0">
          <Search className="w-4 h-4 text-[#5B6472] absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, contact, company..."
            className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl pl-10 pr-4 py-2 text-xs text-[#12161C] placeholder-[#5B6472] focus:outline-none focus:border-[#1D4E63]"
          />
        </div>

        {/* Source Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#5B6472] font-semibold">Type:</span>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl px-3 py-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
          >
            <option value="All">All Sources</option>
            <option value="Outbound">Cold Outbound Effort</option>
            <option value="Inbound">Inbound Inquiry</option>
            <option value="Website">Website</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Trade Show">Trade Show</option>
          </select>
        </div>

        {/* Owner Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#5B6472] font-semibold">Owner:</span>
          <select
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl px-3 py-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
          >
            <option value="All">{currentUser.role === 'Sales Rep' ? 'My leads' : 'All Reps'}</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Pipeline Stage Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#5B6472] font-semibold">Stage:</span>
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl px-3 py-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
          >
            <option value="All">All Stages</option>
            {stages.map(stg => (
              <option key={stg.id} value={stg.id}>{stg.name}</option>
            ))}
          </select>
        </div>

      </div>

      <div className={leadSection === 'regular' ? '' : 'hidden'}>
        <RecordPagination page={page} label="leads" />
      </div>

      {/* Quick Filter Chips */}
      <div className={`${leadSection === 'regular' ? 'flex' : 'hidden'} items-center gap-2 overflow-x-auto no-scrollbar py-1`}>
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
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border ${
              quickLeadFilter === chip.id
                ? 'bg-[#1D4E63] text-white border-[#1D4E63] shadow-2xs'
                : 'bg-[#FFFFFF] hover:bg-[#F6F7F8] text-[#5B6472] hover:text-[#12161C] border-[#E3E6EA]'
            }`}
          >
            <span>{chip.label}</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-extrabold ${
              quickLeadFilter === chip.id ? 'bg-white/20 text-white' : 'bg-[#F6F7F8] text-[#5B6472]'
            }`}>
              {chip.count}
            </span>
          </button>
        ))}
      </div>

      {/* Responsive Mobile Cards View (< md) */}
      <div className={`${leadSection === 'regular' ? 'block md:hidden' : 'hidden'} space-y-3`}>
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
                          {isAdmin && (
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
      <div className={`${leadSection === 'regular' ? 'hidden md:block' : 'hidden'} bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm`}>
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
                  const currentStageName = leadDeal ? leadDeal.stageName : 'New Lead';
                  const currentStageObj = stages.find(s => s.id === leadDeal?.stageId);
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
                          <span className="text-[10px] text-[#5B6472] font-mono">({lead.source})</span>
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
                                {isAdmin && (
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

      {leadSection === 'recurring' && (
        <section aria-label="Recurring leads" className="space-y-4">
          {recurringClearError && (
            <p role="alert" className="rounded-xl border border-[#F4C4C1] bg-[#FDF2F1] px-4 py-3 text-xs font-medium text-[#922D27]">
              {recurringClearError}
            </p>
          )}
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl p-4 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              <label className="relative sm:col-span-2 xl:col-span-2">
                <span className="sr-only">Search recurring leads</span>
                <Search aria-hidden="true" className="w-4 h-4 text-[#5B6472] absolute left-3.5 top-2.5" />
                <input
                  type="search"
                  value={recurringSearch}
                  onChange={event => setRecurringSearch(event.target.value)}
                  placeholder="Search name, company, phone, or email"
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl pl-10 pr-4 py-2 text-xs text-[#12161C] placeholder-[#5B6472] focus:outline-none focus:border-[#1D4E63]"
                />
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#5B6472]">
                <span>Status</span>
                <select
                  value={recurringStatus}
                  onChange={event => setRecurringStatus(event.target.value)}
                  className="min-w-0 flex-1 bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl px-3 py-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                >
                  <option value="All">All statuses</option>
                  {['New', 'Working', 'Qualified', 'Unqualified', 'Converted', 'Follow up', 'Pending Review'].map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#5B6472]">
                <span>Owner</span>
                <select
                  value={recurringOwner}
                  onChange={event => setRecurringOwner(event.target.value)}
                  className="min-w-0 flex-1 bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl px-3 py-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                >
                  <option value="All">All employees</option>
                  <option value="__unassigned">Unassigned</option>
                  {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#5B6472]">
                <span>Start date</span>
                <input
                  type="date"
                  value={recurringDateFilter}
                  onChange={event => setRecurringDateFilter(event.target.value)}
                  className="min-w-0 flex-1 bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl px-2 py-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                />
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#5B6472]">
                <span>Sort</span>
                <select
                  value={recurringSort}
                  onChange={event => setRecurringSort(event.target.value)}
                  className="min-w-0 flex-1 bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl px-3 py-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                >
                  <option value="recurrence-asc">Next recurrence</option>
                  <option value="title-asc">Name</option>
                  <option value="status-asc">Status</option>
                </select>
              </label>
            </div>
          </div>

          <RecordPagination page={recurringPage} label="recurring leads" />

          <div className="space-y-3 md:hidden">
            {recurringPage.items.length === 0 && !recurringPage.loading ? (
              <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl p-6 text-center">
                <Repeat className="w-5 h-5 text-[#1D4E63] mx-auto mb-2" />
                <p className="text-xs font-bold text-[#12161C]">No recurring leads match these filters</p>
                {isAdmin && <p className="text-[11px] text-[#5B6472] mt-1">Add a name now and fill in the remaining details later.</p>}
              </div>
            ) : recurringPage.items.map(lead => {
              const today = getLocalDateInputValue();
              const upcomingLimit = getLocalDateInputValueAfterDays(30);
              const isUpcoming = lead.nextRecurrenceDate && lead.nextRecurrenceDate >= today && lead.nextRecurrenceDate <= upcomingLimit;
              return (
              <article
                key={lead.id}
                tabIndex={0}
                aria-label={`Open Lead 360 for ${lead.contactName || lead.title}`}
                onClick={event => {
                  if (event.target.closest('button, input, select, textarea, a')) return;
                  onOpenDrawer?.('lead', lead);
                }}
                onKeyDown={event => {
                  if (event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return;
                  event.preventDefault();
                  onOpenDrawer?.('lead', lead);
                }}
                className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl p-4 space-y-3 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1D4E63] focus-visible:outline-offset-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-[#12161C] truncate">{lead.contactName || lead.title}</h2>
                    <p className="text-[11px] text-[#5B6472] mt-1">{lead.companyName || 'Company unavailable'}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#EFF6F9] px-2.5 py-1 text-[10px] font-bold text-[#1D4E63]">
                    {lead.status || 'Unavailable'}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                  <div><dt className="text-[#5B6472]">Email</dt><dd className="break-all text-[#12161C]">{lead.contactEmail || '—'}</dd></div>
                  <div><dt className="text-[#5B6472]">Phone</dt><dd className="text-[#12161C]">{lead.contactPhone || '—'}</dd></div>
                  <div><dt className="text-[#5B6472]">Recurrence date</dt><dd className="text-[#12161C]">{formatDate(lead.recurrenceDate) || '—'}</dd></div>
                  <div><dt className="text-[#5B6472]">Next recurrence</dt><dd className="flex flex-wrap items-center gap-1 text-[#12161C]">{formatDate(lead.nextRecurrenceDate) || '—'}{isUpcoming && <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF8EC] px-2 py-0.5 text-[9px] font-bold text-[#805500]"><CalendarClock size={12} aria-hidden="true" />Upcoming</span>}</dd></div>
                  <div><dt className="text-[#5B6472]">Assigned employee</dt><dd className="text-[#12161C]">{lead.ownerName || 'Unassigned'}</dd></div>
                  <div><dt className="text-[#5B6472]">Next follow-up</dt><dd className="text-[#12161C]">{formatDate(lead.nextFollowUpDate) || '—'}</dd></div>
                  <div><dt className="text-[#5B6472]">Last contacted</dt><dd className="text-[#12161C]">{formatDate(lead.lastContactedDate) || '—'}</dd></div>
                </dl>
                <div className="flex flex-wrap items-center gap-2 border-t border-[#E3E6EA] pt-3">
                  {isAdmin && (
                    <>
                      <button type="button" onClick={() => handleOpenEditModal(lead)} className="inline-flex items-center gap-1 rounded-lg border border-[#E3E6EA] px-2.5 py-1.5 text-[11px] font-semibold text-[#12161C]">
                        <Edit3 size={14} aria-hidden="true" /> Edit
                      </button>
                      <button type="button" onClick={() => handleMoveToRegular(lead)} className="inline-flex items-center gap-1 rounded-lg border border-[#E3E6EA] px-2.5 py-1.5 text-[11px] font-semibold text-[#12161C]">
                        <ArrowRightLeft size={14} aria-hidden="true" /> Move to regular
                      </button>
                      <button type="button" onClick={() => handleDeleteRecurring(lead)} className="inline-flex items-center gap-1 rounded-lg border border-[#F4C4C1] px-2.5 py-1.5 text-[11px] font-semibold text-[#922D27]">
                        <Trash2 size={14} aria-hidden="true" /> Delete
                      </button>
                    </>
                  )}
                </div>
              </article>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl shadow-2xs">
            <table className="min-w-[1180px] w-full text-left text-xs">
              <thead className="bg-[#F6F7F8] border-b border-[#E3E6EA] text-[10px] uppercase tracking-wide text-[#5B6472]">
                <tr>
                  <th scope="col" className="px-4 py-3">Lead name</th>
                  <th scope="col" className="px-4 py-3">Company</th>
                  <th scope="col" className="px-4 py-3">Email / phone</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Assigned employee</th>
                  <th scope="col" className="px-4 py-3">Recurrence date</th>
                  <th scope="col" className="px-4 py-3">Next recurrence</th>
                  <th scope="col" className="px-4 py-3">Next follow-up</th>
                  <th scope="col" className="px-4 py-3">Last contacted</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E6EA]">
                {recurringPage.items.length === 0 && !recurringPage.loading ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-[#5B6472]">
                    <Repeat className="w-5 h-5 text-[#1D4E63] mx-auto mb-2" />
                    <p className="font-bold text-xs text-[#12161C]">No recurring leads match these filters</p>
                    {isAdmin && <p className="text-[11px] mt-1">Add a name now and fill in the remaining details later.</p>}
                  </td></tr>
                ) : recurringPage.items.map(lead => {
                  const today = getLocalDateInputValue();
                  const upcomingLimit = getLocalDateInputValueAfterDays(30);
                  const isUpcoming = lead.nextRecurrenceDate && lead.nextRecurrenceDate >= today && lead.nextRecurrenceDate <= upcomingLimit;
                  return (
                    <tr
                      key={lead.id}
                      tabIndex={0}
                      aria-label={`Open Lead 360 for ${lead.contactName || lead.title}`}
                      onClick={event => {
                        if (event.target.closest('button, input, select, textarea, a')) return;
                        onOpenDrawer?.('lead', lead);
                      }}
                      onKeyDown={event => {
                        if (event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return;
                        event.preventDefault();
                        onOpenDrawer?.('lead', lead);
                      }}
                      className="hover:bg-[#F6F7F8] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1D4E63] focus-visible:outline-offset-[-2px]"
                    >
                      <td className="px-4 py-3 font-bold text-[#12161C]">{lead.contactName || lead.title}</td>
                      <td className="px-4 py-3 text-[#5B6472]">{lead.companyName || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="text-[#12161C]">{lead.contactEmail || '—'}</div>
                        <div className="text-[10px] text-[#5B6472] mt-0.5">{lead.contactPhone || '—'}</div>
                      </td>
                      <td className="px-4 py-3"><span className="rounded-full bg-[#F6F7F8] px-2 py-1 text-[10px] font-semibold text-[#12161C]">{lead.status || 'Unavailable'}</span></td>
                      <td className="px-4 py-3 text-[#12161C]">{lead.ownerName || 'Unassigned'}</td>
                      <td className="px-4 py-3 text-[#5B6472]">{formatDate(lead.recurrenceDate) || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-[#12161C]">{formatDate(lead.nextRecurrenceDate) || '—'}</span>
                        {isUpcoming && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#FEF8EC] px-2 py-0.5 text-[9px] font-bold text-[#805500]"><CalendarClock size={12} aria-hidden="true" />Upcoming</span>}
                      </td>
                      <td className="px-4 py-3 text-[#5B6472]">{formatDate(lead.nextFollowUpDate) || '—'}</td>
                      <td className="px-4 py-3 text-[#5B6472]">{formatDate(lead.lastContactedDate) || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {isAdmin && (
                            <>
                              <button type="button" aria-label={`Edit ${lead.title}`} onClick={() => handleOpenEditModal(lead)} className="rounded-lg p-2 text-[#5B6472] hover:bg-[#F6F7F8]"><Edit3 size={15} aria-hidden="true" /></button>
                              <button type="button" aria-label={`Move ${lead.title} to regular leads`} onClick={() => handleMoveToRegular(lead)} className="rounded-lg p-2 text-[#5B6472] hover:bg-[#F6F7F8]"><ArrowRightLeft size={15} aria-hidden="true" /></button>
                              <button type="button" aria-label={`Delete ${lead.title}`} onClick={() => handleDeleteRecurring(lead)} className="rounded-lg p-2 text-[#922D27] hover:bg-[#FDF2F1]"><Trash2 size={15} aria-hidden="true" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Add / Edit Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl text-[#12161C]">

            <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
              <h2 className="font-display text-sm font-bold text-[#12161C]">
                {editingLead
                  ? formData.isRecurring ? 'Edit Recurring Lead' : 'Edit Lead Opportunity'
                  : formData.isRecurring ? 'Create Recurring Lead' : 'Create New Lead Opportunity'}
              </h2>
              <button
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
                    {(formData.isRecurring || !formData.status) && <option value="">Unavailable</option>}
                    <option value="New">New</option>
                    <option value="Working">Working</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Unqualified">Unqualified</option>
                    <option value="Converted">Converted</option>
                    <option value="Follow up">Follow up</option>
                    <option value="Pending Review">Pending Review</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Assigned Owner</label>
                  <select
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
                    value={formData.nextFollowUpDate || ''}
                    onChange={event => setFormData({ ...formData, nextFollowUpDate: event.target.value })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                  />
                </div>
              </div>

              {formData.isRecurring && (
                <div className="rounded-xl border border-[#D8E8EF] bg-[#F8FBFC] p-3 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-[#1D4E63]">
                    <Repeat className="w-4 h-4" />
                    <span>Recurrence schedule</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#5B6472] font-semibold mb-1">Recurrence start date *</label>
                      <input
                        type="date"
                        required
                        value={formData.recurrenceDate || ''}
                        onChange={event => setFormData({ ...formData, recurrenceDate: event.target.value })}
                        className="w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#5B6472] font-semibold mb-1">Frequency</label>
                      <select
                        value={formData.recurrenceFrequency || DEFAULT_LEAD_RECURRENCE_FREQUENCY}
                        onChange={event => setFormData({ ...formData, recurrenceFrequency: event.target.value })}
                        className="w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                      >
                        <option value="yearly">Yearly</option>
                        <option value="monthly">Monthly</option>
                        <option value="custom">Custom interval</option>
                      </select>
                    </div>
                  </div>
                  {formData.recurrenceFrequency === 'custom' && (
                    <div>
                      <label className="block text-[#5B6472] font-semibold mb-1">Repeat every (days) *</label>
                      <input
                        type="number"
                        min="1"
                        max="3650"
                        required
                        value={formData.recurrenceInterval ?? ''}
                        onChange={event => setFormData({ ...formData, recurrenceInterval: event.target.value === '' ? '' : Number(event.target.value) })}
                        className="w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                      />
                    </div>
                  )}
                  {formData.recurrenceDate && (
                    <p className="text-[11px] text-[#5B6472]">
                      Next recurrence after the start date:{' '}
                      <strong className="text-[#12161C]">
                        {formatDate(getNextLeadRecurrenceDate(
                          formData.recurrenceDate,
                          formData.recurrenceFrequency || DEFAULT_LEAD_RECURRENCE_FREQUENCY,
                          Number(formData.recurrenceInterval) || null,
                          formData.recurrenceDate
                        )) || '—'}
                      </strong>
                    </p>
                  )}
                </div>
              )}

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
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#F6F7F8] hover:bg-[#EEF0F3] text-[#5B6472] rounded-full font-semibold border border-[#E3E6EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white rounded-full font-bold shadow-2xs"
                >
                  Save Lead
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
