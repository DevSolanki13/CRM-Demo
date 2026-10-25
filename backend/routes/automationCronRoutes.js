import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { runScheduledAutomation } from '../services/automationScheduler.js';
import { processPendingFollowUps } from '../services/followUpEngine.js';

export const automationCronRouter = Router();

automationCronRouter.post('/run', asyncHandler(async (req, res) => {
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
  const renewal = await runScheduledAutomation();
  const processedFollowUps = await processPendingFollowUps();
  res.json({ renewalClaimed: renewal.claimed, processedFollowUps });
}));
