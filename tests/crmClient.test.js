import { afterEach, describe, expect, it, vi } from 'vitest';
import { approveStageGateCheck, rejectStageGateCheck, updateLead } from '../frontend/api/crmClient.js';

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
  });
});
