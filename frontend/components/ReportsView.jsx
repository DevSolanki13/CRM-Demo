import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  RefreshCw, 
  Trophy 
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/crmHelpers.js';

export const ReportsView = ({
  state,
  currentUser,
  onCreateDeal
}) => {
  const { deals, users, stages } = state;

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
    <div className="p-6 space-y-6 bg-[#f5f5f0] text-[#2d2d2a] min-h-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e0e0d5] p-6 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#2d2d2a] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#5A5A40]" />
            <span>Sales Performance & Recurring Customer Reports</span>
          </h1>
          <p className="text-xs text-[#6b6b60] mt-1 font-medium">
            Monthly revenue statistics, win/loss conversion, and automated repeat customer tracking
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6b6b60] font-medium">Sales Rep:</span>
          <select
            value={selectedRep}
            onChange={(e) => setSelectedRep(e.target.value)}
            className="bg-[#fcfcf9] border border-[#e0e0d5] rounded-full px-3 py-1.5 text-xs text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
          >
            <option value="All">All Team Members</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-[#e0e0d5] p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6b6b60] font-semibold uppercase tracking-wider">Total Won Revenue</span>
            <Trophy className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <div className="text-2xl font-extrabold text-[#5A5A40] mt-2">{formatCurrency(totalRevenue)}</div>
          <div className="text-[11px] text-[#6b6b60] mt-1 font-medium">{wonDeals.length} closed won deals</div>
        </div>

        <div className="bg-white border border-[#e0e0d5] p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6b6b60] font-semibold uppercase tracking-wider">Win Rate</span>
            <TrendingUp className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <div className="text-2xl font-extrabold text-[#2d2d2a] mt-2">{winRate}%</div>
          <div className="text-[11px] text-[#6b6b60] mt-1 font-medium">{wonDeals.length} won vs {lostDeals.length} lost</div>
        </div>

        <div className="bg-white border border-[#e0e0d5] p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6b6b60] font-semibold uppercase tracking-wider">Average Deal Size</span>
            <DollarSign className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <div className="text-2xl font-extrabold text-[#2d2d2a] mt-2">{formatCurrency(avgDealSize)}</div>
          <div className="text-[11px] text-[#6b6b60] mt-1 font-medium">Per closed won deal</div>
        </div>

        <div className="bg-white border border-[#e0e0d5] p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6b6b60] font-semibold uppercase tracking-wider">Renewals Due</span>
            <RefreshCw className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-extrabold text-amber-800 mt-2">{renewalDueDeals.length}</div>
          <div className="text-[11px] text-[#6b6b60] mt-1 font-medium">Repeat order cycle reached</div>
        </div>

      </div>

      {/* RECURRING CUSTOMER & RENEWAL TRACKER SECTION */}
      <div className="bg-white border border-[#e0e0d5] p-6 rounded-2xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#e0e0d5] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#2d2d2a] flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#5A5A40]" />
              <span>Recurring Customer Renewal Tracking</span>
            </h2>
            <p className="text-xs text-[#6b6b60] font-medium">
              Customers whose repeat order cycle has elapsed. Automatically flipped to "Buy Again"
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#2d2d2a]">
            <thead className="bg-[#f5f5f0] text-[#5A5A40] uppercase font-bold text-[10px] tracking-wider border-b border-[#e0e0d5]">
              <tr>
                <th className="px-4 py-3.5">Customer / Deal Title</th>
                <th className="px-4 py-3.5">Last Purchase Date</th>
                <th className="px-4 py-3.5">Cycle Days</th>
                <th className="px-4 py-3.5">Renewal Status</th>
                <th className="px-4 py-3.5">Assigned Rep</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0d5]">
              {renewalDueDeals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-[#6b6b60] italic">
                    No customers currently due for renewal.
                  </td>
                </tr>
              ) : (
                renewalDueDeals.map(deal => (
                  <tr key={deal.id} className="hover:bg-[#f5f5f0]/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-[#2d2d2a]">{deal.title}</div>
                      <div className="text-[11px] text-[#6b6b60] font-medium">{deal.companyName || deal.contactName}</div>
                    </td>

                    <td className="px-4 py-3.5 text-[#2d2d2a] font-semibold">
                      {formatDate(deal.actualCloseDate || deal.createdAt)}
                    </td>

                    <td className="px-4 py-3.5 text-[#6b6b60] font-mono">
                      {deal.recurrenceDays || 60} days
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                        Buy Again Due
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-[#2d2d2a] font-medium">
                      {deal.ownerName || 'Unassigned'}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleCreateRenewalDeal(deal)}
                        className="px-4 py-1.5 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-semibold text-xs rounded-full shadow-xs transition-colors"
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
