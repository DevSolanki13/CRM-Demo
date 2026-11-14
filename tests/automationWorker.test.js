import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAutomationWorker } from '../backend/services/automationWorker.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('local automation worker', () => {
  it('runs immediately, repeats on its interval, and stops cleanly', async () => {
    vi.useFakeTimers();
    const runCycle = vi.fn().mockResolvedValue({ claimed: false });
    const logger = { log: vi.fn(), error: vi.fn() };
    const worker = createAutomationWorker({ runCycle, logger });

    worker.start();
    expect(runCycle).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(runCycle).toHaveBeenCalledTimes(2);

    await worker.stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(runCycle).toHaveBeenCalledTimes(2);
  });
});
