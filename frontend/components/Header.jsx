import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  UserCheck, 
  RefreshCw, 
  ChevronDown,
  PhoneCall,
  UserPlus,
  Briefcase
} from 'lucide-react';

export const Header = ({
  branding,
  users,
  currentUser,
  onSelectUser,
  onOpenSearch,
  onOpenQuickAction,
  onTriggerRenewalCheck,
  renewalsDueCount
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [checkingRenewal, setCheckingRenewal] = useState(false);

  const handleRenewalClick = async () => {
    setCheckingRenewal(true);
    await onTriggerRenewalCheck();
    setTimeout(() => setCheckingRenewal(false), 600);
  };

  return (
    <header className="bg-[#101013] text-white border-b border-[#26262b] sticky top-0 z-30 shadow-sm">
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        
        {/* Brand & App Title */}
        <div className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-white shadow-xs"
            style={{ backgroundColor: branding.primaryColor || '#10b981' }}
          >
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">{branding.appName || 'NexusCRM'}</span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold bg-[#1c1c21] text-zinc-300 border border-[#2c2c34]">
                Customizable CRM
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block font-medium">{branding.tagline || 'Customizable B2B Sales & Recurring Order Platform'}</p>
          </div>
        </div>

        {/* Global Search Bar Trigger */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            onClick={onOpenSearch}
            className="w-full bg-[#18181c] hover:bg-[#202026] border border-[#2e2e38] rounded-xl px-4 py-2 text-xs text-zinc-300 flex items-center justify-between transition-colors shadow-xs"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-zinc-400">Search deals, leads, contacts, companies...</span>
            </div>
            <kbd className="bg-[#24242b] text-zinc-300 text-[10px] px-2.5 py-0.5 rounded-lg font-mono border border-[#2f2f3a]">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Action Controls & User Switcher */}
        <div className="flex items-center gap-3">

          {/* Quick Search Mobile */}
          <button 
            onClick={onOpenSearch}
            className="md:hidden p-2 text-zinc-300 hover:bg-[#18181c] rounded-lg"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Renewal Check Auto Button */}
          <button
            onClick={handleRenewalClick}
            disabled={checkingRenewal}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              renewalsDueCount > 0 
                ? 'bg-amber-950/80 text-amber-300 border-amber-800 hover:bg-amber-900' 
                : 'bg-[#18181c] text-zinc-300 border-[#2e2e38] hover:bg-[#202026]'
            }`}
            title="Check and trigger recurring order cycles"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingRenewal ? 'animate-spin text-amber-400' : 'text-zinc-400'}`} />
            <span className="hidden sm:inline">Renewal Cycle</span>
            {renewalsDueCount > 0 && (
              <span className="bg-amber-600 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                {renewalsDueCount}
              </span>
            )}
          </button>

          {/* Quick Action Dropdown (+ Quick Add) */}
          <div className="relative">
            <button
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              className="bg-white hover:bg-zinc-200 text-black font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 text-black" />
              <span className="hidden sm:inline">Quick Add</span>
              <ChevronDown className="w-3.5 h-3.5 text-black" />
            </button>

            {showQuickMenu && (
              <div 
                className="absolute right-0 mt-2 w-52 bg-[#1c1c21] border border-[#2c2c34] rounded-2xl shadow-2xl py-1 z-50 text-xs text-white"
                onMouseLeave={() => setShowQuickMenu(false)}
              >
                <div className="px-3 py-1.5 border-b border-[#2c2c34] text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Create Record
                </div>
                <button
                  onClick={() => { setShowQuickMenu(false); onOpenQuickAction('lead'); }}
                  className="w-full px-3 py-2 text-left hover:bg-[#24242b] flex items-center gap-2 text-zinc-200"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>New Lead</span>
                </button>
                <button
                  onClick={() => { setShowQuickMenu(false); onOpenQuickAction('deal'); }}
                  className="w-full px-3 py-2 text-left hover:bg-[#24242b] flex items-center gap-2 text-zinc-200"
                >
                  <Briefcase className="w-4 h-4 text-purple-400" />
                  <span>New Deal / Opportunity</span>
                </button>
                <button
                  onClick={() => { setShowQuickMenu(false); onOpenQuickAction('contact'); }}
                  className="w-full px-3 py-2 text-left hover:bg-[#24242b] flex items-center gap-2 text-zinc-200"
                >
                  <UserCheck className="w-4 h-4 text-blue-400" />
                  <span>New Contact</span>
                </button>
                <button
                  onClick={() => { setShowQuickMenu(false); onOpenQuickAction('activity'); }}
                  className="w-full px-3 py-2 text-left hover:bg-[#24242b] flex items-center gap-2 text-zinc-200"
                >
                  <PhoneCall className="w-4 h-4 text-amber-400" />
                  <span>Log Call / Activity</span>
                </button>
              </div>
            )}
          </div>

          {/* User Role Switcher Dropdown (RBAC Demo Feature) */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 bg-[#18181c] hover:bg-[#202026] border border-[#2e2e38] rounded-xl px-3 py-1 text-xs text-white transition-colors"
            >
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-zinc-700"
              />
              <div className="text-left hidden lg:block">
                <div className="font-semibold text-white leading-tight">{currentUser.name}</div>
                <div className="text-[10px] text-zinc-400 font-semibold">{currentUser.role}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {showUserDropdown && (
              <div 
                className="absolute right-0 mt-2 w-56 bg-[#1c1c21] border border-[#2c2c34] rounded-2xl shadow-2xl py-1 z-50 text-xs text-white"
                onMouseLeave={() => setShowUserDropdown(false)}
              >
                <div className="px-3 py-2 border-b border-[#2c2c34] bg-[#141417]">
                  <p className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">Demo RBAC User Switcher</p>
                  <p className="text-[10px] text-zinc-500">Switch user role to test access controls</p>
                </div>
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSelectUser(u);
                      setShowUserDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[#24242b] transition-colors ${
                      u.id === currentUser.id ? 'bg-[#24242b] text-white font-semibold border-l-2 border-emerald-400' : 'text-zinc-300'
                    }`}
                  >
                    <img src={u.avatarUrl} alt={u.name} className="w-6 h-6 rounded-full object-cover" />
                    <div className="flex-1">
                      <div className="text-xs text-white font-semibold">{u.name}</div>
                      <div className="text-[10px] text-zinc-400">{u.role} &bull; {u.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};


