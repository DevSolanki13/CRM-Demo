import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Trophy,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/crmHelpers.js';

export const ReportsView = ({
  state,
  currentUser,
  onCreateDeal
}) => {
  const { deals = [], users = [], stages = [], stageGateChecks = [], auditLogs = [] } = state;

  const [selectedRep, setSelectedRep] = useState('All');
  const [auditFilterAction, setAuditFilterAction] = useState('All');

  // Filter deals based on selection
  const filteredDeals = deals.filter(d => {
    const matchesRep = selectedRep === 'All' || d.ownerId === selectedRep;
    return matchesRep;
  });

  // Won & Lost
  const wonDeals = filteredDeals.filter(d => d.status === 'Won');
  const lostDeals = filteredDeals.filter(d => d.status === 'Lost');
  const totalRevenue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);

  const totalClosed = wonDeals.length + lostDeals.length;
  const winRate = totalClosed > 0 ? Math.round((wonDeals.length / totalClosed) * 100) : 0;
  const avgDealSize = wonDeals.length > 0 ? Math.round(totalRevenue / wonDeals.length) : 0;

  // Recurring Order / Renewal Due Deals List
  const renewalDueDeals = deals.filter(d => d.status === 'Renewal Due' || d.stageName?.includes('Buy Again'));

  // Rebuy deals stats
  const rebuyDeals = deals.filter(d => Boolean(d.parentDealId));
  const rebuyRevenue = rebuyDeals.filter(d => d.status === 'Won').reduce((sum, d) => sum + (d.value || 0), 0);

  // Lost Deals by Reason Breakdown
  const lostReasonOptions = [
    'Price / Budget mismatch',
    'Competitor won',
    'Timeline / Project postponed',
    'Product fit / Specifications mismatch',
    'No decision / Lead went silent',
    'Internal reorganization / Decision-maker left',
    'Other (see note)'
  ];

  const lostByReason = lostReasonOptions.map(reason => {
    const matching = lostDeals.filter(d => d.lostReason?.includes(reason.split(' ')[0]) || d.lostReason === reason);
    const value = matching.reduce((sum, d) => sum + (d.value || 0), 0);
    return {
      reason,
      count: matching.length,
      value
    };
  });

  // Lost Deals by Stage Breakdown
  const lostByStage = stages.map(stg => {
    const matching = lostDeals.filter(d => d.stageId === stg.id || d.stageName === stg.name);
    const value = matching.reduce((sum, d) => sum + (d.value || 0), 0);
    return {
      stage: stg,
      count: matching.length,
      value
    };
  });

  const maxLostStageVal = Math.max(...lostByStage.map(s => s.value), 1);

  // Account LTV calculation
  const accountLTV = useMemo(() => {
    const map = {};
    deals.forEach(d => {
      const key = d.companyName || 'Unassigned Account';
      if (!map[key]) {
        map[key] = {
          name: key,
          wonTotal: 0,
          wonCount: 0,
          rebuyCount: 0,
          activeCount: 0,
          totalValue: 0
        };
      }
      map[key].totalValue += d.value || 0;
      if (d.status === 'Won') {
        map[key].wonTotal += d.value || 0;
        map[key].wonCount += 1;
      }
      if (d.parentDealId) {
        map[key].rebuyCount += 1;
      }
      if (d.status === 'Active') {
        map[key].activeCount += 1;
      }
    });
    return Object.values(map).sort((a, b) => b.wonTotal - a.wonTotal);
  }, [deals]);

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter(log => {
    if (auditFilterAction === 'All') return true;
    return log.action === auditFilterAction;
  });

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
    <div className="p-6 md:p-8 space-y-6 bg-[#F6F7F8] min-h-screen text-[#12161C]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl shadow-2xs">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#12161C] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#1D4E63]" />
            <span>Reports, Rebuy LTV &amp; Governance Ledger</span>
          </h1>
          <p className="text-xs text-[#5B6472] mt-1 font-medium">
            Analyze win rates, physical sample dropouts, account lifetime value &amp; audited pipeline compliance
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#5B6472] font-semibold">Sales Rep:</span>
          <select
            value={selectedRep}
            onChange={(e) => setSelectedRep(e.target.value)}
            className="bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl px-3 py-1.5 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
          >
            <option value="All">All Team Members</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Metrics Row (5 Stat Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

        <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-5 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs text-[#5B6472] font-semibold uppercase tracking-wider">Total Won Revenue</span>
            <Trophy className="w-4 h-4 text-[#255B40]" />
          </div>
          <div className="font-mono text-2xl font-extrabold text-[#255B40] mt-2">{formatCurrency(totalRevenue)}</div>
          <div className="text-[11px] text-[#5B6472] mt-1 font-mono">{wonDeals.length} closed won contracts</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-5 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs text-[#5B6472] font-semibold uppercase tracking-wider">Win Rate</span>
            <TrendingUp className="w-4 h-4 text-[#1D4E63]" />
          </div>
          <div className="font-mono text-2xl font-extrabold text-[#12161C] mt-2">{winRate}%</div>
          <div className="text-[11px] text-[#5B6472] mt-1 font-mono">{wonDeals.length} won vs {lostDeals.length} lost</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-5 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs text-[#5B6472] font-semibold uppercase tracking-wider">Avg Deal Size</span>
            <DollarSign className="w-4 h-4 text-[#1D4E63]" />
          </div>
          <div className="font-mono text-2xl font-extrabold text-[#12161C] mt-2">{formatCurrency(avgDealSize)}</div>
          <div className="text-[11px] text-[#5B6472] mt-1 font-medium">Per closed contract</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-5 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs text-[#5B6472] font-semibold uppercase tracking-wider">Rebuy Deals Active</span>
            <RefreshCw className="w-4 h-4 text-[#1D4E63]" />
          </div>
          <div className="font-mono text-2xl font-extrabold text-[#1D4E63] mt-2">{rebuyDeals.length}</div>
          <div className="text-[11px] text-[#5B6472] mt-1 font-medium">{formatCurrency(rebuyRevenue)} rebuy revenue</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-5 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs text-[#5B6472] font-semibold uppercase tracking-wider">Renewals Due</span>
            <RefreshCw className="w-4 h-4 text-[#965700]" />
          </div>
          <div className="font-mono text-2xl font-extrabold text-[#965700] mt-2">{renewalDueDeals.length}</div>
          <div className="text-[11px] text-[#5B6472] mt-1 font-medium">Repeat order cycle reached</div>
        </div>

      </div>

      {/* ACCOUNT LIFETIME VALUE (LTV) LEADERBOARD */}
      <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl space-y-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
          <div>
            <h2 className="font-display text-sm font-bold text-[#12161C] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#1D4E63]" />
              <span>Account Lifetime Value (LTV) &amp; Rebuy Performance</span>
            </h2>
            <p className="text-xs text-[#5B6472] mt-0.5">
              Cumulative won value across parent contracts and child rebuy orders per account
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[#1D4E63] bg-[#EFF6F9] border border-[#D8E8EF] px-2.5 py-1 rounded-full">
            {accountLTV.length} Accounts Tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#12161C]">
            <thead className="bg-[#F6F7F8] text-[#5B6472] uppercase font-mono font-bold text-[10px] tracking-wider border-b border-[#E3E6EA]">
              <tr>
                <th className="px-4 py-3.5">Company / Account</th>
                <th className="px-4 py-3.5">Cumulative Won LTV</th>
                <th className="px-4 py-3.5">Won Contracts</th>
                <th className="px-4 py-3.5">Rebuy Orders</th>
                <th className="px-4 py-3.5">Active Opportunities</th>
                <th className="px-4 py-3.5 text-right">Account Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E6EA]">
              {accountLTV.slice(0, 6).map((acc, idx) => {
                const tier = acc.wonTotal >= 80000
                  ? { label: 'Key Enterprise', bg: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]' }
                  : acc.rebuyCount > 0
                    ? { label: 'High-Repeat Client', bg: 'bg-[#EFF6F9] text-[#1D4E63] border-[#D8E8EF]' }
                    : { label: 'Standard Account', bg: 'bg-[#F6F7F8] text-[#5B6472] border-[#E3E6EA]' };

                return (
                  <tr key={acc.name} className="hover:bg-[#F6F7F8]/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-[#12161C] flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#1D4E63] text-white text-[10px] flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span>{acc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-[#255B40] text-sm">
                      {formatCurrency(acc.wonTotal)}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[#12161C]">
                      {acc.wonCount} contract{acc.wonCount !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3.5 font-mono">
                      {acc.rebuyCount > 0 ? (
                        <span className="text-[#1D4E63] font-bold flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" />
                          <span>{acc.rebuyCount} rebuy order{acc.rebuyCount !== 1 ? 's' : ''}</span>
                        </span>
                      ) : (
                        <span className="text-[#5B6472]">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[#5B6472]">
                      {acc.activeCount} open
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${tier.bg}`}>
                        {tier.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* STAGE GATE QUALIFICATION REPORTING CHARTS (2 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Lost Deals by Stage Chart */}
        <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
            <div>
              <h2 className="font-display text-sm font-bold text-[#12161C] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#922D27]" />
                <span>Lost Deals by Pipeline Stage</span>
              </h2>
              <p className="text-xs text-[#5B6472] mt-0.5 font-medium">Identifies where deals drop out during qualification check</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#922D27] bg-[#FDF2F1] border border-[#F4C4C1] px-2.5 py-0.5 rounded-full">
              {lostDeals.length} Lost Total
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {lostByStage.map(({ stage, count, value }) => {
              const pct = maxLostStageVal > 0 ? (value / maxLostStageVal) * 100 : 0;
              return (
                <div key={stage.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-[#12161C] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full border border-[#D1D5DB]" style={{ backgroundColor: stage.color || '#FFFFFF' }} />
                      <span className="font-bold">{stage.name}</span>
                      <span className="text-[#5B6472] font-mono">({count})</span>
                    </span>
                    <span className="font-bold text-[#922D27] font-mono">{formatCurrency(value)}</span>
                  </div>
                  <div className="h-2.5 w-full bg-[#F6F7F8] rounded-full overflow-hidden border border-[#E3E6EA]">
                    <div
                      className="h-full bg-[#922D27] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lost Deals by Reason Breakdown */}
        <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
            <div>
              <h2 className="font-display text-sm font-bold text-[#12161C] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#965700]" />
                <span>Lost Deals by Reason Category</span>
              </h2>
              <p className="text-xs text-[#5B6472] mt-0.5 font-medium">Distribution of mandatory reasons logged on qualification failure</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {lostByReason.map(({ reason, count, value }) => (
              <div key={reason} className="p-3.5 bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl space-y-1">
                <div className="text-[11px] font-bold text-[#12161C] truncate">{reason}</div>
                <div className="text-lg font-black font-mono text-[#12161C]">{count} <span className="text-xs text-[#5B6472] font-normal">deals</span></div>
                <div className="text-[11px] font-mono text-[#922D27] font-semibold">{formatCurrency(value)}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* PERMANENT AUDIT TRAIL LEDGER */}
      <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3E6EA] pb-3">
          <div>
            <h2 className="font-display text-sm font-bold text-[#12161C] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1D4E63]" />
              <span>Permanent Audit Trail &amp; Governance Ledger</span>
            </h2>
            <p className="text-xs text-[#5B6472] mt-0.5">
              Chronological log of all transitions, admin overrides, backward demotions &amp; rebuy events
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5B6472] font-semibold">Filter Event:</span>
            <select
              value={auditFilterAction}
              onChange={(e) => setAuditFilterAction(e.target.value)}
              className="bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl px-3 py-1.5 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
            >
              <option value="All">All Actions</option>
              <option value="STAGE_TRANSITION">Stage Transitions</option>
              <option value="ADMIN_OVERRIDE">Admin Overrides</option>
              <option value="STAGE_DEMOTION">Backward Demotions</option>
              <option value="DEAL_LOST">Closed Lost</option>
              <option value="REBUY_CREATED">Rebuy Created</option>
              <option value="APPROVAL_REQUESTED">Approval Requests</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#12161C]">
            <thead className="bg-[#F6F7F8] text-[#5B6472] uppercase font-mono font-bold text-[10px] tracking-wider border-b border-[#E3E6EA]">
              <tr>
                <th className="px-4 py-3.5">Actor</th>
                <th className="px-4 py-3.5">Event Action</th>
                <th className="px-4 py-3.5">Entity / Contract</th>
                <th className="px-4 py-3.5">Stage Movement</th>
                <th className="px-4 py-3.5">Reason &amp; Justification</th>
                <th className="px-4 py-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E6EA]">
              {filteredAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#5B6472] italic">
                    No matching audit records in ledger.
                  </td>
                </tr>
              ) : (
                filteredAuditLogs.map(log => {
                  const isAdminOverride = log.action === 'ADMIN_OVERRIDE';
                  const isRebuy = log.action === 'REBUY_CREATED';
                  const isLost = log.action === 'DEAL_LOST';
                  const isDemotion = log.action === 'STAGE_DEMOTION';

                  return (
                    <tr key={log.id} className="hover:bg-[#F6F7F8]/60 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-[#12161C]">{log.actorName || 'System'}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        {isAdminOverride ? (
                          <span className="bg-[#FEF8EC] text-[#965700] border border-[#F5DDA9] px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 w-max">
                            <ShieldAlert className="w-3 h-3 text-[#965700]" />
                            <span>Admin Override</span>
                          </span>
                        ) : isRebuy ? (
                          <span className="bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF] px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 w-max">
                            <RefreshCw className="w-3 h-3 text-[#1D4E63]" />
                            <span>Rebuy Created</span>
                          </span>
                        ) : isLost ? (
                          <span className="bg-[#FDF2F1] text-[#922D27] border border-[#F4C4C1] px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 w-max">
                            <XCircle className="w-3 h-3 text-[#922D27]" />
                            <span>Deal Lost</span>
                          </span>
                        ) : isDemotion ? (
                          <span className="bg-[#FEF8EC] text-[#C6790A] border-[#F3D9A2] px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 w-max">
                            <span>Stage Demoted</span>
                          </span>
                        ) : (
                          <span className="bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 w-max">
                            <CheckCircle2 className="w-3 h-3 text-[#15803D]" />
                            <span>{log.action}</span>
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-[#12161C]">
                        {log.entityTitle || log.entityId}
                      </td>

                      <td className="px-4 py-3.5 text-[#5B6472] font-mono text-[11px]">
                        {log.fromStage && log.toStage ? (
                          <span>{log.fromStage} &rarr; <strong className="text-[#12161C]">{log.toStage}</strong></span>
                        ) : (
                          <span>&mdash;</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-[#5B6472] max-w-sm">
                        <div className="font-medium text-[#12161C] line-clamp-2">
                          {log.reason || 'Standard system action'}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right text-[#5B6472] font-mono">
                        {formatDate(log.timestamp)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
