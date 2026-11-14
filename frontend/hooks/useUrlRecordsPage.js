import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRecordsPage } from './useRecordsPage.js';

function getPaginationKeys(prefix) {
  return prefix === 'page'
    ? { page: 'page', cursors: 'cursors' }
    : { page: `${prefix}Page`, cursors: `${prefix}Cursors` };
}

function readCursorHistory(value) {
  if (!value) return [''];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length && parsed.every(cursor => typeof cursor === 'string')) {
      return parsed[0] === '' ? parsed : ['', ...parsed];
    }
  } catch {
    return [''];
  }
  return [''];
}

export function useUrlRecordsPage(resource, filters = {}, revision = 0, enabled = true, prefix = 'page') {
  const [searchParams, setSearchParams] = useSearchParams();
  const keys = getPaginationKeys(prefix);
  const cursors = readCursorHistory(searchParams.get(keys.cursors));
  const cursor = cursors[cursors.length - 1];

  const writeHistory = useCallback((history, replace = false) => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      if (history.length <= 1) {
        next.delete(keys.page);
        next.delete(keys.cursors);
      } else {
        next.set(keys.page, String(history.length));
        next.set(keys.cursors, JSON.stringify(history));
      }
      return next;
    }, { replace });
  }, [keys.cursors, keys.page, setSearchParams]);

  const onNext = useCallback(nextCursor => writeHistory([...cursors, nextCursor]), [cursors, writeHistory]);
  const onPrevious = useCallback(() => writeHistory(cursors.slice(0, -1)), [cursors, writeHistory]);
  const onFirstPage = useCallback(() => writeHistory(['']), [writeHistory]);
  const page = useRecordsPage(resource, filters, revision, enabled, {
    cursor,
    pageNumber: cursors.length,
    onNext,
    onPrevious,
    onFirstPage,
  });
  return page;
}
