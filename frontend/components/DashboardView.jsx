import React from 'react';
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
  Send
} from 'lucide-react';
import { formatCurrency, formatDate, filterByRole } from '../utils/crmHelpers.js';
import { ManifestStrip } from './ManifestStrip.jsx';

const getStageBarColor = (stageName, category) => {
  const name = stageName || '';
  const cat = category || '';
  if (name.includes('New Lead') || cat === 'New') return '#B9D4DE';
  if (name.includes('Contacted') || cat === 'Contacted') return '#93BECC';
  if (name.includes('Sample Sent') || cat === 'Sample Sent') return '#3E7C93';
  if (name.includes('Proposal') || cat === 'Proposal') return '#2A6580';
  if (name.includes('Negotiation') || cat === 'Negotiation') return '#1D4E63';
  if (name.includes('Closed Won') || cat === 'Won') return '#3F7A5C';
  if (name.includes('Buy Again') || cat === 'Buy Again') return '#C6790A';
  if (name.includes('Closed Lost') || cat === 'Lost') return '#B5423A';
  return '#1D4E63';
};

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

  // Outbound Activity Metrics
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
    <div className="flex flex-col min-h-screen bg-[#F6F7F8]">
      
      {/* Signature Element: Manifest Strip */}
      <ManifestStrip
        activities={activities}
        tasks={tasks}
        deals={deals}
        currentUser={currentUser}
      />

      <div className="p-6 md:p-8 space-y-6 flex-1">

        {/* Top Banner / Welcome Header (Single primary-hue gradient wash as allowed) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#EFF6F9] via-[#FFFFFF] to-[#EFF6F9] border border-[#E3E6EA] p-6 rounded-2xl shadow-[0_1px_2px_rgba(18,22,28,0.06)]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold text-[#12161C] tracking-tight">
                Sales Console & Overview
              </h1>
              <span className="bg-[#FFFFFF] text-[#1D4E63] border border-[#D8E8EF] text-xs px-2.5 py-0.5 rounded-full font-mono font-bold shadow-2xs">
                {currentUser?.role}
              </span>
            </div>
            <p className="text-xs text-[#5B6472] mt-1 font-medium">
              Welcome back, <strong>{currentUser?.name}</strong>. Physical sample pipeline & recurring order metrics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('pipeline')}
              className="px-4 py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs focus-visible:outline-2 focus-visible:outline-[#1D4E63]"
            >
              <Layers className="w-4 h-4 text-white" />
              <span>Open Pipeline Board</span>
            </button>
          </div>
        </div>

        {/* Renewal Alert Banner if repeat orders due */}
        {renewalsDueDeals.length > 0 && (
          <div className="bg-[#FEF8EC] border border-[#F5DDA9] p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[#965700] shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFFFFF] border border-[#F5DDA9] flex items-center justify-center shrink-0 shadow-2xs">
                <RefreshCw className="w-5 h-5 text-[#965700] animate-spin" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-[#12161C]">
                  {renewalsDueDeals.length} Customer{renewalsDueDeals.length > 1 ? 's' : ''} Due for Repeat Orders (Renewal)
                </h3>
                <p className="text-xs text-[#5B6472]">
                  Total renewal pipeline value: <span className="font-mono font-bold text-[#12161C]">{formatCurrency(renewalsDueValue)}</span>. Auto-cycle active.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('reports')}
              className="px-4 py-2 bg-[#965700] text-white font-bold text-xs rounded-xl hover:bg-[#7D4800] transition-colors shrink-0 shadow-2xs focus-visible:outline-2 focus-visible:outline-[#965700]"
            >
              View Renewal List
            </button>
          </div>
        )}

        {/* Primary KPI Metric Cards (4 Stat Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

          {/* Total Active Pipeline Value */}
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-5 rounded-2xl hover:border-[#1D4E63] transition-all shadow-[0_1px_2px_rgba(18,22,28,0.06)]">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-[#5B6472] uppercase tracking-wider">PIPELINE VALUE</span>
              <div className="p-2 rounded-xl bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF]">
                <DollarSign className="w-4 h-4" />
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
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-5 rounded-2xl hover:border-[#1D4E63] transition-all shadow-[0_1px_2px_rgba(18,22,28,0.06)]">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-[#5B6472] uppercase tracking-wider">TOTAL LEADS</span>
              <div className="p-2 rounded-xl bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF]">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="font-mono text-2xl lg:text-3xl font-extrabold text-[#12161C] mt-2">
              {userLeads.length}
            </div>
            <div className="text-[11px] text-[#5B6472] mt-1 font-medium flex items-center gap-1.5 font-mono">
              <span className="text-[#965700] font-bold">{outboundLeadsCount} Outbound</span>
              <span>&bull;</span>
              <span className="text-[#1D4E63]">{userLeads.length - outboundLeadsCount} Inbound</span>
            </div>
          </div>

          {/* Revenue Won */}
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-5 rounded-2xl hover:border-[#255B40] transition-all shadow-[0_1px_2px_rgba(18,22,28,0.06)]">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-[#5B6472] uppercase tracking-wider">REVENUE WON</span>
              <div className="p-2 rounded-xl bg-[#F0F7F3] text-[#255B40] border border-[#BCDBC9]">
                <Trophy className="w-4 h-4" />
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
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-5 rounded-2xl hover:border-[#965700] transition-all shadow-[0_1px_2px_rgba(18,22,28,0.06)]">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-[#5B6472] uppercase tracking-wider">TASKS DUE</span>
              <div className="p-2 rounded-xl bg-[#FEF8EC] text-[#965700] border border-[#F5DDA9]">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="font-mono text-2xl lg:text-3xl font-extrabold text-[#12161C] mt-2">
              {pendingTasksToday.length}
            </div>
            <div className={`text-[11px] mt-1 font-medium ${pendingTasksToday.length > 0 ? 'text-[#965700] font-bold' : 'text-[#5B6472]'}`}>
              {pendingTasksToday.length > 0 ? 'Requires follow-up today' : 'All clear for today'}
            </div>
          </div>

        </div>

        {/* Outbound Sales Activity Metrics Highlight */}
        <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl space-y-4 shadow-[0_1px_2px_rgba(18,22,28,0.06)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-bold text-[#12161C] flex items-center gap-2">
                <Send className="w-4 h-4 text-[#1D4E63]" />
                <span>Outbound Sales Activity Metrics</span>
              </h2>
              <p className="text-xs text-[#5B6472]">Tracking proactive sales rep effort & physical sampling</p>
            </div>
            <span className="text-xs text-[#1D4E63] bg-[#EFF6F9] border border-[#D8E8EF] px-2.5 py-0.5 rounded-full font-mono font-semibold">
              Live Log
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#F6F7F8] border border-[#E3E6EA] p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFFFFF] border border-[#E3E6EA] flex items-center justify-center text-[#1D4E63] shrink-0 shadow-2xs">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-[#5B6472] font-medium">Outbound Calls Made</div>
                <div className="font-mono text-xl font-bold text-[#12161C]">{outboundCalls}</div>
              </div>
            </div>

            <div className="bg-[#F6F7F8] border border-[#E3E6EA] p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFFFFF] border border-[#E3E6EA] flex items-center justify-center text-[#1D4E63] shrink-0 shadow-2xs">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-[#5B6472] font-medium">Outbound Emails Sent</div>
                <div className="font-mono text-xl font-bold text-[#12161C]">{outboundEmails}</div>
              </div>
            </div>

            <div className="bg-[#F6F7F8] border border-[#E3E6EA] p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFFFFF] border border-[#E3E6EA] flex items-center justify-center text-[#965700] shrink-0 shadow-2xs">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-[#5B6472] font-medium">Product Samples Dispatched</div>
                <div className="font-mono text-xl font-bold text-[#12161C]">{samplesSent}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Visual Section: Pipeline Stage Breakdown & Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Pipeline Stage Column Chart Cards (2 Cols) */}
          <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl space-y-4 flex flex-col justify-between shadow-[0_1px_2px_rgba(18,22,28,0.06)]">
            
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
                <ChevronRight className="w-3.5 h-3.5" />
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
                            <span className="text-[9px] font-mono text-[#5B6472] font-bold">₹0</span>
                          </div>
                        ) : (
                          <div className="w-full flex flex-col items-center justify-end h-full">
                            <div
                              className="w-full rounded-lg transition-all duration-500 shadow-2xs"
                              style={{
                                height: `${Math.max(heightPct, 10)}%`,
                                backgroundColor: getStageBarColor(stage.name, stage.category)
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

          {/* Recent Activity Feed (1 Col) */}
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl space-y-4 shadow-[0_1px_2px_rgba(18,22,28,0.06)]">
            <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
              <h2 className="font-display text-sm font-bold text-[#12161C]">Recent Activity Log</h2>
              <span className="text-[10px] text-[#255B40] bg-[#F0F7F3] border border-[#BCDBC9] px-2 py-0.5 rounded-full font-bold">
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
                    <span className="text-[10px] text-[#5B6472] font-mono">{formatDate(act.timestamp)}</span>
                  </div>
                  <p className="text-[#12161C] line-clamp-2 font-medium">{act.description}</p>
                  <div className="text-[10px] text-[#5B6472] flex items-center justify-between pt-1 font-mono">
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
