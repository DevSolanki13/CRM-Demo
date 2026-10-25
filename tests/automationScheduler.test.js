import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { runScheduledAutomation } from '../backend/services/automationScheduler.js';

describe('renewal worker leases', () => {
  it('allows one worker at a time, records failure, and retries an expired lease', async () => {
    const id = `test-renewal-${randomUUID()}`;
    const now = new Date();
    let executions = 0;
    try {
      await prisma.automationRun.create({ data: { id, nextRunAt: new Date(now.getTime() - 1000) } });
      const execute = async () => {
        executions++;
        await new Promise(resolve => setTimeout(resolve, 30));
        return { flippedCount: 0, failures: [] };
      };
      const competing = await Promise.all([
        runScheduledAutomation(now, { id, execute }),
        runScheduledAutomation(now, { id, execute }),
      ]);
      expect(competing.filter(result => result.claimed)).toHaveLength(1);
      expect(executions).toBe(1);
      expect((await prisma.automationRun.findUnique({ where: { id } })).runCount).toBe(1);

      await prisma.automationRun.update({ where: { id }, data: {
        status: 'running', leaseToken: 'crashed-worker',
        nextRunAt: new Date(now.getTime() - 1000), lockedUntil: new Date(now.getTime() - 1000)
      } });
      await expect(runScheduledAutomation(now, { id, execute: async () => {
        throw new Error('Temporary worker failure');
      } })).rejects.toThrow('Temporary worker failure');
      const failed = await prisma.automationRun.findUnique({ where: { id } });
      expect(failed.status).toBe('failed');
      expect(failed.lastError).toContain('Temporary worker failure');
      const retried = await runScheduledAutomation(new Date(failed.nextRunAt.getTime() + 1), { id, execute });
      expect(retried.claimed).toBe(true);
      expect((await prisma.automationRun.findUnique({ where: { id } })).status).toBe('completed');
    } finally {
      await prisma.automationRun.deleteMany({ where: { id } });
    }
  });
});
