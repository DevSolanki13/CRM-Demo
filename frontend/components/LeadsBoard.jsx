import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, CalendarDays, ChevronDown, Clock3, UserRound } from 'lucide-react';
import { formatCurrency, formatDate, getStageBadgeStyle } from '../utils/crmHelpers.js';
import { StageGateCheckModal } from './StageGateCheckModal.jsx';

function ageInDays(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((new Date().setHours(0, 0, 0, 0) - date.getTime()) / 86400000));
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U';
}

export function LeadsBoard({
  leads, stages, deals, users, currentUser, onOpenLeadJourney, onOpenDrawer,
  onTransitionDealStage, onSubmitStageGateCheck, onApproveStageGateCheck,
  onRejectStageGateCheck,
}) {
  const [stageMove, setStageMove] = useState(null);
  const topScrollRef = useRef(null);
  const boardScrollRef = useRef(null);
  const boardContentRef = useRef(null);
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false);
  const orderedStages = useMemo(() => [...stages].sort((a, b) => a.order - b.order), [stages]);
  const dealByLead = useMemo(() => {
    const map = new Map();
    for (const deal of deals) {
      if (!deal.leadId) continue;
      const existing = map.get(deal.leadId);
      if (!existing || (existing.isRebuy && !deal.isRebuy)) map.set(deal.leadId, deal);
    }
    return map;
  }, [deals]);
  const columns = useMemo(() => orderedStages.map(stage => {
    const items = leads.filter(lead => {
      const deal = dealByLead.get(lead.id) || lead.primaryDeal;
      const leadStage = deal?.stageId
        ? orderedStages.find(item => item.id === deal.stageId)
        : orderedStages.find(item => item.category === 'New' || item.name === 'New Lead');
      return leadStage?.id === stage.id;
    });
    return { stage, items };
  }), [orderedStages, leads, dealByLead]);

  useEffect(() => {
    const topScroll = topScrollRef.current;
    const boardScroll = boardScrollRef.current;
    const boardContent = boardContentRef.current;
    if (!topScroll || !boardScroll || !boardContent) return undefined;
    const updateTrack = () => {
      topScroll.firstElementChild.style.width = `${boardScroll.scrollWidth}px`;
      setHasHorizontalOverflow(boardScroll.scrollWidth > boardScroll.clientWidth + 1);
    };
    const syncToBoard = () => { boardScroll.scrollLeft = topScroll.scrollLeft; };
    const syncToTrack = () => { topScroll.scrollLeft = boardScroll.scrollLeft; };
    const observer = new ResizeObserver(updateTrack);
    observer.observe(boardScroll);
    observer.observe(boardContent);
    topScroll.addEventListener('scroll', syncToBoard, { passive: true });
    boardScroll.addEventListener('scroll', syncToTrack, { passive: true });
    updateTrack();
    return () => {
      observer.disconnect();
      topScroll.removeEventListener('scroll', syncToBoard);
      boardScroll.removeEventListener('scroll', syncToTrack);
    };
  }, [columns.length]);

  const submitStageCheck = async check => {
    const payload = {
      targetStageId: check.targetStageId,
      expectedStageId: check.fromStageId,
      user: currentUser,
      answers: check.answers || {},
      note: check.note || '',
      demotionReason: check.backwardReason,
      lostReason: check.lostReason,
    };
    if (check.status === 'approved_and_executed' || check.outcome === 'demoted') {
      await onTransitionDealStage(check.dealId, payload);
      setStageMove(null);
      return;
    }
    await onSubmitStageGateCheck?.(check);
    setStageMove(null);
  };

  return <>
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div ref={topScrollRef} hidden={!hasHorizontalOverflow} tabIndex={0} aria-label="Scroll lead stages horizontally"
        className="leads-board-scrollbar overflow-x-auto overflow-y-hidden border-b border-[var(--border)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]">
        <div className="h-3" />
      </div>
      <div ref={boardScrollRef} className="leads-board-viewport overflow-x-auto">
        <div ref={boardContentRef} className="flex min-h-[440px] w-max min-w-full items-stretch gap-3 p-3">
          {columns.map(({ stage, items }) => {
            const badge = getStageBadgeStyle(stage);
            const total = items.reduce((sum, lead) => {
              const deal = dealByLead.get(lead.id) || lead.primaryDeal;
              return sum + Number(lead.value ?? deal?.value ?? 0);
            }, 0);
            return <section key={stage.id} aria-label={`${stage.name}, ${items.length} leads`}
              className="flex max-h-[680px] min-h-[440px] w-[min(82vw,300px)] shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--canvas)]">
              <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3.5 py-3">
                <span className={`min-w-0 truncate rounded-full border px-2.5 py-1 text-[11px] font-bold ${badge.badgeClass}`}>{stage.name}</span>
                <span className="shrink-0 rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[10px] font-semibold text-[var(--ink-muted)]">{items.length}</span>
              </header>
              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5">
                {items.length ? items.map(lead => {
                  const deal = dealByLead.get(lead.id) || lead.primaryDeal;
                  const owner = users.find(user => user.id === lead.ownerId);
                  const ownerName = lead.ownerName || owner?.name || 'Unassigned';
                  const lastActive = ageInDays(lead.lastActivityDate || lead.lastContactedDate || lead.createdAt);
                  const followUp = lead.nextFollowUpDate;
                  const openLead = () => {
                    if (onOpenLeadJourney) onOpenLeadJourney(lead);
                    else onOpenDrawer?.('lead', lead);
                  };
                  const movableStages = orderedStages.filter(target => target.id !== deal?.stageId &&
                    (!deal?.pipelineId || !target.pipelineId || target.pipelineId === deal.pipelineId));
                  return <article key={lead.id} className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm">
                    {lastActive !== null && lastActive >= 10 && <p className="flex items-center gap-1 text-[10px] font-semibold text-amber-700"><Clock3 size={12} aria-hidden="true" />Inactive for {lastActive} days</p>}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button type="button" onClick={openLead} className="min-w-0 text-left text-sm font-bold leading-5 text-[var(--primary-700)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
                        {lead.title}
                      </button>
                      {lead.hasOverdueFollowUp && <span className="shrink-0 rounded-full border border-[#F4C4C1] bg-[#FDF2F1] px-2 py-0.5 text-[10px] font-bold text-[#922D27]">Overdue</span>}
                    </div>
                    <p className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--ink-muted)]"><Building2 size={13} className="shrink-0" aria-hidden="true" /><span className="truncate">{lead.companyName || 'Unlinked Company'}</span></p>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[var(--ink)]">{formatCurrency(lead.value ?? deal?.value ?? 0, lead.currency || deal?.currency || 'INR')}</span>
                      <span className="truncate text-[var(--ink-muted)]">{lead.source || 'Source unavailable'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-2.5">
                      <div className="flex min-w-0 items-center gap-2" title={ownerName}>
                        {owner?.avatarUrl ? <img src={owner.avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                          : <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">{initials(ownerName)}</span>}
                        <span className="truncate text-[11px] font-medium text-[var(--ink-muted)]">{ownerName}</span>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-[10px] text-[var(--ink-muted)]" title="Next follow-up">
                        <CalendarDays size={12} aria-hidden="true" />{followUp ? formatDate(followUp) : 'No follow-up'}
                      </span>
                    </div>
                    {deal && movableStages.length > 0 && <label className="relative flex items-center border-t border-[var(--border)] pt-2.5">
                      <span className="sr-only">Move {lead.title} to another stage</span>
                      <select aria-label={`Move ${lead.title} to stage`} value="" disabled={Boolean(deal.pendingGateCheck) || deal.status === 'Pending Review'}
                        onChange={event => {
                          const target = orderedStages.find(item => item.id === event.target.value);
                          const from = orderedStages.find(item => item.id === deal.stageId);
                          if (target && from) setStageMove({ deal, from, target });
                        }}
                        className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 pr-8 text-[11px] font-semibold text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50">
                        <option value="">Move to…</option>
                        {movableStages.map(target => <option key={target.id} value={target.id}>{target.name}</option>)}
                      </select>
                      <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-2.5 text-[var(--ink-muted)]" />
                    </label>}
                    {!deal && <p className="flex items-center gap-1.5 border-t border-[var(--border)] pt-2.5 text-[10px] text-[var(--ink-muted)]"><UserRound size={12} aria-hidden="true" />Convert to a deal to move stages</p>}
                  </article>;
                }) : <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]/70 px-3 py-8 text-center text-xs text-[var(--ink-muted)]">No leads</div>}
              </div>
              <footer className="sticky bottom-0 flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-xs">
                <span className="font-semibold text-[var(--ink-muted)]">Total</span>
                <span className="font-bold text-[var(--ink)]">{formatCurrency(total, items[0]?.currency || 'INR')}</span>
              </footer>
            </section>;
          })}
        </div>
      </div>
    </div>
    <StageGateCheckModal isOpen={Boolean(stageMove)} onClose={() => setStageMove(null)} deal={stageMove?.deal}
      fromStage={stageMove?.from} targetStage={stageMove?.target} currentUser={currentUser}
      onSubmitCheck={submitStageCheck} onApproveCheck={onApproveStageGateCheck} onRejectCheck={onRejectStageGateCheck} />
  </>;
}
