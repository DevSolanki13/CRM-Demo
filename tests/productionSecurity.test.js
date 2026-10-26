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

describe('Production security and readiness', () => {
  it('GET /api/health returns 200 without touching database', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  it('GET /api/ready checks database readiness and returns 200', async () => {
    const res = await fetch(`${baseUrl}/api/ready`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ready');
    expect(body.database).toBe('connected');
  });

  it('trusts reverse proxy headers when in production or Vercel mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const app = createApp();
      expect(app.get('trust proxy')).toBe(1);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('protects API writes from cross-origin requests', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://malicious-site.attacker.com',
        'Sec-Fetch-Site': 'cross-site',
      },
      body: JSON.stringify({ email: 'admin@example.com', password: 'password123' }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Cross-origin request denied');
  });

  it('enforces application/json content type on writes', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: 'not json',
    });

    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error).toBe('Use application/json for API writes');
  });

  it('blocks unconfigured workspace in production mode with 503', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await fetch(`${baseUrl}/api/me`);
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toContain('Administrator sign-in is not configured');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
