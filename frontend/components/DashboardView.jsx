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
    <div className="p-6 space-y-6 bg-[#f5f5f0] text-[#2d2d2a] min-h-full">
      
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#e0e0d5] p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#2d2d2a] tracking-tight">Welcome back, {currentUser.name}</h1>
            <span className="bg-[#5A5A40]/10 text-[#5A5A40] border border-[#5A5A40]/20 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              {currentUser.role}
            </span>
          </div>
          <p className="text-xs text-[#6b6b60] mt-1 font-medium">
            Here is your customizable CRM overview and active sales pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('pipeline')}
            className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Layers className="w-4 h-4" />
            <span>Open Pipeline Board</span>
          </button>
        </div>
      </div>

      {/* Renewal Alert Banner if repeat orders due */}
      {renewalsDueDeals.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5 text-amber-700 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                {renewalsDueDeals.length} Customer{renewalsDueDeals.length > 1 ? 's' : ''} Due for Repeat Orders (Renewal)
              </h3>
              <p className="text-xs text-amber-800">
                Total renewal pipeline value: <span className="font-bold text-[#2d2d2a]">{formatCurrency(renewalsDueValue)}</span>. Auto-cycle active.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('reports')}
            className="px-4 py-2 bg-amber-700 text-white font-semibold text-xs rounded-full hover:bg-amber-800 transition-colors shrink-0 shadow-xs"
          >
            View Renewal List
          </button>
        </div>
      )}

      {/* Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Leads */}
        <div className="bg-white border border-[#e0e0d5] p-5 rounded-2xl shadow-xs hover:border-[#5A5A40]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6b6b60] uppercase tracking-wider">Total Leads</span>
            <div className="p-2 rounded-xl bg-[#5A5A40]/10 text-[#5A5A40] border border-[#5A5A40]/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#2d2d2a] mt-2">{totalLeads}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 mt-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Active lead pipeline</span>
          </div>
        </div>

        {/* Active Pipeline Value */}
        <div className="bg-white border border-[#e0e0d5] p-5 rounded-2xl shadow-xs hover:border-[#5A5A40]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6b6b60] uppercase tracking-wider">Pipeline Value</span>
            <div className="p-2 rounded-xl bg-purple-100 text-purple-800 border border-purple-200">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#2d2d2a] mt-2">{formatCurrency(totalPipelineValue)}</div>
          <div className="text-[11px] text-[#6b6b60] mt-1 font-medium">{activeDeals.length} active opportunities</div>
        </div>

        {/* Closed Won Revenue */}
        <div className="bg-white border border-[#e0e0d5] p-5 rounded-2xl shadow-xs hover:border-[#5A5A40]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6b6b60] uppercase tracking-wider">Revenue Won</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-800 mt-2">{formatCurrency(wonRevenue)}</div>
          <div className="text-[11px] text-[#6b6b60] mt-1 font-medium">{wonDeals.length} deals closed won</div>
        </div>

        {/* Tasks Due Today */}
        <div className="bg-white border border-[#e0e0d5] p-5 rounded-2xl shadow-xs hover:border-[#5A5A40]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6b6b60] uppercase tracking-wider">Tasks Due</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#2d2d2a] mt-2">{pendingTasksToday.length}</div>
          <div className="text-[11px] text-amber-800 mt-1 font-medium">
            {pendingTasksToday.length > 0 ? 'Requires follow-up today' : 'All clear for today'}
          </div>
        </div>

      </div>

      {/* Outbound Sales Activity Metrics Highlight */}
      <div className="bg-white border border-[#e0e0d5] p-6 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-[#2d2d2a] flex items-center gap-2">
              <Send className="w-4 h-4 text-[#5A5A40]" />
              <span>Outbound Sales Activity Metrics</span>
            </h2>
            <p className="text-xs text-[#6b6b60]">Tracking proactive sales rep effort & physical sampling</p>
          </div>
          <span className="text-xs text-[#5A5A40] bg-[#f5f5f0] border border-[#e0e0d5] px-2.5 py-0.5 rounded-full font-mono font-medium">Real-time log</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#fcfcf9] border border-[#e0e0d5] p-4 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5A5A40]/10 border border-[#5A5A40]/20 flex items-center justify-center text-[#5A5A40] shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#6b6b60]">Outbound Calls Made</div>
              <div className="text-xl font-bold text-[#2d2d2a]">{outboundCalls}</div>
            </div>
          </div>

          <div className="bg-[#fcfcf9] border border-[#e0e0d5] p-4 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#6b6b60]">Outbound Emails Sent</div>
              <div className="text-xl font-bold text-[#2d2d2a]">{outboundEmails}</div>
            </div>
          </div>

          <div className="bg-[#fcfcf9] border border-[#e0e0d5] p-4 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-800 shrink-0">
              <Sparkles className="w-5 h-5 text-purple-800" />
            </div>
            <div>
              <div className="text-xs text-[#6b6b60]">Product Samples Dispatched</div>
              <div className="text-xl font-bold text-purple-900">{samplesSent}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Visual Section: Pipeline Stage Breakdown Chart & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pipeline Stage Bar Breakdown */}
        <div className="lg:col-span-2 bg-white border border-[#e0e0d5] p-6 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#e0e0d5] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#2d2d2a]">Pipeline Value by Stage</h2>
              <p className="text-xs text-[#6b6b60]">Total deal distribution across active sales stages</p>
            </div>
            <button
              onClick={() => onNavigateTab('pipeline')}
              className="text-xs text-[#5A5A40] hover:underline font-semibold flex items-center gap-1"
            >
              <span>View Kanban</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5">
            {stageBreakdown.map(({ stage, count, value }) => {
              const pct = maxStageVal > 0 ? (value / maxStageVal) * 100 : 0;
              return (
                <div key={stage.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#2d2d2a] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }}></span>
                      <span className="font-semibold">{stage.name}</span>
                      <span className="text-[#6b6b60] text-[11px]">({count} deals)</span>
                    </span>
                    <span className="font-bold text-[#2d2d2a]">{formatCurrency(value)}</span>
                  </div>
                  <div className="h-3 w-full bg-[#f5f5f0] rounded-full overflow-hidden border border-[#e0e0d5]">
                    <div 
                      className="h-full transition-all duration-500 rounded-full"
                      style={{ 
                        width: `${Math.max(pct, 3)}%`,
                        backgroundColor: stage.color 
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Timeline Feed */}
        <div className="bg-white border border-[#e0e0d5] p-6 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#e0e0d5] pb-3">
            <h2 className="text-sm font-bold text-[#2d2d2a]">Recent Activity Log</h2>
            <span className="text-[10px] text-[#5A5A40] bg-[#f5f5f0] border border-[#e0e0d5] px-2 py-0.5 rounded-full font-semibold">Live</span>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {activities.slice(0, 7).map(act => (
              <div key={act.id} className="p-3 bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    act.isOutbound ? 'bg-[#5A5A40]/10 text-[#5A5A40] border-[#5A5A40]/20' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {act.type}
                  </span>
                  <span className="text-[10px] text-[#6b6b60]">{formatDate(act.timestamp)}</span>
                </div>
                <p className="text-[#2d2d2a] line-clamp-2 font-medium">{act.description}</p>
                <div className="text-[10px] text-[#6b6b60] flex items-center justify-between pt-1">
                  <span>Logged by: {act.authorName}</span>
                  {act.linkedTitle && <span className="text-[#5A5A40] truncate max-w-[120px] font-medium">{act.linkedTitle}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
