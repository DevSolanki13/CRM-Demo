import express from 'express';
import { crmRouter } from './routes/crmRoutes.js';
import { authRouter } from './auth/sessions.js';
import { automationCronRouter } from './routes/automationCronRoutes.js';
import { integrationRouter } from './routes/integrationRoutes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY || process.env.VERCEL || process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }
  app.use(express.json({ limit: '10mb' }));
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api/auth', authRouter);
  app.use('/api/internal/automation', automationCronRouter);
  app.use('/api/integrations', integrationRouter);
  app.use('/api', crmRouter);
  app.all('/api/*', (_req, res) => res.status(404).json({ error: 'API endpoint not found' }));
  app.use((err, _req, res, _next) => {
    const prismaErrors = {
      P2002: [409, 'A record with these unique details already exists.'],
      P2003: [400, 'A linked record no longer exists. Refresh and choose a valid record.'],
      P2025: [404, 'The requested record no longer exists.'],
      P2000: [400, 'A field exceeds its allowed length.'],
      P2006: [400, 'A field contains an invalid value.'],
      P2011: [400, 'A required field is missing.'],
      P2034: [409, 'A competing update changed this record. Refresh and try again.'],
    };
    const mapped = prismaErrors[err.code];
    const status = err.statusCode || err.status || mapped?.[0] || 500;
    if (status >= 500) console.error('[API Error]', err.message);
    res.status(status).json({ error: status >= 500 ? 'Internal server error' : mapped?.[1] || err.message, statusCode: status });
  });
  return app;
}
