import { prisma } from '../prisma.js';
import { runAutomationCycle } from '../services/automationCycle.js';

let stopping = false;
let inFlight;
async function tick() {
  if (stopping || inFlight) return;
  inFlight = (async () => {
    try {
      const result = await runAutomationCycle();
      if (result.claimed) console.log(JSON.stringify({ status: 'completed', ...result }));
      return true;
    } catch {
      console.error('Automation cycle failed. Its failure and retry time are persisted.');
      return false;
    }
  })();
  const success = await inFlight;
  inFlight = null;
  return success;
}

const success = await tick();
if (process.argv.includes('--once')) {
  await prisma.$disconnect();
  if (!success) process.exitCode = 1;
} else {
  const timer = setInterval(tick, 60_000);
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    clearInterval(timer);
    const deadline = setTimeout(() => process.exit(1), 30_000);
    deadline.unref();
    await inFlight;
    await prisma.$disconnect();
    clearTimeout(deadline);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
