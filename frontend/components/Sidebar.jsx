import React from 'react';
import {
  LayoutDashboard,
  Users,
  Kanban,
  Building2,
  Contact,
  CheckSquare,
  Users2,
  BarChart3,
  Settings,
  FileSpreadsheet,
  LogOut,
  Sparkles
} from 'lucide-react';

export const Sidebar = ({
  activeTab,
  setActiveTab,
  userRole,
  pendingTasksCount,
  renewalsDueCount,
  onOpenImportExport
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads', icon: Users },
    {
      id: 'pipeline',
      label: 'Pipeline',
      icon: Kanban,
      badge: renewalsDueCount > 0 ? `${renewalsDueCount} Renewals` : undefined,
      badgeColor: 'bg-amber-950 text-amber-300 border-amber-800'
    },
    { id: 'contacts', label: 'Contacts', icon: Contact },
    { id: 'companies', label: 'Companies', icon: Building2 },
    {
      id: 'tasks',
      label: 'Follow-ups / Tasks',
      icon: CheckSquare,
      badge: pendingTasksCount > 0 ? pendingTasksCount.toString() : undefined,
      badgeColor: 'bg-zinc-800 text-white border-zinc-700'
    },
    {
      id: 'employees',
      label: 'Team & Workload',
      icon: Users2,
      roles: ['Admin', 'Manager']
    },
    { id: 'reports', label: 'Reports & Renewal Tracker', icon: BarChart3 },
    { id: 'settings', label: 'Customization Hub', icon: Settings, roles: ['Admin'] },
  ];

  return (
    <aside className="w-64 bg-[#101013] border-r border-[#26262b] text-white flex flex-col justify-between shrink-0 h-full select-none overflow-hidden">
      <div className="p-3 space-y-1 overflow-y-auto scrollbar-thin">
        <div className="px-3 pt-1 pb-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
          Main Modules
        </div>

        {navItems.map(item => {
          if (item.roles && !item.roles.includes(userRole)) {
            return null;
          }

          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                isActive
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'hover:bg-[#18181c] text-zinc-400 hover:text-white font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Tools - Seamless Bottom Layout */}
      <div className="p-3.5 border-t border-[#26262b] bg-[#101013] space-y-2">
        <button
          onClick={onOpenImportExport}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium bg-[#1c1c21] hover:bg-[#24242b] text-zinc-300 hover:text-white transition-colors border border-[#2c2c34]"
        >
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV Data</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">.csv</span>
        </button>

        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#1c1c21] border border-[#2c2c34]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-zinc-400">Active Role: <strong className="text-white">{userRole}</strong></span>
          </div>
        </div>

        <button 
          onClick={() => alert("Sign out triggered (Demo)")}
          className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition-colors"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};



