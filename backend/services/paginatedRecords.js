import { prisma } from '../prisma.js';

const MODELS = {
  companies: 'company', contacts: 'contact', leads: 'lead', deals: 'deal',
  tasks: 'task', notes: 'note', activities: 'activity', 'audit-logs': 'auditLog',
};

export async function listRecordsPage(resource, actor, { cursor = '', limit = 50 } = {}) {
  const model = MODELS[resource];
  if (!model) throw Object.assign(new Error('Unknown record collection.'), { statusCode: 404 });
  const pageSize = Number(limit);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100 ||
      typeof cursor !== 'string' || cursor.length > 256) {
    throw Object.assign(new Error('Use a page size from 1 to 100 and a valid cursor.'), { statusCode: 400 });
  }
  const take = pageSize + 1;
  const managed = ['Admin', 'Manager'].includes(actor.role);
  let rows;
  if (managed) {
    rows = await prisma[model].findMany({ where: { id: { gt: cursor } },
      orderBy: { id: 'asc' }, take });
  } else if (resource === 'companies') {
    rows = await prisma.company.findMany({ where: { id: { gt: cursor }, OR: [
      { ownerId: actor.id }, { contacts: { some: { ownerId: actor.id } } },
      { deals: { some: { ownerId: actor.id } } },
    ] }, orderBy: { id: 'asc' }, take });
  } else if (['contacts', 'leads', 'deals'].includes(resource)) {
    rows = await prisma[model].findMany({ where: { id: { gt: cursor }, ownerId: actor.id },
      orderBy: { id: 'asc' }, take });
  } else if (resource === 'tasks') {
    rows = await prisma.$queryRaw`
      SELECT task.* FROM "Task" task WHERE task.id > ${cursor}
      AND task."ownerId" = ${actor.id}
      AND (task."linkedId" IS NULL OR task."linkedId" = ''
        OR (task."linkedType" = 'Deal' AND EXISTS
          (SELECT 1 FROM "Deal" d WHERE d.id = task."linkedId" AND d."ownerId" = ${actor.id}))
        OR (task."linkedType" = 'Lead' AND EXISTS
          (SELECT 1 FROM "Lead" l WHERE l.id = task."linkedId" AND l."ownerId" = ${actor.id}))
        OR (task."linkedType" = 'Contact' AND EXISTS
          (SELECT 1 FROM "Contact" c WHERE c.id = task."linkedId" AND c."ownerId" = ${actor.id}))
        OR (task."linkedType" = 'Company' AND EXISTS
          (SELECT 1 FROM "Company" c WHERE c.id = task."linkedId" AND
            (c."ownerId" = ${actor.id} OR EXISTS
              (SELECT 1 FROM "Deal" d WHERE d."companyId" = c.id AND d."ownerId" = ${actor.id})
              OR EXISTS (SELECT 1 FROM "Contact" ct WHERE ct."companyId" = c.id AND ct."ownerId" = ${actor.id})))))
      ORDER BY task.id ASC LIMIT ${take}`;
  } else if (resource === 'notes') {
    rows = await prisma.$queryRaw`
      SELECT note.* FROM "Note" note WHERE note.id > ${cursor}
      AND ((note."linkedType" = 'Deal' AND EXISTS
          (SELECT 1 FROM "Deal" d WHERE d.id = note."linkedId" AND d."ownerId" = ${actor.id}))
        OR (note."linkedType" = 'Lead' AND EXISTS
          (SELECT 1 FROM "Lead" l WHERE l.id = note."linkedId" AND l."ownerId" = ${actor.id}))
        OR (note."linkedType" = 'Contact' AND EXISTS
          (SELECT 1 FROM "Contact" c WHERE c.id = note."linkedId" AND c."ownerId" = ${actor.id}))
        OR (note."linkedType" = 'Company' AND EXISTS
          (SELECT 1 FROM "Company" c WHERE c.id = note."linkedId" AND
            (c."ownerId" = ${actor.id} OR EXISTS
              (SELECT 1 FROM "Deal" d WHERE d."companyId" = c.id AND d."ownerId" = ${actor.id})
              OR EXISTS (SELECT 1 FROM "Contact" ct WHERE ct."companyId" = c.id AND ct."ownerId" = ${actor.id}))))
        OR ((note."linkedId" IS NULL OR note."linkedId" = '') AND note."authorId" = ${actor.id}))
      ORDER BY note.id ASC LIMIT ${take}`;
  } else if (resource === 'activities') {
    rows = await prisma.$queryRaw`
      SELECT activity.* FROM "Activity" activity WHERE activity.id > ${cursor}
      AND ((activity."linkedType" = 'Deal' AND EXISTS
          (SELECT 1 FROM "Deal" d WHERE d.id = activity."linkedId" AND d."ownerId" = ${actor.id}))
        OR (activity."linkedType" = 'Lead' AND EXISTS
          (SELECT 1 FROM "Lead" l WHERE l.id = activity."linkedId" AND l."ownerId" = ${actor.id}))
        OR (activity."linkedType" = 'Contact' AND EXISTS
          (SELECT 1 FROM "Contact" c WHERE c.id = activity."linkedId" AND c."ownerId" = ${actor.id}))
        OR (activity."linkedType" = 'Company' AND EXISTS
          (SELECT 1 FROM "Company" c WHERE c.id = activity."linkedId" AND
            (c."ownerId" = ${actor.id} OR EXISTS
              (SELECT 1 FROM "Deal" d WHERE d."companyId" = c.id AND d."ownerId" = ${actor.id})
              OR EXISTS (SELECT 1 FROM "Contact" ct WHERE ct."companyId" = c.id AND ct."ownerId" = ${actor.id}))))
        OR ((activity."linkedId" IS NULL OR activity."linkedId" = '')
          AND activity."authorId" = ${actor.id}))
      ORDER BY activity.id ASC LIMIT ${take}`;
  } else {
    rows = await prisma.$queryRaw`
      SELECT audit.* FROM "AuditLog" audit WHERE audit.id > ${cursor}
      AND ((audit."entityType" = 'Deal' AND EXISTS
          (SELECT 1 FROM "Deal" d WHERE d.id = audit."entityId" AND d."ownerId" = ${actor.id}))
        OR (audit."entityType" = 'Lead' AND EXISTS
          (SELECT 1 FROM "Lead" l WHERE l.id = audit."entityId" AND l."ownerId" = ${actor.id}))
        OR (audit."entityType" = 'Contact' AND EXISTS
          (SELECT 1 FROM "Contact" c WHERE c.id = audit."entityId" AND c."ownerId" = ${actor.id}))
        OR (audit."entityType" = 'Company' AND EXISTS
          (SELECT 1 FROM "Company" c WHERE c.id = audit."entityId" AND
            (c."ownerId" = ${actor.id} OR EXISTS
              (SELECT 1 FROM "Deal" d WHERE d."companyId" = c.id AND d."ownerId" = ${actor.id})
              OR EXISTS (SELECT 1 FROM "Contact" ct WHERE ct."companyId" = c.id AND ct."ownerId" = ${actor.id})))))
      ORDER BY audit.id ASC LIMIT ${take}`;
  }
  const hasMore = rows.length > pageSize;
  const items = rows.slice(0, pageSize);
  return { items, nextCursor: hasMore ? items.at(-1).id : null };
}
