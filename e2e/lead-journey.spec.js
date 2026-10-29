import { test, expect } from './fixtures.js';

test.describe('Salesforce-Style Lead Journey E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the application navigation to load
    await expect(page.locator('aside[aria-label="Main Navigation"]')).toBeVisible({ timeout: 15000 });
  });

  test('01: Clicking a lead row opens the Salesforce-style Lead Journey workspace', async ({ page }) => {
    const nav = page.locator('aside[aria-label="Main Navigation"]');

    // 1. Navigate to Leads tab
    await nav.getByRole('button', { name: /Leads/i }).click();

    // 2. Click the first lead in the table
    const firstLeadRow = page.locator('table tbody tr').filter({ has: page.locator('.font-display') }).first();
    await expect(firstLeadRow).toBeVisible({ timeout: 10000 });
    await firstLeadRow.click();

    // 3. Verify Salesforce Lightning Highlights Panel (Header)
    await expect(page.getByRole('button', { name: /Back to Ledger/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Open Lead 360/i })).toBeVisible();
    await expect(page.getByText(/Lead Status/i)).toBeVisible();
    await expect(page.getByText(/Pipeline Stage/i)).toBeVisible();
    await expect(page.getByText(/Lead Owner/i)).toBeVisible();
    await expect(page.getByText(/Estimated Value/i)).toBeVisible();

    // 4. Verify Chevron Stage Path is rendered with pipeline stages
    await expect(page.getByRole('button', { name: /New Lead/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Contacted/i }).first()).toBeVisible();

    // 5. Verify Guidance for Success card is present
    await expect(page.getByText(/Guidance for Success/i)).toBeVisible();
    await expect(page.getByText(/Sales Best Practices/i)).toBeVisible();
    await expect(page.getByText(/Stage Checklist/i)).toBeVisible();
  });

  test('02: Selecting a past stage performs read-only inspection without altering actual stage', async ({ page }) => {
    const nav = page.locator('aside[aria-label="Main Navigation"]');

    // 1. Navigate to Leads
    await nav.getByRole('button', { name: /Leads/i }).click();

    // 2. Click a lead row
    const before = await (await page.request.get('/api/state')).json();
    const dealBefore = before.deals.find(deal => deal.title === 'Vanguard Silicone Liners Supply');
    expect(dealBefore).toBeTruthy();
    const leadRow = page.locator('table tbody tr', { hasText: 'Vanguard Silicone Liners' });
    await expect(leadRow).toBeVisible();
    await leadRow.click();

    // 3. Click the "Contacted" chevron in the pipeline path
    const contactedChevron = page.getByRole('button', { name: /Contacted/i }).first();
    await expect(contactedChevron).toBeVisible();
    await contactedChevron.click();

    // 4. Verify the historical inspection indicator is displayed
    await expect(page.getByText(/Viewing:/i)).toBeVisible();

    // 5. Verify "All History" button works to show complete journey
    const allHistoryBtn = page.getByRole('button', { name: /All History/i });
    await expect(allHistoryBtn).toBeVisible();
    await allHistoryBtn.click();
    await expect(page.getByText(/All Stages \(Full Customer Journey\)/i)).toBeVisible();
    const after = await (await page.request.get('/api/state')).json();
    expect(after.deals.find(deal => deal.id === dealBefore.id).stageId).toBe(dealBefore.stageId);
  });

  test('03: Inline Salesforce Activity Composer logs a call to the timeline', async ({ page }) => {
    const nav = page.locator('aside[aria-label="Main Navigation"]');

    // 1. Navigate to Leads
    await nav.getByRole('button', { name: /Leads/i }).click();

    // 2. Open first lead
    const firstLeadRow = page.locator('table tbody tr').filter({ has: page.locator('.font-display') }).first();
    await expect(firstLeadRow).toBeVisible({ timeout: 10000 });
    await firstLeadRow.click();
    await expect(page.getByRole('button', { name: /Back to Ledger/i })).toBeVisible();

    // 3. Click "Log a Call" composer tab
    const logCallTab = page.getByRole('button', { name: /Log a Call/i });
    await expect(logCallTab).toBeVisible();
    await logCallTab.click();

    // 4. Fill in call comments
    const uniqueComment = `E2E Playwright Call Log ${Date.now()}`;
    const commentBox = page.locator('textarea[placeholder*="Call comments"]');
    await expect(commentBox).toBeVisible();
    await commentBox.fill(uniqueComment);

    // 5. Click Save Call button
    await page.getByRole('button', { name: /Save Call/i }).click();

    // 6. Verify toast and activity record appears in the timeline
    await expect(page.getByText(uniqueComment)).toBeVisible({ timeout: 10000 });

    // The page fixture removes the exact activity returned by the API, including on failure.
  });

  test('04: Open Lead 360 opens drawer and Back to Ledger returns to Leads table', async ({ page }) => {
    const nav = page.locator('aside[aria-label="Main Navigation"]');

    // 1. Navigate to Leads
    await nav.getByRole('button', { name: /Leads/i }).click();
    const firstLeadRow = page.locator('table tbody tr').filter({ has: page.locator('.font-display') }).first();
    await expect(firstLeadRow).toBeVisible({ timeout: 10000 });
    await firstLeadRow.click();

    // 2. Click "Open Lead 360"
    const open360Btn = page.getByRole('button', { name: /Open Lead 360/i });
    await expect(open360Btn).toBeVisible();
    await open360Btn.click();

    // 3. Verify DetailDrawer is opened
    await expect(page.getByRole('dialog')).toBeVisible();

    // 4. Close the drawer
    await page.getByRole('button', { name: /Close Drawer/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // 5. Click "Back to Ledger" and verify return to Leads ledger
    const backBtn = page.getByRole('button', { name: /Back to Ledger/i });
    await backBtn.click();
    await expect(page.getByRole('heading', { name: /Lead Management Ledger/i })).toBeVisible();
  });

  test('05: Full multi-stage history is synchronous and visible across all chevrons for advanced leads', async ({ page }) => {
    const nav = page.locator('aside[aria-label="Main Navigation"]');

    // 1. Navigate to Leads
    await nav.getByRole('button', { name: /Leads/i }).click();

    // 2. Select Vanguard Silicone Liners Supply (Stage 5: Negotiation)
    const vanguardRow = page.locator('table tbody tr', { hasText: 'Vanguard Silicone Liners' });
    await expect(vanguardRow).toBeVisible({ timeout: 10000 });
    await vanguardRow.click();

    // 3. Verify lead header details
    await expect(page.getByRole('heading', { name: /Vanguard Silicone Liners Supply/i })).toBeVisible();
    await expect(page.getByText('Vanguard Medical Systems').first()).toBeVisible();

    // 4. Test Stage 1: New Lead
    const newLeadChevron = page.getByRole('button', { name: /New Lead/i }).first();
    await newLeadChevron.click();
    await expect(page.getByText(/Viewing:/i)).toBeVisible();
    await expect(page.getByText(/Dr. Alan Vance/i)).toBeVisible();

    // 5. Test Stage 2: Contacted
    const contactedChevron = page.getByRole('button', { name: /Contacted/i }).first();
    await contactedChevron.click();
    await expect(page.getByText(/autoclave heat tolerance/i)).toBeVisible();

    // 6. Test Stage 3: Sample Sent
    const sampleChevron = page.getByRole('button', { name: /Sample Sent/i }).first();
    await sampleChevron.click();
    await expect(page.getByText(/BlueDart Express/i)).toBeVisible();
    await expect(page.getByText(/BD-904128/i)).toBeVisible();

    // 7. Test Stage 4: Proposal Sent
    const proposalChevron = page.getByRole('button', { name: /Proposal Sent/i }).first();
    await proposalChevron.click();
    await expect(page.getByText(/Q-2026-881/i)).toBeVisible();

    // 8. Test Stage 5: Negotiation (Current Stage)
    const negotiationChevron = page.getByRole('button', { name: /Negotiation/i }).first();
    await negotiationChevron.click();
    await expect(page.getByText(/1,20,000/i).first()).toBeVisible();

    // 9. Back to Ledger and check Closed Lost off-ramp diagnostic banner for Titan Industrial
    await page.getByRole('button', { name: /Back to Ledger/i }).click();
    const titanRow = page.locator('table tbody tr', { hasText: 'Titan Heavy Machinery' });
    await expect(titanRow).toBeVisible({ timeout: 10000 });
    await titanRow.click();

    await expect(page.getByRole('heading', { name: /Titan Heavy Machinery Gasket Pilot/i })).toBeVisible();
    await expect(page.getByText(/Deal Closed Lost at Negotiation/i)).toBeVisible();
    await expect(page.getByText(/Losing to competitor/i).first()).toBeVisible();

    // 10. Back to Ledger and check Closed Won automated repeat cycle for Apex Apparel
    await page.getByRole('button', { name: /Back to Ledger/i }).click();
    const apexRow = page.locator('table tbody tr', { hasText: 'Apex Apparel' });
    await expect(apexRow).toBeVisible({ timeout: 10000 });
    await apexRow.click();

    await expect(page.getByRole('heading', { name: /Apex Apparel Bio-Dye Order/i })).toBeVisible();
    await expect(page.getByText(/Deal Won & Converted Successfully/i)).toBeVisible();
    await expect(page.getByText(/60-Day Renewal replenishment check-in/i).first()).toBeVisible();
  });
});
