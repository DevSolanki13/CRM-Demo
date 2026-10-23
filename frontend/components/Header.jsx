import React, { useState } from 'react';
import { 
  Building2, 
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
  currentUser,
  state = null,
  onLogout,
  onSelectSearchResult,
  onNavigateTab,
  onOpenQuickAction,
  onTriggerRenewalCheck,
  renewalsDueCount = 0,
  isMobileMenuOpen = false,
  onToggleMobileMenu
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [checkingRenewal, setCheckingRenewal] = useState(false);

  const handleRenewalClick = async () => {
    setCheckingRenewal(true);
    if (onTriggerRenewalCheck) {
      await onTriggerRenewalCheck();
    }
    setTimeout(() => setCheckingRenewal(false), 600);
  };

  return (
    <header className="bg-[#FFFFFF] text-[#12161C] border-b border-[#E3E6EA] sticky top-0 z-30 shadow-[0_1px_2px_rgba(18,22,28,0.06)]">
      <div className="px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand & App Title + Mobile Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mobile Hamburger Menu Toggle */}
          <button
            onClick={onToggleMobileMenu}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
            className="md:hidden p-2 rounded-xl text-[#5B6472] hover:text-[#12161C] hover:bg-[#F6F7F8] border border-[#E3E6EA] transition-colors focus-visible:outline-2 focus-visible:outline-[#1D4E63]"
          >
            <div className="w-5 h-5 flex flex-col justify-center items-center gap-1">
              <span className={`block h-0.5 w-4 bg-[#12161C] transition-all duration-200 ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`block h-0.5 w-4 bg-[#12161C] transition-all duration-200 ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-4 bg-[#12161C] transition-all duration-200 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </div>
          </button>

          <div 
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-extrabold text-white shadow-2xs shrink-0"
            style={{ backgroundColor: branding?.primaryColor || '#1D4E63' }}
          >
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-display font-extrabold text-base sm:text-lg tracking-tight text-[#12161C]">
                {branding?.appName || 'Sales CRM'}
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider px-1.5 sm:px-2 py-0.5 rounded-md font-semibold bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF]">
                Console
              </span>
            </div>
            <p className="text-xs text-[#5B6472] hidden sm:block font-medium">
              {branding?.tagline || 'Customizable B2B Sales & Recurring Order Platform'}
            </p>
          </div>
        </div>

        {/* Action Controls & User Switcher */}
        <div className="flex items-center gap-3">

          {/* Renewal Check Button */}
          <button
            onClick={handleRenewalClick}
            disabled={checkingRenewal || currentUser?.role === 'Sales Rep'}
            aria-label={renewalsDueCount > 0 ? `Trigger renewal check (${renewalsDueCount} renewals due)` : 'Trigger recurring order cycle check'}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              renewalsDueCount > 0 
                ? 'bg-[#FEF8EC] text-[#965700] border-[#F5DDA9] hover:bg-[#FDF0D5]' 
                : 'bg-[#F6F7F8] text-[#12161C] border-[#E3E6EA] hover:bg-[#EEF0F3]'
            }`}
            title="Check and trigger recurring order cycles"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingRenewal ? 'animate-spin text-[#965700]' : 'text-[#5B6472]'}`} aria-hidden="true" />
            <span className="hidden sm:inline">Renewal Cycle</span>
            {renewalsDueCount > 0 && (
              <span className="bg-[#965700] text-white font-mono font-bold text-[11px] px-1.5 py-0.2 rounded-full">
                {renewalsDueCount}
              </span>
            )}
          </button>

          {/* Quick Action Dropdown (+ Quick Add) */}
          <div className="relative">
            <button
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              aria-haspopup="menu"
              aria-expanded={showQuickMenu}
              aria-label="Quick add new record menu"
              className="bg-[#1D4E63] hover:bg-[#153B4B] text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs focus-visible:outline-2 focus-visible:outline-[#1D4E63]"
            >
              <Plus className="w-4 h-4 text-white" aria-hidden="true" />
              <span className="hidden sm:inline">Quick Add</span>
              <ChevronDown className="w-3.5 h-3.5 text-white/80" aria-hidden="true" />
            </button>

            {showQuickMenu && (
              <div 
                role="menu"
                aria-label="Create record options"
                className="absolute right-0 mt-2 w-52 bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl shadow-[0_8px_24px_rgba(18,22,28,0.12)] py-1 z-50 text-xs text-[#12161C]"
                onMouseLeave={() => setShowQuickMenu(false)}
              >
                <div className="px-3 py-1.5 border-b border-[#E3E6EA] text-[11px] font-mono font-bold text-[#5B6472] uppercase tracking-wider">
                  Create Record
                </div>
                <button
                  role="menuitem"
                  onClick={() => { setShowQuickMenu(false); onOpenQuickAction('lead'); }}
                  className="w-full px-3 py-2 text-left hover:bg-[#EFF6F9] flex items-center gap-2 text-[#12161C] transition-colors"
                >
                  <UserPlus className="w-4 h-4 text-[#1D4E63]" aria-hidden="true" />
                  <span>New Lead</span>
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setShowQuickMenu(false); onOpenQuickAction('deal'); }}
                  className="w-full px-3 py-2 text-left hover:bg-[#EFF6F9] flex items-center gap-2 text-[#12161C] transition-colors"
                >
                  <Briefcase className="w-4 h-4 text-[#1D4E63]" aria-hidden="true" />
                  <span>New Deal / Opportunity</span>
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setShowQuickMenu(false); onOpenQuickAction('contact'); }}
                  className="w-full px-3 py-2 text-left hover:bg-[#EFF6F9] flex items-center gap-2 text-[#12161C] transition-colors"
                >
                  <UserCheck className="w-4 h-4 text-[#1D4E63]" aria-hidden="true" />
                  <span>New Contact</span>
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setShowQuickMenu(false); onOpenQuickAction('activity'); }}
                  className="w-full px-3 py-2 text-left hover:bg-[#EFF6F9] flex items-center gap-2 text-[#12161C] transition-colors"
                >
                  <PhoneCall className="w-4 h-4 text-[#965700]" aria-hidden="true" />
                  <span>Log Call / Activity</span>
                </button>
              </div>
            )}
          </div>

          {/* Signed-in account */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              aria-haspopup="menu"
              aria-expanded={showUserDropdown}
              aria-label={`Account: ${currentUser?.name} (${currentUser?.role})`}
              className="flex items-center gap-2 bg-[#F6F7F8] hover:bg-[#EEF0F3] border border-[#E3E6EA] rounded-xl px-3 py-1.5 text-xs text-[#12161C] transition-colors focus-visible:outline-2 focus-visible:outline-[#1D4E63]"
            >
              <img
                src={currentUser?.avatarUrl}
                alt={currentUser?.name}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-[#E3E6EA]"
              />
              <div className="text-left hidden lg:block">
                <div className="font-bold text-[#12161C] leading-tight">{currentUser?.name}</div>
                <div className="text-[11px] text-[#5B6472] font-semibold">{currentUser?.role}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#5B6472]" aria-hidden="true" />
            </button>

            {showUserDropdown && (
              <div 
                role="menu"
                aria-label="User profiles list"
                className="absolute right-0 mt-2 w-56 bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl shadow-[0_8px_24px_rgba(18,22,28,0.12)] py-1 z-50 text-xs text-[#12161C]"
                onMouseLeave={() => setShowUserDropdown(false)}
              >
                <div className="px-3 py-2 border-b border-[#E3E6EA] bg-[#F6F7F8]">
                  <p className="text-xs font-semibold">{currentUser?.name}</p>
                  <p className="text-[11px] text-[#5B6472]">{currentUser?.email}</p>
                </div>
                <button role="menuitem" onClick={() => { setShowUserDropdown(false); onLogout(); }} className="w-full px-3 py-3 text-left hover:bg-[#EFF6F9] font-semibold">Sign out</button>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
