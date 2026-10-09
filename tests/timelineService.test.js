import { describe, it, expect } from 'vitest';
import { getEntityTimeline } from '../backend/services/timelineService.js';

describe('Unified Customer Activity Timeline Service', () => {
  it('returns an empty array when entityType or entityId is missing', async () => {
    const res1 = await getEntityTimeline({ entityType: '', entityId: '' });
    expect(res1).toEqual([]);

    const res2 = await getEntityTimeline({ entityType: null, entityId: 'deal-1' });
    expect(res2).toEqual([]);

    const res3 = await getEntityTimeline({ entityType: 'Deal', entityId: null });
    expect(res3).toEqual([]);
  });

  it('handles non-existent entity lookups gracefully without crashing', async () => {
    const result = await getEntityTimeline({ entityType: 'Deal', entityId: 'non-existent-deal-999999' });
    expect(Array.isArray(result)).toBe(true);
  });
});
