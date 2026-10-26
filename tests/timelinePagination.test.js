import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { getTimelinePage } from '../backend/services/timelinePage.js';

describe('timeline pagination service', () => {
  it('returns bounded pages with nextCursor, facets, and stageCounts', async () => {
    const suffix = randomUUID();
    const dealId = `tl-deal-${suffix}`;
    const activityIds = [`tl-act-1-${suffix}`, `tl-act-2-${suffix}`, `tl-act-3-${suffix}`];
    const actor = { id: 'u-1', role: 'Admin' };

    try {
      await prisma.deal.create({
        data: {
          id: dealId,
          title: `Timeline Test Deal ${suffix}`,
          stageId: 'stg-1',
          stageName: 'New Lead',
          ownerId: actor.id,
        },
      });

      await prisma.activity.createMany({
        data: [
          {
            id: activityIds[0],
            type: 'Call',
            description: 'First call log',
            timestamp: '2026-10-26T10:00:00.000Z',
            linkedType: 'Deal',
            linkedId: dealId,
            stageId: 'stg-1',
            stageName: 'New Lead',
          },
          {
            id: activityIds[1],
            type: 'Email',
            description: 'Follow-up email',
            timestamp: '2026-10-26T11:00:00.000Z',
            linkedType: 'Deal',
            linkedId: dealId,
            stageId: 'stg-1',
            stageName: 'New Lead',
          },
          {
            id: activityIds[2],
            type: 'Meeting',
            description: 'Discovery session',
            timestamp: '2026-10-26T12:00:00.000Z',
            linkedType: 'Deal',
            linkedId: dealId,
            stageId: 'stg-2',
            stageName: 'Discovery',
          },
        ],
      });

      // Page 1: limit 2
      const page1 = await getTimelinePage(actor, {
        entityType: 'Deal',
        entityId: dealId,
        limit: 2,
      });

      expect(page1.items.length).toBe(2);
      expect(page1.total).toBe(3);
      expect(page1.nextCursor).toBeTruthy();
      expect(page1.stageCounts.ALL).toBe(3);
      expect(page1.facets.communication).toBe(3);

      // Newest event first (descending timestamp)
      expect(page1.items[0].id).toBe(activityIds[2]);
      expect(page1.items[1].id).toBe(activityIds[1]);

      // Page 2: with nextCursor
      const page2 = await getTimelinePage(actor, {
        entityType: 'Deal',
        entityId: dealId,
        cursor: page1.nextCursor,
        limit: 2,
      });

      expect(page2.items.length).toBe(1);
      expect(page2.items[0].id).toBe(activityIds[0]);
      expect(page2.nextCursor).toBeNull();

      // Test filtering by stage
      const stage2Page = await getTimelinePage(actor, {
        entityType: 'Deal',
        entityId: dealId,
        stage: 'stg-2',
        limit: 10,
      });
      expect(stage2Page.items.length).toBe(1);
      expect(stage2Page.items[0].id).toBe(activityIds[2]);

      // Test validation
      await expect(
        getTimelinePage(actor, { entityType: 'Deal', entityId: dealId, limit: 150 })
      ).rejects.toMatchObject({ statusCode: 400 });

      await expect(
        getTimelinePage(actor, { entityType: 'InvalidEntity', entityId: dealId })
      ).rejects.toMatchObject({ statusCode: 400 });
    } finally {
      await prisma.activity.deleteMany({ where: { id: { in: activityIds } } });
      await prisma.deal.deleteMany({ where: { id: dealId } });
    }
  });

  it('respects sales rep visibility scoping', async () => {
    const suffix = randomUUID();
    const foreignDealId = `tl-foreign-deal-${suffix}`;
    const foreignActId = `tl-foreign-act-${suffix}`;
    const rep = { id: 'u-3', role: 'Sales Rep' };

    try {
      await prisma.deal.create({
        data: {
          id: foreignDealId,
          title: `Foreign Deal ${suffix}`,
          stageId: 'stg-1',
          stageName: 'New Lead',
          ownerId: 'u-4', // owned by another rep
        },
      });

      await prisma.activity.create({
        data: {
          id: foreignActId,
          type: 'Call',
          description: 'Secret rep call',
          timestamp: '2026-10-26T09:00:00.000Z',
          linkedType: 'Deal',
          linkedId: foreignDealId,
        },
      });

      const repView = await getTimelinePage(rep, {
        entityType: 'Deal',
        entityId: foreignDealId,
        limit: 10,
      });

      // Sales rep should not see foreign deal events
      expect(repView.items.length).toBe(0);
      expect(repView.total).toBe(0);
    } finally {
      await prisma.activity.deleteMany({ where: { id: foreignActId } });
      await prisma.deal.deleteMany({ where: { id: foreignDealId } });
    }
  });
});
