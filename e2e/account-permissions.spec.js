import { test, expect } from '@playwright/test';

// Read-only verification of the real workspace, including the selected request actor.
async function selectRole(page, role) {
  const response = await page.request.get('/api/me');
  const { accounts, authMode } = await response.json();
  expect(authMode).toBe('shared');
  const account = accounts.find(user => user.role === role);
  expect(account, `An active ${role} is required`).toBeTruthy();
  await page.goto('/');
  await page.locator('header summary[aria-label^="Account:"]').click();
  const option = page.getByRole('button', { name: `Switch to ${account.name}, ${role}`, exact: true });
  if (await option.getAttribute('aria-pressed') === 'true') await page.keyboard.press('Escape');
  else await option.click();
  await expect(page.getByLabel(`Account: ${account.name}`, { exact: true })).toBeVisible();
  return account;
}

test('sales rep sees their own data throughout the CRM and cannot open restricted pages', async ({ page }) => {
  const account = await selectRole(page, 'Sales Rep');
  for (const [tab, resource] of [['leads', 'leads'], ['pipeline', 'deals'], ['contacts', 'contacts'], ['companies', 'companies'], ['tasks', 'tasks']]) {
    const loaded = page.waitForResponse(response => new URL(response.url()).pathname === `/api/pages/${resource}`);
    await page.goto(`/#${tab}`);
    const response = await loaded;
    expect(response.status()).toBe(200);
    expect(response.request().headers()['x-crm-workspace-user']).toBe(account.id);
    const { items } = await response.json();
    if (resource !== 'companies') expect(items.every(item => item.ownerId === account.id)).toBe(true);
    else for (const company of items.filter(item => item.ownerId !== account.id)) {
      await expect(page.getByRole('button', { name: `Edit ${company.name}`, exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: `Delete ${company.name}`, exact: true })).toHaveCount(0);
    }
    await expect(page.locator('main').getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Team & workload', exact: true })).toHaveCount(0);
  }
  await page.goto('/#reports');
  await expect(page.getByRole('heading', { name: 'Sales reports' })).toBeVisible();
  await expect(page.locator('select[disabled]')).toHaveValue(account.id);

  await page.goto('/#leads');
  await page.getByRole('button', { name: 'Add New Lead', exact: true }).click();
  const owner = page.locator('form select').filter({ has: page.locator(`option[value="${account.id}"]`) });
  await expect(owner).toHaveValue(account.id);
  await expect(owner.locator('option')).toHaveText([account.name]);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  for (const tab of ['employees', 'settings']) {
    await page.goto(`/#${tab}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(account.name.split(' ')[0]);
    await expect(page).toHaveURL(/#dashboard$/);
  }

  await page.getByRole('button', { name: 'Export CRM data as CSV spreadsheet' }).click();
  await expect(page.getByText('Exports include every page you have permission to view.', { exact: false })).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export Leads/ }).click();
  const download = await downloaded;
  const stream = await download.createReadStream();
  let csv = '';
  for await (const chunk of stream) csv += chunk.toString();
  expect(csv).toContain(account.name);
});

test('manager can review the team but has no account or workspace administration controls', async ({ page }) => {
  await selectRole(page, 'Manager');
  await page.goto('/#employees');
  await expect(page.getByRole('heading', { name: 'Team & Workload Management' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Team Member', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Edit|Invite|Set up/ })).toHaveCount(0);
  await page.goto('/#settings');
  await expect(page).toHaveURL(/#dashboard$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('admin retains settings and team management', async ({ page }) => {
  await selectRole(page, 'Admin');
  await page.goto('/#employees');
  await expect(page.getByRole('heading', { name: 'Team & Workload Management' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Team Member', exact: true })).toBeVisible();
  await page.goto('/#settings');
  await expect(page.locator('main').getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/#settings$/);
});
