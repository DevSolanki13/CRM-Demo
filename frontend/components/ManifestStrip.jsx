import React from 'react';
import { PhoneCall, Mail, Package, Calendar, RefreshCw } from 'lucide-react';

export const ManifestStrip = ({ activities = [], tasks = [], deals = [], currentUser }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Outbound Metrics
  const callsToday = activities.filter(a => a.type === 'Outbound Call').length;
  const emailsToday = activities.filter(a => a.type === 'Outbound Email').length;
  const samplesSent = activities.filter(a => a.type === 'Sample Sent').length;

  // Pending Tasks Today
  const userTasks = currentUser ? tasks.filter(t => t.ownerId === currentUser.id) : tasks;
  const pendingTasksToday = userTasks.filter(t => t.status === 'pending' && t.dueDate <= todayStr).length;

  // Renewals Due
  const renewalsDueCount = deals.filter(d => d.status === 'Renewal Due' || d.stageName?.includes('Buy Again')).length;

  return (
    <div className="bg-[#FAFCFD] border-b border-[#E3E6EA] px-6 py-2 flex flex-wrap items-center justify-between text-[11px] font-mono text-[#5B6472] gap-4 select-none shrink-0 shadow-[0_8px_24px_rgba(18,22,28,0.12)] z-10">
      <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
        {/* Ledger Marker */}
        <div className="flex items-center gap-2 font-bold text-[#12161C] border-r border-[#E3E6EA] pr-4">
          <span className="w-2 h-2 rounded-full bg-[#1D4E63] animate-pulse" />
          <span>DAILY MANIFEST</span>
        </div>

        {/* Calls Count */}
        <div className="flex items-center gap-1.5 text-[#12161C]">
          <PhoneCall className="w-3.5 h-3.5 text-[#1D4E63]" />
          <span>CALLS:</span>
          <strong className="font-bold text-[#12161C]">{callsToday}</strong>
        </div>

        {/* Emails Count */}
        <div className="flex items-center gap-1.5 text-[#12161C]">
          <Mail className="w-3.5 h-3.5 text-[#1D4E63]" />
          <span>EMAILS:</span>
          <strong className="font-bold text-[#12161C]">{emailsToday}</strong>
        </div>

        {/* Samples Sent Count */}
        <div className="flex items-center gap-1.5 text-[#12161C]">
          <Package className="w-3.5 h-3.5 text-[#1D4E63]" />
          <span>SAMPLES:</span>
          <strong className="font-bold text-[#12161C]">{samplesSent}</strong>
        </div>

        {/* Tasks Due Today */}
        <div className={`flex items-center gap-1.5 ${pendingTasksToday > 0 ? 'text-[#965700] font-bold' : 'text-[#12161C]'}`}>
          <Calendar className="w-3.5 h-3.5 text-[#965700]" />
          <span>TASKS DUE:</span>
          <strong className="font-bold">{pendingTasksToday}</strong>
        </div>
      </div>

      {/* Right status: Renewal Indicator */}
      <div className="flex items-center gap-2">
        {renewalsDueCount > 0 ? (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FEF8EC] border border-[#F5DDA9] text-[#965700] font-bold text-[10px]">
            <RefreshCw className="w-3 h-3 text-[#965700] animate-spin" />
            {renewalsDueCount} RENEWAL{renewalsDueCount > 1 ? 'S' : ''} DUE
          </span>
        ) : (
          <span className="text-[10px] text-[#5B6472]">RENEWAL CYCLES NORMAL</span>
        )}
      </div>
    </div>
  );
};
