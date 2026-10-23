import { test, expect } from './fixtures.js';

test('opens the CRM directly without a sign-in screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('aside[aria-label="Main Navigation"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Sign in to Sales CRM/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Sign out/i })).toHaveCount(0);
  await page.reload();
  await expect(page.locator('aside[aria-label="Main Navigation"]')).toBeVisible();
});

test('serves the shared CRM profile without a session cookie', async ({ request }) => {
  const response = await request.get('/api/me');
  expect(response.ok()).toBeTruthy();
  const { user } = await response.json();
  expect(user).toMatchObject({ role: 'Admin', active: true });
  expect(user).not.toHaveProperty('passwordHash');
});
