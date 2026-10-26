import { useEffect, useState } from 'react';
import { fetchRecordsPage } from '../api/crmClient.js';

export function useRecordsPage(resource, filters = {}, revision = 0, enabled = true) {
  const key = JSON.stringify({ resource, ...filters });
  const [navigation, setNavigation] = useState({ key, cursors: [''] });
  const cursors = navigation.key === key ? navigation.cursors : [''];
  const cursor = cursors.at(-1);
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState({ items: [], total: 0, facets: {}, stageTotals: [], nextCursor: null, loading: true, error: '' });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setPage(previous => ({ ...previous, loading: true, error: '' }));
    const timer = setTimeout(async () => {
      try {
        const { resource: collection, ...query } = JSON.parse(key);
        const result = await fetchRecordsPage(collection, { ...query, cursor }, controller.signal);
        if (controller.signal.aborted) return;
        if (!result.items.length && cursor && result.total > 0) {
          setNavigation({ key, cursors: cursors.slice(0, -1) });
          return;
        }
        setPage({ ...result, loading: false, error: '' });
      } catch (error) {
        if (!controller.signal.aborted) setPage(previous => ({ ...previous, loading: false, error: error.message }));
      }
    }, filters.q ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, cursor, revision, retry, enabled]);
  return { ...page, number: cursors.length,
    previous: () => setNavigation({ key, cursors: cursors.slice(0, -1) }),
    next: () => page.nextCursor && setNavigation({ key, cursors: [...cursors, page.nextCursor] }),
    retry: () => setRetry(value => value + 1),
  };
}
