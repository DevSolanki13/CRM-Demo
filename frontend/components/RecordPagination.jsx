import { Skeleton } from './skeletons/primitives.jsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function RecordPagination({ page, label = 'records', retryLabel = 'Retry' }) {
  if (!page.loading && !page.error && page.total <= page.items.length && page.number === 1) {
    return null;
  }

  return <nav aria-label={`${label} pagination`} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs text-[var(--ink-muted)]">
    <div aria-live="polite" role="status">
      {page.loading ? <Skeleton className="h-4 w-40" /> : page.error ? `Could not load ${label}` : `${page.items.length} of ${page.total.toLocaleString()} matching ${label} · Page ${page.number}`}
    </div>
    {page.error && <div role="alert" className="flex items-center gap-2 text-[var(--danger)]">
      <span>{page.error} Check your connection and retry.</span>
      <button type="button" onClick={page.retry} className="font-semibold underline underline-offset-2">{retryLabel}</button>
    </div>}
    <div className="flex items-center gap-2">
      <button type="button" aria-label={`Previous ${label} page`} onClick={page.previous}
        disabled={page.loading || page.refreshing || page.number === 1}
        className="flex min-h-10 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 font-semibold text-[var(--ink)] hover:bg-[var(--surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--primary)] disabled:cursor-default disabled:opacity-40">
        <ChevronLeft aria-hidden="true" size={16} />Previous
      </button>
      <button type="button" aria-label={`Next ${label} page`} onClick={page.next}
        disabled={page.loading || page.refreshing || !page.nextCursor}
        className="flex min-h-10 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 font-semibold text-[var(--ink)] hover:bg-[var(--surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--primary)] disabled:cursor-default disabled:opacity-40">
        Next<ChevronRight aria-hidden="true" size={16} />
      </button>
    </div>
  </nav>;
}
