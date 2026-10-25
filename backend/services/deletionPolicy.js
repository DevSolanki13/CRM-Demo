import { randomUUID } from 'node:crypto';
import { actorContext } from '../auth/identity.js';

const conflict = message => Object.assign(new Error(message), { statusCode: 409 });

// Customer history is retained. A linked record must be moved or merged before
// its parent can be deleted; audit rows deliberately have no foreign key.
export async function deleteUnlinkedCustomerRecord(tx, type, id) {
  const model = { Company: tx.company, Contact: tx.contact,
    Lead: tx.lead, Deal: tx.deal }[type];
  if (!model) throw new Error(`Unsupported customer record: ${type}`);
  if (type === 'Company') await tx.$queryRaw`SELECT id FROM "Company" WHERE id = ${id} FOR UPDATE`;
  if (type === 'Contact') await tx.$queryRaw`SELECT id FROM "Contact" WHERE id = ${id} FOR UPDATE`;
  if (type === 'Lead') await tx.$queryRaw`SELECT id FROM "Lead" WHERE id = ${id} FOR UPDATE`;
  if (type === 'Deal') await tx.$queryRaw`SELECT id FROM "Deal" WHERE id = ${id} FOR UPDATE`;
  const record = await model.findUnique({ where: { id } });
  if (!record) return false;
  const linked = await Promise.all([
    tx.task.count({ where: { linkedType: type, linkedId: id } }),
    tx.note.count({ where: { linkedType: type, linkedId: id } }),
    tx.activity.count({ where: { linkedType: type, linkedId: id } }),
    tx.attachment.count({ where: { recordType: type, recordId: id, deletedAt: null } }),
    ...(type === 'Company' ? [
      tx.contact.count({ where: { companyId: id } }),
      tx.deal.count({ where: { companyId: id } }),
    ] : []),
    ...(type === 'Contact' ? [tx.deal.count({ where: { contactId: id } })] : []),
    ...(type === 'Lead' ? [tx.deal.count({ where: { leadId: id } })] : []),
    ...(type === 'Deal' ? [
      tx.deal.count({ where: { parentDealId: id } }),
      tx.stageGateCheck.count({ where: { dealId: id } }),
    ] : []),
  ]);
  if (linked.some(Boolean)) {
    throw conflict(`${type} has related records or history. Reassign them before deleting it.`);
  }
  const actor = actorContext.getStore();
  await tx.auditLog.create({ data: {
    id: `aud-delete-${randomUUID()}`, timestamp: new Date().toISOString(),
    actorId: actor?.id || 'system', actorName: actor?.name || 'System',
    action: 'RECORD_DELETED', entityType: type, entityId: id,
    entityTitle: record.title || record.name || id,
    reason: 'Customer record deleted after relation checks.',
    metadata: { recordId: id },
  } });
  await model.delete({ where: { id } });
  return true;
}
