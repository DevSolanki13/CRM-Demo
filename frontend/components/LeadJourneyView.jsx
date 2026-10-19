import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Building2,
  User,
  Mail,
  Phone,
  DollarSign,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Check,
  Clock,
  AlertTriangle,
  PhoneCall,
  FileText,
  CheckSquare,
  ShieldCheck,
  ArrowRight,
  Plus,
  RefreshCw,
  Send,
  Calendar,
  Package,
  Sparkles,
  CheckCircle2,
  XCircle,
  Edit3,
  Layers,
  History,
  X,
  UserCheck,
  Award,
  Info,
  Loader2,
  Flag
} from 'lucide-react';
import { formatDate, getStageBadgeStyle, getLocalDateInputValueAfterDays } from '../utils/crmHelpers.js';
import { fetchTimeline, createActivity, createTask, updateTask } from '../api/crmClient.js';
import { toast } from 'sonner';

// Stage guidance & success checklist definitions adapted to CRM tone
const STAGE_GUIDANCE_MAP = {
  'New Lead': {
    guidance: 'Qualify lead interest and verify primary contact information. Identify key technical and commercial decision-makers before advancing.',
    keyQuestions: [
      'Identified primary decision-maker and operational role',
      'Confirmed contact phone number and verified email address',
      'Determined potential product fit and estimated order volume'
    ]
  },
  'Contacted': {
    guidance: 'Discover customer application requirements and specifications. Confirm evaluation criteria, rough budget range, and decision timeline.',
    keyQuestions: [
      'Conducted discovery call with engineering / procurement',
      'Obtained technical datasheet or custom spec requirements',
      'Agreed on evaluation process and sample trial feasibility'
    ]
  },
  'Sample Sent': {
    guidance: 'Track courier shipment and confirm lab/plant arrival. Check in within 48 hours of delivery to support initial testing protocols.',
    keyQuestions: [
      'Sample courier tracking confirmed and delivered safely',
      'Recipient lab confirmed receipt of trial batch',
      'Scheduled testing evaluation review call'
    ]
  },
  'Proposal Sent': {
    guidance: 'Deliver formal commercial proposal with tiered volume pricing. Schedule a proposal walkthrough to address questions and competitor bids.',
    keyQuestions: [
      'Custom quotation submitted with validity date',
      'Reviewed pricing tiers with procurement lead',
      'Identified competing suppliers and pricing expectations'
    ]
  },
  'Negotiation': {
    guidance: 'Resolve commercial counter-offers, payment terms, and delivery schedules. Secure credit approval and prepare final purchase contract.',
    keyQuestions: [
      'Finalized unit price and bulk shipping terms',
      'Credit limit and payment terms validated',
      'Draft purchase order or supply contract under review'
    ]
  },
  'Closed Won': {
    guidance: 'Confirm signed purchase order. Hand off order to fulfillment/production team and configure automated repeat renewal follow-up.',
    keyQuestions: [
      'Signed purchase order / commercial contract locked',
      'Initial manufacturing / fulfillment ticket dispatched',
      'Automated repeat rebuy cycle configured (60/90 days)'
    ]
  },
  'Closed Lost': {
    guidance: 'Document detailed loss reason (pricing, competitor, timing). Schedule an automated re-engagement reminder in 90 days.',
    keyQuestions: [
      'Recorded specific competitor and root loss cause',
      'Sent wrap-up note leaving future opportunities open',
      'Logged 90-day future check-in task'
    ]
  }
};

export const LeadJourneyView = ({
  lead,
  stages = [],
  deals = [],
  users = [],
  currentUser,
  branding,
  onBack,
  onOpenDrawer,
  onUpdateLead,
  onUpdateDeal,
  onCreateActivity,
  onCreateTask,
  onUpdateTask,
  onTransitionDealStage
}) => {
  // Timeline items fetched from backend
  const [timelineItems, setTimelineItems] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);

  // Selected stage for inspection (read-only history filter)
  // 'ALL' | 'UNASSIGNED' | stage.id
  const [selectedStageId, setSelectedStageId] = useState(null);

  // Activity type filter within stage timeline
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Expandable timeline items
  const [expandedItems, setExpandedItems] = useState({});

  // Collapsible sections
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(true);
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(true);

  // Inline Activity Composer State
  const [composerTab, setComposerTab] = useState('Call');
  const [composerSubject, setComposerSubject] = useState('');
  const [composerDescription, setComposerDescription] = useState('');
  const [composerDueDate, setComposerDueDate] = useState(getLocalDateInputValueAfterDays(1));
  const [composerPerformerId, setComposerPerformerId] = useState(currentUser?.id || 'u-1');
  const [composerAssignedId, setComposerAssignedId] = useState(lead?.ownerId || currentUser?.id || 'u-1');
  const [isSubmittingComposer, setIsSubmittingComposer] = useState(false);

  // Advance Stage Modal
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [targetStageId, setTargetStageId] = useState('');
  const [stageTransitionNote, setStageTransitionNote] = useState('');
  const [isSubmittingStage, setIsSubmittingStage] = useState(false);

  // Find linked deal for this lead (prioritize primary deal over renewal rebuy deals)
  const linkedDeal = useMemo(() => {
    if (!lead?.id) return null;
    return deals.find(d => d.leadId === lead.id && !d.isRebuy) || deals.find(d => d.leadId === lead.id) || null;
  }, [lead?.id, deals]);

  // Sort stages by pipeline order
  const sortedStages = useMemo(() => {
    return [...stages].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [stages]);

  // Determine lead's current actual stage
  const currentActualStage = useMemo(() => {
    if (linkedDeal) {
      const match = sortedStages.find(s => s.id === linkedDeal.stageId || s.name === linkedDeal.stageName);
      if (match) return match;
    }
    return sortedStages[0] || { id: 'stg-1', name: 'New Lead', order: 1 };
  }, [linkedDeal, sortedStages]);

  // Set initial selected stage to the current actual stage
  useEffect(() => {
    if (currentActualStage && selectedStageId === null) {
      setSelectedStageId(currentActualStage.id);
    }
  }, [currentActualStage, selectedStageId]);

  // Fetch unified timeline
  const loadTimeline = async () => {
    if (!lead?.id) return;
    setLoadingTimeline(true);
    try {
      const items = await fetchTimeline('Lead', lead.id);
      setTimelineItems(Array.isArray(items) ? items : []);
    } catch (err) {
      console.warn('Could not load unified timeline, calculating fallback:', err);
      setTimelineItems([]);
    } finally {
      setLoadingTimeline(false);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, [lead?.id]);

  // Associate each timeline item with a specific stage
  const timelineWithStage = useMemo(() => {
    return timelineItems.map(item => {
      let stageMatch = null;
      if (item.stageId) {
        stageMatch = sortedStages.find(s => s.id === item.stageId);
      }
      if (!stageMatch && item.stageName) {
        stageMatch = sortedStages.find(s => s.name.toLowerCase() === item.stageName.toLowerCase());
      }
      if (!stageMatch && item.toStageName) {
        stageMatch = sortedStages.find(s => s.name.toLowerCase() === item.toStageName.toLowerCase());
      }
      if (!stageMatch && item.metadata?.toStage) {
        stageMatch = sortedStages.find(s => s.name.toLowerCase() === item.metadata.toStage.toLowerCase());
      }
      if (!stageMatch && item.metadata?.stageName) {
        stageMatch = sortedStages.find(s => s.name.toLowerCase() === item.metadata.stageName.toLowerCase());
      }
      if (!stageMatch && item.metadata?.targetStageName) {
        stageMatch = sortedStages.find(s => s.name.toLowerCase() === item.metadata.targetStageName.toLowerCase());
      }

      return {
        ...item,
        matchedStage: stageMatch || null,
        stageLabel: stageMatch ? stageMatch.name : 'Stage not recorded'
      };
    });
  }, [timelineItems, sortedStages]);

  // Counts of events per stage
  const stageActivityCounts = useMemo(() => {
    const counts = { ALL: timelineWithStage.length, UNASSIGNED: 0 };
    sortedStages.forEach(s => {
      counts[s.id] = 0;
    });

    timelineWithStage.forEach(item => {
      if (item.matchedStage) {
        counts[item.matchedStage.id] = (counts[item.matchedStage.id] || 0) + 1;
      } else {
        counts.UNASSIGNED++;
      }
    });

    return counts;
  }, [timelineWithStage, sortedStages]);

  // Selected stage object
  const selectedStageObj = useMemo(() => {
    if (selectedStageId === 'ALL' || selectedStageId === 'UNASSIGNED') return null;
    return sortedStages.find(s => s.id === selectedStageId) || currentActualStage;
  }, [selectedStageId, sortedStages, currentActualStage]);

  // Filtered timeline items
  const filteredTimelineItems = useMemo(() => {
    return timelineWithStage.filter(item => {
      // 1. Stage filter
      if (selectedStageId === 'ALL') {
        // Show everything
      } else if (selectedStageId === 'UNASSIGNED') {
        if (item.matchedStage !== null) return false;
      } else {
        if (!item.matchedStage || item.matchedStage.id !== selectedStageId) {
          return false;
        }
      }

      // 2. Type filter
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'call' && !item.eventType.toLowerCase().includes('call')) return false;
        if (typeFilter === 'email' && !item.eventType.toLowerCase().includes('email')) return false;
        if (typeFilter === 'meeting' && !item.eventType.toLowerCase().includes('meeting')) return false;
        if (typeFilter === 'task' && item.sourceType !== 'task') return false;
        if (typeFilter === 'note' && item.sourceType !== 'note' && !item.eventType.toLowerCase().includes('note')) return false;
        if (typeFilter === 'stage' && item.sourceType !== 'audit' && item.sourceType !== 'stage_gate' && !item.eventType.toLowerCase().includes('stage')) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const descMatch = (item.description || '').toLowerCase().includes(q);
        const authorMatch = (item.authorName || '').toLowerCase().includes(q);
        const performerMatch = (item.performedByName || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !authorMatch && !performerMatch) return false;
      }

      return true;
    });
  }, [timelineWithStage, selectedStageId, typeFilter, searchQuery]);

  // Pending tasks
  const pendingTasks = useMemo(() => {
    return timelineWithStage
      .filter(i => i.sourceType === 'task' && (i.status === 'pending' || i.status === 'pending_review'))
      .sort((a, b) => {
        const dateA = a.metadata?.dueDate || a.timestamp || '';
        const dateB = b.metadata?.dueDate || b.timestamp || '';
        return dateA.localeCompare(dateB);
      });
  }, [timelineWithStage]);

  // Terminal status resolution — based ONLY on the deal's actual stage, not lead.status
  // (lead.status='Converted' does NOT mean Closed Won — it means the lead became a client)
  const isWon = useMemo(() => {
    return (
      currentActualStage?.category === 'Won' ||
      currentActualStage?.name === 'Closed Won' ||
      linkedDeal?.status === 'Won'
    );
  }, [currentActualStage, linkedDeal?.status]);

  const isLost = useMemo(() => {
    return (
      currentActualStage?.category === 'Lost' ||
      currentActualStage?.name === 'Closed Lost' ||
      linkedDeal?.status === 'Lost'
    );
  }, [currentActualStage, linkedDeal?.status]);

  const isRenewal = useMemo(() => {
    return currentActualStage?.category === 'Buy Again' || currentActualStage?.name?.includes('Renewal') || currentActualStage?.name?.includes('Buy Again');
  }, [currentActualStage]);

  // Qualification pipeline stages (stages 1 to 5: New Lead, Contacted, Sample Sent, Proposal Sent, Negotiation)
  const qualificationStages = useMemo(() => {
    return sortedStages.filter(s =>
      s.category !== 'Won' &&
      s.category !== 'Lost' &&
      s.category !== 'Buy Again' &&
      !s.name.includes('Closed') &&
      !s.name.includes('Renewal') &&
      !s.name.includes('Buy Again')
    );
  }, [sortedStages]);

  // Find where the deal dropped off (off-ramp stage for lost deals)
  const offRampStageInfo = useMemo(() => {
    if (!isLost) return null;
    const lostTransition = timelineWithStage.find(i =>
      (i.toStageName === 'Closed Lost' || i.eventType?.includes('Stage Change')) &&
      i.fromStageName &&
      i.fromStageName !== 'Closed Lost'
    );
    const dropOffName = lostTransition?.fromStageName || linkedDeal?.stageName || 'Negotiation';
    const dropOffStage = qualificationStages.find(s => s.name.toLowerCase() === dropOffName.toLowerCase()) || qualificationStages[qualificationStages.length - 1];
    return {
      stageName: dropOffName,
      stage: dropOffStage,
      reason: linkedDeal?.lostReason || lostTransition?.metadata?.reason || 'Pricing or competitor won',
      note: linkedDeal?.lostNote || ''
    };
  }, [isLost, timelineWithStage, qualificationStages, linkedDeal]);

  // Unified 6-Chevron Hybrid Pipeline Path (Qual Stages 1-5 + Adaptive Terminal Milestone)
  const hybridPathStages = useMemo(() => {
    let terminalStage;
    if (isWon) {
      terminalStage = sortedStages.find(s => s.category === 'Won' || s.name === 'Closed Won') || { id: 'stg-won', name: 'Closed Won', category: 'Won' };
    } else if (isLost) {
      terminalStage = sortedStages.find(s => s.category === 'Lost' || s.name === 'Closed Lost') || { id: 'stg-lost', name: 'Closed Lost', category: 'Lost' };
    } else if (isRenewal) {
      terminalStage = sortedStages.find(s => s.category === 'Buy Again') || { id: 'stg-renewal', name: 'Buy Again (Renewal)', category: 'Buy Again' };
    } else {
      // In flight: Target destination milestone "Closed"
      const wonStage = sortedStages.find(s => s.category === 'Won' || s.name === 'Closed Won');
      terminalStage = {
        id: wonStage?.id || 'stg-closed-target',
        name: 'Closed',
        isTarget: true,
        category: 'Target'
      };
    }

    return [...qualificationStages, terminalStage];
  }, [qualificationStages, sortedStages, isWon, isLost, isRenewal]);

  // Stage status helper in Hybrid Pipeline Model
  const getStageStatus = (stage) => {
    if (!currentActualStage) return 'upcoming';

    if (stage.isTarget) {
      return isWon ? 'closed_won' : isLost ? 'closed_lost' : 'upcoming';
    }

    if (stage.category === 'Lost' || stage.name.toLowerCase().includes('lost')) {
      return isLost ? 'closed_lost' : 'upcoming';
    }

    if (stage.category === 'Won' || stage.name.toLowerCase().includes('won')) {
      return isWon ? 'closed_won' : 'upcoming';
    }

    if (isLost) {
      // If deal is lost, stages up to offRampStage are completed, offRampStage is the exit point
      if (offRampStageInfo?.stage?.id === stage.id) {
        return 'off_ramp';
      }
      if ((stage.order || 0) < (offRampStageInfo?.stage?.order || currentActualStage.order || 0)) {
        return 'completed';
      }
      return 'upcoming';
    }

    if (isWon) {
      // All qualification stages are completed when deal is won
      return 'completed';
    }

    if (stage.id === currentActualStage.id) {
      return 'current';
    }

    if ((stage.order || 0) < (currentActualStage.order || 0)) {
      return 'completed';
    }

    return 'upcoming';
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Execute Deliberate Stage Transition (used by Modal)
  const handleStageTransition = async (destinationStage) => {
    if (!destinationStage) return;
    try {
      if (linkedDeal && onTransitionDealStage) {
        await onTransitionDealStage(linkedDeal.id, {
          targetStageId: destinationStage.id,
          user: currentUser,
          note: `Advanced via Lead Journey Stage Path`,
          overrideReason: currentUser?.role === 'Admin' ? 'Admin Stage Transition' : undefined
        });
      } else if (linkedDeal && onUpdateDeal) {
        await onUpdateDeal(linkedDeal.id, {
          stageId: destinationStage.id,
          stageName: destinationStage.name
        });
      }

      if (onUpdateLead) {
        await onUpdateLead(lead.id, {
          status: destinationStage.name === 'Closed Won' ? 'Converted' : destinationStage.name === 'Closed Lost' ? 'Unqualified' : 'Qualified',
          lastActivityDate: new Date().toISOString().split('T')[0]
        });
      }

      toast.success(`Stage updated to ${destinationStage.name}`);
      setSelectedStageId(destinationStage.id);
      await loadTimeline();
    } catch (err) {
      toast.error(err.message || 'Stage transition failed');
    }
  };

  // Submit from Inline Activity Composer
  const handleComposerSubmit = async (e) => {
    e.preventDefault();
    if (!composerDescription.trim() && composerTab !== 'Task') {
      toast.warning('Please enter activity notes or outcome summary.');
      return;
    }

    setIsSubmittingComposer(true);
    try {
      const performer = users.find(u => u.id === composerPerformerId) || currentUser;
      const assigned = users.find(u => u.id === composerAssignedId) || performer;
      const stageToTag = selectedStageObj || currentActualStage;

      if (composerTab === 'Task') {
        const taskPayload = {
          title: composerSubject.trim() || `Follow-up: ${lead.title}`,
          dueDate: composerDueDate,
          type: 'Call',
          linkedType: linkedDeal ? 'Deal' : 'Lead',
          linkedId: linkedDeal ? linkedDeal.id : lead.id,
          linkedTitle: lead.title,
          ownerId: assigned.id,
          ownerName: assigned.name,
          submittedBy: currentUser?.id || 'u-1',
          submittedByName: currentUser?.name || 'Sales Rep',
          targetStageName: stageToTag.name,
          status: 'pending',
          note: composerDescription.trim()
        };

        if (onCreateTask) {
          await onCreateTask(taskPayload);
        } else {
          await createTask(taskPayload);
        }
        toast.success(`Task scheduled for ${assigned.name}`);
      } else {
        const typeMap = {
          Call: 'Outbound Call',
          Email: 'Outbound Email',
          Event: 'Meeting',
          Note: 'Internal Note'
        };

        const actPayload = {
          type: typeMap[composerTab] || composerTab,
          description: composerDescription.trim(),
          timestamp: new Date().toISOString(),
          linkedType: linkedDeal ? 'Deal' : 'Lead',
          linkedId: linkedDeal ? linkedDeal.id : lead.id,
          linkedTitle: lead.title,
          authorId: currentUser?.id || 'u-1',
          authorName: currentUser?.name || 'Sales Rep',
          performedByName: performer.name,
          assignedToName: assigned.name,
          stageId: stageToTag.id,
          stageName: stageToTag.name,
          isOutbound: composerTab === 'Call' || composerTab === 'Email',
          metadata: {
            stageId: stageToTag.id,
            stageName: stageToTag.name,
            performedByName: performer.name,
            assignedToName: assigned.name
          }
        };

        if (onCreateActivity) {
          await onCreateActivity(actPayload);
        } else {
          await createActivity(actPayload);
        }
        toast.success(`${composerTab} logged under ${stageToTag.name}`);
      }

      setComposerSubject('');
      setComposerDescription('');
      await loadTimeline();
    } catch (err) {
      toast.error(err.message || 'Failed to record activity');
    } finally {
      setIsSubmittingComposer(false);
    }
  };

  // Toggle Task Completion
  const handleToggleTaskStatus = async (taskItem) => {
    try {
      const isDone = taskItem.status === 'completed' || taskItem.status === 'done';
      const newStatus = isDone ? 'pending' : 'completed';

      if (onUpdateTask) {
        await onUpdateTask(taskItem.id, { status: newStatus });
      } else {
        await updateTask(taskItem.id, { status: newStatus });
      }

      toast.success(isDone ? 'Task reopened' : 'Task marked complete');
      await loadTimeline();
    } catch (err) {
      toast.error(err.message || 'Failed to update task');
    }
  };

  // Visual mapping for timeline items matching website semantic tokens
  const getItemVisuals = (item) => {
    switch (item.sourceType) {
      case 'activity':
        if (item.eventType.includes('Call')) return { Icon: PhoneCall, circleBg: 'bg-[#EFF6F9] border border-[#D8E8EF] text-[#1D4E63]', badge: 'Outbound Call' };
        if (item.eventType.includes('Email')) return { Icon: Mail, circleBg: 'bg-[#EFF6F9] border border-[#D8E8EF] text-[#1D4E63]', badge: 'Email Communication' };
        if (item.eventType.includes('Meeting')) return { Icon: Calendar, circleBg: 'bg-[#F0F7F3] border border-[#BCDBC9] text-[#255B40]', badge: 'Meeting' };
        if (item.eventType.includes('Sample')) return { Icon: Package, circleBg: 'bg-[#FEF8EC] border border-[#F5DDA9] text-[#965700]', badge: 'Sample Trial' };
        if (item.eventType.includes('Note')) return { Icon: FileText, circleBg: 'bg-[#FEF8EC] border border-[#F5DDA9] text-[#965700]', badge: 'Internal Note' };
        return { Icon: FileText, circleBg: 'bg-[#F6F7F8] border border-[#E3E6EA] text-[#5B6472]', badge: 'Logged Activity' };
      case 'note':
        return { Icon: FileText, circleBg: 'bg-[#FEF8EC] border border-[#F5DDA9] text-[#965700]', badge: 'Internal Note' };
      case 'task':
        if (item.eventType.includes('Approval')) {
          return { Icon: ShieldCheck, circleBg: 'bg-[#EFF6F9] border border-[#D8E8EF] text-[#1D4E63]', badge: 'Stage Gate Review' };
        }
        return { Icon: CheckSquare, circleBg: 'bg-[#F0F7F3] border border-[#BCDBC9] text-[#255B40]', badge: 'Follow-up Task' };
      case 'stage_gate':
        return { Icon: ShieldCheck, circleBg: 'bg-[#EFF6F9] border border-[#D8E8EF] text-[#1D4E63]', badge: 'Stage Gate Evaluation' };
      case 'audit':
        if (item.eventType.includes('Stage')) return { Icon: ArrowRight, circleBg: 'bg-[#EFF6F9] border border-[#D8E8EF] text-[#1D4E63]', badge: 'Stage Advancement' };
        if (item.eventType.includes('Value')) return { Icon: DollarSign, circleBg: 'bg-[#F0F7F3] border border-[#BCDBC9] text-[#255B40]', badge: 'Deal Value Update' };
        return { Icon: Clock, circleBg: 'bg-[#F6F7F8] border border-[#E3E6EA] text-[#5B6472]', badge: 'System Audit' };
      default:
        return { Icon: Clock, circleBg: 'bg-[#F6F7F8] border border-[#E3E6EA] text-[#5B6472]', badge: 'System Event' };
    }
  };

  const guidanceInfo = STAGE_GUIDANCE_MAP[selectedStageObj?.name || currentActualStage.name] || {
    guidance: 'Complete key stage requirements to advance this lead through the sales pipeline.',
    keyQuestions: ['Confirm next steps with the customer', 'Update deal value and close date']
  };

  return (
    <div className="p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 bg-[#F6F7F8] min-h-screen text-[#12161C] font-sans">

      {/* ============================================================ */}
      {/* 1. SEAMLESS CRM SUMMARY PANEL (HEADER)                       */}
      {/* ============================================================ */}
      <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4 sm:space-y-5">

        {/* Top Breadcrumb & Actions Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E3E6EA] pb-5">

          {/* Left: Entity Badge, Breadcrumb, Lead Title */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF] flex items-center justify-center shrink-0 shadow-2xs">
              <UserCheck className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs text-[#5B6472] font-semibold flex-wrap">
                <button
                  onClick={onBack}
                  className="hover:text-[#1D4E63] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#1D4E63]" />
                  <span>Leads</span>
                </button>
                <span className="text-[#CAD2DB]">•</span>
                <span className="uppercase tracking-wider font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF]">
                  {lead.isOutbound ? 'Cold Outbound Effort' : 'Inbound Inquiry'}
                </span>
                <span className="text-[#CAD2DB]">•</span>
                <span className="text-[11px] text-[#5B6472]">Lead Journey Console</span>
              </div>

              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <h1 className="font-display text-2xl md:text-3xl font-extrabold text-[#12161C] tracking-tight">
                  {lead.title}
                </h1>
                {lead.companyName && (
                  <span className="text-xs font-semibold text-[#1D4E63] flex items-center gap-1.5 bg-[#EFF6F9] px-3 py-1 rounded-full border border-[#D8E8EF]">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{lead.companyName}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions Styled with Native CRM Tokens */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={onBack}
              className="px-3.5 py-2 bg-[#FFFFFF] hover:bg-[#F6F7F8] text-[#12161C] border border-[#E3E6EA] rounded-xl font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#1D4E63]" />
              <span>Back to Ledger</span>
            </button>

            <button
              onClick={() => onOpenDrawer && onOpenDrawer('lead', lead)}
              className="px-3.5 py-2 bg-[#EFF6F9] hover:bg-[#D8E8EF] text-[#1D4E63] border border-[#D8E8EF] rounded-xl font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Open full 360 record drawer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#1D4E63]" />
              <span>Open Lead 360</span>
            </button>

            <button
              onClick={() => {
                setTargetStageId(currentActualStage.id);
                setStageTransitionNote('');
                setIsStageModalOpen(true);
              }}
              className="px-4 py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white rounded-xl font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-white" />
              <span>Change Stage</span>
            </button>
          </div>
        </div>

        {/* CRM Key Fields Ribbon (6 Responsive Cards Matching CRM Design System) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Lead Status */}
          <div className="bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-3 space-y-1">
            <span className="text-[10px] font-mono text-[#5B6472] uppercase tracking-wider block font-bold">Lead Status</span>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${lead.status === 'Qualified' || lead.status === 'Converted'
                ? 'bg-[#F0F7F3] text-[#255B40] border-[#BCDBC9]'
                : lead.status === 'Unqualified'
                  ? 'bg-[#FDF2F1] text-[#922D27] border-[#F4C4C1]'
                  : 'bg-[#EFF6F9] text-[#1D4E63] border-[#D8E8EF]'
              }`}>
              {lead.status || 'New'}
            </span>
          </div>

          {/* 2. Pipeline Stage */}
          <div className="bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-3 space-y-1">
            <span className="text-[10px] font-mono text-[#5B6472] uppercase tracking-wider block font-bold">Pipeline Stage</span>
            <div className="flex items-center gap-1.5 font-bold text-xs text-[#1D4E63] truncate">
              <span className="w-2 h-2 rounded-full bg-[#1D4E63] animate-pulse shrink-0" />
              <span className="truncate">{currentActualStage.name}</span>
            </div>
          </div>

          {/* 3. Lead Owner */}
          <div className="bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-3 space-y-1">
            <span className="text-[10px] font-mono text-[#5B6472] uppercase tracking-wider block font-bold">Lead Owner</span>
            <div className="flex items-center gap-1.5 font-bold text-xs text-[#12161C] truncate">
              <div className="w-4 h-4 rounded-full bg-[#1D4E63] text-white text-[9px] font-extrabold flex items-center justify-center shrink-0">
                {lead.ownerName ? lead.ownerName.charAt(0) : 'U'}
              </div>
              <span className="truncate">{lead.ownerName || 'Unassigned'}</span>
            </div>
          </div>

          {/* 4. Estimated Value */}
          <div className="bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-3 space-y-1">
            <span className="text-[10px] font-mono text-[#5B6472] uppercase tracking-wider block font-bold">Estimated Value</span>
            <span className="font-mono font-bold text-xs text-[#255B40] block truncate">
              {linkedDeal?.value ? `₹${Number(linkedDeal.value).toLocaleString('en-IN')}` : '₹0'}
            </span>
          </div>

          {/* 5. Contact Email */}
          <div className="bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-3 space-y-1">
            <span className="text-[10px] font-mono text-[#5B6472] uppercase tracking-wider block font-bold">Contact Email</span>
            <span className="font-mono text-[11px] text-[#12161C] truncate block" title={lead.contactEmail || ''}>
              {lead.contactEmail || 'No email registered'}
            </span>
          </div>

          {/* 6. Phone */}
          <div className="bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-3 space-y-1">
            <span className="text-[10px] font-mono text-[#5B6472] uppercase tracking-wider block font-bold">Contact Phone</span>
            <span className="font-mono text-[11px] text-[#12161C] truncate block">
              {lead.contactPhone || 'No phone registered'}
            </span>
          </div>
        </div>

      </div>

      {/* ============================================================ */}
      {/* 2. SIGNATURE INTERLOCKING CHEVRON STAGE PATH (FULL BAR)       */}
      {/* ============================================================ */}
      <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">

        {/* Mobile Swipe Hint */}
        <div className="flex items-center justify-between text-[11px] text-[#5B6472] font-semibold md:hidden px-1">
          <span>Stage Milestones</span>
          <span className="text-[#1D4E63] font-mono text-[10px] font-bold">Swipe to inspect ➔</span>
        </div>

        {/* Full-Width Interlocking Chevron Arrow Track */}
        <div className="w-full overflow-x-auto no-scrollbar scroll-smooth py-1">
          <div className="flex items-center w-full min-w-[760px] bg-[#EEF0F3] p-1 rounded-2xl">
            {hybridPathStages.map((stage, idx) => {
              const status = getStageStatus(stage);
              const isSelected = selectedStageId === stage.id || (stage.isTarget && selectedStageId === stage.id);
              const isActualCurrent = stage.id === currentActualStage.id || (stage.isTarget && (isWon || isLost));
              const count = stageActivityCounts[stage.id] || 0;
              const isOffRamp = status === 'off_ramp';

              const isFirst = idx === 0;
              const isLast = idx === hybridPathStages.length - 1;

              // True interlocking chevron geometry with seamless overlap
              const clipStyle = isFirst
                ? 'polygon(0% 0%, calc(100% - 13px) 0%, 100% 50%, calc(100% - 13px) 100%, 0% 100%)'
                : isLast
                  ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 13px 50%)'
                  : 'polygon(0% 0%, calc(100% - 13px) 0%, 100% 50%, calc(100% - 13px) 100%, 0% 100%, 13px 50%)';

              // Stage interactability: upcoming stages cannot be inspected
              const isUpcoming = status === 'upcoming';
              const isInteractable = !isUpcoming;

              // Website Theme Tokens
              let chevronBg = 'bg-[#FFFFFF] text-[#5B6472] hover:bg-[#F8F9FA] hover:text-[#12161C]';
              let iconElement = (
                <span className="w-4 h-4 rounded-full bg-[#F6F7F8] border border-[#CAD2DB] text-[9px] font-mono flex items-center justify-center font-bold text-[#5B6472] shrink-0">
                  {idx + 1}
                </span>
              );

              if (isUpcoming) {
                // Future stages — neutral, muted, not interactable
                chevronBg = 'bg-[#F0F1F3] text-[#A8B2BD] cursor-not-allowed opacity-60';
                iconElement = (
                  <span className="w-4 h-4 rounded-full bg-[#E3E6EA] border border-[#CAD2DB] text-[9px] font-mono flex items-center justify-center font-bold text-[#A8B2BD] shrink-0">
                    {idx + 1}
                  </span>
                );
              } else if (isOffRamp) {
                chevronBg = 'bg-[#FEF8EC] text-[#965700] hover:bg-[#FDF0D5] font-bold';
                iconElement = (
                  <AlertTriangle className="w-3.5 h-3.5 text-[#965700] shrink-0" />
                );
              } else if (status === 'completed') {
                chevronBg = 'bg-[#F0F7F3] text-[#255B40] hover:bg-[#E2F2E9]';
                iconElement = (
                  <span className="w-4 h-4 rounded-full bg-[#255B40] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                );
              } else if (status === 'current') {
                chevronBg = 'bg-[#1D4E63] text-white font-extrabold hover:bg-[#153B4B] shadow-sm';
                iconElement = (
                  <Loader2 className="w-3.5 h-3.5 text-white shrink-0 animate-spin" />
                );
              } else if (status === 'closed_won') {
                chevronBg = 'bg-[#255B40] text-white font-extrabold shadow-sm hover:bg-[#1C4731]';
                iconElement = <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />;
              } else if (status === 'closed_lost') {
                chevronBg = 'bg-[#922D27] text-white font-extrabold shadow-sm hover:bg-[#7D2620]';
                iconElement = <XCircle className="w-3.5 h-3.5 text-white shrink-0" />;
              } else if (stage.isTarget && !isWon && !isLost) {
                // In-flight "Closed" target — neutral colour, flag icon
                chevronBg = 'bg-[#FFFFFF] text-[#5B6472] hover:bg-[#F8F9FA] hover:text-[#12161C]';
                iconElement = (
                  <Flag className="w-3.5 h-3.5 text-[#5B6472] shrink-0" />
                );
              }

              return (
                <button
                  key={stage.id}
                  disabled={isUpcoming}
                  onClick={() => {
                    if (isUpcoming) return;
                    if (stage.isTarget) {
                      const actualTerminal = isWon
                        ? sortedStages.find(s => s.category === 'Won')
                        : isLost
                          ? sortedStages.find(s => s.category === 'Lost')
                          : stage;
                      setSelectedStageId(actualTerminal?.id || stage.id);
                    } else {
                      setSelectedStageId(stage.id);
                    }
                  }}
                  style={{ clipPath: clipStyle }}
                  className={`relative flex-1 min-w-[105px] h-11 px-3 flex items-center justify-center gap-1.5 sm:gap-2 font-bold text-xs transition-all select-none shrink-0 ${
                    isUpcoming ? 'cursor-not-allowed' : 'cursor-pointer'
                  } ${chevronBg} ${!isFirst ? '-ml-2.5' : 'rounded-l-xl'
                    } ${isLast ? 'rounded-r-xl' : ''} ${isSelected && isInteractable ? 'ring-2 ring-offset-1 ring-[#1D4E63] z-20 brightness-95' : 'z-10'
                    }`}
                  title={
                    isUpcoming
                      ? `${stage.name} — not yet reached`
                      : isOffRamp
                        ? `Deal dropped off at ${stage.name}`
                        : `Click to inspect ${stage.name} history`
                  }
                >
                  {iconElement}
                  <span className="truncate">{stage.name}</span>
                  {isOffRamp && (
                    <span className="hidden sm:inline-block text-[8px] font-mono px-1 py-0.2 rounded font-extrabold bg-[#F5DDA9] text-[#965700] uppercase">
                      Exit
                    </span>
                  )}
                  {count > 0 && !isOffRamp && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-extrabold ${status === 'current' || status === 'closed_won' || status === 'closed_lost'
                        ? 'bg-white/20 text-white'
                        : 'bg-black/5 text-[#5B6472]'
                      }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Off-Ramp Diagnostic Banner for Closed Lost Deals */}
        {isLost && offRampStageInfo && (
          <div className="bg-[#FEF8EC] border border-[#F5DDA9] rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-[#965700] shadow-2xs flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#965700] shrink-0" />
              <div>
                <span className="font-bold">Deal Closed Lost at {offRampStageInfo.stageName}</span>
                {offRampStageInfo.reason && (
                  <span className="text-[11px] text-[#965700]/90 ml-2">
                    • Loss Reason: <strong>{offRampStageInfo.reason}</strong>
                  </span>
                )}
              </div>
            </div>
            {offRampStageInfo.note && (
              <span className="text-[11px] text-[#5B6472] italic truncate max-w-xs hidden md:block">
                "{offRampStageInfo.note}"
              </span>
            )}
          </div>
        )}

        {/* Automated Repeat Replenishment Banner for Closed Won Deals */}
        {isWon && (
          <div className="bg-[#F0F7F3] border border-[#BCDBC9] rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-[#255B40] shadow-2xs flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#255B40] shrink-0" />
              <div>
                <span className="font-bold">Deal Won & Converted Successfully</span>
                <span className="hidden sm:inline text-[11px] text-[#255B40]/80 ml-2">
                  • Automated {linkedDeal?.recurrenceDays || 60}-day repeat replenishment cycle active
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#255B40] text-white">
                Replenishment Cycle (~{linkedDeal?.recurrenceDays || 60}d)
              </span>
            </div>
          </div>
        )}

        {/* Sub-bar: Journey Filters + Historical Read-only Indicator */}
        <div className="flex items-center justify-between text-xs pt-3 border-t border-[#E3E6EA] flex-wrap gap-2 text-[#5B6472]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#12161C]">Viewing:</span>
            <strong className="text-[#1D4E63] font-bold">
              {selectedStageId === 'ALL'
                ? 'All Stages (Full Customer Journey)'
                : selectedStageId === 'UNASSIGNED'
                  ? 'Stage Not Recorded'
                  : selectedStageObj?.name}
            </strong>

            {selectedStageObj && selectedStageObj.id !== currentActualStage.id && selectedStageId !== 'ALL' && selectedStageId !== 'UNASSIGNED' && (
              <span className="text-[10px] font-mono bg-[#FEF8EC] text-[#965700] border border-[#F5DDA9] px-2 py-0.5 rounded-full font-bold">
                Historical Review (Lead is currently in {currentActualStage.name})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedStageId('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer border transition-colors ${selectedStageId === 'ALL'
                  ? 'bg-[#1D4E63] text-white border-[#1D4E63] shadow-2xs'
                  : 'bg-[#FFFFFF] text-[#5B6472] border-[#E3E6EA] hover:bg-[#F6F7F8]'
                }`}
            >
              All History ({stageActivityCounts.ALL})
            </button>

            {stageActivityCounts.UNASSIGNED > 0 && (
              <button
                onClick={() => setSelectedStageId('UNASSIGNED')}
                className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer border transition-colors ${selectedStageId === 'UNASSIGNED'
                    ? 'bg-[#965700] text-white border-[#965700] shadow-2xs'
                    : 'bg-[#FEF8EC] text-[#965700] border-[#F5DDA9]'
                  }`}
              >
                Unassigned ({stageActivityCounts.UNASSIGNED})
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ============================================================ */}
      {/* 3. GUIDANCE FOR SUCCESS (ASSISTANT PANEL)                     */}
      {/* ============================================================ */}
      <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl shadow-2xs overflow-hidden">
        <button
          onClick={() => setIsGuidanceOpen(!isGuidanceOpen)}
          className="w-full px-5 py-3.5 bg-[#FFFFFF] hover:bg-[#F6F7F8] border-b border-[#E3E6EA] flex items-center justify-between font-bold text-xs text-[#12161C] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF] flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#1D4E63]" />
            </div>
            <div className="text-left">
              <span className="font-display font-bold text-xs text-[#12161C]">
                Guidance for Success — {selectedStageObj?.name || currentActualStage.name}
              </span>
              <span className="hidden sm:inline text-[11px] text-[#5B6472] font-normal ml-2">
                • Stage objectives & execution checklist
              </span>
            </div>
          </div>
          {isGuidanceOpen ? (
            <div className="flex items-center gap-1 text-[11px] text-[#5B6472]">
              <span>Hide</span>
              <ChevronUp className="w-4 h-4" />
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-[#5B6472]">
              <span>Show</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          )}
        </button>

        {isGuidanceOpen && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-[#FAFCFD]">
            <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl p-4 space-y-2 shadow-2xs">
              <span className="text-[10px] uppercase font-mono font-bold text-[#1D4E63] tracking-wider block">
                Sales Best Practices
              </span>
              <p className="text-[#12161C] font-medium leading-relaxed">
                {guidanceInfo.guidance}
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl p-4 space-y-2 shadow-2xs">
              <span className="text-[10px] uppercase font-mono font-bold text-[#255B40] tracking-wider block">
                Stage Checklist
              </span>
              <ul className="space-y-2">
                {guidanceInfo.keyQuestions.map((q, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-[#12161C] font-medium">
                    <span className="w-4 h-4 rounded-full bg-[#F0F7F3] text-[#255B40] border border-[#BCDBC9] flex items-center justify-center shrink-0 text-[10px] font-bold">
                      ✓
                    </span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 4. MAIN TWO-COLUMN WORKSPACE                                 */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT 2 COLUMNS: ACTIVITY COMPOSER & TIMELINE                */}
        <div className="lg:col-span-2 space-y-5">

          {/* Activity Composer Card */}
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl shadow-2xs overflow-hidden">

            {/* Segmented Composer Tabs */}
            <div className="flex items-center gap-1.5 p-2 bg-[#F6F7F8] border-b border-[#E3E6EA] overflow-x-auto no-scrollbar">
              {[
                { id: 'Call', label: 'Log a Call', icon: PhoneCall },
                { id: 'Task', label: 'New Task', icon: CheckSquare },
                { id: 'Email', label: 'Email', icon: Mail },
                { id: 'Event', label: 'New Event', icon: Calendar },
                { id: 'Note', label: 'Add Note', icon: FileText }
              ].map(tab => {
                const Icon = tab.icon;
                const isSelected = composerTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setComposerTab(tab.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${isSelected
                        ? 'bg-[#FFFFFF] text-[#1D4E63] shadow-2xs border border-[#E3E6EA]'
                        : 'text-[#5B6472] hover:text-[#12161C] hover:bg-[#FFFFFF]/50'
                      }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#1D4E63]' : 'text-[#5B6472]'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Composer Form Body */}
            <form onSubmit={handleComposerSubmit} className="p-5 space-y-4">
              {/* Subject / Title */}
              <div>
                <input
                  type="text"
                  value={composerSubject}
                  onChange={(e) => setComposerSubject(e.target.value)}
                  placeholder={
                    composerTab === 'Call'
                      ? 'Call Subject: e.g. Discussed sample feedback with client'
                      : composerTab === 'Task'
                        ? 'Task Subject: e.g. Send revised spec sheets'
                        : composerTab === 'Email'
                          ? 'Email Subject: e.g. Quotation follow-up'
                          : composerTab === 'Event'
                            ? 'Event: e.g. Technical walkthrough meeting'
                            : 'Note Title: e.g. Client budget notes'
                  }
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl px-3.5 py-2.5 text-xs text-[#12161C] placeholder-[#5B6472] focus:outline-none focus:border-[#1D4E63] focus:ring-1 focus:ring-[#1D4E63]"
                />
              </div>

              {/* Body / Comments */}
              <div>
                <textarea
                  rows={2}
                  required={composerTab !== 'Task'}
                  value={composerDescription}
                  onChange={(e) => setComposerDescription(e.target.value)}
                  placeholder={
                    composerTab === 'Call'
                      ? 'Call comments, call outcome, client objections, commitments...'
                      : composerTab === 'Task'
                        ? 'Task instructions and details...'
                        : 'Details...'
                  }
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-3 text-xs text-[#12161C] placeholder-[#5B6472] focus:outline-none focus:border-[#1D4E63] focus:ring-1 focus:ring-[#1D4E63]"
                />
              </div>

              {/* Performer, Assignee, Due Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                <div>
                  <label className="block text-[10px] font-mono text-[#5B6472] uppercase font-bold mb-1">Assigned To</label>
                  <select
                    value={composerAssignedId}
                    onChange={(e) => setComposerAssignedId(e.target.value)}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#5B6472] uppercase font-bold mb-1">Performed By</label>
                  <select
                    value={composerPerformerId}
                    onChange={(e) => setComposerPerformerId(e.target.value)}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#5B6472] uppercase font-bold mb-1">Due Date</label>
                  <input
                    type="date"
                    value={composerDueDate}
                    onChange={(e) => setComposerDueDate(e.target.value)}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                  />
                </div>
              </div>

              {/* Save Button Row */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E3E6EA]">
                <span className="text-[11px] text-[#5B6472]">
                  Tagging to stage: <strong className="text-[#1D4E63]">{selectedStageObj?.name || currentActualStage.name}</strong>
                </span>

                <button
                  type="submit"
                  disabled={isSubmittingComposer}
                  className="px-5 py-2.5 bg-[#1D4E63] hover:bg-[#153B4B] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingComposer ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                  <span>Save {composerTab}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Upcoming & Overdue Tasks Section */}
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl shadow-2xs overflow-hidden">
            <button
              onClick={() => setIsUpcomingOpen(!isUpcomingOpen)}
              className="w-full px-5 py-3 bg-[#FFFFFF] hover:bg-[#F6F7F8] border-b border-[#E3E6EA] flex items-center justify-between font-bold text-xs text-[#12161C] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#965700]" />
                <span>Upcoming & Overdue Work ({pendingTasks.length})</span>
              </div>
              {isUpcomingOpen ? <ChevronUp className="w-4 h-4 text-[#5B6472]" /> : <ChevronDown className="w-4 h-4 text-[#5B6472]" />}
            </button>

            {isUpcomingOpen && (
              <div className="p-4 divide-y divide-[#E3E6EA]">
                {pendingTasks.length === 0 ? (
                  <div className="py-4 text-center text-xs text-[#5B6472] flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#255B40]" />
                    <span>No upcoming tasks overdue. Everything is on schedule.</span>
                  </div>
                ) : (
                  pendingTasks.map(task => {
                    const isOverdue = task.metadata?.dueDate && new Date(task.metadata.dueDate) < new Date();
                    return (
                      <div key={task.id} className="py-3 flex items-start justify-between gap-3 group">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleToggleTaskStatus(task)}
                            className="mt-0.5 w-4 h-4 rounded border border-[#E3E6EA] hover:border-[#255B40] flex items-center justify-center transition-colors cursor-pointer"
                            title="Mark task completed"
                          >
                            <span className="hidden group-hover:block text-[#255B40] text-[10px]">✓</span>
                          </button>

                          <div>
                            <div className="font-bold text-xs text-[#12161C] flex items-center gap-2 flex-wrap">
                              <span>{task.title}</span>
                              {isOverdue && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#FDF2F1] text-[#922D27] font-bold border border-[#F4C4C1]">
                                  OVERDUE
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#5B6472] flex items-center gap-3 mt-1 font-mono">
                              <span>Due: {task.metadata?.dueDate ? formatDate(task.metadata.dueDate) : 'No due date'}</span>
                              <span>•</span>
                              <span>Assigned to: <strong className="text-[#12161C]">{task.assignedToName || task.authorName}</strong></span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleTaskStatus(task)}
                          className="px-3 py-1 bg-[#FFFFFF] hover:bg-[#F6F7F8] text-[#1D4E63] border border-[#E3E6EA] rounded-lg text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                        >
                          Complete
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Activity History Timeline Stream */}
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl shadow-2xs p-5 space-y-4">

            {/* Timeline Header & Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-[#E3E6EA]">
              <div className="font-bold text-xs text-[#12161C] flex items-center gap-2">
                <History className="w-4 h-4 text-[#1D4E63]" />
                <span>Activity History</span>
                <span className="text-[10px] font-mono text-[#5B6472] bg-[#F6F7F8] px-2 py-0.5 rounded-full font-bold">
                  {filteredTimelineItems.length}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search history..."
                  className="flex-1 sm:w-48 bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl px-3 py-1.5 text-xs text-[#12161C] placeholder-[#5B6472] focus:outline-none focus:border-[#1D4E63]"
                />

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl px-3 py-1.5 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
                >
                  <option value="ALL">All Types</option>
                  <option value="call">Calls</option>
                  <option value="email">Emails</option>
                  <option value="task">Tasks</option>
                  <option value="meeting">Meetings</option>
                  <option value="note">Notes</option>
                  <option value="stage">Stage Changes</option>
                </select>
              </div>
            </div>

            {/* Items List */}
            {loadingTimeline ? (
              <div className="p-8 text-center text-[#5B6472] space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#1D4E63]" />
                <p className="font-semibold text-xs">Loading activity timeline...</p>
              </div>
            ) : filteredTimelineItems.length === 0 ? (
              <div className="p-8 text-center bg-[#F6F7F8] border border-dashed border-[#E3E6EA] rounded-2xl text-[#5B6472] space-y-2">
                <FileText className="w-6 h-6 mx-auto text-[#5B6472]/50" />
                <p className="font-bold text-xs text-[#12161C]">No activities recorded in this view</p>
                <p className="text-[11px]">Use the activity tabs above to log calls, emails, or tasks for this lead.</p>
              </div>
            ) : (
              <div className="relative pl-7 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E3E6EA]">
                {filteredTimelineItems.map(item => {
                  const { Icon, circleBg, badge } = getItemVisuals(item);
                  const isExpanded = !!expandedItems[item.id];
                  const hasLongText = item.description && item.description.length > 150;

                  return (
                    <div key={item.id} className="relative group">
                      {/* Icon Bullet */}
                      <div className={`absolute -left-7 top-1.5 w-6 h-6 rounded-full ${circleBg} flex items-center justify-center shadow-2xs z-10`}>
                        <Icon className="w-3 h-3" />
                      </div>

                      {/* Card */}
                      <div className="bg-[#FFFFFF] border border-[#E3E6EA] hover:border-[#CAD2DB] rounded-2xl p-4 shadow-2xs space-y-2 transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-[#12161C]">
                                {item.title}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F6F7F8] text-[#5B6472] border border-[#E3E6EA] font-semibold">
                                {badge}
                              </span>
                              {item.stageLabel && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF] font-bold">
                                  {item.stageLabel}
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-[#5B6472] mt-1 flex items-center gap-2 flex-wrap">
                              <span>Done by: <strong className="text-[#12161C]">{item.performedByName || item.authorName}</strong></span>
                              {item.assignedToName && item.assignedToName !== item.performedByName && (
                                <>
                                  <span>•</span>
                                  <span>Assigned to: <strong className="text-[#12161C]">{item.assignedToName}</strong></span>
                                </>
                              )}
                            </div>
                          </div>

                          <span className="text-[10px] font-mono text-[#5B6472] shrink-0">
                            {formatDate(item.timestamp)}
                          </span>
                        </div>

                        {/* Description */}
                        {item.description && (
                          <div className="text-xs text-[#5B6472] leading-relaxed whitespace-pre-wrap pt-1 border-t border-[#F6F7F8]">
                            {hasLongText && !isExpanded ? (
                              <>
                                {item.description.slice(0, 150)}...
                                <button
                                  onClick={() => toggleExpand(item.id)}
                                  className="ml-1 text-[#1D4E63] font-bold hover:underline cursor-pointer"
                                >
                                  More
                                </button>
                              </>
                            ) : (
                              <>
                                {item.description}
                                {hasLongText && (
                                  <button
                                    onClick={() => toggleExpand(item.id)}
                                    className="ml-1 text-[#1D4E63] font-bold hover:underline cursor-pointer"
                                  >
                                    Less
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* Stage Transition Note if present */}
                        {(item.fromStageName || item.toStageName || item.metadata?.fromStage) && (
                          <div className="bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[11px] font-mono flex items-center gap-2 flex-wrap text-[#12161C]">
                            <span className="text-[#5B6472]">Transition:</span>
                            <span>{item.fromStageName || item.metadata?.fromStage || 'Initial'}</span>
                            <ArrowRight className="w-3 h-3 text-[#1D4E63]" />
                            <strong className="text-[#1D4E63]">{item.toStageName || item.metadata?.toStage || item.stageName}</strong>
                            {item.metadata?.reason && (
                              <span className="text-[#5B6472] text-[10px] block w-full mt-0.5">
                                Reason: {item.metadata.reason}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT 1 COLUMN: RECORD DETAILS & COLLABORATORS              */}
        <div className="space-y-5">

          {/* Lead Details Card */}
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-xs text-[#12161C] flex items-center gap-1.5 uppercase font-mono tracking-wider">
              <Info className="w-3.5 h-3.5 text-[#1D4E63]" />
              <span>Lead Information</span>
            </h3>

            <div className="space-y-2.5 text-xs divide-y divide-[#F6F7F8]">
              <div className="flex items-center justify-between pt-1">
                <span className="text-[#5B6472]">Company</span>
                <span className="font-bold text-[#12161C]">{lead.companyName || 'Unlinked'}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#5B6472]">Contact Name</span>
                <span className="font-bold text-[#12161C]">{lead.contactName || 'Unassigned'}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#5B6472]">Lead Source</span>
                <span className="font-bold text-[#12161C]">{lead.source || 'Website'}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#5B6472]">Pipeline Type</span>
                <span className="font-mono text-[#12161C] font-semibold">{lead.isOutbound ? 'Cold Outbound' : 'Inbound'}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#5B6472]">Created Date</span>
                <span className="font-mono text-[#5B6472]">{formatDate(lead.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#5B6472]">Last Activity</span>
                <span className="font-mono text-[#5B6472]">{formatDate(lead.lastActivityDate)}</span>
              </div>
            </div>
          </div>

          {/* Opportunity / Deal Link Card */}
          {linkedDeal && (
            <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl p-5 shadow-2xs space-y-3">
              <h3 className="font-bold text-xs text-[#12161C] flex items-center gap-1.5 uppercase font-mono tracking-wider">
                <DollarSign className="w-3.5 h-3.5 text-[#255B40]" />
                <span>Linked Opportunity</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="font-bold text-xs text-[#1D4E63] truncate">{linkedDeal.title}</div>
                <div className="flex items-center justify-between py-1 border-t border-[#F6F7F8]">
                  <span className="text-[#5B6472]">Deal Value</span>
                  <span className="font-mono font-bold text-[#255B40]">
                    ₹{Number(linkedDeal.value || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-t border-[#F6F7F8]">
                  <span className="text-[#5B6472]">Expected Close</span>
                  <span className="font-mono text-[#5B6472]">{formatDate(linkedDeal.expectedCloseDate)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-t border-[#F6F7F8]">
                  <span className="text-[#5B6472]">Recurring Order</span>
                  <span className="font-bold text-[#12161C]">{linkedDeal.isRecurring ? `Yes (${linkedDeal.recurrenceDays || 60}d)` : 'No'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Collaborators / Team Card */}
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="font-bold text-xs text-[#12161C] flex items-center gap-1.5 uppercase font-mono tracking-wider">
              <User className="w-3.5 h-3.5 text-[#1D4E63]" />
              <span>Sales Team & Ownership</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-[#1D4E63] text-white text-xs font-bold flex items-center justify-center shadow-2xs">
                    {lead.ownerName ? lead.ownerName.charAt(0) : 'U'}
                  </div>
                  <div>
                    <div className="font-bold text-[#12161C]">{lead.ownerName || 'Unassigned'}</div>
                    <div className="text-[10px] text-[#5B6472]">Record Owner</div>
                  </div>
                </div>
              </div>

              {currentUser && currentUser.name !== lead.ownerName && (
                <div className="flex items-center justify-between pt-2.5 border-t border-[#F6F7F8]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-[#255B40] text-white text-xs font-bold flex items-center justify-center shadow-2xs">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-[#12161C]">{currentUser.name}</div>
                      <div className="text-[10px] text-[#5B6472]">Active Contributor ({currentUser.role})</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ============================================================ */}
      {/* MODAL: DELIBERATE STAGE ADVANCE / TRANSITION                 */}
      {/* ============================================================ */}
      {isStageModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-[#12161C]">

            <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF] flex items-center justify-center shadow-2xs">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-[#12161C]">
                    Change Pipeline Stage
                  </h3>
                  <p className="text-[11px] text-[#5B6472]">
                    Current Stage: <strong className="text-[#1D4E63]">{currentActualStage.name}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsStageModalOpen(false)}
                className="text-[#5B6472] hover:text-[#12161C] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!targetStageId || targetStageId === currentActualStage.id) {
                  toast.info('Please select a different stage.');
                  return;
                }
                const stg = sortedStages.find(s => s.id === targetStageId);
                setIsSubmittingStage(true);
                try {
                  await handleStageTransition(stg);
                  setIsStageModalOpen(false);
                } finally {
                  setIsSubmittingStage(false);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-[#5B6472] font-semibold mb-1">Destination Stage *</label>
                <select
                  value={targetStageId}
                  onChange={(e) => setTargetStageId(e.target.value)}
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                >
                  {sortedStages.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.id === currentActualStage.id ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#5B6472] font-semibold mb-1">Reason / Transition Note</label>
                <textarea
                  rows={2}
                  value={stageTransitionNote}
                  onChange={(e) => setStageTransitionNote(e.target.value)}
                  placeholder="Reason for advancing or moving to this stage..."
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E3E6EA]">
                <button
                  type="button"
                  onClick={() => setIsStageModalOpen(false)}
                  className="px-4 py-2 border border-[#E3E6EA] text-[#5B6472] hover:bg-[#F6F7F8] font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStage || targetStageId === currentActualStage.id}
                  className="px-4 py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingStage ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                  <span>Confirm Stage Change</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

