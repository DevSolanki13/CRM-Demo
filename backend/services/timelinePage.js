import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { invalid, recordVisibility } from './recordQuery.js';

const auditKinds = {
  STAGE_TRANSITION: ['Stage Transition', 'ArrowRight'], STAGE_ADVANCED: ['Stage Transition', 'ArrowRight'],
  STAGE_DEMOTED: ['Stage Demotion', 'ArrowRight'], DEAL_WON: ['Deal Won', 'Award'], DEAL_LOST: ['Deal Lost', 'Flag'],
  DEAL_CREATED: ['Deal Created', 'PlusCircle'], DEAL_VALUE_CHANGED: ['Deal Value Adjusted', 'DollarSign'],
  REBUY_CREATED: ['Renewal Cycle Triggered', 'RefreshCw'], AUTOMATION_TASK_CREATED: ['Automated Follow-up Scheduled', 'Sparkles'],
  APPROVAL_APPROVED: ['Stage Gate Approved', 'ShieldCheck'], APPROVAL_REJECTED: ['Stage Gate Rejected', 'AlertTriangle'],
  STAGE_GATE_APPROVED: ['Stage Gate Approved', 'ShieldCheck'], STAGE_GATE_REJECTED: ['Stage Gate Rejected', 'AlertTriangle'],
};

function normalize({ source, record: row, timestamp, stageId, category, key }) {
  const common = { id: row.id, key, sourceType: source, timestamp, stageId, category };
  if (source === 'activity') return { ...common, eventType: row.type,
    title: `${row.type}: ${row.linkedTitle || row.linkedType || 'Activity'}`, description: row.description || '',
    authorName: row.authorName || 'Sales Rep', performedByName: row.performedByName || row.authorName || 'Sales Rep',
    assignedToName: row.assignedToName, recordedByName: row.authorName,
    stageName: row.stageName, linkedType: row.linkedType, linkedId: row.linkedId, linkedTitle: row.linkedTitle,
    icon: /email/i.test(row.type) ? 'Mail' : /meeting/i.test(row.type) ? 'Calendar' : /note/i.test(row.type) ? 'FileText' : /sample/i.test(row.type) ? 'Package' : 'PhoneCall',
    metadata: { ...row.metadata, isOutbound: row.isOutbound, stageId, stageName: row.stageName,
      performedByName: row.performedByName, assignedToName: row.assignedToName },
  };
  if (source === 'note') return { ...common, eventType: 'Internal Note', title: 'Internal Account Note',
    description: row.text || '', authorName: row.authorName || 'Team Member', performedByName: row.authorName,
    recordedByName: row.authorName, linkedType: row.linkedType, linkedId: row.linkedId, icon: 'FileText', metadata: {} };
  if (source === 'task') return { ...common, eventType: row.type === 'Approval' ? 'Stage Approval Task' : 'Follow-up Task',
    title: row.title, description: row.note || 'Follow-up action item', authorName: row.ownerName || row.submittedByName || 'Assigned Rep',
    performedByName: row.reviewedByName || (['completed', 'done'].includes(row.status) ? row.ownerName : null),
    assignedToName: row.ownerName, recordedByName: row.submittedByName || row.ownerName,
    fromStageName: row.fromStageName, targetStageName: row.targetStageName, stageName: row.targetStageName || row.fromStageName,
    status: row.status, linkedType: row.linkedType, linkedId: row.linkedId, linkedTitle: row.linkedTitle,
    icon: row.type === 'Approval' ? 'ShieldCheck' : 'CheckSquare',
    metadata: { dueDate: row.dueDate, fromStageName: row.fromStageName, targetStageName: row.targetStageName, reviewedByName: row.reviewedByName },
  };
  if (source === 'stage_gate') return { ...common, eventType: `Stage Gate (${row.status})`,
    title: `Gate Check: ${row.fromStageName || 'Stage'} → ${row.targetStageName || 'Target'}`,
    description: row.note || `Gate evaluation status: ${row.status}. Outcome: ${row.outcome || 'None'}`,
    authorName: row.submittedByName || 'Sales Rep', performedByName: row.reviewedByName || row.submittedByName || 'Sales Rep',
    assignedToName: row.reviewedByName, recordedByName: row.submittedByName, stageName: row.targetStageName,
    fromStageName: row.fromStageName, toStageName: row.targetStageName, status: row.status,
    linkedType: 'Deal', linkedId: row.dealId, linkedTitle: row.dealTitle, icon: 'ShieldCheck',
    metadata: { fromStageId: row.fromStageId, toStageId: row.targetStageId, fromStageName: row.fromStageName,
      targetStageName: row.targetStageName, reviewedByName: row.reviewedByName, outcome: row.outcome, answers: row.answers },
  };
  const [eventType, icon] = auditKinds[row.action] || ['System Audit', 'GitCommit'];
  return { ...common, eventType, title: `${eventType}: ${row.entityTitle || row.entityType}`,
    description: row.reason || `Action: ${row.action}`, authorName: row.actorName || 'System', performedByName: row.actorName,
    recordedByName: row.actorName, fromStageName: row.fromStage, toStageName: row.toStage,
    linkedType: row.entityType, linkedId: row.entityId, linkedTitle: row.entityTitle, icon,
    metadata: { ...row.metadata, fromStage: row.fromStage, toStage: row.toStage, reason: row.reason, actorName: row.actorName },
  };
}

function timelineQuery(entityType, entityId, actor) {
  const related = Prisma.sql`SELECT ${entityType}::text AS type, ${entityId}::text AS id
    UNION SELECT 'Deal', d.id FROM "Deal" d WHERE
      (${entityType} = 'Lead' AND d."leadId" = ${entityId}) OR (${entityType} = 'Company' AND d."companyId" = ${entityId}) OR
      (${entityType} = 'Contact' AND d."contactId" = ${entityId})
    UNION SELECT 'Contact', c.id FROM "Contact" c WHERE
      (${entityType} = 'Company' AND c."companyId" = ${entityId}) OR (${entityType} = 'Deal' AND EXISTS
        (SELECT 1 FROM "Deal" d WHERE d.id = ${entityId} AND d."contactId" = c.id))
    UNION SELECT 'Lead', d."leadId" FROM "Deal" d WHERE ${entityType} = 'Deal' AND d.id = ${entityId} AND d."leadId" IS NOT NULL
    UNION SELECT 'Company', c."companyId" FROM "Contact" c WHERE ${entityType} = 'Contact' AND c.id = ${entityId} AND c."companyId" IS NOT NULL`;
  const definitions = [
    { source: 'activity', resource: 'activities', table: 'Activity', type: 'linkedType', id: 'linkedId',
      stage: Prisma.sql`COALESCE(NULLIF(r."stageId", ''), r.metadata->>'toStageId', r.metadata->>'stageId')`,
      time: Prisma.sql`COALESCE(r.timestamp, r."createdAt", '')`,
      category: Prisma.sql`CASE WHEN r.type ILIKE '%Note%' THEN 'note' WHEN r.type ILIKE '%Sample%' OR r.type IN ('Stage Advanced', 'Stage Demoted', 'Deal Won', 'Deal Lost') THEN 'pipeline' ELSE 'communication' END`,
      eventType: Prisma.sql`r.type`, search: Prisma.sql`concat_ws(' ', r.type, r.description, r."linkedTitle", r."authorName", r."performedByName")` },
    { source: 'note', resource: 'notes', table: 'Note', type: 'linkedType', id: 'linkedId', stage: Prisma.sql`NULL::text`, time: Prisma.sql`COALESCE(r.timestamp, '')`,
      category: Prisma.sql`'note'::text`, eventType: Prisma.sql`'Internal Note'::text`, search: Prisma.sql`concat_ws(' ', r.text, r."authorName")` },
    { source: 'task', resource: 'tasks', table: 'Task', type: 'linkedType', id: 'linkedId',
      stage: Prisma.sql`(SELECT g."targetStageId" FROM "StageGateCheck" g WHERE g.id = r."stageGateCheckId")`,
      time: Prisma.sql`CASE WHEN length(r."createdAt") = 10 THEN r."createdAt" || 'T12:00:00.000Z' ELSE COALESCE(r."createdAt", '') END`,
      category: Prisma.sql`'task'::text`, eventType: Prisma.sql`CASE WHEN r.type = 'Approval' THEN 'Stage Approval Task' ELSE 'Follow-up Task' END`,
      search: Prisma.sql`concat_ws(' ', r.title, r.note, r."ownerName", r."submittedByName")` },
    { source: 'audit', resource: 'audit-logs', table: 'AuditLog', type: 'entityType', id: 'entityId', stage: Prisma.sql`r.metadata->>'toStageId'`,
      time: Prisma.sql`r.timestamp`, category: Prisma.sql`CASE WHEN r.action = 'AUTOMATION_TASK_CREATED' THEN 'task' WHEN r.action LIKE 'APPROVAL_%' OR r.action LIKE 'STAGE_GATE_%' THEN 'governance' ELSE 'pipeline' END`,
      eventType: Prisma.sql`r.action`, search: Prisma.sql`concat_ws(' ', r."entityTitle", r.reason, r.action, r."actorName")` },
    { source: 'stage_gate', resource: 'stageGateChecks', table: 'StageGateCheck', id: 'dealId', stage: Prisma.sql`r."targetStageId"`,
      time: Prisma.sql`COALESCE(r.timestamp, r."createdAt", '')`, category: Prisma.sql`'governance'::text`, eventType: Prisma.sql`'Stage Gate'::text`,
      search: Prisma.sql`concat_ws(' ', r."dealTitle", r.note, r."submittedByName", r."reviewedByName")` },
  ];
  const sources = definitions.map(definition => Prisma.sql`SELECT ${definition.source}::text AS source,
    ${definition.source} || ':' || r.id AS key, to_jsonb(r) AS record, ${definition.stage} AS "stageId",
    ${definition.time} AS timestamp, ${definition.category} AS category, ${definition.eventType} AS "eventType", ${definition.search} AS search
    FROM ${Prisma.raw(`"${definition.table}"`)} r WHERE ${recordVisibility(definition.resource, actor)} AND EXISTS
    (SELECT 1 FROM related rel WHERE rel.type = ${definition.type ? Prisma.raw(`r."${definition.type}"`) : Prisma.sql`'Deal'`} AND rel.id = ${Prisma.raw(`r."${definition.id}"`)})`);
  return Prisma.sql`WITH related AS (${related}), events AS (${Prisma.join(sources, ' UNION ALL ')})`;
}

export async function getTimelinePage(actor, query) {
  const { entityType, entityId, cursor = '', limit = 50, q = '', stage = 'ALL', category = 'all', type = 'ALL' } = query;
  const supported = ['entityType', 'entityId', 'cursor', 'limit', 'q', 'stage', 'category', 'type'];
  if (Object.keys(query).some(key => !supported.includes(key)) || !['Deal', 'Lead', 'Company', 'Contact'].includes(entityType) ||
      typeof entityId !== 'string' || !entityId || entityId.length > 256 ||
      [q, stage, category, type].some(value => typeof value !== 'string' || value.length > 256) ||
      typeof cursor !== 'string' || cursor.length > 1024 || !Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 100 ||
      !['all', 'communication', 'note', 'pipeline', 'task', 'governance'].includes(category) ||
      !['ALL', 'call', 'email', 'meeting', 'task', 'note', 'stage'].includes(type)) throw invalid('Choose valid timeline filters and a page size from 1 to 100.');
  const common = [Prisma.sql`TRUE`];
  if (q.trim()) common.push(Prisma.sql`strpos(lower(search), lower(${q.trim()})) > 0`);
  if (['call', 'email', 'meeting'].includes(type)) common.push(Prisma.sql`strpos(lower("eventType"), ${type}) > 0`);
  if (type === 'task') common.push(Prisma.sql`source = 'task'`);
  if (type === 'note') common.push(Prisma.sql`category = 'note'`);
  if (type === 'stage') common.push(Prisma.sql`(source IN ('audit', 'stage_gate') OR "eventType" ILIKE '%stage%')`);
  const stageFilter = stage === 'ALL' ? Prisma.sql`TRUE` : stage === 'UNASSIGNED' ? Prisma.sql`COALESCE("stageId", '') = ''` : Prisma.sql`"stageId" = ${stage}`;
  const categoryFilter = category === 'all' ? Prisma.sql`TRUE` : Prisma.sql`category = ${category}`;
  const matching = Prisma.sql`${Prisma.join(common, ' AND ')} AND ${stageFilter} AND ${categoryFilter}`;
  let boundary = Prisma.sql`TRUE`;
  if (cursor) {
    let value;
    try { value = JSON.parse(Buffer.from(cursor, 'base64url').toString()); } catch { throw invalid('Invalid timeline cursor.'); }
    if (!Array.isArray(value) || value.length !== 2 || value.some(item => typeof item !== 'string')) throw invalid('Invalid timeline cursor.');
    boundary = Prisma.sql`(timestamp < ${value[0]} OR (timestamp = ${value[0]} AND key > ${value[1]}))`;
  }
  const cte = timelineQuery(entityType, entityId, actor);
  const [rows, totalRows, categories, stages] = await prisma.$transaction([
    prisma.$queryRaw(Prisma.sql`${cte} SELECT * FROM events WHERE ${matching} AND ${boundary} ORDER BY timestamp DESC, key ASC LIMIT ${Number(limit) + 1}`),
    prisma.$queryRaw(Prisma.sql`${cte} SELECT count(*)::int AS total FROM events WHERE ${matching}`),
    prisma.$queryRaw(Prisma.sql`${cte} SELECT category, count(*)::int AS count FROM events WHERE ${Prisma.join(common, ' AND ')} AND ${stageFilter} GROUP BY category`),
    prisma.$queryRaw(Prisma.sql`${cte} SELECT "stageId", count(*)::int AS count FROM events WHERE ${Prisma.join(common, ' AND ')} AND ${categoryFilter} GROUP BY "stageId"`),
  ], { isolationLevel: 'RepeatableRead' });
  const selected = rows.slice(0, Number(limit));
  const last = selected.at(-1);
  return { items: selected.map(normalize), total: totalRows[0].total,
    facets: { ...Object.fromEntries(categories.map(row => [row.category, row.count])), all: categories.reduce((sum, row) => sum + row.count, 0) },
    stageCounts: { ...Object.fromEntries(stages.map(row => [row.stageId || 'UNASSIGNED', row.count])), ALL: stages.reduce((sum, row) => sum + row.count, 0) },
    nextCursor: rows.length > Number(limit) ? Buffer.from(JSON.stringify([last.timestamp, last.key])).toString('base64url') : null };
}

export const listTimelinePage = getTimelinePage;

