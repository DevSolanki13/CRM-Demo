import React, { useState } from 'react';
import { 
  Kanban, 
  Plus, 
  DollarSign, 
  Building2, 
  User, 
  Clock, 
  RefreshCw, 
  Sparkles, 
  MoreHorizontal, 
  Trash2, 
  Edit3, 
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';
import { Deal, PipelineStage, User as UserType, Company, Contact, CRMBrandingSettings } from '../types/crm';
import { formatCurrency, formatDate, filterByRole } from '../utils/crmHelpers';

interface PipelineViewProps {
  deals: Deal[];
  stages: PipelineStage[];
  users: UserType[];
  companies: Company[];
  contacts: Contact[];
  currentUser: UserType;
  branding: CRMBrandingSettings;
  onCreateDeal: (deal: Partial<Deal>) => Promise<void>;
  onUpdateDeal: (id: string, deal: Partial<Deal>) => Promise<void>;
  onDeleteDeal: (id: string) => Promise<void>;
  onOpenSettings: () => void;
}

export const PipelineView: React.FC<PipelineViewProps> = ({
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
  onOpenSettings
}) => {
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  
  // Modal for Quick Add / Edit Deal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const [formData, setFormData] = useState<Partial<Deal>>({
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
  const userDeals = filterByRole<Deal>(deals, currentUser);

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId);
    setDraggedDealId(dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('text/plain') || draggedDealId;
    if (!dealId) return;

    const targetStage = stages.find(s => s.id === targetStageId);
    if (!targetStage) return;

    await onUpdateDeal(dealId, {
      stageId: targetStage.id,
      stageName: targetStage.name
    });

    setDraggedDealId(null);
  };

  const handleMoveStep = async (deal: Deal, direction: 'prev' | 'next') => {
    const currentIndex = sortedStages.findIndex(s => s.id === deal.stageId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= sortedStages.length) return;

    const nextStage = sortedStages[newIndex];
    await onUpdateDeal(deal.id, {
      stageId: nextStage.id,
      stageName: nextStage.name
    });
  };

  const handleOpenAddModal = (stageId?: string) => {
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

  const handleOpenEditModal = (deal: Deal) => {
    setEditingDeal(deal);
    setFormData({ ...deal });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
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
    <div className="p-6 space-y-6 bg-[#f5f5f0] text-[#2d2d2a] min-h-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e0e0d5] p-6 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#2d2d2a] font-serif italic flex items-center gap-2">
            <Kanban className="w-5 h-5 text-[#5A5A40]" />
            <span>Sales Pipeline Kanban Board</span>
          </h1>
          <p className="text-xs text-[#6b6b60] mt-1 font-medium">
            Drag and drop deals across custom stages. Physical sampling & repeat renewal stages highlighted.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="px-4 py-2 bg-[#f5f5f0] hover:bg-[#eaeae2] text-[#2d2d2a] rounded-full text-xs font-semibold border border-[#e0e0d5] transition-colors"
          >
            Customize Stage Names
          </button>
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white rounded-full text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Opportunity</span>
          </button>
        </div>
      </div>

      {/* Kanban Stages Container (Horizontal scroll) */}
      <div className="flex gap-4 overflow-x-auto pb-6 items-start min-h-[600px] scrollbar-thin scrollbar-thumb-[#e0e0d5]">
        {sortedStages.map(stage => {
          const stageDeals = userDeals.filter(d => d.stageId === stage.id);
          const totalVal = stageDeals.reduce((sum, d) => sum + d.value, 0);

          const isSampleStage = stage.category === 'Sample Sent';
          const isBuyAgainStage = stage.category === 'Buy Again';

          return (
            <div
              key={stage.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`w-72 shrink-0 rounded-2xl p-3.5 flex flex-col gap-3 transition-colors ${
                isSampleStage ? 'bg-[#5A5A40]/10 border border-[#5A5A40]/30' :
                isBuyAgainStage ? 'bg-amber-50 border border-amber-200' :
                'bg-white border border-[#e0e0d5] shadow-xs'
              }`}
            >
              
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-[#e0e0d5] pb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="font-bold text-xs text-[#2d2d2a] font-serif">{stage.name}</span>
                  <span className="bg-[#f5f5f0] text-[#5A5A40] font-bold text-[10px] px-2 py-0.5 rounded-full border border-[#e0e0d5]">
                    {stageDeals.length}
                  </span>
                </div>
                <button
                  onClick={() => handleOpenAddModal(stage.id)}
                  className="p-1 text-[#6b6b60] hover:text-[#2d2d2a] hover:bg-[#f5f5f0] rounded-lg"
                  title="Add Deal to Stage"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Total Stage Value */}
              <div className="text-[11px] font-semibold text-[#6b6b60] px-1 flex items-center justify-between">
                <span>Total Value:</span>
                <span className="text-[#2d2d2a] font-bold">{formatCurrency(totalVal)}</span>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 min-h-[400px]">
                {stageDeals.length === 0 ? (
                  <div className="border border-dashed border-[#e0e0d5] rounded-xl p-4 text-center text-[11px] text-[#6b6b60]/60 italic font-medium">
                    No deals in this stage
                  </div>
                ) : (
                  stageDeals.map(deal => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      className="bg-[#fcfcf9] border border-[#e0e0d5] hover:border-[#5A5A40] p-3.5 rounded-xl shadow-xs space-y-2.5 cursor-grab active:cursor-grabbing transition-all hover:shadow-md group"
                    >
                      {/* Deal Title & Action */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-xs text-[#2d2d2a] leading-snug group-hover:text-[#5A5A40] transition-colors">
                          {deal.title}
                        </h4>
                        <button
                          onClick={() => handleOpenEditModal(deal)}
                          className="text-[#6b6b60] hover:text-[#2d2d2a] p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Company & Contact */}
                      <div className="text-[11px] text-[#6b6b60] space-y-0.5 font-medium">
                        {deal.companyName && (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-[#5A5A40]" />
                            <span className="truncate">{deal.companyName}</span>
                          </div>
                        )}
                        {deal.contactName && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-[#5A5A40]" />
                            <span className="truncate">{deal.contactName}</span>
                          </div>
                        )}
                      </div>

                      {/* Value & Badges */}
                      <div className="flex items-center justify-between pt-1 border-t border-[#e0e0d5] text-xs">
                        <span className="font-extrabold text-[#5A5A40]">
                          {formatCurrency(deal.value, deal.currency)}
                        </span>

                        {deal.isRecurring && (
                          <span className="bg-pink-50 text-pink-700 border border-pink-200 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" title="Recurring Order Cycle">
                            <RefreshCw className="w-2.5 h-2.5" />
                            <span>{deal.recurrenceDays || 60}d</span>
                          </span>
                        )}
                      </div>

                      {/* Footer: Rep Owner Avatar & Stage Movement Buttons */}
                      <div className="flex items-center justify-between pt-1 text-[10px] text-[#6b6b60] font-medium">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-[#5A5A40] text-white font-bold flex items-center justify-center text-[9px]">
                            {deal.ownerName ? deal.ownerName.charAt(0) : 'U'}
                          </div>
                          <span>{deal.ownerName || 'Unassigned'}</span>
                        </div>

                        {/* Direct Stage Shift Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveStep(deal, 'prev')}
                            className="p-1 text-[#6b6b60] hover:text-[#2d2d2a] hover:bg-[#f5f5f0] rounded"
                            title="Move to previous stage"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleMoveStep(deal, 'next')}
                            className="p-1 text-[#6b6b60] hover:text-[#2d2d2a] hover:bg-[#f5f5f0] rounded"
                            title="Move to next stage"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Add / Edit Deal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#2d2d2a]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e0e0d5] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-[#2d2d2a]">
            
            <div className="flex items-center justify-between border-b border-[#e0e0d5] pb-3">
              <h2 className="text-sm font-bold text-[#2d2d2a] font-serif">
                {editingDeal ? 'Edit Deal Opportunity' : 'Create New Deal Opportunity'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-[#6b6b60] hover:text-[#2d2d2a] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              
              <div>
                <label className="block text-[#6b6b60] font-semibold mb-1">Deal Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. AeroTech Q3 Packaging Contract"
                  className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#6b6b60] font-semibold mb-1">Value ($) *</label>
                  <input
                    type="number"
                    required
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                  />
                </div>

                <div>
                  <label className="block text-[#6b6b60] font-semibold mb-1">Pipeline Stage</label>
                  <select
                    value={formData.stageId}
                    onChange={(e) => setFormData({ ...formData, stageId: e.target.value })}
                    className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                  >
                    {sortedStages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#6b6b60] font-semibold mb-1">Linked Company</label>
                  <select
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                  >
                    <option value="">-- None --</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#6b6b60] font-semibold mb-1">Linked Contact</label>
                  <select
                    value={formData.contactId}
                    onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                    className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
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
                  <label className="block text-[#6b6b60] font-semibold mb-1">Assigned Owner</label>
                  <select
                    value={formData.ownerId}
                    onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                    className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#6b6b60] font-semibold mb-1">Expected Close Date</label>
                  <input
                    type="date"
                    value={formData.expectedCloseDate}
                    onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                    className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                  />
                </div>
              </div>

              {/* Recurrence Repeat Order Settings */}
              <div className="bg-[#f5f5f0] border border-[#e0e0d5] p-3.5 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-[#2d2d2a]">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="rounded border-[#e0e0d5] bg-white text-[#5A5A40] focus:ring-0"
                  />
                  <span className="font-semibold text-xs">Enable Repeat Order Cycle</span>
                </label>
                {formData.isRecurring && (
                  <div>
                    <label className="block text-[11px] text-[#6b6b60] mb-1 font-medium">
                      Auto Renewal Cycle (Days after Won status to flip to "Buy Again")
                    </label>
                    <input
                      type="number"
                      value={formData.recurrenceDays || 60}
                      onChange={(e) => setFormData({ ...formData, recurrenceDays: Number(e.target.value) })}
                      className="w-full bg-white border border-[#e0e0d5] rounded-xl p-2 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e0e0d5]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#f5f5f0] hover:bg-[#eaeae2] text-[#2d2d2a] rounded-full font-semibold border border-[#e0e0d5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white rounded-full font-semibold shadow-xs"
                >
                  Save Deal
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
