import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Trash2, 
  X, 
  ShieldAlert, 
  UserCheck, 
  FileText, 
  ThumbsUp, 
  ThumbsDown, 
  Clock, 
  ArrowRight, 
  AlertCircle,
  CheckCircle,
  Filter,
  Check
} from 'lucide-react';
import { formatDateTime, getLocalDateInputValue } from '../utils/crmHelpers.js';

export const TasksView = ({
  tasks = [],
  users = [],
  leads = [],
  deals = [],
  stages = [],
  currentUser,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onApproveStageGateCheck,
  onRejectStageGateCheck
}) => {
  // Dual-Queue primary tab: 'followups' | 'approvals'
  const [activeQueue, setActiveQueue] = useState('followups');
  const [activeScope, setActiveScope] = useState('my'); // 'my' | 'team'
  const [typeFilter, setTypeFilter] = useState('All');
  const [showCompleted, setShowCompleted] = useState(false);

  // Modal State for New Task
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    dueDate: getLocalDateInputValue(),
    type: 'Call',
    linkedType: 'Contact',
    linkedId: '',
    ownerId: currentUser?.id || '',
    status: 'pending'
  });

  const todayStr = getLocalDateInputValue();
  const isManagerOrAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';

  // --- 1. Synthesize Approval Queue Tasks ---
  const pendingApprovals = useMemo(() => {
    const list = [];
    if (!isManagerOrAdmin) {
      // For sales reps, show their own submitted gate checks for visibility
      (leads || []).forEach(lead => {
        const leadDeal = (deals || []).find(d => d.leadId === lead.id);
        const check = leadDeal?.pendingGateCheck || lead.pendingGateCheck;
        if (check && (lead.ownerId === currentUser?.id || check.submittedById === currentUser?.id)) {
          const targetStageObj = stages.find(s => s.id === check.targetStageId);
          list.push({
            id: `v-task-${lead.id}`,
            title: `[Stage Approval Required] ${lead.title}: Advance to ${targetStageObj?.name || 'Next Stage'}`,
            dueDate: todayStr,
            type: 'Approval',
            linkedType: 'Lead',
            linkedId: leadDeal?.id || lead.id,
            linkedTitle: lead.title,
            ownerId: currentUser?.id,
            ownerName: currentUser?.name,
            status: 'pending',
            submittedAt: check.timestamp,
            submittedByName: check.submittedByName || lead.ownerName || 'You',
            fromStageName: leadDeal?.stageName || 'Current Stage',
            targetStageName: targetStageObj?.name || 'Next Stage',
            answers: check.answers || {},
            note: check.note || 'Submitted via stage qualification check.'
          });
        }
      });
      return list;
    }

    // For Managers/Admins, gather all pending gate checks
    (leads || []).forEach(lead => {
      const leadDeal = (deals || []).find(d => d.leadId === lead.id);
      const isPending = lead.status === 'Pending Review' || leadDeal?.status === 'Pending Review' || Boolean(leadDeal?.pendingGateCheck) || Boolean(lead.pendingGateCheck);

      if (isPending) {
        const hasExisting = tasks.some(t => 
          (t.linkedId === lead.id || (leadDeal && t.linkedId === leadDeal.id)) && 
          (t.type === 'Approval' || Boolean(t.stageGateCheckId)) && 
          t.status === 'pending'
        );

        if (!hasExisting) {
          const check = leadDeal?.pendingGateCheck || lead.pendingGateCheck;
          const targetStageObj = stages.find(s => s.id === check?.targetStageId);
          list.push({
            id: `v-task-${lead.id}`,
            title: `[Stage Approval Required] ${lead.title}: Advance to ${targetStageObj?.name || 'Next Stage'}`,
            dueDate: todayStr,
            type: 'Approval',
            linkedType: 'Lead',
            linkedId: leadDeal?.id || lead.id,
            linkedTitle: lead.title,
            ownerId: currentUser?.id,
            ownerName: currentUser?.name,
            status: 'pending',
            submittedAt: check?.timestamp,
            submittedByName: check?.submittedByName || lead.ownerName || 'Sales Rep',
            fromStageName: leadDeal?.stageName || 'Current Stage',
            targetStageName: targetStageObj?.name || 'Next Stage',
            answers: check?.answers || {},
            note: check?.note || 'Submitted via stage qualification check.'
          });
        }
      }
    });

    (deals || []).forEach(deal => {
      if (deal.pendingGateCheck || deal.status === 'Pending Review') {
        const hasExisting = tasks.some(t => 
          (t.linkedId === deal.id || (deal.leadId && t.linkedId === deal.leadId)) && 
          (t.type === 'Approval' || Boolean(t.stageGateCheckId)) && 
          t.status === 'pending'
        ) || list.some(vt => vt.linkedId === deal.id || (deal.leadId && vt.linkedId === deal.leadId));

        if (!hasExisting) {
          const check = deal.pendingGateCheck;
          const targetStageObj = stages.find(s => s.id === check?.targetStageId);
          list.push({
            id: `v-task-${deal.id}`,
            title: `[Stage Approval Required] ${deal.title}: Advance to ${targetStageObj?.name || 'Next Stage'}`,
            dueDate: todayStr,
            type: 'Approval',
            linkedType: 'Deal',
            linkedId: deal.id,
            linkedTitle: deal.title,
            ownerId: currentUser?.id,
            ownerName: currentUser?.name,
            status: 'pending',
            submittedAt: check?.timestamp,
            submittedByName: check?.submittedByName || deal.ownerName || 'Sales Rep',
            fromStageName: deal.stageName || 'Current Stage',
            targetStageName: targetStageObj?.name || 'Next Stage',
            answers: check?.answers || {},
            note: check?.note || 'Submitted via stage qualification check.'
          });
        }
      }
    });

    // Also include explicit approval tasks from backend tasks table
    tasks.filter(t => (t.type === 'Approval' || Boolean(t.stageGateCheckId))).forEach(t => {
      if (!list.some(vt => vt.id === t.id || (t.linkedId && vt.linkedId === t.linkedId))) {
        list.push(t);
      }
    });

    return list;
  }, [leads, deals, stages, tasks, currentUser, isManagerOrAdmin, todayStr]);

  // --- 2. Rep Follow-ups (Excluding Stage Gate Approvals) ---
  const repFollowups = useMemo(() => {
    return tasks.filter(t => t.type !== 'Approval' && !t.stageGateCheckId);
  }, [tasks]);

  const filteredFollowups = useMemo(() => {
    return repFollowups.filter(t => {
      const matchesScope = activeScope === 'my' ? t.ownerId === currentUser?.id : true;
      const matchesType = typeFilter === 'All' || t.type === typeFilter;
      return matchesScope && matchesType;
    });
  }, [repFollowups, activeScope, currentUser, typeFilter]);

  // Grouped Follow-ups by Urgency
  const overdueTasks = useMemo(() => {
    return filteredFollowups.filter(t => t.status === 'pending' && t.dueDate?.split('T')[0] < todayStr);
  }, [filteredFollowups, todayStr]);

  const dueTodayTasks = useMemo(() => {
    return filteredFollowups.filter(t => t.status === 'pending' && t.dueDate?.split('T')[0] === todayStr);
  }, [filteredFollowups, todayStr]);

  const upcomingTasks = useMemo(() => {
    return filteredFollowups.filter(t => t.status === 'pending' && t.dueDate?.split('T')[0] > todayStr);
  }, [filteredFollowups, todayStr]);

  const completedTasks = useMemo(() => {
    return filteredFollowups.filter(t => t.status === 'done');
  }, [filteredFollowups]);

  // Pending approval count
  const pendingApprovalsCount = pendingApprovals.filter(t => t.status === 'pending').length;
  const totalPendingFollowups = overdueTasks.length + dueTodayTasks.length + upcomingTasks.length;

  // Handlers
  const handleOpenAdd = () => {
    setFormData({
      title: '',
      dueDate: todayStr,
      type: 'Call',
      linkedType: 'Contact',
      linkedId: '',
      ownerId: currentUser?.id || '',
      status: 'pending'
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title) return;
    await onCreateTask(formData);
    setIsModalOpen(false);
  };

  const handleToggleStatus = async (task) => {
    const nextStatus = task.status === 'pending' ? 'done' : 'pending';
    await onUpdateTask(task.id, { status: nextStatus });
  };

  const handleApproveCheck = async (task) => {
    const targetId = task.stageGateCheckId || task.linkedId;
    if (!targetId || !onApproveStageGateCheck) return;
    await onApproveStageGateCheck(targetId, currentUser);
    if (onUpdateTask && !String(task.id).startsWith('v-task-')) {
      await onUpdateTask(task.id, { status: 'done', resolution: 'Approved' });
    }
  };

  const handleRejectCheck = async (task) => {
    const targetId = task.stageGateCheckId || task.linkedId;
    if (!targetId || !onRejectStageGateCheck) return;
    const reason = window.prompt("Enter rejection reason for this stage change request:", "Requirements incomplete");
    if (reason === null) return;
    await onRejectStageGateCheck(targetId, currentUser, reason);
    if (onUpdateTask && !String(task.id).startsWith('v-task-')) {
      await onUpdateTask(task.id, { status: 'done', resolution: 'Rejected', rejectionReason: reason });
    }
  };

  // Helper renderer for a standard rep task card
  const renderTaskCard = (task, isOverdue = false, isDueToday = false) => {
    const isDone = task.status === 'done';

    return (
      <div
        key={task.id}
        className={`p-4 bg-[#FFFFFF] border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-sm ${
          isDone 
            ? 'border-[#E3E6EA] opacity-60 bg-[#F6F7F8]' 
            : isOverdue 
            ? 'border-[#F4C4C1] bg-[#FDF2F1]/50' 
            : isDueToday 
            ? 'border-[#F5DDA9] bg-[#FEF8EC]/50' 
            : 'border-[#E3E6EA] hover:border-[#1D4E63]'
        }`}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            onClick={() => handleToggleStatus(task)}
            aria-label={isDone ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
            className={`mt-0.5 p-1 rounded-lg border transition-colors shrink-0 ${
              isDone 
                ? 'bg-[#255B40] text-white border-[#BCDBC9]' 
                : 'border-[#E3E6EA] bg-[#F6F7F8] hover:border-[#1D4E63] text-[#5B6472]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          </button>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`font-display text-xs font-bold truncate ${isDone ? 'line-through text-[#5B6472]' : 'text-[#12161C]'}`}>
                {task.title}
              </h4>

              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border bg-[#EFF6F9] text-[#1D4E63] border-[#D8E8EF]">
                {task.type}
              </span>
            </div>

            {task.linkedTitle && (
              <p className="text-[11px] text-[#5B6472]">
                Linked: <span className="text-[#1D4E63] font-semibold">{task.linkedTitle}</span>
              </p>
            )}

            {(task.note || task.description) && (
              <p className="text-[11px] text-[#12161C] bg-[#F6F7F8] border border-[#E3E6EA] px-2.5 py-1.5 rounded-lg italic font-medium mt-1">
                "{task.note || task.description}"
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs shrink-0 self-end sm:self-center">
          <div className="text-right">
            <div className={`font-mono font-bold flex items-center justify-end gap-1 ${
              isOverdue ? 'text-[#922D27]' : isDueToday ? 'text-[#965700]' : 'text-[#255B40]'
            }`}>
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{formatDateTime(task.dueDate)}</span>
            </div>
            <div className="text-[11px] text-[#5B6472] font-medium">Assigned: {task.ownerName || 'Rep'}</div>
          </div>

          <button
            onClick={() => onDeleteTask(task.id)}
            aria-label={`Delete task ${task.title}`}
            className="p-1.5 text-[#5B6472] hover:text-[#922D27] hover:bg-[#FDF2F1] rounded-lg transition-colors"
            title="Delete Task"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#F6F7F8] min-h-screen text-[#12161C]">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#12161C] flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#1D4E63]" aria-hidden="true" />
            <span>Tasks & Approvals Command Center</span>
          </h1>
          <p className="text-xs text-[#5B6472] mt-1 font-medium">
            Daily rep follow-up queue and manager stage-gate qualification reviews
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          aria-label="Create a new task"
          className="px-4 py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-2xs focus-visible:outline-2 focus-visible:outline-[#1D4E63]"
        >
          <Plus className="w-4 h-4 text-white" aria-hidden="true" />
          <span>New Task</span>
        </button>
      </div>

      {/* Primary Dual-Queue Tab Bar */}
      <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-2 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
        
        {/* Queue Switcher */}
        <div role="tablist" aria-label="Task Queues" className="flex items-center gap-2 p-1 bg-[#F6F7F8] rounded-xl border border-[#E3E6EA]">
          <button
            role="tab"
            id="tab-followups"
            aria-selected={activeQueue === 'followups'}
            aria-controls="panel-followups"
            onClick={() => setActiveQueue('followups')}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
              activeQueue === 'followups'
                ? 'bg-[#FFFFFF] text-[#1D4E63] shadow-xs'
                : 'text-[#5B6472] hover:text-[#12161C]'
            }`}
          >
            <CheckSquare className="w-4 h-4" aria-hidden="true" />
            <span>My Follow-ups</span>
            {totalPendingFollowups > 0 && (
              <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-[#EFF6F9] text-[#1D4E63] font-extrabold border border-[#D8E8EF]">
                {totalPendingFollowups}
              </span>
            )}
          </button>

          <button
            role="tab"
            id="tab-approvals"
            aria-selected={activeQueue === 'approvals'}
            aria-controls="panel-approvals"
            onClick={() => setActiveQueue('approvals')}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
              activeQueue === 'approvals'
                ? 'bg-[#FFFFFF] text-[#965700] shadow-xs'
                : 'text-[#5B6472] hover:text-[#12161C]'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-[#965700]" aria-hidden="true" />
            <span>Manager Approvals</span>
            {pendingApprovalsCount > 0 && (
              <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-[#FEF8EC] text-[#965700] font-extrabold border border-[#F5DDA9]">
                {pendingApprovalsCount}
              </span>
            )}
          </button>
        </div>

        {/* Secondary Filters for Follow-ups Queue */}
        {activeQueue === 'followups' && (
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Scope Toggle */}
            <div className="flex items-center bg-[#F6F7F8] border border-[#E3E6EA] p-1 rounded-xl text-xs">
              <button
                onClick={() => setActiveScope('my')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                  activeScope === 'my' ? 'bg-[#FFFFFF] text-[#1D4E63] shadow-2xs' : 'text-[#5B6472] hover:text-[#12161C]'
                }`}
              >
                My Tasks
              </button>
              <button
                onClick={() => setActiveScope('team')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                  activeScope === 'team' ? 'bg-[#FFFFFF] text-[#1D4E63] shadow-2xs' : 'text-[#5B6472] hover:text-[#12161C]'
                }`}
              >
                Team View
              </button>
            </div>

            {/* Type Selector */}
            <select
              aria-label="Filter tasks by type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl px-3 py-1.5 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="Call">Call</option>
              <option value="Email">Email</option>
              <option value="Meeting">Meeting</option>
              <option value="Sample Follow-up">Sample Follow-up</option>
              <option value="Renewal Check-in">Renewal Check-in</option>
            </select>
          </div>
        )}

      </div>

      {/* --- QUEUE PANEL 1: FOLLOW-UPS --- */}
      {activeQueue === 'followups' && (
        <div id="panel-followups" role="tabpanel" aria-labelledby="tab-followups" className="space-y-6">
          
          {/* Overdue Section */}
          {overdueTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--danger-text)] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" aria-hidden="true" />
                  <span>Overdue Follow-ups ({overdueTasks.length})</span>
                </h3>
                <span className="text-[11px] font-mono text-[var(--danger-text)] font-semibold">Immediate attention needed</span>
              </div>
              <div className="space-y-2.5">
                {overdueTasks.map(t => renderTaskCard(t, true, false))}
              </div>
            </div>
          )}

          {/* Due Today Section */}
          {dueTodayTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--warning-text)] flex items-center gap-1.5">
                  <Clock className="w-4 h-4" aria-hidden="true" />
                  <span>Due Today ({dueTodayTasks.length})</span>
                </h3>
                <span className="text-[11px] font-mono text-[var(--warning-text)] font-semibold">Scheduled for completion today</span>
              </div>
              <div className="space-y-2.5">
                {dueTodayTasks.map(t => renderTaskCard(t, false, true))}
              </div>
            </div>
          )}

          {/* Upcoming Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink-muted)] flex items-center gap-1.5">
                <Calendar className="w-4 h-4" aria-hidden="true" />
                <span>Upcoming Follow-ups ({upcomingTasks.length})</span>
              </h3>
            </div>
            {upcomingTasks.length === 0 && overdueTasks.length === 0 && dueTodayTasks.length === 0 ? (
              <div className="bg-[var(--surface)] border border-[var(--border)] p-8 rounded-2xl text-center text-[var(--ink-muted)] text-xs font-medium shadow-sm">
                No active follow-ups in this queue. Great job!
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingTasks.map(t => renderTaskCard(t, false, false))}
              </div>
            )}
          </div>

          {/* Completed Toggle Section */}
          {completedTasks.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="text-xs font-bold text-[var(--ink-muted)] hover:text-[var(--ink)] flex items-center gap-1.5 transition-colors"
              >
                <span>{showCompleted ? 'Hide' : 'Show'} Completed Tasks ({completedTasks.length})</span>
              </button>

              {showCompleted && (
                <div className="mt-3 space-y-2.5">
                  {completedTasks.map(t => renderTaskCard(t, false, false))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* --- QUEUE PANEL 2: STAGE-GATE APPROVALS --- */}
      {activeQueue === 'approvals' && (
        <div id="panel-approvals" role="tabpanel" aria-labelledby="tab-approvals" className="space-y-4">
          
          <div className="flex items-center justify-between bg-[var(--warning-bg)] border border-[var(--warning-border)] p-4 rounded-xl text-xs text-[var(--warning-text)]">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                <strong>Stage Gate Quality Governance:</strong> When a sales rep attempts to transition a deal into critical stages, a mandatory qualification check is submitted here for manager review.
              </span>
            </div>
            <span className="font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--warning-border)] shrink-0">
              {pendingApprovalsCount} Pending
            </span>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="bg-[var(--surface)] border border-[var(--border)] p-8 rounded-2xl text-center text-[var(--ink-muted)] text-xs font-medium shadow-sm">
              All stage gate qualification checks have been reviewed. No pending approvals in queue.
            </div>
          ) : (
            pendingApprovals.map(task => {
              const answerEntries = Object.entries(task.answers || {});
              const isDone = task.status === 'done';

              return (
                <div
                  key={task.id}
                  className={`p-5 bg-[var(--surface)] border rounded-2xl space-y-4 transition-all shadow-sm ${
                    isDone
                      ? 'border-[var(--border)] bg-[var(--canvas)]/80'
                      : 'border-[var(--warning-border)] bg-[var(--warning-bg)]/20'
                  }`}
                >
                  {/* Top Bar / Metadata */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold font-mono flex items-center gap-1.5 ${
                        isDone
                          ? task.resolution === 'Rejected'
                            ? 'bg-[var(--danger-bg)] text-[var(--danger-text)] border-[var(--danger-border)]'
                            : 'bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]'
                          : 'bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-border)]'
                      }`}>
                        <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>
                          {isDone
                            ? `Stage Gate ${task.resolution || 'Processed'}`
                            : 'Manager / Admin Approval Required'}
                        </span>
                      </span>

                      {task.fromStageName && task.targetStageName && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)] font-mono">
                          <span className="font-semibold text-[var(--ink)]">{task.fromStageName}</span>
                          <ArrowRight className="w-3 h-3" aria-hidden="true" />
                          <span className="font-bold text-[var(--primary-700)]">{task.targetStageName}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs shrink-0 self-end sm:self-center">
                      <div className="text-right">
                        <div className="font-mono font-bold text-[var(--warning-text)] flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Submitted: {formatDateTime(task.submittedAt || task.dueDate)}</span>
                        </div>
                        <div className="text-[11px] text-[var(--ink-muted)]">
                          Rep: <strong>{task.submittedByName || task.ownerName}</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteTask(task.id)}
                        aria-label="Dismiss task"
                        className="p-1.5 text-[var(--ink-muted)] hover:text-[var(--danger-text)] hover:bg-[var(--danger-bg)] rounded-lg transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Main Title & Opportunity Title */}
                  <div>
                    <h4 className="font-display text-sm font-extrabold text-[#12161C]">
                      {task.title}
                    </h4>
                    {task.linkedTitle && (
                      <p className="text-xs text-[#5B6472] mt-0.5 font-medium">
                        Opportunity Deal: <strong className="text-[#1D4E63]">{task.linkedTitle}</strong>
                      </p>
                    )}
                  </div>

                  {/* Form Qualification Responses (Yes/No) */}
                  {answerEntries.length > 0 && (
                    <div className="bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-[#12161C] border-b border-[#E3E6EA] pb-1.5">
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-[#1D4E63]" aria-hidden="true" />
                          <span>Qualification Gate Questionnaire</span>
                        </span>
                        <span className="text-[11px] font-mono text-[#5B6472]">
                          {answerEntries.filter(([, v]) => v).length} / {answerEntries.length} Passed
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-xs">
                        {answerEntries.map(([question, isPassed], idx) => (
                          <div
                            key={idx}
                            className={`flex items-start justify-between gap-2 p-2 rounded-lg border text-xs ${
                              isPassed
                                ? 'bg-[#F0F7F3] border-[#BCDBC9] text-[#255B40]'
                                : 'bg-[#FDF2F1] border-[#F4C4C1] text-[#922D27]'
                            }`}
                          >
                            <span className="font-medium">{question}</span>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-extrabold shrink-0 ${
                              isPassed ? 'bg-[#255B40] text-white' : 'bg-[#922D27] text-white'
                            }`}>
                              {isPassed ? 'YES' : 'NO'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Free-text Note / Rep Observations */}
                  <div className="bg-[#EFF6F9] border border-[#D8E8EF] rounded-xl p-3 text-xs space-y-1">
                    <span className="font-bold text-[#1D4E63] flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <UserCheck className="w-3.5 h-3.5 text-[#1D4E63]" aria-hidden="true" />
                      <span>Sales Rep Observations / Notes:</span>
                    </span>
                    <p className="text-[#12161C] italic font-medium">
                      "{task.note || 'No specific observations noted by sales rep.'}"
                    </p>
                  </div>

                  {/* Manager / Admin Direct Approval Controls */}
                  {task.status === 'pending' && (
                    <div className="pt-2 flex items-center justify-end gap-3">
                      {isManagerOrAdmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRejectCheck(task)}
                            className="px-4 py-2 bg-[#FFFFFF] hover:bg-[#FDF2F1] text-[#922D27] border border-[#F4C4C1] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Reject With Reason</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApproveCheck(task)}
                            className="px-5 py-2 bg-[#255B40] hover:bg-[#1C4530] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <ThumbsUp className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                            <span>Approve & Advance Stage</span>
                          </button>
                        </>
                      ) : (
                        <div className="text-xs text-[#965700] bg-[#FEF8EC] border border-[#F5DDA9] px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#965700]" aria-hidden="true" />
                          <span>Submitted for Manager / Admin Review</span>
                        </div>
                      )}
                    </div>
                  )}

                  {isDone && (
                    <div className="pt-1 flex items-center justify-between text-xs text-[var(--ink-muted)] border-t border-[var(--border)]">
                      <span>
                        Status: <strong className="text-[var(--ink)]">{task.resolution || 'Completed'}</strong>
                        {task.reviewedByName && ` by ${task.reviewedByName}`}
                      </span>
                      {task.rejectionReason && (
                        <span className="text-[var(--danger-text)]">Reason: {task.rejectionReason}</span>
                      )}
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-[0_8px_24px_rgba(18,22,28,0.12)] text-[var(--ink)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h2 className="font-display text-sm font-bold text-[var(--ink)]">Create Follow-up Task</h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                aria-label="Close modal"
                className="text-[var(--ink-muted)] hover:text-[var(--ink)] p-1 rounded-lg"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[var(--ink-muted)] font-semibold mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Call client to verify sample testing results"
                  className="w-full bg-[var(--canvas)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--ink)] focus:outline-none focus:border-[var(--primary-600)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--ink-muted)] font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-[var(--canvas)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--ink)] focus:outline-none focus:border-[var(--primary-600)] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[var(--ink-muted)] font-semibold mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-[var(--canvas)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--ink)] focus:outline-none focus:border-[var(--primary-600)] cursor-pointer"
                  >
                    <option value="Call">Call</option>
                    <option value="Email">Email</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Sample Follow-up">Sample Follow-up</option>
                    <option value="Proposal Follow-up">Proposal Follow-up</option>
                    <option value="Renewal Check-in">Renewal Check-in</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[var(--ink-muted)] font-semibold mb-1">Assigned Employee</label>
                <select
                  value={formData.ownerId}
                  onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                  className="w-full bg-[var(--canvas)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--ink)] focus:outline-none focus:border-[var(--primary-600)] cursor-pointer"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[var(--canvas)] hover:bg-[#EEF0F3] text-[var(--ink-muted)] rounded-full font-semibold border border-[var(--border)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[var(--primary-700)] hover:bg-[var(--primary-800)] text-white rounded-full font-bold shadow-2xs"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
