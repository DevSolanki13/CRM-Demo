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
  MessageSquare,
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

    // Admin bypasses all qualification checks & questions — direct stage update!
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

    // If target stage is Closed Lost (for non-admin), trigger direct lost flow requiring Lost Reason & Note!
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

    // For advancing or changing stages (non-admin), open Stage Gate Qualification Check modal!
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
    <div className="p-8 space-y-6 bg-[#131316] text-white min-h-screen">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1c1c21] border border-[#2c2c34] p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-zinc-400" />
            <span>All Users & Lead Management</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Track inbound inquiries & cold outbound lead generation pipeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedLeadIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedLeadIds.length})</span>
            </button>
          )}

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>Add New Lead</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#1c1c21] border border-[#2c2c34] p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center gap-3">

        {/* Search */}
        <div className="w-full sm:w-64 relative shrink-0">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, contact, company..."
            className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
          />
        </div>

        {/* Source Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-medium">Type:</span>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="bg-[#18181c] border border-[#2e2e38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400 cursor-pointer"
          >
            <option value="All" className="bg-[#1c1c21]">All Sources</option>
            <option value="Outbound" className="bg-[#1c1c21]">Cold Outbound Effort</option>
            <option value="Inbound" className="bg-[#1c1c21]">Inbound Inquiry</option>
            <option value="Website" className="bg-[#1c1c21]">Website</option>
            <option value="LinkedIn" className="bg-[#1c1c21]">LinkedIn</option>
            <option value="Trade Show" className="bg-[#1c1c21]">Trade Show</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-medium">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#18181c] border border-[#2e2e38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400 cursor-pointer"
          >
            <option value="All" className="bg-[#1c1c21]">All Statuses</option>
            <option value="New" className="bg-[#1c1c21]">New</option>
            <option value="Contacted" className="bg-[#1c1c21]">Contacted</option>
            <option value="Qualified" className="bg-[#1c1c21]">Qualified</option>
            <option value="Unqualified" className="bg-[#1c1c21]">Unqualified</option>
          </select>
        </div>

        {/* Owner Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-medium">Owner:</span>
          <select
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="bg-[#18181c] border border-[#2e2e38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400 cursor-pointer"
          >
            <option value="All" className="bg-[#1c1c21]">All Reps</option>
            {users.map(u => (
              <option key={u.id} value={u.id} className="bg-[#1c1c21]">{u.name}</option>
            ))}
          </select>
        </div>

        {/* Pipeline Stage Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-medium">Pipeline Stage:</span>
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="bg-[#18181c] border border-[#2e2e38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400 cursor-pointer"
          >
            <option value="All" className="bg-[#1c1c21]">All Stages</option>
            {stages.map(stg => (
              <option key={stg.id} value={stg.id} className="bg-[#1c1c21]">{stg.name}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Responsive Mobile Cards View (< md) */}
      <div className="block md:hidden space-y-3">
        {filteredLeads.length === 0 ? (
          <div className="bg-[#1c1c21] border border-[#2c2c34] rounded-2xl p-6 text-center text-xs text-zinc-500">
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
                className={`bg-[#1c1c21] border rounded-2xl p-4 space-y-3 transition-colors ${isSelected ? 'border-emerald-500 bg-[#24242b]' : 'border-[#2c2c34]'
                  }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectLead(lead.id)}
                      className="w-4 h-4 rounded border-[#2e2e38] bg-[#18181c] text-emerald-400 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <h3 className="font-bold text-xs text-white">{lead.title}</h3>
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-zinc-500" />
                        <span>{lead.companyName || 'Unlinked Company'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 relative">
                    <button
                      onClick={() => handleOpenEditModal(lead)}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#24242b] rounded-lg transition-colors"
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
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#24242b] rounded-lg transition-colors"
                        title="Lead Quick Actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuLeadId === lead.id && (
                        <div 
                          className="absolute right-0 mt-1 w-44 bg-[#18181c] border border-[#2e2e38] rounded-xl shadow-2xl z-50 py-1 text-left text-xs font-semibold text-zinc-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleOpenAddActivityModal(lead)}
                            className="w-full px-3.5 py-2 hover:bg-[#24242b] flex items-center gap-2 text-zinc-200 hover:text-white transition-colors"
                          >
                            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Add Activity</span>
                          </button>
                          
                          <button
                            onClick={() => handleOpenChangeStageModal(lead)}
                            className="w-full px-3.5 py-2 hover:bg-[#24242b] flex items-center gap-2 text-zinc-200 hover:text-white transition-colors"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
                            <span>Change Stage</span>
                          </button>

                          <button
                            onClick={() => handleOpenSendEmailModal(lead)}
                            className="w-full px-3.5 py-2 hover:bg-[#24242b] flex items-center gap-2 text-zinc-200 hover:text-white transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5 text-amber-400" />
                            <span>Send Email</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-[#2c2c34] gap-2">
                  <div>
                    <span className="font-semibold text-white">{lead.contactName}</span>
                    {lead.contactEmail && <span className="block text-[10px] text-zinc-400 font-mono">{lead.contactEmail}</span>}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: currentStageObj?.color || '#3f3f46' }}
                    >
                      {currentStageName}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${lead.isOutbound
                        ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                        : 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80'
                      }`}>
                      {lead.isOutbound ? 'Outbound' : 'Inbound'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1">
                  <span>Assigned: {lead.ownerName || 'Unassigned'}</span>
                  <span className="font-mono">{formatDate(lead.lastActivityDate)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Leads Table (>= md) */}
      <div className="hidden md:block bg-[#1c1c21] border border-[#2c2c34] rounded-2xl">
        <div className="overflow-x-auto min-h-[340px] pb-10">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-[#24242b] text-zinc-400 uppercase font-bold text-[10px] tracking-wider border-b border-[#2c2c34]">
              <tr>
                <th className="px-4 py-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-[#2e2e38] bg-[#18181c] text-white focus:ring-0 cursor-pointer"
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
            <tbody className="divide-y divide-[#2c2c34]">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-zinc-500">
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
                      className={`transition-colors ${isSelected ? 'bg-[#24242b]' : 'hover:bg-[#24242b]/60'}`}
                    >
                      {/* Select Checkbox */}
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectLead(lead.id)}
                          className="w-4 h-4 rounded border-[#2e2e38] bg-[#18181c] text-white focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Title & Company */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-white">{lead.title}</div>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-zinc-500" />
                          <span>{lead.companyName || 'Unlinked Company'}</span>
                        </div>
                      </td>

                      {/* Pipeline Stage Badge */}
                      <td className="px-4 py-3.5">
                        <span 
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white inline-block shadow-xs"
                          style={{ backgroundColor: currentStageObj?.color || '#3f3f46' }}
                        >
                          {currentStageName}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3.5">
                        <div className="text-white font-semibold">{lead.contactName}</div>
                        <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5 font-mono">
                          {lead.contactEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-zinc-500" />
                              {lead.contactEmail}
                            </span>
                          )}
                          {lead.contactPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-zinc-500" />
                              {lead.contactPhone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Source & Outbound Badge */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${lead.isOutbound
                              ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                              : 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80'
                            }`}>
                            {lead.isOutbound ? 'Cold Outbound' : 'Inbound'}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">({lead.source})</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${lead.status === 'Qualified' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80' :
                            lead.status === 'Contacted' ? 'bg-amber-950/80 text-amber-400 border-amber-800/80' :
                              lead.status === 'New' ? 'bg-blue-950/80 text-blue-400 border-blue-800/80' :
                                'bg-[#18181c] text-zinc-400 border-[#2e2e38]'
                          }`}>
                          {lead.status}
                        </span>
                      </td>

                      {/* Assigned Owner */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-white text-black text-[10px] font-extrabold flex items-center justify-center">
                            {lead.ownerName ? lead.ownerName.charAt(0) : 'U'}
                          </div>
                          <span className="text-zinc-300 font-medium">{lead.ownerName || 'Unassigned'}</span>
                        </div>
                      </td>

                      {/* Last Activity */}
                      <td className="px-4 py-3.5 text-zinc-400 text-[11px] font-mono">
                        {formatDate(lead.lastActivityDate)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5 relative">
                          <button
                            onClick={() => handleOpenEditModal(lead)}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#24242b] rounded-lg transition-colors"
                            title="Edit Lead"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* 3-Dots Lead Actions Menu */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuLeadId(openMenuLeadId === lead.id ? null : lead.id);
                              }}
                              className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#24242b] rounded-lg transition-colors"
                              title="Lead Quick Actions"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {openMenuLeadId === lead.id && (
                              <div 
                                className={`absolute right-0 w-44 bg-[#18181c] border border-[#2e2e38] rounded-xl shadow-2xl z-50 py-1 text-left text-xs font-semibold text-zinc-200 ${
                                  isLowerRow ? 'bottom-full mb-1' : 'top-full mt-1'
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => handleOpenAddActivityModal(lead)}
                                  className="w-full px-3.5 py-2 hover:bg-[#24242b] flex items-center gap-2 text-zinc-200 hover:text-white transition-colors"
                                >
                                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Add Activity</span>
                                </button>
                                
                                <button
                                  onClick={() => handleOpenChangeStageModal(lead)}
                                  className="w-full px-3.5 py-2 hover:bg-[#24242b] flex items-center gap-2 text-zinc-200 hover:text-white transition-colors"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
                                  <span>Change Stage</span>
                                </button>

                                <button
                                  onClick={() => handleOpenSendEmailModal(lead)}
                                  className="w-full px-3.5 py-2 hover:bg-[#24242b] flex items-center gap-2 text-zinc-200 hover:text-white transition-colors"
                                >
                                  <Mail className="w-3.5 h-3.5 text-amber-400" />
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c21] border border-[#2c2c34] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-white">

            <div className="flex items-center justify-between border-b border-[#2c2c34] pb-3">
              <h2 className="text-sm font-bold text-white">
                {editingLead ? 'Edit Lead' : 'Create New Lead'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Lead Opportunity Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. AeroTech Circuit Thermal Pads Supply"
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Contact Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="e.g. David Miller"
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Company Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. AeroTech Solutions"
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+1 (512) 555-0100"
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                  >
                    <option value="Website" className="bg-[#1c1c21]">Website</option>
                    <option value="Cold Outbound" className="bg-[#1c1c21]">Cold Outbound</option>
                    <option value="Inbound Inquiry" className="bg-[#1c1c21]">Inbound Inquiry</option>
                    <option value="Referral" className="bg-[#1c1c21]">Referral</option>
                    <option value="LinkedIn" className="bg-[#1c1c21]">LinkedIn</option>
                    <option value="Trade Show" className="bg-[#1c1c21]">Trade Show</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                  >
                    <option value="New" className="bg-[#1c1c21]">New</option>
                    <option value="Contacted" className="bg-[#1c1c21]">Contacted</option>
                    <option value="Qualified" className="bg-[#1c1c21]">Qualified</option>
                    <option value="Unqualified" className="bg-[#1c1c21]">Unqualified</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Assigned Owner</label>
                  <select
                    value={formData.ownerId}
                    onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id} className="bg-[#1c1c21]">{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Initial Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Key background info or sample testing requirements..."
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2c2c34]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#24242b] hover:bg-[#2c2c36] text-zinc-300 rounded-full font-semibold border border-[#2f2f3a]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-white hover:bg-zinc-200 text-black rounded-full font-bold shadow-xs"
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c21] border border-[#2c2c34] rounded-2xl max-w-2xl w-full p-8 space-y-6 shadow-2xl text-sm text-white">
            <div className="flex items-center justify-between border-b border-[#2c2c34] pb-5">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 rounded-xl">
                  <Calendar className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Log Activity for Lead</h3>
                  <div className="text-xs text-zinc-400 font-medium">{activityModalLead.title}</div>
                </div>
              </div>
              <button onClick={() => setActivityModalLead(null)} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-[#24242b]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-5">
              <div>
                <label className="block text-zinc-300 font-bold mb-2 text-xs uppercase tracking-wider">Activity Type</label>
                <select
                  value={activityForm.type}
                  onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-zinc-400 cursor-pointer"
                >
                  <option value="Call" className="bg-[#1c1c21]">Phone Call</option>
                  <option value="Meeting" className="bg-[#1c1c21]">Meeting / Demo</option>
                  <option value="Outbound Email" className="bg-[#1c1c21]">Outbound Email</option>
                  <option value="Note" className="bg-[#1c1c21]">Internal Note</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-2 text-xs uppercase tracking-wider">Date & Time</label>
                <input
                  type="datetime-local"
                  value={activityForm.timestamp}
                  onChange={(e) => setActivityForm({ ...activityForm, timestamp: e.target.value })}
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-2 text-xs uppercase tracking-wider">Activity Description</label>
                <textarea
                  rows={5}
                  required
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  placeholder="Details of the interaction..."
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 border-t border-[#2c2c34]">
                <button
                  type="button"
                  onClick={() => setActivityModalLead(null)}
                  className="px-6 py-2.5 bg-[#24242b] hover:bg-[#2c2c36] text-zinc-300 rounded-full font-semibold border border-[#2f2f3a]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full font-bold shadow-sm"
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
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-[#1c1c21] border border-[#2c2c34] rounded-2xl max-w-2xl w-full p-8 space-y-6 shadow-2xl text-sm text-white">
              <div className="flex items-center justify-between border-b border-[#2c2c34] pb-5">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-blue-950/80 text-blue-400 border border-blue-800/60 rounded-xl">
                    <ArrowRightLeft className="w-6 h-6" />
                  </span>
                  <div>
                    <h3 className="text-lg font-extrabold text-white">Change Pipeline Stage</h3>
                    <div className="text-xs text-zinc-400 font-medium">{changeStageLead.title}</div>
                  </div>
                </div>
                <button onClick={() => setChangeStageLead(null)} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-[#24242b]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveChangeStage} className="space-y-5">
                <div className="p-4 bg-[#18181c] border border-[#2e2e38] rounded-xl space-y-1">
                  <div className="font-bold text-white text-base">{changeStageLead.title}</div>
                  <div className="text-xs text-zinc-400">{changeStageLead.companyName || changeStageLead.contactName}</div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-bold mb-2 text-xs uppercase tracking-wider">Select Target Stage</label>
                  <select
                    value={selectedTargetStageId}
                    onChange={(e) => setSelectedTargetStageId(e.target.value)}
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-zinc-400 cursor-pointer"
                  >
                    {stages.map(stg => (
                      <option key={stg.id} value={stg.id} className="bg-[#1c1c21]">{stg.name}</option>
                    ))}
                  </select>
                </div>

                {/* Conditional Mandatory Lost Reason & Note if Closed Lost selected (non-admin) */}
                {currentUser.role === 'Admin' ? (
                  <div className="p-4 bg-emerald-950/30 border border-emerald-800/60 rounded-xl flex items-center gap-3 text-xs text-emerald-300">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Admin Privilege Active: Stage will update directly without qualification forms.</span>
                  </div>
                ) : isTargetLost ? (
                  <div className="p-5 bg-rose-950/20 border border-rose-800/60 rounded-xl space-y-4">
                    <div className="flex items-center gap-2.5 text-rose-300 font-bold text-xs">
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                      <span>Closed Lost Selected &mdash; Mandatory Lost Reason Required</span>
                    </div>
                    
                    <div>
                      <label className="block text-zinc-300 font-bold mb-2 text-xs uppercase tracking-wider">
                        Mandatory Lost Reason *
                      </label>
                      <select
                        value={changeStageLostReason}
                        onChange={(e) => setChangeStageLostReason(e.target.value)}
                        className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-zinc-400 cursor-pointer"
                      >
                        {lostReasons.map(r => (
                          <option key={r} value={r} className="bg-[#1c1c21]">{r}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-zinc-400 font-semibold text-xs mb-2">
                        Free-text Lost Note / Observations (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={changeStageNote}
                        onChange={(e) => setChangeStageNote(e.target.value)}
                        placeholder="Describe why the lead/deal was lost..."
                        className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[#18181c] border border-[#2e2e38] rounded-xl flex items-center gap-3 text-xs text-blue-300">
                    <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
                    <span>Proceeding will launch the Stage Gate Qualification Checklist for <strong>{targetStageObj?.name}</strong>.</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-5 border-t border-[#2c2c34]">
                  <button
                    type="button"
                    onClick={() => setChangeStageLead(null)}
                    className="px-6 py-2.5 bg-[#24242b] hover:bg-[#2c2c36] text-zinc-300 rounded-full font-semibold border border-[#2f2f3a]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-7 py-2.5 rounded-full font-bold shadow-sm transition-colors ${
                      currentUser.role === 'Admin'
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : isTargetLost 
                          ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c21] border border-[#2c2c34] rounded-2xl max-w-3xl w-full p-8 space-y-6 shadow-2xl text-sm text-white">
            <div className="flex items-center justify-between border-b border-[#2c2c34] pb-5">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-amber-950/80 text-amber-400 border border-amber-800/60 rounded-xl">
                  <Mail className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Send Email to Lead</h3>
                  <div className="text-xs text-zinc-400 font-medium">{sendEmailLead.title}</div>
                </div>
              </div>
              <button onClick={() => setSendEmailLead(null)} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-[#24242b]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmailLogCRM} className="space-y-5">
              <div>
                <label className="block text-zinc-300 font-bold mb-2 text-xs uppercase tracking-wider">To Email Address</label>
                <input
                  type="email"
                  required
                  value={emailForm.toEmail}
                  onChange={(e) => setEmailForm({ ...emailForm, toEmail: e.target.value })}
                  placeholder="contact@company.com"
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-zinc-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-2 text-xs uppercase tracking-wider">Subject</label>
                <input
                  type="text"
                  required
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-2 text-xs uppercase tracking-wider">Message Body</label>
                <textarea
                  rows={7}
                  required
                  value={emailForm.body}
                  onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-4 text-sm text-white focus:outline-none focus:border-zinc-400 font-sans"
                />
              </div>

              <div className="flex items-center justify-between pt-5 border-t border-[#2c2c34]">
                <button
                  type="button"
                  onClick={handleSendEmailClient}
                  className="px-5 py-2.5 bg-[#24242b] hover:bg-[#2c2c36] text-amber-300 font-semibold rounded-full border border-amber-800/60 text-xs flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Open Mail App</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSendEmailLead(null)}
                    className="px-6 py-2.5 bg-[#24242b] hover:bg-[#2c2c36] text-zinc-300 rounded-full font-semibold border border-[#2f2f3a]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-7 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-full font-bold shadow-sm flex items-center gap-2 text-sm"
                  >
                    <CheckCircle2 className="w-4.5 h-4.5" />
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

