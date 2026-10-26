import { randomUUID } from 'node:crypto';
import { prisma } from '../prisma.js';
import { runRenewalCheck } from './renewalService.js';

const JOB_ID = 'renewal-check';
const HOUR_MS = 60 * 60 * 1000;
const LEASE_MS = 30 * 60 * 1000;

export async function getAutomationStatus() {
  const [renewal, failedFollowUps, worker, failedAttachments, failedCommunications] = await Promise.all([
    prisma.automationRun.findUnique({ where: { id: JOB_ID } }),
    prisma.automationEvent.findMany({ where: { status: 'failed' },
      orderBy: { nextRunAt: 'asc' }, take: 25,
      select: { id: true, trigger: true, attempts: true, nextRunAt: true, lastError: true } }),
    prisma.automationRun.findUnique({ where: { id: 'automation-cycle' } }),
    prisma.attachment.findMany({ where: { purgedAt: null, cleanupAttempts: { gt: 0 } }, take: 25,
      select: { id: true, filename: true, cleanupAttempts: true, lastCleanupError: true } }),
    prisma.integrationConnection.findMany({ where: { status: { in: ['error', 'needs_reauth'] } }, take: 25,
      select: { id: true, userId: true, status: true, attempts: true, nextSyncAt: true, lastError: true } }),
  ]);
  return { renewal, failedFollowUps, worker, failedAttachments, failedCommunications };
}

export async function runScheduledAutomation(now = new Date(), { id = JOB_ID, execute = runRenewalCheck, intervalMs = HOUR_MS } = {}) {
  await prisma.automationRun.upsert({
    where: { id }, create: { id }, update: {},
  });
  const leaseToken = randomUUID();
  const claim = await prisma.automationRun.updateMany({
    where: { id, nextRunAt: { lte: now },
      OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] },
    data: { status: 'running', leaseToken,
      lockedUntil: new Date(now.getTime() + LEASE_MS), lastStartedAt: now,
      attempts: { increment: 1 }, lastError: null },
  });
  if (claim.count === 0) return { claimed: false };
  try {
    const result = await execute();
    if (result.failures.length) {
      throw new Error(`${result.failures.length} renewal(s) failed: ${JSON.stringify(result.failures)}`);
    }
    await prisma.automationRun.updateMany({ where: { id, leaseToken }, data: {
      status: 'completed', leaseToken: null, lockedUntil: null,
      lastCompletedAt: new Date(), nextRunAt: new Date(now.getTime() + intervalMs),
      attempts: 0, runCount: { increment: 1 }, lastError: null,
    } });
    return { claimed: true, ...result };
  } catch (error) {
    const current = await prisma.automationRun.findUnique({ where: { id } });
    const delay = Math.min(HOUR_MS, 60_000 * 2 ** Math.min(current?.attempts || 1, 6));
    await prisma.automationRun.updateMany({ where: { id, leaseToken }, data: {
      status: 'failed', leaseToken: null, lockedUntil: null,
      nextRunAt: new Date(now.getTime() + delay),
      lastError: String(error.message).slice(0, 2000),
    } });
    throw error;
  }
}
