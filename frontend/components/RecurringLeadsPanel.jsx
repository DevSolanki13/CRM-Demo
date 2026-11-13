import { LeadsSkeleton } from './skeletons/LeadsSkeleton.jsx';
import { useState } from 'react';
import { Repeat, Edit3, ArrowRightLeft, Trash2 } from 'lucide-react';
import { RecordPagination } from './RecordPagination.jsx';
import { RecurringCycleDialog } from './RecurringCycleDialog.jsx';
import { recurrenceLabel, CYCLE_OUTCOMES } from '../../shared/leadRecurrence.js';
import { formatDate, getLocalDateInputValue, getRecurringLeadRenewalStatus } from '../utils/crmHelpers.js';

const filterClass = 'min-h-10 rounded-lg border border-[#E3E6EA] bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[#1D4E63]';
const views = [['All', 'All recurring'], ['overdue', 'Overdue'], ['today', 'Due today'], ['upcoming', 'Next 10 days'],
  ['awaiting', 'Awaiting confirmation'], ['missing', 'Missing monthly update'], ['unassigned', 'Unassigned'], ['paused', 'Paused']];

export function RecurringLeadsPanel({ page, search, onSearch, owner, onOwner, sort, onSort, view, onView,
  users, currentUser, onChanged, onEdit, onOpen, onDelete, stages = [], hideRecords = false }) {
  const [selected, setSelected] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const today = getLocalDateInputValue();
  const managed = ['Admin', 'Manager'].includes(currentUser.role);
  const changed = async () => { page.retry(); await onChanged?.(); };
  const remove = async lead => {
    if (deletingId || !onDelete || !window.confirm(`Permanently delete "${lead.title}"? Leads with linked records or cycle history cannot be deleted. Pause their schedule instead.`)) return;
    setDeleteError(''); setDeletingId(lead.id);
    try { await onDelete(lead.id); await changed(); }
    catch (error) { setDeleteError(error.message || 'Could not delete this lead.'); }
    finally { setDeletingId(null); }
  };
  if (page.loading) return <LeadsSkeleton recurring />;
  return <section aria-label="Recurring leads" className="space-y-4 md:flex-1 md:min-h-0 md:flex md:flex-col">
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#E3E6EA] bg-white p-4 shrink-0">
      <label className="min-w-48 flex-1 text-xs font-semibold text-[#5B6472]">Search recurring leads<input className={`${filterClass} mt-1 block w-full`} type="search" value={search} onChange={event => onSearch(event.target.value)} placeholder="Name, company, phone, or email" /></label>
      {managed && <label className="text-xs font-semibold text-[#5B6472]">Responsible rep<select className={`${filterClass} mt-1 block`} value={owner} onChange={event => onOwner(event.target.value)}>
        <option value="All">All employees</option><option value="__unassigned">Unassigned</option>{users.filter(user => user.active !== false).map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
      </select></label>}
      <label className="text-xs font-semibold text-[#5B6472]">Sort<select className={`${filterClass} mt-1 block`} value={sort} onChange={event => onSort(event.target.value)}><option value="recurrence-asc">Expected purchase</option><option value="title-asc">Name</option></select></label>
      <button type="button" className={`${filterClass} text-[#1D4E63]`} onClick={() => { onSearch(''); onOwner('All'); onView('All'); onSort('recurrence-asc'); }}>Reset filters</button>
    </div>
    <div className="flex flex-wrap gap-2 shrink-0" aria-label="Recurring lead views">{views.filter(([id]) => managed || id !== 'unassigned').map(([id, label]) => <button key={id} type="button" aria-pressed={view === id} onClick={() => onView(id)}
      className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-semibold ${view === id ? 'border-[#1D4E63] bg-[#1D4E63] text-white' : 'border-[#E3E6EA] bg-white text-[#5B6472]'}`}>
      {label}{page.facets?.[id] != null ? ` (${page.facets[id]})` : ''}
    </button>)}</div>
    <p className="text-sm text-[#5B6472] shrink-0">{managed ? 'Track each rep’s follow-ups and monthly reviews.' : 'Your assigned repeat opportunities and follow-up deadlines.'} Updates require an outcome and notes. Paused leads retain their existing tasks and history.</p>
    {!hideRecords && <div className="shrink-0"><RecordPagination page={page} label="recurring leads" /></div>}
    {deleteError && <p role="alert" className="rounded-lg border border-[#F4C4C1] bg-[#FDF2F1] p-3 text-sm text-[#922D27] shrink-0">{deleteError}</p>}
    {page.error && <p role="alert" className="rounded-lg border border-[#F4C4C1] bg-[#FDF2F1] p-3 text-sm text-[#922D27] shrink-0">Could not load recurring leads. <button type="button" onClick={page.retry} className="font-semibold underline">Retry</button></p>}
    {!hideRecords && !page.loading && !page.error && !page.items.length && <div className="rounded-xl border border-[#E3E6EA] bg-white p-8 text-center shrink-0"><Repeat className="mx-auto mb-2 text-[#1D4E63]" /><p className="text-sm font-semibold">No recurring leads match these filters.</p><p className="mt-1 text-sm text-[#5B6472]">Reset filters or add a recurring lead.</p></div>}
    {!hideRecords && !!page.items.length && <div className="overflow-x-auto rounded-xl border border-[#E3E6EA] bg-white shadow-sm md:flex-1 md:min-h-0 md:overflow-y-auto">
      <table className="hidden w-full text-left text-xs md:table"><thead className="sticky top-0 z-10 border-b border-[#E3E6EA] bg-[#F6F7F8] text-[10px] uppercase text-[#5B6472] shadow-xs"><tr>
        {['Lead name', 'Company', 'Email / phone', 'Status', 'Assigned employee', 'Recurrence date', 'Next recurrence', 'Next follow-up', 'Last contacted', 'Actions'].map(label => <th scope="col" className={`px-4 py-4 font-semibold ${label === 'Actions' ? 'text-right' : ''}`} key={label}>{label}</th>)}
      </tr></thead><tbody className="divide-y divide-[#E3E6EA]">{page.items.map(lead => {
        const overdue = !lead.recurrencePaused && (lead.nextRecurrenceDate < today || (lead.nextFollowUpDate && lead.nextFollowUpDate < today));
        const missing = !lead.lastRecurringReviewDate || lead.lastRecurringReviewDate.slice(0, 7) < today.slice(0, 7);
        const renewalStatus = getRecurringLeadRenewalStatus(lead, today, stages);
        return <tr key={lead.id} className="even:bg-[#F6F7F8]/70 hover:bg-[#EFF6F9]/60">
          <td className="min-w-40 max-w-56 px-4 py-3"><button type="button" onClick={() => onOpen?.(lead)} className="text-left font-bold text-[#12161C] underline-offset-2 hover:text-[#1D4E63] hover:underline">{lead.contactName || lead.title}</button></td>
          <td className="min-w-44 max-w-64 px-4 py-3 text-[#5B6472]">{lead.companyName || '—'}</td>
          <td className="min-w-44 px-4 py-3"><div>{lead.contactEmail ? <a href={`mailto:${lead.contactEmail}`} className="text-[#1D4E63] hover:underline">{lead.contactEmail}</a> : '—'}</div><div className="mt-0.5 text-[10px] text-[#5B6472]">{lead.contactPhone ? <a href={`tel:${lead.contactPhone}`} className="hover:underline">{lead.contactPhone}</a> : '—'}</div></td>
          <td className="min-w-36 px-4 py-3"><span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-2xs border ${renewalStatus.badgeClass}`}>{renewalStatus.label}</span><span className="sr-only">{CYCLE_OUTCOMES[lead.recurrenceState] || 'Awaiting response'}.</span><p className={`mt-1 whitespace-nowrap text-[10px] ${missing && !lead.recurrencePaused ? 'font-semibold text-[#922D27]' : 'text-[#5B6472]'}`}>{lead.recurrencePaused ? 'Paused' : missing ? 'Monthly update needed' : `Reviewed ${formatDate(lead.lastRecurringReviewDate)}`}</p></td>
          <td className="px-4 py-3 text-[#12161C]">{lead.ownerName || 'Unassigned'}</td>
          <td className="whitespace-nowrap px-4 py-3 text-[#5B6472]">{formatDate(lead.recurrenceDate) || '—'}<span className="mt-1 block text-[10px]">{recurrenceLabel(lead)}</span></td>
          <td className="whitespace-nowrap px-4 py-3">{formatDate(lead.nextRecurrenceDate) || '—'}</td>
          <td className="whitespace-nowrap px-4 py-3">{formatDate(lead.nextFollowUpDate) || '—'}{overdue && <span className="mt-1 block text-[10px] font-semibold text-[#922D27]">Action overdue</span>}</td>
          <td className="whitespace-nowrap px-4 py-3 text-[#5B6472]">{formatDate(lead.lastContactedDate) || '—'}</td>
          <td className="px-3 py-3"><div className="flex items-center justify-end gap-0.5">
            {currentUser.role === 'Admin' && <button type="button" aria-label={`Edit schedule for ${lead.title}`} title="Edit lead and repeat schedule" onClick={() => onEdit(lead)} className="rounded-lg p-2 text-[#5B6472] hover:bg-[#E3E6EA] focus-visible:outline-2 focus-visible:outline-[#1D4E63]"><Edit3 size={15} aria-hidden="true" /></button>}
            <button type="button" aria-label={lead.recurrencePaused ? 'View cycle' : 'Update cycle'} title={lead.recurrencePaused ? 'View cycle history and resume schedule' : 'Update cycle, confirmation, and monthly review'} onClick={() => setSelected(lead)} className="rounded-lg p-2 text-[#5B6472] hover:bg-[#E3E6EA] focus-visible:outline-2 focus-visible:outline-[#1D4E63]"><ArrowRightLeft size={15} aria-hidden="true" /></button>
            {currentUser.role === 'Admin' && onDelete && <button type="button" aria-label={`Delete ${lead.title}`} title="Delete lead (history is protected)" disabled={deletingId !== null} onClick={() => remove(lead)} className="rounded-lg p-2 text-[#922D27] hover:bg-[#FDF2F1] focus-visible:outline-2 focus-visible:outline-[#922D27] disabled:opacity-50"><Trash2 size={15} aria-hidden="true" /></button>}
          </div></td>
        </tr>;
      })}</tbody></table>
      <ul className="divide-y divide-[#E3E6EA] md:hidden">{page.items.map(lead => {
        const renewalStatus = getRecurringLeadRenewalStatus(lead, today, stages);
        return <li key={lead.id} className="space-y-3 p-4">
        <button type="button" onClick={() => onOpen?.(lead)} className="font-semibold text-[#1D4E63]">{lead.contactName || lead.title}</button><p className="text-sm text-[#5B6472]">{lead.companyName} · {lead.ownerName || 'Unassigned'}</p>
        <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-[#5B6472]">Expected purchase</dt><dd>{formatDate(lead.nextRecurrenceDate)}</dd></div><div><dt className="text-xs text-[#5B6472]">Next follow-up</dt><dd>{formatDate(lead.nextFollowUpDate) || 'See Tasks'}</dd></div><div><dt className="text-xs text-[#5B6472]">Schedule</dt><dd>{recurrenceLabel(lead)}</dd></div><div><dt className="text-xs text-[#5B6472]">Monthly review</dt><dd>{lead.recurrencePaused ? 'Paused' : lead.lastRecurringReviewDate?.slice(0, 7) === today.slice(0, 7) ? 'Updated' : 'Update needed'}</dd></div></dl>
        <div><span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${renewalStatus.badgeClass}`}>{renewalStatus.label}</span></div>
        {!lead.recurrencePaused && (lead.nextRecurrenceDate < today || (lead.nextFollowUpDate && lead.nextFollowUpDate < today)) && <p className="text-sm font-semibold text-[#922D27]">Action overdue</p>}
        <button type="button" onClick={() => setSelected(lead)} className="min-h-10 rounded-lg bg-[#1D4E63] px-3 py-2 text-sm font-semibold text-white">{lead.recurrencePaused ? 'View cycle' : 'Update cycle'}</button>
        {currentUser.role === 'Admin' && <button type="button" onClick={() => onEdit(lead)} className="ml-2 min-h-10 px-3 text-sm text-[#1D4E63]">Edit schedule</button>}
        {currentUser.role === 'Admin' && onDelete && <button type="button" disabled={deletingId !== null} onClick={() => remove(lead)} className="ml-2 min-h-10 px-3 text-sm text-[#922D27] disabled:opacity-50">Delete lead</button>}
      </li>;
      })}</ul>
    </div>}
    {selected && <RecurringCycleDialog key={selected.id} lead={selected} currentUser={currentUser} onClose={() => setSelected(null)} onChanged={changed} />}
  </section>;
}
