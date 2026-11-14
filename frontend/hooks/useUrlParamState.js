import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

const paginationParams = prefix => prefix === 'page'
  ? ['page', 'cursors']
  : [`${prefix}Page`, `${prefix}Cursors`];

export function useUrlParamState(key, defaultValue = '', {
  replace = false,
  pageKeyPrefix = 'page',
  clearPagination = true,
} = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback((nextValue, options = {}) => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      const currentValue = next.get(key) ?? defaultValue;
      const resolved = typeof nextValue === 'function' ? nextValue(currentValue) : nextValue;
      const pageParams = clearPagination ? paginationParams(pageKeyPrefix) : [];
      const hasPageState = pageParams.some(param => next.has(param));
      if (String(resolved ?? '') === String(currentValue ?? '') && !hasPageState) return previous;
      if (resolved === null || resolved === undefined || String(resolved) === String(defaultValue)) next.delete(key);
      else next.set(key, String(resolved));
      for (const param of pageParams) next.delete(param);
      return next;
    }, { replace: options.replace ?? replace });
  }, [clearPagination, defaultValue, key, pageKeyPrefix, replace, setSearchParams]);

  return [value, setValue];
}
