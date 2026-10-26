import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '../prisma.js';
import { visibleRecord } from '../auth/permissions.js';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Set([
  'application/pdf', 'image/png', 'image/jpeg', 'text/plain', 'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };

let client;
function storage() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) fail('Attachment storage is not configured on the server.', 503);
  client ||= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client.storage;
}

async function privateBucket() {
  const bucket = process.env.CRM_ATTACHMENTS_BUCKET || 'crm-attachments';
  const { data, error } = await storage().getBucket(bucket);
  if (error || !data || data.public) fail('Configure a private attachment bucket before uploading files.', 503);
  return storage().from(bucket);
}

async function authorize(recordType, recordId, actor, write = false) {
  const record = ['Deal', 'Lead', 'Contact', 'Company'].includes(recordType)
    ? await visibleRecord(recordType, recordId, actor) : null;
  if (!record) fail('Record not found.', 404);
  if (write && recordType === 'Company' && actor.role === 'Sales Rep' && record.ownerId !== actor.id) {
    fail('Only the company owner or a manager can change its attachments.', 403);
  }
}

export async function listAttachments(recordType, recordId, actor) {
  await authorize(recordType, recordId, actor);
  return prisma.attachment.findMany({ where: { recordType, recordId, deletedAt: null, uploadStatus: 'ready' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, filename: true, contentType: true, size: true,
      createdById: true, createdAt: true } });
}

export async function uploadAttachment(input, actor) {
  const { recordType, recordId, filename, contentType, data } = input;
  await authorize(recordType, recordId, actor, true);
  if (typeof filename !== 'string' || !filename.trim() || filename.length > 180 ||
      !TYPES.has(contentType) || typeof data !== 'string' ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) fail('Choose a supported file of up to 5 MB.');
  const bytes = Buffer.from(data, 'base64');
  if (!bytes.length || bytes.length > MAX_BYTES || bytes.length !== input.size) {
    fail('File size does not match or exceeds 5 MB.');
  }
  const id = `att-${randomUUID()}`;
  const safeFilename = filename.trim().replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);
  const storagePath = `${recordType.toLowerCase()}/${randomUUID()}/${safeFilename || 'attachment'}`;
  const bucket = await privateBucket();
  // Reserve cleanup metadata before touching Storage, so a crash or database
  // failure after the upload cannot leave an untracked object behind.
  await prisma.attachment.create({ data: {
    id, recordType, recordId, storagePath, filename: filename.trim(), contentType,
    size: bytes.length, createdById: actor.id, uploadStatus: 'pending',
  } });
  try {
    const uploaded = await bucket.upload(storagePath, bytes, { contentType, upsert: false });
    if (uploaded.error) fail('Could not store the attachment. Try again.', 502);
    return await prisma.$transaction(async tx => {
      const activated = await tx.attachment.updateMany({ where: { id, uploadStatus: 'pending', deletedAt: null },
        data: { uploadStatus: 'ready' } });
      if (!activated.count) fail('This upload expired. Upload the file again.', 409);
      const row = await tx.attachment.findUnique({ where: { id } });
      await tx.auditLog.create({ data: {
        id: `aud-${randomUUID()}`, timestamp: new Date().toISOString(),
        actorId: actor.id, actorName: actor.name, action: 'ATTACHMENT_ADDED',
        entityType: recordType, entityId: recordId, entityTitle: filename.trim(),
        reason: 'Attachment added.', metadata: { attachmentId: id, size: bytes.length },
      } });
      return { id: row.id, filename: row.filename, contentType: row.contentType,
        size: row.size, createdById: row.createdById, createdAt: row.createdAt };
    });
  } catch (error) {
    await prisma.attachment.updateMany({ where: { id }, data: { deletedAt: new Date() } }).catch(() => {});
    try {
      const removed = await bucket.remove([storagePath]);
      if (!removed.error) await prisma.attachment.updateMany({ where: { id }, data: { purgedAt: new Date(), deletedAt: new Date() } });
    } catch { /* Persisted reservation is retried by the cleanup job. */ }
    throw error;
  }
}

async function accessibleAttachment(id, actor) {
  const row = await prisma.attachment.findUnique({ where: { id } });
  if (!row || row.deletedAt || row.uploadStatus !== 'ready') fail('Attachment not found.', 404);
  await authorize(row.recordType, row.recordId, actor);
  return row;
}

export async function downloadAttachment(id, actor) {
  const row = await accessibleAttachment(id, actor);
  const { data, error } = await (await privateBucket()).createSignedUrl(row.storagePath, 60,
    { download: row.filename });
  if (error) fail('Could not open the attachment. Try again.', 502);
  return { url: data.signedUrl };
}

export async function deleteAttachment(id, actor) {
  const row = await accessibleAttachment(id, actor);
  await authorize(row.recordType, row.recordId, actor, true);
  if (actor.id !== row.createdById && !['Admin', 'Manager'].includes(actor.role)) {
    fail('Only the uploader or a manager can remove this attachment.', 403);
  }
  await prisma.$transaction(async tx => {
    await tx.attachment.update({ where: { id }, data: { deletedAt: new Date() } });
    await tx.auditLog.create({ data: {
      id: `aud-${randomUUID()}`, timestamp: new Date().toISOString(),
      actorId: actor.id, actorName: actor.name, action: 'ATTACHMENT_DELETED',
      entityType: row.recordType, entityId: row.recordId, entityTitle: row.filename,
      reason: 'Attachment removed.', metadata: { attachmentId: id },
    } });
  });
  await purgeDeletedAttachments().catch(() => {});
  return { success: true };
}

export async function purgeDeletedAttachments({ ids, now = new Date() } = {}) {
  const pending = await prisma.attachment.findMany({ where: { ...(ids ? { id: { in: ids } } : {}), purgedAt: null, OR: [
    { deletedAt: { not: null } },
    { uploadStatus: 'pending', createdAt: { lt: new Date(now.getTime() - 30 * 60_000) } },
  ] },
    orderBy: { deletedAt: 'asc' }, take: 50 });
  if (!pending.length) return { purged: 0, failed: 0 };
  const bucket = await privateBucket();
  let purged = 0;
  let failed = 0;
  for (const row of pending) {
    try {
      const { error } = await bucket.remove([row.storagePath]);
      if (error) throw new Error('Storage deletion failed.');
      await prisma.attachment.update({ where: { id: row.id }, data: {
        purgedAt: new Date(), deletedAt: row.deletedAt || new Date(), lastCleanupError: null,
      } });
      purged++;
    } catch {
      failed++;
      await prisma.attachment.updateMany({ where: { id: row.id }, data: {
        cleanupAttempts: { increment: 1 }, lastCleanupError: 'Storage cleanup failed. An automatic retry is pending.',
      } });
    }
  }
  return { purged, failed };
}

export async function initializeAttachmentStorage() {
  const bucket = process.env.CRM_ATTACHMENTS_BUCKET || 'crm-attachments';
  const service = storage();
  const existing = await service.getBucket(bucket);
  if (existing.data?.public) fail('The attachment bucket must be private. Choose a separate private bucket.', 409);
  if (!existing.data) {
    if (existing.error && !['404', 404].includes(existing.error.statusCode)) fail('Could not inspect attachment storage.', 502);
    const created = await service.createBucket(bucket, { public: false, fileSizeLimit: MAX_BYTES, allowedMimeTypes: [...TYPES] });
    if (created.error) fail('Could not create the private attachment bucket.', 502);
  }
  await privateBucket();
  return { bucket, private: true };
}
