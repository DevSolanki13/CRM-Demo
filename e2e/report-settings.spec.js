import { test, expect } from './fixtures.js';

test('reports and administrator settings render on desktop and mobile', async ({ page }) => {
  await page.goto('/');
  const partialState = await (await page.request.get('/api/state?collections=deals')).json();
  expect(partialState).toHaveProperty('deals');
  expect(partialState).toHaveProperty('_pages');
  const pageOfDeals = await (await page.request.get('/api/pages/deals?limit=2')).json();
  expect(pageOfDeals.items.length).toBeLessThanOrEqual(2);
  expect(pageOfDeals).toHaveProperty('nextCursor');
  const nav = page.locator('aside[aria-label="Main Navigation"]');
  await nav.getByRole('button', { name: 'Reports', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sales reports' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Forecast for/ })).toBeVisible();
  await page.getByRole('combobox').first().selectOption({ index: 1 });
  await expect(page.getByRole('heading', { name: 'Lost Deals by Pipeline Stage' })).toBeVisible();

  await nav.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Approvals', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Manager approval rules' })).toBeVisible();
  await page.getByRole('button', { name: 'Forecast & Targets' }).click();
  await expect(page.getByRole('heading', { name: 'Forecast & sales targets' })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Forecast & sales targets' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save forecast settings' })).toBeVisible();
});
