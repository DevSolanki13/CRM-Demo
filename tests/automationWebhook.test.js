import express from 'express';
import { createServer } from 'node:http';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { automationCronRouter } from '../backend/routes/automationCronRoutes.js';
import * as automationCycleModule from '../backend/services/automationCycle.js';

describe('automation webhook /api/internal/automation/run', () => {
  let server;
  let baseUrl;
  const validSecret = 'test-secret-at-least-32-chars-long-123456';

  beforeAll(async () => {
    const app = express();
    app.use('/api/internal/automation', automationCronRouter);
    server = createServer(app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/internal/automation/run`;
  });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('rejects unsupported HTTP methods with 405 and Allow header', async () => {
    const res = await fetch(baseUrl, { method: 'DELETE' });
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('GET, POST');
    const body = await res.json();
    expect(body.error).toBe('Use GET or POST.');
  });

  it('returns 503 when CRON_SECRET is missing or shorter than 32 characters', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const res1 = await fetch(baseUrl, { method: 'POST' });
    expect(res1.status).toBe(503);
    expect((await res1.json()).error).toBe('Scheduled automation is not configured.');

    vi.stubEnv('CRON_SECRET', 'short-secret');
    const res2 = await fetch(baseUrl, { method: 'POST' });
    expect(res2.status).toBe(503);
  });

  it('returns 401 when Authorization header is missing or incorrect', async () => {
    vi.stubEnv('CRON_SECRET', validSecret);

    // Missing header
    const resNoAuth = await fetch(baseUrl, { method: 'POST' });
    expect(resNoAuth.status).toBe(401);
    expect((await resNoAuth.json()).error).toBe('Unauthorized');

    // Wrong token length
    const resWrongLen = await fetch(baseUrl, {
      method: 'POST',
      headers: { Authorization: 'Bearer short' },
    });
    expect(resWrongLen.status).toBe(401);

    // Wrong token same length
    const wrongTokenSameLength = 'x'.repeat(validSecret.length);
    const resWrongToken = await fetch(baseUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${wrongTokenSameLength}` },
    });
    expect(resWrongToken.status).toBe(401);
  });

  it('runs automation cycle and returns 200 when authenticated with valid Bearer secret', async () => {
    vi.stubEnv('CRON_SECRET', validSecret);
    const mockCycleResult = {
      claimed: true,
      flippedCount: 2,
      failures: [],
      details: {
        renewals: { claimed: true },
        followUps: { processed: 1, failed: 0 },
        attachments: { purged: 0, failed: 0 },
        communications: { processed: 0, failed: 0 },
      },
    };
    vi.spyOn(automationCycleModule, 'runAutomationCycle').mockResolvedValueOnce(mockCycleResult);

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${validSecret}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.claimed).toBe(true);
    expect(body.flippedCount).toBe(2);
  });

  it('returns 503 when the automation cycle throws an unexpected error', async () => {
    vi.stubEnv('CRON_SECRET', validSecret);
    vi.spyOn(automationCycleModule, 'runAutomationCycle').mockRejectedValueOnce(new Error('DB failure'));

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${validSecret}` },
    });

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Automation failed');
  });
});
