import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  CheckCircle2,
  Clock,
  PhoneCall,
  Mail,
  FileText,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Send,
  Plus,
  Ban,
  CheckSquare
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  getStageAgingStatus,
  isDealStale,
  isCloseDateOverdue,
  getLocalDateInputValueAfterDays
} from '../utils/crmHelpers.js';
import { toast } from 'sonner';

export const DetailDrawer = ({
  isOpen,
  onClose,
  deal = null,
  lead = null,
  type = 'deal', // 'deal' | 'lead'
  stages = [],
  users = [],
  companies = [],
  contacts = [],
  tasks = [],
  activities = [],
  currentUser,
  onUpdateDeal,
  onUpdateLead,
  onCreateActivity,
  onCreateTask,
  onUpdateTask,
  onOpenStageGateModal,
  onCloseLostDeal,
  onCreateRebuyDeal
}) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'gate' | 'timeline' | 'tasks'

  // Quick note/activity state
  const [quickActivityType, setQuickActivityType] = useState('Note');
  const [quickActivityNotes, setQuickActivityNotes] = useState('');
  const [isSubmittingActivity, setIsSubmittingActivity] = useState(false);

  // Quick task state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState(getLocalDateInputValueAfterDays(3));

  // Editable deal properties state
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Sync form data when item changes
  useEffect(() => {
    if (type === 'deal' && deal) {
      setFormData({
        title: deal.title || '',
        value: deal.value || 0,
        stageId: deal.stageId || '',
        expectedCloseDate: deal.expectedCloseDate || '',
        priority: deal.priority || 'Medium',
        ownerId: deal.ownerId || '',
        companyId: deal.companyId || '',
        contactId: deal.contactId || '',
        notes: deal.notes || ''
      });
    } else if (type === 'lead' && lead) {
      setFormData({
        title: lead.title || '',
        contactName: lead.contactName || '',
        contactEmail: lead.contactEmail || '',
        contactPhone: lead.contactPhone || '',
        companyName: lead.companyName || '',
        status: lead.status || 'New',
        source: lead.source || 'Website',
        ownerId: lead.ownerId || '',
        notes: lead.notes || ''
      });
    }
  }, [deal, lead, type]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || (!deal && !lead)) return null;

  const currentItem = type === 'deal' ? deal : lead;
  const currentStage = stages.find(s => s.id === (deal?.stageId));
  const aging = deal ? getStageAgingStatus(deal.daysInStage) : null;
  const stale = deal ? isDealStale(deal.lastActivityDate) : false;
  const overdue = deal ? isCloseDateOverdue(deal.expectedCloseDate, deal.status) : false;

  // Filter connected activities and tasks
  const connectedActivities = activities.filter(a =>
    type === 'deal' ? a.dealId === deal?.id : a.leadId === lead?.id
  );

  const connectedTasks = tasks.filter(t =>
    type === 'deal' ? t.dealId === deal?.id : t.leadId === lead?.id
  );

  // Handle saving properties
  const handleSaveProperties = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      if (type === 'deal' && onUpdateDeal) {
        await onUpdateDeal(deal.id, formData);
        toast.success("Deal updated successfully");
      } else if (type === 'lead' && onUpdateLead) {
        await onUpdateLead(lead.id, formData);
        toast.success("Lead updated successfully");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update record");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle submitting quick activity
  const handleAddQuickActivity = async () => {
    if (!quickActivityNotes.trim()) {
      toast.warning("Please enter note details");
      return;
    }

    setIsSubmittingActivity(true);
    try {
      const payload = {
        type: quickActivityType,
        notes: quickActivityNotes.trim(),
        dealId: type === 'deal' ? deal.id : undefined,
        leadId: type === 'lead' ? lead.id : undefined,
        userId: currentUser.id,
        createdAt: new Date().toISOString()
      };

      if (onCreateActivity) {
        await onCreateActivity(payload);
        setQuickActivityNotes('');
        toast.success(`${quickActivityType} logged successfully`);
      }
    } catch (err) {
      toast.error(err.message || "Failed to log activity");
    } finally {
      setIsSubmittingActivity(false);
    }
  };

  // Handle creating connected task
  const handleAddQuickTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const payload = {
        title: newTaskTitle.trim(),
        dueDate: newTaskDueDate,
        priority: 'Medium',
        status: 'pending',
        assignedTo: currentUser.id,
        dealId: type === 'deal' ? deal.id : undefined,
        leadId: type === 'lead' ? lead.id : undefined
      };

      if (onCreateTask) {
        await onCreateTask(payload);
        setNewTaskTitle('');
        toast.success("Task scheduled");
      }
    } catch (err) {
      toast.error(err.message || "Failed to schedule task");
    }
  };

  // Handle task completion toggle
  const handleToggleTask = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { status: newStatus });
        toast.success(newStatus === 'completed' ? "Task marked completed" : "Task reopened");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update task");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-[#FFFFFF] border-l border-[#E3E6EA] shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
          
          {/* Header */}
          <div className="p-5 border-b border-[#E3E6EA] bg-[#FAFCFD]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF]">
                    {type === 'deal' ? 'Deal 360°' : 'Lead 360°'}
                  </span>

                  {deal && currentStage && (
                    <span 
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border"
                      style={{ backgroundColor: `${currentStage.color}15`, borderColor: currentStage.color, color: currentStage.color === '#FFFFFF' ? '#12161C' : currentStage.color }}
                    >
                      {currentStage.name}
                    </span>
                  )}

                  {deal && deal.isRecurring && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#FEF8EC] text-[#965700] border border-[#F5DDA9] flex items-center gap-1">
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>{deal.recurrenceDays || 60}d Cycle</span>
                    </span>
                  )}

                  {stale && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#FEF8EC] text-[#965700] border border-[#F5DDA9] flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="w-2.5 h-2.5 text-[#C6790A]" />
                      <span>Stale (&gt;10d)</span>
                    </span>
                  )}
                </div>

                <h3 className="text-base font-display font-extrabold text-[#12161C] truncate leading-tight">
                  {currentItem?.title}
                </h3>

                {deal && (
                  <div className="flex items-center gap-3 text-xs text-[#5B6472] mt-1 font-medium">
                    <span className="font-mono font-extrabold text-[#255B40]">
                      {formatCurrency(deal.value, deal.currency)}
                    </span>
                    {deal.companyName && (
                      <span className="flex items-center gap-1 truncate">
                        <Building2 className="w-3.5 h-3.5 text-[#5B6472]" />
                        {deal.companyName}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={onClose}
                className="p-1.5 text-[#5B6472] hover:text-[#12161C] hover:bg-[#F6F7F8] rounded-xl transition-colors shrink-0"
                title="Close drawer (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 mt-4 border-b border-[#E3E6EA] -mb-5 pb-0">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-[#1D4E63] text-[#1D4E63]'
                    : 'border-transparent text-[#5B6472] hover:text-[#12161C]'
                }`}
              >
                Overview
              </button>

              {type === 'deal' && (
                <button
                  onClick={() => setActiveTab('gate')}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'gate'
                      ? 'border-[#1D4E63] text-[#1D4E63]'
                      : 'border-transparent text-[#5B6472] hover:text-[#12161C]'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Stage Gate</span>
                  {deal?.pendingGateCheck && (
                    <span className="w-2 h-2 rounded-full bg-[#965700] animate-ping" />
                  )}
                </button>
              )}

              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'timeline'
                    ? 'border-[#1D4E63] text-[#1D4E63]'
                    : 'border-transparent text-[#5B6472] hover:text-[#12161C]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Activities ({connectedActivities.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'tasks'
                    ? 'border-[#1D4E63] text-[#1D4E63]'
                    : 'border-transparent text-[#5B6472] hover:text-[#12161C]'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Tasks ({connectedTasks.length})</span>
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* TAB 1: OVERVIEW & INLINE EDIT */}
            {activeTab === 'overview' && (
              <form onSubmit={handleSaveProperties} className="space-y-4 text-xs">
                
                {/* Health Metrics Card for Deals */}
                {deal && (
                  <div className="p-3.5 bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl space-y-2">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5B6472]">
                      Stage Health & Progress
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-[#FFFFFF] border border-[#E3E6EA] rounded-lg">
                        <div className="text-[10px] text-[#5B6472]">Days in Stage</div>
                        <div className="font-mono font-bold text-sm text-[#12161C]">
                          {deal.daysInStage || 0}d
                        </div>
                      </div>
                      <div className="p-2 bg-[#FFFFFF] border border-[#E3E6EA] rounded-lg">
                        <div className="text-[10px] text-[#5B6472]">Activity Status</div>
                        <div className={`font-mono font-bold text-xs ${stale ? 'text-[#965700]' : 'text-[#255B40]'}`}>
                          {stale ? 'Stale' : 'Active'}
                        </div>
                      </div>
                      <div className="p-2 bg-[#FFFFFF] border border-[#E3E6EA] rounded-lg">
                        <div className="text-[10px] text-[#5B6472]">Close Status</div>
                        <div className={`font-mono font-bold text-xs ${overdue ? 'text-[#922D27]' : 'text-[#12161C]'}`}>
                          {overdue ? 'Overdue' : 'On Track'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#5B6472] mb-1">Title</label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl px-3 py-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                    />
                  </div>

                  {type === 'deal' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#5B6472] mb-1">Deal Value (₹)</label>
                        <input
                          type="number"
                          value={formData.value || 0}
                          onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl px-3 py-2 text-xs font-mono text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#5B6472] mb-1">Expected Close</label>
                        <input
                          type="date"
                          value={formData.expectedCloseDate || ''}
                          onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                          className="w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl px-3 py-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#5B6472] mb-1">Assigned Owner</label>
                      <select
                        value={formData.ownerId || ''}
                        onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                        className="w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl px-3 py-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                      >
                        <option value="">Unassigned</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#5B6472] mb-1">Priority</label>
                      <select
                        value={formData.priority || 'Medium'}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl px-3 py-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#5B6472] mb-1">Internal Notes & Context</label>
                    <textarea
                      rows={3}
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Add strategic notes or customer context..."
                      className="w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl px-3 py-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white font-bold rounded-xl text-xs transition-colors shadow-2xs flex items-center gap-1.5"
                  >
                    {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: STAGE GATE CHECKLIST */}
            {activeTab === 'gate' && deal && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-[#EFF6F9] border border-[#D8E8EF] rounded-xl text-[#1D4E63] space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Stage Gate Control System</span>
                  </div>
                  <p className="text-[11px] text-[#5B6472]">
                    Deals cannot advance to subsequent stages without satisfying stage checklist requirements and manager verification.
                  </p>
                </div>

                {deal.pendingGateCheck ? (
                  <div className="p-4 bg-[#FEF8EC] border border-[#F5DDA9] rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-[#965700] font-bold">
                      <Clock className="w-4 h-4 animate-pulse" />
                      <span>Stage Gate Review Pending Manager Approval</span>
                    </div>
                    <p className="text-xs text-[#5B6472]">
                      Target stage: <strong>{stages.find(s => s.id === deal.pendingGateCheck.targetStageId)?.name || 'Next Stage'}</strong>
                    </p>
                    <button
                      onClick={() => onOpenStageGateModal && onOpenStageGateModal(deal, stages.find(s => s.id === deal.pendingGateCheck.targetStageId))}
                      className="w-full py-2 px-3 bg-[#965700] hover:bg-[#7D4600] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Open Review & Approval Checklist</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3.5 bg-[#FAFCFD] border border-[#E3E6EA] rounded-xl space-y-2">
                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5B6472]">
                        Gate Checklist Status
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-[#12161C]">
                          <CheckCircle2 className="w-4 h-4 text-[#255B40]" />
                          <span>Contact & Decision Maker Identified</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#12161C]">
                          <CheckCircle2 className="w-4 h-4 text-[#255B40]" />
                          <span>Commercial Requirement Confirmed</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#5B6472]">
                          <Clock className="w-4 h-4 text-[#5B6472]" />
                          <span>Budget & Timeline Formalized</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenStageGateModal && onOpenStageGateModal(deal, null)}
                      className="w-full py-2.5 px-3 bg-[#F6F7F8] hover:bg-[#EFF6F9] border border-[#E3E6EA] text-[#1D4E63] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Initiate Stage Gate Verification</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ACTIVITY TIMELINE & QUICK LOGGER */}
            {activeTab === 'timeline' && (
              <div className="space-y-5 text-xs">
                
                {/* Quick Composer */}
                <div className="p-3.5 bg-[#FAFCFD] border border-[#E3E6EA] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5B6472]">
                      Log Interaction
                    </span>
                    <div className="flex items-center gap-1 bg-[#F6F7F8] p-0.5 rounded-lg border border-[#E3E6EA]">
                      {['Note', 'Outbound Call', 'Outbound Email'].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setQuickActivityType(t)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                            quickActivityType === t ? 'bg-[#FFFFFF] text-[#1D4E63] shadow-2xs' : 'text-[#5B6472]'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={quickActivityNotes}
                    onChange={(e) => setQuickActivityNotes(e.target.value)}
                    placeholder={`Write notes for this ${quickActivityType.toLowerCase()}...`}
                    className="w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl p-2.5 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                  />

                  <div className="flex justify-end">
                    <button
                      onClick={handleAddQuickActivity}
                      disabled={isSubmittingActivity}
                      className="px-3 py-1.5 bg-[#1D4E63] hover:bg-[#153B4B] text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      <span>Log {quickActivityType}</span>
                    </button>
                  </div>
                </div>

                {/* Timeline Feed */}
                <div className="space-y-3">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5B6472]">
                    History Feed ({connectedActivities.length})
                  </div>

                  {connectedActivities.length === 0 ? (
                    <div className="text-center py-6 bg-[#FAFCFD] border border-dashed border-[#E3E6EA] rounded-xl text-[#5B6472]">
                      <FileText className="w-6 h-6 mx-auto mb-1 text-[#5B6472]/60" />
                      <p className="font-medium">No activity logged yet.</p>
                      <p className="text-[10px]">Use the composer above to add the first note.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {connectedActivities.map(act => (
                        <div key={act.id} className="p-3 bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-[#12161C] flex items-center gap-1.5">
                              {act.type.includes('Call') && <PhoneCall className="w-3.5 h-3.5 text-[#1D4E63]" />}
                              {act.type.includes('Email') && <Mail className="w-3.5 h-3.5 text-[#1D4E63]" />}
                              {act.type.includes('Note') && <FileText className="w-3.5 h-3.5 text-[#5B6472]" />}
                              <span>{act.type}</span>
                            </span>
                            <span className="text-[10px] text-[#5B6472] font-mono">
                              {act.createdAt ? formatDate(act.createdAt) : 'Recently'}
                            </span>
                          </div>
                          <p className="text-xs text-[#5B6472] whitespace-pre-wrap">{act.notes}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 4: TASKS */}
            {activeTab === 'tasks' && (
              <div className="space-y-4 text-xs">
                {/* Add Quick Task Form */}
                <form onSubmit={handleAddQuickTask} className="p-3.5 bg-[#FAFCFD] border border-[#E3E6EA] rounded-xl space-y-2.5">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5B6472]">
                    Schedule Follow-up Task
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Task description (e.g. Follow up on proposal quote)..."
                      className="flex-1 bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl px-3 py-1.5 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                    />
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl px-2 py-1.5 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-[#1D4E63] hover:bg-[#153B4B] text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </form>

                {/* Tasks List */}
                <div className="space-y-2">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5B6472]">
                    Connected Tasks ({connectedTasks.length})
                  </div>

                  {connectedTasks.length === 0 ? (
                    <div className="text-center py-6 bg-[#FAFCFD] border border-dashed border-[#E3E6EA] rounded-xl text-[#5B6472]">
                      <CheckSquare className="w-6 h-6 mx-auto mb-1 text-[#5B6472]/60" />
                      <p className="font-medium">No open tasks for this record.</p>
                    </div>
                  ) : (
                    connectedTasks.map(t => (
                      <div
                        key={t.id}
                        className={`p-3 bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl flex items-center justify-between gap-2 transition-colors ${
                          t.status === 'completed' ? 'opacity-60 bg-[#F6F7F8]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={t.status === 'completed'}
                            onChange={() => handleToggleTask(t)}
                            className="w-4 h-4 rounded text-[#1D4E63] focus:ring-[#1D4E63] cursor-pointer"
                          />
                          <div className="truncate">
                            <div className={`text-xs font-bold text-[#12161C] truncate ${t.status === 'completed' ? 'line-through' : ''}`}>
                              {t.title}
                            </div>
                            <div className="text-[10px] text-[#5B6472] font-mono">
                              Due: {t.dueDate ? formatDate(t.dueDate) : 'No date'} &bull; Priority: {t.priority}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                          t.status === 'completed' 
                            ? 'bg-[#F0F7F3] text-[#255B40]' 
                            : 'bg-[#FEF8EC] text-[#965700]'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 border-t border-[#E3E6EA] bg-[#FAFCFD] flex items-center justify-between gap-3">
            {type === 'deal' && (deal.status === 'Won' || deal.stageName === 'Closed Won') ? (
              <button
                onClick={() => onCreateRebuyDeal && onCreateRebuyDeal(deal)}
                className="w-full py-2 px-3 bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] text-[#15803D] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Trigger Child Rebuy Opportunity</span>
              </button>
            ) : type === 'deal' && deal.status !== 'Lost' ? (
              <button
                onClick={() => onCloseLostDeal && onCloseLostDeal(deal)}
                className="py-1.5 px-3 text-[#922D27] hover:bg-[#FDF2F1] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Mark as Lost</span>
              </button>
            ) : null}

            <button
              onClick={onClose}
              className="ml-auto px-4 py-2 bg-[#F6F7F8] hover:bg-[#EEF0F3] border border-[#E3E6EA] text-[#12161C] font-semibold rounded-xl text-xs transition-colors"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
