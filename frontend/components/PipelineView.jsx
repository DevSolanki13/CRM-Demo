import React, { useState } from 'react';
import {
  Kanban,
  Plus,
  Building2,
  User,
  RefreshCw,
  Edit3,
  ChevronRight,
  ChevronLeft,
  X,
  Search,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  Flag,
  MessageSquare,
  Paperclip,
  LayoutGrid,
  List,
  BarChart2,
  ShieldCheck,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency, filterByRole } from '../utils/crmHelpers.js';
import { StageGateCheckModal } from './StageGateCheckModal.jsx';

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
  onSubmitStageGateCheck,
  onApproveStageGateCheck,
  onRejectStageGateCheck,
  onSavePartialGateCheck,
  onOpenSettings
}) => {
  const [draggedDealId, setDraggedDealId] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('Board');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Modal for Quick Add / Edit Deal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);

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
    recurrenceDays: branding.defaultRecurrenceDays || 60
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
      alert("Drag & Drop is reserved for Admin users. Please click 'Stage Gate Check' on the deal card.");
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

    // Admin drag-and-drop updates stage directly with no questions/modals
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

    // Trigger stage gate modal (advancing or backward demotion) for non-admin target stage
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
      recurrenceDays: branding.defaultRecurrenceDays || 60
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
    <div className="p-6 bg-[#131316] text-white h-full flex flex-col justify-between overflow-hidden gap-4">

      {/* Top Header & Controls */}
      <div className="shrink-0 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Pipeline Board</h1>
            <p className="text-xs text-zinc-400 mt-1 font-medium">
              Manage deal opportunities, physical sample dispatches & repeat customer renewals
            </p>
          </div>

          {/* Top Controls: New Lead CTA */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 text-black" />
              <span>New Lead</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board Layout (Inspiration from kanban inspiration.jpg & Tempo) */}
      <div className="flex-1 flex gap-5 overflow-x-auto pb-3 pt-1 items-stretch min-h-0 custom-horizontal-scrollbar">
        {sortedStages.map(stage => {
          const stageDeals = filteredDeals.filter(d => d.stageId === stage.id);
          const totalVal = stageDeals.reduce((sum, d) => sum + d.value, 0);

          return (
            <div
              key={stage.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              className="w-80 shrink-0 bg-[#1c1c21] border border-[#2c2c34] rounded-2xl p-4 flex flex-col gap-3 max-h-full"
            >

              {/* Column Header (Title, card count, 3-dots context menu) */}
              <div className="flex items-center justify-between px-1 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                  <h3 className="font-extrabold text-sm text-white">{stage.name}</h3>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {stageDeals.length} cards
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenAddModal(stage.id)}
                    className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-[#24242b]"
                    title="Add Deal"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1 text-zinc-500 hover:text-white rounded-lg hover:bg-[#24242b]">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Full-width Column Add Button (Taskori Inspiration Feature) */}
              <button
                onClick={() => handleOpenAddModal(stage.id)}
                className="w-full py-1.5 bg-[#24242b] hover:bg-[#2c2c36] text-zinc-400 hover:text-white border border-dashed border-[#383844] rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {/* Stage Total Value Summary */}
              <div className="text-[11px] font-semibold text-zinc-500 px-1 flex items-center justify-between border-b border-[#2c2c34] pb-2 shrink-0">
                <span>Stage Total:</span>
                <span className="text-white font-bold">{formatCurrency(totalVal)}</span>
              </div>

              {/* Kanban Cards List with Individual Column Vertical Scroll (Hidden Scrollbar) */}
              <div className="flex-1 overflow-y-auto space-y-3.5 no-scrollbar min-h-0">
                {stageDeals.length === 0 ? (
                  <div className="border border-dashed border-[#2c2c34] rounded-xl p-5 text-center text-[11px] text-zinc-600 font-medium">
                    No active deals in stage
                  </div>
                ) : (
                  stageDeals.map(deal => {
                    // Priority Pill logic based on deal value & status
                    const isHighVal = deal.value >= 50000;
                    const priorityLabel = isHighVal ? 'High' : deal.value >= 15000 ? 'Medium' : 'Low';
                    const priorityStyle = isHighVal
                      ? 'bg-rose-950/80 text-rose-300 border-rose-800/60'
                      : deal.value >= 15000
                        ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                        : 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60';

                    return (
                      <div
                        key={deal.id}
                        draggable={currentUser.role === 'Admin'}
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        className={`bg-[#24242b] border border-[#2f2f3a] hover:border-zinc-400 p-4 rounded-xl space-y-3 transition-all hover:shadow-2xl group ${currentUser.role === 'Admin' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                          }`}
                      >

                        {/* Top Pill Badges Row & Context Menu */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${priorityStyle}`}>
                              {priorityLabel}
                            </span>

                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#18181c] text-zinc-300 border border-[#2e2e38]">
                              {deal.isRecurring ? 'Recurring' : 'B2B Deal'}
                            </span>

                            {/* Stage Gate Badges */}
                            {deal.pendingGateCheck ? (
                              <button
                                onClick={() => handleOpenGateCheckModal(deal, stages.find(s => s.id === deal.pendingGateCheck.targetStageId))}
                                className="bg-amber-950/80 text-amber-300 border border-amber-800/80 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-amber-900 transition-colors"
                                title="Click to review & approve transition"
                              >
                                <Clock className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                                <span>Pending Review</span>
                              </button>
                            ) : deal.partialGateState?.badgeText ? (
                              <span className="bg-[#18181c] text-blue-300 border border-blue-800/60 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" title="Partial gate check draft saved">
                                <ShieldCheck className="w-2.5 h-2.5 text-blue-400" />
                                <span>{deal.partialGateState.badgeText}</span>
                              </span>
                            ) : deal.status === 'Lost' && deal.lostReason ? (
                              <span className="bg-rose-950/80 text-rose-300 border border-rose-800/80 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                                <span>{deal.lostReason}</span>
                              </span>
                            ) : null}
                          </div>

                          <button
                            onClick={() => handleOpenEditModal(deal)}
                            className="p-1 text-zinc-500 hover:text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Deal Title */}
                        <div>
                          <h4 className="font-extrabold text-xs text-white leading-snug group-hover:text-emerald-400 transition-colors">
                            {deal.title}
                          </h4>

                          {/* Company / Contact Name */}
                          <div className="text-[11px] text-zinc-400 mt-1 font-medium space-y-0.5">
                            {deal.companyName && (
                              <div className="flex items-center gap-1 text-zinc-300">
                                <Building2 className="w-3 h-3 text-zinc-500" />
                                <span className="truncate">{deal.companyName}</span>
                              </div>
                            )}
                            {deal.contactName && (
                              <div className="flex items-center gap-1 text-zinc-400">
                                <User className="w-3 h-3 text-zinc-500" />
                                <span className="truncate">{deal.contactName}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Value & Recurring Tag */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#2f2f3a]">
                          <span className="font-extrabold text-emerald-400 text-xs">
                            {formatCurrency(deal.value, deal.currency)}
                          </span>

                          {deal.isRecurring && (
                            <span className="bg-amber-950/80 text-amber-300 border border-amber-800/80 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" title="Repeat Order Cycle">
                              <RefreshCw className="w-2.5 h-2.5 text-amber-400" />
                              <span>{deal.recurrenceDays || 60}d</span>
                            </span>
                          )}
                        </div>

                        {/* Card Footer: Avatar Stack & Meta Badges (Taskori Inspiration Feature) */}
                        <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-400">

                          {/* Assigned Owner Avatar Stack */}
                          <div className="flex items-center -space-x-1.5">
                            <div className="w-5 h-5 rounded-full bg-white text-black font-extrabold flex items-center justify-center text-[10px] ring-2 ring-[#24242b]">
                              {deal.ownerName ? deal.ownerName.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <div className="w-5 h-5 rounded-full bg-zinc-700 text-white font-bold flex items-center justify-center text-[9px] ring-2 ring-[#24242b]">
                              +1
                            </div>
                          </div>

                          {/* Close Date Flag & Direct Navigation Controls */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-zinc-400 font-mono">
                              <Flag className="w-3 h-3 text-rose-400" />
                              <span>{deal.expectedCloseDate ? deal.expectedCloseDate.substring(5) : 'Aug 25'}</span>
                            </div>

                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => handleMoveStep(deal, 'prev')}
                                className="p-1 text-zinc-500 hover:text-white hover:bg-[#18181c] rounded"
                                title="Previous stage"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMoveStep(deal, 'next')}
                                className="p-1 text-zinc-500 hover:text-white hover:bg-[#18181c] rounded"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c21] border border-[#2c2c34] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-white">

            <div className="flex items-center justify-between border-b border-[#2c2c34] pb-3">
              <h2 className="text-sm font-bold text-white">
                {editingDeal ? 'Edit Deal Opportunity' : 'Create New Deal Opportunity'}
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
                <label className="block text-zinc-400 font-semibold mb-1">Deal Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. AeroTech Q3 Packaging Contract"
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Value ($) *</label>
                  <input
                    type="number"
                    required
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Pipeline Stage</label>
                  <select
                    value={formData.stageId}
                    onChange={(e) => setFormData({ ...formData, stageId: e.target.value })}
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                  >
                    {sortedStages.map(s => (
                      <option key={s.id} value={s.id} className="bg-[#1c1c21]">{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Linked Company</label>
                  <select
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                  >
                    <option value="" className="bg-[#1c1c21]">-- None --</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#1c1c21]">{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Linked Contact</label>
                  <select
                    value={formData.contactId}
                    onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                  >
                    <option value="" className="bg-[#1c1c21]">-- None --</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#1c1c21]">{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Expected Close Date</label>
                  <input
                    type="date"
                    value={formData.expectedCloseDate}
                    onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              {/* Recurrence Repeat Order Settings */}
              <div className="bg-[#18181c] border border-[#2e2e38] p-3.5 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="rounded border-zinc-700 bg-zinc-900 text-emerald-400 focus:ring-0"
                  />
                  <span className="font-semibold text-xs">Enable Repeat Order Cycle</span>
                </label>
                {formData.isRecurring && (
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                      Auto Renewal Cycle (Days after Won status to flip to "Buy Again")
                    </label>
                    <input
                      type="number"
                      value={formData.recurrenceDays || 60}
                      onChange={(e) => setFormData({ ...formData, recurrenceDays: Number(e.target.value) })}
                      className="w-full bg-[#24242b] border border-[#2f2f3a] rounded-xl p-2 text-white focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                )}
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

    </div>
  );
};

