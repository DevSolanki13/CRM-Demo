import { test, expect } from '@playwright/test';
import { getLocalDateInputValue, getLocalDateInputValueAfterDays } from '../frontend/utils/crmHelpers.js';

// Intercept every API call: these UI regression checks never mutate workspace data.
async function mockDashboard(page, { role = 'Admin', failQueue = false, empty = false, shared = false, failSwitch = false, approvalConflict = false } = {}) {
  const today = getLocalDateInputValue();
  const user = { id: 'user-dev', name: 'Dev Solanki', email: 'dev@example.test', role, active: true };
  const accounts = [user,
    { id: 'user-manager', name: 'Maya Shah', email: 'maya@example.test', role: 'Manager', active: true },
    { id: 'user-rep', name: 'Sam Patel', email: 'sam@example.test', role: 'Sales Rep', active: true },
  ];
  const tasks = [
    { id: 'task-1', title: 'Call Acme procurement', linkedTitle: 'Website redesign', linkedType: 'Deal', linkedId: 'deal-1', ownerId: user.id, status: 'pending', type: 'Call', dueDate: getLocalDateInputValueAfterDays(-2) },
    { id: 'task-2', title: 'Send revised proposal', linkedTitle: 'Nova Digital', ownerId: user.id, status: 'pending', type: 'Email', dueDate: today },
    { id: 'task-3', title: 'Review sample request', linkedTitle: 'Nova Digital', linkedType: 'Deal', linkedId: 'deal-1', ownerId: user.id, status: 'pending', type: 'Approval', stageGateCheckId: 'gate-1', dueDate: today },
  ];
  const stages = [
    { id: 'stage-new', name: 'New Lead', color: '#1D4E63', order: 1, pipelineId: 'pipeline-sales', category: 'New' },
    { id: 'stage-proposal', name: 'Proposal Sent', color: '#225F78', order: 2, pipelineId: 'pipeline-sales', category: 'Proposal Sent' },
    { id: 'stage-custom', name: 'Technical review', color: '#255B40', order: 1, pipelineId: 'pipeline-custom', category: 'New' },
  ];
  const deal = { id: 'deal-1', title: 'Website redesign', companyName: 'Acme Technologies', value: 420000, stageId: 'stage-new', stageName: 'New Lead', pipelineId: 'pipeline-sales', status: 'Active', ownerId: user.id, expectedCloseDate: today, lastActivityDate: today, daysInStage: 1, customFields: {} };
  const state = {
    branding: { appName: 'Sales CRM', primaryColor: '#1D4E63', currency: 'INR', customFields: {} },
    users: [user], leads: [{ id: 'lead-1', title: 'Acme inquiry', contactName: 'Maya Shah', companyName: 'Acme Technologies', ownerId: user.id, status: 'New', source: 'Website' }],
    deals: [deal], tasks, stages, activities: [], contacts: [], companies: [], notes: [], stageGateChecks: [], auditLogs: [],
    pipelines: [{ id: 'pipeline-sales', name: 'Sales', active: true }, { id: 'pipeline-custom', name: 'Custom pipeline', active: true }],
  };
  const writes = [];
  const getQueue = () => empty ? [] : [
    ...tasks.filter(task => task.status === 'pending' && (task.id === 'task-1' && task.dueDate < today || task.type === 'Approval')).map(task => ({
      id: task.id, key: task.id, type: task.type === 'Approval' ? 'approval' : 'overdue', title: task.title, subtitle: task.linkedTitle, raw: task,
      meta: task.type === 'Approval' ? 'Awaiting sign-off' : '2d overdue', categoryLabel: task.type === 'Approval' ? 'Pending Approval' : 'Overdue Follow-Up',
    })),
    { id: deal.id, key: 'renewal-deal', type: 'renewal', title: 'Acme repeat order', subtitle: 'Acme Technologies', categoryLabel: 'Renewal Due', meta: 'Cycle mature', raw: deal },
  ];
  await page.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname, params = url.searchParams;
    if (!path.startsWith('/api/')) return route.continue();
    const send = (json, status = 200) => route.fulfill({ status, json });
    if (request.method() !== 'GET') {
      const body = request.postDataJSON();
      writes.push({ path, method: request.method(), body });
      if (path.startsWith('/api/tasks/')) {
        const task = tasks.find(task => task.id === path.split('/').at(-1));
        if (task) Object.assign(task, body);
        return send(task || {});
      }
      if (path === '/api/stage-gate-checks/gate-1/approve') {
        tasks[2].status = 'completed';
        if (approvalConflict) return send({ error: 'This approval request has already been decided.' }, 409);
        return send({});
      }
      if (path === '/api/deals/check-renewals') return send({ renewedCount: 0 });
      return send({});
    }
    if (path === '/api/me') {
      const selectedId = request.headers()['x-crm-workspace-user'];
      if (failSwitch && selectedId) { failSwitch = false; return send({ error: 'Account temporarily unavailable. Try again.' }, 503); }
      return send({ user: shared ? accounts.find(account => account.id === selectedId) || user : user,
        authMode: shared ? 'shared' : 'session', accounts: shared ? accounts : [] });
    }
    if (path === '/api/state') return send(state);
    if (path === '/api/workspace-summary') {
      const queue = getQueue(), queueCounts = { all: queue.length };
      for (const item of queue) queueCounts[item.type] = (queueCounts[item.type] || 0) + 1;
      return send({ totalPipelineValue: 3260000, activeDealCount: 128, wonRevenue: 2480000, wonCount: 12, totalLeads: 248, outboundLeadsCount: 146,
        pendingTasksCount: tasks.filter(task => task.status === 'pending').length, renewalsDueCount: empty ? 0 : 1, renewalsDueValue: 180000,
        outboundCalls: 18, outboundEmails: 24, samplesSent: 6, queueCounts,
        stageTotals: [{ stageId: 'stage-new', count: 34, value: 1000000 }, { stageId: 'stage-proposal', count: 19, value: 1200000 }, { stageId: 'stage-custom', count: 5, value: 250000 }] });
    }
    if (path.startsWith('/api/pages/')) {
      const resource = path.split('/').at(-1);
      let items = [];
      if (resource === 'dashboard-queue') {
        if (failQueue) { failQueue = false; return send({ error: 'Queue temporarily unavailable' }, 503); }
        const category = { approvals: 'approval', renewals: 'renewal' }[params.get('type')] || params.get('type');
        items = getQueue().filter(item => category === 'all' || item.type === category);
      } else if (resource === 'tasks') items = empty ? [] : tasks.filter(task => task.status === 'pending' && task.type !== 'Approval');
      else if (resource === 'activities') items = empty ? [] : [{ id: 'activity-1', type: 'Outbound Call', description: 'Spoke with Acme procurement.', timestamp: today, authorName: user.name }];
      else if (resource === 'leads') items = params.has('q') ? [{ ...state.leads[0], id: 'lead-outside-initial-page', title: 'Server search result' }] : state.leads;
      else if (resource === 'deals') items = params.has('q') || params.get('pipeline') === 'pipeline-custom' ? [] : [deal];
      if (params.has('id')) items = items.filter(item => item.id === params.get('id'));
      return send({ items, total: items.length, facets: {}, stageTotals: [], nextCursor: null });
    }
    return send({});
  });
  return { writes, user, accounts };
}

test('avatar switches between manager, sales rep and admin without login and remembers the tab selection', async ({ page }) => {
  const { accounts } = await mockDashboard(page, { shared: true });
  await page.goto('/');
  const settings = page.getByRole('button', { name: 'Settings', exact: true });
  await expect(settings).toBeVisible();
  for (const account of [accounts[1], accounts[2], accounts[0]]) {
    await page.locator('header summary[aria-label^="Account:"]').click();
    const options = page.getByRole('group', { name: 'Workspace accounts' });
    await expect(options.getByRole('button')).toHaveCount(3);
    await options.getByRole('button', { name: `Switch to ${account.name}, ${account.role}`, exact: true }).click();
    await expect(page.locator('header summary')).toHaveAttribute('aria-label', `Account: ${account.name}`);
    await expect(page.locator('.crm-sidebar-account')).toContainText(account.role);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(account.name.split(' ')[0]);
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toHaveCount(0);
    if (account.role === 'Admin') await expect(settings).toBeVisible();
    else await expect(settings).toHaveCount(0);
    if (account.role === 'Sales Rep') {
      await expect(page.getByRole('button', { name: 'Team & workload', exact: true })).toHaveCount(0);
      await page.reload();
      await expect(page.locator('header summary')).toHaveAttribute('aria-label', `Account: ${account.name}`);
    }
  }
});

test('mobile avatar keeps the current account on a failed switch and allows retry', async ({ page }) => {
  await mockDashboard(page, { shared: true, failSwitch: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByLabel('Account: Dev Solanki', { exact: true }).click();
  const dropdown = page.locator('.crm-account-dropdown');
  await expect(dropdown).toBeVisible();
  const bounds = await dropdown.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(375);
  await page.getByRole('button', { name: 'Switch to Maya Shah, Manager', exact: true }).click();
  await expect(dropdown.getByRole('alert')).toContainText('Account temporarily unavailable');
  await expect(page.getByLabel('Account: Dev Solanki', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to Maya Shah, Manager', exact: true }).click();
  await expect(page.getByLabel('Account: Maya Shah', { exact: true })).toBeVisible();
});

test('dashboard renders real response values and scopes board navigation to the selected pipeline', async ({ page }) => {
  await mockDashboard(page);
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Dev');
  await expect(page.locator('.dashboard-metric-value')).toHaveText(['₹32.6L', '₹24.8L', '128', '1']);
  await expect(page.getByRole('region', { name: 'Prioritized Work Queue' }).getByRole('listitem')).toHaveCount(3);
  await page.getByLabel('Dashboard pipeline').selectOption('pipeline-custom');
  await expect(page.getByRole('region', { name: 'Pipeline overview' })).toContainText('Technical review');
  await expect(page.getByRole('region', { name: 'Pipeline overview' })).not.toContainText('Proposal Sent');
  await page.getByRole('button', { name: 'View board' }).click();
  await expect(page.getByRole('combobox', { name: 'Pipeline', exact: true })).toHaveValue('pipeline-custom');
});

test('queue completion, rescheduling, approvals and renewal checks retain existing API contracts', async ({ page }) => {
  const { writes } = await mockDashboard(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Reschedule Call Acme procurement by two days' }).click();
  await expect.poll(() => writes.find(write => write.path === '/api/tasks/task-1')?.body).toEqual({ dueDate: getLocalDateInputValueAfterDays(2) });
  await page.getByRole('region', { name: 'Your follow-ups' }).getByRole('checkbox', { name: 'Mark Send revised proposal complete' }).check();
  await expect.poll(() => writes.find(write => write.path === '/api/tasks/task-2')?.body).toEqual({ status: 'completed' });
  await page.getByRole('button', { name: 'Approve: Review sample request' }).click();
  await expect.poll(() => writes.some(write => write.path === '/api/stage-gate-checks/gate-1/approve' && write.method === 'POST')).toBe(true);
  await page.getByRole('button', { name: 'Renewal cycle', exact: true }).click();
  await expect.poll(() => writes.some(write => write.path === '/api/deals/check-renewals')).toBe(true);
});

test('an approval conflict refreshes stale tasks and shows one error message', async ({ page }) => {
  const { writes } = await mockDashboard(page, { approvalConflict: true });
  const exceptions = [];
  page.on('pageerror', error => exceptions.push(error.message));
  await page.goto('/');
  const approve = page.getByRole('button', { name: 'Approve: Review sample request' });
  await approve.click();
  await expect(approve).toHaveCount(0);
  await expect(page.getByText('This approval request has already been decided.', { exact: true })).toHaveCount(1);
  expect(writes.filter(write => write.path === '/api/stage-gate-checks/gate-1/approve')).toHaveLength(1);
  expect(exceptions).toEqual([]);
});

test('failed work queues show retry rather than an all-clear state', async ({ page }) => {
  await mockDashboard(page, { failQueue: true });
  await page.goto('/');
  const queue = page.getByRole('region', { name: 'Prioritized Work Queue' });
  await expect(queue.getByRole('alert')).toContainText('Queue temporarily unavailable');
  await expect(queue.getByText('All clear in this queue')).toHaveCount(0);
  await queue.getByRole('button', { name: 'Try again' }).click();
  await expect(queue.getByRole('listitem')).toHaveCount(3);
  await queue.getByRole('button', { name: 'Live Feed' }).click();
  await expect(queue.getByText('Spoke with Acme procurement.')).toBeVisible();
});

test('Add Lead opens the existing form and keyboard search queries records beyond initial state', async ({ page }) => {
  await mockDashboard(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Add lead', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create New Lead Opportunity' })).toBeVisible();
  // Search navigation remains available after the form is closed.
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('searchbox', { name: 'Search CRM' })).toBeFocused();
  await page.getByRole('searchbox', { name: 'Search CRM' }).fill('outside initial page');
  await expect(page.getByRole('region', { name: 'Search results' })).toContainText('Server search result');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Search results' })).toHaveCount(0);
});

test('mobile layout stays within the viewport and navigation remains keyboard accessible', async ({ page }) => {
  await mockDashboard(page, { role: 'Sales Rep', empty: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Renewal cycle', exact: true })).toBeDisabled();
  await expect(page.getByRole('region', { name: 'Your follow-ups' })).toContainText('You’re all caught up');
  await expect(page.locator('aside[aria-label="Main Navigation"]')).toBeHidden();
  await expect(page.getByRole('navigation', { name: 'Mobile Navigation Bar' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
  const nav = page.getByRole('dialog', { name: 'Navigation menu' });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Settings' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(nav).toHaveCount(0);
});

test('visual references render on desktop and mobile without console exceptions', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await mockDashboard(page);
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Approve: Review sample request' })).toBeVisible();
  await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});
