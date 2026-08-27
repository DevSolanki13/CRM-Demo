import React, { useState } from 'react';
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
  Send,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { formatDate, filterByRole, getStageBadgeStyle, getStatusBadgeStyle } from '../utils/crmHelpers.js';
import { StageGateCheckModal } from './StageGateCheckModal.jsx';
import { AddActivityModal } from './AddActivityModal.jsx';

export const LeadsView = ({
  leads,
  stages = [],
  deals = [],
  users,
  currentUser,
  branding,
  onCreateLead,
  onUpdateLead,
  onDeleteLead,
  onConvertToDeal,
  onUpdateDeal,
  onCreateActivity,
  onCreateTask,
  onSubmitStageGateCheck,
  onApproveStageGateCheck,
  onRejectStageGateCheck
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedOwner, setSelectedOwner] = useState('All');
  const [selectedStage, setSelectedStage] = useState('All');

  // 3-Dots Menu & Action Modals State
  const [openMenuLeadId, setOpenMenuLeadId] = useState(null);

  // Modals for 3-dots actions
  const [activityModalLead, setActivityModalLead] = useState(null);

  // Gate Check Modal State inside LeadsView
  const [isGateModalOpen, setIsGateModalOpen] = useState(false);
  const [gateCheckDeal, setGateCheckDeal] = useState(null);
  const [gateCheckFromStage, setGateCheckFromStage] = useState(null);
  const [gateCheckTargetStage, setGateCheckTargetStage] = useState(null);

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

  // Selection state for multi-delete
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    companyName: '',
    source: 'Website',
    status: 'New',
    ownerId: currentUser.id,
    notes: ''
  });

  // Filter RBAC
  const userLeads = filterByRole(leads, currentUser);

  // Filtered Leads
  const filteredLeads = userLeads.filter(l => {
    const matchesSearch =
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.companyName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSource = selectedSource === 'All'
      ? true
      : selectedSource === 'Outbound' ? l.isOutbound
        : selectedSource === 'Inbound' ? !l.isOutbound
          : l.source === selectedSource;

    const matchesStatus = selectedStatus === 'All' || l.status === selectedStatus;
    const matchesOwner = selectedOwner === 'All' || l.ownerId === selectedOwner;

    const leadDeal = deals.find(d => d.leadId === l.id || d.title === l.title);
    const matchesStage = selectedStage === 'All' || (leadDeal && leadDeal.stageId === selectedStage);

    return matchesSearch && matchesSource && matchesStatus && matchesOwner && matchesStage;
  });

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

    const leadDeal = deals.find(d => d.leadId === targetEntity.id || d.title === targetEntity.title);

    // 2. Stage & Status Updates
    if (outcomeData.shouldAdvanceStage && outcomeData.targetStageObj) {
      if (leadDeal && onUpdateDeal) {
        await onUpdateDeal(leadDeal.id, {
          stageId: outcomeData.targetStageObj.id,
          stageName: outcomeData.targetStageObj.name,
          pendingGateCheck: null
        });
      }
      if (onUpdateLead) {
        await onUpdateLead(targetEntity.id, {
          status: outcomeData.newStatus || 'Qualified'
        });
      }
    } else if (outcomeData.requiresManagerApproval && outcomeData.targetStageObj) {
      if (leadDeal && onUpdateDeal) {
        await onUpdateDeal(leadDeal.id, {
          status: 'Pending Review',
          pendingGateCheck: {
            targetStageId: outcomeData.targetStageObj.id,
            submittedById: currentUser.id,
            submittedByName: currentUser.name,
            submittedAt: new Date().toISOString(),
            answers: outcomeData.criteriaAnswers
          }
        });
      }
      if (onUpdateLead) {
        await onUpdateLead(targetEntity.id, {
          status: 'Pending Review'
        });
      }
    } else {
      // Stage remains same, status = 'Follow up'
      if (onUpdateLead) {
        await onUpdateLead(targetEntity.id, {
          status: 'Follow up'
        });
      }
      if (leadDeal && onUpdateDeal) {
        await onUpdateDeal(leadDeal.id, {
          status: 'Follow up'
        });
      }
    }

    // 3. Create Follow-up Task for Assigned Rep
    if (onCreateTask && outcomeData.assignedOwnerId) {
      await onCreateTask({
        title: `[Follow-up] ${activityData.type}: ${targetEntity.title}`,
        dueDate: outcomeData.dueDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
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

  const handleApproveLeadStage = async (lead) => {
    const leadDeal = deals.find(d => d.leadId === lead.id || d.title === lead.title);
    
    if (leadDeal && onApproveStageGateCheck) {
      await onApproveStageGateCheck(leadDeal.id, currentUser);
    } else {
      const targetStageId = leadDeal?.pendingGateCheck?.targetStageId;
      const targetStageObj = stages.find(s => s.id === targetStageId) || stages[1];
      
      if (leadDeal && onUpdateDeal) {
        await onUpdateDeal(leadDeal.id, {
          stageId: targetStageObj.id,
          stageName: targetStageObj.name,
          status: targetStageObj.category === 'Won' ? 'Won' : 'Active',
          pendingGateCheck: null
        });
      }
      if (onUpdateLead) {
        await onUpdateLead(lead.id, {
          status: 'Qualified',
          pendingGateCheck: null
        });
      }
    }
  };

  const handleRejectLeadStage = async (lead) => {
    const leadDeal = deals.find(d => d.leadId === lead.id || d.title === lead.title);
    
    if (leadDeal && onRejectStageGateCheck) {
      await onRejectStageGateCheck(leadDeal.id, currentUser, 'Criteria rejected by Manager');
    } else {
      if (leadDeal && onUpdateDeal) {
        await onUpdateDeal(leadDeal.id, {
          status: 'Follow up',
          pendingGateCheck: null
        });
      }
      if (onUpdateLead) {
        await onUpdateLead(lead.id, {
          status: 'Follow up',
          pendingGateCheck: null
        });
      }
    }
  };

  const handleOpenAddModal = () => {
    setEditingLead(null);
    setFormValidationError('');
    setFormData({
      title: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      companyName: '',
      source: 'Website',
      status: 'New',
      ownerId: currentUser.id,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (lead) => {
    setEditingLead(lead);
    setFormValidationError('');
    setFormData({ ...lead });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormValidationError('');

    const titleTrimmed = (formData.title || '').trim();
    const contactTrimmed = (formData.contactName || '').trim();

    if (!titleTrimmed || !contactTrimmed) {
      setFormValidationError('Lead Title and Contact Name are required.');
      return;
    }

    // Validation: Lead title cannot consist of only numbers (must include text/letters or string with numbers)
    if (/^\d+$/.test(titleTrimmed) || !/[a-zA-Z]/.test(titleTrimmed)) {
      setFormValidationError('Lead Title cannot be purely numeric. Please include letters or descriptive text (e.g. "Lead 101" or "AeroTech Inquiry").');
      return;
    }

    if (/^\d+$/.test(contactTrimmed) || !/[a-zA-Z]/.test(contactTrimmed)) {
      setFormValidationError('Contact Name cannot be purely numeric. Please enter a valid name (e.g. "David Miller").');
      return;
    }

    if (editingLead) {
      await onUpdateLead(editingLead.id, formData);
    } else {
      await onCreateLead(formData);
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

        <div className="flex items-center gap-2">
          {selectedLeadIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-[#B5423A] hover:bg-[#96342E] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-2xs"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedLeadIds.length})</span>
            </button>
          )}

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Add New Lead</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center gap-3 shadow-2xs">

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

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#5B6472] font-semibold">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl px-3 py-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Unqualified">Unqualified</option>
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
            <option value="All">All Reps</option>
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

      {/* Responsive Mobile Cards View (< md) */}
      <div className="block md:hidden space-y-3">
        {filteredLeads.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl p-6 text-center text-xs text-[#5B6472]">
            No leads found matching criteria.
          </div>
        ) : (
          filteredLeads.map(lead => {
            const isSelected = selectedLeadIds.includes(lead.id);
            const leadDeal = deals.find(d => d.leadId === lead.id || d.title === lead.title);
            const currentStageName = leadDeal ? leadDeal.stageName : 'New Lead';
            const currentStageObj = stages.find(s => s.id === leadDeal?.stageId);

            return (
              <div
                key={lead.id}
                className={`bg-[#FFFFFF] border rounded-2xl p-4 space-y-3 transition-colors ${isSelected ? 'border-[#1D4E63] bg-[#F6F7F8]' : 'border-[#E3E6EA]'
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
                            onClick={() => handleOpenAddActivityModal(lead)}
                            className="w-full px-3.5 py-2 hover:bg-[#F6F7F8] flex items-center gap-2 text-[#12161C] transition-colors"
                          >
                            <Calendar className="w-3.5 h-3.5 text-[#3F7A5C]" />
                            <span>Add Activity</span>
                          </button>

                          <button
                            onClick={() => handleOpenChangeStageModal(lead)}
                            className="w-full px-3.5 py-2 hover:bg-[#F6F7F8] flex items-center gap-2 text-[#12161C] transition-colors"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-[#1D4E63]" />
                            <span>Change Stage</span>
                          </button>

                          <button
                            onClick={() => handleOpenSendEmailModal(lead)}
                            className="w-full px-3.5 py-2 hover:bg-[#F6F7F8] flex items-center gap-2 text-[#12161C] transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5 text-[#C6790A]" />
                            <span>Send Email</span>
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
                      const badgeStyle = getStageBadgeStyle(currentStageName, currentStageObj?.color);
                      return (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeStyle.badgeClass}`}>
                          {currentStageName}
                        </span>
                      );
                    })()}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${lead.isOutbound
                        ? 'bg-[#FEF8EC] text-[#965700] border-[#F5DDA9]'
                        : 'bg-[#EFF6F9] text-[#1D4E63] border-[#D8E8EF]'
                      }`}>
                      {lead.isOutbound ? 'Outbound' : 'Inbound'}
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
      <div className="hidden md:block bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl shadow-2xs">
        <div className="overflow-x-auto min-h-[340px] pb-10">
          <table className="w-full text-left text-xs text-[#12161C]">
            <thead className="bg-[#F6F7F8] text-[#5B6472] uppercase font-mono font-bold text-[10px] tracking-wider border-b border-[#E3E6EA]">
              <tr>
                <th className="px-4 py-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-[#E3E6EA] bg-[#FFFFFF] text-[#1D4E63] focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3.5">Lead / Company</th>
                <th className="px-4 py-3.5">Pipeline Stage</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5">Source & Effort</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Assigned Owner</th>
                <th className="px-4 py-3.5">Last Activity</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E6EA]">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-[#5B6472]">
                    No leads found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead, idx) => {
                  const isSelected = selectedLeadIds.includes(lead.id);
                  const leadDeal = deals.find(d => d.leadId === lead.id || d.title === lead.title);
                  const currentStageName = leadDeal ? leadDeal.stageName : 'New Lead';
                  const currentStageObj = stages.find(s => s.id === leadDeal?.stageId);
                  const isLowerRow = idx >= Math.max(0, filteredLeads.length - 2);

                  return (
                    <tr
                      key={lead.id}
                      className={`transition-colors ${isSelected ? 'bg-[#F6F7F8]' : 'hover:bg-[#F6F7F8]/60'}`}
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
                          const badgeStyle = getStageBadgeStyle(currentStageName, currentStageObj?.color);
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
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${lead.isOutbound
                              ? 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]'
                              : 'bg-[#FFFFFF] text-[#12161C] border-[#E3E6EA]'
                            }`}>
                            {lead.isOutbound ? 'Cold Outbound' : 'Inbound'}
                          </span>
                          <span className="text-[10px] text-[#5B6472] font-mono">({lead.source})</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${lead.status === 'Qualified' ? 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]' :
                            (lead.status === 'Buy Again' || lead.status === 'Renewal Due' || lead.status === 'Buy Renewal') ? 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]' :
                              lead.status === 'Unqualified' ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]' :
                                'bg-[#FFFFFF] text-[#12161C] border-[#E3E6EA]'
                          }`}>
                          {lead.status}
                        </span>
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

      {/* Add / Edit Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl text-[#12161C]">

            <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
              <h2 className="font-display text-sm font-bold text-[#12161C]">
                {editingLead ? 'Edit Lead Opportunity' : 'Create New Lead Opportunity'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#5B6472] hover:text-[#12161C] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              {formValidationError && (
                <div className="p-3 bg-[#FDF2F1] border border-[#F4C4C1] rounded-xl text-[#922D27] text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#922D27] shrink-0" />
                  <span>{formValidationError}</span>
                </div>
              )}

              <div>
                <label className="block text-[#5B6472] font-semibold mb-1">Lead Opportunity Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. AeroTech Circuit Thermal Pads Supply"
                  className={`w-full bg-[#F6F7F8] border rounded-xl p-2.5 text-[#12161C] focus:outline-none ${/^\d+$/.test((formData.title || '').trim()) && formData.title.trim().length > 0
                      ? 'border-[#B5423A] focus:border-[#B5423A]'
                      : 'border-[#E3E6EA] focus:border-[#1D4E63]'
                    }`}
                />
                {/^\d+$/.test((formData.title || '').trim()) && formData.title.trim().length > 0 && (
                  <p className="text-[11px] text-[#922D27] font-semibold mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-[#922D27]" />
                    <span>Title cannot be only numbers. Must include letters or text (e.g. "Lead 123").</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Contact Name *</label>
                  <input
                    type="text"
                    required
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
                  >
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
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Unqualified">Unqualified</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Assigned Owner</label>
                  <select
                    value={formData.ownerId}
                    onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#5B6472] font-semibold mb-1">Initial Notes</label>
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





      {/* Stage Gate Qualification Check Modal in LeadsView */}
      <StageGateCheckModal
        isOpen={isGateModalOpen}
        onClose={() => setIsGateModalOpen(false)}
        deal={gateCheckDeal}
        fromStage={gateCheckFromStage}
        targetStage={gateCheckTargetStage}
        currentUser={currentUser}
        onSubmitCheck={onSubmitStageGateCheck}
        onApproveCheck={() => { }}
        onRejectCheck={() => { }}
        onSaveDraft={() => { }}
      />

    </div>
  );
};
