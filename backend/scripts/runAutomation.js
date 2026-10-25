import { prisma } from '../prisma.js';
import { runScheduledAutomation } from '../services/automationScheduler.js';
import { processPendingFollowUps } from '../services/followUpEngine.js';
import { purgeDeletedAttachments } from '../services/attachmentService.js';

let running = false;
async function tick() {
  if (running) return;
  running = true;
  try {
    const result = await runScheduledAutomation();
    if (result.claimed) console.log(`Renewal run completed: ${result.flippedCount} opportunity(s) created.`);
    await processPendingFollowUps();
    await purgeDeletedAttachments();
  } catch (error) {
    console.error('Renewal run failed; persisted for retry:', error);
  } finally {
    running = false;
  }
}

await tick();
if (process.argv.includes('--once')) {
  await prisma.$disconnect();
} else {
  const timer = setInterval(tick, 60_000);
  const shutdown = async () => {
    clearInterval(timer);
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
