import { runScheduledAutomation } from './automationScheduler.js';
import { processPendingFollowUps } from './followUpEngine.js';
import { purgeDeletedAttachments } from './attachmentService.js';
import { processCommunicationSyncs } from '../integrations/communicationSync.js';

export async function runAutomationCycle() {
  return runScheduledAutomation(new Date(), { id: 'automation-cycle', intervalMs: 60_000,
    execute: async () => {
      const details = {};
      const failures = [];
      const jobs = { renewals: runScheduledAutomation, followUps: processPendingFollowUps,
        attachments: purgeDeletedAttachments, communications: processCommunicationSyncs };
      // A failed job must not prevent the remaining queues from being serviced.
      for (const [name, execute] of Object.entries(jobs)) {
        try {
          details[name] = await execute();
          if (details[name]?.failed) failures.push({ job: name, failed: details[name].failed });
        } catch { failures.push({ job: name, failed: true }); }
      }
      return { flippedCount: details.renewals?.flippedCount || 0, failures, details };
    },
  });
}
