import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { prisma } from '../backend/prisma.js';

test('qualification, demotion, won, lost, and renewal appear in the browser after database changes', async ({ page }) => {
  const suffix = randomUUID();
  const qualifiedId = `dl-browser-qualified-${suffix}`;
  const lostId = `dl-browser-lost-${suffix}`;
  const qualifiedTitle = `Browser qualification ${suffix}`;
  const lostTitle = `Browser lost ${suffix}`;
  const ids = [qualifiedId, lostId];
  const post = async (path, body) => page.request.post(path, { data: body });
  try {
    const users = await (await page.request.get('/api/users')).json();
    const admin = users.find(user => user.active && user.role === 'Admin');
    expect(admin).toBeTruthy();
    for (const [id, title] of [[qualifiedId, qualifiedTitle], [lostId, lostTitle]]) {
      const response = await post('/api/deals', { id, title, value: 0 });
      expect(response.status()).toBe(201);
      expect((await response.json()).value).toBe(0);
    }

    await page.goto('/');
    await page.locator('aside[aria-label="Main Navigation"]').getByRole('button', { name: /Pipeline/i }).click();
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
    await page.locator('aside[aria-label="Main Navigation"]').getByRole('button', { name: /Pipeline/i }).click();
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
    await page.locator('aside[aria-label="Main Navigation"]').getByRole('button', { name: /Pipeline/i }).click();
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
    await page.locator('aside[aria-label="Main Navigation"]').getByRole('button', { name: /Pipeline/i }).click();
    await page.locator('div[draggable]').filter({ hasText: qualifiedTitle }).first()
      .getByRole('button', { name: 'Generate Rebuy Deal' }).click();
    await expect(page.getByText(/next renewal is due on/i)).toBeVisible();
    expect(await prisma.deal.count({ where: { parentDealId: qualifiedId } })).toBe(0);

    await prisma.deal.update({ where: { id: qualifiedId }, data: {
      actualCloseDate: '2020-01-01'
    } });
    await page.reload();
    await page.locator('aside[aria-label="Main Navigation"]').getByRole('button', { name: /Pipeline/i }).click();
    await page.locator('div[draggable]').filter({ hasText: qualifiedTitle }).first()
      .getByRole('button', { name: 'Generate Rebuy Deal' }).click();
    await expect.poll(async () => prisma.deal.count({ where: { parentDealId: qualifiedId } })).toBe(1);
    const children = await prisma.deal.findMany({ where: { parentDealId: qualifiedId } });
    expect(children).toHaveLength(1);
    expect(children[0].expectedCloseDate).toBe('2020-01-31');
    ids.push(children[0].id);
    await page.reload();
    await page.locator('aside[aria-label="Main Navigation"]').getByRole('button', { name: /Pipeline/i }).click();
    await expect(page.getByText(qualifiedTitle, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(lostTitle, { exact: true }).first()).toBeVisible();
  } finally {
    const children = await prisma.deal.findMany({ where: { parentDealId: qualifiedId }, select: { id: true } });
    const cleanupIds = [...new Set([...ids, ...children.map(child => child.id)])];
    const checks = await prisma.stageGateCheck.findMany({
      where: { dealId: { in: cleanupIds } }, select: { id: true }
    });
    await prisma.task.deleteMany({ where: { OR: [
      { linkedId: { in: cleanupIds } },
      { stageGateCheckId: { in: checks.map(check => check.id) } }
    ] } });
    await prisma.activity.deleteMany({ where: { linkedId: { in: cleanupIds } } });
    await prisma.stageGateCheck.deleteMany({ where: { dealId: { in: cleanupIds } } });
    await prisma.auditLog.deleteMany({ where: { entityId: { in: cleanupIds } } });
    await prisma.deal.deleteMany({ where: { id: { in: cleanupIds } } });
  }
}, 60000);
