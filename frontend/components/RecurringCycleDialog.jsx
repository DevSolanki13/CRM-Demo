import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { fetchLeadRecurrence, updateLeadRecurrence, controlLeadRecurrence } from '../api/crmClient.js';
import { CYCLE_OUTCOMES, CLOSED_CYCLE_STATUSES, recurrenceLabel, shiftDate } from '../../shared/leadRecurrence.js';
import { getLocalDateInputValue, formatDate } from '../utils/crmHelpers.js';

const fieldClass = 'mt-1 w-full rounded-lg border border-[#E3E6EA] bg-white px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-[#1D4E63]';

export function RecurringCycleDialog({ lead, currentUser, onClose, onChanged }) {
  const dialog = useRef(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState('attempted');
  const [note, setNote] = useState('');
  const [nextActionDate, setNextActionDate] = useState(shiftDate(getLocalDateInputValue(), 1));
  const [expectedDate, setExpectedDate] = useState('');
  const [dealId, setDealId] = useState('');
  const [reason, setReason] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    dialog.current.showModal();
    const element = dialog.current;
    return () => element.close();
  }, []);
  useEffect(() => {
    let ignore = false;
    setError('');
    fetchLeadRecurrence(lead.id).then(result => { if (!ignore) { setData(result); setExpectedDate(result.current?.expectedDate || ''); } })
      .catch(err => { if (!ignore) setError(err.message); });
    return () => { ignore = true; };
  }, [lead.id, reload]);
  const closed = CLOSED_CYCLE_STATUSES.includes(outcome);
  const save = async event => {
    event.preventDefault();
    if (busy || !data?.current) return;
    setBusy(true); setError('');
    try {
      await updateLeadRecurrence(lead.id, { cycleId: data.current.id, expectedReviewedAt: data.current.reviewedAt,
        outcome, note, nextActionDate: closed ? null : nextActionDate,
        expectedDate: outcome === 'postponed' ? expectedDate : null, dealId: dealId || null });
      await onChanged(); onClose();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const control = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await controlLeadRecurrence(lead.id, { paused: !data.lead.recurrencePaused, reason });
      await onChanged(); onClose();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <dialog ref={dialog} aria-labelledby="recurrence-dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    className="m-auto max-h-[90dvh] w-[min(960px,94vw)] overflow-y-auto rounded-2xl border border-[#E3E6EA] bg-white p-0 text-[#12161C] shadow-xl backdrop:bg-black/40">
    <header className="flex items-start justify-between gap-4 border-b border-[#E3E6EA] p-5">
      <div><h2 id="recurrence-dialog-title" className="text-lg font-bold">Update cycle — {lead.title}</h2>
        <p className="mt-1 text-sm text-[#5B6472]">{recurrenceLabel(lead)} · {lead.ownerName || 'Unassigned'}</p></div>
      <button type="button" disabled={busy} onClick={onClose} aria-label="Close cycle update" className="rounded-lg p-2 hover:bg-[#F6F7F8]"><X size={20} /></button>
    </header>
    {error && <div role="alert" className="m-5 rounded-lg bg-[#FDF2F1] p-3 text-sm text-[#922D27]">{error} <button type="button" disabled={busy} onClick={() => setReload(value => value + 1)} className="underline">Reload cycle</button></div>}
    {!data ? <p role="status" className="p-5 text-sm">Loading cycle history…</p> : <div className="grid gap-6 p-5 md:grid-cols-2">
      <div className="space-y-4">
        <p className="text-sm">Expected purchase: <strong>{formatDate(data.current?.expectedDate || data.lead.nextRecurrenceDate)}</strong><br />
          Last monthly update: <strong>{formatDate(data.lead.lastRecurringReviewDate) || 'No update recorded'}</strong></p>
        {data.lead.recurrencePaused ? <p className="rounded-lg bg-[#FEF8EC] p-3 text-sm text-[#805500]">Schedule paused: {data.lead.recurrencePauseReason}. Existing overdue work is retained.</p>
          : data.current && <form onSubmit={save} className="space-y-4">
            <label className="block text-sm font-medium">Outcome<select className={fieldClass} value={outcome} onChange={event => setOutcome(event.target.value)}>
              {Object.entries(CYCLE_OUTCOMES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label className="block text-sm font-medium">Update notes<textarea className={fieldClass} rows={3} minLength={5} maxLength={5000} required value={note} onChange={event => setNote(event.target.value)} placeholder="What happened, and what is the next action?" /></label>
            {!closed && <label className="block text-sm font-medium">Next follow-up date<input className={fieldClass} type="date" min={getLocalDateInputValue()} required value={nextActionDate} onChange={event => setNextActionDate(event.target.value)} /></label>}
            {outcome === 'postponed' && <label className="block text-sm font-medium">New expected purchase date<input className={fieldClass} type="date" required value={expectedDate} onChange={event => setExpectedDate(event.target.value)} /></label>}
            {['confirmed', 'purchased'].includes(outcome) && <label className="block text-sm font-medium">Linked deal {outcome === 'purchased' ? '(won deal required)' : '(optional)'}<select className={fieldClass} required={outcome === 'purchased'} value={dealId} onChange={event => setDealId(event.target.value)}>
              <option value="">Choose a linked deal</option>{data.deals.filter(deal => outcome !== 'purchased' || deal.status === 'Won').map(deal => <option key={deal.id} value={deal.id}>{deal.title} — {deal.status}</option>)}
            </select><span className="mt-1 block text-xs text-[#5B6472]">Create and manage linked deals from the lead’s details or Pipeline.</span></label>}
            <p className="text-xs leading-relaxed text-[#5B6472]">Saving counts as this month’s review. Confirmation keeps the cycle open. Purchase received or Not buying closes this cycle and schedules the next one.</p>
            <button type="submit" disabled={busy} className="min-h-10 rounded-lg bg-[#1D4E63] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save cycle update'}</button>
          </form>}
        {['Admin', 'Manager'].includes(currentUser.role) && <fieldset className="space-y-2 border-t border-[#E3E6EA] pt-4">
          <legend className="text-sm font-semibold">Manager controls</legend>
          <label className="block text-sm">Reason to {data.lead.recurrencePaused ? 'resume' : 'pause'}<input className={fieldClass} minLength={5} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>
          <button type="button" disabled={busy || reason.trim().length < 5} onClick={control} className="min-h-10 rounded-lg border border-[#E3E6EA] px-3 text-sm font-semibold disabled:opacity-50">{data.lead.recurrencePaused ? 'Resume schedule' : 'Pause schedule'}</button>
        </fieldset>}
      </div>
      <div className="space-y-5 md:border-l md:border-[#E3E6EA] md:pl-5">
        <section><h3 className="text-sm font-bold">Recent updates</h3>{!data.activities.length && <p className="mt-2 text-sm text-[#5B6472]">No cycle updates yet.</p>}
          <ol className="mt-3 space-y-3">{data.activities.map(activity => <li key={activity.id} className="border-b border-[#E3E6EA] pb-3 text-sm">
            <p className="whitespace-pre-wrap">{activity.description}</p><p className="mt-1 text-xs text-[#5B6472]">{activity.authorName} · {formatDate(activity.timestamp?.slice(0, 10))}</p>
          </li>)}</ol>
        </section>
        <section><h3 className="text-sm font-bold">Purchase cycle history</h3><ol className="mt-3 space-y-2">{data.cycles.map(cycle => <li key={cycle.id} className="text-sm">
          <strong>{formatDate(cycle.expectedDate)}</strong> · {CYCLE_OUTCOMES[cycle.status] || 'Awaiting response'}
          {cycle.originalDate !== cycle.expectedDate && <span className="block text-xs text-[#5B6472]">Originally expected {formatDate(cycle.originalDate)}</span>}
        </li>)}</ol><p className="mt-3 text-xs text-[#5B6472]">Showing the latest 24 cycles and 30 updates. Full updates remain in the lead activity history.</p></section>
      </div>
    </div>}
  </dialog>;
}
