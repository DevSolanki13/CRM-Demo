import { test, expect } from './fixtures.js';

test.describe('Mobile Responsive Experience E2E Suite', () => {
  // Use mobile viewport (375x667 standard mobile phone)
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for header to be visible
    await expect(page.locator('header')).toBeVisible({ timeout: 15000 });
  });

  test('01: Mobile shell hides desktop rail and renders mobile bottom navigation', async ({ page }) => {
    // 1. Desktop sidebar rail must be hidden on mobile screen
    const desktopRail = page.locator('aside[aria-label="Main Navigation"]');
    await expect(desktopRail).toBeHidden();

    // 2. Mobile bottom navigation bar must be visible
    const mobileNav = page.locator('nav[aria-label="Mobile Navigation Bar"]');
    await expect(mobileNav).toBeVisible();

    // 3. Header hamburger button must be visible
    const hamburgerBtn = page.getByRole('button', { name: /Open navigation menu|Close navigation menu/i });
    await expect(hamburgerBtn).toBeVisible();

    // 4. Mobile bottom bar includes primary items: Dashboard, Leads, Pipeline, Tasks, More
    await expect(mobileNav.getByRole('button', { name: /Dashboard/i })).toBeVisible();
    await expect(mobileNav.getByRole('button', { name: /Leads/i })).toBeVisible();
    await expect(mobileNav.getByRole('button', { name: /Pipeline/i })).toBeVisible();
    await expect(mobileNav.getByRole('button', { name: /Tasks/i })).toBeVisible();
    await expect(mobileNav.getByRole('button', { name: /More/i })).toBeVisible();
  });

  test('02: Mobile bottom navigation switches tabs seamlessly', async ({ page }) => {
    const mobileNav = page.locator('nav[aria-label="Mobile Navigation Bar"]');

    // 1. Tap Leads in mobile bottom navigation
    await mobileNav.getByRole('button', { name: /Leads/i }).click();
    await expect(page.getByText('Lead Management Ledger')).toBeVisible({ timeout: 10000 });

    // 2. Tap Pipeline in mobile bottom navigation
    await mobileNav.getByRole('button', { name: /Pipeline/i }).click();
    await expect(page.getByText('Pipeline Kanban Console')).toBeVisible({ timeout: 10000 });

    // 3. Tap Tasks in mobile bottom navigation
    await mobileNav.getByRole('button', { name: /Tasks/i }).click();
    await expect(page.getByText('Tasks & Approvals Command Center')).toBeVisible({ timeout: 10000 });

    // 4. Tap Dashboard to return
    await mobileNav.getByRole('button', { name: /Dashboard/i }).click();
    await expect(page.getByRole('heading', { level: 1, name: /Good (morning|afternoon|evening),/ })).toBeVisible({ timeout: 10000 });
  });

  test('03: Mobile menu drawer opens and allows accessing secondary modules', async ({ page }) => {
    const mobileNav = page.locator('nav[aria-label="Mobile Navigation Bar"]');

    // 1. Tap More in bottom bar to open mobile drawer
    await mobileNav.getByRole('button', { name: /More/i }).click();

    // 2. Mobile drawer is now visible with navigation items
    const mobileDrawer = page.getByRole('dialog', { name: 'Navigation menu' });
    await expect(mobileDrawer).toBeVisible({ timeout: 5000 });

    // Check secondary modules
    const contactsBtn = mobileDrawer.getByRole('button', { name: /Contacts/i });
    await expect(contactsBtn).toBeVisible();

    // 3. Click Contacts from mobile drawer
    await contactsBtn.click();

    // Drawer closes and Contacts view is rendered
    await expect(mobileDrawer).toBeHidden();
    await expect(page.getByText('Contacts & Client Directory')).toBeVisible({ timeout: 10000 });
  });

  test('04: Lead Journey view and 360 detail drawer adapt cleanly to mobile', async ({ page }) => {
    const mobileNav = page.locator('nav[aria-label="Mobile Navigation Bar"]');

    // 1. Go to Leads
    await mobileNav.getByRole('button', { name: /Leads/i }).click();
    await expect(page.getByText('Lead Management Ledger')).toBeVisible();

    // 2. In mobile card view, tap on first lead card
    const firstLeadCard = page.locator('.block.md\\:hidden .cursor-pointer').first();
    await expect(firstLeadCard).toBeVisible({ timeout: 10000 });
    await firstLeadCard.click();

    // 3. Lead Journey Console is opened
    await expect(page.getByText('Lead Journey Console')).toBeVisible({ timeout: 10000 });

    // 4. Mobile swipe hint for interlocking chevrons is visible
    await expect(page.getByText('Swipe to inspect ➔')).toBeVisible();

    // 5. Open Lead 360 drawer on mobile
    const open360Btn = page.getByRole('button', { name: /Open Lead 360/i });
    await expect(open360Btn).toBeVisible();
    await open360Btn.click();

    // 6. Detail Drawer appears full-width on mobile
    const drawerDialog = page.locator('div[role="dialog"]');
    await expect(drawerDialog).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Lead 360°')).toBeVisible();

    // 7. Close drawer
    const closeBtn = drawerDialog.getByRole('button', { name: /Close drawer/i });
    await closeBtn.click();
    await expect(drawerDialog).toBeHidden();
  });

  test('05: Pipeline overview keeps stage counts and board navigation usable on mobile', async ({ page }) => {
    const pipeline = page.getByRole('region', { name: 'Pipeline overview' });
    await expect(pipeline.getByRole('heading', { name: 'Pipeline overview' })).toBeVisible();
    await expect(pipeline.getByLabel('Dashboard pipeline')).toBeVisible();
    await expect(pipeline.getByRole('listitem').first()).toBeVisible();
    await pipeline.getByRole('button', { name: 'View board' }).click();
    await expect(page.getByRole('heading', { name: 'Pipeline Kanban Console' })).toBeVisible();
    await expect(page.locator('#active-pipeline')).toHaveValue('pipeline-sales');
  });
});
