import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { runAutomationCycle } from '../services/automationCycle.js';

export const automationCronRouter = Router();

automationCronRouter.all('/run', asyncHandler(async (req, res) => {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).set('Allow', 'GET, POST').json({ error: 'Use GET or POST.' });
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) {
    return res.status(503).json({ error: 'Scheduled automation is not configured.' });
  }
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const expected = Buffer.from(secret);
  const supplied = Buffer.from(token);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await runAutomationCycle();
    res.json({ success: true, ...result });
  } catch {
    res.status(503).json({ success: false, error: 'Automation failed. Review the persisted job status before retrying.' });
  }
}));
