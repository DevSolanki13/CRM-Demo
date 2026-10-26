import { createHash, randomUUID } from 'node:crypto';
import { prisma } from '../prisma.js';
import { googleOAuthClient } from './googleConnection.js';
import { encryptToken, decryptToken } from './tokenEncryption.js';

const gmailBase = 'https://gmail.googleapis.com/gmail/v1/users/me';
const calendarBase = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const tokenContext = userId => `google:${userId}`;
const emails = value => [...new Set((String(value || '').match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map(item => item.toLowerCase()))].slice(0, 100);
const validDate = (value, fallback = new Date().toISOString()) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
};

async function matchCustomer(userId, addresses, accountEmail) {
  const candidates = addresses.filter(email => email !== accountEmail.toLowerCase());
  if (!candidates.length) return {};
  const contacts = await prisma.contact.findMany({ where: { ownerId: userId,
    OR: candidates.map(email => ({ email: { equals: email, mode: 'insensitive' } })) }, take: 2 });
  if (contacts.length === 1) return { linkedType: 'Contact', linkedId: contacts[0].id, linkedTitle: contacts[0].name };
  if (contacts.length > 1) return {};
  const leads = await prisma.lead.findMany({ where: { ownerId: userId,
    OR: candidates.map(email => ({ contactEmail: { equals: email, mode: 'insensitive' } })) }, take: 2 });
  return leads.length === 1 ? { linkedType: 'Lead', linkedId: leads[0].id, linkedTitle: leads[0].title } : {};
}

export async function persistCommunication(connection, leaseToken, event) {
  const link = await matchCustomer(connection.userId, event.addresses, connection.accountEmail);
  const id = `act-sync-${createHash('sha256').update(`${connection.id}:${event.externalId}`).digest('hex')}`;
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "IntegrationConnection" WHERE id = ${connection.id} FOR UPDATE`;
    const active = await tx.integrationConnection.findFirst({ where: { id: connection.id, leaseToken,
      status: { in: ['connected', 'error'] }, user: { active: true } }, select: { id: true } });
    if (!active) throw Object.assign(new Error('Connection lease changed.'), { leaseLost: true });
    const existing = await tx.activity.findUnique({ where: { integrationConnectionId_externalId: {
      integrationConnectionId: connection.id, externalId: event.externalId,
    } } });
    // Unrelated mailbox content never enters the shared CRM. Ambiguous matches
    // are skipped, while updates and cancellations retain their original link.
    if (!existing && !link.linkedId) return null;
    if (event.cancelled && event.subject === 'Calendar event' && existing) {
      event.subject = existing.metadata?.subject || existing.description;
      event.description = `${event.subject} (cancelled)`;
      event.addresses = existing.metadata?.participants || [];
      event.timestamp = existing.timestamp;
    }
    const data = { type: event.type, description: event.description.slice(0, 10000), timestamp: event.timestamp,
      metadata: { provider: 'google', source: event.source, externalId: event.externalId,
        subject: event.subject, participants: event.addresses, cancelled: Boolean(event.cancelled),
        ...(event.url ? { providerUrl: event.url } : {}) }, isOutbound: Boolean(event.isOutbound) };
    // Retain manually repaired links on subsequent syncs.
    return tx.activity.upsert({ where: { integrationConnectionId_externalId: {
      integrationConnectionId: connection.id, externalId: event.externalId,
    } }, create: { id, ...data, ...link, integrationConnectionId: connection.id,
      externalId: event.externalId, authorId: connection.userId,
      authorName: connection.user.name, performedByName: connection.user.name,
      createdAt: new Date().toISOString() }, update: data });
  });
}

export async function syncGoogleConnection(id, { fetcher = fetch, now = new Date() } = {}) {
  const leaseToken = randomUUID();
  const claimed = await prisma.integrationConnection.updateMany({ where: { id,
    status: { in: ['connected', 'error'] }, nextSyncAt: { lte: now }, user: { active: true },
    OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] }, data: {
    leaseToken, lockedUntil: new Date(now.getTime() + 10 * 60_000), attempts: { increment: 1 },
  } });
  if (!claimed.count) return { claimed: false };
  const connection = await prisma.integrationConnection.findUnique({ where: { id }, include: { user: true } });
  try {
    let tokens = decryptToken(connection.encryptedTokens, tokenContext(connection.userId));
    const cursor = structuredClone(connection.cursor || {});
    cursor.since ||= new Date(now.getTime() - 30 * 86400000).toISOString();
    cursor.gmail ||= {};
    cursor.calendar ||= {};
    async function refresh() {
      const client = googleOAuthClient();
      client.setCredentials(tokens);
      await client.getAccessToken();
      tokens = { ...tokens, ...client.credentials };
    }
    if (!tokens.access_token || !tokens.expiry_date || tokens.expiry_date < Date.now() + 60_000) await refresh();
    async function get(url, retried = false) {
      const response = await fetcher(url, { headers: { Authorization: `Bearer ${tokens.access_token}` },
        signal: AbortSignal.timeout(10000) });
      if (response.status === 401 && !retried) { await refresh(); return get(url, true); }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const code = typeof body.error === 'string' ? body.error : body.error?.errors?.[0]?.reason;
        throw Object.assign(new Error(`Google sync returned HTTP ${response.status}.`), {
          providerStatus: response.status, needsConsent: response.status === 401 || code === 'insufficientPermissions' || code === 'invalid_grant',
        });
      }
      return response.json();
    }

    let continued = false;
    let processed = 0;
    const gmail = cursor.gmail;
    try {
      if (!gmail.historyId && !gmail.baselineHistoryId) gmail.baselineHistoryId = (await get(`${gmailBase}/profile`)).historyId;
      const query = new URLSearchParams({ maxResults: '25' });
      let listing;
      if (gmail.historyId) {
        query.set('startHistoryId', gmail.historyId);
        query.append('historyTypes', 'messageAdded');
        if (gmail.pageToken) query.set('pageToken', gmail.pageToken);
        listing = await get(`${gmailBase}/history?${query}`);
      } else {
        query.set('q', `after:${Math.floor(new Date(cursor.since).getTime() / 1000)}`);
        if (gmail.pageToken) query.set('pageToken', gmail.pageToken);
        listing = await get(`${gmailBase}/messages?${query}`);
      }
      const messageIds = [...new Set(gmail.historyId
        ? (listing.history || []).flatMap(history => (history.messagesAdded || []).map(item => item.message?.id)).filter(Boolean)
        : (listing.messages || []).map(item => item.id))];
      for (const messageId of messageIds) {
        let message;
        try { message = await get(`${gmailBase}/messages/${encodeURIComponent(messageId)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc`); }
        catch (error) { if (error.providerStatus === 404) continue; throw error; }
        const header = name => message.payload?.headers?.find(item => item.name.toLowerCase() === name)?.value || '';
        const subject = header('subject') || 'Email';
        const addresses = emails([header('from'), header('to'), header('cc')].join(', '));
        await persistCommunication(connection, leaseToken, { externalId: `gmail:${message.id}`, source: 'gmail',
          type: message.labelIds?.includes('SENT') ? 'Outbound Email' : 'Inbound Email',
          isOutbound: message.labelIds?.includes('SENT'), subject, addresses,
          description: subject, timestamp: validDate(Number(message.internalDate)),
          url: `https://mail.google.com/mail/u/${encodeURIComponent(connection.accountEmail)}/#all/${encodeURIComponent(message.threadId || message.id)}` });
        processed++;
      }
      gmail.pageToken = listing.nextPageToken || null;
      if (listing.nextPageToken) continued = true;
      else {
        gmail.historyId = listing.historyId || gmail.baselineHistoryId || gmail.historyId;
        delete gmail.baselineHistoryId;
      }
    } catch (error) {
      if (error.providerStatus !== 404 || !gmail.historyId) throw error;
      cursor.gmail = {}; // Expired history: bounded full sync, idempotent upserts.
      continued = true;
    }

    const calendar = cursor.calendar;
    try {
      const query = new URLSearchParams({ maxResults: '50', singleEvents: 'true', showDeleted: 'true' });
      if (calendar.syncToken) query.set('syncToken', calendar.syncToken);
      else query.set('timeMin', cursor.since);
      if (calendar.pageToken) query.set('pageToken', calendar.pageToken);
      const listing = await get(`${calendarBase}?${query}`);
      for (const event of listing.items || []) {
        const externalId = `calendar:${event.id}`;
        // Deleted tombstones can contain only an ID; retain the original link.
        const addresses = emails((event.attendees || []).map(item => item.email).join(', '));
        const subject = event.summary || 'Calendar event';
        await persistCommunication(connection, leaseToken, { externalId, source: 'calendar',
          type: event.status === 'cancelled' ? 'Meeting Cancelled' : 'Meeting',
          cancelled: event.status === 'cancelled', subject, addresses,
          description: `${subject}${event.status === 'cancelled' ? ' (cancelled)' : ''}`,
          timestamp: validDate(event.start?.dateTime || event.start?.date || event.updated),
          url: typeof event.htmlLink === 'string' && event.htmlLink.startsWith('https://www.google.com/calendar/') ? event.htmlLink : undefined });
        processed++;
      }
      calendar.pageToken = listing.nextPageToken || null;
      if (listing.nextPageToken) continued = true;
      else if (listing.nextSyncToken) calendar.syncToken = listing.nextSyncToken;
    } catch (error) {
      if (error.providerStatus !== 410) throw error;
      cursor.calendar = {}; // Invalid sync token: rescan without duplicating history.
      continued = true;
    }
    const updated = await prisma.integrationConnection.updateMany({ where: { id, leaseToken }, data: {
      status: 'connected', encryptedTokens: encryptToken(tokens, tokenContext(connection.userId)), cursor,
      lastSyncAt: new Date(), nextSyncAt: new Date(now.getTime() + (continued ? 5000 : 5 * 60_000)),
      leaseToken: null, lockedUntil: null, attempts: 0, lastError: null,
    } });
    return { claimed: true, processed, continued, leaseLost: !updated.count };
  } catch (error) {
    if (error.leaseLost) return { claimed: true, leaseLost: true };
    const needsConsent = error.needsConsent || error.response?.data?.error === 'invalid_grant';
    const delay = Math.min(60 * 60_000, 60_000 * 2 ** Math.min(connection.attempts, 6));
    await prisma.integrationConnection.updateMany({ where: { id, leaseToken }, data: {
      status: needsConsent ? 'needs_reauth' : 'error', leaseToken: null, lockedUntil: null,
      nextSyncAt: new Date(now.getTime() + delay),
      lastError: needsConsent ? 'Google access expired or was revoked. Reconnect this account.' : 'Communication sync failed. An automatic retry is scheduled.',
    } });
    return { claimed: true, failed: true, needsConsent };
  }
}

export async function processCommunicationSyncs() {
  const now = new Date();
  const connections = await prisma.integrationConnection.findMany({ where: {
    status: { in: ['connected', 'error'] }, nextSyncAt: { lte: now }, user: { active: true },
    OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
  }, orderBy: { nextSyncAt: 'asc' }, take: 3, select: { id: true } });
  const results = [];
  for (const connection of connections) results.push(await syncGoogleConnection(connection.id));
  return { processed: results.filter(item => item.claimed).length, failed: results.filter(item => item.failed).length };
}
