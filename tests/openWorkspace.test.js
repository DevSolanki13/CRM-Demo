import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../backend/app.js';
import { prisma } from '../backend/prisma.js';

let server;
let baseUrl;

beforeAll(async () => {
  server = await new Promise(resolve => {
    const running = createApp().listen(0, '127.0.0.1', () => resolve(running));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
});

describe('open CRM workspace', () => {
  it('returns the shared active administrator without a cookie', async () => {
    const response = await fetch(`${baseUrl}/api/me`);
    const { user } = await response.json();
    expect(response.status).toBe(200);
    expect(user).toMatchObject({ role: 'Admin', active: true });
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('lists active accounts and applies the chosen manager or sales rep to reads and permissions', async () => {
    const { accounts, authMode } = await (await fetch(`${baseUrl}/api/me`)).json();
    expect(authMode).toBe('shared');
    expect(accounts.length).toBeGreaterThan(0);
    expect(accounts.every(account => account.active && !('passwordHash' in account))).toBe(true);
    for (const role of ['Manager', 'Sales Rep']) {
      const account = accounts.find(account => account.role === role);
      expect(account, `Expected an active ${role} fixture`).toBeDefined();
      const headers = { 'X-CRM-Workspace-User': account.id };
      const identity = await (await fetch(`${baseUrl}/api/me`, { headers })).json();
      expect(identity.user).toMatchObject({ id: account.id, role });
      expect(identity.accounts).toEqual(accounts);

      const records = await fetch(`${baseUrl}/api/pages/deals?limit=100`, { headers });
      expect(records.status).toBe(200);
      const page = await records.json();
      if (role === 'Sales Rep') expect(page.items.every(deal => deal.ownerId === account.id)).toBe(true);
      const forbidden = await fetch(`${baseUrl}/api/branding`, {
        method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}',
      });
      expect(forbidden.status).toBe(403);
    }
  });

  it('rejects unavailable selections and keeps the default identity unchanged', async () => {
    const response = await fetch(`${baseUrl}/api/me`, { headers: { 'X-CRM-Workspace-User': 'missing-account' } });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('account is no longer available');
    const { user } = await (await fetch(`${baseUrl}/api/me`)).json();
    expect(user.role).toBe('Admin');
  });

  it('scopes all collections, search, directory, workload, reports and exports to a sales rep', async () => {
    const { accounts, user: admin } = await (await fetch(`${baseUrl}/api/me`)).json();
    const rep = accounts.find(account => account.role === 'Sales Rep');
    const headers = { 'X-CRM-Workspace-User': rep.id };
    const read = async path => {
      const response = await fetch(`${baseUrl}${path}`, { headers });
      expect(response.status, path).toBe(200);
      return response.json();
    };
    const state = await read('/api/state');
    expect(state.users.map(account => account.id)).toEqual([rep.id]);
    for (const resource of ['leads', 'deals', 'contacts', 'tasks']) {
      expect(state[resource].every(record => record.ownerId === rep.id)).toBe(true);
      const adminPage = await (await fetch(`${baseUrl}/api/pages/${resource}?limit=100`)).json();
      const foreign = adminPage.items.find(record => record.ownerId !== rep.id);
      if (foreign) {
        const search = await read(`/api/pages/${resource}?q=${encodeURIComponent(foreign.title || foreign.name)}`);
        expect(search.items.some(record => record.id === foreign.id)).toBe(false);
        const direct = await read(`/api/pages/${resource}?id=${encodeURIComponent(foreign.id)}`);
        expect(direct.items).toEqual([]);
      }
      // CSV exports use the same cursor API, including after the first page.
      let cursor = '';
      do {
        const page = await read(`/api/pages/${resource}?limit=2&cursor=${encodeURIComponent(cursor)}`);
        expect(page.items.every(record => record.ownerId === rep.id)).toBe(true);
        cursor = page.nextCursor;
      } while (cursor);
    }
    const summary = await read('/api/workspace-summary');
    expect(summary.ownerStats.map(owner => owner.id)).toEqual([rep.id]);
    const month = new Date().toISOString().slice(0, 7);
    const ownReport = await read(`/api/reports/summary?month=${month}&rep=All`);
    expect(await read(`/api/reports/summary?month=${month}&rep=${admin.id}`)).toEqual(ownReport);
    expect(await read(`/api/reports/audit?rep=${admin.id}`)).toEqual(await read('/api/reports/audit?rep=All'));
    for (const [method, path] of [['POST', '/users'], ['POST', '/stages'], ['POST', '/pipelines'], ['PUT', '/settings/automation-rules'], ['POST', '/stage-gate-checks/missing/approve']]) {
      const response = await fetch(`${baseUrl}/api${path}`, {
        method, headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}',
      });
      expect(response.status, path).toBe(403);
    }
  });

  it('requires a session when sign-in is configured, even with an account selection header', async () => {
    const lookup = vi.spyOn(prisma.user, 'findFirst').mockResolvedValueOnce({ id: 'configured-admin' });
    try {
      const response = await fetch(`${baseUrl}/api/me`, { headers: { 'X-CRM-Workspace-User': 'someone-else' } });
      expect(response.status).toBe(401);
    } finally {
      lookup.mockRestore();
    }
  });

  it('mounts the login endpoint and validates credentials', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    expect(response.status).toBe(400);
  });

  it('rejects invalid account setup links', async () => {
    const response = await fetch(`${baseUrl}/api/auth/accept-invitation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'invalid', password: 'strong-password-123' }),
    });
    expect(response.status).toBe(400);
  });

  it('authorizes task writes with point lookups and rejects an invisible link', async () => {
    const title = `Authorization check ${randomUUID()}`;
    let id;
    const write = (path, method, body) => fetch(`${baseUrl}${path}`, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    try {
      const created = await write('/api/tasks', 'POST', { title, type: 'Call' });
      expect(created.status).toBe(201);
      id = (await created.json()).id;

      const rejected = await write(`/api/tasks/${id}`, 'PUT', {
        linkedType: 'Deal', linkedId: `missing-${randomUUID()}`,
      });
      expect(rejected.status).toBe(404);

      const updated = await write(`/api/tasks/${id}`, 'PUT', { status: 'completed' });
      expect(updated.status).toBe(200);
      expect((await updated.json()).status).toBe('completed');

      const deleted = await write(`/api/tasks/${id}`, 'DELETE', {});
      expect(deleted.status).toBe(200);
      expect((await deleted.json()).success).toBe(true);
      id = null;
    } finally {
      if (id) await prisma.task.deleteMany({ where: { id } });
    }
  });
});
