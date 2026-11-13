import { test, expect } from '@playwright/test';

// UI loading tests isolate the network; no workspace records are created.
async function mockWorkspace(page, { delayPages = 0, delayBoot = 0 } = {}) {
  const user = { id: 'loading-user', name: 'Test Admin', role: 'Admin', active: true };
  const stage = { id: 'new', name: 'New Lead', pipelineId: 'pipeline-sales', order: 1, color: '#1D4E63' };
  const state = { branding: { appName: 'Test CRM', customFields: { showMockData: true } }, users: [user],
    pipelines: [{ id: 'pipeline-sales', name: 'Sales', active: true }, { id: 'pipeline-custom', name: 'Custom', active: true }],
    stages: [stage, { ...stage, id: 'custom-stage', name: 'Custom stage', pipelineId: 'pipeline-custom' }],
    leads: [], deals: [], tasks: [], activities: [], contacts: [], companies: [], notes: [], stageGateChecks: [] };
  const requests = [];
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (!path.startsWith('/api/')) return route.continue();
    const send = json => route.fulfill({ json });
    if (path === '/api/me') return send({ user, authMode: 'session' });
    if (path === '/api/state') {
      if (delayBoot) await new Promise(resolve => setTimeout(resolve, delayBoot));
      return send(state);
    }
    if (path === '/api/workspace-summary') return send({ queueCounts: {}, stageTotals: [] });
    if (path.startsWith('/api/pages/')) {
      requests.push(url);
      if (delayPages) await new Promise(resolve => setTimeout(resolve, delayPages));
      const resource = path.split('/').at(-1);
      const items = resource === 'leads' ? [{ id: 'lead-test', title: 'Cached prospect', status: 'New', source: 'Website', ownerId: user.id }]
        : resource === 'contacts' ? [{ id: 'contact-test', name: 'Cached contact', email: 'test@example.test', ownerId: user.id }]
          : resource === 'companies' ? [{ id: 'company-test', name: 'Cached company' }]
            : resource === 'tasks' ? [{ id: 'task-test', title: 'Cached task', type: 'Call', ownerId: user.id, status: 'pending', dueDate: '2099-01-01' }]
              : resource === 'deals' ? [{ id: 'deal-test', title: url.searchParams.get('pipeline') === 'pipeline-custom' ? 'Custom opportunity' : 'Cached opportunity',
                stageId: url.searchParams.get('pipeline') === 'pipeline-custom' ? 'custom-stage' : 'new', value: 1000, ownerId: user.id, status: 'Active', customFields: {} }] : [];
      return send({ items, total: items.length, nextCursor: null, facets: {}, stageTotals: [] });
    }
    if (path === '/api/integrations/status') return send({ configured: false, canConnect: false, connections: [] });
    if (path === '/api/reports/summary') return send({ wonCount: 0, lostCount: 0, totalRevenue: 0, winRate: 0, avgDealSize: 0,
      renewalDueCount: 0, activeRebuyCount: 0, rebuyRevenue: 0, lostByStage: [], lostByReason: [], accountLTV: [], accountCount: 0, forecast: 0, target: 0 });
    if (path === '/api/reports/audit') return send({ items: [], nextCursor: null });
    return send([]);
  });
  return requests;
}

test('boot uses the URL page skeleton and cold record loads share their warming request', async ({ page }) => {
  const requests = await mockWorkspace(page, { delayPages: 1200, delayBoot: 300 });
  await page.goto('/#contacts');
  await expect(page.getByRole('status', { name: 'Loading Contacts', exact: true })).toBeVisible();
  await expect(page.getByText('Loading view', { exact: false })).toHaveCount(0);
  await expect(page.getByText('Cached contact', { exact: true })).toBeVisible();
  expect(requests.filter(url => url.pathname === '/api/pages/contacts')).toHaveLength(1);
});

test('warm tabs render immediately and retain their content during search and revisits', async ({ page }) => {
  const requests = await mockWorkspace(page, { delayPages: 400 });
  await page.goto('/');
  await expect.poll(() => requests.some(url => url.pathname === '/api/pages/companies')).toBe(true);
  await expect.poll(() => requests.some(url => url.pathname === '/api/pages/contacts')).toBe(true);
  // Wait for warming responses, then make subsequent revalidations slow.
  await page.waitForResponse(response => response.url().includes('/api/pages/companies'));
  await page.getByRole('button', { name: 'Contacts', exact: true }).click();
  await expect(page.getByText('Cached contact', { exact: true })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Loading Contacts', exact: true })).toHaveCount(0);
  const search = page.getByRole('textbox', { name: 'Search contacts by name, email, or company' });
  await search.fill('search');
  await expect(page.getByText('Cached contact', { exact: true })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Loading Contacts', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Companies', exact: true }).click();
  await expect(page.getByText('Cached company', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Contacts', exact: true }).click();
  await expect(page.getByText('Cached contact', { exact: true })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Loading Contacts', exact: true })).toHaveCount(0);
});

test('mobile cold leads use cards and reduced motion disables skeleton pulses', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mockWorkspace(page, { delayPages: 1000, delayBoot: 400 });
  await page.goto('/#leads');
  const skeleton = page.getByRole('status', { name: 'Loading Leads', exact: true });
  await expect(skeleton).toBeVisible();
  await expect(skeleton.locator('table')).toBeHidden();
  expect(await skeleton.locator('.crm-skeleton').first().evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  await expect(page.getByText('Cached prospect', { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('changing pipelines retains the previous board until the new board arrives', async ({ page }) => {
  await mockWorkspace(page, { delayPages: 800 });
  await page.goto('/#pipeline');
  await expect(page.getByRole('heading', { name: 'Cached opportunity', exact: true })).toBeVisible();
  await page.locator('#active-pipeline').selectOption('pipeline-custom');
  await expect(page.getByRole('heading', { name: 'Cached opportunity', exact: true })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Loading Pipeline', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Custom opportunity', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cached opportunity', exact: true })).toHaveCount(0);
});
