import { prisma } from '../prisma.js';
import { DEFAULT_FORECAST_PROBABILITIES } from '../../frontend/utils/reportMetrics.js';
import { isLostStage } from '../constants/stageConstants.js';

const invalid = message => Object.assign(new Error(message), { statusCode: 400 });
const rebuyWhere = { OR: [{ isRebuy: true }, { parentDealId: { not: null } }] };

async function scopedRep(actor, selectedRep) {
  if (actor.role === 'Sales Rep') return actor.id;
  if (!selectedRep || selectedRep === 'All') return null;
  if (typeof selectedRep !== 'string' || selectedRep.length > 120 ||
      !await prisma.user.findUnique({ where: { id: selectedRep }, select: { id: true } })) {
    throw invalid('Choose a valid sales representative.');
  }
  return selectedRep;
}

async function scopedPipeline(selectedPipeline) {
  if (!selectedPipeline || selectedPipeline === 'All') return null;
  if (typeof selectedPipeline !== 'string' || selectedPipeline.length > 120 ||
      !await prisma.pipeline.findUnique({ where: { id: selectedPipeline }, select: { id: true } })) {
    throw invalid('Choose a valid pipeline.');
  }
  return selectedPipeline;
}

const number = value => Number(value) || 0;

export async function getReportSummary(actor, { rep = 'All', pipeline = 'All', month } = {}) {
  const repId = await scopedRep(actor, rep);
  const pipelineId = await scopedPipeline(pipeline);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) throw invalid('Use a valid report month.');
  const where = { ...(repId ? { ownerId: repId } : {}), ...(pipelineId ? { pipelineId } : {}) };
  const [branding, stages, won, lost, activeRebuys, rebuyRevenue, renewalDueCount,
    lostStages, forecastRows, reasonRows, accountRows] = await Promise.all([
    prisma.branding.findUnique({ where: { id: 'default' }, select: { customFields: true } }),
    prisma.stage.findMany({ where: pipelineId ? { pipelineId } : {}, orderBy: { order: 'asc' } }),
    prisma.deal.aggregate({ where: { ...where, status: 'Won' }, _count: { _all: true }, _sum: { value: true } }),
    prisma.deal.aggregate({ where: { ...where, status: 'Lost' }, _count: { _all: true } }),
    prisma.deal.count({ where: { ...where, ...rebuyWhere, status: { notIn: ['Won', 'Lost'] } } }),
    prisma.deal.aggregate({ where: { ...where, ...rebuyWhere, status: 'Won' }, _sum: { value: true } }),
    prisma.deal.count({ where: { ...where, OR: [{ status: 'Renewal Due' }, { stage: { category: 'Buy Again' } }] } }),
    prisma.deal.groupBy({ by: ['lostStageId', 'lostStageName'], where: { ...where, status: 'Lost' },
      _count: { _all: true }, _sum: { value: true } }),
    prisma.deal.groupBy({ by: ['stageId'], where: { ...where,
      status: { in: ['Active', 'Renewal Due'] }, expectedCloseDate: { startsWith: month } },
      _sum: { value: true } }),
    prisma.$queryRaw`
      SELECT CASE
        WHEN "lostReason" = 'Price / Budget mismatch' OR "lostReason" ~* 'price|budget|discount' THEN 'Price / Budget mismatch'
        WHEN "lostReason" = 'Competitor won' OR "lostReason" ~* 'competitor' THEN 'Competitor won'
        WHEN "lostReason" = 'Timeline / Project postponed' OR "lostReason" ~* 'timeline|postpon|defer' THEN 'Timeline / Project postponed'
        WHEN "lostReason" = 'Product fit / Specifications mismatch' OR "lostReason" ~* 'product fit|specification|specs' THEN 'Product fit / Specifications mismatch'
        WHEN "lostReason" = 'No decision / Lead went silent' OR "lostReason" ~* 'no decision|silent|no response' THEN 'No decision / Lead went silent'
        WHEN "lostReason" = 'Internal reorganization / Decision-maker left' OR "lostReason" ~* 'reorgani[sz]|decision.maker left' THEN 'Internal reorganization / Decision-maker left'
        WHEN "lostReason" ~* '^other' THEN 'Other (see note)'
        ELSE 'Unknown' END AS reason,
        count(*)::int AS count, COALESCE(sum(value), 0)::double precision AS value
      FROM "Deal" WHERE status = 'Lost' AND (${repId}::text IS NULL OR "ownerId" = ${repId})
        AND (${pipelineId}::text IS NULL OR "pipelineId" = ${pipelineId})
      GROUP BY 1`,
    prisma.$queryRaw`
      SELECT COALESCE("companyId", 'unlinked:' || COALESCE(NULLIF("companyName", ''), 'Unassigned Account')) AS id,
        COALESCE(MAX(NULLIF("companyName", '')), 'Unassigned Account') AS name,
        COALESCE(sum(value) FILTER (WHERE status = 'Won'), 0)::double precision AS "wonTotal",
        count(*) FILTER (WHERE status = 'Won')::int AS "wonCount",
        count(*) FILTER (WHERE "isRebuy" OR "parentDealId" IS NOT NULL)::int AS "rebuyCount",
        count(*) FILTER (WHERE status = 'Active')::int AS "activeCount",
        count(*) OVER()::int AS "totalAccounts"
      FROM "Deal" WHERE (${repId}::text IS NULL OR "ownerId" = ${repId})
        AND (${pipelineId}::text IS NULL OR "pipelineId" = ${pipelineId})
      GROUP BY 1 ORDER BY "wonTotal" DESC LIMIT 6`,
  ]);
  const stageById = new Map(stages.map(stage => [stage.id, stage]));
  const lostGroups = new Map();
  for (const row of lostStages) {
    const known = row.lostStageId && (stageById.has(row.lostStageId) || row.lostStageName);
    const id = known ? row.lostStageId : 'unknown';
    const group = lostGroups.get(id) || { stage: known
      ? (stageById.get(id) || { id, name: row.lostStageName, color: '#D1D5DB' })
      : { id: 'unknown', name: 'Unknown', color: '#D1D5DB' }, count: 0, value: 0 };
    group.count += row._count._all;
    group.value += number(row._sum.value);
    lostGroups.set(id, group);
  }
  const lostByStage = [
    ...stages.filter(stage => !isLostStage(stage)).map(stage =>
      lostGroups.get(stage.id) || { stage, count: 0, value: 0 }),
    ...[...lostGroups.entries()].filter(([id]) => id !== 'unknown' && !stageById.has(id)).map(([, group]) => group),
    ...(lostGroups.has('unknown') ? [lostGroups.get('unknown')] : []),
  ];
  const reasonLabels = ['Price / Budget mismatch', 'Competitor won', 'Timeline / Project postponed',
    'Product fit / Specifications mismatch', 'No decision / Lead went silent',
    'Internal reorganization / Decision-maker left', 'Other (see note)'];
  const reasonByName = new Map(reasonRows.map(row => [row.reason, row]));
  const lostByReason = [...reasonLabels.map(reason => reasonByName.get(reason) || { reason, count: 0, value: 0 }),
    ...(reasonByName.has('Unknown') ? [reasonByName.get('Unknown')] : [])];
  const reporting = branding?.customFields?.reporting || {};
  const probabilities = reporting.probabilities || {};
  const targets = reporting.targets?.[month] || {};
  const forecast = forecastRows.reduce((sum, row) => sum + number(row._sum.value) *
    Math.max(0, Math.min(100, number(probabilities[row.stageId]
      ?? DEFAULT_FORECAST_PROBABILITIES[row.stageId] ?? 0))) / 100, 0);
  const wonCount = won._count._all;
  const lostCount = lost._count._all;
  const totalRevenue = number(won._sum.value);
  return {
    wonCount, lostCount, totalRevenue,
    winRate: wonCount + lostCount ? Math.round(wonCount / (wonCount + lostCount) * 100) : 0,
    avgDealSize: wonCount ? Math.round(totalRevenue / wonCount) : 0,
    activeRebuyCount: activeRebuys, rebuyRevenue: number(rebuyRevenue._sum.value),
    renewalDueCount, lostByStage, lostByReason,
    accountLTV: accountRows.map(({ totalAccounts: _totalAccounts, ...account }) => account),
    accountCount: accountRows[0]?.totalAccounts || 0,
    forecast, target: repId ? number(targets[repId])
      : Object.values(targets).reduce((sum, amount) => sum + number(amount), 0),
    forecastMonth: month,
  };
}

export async function getReportAuditPage(actor, { rep = 'All', pipeline = 'All', action = 'All', cursor = '', limit = '25' } = {}) {
  const repId = await scopedRep(actor, rep);
  const pipelineId = await scopedPipeline(pipeline);
  const pageSize = Number(limit);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100 ||
      typeof action !== 'string' || action.length > 80 || typeof cursor !== 'string' || cursor.length > 512) {
    throw invalid('Use a page size from 1 to 100 and valid audit filters.');
  }
  let position = null;
  if (cursor) {
    try {
      position = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
      if (typeof position.timestamp !== 'string' || typeof position.id !== 'string') throw new Error();
    } catch { throw invalid('Invalid audit page cursor.'); }
  }
  const actionFilter = action === 'All' ? null : action;
  const rows = await prisma.$queryRaw`
    SELECT audit.* FROM "AuditLog" audit
    WHERE (${repId}::text IS NULL OR (audit."entityType" = 'Deal' AND EXISTS
      (SELECT 1 FROM "Deal" deal WHERE deal.id = audit."entityId" AND deal."ownerId" = ${repId})))
      AND (${pipelineId}::text IS NULL OR (audit."entityType" = 'Deal' AND EXISTS
        (SELECT 1 FROM "Deal" deal WHERE deal.id = audit."entityId" AND deal."pipelineId" = ${pipelineId})))
      AND (${actionFilter}::text IS NULL OR audit.action = ${actionFilter})
      AND (${position?.timestamp || null}::text IS NULL OR audit.timestamp < ${position?.timestamp || null}
        OR (audit.timestamp = ${position?.timestamp || null} AND audit.id < ${position?.id || null}))
    ORDER BY audit.timestamp DESC, audit.id DESC LIMIT ${pageSize + 1}`;
  const items = rows.slice(0, pageSize);
  return { items, nextCursor: rows.length > pageSize
    ? Buffer.from(JSON.stringify({ timestamp: items.at(-1).timestamp, id: items.at(-1).id })).toString('base64url')
    : null };
}
