import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../backend/app.js';

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

  it('does not expose the former login endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    expect(response.status).toBe(404);
  });
});
