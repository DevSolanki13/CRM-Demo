import React, { useState } from 'react';
import {
  Plus,
  Building2,
  User,
  RefreshCw,
  Edit3,
  ChevronRight,
  ChevronLeft,
  X,
  Search,
  Flag,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Layers,
  PhoneCall,
  CheckCircle2,
  Ban,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import {
  formatCurrency,
  filterByRole,
  getStageAgingStatus,
  isDealStale,
  isCloseDateOverdue,
  isProposalExpiringSoon,
  ALLOWED_TRANSITIONS,
  getLocalDateInputValue,
  getLocalDateInputValueAfterDays
} from '../utils/crmHelpers.js';
import { StageGateCheckModal } from './StageGateCheckModal.jsx';
import { AddActivityModal } from './AddActivityModal.jsx';

const LOST_REASONS = [
  'Price / Budget mismatch',
  'Competitor won',
  'Timeline / Project postponed',
  'Product fit / Specifications mismatch',
  'No decision / Lead went silent',
  'Internal reorganization / Decision-maker left',
  'Other (see note)'
];

export const PipelineView = ({
  deals = [],
  stages = [],
  users = [],
  companies = [],
  contacts = [],
  currentUser = { id: 'usr-1', name: 'Alex Vance', role: 'Admin' },
  branding = {},
  onCreateDeal,
  onUpdateDeal,
  onDeleteDeal,
  onCreateActivity,
  onCreateTask,
  onSubmitStageGateCheck,
  onApproveStageGateCheck,
  onRejectStageGateCheck,
  onSavePartialGateCheck,
  onOpenSettings,
  onTransitionDealStage,
  onCloseLostDeal,
  onCreateRebuyDeal
}) => {
  const [draggedDealId, setDraggedDealId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Modal for Quick Add / Edit Deal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);

  // Add Activity Modal state
  const [activityModalDeal, setActivityModalDeal] = useState(null);

  // Admin Override Modal state
  const [overrideModal, setOverrideModal] = useState({
    isOpen: false,
    deal: null,
    targetStage: null,
    reason: 'Executive bypass / rapid board repositioning'
  });

  // Quick Close Lost Modal state
  const [closeLostModal, setCloseLostModal] = useState({
    isOpen: false,
    deal: null,
    reason: LOST_REASONS[0],
    note: ''
  });

  // Target Picker Modal (for stages with multiple branch transitions, e.g. Contacted -> Sample Sent OR Proposal Sent)
  const [targetPickerModal, setTargetPickerModal] = useState({
    isOpen: false,
    deal: null,
    targets: []
  });

  // Stage Gate Check Modal state
  const [isGateModalOpen, setIsGateModalOpen] = useState(false);
  const [gateCheckDeal, setGateCheckDeal] = useState(null);
  const [gateCheckFromStage, setGateCheckFromStage] = useState(null);
  const [gateCheckTargetStage, setGateCheckTargetStage] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    value: 10000,
    stageId: stages[0]?.id || '',
    expectedCloseDate: getLocalDateInputValue(),
    contactId: '',
    companyId: '',
    ownerId: currentUser.id,
    isRecurring: true,
    recurrenceDays: branding?.defaultRecurrenceDays || 60
  });

  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  const userDeals = filterByRole(deals, currentUser);

  // Filter deals by search & status
  const filteredDeals = userDeals.filter(deal => {
    const matchesSearch = searchQuery === '' ||
      deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (deal.companyName && deal.companyName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = filterStatus === 'All' || deal.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleSubmitActivityFromModal = async (payload) => {
    const { activityData, outcomeData, targetEntity } = payload;

    if (onCreateActivity) {
      await onCreateActivity(activityData);
    }

    if (outcomeData.shouldAdvanceStage && outcomeData.targetStageObj) {
      if (onTransitionDealStage) {
        await onTransitionDealStage(targetEntity.id, {
          targetStageId: outcomeData.targetStageObj.id,
          user: currentUser,
          adminOverride: currentUser.role === 'Admin',
          overrideReason: 'Advanced via activity outcome gate check'
        });
      } else if (onUpdateDeal) {
        await onUpdateDeal(targetEntity.id, {
          stageId: outcomeData.targetStageObj.id,
          stageName: outcomeData.targetStageObj.name,
          status: outcomeData.newStatus || 'Active',
          pendingGateCheck: null
        });
      }
    } else if (outcomeData.requiresManagerApproval && outcomeData.targetStageObj) {
      const fromStg = stages.find(s => s.id === targetEntity.stageId) || sortedStages[0];
      const checkPayload = {
        dealId: targetEntity.id,
        leadId: targetEntity.leadId || null,
        dealTitle: targetEntity.title,
        fromStageId: fromStg?.id,
        fromStageName: fromStg?.name || targetEntity.stageName || 'Current Stage',
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
      } else if (onUpdateDeal) {
        await onUpdateDeal(targetEntity.id, {
          status: 'Pending Review',
          pendingGateCheck: checkPayload
        });
      }
    } else if (onUpdateDeal) {
      await onUpdateDeal(targetEntity.id, {
        status: 'Follow up'
      });
    }

    if (onCreateTask && outcomeData.assignedOwnerId) {
      const activityTime = new Date(activityData.timestamp).toTimeString().slice(0, 8);
      await onCreateTask({
        title: `[Follow-up] ${activityData.type}: ${targetEntity.title}`,
        dueDate: `${outcomeData.dueDate || getLocalDateInputValueAfterDays(1)}T${activityTime}`,
        type: activityData.type === 'Meeting' ? 'Meeting' : 'Call',
        linkedType: 'Deal',
        linkedId: targetEntity.id,
        linkedTitle: targetEntity.title,
        ownerId: outcomeData.assignedOwnerId,
        ownerName: outcomeData.assignedOwnerName,
        status: 'pending',
        note: outcomeData.summaryNote
      });
    }

    setActivityModalDeal(null);
  };

  const handleDragStart = (e, dealId) => {
    if (currentUser.role !== 'Admin') {
      e.preventDefault();
      alert("Drag & Drop is reserved for Admin users. Standard Reps must complete stage gate checks using the card controls.");
      return;
    }
    e.dataTransfer.setData('text/plain', dealId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedDealId(dealId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleOpenGateCheckModal = (deal, targetStage) => {
    const fromStg = stages.find(s => s.id === deal.stageId) || sortedStages[0];
    setGateCheckDeal(deal);
    setGateCheckFromStage(fromStg);
    setGateCheckTargetStage(targetStage);
    setIsGateModalOpen(true);
  };

  const handleDrop = (e, targetStageId) => {
    e.preventDefault();
    if (currentUser.role !== 'Admin') {
      alert("Drag & Drop is reserved for Admin users.");
      return;
    }

    const dealId = e.dataTransfer.getData('text/plain') || draggedDealId;
    if (!dealId) return;

    const deal = deals.find(d => d.id === dealId);
    const targetStage = stages.find(s => s.id === targetStageId);
    if (!deal || !targetStage || deal.stageId === targetStageId) return;

    // Prompt Admin Override Modal for audit trail accountability
    setOverrideModal({
      isOpen: true,
      deal,
      targetStage,
      reason: `Admin drag-and-drop moved to ${targetStage.name}`
    });
    setDraggedDealId(null);
  };

  const handleConfirmAdminOverride = async (e) => {
    e.preventDefault();
    const { deal, targetStage, reason } = overrideModal;
    if (!deal || !targetStage) return;

    if (onTransitionDealStage) {
      await onTransitionDealStage(deal.id, {
        targetStageId: targetStage.id,
        user: currentUser,
        adminOverride: true,
        overrideReason: reason || 'Admin Kanban board drag-and-drop override'
      });
    } else if (onUpdateDeal) {
      await onUpdateDeal(deal.id, {
        stageId: targetStage.id,
        stageName: targetStage.name,
        status: targetStage.category === 'Won' ? 'Won' : targetStage.category === 'Lost' ? 'Lost' : 'Active'
      });
    }

    setOverrideModal({ isOpen: false, deal: null, targetStage: null, reason: '' });
  };

  const handleAdvanceStep = (deal) => {
    const currentStage = stages.find(s => s.id === deal.stageId);
    const currentName = currentStage?.name || deal.stageName || 'New Lead';
    const allowed = (ALLOWED_TRANSITIONS[currentName] || []).filter(name => name !== 'Closed Lost');

    if (!allowed || allowed.length === 0) {
      alert(`No forward stages available from "${currentName}".`);
      return;
    }

    if (allowed.length === 1) {
      const targetStage = stages.find(s => s.name === allowed[0]);
      if (targetStage) {
        handleOpenGateCheckModal(deal, targetStage);
      }
    } else {
      // Multiple options (e.g. Contacted -> Sample Sent OR Proposal Sent)
      const targetStageObjs = allowed.map(name => stages.find(s => s.name === name)).filter(Boolean);
      setTargetPickerModal({
        isOpen: true,
        deal,
        targets: targetStageObjs
      });
    }
  };

  const handleDemoteStep = (deal) => {
    const currentIndex = sortedStages.findIndex(s => s.id === deal.stageId);
    if (currentIndex <= 0) return;

    const prevStage = sortedStages[currentIndex - 1];
    handleOpenGateCheckModal(deal, prevStage);
  };

  const handleOpenCloseLost = (deal) => {
    setCloseLostModal({
      isOpen: true,
      deal,
      reason: LOST_REASONS[0],
      note: ''
    });
  };

  const handleConfirmCloseLost = async (e) => {
    e.preventDefault();
    const { deal, reason, note } = closeLostModal;
    if (!deal) return;

    if (!note.trim()) {
      alert('Please provide context or notes explaining why this deal was marked Lost.');
      return;
    }

    if (onCloseLostDeal) {
      await onCloseLostDeal(deal.id, {
        lostReason: reason,
        lostNote: note,
        user: currentUser
      });
    } else if (onUpdateDeal) {
      const lostStage = stages.find(s => s.name === 'Closed Lost') || { id: 'stg-lost', name: 'Closed Lost' };
      await onUpdateDeal(deal.id, {
        stageId: lostStage.id,
        stageName: lostStage.name,
        status: 'Lost',
        lostReason: reason,
        lostNote: note
      });
    }

    setCloseLostModal({ isOpen: false, deal: null, reason: LOST_REASONS[0], note: '' });
  };

  const handleCreateRebuy = async (deal) => {
    if (onCreateRebuyDeal) {
      await onCreateRebuyDeal(deal.id);
    } else {
      alert('Rebuy creation service is not available.');
    }
  };

  const handleOpenAddModal = (stageId) => {
    setEditingDeal(null);
    setFormData({
      title: '',
      value: 25000,
      stageId: stageId || sortedStages[0]?.id || '',
      expectedCloseDate: getLocalDateInputValueAfterDays(30),
      contactId: contacts[0]?.id || '',
      companyId: companies[0]?.id || '',
      ownerId: currentUser.id,
      isRecurring: true,
      recurrenceDays: branding?.defaultRecurrenceDays || 60
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (deal) => {
    setEditingDeal(deal);
    setFormData({ ...deal });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.value) return;

    if (editingDeal) {
      await onUpdateDeal(editingDeal.id, formData);
    } else {
      await onCreateDeal(formData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 md:p-8 bg-[#F6F7F8] text-[#12161C] h-full flex flex-col justify-between overflow-hidden gap-4 min-h-screen">

      {/* Top Header & Controls */}
      <div className="shrink-0 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl shadow-2xs">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-[#12161C] tracking-tight flex items-center gap-2">
              <Layers className="w-6 h-6 text-[#1D4E63]" />
              <span>Pipeline Kanban Console</span>
            </h1>
            <p className="text-xs text-[#5B6472] mt-1 font-medium">
              Manage deal opportunities, physical sample dispatches, stage gate governance & repeat customer renewals
            </p>
          </div>

          {/* Top Controls */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#5B6472] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search deals or companies..."
                className="bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#12161C] placeholder-[#5B6472] focus:outline-none focus:border-[#1D4E63]"
              />
            </div>

            <button
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>New Deal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board Layout */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 pt-1 items-stretch min-h-0 custom-horizontal-scrollbar">
        {sortedStages.map(stage => {
          const stageDeals = filteredDeals.filter(d => d.stageId === stage.id);
          const totalVal = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);

          return (
            <div
              key={stage.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              className="w-80 shrink-0 bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl p-4 flex flex-col gap-3 max-h-full shadow-2xs"
            >

              {/* Column Header */}
              <div className="flex items-center justify-between px-1 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full border border-[#D1D5DB]" style={{ backgroundColor: stage.color || '#FFFFFF' }} />
                  <h3 className="font-display font-extrabold text-sm text-[#12161C]">{stage.name}</h3>
                  <span className="text-[11px] font-mono text-[#5B6472]">
                    ({stageDeals.length})
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenAddModal(stage.id)}
                    className="p-1 text-[#5B6472] hover:text-[#12161C] rounded-lg hover:bg-[#F6F7F8]"
                    title="Add Deal"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Column Add Button */}
              <button
                onClick={() => handleOpenAddModal(stage.id)}
                className="w-full py-1.5 bg-[#F6F7F8] hover:bg-[#EEF0F3] text-[#5B6472] hover:text-[#12161C] border border-dashed border-[#E3E6EA] rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Deal to Stage</span>
              </button>

              {/* Stage Total Value Summary */}
              <div className="text-[11px] font-mono font-semibold text-[#5B6472] px-1 flex items-center justify-between border-b border-[#E3E6EA] pb-2 shrink-0">
                <span>Stage Total:</span>
                <span className="text-[#12161C] font-bold">{formatCurrency(totalVal)}</span>
              </div>

              {/* Kanban Cards List */}
              <div className="flex-1 overflow-y-auto space-y-3.5 no-scrollbar min-h-0">
                {stageDeals.length === 0 ? (
                  <div className="border border-dashed border-[#E3E6EA] rounded-xl p-5 text-center text-[11px] text-[#5B6472] font-medium bg-[#F6F7F8]/50">
                    No active deals in stage
                  </div>
                ) : (
                  stageDeals.map(deal => {
                    const isHighVal = deal.value >= 50000;
                    const priorityLabel = isHighVal ? 'High' : deal.value >= 15000 ? 'Medium' : 'Low';
                    const priorityStyle = isHighVal
                      ? 'bg-[#FDF2F1] text-[#922D27] border-[#F4C4C1]'
                      : deal.value >= 15000
                        ? 'bg-[#FEF8EC] text-[#965700] border-[#F5DDA9]'
                        : 'bg-[#EFF6F9] text-[#1D4E63] border-[#D8E8EF]';

                    // Health metrics
                    const aging = getStageAgingStatus(deal.daysInStage);
                    const stale = isDealStale(deal.lastActivityDate);
                    const overdue = isCloseDateOverdue(deal.expectedCloseDate, deal.status);
                    const proposalWarn = isProposalExpiringSoon(deal.proposalExpiryDate);

                    return (
                      <div
                        key={deal.id}
                        draggable={currentUser.role === 'Admin'}
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        className={`bg-[#FFFFFF] border border-[#E3E6EA] hover:border-[#1D4E63] p-4 rounded-xl space-y-3 transition-all shadow-[0_1px_2px_rgba(18,22,28,0.06)] group ${
                          currentUser.role === 'Admin' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                        }`}
                      >

                        {/* Top Pill Badges Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${priorityStyle}`}>
                              {priorityLabel}
                            </span>

                            {/* Stage Aging Badge */}
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${aging.bg} ${aging.text} ${aging.border}`}
                              title={`${deal.daysInStage || 0} days spent in stage (${aging.level})`}
                            >
                              <Clock className="w-2.5 h-2.5" />
                              <span>{deal.daysInStage || 0}d</span>
                            </span>

                            {/* Stale Warning Badge */}
                            {stale && (
                              <span
                                className="bg-[#FEF8EC] text-[#965700] border border-[#F5DDA9] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse"
                                title="No activity recorded in over 10 days"
                              >
                                <AlertTriangle className="w-2.5 h-2.5 text-[#C6790A]" />
                                <span>Stale</span>
                              </span>
                            )}

                            {/* Proposal Expiring Warning Badge */}
                            {proposalWarn && (
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${proposalWarn.badgeClass}`}
                                title={proposalWarn.label}
                              >
                                <Clock className="w-2.5 h-2.5" />
                                <span>{proposalWarn.label}</span>
                              </span>
                            )}

                            {/* Overdue Close Date Badge */}
                            {overdue && (
                              <span
                                className="bg-[#FDF2F1] text-[#B5423A] border border-[#F4C4C1] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                                title="Expected close date has passed"
                              >
                                <Flag className="w-2.5 h-2.5 text-[#B5423A]" />
                                <span>Overdue</span>
                              </span>
                            )}

                            {/* Rebuy Child Badge */}
                            {deal.parentDealId && (
                              <span
                                className="bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                                title={`Linked renewal child of ${deal.parentDealId}`}
                              >
                                <RefreshCw className="w-2.5 h-2.5 text-[#1D4E63]" />
                                <span>Rebuy Child</span>
                              </span>
                            )}

                            {/* Stage Gate Review Badges */}
                            {deal.pendingGateCheck ? (
                              <button
                                onClick={() => handleOpenGateCheckModal(deal, stages.find(s => s.id === deal.pendingGateCheck.targetStageId))}
                                className="bg-[#FEF8EC] text-[#965700] border border-[#F5DDA9] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-[#FDF0D5] transition-colors"
                                title="Click to review & approve transition"
                              >
                                <Clock className="w-2.5 h-2.5 text-[#965700] animate-pulse" />
                                <span>Pending Review</span>
                              </button>
                            ) : deal.partialGateState?.badgeText ? (
                              <span className="bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF] text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" title="Partial gate check draft saved">
                                <ShieldCheck className="w-2.5 h-2.5 text-[#1D4E63]" />
                                <span>{deal.partialGateState.badgeText}</span>
                              </span>
                            ) : deal.status === 'Lost' && deal.lostReason ? (
                              <span className="bg-[#FDF2F1] text-[#922D27] border border-[#F4C4C1] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5 text-[#922D27]" />
                                <span>{deal.lostReason}</span>
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Quick Close Lost trigger */}
                            {deal.status !== 'Won' && deal.status !== 'Lost' && (
                              <button
                                onClick={() => handleOpenCloseLost(deal)}
                                className="p-1 text-[#5B6472] hover:text-[#B5423A] hover:bg-[#FDF2F1] rounded opacity-0 group-hover:opacity-100 transition-all"
                                title="Quick Close as Lost"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenEditModal(deal)}
                              className="p-1 text-[#5B6472] hover:text-[#12161C] rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Edit deal details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Deal Title */}
                        <div>
                          <h4 className="font-display font-extrabold text-xs text-[#12161C] leading-snug group-hover:text-[#1D4E63] transition-colors">
                            {deal.title}
                          </h4>

                          {/* Company / Contact Name */}
                          <div className="text-[11px] text-[#5B6472] mt-1 font-medium space-y-0.5">
                            {deal.companyName && (
                              <div className="flex items-center gap-1 text-[#12161C]">
                                <Building2 className="w-3 h-3 text-[#5B6472]" />
                                <span className="truncate">{deal.companyName}</span>
                              </div>
                            )}
                            {deal.contactName && (
                              <div className="flex items-center gap-1 text-[#5B6472]">
                                <User className="w-3 h-3 text-[#5B6472]" />
                                <span className="truncate">{deal.contactName}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Value & Recurring Tag */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#E3E6EA]">
                          <span className="font-mono font-extrabold text-[#255B40] text-xs">
                            {formatCurrency(deal.value, deal.currency)}
                          </span>

                          {deal.isRecurring && (
                            <span className="bg-[#FEF8EC] text-[#965700] border border-[#F5DDA9] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1" title="Repeat Order Cycle">
                              <RefreshCw className="w-2.5 h-2.5 text-[#965700]" />
                              <span>{deal.recurrenceDays || 60}d</span>
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-1.5 pt-1">
                          {/* Create Rebuy Button for Won Deals */}
                          {(deal.status === 'Won' || deal.stageName === 'Closed Won') && (
                            <button
                              onClick={() => handleCreateRebuy(deal)}
                              className="w-full py-1.5 px-2 bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] rounded-lg text-[11px] text-[#15803D] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                              title="Create child rebuy deal without mutating this Won contract"
                            >
                              <RefreshCw className="w-3 h-3 text-[#15803D]" />
                              <span>Generate Rebuy Deal</span>
                            </button>
                          )}

                          {/* Quick Add Activity & Qualification Button */}
                          <button
                            onClick={() => setActivityModalDeal(deal)}
                            className="w-full py-1.5 px-2 bg-[#F6F7F8] hover:bg-[#EFF6F9] border border-[#E3E6EA] hover:border-[#D8E8EF] rounded-lg text-[11px] text-[#1D4E63] font-bold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <PhoneCall className="w-3 h-3 text-[#1D4E63]" />
                            <span>Log Activity & Gate Check</span>
                          </button>
                        </div>

                        {/* Card Footer */}
                        <div className="flex items-center justify-between pt-1 text-[10px] text-[#5B6472]">
                          <div className="flex items-center -space-x-1.5">
                            <div className="w-5 h-5 rounded-full bg-[#1D4E63] text-white font-mono font-extrabold flex items-center justify-center text-[10px] ring-2 ring-[#FFFFFF]">
                              {deal.ownerName ? deal.ownerName.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <span className="text-[11px] font-medium text-[#12161C] pl-2.5">
                              {deal.ownerName || 'Alex Vance'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-[#5B6472] font-mono">
                              <Flag className="w-3 h-3 text-[#B5423A]" />
                              <span>{deal.expectedCloseDate ? deal.expectedCloseDate.substring(5) : 'Aug 25'}</span>
                            </div>

                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => handleDemoteStep(deal)}
                                className="p-1 text-[#5B6472] hover:text-[#12161C] hover:bg-[#F6F7F8] rounded"
                                title="Demote / previous stage (requires mandatory demotion reason)"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleAdvanceStep(deal)}
                                className="p-1 text-[#5B6472] hover:text-[#12161C] hover:bg-[#F6F7F8] rounded"
                                title="Advance to next stage (Stage Gate Check)"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                        </div>

                      </div>
                    );
                  })
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Target Picker Modal (For branching stages, e.g. Contacted -> Sample Sent OR Proposal Sent) */}
      {targetPickerModal.isOpen && targetPickerModal.deal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-[#12161C]">
            <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
              <div>
                <h2 className="font-display text-sm font-bold text-[#12161C]">Select Next Pipeline Stage</h2>
                <p className="text-xs text-[#5B6472] mt-0.5">
                  Choose the destination stage for <strong>{targetPickerModal.deal.title}</strong>
                </p>
              </div>
              <button
                onClick={() => setTargetPickerModal({ isOpen: false, deal: null, targets: [] })}
                className="text-[#5B6472] hover:text-[#12161C] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {targetPickerModal.targets.map(targetStage => {
                const isSkipSample = targetStage.name === 'Proposal Sent' && targetPickerModal.deal.stageName === 'Contacted';

                return (
                  <button
                    key={targetStage.id}
                    onClick={() => {
                      const deal = targetPickerModal.deal;
                      setTargetPickerModal({ isOpen: false, deal: null, targets: [] });
                      handleOpenGateCheckModal(deal, targetStage);
                    }}
                    className="w-full text-left p-3.5 rounded-xl border border-[#E3E6EA] hover:border-[#1D4E63] hover:bg-[#F6F7F8] transition-all flex items-start justify-between group"
                  >
                    <div>
                      <div className="font-bold text-xs text-[#12161C] flex items-center gap-2">
                        <span>{targetStage.name}</span>
                        {isSkipSample && (
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF] rounded-full font-semibold">
                            Skip Sample
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#5B6472] mt-1">
                        {isSkipSample
                          ? 'Buyer waived physical sample trial. Proceed directly to price quotation & proposal gate check.'
                          : `Advance deal to ${targetStage.name} stage verification.`}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#5B6472] group-hover:text-[#1D4E63] shrink-0 mt-0.5" />
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setTargetPickerModal({ isOpen: false, deal: null, targets: [] })}
                className="px-4 py-1.5 text-xs text-[#5B6472] hover:text-[#12161C] font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Override Modal (Mandatory accountability for Admin drag-and-drop & bypasses) */}
      {overrideModal.isOpen && overrideModal.deal && overrideModal.targetStage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-[#12161C]">
            <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#C6790A]" />
                <h2 className="font-display text-sm font-bold text-[#12161C]">Admin Stage Override Verification</h2>
              </div>
              <button
                onClick={() => setOverrideModal({ isOpen: false, deal: null, targetStage: null, reason: '' })}
                className="text-[#5B6472] hover:text-[#12161C] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#FEF8EC] border border-[#F5DDA9] p-3.5 rounded-xl text-xs text-[#965700] space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Audited Governance Override</span>
              </div>
              <p className="text-[#5B6472]">
                You are transitioning <strong>{overrideModal.deal.title}</strong> directly from <strong>{overrideModal.deal.stageName}</strong> to <strong>{overrideModal.targetStage.name}</strong>. This bypass will be permanently logged in the audit ledger.
              </p>
            </div>

            <form onSubmit={handleConfirmAdminOverride} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#12161C] font-bold mb-1">
                  Override Justification / Reason *
                </label>
                <input
                  type="text"
                  required
                  value={overrideModal.reason}
                  onChange={(e) => setOverrideModal({ ...overrideModal, reason: e.target.value })}
                  placeholder="e.g. Executive approval by VP of Sales, client expedited onboarding"
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E3E6EA]">
                <button
                  type="button"
                  onClick={() => setOverrideModal({ isOpen: false, deal: null, targetStage: null, reason: '' })}
                  className="px-4 py-2 bg-[#F6F7F8] hover:bg-[#EEF0F3] text-[#5B6472] rounded-full font-semibold border border-[#E3E6EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white rounded-full font-bold shadow-2xs"
                >
                  Confirm &amp; Log Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Close Lost Modal */}
      {closeLostModal.isOpen && closeLostModal.deal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-[#12161C]">
            <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-[#B5423A]" />
                <h2 className="font-display text-sm font-bold text-[#12161C]">Close Deal as Lost</h2>
              </div>
              <button
                onClick={() => setCloseLostModal({ isOpen: false, deal: null, reason: LOST_REASONS[0], note: '' })}
                className="text-[#5B6472] hover:text-[#12161C] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCloseLost} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#12161C] font-bold mb-1">
                  Deal Opportunity
                </label>
                <p className="text-xs font-semibold text-[#5B6472] bg-[#F6F7F8] p-2 rounded-lg border border-[#E3E6EA]">
                  {closeLostModal.deal.title} ({formatCurrency(closeLostModal.deal.value)})
                </p>
              </div>

              <div>
                <label className="block text-[#12161C] font-bold mb-1">
                  Primary Lost Reason *
                </label>
                <select
                  value={closeLostModal.reason}
                  onChange={(e) => setCloseLostModal({ ...closeLostModal, reason: e.target.value })}
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
                >
                  {LOST_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#12161C] font-bold mb-1">
                  Context / Notes (Mandatory) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={closeLostModal.note}
                  onChange={(e) => setCloseLostModal({ ...closeLostModal, note: e.target.value })}
                  placeholder="Detail what happened, which competitor won, or pricing friction observed..."
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E3E6EA]">
                <button
                  type="button"
                  onClick={() => setCloseLostModal({ isOpen: false, deal: null, reason: LOST_REASONS[0], note: '' })}
                  className="px-4 py-2 bg-[#F6F7F8] hover:bg-[#EEF0F3] text-[#5B6472] rounded-full font-semibold border border-[#E3E6EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#B5423A] hover:bg-[#922D27] text-white rounded-full font-bold shadow-2xs"
                >
                  Confirm Close Lost
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Deal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl text-[#12161C]">

            <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
              <h2 className="font-display text-sm font-bold text-[#12161C]">
                {editingDeal ? 'Edit Deal Opportunity' : 'Create New Deal Opportunity'}
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
                <label className="block text-[#5B6472] font-semibold mb-1">Deal Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. AeroTech Q3 Packaging Contract"
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Value (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Pipeline Stage</label>
                  <select
                    value={formData.stageId}
                    onChange={(e) => setFormData({ ...formData, stageId: e.target.value })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
                  >
                    {sortedStages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Linked Company</label>
                  <select
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
                  >
                    <option value="">-- None --</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Linked Contact</label>
                  <select
                    value={formData.contactId}
                    onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
                  >
                    <option value="">-- None --</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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

                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Expected Close Date</label>
                  <input
                    type="date"
                    value={formData.expectedCloseDate}
                    onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] font-mono"
                  />
                </div>
              </div>

              {/* Recurrence Settings */}
              <div className="bg-[#F6F7F8] border border-[#E3E6EA] p-3.5 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-[#12161C]">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="rounded border-[#E3E6EA] bg-[#FFFFFF] text-[#1D4E63] focus:ring-0"
                  />
                  <span className="font-semibold text-xs">Enable Repeat Order Cycle</span>
                </label>
                {formData.isRecurring && (
                  <div>
                    <label className="block text-[11px] text-[#5B6472] mb-1 font-medium">
                      Auto Renewal Cycle (Days after Won status to generate Rebuy opportunity)
                    </label>
                    <input
                      type="number"
                      value={formData.recurrenceDays || 60}
                      onChange={(e) => setFormData({ ...formData, recurrenceDays: Number(e.target.value) })}
                      className="w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl p-2 text-[#12161C] focus:outline-none focus:border-[#1D4E63] font-mono"
                    />
                  </div>
                )}
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
                  Save Deal
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Stage Gate Qualification Check Modal */}
      <StageGateCheckModal
        isOpen={isGateModalOpen}
        onClose={() => setIsGateModalOpen(false)}
        deal={gateCheckDeal}
        fromStage={gateCheckFromStage}
        targetStage={gateCheckTargetStage}
        currentUser={currentUser}
        onSubmitCheck={onSubmitStageGateCheck}
        onApproveCheck={onApproveStageGateCheck}
        onRejectCheck={onRejectStageGateCheck}
        onSaveDraft={onSavePartialGateCheck}
      />

      {/* Add Activity & Stage Qualification Modal */}
      <AddActivityModal
        isOpen={Boolean(activityModalDeal)}
        onClose={() => setActivityModalDeal(null)}
        targetEntity={activityModalDeal}
        entityType="Deal"
        stages={stages}
        deals={deals}
        users={users}
        currentUser={currentUser}
        onSubmitActivity={handleSubmitActivityFromModal}
      />

    </div>
  );
};
