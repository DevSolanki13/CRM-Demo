import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
