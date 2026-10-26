import { useState } from 'react';
import { useRecordsPage } from '../hooks/useRecordsPage.js';

export function RecordSelect({ resource, value = '', onChange, label = resource,
  placeholder = 'Choose a record', selectedLabel, required = false, excludeId,
  emptyValue = '', filters = {}, disabled = false }) {
  const [search, setSearch] = useState('');
  const page = useRecordsPage(resource, { ...filters, q: search, limit: 25 });
  const options = page.items.filter(record => record.id !== excludeId);
  return <div className="space-y-1.5">
    <input type="search" aria-label={`Search ${label}`} value={search}
      disabled={disabled} onChange={event => setSearch(event.target.value)}
      placeholder={`Search ${label}…`}
      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]" />
    <select required={required} disabled={disabled} value={value || emptyValue}
      aria-label={`${label} selection`} onChange={event => onChange(event.target.value, page.items.find(item => item.id === event.target.value))}
      className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-2.5 text-xs text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]">
      <option value={emptyValue}>{placeholder}</option>
      {value && value !== emptyValue && !options.some(record => record.id === value) &&
        <option value={value}>{selectedLabel || value}</option>}
      {options.map(record => <option key={record.id} value={record.id}>
        {record.name || record.title || record.id}{record.email ? ` · ${record.email}` : ''}
      </option>)}
    </select>
    <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--ink-muted)]" aria-live="polite">
      <span>{page.error || (page.loading ? 'Loading choices…' : `${page.total} matching choices`)}</span>
      <div className="flex gap-2">
        {page.error ? <button type="button" onClick={page.retry} className="underline">Try again</button> : <>
          <button type="button" disabled={page.loading || page.number === 1} onClick={page.previous} className="min-h-8 px-1 underline disabled:opacity-40">Previous</button>
          <button type="button" disabled={page.loading || !page.nextCursor} onClick={page.next} className="min-h-8 px-1 underline disabled:opacity-40">Next</button>
        </>}
      </div>
    </div>
  </div>;
}
