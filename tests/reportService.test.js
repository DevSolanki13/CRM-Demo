import { describe, expect, it } from 'vitest';
import { getState } from '../backend/services/systemService.js';
import { getReportSummary, getReportAuditPage } from '../backend/services/reportService.js';
import { calculateReportMetrics } from '../frontend/utils/reportMetrics.js';

describe('database report queries', () => {
  it('matches scoped deal metrics and pages the audit ledger without duplicates', async () => {
    const state = await getState();
    const admin = state.users.find(user => user.role === 'Admin');
    const rep = state.users.find(user => user.role === 'Sales Rep');
    const month = '2026-10';
    for (const selectedRep of ['All', rep.id]) {
      const summary = await getReportSummary(admin, { rep: selectedRep, month });
      const expected = calculateReportMetrics(state, selectedRep, new Date('2026-10-24T12:00:00Z'));
      expect(summary).toMatchObject({
        wonCount: expected.wonDeals.length, lostCount: expected.lostDeals.length,
        totalRevenue: expected.totalRevenue, rebuyRevenue: expected.rebuyRevenue,
        renewalDueCount: expected.renewalDueDeals.length, forecast: expected.forecast,
        target: expected.target, accountCount: expected.accountLTV.length,
      });
      const first = await getReportAuditPage(admin, { rep: selectedRep, limit: '5' });
      const second = first.nextCursor
        ? await getReportAuditPage(admin, { rep: selectedRep, limit: '5', cursor: first.nextCursor })
        : { items: [] };
      expect(new Set([...first.items, ...second.items].map(item => item.id)).size)
        .toBe(first.items.length + second.items.length);
    }
    const own = await getReportSummary({ id: rep.id, role: 'Sales Rep' }, { rep: 'All', month });
    expect(own.totalRevenue).toBe(calculateReportMetrics(state, rep.id,
      new Date('2026-10-24T12:00:00Z')).totalRevenue);
  });
});
