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
    <header className="bg-[#FFFFFF] text-[#12161C] border-b border-[#E3E6EA] sticky top-0 z-30 shadow-[0_1px_2px_rgba(18,22,28,0.06)]">
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        
        {/* Brand & App Title */}
        <div className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-white shadow-2xs"
            style={{ backgroundColor: branding?.primaryColor || '#1D4E63' }}
          >
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-lg tracking-tight text-[#12161C]">
                {branding?.appName || 'NexusCRM'}
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md font-semibold bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF]">
                Sales Console
              </span>
            </div>
            <p className="text-xs text-[#5B6472] hidden sm:block font-medium">
              {branding?.tagline || 'Customizable B2B Sales & Recurring Order Platform'}
            </p>
          </div>
        </div>

        {/* Global Search Bar Trigger */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            onClick={onOpenSearch}
            className="w-full bg-[#F6F7F8] hover:bg-[#EEF0F3] border border-[#E3E6EA] rounded-xl px-4 py-2 text-xs text-[#5B6472] flex items-center justify-between transition-colors shadow-2xs focus-visible:outline-2 focus-visible:outline-[#1D4E63]"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#5B6472]" />
              <span>Search deals, leads, contacts, companies...</span>
            </div>
            <kbd className="bg-[#FFFFFF] text-[#12161C] text-[10px] px-2 py-0.5 rounded font-mono border border-[#E3E6EA] shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Action Controls & User Switcher */}
        <div className="flex items-center gap-3">

          {/* Quick Search Mobile */}
          <button 
            onClick={onOpenSearch}
            className="md:hidden p-2 text-[#5B6472] hover:bg-[#F6F7F8] rounded-xl"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Renewal Check Button */}
          <button
            onClick={handleRenewalClick}
            disabled={checkingRenewal}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              renewalsDueCount > 0 
                ? 'bg-[#FEF8EC] text-[#965700] border-[#F5DDA9] hover:bg-[#FDF0D5]' 
                : 'bg-[#F6F7F8] text-[#12161C] border-[#E3E6EA] hover:bg-[#EEF0F3]'
            }`}
            title="Check and trigger recurring order cycles"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingRenewal ? 'animate-spin text-[#965700]' : 'text-[#5B6472]'}`} />
            <span className="hidden sm:inline">Renewal Cycle</span>
            {renewalsDueCount > 0 && (
              <span className="bg-[#965700] text-white font-mono font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                {renewalsDueCount}
              </span>
            )}
          </button>

          {/* Quick Action Dropdown (+ Quick Add) */}
          <div className="relative">
            <button
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              className="bg-[#1D4E63] hover:bg-[#153B4B] text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs focus-visible:outline-2 focus-visible:outline-[#1D4E63]"
            >
              <Plus className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Quick Add</span>
              <ChevronDown className="w-3.5 h-3.5 text-white/80" />
            </button>

            {showQuickMenu && (
              <div 
                className="absolute right-0 mt-2 w-52 bg-[#FAFCFD] border border-[#E3E6EA] rounded-2xl shadow-[0_8px_24px_rgba(18,22,28,0.12)] py-1 z-50 text-xs text-[#12161C]"
                onMouseLeave={() => setShowQuickMenu(false)}
              >
                <div className="px-3 py-1.5 border-b border-[#E3E6EA] text-[10px] font-mono font-bold text-[#5B6472] uppercase tracking-wider">
                  Create Record
                </div>
                <button
                  onClick={() => { setShowQuickMenu(false); onOpenQuickAction('lead'); }}
                  className="w-full px-3 py-2 text-left hover:bg-[#EFF6F9] flex items-center gap-2 text-[#12161C]"
                >
                  <UserPlus className="w-4 h-4 text-[#1D4E63]" />
                  <span>New Lead</span>
                </button>
                <button
                  onClick={() => { setShowQuickMenu(false); onOpenQuickAction('deal'); }}
                  className="w-full px-3 py-2 text-left hover:bg-[#EFF6F9] flex items-center gap-2 text-[#12161C]"
                >
                  <Briefcase className="w-4 h-4 text-[#1D4E63]" />
                  <span>New Deal / Opportunity</span>
                </button>
                <button
                  onClick={() => { setShowQuickMenu(false); onOpenQuickAction('contact'); }}
                  className="w-full px-3 py-2 text-left hover:bg-[#EFF6F9] flex items-center gap-2 text-[#12161C]"
                >
                  <UserCheck className="w-4 h-4 text-[#1D4E63]" />
                  <span>New Contact</span>
                </button>
                <button
                  onClick={() => { setShowQuickMenu(false); onOpenQuickAction('activity'); }}
                  className="w-full px-3 py-2 text-left hover:bg-[#EFF6F9] flex items-center gap-2 text-[#12161C]"
                >
                  <PhoneCall className="w-4 h-4 text-[#965700]" />
                  <span>Log Call / Activity</span>
                </button>
              </div>
            )}
          </div>

          {/* User Role Switcher Dropdown (RBAC Demo Feature) */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 bg-[#F6F7F8] hover:bg-[#EEF0F3] border border-[#E3E6EA] rounded-xl px-3 py-1.5 text-xs text-[#12161C] transition-colors focus-visible:outline-2 focus-visible:outline-[#1D4E63]"
            >
              <img
                src={currentUser?.avatarUrl}
                alt={currentUser?.name}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-[#E3E6EA]"
              />
              <div className="text-left hidden lg:block">
                <div className="font-bold text-[#12161C] leading-tight">{currentUser?.name}</div>
                <div className="text-[10px] text-[#5B6472] font-semibold">{currentUser?.role}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#5B6472]" />
            </button>

            {showUserDropdown && (
              <div 
                className="absolute right-0 mt-2 w-56 bg-[#FAFCFD] border border-[#E3E6EA] rounded-2xl shadow-[0_8px_24px_rgba(18,22,28,0.12)] py-1 z-50 text-xs text-[#12161C]"
                onMouseLeave={() => setShowUserDropdown(false)}
              >
                <div className="px-3 py-2 border-b border-[#E3E6EA] bg-[#F6F7F8]">
                  <p className="text-[10px] font-mono font-bold text-[#5B6472] uppercase tracking-wider">Demo RBAC Switcher</p>
                  <p className="text-[10px] text-[#5B6472]">Switch user role to test access</p>
                </div>
                {users?.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSelectUser(u);
                      setShowUserDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[#EFF6F9] transition-colors ${
                      u.id === currentUser?.id ? 'bg-[#EFF6F9] text-[#12161C] font-semibold border-l-2 border-[#1D4E63]' : 'text-[#5B6472]'
                    }`}
                  >
                    <img src={u.avatarUrl} alt={u.name} className="w-6 h-6 rounded-full object-cover" />
                    <div className="flex-1">
                      <div className="text-xs text-[#12161C] font-bold">{u.name}</div>
                      <div className="text-[10px] text-[#5B6472]">{u.role} &bull; {u.email}</div>
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
