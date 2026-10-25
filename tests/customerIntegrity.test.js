import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { deleteCompany } from '../backend/services/companyService.js';
import { duplicateContactGroups, mergeCustomerRecords } from '../backend/services/customerMergeService.js';

describe('customer record integrity', () => {
  it('blocks deletion with related data and merges contacts without losing links or history', async () => {
    const suffix = randomUUID();
    const companyId = `co-integrity-${suffix}`;
    const targetId = `ct-target-${suffix}`;
    const sourceId = `ct-source-${suffix}`;
    const dealId = `dl-integrity-${suffix}`;
    const taskId = `tsk-integrity-${suffix}`;
    const noteId = `nt-integrity-${suffix}`;
    const activityId = `act-integrity-${suffix}`;
    try {
      await prisma.company.create({ data: { id: companyId, name: 'Integrity Company' } });
      await prisma.contact.createMany({ data: [
        { id: targetId, name: 'Target', email: 'contact@example.test', companyId },
        { id: sourceId, name: 'Source', email: 'CONTACT@example.test', phone: '555-0101', companyId },
      ] });
      await prisma.deal.create({ data: { id: dealId, title: 'Linked deal', stageId: 'stg-1',
        stageName: 'New Lead', contactId: sourceId, companyId } });
      await prisma.task.create({ data: { id: taskId, title: 'Linked task', linkedType: 'Contact', linkedId: sourceId } });
      await prisma.note.create({ data: { id: noteId, text: 'Linked note', linkedType: 'Contact', linkedId: sourceId } });
      await prisma.activity.create({ data: { id: activityId, type: 'Call', description: 'Linked activity',
        linkedType: 'Contact', linkedId: sourceId } });

      expect(duplicateContactGroups(await prisma.contact.findMany({ where: { id: { in: [targetId, sourceId] } } })))
        .toHaveLength(1);
      await expect(deleteCompany(companyId)).rejects.toMatchObject({ statusCode: 409 });
      expect(await prisma.company.findUnique({ where: { id: companyId } })).toBeTruthy();

      const merged = await mergeCustomerRecords('Contact', targetId, sourceId);
      expect(merged.phone).toBe('555-0101');
      expect(await prisma.contact.findUnique({ where: { id: sourceId } })).toBeNull();
      expect((await prisma.deal.findUnique({ where: { id: dealId } })).contactId).toBe(targetId);
      expect((await prisma.task.findUnique({ where: { id: taskId } })).linkedId).toBe(targetId);
      expect((await prisma.note.findUnique({ where: { id: noteId } })).linkedId).toBe(targetId);
      expect((await prisma.activity.findUnique({ where: { id: activityId } })).linkedId).toBe(targetId);
      const audit = await prisma.auditLog.findFirst({ where: { action: 'CONTACT_MERGED', entityId: targetId } });
      expect(audit.metadata.sourceId).toBe(sourceId);
      await expect(mergeCustomerRecords('Contact', targetId, sourceId))
        .rejects.toMatchObject({ statusCode: 409 });
    } finally {
      await prisma.task.deleteMany({ where: { id: taskId } });
      await prisma.note.deleteMany({ where: { id: noteId } });
      await prisma.activity.deleteMany({ where: { id: activityId } });
      await prisma.deal.deleteMany({ where: { id: dealId } });
      await prisma.auditLog.deleteMany({ where: { entityId: targetId, action: 'CONTACT_MERGED' } });
      await prisma.contact.deleteMany({ where: { id: { in: [targetId, sourceId] } } });
      await prisma.company.deleteMany({ where: { id: companyId } });
    }
  });

  it('merges companies with contacts and deals while retaining a merge audit', async () => {
    const suffix = randomUUID();
    const targetId = `co-target-${suffix}`;
    const sourceId = `co-source-${suffix}`;
    const contactId = `ct-company-${suffix}`;
    const dealId = `dl-company-${suffix}`;
    try {
      await prisma.company.createMany({ data: [
        { id: targetId, name: 'Customer', industry: 'Manufacturing' },
        { id: sourceId, name: 'Customer duplicate', website: 'https://example.test' },
      ] });
      await prisma.contact.create({ data: { id: contactId, name: 'Buyer', companyId: sourceId } });
      await prisma.deal.create({ data: { id: dealId, title: 'Order', stageId: 'stg-1',
        stageName: 'New Lead', companyId: sourceId } });
      const merged = await mergeCustomerRecords('Company', targetId, sourceId);
      expect(merged.website).toBe('https://example.test');
      expect(await prisma.company.findUnique({ where: { id: sourceId } })).toBeNull();
      expect((await prisma.contact.findUnique({ where: { id: contactId } })).companyId).toBe(targetId);
      expect((await prisma.deal.findUnique({ where: { id: dealId } })).companyId).toBe(targetId);
      expect(await prisma.auditLog.findFirst({ where: { action: 'COMPANY_MERGED', entityId: targetId } })).toBeTruthy();
    } finally {
      await prisma.deal.deleteMany({ where: { id: dealId } });
      await prisma.contact.deleteMany({ where: { id: contactId } });
      await prisma.auditLog.deleteMany({ where: { entityId: targetId, action: 'COMPANY_MERGED' } });
      await prisma.company.deleteMany({ where: { id: { in: [targetId, sourceId] } } });
    }
  });
});
