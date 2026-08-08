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
  RefreshCw
} from 'lucide-react';
import { UserRole } from '../types/crm';

export type ActiveTab = 
  | 'dashboard' 
  | 'leads' 
  | 'pipeline' 
  | 'contacts' 
  | 'companies' 
  | 'tasks' 
  | 'employees' 
  | 'reports' 
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  userRole: UserRole;
  pendingTasksCount: number;
  renewalsDueCount: number;
  onOpenImportExport: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
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
      label: 'Pipeline (Kanban)', 
      icon: Kanban,
      badge: renewalsDueCount > 0 ? `${renewalsDueCount} Renewals` : undefined,
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-200'
    },
    { id: 'contacts', label: 'Contacts', icon: Contact },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { 
      id: 'tasks', 
      label: 'Follow-ups / Tasks', 
      icon: CheckSquare,
      badge: pendingTasksCount > 0 ? pendingTasksCount.toString() : undefined,
      badgeColor: 'bg-white/20 text-white border-white/30'
    },
    { 
      id: 'employees', 
      label: 'Team & Workload', 
      icon: Users2, 
      roles: ['Admin', 'Manager'] as UserRole[] 
    },
    { id: 'reports', label: 'Reports & Renewal Tracker', icon: BarChart3 },
    { id: 'settings', label: 'Customization Hub', icon: Settings, roles: ['Admin'] as UserRole[] },
  ];

  return (
    <aside className="w-64 bg-[#5A5A40] border-r border-[#4a4a35] text-white flex flex-col justify-between shrink-0 h-[calc(100vh-61px)] sticky top-[61px]">
      <div className="p-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-bold text-white/60 uppercase tracking-wider">
          Main Modules
        </div>

        {navItems.map(item => {
          // Check role restrictions
          if (item.roles && !item.roles.includes(userRole)) {
            return null;
          }

          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive 
                  ? 'bg-white/20 text-white font-semibold shadow-xs border border-white/20' 
                  : 'hover:bg-white/10 text-white/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/70'}`} />
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

      {/* Footer Tools */}
      <div className="p-4 border-t border-white/10 bg-black/10 space-y-2.5">
        <button
          onClick={onOpenImportExport}
          className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/15"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
          <span>Import / Export CSV</span>
        </button>

        <div className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/80">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white/90">Active Role:</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 text-[10px] font-bold">
              {userRole}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
