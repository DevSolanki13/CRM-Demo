import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { prisma } from '../prisma.js';
import { hashPassword } from './passwords.js';

const INVITATION_MS = 48 * 60 * 60 * 1000;
const tokenHash = token => createHash('sha256').update(token).digest('hex');
const invalidInvitation = () => Object.assign(new Error('This invitation link is invalid or expired. Ask an administrator for a new link.'), { statusCode: 400 });

export async function createAccountInvitation(userId, actor) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, active: true } });
  if (!user?.active) throw Object.assign(new Error('Choose an active team member.'), { statusCode: 400 });
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITATION_MS);
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    await tx.accountInvitation.deleteMany({ where: { userId, usedAt: null } });
    await tx.accountInvitation.create({ data: {
      tokenHash: tokenHash(token), userId, createdBy: actor.id, expiresAt,
    } });
    await tx.auditLog.create({ data: {
      id: `aud-invite-${randomUUID()}`, timestamp: new Date().toISOString(),
      actorId: actor.id, actorName: actor.name, action: 'ACCOUNT_INVITATION_CREATED',
      entityType: 'User', entityId: userId, reason: 'A one-time account setup link was created.',
    } });
  });
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function acceptAccountInvitation(token, password) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw invalidInvitation();
  const passwordHash = await hashPassword(password);
  const now = new Date();
  const hash = tokenHash(token);
  return prisma.$transaction(async tx => {
    const claimed = await tx.accountInvitation.updateMany({
      where: { tokenHash: hash, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) throw invalidInvitation();
    const invitation = await tx.accountInvitation.findUnique({ where: { tokenHash: hash } });
    const user = await tx.user.findUnique({ where: { id: invitation.userId }, select: { active: true } });
    if (!user?.active) throw invalidInvitation();
    await tx.user.update({ where: { id: invitation.userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: invitation.userId } });
    await tx.auditLog.create({ data: {
      id: `aud-invite-used-${randomUUID()}`, timestamp: now.toISOString(),
      actorId: invitation.userId, actorName: 'Account holder', action: 'ACCOUNT_INVITATION_ACCEPTED',
      entityType: 'User', entityId: invitation.userId,
      reason: 'A one-time account setup link was used.',
    } });
    return { success: true };
  });
}
