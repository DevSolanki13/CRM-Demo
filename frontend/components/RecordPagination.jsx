import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

export function RecordPagination({ page, label = 'records' }) {
  return <nav aria-label={`${label} pagination`} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs text-[var(--ink-muted)]">
    <div aria-live="polite" role="status">
      {page.loading ? `Loading ${label}…` : `${page.items.length} of ${page.total.toLocaleString()} matching ${label} · Page ${page.number}`}
    </div>
    {page.error && <div role="alert" className="flex items-center gap-2 text-[var(--danger)]">
      <span>{page.error}</span>
      <button type="button" onClick={page.retry} className="underline underline-offset-2">Try again</button>
    </div>}
    <div className="flex items-center gap-2">
      <button type="button" aria-label={`Previous ${label} page`} onClick={page.previous}
        disabled={page.loading || page.number === 1}
        className="flex min-h-10 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 font-semibold text-[var(--ink)] hover:bg-[var(--surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--primary)] disabled:cursor-default disabled:opacity-40">
        <ChevronLeft aria-hidden="true" size={16} />Previous
      </button>
      <button type="button" aria-label={`Next ${label} page`} onClick={page.next}
        disabled={page.loading || !page.nextCursor}
        className="flex min-h-10 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 font-semibold text-[var(--ink)] hover:bg-[var(--surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--primary)] disabled:cursor-default disabled:opacity-40">
        Next{page.loading ? <RefreshCw aria-hidden="true" size={14} className="animate-spin" /> : <ChevronRight aria-hidden="true" size={16} />}
      </button>
    </div>
  </nav>;
}
