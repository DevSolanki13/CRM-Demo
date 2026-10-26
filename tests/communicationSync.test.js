import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../backend/prisma.js';
import { encryptToken, decryptToken } from '../backend/integrations/tokenEncryption.js';
import { beginGoogleConsent, completeGoogleConsent, connectionStatus, queueConnectionSync, GOOGLE_SCOPES } from '../backend/integrations/googleConnection.js';
import { syncGoogleConnection } from '../backend/integrations/communicationSync.js';

let user;
let contactId;
const tokens = () => ({ access_token: 'test-access-token', refresh_token: 'test-refresh-token',
  expiry_date: Date.now() + 3600_000, scope: GOOGLE_SCOPES.join(' ') });

beforeEach(async () => {
  vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', '21'.repeat(32));
  vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
  vi.stubEnv('GOOGLE_CLIENT_ID', 'unit-test-client');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'unit-test-secret');
  const suffix = randomUUID();
  user = await prisma.user.create({ data: { id: `sync-user-${suffix}`, name: 'Sync test user',
    email: `sync-${suffix}@example.test`, role: 'Sales Rep' } });
  contactId = `sync-contact-${suffix}`;
  await prisma.contact.create({ data: { id: contactId, name: 'Matched customer', ownerId: user.id, email: 'customer@example.test' } });
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await prisma.activity.deleteMany({ where: { authorId: user.id } });
  await prisma.integrationOAuthState.deleteMany({ where: { userId: user.id } });
  await prisma.integrationConnection.deleteMany({ where: { userId: user.id } });
  await prisma.auditLog.deleteMany({ where: { entityType: 'User', entityId: user.id } });
  await prisma.contact.deleteMany({ where: { id: contactId } });
  await prisma.user.deleteMany({ where: { id: user.id } });
});

const connection = async () => prisma.integrationConnection.create({ data: {
  id: `sync-${randomUUID()}`, userId: user.id, provider: 'google', accountEmail: user.email,
  grantedScopes: GOOGLE_SCOPES, encryptedTokens: encryptToken(tokens(), `google:${user.id}`),
  cursor: { since: '2026-10-01T00:00:00.000Z', gmail: {}, calendar: {} },
  nextSyncAt: new Date(Date.now() - 1000),
} });
const response = (value, status = 200) => new Response(JSON.stringify(value), { status });

describe('communication connection and sync', () => {
  it('authenticates encrypted tokens and rejects another user context or modified ciphertext', () => {
    const encrypted = encryptToken(tokens(), `google:${user.id}`);
    expect(encrypted).not.toContain('test-refresh-token');
    expect(decryptToken(encrypted, `google:${user.id}`).refresh_token).toBe('test-refresh-token');
    expect(() => decryptToken(encrypted, 'google:someone-else')).toThrow();
    const pieces = encrypted.split('.');
    pieces[3] = (pieces[3][0] === 'A' ? 'B' : 'A') + pieces[3].slice(1);
    expect(() => decryptToken(pieces.join('.'), `google:${user.id}`)).toThrow();
  });

  it('binds consent to the browser, consumes state once, and reuses an account on reconnection', async () => {
    vi.spyOn(OAuth2Client.prototype, 'getToken').mockResolvedValue({ tokens: tokens() });
    const finish = async () => {
      const consent = await beginGoogleConsent(user);
      const url = new URL(consent.url);
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('access_type')).toBe('offline');
      expect(url.toString()).not.toContain('unit-test-secret');
      const input = { state: url.searchParams.get('state'), code: 'code', nonce: consent.nonce };
      await expect(completeGoogleConsent({ ...input, nonce: 'different-browser' }))
        .rejects.toMatchObject({ statusCode: 400 });
      const row = await completeGoogleConsent(input, async () => response({ emailAddress: user.email }));
      await expect(completeGoogleConsent(input)).rejects.toMatchObject({ statusCode: 400 });
      return row;
    };
    const first = await finish();
    const second = await finish();
    expect(first.id).toBe(second.id);
    const status = await connectionStatus(user);
    expect(status.connections).toHaveLength(1);
    expect(status.connections[0]).not.toHaveProperty('encryptedTokens');
    await expect(queueConnectionSync(first.id, { id: 'someone-else' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('deduplicates retries and cancellations, excludes unrelated mail, and recovers a crashed lease', async () => {
    const row = await connection();
    let cancelled = false;
    const fetcher = async input => {
      const url = new URL(input);
      if (url.pathname.endsWith('/profile')) return response({ historyId: '100' });
      if (url.pathname.endsWith('/history')) return response({ historyId: '101', history: [{ messagesAdded: [{ message: { id: 'mail-1' } }] }] });
      if (url.pathname.endsWith('/messages')) return response({ messages: [{ id: 'mail-1' }, { id: 'unrelated' }] });
      if (url.pathname.includes('/messages/')) {
        const id = url.pathname.split('/').at(-1);
        return response({ id, internalDate: String(Date.now()), labelIds: ['SENT'], payload: { headers: [
          { name: 'Subject', value: 'Customer follow-up' }, { name: 'From', value: user.email },
          { name: 'To', value: id === 'unrelated' ? 'unrelated@example.test' : 'customer@example.test' },
        ] } });
      }
      if (url.pathname.endsWith('/events')) return response({ nextSyncToken: 'calendar-token', items: [cancelled
        ? { id: 'event-1', status: 'cancelled' }
        : { id: 'event-1', summary: 'Customer meeting', attendees: [{ email: 'customer@example.test' }], start: { dateTime: '2026-10-26T12:00:00Z' } }] });
      throw new Error('Unexpected provider URL');
    };
    expect((await syncGoogleConnection(row.id, { fetcher })).failed).toBeUndefined();
    const first = await prisma.activity.findMany({ where: { integrationConnectionId: row.id } });
    expect(first).toHaveLength(2);
    expect(first.every(item => item.linkedId === contactId)).toBe(true);
    cancelled = true;
    await prisma.integrationConnection.update({ where: { id: row.id }, data: {
      nextSyncAt: new Date(Date.now() - 1000), lockedUntil: new Date(Date.now() - 1000), leaseToken: 'crashed-worker',
    } });
    const competing = await Promise.all([syncGoogleConnection(row.id, { fetcher }), syncGoogleConnection(row.id, { fetcher })]);
    expect(competing.filter(item => item.claimed)).toHaveLength(1);
    const second = await prisma.activity.findMany({ where: { integrationConnectionId: row.id } });
    expect(second).toHaveLength(2);
    expect(second.find(item => item.externalId === 'calendar:event-1')).toMatchObject({
      type: 'Meeting Cancelled', description: 'Customer meeting (cancelled)', linkedId: contactId,
    });
  });

  it('persists a provider failure and resumes after the retry time', async () => {
    const row = await connection();
    expect(await syncGoogleConnection(row.id, { fetcher: async () => response({}, 503) })).toMatchObject({ failed: true });
    const failed = await prisma.integrationConnection.findUnique({ where: { id: row.id } });
    expect(failed.status).toBe('error');
    expect(failed.attempts).toBe(1);
    expect(failed.lastError).not.toContain('test-access-token');
    expect(await syncGoogleConnection(row.id, { fetcher: async () => { throw new Error('Must not run early'); } })).toMatchObject({ claimed: false });
    const result = await syncGoogleConnection(row.id, { now: new Date(failed.nextSyncAt.getTime() + 1), fetcher: async input =>
      response(String(input).includes('/profile') ? { historyId: '100' } : String(input).includes('/events') ? { nextSyncToken: 'next', items: [] } : { messages: [] }) });
    expect(result.failed).toBeUndefined();
    expect((await prisma.integrationConnection.findUnique({ where: { id: row.id } })).status).toBe('connected');
  });
});
