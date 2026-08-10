import React from 'react';
import {
  Users,
  Trophy,
  DollarSign,
  Calendar,
  PhoneCall,
  Mail,
  Send,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  Layers,
  Sparkles
} from 'lucide-react';
import { formatCurrency, formatDate, filterByRole } from '../utils/crmHelpers.js';

export const DashboardView = ({
  state,
  currentUser,
  onNavigateTab,
  onTriggerRenewalCheck,
  onOpenLeadModal,
  onOpenDealModal
}) => {
  const { leads, deals, tasks, activities, stages } = state;

  // Filter items based on current RBAC
  const userLeads = filterByRole(leads, currentUser);
  const userDeals = filterByRole(deals, currentUser);
  const userTasks = filterByRole(tasks, currentUser);

  // Metrics Calculations
  const totalLeads = userLeads.length;
  const outboundLeadsCount = userLeads.filter(l => l.isOutbound).length;
  const activeDeals = userDeals.filter(d => d.status === 'Active');
  const totalPipelineValue = activeDeals.reduce((sum, d) => sum + d.value, 0);

  const wonDeals = userDeals.filter(d => d.status === 'Won');
  const wonRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);

  const renewalsDueDeals = userDeals.filter(d => d.status === 'Renewal Due' || d.stageName?.includes('Buy Again'));
  const renewalsDueValue = renewalsDueDeals.reduce((sum, d) => sum + d.value, 0);

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingTasksToday = userTasks.filter(t => t.status === 'pending' && t.dueDate <= todayStr);

  // Outbound Activity Metrics (This week / total)
  const outboundCalls = activities.filter(a => a.isOutbound && a.type === 'Outbound Call').length;
  const outboundEmails = activities.filter(a => a.isOutbound && a.type === 'Outbound Email').length;
  const samplesSent = activities.filter(a => a.type === 'Sample Sent').length;

  // Pipeline stage breakdown for chart
  const stageBreakdown = stages.map(stg => {
    const stageDeals = userDeals.filter(d => d.stageId === stg.id);
    const value = stageDeals.reduce((sum, d) => sum + d.value, 0);
    return {
      stage: stg,
      count: stageDeals.length,
      value
    };
  });

  const maxStageVal = Math.max(...stageBreakdown.map(s => s.value), 1);

  return (
    <div className="p-8 space-y-6 bg-[#131316] text-white min-h-screen">

      {/* Top Banner / Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#1c1c22] via-[#24242c] to-[#1c1c22] border border-[#2e2e38] p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Welcome back, {currentUser.name}</h1>
            <span className="bg-[#2a2a34] text-zinc-300 border border-[#383845] text-xs px-2.5 py-0.5 rounded-full font-bold">
              {currentUser.role}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Here is your customizable CRM overview and active sales pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('pipeline')}
            className="px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Layers className="w-4 h-4 text-black" />
            <span>Open Pipeline Board</span>
          </button>
        </div>
      </div>

      {/* Renewal Alert Banner if repeat orders due */}
      {renewalsDueDeals.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-800/80 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-700 flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-200">
                {renewalsDueDeals.length} Customer{renewalsDueDeals.length > 1 ? 's' : ''} Due for Repeat Orders (Renewal)
              </h3>
              <p className="text-xs text-amber-300/80">
                Total renewal pipeline value: <span className="font-bold text-white">{formatCurrency(renewalsDueValue)}</span>. Auto-cycle active.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('reports')}
            className="px-4 py-2 bg-amber-600 text-white font-bold text-xs rounded-xl hover:bg-amber-500 transition-colors shrink-0 shadow-xs"
          >
            View Renewal List
          </button>
        </div>
      )}

      {/* Primary KPI Metric Cards (4 Stat Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Total Active Pipeline Value */}
        <div className="bg-[#1c1c21] border border-[#2c2c34] p-5 rounded-2xl hover:border-zinc-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">PIPELINE VALUE</span>
            <div className="p-2 rounded-xl bg-blue-950/80 text-blue-400 border border-blue-800/60">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2">{formatCurrency(totalPipelineValue)}</div>
          <div className="text-[11px] text-zinc-400 mt-1 font-medium">{userDeals.length} active opportunities</div>
        </div>

        {/* Active Inbound & Outbound Leads */}
        <div className="bg-[#1c1c21] border border-[#2c2c34] p-5 rounded-2xl hover:border-zinc-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">TOTAL LEADS</span>
            <div className="p-2 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/60">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2">{userLeads.length}</div>
          <div className="text-[11px] text-zinc-400 mt-1 font-medium flex items-center gap-1.5">
            <span className="text-amber-400 font-bold">{outboundLeadsCount} Outbound</span>
            <span>&bull;</span>
            <span className="text-purple-300">{userLeads.length - outboundLeadsCount} Inbound</span>
          </div>
        </div>

        {/* Revenue Won */}
        <div className="bg-[#1c1c21] border border-[#2c2c34] p-5 rounded-2xl hover:border-zinc-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">REVENUE WON</span>
            <div className="p-2 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2">{formatCurrency(wonRevenue)}</div>
          <div className="text-[11px] text-zinc-400 mt-1 font-medium">{wonDeals.length} deals closed won</div>
        </div>

        {/* Tasks Due Today */}
        <div className="bg-[#1c1c21] border border-[#2c2c34] p-5 rounded-2xl hover:border-zinc-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">TASKS DUE</span>
            <div className="p-2 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/60">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2">{pendingTasksToday.length}</div>
          <div className="text-[11px] text-amber-400 mt-1 font-medium">
            {pendingTasksToday.length > 0 ? 'Requires follow-up today' : 'All clear for today'}
          </div>
        </div>

      </div>

      {/* Renewal Alert Banner if repeat orders due */}
      {renewalsDueDeals.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-800/80 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-700 flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-200">
                {renewalsDueDeals.length} Customer{renewalsDueDeals.length > 1 ? 's' : ''} Due for Repeat Orders (Renewal)
              </h3>
              <p className="text-xs text-amber-300/80">
                Total renewal pipeline value: <span className="font-bold text-white">{formatCurrency(renewalsDueValue)}</span>. Auto-cycle active.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('reports')}
            className="px-4 py-2 bg-amber-600 text-white font-bold text-xs rounded-xl hover:bg-amber-500 transition-colors shrink-0 shadow-xs"
          >
            View Renewal List
          </button>
        </div>
      )}

      {/* Outbound Sales Activity Metrics Highlight */}
      <div className="bg-[#1c1c21] border border-[#2c2c34] p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <span>Outbound Sales Activity Metrics</span>
            </h2>
            <p className="text-xs text-zinc-400">Tracking proactive sales rep effort & physical sampling</p>
          </div>
          <span className="text-xs text-zinc-300 bg-[#18181c] border border-[#2e2e38] px-2.5 py-0.5 rounded-full font-mono font-medium">Real-time log</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#24242b] border border-[#2f2f3a] p-4 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-800/50 flex items-center justify-center text-blue-400 shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-zinc-400 font-medium">Outbound Calls Made</div>
              <div className="text-xl font-bold text-white">{outboundCalls}</div>
            </div>
          </div>

          <div className="bg-[#24242b] border border-[#2f2f3a] p-4 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-zinc-400 font-medium">Outbound Emails Sent</div>
              <div className="text-xl font-bold text-white">{outboundEmails}</div>
            </div>
          </div>

          <div className="bg-[#24242b] border border-[#2f2f3a] p-4 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/50 flex items-center justify-center text-purple-400 shrink-0">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-xs text-zinc-400 font-medium">Product Samples Dispatched</div>
              <div className="text-xl font-bold text-white">{samplesSent}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Visual Section: Pipeline Stage Breakdown Vertical Bar Chart & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Pipeline Stage Column Chart Cards (2 Cols) */}
        <div className="lg:col-span-2 bg-[#1c1c21] border border-[#2c2c34] p-6 rounded-2xl space-y-4 flex flex-col justify-between">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#2c2c34] pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Pipeline Value by Stage</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Total deal distribution across active sales stages</p>
            </div>
            <button
              onClick={() => onNavigateTab('pipeline')}
              className="text-xs text-zinc-400 hover:text-white font-semibold flex items-center gap-1 transition-colors px-3 py-1.5 rounded-xl bg-[#18181c] hover:bg-[#24242b] border border-[#2e2e38]"
            >
              <span>View Kanban</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Chart Cards Area with Horizontal Dashed Guide Line */}
          <div className="relative py-2 px-1">
            
            {/* Horizontal Dashed Process Guide Line running across the middle */}
            <div className="absolute top-[60%] left-0 w-full border-t border-dashed border-zinc-600/40 pointer-events-none z-0" />

            {/* Stage Cards Grid */}
            <div className="grid grid-cols-8 gap-2.5 relative z-10">
              {stageBreakdown.map(({ stage, count, value }) => {
                const isZero = value === 0;
                // Compute bar height percentage relative to container height
                const heightPct = maxStageVal > 0 ? (value / maxStageVal) * 100 : 0;
                
                return (
                  <div
                    key={stage.id}
                    className={`rounded-2xl p-3 flex flex-col justify-between items-center text-center h-[340px] transition-all relative ${
                      isZero
                        ? 'bg-[#141417]/60 border border-[#27272a]/40 opacity-40'
                        : 'bg-[#18181c] border border-[#2c2c34] hover:border-zinc-500 hover:shadow-xl shadow-black/40 group'
                    }`}
                  >
                    {/* Top Stage Info Header */}
                    <div className="space-y-1 w-full pt-1">
                      <h4 className={`text-xs font-bold truncate leading-tight ${isZero ? 'text-zinc-500' : 'text-white'}`} title={stage.name}>
                        {stage.name}
                      </h4>
                      <p className={`text-[10px] font-medium font-mono ${isZero ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        ({count} deals)
                      </p>
                      
                      {/* Big Currency Value */}
                      <div className={`text-sm font-black font-mono pt-1 ${isZero ? 'text-zinc-600' : 'text-white'}`}>
                        {formatCurrency(value)}
                      </div>
                    </div>

                    {/* Bottom Bar Area */}
                    <div className="w-full flex-1 flex flex-col justify-end items-center pb-1">
                      {isZero ? (
                        <div className="w-full space-y-2 flex flex-col items-center">
                          <div className="w-12 h-1 bg-zinc-700/40 rounded-full" />
                          <span className="text-[10px] font-mono text-zinc-600 font-bold">$0</span>
                        </div>
                      ) : (
                        <div className="w-full flex flex-col items-center justify-end h-full">
                          
                          {/* Value above shorter/medium bars (if bar height < 85%) */}
                          {heightPct < 85 && (
                            <span className="text-[10px] font-extrabold font-mono text-white mb-1.5 bg-[#24242b] border border-[#2f2f3a] px-1.5 py-0.5 rounded-md shadow-xs">
                              {formatCurrency(value)}
                            </span>
                          )}

                          {/* Solid Rounded Vertical Column Bar */}
                          <div
                            className="w-full rounded-2xl transition-all duration-500 shadow-md"
                            style={{
                              height: `${Math.max(heightPct, 12)}%`,
                              backgroundColor: stage.color
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

        {/* Recent Activity Timeline Feed (1 Col) */}
        <div className="bg-[#1c1c21] border border-[#2c2c34] p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#2c2c34] pb-3">
            <h2 className="text-sm font-bold text-white">Recent Activity Log</h2>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">Live</span>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {activities.slice(0, 7).map(act => (
              <div key={act.id} className="p-3 bg-[#24242b] border border-[#2f2f3a] rounded-xl space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${act.isOutbound ? 'bg-purple-950 text-purple-300 border-purple-800' : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    }`}>
                    {act.type}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">{formatDate(act.timestamp)}</span>
                </div>
                <p className="text-zinc-200 line-clamp-2 font-medium">{act.description}</p>
                <div className="text-[10px] text-zinc-400 flex items-center justify-between pt-1">
                  <span>Logged by: {act.authorName}</span>
                  {act.linkedTitle && <span className="text-emerald-400 truncate max-w-[120px] font-medium">{act.linkedTitle}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};


