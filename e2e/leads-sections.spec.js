import { test, expect } from '@playwright/test';

test('lead sections have canonical URLs and preserve independent filters', async ({ page }) => {
  await page.goto('/leads');
  await expect(page).toHaveURL(/\/leads\/new$/);

  const sidebarLeads = page.locator('aside[aria-label="Main Navigation"]').getByRole('button', { name: 'Leads', exact: true });
  const sectionTabs = page.getByRole('tablist', { name: 'Lead section' }).getByRole('tab');
  const newLeadsTab = sectionTabs.filter({ hasText: 'New Leads' });
  const recurringLeadsTab = sectionTabs.filter({ hasText: 'Recurring Leads' });
  await expect(sectionTabs).toHaveCount(2);
  await expect(sidebarLeads).toHaveAttribute('aria-current', 'page');
  await expect(newLeadsTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('header .crm-header-location')).toContainText('Leads / New Leads');

  const newSearch = page.getByRole('textbox', { name: 'Search leads' });
  await newSearch.fill('new-section search value');
  await recurringLeadsTab.click();
  await expect(page).toHaveURL(/\/leads\/recurring$/);
  await expect(recurringLeadsTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('header .crm-header-location')).toContainText('Leads / Recurring Leads');

  const recurringSearch = page.getByRole('searchbox', { name: 'Search recurring leads', exact: true });
  await recurringSearch.fill('recurring-section search value');
  await newLeadsTab.click();
  await expect(newSearch).toHaveValue('new-section search value');
  await recurringLeadsTab.click();
  await expect(recurringSearch).toHaveValue('recurring-section search value');

  await page.reload();
  await expect(page).toHaveURL(/\/leads\/recurring$/);
  await expect(recurringLeadsTab).toHaveAttribute('aria-selected', 'true');
  await page.goBack();
  await expect(page).toHaveURL(/\/leads\/new$/);
  await expect(newLeadsTab).toHaveAttribute('aria-selected', 'true');

  await page.goto('/leads/all');
  await expect(page).toHaveURL(/\/leads\/new$/);
  await page.goto('/#leads');
  await expect(page).toHaveURL(/\/leads\/new$/);
});
