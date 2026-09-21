import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Users, 
  Contact, 
  Building2, 
  Briefcase,
  LayoutDashboard,
  Kanban,
  CheckSquare,
  BarChart3,
  Settings,
  Plus,
  ArrowRight,
  Command
} from 'lucide-react';
import { formatCurrency } from '../utils/crmHelpers.js';

export const GlobalSearchModal = ({
  isOpen,
  onClose,
  state,
  onSelectResult,
  onNavigateTab,
  onQuickAction
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? '⌘' : 'Ctrl';

  const q = query.toLowerCase().trim();

  // Compute matched items
  const matchedLeads = q && state?.leads 
    ? state.leads.filter(l => l.title.toLowerCase().includes(q) || l.contactName.toLowerCase().includes(q) || l.companyName.toLowerCase().includes(q)).slice(0, 3) 
    : [];

  const matchedContacts = q && state?.contacts 
    ? state.contacts.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.companyName && c.companyName.toLowerCase().includes(q))).slice(0, 3) 
    : [];

  const matchedDeals = q && state?.deals 
    ? state.deals.filter(d => d.title.toLowerCase().includes(q) || (d.companyName && d.companyName.toLowerCase().includes(q))).slice(0, 3) 
    : [];

  const matchedCompanies = q && state?.companies 
    ? state.companies.filter(c => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q)).slice(0, 3) 
    : [];

  // Flattened results for keyboard navigation
  const searchResults = [
    ...matchedDeals.map(d => ({ kind: 'deal', item: d, label: d.title, sub: `${d.stageName || ''} • ${formatCurrency(d.value)}` })),
    ...matchedLeads.map(l => ({ kind: 'lead', item: l, label: l.title, sub: `${l.contactName} • ${l.companyName}` })),
    ...matchedContacts.map(c => ({ kind: 'contact', item: c, label: c.name, sub: `${c.email} • ${c.companyName || ''}` })),
    ...matchedCompanies.map(comp => ({ kind: 'company', item: comp, label: comp.name, sub: comp.industry }))
  ];

  // Default quick commands when query is empty
  const defaultNavCommands = [
    { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, category: 'Navigation', action: () => onNavigateTab && onNavigateTab('dashboard') },
    { id: 'pipeline', label: 'Go to Pipeline Kanban', icon: Kanban, category: 'Navigation', action: () => onNavigateTab && onNavigateTab('pipeline') },
    { id: 'leads', label: 'Go to Leads Table', icon: Users, category: 'Navigation', action: () => onNavigateTab && onNavigateTab('leads') },
    { id: 'tasks', label: 'Go to Tasks & Follow-ups', icon: CheckSquare, category: 'Navigation', action: () => onNavigateTab && onNavigateTab('tasks') },
    { id: 'reports', label: 'Go to Reports & Forecasting', icon: BarChart3, category: 'Navigation', action: () => onNavigateTab && onNavigateTab('reports') },
    { id: 'settings', label: 'Go to Customization Hub', icon: Settings, category: 'Navigation', action: () => onNavigateTab && onNavigateTab('settings') },
  ];

  const defaultActionCommands = [
    { id: 'action-deal', label: 'Create New Deal / Opportunity', icon: Plus, category: 'Quick Action', action: () => onQuickAction && onQuickAction('deal') },
    { id: 'action-lead', label: 'Create New Lead', icon: Plus, category: 'Quick Action', action: () => onQuickAction && onQuickAction('lead') },
    { id: 'action-activity', label: 'Log Interaction / Call', icon: Plus, category: 'Quick Action', action: () => onQuickAction && onQuickAction('activity') },
  ];

  const activeItems = q ? searchResults : [...defaultActionCommands, ...defaultNavCommands];

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (activeItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + activeItems.length) % (activeItems.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeItems.length > 0 && activeItems[selectedIndex]) {
          const selected = activeItems[selectedIndex];
          if (q) {
            onSelectResult(selected.kind, selected.item);
          } else if (selected.action) {
            selected.action();
          }
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeItems, selectedIndex, q, onClose, onSelectResult]);

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-start justify-center pt-20 p-4 select-none">
      <div 
        className="bg-[#FAFCFD] border border-[#E3E6EA] rounded-2xl max-w-xl w-full p-4 space-y-3 shadow-[0_8px_24px_rgba(18,22,28,0.12)] text-xs text-[#12161C] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Search & Command Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#1D4E63] absolute left-3.5 top-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, search deals, leads, contacts..."
            className="w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl pl-10 pr-20 py-2.5 text-sm text-[#12161C] placeholder-[#5B6472] focus:outline-none focus:border-[#1D4E63] shadow-2xs font-sans"
          />
          <div className="absolute right-3 top-2.5 flex items-center gap-1.5">
            <kbd className="bg-[#F6F7F8] text-[#5B6472] text-[10px] px-1.5 py-0.5 rounded font-mono border border-[#E3E6EA]">
              Esc
            </kbd>
            <button onClick={onClose} className="text-[#5B6472] hover:text-[#12161C] p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Results / Commands Feed */}
        <div className="max-h-96 overflow-y-auto space-y-3 pr-1 no-scrollbar pt-1">
          
          {/* Default Commands when Query is Empty */}
          {!q && (
            <div className="space-y-3">
              {/* Quick Actions */}
              <div className="space-y-1">
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5B6472] px-2">
                  Quick Actions
                </div>
                {defaultActionCommands.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  const isHighlighted = selectedIndex === idx;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => { cmd.action(); onClose(); }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-colors ${
                        isHighlighted 
                          ? 'bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF]' 
                          : 'bg-[#FFFFFF] hover:bg-[#F6F7F8] border border-[#E3E6EA] text-[#12161C]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isHighlighted ? 'bg-[#1D4E63] text-white' : 'bg-[#EFF6F9] text-[#1D4E63]'}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-xs">{cmd.label}</span>
                      </div>
                      <kbd className="text-[10px] font-mono text-[#5B6472] bg-[#F6F7F8] px-1.5 py-0.5 rounded border border-[#E3E6EA]">
                        ↵
                      </kbd>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Shortcuts */}
              <div className="space-y-1">
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5B6472] px-2">
                  Navigation
                </div>
                {defaultNavCommands.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  const itemIndex = defaultActionCommands.length + idx;
                  const isHighlighted = selectedIndex === itemIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => { cmd.action(); onClose(); }}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-colors ${
                        isHighlighted 
                          ? 'bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF]' 
                          : 'bg-[#FFFFFF] hover:bg-[#F6F7F8] border border-[#E3E6EA] text-[#12161C]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-[#5B6472]" />
                        <span className="font-medium text-xs">{cmd.label}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#5B6472]" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Results when Query is Active */}
          {q && (
            <>
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-[#5B6472]">
                  <p className="font-medium text-xs">No records found matching "{query}".</p>
                  <p className="text-[10px] mt-1">Try searching by company, contact name, or deal stage.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5B6472] px-2">
                    Results ({searchResults.length})
                  </div>
                  {searchResults.map((res, idx) => {
                    const isHighlighted = selectedIndex === idx;
                    const Icon = res.kind === 'deal' ? Briefcase : res.kind === 'lead' ? Users : res.kind === 'contact' ? Contact : Building2;

                    return (
                      <button
                        key={`${res.kind}-${res.item.id}`}
                        onClick={() => { onSelectResult(res.kind, res.item); onClose(); }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-colors ${
                          isHighlighted 
                            ? 'bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF]' 
                            : 'bg-[#FFFFFF] hover:bg-[#F6F7F8] border border-[#E3E6EA] text-[#12161C]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isHighlighted ? 'bg-[#1D4E63] text-white' : 'bg-[#EFF6F9] text-[#1D4E63]'}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="truncate">
                            <div className="font-bold text-xs truncate text-[#12161C]">{res.label}</div>
                            <div className="text-[10px] text-[#5B6472] truncate">{res.sub}</div>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-[#F6F7F8] text-[#5B6472] border border-[#E3E6EA] shrink-0">
                          {res.kind}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer Shortcut Helper */}
        <div className="pt-2 border-t border-[#E3E6EA] flex items-center justify-between text-[10px] text-[#5B6472]">
          <div className="flex items-center gap-2">
            <span>Navigate: <kbd className="font-mono bg-[#FFFFFF] px-1 py-0.5 rounded border border-[#E3E6EA]">↑</kbd> <kbd className="font-mono bg-[#FFFFFF] px-1 py-0.5 rounded border border-[#E3E6EA]">↓</kbd></span>
            <span>Select: <kbd className="font-mono bg-[#FFFFFF] px-1 py-0.5 rounded border border-[#E3E6EA]">↵</kbd></span>
            <span>Close: <kbd className="font-mono bg-[#FFFFFF] px-1 py-0.5 rounded border border-[#E3E6EA]">Esc</kbd></span>
          </div>
          <span className="font-mono font-semibold text-[#1D4E63]">{modifierKey}+K</span>
        </div>

      </div>
    </div>
  );
};
