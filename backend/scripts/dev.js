await import('../server.js');

const { createAutomationWorker } = await import('../services/automationWorker.js');
const automationWorker = createAutomationWorker();
automationWorker.start();
