import { describe, it, expect } from 'vitest';
import { getEntityTimeline } from '../backend/services/timelineService.js';
import { createActivity } from '../backend/services/activityNoteService.js';

describe('Lead Journey Backend & Timeline Integration', () => {
  it('records activities with stage context, performedBy, and assignedTo separation', async () => {
    const testActivity = {
      type: 'Outbound Call',
      description: 'Discussed ISO thermal packaging tolerances and sample requirements.',
      timestamp: new Date().toISOString(),
      linkedType: 'Lead',
      linkedId: 'ld-1',
      linkedTitle: 'BioPharma Lab Packaging Contract',
      authorId: 'u-1',
      authorName: 'Alex Vance',
      performedByName: 'Marcus Vance',
      assignedToName: 'Elena Rostova',
      stageId: 'stg-2',
      stageName: 'Contacted',
      isOutbound: true
    };

    const created = await createActivity(testActivity);

    expect(created).toBeDefined();
    expect(created.type).toBe('Outbound Call');
    expect(created.stageId).toBe('stg-2');
    expect(created.stageName).toBe('Contacted');
    expect(created.performedByName).toBe('Marcus Vance');
    expect(created.assignedToName).toBe('Elena Rostova');
    expect(created.authorName).toBe('Alex Vance');
  });

  it('retrieves unified timeline with enriched stage context and actor roles for a Lead', async () => {
    const timeline = await getEntityTimeline({ entityType: 'Lead', entityId: 'ld-1' });

    expect(Array.isArray(timeline)).toBe(true);
    expect(timeline.length).toBeGreaterThan(0);

    const firstItem = timeline[0];
    expect(firstItem).toHaveProperty('id');
    expect(firstItem).toHaveProperty('sourceType');
    expect(firstItem).toHaveProperty('title');
    expect(firstItem).toHaveProperty('performedByName');
    expect(firstItem).toHaveProperty('timestamp');
  });

  it('safely handles queries for leads with no activities without crashing', async () => {
    const timeline = await getEntityTimeline({ entityType: 'Lead', entityId: 'ld-non-existent-999' });
    expect(Array.isArray(timeline)).toBe(true);
    expect(timeline.length).toBe(0);
  });
});
