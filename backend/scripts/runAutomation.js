import { prisma } from '../prisma.js';
import { createAutomationWorker } from '../services/automationWorker.js';

const worker = createAutomationWorker();

const success = await worker.runOnce();
if (process.argv.includes('--once')) {
  await prisma.$disconnect();
  if (!success) process.exitCode = 1;
} else {
  worker.start({ runImmediately: false });
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 30_000);
    deadline.unref();
    await worker.stop();
    await prisma.$disconnect();
    clearTimeout(deadline);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
