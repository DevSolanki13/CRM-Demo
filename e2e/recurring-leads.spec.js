import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { prisma } from '../backend/prisma.js';
import { cleanupTestRecords } from './support/cleanupTestRecords.js';
import { getLocalDateString } from '../backend/utils/dateUtils.js';
import { shiftDate } from '../shared/leadRecurrence.js';

const suffix = randomUUID();
const repId = `recurring-browser-rep-${suffix}`;
const leadIds = [];
const today = getLocalDateString();
test.beforeAll(async ({ request }) => {
  const identity = await (await request.get('/api/me')).json();
  test.skip(identity.authMode !== 'shared', 'Use a signed-in test account when session authentication is enabled.');
  await prisma.user.create({ data: { id: repId, name: 'Recurring browser test rep', role: 'Sales Rep', email: `${repId}@example.test` } });
});
test.afterAll(async () => {
  await cleanupTestRecords({ leadIds });
  await prisma.user.deleteMany({ where: { id: repId } });
  await prisma.$disconnect();
});

test('admin creates a schedule; assigned rep updates it and opens its reminder task', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const title = `QA recurring monthly ${suffix}`;
  const companyName = `QA recurring company ${suffix}`;
  await page.goto('/leads/new');
  await page.getByRole('tab', { name: /Recurring Leads/ }).click();
  await expect(page).toHaveURL(/\/leads\/recurring$/);
  await page.getByRole('button', { name: 'Add Recurring Lead', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Create Recurring Lead' });
  await form.getByPlaceholder('Enter the lead name').fill(title);
  await form.getByPlaceholder('e.g. AeroTech Solutions').fill(companyName);
  await form.getByLabel('Assigned Owner').selectOption(repId);
  await form.getByLabel('Expected first purchase date').fill(shiftDate(today, 10));
  await form.getByLabel('Repeat every (months)').fill('4');
  const created = page.waitForResponse(response => response.url().endsWith('/api/leads') && response.request().method() === 'POST');
  await form.getByRole('button', { name: 'Save Lead', exact: true }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  const lead = await response.json(); leadIds.push(lead.id);
  expect(lead.recurrenceInterval).toBe(4);
  expect(lead.nextRecurrenceDate).toBe(shiftDate(today, 10));
  await expect(form).toBeHidden();
  const search = page.getByRole('searchbox', { name: 'Search recurring leads', exact: true });
  await search.fill(title);
  await expect(page.getByRole('table')).toContainText('Every 4 months');
  await expect(page.getByRole('table').getByRole('columnheader')).toHaveText([
    'Lead name', 'Email / phone', 'Status', 'Assigned employee',
    'Recurrence date', 'Next recurrence', 'Next follow-up', 'Last contacted', 'Actions',
  ]);
  const leadNameCell = page.getByRole('row').filter({ hasText: title }).locator('td').first();
  await expect(leadNameCell).toContainText(title);
  await expect(leadNameCell).toContainText(companyName);
  await expect(page.getByRole('table')).toContainText('Monthly update needed');
  await search.fill(companyName);
  await expect(page.getByRole('table')).toContainText(title);

  // Each tab's account selection is independent; use the existing shared-mode account switch protocol.
  await page.evaluate(id => sessionStorage.setItem('crm.workspaceAccountId', id), repId);
  await page.reload();
  await page.getByRole('tab', { name: /Recurring Leads/ }).click();
  await page.getByRole('searchbox', { name: 'Search recurring leads', exact: true }).fill(title);
  await expect(page.getByRole('button', { name: 'Add Recurring Lead', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Update cycle', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: `Update cycle — ${title}` });
  await expect(dialog.getByRole('combobox', { name: 'Outcome', exact: true })).toBeVisible();
  await expect(dialog.getByText('Manager controls')).toHaveCount(0);
  await dialog.getByRole('combobox', { name: 'Outcome', exact: true }).selectOption('awaiting');
  await dialog.getByLabel('Update notes').fill('Spoke with customer; waiting for the quantity confirmation.');
  await dialog.getByLabel('Next follow-up date').fill(shiftDate(today, 2));
  await dialog.getByRole('button', { name: 'Save cycle update' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('table')).toContainText('Reviewed');
  const saved = await prisma.lead.findUnique({ where: { id: lead.id } });
  expect(saved.lastRecurringReviewDate).toBe(today);
  expect(saved.nextRecurrenceDate).toBe(lead.nextRecurrenceDate);
  await page.getByRole('button', { name: /Missing monthly update/ }).click();
  await expect(page.getByText('No recurring leads match these filters.')).toBeVisible();

  await page.locator('aside[aria-label="Main Navigation"]').getByRole('button', { name: /^Tasks/ }).click();
  await page.getByRole('searchbox', { name: 'Search tasks' }).fill(title);
  await page.getByRole('button', { name: 'Update cycle', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: `Update cycle — ${title}` })).toBeVisible();
  await page.getByRole('button', { name: 'Close cycle update' }).click();

  const cycle = await prisma.leadRecurrenceCycle.findFirst({ where: { leadId: lead.id } });
  const followUpId = `rlf-${suffix}`;
  const followUpTaskId = `recurrence:${cycle.id}:follow-up`;
  await prisma.task.create({ data: {
    id: followUpTaskId, title: `Follow-up: ${title}`, dueDate: shiftDate(today, 2), type: 'Follow-up',
    linkedType: 'Lead', linkedId: lead.id, linkedTitle: title, ownerId: repId,
    ownerName: 'Recurring browser test rep', status: 'pending', createdAt: today,
  } });
  await prisma.recurringLeadFollowUp.create({ data: {
    id: followUpId, leadId: lead.id, cycleId: cycle.id, taskId: followUpTaskId,
    cycleNumber: cycle.cycleNumber, assigneeId: repId, assigneeName: 'Recurring browser test rep',
    assigneeTimeZone: 'UTC', dueDate: shiftDate(today, 2), status: 'pending',
  } });
  await page.goto('/leads/recurring');
  await page.getByRole('searchbox', { name: 'Search recurring leads', exact: true }).fill(title);
  await page.getByRole('button', { name: `Complete follow-up for ${title}` }).click();
  await expect(page).toHaveURL(new RegExp(`/leads/recurring/${lead.id}\\?.*followUp=${followUpId}`));
  await expect(page.getByText('Was the deal completed for this cycle?')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cycle 1 follow-up' })).toBeVisible();
  await expect(page.getByText('Assigned to Recurring browser test rep')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Deal Completed' })).toBeEnabled();
  expect(errors).toEqual([]);
});

test('mobile supports selected monthly dates and manager pause with a reason', async ({ page, request }) => {
  const title = `QA recurring selected dates ${suffix}`;
  const response = await request.post('/api/leads', { data: { title, ownerId: repId, isRecurring: true,
    recurrenceFrequency: 'monthly_dates', recurrenceDays: [5, 15, 25], recurrenceInterval: 1, recurrenceDate: shiftDate(today, -30) } });
  expect(response.status()).toBe(201);
  const lead = await response.json(); leadIds.push(lead.id);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/leads/recurring');
  await page.getByRole('tab', { name: /Recurring Leads/ }).click();
  await page.getByRole('searchbox', { name: 'Search recurring leads', exact: true }).fill(title);
  await expect(page.getByRole('region', { name: 'Recurring leads', exact: true }).getByRole('list').getByText('Monthly on 5, 15, 25')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('listitem').filter({ has: page.getByRole('button', { name: title, exact: true }) }).getByRole('button', { name: 'Update cycle', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: `Update cycle — ${title}` });
  await dialog.getByLabel('Reason to pause').fill('Customer requested a temporary buying pause.');
  await dialog.getByRole('button', { name: 'Pause schedule', exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Paused', exact: true }).click();
  await expect(page.getByRole('button', { name: title, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View cycle', exact: true }).click();
  await expect(page.getByText(/Schedule paused:/)).toBeVisible();
  await page.getByLabel('Reason to resume').fill('Customer approved restarting the calls.');
  await page.getByRole('button', { name: 'Resume schedule', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect((await prisma.lead.findUnique({ where: { id: lead.id } })).recurrencePaused).toBe(false);
});
