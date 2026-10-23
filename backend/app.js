import express from 'express';
import { crmRouter } from './routes/crmRoutes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10mb' }));
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', crmRouter);
  app.all('/api/*', (_req, res) => res.status(404).json({ error: 'API endpoint not found' }));
  app.use((err, _req, res, _next) => {
    const status = err.statusCode || err.status || (err.code === 'P2002' ? 409 : 500);
    if (status >= 500) console.error('[API Error]', err.message);
    res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message, statusCode: status });
  });
  return app;
}
