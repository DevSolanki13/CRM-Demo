import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  approveStageGateCheck,
  fetchAllRecords,
  fetchUnresolvedLinks,
  rejectStageGateCheck,
  resolveHistoricalLink,
  updateLead,
} from '../frontend/api/crmClient.js';

afterEach(() => vi.unstubAllGlobals());

describe('API failure propagation', () => {
  it('rejects unsuccessful approvals and rejections instead of reporting success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: 'Approval is no longer pending' }) }));
    await expect(approveStageGateCheck('gate')).rejects.toThrow('Approval is no longer pending');
    await expect(rejectStageGateCheck('gate', {}, 'Reason')).rejects.toThrow('Approval is no longer pending');
  });
  it('propagates network failures and ordinary mutation errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
    await expect(approveStageGateCheck('gate')).rejects.toThrow('Offline');
    await expect(rejectStageGateCheck('gate')).rejects.toThrow('Offline');
    await expect(updateLead('lead', { title: 'New title' })).rejects.toThrow('Offline');
    await expect(fetchUnresolvedLinks()).rejects.toThrow('Offline');
    await expect(resolveHistoricalLink('link-1', 'target-1')).rejects.toThrow('Offline');
  });
  it('propagates historical link reconciliation errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'The replacement record does not exist.' }),
    }));
    await expect(resolveHistoricalLink('link-1', 'bad-target')).rejects.toThrow('The replacement record does not exist.');
  });
  it('iterates through pages until cursor is empty in fetchAllRecords', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 'rec-1', name: 'Alpha' }, { id: 'rec-2', name: 'Beta' }],
          nextCursor: 'cur-page-2',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 'rec-3', name: 'Gamma' }],
          nextCursor: null,
        }),
      });

    vi.stubGlobal('fetch', mockFetch);

    const records = await fetchAllRecords('contacts', 50);

    expect(records).toEqual([
      { id: 'rec-1', name: 'Alpha' },
      { id: 'rec-2', name: 'Beta' },
      { id: 'rec-3', name: 'Gamma' },
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][0]).toContain('limit=50');
    expect(mockFetch.mock.calls[1][0]).toContain('cursor=cur-page-2');
  });
});