import { Compass, ArrowRight, LayoutDashboard, Kanban, Search, HelpCircle } from 'lucide-react';

export const NotFoundView = ({
  requestedTab = 'unknown',
  onNavigateTab,
  onOpenSearch
}) => {
  return (
    <div className="flex-1 min-h-[80vh] flex items-center justify-center p-6 select-none bg-[#F6F7F8]">
      <div className="max-w-lg w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl shadow-[0_8px_24px_rgba(18,22,28,0.06)] p-8 text-center space-y-6">
        
        {/* Visual Badge Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-[#EFF6F9] border border-[#D8E8EF] flex items-center justify-center">
          <Compass className="w-10 h-10 text-[#1D4E63] animate-pulse" />
          <span className="absolute -top-2 -right-2 bg-[#1D4E63] text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-white shadow-2xs">
            404
          </span>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FEF8EC] text-[#965700] border border-[#F5DDA9] text-[10px] font-mono font-bold uppercase tracking-wider">
            <HelpCircle className="w-3 h-3" />
            <span>Module Not Located</span>
          </div>
          <h2 className="text-xl font-display font-extrabold text-[#12161C] tracking-tight">
            Sales route "{requestedTab}" not found
          </h2>
          <p className="text-xs text-[#5B6472] max-w-sm mx-auto leading-relaxed">
            The CRM module, stage filter, or customer record you requested does not exist or has been relocated in this workspace.
          </p>
        </div>

        {/* Quick Recovery Options */}
        <div className="space-y-2 pt-2">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5B6472]">
            Suggested Destinations
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => onNavigateTab && onNavigateTab('dashboard')}
              className="p-3 bg-[#FAFCFD] hover:bg-[#EFF6F9] border border-[#E3E6EA] hover:border-[#D8E8EF] rounded-xl text-left flex items-center gap-3 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#EFF6F9] text-[#1D4E63] flex items-center justify-center shrink-0">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#12161C] group-hover:text-[#1D4E63] flex items-center gap-1">
                  <span>Dashboard</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-[10px] text-[#5B6472]">Sales overview</div>
              </div>
            </button>

            <button
              onClick={() => onNavigateTab && onNavigateTab('pipeline')}
              className="p-3 bg-[#FAFCFD] hover:bg-[#EFF6F9] border border-[#E3E6EA] hover:border-[#D8E8EF] rounded-xl text-left flex items-center gap-3 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#EFF6F9] text-[#1D4E63] flex items-center justify-center shrink-0">
                <Kanban className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#12161C] group-hover:text-[#1D4E63] flex items-center gap-1">
                  <span>Pipeline</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-[10px] text-[#5B6472]">Deals Kanban</div>
              </div>
            </button>
          </div>
        </div>

        {/* Global Search Shortcut CTA */}
        <div className="pt-2 border-t border-[#E3E6EA]">
          <button
            onClick={() => onOpenSearch && onOpenSearch()}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#1D4E63] hover:bg-[#153B4B] text-white flex items-center justify-center gap-2 transition-colors shadow-2xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Records With Command Center</span>
            <kbd className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded font-mono ml-1">
              Ctrl+K
            </kbd>
          </button>
        </div>

      </div>
    </div>
  );
};
