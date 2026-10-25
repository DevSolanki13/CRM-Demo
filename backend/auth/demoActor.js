import { prisma } from '../prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { actorContext, PUBLIC_USER_SELECT } from './identity.js';
import { requireSession } from './sessions.js';

// Temporary shared workspace identity until account login is introduced.
export const attachDemoActor = asyncHandler(async (req, _res, next) => {
  const user = await prisma.user.findFirst({
    where: { active: true, role: 'Admin' },
    orderBy: { id: 'asc' },
    select: PUBLIC_USER_SELECT,
  });
  if (!user) {
    throw Object.assign(new Error('An active administrator is required to open the CRM.'), { statusCode: 503 });
  }
  req.user = user;
  actorContext.run(user, next);
});

export const attachWorkspaceActor = asyncHandler(async (req, res, next) => {
  const configuredAdmin = await prisma.user.findFirst({
    where: { active: true, role: 'Admin', passwordHash: { not: null } },
    select: { id: true },
  });
  if (configuredAdmin) {
    req.authMode = 'session';
    return requireSession(req, res, next);
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: 'Administrator sign-in is not configured. Run npm run admin:create on the server.' });
  }
  req.authMode = 'shared';
  return attachDemoActor(req, res, next);
});
