import { randomUUID } from 'node:crypto';
import { prisma } from '../prisma.js';
import { actorContext } from '../auth/identity.js';

const conflict = message => Object.assign(new Error(message), { statusCode: 409 });

export function duplicateContactGroups(contacts) {
  const byEmail = new Map();
  for (const contact of contacts) {
    const email = contact.email?.trim().toLowerCase();
    if (!email) continue;
    byEmail.set(email, [...(byEmail.get(email) || []), contact]);
  }
  return [...byEmail.entries()].filter(([, members]) => members.length > 1)
    .map(([email, members]) => ({ email, contacts: members }));
}

export async function mergeCustomerRecords(type, targetId, sourceId) {
  if (!sourceId || targetId === sourceId || !['Contact', 'Company'].includes(type)) {
    throw Object.assign(new Error('Choose two different customer records to merge.'), { statusCode: 400 });
  }
  return prisma.$transaction(async tx => {
    const ordered = [targetId, sourceId].sort();
    if (type === 'Contact') {
      await tx.$queryRaw`SELECT id FROM "Contact" WHERE id IN (${ordered[0]}, ${ordered[1]}) ORDER BY id FOR UPDATE`;
    } else {
      await tx.$queryRaw`SELECT id FROM "Company" WHERE id IN (${ordered[0]}, ${ordered[1]}) ORDER BY id FOR UPDATE`;
    }
    const model = type === 'Contact' ? tx.contact : tx.company;
    const target = await model.findUnique({ where: { id: targetId } });
    const source = await model.findUnique({ where: { id: sourceId } });
    if (!target || !source) throw conflict('One of the merge records no longer exists.');

    const fill = type === 'Contact'
      ? ['email', 'phone', 'jobTitle', 'companyId', 'companyName']
      : ['industry', 'website', 'address', 'notes'];
    const data = Object.fromEntries(fill.filter(key => !target[key] && source[key])
      .map(key => [key, source[key]]));
    if (type === 'Contact') {
      data.customFields = { ...(source.customFields || {}), ...(target.customFields || {}) };
      await tx.deal.updateMany({ where: { contactId: sourceId },
        data: { contactId: targetId, contactName: target.name } });
    } else {
      await tx.contact.updateMany({ where: { companyId: sourceId },
        data: { companyId: targetId, companyName: target.name } });
      await tx.deal.updateMany({ where: { companyId: sourceId },
        data: { companyId: targetId, companyName: target.name } });
    }
    await tx.task.updateMany({ where: { linkedType: type, linkedId: sourceId },
      data: { linkedId: targetId, linkedTitle: target.name } });
    await tx.note.updateMany({ where: { linkedType: type, linkedId: sourceId },
      data: { linkedId: targetId } });
    await tx.activity.updateMany({ where: { linkedType: type, linkedId: sourceId },
      data: { linkedId: targetId, linkedTitle: target.name } });
    await tx.attachment.updateMany({ where: { recordType: type, recordId: sourceId },
      data: { recordId: targetId } });
    await model.update({ where: { id: targetId }, data });
    await model.delete({ where: { id: sourceId } });

    const actor = actorContext.getStore();
    await tx.auditLog.create({ data: {
      id: `aud-merge-${randomUUID()}`, timestamp: new Date().toISOString(),
      actorId: actor?.id || 'system', actorName: actor?.name || 'System',
      action: `${type.toUpperCase()}_MERGED`, entityType: type, entityId: targetId,
      entityTitle: target.name, reason: `Merged ${source.name} into ${target.name}.`,
      metadata: { sourceId, targetId, sourceName: source.name },
    } });
    return model.findUnique({ where: { id: targetId } });
  }, { isolationLevel: 'Serializable', timeout: 15000 });
}
