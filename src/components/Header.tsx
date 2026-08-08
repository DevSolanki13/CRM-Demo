import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  UserCheck, 
  Bell, 
  RefreshCw, 
  Sparkles, 
  ChevronDown,
  Layers,
  PhoneCall,
  UserPlus,
  Briefcase
} from 'lucide-react';
import { User, CRMBrandingSettings } from '../types/crm';

interface HeaderProps {
  branding: CRMBrandingSettings;
  users: User[];
  currentUser: User;
  onSelectUser: (user: User) => void;
  onOpenSearch: () => void;
  onOpenQuickAction: (actionType: 'lead' | 'deal' | 'contact' | 'activity') => void;
  onTriggerRenewalCheck: () => void;
  renewalsDueCount: number;
}

export const Header: React.FC<HeaderProps> = ({
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
    <header className="bg-white text-[#2d2d2a] border-b border-[#e0e0d5] sticky top-0 z-30 shadow-xs">
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        
        {/* Brand & App Title */}
        <div className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs"
            style={{ backgroundColor: branding.primaryColor || '#5A5A40' }}
          >
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-[#2d2d2a] font-serif italic">{branding.appName}</span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold bg-[#5A5A40]/10 text-[#5A5A40] border border-[#5A5A40]/20">
                Customizable CRM
              </span>
            </div>
            <p className="text-xs text-[#6b6b60] hidden sm:block font-medium">{branding.tagline}</p>
          </div>
        </div>

        {/* Global Search Bar Trigger */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            onClick={onOpenSearch}
            className="w-full bg-[#f5f5f0] hover:bg-[#eaeae2] border border-[#e0e0d5] rounded-full px-4 py-2 text-xs text-[#2d2d2a] flex items-center justify-between transition-colors shadow-xs"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#5A5A40]" />
              <span className="text-[#6b6b60]">Search deals, leads, contacts, companies...</span>
            </div>
            <kbd className="bg-white text-[#5A5A40] text-[10px] px-2 py-0.5 rounded-full font-mono border border-[#e0e0d5]">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Action Controls & User Switcher */}
        <div className="flex items-center gap-2.5">

          {/* Quick Search Mobile */}
          <button 
            onClick={onOpenSearch}
            className="md:hidden p-2 text-[#5A5A40] hover:bg-[#f5f5f0] rounded-lg"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Renewal Check Auto Button */}
          <button
            onClick={handleRenewalClick}
            disabled={checkingRenewal}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all border ${
              renewalsDueCount > 0 
                ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100' 
                : 'bg-[#f5f5f0] text-[#5A5A40] border-[#e0e0d5] hover:bg-[#eaeae2]'
            }`}
            title="Check and trigger recurring order cycles"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingRenewal ? 'animate-spin text-amber-700' : 'text-[#5A5A40]'}`} />
            <span className="hidden sm:inline">Renewal Cycle</span>
            {renewalsDueCount > 0 && (
              <span className="bg-amber-600 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                {renewalsDueCount}
              </span>
            )}
          </button>

          {/* Quick Action Dropdown (+ New) */}
          <div className="relative">
            <button
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              className="bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-medium text-xs px-4 py-2 rounded-full flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Quick Add</span>
              <ChevronDown className="w-3 h-3 text-white/70" />
            </button>

            {showQuickMenu && (
              <div 
                className="absolute right-0 mt-2 w-48 bg-white border border-[#e0e0d5] rounded-2xl shadow-xl py-1 z-50 text-xs text-[#2d2d2a]"
                onMouseLeave={() => setShowQuickMenu(false)}
              >
                <div className="px-3 py-1.5 border-b border-[#e0e0d5] text-[11px] font-semibold text-[#5A5A40] uppercase tracking-wider">
                  Create Record
                </div>
                <button
                  onClick={() => { setShowQuickMenu(false); onOpenQuickAction('lead'); }}
                  className="w-full px-3 py-2 text-left hover:bg-[#f5f5f0] flex items-center gap-2 text-[#2d2d2a]"
                >
                  <UserPlus className="w-4 h-4 text-emerald-700" />
                  <span>New Lead</span>
                </button>
                <button
                  onClick={() => { setShowQuickMenu(false); onOpenQuickAction('deal'); }}
                  className="w-full px-3 py-2 text-left hover:bg-[#f5f5f0] flex items-center gap-2 text-[#2d2d2a]"
                >
                  <Briefcase className="w-4 h-4 text-[#5A5A40]" />
                  <span>New Deal / Opportunity</span>
                </button>
                <button
                  onClick={() => { setShowQuickMenu(false); onOpenQuickAction('contact'); }}
                  className="w-full px-3 py-2 text-left hover:bg-[#f5f5f0] flex items-center gap-2 text-[#2d2d2a]"
                >
                  <UserCheck className="w-4 h-4 text-purple-700" />
                  <span>New Contact</span>
                </button>
                <button
                  onClick={() => { setShowQuickMenu(false); onOpenQuickAction('activity'); }}
                  className="w-full px-3 py-2 text-left hover:bg-[#f5f5f0] flex items-center gap-2 text-[#2d2d2a]"
                >
                  <PhoneCall className="w-4 h-4 text-amber-700" />
                  <span>Log Call / Activity</span>
                </button>
              </div>
            )}
          </div>

          {/* User Role Switcher Dropdown (RBAC Demo Feature) */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 bg-[#f5f5f0] hover:bg-[#eaeae2] border border-[#e0e0d5] rounded-full px-3 py-1 text-xs text-[#2d2d2a] transition-colors"
            >
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-[#5A5A40]/30"
              />
              <div className="text-left hidden lg:block">
                <div className="font-medium text-[#2d2d2a] leading-tight">{currentUser.name}</div>
                <div className="text-[10px] text-[#6b6b60] font-semibold">{currentUser.role}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#5A5A40]" />
            </button>

            {showUserDropdown && (
              <div 
                className="absolute right-0 mt-2 w-56 bg-white border border-[#e0e0d5] rounded-2xl shadow-xl py-1 z-50 text-xs"
                onMouseLeave={() => setShowUserDropdown(false)}
              >
                <div className="px-3 py-2 border-b border-[#e0e0d5] bg-[#f5f5f0]">
                  <p className="text-[11px] font-semibold text-[#5A5A40] uppercase">Demo RBAC User Switcher</p>
                  <p className="text-[10px] text-[#6b6b60]">Switch user role to test access controls</p>
                </div>
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSelectUser(u);
                      setShowUserDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[#f5f5f0] transition-colors ${
                      u.id === currentUser.id ? 'bg-[#5A5A40]/10 text-[#5A5A40] font-medium border-l-2 border-[#5A5A40]' : 'text-[#2d2d2a]'
                    }`}
                  >
                    <img src={u.avatarUrl} alt={u.name} className="w-6 h-6 rounded-full object-cover" />
                    <div className="flex-1">
                      <div className="text-xs text-[#2d2d2a] font-semibold">{u.name}</div>
                      <div className="text-[10px] text-[#6b6b60]">{u.role} &bull; {u.email}</div>
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
