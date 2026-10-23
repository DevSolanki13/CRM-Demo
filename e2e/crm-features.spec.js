import { test, expect } from './fixtures.js';

test.describe('CRM Features Automated Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the application to hydrate and navigation to load
    await expect(page.locator('aside[aria-label="Main Navigation"]')).toBeVisible({ timeout: 15000 });
  });

  test('01: Dashboard loads and displays main navigation modules', async ({ page }) => {
    const nav = page.locator('aside[aria-label="Main Navigation"]');
    await expect(nav.getByRole('button', { name: /Dashboard/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /Leads/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /Pipeline/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /Follow-ups \/ Tasks/i })).toBeVisible();
  });

  test('02: Automatic follow-up engine generates task upon lead creation', async ({ page }) => {
    const testLeadName = `Apex Bio ${Date.now()}`;
    const testContactName = 'Jane Doe';
    const testCompanyName = 'Apex Biotech';

    const nav = page.locator('aside[aria-label="Main Navigation"]');

    // 1. Navigate to Leads tab
    await nav.getByRole('button', { name: /Leads/i }).click();

    // 2. Click "Add New Lead" button
    const addLeadBtn = page.getByRole('button', { name: /Add New Lead/i });
    await expect(addLeadBtn).toBeVisible();
    await addLeadBtn.click();

    // 3. Fill in lead modal form
    await page.locator('input[placeholder*="AeroTech Circuit Thermal Pads"]').fill(testLeadName);
    await page.locator('input[placeholder*="David Miller"]').fill(testContactName);
    await page.locator('input[placeholder*="AeroTech Solutions"]').fill(testCompanyName);

    // Save lead
    await page.getByRole('button', { name: 'Save Lead' }).click();

    // 4. Navigate to Follow-ups / Tasks tab
    await nav.getByRole('button', { name: /Follow-ups \/ Tasks/i }).click();

    // Switch scope to "All / Team" if needed to ensure all tasks are listed
    const teamScopeBtn = page.getByRole('button', { name: /Team Tasks|All Tasks/i });
    if (await teamScopeBtn.isVisible()) {
      await teamScopeBtn.click();
    }

    // 5. Verify the automated outreach task is listed in the tasks view
    await expect(page.getByText(new RegExp(`First contact outreach for ${testLeadName}`, 'i'))).toBeVisible({ timeout: 10000 });

    // Clean up created test lead and its task so tests leave no residue in database
    const leadsRes = await page.request.get('/api/leads');
    if (leadsRes.ok()) {
      const allLeads = await leadsRes.json();
      const created = allLeads.find(l => l.title === testLeadName);
      if (created) {
        await page.request.delete(`/api/leads/${created.id}`);
      }
    }
  });

  test('03: Unified 360° Timeline renders for deals with multi-source events', async ({ page }) => {
    const nav = page.locator('aside[aria-label="Main Navigation"]');

    // 1. Navigate to Pipeline
    await nav.getByRole('button', { name: /Pipeline/i }).click();

    // 2. Open any existing Deal by clicking on a card in the kanban board
    const dealCard = page.locator('div[draggable="true"], .cursor-pointer').filter({ hasText: /₹|\$|Deal|Opp|Corp|Inc|Ltd/i }).first();
    await expect(dealCard).toBeVisible({ timeout: 10000 });
    await dealCard.click();

    // 3. Verify Detail Drawer opens
    await expect(page.getByRole('dialog')).toBeVisible();

    // 4. Click the "360° Timeline" tab
    const timelineTab = page.getByRole('tab', { name: /360° Timeline/i });
    await expect(timelineTab).toBeVisible();
    await timelineTab.click();

    // 5. Verify timeline panel is active with Quick Activity Logger and filter categories
    await expect(page.locator('#panel-timeline')).toBeVisible();
    await expect(page.getByText(/Unified Activity Logger/i)).toBeVisible();
    await expect(page.getByText(/All History/i)).toBeVisible();
  });

  test('04: Action-Oriented Dashboard renders prioritized work queues with category filters', async ({ page }) => {
    const nav = page.locator('aside[aria-label="Main Navigation"]');

    // 1. Ensure on Dashboard tab
    await nav.getByRole('button', { name: /Dashboard/i }).click();

    // 2. Verify Prioritized Work Queue is rendered
    await expect(page.getByRole('heading', { name: /Prioritized Work Queue/i })).toBeVisible();

    // 3. Verify category filters are present
    await expect(page.getByRole('button', { name: /^All \d+/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Overdue \d+/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Approvals \d+/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Closing Soon \d+/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Renewals \d+/i })).toBeVisible();

    // 4. Test Live Feed toggle and return to Queue
    const liveFeedBtn = page.getByRole('button', { name: /Live Feed/i });
    await expect(liveFeedBtn).toBeVisible();
    await liveFeedBtn.click();

    // In Live Feed, check return to Queue
    const queueBtn = page.getByRole('button', { name: /Queue/i });
    await expect(queueBtn).toBeVisible();
    await queueBtn.click();

    // 5. Filter by Overdue
    await page.getByRole('button', { name: /^Overdue \d+/i }).click();
    await expect(page.getByRole('heading', { name: /Prioritized Work Queue/i })).toBeVisible();
  });
});


test('creates a zero-value opportunity without changing its value', async ({ page }) => {
  const title = `Zero-value opportunity ${Date.now()}`;
  await page.goto('/');
  await page.locator('aside[aria-label="Main Navigation"]').getByRole('button', { name: /Pipeline/ }).click();
  await page.getByRole('button', { name: 'New Deal', exact: true }).click();
  await page.getByPlaceholder('e.g. AeroTech Q3 Packaging Contract').fill(title);
  await page.locator('input[type="number"]').first().fill('0');
  const saved = page.waitForResponse(response => response.url().endsWith('/api/deals') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Save Deal', exact: true }).click();
  const response = await saved;
  expect(response.status()).toBe(201);
  const deal = await response.json();
  expect(deal.value).toBe(0);
  expect(deal.stageId).toBe('stg-1');
  await expect(page.getByRole('heading', { name: 'Create New Deal Opportunity' })).toHaveCount(0);
});
