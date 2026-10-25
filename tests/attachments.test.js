import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { listAttachments } from '../backend/services/attachmentService.js';
import { deleteCompany } from '../backend/services/companyService.js';

describe('attachment record integrity', () => {
  it('scopes file metadata and protects a customer with a live attachment', async () => {
    const suffix = randomUUID();
    const companyId = `co-attachment-${suffix}`;
    const id = `att-test-${suffix}`;
    try {
      await prisma.company.create({ data: { id: companyId, name: 'Attachment test', ownerId: 'u-3' } });
      await prisma.attachment.create({ data: {
        id, recordType: 'Company', recordId: companyId,
        storagePath: `test/${suffix}/sample.pdf`, filename: 'sample.pdf',
        contentType: 'application/pdf', size: 128, createdById: 'u-3',
      } });
      const owner = { id: 'u-3', role: 'Sales Rep' };
      const other = { id: 'u-4', role: 'Sales Rep' };
      expect(await listAttachments('Company', companyId, owner))
        .toMatchObject([{ id, filename: 'sample.pdf' }]);
      await expect(listAttachments('Company', companyId, other))
        .rejects.toMatchObject({ statusCode: 404 });
      await expect(deleteCompany(companyId)).rejects.toMatchObject({ statusCode: 409 });
      await expect(prisma.company.delete({ where: { id: companyId } })).rejects.toThrow();
    } finally {
      await prisma.attachment.deleteMany({ where: { id } });
      await prisma.company.deleteMany({ where: { id: companyId } });
    }
  });
});
