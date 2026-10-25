export const DEFAULT_FORECAST_PROBABILITIES = Object.freeze({
  'stg-1': 10, 'stg-2': 25, 'stg-3': 40, 'stg-4': 60,
  'stg-5': 80, 'stg-6': 100, 'stg-7': 50, 'stg-8': 0,
});

const LOSS_REASONS = [
  ['Price / Budget mismatch', /price|budget|discount/i],
  ['Competitor won', /competitor/i],
  ['Timeline / Project postponed', /timeline|postpon|defer/i],
  ['Product fit / Specifications mismatch', /product fit|specification|specs/i],
  ['No decision / Lead went silent', /no decision|silent|no response/i],
  ['Internal reorganization / Decision-maker left', /reorgani[sz]|decision.maker left/i],
  ['Other (see note)', /^other/i],
];

export function calculateReportMetrics({ deals = [], stages = [], auditLogs = [], branding = {} }, selectedRep = 'All', now = new Date()) {
  const filteredDeals = selectedRep === 'All'
    ? deals : deals.filter(deal => deal.ownerId === selectedRep);
  const scopedDealIds = new Set(filteredDeals.map(deal => deal.id));
  const wonDeals = filteredDeals.filter(deal => deal.status === 'Won');
  const lostDeals = filteredDeals.filter(deal => deal.status === 'Lost');
  const reasonGroups = new Map();
  for (const deal of lostDeals) {
    const reason = LOSS_REASONS.find(([label, pattern]) =>
      deal.lostReason === label || pattern.test(deal.lostReason || ''))?.[0] || 'Unknown';
    const group = reasonGroups.get(reason) || { reason, count: 0, value: 0 };
    group.count += 1;
    group.value += Number(deal.value) || 0;
    reasonGroups.set(reason, group);
  }
  const lostByReason = [...LOSS_REASONS.map(([reason]) =>
    reasonGroups.get(reason) || { reason, count: 0, value: 0 }),
    ...(reasonGroups.has('Unknown') ? [reasonGroups.get('Unknown')] : [])];
  const totalRevenue = wonDeals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);
  const rebuyDeals = filteredDeals.filter(deal => Boolean(deal.isRebuy || deal.parentDealId));
  const renewalDueDeals = filteredDeals.filter(deal => deal.status === 'Renewal Due' || deal.stageId === 'stg-7');
  const stageById = new Map(stages.map(stage => [stage.id, stage]));
  const lostGroups = new Map();
  for (const deal of lostDeals) {
    // Current-stage data says only that the deal is closed. Never infer the
    // source stage from it or from a display label that may have been renamed.
    const known = deal.lostStageId && (stageById.has(deal.lostStageId) || deal.lostStageName);
    const key = known ? deal.lostStageId : 'unknown';
    if (!lostGroups.has(key)) {
      lostGroups.set(key, {
        stage: known ? (stageById.get(key) || { id: key, name: deal.lostStageName, color: '#D1D5DB' })
          : { id: 'unknown', name: 'Unknown', color: '#D1D5DB' },
        count: 0, value: 0
      });
    }
    const group = lostGroups.get(key);
    group.count += 1;
    group.value += Number(deal.value) || 0;
  }
  const lostByStage = [...stages.filter(stage => stage.id !== 'stg-8').map(stage =>
    lostGroups.get(stage.id) || { stage, count: 0, value: 0 }),
  ...[...lostGroups.entries()].filter(([id]) => id !== 'unknown' && !stageById.has(id)).map(([, group]) => group),
  ...(lostGroups.has('unknown') ? [lostGroups.get('unknown')] : [])];

  const accounts = new Map();
  for (const deal of filteredDeals) {
    const key = deal.companyId || `unlinked:${deal.companyName || 'Unassigned Account'}`;
    if (!accounts.has(key)) accounts.set(key, {
      id: key, name: deal.companyName || 'Unassigned Account', wonTotal: 0,
      wonCount: 0, rebuyCount: 0, activeCount: 0
    });
    const account = accounts.get(key);
    if (deal.status === 'Won') {
      account.wonTotal += Number(deal.value) || 0;
      account.wonCount += 1;
    }
    if (deal.isRebuy || deal.parentDealId) account.rebuyCount += 1;
    if (deal.status === 'Active') account.activeCount += 1;
  }
  const accountLTV = [...accounts.values()].sort((a, b) => b.wonTotal - a.wonTotal);
  // Historical audits for deleted deals have no reliable owner ID. The rep
  // view excludes them instead of assigning them to an arbitrary rep.
  const scopedAuditLogs = selectedRep === 'All' ? auditLogs
    : auditLogs.filter(log => log.entityType === 'Deal' && scopedDealIds.has(log.entityId));
  const month = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 7);
  const reporting = branding.customFields?.reporting || {};
  const probabilities = reporting.probabilities || {};
  const monthlyTargets = reporting.targets?.[month] || {};
  const forecast = filteredDeals.filter(deal =>
    ['Active', 'Renewal Due'].includes(deal.status) && deal.expectedCloseDate?.startsWith(month))
    .reduce((sum, deal) => sum + (Number(deal.value) || 0)
      * Math.max(0, Math.min(100, Number(probabilities[deal.stageId]
        ?? DEFAULT_FORECAST_PROBABILITIES[deal.stageId] ?? 0))) / 100, 0);
  const target = selectedRep === 'All'
    ? Object.values(monthlyTargets).reduce((sum, amount) => sum + (Number(amount) || 0), 0)
    : Number(monthlyTargets[selectedRep]) || 0;
  return {
    filteredDeals, wonDeals, lostDeals, totalRevenue,
    winRate: wonDeals.length + lostDeals.length
      ? Math.round(wonDeals.length / (wonDeals.length + lostDeals.length) * 100) : 0,
    avgDealSize: wonDeals.length ? Math.round(totalRevenue / wonDeals.length) : 0,
    renewalDueDeals, rebuyDeals,
    rebuyRevenue: rebuyDeals.filter(deal => deal.status === 'Won')
      .reduce((sum, deal) => sum + (Number(deal.value) || 0), 0),
    lostByStage, lostByReason, accountLTV, scopedAuditLogs, forecast, target, forecastMonth: month
  };
}
