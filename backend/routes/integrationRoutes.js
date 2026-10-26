import { Router } from 'express';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protectWrites, requireSession } from '../auth/sessions.js';
import { attachWorkspaceActor } from '../auth/demoActor.js';
import { beginGoogleConsent, completeGoogleConsent, connectionStatus, digest,
  disconnectConnection, queueConnectionSync, OAUTH_COOKIE, oauthCookieOptions } from '../integrations/googleConnection.js';

export const integrationRouter = Router();
const cookieNonce = req => req.headers.cookie?.split(';').map(value => value.trim())
  .find(value => value.startsWith(`${OAUTH_COOKIE}=`))?.slice(OAUTH_COOKIE.length + 1);

integrationRouter.get('/google/callback', asyncHandler(async (req, res) => {
  const nonce = cookieNonce(req);
  const { maxAge: _maxAge, ...options } = oauthCookieOptions();
  res.clearCookie(OAUTH_COOKIE, options);
  let result = 'failed';
  try {
    if (req.query.error) {
      if (typeof req.query.state === 'string' && typeof nonce === 'string') {
        await prisma.integrationOAuthState.deleteMany({ where: { stateHash: digest(req.query.state), nonceHash: digest(nonce) } });
      }
      result = 'declined';
    } else {
      await completeGoogleConsent({ state: req.query.state, code: req.query.code, nonce });
      result = 'connected';
    }
  } catch (error) {
    // OAuth errors may carry tokens in their HTTP request; never log the object.
    console.error('[Google connection]', error.statusCode || 'provider_error');
  }
  res.redirect(`/#connections?connection=${result}`);
}));

integrationRouter.get('/status', attachWorkspaceActor, asyncHandler(async (req, res) => {
  res.json({ ...await connectionStatus(req.user), canConnect: req.authMode === 'session' });
}));
integrationRouter.use(protectWrites, requireSession);
integrationRouter.post('/google/connect', asyncHandler(async (req, res) => {
  const { url, nonce } = await beginGoogleConsent(req.user);
  res.cookie(OAUTH_COOKIE, nonce, oauthCookieOptions());
  res.json({ url });
}));
integrationRouter.post('/connections/:id/sync', asyncHandler(async (req, res) => {
  res.json(await queueConnectionSync(req.params.id, req.user));
}));
integrationRouter.post('/connections/:id/disconnect', asyncHandler(async (req, res) => {
  res.json(await disconnectConnection(req.params.id, req.user));
}));
