import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { actorContext, publicUser, ROLES } from './identity.js';
import { verifyPassword, hashPassword } from './passwords.js';
import { recordLoginAttempt, clearLoginAttempts } from './loginLimiter.js';
import { acceptAccountInvitation } from './invitations.js';

const COOKIE = 'crm_session';
const lifetimeMs = 8 * 60 * 60 * 1000;
const digest = token => createHash('sha256').update(token).digest('hex');
const cookieOptions = () => ({
  httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/api',
});

function sessionToken(req) {
  const token = req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

// JSON-only writes prevent cross-site form submissions; Origin also protects
// against same-site sibling hosts. APP_ORIGIN is required behind a reverse proxy.
export function protectWrites(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const expectedOrigin = process.env.APP_ORIGIN || `${req.protocol}://${req.get('host')}`;
  if ((req.get('origin') && req.get('origin') !== expectedOrigin) || req.get('sec-fetch-site') === 'cross-site') {
    return res.status(403).json({ error: 'Cross-origin request denied' });
  }
  if (!req.is('application/json')) return res.status(415).json({ error: 'Use application/json for API writes' });
  next();
}

export const requireSession = asyncHandler(async (req, res, next) => {
  const token = sessionToken(req);
  const session = token ? await prisma.session.findUnique({ where: { tokenHash: digest(token) }, include: { user: true } }) : null;
  if (!session || session.expiresAt <= new Date() || !session.user.active || !ROLES.includes(session.user.role)) {
    res.clearCookie(COOKIE, cookieOptions());
    return res.status(401).json({ error: 'Sign in to continue' });
  }
  req.user = publicUser(session.user);
  req.sessionHash = session.tokenHash;
  res.set('Cache-Control', 'no-store');
  actorContext.run(req.user, next);
});

export function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'Permission denied' });
}

export const authRouter = Router();
authRouter.use(protectWrites);
const dummyHash = hashPassword(randomBytes(24).toString('hex'));
authRouter.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || email.length > 254 || typeof password !== 'string' || password.length > 128) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  // req.ip is intentionally not derived from untrusted forwarded headers.
  const attempt = await recordLoginAttempt(req.ip, normalizedEmail);
  if (attempt.blocked) {
    res.set('Retry-After', String(attempt.retryAfter));
    return res.status(429).json({ error: 'Too many sign-in attempts. Try again later.' });
  }
  const users = await prisma.user.findMany({ where: { email: { equals: normalizedEmail, mode: 'insensitive' } }, take: 2 });
  const user = users.length === 1 ? users[0] : null;
  const valid = await verifyPassword(password, user?.passwordHash || await dummyHash);
  if (!valid || !user?.active || !ROLES.includes(user.role)) return res.status(401).json({ error: 'Invalid email or password' });
  await clearLoginAttempts(req.ip, normalizedEmail);
  // Rotate rather than reusing any caller-supplied session.
  const oldToken = sessionToken(req);
  if (oldToken) await prisma.session.deleteMany({ where: { tokenHash: digest(oldToken) } });
  const token = randomBytes(32).toString('hex');
  await prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  await prisma.session.create({ data: { tokenHash: digest(token), userId: user.id, expiresAt: new Date(Date.now() + lifetimeMs) } });
  res.set('Cache-Control', 'no-store');
  res.cookie(COOKIE, token, { ...cookieOptions(), maxAge: lifetimeMs });
  res.json({ user: publicUser(user) });
}));
authRouter.get('/me', requireSession, (req, res) => res.json({ user: req.user }));
authRouter.post('/logout', asyncHandler(async (req, res) => {
  const token = sessionToken(req);
  if (token) await prisma.session.deleteMany({ where: { tokenHash: digest(token) } });
  res.clearCookie(COOKIE, cookieOptions());
  res.status(204).end();
}));
authRouter.post('/accept-invitation', asyncHandler(async (req, res) => {
  const result = await acceptAccountInvitation(req.body?.token, req.body?.password);
  res.json(result);
}));
