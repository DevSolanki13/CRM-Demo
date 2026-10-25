import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { listRecordsPage } from '../backend/services/paginatedRecords.js';
import { getScopedState } from '../backend/services/systemService.js';

describe('paginated record access', () => {
  it('uses database scope and stable cursors for deals and related activity', async () => {
    const suffix = randomUUID();
    const owned = [`pg-a-${suffix}`, `pg-b-${suffix}`];
    const foreign = `pg-c-${suffix}`;
    const activityIds = [`pg-act-a-${suffix}`, `pg-act-b-${suffix}`];
    const rep = { id: 'u-3', role: 'Sales Rep' };
    try {
      await prisma.deal.createMany({ data: [
        ...owned.map(id => ({ id, title: 'Owned page deal', stageId: 'stg-1',
          stageName: 'New Lead', ownerId: rep.id })),
        { id: foreign, title: 'Foreign page deal', stageId: 'stg-1',
          stageName: 'New Lead', ownerId: 'u-4' },
      ] });
      await prisma.activity.createMany({ data: [
        { id: activityIds[0], type: 'Call', description: 'Owned activity', linkedType: 'Deal', linkedId: owned[0] },
        { id: activityIds[1], type: 'Call', description: 'Foreign activity', linkedType: 'Deal', linkedId: foreign },
      ] });
      const first = await listRecordsPage('deals', rep, { cursor: 'pg-', limit: 1 });
      expect(first.items.map(row => row.id)).toEqual([owned[0]]);
      expect(first.nextCursor).toBe(owned[0]);
      const second = await listRecordsPage('deals', rep, { cursor: first.nextCursor, limit: 1 });
      expect(second.items.map(row => row.id)).toEqual([owned[1]]);
      const activities = await listRecordsPage('activities', rep, { cursor: 'pg-act-', limit: 10 });
      expect(activities.items.map(row => row.id)).toEqual([activityIds[0]]);
      const scoped = await getScopedState(rep);
      expect(scoped.deals.some(row => row.id === owned[0])).toBe(true);
      expect(scoped.deals.some(row => row.id === foreign)).toBe(false);
      expect(scoped.activities.some(row => row.id === activityIds[0])).toBe(true);
      expect(scoped.activities.some(row => row.id === activityIds[1])).toBe(false);
      await expect(listRecordsPage('deals', rep, { limit: 101 }))
        .rejects.toMatchObject({ statusCode: 400 });
    } finally {
      await prisma.activity.deleteMany({ where: { id: { in: activityIds } } });
      await prisma.deal.deleteMany({ where: { id: { in: [...owned, foreign] } } });
    }
  });
});
