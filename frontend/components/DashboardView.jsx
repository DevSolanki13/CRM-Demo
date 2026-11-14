import { DashboardQueueSkeleton, DashboardActivitySkeleton } from './skeletons/DashboardSkeleton.jsx';
import { Skeleton } from './skeletons/primitives.jsx';
import React, { useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, Layers, Mail, Package, Phone, Plus, RefreshCw, RotateCcw, ShieldCheck, Trophy, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useUrlRecordsPage } from '../hooks/useUrlRecordsPage.js';
import { useUrlParamState } from '../hooks/useUrlParamState.js';
import { RecordPagination } from './RecordPagination.jsx';
import { Avatar, DashboardEmptyState, DashboardPanel, MetricCard, StatusBadge } from './DashboardPrimitives.jsx';
import { formatCurrency, formatDate, getLocalDateInputValue, getLocalDateInputValueAfterDays, isMockDeal, isMockTask, isMockActivity } from '../utils/crmHelpers.js';
import { isRecurringTask } from '../../shared/leadRecurrence.js';

const queueFilters = [
  ['all', 'All', 'all'], ['overdue', 'Overdue', 'overdue'], ['approvals', 'Approvals', 'approval'],
  ['closing', 'Closing', 'closing'], ['renewals', 'Renewals', 'renewal'], ['stale', 'Stale', 'stale'],
];
const queueTone = { overdue: 'danger', approval: 'warning', closing: 'info', renewal: 'warning', stale: 'danger' };

function taskDueLabel(value) {
  if (!value) return 'No due date';
  const day = value.slice(0, 10), today = getLocalDateInputValue();
  if (day < today) return 'Overdue · ' + formatDate(value);
  if (day === today) return 'Today';
  if (day === getLocalDateInputValueAfterDays(1)) return 'Tomorrow';
  return formatDate(value);
}

export const DashboardView = ({
  revision = 0, state, currentUser, onNavigateTab, onTriggerRenewalCheck,
  onOpenLeadModal, onOpenDrawer, onUpdateTask, onApproveStageGateCheck,
  onOpenRecurringTask,
}) => {
  const { leads = [], deals = [], stages = [], pipelines = [], users = [], branding = {} } = state || {};
  const summary = state?.overview || {}, counts = summary.queueCounts || {};
  const [activeQueueFilter, setActiveQueueFilter] = useUrlParamState('queueFilter', 'all', { pageKeyPrefix: 'queue' });
  const [activeViewMode, setActiveViewMode] = useUrlParamState('view', 'queue', { clearPagination: false });
  const [busyActions, setBusyActions] = useState(new Set());
  const [completingTasks, setCompletingTasks] = useState(new Set());
  const [checkingRenewals, setCheckingRenewals] = useState(false);
  const actionLocks = useRef(new Set());
  const showMockData = typeof window !== 'undefined' && localStorage.getItem('crm.showMockData') === 'true';
  const queuePage = useUrlRecordsPage('dashboard-queue', { type: activeQueueFilter, limit: 4, showMockData: String(showMockData) }, revision, true, 'queue');
  const activityPage = useUrlRecordsPage('activities', { sort: 'recent', limit: 4, showMockData: String(showMockData) }, revision, activeViewMode === 'activity', 'activity');
  const taskPage = useUrlRecordsPage('tasks', { owner: currentUser.id, queue: 'followups', showCompleted: 'false', limit: 4, showMockData: String(showMockData) }, revision, true, 'followups');

  const queueItems = useMemo(() => {
    return showMockData ? queuePage.items : queuePage.items.filter(item => {
      if (item.type === 'overdue' || item.type === 'approval') return !isMockTask(item.raw || item);
      return !isMockDeal(item.raw || item);
    });
  }, [queuePage.items, showMockData]);

  const taskItems = useMemo(() => {
    return showMockData ? taskPage.items : taskPage.items.filter(task => !isMockTask(task));
  }, [taskPage.items, showMockData]);

  const activityItems = useMemo(() => {
    return showMockData ? activityPage.items : activityPage.items.filter(activity => !isMockActivity(activity));
  }, [activityPage.items, showMockData]);

  const currency = branding.currency || 'INR';
  const money = value => formatCurrency(value || 0, currency);
  const compactMoney = value => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1,
  }).format(value || 0);
  const visibleDeals = useMemo(() => {
    return showMockData ? deals : deals.filter(deal => !isMockDeal(deal));
  }, [deals, showMockData]);

  const activeDeals = useMemo(() => visibleDeals.filter(d => d.status === 'Active'), [visibleDeals]);
  const wonDeals = useMemo(() => visibleDeals.filter(d => d.status === 'Won'), [visibleDeals]);

  const recurringLeads = useMemo(() => (leads || []).filter(l => l.isRecurring && (showMockData || !l.id.match(/^ld-\d+$/))), [leads, showMockData]);
  const activeRecurringCount = useMemo(() => {
    return recurringLeads.filter(l => !l.recurrencePaused && !['purchased', 'not_buying'].includes(l.recurrenceState) && !visibleDeals.some(d => d.leadId === l.id)).length;
  }, [recurringLeads, visibleDeals]);

  const activeDealCount = summary.activeDealCount != null
    ? summary.activeDealCount
    : (activeDeals.length + activeRecurringCount);

  const totalPipelineValue = summary.totalPipelineValue != null 
    ? summary.totalPipelineValue 
    : activeDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);

  const wonCount = summary.wonCount != null ? summary.wonCount : wonDeals.length;
  const wonRevenue = summary.wonRevenue != null 
    ? summary.wonRevenue 
    : wonDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);

  const availablePipelines = useMemo(() => {
    const sales = pipelines.filter(pipeline => pipeline.id === 'pipeline-sales' || pipeline.name?.toLowerCase() === 'sales');
    return sales.length > 0 ? sales : [{ id: 'pipeline-sales', name: 'Sales' }];
  }, [pipelines]);
  const pipelineId = availablePipelines[0]?.id || 'pipeline-sales';

  const stageRows = useMemo(() => {
    const relevantStages = stages.filter(stage => !pipelineId || stage.pipelineId === pipelineId)
      .sort((a, b) => a.order - b.order);

    return relevantStages.map(stage => {
      const isRenewal = stage.category === 'Buy Again' || stage.id === 'stg-7' || stage.name === 'Buy Again (Renewal)';
      const isWon = stage.category === 'Won' || stage.id === 'stg-6';
      const isLost = stage.category === 'Lost' || stage.id === 'stg-8';

      const matchingDeals = visibleDeals.filter(d => d.stageId === stage.id && (!pipelineId || d.pipelineId === pipelineId));
      
      const unlinkedRecurring = recurringLeads.filter(l => !visibleDeals.some(d => d.leadId === l.id));
      const recurringCount = isRenewal
        ? unlinkedRecurring.filter(l => !l.recurrencePaused && !['purchased', 'not_buying'].includes(l.recurrenceState)).length
        : isWon
          ? unlinkedRecurring.filter(l => l.recurrenceState === 'purchased').length
          : isLost
            ? unlinkedRecurring.filter(l => l.recurrenceState === 'not_buying').length
            : 0;

      const found = summary.stageTotals?.find(total => total.stageId === stage.id);
      const computedCount = matchingDeals.length + recurringCount;
      const count = found?.count != null ? found.count : computedCount;
      const value = found?.value != null ? found.value : matchingDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);

      return {
        stage,
        count,
        value
      };
    });
  }, [stages, pipelineId, deals, visibleDeals, recurringLeads, summary.stageTotals, showMockData]);

  const maxStageCount = Math.max(...stageRows.map(row => row.count), 1);
  const pipelineDealCount = stageRows.reduce((total, row) => total + row.count, 0);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUser.name?.trim().split(/\s+/)[0] || 'there';
  const canApprove = ['Admin', 'Manager'].includes(currentUser.role);

  const handleItemClick = item => {
    if (item.type === 'overdue' || item.type === 'approval') {
      const linked = item.raw;
      const records = linked?.linkedType === 'Lead' ? leads : deals;
      const record = records.find(record => record.id === linked?.linkedId);
      if (record && onOpenDrawer && ['Lead', 'Deal'].includes(linked.linkedType)) onOpenDrawer(linked.linkedType.toLowerCase(), record);
      else onNavigateTab('tasks');
    } else if (item.type === 'renewal' && (item.raw?.isRecurring || item.raw?.linkedType === 'Lead')) {
      if (onOpenDrawer) onOpenDrawer('lead', item.raw);
      else onNavigateTab('leads');
    } else if (onOpenDrawer) onOpenDrawer('deal', item.raw);
    else onNavigateTab('pipeline');
  };

  const runAction = async (id, callback, success, failure) => {
    if (actionLocks.current.has(id)) return;
    actionLocks.current.add(id);
    setBusyActions(new Set(actionLocks.current));
    try { await callback(); if (success) toast.success(success); }
    catch (error) { if (!error.userNotified) toast.error(error.message || failure); }
    finally {
      actionLocks.current.delete(id);
      setBusyActions(new Set(actionLocks.current));
    }
  };
  const completeTask = async task => {
    if (isRecurringTask(task.raw || task)) return onOpenRecurringTask?.(task.raw || task);
    setCompletingTasks(previous => new Set(previous).add(task.id));
    try {
      await runAction('task-' + task.id, () => onUpdateTask(task.id, { status: 'completed' }),
        'Completed: ' + task.title, 'Could not complete this task.');
    } finally {
      setCompletingTasks(previous => { const next = new Set(previous); next.delete(task.id); return next; });
    }
  };
  const snoozeTask = task => isRecurringTask(task.raw || task) ? onOpenRecurringTask?.(task.raw || task) : runAction('task-' + task.id,
    () => onUpdateTask(task.id, { dueDate: getLocalDateInputValueAfterDays(2) }),
    'Rescheduled for ' + formatDate(getLocalDateInputValueAfterDays(2)), 'Could not reschedule this task.');
  const approveTask = item => runAction('approval-' + item.raw.stageGateCheckId,
    () => onApproveStageGateCheck(item.raw.stageGateCheckId),
    null, 'Could not approve this request.');
  const checkRenewals = async () => {
    if (checkingRenewals) return;
    setCheckingRenewals(true);
    try { await onTriggerRenewalCheck?.(); }
    catch (error) { toast.error(error.message || 'Could not check renewal cycles.'); }
    finally { setCheckingRenewals(false); }
  };
  const showRenewals = () => {
    setActiveViewMode('queue');
    setActiveQueueFilter('renewals');
    document.getElementById('work-queue')?.scrollIntoView({ block: 'nearest' });
  };
  const page = activeViewMode === 'queue' ? queuePage : activityPage;

  return <div className="crm-dashboard">
    <div className="dashboard-welcome">
      <div><h1>{greeting}, {firstName}</h1><p>Here’s your pipeline, priorities and next steps.</p></div>
      <div className="dashboard-welcome-actions">
        <button type="button" className="crm-button crm-button--secondary" onClick={checkRenewals}
          disabled={checkingRenewals || currentUser.role === 'Sales Rep' || !onTriggerRenewalCheck}
          title={currentUser.role === 'Sales Rep' ? 'Renewal checks are managed by your manager or administrator.' : 'Check recurring order cycles'}>
          <RefreshCw size={17} aria-busy={checkingRenewals} aria-hidden="true" />
          {checkingRenewals ? 'Checking…' : 'Renewal cycle'}
        </button>
        <button type="button" className="crm-button crm-button--primary" onClick={onOpenLeadModal}><Plus size={18} aria-hidden="true" />Add lead</button>
      </div>
    </div>
    <div className="dashboard-metrics" aria-label="Sales overview">
      <MetricCard label="Pipeline value" value={compactMoney(totalPipelineValue)} title={money(totalPipelineValue)}
        context={activeDealCount + ' active opportunities'} icon={Wallet} />
      <MetricCard label="Revenue won" value={compactMoney(wonRevenue)} title={money(wonRevenue)}
        context={wonCount + ' closed-won deals'} icon={Trophy} />
      <MetricCard label="Active deals" value={activeDealCount.toLocaleString()} context="Across your sales workspace" icon={Users} />
      <MetricCard label="Overdue follow-ups" value={(counts.overdue || 0).toLocaleString()}
        context={counts.overdue ? 'Needs your attention' : 'Your follow-ups are on track'} icon={Clock} danger={counts.overdue > 0}
        onClick={() => { setActiveViewMode('queue'); setActiveQueueFilter('overdue'); }} />
    </div>
    <div className="dashboard-grid">
      <DashboardPanel title="Prioritized Work Queue" description="Follow-ups, approvals and deals that need action" id="work-queue"
        action={<button type="button" className="dashboard-text-button" onClick={() => onNavigateTab('tasks')}>View all <ArrowRight size={16} aria-hidden="true" /></button>}>
        <div className="dashboard-queue-controls">
          <div className="dashboard-view-switch" aria-label="Work queue view">
            <button type="button" aria-pressed={activeViewMode === 'queue'} onClick={() => setActiveViewMode('queue')}>Queue</button>
            <button type="button" aria-pressed={activeViewMode === 'activity'} onClick={() => setActiveViewMode('activity')}>Live Feed</button>
          </div>
          {activeViewMode === 'queue' && <div className="dashboard-filters" aria-label="Work queue filters">
            {queueFilters.map(([id, label, countKey]) => <button type="button" key={id} aria-pressed={activeQueueFilter === id}
              onClick={() => setActiveQueueFilter(id)}>{label} <span>{counts[countKey] || 0}</span></button>)}
          </div>}
        </div>
        {page.loading ? (activeViewMode === 'queue' ? <DashboardQueueSkeleton /> : <DashboardActivitySkeleton />)
          : page.error ? null : activeViewMode === 'queue' ? <>
            {queueItems.length > 0 ? <>
              <div className="dashboard-queue-labels" aria-hidden="true"><span>Item / customer</span><span>Status</span><span>Owner</span><span>Action</span></div>
              <ul className="dashboard-queue-list">
                {queueItems.map(item => {
                  const owner = users.find(user => user.id === item.raw?.ownerId);
                  const ownerName = owner?.name || item.raw?.ownerName || 'Unassigned';
                  const busy = busyActions.has(item.type === 'approval'
                    ? 'approval-' + item.raw?.stageGateCheckId : 'task-' + item.id);
                  return <li key={item.key || item.type + '-' + item.id} className="dashboard-queue-row" aria-busy={busy}>
                    <button type="button" className="dashboard-queue-item" onClick={() => handleItemClick(item)} title={item.title}>
                      <strong>{item.title}</strong><span>{item.subtitle || item.meta}</span>
                    </button>
                    <div className="dashboard-queue-status"><StatusBadge tone={queueTone[item.type]}>{item.categoryLabel}</StatusBadge><span>{item.meta}</span></div>
                    <div className="dashboard-queue-owner"><Avatar name={ownerName} src={owner?.avatarUrl} size="small" /></div>
                    <div className="dashboard-queue-actions">
                      {item.type === 'overdue' && onUpdateTask ? <>
                        <button type="button" className="dashboard-text-button" disabled={busy} onClick={() => completeTask(item)} aria-label={(isRecurringTask(item.raw || item) ? 'Update cycle: ' : 'Complete task: ') + item.title}>
                          {busy ? 'Saving…' : isRecurringTask(item.raw || item) ? 'Update cycle' : 'Done'}<CheckCircle2 size={15} aria-hidden="true" />
                        </button>
                        <button type="button" className="dashboard-icon-button" disabled={busy} onClick={() => snoozeTask(item)}
                          aria-label={'Reschedule ' + item.title + ' by two days'} title="Reschedule +2 days"><RotateCcw size={15} aria-hidden="true" /></button>
                      </> : item.type === 'approval' && canApprove && item.raw?.stageGateCheckId && onApproveStageGateCheck
                        ? <button type="button" className="dashboard-text-button" disabled={busy} onClick={() => approveTask(item)} aria-label={'Approve: ' + item.title}>
                          {busy ? 'Saving…' : 'Approve'}<ShieldCheck size={15} aria-hidden="true" /></button>
                        : <button type="button" className="dashboard-text-button" onClick={() => handleItemClick(item)}>Inspect <ArrowRight size={15} aria-hidden="true" /></button>}
                    </div>
                  </li>;
                })}
              </ul>
            </> : <DashboardEmptyState title="All clear in this queue" icon={CheckCircle2}>No items in this category need your attention.</DashboardEmptyState>}
          </> : activityItems.length ? <ul className="dashboard-activity-list">
            {activityItems.map(activity => <li key={activity.id}><span className="dashboard-activity-icon"><Clock size={16} aria-hidden="true" /></span>
              <div><strong>{activity.type}</strong><p>{activity.description}</p><span>{activity.authorName}{activity.timestamp ? ' · ' + formatDate(activity.timestamp) : ''}</span></div>
            </li>)}
          </ul> : <DashboardEmptyState title="No activity recorded yet" icon={Clock}>Calls, emails and customer updates will appear here.</DashboardEmptyState>}
        <div className="dashboard-pagination"><RecordPagination page={page} retryLabel="Try again" label={activeViewMode === 'queue' ? 'work items' : 'activities'} /></div>
      </DashboardPanel>
      <DashboardPanel title="Pipeline overview" description="Opportunity distribution by stage" className="dashboard-pipeline" action={<Layers size={18} aria-hidden="true" />}>
        <div className="dashboard-pipeline-scope">
          <span className="font-semibold text-xs text-[#1D4E63]">{availablePipelines[0]?.name || 'Sales'}</span>
          <StatusBadge>{pipelineDealCount.toLocaleString()} total</StatusBadge>
        </div>
        {stageRows.length ? <ul className="dashboard-stage-list">
          {stageRows.map(({ stage, count, value }) => <li key={stage.id} title={stage.name + ': ' + count + ' deals · ' + money(value)}>
            <span className="dashboard-stage-name">{stage.name}</span>
            <span className="dashboard-stage-track" aria-hidden="true"><span style={{ width: count / maxStageCount * 100 + '%', backgroundColor: stage.color && stage.color.toLowerCase() !== '#ffffff' ? stage.color : 'var(--primary)' }} /></span>
            <strong>{count.toLocaleString()}</strong>
          </li>)}
        </ul> : <DashboardEmptyState title="No pipeline stages yet" icon={Layers}>Your configured stages will appear here.</DashboardEmptyState>}
        <div className="dashboard-panel-footer"><span>Counts for selected pipeline</span><button type="button" className="dashboard-text-button" onClick={() => onNavigateTab('pipeline', pipelineId)}>View board <ArrowRight size={16} aria-hidden="true" /></button></div>
      </DashboardPanel>
      <DashboardPanel title="Your follow-ups" description="Pending tasks assigned to you" className="dashboard-tasks"
        action={<StatusBadge>{taskPage.loading ? <Skeleton className="h-4 w-16" /> : (showMockData ? taskPage.total : taskItems.length) + ' pending'}</StatusBadge>}>
        {taskPage.loading ? <DashboardQueueSkeleton followups />
          : taskPage.error ? null : taskItems.length ? <ul className="dashboard-task-list">
            {taskItems.map(task => <li key={task.id}>
              {isRecurringTask(task) ? <button type="button" className="dashboard-text-button" onClick={() => onOpenRecurringTask?.(task)}>Update cycle</button> : <input type="checkbox" checked={completingTasks.has(task.id)} disabled={!onUpdateTask || busyActions.has('task-' + task.id)}
                aria-label={'Mark ' + task.title + ' complete'} onChange={() => completeTask(task)} />}
              <button type="button" className="dashboard-task-detail" onClick={() => onNavigateTab('tasks')}><strong>{task.title}</strong><span>{task.linkedTitle || task.type || 'Follow-up'}</span></button>
              <span className={'dashboard-task-date' + (task.dueDate?.slice(0, 10) < getLocalDateInputValue() ? ' is-overdue' : '')}>{taskDueLabel(task.dueDate)}</span>
            </li>)}
          </ul> : <DashboardEmptyState title="You’re all caught up" icon={CheckCircle2}>Your pending follow-ups will appear here.</DashboardEmptyState>}
        <div className="dashboard-pagination"><RecordPagination page={taskPage} label="follow-ups" /></div>
      </DashboardPanel>
      <DashboardPanel title="Today’s outreach" description="Recorded sales activity today" className="dashboard-outreach" action={<StatusBadge>Today</StatusBadge>}>
        <dl className="dashboard-outreach-list">
          {[[Phone, 'Outbound calls', summary.outboundCalls], [Mail, 'Outbound emails', summary.outboundEmails], [Package, 'Samples dispatched', summary.samplesSent]].map(([Icon, label, count]) => <div key={label}>
            <dt><Icon size={17} strokeWidth={1.7} aria-hidden="true" />{label}</dt><dd>{(count || 0).toLocaleString()}</dd>
          </div>)}
        </dl>
        <button type="button" className={'dashboard-renewal-note' + (summary.renewalsDueCount ? ' has-renewals' : '')} onClick={showRenewals}>
          <RefreshCw size={17} aria-hidden="true" /><span>{summary.renewalsDueCount ? summary.renewalsDueCount + ' recurring orders need follow-up' : 'No recurring orders due'}</span><ArrowRight size={16} aria-hidden="true" />
        </button>
        {summary.renewalsDueCount > 0 && <p className="dashboard-renewal-value">Renewal pipeline: {money(summary.renewalsDueValue)}</p>}
      </DashboardPanel>
    </div>
    <div className="dashboard-footer"><span>Workspace overview · All pipelines</span><span>{(summary.totalLeads || 0).toLocaleString()} leads · {(summary.outboundLeadsCount || 0).toLocaleString()} outbound</span></div>
  </div>;
};
