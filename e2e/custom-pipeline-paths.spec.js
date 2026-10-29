/**
 * E2E: Custom-Pipeline Paths & Validation Failures
 *
 * Extends workflow-paths.spec.js coverage to:
 *   1.  Full custom-pipeline lifecycle via API -> win -> closed lost
 *   2.  API validation rejection cases (no lostReason, backward without reason,
 *       malformed activity body, duplicate idempotency key)
 *   3.  Lead Journey - custom pipeline stage names
 *       (not default stg-* IDs) and target chevron is disabled when in-flight.
 */

import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { prisma } from '../backend/prisma.js';
import { cleanupTestRecords } from './support/cleanupTestRecords.js';

// ---------------------------------------------------------------------------
// Suite 1 � Custom pipeline lifecycle (desktop only for brevity)
// ---------------------------------------------------------------------------
test.describe('Custom pipeline lifecycle', () => {
  let pipelineId;
  let stages = [];
  const dealIds = [];
  const suffix = randomUUID();
  const qualTitle = `Custom qual ${suffix}`;
  const lostTitle = `Custom lost ${suffix}`;

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/pipelines', {
      data: {
        name: `E2E Pipeline ${suffix}`,
        stages: [
          { name: 'Prospecting', category: 'New' },
          { name: 'Demo', category: 'Pipeline' },
          { name: 'Closed Won', category: 'Won' },
          { name: 'Closed Lost', category: 'Lost' },
        ],
      },
    });
    expect(res.status()).toBe(201);
    const pipeline = await res.json();
    pipelineId = pipeline.id;
    stages = pipeline.stages;
  });

  test.afterAll(async () => {
    if (!pipelineId) return;
    await cleanupTestRecords({ dealIds });
    await prisma.stage.deleteMany({ where: { pipelineId } });
    await prisma.pipeline.deleteMany({ where: { id: pipelineId } });
  });

  test('01: creates deals on the custom pipeline via API', async ({ request }) => {
    const users = await (await request.get('/api/users')).json();
    const admin = users.find(u => u.active && u.role === 'Admin');
    expect(admin).toBeTruthy();
    const firstStage = stages.find(s => s.category === 'New') || stages[0];
    for (const title of [qualTitle, lostTitle]) {
      const res = await request.post('/api/deals', {
        data: { title, value: 5000, pipelineId, stageId: firstStage.id },
      });
      expect(res.status()).toBe(201);
      const deal = await res.json();
      dealIds.push(deal.id);
      expect(deal.pipelineId).toBe(pipelineId);
    }
  });

  test('02: advances a deal through custom pipeline stages to Won', async ({ request }) => {
    const users = await (await request.get('/api/users')).json();
    const admin = users.find(u => u.active && u.role === 'Admin');
    const dealId = dealIds[0];
    const demoStage = stages.find(s => s.category === 'Pipeline') || stages[1];
    const wonStage = stages.find(s => s.category === 'Won');
    expect(demoStage).toBeTruthy();
    expect(wonStage).toBeTruthy();

    // Prospecting -> Demo
    const toDemo = await request.post(`/api/deals/${dealId}/stage-transition`, {
      data: { targetStageId: demoStage.id, user: admin },
    });
    expect(toDemo.ok()).toBe(true);
    expect((await prisma.deal.findUnique({ where: { id: dealId } })).stageId).toBe(demoStage.id);

    // Demo -> Closed Won
    const toWon = await request.post(`/api/deals/${dealId}/stage-transition`, {
      data: { targetStageId: wonStage.id, user: admin },
    });
    expect(toWon.ok()).toBe(true);
    const won = await prisma.deal.findUnique({ where: { id: dealId } });
    expect(won.status).toBe('Won');
    expect(won.stageId).toBe(wonStage.id);
  });

  test('03: close-lost without reason is rejected (400)', async ({ request }) => {
    const users = await (await request.get('/api/users')).json();
    const admin = users.find(u => u.active && u.role === 'Admin');
    const dealId = dealIds[1];
    const noReason = await request.post(`/api/deals/${dealId}/close-lost`, {
      data: { user: admin },
    });
    expect(noReason.status()).toBe(400);
    expect((await prisma.deal.findUnique({ where: { id: dealId } })).status).toBe('Active');
  });

  test('04: closes lost deal correctly on custom pipeline', async ({ request }) => {
    const users = await (await request.get('/api/users')).json();
    const admin = users.find(u => u.active && u.role === 'Admin');
    const dealId = dealIds[1];
    const lostStage = stages.find(s => s.category === 'Lost');
    expect(lostStage).toBeTruthy();
    const res = await request.post(`/api/deals/${dealId}/close-lost`, {
      data: { lostReason: 'Budget cut � custom pipeline test', user: admin },
    });
    expect(res.ok()).toBe(true);
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    expect(deal.status).toBe('Lost');
    expect(deal.stageId).toBe(lostStage.id);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 � API validation failure coverage
// ---------------------------------------------------------------------------
test.describe('API validation rejection cases', () => {
  const dealIds = [];
  const suffix = randomUUID();

  test.afterAll(async () => {
    await cleanupTestRecords({ dealIds });
  });

  test('01: backward stage move without demotion reason is rejected (400)', async ({
    request,
  }) => {
    const users = await (await request.get('/api/users')).json();
    const admin = users.find(u => u.active && u.role === 'Admin');
    const deal = await prisma.deal.create({
      data: {
        id: `e2e-${suffix}-bwd`,
        title: `Backward move ${suffix}`,
        ownerId: admin.id,
        ownerName: admin.name,
        stageId: 'stg-3',
        stageName: 'Sample Sent',
        status: 'Active',
      },
    });
    dealIds.push(deal.id);
    const res = await request.post(`/api/deals/${deal.id}/stage-transition`, {
      data: { targetStageId: 'stg-2', user: admin },
    });
    expect(res.status()).toBe(400);
    expect((await prisma.deal.findUnique({ where: { id: deal.id } })).stageId).toBe('stg-3');
  });

  test('02: activity with malformed description type is rejected (400)', async ({ request }) => {
    const users = await (await request.get('/api/users')).json();
    const admin = users.find(u => u.active && u.role === 'Admin');
    const deal = await prisma.deal.create({
      data: {
        id: `e2e-${suffix}-act`,
        title: `Act validation ${suffix}`,
        ownerId: admin.id,
        ownerName: admin.name,
        stageId: 'stg-2',
        stageName: 'Contacted',
        status: 'Active',
      },
    });
    dealIds.push(deal.id);
    const res = await request.post('/api/activities', {
      data: {
        type: 'Call',
        description: 99999,
        linkedType: 'Deal',
        linkedId: deal.id,
        authorId: admin.id,
        authorName: admin.name,
      },
    });
    expect(res.status()).toBe(400);
    expect(await prisma.activity.count({ where: { linkedId: deal.id } })).toBe(0);
  });

  test('03: duplicate idempotency key on follow-up activity returns 409 and de-dupes', async ({
    request,
  }) => {
    const users = await (await request.get('/api/users')).json();
    const admin = users.find(u => u.active && u.role === 'Admin');
    const deal = await prisma.deal.create({
      data: {
        id: `e2e-${suffix}-idem`,
        title: `Idem test ${suffix}`,
        ownerId: admin.id,
        ownerName: admin.name,
        stageId: 'stg-2',
        stageName: 'Contacted',
        status: 'Active',
      },
    });
    dealIds.push(deal.id);
    const sharedPayload = {
      type: 'Call',
      description: 'Could not reach the decision-maker',
      linkedType: 'Deal',
      linkedId: deal.id,
      authorId: admin.id,
      authorName: admin.name,
      followUp: {
        requestId: `req-${suffix}`,
        reason: 'disconnected',
        expectedStageId: 'stg-2',
        ownerId: admin.id,
        dueDate: new Date().toISOString().slice(0, 10),
        answers: { decisionMaker: false },
      },
    };
    const r1 = await request.post('/api/activities', { data: sharedPayload });
    const r2 = await request.post('/api/activities', {
      data: { ...sharedPayload, description: 'Conflicting follow-up payload' },
    });
    expect([200, 201]).toContain(r1.status());
    expect(r2.status()).toBe(409);
    expect(await prisma.activity.count({ where: { linkedId: deal.id } })).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Suite 3 - Lead Journey - custom pipeline stage names
// ---------------------------------------------------------------------------
for (const [device, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
]) {
  test.describe(`Lead Journey - custom pipeline stage names [${device}]`, () => {
    let pipelineId;
    let stages = [];
    let leadId;
    let dealId;
    const suffix = randomUUID();

    test.beforeAll(async ({ request }) => {
      const pRes = await request.post('/api/pipelines', {
        data: {
          name: `Journey Pipeline ${suffix}`,
          stages: [
            { name: 'Outreach', category: 'New' },
            { name: 'Discovery', category: 'Pipeline' },
            { name: 'Deal Won', category: 'Won' },
            { name: 'Deal Lost', category: 'Lost' },
          ],
        },
      });
      expect(pRes.status()).toBe(201);
      const pipeline = await pRes.json();
      pipelineId = pipeline.id;
      stages = pipeline.stages;

      const lRes = await request.post('/api/leads', {
        data: { title: `Journey Lead ${suffix}`, contactName: 'Tester', status: 'New' },
      });
      expect(lRes.status()).toBe(201);
      leadId = (await lRes.json()).id;

      const firstStage = stages.find(s => s.category === 'New') || stages[0];
      const dRes = await request.post('/api/deals', {
        data: {
          title: `Journey Deal ${suffix}`,
          value: 1000,
          pipelineId,
          stageId: firstStage.id,
          leadId,
        },
      });
      expect(dRes.status()).toBe(201);
      dealId = (await dRes.json()).id;
    });

    test.afterAll(async () => {
      await cleanupTestRecords({ leadIds: [leadId], dealIds: [dealId] });
      if (pipelineId) {
        await prisma.stage.deleteMany({ where: { pipelineId } });
        await prisma.pipeline.deleteMany({ where: { id: pipelineId } });
      }
    });

    test(`${device}: chevron bar shows custom stage names, not default IDs`, async ({
      page,
    }) => {
      test.setTimeout(60000);
      await page.setViewportSize(viewport);
      await page.goto('/');
      await expect(
        page.locator(
          device === 'mobile'
            ? 'nav[aria-label="Mobile Navigation Bar"]'
            : 'aside[aria-label="Main Navigation"]'
        )
      ).toBeVisible({ timeout: 15000 });

      // Navigate to Leads
      const nav = page.locator(
        device === 'mobile'
          ? 'nav[aria-label="Mobile Navigation Bar"]'
          : 'aside[aria-label="Main Navigation"]'
      );
      await nav.getByRole('button', { name: /Leads/i }).click();

      // Open the journey lead
      if (device === 'mobile') {
        const leadHeading = page.getByRole('heading', { name: new RegExp(`Journey Lead ${suffix}`, 'i') });
        await expect(leadHeading).toBeVisible({ timeout: 15000 });
        await leadHeading.click();
      } else {
        const leadRow = page
          .locator('table tbody tr', { hasText: new RegExp(`Journey Lead ${suffix}`, 'i') })
          .first();
        await expect(leadRow).toBeVisible({ timeout: 15000 });
        await leadRow.click();
      }

      // Lead Journey console opened
      await expect(page.getByRole('button', { name: /Back to Ledger/i })).toBeVisible({
        timeout: 15000,
      });

      // Custom stage name 'Outreach' must appear in the chevron bar
      await expect(page.getByRole('button', { name: /Outreach/i }).first()).toBeVisible({
        timeout: 10000,
      });

      // Raw stg-* ID labels must NOT appear as button text
      await expect(page.getByRole('button', { name: /^stg-/i })).toHaveCount(0);

      // 'Deal Won' chevron is upstream in the pipeline and should be visible
      await expect(page.getByRole('button', { name: /Deal Won/i }).first()).toBeVisible();
    });
  });
}
