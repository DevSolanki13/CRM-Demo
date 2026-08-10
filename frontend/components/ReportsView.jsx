import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  RefreshCw, 
  Trophy,
  ShieldAlert,
  AlertTriangle,
  FileCheck,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/crmHelpers.js';

export const ReportsView = ({
  state,
  currentUser,
  onCreateDeal
}) => {
  const { deals, users, stages, stageGateChecks = [] } = state;

  const [selectedRep, setSelectedRep] = useState('All');

  // Filter deals based on selection
  const filteredDeals = deals.filter(d => {
    const matchesRep = selectedRep === 'All' || d.ownerId === selectedRep;
    return matchesRep;
  });

  // Won & Lost
  const wonDeals = filteredDeals.filter(d => d.status === 'Won');
  const lostDeals = filteredDeals.filter(d => d.status === 'Lost');
  const totalRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);

  const totalClosed = wonDeals.length + lostDeals.length;
  const winRate = totalClosed > 0 ? Math.round((wonDeals.length / totalClosed) * 100) : 0;
  const avgDealSize = wonDeals.length > 0 ? Math.round(totalRevenue / wonDeals.length) : 0;

  // Recurring Order / Renewal Due Deals List
  const renewalDueDeals = deals.filter(d => d.status === 'Renewal Due' || d.stageName?.includes('Buy Again'));

  // Lost Deals by Reason Breakdown
  const lostReasonOptions = [
    'Budget mismatch',
    'No decision-maker access',
    'Losing to competitor',
    'Slow internal process',
    'Technical fit issue',
    'Went silent'
  ];

  const lostByReason = lostReasonOptions.map(reason => {
    const matching = lostDeals.filter(d => d.lostReason === reason);
    const value = matching.reduce((sum, d) => sum + d.value, 0);
    return {
      reason,
      count: matching.length,
      value
    };
  });

  // Lost Deals by Stage Breakdown
  const lostByStage = stages.map(stg => {
    const matching = lostDeals.filter(d => d.stageId === stg.id || d.stageName === stg.name);
    const value = matching.reduce((sum, d) => sum + d.value, 0);
    return {
      stage: stg,
      count: matching.length,
      value
    };
  });

  const maxLostStageVal = Math.max(...lostByStage.map(s => s.value), 1);

  // Quick Action to create new repeat deal
  const handleCreateRenewalDeal = async (oldDeal) => {
    await onCreateDeal({
      title: `${oldDeal.companyName || 'Repeat'} Renewal Order`,
      value: oldDeal.value,
      stageId: stages[0]?.id || '',
      contactId: oldDeal.contactId,
      companyId: oldDeal.companyId,
      ownerId: oldDeal.ownerId,
      isRecurring: true,
      recurrenceDays: oldDeal.recurrenceDays || 60
    });
  };

  return (
    <div className="p-8 space-y-6 bg-[#131316] text-white min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1c1c21] border border-[#2c2c34] p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-zinc-400" />
            <span>Reports & Stage Qualification Analytics</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Analyze win rates, stage-gate qualification failures, lost deal reasons & renewal automation
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-medium">Sales Rep:</span>
          <select
            value={selectedRep}
            onChange={(e) => setSelectedRep(e.target.value)}
            className="bg-[#18181c] border border-[#2e2e38] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-400 cursor-pointer"
          >
            <option value="All" className="bg-[#1c1c21]">All Team Members</option>
            {users.map(u => (
              <option key={u.id} value={u.id} className="bg-[#1c1c21]">{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-[#1c1c21] border border-[#2c2c34] p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Total Won Revenue</span>
            <Trophy className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-2">{formatCurrency(totalRevenue)}</div>
          <div className="text-[11px] text-zinc-400 mt-1 font-medium">{wonDeals.length} closed won deals</div>
        </div>

        <div className="bg-[#1c1c21] border border-[#2c2c34] p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Win Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">{winRate}%</div>
          <div className="text-[11px] text-zinc-400 mt-1 font-medium">{wonDeals.length} won vs {lostDeals.length} lost</div>
        </div>

        <div className="bg-[#1c1c21] border border-[#2c2c34] p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Average Deal Size</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">{formatCurrency(avgDealSize)}</div>
          <div className="text-[11px] text-zinc-400 mt-1 font-medium">Per closed won deal</div>
        </div>

        <div className="bg-[#1c1c21] border border-[#2c2c34] p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Renewals Due</span>
            <RefreshCw className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 mt-2">{renewalDueDeals.length}</div>
          <div className="text-[11px] text-zinc-400 mt-1 font-medium">Repeat order cycle reached</div>
        </div>

      </div>

      {/* STAGE GATE QUALIFICATION REPORTING CHARTS (2 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Lost Deals by Stage Chart */}
        <div className="bg-[#1c1c21] border border-[#2c2c34] p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#2c2c34] pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Lost Deals by Pipeline Stage</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5 font-medium">Identifies where deals drop out during qualification check</p>
            </div>
            <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2.5 py-0.5 rounded-full">
              {lostDeals.length} Lost Total
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {lostByStage.map(({ stage, count, value }) => {
              const pct = maxLostStageVal > 0 ? (value / maxLostStageVal) * 100 : 0;
              return (
                <div key={stage.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="font-bold">{stage.name}</span>
                      <span className="text-zinc-500">({count} deals)</span>
                    </span>
                    <span className="font-bold text-rose-400 font-mono">{formatCurrency(value)}</span>
                  </div>
                  <div className="h-2.5 w-full bg-[#18181c] rounded-full overflow-hidden border border-[#2e2e38]">
                    <div
                      className="h-full bg-rose-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lost Deals by Reason Breakdown */}
        <div className="bg-[#1c1c21] border border-[#2c2c34] p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#2c2c34] pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Lost Deals by Reason Category</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5 font-medium">Distribution of mandatory reasons logged on qualification failure</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {lostByReason.map(({ reason, count, value }) => (
              <div key={reason} className="p-3.5 bg-[#24242b] border border-[#2f2f3a] rounded-xl space-y-1">
                <div className="text-[11px] font-bold text-zinc-300 truncate">{reason}</div>
                <div className="text-lg font-black text-white">{count} <span className="text-xs text-zinc-500 font-normal">deals</span></div>
                <div className="text-[11px] font-mono text-rose-400 font-semibold">{formatCurrency(value)}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* STAGE GATE QUALIFICATION AUDIT HISTORY LOG TABLE */}
      <div className="bg-[#1c1c21] border border-[#2c2c34] p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#2c2c34] pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>Stage Gate Governance Audit Log</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1 font-medium">
              Permanent record of rep qualification check submissions and manager/admin approvals
            </p>
          </div>
          <span className="text-xs text-zinc-300 bg-[#18181c] border border-[#2e2e38] px-3 py-1 rounded-full font-mono font-bold">
            {stageGateChecks.length} Records Logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-[#24242b] text-zinc-400 uppercase font-bold text-[10px] tracking-wider border-b border-[#2c2c34]">
              <tr>
                <th className="px-4 py-3.5">Deal Opportunity</th>
                <th className="px-4 py-3.5">Stage Transition</th>
                <th className="px-4 py-3.5">Rep Submitter</th>
                <th className="px-4 py-3.5">Reviewer Status</th>
                <th className="px-4 py-3.5">Outcome</th>
                <th className="px-4 py-3.5">Lost Reason / Note</th>
                <th className="px-4 py-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2c2c34]">
              {stageGateChecks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-zinc-500 italic">
                    No Stage Gate Checks recorded yet.
                  </td>
                </tr>
              ) : (
                stageGateChecks.map(check => (
                  <tr key={check.id} className="hover:bg-[#24242b]/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white">{check.dealTitle || 'Deal Record'}</div>
                    </td>

                    <td className="px-4 py-3.5 font-semibold text-zinc-300">
                      <span>{check.fromStageName}</span> &rarr; <strong className="text-white">{check.targetStageName}</strong>
                    </td>

                    <td className="px-4 py-3.5 font-medium text-zinc-300">
                      {check.submittedByName || 'Sales Rep'}
                    </td>

                    <td className="px-4 py-3.5">
                      {check.status === 'approved_and_executed' ? (
                        <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Executed ({check.reviewedByName || 'Admin'})</span>
                        </span>
                      ) : check.status === 'pending_review' ? (
                        <span className="bg-amber-950/80 text-amber-300 border border-amber-800/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-max">
                          <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                          <span>Pending Review</span>
                        </span>
                      ) : (
                        <span className="bg-rose-950/80 text-rose-300 border border-rose-800/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-max">
                          <XCircle className="w-3 h-3 text-rose-400" />
                          <span>Rejected</span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 font-bold">
                      {check.outcome === 'advanced' ? (
                        <span className="text-emerald-400">Advanced</span>
                      ) : (
                        <span className="text-rose-400">Closed Lost</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-zinc-400 max-w-xs">
                      {check.lostReason && (
                        <div className="font-bold text-rose-400 text-[11px] mb-0.5">Reason: {check.lostReason}</div>
                      )}
                      <div className="truncate text-[11px]">{check.note || 'No notes added'}</div>
                    </td>

                    <td className="px-4 py-3.5 text-right text-zinc-500 font-mono">
                      {formatDate(check.timestamp)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECURRING CUSTOMER & RENEWAL TRACKER SECTION */}
      <div className="bg-[#1c1c21] border border-[#2c2c34] p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#2c2c34] pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-400" />
              <span>Recurring Customer Renewal Tracking</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1 font-medium">
              Customers whose repeat order cycle has elapsed. Automatically flipped to "Buy Again"
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-[#24242b] text-zinc-400 uppercase font-bold text-[10px] tracking-wider border-b border-[#2c2c34]">
              <tr>
                <th className="px-4 py-3.5">Customer / Deal Title</th>
                <th className="px-4 py-3.5">Last Purchase Date</th>
                <th className="px-4 py-3.5">Cycle Days</th>
                <th className="px-4 py-3.5">Renewal Status</th>
                <th className="px-4 py-3.5">Assigned Rep</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2c2c34]">
              {renewalDueDeals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-zinc-500 italic">
                    No customers currently due for renewal.
                  </td>
                </tr>
              ) : (
                renewalDueDeals.map(deal => (
                  <tr key={deal.id} className="hover:bg-[#24242b]/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white">{deal.title}</div>
                      <div className="text-[11px] text-zinc-400 font-medium">{deal.companyName || deal.contactName}</div>
                    </td>

                    <td className="px-4 py-3.5 text-white font-mono">
                      {formatDate(deal.actualCloseDate || deal.createdAt)}
                    </td>

                    <td className="px-4 py-3.5 text-zinc-400 font-mono">
                      {deal.recurrenceDays || 60} days
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="bg-amber-950/80 text-amber-300 border border-amber-800/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                        Buy Again Due
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-zinc-300 font-medium">
                      {deal.ownerName || 'Unassigned'}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleCreateRenewalDeal(deal)}
                        className="px-4 py-1.5 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded-full shadow-xs transition-colors"
                      >
                        Re-order Deal
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
