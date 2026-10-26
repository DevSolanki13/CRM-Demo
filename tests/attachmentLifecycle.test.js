import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn(), createSignedUrl: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ storage: {
  getBucket: async () => ({ data: { public: false } }), from: () => fake,
} }) }));
import { prisma } from '../backend/prisma.js';
import { uploadAttachment, downloadAttachment, listAttachments, purgeDeletedAttachments } from '../backend/services/attachmentService.js';

let companyId;
const actor = { id: 'u-3', name: 'Sales Rep', role: 'Sales Rep' };
beforeEach(async () => {
  vi.stubEnv('SUPABASE_URL', 'https://storage.example.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  fake.upload.mockResolvedValue({ error: null });
  fake.remove.mockResolvedValue({ error: null });
  fake.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://storage.example.test/private-download' } });
  companyId = `storage-lifecycle-${randomUUID()}`;
  await prisma.company.create({ data: { id: companyId, name: 'Storage lifecycle fixture', ownerId: actor.id } });
});
afterEach(async () => {
  vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.clearAllMocks();
  await prisma.attachment.deleteMany({ where: { recordId: companyId } });
  await prisma.auditLog.deleteMany({ where: { entityId: companyId } });
  await prisma.company.deleteMany({ where: { id: companyId } });
});
const input = () => ({ recordType: 'Company', recordId: companyId, filename: 'sample.txt',
  contentType: 'text/plain', size: 5, data: Buffer.from('hello').toString('base64') });

describe('attachment upload and cleanup lifecycle', () => {
  it('publishes metadata only after upload and authorizes private downloads', async () => {
    const row = await uploadAttachment(input(), actor);
    expect((await prisma.attachment.findUnique({ where: { id: row.id } })).uploadStatus).toBe('ready');
    expect(await listAttachments('Company', companyId, actor)).toMatchObject([{ id: row.id }]);
    await expect(downloadAttachment(row.id, { id: 'u-4', role: 'Sales Rep' })).rejects.toMatchObject({ statusCode: 404 });
    expect(await downloadAttachment(row.id, actor)).toMatchObject({ url: 'https://storage.example.test/private-download' });
    expect(fake.createSignedUrl).toHaveBeenCalledWith(expect.any(String), 60, { download: 'sample.txt' });
  });

  it('retains cleanup metadata if database activation and immediate removal both fail', async () => {
    vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(new Error('Injected database activation failure'));
    fake.remove.mockResolvedValue({ error: { message: 'Injected storage failure' } });
    await expect(uploadAttachment(input(), actor)).rejects.toThrow('Injected database activation failure');
    const pending = await prisma.attachment.findFirst({ where: { recordId: companyId } });
    expect(pending).toMatchObject({ uploadStatus: 'pending', purgedAt: null });
    expect(pending.deletedAt).toBeTruthy();
    expect(await listAttachments('Company', companyId, actor)).toEqual([]);
    expect(await purgeDeletedAttachments({ ids: [pending.id] })).toEqual({ purged: 0, failed: 1 });
    expect((await prisma.attachment.findUnique({ where: { id: pending.id } })).cleanupAttempts).toBe(1);
    fake.remove.mockResolvedValue({ error: null });
    expect(await purgeDeletedAttachments({ ids: [pending.id] })).toEqual({ purged: 1, failed: 0 });
    expect((await prisma.attachment.findUnique({ where: { id: pending.id } })).purgedAt).toBeTruthy();
  });

  it('cleans a stale reservation left by a crashed upload', async () => {
    const id = `crashed-upload-${randomUUID()}`;
    await prisma.attachment.create({ data: { id, recordType: 'Company', recordId: companyId,
      storagePath: `test/${id}`, filename: 'sample.txt', contentType: 'text/plain', size: 5,
      createdById: actor.id, uploadStatus: 'pending', createdAt: new Date(Date.now() - 31 * 60_000) } });
    expect(await purgeDeletedAttachments({ ids: [id] })).toEqual({ purged: 1, failed: 0 });
    expect((await prisma.attachment.findUnique({ where: { id } })).deletedAt).toBeTruthy();
  });
});
