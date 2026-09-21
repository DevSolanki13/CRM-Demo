import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  UserCheck, 
  RefreshCw, 
  ChevronDown, 
  PhoneCall, 
  UserPlus, 
  Briefcase,
  X,
  Users,
  Contact,
  LayoutDashboard,
  Kanban,
  CheckSquare,
  BarChart3,
  Settings,
  ArrowRight
} from 'lucide-react';
import { formatCurrency } from '../utils/crmHelpers.js';

export const Header = ({
  branding,
  users = [],
  currentUser,
  state = null,
  onSelectUser,
  onSelectSearchResult,
  onNavigateTab,
  onOpenQuickAction,
  onTriggerRenewalCheck,
  renewalsDueCount = 0
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [checkingRenewal, setCheckingRenewal] = useState(false);

  // Search & Anchored Dropdown State (No modal, no blur, no center popup)
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  const isMac = typeof window !== 'undefined' && navigator.platform?.toUpperCase()?.includes('MAC');
  const modifierKey = isMac ? '⌘' : 'Ctrl';

  const handleRenewalClick = async () => {
    setCheckingRenewal(true);
    if (onTriggerRenewalCheck) {
      await onTriggerRenewalCheck();
    }
    setTimeout(() => setCheckingRenewal(false), 600);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Ctrl+K / Cmd+K listener to focus the searchbar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // Compute matched items
  const q = searchQuery.toLowerCase().trim();

  const matchedDeals = q && state?.deals 
    ? state.deals.filter(d => d.title.toLowerCase().includes(q) || (d.companyName && d.companyName.toLowerCase().includes(q))).slice(0, 3) 
    : [];

  const matchedLeads = q && state?.leads 
    ? state.leads.filter(l => l.title.toLowerCase().includes(q) || l.contactName.toLowerCase().includes(q) || l.companyName.toLowerCase().includes(q)).slice(0, 3) 
    : [];

  const matchedContacts = q && state?.contacts 
    ? state.contacts.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.companyName && c.companyName.toLowerCase().includes(q))).slice(0, 3) 
    : [];

  const matchedCompanies = q && state?.companies 
    ? state.companies.filter(c => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q)).slice(0, 3) 
    : [];

  const searchResults = [
    ...matchedDeals.map(d => ({ kind: 'deal', item: d, label: d.title, sub: `${d.stageName || ''} • ${formatCurrency(d.value)}` })),
    ...matchedLeads.map(l => ({ kind: 'lead', item: l, label: l.title, sub: `${l.contactName} • ${l.companyName}` })),
    ...matchedContacts.map(c => ({ kind: 'contact', item: c, label: c.name, sub: `${c.email} • ${c.companyName || ''}` })),
    ...matchedCompanies.map(comp => ({ kind: 'company', item: comp, label: comp.name, sub: comp.industry }))
  ];

  const defaultNavCommands = [
    { id: 'pipeline', label: 'Go to Pipeline Kanban', icon: Kanban, action: () => onNavigateTab && onNavigateTab('pipeline') },
    { id: 'leads', label: 'Go to Leads Table', icon: Users, action: () => onNavigateTab && onNavigateTab('leads') },
    { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, action: () => onNavigateTab && onNavigateTab('dashboard') },
    { id: 'tasks', label: 'Go to Tasks & Follow-ups', icon: CheckSquare, action: () => onNavigateTab && onNavigateTab('tasks') },
    { id: 'reports', label: 'Go to Reports & Forecasting', icon: BarChart3, action: () => onNavigateTab && onNavigateTab('reports') },
    { id: 'settings', label: 'Go to Customization Hub', icon: Settings, action: () => onNavigateTab && onNavigateTab('settings') },
  ];

  const defaultActionCommands = [
    { id: 'action-deal', label: 'Create New Deal / Opportunity', icon: Plus, action: () => onOpenQuickAction && onOpenQuickAction('deal') },
    { id: 'action-lead', label: 'Create New Lead', icon: Plus, action: () => onOpenQuickAction && onOpenQuickAction('lead') },
    { id: 'action-activity', label: 'Log Interaction / Call', icon: Plus, action: () => onOpenQuickAction && onOpenQuickAction('activity') },
  ];

  const activeItems = q ? searchResults : [...defaultActionCommands, ...defaultNavCommands];

  const handleSelectActiveItem = (item) => {
    if (q) {
      if (onSelectSearchResult) onSelectSearchResult(item.kind, item.item);
    } else if (item.action) {
      item.action();
    }
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleInputKeyDown = (e) => {
    if (!isSearchOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsSearchOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (activeItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + activeItems.length) % (activeItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeItems.length > 0 && activeItems[selectedIndex]) {
        handleSelectActiveItem(activeItems[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

  return (
    <header className="bg-[#FFFFFF] text-[#12161C] border-b border-[#E3E6EA] sticky top-0 z-30 shadow-[0_1px_2px_rgba(18,22,28,0.06)]">
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        
        {/* Brand & App Title */}
        <div className="flex items-center gap-3 shrink-0">
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

        {/* Global Search Bar with Anchored Dropdown (Directly Underneath, No Background Blur or Center Modal) */}
        <div ref={searchContainerRef} className="flex-1 max-w-md relative hidden md:block">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#5B6472] absolute left-3.5 top-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
                setSelectedIndex(0);
              }}
              onFocus={() => setIsSearchOpen(true)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search deals, leads, contacts, companies..."
              className="w-full bg-[#F6F7F8] hover:bg-[#EEF0F3] focus:bg-[#FFFFFF] border border-[#E3E6EA] focus:border-[#1D4E63] rounded-xl pl-9 pr-14 py-2 text-xs text-[#12161C] placeholder-[#5B6472] transition-colors focus:outline-none shadow-2xs"
            />
            <div className="absolute right-2.5 top-2 flex items-center gap-1">
              {searchQuery ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="p-1 text-[#5B6472] hover:text-[#12161C] rounded-lg"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              ) : (
                <kbd className="bg-[#FFFFFF] text-[#12161C] text-[10px] px-2 py-0.5 rounded font-mono border border-[#E3E6EA] shadow-2xs font-semibold select-none">
                  {modifierKey}+K
                </kbd>
              )}
            </div>
          </div>

          {/* Anchored Normal Dropdown Menu directly underneath */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl shadow-[0_12px_28px_rgba(18,22,28,0.12)] p-2 z-50 max-h-96 overflow-y-auto space-y-2 text-xs no-scrollbar">
              
              {!q ? (
                <div className="space-y-2">
                  {/* Quick Actions */}
                  <div className="space-y-0.5">
                    <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#5B6472]">
                      Quick Actions
                    </div>
                    {defaultActionCommands.map((cmd, idx) => {
                      const Icon = cmd.icon;
                      const isHighlighted = selectedIndex === idx;
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => handleSelectActiveItem(cmd)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-colors ${
                            isHighlighted 
                              ? 'bg-[#EFF6F9] text-[#1D4E63]' 
                              : 'hover:bg-[#F6F7F8] text-[#12161C]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isHighlighted ? 'bg-[#1D4E63] text-white' : 'bg-[#EFF6F9] text-[#1D4E63]'}`}>
                              <Icon className="w-3 h-3" />
                            </div>
                            <span className="font-semibold text-xs">{cmd.label}</span>
                          </div>
                          <kbd className="text-[9px] font-mono text-[#5B6472] bg-[#F6F7F8] px-1.5 py-0.5 rounded border border-[#E3E6EA]">
                            ↵
                          </kbd>
                        </button>
                      );
                    })}
                  </div>

                  {/* Navigation Shortcuts */}
                  <div className="space-y-0.5 pt-1 border-t border-[#E3E6EA]">
                    <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#5B6472]">
                      Navigation
                    </div>
                    {defaultNavCommands.map((cmd, idx) => {
                      const Icon = cmd.icon;
                      const itemIndex = defaultActionCommands.length + idx;
                      const isHighlighted = selectedIndex === itemIndex;
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => handleSelectActiveItem(cmd)}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-colors ${
                            isHighlighted 
                              ? 'bg-[#EFF6F9] text-[#1D4E63]' 
                              : 'hover:bg-[#F6F7F8] text-[#12161C]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-3.5 h-3.5 text-[#5B6472]" />
                            <span className="font-medium text-xs">{cmd.label}</span>
                          </div>
                          <ArrowRight className="w-3 h-3 text-[#5B6472]" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  {searchResults.length === 0 ? (
                    <div className="text-center py-6 text-[#5B6472]">
                      <p className="font-medium text-xs">No records found matching "{searchQuery}".</p>
                      <p className="text-[10px] mt-0.5">Try searching by company, contact, or title.</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#5B6472]">
                        Results ({searchResults.length})
                      </div>
                      {searchResults.map((res, idx) => {
                        const isHighlighted = selectedIndex === idx;
                        const Icon = res.kind === 'deal' ? Briefcase : res.kind === 'lead' ? Users : res.kind === 'contact' ? Contact : Building2;

                        return (
                          <button
                            key={`${res.kind}-${res.item.id}`}
                            onClick={() => handleSelectActiveItem(res)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-colors ${
                              isHighlighted 
                                ? 'bg-[#EFF6F9] text-[#1D4E63]' 
                                : 'hover:bg-[#F6F7F8] text-[#12161C]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${isHighlighted ? 'bg-[#1D4E63] text-white' : 'bg-[#EFF6F9] text-[#1D4E63]'}`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="truncate">
                                <div className="font-bold text-xs truncate text-[#12161C]">{res.label}</div>
                                <div className="text-[10px] text-[#5B6472] truncate">{res.sub}</div>
                              </div>
                            </div>

                            <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-[#F6F7F8] text-[#5B6472] border border-[#E3E6EA] shrink-0">
                              {res.kind}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Bottom Keyboard Guide */}
              <div className="pt-1.5 border-t border-[#E3E6EA] px-2 flex items-center justify-between text-[10px] text-[#5B6472]">
                <span>Select: <kbd className="font-mono bg-[#F6F7F8] px-1 rounded border border-[#E3E6EA]">↵</kbd></span>
                <span>Navigate: <kbd className="font-mono bg-[#F6F7F8] px-1 rounded border border-[#E3E6EA]">↑↓</kbd></span>
                <span>Close: <kbd className="font-mono bg-[#F6F7F8] px-1 rounded border border-[#E3E6EA]">Esc</kbd></span>
              </div>

            </div>
          )}
        </div>

        {/* Action Controls & User Switcher */}
        <div className="flex items-center gap-3">

          {/* Quick Search Mobile */}
          <button 
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
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

      {/* Mobile Search Bar Dropdown */}
      {isMobileSearchOpen && (
        <div className="p-3 bg-[#F6F7F8] border-t border-[#E3E6EA] md:hidden">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#5B6472] absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search deals, leads, contacts..."
              className="w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl pl-9 pr-8 py-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-[#5B6472]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
