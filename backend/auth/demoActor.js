import { prisma } from '../prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { actorContext, PUBLIC_USER_SELECT } from './identity.js';

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
