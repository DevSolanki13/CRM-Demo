import React, { useMemo } from 'react';
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
  Sparkles
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  filterByRole,
  isDealStale,
  getStageAgingStatus,
  isCloseDateOverdue,
  getLocalDateInputValue
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
  return 'var(--primary-300)';
};

export const DashboardView = ({
  state,
  currentUser,
  onNavigateTab,
  onTriggerRenewalCheck,
  onOpenLeadModal,
  onOpenDealModal
}) => {
  const { leads = [], deals = [], tasks = [], activities = [], stages = [] } = state || {};
  const todayStr = getLocalDateInputValue();

  // --- Selective Memoization of Key Executive Metrics ---
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
    maxStageVal
  } = useMemo(() => {
    const rbacLeads = filterByRole(leads, currentUser);
    const rbacDeals = filterByRole(deals, currentUser);
    const rbacTasks = filterByRole(tasks, currentUser);

    const activeDeals = rbacDeals.filter(d => d.status === 'Active');
    const pipelineVal = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);

    const wonList = rbacDeals.filter(d => d.status === 'Won');
    const wonVal = wonList.reduce((sum, d) => sum + (d.value || 0), 0);

    const renewals = rbacDeals.filter(d => d.status === 'Renewal Due' || d.stageName?.includes('Buy Again'));
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
      maxStageVal: maxVal
    };
  }, [leads, deals, tasks, activities, stages, currentUser, todayStr]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F6F7F8] text-[#12161C]">

      {/* Signature Element: Manifest Strip */}
      <ManifestStrip
        activities={activities}
        tasks={tasks}
        deals={deals}
        currentUser={currentUser}
      />

      <div className="p-6 md:p-8 space-y-6 flex-1">

        {/* Top Banner / Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#EFF6F9] via-[#FFFFFF] to-[#EFF6F9] border border-[#D8E8EF] p-6 rounded-2xl shadow-sm">
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

          {/* Tasks Due Today */}
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-5 rounded-2xl hover:border-[#F5DDA9] transition-all shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-[#5B6472] uppercase tracking-wider">TASKS DUE TODAY</span>
              <div className="p-2 rounded-xl bg-[#FEF8EC] text-[#965700] border border-[#F5DDA9]">
                <Calendar className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>
            <div className="font-mono text-2xl lg:text-3xl font-extrabold text-[#12161C] mt-2">
              {pendingTasksToday.length}
            </div>
            <div className={`text-[11px] mt-1 font-medium font-mono ${pendingTasksToday.length > 0 ? 'text-[#965700] font-bold' : 'text-[#5B6472]'}`}>
              {pendingTasksToday.length > 0 ? 'Requires immediate rep action' : 'All scheduled tasks clear'}
            </div>
          </div>

        </div>

        {/* --- AT-RISK DEALS RADAR (EXECUTIVE ACTION CENTER) --- */}
        <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3E6EA] pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${
                staleOrAtRiskDeals.length > 0 
                  ? 'bg-[#FDF2F1] text-[#922D27] border-[#F4C4C1]' 
                  : 'bg-[#F0F7F3] text-[#255B40] border-[#BCDBC9]'
              }`}>
                {staleOrAtRiskDeals.length > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-[#922D27]" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-[#255B40]" aria-hidden="true" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-extrabold text-[#12161C]">
                    At-Risk Opportunities Radar
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                    staleOrAtRiskDeals.length > 0
                      ? 'bg-[#FEF8EC] text-[#965700] border-[#F5DDA9]'
                      : 'bg-[#F0F7F3] text-[#255B40] border-[#BCDBC9]'
                  }`}>
                    {staleOrAtRiskDeals.length} At-Risk ({formatCurrency(totalAtRiskValue)})
                  </span>
                </div>
                <p className="text-xs text-[#5B6472] mt-0.5">
                  Flags deals stagnant &gt;14 days in stage, past expected close date, or lacking customer activity.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('pipeline')}
              className="text-xs font-bold text-[#1D4E63] hover:text-[#153B4B] flex items-center gap-1.5 self-start sm:self-center transition-colors"
            >
              <span>Manage in Pipeline</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {staleOrAtRiskDeals.length === 0 ? (
            <div className="p-6 bg-[#FAFCFD] border border-[#BCDBC9] rounded-xl flex items-center gap-3 text-xs text-[#255B40]">
              <ShieldCheck className="w-5 h-5 text-[#255B40] shrink-0" aria-hidden="true" />
              <span>
                <strong>Pipeline Velocity Optimal:</strong> All active deals have recent customer activity and healthy stage progression.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
              {staleOrAtRiskDeals.map(deal => (
                <div
                  key={deal.id}
                  className="p-4 bg-[#FAFCFD] border border-[#E3E6EA] hover:border-[#F4C4C1] rounded-xl space-y-2.5 transition-all text-xs shadow-2xs group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-[#12161C] truncate max-w-[190px] group-hover:text-[#1D4E63] transition-colors">
                        {deal.title}
                      </h4>
                      <p className="text-[11px] text-[#5B6472] truncate">
                        {deal.companyName || 'B2B Account'} &bull; Rep: {deal.ownerName}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-xs text-[#255B40] shrink-0">
                      {formatCurrency(deal.value)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#E3E6EA]">
                    <span className="font-medium text-[#5B6472]">Stage: <strong className="text-[#12161C]">{deal.stageName}</strong></span>
                    <button
                      onClick={() => onNavigateTab('pipeline')}
                      className="text-[#1D4E63] hover:underline font-semibold flex items-center gap-1 text-[11px]"
                    >
                      <span>Inspect</span>
                      <ChevronRight className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {deal.reasons?.map((reason, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FDF2F1] text-[#922D27] border border-[#F4C4C1] font-bold flex items-center gap-1"
                      >
                        <Clock className="w-3 h-3 text-[#922D27]" aria-hidden="true" />
                        <span>{reason}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
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

        {/* Main Visual Section: Pipeline Stage Breakdown & Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Pipeline Stage Column Chart Cards (2 Cols) */}
          <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl space-y-4 flex flex-col justify-between shadow-sm">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
              <div>
                <h2 className="font-display text-sm font-bold text-[#12161C]">Pipeline Value by Stage</h2>
                <p className="text-xs text-[#5B6472] mt-0.5">Total deal distribution across active sales stages</p>
              </div>
              <button
                onClick={() => onNavigateTab('pipeline')}
                className="text-xs text-[#5B6472] hover:text-[#12161C] font-semibold flex items-center gap-1 transition-colors px-3 py-1.5 rounded-xl bg-[#F6F7F8] hover:bg-[#EEF0F3] border border-[#E3E6EA]"
              >
                <span>View Kanban</span>
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {/* Chart Area */}
            <div className="relative py-2 px-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 relative z-10">
                {stageBreakdown.map(({ stage, count, value }) => {
                  const isZero = value === 0;
                  const heightPct = maxStageVal > 0 ? (value / maxStageVal) * 100 : 0;

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
                        <p className="text-[10px] font-mono text-[var(--ink-muted)]">
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
                            {(() => {
                              const barColor = getStageBarColor(stage.name, stage.category);
                              return (
                                <div
                                  className="w-full rounded-lg transition-all duration-500 shadow-2xs"
                                  style={{
                                    height: `${Math.max(heightPct, 10)}%`,
                                    backgroundColor: barColor
                                  }}
                                />
                              );
                            })()}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Recent Activity Feed (1 Col) */}
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
              <h2 className="font-display text-sm font-bold text-[#12161C]">Recent Activity Log</h2>
              <span className="text-[11px] text-[#255B40] bg-[#F0F7F3] border border-[#BCDBC9] px-2 py-0.5 rounded-full font-bold">
                Live
              </span>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
              {activities?.slice(0, 7).map(act => (
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
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
