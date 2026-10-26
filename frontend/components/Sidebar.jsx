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
  Plug,
  FileSpreadsheet,
  LogOut,
  Shield,
  X
} from 'lucide-react';

export const Sidebar = ({
  activeTab,
  setActiveTab,
  userRole,
  pendingTasksCount,
  renewalsDueCount,
  onOpenImportExport,
  onLogout,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads', icon: Users },
    {
      id: 'pipeline',
      label: 'Pipeline',
      icon: Kanban,
      badge: renewalsDueCount > 0 ? `${renewalsDueCount} Renewals` : undefined,
      badgeColor: 'bg-[#FEF8EC] text-[#965700] border-[#F5DDA9]'
    },
    { id: 'contacts', label: 'Contacts', icon: Contact },
    { id: 'companies', label: 'Companies', icon: Building2 },
    {
      id: 'tasks',
      label: 'Follow-ups / Tasks',
      icon: CheckSquare,
      badge: pendingTasksCount > 0 ? pendingTasksCount.toString() : undefined,
      badgeColor: 'bg-[#FEF8EC] text-[#965700] border-[#F5DDA9]'
    },
    {
      id: 'employees',
      label: 'Team & Workload',
      icon: Users2,
      roles: ['Admin', 'Manager']
    },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'connections', label: 'Your connections', icon: Plug },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['Admin'] },
  ];

  const handleItemClick = (id) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* 1. Desktop & Tablet Persistent Sidebar Rail */}
      <aside 
        aria-label="Main Navigation"
        className="hidden md:flex md:w-16 lg:w-64 bg-[#FFFFFF] border-r border-[#E3E6EA] text-[#12161C] flex-col justify-between shrink-0 h-full select-none overflow-hidden transition-all duration-200 shadow-[0_1px_2px_rgba(18,22,28,0.06)]"
      >
        <nav aria-label="Sales Operations Modules" className="p-3 space-y-1 overflow-y-auto no-scrollbar">
          <div className="px-3 pt-2 pb-1.5 text-[11px] font-mono font-bold text-[#5B6472] uppercase tracking-wider hidden lg:block">
            Sales Ops Modules
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
                onClick={() => handleItemClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.badge ? `${item.label} (${item.badge})` : item.label}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all relative focus-visible:outline-2 focus-visible:outline-[#1D4E63] ${isActive
                    ? 'bg-[#EFF6F9] text-[#1D4E63] font-bold border-l-2 border-[#1D4E63]'
                    : 'hover:bg-[#F6F7F8] text-[#5B6472] hover:text-[#12161C] font-medium'
                  }`}
                title={item.label}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#1D4E63]' : 'text-[#5B6472]'}`} aria-hidden="true" />
                  <span className="hidden lg:inline truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`hidden lg:inline text-[11px] font-mono px-2 py-0.5 rounded-full font-bold border shadow-2xs ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
                {/* Dot badge on collapsed rail */}
                {item.badge && (
                  <span 
                    aria-hidden="true"
                    className="lg:hidden absolute top-2 right-2 w-2 h-2 rounded-full bg-[#965700]" 
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Tools */}
        <div className="p-3 border-t border-[#E3E6EA] bg-[#FFFFFF] space-y-2">
          <button
            onClick={onOpenImportExport}
            aria-label="Export CRM data as CSV spreadsheet"
            className="w-full flex items-center justify-center lg:justify-between px-3 py-2 rounded-xl text-xs font-medium bg-[#F6F7F8] hover:bg-[#EEF0F3] text-[#12161C] transition-colors border border-[#E3E6EA] focus-visible:outline-2 focus-visible:outline-[#1D4E63]"
            title="Export CSV Data"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#1D4E63] shrink-0" aria-hidden="true" />
              <span className="hidden lg:inline font-semibold">Export CSV</span>
            </div>
            <span className="hidden lg:inline text-[11px] text-[#5B6472] font-mono">.csv</span>
          </button>

          <div className="hidden lg:flex items-center justify-between px-3 py-2 rounded-xl bg-[#F6F7F8] border border-[#E3E6EA]">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#1D4E63]" aria-hidden="true" />
              <span className="text-xs text-[#5B6472]">Role: <strong className="text-[#12161C] font-bold">{userRole}</strong></span>
            </div>
          </div>

          {onLogout && <button
            onClick={onLogout}
            aria-label="Sign out of CRM"
            className="w-full flex items-center justify-center lg:justify-start gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#922D27] hover:bg-[#FDF2F1] transition-colors focus-visible:outline-2 focus-visible:outline-[#922D27]"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 text-[#922D27] shrink-0" aria-hidden="true" />
            <span className="hidden lg:inline">Sign Out</span>
          </button>}
        </div>
      </aside>

      {/* 2. Mobile Off-Canvas Drawer (< md) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Body */}
          <div className="relative w-72 max-w-[85vw] bg-[#FFFFFF] h-full shadow-2xl flex flex-col justify-between border-r border-[#E3E6EA] animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#E3E6EA] flex items-center justify-between bg-[#FAFCFD]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1D4E63] text-white flex items-center justify-center font-bold shadow-2xs">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-sm text-[#12161C]">Sales CRM</h3>
                  <span className="text-[10px] font-mono text-[#5B6472] uppercase font-bold">Navigation</span>
                </div>
              </div>
              <button
                onClick={onCloseMobile}
                aria-label="Close navigation menu"
                className="p-1.5 rounded-lg text-[#5B6472] hover:text-[#12161C] hover:bg-[#F6F7F8] border border-[#E3E6EA]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nav Items */}
            <nav className="p-3 space-y-1.5 overflow-y-auto flex-1">
              <div className="px-3 pt-1 pb-1 text-[10px] font-mono font-bold text-[#5B6472] uppercase tracking-wider">
                Sales Ops Modules
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
                    onClick={() => handleItemClick(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all font-semibold ${isActive
                        ? 'bg-[#EFF6F9] text-[#1D4E63] border-l-2 border-[#1D4E63] font-bold'
                        : 'hover:bg-[#F6F7F8] text-[#5B6472] hover:text-[#12161C]'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#1D4E63]' : 'text-[#5B6472]'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Drawer Footer */}
            <div className="p-3.5 border-t border-[#E3E6EA] bg-[#FAFCFD] space-y-2">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E3E6EA]">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-[#1D4E63]" />
                  <span className="text-xs text-[#5B6472]">Role: <strong className="text-[#12161C] font-bold">{userRole}</strong></span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (onCloseMobile) onCloseMobile();
                  if (onOpenImportExport) onOpenImportExport();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-[#FFFFFF] hover:bg-[#F6F7F8] text-[#12161C] transition-colors border border-[#E3E6EA]"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#1D4E63]" />
                  <span>Export CSV Data</span>
                </div>
                <span className="text-[10px] text-[#5B6472] font-mono">.csv</span>
              </button>

              {onLogout && <button
                onClick={() => {
                  if (onCloseMobile) onCloseMobile();
                  onLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#922D27] hover:bg-[#FDF2F1] transition-colors"
              >
                <LogOut className="w-4 h-4 text-[#922D27]" />
                <span>Sign Out</span>
              </button>}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
