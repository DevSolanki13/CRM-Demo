import React, { useState, useEffect, useMemo } from 'react';
import {
  PhoneCall,
  Mail,
  Calendar,
  FileText,
  CheckSquare,
  ShieldCheck,
  ArrowRight,
  PlusCircle,
  DollarSign,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Send,
  Clock,
  User,
  Filter,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Package
} from 'lucide-react';
import { fetchTimeline, createActivity } from '../api/crmClient.js';
import { formatDate } from '../utils/crmHelpers.js';
import { toast } from 'sonner';

export const UnifiedTimeline = ({
  entityType, // 'Deal' | 'Company' | 'Contact' | 'Lead'
  entityId,
  entityTitle,
  currentUser,
  onActivityCreated,
  fallbackActivities = [],
  fallbackNotes = [],
  fallbackTasks = [],
  fallbackAuditLogs = []
}) => {
  const [timelineItems, setTimelineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'communication' | 'note' | 'pipeline' | 'task' | 'governance'
  const [searchFilter, setSearchFilter] = useState('');
  
  // Quick Composer State
  const [quickType, setQuickType] = useState('Note');
  const [quickDescription, setQuickDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});

  const loadTimeline = async () => {
    if (!entityType || !entityId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchTimeline(entityType, entityId);
      setTimelineItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load server timeline, computing fallback:', err);
      // Construct fallback from props
      const fallback = [];
      fallbackActivities.forEach(a => {
        fallback.push({
          id: a.id,
          sourceType: 'activity',
          eventType: a.type,
          title: `${a.type}`,
          description: a.description || a.notes || '',
          authorName: a.authorName || 'Sales Rep',
          timestamp: a.timestamp || a.createdAt || new Date().toISOString(),
          category: a.type.includes('Note') ? 'note' : 'communication',
          icon: a.type.includes('Call') ? 'PhoneCall' : a.type.includes('Email') ? 'Mail' : a.type.includes('Meeting') ? 'Calendar' : 'FileText'
        });
      });
      fallbackNotes.forEach(n => {
        fallback.push({
          id: n.id,
          sourceType: 'note',
          eventType: 'Internal Note',
          title: 'Internal Note',
          description: n.text || '',
          authorName: n.authorName || 'Team Member',
          timestamp: n.timestamp || new Date().toISOString(),
          category: 'note',
          icon: 'FileText'
        });
      });
      setTimelineItems(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, [entityType, entityId]);

  // Handle submitting quick note / call / meeting
  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    if (!quickDescription.trim()) {
      toast.warning('Please enter activity notes');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        type: quickType,
        description: quickDescription.trim(),
        linkedType: entityType,
        linkedId: entityId,
        linkedTitle: entityTitle || 'CRM Record',
        authorId: currentUser?.id || 'u-1',
        authorName: currentUser?.name || 'Sales Rep',
        timestamp: new Date().toISOString(),
        isOutbound: quickType.includes('Outbound') || quickType === 'Call' || quickType === 'Email'
      };

      await createActivity(payload);
      setQuickDescription('');
      toast.success(`${quickType} logged to timeline`);
      
      if (onActivityCreated) {
        onActivityCreated(payload);
      }
      
      await loadTimeline();
    } catch (err) {
      toast.error(err.message || 'Failed to log activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Category counts
  const counts = useMemo(() => {
    const c = { all: timelineItems.length, communication: 0, note: 0, pipeline: 0, task: 0, governance: 0 };
    timelineItems.forEach(item => {
      if (c[item.category] !== undefined) {
        c[item.category]++;
      }
    });
    return c;
  }, [timelineItems]);

  // Filtered timeline items
  const filteredItems = useMemo(() => {
    return timelineItems.filter(item => {
      const matchCat = activeCategory === 'all' || item.category === activeCategory;
      const matchSearch = !searchFilter || 
        (item.title && item.title.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (item.authorName && item.authorName.toLowerCase().includes(searchFilter.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [timelineItems, activeCategory, searchFilter]);

  // Helper to get matching icon and badge colors
  const getItemVisuals = (item) => {
    switch (item.sourceType) {
      case 'activity':
        if (item.eventType.includes('Call')) return { Icon: PhoneCall, bg: 'bg-[#EFF6F9]', border: 'border-[#D8E8EF]', text: 'text-[#1D4E63]', badge: 'Call Logged' };
        if (item.eventType.includes('Email')) return { Icon: Mail, bg: 'bg-[#EFF6F9]', border: 'border-[#D8E8EF]', text: 'text-[#1D4E63]', badge: 'Email Communication' };
        if (item.eventType.includes('Meeting')) return { Icon: Calendar, bg: 'bg-[#F0F7F3]', border: 'border-[#BCDBC9]', text: 'text-[#255B40]', badge: 'Meeting' };
        if (item.eventType.includes('Sample')) return { Icon: Package, bg: 'bg-[#FEF8EC]', border: 'border-[#F5DDA9]', text: 'text-[#965700]', badge: 'Sample Event' };
        return { Icon: FileText, bg: 'bg-[#F6F7F8]', border: 'border-[#E3E6EA]', text: 'text-[#5B6472]', badge: 'Activity' };
      case 'note':
        return { Icon: FileText, bg: 'bg-[#FEF8EC]', border: 'border-[#F5DDA9]', text: 'text-[#965700]', badge: 'Internal Note' };
      case 'task':
        if (item.eventType.includes('Approval')) {
          return { Icon: ShieldCheck, bg: 'bg-[#EFF6F9]', border: 'border-[#D8E8EF]', text: 'text-[#1D4E63]', badge: 'Stage Approval' };
        }
        return { Icon: CheckSquare, bg: 'bg-[#F0F7F3]', border: 'border-[#BCDBC9]', text: 'text-[#255B40]', badge: 'Follow-up Task' };
      case 'stage_gate':
        return { Icon: ShieldCheck, bg: 'bg-[#EFF6F9]', border: 'border-[#D8E8EF]', text: 'text-[#1D4E63]', badge: 'Stage Gate Check' };
      case 'audit':
        if (item.eventType.includes('Stage')) return { Icon: ArrowRight, bg: 'bg-[#EFF6F9]', border: 'border-[#D8E8EF]', text: 'text-[#1D4E63]', badge: 'Stage Transition' };
        if (item.eventType.includes('Value')) return { Icon: DollarSign, bg: 'bg-[#F0F7F3]', border: 'border-[#BCDBC9]', text: 'text-[#255B40]', badge: 'Deal Value Changed' };
        if (item.eventType.includes('Renewal') || item.eventType.includes('Rebuy')) return { Icon: RefreshCw, bg: 'bg-[#FEF8EC]', border: 'border-[#F5DDA9]', text: 'text-[#965700]', badge: 'Repeat Cycle Trigger' };
        if (item.eventType.includes('Automated')) return { Icon: Sparkles, bg: 'bg-[#F3E8FF]', border: 'border-[#E9D5FF]', text: 'text-[#7E22CE]', badge: 'Follow-up Automation' };
        return { Icon: Clock, bg: 'bg-[#F6F7F8]', border: 'border-[#E3E6EA]', text: 'text-[#5B6472]', badge: 'Audit Trail' };
      default:
        return { Icon: Clock, bg: 'bg-[#F6F7F8]', border: 'border-[#E3E6EA]', text: 'text-[#5B6472]', badge: 'System' };
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Quick Composer Header */}
      <form onSubmit={handleQuickSubmit} className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-[#12161C] font-bold">
            <Sparkles className="w-4 h-4 text-[#1D4E63]" />
            <span>Unified Activity Logger</span>
          </div>

          <div className="flex items-center gap-1 bg-[#F6F7F8] p-1 rounded-xl border border-[#E3E6EA]">
            {[
              { label: 'Note', val: 'Note', icon: FileText },
              { label: 'Call', val: 'Outbound Call', icon: PhoneCall },
              { label: 'Meeting', val: 'Meeting', icon: Calendar },
              { label: 'Email', val: 'Outbound Email', icon: Mail }
            ].map(tab => {
              const TabIcon = tab.icon;
              const isSelected = quickType === tab.val;
              return (
                <button
                  key={tab.val}
                  type="button"
                  onClick={() => setQuickType(tab.val)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                    isSelected 
                      ? 'bg-[#FFFFFF] text-[#1D4E63] shadow-xs border border-[#D8E8EF]' 
                      : 'text-[#5B6472] hover:text-[#12161C]'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <textarea
          rows={2}
          value={quickDescription}
          onChange={(e) => setQuickDescription(e.target.value)}
          placeholder={`Log ${quickType.toLowerCase()} details, client commitments, next steps...`}
          className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-xs text-[#12161C] focus:bg-[#FFFFFF] focus:outline-none focus:border-[#1D4E63] focus:ring-1 focus:ring-[#1D4E63]/20 transition-all placeholder:text-[#5B6472]/60"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-[#5B6472]">
            Posting as <strong className="text-[#12161C]">{currentUser?.name || 'Sales Rep'}</strong>
          </span>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-1.5 bg-[#1D4E63] hover:bg-[#153B4B] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Log {quickType}</span>
          </button>
        </div>
      </form>

      {/* Filter Category Pills */}
      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#E3E6EA] pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {[
            { id: 'all', label: 'All History', count: counts.all },
            { id: 'communication', label: 'Calls & Comms', count: counts.communication },
            { id: 'note', label: 'Notes', count: counts.note },
            { id: 'pipeline', label: 'Stage & Deals', count: counts.pipeline },
            { id: 'task', label: 'Tasks & Auto', count: counts.task },
            { id: 'governance', label: 'Gate Approvals', count: counts.governance }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? 'bg-[#1D4E63] text-white shadow-2xs'
                  : 'bg-[#FFFFFF] border border-[#E3E6EA] text-[#5B6472] hover:text-[#12161C]'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-[#F6F7F8] text-[#5B6472]'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={loadTimeline}
          title="Refresh timeline"
          className="p-1.5 text-[#5B6472] hover:text-[#1D4E63] hover:bg-[#EFF6F9] rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Timeline Stream */}
      {loading ? (
        <div className="p-8 text-center bg-[#FAFCFD] border border-dashed border-[#E3E6EA] rounded-2xl text-[#5B6472] space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#1D4E63]" />
          <p className="font-semibold text-xs">Aggregating complete customer timeline...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-8 text-center bg-[#FAFCFD] border border-dashed border-[#E3E6EA] rounded-2xl text-[#5B6472] space-y-2">
          <FileText className="w-8 h-8 mx-auto text-[#5B6472]/40" />
          <p className="font-bold text-xs text-[#12161C]">No timeline activity found</p>
          <p className="text-[11px]">Use the composer above to log the first call, meeting, or strategic note.</p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E3E6EA]">
          {filteredItems.map(item => {
            const { Icon, bg, border, text, badge } = getItemVisuals(item);
            const isExpanded = !!expandedItems[item.id];
            const hasLongContent = item.description && item.description.length > 180;

            return (
              <div key={item.id} className="relative group">
                {/* Node Bullet on line */}
                <div className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full ${bg} ${border} ${text} border flex items-center justify-center shadow-2xs`}>
                  <Icon className="w-2.5 h-2.5" />
                </div>

                {/* Card */}
                <div className="bg-[#FFFFFF] border border-[#E3E6EA] hover:border-[#CAD2DB] rounded-2xl p-3.5 shadow-[0_1px_2px_rgba(18,22,28,0.04)] transition-all space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${bg} ${border} ${text}`}>
                        {badge}
                      </span>
                      {item.status && (
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          item.status === 'completed' || item.status === 'done' || item.status === 'approved_and_executed'
                            ? 'bg-[#F0F7F3] text-[#255B40] border-[#BCDBC9]'
                            : item.status === 'pending' || item.status === 'pending_review'
                            ? 'bg-[#FEF8EC] text-[#965700] border-[#F5DDA9]'
                            : 'bg-[#F6F7F8] text-[#5B6472] border-[#E3E6EA]'
                        }`}>
                          {item.status}
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-[#5B6472] font-mono whitespace-nowrap">
                      {item.timestamp ? formatDate(item.timestamp) : 'Recently'}
                    </span>
                  </div>

                  <div className="font-bold text-[#12161C] text-xs">
                    {item.title}
                  </div>

                  {/* Metadata Chips */}
                  {item.metadata && (
                    <div className="flex items-center gap-2 flex-wrap text-[10px]">
                      {item.metadata.fromStage && item.metadata.toStage && (
                        <div className="flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF]">
                          <span>{item.metadata.fromStage}</span>
                          <ArrowRight className="w-3 h-3" />
                          <span>{item.metadata.toStage}</span>
                        </div>
                      )}
                      {item.metadata.dueDate && (
                        <div className="flex items-center gap-1 font-mono px-2 py-0.5 rounded bg-[#FAFCFD] text-[#5B6472] border border-[#E3E6EA]">
                          <Clock className="w-3 h-3" />
                          <span>Due: {formatDate(item.metadata.dueDate)}</span>
                        </div>
                      )}
                      {item.metadata.priority && (
                        <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-[#FEF8EC] text-[#965700] border border-[#F5DDA9]">
                          {item.metadata.priority}
                        </span>
                      )}
                    </div>
                  )}

                  {item.description && (
                    <div className="text-[11px] text-[#5B6472] leading-relaxed whitespace-pre-wrap">
                      {hasLongContent && !isExpanded ? (
                        <>
                          {item.description.slice(0, 180)}...
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.id)}
                            className="ml-1 text-[#1D4E63] font-bold hover:underline inline-flex items-center gap-0.5"
                          >
                            <span>Read more</span>
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          {item.description}
                          {hasLongContent && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(item.id)}
                              className="ml-1 text-[#1D4E63] font-bold hover:underline inline-flex items-center gap-0.5"
                            >
                              <span>Show less</span>
                              <ChevronUp className="w-3 h-3" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <div className="pt-1.5 border-t border-[#F6F7F8] flex items-center justify-between text-[10px] text-[#5B6472]">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-[#5B6472]" />
                      <span>{item.authorName || 'System'}</span>
                    </div>

                    {item.linkedTitle && (
                      <span className="font-mono text-[#5B6472]/80 truncate max-w-[200px]">
                        {item.linkedType}: {item.linkedTitle}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
