import { useEffect, useState } from 'react';
import { fetchRecordsPage } from '../api/crmClient.js';
import { getCachedRecordsPage } from '../api/recordsCache.js';

export function useRecordsPage(resource, filters = {}, revision = 0, enabled = true, paginationControl = null) {
  const key = JSON.stringify({ resource, ...filters });
  const [navigation, setNavigation] = useState({ key, cursors: [''] });
  const cursors = navigation.key === key ? navigation.cursors : [''];
  const cursor = paginationControl ? paginationControl.cursor : cursors.at(-1);
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState(() => {
    const cached = enabled && getCachedRecordsPage(resource, { ...filters, cursor });
    return { items: [], total: 0, facets: {}, stageTotals: [], nextCursor: null,
      ...cached, dataKey: cached ? key : '', hasData: Boolean(cached), loading: !cached, refreshing: false, error: '' };
  });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const cached = getCachedRecordsPage(resource, { ...filters, cursor });
    setPage(previous => ({ ...previous, ...cached, dataKey: cached ? key : previous.dataKey, hasData: Boolean(cached) || previous.hasData,
      loading: !cached && !previous.hasData, refreshing: true, error: '' }));
    const timer = setTimeout(async () => {
      try {
        const { resource: collection, ...query } = JSON.parse(key);
        const result = await fetchRecordsPage(collection, { ...query, cursor }, controller.signal);
        if (controller.signal.aborted) return;
        if (!result.items.length && cursor && result.total > 0) {
          if (paginationControl) paginationControl.onPrevious();
          else setNavigation({ key, cursors: cursors.slice(0, -1) });
          return;
        }
        setPage({ ...result, dataKey: key, hasData: true, loading: false, refreshing: false, error: '' });
      } catch (error) {
        if (!controller.signal.aborted && error.name !== 'AbortError') setPage(previous => ({ ...previous, loading: false, refreshing: false, error: error.message }));
      }
    }, filters.q ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, cursor, revision, retry, enabled]);
  return { ...page, number: paginationControl?.pageNumber ?? cursors.length,
    previous: () => paginationControl ? paginationControl.onPrevious() : setNavigation({ key, cursors: cursors.slice(0, -1) }),
    next: () => page.nextCursor && (paginationControl
      ? paginationControl.onNext(page.nextCursor)
      : setNavigation({ key, cursors: [...cursors, page.nextCursor] })),
    firstPage: () => paginationControl ? paginationControl.onFirstPage() : setNavigation({ key, cursors: [''] }),
    retry: () => setRetry(value => value + 1),
  };
}
