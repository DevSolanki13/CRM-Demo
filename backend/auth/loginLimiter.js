import { createHash } from 'node:crypto';
import { prisma } from '../prisma.js';

const WINDOW_MS = 15 * 60 * 1000;
const LIMITS = { ip: 100, account: 20 };
const keyFor = (kind, value) => createHash('sha256').update(`${kind}:${value}`).digest('hex');

async function recordAttempt(kind, value) {
  const keyHash = keyFor(kind, value);
  const windowEndsAt = new Date(Date.now() + WINDOW_MS);
  const [entry] = await prisma.$queryRaw`
    INSERT INTO "LoginAttempt" ("keyHash", "count", "windowEndsAt")
    VALUES (${keyHash}, 1, ${windowEndsAt})
    ON CONFLICT ("keyHash") DO UPDATE SET
      "count" = CASE WHEN "LoginAttempt"."windowEndsAt" <= now()
        THEN 1 ELSE "LoginAttempt"."count" + 1 END,
      "windowEndsAt" = CASE WHEN "LoginAttempt"."windowEndsAt" <= now()
        THEN EXCLUDED."windowEndsAt" ELSE "LoginAttempt"."windowEndsAt" END
    RETURNING "count", "windowEndsAt"`;
  return { blocked: entry.count > LIMITS[kind], retryAfter: Math.max(1,
    Math.ceil((entry.windowEndsAt.getTime() - Date.now()) / 1000)) };
}

export async function recordLoginAttempt(ip, email) {
  const [network, account] = await Promise.all([
    recordAttempt('ip', ip), recordAttempt('account', email),
  ]);
  return { blocked: network.blocked || account.blocked,
    retryAfter: Math.max(network.blocked ? network.retryAfter : 0,
      account.blocked ? account.retryAfter : 0) };
}

export async function clearLoginAttempts(ip, email) {
  await prisma.loginAttempt.deleteMany({ where: { keyHash: { in: [
    keyFor('ip', ip), keyFor('account', email),
  ] } } });
}
