import { test as base } from '@playwright/test';
import { cleanupTestRecords } from './support/cleanupTestRecords.js';

export { expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    const created = { leadIds: [], dealIds: [], activityIds: [] };
    const pending = [];
    const trackCreated = response => {
      if (response.request().method() !== 'POST' || !response.ok()) return;
      const key = { '/api/leads': 'leadIds', '/api/deals': 'dealIds', '/api/activities': 'activityIds' }[new URL(response.url()).pathname];
      if (!key) return;
      const capture = response.json().then(record => {
        if (!record.id) throw new Error('A created test record did not return its ID for cleanup.');
        created[key].push(record.id);
      });
      capture.catch(() => {}); // Report parsing failures after cleaning up IDs already captured.
      pending.push(capture);
    };
    page.on('response', trackCreated);
    try { await use(page); }
    finally {
      page.off('response', trackCreated);
      await Promise.allSettled(pending);
      await cleanupTestRecords(created);
      await Promise.all(pending);
    }
  },
});
