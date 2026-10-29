import React, { useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, Layers, Mail, Package, Phone, Plus, RefreshCw, RotateCcw, ShieldCheck, Trophy, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useRecordsPage } from '../hooks/useRecordsPage.js';
import { RecordPagination } from './RecordPagination.jsx';
import { Avatar, DashboardEmptyState, DashboardPanel, MetricCard, StatusBadge } from './DashboardPrimitives.jsx';
import { formatCurrency, formatDate, getLocalDateInputValue, getLocalDateInputValueAfterDays } from '../utils/crmHelpers.js';

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
}) => {
  const { leads = [], deals = [], stages = [], pipelines = [], users = [], branding = {} } = state || {};
  const summary = state?.overview || {}, counts = summary.queueCounts || {};
  const [activeQueueFilter, setActiveQueueFilter] = useState('all');
  const [activeViewMode, setActiveViewMode] = useState('queue');
  const [busyActions, setBusyActions] = useState(new Set());
  const [completingTasks, setCompletingTasks] = useState(new Set());
  const [checkingRenewals, setCheckingRenewals] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState('');
  const actionLocks = useRef(new Set());
  const queuePage = useRecordsPage('dashboard-queue', { type: activeQueueFilter, limit: 4 }, revision);
  const activityPage = useRecordsPage('activities', { sort: 'recent', limit: 4 }, revision, activeViewMode === 'activity');
  const taskPage = useRecordsPage('tasks', { owner: currentUser.id, queue: 'followups', showCompleted: 'false', limit: 4 }, revision);
  const currency = branding.currency || 'INR';
  const money = value => formatCurrency(value || 0, currency);
  const compactMoney = value => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1,
  }).format(value || 0);
  const availablePipelines = pipelines.filter(pipeline => pipeline.active !== false || stages.some(stage => stage.pipelineId === pipeline.id));
  const pipelineId = availablePipelines.some(pipeline => pipeline.id === selectedPipeline)
    ? selectedPipeline : availablePipelines[0]?.id || '';
  const stageRows = stages.filter(stage => !pipelineId || stage.pipelineId === pipelineId)
    .sort((a, b) => a.order - b.order).map(stage => ({
      stage, ...(summary.stageTotals?.find(total => total.stageId === stage.id) || { count: 0, value: 0 }),
    }));
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
    setCompletingTasks(previous => new Set(previous).add(task.id));
    try {
      await runAction('task-' + task.id, () => onUpdateTask(task.id, { status: 'completed' }),
        'Completed: ' + task.title, 'Could not complete this task.');
    } finally {
      setCompletingTasks(previous => { const next = new Set(previous); next.delete(task.id); return next; });
    }
  };
  const snoozeTask = task => runAction('task-' + task.id,
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
          <RefreshCw size={17} className={checkingRenewals ? 'animate-spin' : ''} aria-hidden="true" />
          {checkingRenewals ? 'Checking…' : 'Renewal cycle'}
        </button>
        <button type="button" className="crm-button crm-button--primary" onClick={onOpenLeadModal}><Plus size={18} aria-hidden="true" />Add lead</button>
      </div>
    </div>
    <div className="dashboard-metrics" aria-label="Sales overview">
      <MetricCard label="Pipeline value" value={compactMoney(summary.totalPipelineValue)} title={money(summary.totalPipelineValue)}
        context={(summary.activeDealCount || 0) + ' active opportunities'} icon={Wallet} />
      <MetricCard label="Revenue won" value={compactMoney(summary.wonRevenue)} title={money(summary.wonRevenue)}
        context={(summary.wonCount || 0) + ' closed-won deals'} icon={Trophy} />
      <MetricCard label="Active deals" value={(summary.activeDealCount || 0).toLocaleString()} context="Across your sales workspace" icon={Users} />
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
        {page.loading ? <div className="dashboard-loading" role="status">Loading {activeViewMode === 'queue' ? 'work items' : 'activity'}…</div>
          : page.error ? null : activeViewMode === 'queue' ? <>
            {queuePage.items.length > 0 ? <>
              <div className="dashboard-queue-labels" aria-hidden="true"><span>Item / customer</span><span>Status</span><span>Owner</span><span>Action</span></div>
              <ul className="dashboard-queue-list">
                {queuePage.items.map(item => {
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
                        <button type="button" className="dashboard-text-button" disabled={busy} onClick={() => completeTask(item)} aria-label={'Complete task: ' + item.title}>
                          {busy ? 'Saving…' : 'Done'}<CheckCircle2 size={15} aria-hidden="true" />
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
          </> : activityPage.items.length ? <ul className="dashboard-activity-list">
            {activityPage.items.map(activity => <li key={activity.id}><span className="dashboard-activity-icon"><Clock size={16} aria-hidden="true" /></span>
              <div><strong>{activity.type}</strong><p>{activity.description}</p><span>{activity.authorName}{activity.timestamp ? ' · ' + formatDate(activity.timestamp) : ''}</span></div>
            </li>)}
          </ul> : <DashboardEmptyState title="No activity recorded yet" icon={Clock}>Calls, emails and customer updates will appear here.</DashboardEmptyState>}
        <div className="dashboard-pagination"><RecordPagination page={page} label={activeViewMode === 'queue' ? 'work items' : 'activities'} /></div>
      </DashboardPanel>
      <DashboardPanel title="Pipeline overview" description="Opportunity distribution by stage" className="dashboard-pipeline" action={<Layers size={18} aria-hidden="true" />}>
        <div className="dashboard-pipeline-scope">
          {availablePipelines.length ? <select aria-label="Dashboard pipeline" value={pipelineId} onChange={event => setSelectedPipeline(event.target.value)}>
            {availablePipelines.map(pipeline => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}
          </select> : <span>All stages</span>}
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
        action={<StatusBadge>{taskPage.loading ? 'Loading…' : taskPage.total + ' pending'}</StatusBadge>}>
        {taskPage.loading ? <div className="dashboard-loading" role="status">Loading your follow-ups…</div>
          : taskPage.error ? null : taskPage.items.length ? <ul className="dashboard-task-list">
            {taskPage.items.map(task => <li key={task.id}>
              <input type="checkbox" checked={completingTasks.has(task.id)} disabled={!onUpdateTask || busyActions.has('task-' + task.id)}
                aria-label={'Mark ' + task.title + ' complete'} onChange={() => completeTask(task)} />
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
