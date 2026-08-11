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
  ShieldCheck
} from 'lucide-react';
import { formatDate, filterByRole } from '../utils/crmHelpers.js';
import { StageGateCheckModal } from './StageGateCheckModal.jsx';

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
  onSubmitStageGateCheck
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
  const [changeStageLead, setChangeStageLead] = useState(null);
  const [sendEmailLead, setSendEmailLead] = useState(null);

  // Activity Form State
  const [activityForm, setActivityForm] = useState({
    type: 'Call',
    description: '',
    timestamp: new Date().toISOString().slice(0, 16)
  });

  // Change Stage Form State
  const [selectedTargetStageId, setSelectedTargetStageId] = useState('');
  const [changeStageLostReason, setChangeStageLostReason] = useState('Budget mismatch');
  const [changeStageNote, setChangeStageNote] = useState('');

  // Gate Check Modal State inside LeadsView
  const [isGateModalOpen, setIsGateModalOpen] = useState(false);
  const [gateCheckDeal, setGateCheckDeal] = useState(null);
  const [gateCheckFromStage, setGateCheckFromStage] = useState(null);
  const [gateCheckTargetStage, setGateCheckTargetStage] = useState(null);

  // Email Form State
  const [emailForm, setEmailForm] = useState({
    toEmail: '',
    subject: '',
    body: ''
  });

  // Close 3-dots dropdown when clicking anywhere outside
  React.useEffect(() => {
    const handleGlobalClick = () => setOpenMenuLeadId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Modal state for Edit/Add Lead
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  // Selection state for multi-delete
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

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
    if (window.confirm(`Are you sure you want to delete ${selectedLeadIds.length} selected lead(s)?`)) {
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
    setActivityForm({
      type: 'Call',
      description: `Logged phone call with ${lead.contactName || 'Lead'}`,
      timestamp: new Date().toISOString().slice(0, 16)
    });
  };

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    if (!activityModalLead || !onCreateActivity) return;

    await onCreateActivity({
      type: activityForm.type,
      description: activityForm.description,
      timestamp: activityForm.timestamp ? new Date(activityForm.timestamp).toISOString() : new Date().toISOString(),
      linkedType: 'Lead',
      linkedId: activityModalLead.id,
      linkedTitle: activityModalLead.title,
      authorId: currentUser.id,
      authorName: currentUser.name,
      isOutbound: activityForm.type === 'Outbound Email' || activityForm.type === 'Call'
    });

    setActivityModalLead(null);
  };

  const handleOpenChangeStageModal = (lead) => {
    setOpenMenuLeadId(null);
    setChangeStageLead(lead);
    setChangeStageLostReason('Budget mismatch');
    setChangeStageNote('');
    const leadDeal = deals.find(d => d.leadId === lead.id || d.title === lead.title);
    setSelectedTargetStageId(leadDeal?.stageId || stages[0]?.id || '');
  };

  const handleSaveChangeStage = async (e) => {
    e.preventDefault();
    if (!changeStageLead || !selectedTargetStageId) return;

    const targetStage = stages.find(s => s.id === selectedTargetStageId);
    if (!targetStage) return;

    const leadDeal = deals.find(d => d.leadId === changeStageLead.id || d.title === changeStageLead.title) || {
      id: `dl-${changeStageLead.id}`,
      title: changeStageLead.title,
      leadId: changeStageLead.id,
      stageId: stages[0]?.id || 'stg-1',
      stageName: stages[0]?.name || 'New Lead',
      value: 10000,
      ownerId: changeStageLead.ownerId || currentUser.id
    };

    if (currentUser.role === 'Admin') {
      if (onUpdateDeal) {
        await onUpdateDeal(leadDeal.id, {
          stageId: targetStage.id,
          stageName: targetStage.name
        });
      }

      let leadStatus = 'Contacted';
      if (targetStage.category === 'New') leadStatus = 'New';
      else if (targetStage.category === 'Won' || targetStage.category === 'Negotiation') leadStatus = 'Qualified';
      else if (targetStage.category === 'Lost') leadStatus = 'Unqualified';

      await onUpdateLead(changeStageLead.id, { status: leadStatus });
      setChangeStageLead(null);
      return;
    }

    const fromStageObj = stages.find(s => s.id === leadDeal.stageId) || stages[0];

    if (targetStage.name === 'Closed Lost' || targetStage.category === 'Lost') {
      if (onSubmitStageGateCheck) {
        await onSubmitStageGateCheck({
          dealId: leadDeal.id,
          dealTitle: leadDeal.title,
          fromStageId: fromStageObj.id,
          fromStageName: fromStageObj.name,
          targetStageId: targetStage.id,
          targetStageName: targetStage.name,
          submittedBy: currentUser.id,
          submittedByName: currentUser.name,
          status: 'approved_and_executed',
          answers: {},
          outcome: 'lost',
          lostReason: changeStageLostReason,
          note: changeStageNote
        });
      } else if (onUpdateDeal) {
        await onUpdateDeal(leadDeal.id, {
          stageId: targetStage.id,
          stageName: targetStage.name,
          status: 'Lost',
          lostReason: changeStageLostReason,
          lostNote: changeStageNote
        });
      }

      await onUpdateLead(changeStageLead.id, { status: 'Unqualified' });
      setChangeStageLead(null);
      return;
    }

    setChangeStageLead(null);
    setGateCheckDeal(leadDeal);
    setGateCheckFromStage(fromStageObj);
    setGateCheckTargetStage(targetStage);
    setIsGateModalOpen(true);
  };

  const handleOpenSendEmailModal = (lead) => {
    setOpenMenuLeadId(null);
    setSendEmailLead(lead);
    setEmailForm({
      toEmail: lead.contactEmail || '',
      subject: `Inquiry regarding ${lead.title}`,
      body: `Hi ${lead.contactName || 'there'},\n\nFollowing up regarding ${lead.title}.\n\nBest regards,\n${currentUser.name}`
    });
  };

  const handleSendEmailClient = () => {
    if (!emailForm.toEmail) return;
    const mailtoUrl = `mailto:${encodeURIComponent(emailForm.toEmail)}?subject=${encodeURIComponent(emailForm.subject)}&body=${encodeURIComponent(emailForm.body)}`;
    window.open(mailtoUrl, '_blank');
  };

  const handleSendEmailLogCRM = async (e) => {
    e.preventDefault();
    if (!sendEmailLead || !onCreateActivity) return;

    await onCreateActivity({
      type: 'Outbound Email',
      description: `Sent Outbound Email to ${emailForm.toEmail}: "${emailForm.subject}" - ${emailForm.body}`,
      timestamp: new Date().toISOString(),
      linkedType: 'Lead',
      linkedId: sendEmailLead.id,
      linkedTitle: sendEmailLead.title,
      authorId: currentUser.id,
      authorName: currentUser.name,
      isOutbound: true
    });

    handleSendEmailClient();
    setSendEmailLead(null);
  };

  const handleOpenAddModal = () => {
    setEditingLead(null);
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
    setFormData({ ...lead });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.contactName) return;

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
                className={`bg-[#FFFFFF] border rounded-2xl p-4 space-y-3 transition-colors ${
                  isSelected ? 'border-[#1D4E63] bg-[#F6F7F8]' : 'border-[#E3E6EA]'
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
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: currentStageObj?.color || '#1D4E63' }}
                    >
                      {currentStageName}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                      lead.isOutbound
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
                        <span 
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white inline-block shadow-2xs"
                          style={{ backgroundColor: currentStageObj?.color || '#1D4E63' }}
                        >
                          {currentStageName}
                        </span>
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

                      {/* Source & Outbound Badge */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                            lead.isOutbound
                              ? 'bg-[#FEF8EC] text-[#965700] border-[#F5DDA9]'
                              : 'bg-[#EFF6F9] text-[#1D4E63] border-[#D8E8EF]'
                          }`}>
                            {lead.isOutbound ? 'Cold Outbound' : 'Inbound'}
                          </span>
                          <span className="text-[10px] text-[#5B6472] font-mono">({lead.source})</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          lead.status === 'Qualified' ? 'bg-[#F0F7F3] text-[#255B40] border-[#BCDBC9]' :
                          lead.status === 'Contacted' ? 'bg-[#FEF8EC] text-[#965700] border-[#F5DDA9]' :
                          lead.status === 'New' ? 'bg-[#EFF6F9] text-[#1D4E63] border-[#D8E8EF]' :
                          'bg-[#FDF2F1] text-[#922D27] border-[#F4C4C1]'
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
                                className={`absolute right-0 w-44 bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl shadow-xl z-50 py-1 text-left text-xs font-semibold text-[#12161C] ${
                                  isLowerRow ? 'bottom-full mb-1' : 'top-full mt-1'
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

              <div>
                <label className="block text-[#5B6472] font-semibold mb-1">Lead Opportunity Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. AeroTech Circuit Thermal Pads Supply"
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                />
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

      {/* 1. ADD ACTIVITY MODAL */}
      {activityModalLead && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl max-w-2xl w-full p-8 space-y-6 shadow-xl text-sm text-[#12161C]">
            <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-5">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-[#F0F7F3] text-[#3F7A5C] border border-[#BCDBC9] rounded-xl">
                  <Calendar className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-extrabold text-[#12161C]">Log Activity for Lead</h3>
                  <div className="text-xs text-[#5B6472] font-medium">{activityModalLead.title}</div>
                </div>
              </div>
              <button onClick={() => setActivityModalLead(null)} className="p-2 text-[#5B6472] hover:text-[#12161C] rounded-lg hover:bg-[#F6F7F8]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-5">
              <div>
                <label className="block text-[#12161C] font-bold mb-2 text-xs uppercase tracking-wider">Activity Type</label>
                <select
                  value={activityForm.type}
                  onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-3.5 text-sm text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
                >
                  <option value="Call">Phone Call</option>
                  <option value="Meeting">Meeting / Demo</option>
                  <option value="Outbound Email">Outbound Email</option>
                  <option value="Note">Internal Note</option>
                </select>
              </div>

              <div>
                <label className="block text-[#12161C] font-bold mb-2 text-xs uppercase tracking-wider">Date & Time</label>
                <input
                  type="datetime-local"
                  value={activityForm.timestamp}
                  onChange={(e) => setActivityForm({ ...activityForm, timestamp: e.target.value })}
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-3.5 text-sm text-[#12161C] focus:outline-none focus:border-[#1D4E63] font-mono"
                />
              </div>

              <div>
                <label className="block text-[#12161C] font-bold mb-2 text-xs uppercase tracking-wider">Activity Description</label>
                <textarea
                  rows={4}
                  required
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  placeholder="Details of the interaction..."
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-3.5 text-sm text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 border-t border-[#E3E6EA]">
                <button
                  type="button"
                  onClick={() => setActivityModalLead(null)}
                  className="px-6 py-2.5 bg-[#F6F7F8] hover:bg-[#EEF0F3] text-[#5B6472] rounded-full font-semibold border border-[#E3E6EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 bg-[#3F7A5C] hover:bg-[#34664D] text-white rounded-full font-bold shadow-2xs"
                >
                  Log Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. CHANGE STAGE MODAL */}
      {changeStageLead && (() => {
        const targetStageObj = stages.find(s => s.id === selectedTargetStageId);
        const isTargetLost = targetStageObj?.name === 'Closed Lost' || targetStageObj?.category === 'Lost';
        const lostReasons = [
          'Budget mismatch',
          'No decision-maker access',
          'Losing to competitor',
          'Slow internal process',
          'Technical fit issue',
          'Went silent'
        ];

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl max-w-2xl w-full p-8 space-y-6 shadow-xl text-sm text-[#12161C]">
              <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-5">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-[#F6F7F8] text-[#1D4E63] border border-[#E3E6EA] rounded-xl">
                    <ArrowRightLeft className="w-6 h-6" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-extrabold text-[#12161C]">Change Pipeline Stage</h3>
                    <div className="text-xs text-[#5B6472] font-medium">{changeStageLead.title}</div>
                  </div>
                </div>
                <button onClick={() => setChangeStageLead(null)} className="p-2 text-[#5B6472] hover:text-[#12161C] rounded-lg hover:bg-[#F6F7F8]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveChangeStage} className="space-y-5">
                <div className="p-4 bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl space-y-1">
                  <div className="font-bold text-[#12161C] text-base">{changeStageLead.title}</div>
                  <div className="text-xs text-[#5B6472]">{changeStageLead.companyName || changeStageLead.contactName}</div>
                </div>

                <div>
                  <label className="block text-[#12161C] font-bold mb-2 text-xs uppercase tracking-wider">Select Target Stage</label>
                  <select
                    value={selectedTargetStageId}
                    onChange={(e) => setSelectedTargetStageId(e.target.value)}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-3.5 text-sm text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
                  >
                    {stages.map(stg => (
                      <option key={stg.id} value={stg.id}>{stg.name}</option>
                    ))}
                  </select>
                </div>

                {currentUser.role === 'Admin' ? (
                  <div className="p-4 bg-[#F0F7F3] border border-[#BCDBC9] rounded-xl flex items-center gap-3 text-xs text-[#3F7A5C]">
                    <ShieldCheck className="w-5 h-5 text-[#3F7A5C] shrink-0" />
                    <span>Admin Privilege Active: Stage will update directly without qualification forms.</span>
                  </div>
                ) : isTargetLost ? (
                  <div className="p-5 bg-[#FDF2F1] border border-[#F4C4C1] rounded-xl space-y-4">
                    <div className="flex items-center gap-2.5 text-[#B5423A] font-bold text-xs">
                      <AlertTriangle className="w-5 h-5 text-[#B5423A] shrink-0" />
                      <span>Closed Lost Selected &mdash; Mandatory Lost Reason Required</span>
                    </div>
                    
                    <div>
                      <label className="block text-[#12161C] font-bold mb-2 text-xs uppercase tracking-wider">
                        Mandatory Lost Reason *
                      </label>
                      <select
                        value={changeStageLostReason}
                        onChange={(e) => setChangeStageLostReason(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#F4C4C1] rounded-xl p-3.5 text-sm text-[#12161C] focus:outline-none focus:border-[#B5423A] cursor-pointer"
                      >
                        {lostReasons.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#5B6472] font-semibold text-xs mb-2">
                        Free-text Lost Note / Observations (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={changeStageNote}
                        onChange={(e) => setChangeStageNote(e.target.value)}
                        placeholder="Describe why the lead/deal was lost..."
                        className="w-full bg-[#FFFFFF] border border-[#F4C4C1] rounded-xl p-3.5 text-sm text-[#12161C] focus:outline-none focus:border-[#B5423A]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl flex items-center gap-3 text-xs text-[#1D4E63]">
                    <ShieldCheck className="w-5 h-5 text-[#1D4E63] shrink-0" />
                    <span>Proceeding will launch the Stage Gate Qualification Checklist for <strong>{targetStageObj?.name}</strong>.</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-5 border-t border-[#E3E6EA]">
                  <button
                    type="button"
                    onClick={() => setChangeStageLead(null)}
                    className="px-6 py-2.5 bg-[#F6F7F8] hover:bg-[#EEF0F3] text-[#5B6472] rounded-full font-semibold border border-[#E3E6EA]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-7 py-2.5 rounded-full font-bold shadow-2xs transition-colors ${
                      currentUser.role === 'Admin'
                        ? 'bg-[#1D4E63] hover:bg-[#153B4B] text-white'
                        : isTargetLost 
                          ? 'bg-[#B5423A] hover:bg-[#96342E] text-white' 
                          : 'bg-[#1D4E63] hover:bg-[#153B4B] text-white'
                    }`}
                  >
                    {currentUser.role === 'Admin'
                      ? 'Update Stage'
                      : isTargetLost 
                        ? 'Confirm & Move to Closed Lost' 
                        : 'Proceed to Qualification Check'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* 3. SEND EMAIL MODAL */}
      {sendEmailLead && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl max-w-3xl w-full p-8 space-y-6 shadow-xl text-sm text-[#12161C]">
            <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-5">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-[#FEF8EC] text-[#C6790A] border border-[#F3D9A2] rounded-xl">
                  <Mail className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-extrabold text-[#12161C]">Send Email to Lead</h3>
                  <div className="text-xs text-[#5B6472] font-medium">{sendEmailLead.title}</div>
                </div>
              </div>
              <button onClick={() => setSendEmailLead(null)} className="p-2 text-[#5B6472] hover:text-[#12161C] rounded-lg hover:bg-[#F6F7F8]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmailLogCRM} className="space-y-5">
              <div>
                <label className="block text-[#12161C] font-bold mb-2 text-xs uppercase tracking-wider">To Email Address</label>
                <input
                  type="email"
                  required
                  value={emailForm.toEmail}
                  onChange={(e) => setEmailForm({ ...emailForm, toEmail: e.target.value })}
                  placeholder="contact@company.com"
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-3.5 text-sm text-[#12161C] focus:outline-none focus:border-[#1D4E63] font-mono"
                />
              </div>

              <div>
                <label className="block text-[#12161C] font-bold mb-2 text-xs uppercase tracking-wider">Subject</label>
                <input
                  type="text"
                  required
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-3.5 text-sm text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                />
              </div>

              <div>
                <label className="block text-[#12161C] font-bold mb-2 text-xs uppercase tracking-wider">Message Body</label>
                <textarea
                  rows={6}
                  required
                  value={emailForm.body}
                  onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-4 text-sm text-[#12161C] focus:outline-none focus:border-[#1D4E63] font-sans"
                />
              </div>

              <div className="flex items-center justify-between pt-5 border-t border-[#E3E6EA]">
                <button
                  type="button"
                  onClick={handleSendEmailClient}
                  className="px-5 py-2.5 bg-[#FEF8EC] hover:bg-[#FDF0D5] text-[#C6790A] font-semibold rounded-full border border-[#F3D9A2] text-xs flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Open Mail App</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSendEmailLead(null)}
                    className="px-6 py-2.5 bg-[#F6F7F8] hover:bg-[#EEF0F3] text-[#5B6472] rounded-full font-semibold border border-[#E3E6EA]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-7 py-2.5 bg-[#C6790A] hover:bg-[#A86608] text-white rounded-full font-bold shadow-2xs flex items-center gap-2 text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Send & Log in CRM</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stage Gate Qualification Check Modal in LeadsView */}
      <StageGateCheckModal
        isOpen={isGateModalOpen}
        onClose={() => setIsGateModalOpen(false)}
        deal={gateCheckDeal}
        fromStage={gateCheckFromStage}
        targetStage={gateCheckTargetStage}
        currentUser={currentUser}
        onSubmitCheck={onSubmitStageGateCheck}
        onApproveCheck={() => {}}
        onRejectCheck={() => {}}
        onSaveDraft={() => {}}
      />

    </div>
  );
};
