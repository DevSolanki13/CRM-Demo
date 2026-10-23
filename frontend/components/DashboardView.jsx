import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Users,
  Trophy,
  DollarSign,
  Calendar,
  PhoneCall,
  Mail,
  Package,
  RefreshCw,
  ChevronRight,
  Layers,
  Send,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  Zap,
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  Check,
  RotateCcw,
  BarChart3,
  AlignLeft
} from 'lucide-react';
import { toast } from 'sonner';
import {
  formatCurrency,
  formatDate,
  filterByRole,
  isDealStale,
  getStageAgingStatus,
  isCloseDateOverdue,
  getLocalDateInputValue,
  getLocalDateInputValueAfterDays
} from '../utils/crmHelpers.js';
import { ManifestStrip } from './ManifestStrip.jsx';

const getStageBarColor = (stageName, category) => {
  const name = stageName || '';
  const cat = category || '';
  if (name.includes('Closed Won') || cat === 'Won') return '#16A34A';
  if (name.includes('Negotiation') || cat === 'Negotiation') return '#10B981';
  if (name.includes('Proposal') || cat === 'Proposal') return '#34D399';
  if (name.includes('Sample Sent') || cat === 'Sample Sent') return '#6EE7B7';
  if (name.includes('Contacted') || cat === 'Contacted') return '#A7F3D0';
  if (name.includes('Buy Again') || cat === 'Buy Again') return '#EAB308';
  if (name.includes('Closed Lost') || cat === 'Lost') return '#DC2626';
  return '#FFFFFF';
};

const getItemIcon = (type) => {
  switch (type) {
    case 'overdue':
      return <AlertCircle className="w-3.5 h-3.5 text-[#922D27]" aria-hidden="true" />;
    case 'approval':
      return <ShieldCheck className="w-3.5 h-3.5 text-[#5B21B6]" aria-hidden="true" />;
    case 'closing':
      return <Calendar className="w-3.5 h-3.5 text-[#965700]" aria-hidden="true" />;
    case 'renewal':
      return <RefreshCw className="w-3.5 h-3.5 text-[#166534]" aria-hidden="true" />;
    case 'stale':
      return <Clock className="w-3.5 h-3.5 text-[#9F1239]" aria-hidden="true" />;
    default:
      return <Zap className="w-3.5 h-3.5 text-[#1D4E63]" aria-hidden="true" />;
  }
};

const getBadgeStyle = (type) => {
  switch (type) {
    case 'overdue':
      return 'bg-[#FDF2F1] text-[#922D27] border-[#F4C4C1]';
    case 'approval':
      return 'bg-[#F5F3FF] text-[#5B21B6] border-[#DDD6FE]';
    case 'closing':
      return 'bg-[#FEF8EC] text-[#965700] border-[#F5DDA9]';
    case 'renewal':
      return 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]';
    case 'stale':
      return 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3]';
    default:
      return 'bg-[#EFF6F9] text-[#1D4E63] border-[#D8E8EF]';
  }
};

export const DashboardView = ({
  state,
  currentUser,
  onNavigateTab,
  onTriggerRenewalCheck,
  onOpenLeadModal,
  onOpenDealModal,
  onOpenDrawer,
  onUpdateTask,
  onApproveStageGateCheck
}) => {
  const { leads = [], deals = [], tasks = [], activities = [], stages = [] } = state || {};
  const todayStr = getLocalDateInputValue();

  const [activeQueueFilter, setActiveQueueFilter] = useState('all');
  const [activeViewMode, setActiveViewMode] = useState('queue'); // 'queue' | 'activity'
  const [actionInProgressId, setActionInProgressId] = useState(null);
  const [mobileChartMode, setMobileChartMode] = useState('bars'); // 'bars' | 'columns'
  const queueListRef = useRef(null);
  const activityListRef = useRef(null);

  useEffect(() => {
    if (queueListRef.current) {
      queueListRef.current.scrollTop = 0;
    }
    if (activityListRef.current) {
      activityListRef.current.scrollTop = 0;
    }
  }, [activeQueueFilter, activeViewMode]);

  // --- Selective Memoization of Key Executive Metrics & Action Queues ---
  const {
    userLeads,
    userDeals,
    userTasks,
    totalLeads,
    outboundLeadsCount,
    totalPipelineValue,
    wonDeals,
    wonRevenue,
    renewalsDueDeals,
    renewalsDueValue,
    pendingTasksToday,
    staleOrAtRiskDeals,
    totalAtRiskValue,
    outboundCalls,
    outboundEmails,
    samplesSent,
    stageBreakdown,
    maxStageVal,
    overdueTasks,
    approvalTasks,
    closingSoonDeals,
    renewalsDueQueue,
    inactiveDealsQueue,
    allWorkQueueItems,
    workQueueCounts
  } = useMemo(() => {
    const rbacLeads = filterByRole(leads, currentUser);
    const rbacDeals = filterByRole(deals, currentUser);
    const rbacTasks = filterByRole(tasks, currentUser);

    const activeDeals = rbacDeals.filter(d => d.status === 'Active');
    const pipelineVal = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);

    const wonList = rbacDeals.filter(d => d.status === 'Won');
    const wonVal = wonList.reduce((sum, d) => sum + (d.value || 0), 0);

    const renewals = rbacDeals.filter(d => d.status === 'Renewal Due' || d.stageId === 'stg-7');
    const renewalsVal = renewals.reduce((sum, d) => sum + (d.value || 0), 0);

    const dueToday = rbacTasks.filter(t => t.status === 'pending' && t.dueDate?.split('T')[0] <= todayStr);

    // Filter and decorate at-risk deals with specific diagnostic reasons
    const atRisk = rbacDeals.filter(d =>
      d.status !== 'Won' && d.status !== 'Lost' && (
        isDealStale(d.lastActivityDate) ||
        getStageAgingStatus(d.daysInStage).level === 'risk' ||
        isCloseDateOverdue(d.expectedCloseDate, d.status)
      )
    ).map(d => {
      const aging = getStageAgingStatus(d.daysInStage);
      const isOverdue = isCloseDateOverdue(d.expectedCloseDate, d.status);
      const isStale = isDealStale(d.lastActivityDate);
      return {
        ...d,
        reasons: [
          aging.level === 'risk' ? `${d.daysInStage || 0}d in stage (Stagnant)` : null,
          isOverdue ? 'Close date overdue' : null,
          isStale ? 'No activity >10d' : null
        ].filter(Boolean)
      };
    });

    const atRiskVal = atRisk.reduce((sum, d) => sum + (d.value || 0), 0);

    const obCalls = activities.filter(a => a.isOutbound && a.type === 'Outbound Call').length;
    const obEmails = activities.filter(a => a.isOutbound && a.type === 'Outbound Email').length;
    const samples = activities.filter(a => a.type === 'Sample Sent').length;

    const breakdown = stages.map(stg => {
      const stageDeals = rbacDeals.filter(d => d.stageId === stg.id);
      const val = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      return {
        stage: stg,
        count: stageDeals.length,
        value: val
      };
    });

    const maxVal = Math.max(...breakdown.map(s => s.value), 1);

    // --- Action-Oriented Work Queues ---
    // 1. Overdue follow-up tasks
    const overdueList = rbacTasks.filter(t =>
      t.status === 'pending' && t.dueDate && t.dueDate.split('T')[0] < todayStr
    ).map(t => {
      const due = t.dueDate.split('T')[0];
      const daysOverdue = Math.max(1, Math.round((new Date(todayStr) - new Date(due)) / 86400000));
      return {
        id: t.id,
        type: 'overdue',
        categoryLabel: 'Overdue Follow-Up',
        title: t.title,
        subtitle: t.linkedTitle ? `Linked: ${t.linkedTitle}` : (t.type ? `Type: ${t.type}` : 'General Outreach'),
        meta: `${daysOverdue}d overdue`,
        metaFull: `${daysOverdue}d overdue (Due ${formatDate(t.dueDate)})`,
        raw: t,
        daysOverdue,
        urgency: 'high',
        targetTab: 'tasks',
        entityType: t.linkedType,
        entityId: t.linkedId
      };
    }).sort((a, b) => b.daysOverdue - a.daysOverdue);

    // 2. Pending stage gate approval tasks
    const isManagerOrAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';
    const approvalsList = (isManagerOrAdmin
      ? (tasks || [])
      : (tasks || []).filter(t => t.submittedBy === currentUser?.id || t.ownerId === currentUser?.id)
    ).filter(t => t.type === 'Approval' && t.status === 'pending')
    .map(t => ({
      id: t.id,
      type: 'approval',
      categoryLabel: 'Pending Approval',
      title: t.title,
      subtitle: t.submittedByName ? `Submitted by: ${t.submittedByName}` : (t.ownerName ? `Assignee: ${t.ownerName}` : 'Manager Approval'),
      meta: 'Awaiting Sign-off',
      metaFull: t.createdAt ? `Submitted ${formatDate(t.createdAt)}` : 'Awaiting Sign-off',
      raw: t,
      urgency: 'high',
      targetTab: 'tasks',
      entityType: t.linkedType,
      entityId: t.linkedId
    }));

    // 3. Deals closing soon (next 7 days)
    const closingSoonList = rbacDeals.filter(d => {
      if (d.status !== 'Active' || !d.expectedCloseDate) return false;
      const daysLeft = Math.ceil((new Date(d.expectedCloseDate.split('T')[0]) - new Date(todayStr)) / 86400000);
      return daysLeft >= 0 && daysLeft <= 7;
    }).map(d => {
      const daysLeft = Math.ceil((new Date(d.expectedCloseDate.split('T')[0]) - new Date(todayStr)) / 86400000);
      return {
        id: d.id,
        type: 'closing',
        categoryLabel: 'Closing Soon',
        title: d.title,
        subtitle: `${formatCurrency(d.value)} • ${d.stageName || 'Pipeline'}`,
        meta: daysLeft === 0 ? 'Closes Today' : `${daysLeft}d left`,
        metaFull: daysLeft === 0 ? 'Target close date is today' : `Expected close in ${daysLeft} days`,
        raw: d,
        daysLeft,
        urgency: daysLeft <= 2 ? 'high' : 'medium',
        targetTab: 'pipeline',
        entityType: 'Deal',
        entityId: d.id
      };
    }).sort((a, b) => a.daysLeft - b.daysLeft);

    // 4. Renewals due
    const renewalsList = rbacDeals.filter(d =>
      d.status === 'Renewal Due' || d.stageId === 'stg-7'
    ).map(d => ({
      id: d.id,
      type: 'renewal',
      categoryLabel: 'Renewal Due',
      title: d.title,
      subtitle: `${formatCurrency(d.value)} • ${d.companyName || 'B2B Client'}`,
      meta: 'Cycle Mature',
      metaFull: d.recurrenceDays ? `${d.recurrenceDays}d replenishment cycle` : 'Repeat order cycle due',
      raw: d,
      urgency: 'medium',
      targetTab: 'pipeline',
      entityType: 'Deal',
      entityId: d.id
    }));

    // 5. Deals with no recent activity
    const staleList = rbacDeals.filter(d => {
      if (d.status !== 'Active') return false;
      return isDealStale(d.lastActivityDate);
    }).map(d => {
      let daysInactive = 10;
      if (d.lastActivityDate) {
        daysInactive = Math.max(10, Math.round((new Date(todayStr) - new Date(d.lastActivityDate.split('T')[0])) / 86400000));
      }
      return {
        id: d.id,
        type: 'stale',
        categoryLabel: 'No Recent Activity',
        title: d.title,
        subtitle: `${formatCurrency(d.value)} • ${d.stageName || 'In Pipeline'}`,
        meta: `${daysInactive}d no touch`,
        metaFull: `No customer touchpoint for ${daysInactive} days`,
        raw: d,
        daysInactive,
        urgency: 'medium',
        targetTab: 'pipeline',
        entityType: 'Deal',
        entityId: d.id
      };
    }).sort((a, b) => b.daysInactive - a.daysInactive);

    const allWorkItems = [
      ...overdueList,
      ...approvalsList,
      ...closingSoonList,
      ...renewalsList,
      ...staleList
    ].sort((a, b) => {
      if (a.urgency === 'high' && b.urgency !== 'high') return -1;
      if (b.urgency === 'high' && a.urgency !== 'high') return 1;
      return 0;
    });

    const counts = {
      all: allWorkItems.length,
      overdue: overdueList.length,
      approvals: approvalsList.length,
      closing: closingSoonList.length,
      renewals: renewalsList.length,
      stale: staleList.length
    };

    return {
      userLeads: rbacLeads,
      userDeals: rbacDeals,
      userTasks: rbacTasks,
      totalLeads: rbacLeads.length,
      outboundLeadsCount: rbacLeads.filter(l => l.isOutbound).length,
      totalPipelineValue: pipelineVal,
      wonDeals: wonList,
      wonRevenue: wonVal,
      renewalsDueDeals: renewals,
      renewalsDueValue: renewalsVal,
      pendingTasksToday: dueToday,
      staleOrAtRiskDeals: atRisk,
      totalAtRiskValue: atRiskVal,
      outboundCalls: obCalls,
      outboundEmails: obEmails,
      samplesSent: samples,
      stageBreakdown: breakdown,
      maxStageVal: maxVal,
      overdueTasks: overdueList,
      approvalTasks: approvalsList,
      closingSoonDeals: closingSoonList,
      renewalsDueQueue: renewalsList,
      inactiveDealsQueue: staleList,
      allWorkQueueItems: allWorkItems,
      workQueueCounts: counts
    };
  }, [leads, deals, tasks, activities, stages, currentUser, todayStr]);

  const displayedQueueItems = useMemo(() => {
    switch (activeQueueFilter) {
      case 'overdue':
        return overdueTasks;
      case 'approvals':
        return approvalTasks;
      case 'closing':
        return closingSoonDeals;
      case 'renewals':
        return renewalsDueQueue;
      case 'stale':
        return inactiveDealsQueue;
      case 'all':
      default:
        return allWorkQueueItems;
    }
  }, [activeQueueFilter, overdueTasks, approvalTasks, closingSoonDeals, renewalsDueQueue, inactiveDealsQueue, allWorkQueueItems]);

  const handleItemClick = (item) => {
    if (item.type === 'overdue' || item.type === 'approval') {
      if (onOpenDrawer && item.raw?.linkedType && item.raw?.linkedId) {
        if (item.raw.linkedType === 'Deal') {
          const deal = deals.find(d => d.id === item.raw.linkedId);
          if (deal) {
            onOpenDrawer('deal', deal);
            return;
          }
        } else if (item.raw.linkedType === 'Lead') {
          const lead = leads.find(l => l.id === item.raw.linkedId);
          if (lead) {
            onOpenDrawer('lead', lead);
            return;
          }
        }
      }
      onNavigateTab('tasks');
    } else if (item.type === 'closing' || item.type === 'renewal' || item.type === 'stale') {
      if (onOpenDrawer) {
        onOpenDrawer('deal', item.raw);
      } else {
        onNavigateTab('pipeline');
      }
    }
  };

  // 1-Click Inline Action: Mark task complete directly from queue
  const handleQuickCompleteTask = async (e, item) => {
    e.stopPropagation();
    if (!onUpdateTask || !item.id) return;
    try {
      setActionInProgressId(item.id);
      await onUpdateTask(item.id, { status: 'completed' });
      toast.success(`Completed: ${item.title}`);
    } catch (err) {
      console.error('Error completing task:', err);
      toast.error('Failed to complete task');
    } finally {
      setActionInProgressId(null);
    }
  };

  // 1-Click Inline Action: Snooze/reschedule task +2 days
  const handleQuickSnoozeTask = async (e, item) => {
    e.stopPropagation();
    if (!onUpdateTask || !item.id) return;
    try {
      setActionInProgressId(item.id);
      const newDueDate = getLocalDateInputValueAfterDays(2);
      await onUpdateTask(item.id, { dueDate: newDueDate });
      toast.info(`Rescheduled for ${formatDate(newDueDate)}`);
    } catch (err) {
      console.error('Error rescheduling task:', err);
      toast.error('Failed to reschedule task');
    } finally {
      setActionInProgressId(null);
    }
  };

  // 1-Click Inline Action: Sign off approval directly
  const handleQuickApproveTask = async (e, item) => {
    e.stopPropagation();
    try {
      setActionInProgressId(item.id);
      if (onApproveStageGateCheck && item.raw?.stageGateCheckId) {
        await onApproveStageGateCheck(item.raw.stageGateCheckId, currentUser?.name || 'Reviewer');
        toast.success(`Approved gate check for ${item.title}`);
      } else if (onUpdateTask) {
        await onUpdateTask(item.id, { status: 'completed' });
        toast.success(`Approval task completed`);
      }
    } catch (err) {
      console.error('Error approving task:', err);
      toast.error('Failed to approve check');
    } finally {
      setActionInProgressId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F6F7F8] text-[#12161C]">

      {/* Signature Element: Manifest Strip */}
      <ManifestStrip
        activities={activities}
        tasks={tasks}
        deals={deals}
        currentUser={currentUser}
      />

      <div className="p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 flex-1">

        {/* Top Banner / Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#EFF6F9] via-[#FFFFFF] to-[#EFF6F9] border border-[#D8E8EF] p-4 sm:p-6 rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold text-[#12161C] tracking-tight">
                Sales Operations Console
              </h1>
              <span className="bg-[#FFFFFF] text-[#1D4E63] border border-[#D8E8EF] text-xs px-2.5 py-0.5 rounded-full font-mono font-bold shadow-2xs">
                {currentUser?.role}
              </span>
            </div>
            <p className="text-xs text-[#5B6472] mt-1 font-medium">
              Welcome back, <strong>{currentUser?.name}</strong>. Live sales pipeline, at-risk accounts & renewal cycles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('pipeline')}
              aria-label="Open Pipeline Kanban Board"
              className="px-4 py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs focus-visible:outline-2 focus-visible:outline-[#1D4E63]"
            >
              <Layers className="w-4 h-4 text-white" aria-hidden="true" />
              <span>Open Pipeline Board</span>
            </button>
          </div>
        </div>

        {/* Renewal Alert Banner if repeat orders due */}
        {renewalsDueDeals.length > 0 && (
          <div className="bg-[#FEF8EC] border border-[#F5DDA9] p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[#965700] shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFFFFF] border border-[#F5DDA9] flex items-center justify-center shrink-0 shadow-2xs">
                <RefreshCw className="w-5 h-5 text-[#965700] animate-spin" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-[#12161C]">
                  {renewalsDueDeals.length} Customer{renewalsDueDeals.length > 1 ? 's' : ''} Due for Repeat Orders (Renewal)
                </h3>
                <p className="text-xs text-[#5B6472]">
                  Total renewal pipeline value: <span className="font-mono font-bold text-[#12161C]">{formatCurrency(renewalsDueValue)}</span>. Recurring replenishment active.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('reports')}
              className="px-4 py-2 bg-[#965700] text-white font-bold text-xs rounded-xl hover:bg-[#7D4600] transition-colors shrink-0 shadow-2xs focus-visible:outline-2 focus-visible:outline-[#965700]"
            >
              View Renewal Tracker
            </button>
          </div>
        )}

        {/* Primary KPI Metric Cards (4 Stat Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

          {/* Total Active Pipeline Value */}
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-5 rounded-2xl hover:border-[#1D4E63] transition-all shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-[#5B6472] uppercase tracking-wider">PIPELINE VALUE</span>
              <div className="p-2 rounded-xl bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF]">
                <DollarSign className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>
            <div className="font-mono text-2xl lg:text-3xl font-extrabold text-[#12161C] mt-2">
              {formatCurrency(totalPipelineValue)}
            </div>
            <div className="text-[11px] text-[#5B6472] mt-1 font-medium font-mono">
              {userDeals.length} active opportunities
            </div>
          </div>

          {/* Total Leads */}
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-5 rounded-2xl hover:border-[#1D4E63] transition-all shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-[#5B6472] uppercase tracking-wider">TOTAL LEADS</span>
              <div className="p-2 rounded-xl bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF]">
                <Users className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>
            <div className="font-mono text-2xl lg:text-3xl font-extrabold text-[#12161C] mt-2">
              {totalLeads}
            </div>
            <div className="text-[11px] text-[#5B6472] mt-1 font-medium flex items-center gap-1.5 font-mono">
              <span className="text-[#965700] font-bold">{outboundLeadsCount} Outbound</span>
              <span>&bull;</span>
              <span className="text-[#1D4E63] font-semibold">{totalLeads - outboundLeadsCount} Inbound</span>
            </div>
          </div>

          {/* Revenue Won */}
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-5 rounded-2xl hover:border-[#BCDBC9] transition-all shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-[#5B6472] uppercase tracking-wider">REVENUE WON</span>
              <div className="p-2 rounded-xl bg-[#F0F7F3] text-[#255B40] border border-[#BCDBC9]">
                <Trophy className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>
            <div className="font-mono text-2xl lg:text-3xl font-extrabold text-[#255B40] mt-2">
              {formatCurrency(wonRevenue)}
            </div>
            <div className="text-[11px] text-[#5B6472] mt-1 font-medium font-mono">
              {wonDeals.length} deals closed won
            </div>
          </div>

          {/* Tasks Due Today & Overdue Follow-ups */}
          <div
            onClick={() => onNavigateTab('tasks')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigateTab('tasks'); }}
            className="bg-[#FFFFFF] border border-[#E3E6EA] p-5 rounded-2xl hover:border-[#965700] transition-all shadow-sm cursor-pointer group focus-visible:outline-2 focus-visible:outline-[#965700]"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-[#5B6472] uppercase tracking-wider group-hover:text-[#1D4E63] transition-colors">TASKS DUE TODAY</span>
              <div className="p-2 rounded-xl bg-[#FEF8EC] text-[#965700] border border-[#F5DDA9] group-hover:bg-[#F5DDA9] transition-colors">
                <Calendar className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>
            <div className="font-mono text-2xl lg:text-3xl font-extrabold text-[#12161C] mt-2 flex items-baseline justify-between">
              <span>{pendingTasksToday.length}</span>
              {overdueTasks.length > 0 && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#FDF2F1] text-[#922D27] border border-[#F4C4C1] font-bold">
                  {overdueTasks.length} overdue
                </span>
              )}
            </div>
            <div className={`text-[11px] mt-1 font-medium font-mono ${pendingTasksToday.length > 0 ? 'text-[#965700] font-bold' : 'text-[#5B6472]'}`}>
              {pendingTasksToday.length > 0 ? 'Requires immediate rep action' : 'All scheduled tasks clear'}
            </div>
          </div>

        </div>

        {/* --- FULL-WIDTH PRIORITIZED WORK QUEUE (IN PLACE OF AT-RISK RADAR) --- */}
        <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl shadow-sm space-y-4">
          
          {/* Header Bar: Dot + Title + Actions Pill + Mode Switcher */}
          <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3 gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5B6472]/60" aria-hidden="true" />
              <h2 className="font-display text-base font-extrabold text-[#12161C] tracking-tight">
                Prioritized Work Queue
              </h2>
              <span className="bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF] text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                {allWorkQueueItems.length} Actions
              </span>
            </div>

            {/* View Switcher: Queue vs Live Feed */}
            <div className="flex items-center gap-1 bg-[#F6F7F8] p-0.5 rounded-lg border border-[#E3E6EA] text-xs font-semibold">
              <button
                onClick={() => setActiveViewMode('queue')}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  activeViewMode === 'queue'
                    ? 'bg-[#FFFFFF] text-[#1D4E63] shadow-2xs font-bold'
                    : 'text-[#5B6472] hover:text-[#12161C]'
                }`}
              >
                <Zap className="w-3 h-3 text-[#1D4E63]" aria-hidden="true" />
                <span>Queue</span>
                {allWorkQueueItems.length > 0 && (
                  <span className="bg-[#922D27] text-white text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                    {allWorkQueueItems.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveViewMode('activity')}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${
                  activeViewMode === 'activity'
                    ? 'bg-[#FFFFFF] text-[#1D4E63] shadow-2xs font-bold'
                    : 'text-[#5B6472] hover:text-[#12161C]'
                }`}
              >
                <span>Live Feed</span>
              </button>
            </div>
          </div>

          {/* Filter Chips Bar (in Queue mode) */}
          {activeViewMode === 'queue' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {[
                { id: 'all', label: 'All', count: workQueueCounts.all },
                { id: 'overdue', label: 'Overdue', count: workQueueCounts.overdue, badgeBg: 'bg-[#FDF2F1] text-[#922D27] border-[#F4C4C1]' },
                { id: 'approvals', label: 'Approvals', count: workQueueCounts.approvals, badgeBg: 'bg-[#F5F3FF] text-[#5B21B6] border-[#DDD6FE]' },
                { id: 'closing', label: 'Closing Soon', count: workQueueCounts.closing, badgeBg: 'bg-[#FEF8EC] text-[#965700] border-[#F5DDA9]' },
                { id: 'renewals', label: 'Renewals', count: workQueueCounts.renewals, badgeBg: 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]' },
                { id: 'stale', label: 'No Touch', count: workQueueCounts.stale, badgeBg: 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3]' },
              ].map(tab => {
                const isActive = activeQueueFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveQueueFilter(tab.id)}
                    className={`px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border text-xs focus-visible:outline-2 focus-visible:outline-[#1D4E63] ${
                      isActive
                        ? 'bg-[#1D4E63] text-white border-[#1D4E63] font-bold shadow-2xs'
                        : 'bg-[#F6F7F8] text-[#5B6472] border-[#E3E6EA] hover:bg-[#EEF0F3] hover:text-[#12161C]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold border ${
                      isActive
                        ? 'bg-white/20 text-white border-transparent'
                        : (tab.badgeBg || 'bg-[#FFFFFF] text-[#5B6472] border-[#E3E6EA]')
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* List Content */}
          {activeViewMode === 'queue' ? (
            <div
              ref={queueListRef}
              className="space-y-3 pt-1 px-0.5 max-h-[600px] overflow-y-auto pr-1.5 overscroll-contain"
            >
              {displayedQueueItems.length === 0 ? (
                <div className="p-8 text-center bg-[#FAFCFD] border border-dashed border-[#BCDBC9] rounded-xl space-y-2">
                  <div className="w-10 h-10 rounded-full bg-[#F0F7F3] border border-[#BCDBC9] flex items-center justify-center mx-auto text-[#255B40]">
                    <ShieldCheck className="w-5 h-5 text-[#255B40]" aria-hidden="true" />
                  </div>
                  <h4 className="font-display text-xs font-bold text-[#12161C]">
                    All Clear in This Queue
                  </h4>
                  <p className="text-[11px] text-[#5B6472] max-w-[280px] mx-auto leading-relaxed">
                    {activeQueueFilter === 'overdue' && 'Zero overdue follow-up tasks. Outreach schedule is on track.'}
                    {activeQueueFilter === 'approvals' && 'Zero pending approvals awaiting sign-off.'}
                    {activeQueueFilter === 'closing' && 'No deals closing within the next 7 days.'}
                    {activeQueueFilter === 'renewals' && 'No renewal contracts due for replenishment.'}
                    {activeQueueFilter === 'stale' && 'All deals have received recent customer interaction.'}
                    {activeQueueFilter === 'all' && 'No urgent tasks or deals require immediate action.'}
                  </p>
                </div>
              ) : (
                displayedQueueItems.map(item => {
                  const isBusy = actionInProgressId === item.id;

                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleItemClick(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleItemClick(item); }}
                      className="p-4 bg-[#FAFCFD] hover:bg-[#F2F7FA] border border-[#E3E6EA] hover:border-[#1D4E63] rounded-xl space-y-2 transition-all text-xs cursor-pointer group shadow-2xs focus-visible:outline-2 focus-visible:outline-[#1D4E63]"
                    >
                      {/* Top line: Badge + Meta */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${getBadgeStyle(item.type)}`}>
                          {getItemIcon(item.type)}
                          <span>{item.categoryLabel}</span>
                        </span>
                        <span className="text-xs font-mono text-[#5B6472] font-semibold truncate max-w-[170px]" title={item.metaFull}>
                          {item.meta}
                        </span>
                      </div>

                      {/* Middle line: Title + Subtitle */}
                      <div>
                        <h4 className="font-bold text-sm text-[#12161C] group-hover:text-[#1D4E63] transition-colors truncate">
                          {item.title}
                        </h4>
                        <p className="text-xs text-[#5B6472] truncate mt-0.5 font-medium">
                          {item.subtitle}
                        </p>
                      </div>

                      {/* Bottom line: Inline Actions Toolbar + Inspect Trigger */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#E3E6EA]/70 gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.type === 'overdue' && onUpdateTask && (
                            <>
                              <button
                                onClick={(e) => handleQuickCompleteTask(e, item)}
                                disabled={isBusy}
                                className="px-2.5 py-1 bg-[#F0F7F3] hover:bg-[#DDF0E6] text-[#255B40] border border-[#BCDBC9] rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                                title="Mark task completed"
                              >
                                <Check className="w-3 h-3 text-[#255B40]" />
                                <span>Done</span>
                              </button>
                              <button
                                onClick={(e) => handleQuickSnoozeTask(e, item)}
                                disabled={isBusy}
                                className="px-2.5 py-1 bg-[#FAFCFD] hover:bg-[#EEF2F6] text-[#5B6472] hover:text-[#12161C] border border-[#E3E6EA] rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                title="Reschedule +2 days"
                              >
                                <RotateCcw className="w-3 h-3 text-[#5B6472]" />
                                <span>+2d</span>
                              </button>
                            </>
                          )}

                          {item.type === 'approval' && (
                            <button
                              onClick={(e) => handleQuickApproveTask(e, item)}
                              disabled={isBusy}
                              className="px-2.5 py-1 bg-[#F5F3FF] hover:bg-[#EDE9FE] text-[#5B21B6] border border-[#DDD6FE] rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                              title="Approve stage-gate check"
                            >
                              <ShieldCheck className="w-3 h-3 text-[#5B21B6]" />
                              <span>Approve</span>
                            </button>
                          )}
                        </div>

                        {/* Inspect on Right */}
                        <div className="flex items-center gap-1 text-[#1D4E63] font-bold text-xs group-hover:translate-x-0.5 transition-transform">
                          <span>Inspect</span>
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Live Activity Feed view inside work queue container */
            <div
              ref={activityListRef}
              className="space-y-3 pt-1 px-0.5 max-h-[600px] overflow-y-auto pr-1.5 overscroll-contain"
            >
              {activities?.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#5B6472]">
                  No activity logs recorded yet.
                </div>
              ) : (
                activities.slice(0, 25).map(act => (
                  <div key={act.id} className="p-3.5 bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        act.isOutbound
                          ? 'bg-[#FEF8EC] text-[#965700] border-[#F5DDA9]'
                          : 'bg-[#F0F7F3] text-[#255B40] border-[#BCDBC9]'
                      }`}>
                        {act.type}
                      </span>
                      <span className="text-[11px] text-[#5B6472] font-mono">{formatDate(act.timestamp)}</span>
                    </div>
                    <p className="text-[#12161C] font-medium leading-relaxed">{act.description}</p>
                    <div className="text-[11px] text-[#5B6472] flex items-center justify-between pt-1 border-t border-[#E3E6EA]/60 font-mono">
                      <span>Rep: {act.authorName}</span>
                      {act.linkedTitle && <span className="text-[#1D4E63] truncate max-w-[140px] font-bold">{act.linkedTitle}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Footer: Manage All Follow-ups & Tasks >  on left, Open Kanban Board > on right */}
          <div className="border-t border-[#E3E6EA] pt-3 flex items-center justify-between text-xs">
            <button
              onClick={() => onNavigateTab('tasks')}
              className="text-[#1D4E63] hover:text-[#153B4B] font-bold flex items-center gap-1 transition-colors"
            >
              <span>Manage All Follow-ups & Tasks</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              onClick={() => onNavigateTab('pipeline')}
              className="text-[#5B6472] hover:text-[#12161C] font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Open Kanban Board</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

        </div>

        {/* Outbound Sales Activity Metrics Highlight */}
        <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-2xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                <Send className="w-4 h-4 text-[var(--primary-700)]" aria-hidden="true" />
                <span>Outbound Sales Activity Metrics</span>
              </h2>
              <p className="text-xs text-[var(--ink-muted)]">Tracking proactive rep outreach & physical sample disbursements</p>
            </div>
            <span className="text-xs text-[var(--primary-700)] bg-[var(--primary-50)] border border-[var(--border)] px-2.5 py-0.5 rounded-full font-mono font-semibold">
              Live Feed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[var(--canvas)] border border-[var(--border)] p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--primary-700)] shrink-0 shadow-2xs">
                <PhoneCall className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <div className="text-xs text-[var(--ink-muted)] font-medium">Outbound Calls Made</div>
                <div className="font-mono text-xl font-bold text-[var(--ink)]">{outboundCalls}</div>
              </div>
            </div>

            <div className="bg-[var(--canvas)] border border-[var(--border)] p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--primary-700)] shrink-0 shadow-2xs">
                <Mail className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <div className="text-xs text-[var(--ink-muted)] font-medium">Outbound Emails Sent</div>
                <div className="font-mono text-xl font-bold text-[var(--ink)]">{outboundEmails}</div>
              </div>
            </div>

            <div className="bg-[var(--canvas)] border border-[var(--border)] p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--warning-text)] shrink-0 shadow-2xs">
                <Package className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <div className="text-xs text-[var(--ink-muted)] font-medium">Product Samples Dispatched</div>
                <div className="font-mono text-xl font-bold text-[var(--ink)]">{samplesSent}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Visual Section: Pipeline Stage Breakdown & Recent Activity Log */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Pipeline Stage Column Chart Cards (2 Cols) */}
          <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E3E6EA] p-4 sm:p-6 rounded-2xl space-y-4 flex flex-col justify-between shadow-sm">

            {/* Header with Title and Mobile View Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E3E6EA] pb-3 gap-2.5">
              <div>
                <h2 className="font-display text-sm font-bold text-[#12161C] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#1D4E63]" />
                  <span>Pipeline Value by Stage</span>
                </h2>
                <p className="text-xs text-[#5B6472] mt-0.5">Total deal distribution across active sales stages</p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {/* Mobile View Switcher (Horizontal Bars vs Vertical Columns) */}
                <div className="sm:hidden flex items-center bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-0.5 text-[11px] font-bold">
                  <button
                    onClick={() => setMobileChartMode('bars')}
                    aria-label="Bars"
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      mobileChartMode === 'bars'
                        ? 'bg-[#FFFFFF] text-[#1D4E63] shadow-2xs font-extrabold'
                        : 'text-[#5B6472] hover:text-[#12161C]'
                    }`}
                  >
                    <AlignLeft className="w-3 h-3" />
                    <span>Bars</span>
                  </button>
                  <button
                    onClick={() => setMobileChartMode('columns')}
                    aria-label="Columns"
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      mobileChartMode === 'columns'
                        ? 'bg-[#FFFFFF] text-[#1D4E63] shadow-2xs font-extrabold'
                        : 'text-[#5B6472] hover:text-[#12161C]'
                    }`}
                  >
                    <BarChart3 className="w-3 h-3" />
                    <span>Columns</span>
                  </button>
                </div>

                <button
                  onClick={() => onNavigateTab('pipeline')}
                  className="text-xs text-[#5B6472] hover:text-[#12161C] font-semibold flex items-center gap-1 transition-colors px-3 py-1.5 rounded-xl bg-[#F6F7F8] hover:bg-[#EEF0F3] border border-[#E3E6EA] cursor-pointer"
                >
                  <span>View Kanban</span>
                  <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Chart Area */}
            <div className="relative py-1">
              
              {/* 1. Mobile Horizontal Comparative Bars (Default on mobile) */}
              <div 
                data-testid="mobile-stage-bars"
                className={`sm:hidden ${mobileChartMode === 'bars' ? 'space-y-2.5' : 'hidden'}`}
              >
                {stageBreakdown.map(({ stage, count, value }) => {
                  const isZero = value === 0;
                  const widthPct = maxStageVal > 0 ? (value / maxStageVal) * 100 : 0;
                  const barColor = getStageBarColor(stage.name, stage.category);
                  const sharePct = totalPipelineValue > 0 ? Math.round((value / totalPipelineValue) * 100) : 0;

                  return (
                    <div
                      key={stage.id}
                      onClick={() => onNavigateTab('pipeline')}
                      className="p-3 bg-[#F6F7F8] hover:bg-[#EEF0F3] border border-[#E3E6EA] rounded-xl space-y-2 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-[#D1D5DB] shrink-0"
                            style={{ backgroundColor: barColor || '#FFFFFF' }}
                          />
                          <span className="font-bold text-[#12161C] truncate">{stage.name}</span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-[#FFFFFF] border border-[#E3E6EA] text-[#5B6472] shrink-0">
                            {count}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 font-mono">
                          <span className="font-bold text-[#12161C] text-xs">{formatCurrency(value)}</span>
                          <span className="text-[10px] text-[#5B6472] font-semibold">({sharePct}%)</span>
                        </div>
                      </div>

                      {/* Bar Fill Track */}
                      <div className="h-2.5 w-full bg-[#FFFFFF] rounded-full overflow-hidden border border-[#E3E6EA]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(widthPct, isZero ? 0 : 4)}%`,
                            backgroundColor: barColor === '#FFFFFF' ? '#94A3B8' : barColor
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 2. Mobile Horizontally Scrollable Column Bars (When Columns toggle is active on mobile) */}
              <div 
                data-testid="mobile-stage-columns"
                className={`sm:hidden ${mobileChartMode === 'columns' ? 'block' : 'hidden'}`}
              >
                <div className="text-[11px] text-[#5B6472] font-semibold flex items-center justify-between pb-2 px-1">
                  <span>Stage Value Bars</span>
                  <span className="text-[#1D4E63] font-mono text-[10px] font-bold">Swipe columns ➔</span>
                </div>
                <div className="overflow-x-auto no-scrollbar scroll-smooth pb-2">
                  <div className="flex items-end gap-2.5 min-w-[620px] h-[240px] pt-2">
                    {stageBreakdown.map(({ stage, count, value }) => {
                      const isZero = value === 0;
                      const heightPct = maxStageVal > 0 ? (value / maxStageVal) * 100 : 0;
                      const barColor = getStageBarColor(stage.name, stage.category);

                      return (
                        <div
                          key={stage.id}
                          className={`w-28 shrink-0 rounded-xl p-2.5 flex flex-col justify-between items-center text-center h-full transition-all relative ${
                            isZero
                              ? 'bg-[#F6F7F8]/60 border border-[#E3E6EA]/60 opacity-60'
                              : 'bg-[#F6F7F8] border border-[#E3E6EA] shadow-2xs'
                          }`}
                        >
                          <div className="space-y-1 w-full pt-1">
                            <h4 className="font-display text-[11px] font-bold truncate leading-tight text-[#12161C]" title={stage.name}>
                              {stage.name}
                            </h4>
                            <p className="text-[10px] font-mono text-[#5B6472]">({count})</p>
                            <div className="text-[11px] font-bold font-mono pt-1 text-[#12161C] truncate">
                              {formatCurrency(value)}
                            </div>
                          </div>

                          <div className="w-full flex-1 flex flex-col justify-end items-center pb-1">
                            {isZero ? (
                              <div className="w-full space-y-1.5 flex flex-col items-center">
                                <div className="w-6 h-1 bg-[#E3E6EA] rounded-full" />
                                <span className="text-[9px] font-mono text-[#5B6472] font-bold">₹0</span>
                              </div>
                            ) : (
                              <div className="w-full flex flex-col items-center justify-end h-full">
                                <div
                                  className={`w-full rounded-lg transition-all duration-500 shadow-2xs ${barColor === '#FFFFFF' ? 'border border-[#D1D5DB]' : ''}`}
                                  style={{
                                    height: `${Math.max(heightPct, 10)}%`,
                                    backgroundColor: barColor === '#FFFFFF' ? '#94A3B8' : barColor
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Desktop / Tablet Grid Column Chart (Hidden on mobile) */}
              <div className="hidden sm:grid sm:grid-cols-4 lg:grid-cols-8 gap-2.5 relative z-10">
                {stageBreakdown.map(({ stage, count, value }) => {
                  const isZero = value === 0;
                  const heightPct = maxStageVal > 0 ? (value / maxStageVal) * 100 : 0;
                  const barColor = getStageBarColor(stage.name, stage.category);

                  return (
                    <div
                      key={stage.id}
                      className={`rounded-xl p-2.5 flex flex-col justify-between items-center text-center h-[300px] transition-all relative ${
                        isZero
                          ? 'bg-[#F6F7F8]/60 border border-[#E3E6EA]/60 opacity-60'
                          : 'bg-[#F6F7F8] border border-[#E3E6EA] hover:border-[#1D4E63] shadow-2xs group'
                      }`}
                    >
                      {/* Top Info */}
                      <div className="space-y-1 w-full pt-1">
                        <h4 className="font-display text-[11px] font-bold truncate leading-tight text-[#12161C]" title={stage.name}>
                          {stage.name}
                        </h4>
                        <p className="text-[10px] font-mono text-[#5B6472]">
                          ({count})
                        </p>

                        <div className="text-xs font-bold font-mono pt-1 text-[#12161C]">
                          {formatCurrency(value)}
                        </div>
                      </div>

                      {/* Bar Area */}
                      <div className="w-full flex-1 flex flex-col justify-end items-center pb-1">
                        {isZero ? (
                          <div className="w-full space-y-2 flex flex-col items-center">
                            <div className="w-8 h-1 bg-[#E3E6EA] rounded-full" />
                            <span className="text-[10px] font-mono text-[#5B6472] font-bold">₹0</span>
                          </div>
                        ) : (
                          <div className="w-full flex flex-col items-center justify-end h-full">
                            <div
                              className={`w-full rounded-lg transition-all duration-500 shadow-2xs ${barColor === '#FFFFFF' ? 'border border-[#D1D5DB]' : ''}`}
                              style={{
                                height: `${Math.max(heightPct, 10)}%`,
                                backgroundColor: barColor === '#FFFFFF' ? '#94A3B8' : barColor
                              }}
                            />
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>

          </div>

          {/* Recent Activity Log (1 Col) */}
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl space-y-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
              <h2 className="font-display text-sm font-bold text-[#12161C]">Recent Activity Log</h2>
              <span className="text-[11px] text-[#255B40] bg-[#F0F7F3] border border-[#BCDBC9] px-2 py-0.5 rounded-full font-bold">
                Live
              </span>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 no-scrollbar flex-1">
              {activities?.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#5B6472]">
                  No activity logs recorded yet.
                </div>
              ) : (
                activities?.slice(0, 8).map(act => (
                  <div key={act.id} className="p-3 bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        act.isOutbound
                          ? 'bg-[#FEF8EC] text-[#965700] border-[#F5DDA9]'
                          : 'bg-[#F0F7F3] text-[#255B40] border-[#BCDBC9]'
                      }`}>
                        {act.type}
                      </span>
                      <span className="text-[11px] text-[#5B6472] font-mono">{formatDate(act.timestamp)}</span>
                    </div>
                    <p className="text-[#12161C] line-clamp-2 font-medium">{act.description}</p>
                    <div className="text-[11px] text-[#5B6472] flex items-center justify-between pt-1 font-mono">
                      <span>Rep: {act.authorName}</span>
                      {act.linkedTitle && <span className="text-[#1D4E63] truncate max-w-[120px] font-bold">{act.linkedTitle}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Quick Link */}
            <div className="border-t border-[#E3E6EA] pt-3 flex items-center justify-between text-[11px]">
              <span className="text-[#5B6472] font-medium font-mono">Proactive customer touchpoints</span>
              <button
                onClick={() => onNavigateTab('pipeline')}
                className="text-[#1D4E63] hover:text-[#153B4B] font-bold flex items-center gap-1 transition-colors"
              >
                <span>Pipeline Board</span>
                <ChevronRight className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
