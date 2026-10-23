import { test, expect } from './fixtures.js';

test.use({ signedIn: false });

test('sign in, refresh the session, and sign out without a role switcher', async ({ page, account }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in to Sales CRM' })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill('incorrect-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('aside[aria-label="Main Navigation"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Switch user role/i })).toHaveCount(0);
  await page.reload();
  await expect(page.locator('aside[aria-label="Main Navigation"]')).toBeVisible();
  await page.getByRole('button', { name: /Account: Test Administrator/ }).click();
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to Sales CRM' })).toBeVisible();
  const state = await page.request.get('/api/state');
  expect(state.status()).toBe(401);
});

test('session expiry clears the CRM and presents login again', async ({ page, account }) => {
  const login = await page.request.post('/api/auth/login', { data: { email: account.email, password: account.password } });
  expect(login.ok()).toBeTruthy();
  await page.goto('/');
  await expect(page.locator('aside[aria-label="Main Navigation"]')).toBeVisible();
  await page.request.post('/api/auth/logout', { data: {} });
  // A real mutation triggers the shared 401 handler after session revocation.
  await page.getByRole('button', { name: /Trigger recurring order cycle check|Trigger renewal check/ }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to Sales CRM' })).toBeVisible();
});
