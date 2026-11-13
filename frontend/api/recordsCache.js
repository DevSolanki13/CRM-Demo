// Account-scoped, bounded LRU. A shared request has independent abortable subscribers.
const pages = new Map();
const pending = new Map();
const CAPACITY = 100;
let scope = '';
let generation = 0;

export const recordsPageKey = (resource, filters = {}) => JSON.stringify({
  resource,
  ...Object.fromEntries(Object.entries(filters).filter(([key, value]) => key !== 'cursor' && value != null).sort(([a], [b]) => a.localeCompare(b))),
  cursor: filters.cursor || '',
});

export function clearRecordsCache() {
  generation += 1;
  pages.clear();
  for (const request of pending.values()) request.controller.abort();
  pending.clear();
}

export function setRecordsCacheScope(account) {
  if (scope !== account) { clearRecordsCache(); scope = account; }
}

export function getCachedRecordsPage(resource, filters) {
  const key = recordsPageKey(resource, filters);
  const value = pages.get(key);
  if (value) { pages.delete(key); pages.set(key, value); }
  return value;
}

export function requestRecordsPage(resource, filters, signal, fetcher) {
  if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  const key = recordsPageKey(resource, filters);
  let request = pending.get(key);
  if (!request || request.controller.signal.aborted) {
    const controller = new AbortController();
    const version = generation;
    request = { controller, subscribers: 0 };
    request.promise = Promise.resolve().then(() => fetcher(controller.signal)).then(result => {
      if (version === generation && !controller.signal.aborted) {
        pages.delete(key);
        pages.set(key, result);
        if (pages.size > CAPACITY) pages.delete(pages.keys().next().value);
      }
      return result;
    }).finally(() => { if (pending.get(key) === request) pending.delete(key); });
    pending.set(key, request);
  }
  request.subscribers += 1;
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abort);
      request.subscribers -= 1;
      // React StrictMode can resubscribe within the same turn.
      queueMicrotask(() => {
        if (!request.subscribers && pending.get(key) === request) request.controller.abort();
      });
      callback(value);
    };
    const abort = () => finish(reject, new DOMException('Aborted', 'AbortError'));
    signal?.addEventListener('abort', abort, { once: true });
    request.promise.then(value => finish(resolve, value), error => finish(reject, error));
  });
}
