import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { listRecordsPage } from '../backend/services/paginatedRecords.js';
import { getStateCollections } from '../backend/services/systemService.js';

describe('bounded lists with larger datasets', () => {
  it('counts and searches all matching records, preserves visibility and deleted cursor boundaries', async () => {
    const prefix = `scale-${randomUUID()}`;
    const ids = Array.from({ length: 257 }, (_, index) => `${prefix}-${String(index).padStart(4, '0')}`);
    try {
      await prisma.lead.createMany({ data: ids.map((id, index) => ({ id, title: `${prefix} ${index}`,
        ownerId: index % 2 ? 'u-4' : 'u-3', source: index % 3 ? 'Website' : 'Referral', isOutbound: index % 4 === 0 })) });
      const actor = { id: 'u-3', role: 'Sales Rep' };
      const first = await listRecordsPage('leads', actor, { q: prefix, limit: 37 });
      expect(first.total).toBe(129);
      expect(first.items).toHaveLength(37);
      expect(first.facets).toMatchObject({ All: 129, MyLeads: 129, Outbound: 65, Inbound: 64 });
      const boundary = first.nextCursor;
      await prisma.lead.delete({ where: { id: boundary } });
      const following = await listRecordsPage('leads', actor, { q: prefix, cursor: boundary, limit: 37 });
      expect(following.total).toBe(128);
      expect(following.items.every(item => item.id > boundary && item.ownerId === actor.id)).toBe(true);
      const seen = new Set(first.items.map(item => item.id));
      let page = following;
      do {
        for (const item of page.items) { expect(seen.has(item.id)).toBe(false); seen.add(item.id); }
        page = page.nextCursor ? await listRecordsPage('leads', actor, { q: prefix, cursor: page.nextCursor, limit: 37 }) : null;
      } while (page);
      expect(seen.size).toBe(129);
      expect((await listRecordsPage('leads', actor, { q: prefix, quick: 'Outbound' })).total).toBe(64);
      expect((await listRecordsPage('leads', actor, { q: "' OR 1=1 --" })).total).toBe(0);
      const state = await getStateCollections(actor, ['leads']);
      expect(state.leads.length).toBeLessThanOrEqual(50);
      expect(state._pages.leads.total).toBeGreaterThanOrEqual(128);
      expect(state._pages.leads.nextCursor).toBeTruthy();
    } finally { await prisma.lead.deleteMany({ where: { id: { in: ids } } }); }
  });
});
