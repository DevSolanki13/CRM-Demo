import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { fetchLeadHistory, fetchRecurringFollowUp, submitRecurringFollowUp } from '../api/crmClient.js';
import { formatDate, getLocalDateInputValue, getLocalDateInputValueAfterDays } from '../utils/crmHelpers.js';

const fieldClass = 'mt-1 block w-full rounded-lg border border-[#E3E6EA] bg-[#F6F7F8] px-3 py-2 text-sm text-[#12161C] focus-visible:outline-2 focus-visible:outline-[#1D4E63]';

function dateInTimeZone(timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = type => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function RecurringFollowUpForm({ lead, followUpId, currentUser, onClose, onSaved }) {
  const [followUp, setFollowUp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    outcome: 'not_completed', dealValue: '', completionDate: '', updateText: '',
    currentStatus: 'In Progress', nextFollowUpDate: getLocalDateInputValueAfterDays(7),
    lostReason: '', notes: '',
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchRecurringFollowUp(lead.id, followUpId)
      .then(response => {
        if (cancelled) return;
        const record = response?.followUp;
        if (!record?.id) throw new Error('The server did not return this follow-up record.');
        setFollowUp(record);
        setForm(previous => ({
          ...previous,
          completionDate: dateInTimeZone(record.assigneeTimeZone),
        }));
      })
      .catch(requestError => { if (!cancelled) setError(requestError.message || 'Could not load this follow-up.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lead.id, followUpId]);

  const assignedToCurrentUser = followUp?.assigneeId === currentUser?.id;
  const canSubmit = assignedToCurrentUser && ['pending', 'overdue'].includes(followUp?.status);

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await submitRecurringFollowUp(lead.id, followUpId, {
        outcome: form.outcome,
        ...(form.outcome === 'completed' ? {
          dealValue: Number(form.dealValue),
          completionDate: form.completionDate,
        } : {
          updateText: form.updateText,
          currentStatus: form.currentStatus,
          nextFollowUpDate: form.nextFollowUpDate,
          ...(form.currentStatus === 'Lost' ? { lostReason: form.lostReason } : {}),
        }),
        notes: form.notes,
      });
      toast.success('Recurring follow-up submitted');
      onClose();
      try { await onSaved?.(); }
      catch (refreshError) { toast.error(refreshError.message || 'The follow-up was saved, but the lead view could not refresh.'); }
    } catch (requestError) {
      setError(requestError.message || 'Could not submit this follow-up.');
    } finally {
      setSaving(false);
    }
  };

  return <section aria-labelledby="recurring-follow-up-heading" className="rounded-xl border border-[#E3E6EA] bg-white p-4 sm:p-5 shadow-sm">
    <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#E3E6EA] pb-3">
      <div>
        <h2 id="recurring-follow-up-heading" className="text-base font-bold text-[#12161C]">Cycle {followUp?.cycleNumber ?? '—'} follow-up</h2>
        <p className="mt-1 text-sm text-[#5B6472]">Due {formatDate(followUp?.dueDate) || '—'} · Assigned to {followUp?.assigneeName || 'Unassigned'}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Close follow-up form" className="rounded-lg p-2 text-[#5B6472] hover:bg-[#F6F7F8] focus-visible:outline-2 focus-visible:outline-[#1D4E63]">
        <X size={18} aria-hidden="true" />
      </button>
    </div>

    {loading ? <p role="status" className="py-6 text-sm text-[#5B6472]">Loading follow-up…</p>
      : error && !followUp ? <p role="alert" className="rounded-lg border border-[#F4C4C1] bg-[#FDF2F1] p-3 text-sm text-[#922D27]">{error}</p>
        : <form onSubmit={handleSubmit} className="space-y-4">
          {!canSubmit && <p className="rounded-lg border border-[#E3E6EA] bg-[#F6F7F8] p-3 text-sm text-[#5B6472]">
            {followUp?.status === 'completed' ? 'This follow-up has already been submitted.'
              : followUp?.status === 'cancelled' ? 'This follow-up was cancelled.'
                : 'Only the assigned person can submit this follow-up.'}
          </p>}
          {followUp?.status === 'overdue' && <p className="inline-flex items-center gap-2 rounded-full bg-[#FDF2F1] px-3 py-1 text-xs font-bold text-[#922D27]"><AlertTriangle size={14} aria-hidden="true" />Overdue</p>}
          <fieldset disabled={!canSubmit || saving} className="space-y-4 disabled:opacity-70">
            <legend className="mb-2 text-sm font-semibold text-[#12161C]">Was the deal completed for this cycle?</legend>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="radio" name="outcome" value="completed" checked={form.outcome === 'completed'} onChange={event => setForm({ ...form, outcome: event.target.value })} />Deal Completed</label>
              <label className="flex items-center gap-2"><input type="radio" name="outcome" value="not_completed" checked={form.outcome === 'not_completed'} onChange={event => setForm({ ...form, outcome: event.target.value })} />Not Completed</label>
            </div>

            {form.outcome === 'completed' ? <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">Deal value *
                <input className={fieldClass} type="number" min="0" step="0.01" required value={form.dealValue} onChange={event => setForm({ ...form, dealValue: event.target.value })} />
              </label>
              <label className="text-sm font-semibold">Completion date *
                <input className={fieldClass} type="date" max={dateInTimeZone(followUp?.assigneeTimeZone)} required value={form.completionDate || dateInTimeZone(followUp?.assigneeTimeZone)} onChange={event => setForm({ ...form, completionDate: event.target.value })} />
              </label>
            </div> : <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold sm:col-span-2">Reason / update *
                <textarea className={fieldClass} rows={3} required maxLength={5000} value={form.updateText} onChange={event => setForm({ ...form, updateText: event.target.value })} />
              </label>
              <label className="text-sm font-semibold">Current status *
                <select className={fieldClass} required value={form.currentStatus} onChange={event => setForm({ ...form, currentStatus: event.target.value })}>
                  {['In Progress', 'On Hold', 'Customer Not Responding', 'Lost'].map(status => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold">Next follow-up date *
                <input className={fieldClass} type="date" min={getLocalDateInputValue()} required value={form.nextFollowUpDate} onChange={event => setForm({ ...form, nextFollowUpDate: event.target.value })} />
              </label>
              {form.currentStatus === 'Lost' && <label className="text-sm font-semibold sm:col-span-2">Lost reason *
                <textarea className={fieldClass} rows={2} required maxLength={2000} value={form.lostReason} onChange={event => setForm({ ...form, lostReason: event.target.value })} />
              </label>}
            </div>}

            <label className="block text-sm font-semibold">Notes (optional)
              <textarea className={fieldClass} rows={2} maxLength={5000} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} />
            </label>
          </fieldset>

          {error && <p role="alert" className="rounded-lg border border-[#F4C4C1] bg-[#FDF2F1] p-3 text-sm text-[#922D27]">{error}</p>}
          {canSubmit && <div className="flex justify-end">
            <button type="submit" disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#1D4E63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#153B4B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4E63] disabled:cursor-wait disabled:opacity-60">
              {saving ? <RefreshCw size={16} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
              Submit follow-up
            </button>
          </div>}
        </form>}
  </section>;
}

export function RecurringLeadHistory({ leadId }) {
  const [history, setHistory] = useState([]);
  const [cycle, setCycle] = useState('');
  const [outcome, setOutcome] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchLeadHistory(leadId, { cycleNumber: cycle, outcome })
      .then(rows => { if (!cancelled) setHistory(rows); })
      .catch(requestError => { if (!cancelled) setError(requestError.message || 'Could not load lead history.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [leadId, cycle, outcome]);

  const cycles = useMemo(() => [...new Set(history.map(item => item.cycleNumber).filter(Boolean))].sort((a, b) => a - b), [history]);

  const exportCsv = () => {
    const columns = ['cycleNumber', 'followUpCreatedAt', 'dueDate', 'completedAt', 'outcome', 'updateText', 'dealValue', 'statusFrom', 'statusTo', 'actorName', 'timestamp'];
    const rows = [columns, ...history.map(item => columns.map(key => item[key] ?? ''))];
    const csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `lead-${leadId}-history.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <section aria-labelledby="lead-history-heading" className="rounded-xl border border-[#E3E6EA] bg-white p-4 sm:p-5 shadow-sm">
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E3E6EA] pb-4">
      <div>
        <h2 id="lead-history-heading" className="text-base font-bold text-[#12161C]">Follow-up history</h2>
        <p className="mt-1 text-sm text-[#5B6472]">Append-only cycle updates, reminders, and assignment changes.</p>
      </div>
      <button type="button" onClick={exportCsv} disabled={loading || history.length === 0} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#E3E6EA] bg-white px-3 py-2 text-sm font-semibold text-[#1D4E63] hover:bg-[#F6F7F8] focus-visible:outline-2 focus-visible:outline-[#1D4E63] disabled:cursor-not-allowed disabled:opacity-50">
        <Download size={15} aria-hidden="true" />Export CSV
      </button>
      <label className="text-xs font-semibold text-[#5B6472]">Cycle
        <select className="ml-2 min-h-10 rounded-lg border border-[#E3E6EA] bg-[#F6F7F8] px-3 py-2 text-sm text-[#12161C]" value={cycle} onChange={event => setCycle(event.target.value)}>
          <option value="">All cycles</option>{cycles.map(number => <option key={number} value={number}>Cycle {number}</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold text-[#5B6472]">Outcome
        <select className="ml-2 min-h-10 rounded-lg border border-[#E3E6EA] bg-[#F6F7F8] px-3 py-2 text-sm text-[#12161C]" value={outcome} onChange={event => setOutcome(event.target.value)}>
          <option value="">All outcomes</option><option value="completed">Deal Completed</option><option value="not_completed">Not Completed</option><option value="overdue">Overdue</option>
        </select>
      </label>
    </div>

    {error && <p role="alert" className="mt-4 rounded-lg border border-[#F4C4C1] bg-[#FDF2F1] p-3 text-sm text-[#922D27]">{error}</p>}
    {loading ? <p role="status" className="py-6 text-sm text-[#5B6472]">Loading history…</p>
      : !error && !history.length ? <p className="py-8 text-center text-sm text-[#5B6472]">No history entries match these filters.</p>
        : <ol className="mt-4 divide-y divide-[#E3E6EA]">
          {history.map(item => <li key={item.id} className="py-4 first:pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm text-[#12161C]">{item.eventType.replaceAll('_', ' ')}</span>
                {item.cycleNumber && <span className="rounded-full bg-[#EFF6F9] px-2 py-0.5 text-xs font-semibold text-[#1D4E63]">Cycle {item.cycleNumber}</span>}
                {item.outcome && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.outcome === 'overdue' ? 'bg-[#FDF2F1] text-[#922D27]' : 'bg-[#F6F7F8] text-[#5B6472]'}`}>{item.outcome.replaceAll('_', ' ')}</span>}
              </div>
              <time className="text-xs text-[#5B6472]" dateTime={item.timestamp}>{formatDate(item.timestamp)}</time>
            </div>
            <p className="mt-1 text-xs text-[#5B6472]">Updated by {item.actorName || 'Automation'}{item.dueDate ? ` · Due ${formatDate(item.dueDate)}` : ''}{item.completedAt ? ` · Completed ${formatDate(item.completedAt)}` : ''}</p>
            {(item.statusFrom || item.statusTo) && <p className="mt-1 text-sm text-[#12161C]">Status: {item.statusFrom || '—'} → {item.statusTo || '—'}</p>}
            {item.updateText && <p className="mt-2 whitespace-pre-wrap text-sm text-[#12161C]">{item.updateText}</p>}
            {item.dealValue != null && <p className="mt-1 text-sm font-semibold text-[#255B40]">Deal value: {item.dealValue}</p>}
          </li>)}
        </ol>}
  </section>;
}
