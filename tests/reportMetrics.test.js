import { describe, expect, it } from 'vitest';
import { calculateReportMetrics } from '../frontend/utils/reportMetrics.js';

const stages = [
  { id: 'stg-1', name: 'Prospecting' },
  { id: 'stg-5', name: 'Negotiation' },
  { id: 'stg-7', name: 'Renewal' },
  { id: 'stg-8', name: 'Closed Lost' },
];
const deal = (id, ownerId, status, value, extra = {}) => ({
  id, ownerId, status, value, companyId: `co-${ownerId}`,
  companyName: 'Same Display Name', ...extra
});

describe('report scope and loss origin', () => {
  const state = { stages, deals: [
    deal('won-a', 'rep-a', 'Won', 100),
    deal('rebuy-a', 'rep-a', 'Won', 40, { parentDealId: 'won-a' }),
    deal('due-a', 'rep-a', 'Renewal Due', 20, { stageId: 'stg-7', parentDealId: 'won-a' }),
    deal('lost-a', 'rep-a', 'Lost', 30, { stageId: 'stg-8', lostStageId: 'stg-5', lostReason: 'Losing to competitor' }),
    deal('unknown-a', 'rep-a', 'Lost', 10, { stageId: 'stg-8' }),
    deal('won-b', 'rep-b', 'Won', 1000),
    deal('rebuy-b', 'rep-b', 'Won', 500, { parentDealId: 'won-b' }),
    deal('due-b', 'rep-b', 'Renewal Due', 300, { stageId: 'stg-7' }),
    deal('lost-b', 'rep-b', 'Lost', 400, { stageId: 'stg-8', lostStageId: 'stg-1' }),
  ], auditLogs: [
    { id: 'a', entityType: 'Deal', entityId: 'lost-a' },
    { id: 'b', entityType: 'Deal', entityId: 'lost-b' },
  ] };

  it('applies the selected rep to revenue, renewal, rebuy, account, and audit figures', () => {
    const a = calculateReportMetrics(state, 'rep-a');
    expect(a.totalRevenue).toBe(140);
    expect(a.rebuyRevenue).toBe(40);
    expect(a.rebuyDeals).toHaveLength(2);
    expect(a.renewalDueDeals).toHaveLength(1);
    expect(a.accountLTV).toMatchObject([{ id: 'co-rep-a', wonTotal: 140 }]);
    expect(a.scopedAuditLogs.map(log => log.id)).toEqual(['a']);
    const all = calculateReportMetrics(state);
    expect(all.accountLTV).toHaveLength(2);
    expect(all.totalRevenue).toBe(1640);
  });

  it('attributes losses to the recorded source stage and leaves missing evidence Unknown', () => {
    const a = calculateReportMetrics(state, 'rep-a');
    expect(a.lostByStage.find(group => group.stage.id === 'stg-5')).toMatchObject({ count: 1, value: 30 });
    expect(a.lostByStage.find(group => group.stage.id === 'unknown')).toMatchObject({ count: 1, value: 10 });
    expect(a.lostByStage.some(group => group.stage.id === 'stg-8')).toBe(false);
    expect(a.lostByReason.find(group => group.reason === 'Competitor won')).toMatchObject({ count: 1, value: 30 });
    expect(a.lostByReason.find(group => group.reason === 'Unknown')).toMatchObject({ count: 1, value: 10 });
  });

  it('counts a historical rebuy whose missing parent link was archived', () => {
    const metrics = calculateReportMetrics({ stages, deals: [
      deal('orphan-rebuy', 'rep-a', 'Won', 50, { isRebuy: true, parentDealId: null }),
    ] });
    expect(metrics.rebuyDeals).toHaveLength(1);
    expect(metrics.rebuyRevenue).toBe(50);
    expect(metrics.accountLTV[0].rebuyCount).toBe(1);
  });

  it('weights the monthly forecast and scopes configured targets by rep', () => {
    const month = '2026-10';
    const forecastState = { ...state,
      branding: { customFields: { reporting: {
        probabilities: { 'stg-5': 70 }, targets: { [month]: { 'rep-a': 200, 'rep-b': 900 } }
      } } },
      deals: [
        deal('open-a', 'rep-a', 'Active', 100, { stageId: 'stg-5', expectedCloseDate: '2026-10-20' }),
        deal('open-b', 'rep-b', 'Active', 1000, { stageId: 'stg-1', expectedCloseDate: '2026-10-23' }),
        deal('later-a', 'rep-a', 'Active', 999, { stageId: 'stg-5', expectedCloseDate: '2026-11-01' }),
      ] };
    const a = calculateReportMetrics(forecastState, 'rep-a', new Date('2026-10-24T12:00:00Z'));
    expect(a.forecast).toBe(70);
    expect(a.target).toBe(200);
    const all = calculateReportMetrics(forecastState, 'All', new Date('2026-10-24T12:00:00Z'));
    expect(all.forecast).toBe(170);
    expect(all.target).toBe(1100);
  });
});
