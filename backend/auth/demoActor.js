import { prisma } from '../prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { actorContext, PUBLIC_USER_SELECT, ROLES } from './identity.js';
import { requireSession } from './sessions.js';

// Account selection is only available in the existing no-login workspace.
export const attachDemoActor = asyncHandler(async (req, _res, next) => {
  const selectedId = req.get('X-CRM-Workspace-User');
  const user = await prisma.user.findFirst({
    where: selectedId
      ? { id: selectedId, active: true, role: { in: ROLES } }
      : { active: true, role: 'Admin' },
    orderBy: { id: 'asc' },
    select: PUBLIC_USER_SELECT,
  });
  if (!user) {
    if (selectedId) {
      throw Object.assign(new Error('This account is no longer available. Choose another account.'), { statusCode: 400 });
    }
    throw Object.assign(new Error('An active administrator is required to open the CRM.'), { statusCode: 503 });
  }
  req.user = user;
  actorContext.run(user, next);
});

export const getWorkspaceIdentity = asyncHandler(async (req, res) => {
  const accounts = req.authMode === 'shared' ? await prisma.user.findMany({
    where: { active: true, role: { in: ROLES } },
    orderBy: [{ role: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    select: PUBLIC_USER_SELECT,
  }) : [];
  res.json({ user: req.user, authMode: req.authMode, accounts });
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
  if (process.env.REQUIRE_ADMIN_AUTH === 'true') {
    return res.status(503).json({ error: 'Administrator sign-in is not configured. Run npm run admin:create on the server.' });
  }
  req.authMode = 'shared';
  return attachDemoActor(req, res, next);
});
