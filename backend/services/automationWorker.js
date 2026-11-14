import { runAutomationCycle } from './automationCycle.js';

export function createAutomationWorker({
  runCycle = runAutomationCycle,
  intervalMs = 60_000,
  logger = console,
} = {}) {
  let timer = null;
  let inFlight = null;
  let stopped = false;

  const runOnce = async () => {
    if (stopped || inFlight) return false;

    const execution = (async () => {
      try {
        const result = await runCycle();
        if (result.claimed) logger.log(JSON.stringify({ status: 'completed', ...result }));
        return true;
      } catch (error) {
        logger.error('Automation cycle failed. Its failure and retry time are persisted.', error);
        return false;
      }
    })();

    inFlight = execution;
    try {
      return await execution;
    } finally {
      if (inFlight === execution) inFlight = null;
    }
  };

  const start = ({ runImmediately = true } = {}) => {
    if (stopped) throw new Error('A stopped automation worker cannot be restarted.');
    if (timer) return;
    if (runImmediately) void runOnce();
    timer = setInterval(() => { void runOnce(); }, intervalMs);
    timer.unref();
  };

  const stop = async () => {
    stopped = true;
    if (timer) clearInterval(timer);
    if (inFlight) await inFlight;
  };

  return { runOnce, start, stop };
}
