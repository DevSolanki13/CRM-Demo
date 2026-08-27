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
  MoreHorizontal,
  Flag,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Layers,
  PhoneCall,
  CheckCircle2
} from 'lucide-react';
import { formatCurrency, filterByRole } from '../utils/crmHelpers.js';
import { StageGateCheckModal } from './StageGateCheckModal.jsx';
import { AddActivityModal } from './AddActivityModal.jsx';

export const PipelineView = ({
  deals,
  stages,
  users,
  companies,
  contacts,
  currentUser,
  branding,
  onCreateDeal,
  onUpdateDeal,
  onDeleteDeal,
  onCreateActivity,
  onCreateTask,
  onSubmitStageGateCheck,
  onApproveStageGateCheck,
  onRejectStageGateCheck,
  onSavePartialGateCheck,
  onOpenSettings
}) => {
  const [draggedDealId, setDraggedDealId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Modal for Quick Add / Edit Deal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);

  // Add Activity Modal state
  const [activityModalDeal, setActivityModalDeal] = useState(null);

  const handleSubmitActivityFromModal = async (payload) => {
    const { activityData, outcomeData, targetEntity } = payload;

    if (onCreateActivity) {
      await onCreateActivity(activityData);
    }

    if (outcomeData.shouldAdvanceStage && outcomeData.targetStageObj && onUpdateDeal) {
      // Auto-approved (Admin / Manager)
      await onUpdateDeal(targetEntity.id, {
        stageId: outcomeData.targetStageObj.id,
        stageName: outcomeData.targetStageObj.name,
        status: outcomeData.newStatus || 'Active',
        pendingGateCheck: null
      });
    } else if (outcomeData.requiresManagerApproval && outcomeData.targetStageObj) {
      // Pending Manager / Admin Approval Request (Sales Rep)
      if (onSubmitStageGateCheck) {
        await onSubmitStageGateCheck(targetEntity.id, {
          targetStageId: outcomeData.targetStageObj.id,
          submittedById: currentUser.id,
          submittedByName: currentUser.name,
          submittedAt: new Date().toISOString(),
          answers: outcomeData.criteriaAnswers,
          badgeText: `Pending ${outcomeData.targetStageObj.name} Approval`
        });
      } else if (onUpdateDeal) {
        await onUpdateDeal(targetEntity.id, {
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
    } else if (onUpdateDeal) {
      // Unfulfilled criteria or disconnected
      await onUpdateDeal(targetEntity.id, {
        status: 'Follow up'
      });
    }

    if (onCreateTask && outcomeData.assignedOwnerId) {
      await onCreateTask({
        title: `[Follow-up] ${activityData.type}: ${targetEntity.title}`,
        dueDate: outcomeData.dueDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
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

  // Stage Gate Check Modal state
  const [isGateModalOpen, setIsGateModalOpen] = useState(false);
  const [gateCheckDeal, setGateCheckDeal] = useState(null);
  const [gateCheckFromStage, setGateCheckFromStage] = useState(null);
  const [gateCheckTargetStage, setGateCheckTargetStage] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    value: 10000,
    stageId: stages[0]?.id || '',
    expectedCloseDate: new Date().toISOString().split('T')[0],
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

  const handleDragStart = (e, dealId) => {
    if (currentUser.role !== 'Admin') {
      e.preventDefault();
      alert("Drag & Drop is reserved for Admin users. Please click 'Stage Gate Check' or the arrow controls on the deal card.");
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

  const handleDrop = async (e, targetStageId) => {
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

    if (onUpdateDeal) {
      await onUpdateDeal(deal.id, {
        stageId: targetStage.id,
        stageName: targetStage.name
      });
    }
    setDraggedDealId(null);
  };

  const handleMoveStep = async (deal, direction) => {
    const currentIndex = sortedStages.findIndex(s => s.id === deal.stageId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= sortedStages.length) return;

    const nextStage = sortedStages[newIndex];

    if (currentUser.role === 'Admin') {
      if (onUpdateDeal) {
        await onUpdateDeal(deal.id, {
          stageId: nextStage.id,
          stageName: nextStage.name
        });
      }
      return;
    }

    handleOpenGateCheckModal(deal, nextStage);
  };

  const handleOpenAddModal = (stageId) => {
    setEditingDeal(null);
    setFormData({
      title: '',
      value: 25000,
      stageId: stageId || sortedStages[0]?.id || '',
      expectedCloseDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
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
              Manage deal opportunities, physical sample dispatches & repeat customer renewals
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
                placeholder="Search deals..."
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
          const totalVal = stageDeals.reduce((sum, d) => sum + d.value, 0);

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

                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold bg-[#F6F7F8] text-[#5B6472] border border-[#E3E6EA]">
                              {deal.isRecurring ? 'Recurring' : 'B2B Deal'}
                            </span>

                            {/* Stage Gate Badges */}
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

                          <button
                            onClick={() => handleOpenEditModal(deal)}
                            className="p-1 text-[#5B6472] hover:text-[#12161C] rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
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



                        {/* Quick Add Activity & Qualification Button */}
                        <button
                          onClick={() => setActivityModalDeal(deal)}
                          className="w-full py-1.5 px-2 bg-[#F6F7F8] hover:bg-[#EFF6F9] border border-[#E3E6EA] hover:border-[#D8E8EF] rounded-lg text-[11px] text-[#1D4E63] font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <PhoneCall className="w-3 h-3 text-[#1D4E63]" />
                          <span>Log Activity & Gate Check</span>
                        </button>

                        {/* Card Footer */}
                        <div className="flex items-center justify-between pt-1 text-[10px] text-[#5B6472]">
                          <div className="flex items-center -space-x-1.5">
                            <div className="w-5 h-5 rounded-full bg-[#1D4E63] text-white font-mono font-extrabold flex items-center justify-center text-[10px] ring-2 ring-[#FFFFFF]">
                              {deal.ownerName ? deal.ownerName.charAt(0).toUpperCase() : 'A'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-[#5B6472] font-mono">
                              <Flag className="w-3 h-3 text-[#B5423A]" />
                              <span>{deal.expectedCloseDate ? deal.expectedCloseDate.substring(5) : 'Aug 25'}</span>
                            </div>

                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => handleMoveStep(deal, 'prev')}
                                className="p-1 text-[#5B6472] hover:text-[#12161C] hover:bg-[#F6F7F8] rounded"
                                title="Previous stage"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMoveStep(deal, 'next')}
                                className="p-1 text-[#5B6472] hover:text-[#12161C] hover:bg-[#F6F7F8] rounded"
                                title="Next stage"
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
                      Auto Renewal Cycle (Days after Won status to flip to "Buy Again")
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
