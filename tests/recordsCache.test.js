import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearRecordsCache, getCachedRecordsPage, recordsPageKey, requestRecordsPage, setRecordsCacheScope } from '../frontend/api/recordsCache.js';

beforeEach(() => clearRecordsCache());
const page = { items: [{ id: 'one' }], total: 1, nextCursor: null };

describe('record page cache', () => {
  it('normalizes optional filters and distinguishes cursors and filter values', () => {
    expect(recordsPageKey('leads', { q: '', owner: undefined })).toBe(recordsPageKey('leads', { cursor: '', q: '' }));
    expect(recordsPageKey('leads', { q: '', owner: 'All' })).toBe(recordsPageKey('leads', { owner: 'All', q: '' }));
    expect(recordsPageKey('leads', { cursor: 'next' })).not.toBe(recordsPageKey('leads'));
  });

  it('deduplicates simultaneous requests and keeps a shared fetch alive for remaining subscribers', async () => {
    let finish;
    const fetcher = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    const controller = new AbortController();
    const first = requestRecordsPage('leads', {}, controller.signal, fetcher);
    const rejected = expect(first).rejects.toHaveProperty('name', 'AbortError');
    const second = requestRecordsPage('leads', {}, undefined, fetcher);
    await Promise.resolve();
    controller.abort();
    finish(page);
    await rejected;
    await expect(second).resolves.toEqual(page);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(getCachedRecordsPage('leads', {})).toEqual(page);
  });

  it('serves the old page while a new request revalidates, then replaces it', async () => {
    await requestRecordsPage('leads', {}, undefined, async () => page);
    let finish;
    const refresh = requestRecordsPage('leads', {}, undefined, () => new Promise(resolve => { finish = resolve; }));
    await Promise.resolve();
    expect(getCachedRecordsPage('leads', {})).toEqual(page);
    finish({ ...page, items: [{ id: 'two' }] });
    await refresh;
    expect(getCachedRecordsPage('leads', {}).items[0].id).toBe('two');
  });

  it('prevents a late response from repopulating an invalidated cache', async () => {
    let finish;
    const old = requestRecordsPage('leads', {}, undefined, () => new Promise(resolve => { finish = resolve; }));
    await Promise.resolve();
    clearRecordsCache();
    finish(page);
    await old;
    expect(getCachedRecordsPage('leads', {})).toBeUndefined();
  });

  it('clears data on an account change and caps storage at 100 pages', async () => {
    setRecordsCacheScope('admin');
    for (let i = 0; i < 101; i++) await requestRecordsPage('leads', { q: String(i) }, undefined, async () => page);
    expect(getCachedRecordsPage('leads', { q: '0' })).toBeUndefined();
    expect(getCachedRecordsPage('leads', { q: '100' })).toEqual(page);
    setRecordsCacheScope('rep');
    expect(getCachedRecordsPage('leads', { q: '100' })).toBeUndefined();
  });

  it('aborts the network request when its final subscriber leaves and can retry', async () => {
    const controller = new AbortController();
    let networkSignal;
    const first = requestRecordsPage('leads', {}, controller.signal, signal => {
      networkSignal = signal;
      return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))));
    });
    const rejected = expect(first).rejects.toHaveProperty('name', 'AbortError');
    await Promise.resolve();
    controller.abort();
    await rejected;
    await Promise.resolve();
    expect(networkSignal.aborted).toBe(true);
    await expect(requestRecordsPage('leads', {}, undefined, async () => page)).resolves.toEqual(page);
  });
});
