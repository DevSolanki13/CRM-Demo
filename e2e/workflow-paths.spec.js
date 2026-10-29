import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { prisma } from '../backend/prisma.js';
import { cleanupTestRecords } from './support/cleanupTestRecords.js';

for (const [device, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
test(`${device}: qualification, approval, demotion, won, lost, and renewal`, async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize(viewport);
  const navigatePipeline = () => page.locator(device === 'mobile' ? 'nav[aria-label="Mobile Navigation Bar"]' : 'aside[aria-label="Main Navigation"]').getByRole('button', { name: /Pipeline/i }).click();
  const suffix = randomUUID();
  let qualifiedId;
  let lostId;
  const qualifiedTitle = `Browser qualification ${suffix}`;
  const lostTitle = `Browser lost ${suffix}`;
  const ids = [];
  const post = async (path, body) => page.request.post(path, { data: body });
  try {
    const users = await (await page.request.get('/api/users')).json();
    const admin = users.find(user => user.active && user.role === 'Admin');
    expect(admin).toBeTruthy();
    for (const [kind, title] of [['qualified', qualifiedTitle], ['lost', lostTitle]]) {
      const response = await post('/api/deals', { title, value: 0 });
      expect(response.status()).toBe(201);
      const saved = await response.json();
      ids.push(saved.id);
      if (kind === 'qualified') qualifiedId = saved.id; else lostId = saved.id;
      expect(saved.value).toBe(0);
    }

    await page.goto('/');
    await navigatePipeline();
    await expect(page.getByText(qualifiedTitle, { exact: true })).toBeVisible();

    const request = await post('/api/stage-gate-checks', {
      dealId: qualifiedId, fromStageId: 'stg-1', targetStageId: 'stg-2',
      submittedBy: admin.id, submittedByName: admin.name, answers: {}
    });
    expect(request.status()).toBe(201);
    const check = await request.json();
    const blocked = await post(`/api/deals/${qualifiedId}/stage-transition`, {
      targetStageId: 'stg-8', user: admin, lostReason: 'Too early'
    });
    expect(blocked.status()).toBe(409);
    expect((await prisma.deal.findUnique({ where: { id: qualifiedId } })).stageId).toBe('stg-1');
    expect((await post(`/api/stage-gate-checks/${check.id}/approve`, {
      reviewer: { id: admin.id }
    })).ok()).toBe(true);
    await page.reload();
    await navigatePipeline();
    await expect(page.getByText(qualifiedTitle, { exact: true }).first()).toBeVisible();

    const missingReason = await post(`/api/deals/${qualifiedId}/stage-transition`, {
      targetStageId: 'stg-1', user: admin
    });
    expect(missingReason.status()).toBe(400);
    await page.locator('div[draggable]').filter({ hasText: qualifiedTitle }).first()
      .getByTitle('Demote / previous stage (requires mandatory demotion reason)').click();
    await page.getByPlaceholder('Explain why this deal is being moved backwards...')
      .fill('Discovery incomplete');
    await page.getByRole('button', { name: /Confirm Backward Move to/i }).click();
    await expect.poll(async () => (await prisma.deal.findUnique({ where: { id: qualifiedId } })).stageId)
      .toBe('stg-1');
    await expect(page.getByTestId('pipeline-stage-stg-1').getByText(qualifiedTitle, { exact: true })).toBeVisible();
    await page.locator('div[draggable]').filter({ hasText: qualifiedTitle }).first()
      .getByTitle('Advance to next stage (Stage Gate Check)').click();
    for (const yes of await page.getByRole('button', { name: 'YES', exact: true }).all()) {
      await yes.click();
    }
    await page.getByRole('button', { name: /Execute Auto-Advance to/i }).click();
    await expect.poll(async () => (await prisma.deal.findUnique({ where: { id: qualifiedId } })).stageId)
      .toBe('stg-2');
    expect((await post(`/api/deals/${qualifiedId}/stage-transition`, {
      targetStageId: 'stg-5', user: admin, overrideReason: 'Requirements confirmed'
    })).ok()).toBe(true);
    await page.reload();
    await navigatePipeline();
    await page.locator('div[draggable]').filter({ hasText: qualifiedTitle }).first()
      .getByTitle('Advance to next stage (Stage Gate Check)').click();
    for (const yes of await page.getByRole('button', { name: 'YES', exact: true }).all()) {
      await yes.click();
    }
    await page.getByRole('button', { name: /Execute Auto-Advance to/i }).click();
    await expect.poll(async () => (await prisma.deal.findUnique({ where: { id: qualifiedId } })).status)
      .toBe('Won');
    expect((await prisma.deal.findUnique({ where: { id: qualifiedId } })).status).toBe('Won');

    expect((await post(`/api/deals/${lostId}/close-lost`, { user: admin })).status()).toBe(400);
    await page.locator('div[draggable]').filter({ hasText: lostTitle }).first()
      .getByTitle('Quick Close as Lost').click();
    await page.getByPlaceholder('Detail what happened, which competitor won, or pricing friction observed...')
      .fill('Customer postponed budget approval');
    await page.getByRole('button', { name: 'Confirm Close Lost' }).click();
    await expect.poll(async () => (await prisma.deal.findUnique({ where: { id: lostId } })).status)
      .toBe('Lost');
    expect((await prisma.deal.findUnique({ where: { id: lostId } })).lostReasonNote)
      .toBe('Customer postponed budget approval');

    await prisma.deal.update({ where: { id: qualifiedId }, data: {
      isRecurring: true, recurrenceDays: 30
    } });
    await page.reload();
    await navigatePipeline();
    await page.locator('div[draggable]').filter({ hasText: qualifiedTitle }).first()
      .getByRole('button', { name: 'Generate Rebuy Deal' }).click();
    await expect(page.getByText(/next renewal is due on/i)).toBeVisible();
    expect(await prisma.deal.count({ where: { parentDealId: qualifiedId } })).toBe(0);

    await prisma.deal.update({ where: { id: qualifiedId }, data: {
      actualCloseDate: '2020-01-01'
    } });
    await page.reload();
    await navigatePipeline();
    await page.locator('div[draggable]').filter({ hasText: qualifiedTitle }).first()
      .getByRole('button', { name: 'Generate Rebuy Deal' }).click();
    await expect.poll(async () => prisma.deal.count({ where: { parentDealId: qualifiedId } })).toBe(1);
    const children = await prisma.deal.findMany({ where: { parentDealId: qualifiedId } });
    expect(children).toHaveLength(1);
    expect(children[0].expectedCloseDate).toBe('2020-01-31');
    ids.push(children[0].id);
    await page.reload();
    await navigatePipeline();
    await expect(page.getByText(qualifiedTitle, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(lostTitle, { exact: true }).first()).toBeVisible();
  } finally {
    await cleanupTestRecords({ dealIds: ids });
  }
});
}
