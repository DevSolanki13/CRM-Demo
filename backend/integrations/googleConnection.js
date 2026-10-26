import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../prisma.js';
import { encryptToken, decryptToken } from './tokenEncryption.js';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
];
export const OAUTH_COOKIE = 'crm_google_oauth';
export const digest = value => createHash('sha256').update(value).digest('hex');
const context = userId => `google:${userId}`;
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
export const oauthCookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax', path: '/api/integrations/google/callback', maxAge: 10 * 60_000 });

export function googleConfig() {
  const origin = process.env.APP_ORIGIN;
  let url;
  try { url = new URL(origin); } catch { throw fail('Communication sync is not configured.', 503); }
  if (url.origin !== origin || (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname))) throw fail('Communication sync requires the configured application origin.', 503);
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) throw fail('Google Workspace is not enabled for this workspace.', 503);
  // Validate the encryption key before asking the user for consent.
  encryptToken({}, 'configuration-check');
  return { origin, clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${origin}/api/integrations/google/callback` };
}

export function googleOAuthClient() {
  const { clientId, clientSecret, redirectUri } = googleConfig();
  return new OAuth2Client({ clientId, clientSecret, redirectUri, transporterOptions: { timeout: 10000 } });
}

export async function connectionStatus(user) {
  let configured = false;
  try { googleConfig(); configured = true; } catch { /* Expose capability, never credentials. */ }
  const connections = await prisma.integrationConnection.findMany({ where: { userId: user.id, status: { not: 'disconnected' } },
    orderBy: { createdAt: 'desc' }, take: 10,
    select: { id: true, provider: true, accountEmail: true, status: true, lastSyncAt: true,
      nextSyncAt: true, attempts: true, lastError: true, lockedUntil: true } });
  return { configured, connections };
}

export async function beginGoogleConsent(user) {
  const client = googleOAuthClient();
  const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
  const state = randomBytes(32).toString('base64url');
  const nonce = randomBytes(32).toString('base64url');
  await prisma.integrationOAuthState.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  await prisma.integrationOAuthState.create({ data: {
    stateHash: digest(state), userId: user.id, nonceHash: digest(nonce),
    encryptedVerifier: encryptToken(codeVerifier, context(user.id)), expiresAt: new Date(Date.now() + 10 * 60_000),
  } });
  return { nonce, url: client.generateAuthUrl({ access_type: 'offline', prompt: 'consent',
    scope: GOOGLE_SCOPES, state, code_challenge: codeChallenge, code_challenge_method: 'S256',
    include_granted_scopes: true }) };
}

export async function completeGoogleConsent({ state, code, nonce }, fetcher = fetch) {
  if (![state, code, nonce].every(value => typeof value === 'string' && value.length > 0 && value.length <= 4096)) throw fail('This connection link is invalid or expired. Connect again.');
  const stored = await prisma.integrationOAuthState.findUnique({ where: { stateHash: digest(state) }, include: { user: true } });
  if (!stored || stored.nonceHash !== digest(nonce) || stored.expiresAt <= new Date() || !stored.user.active) throw fail('This connection link is invalid or expired. Connect again.');
  const consumed = await prisma.integrationOAuthState.deleteMany({ where: { stateHash: stored.stateHash,
    nonceHash: stored.nonceHash, expiresAt: { gt: new Date() } } });
  if (consumed.count !== 1) throw fail('This connection link was already used. Connect again.');
  const client = googleOAuthClient();
  const { tokens } = await client.getToken({ code, codeVerifier: decryptToken(stored.encryptedVerifier, context(stored.userId)) });
  if (!tokens.access_token || !tokens.refresh_token) throw fail('Google did not grant background access. Connect again and allow both services.');
  const scopes = (tokens.scope || '').split(' ');
  if (GOOGLE_SCOPES.some(scope => !scopes.includes(scope))) throw fail('Allow email and calendar access to enable communication sync.');
  const profileResponse = await fetcher('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(10000),
  });
  if (!profileResponse.ok) throw fail('Google account verification failed. Connect again.', 502);
  const profile = await profileResponse.json();
  if (typeof profile.emailAddress !== 'string' || !profile.emailAddress.includes('@')) throw fail('Google did not return a valid account email.', 502);
  const now = new Date();
  const connection = await prisma.$transaction(async tx => {
    // Reconnecting cancels the previous lease. Imported history stays attached
    // to its original account, even when the user selects a different mailbox.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${stored.userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: stored.userId } });
    if (!user?.active) throw fail('This CRM account is inactive.', 403);
    await tx.integrationConnection.updateMany({ where: { userId: stored.userId, provider: 'google', status: { not: 'disconnected' } },
      data: { status: 'disconnected', encryptedTokens: null, lockedUntil: null, leaseToken: null } });
    const accountEmail = profile.emailAddress.toLowerCase();
    const previous = await tx.integrationConnection.findFirst({ where: { userId: stored.userId, provider: 'google', accountEmail } });
    const data = {
      status: 'connected', grantedScopes: scopes,
      encryptedTokens: encryptToken(tokens, context(stored.userId)),
      nextSyncAt: now, lastError: null, attempts: 0, lockedUntil: null, leaseToken: null,
    };
    const row = previous ? await tx.integrationConnection.update({ where: { id: previous.id }, data })
      : await tx.integrationConnection.create({ data: { ...data,
        id: `google-${randomUUID()}`, userId: stored.userId, provider: 'google', accountEmail,
        cursor: { since: new Date(now.getTime() - 30 * 86400000).toISOString(), gmail: {}, calendar: {} },
      } });
    await tx.auditLog.create({ data: {
      id: `aud-${randomUUID()}`, timestamp: now.toISOString(), actorId: stored.userId,
      actorName: stored.user.name, action: 'COMMUNICATION_CONNECTED', entityType: 'User', entityId: stored.userId,
      reason: 'Google Workspace communication sync connected.', metadata: { connectionId: row.id },
    } });
    return row;
  });
  return { id: connection.id };
}

export async function queueConnectionSync(id, user) {
  const updated = await prisma.integrationConnection.updateMany({ where: { id, userId: user.id, status: { in: ['connected', 'error'] } },
    data: { nextSyncAt: new Date(), lastError: null } });
  if (!updated.count) throw fail('Connection not found or requires consent again.', 409);
  return { queued: true };
}

export async function disconnectConnection(id, user) {
  const row = await prisma.integrationConnection.findFirst({ where: { id, userId: user.id, status: { not: 'disconnected' } } });
  if (!row) throw fail('Connection not found.', 404);
  let tokens;
  try { tokens = decryptToken(row.encryptedTokens, context(user.id)); } catch { /* Disconnection must work if a key was lost. */ }
  await prisma.$transaction([
    prisma.integrationConnection.update({ where: { id }, data: {
      status: 'disconnected', encryptedTokens: null, leaseToken: null, lockedUntil: null, lastError: null,
    } }),
    prisma.auditLog.create({ data: { id: `aud-${randomUUID()}`, timestamp: new Date().toISOString(),
      actorId: user.id, actorName: user.name, action: 'COMMUNICATION_DISCONNECTED',
      entityType: 'User', entityId: user.id, reason: 'Communication sync disconnected.', metadata: { connectionId: id } } }),
  ]);
  let revoked = false;
  if (tokens?.refresh_token) {
    try { await googleOAuthClient().revokeToken(tokens.refresh_token); revoked = true; } catch { /* Local access is already removed. */ }
  }
  return { disconnected: true, revoked };
}
