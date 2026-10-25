import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { createAccountInvitation, acceptAccountInvitation } from '../backend/auth/invitations.js';
import { verifyPassword } from '../backend/auth/passwords.js';
import { recordLoginAttempt, clearLoginAttempts } from '../backend/auth/loginLimiter.js';

describe('account setup and shared sign-in limits', () => {
  it('uses one-time invitation links and replaces the account password', async () => {
    const id = `usr-invite-${randomUUID()}`;
    const actor = { id: `admin-${id}`, name: 'Test administrator' };
    try {
      await prisma.user.create({ data: {
        id, name: 'Invited user', email: `${id}@example.test`, role: 'Sales Rep', active: true,
      } });
      const first = await createAccountInvitation(id, actor);
      const second = await createAccountInvitation(id, actor);
      await expect(acceptAccountInvitation(first.token, 'strong-test-password-123'))
        .rejects.toMatchObject({ statusCode: 400 });
      await expect(acceptAccountInvitation(second.token, 'strong-test-password-123'))
        .resolves.toEqual({ success: true });
      const user = await prisma.user.findUnique({ where: { id } });
      expect(await verifyPassword('strong-test-password-123', user.passwordHash)).toBe(true);
      await expect(acceptAccountInvitation(second.token, 'another-test-password-123'))
        .rejects.toMatchObject({ statusCode: 400 });
    } finally {
      await prisma.session.deleteMany({ where: { userId: id } });
      await prisma.accountInvitation.deleteMany({ where: { userId: id } });
      await prisma.auditLog.deleteMany({ where: { entityType: 'User', entityId: id } });
      await prisma.user.deleteMany({ where: { id } });
    }
  });

  it('counts attempts across callers in the database', async () => {
    const suffix = randomUUID();
    const ip = `test-${suffix}`;
    const email = `${suffix}@example.test`;
    try {
      for (let index = 0; index < 20; index++) {
        expect((await recordLoginAttempt(ip, email)).blocked).toBe(false);
      }
      expect((await recordLoginAttempt(ip, email)).blocked).toBe(true);
    } finally {
      await clearLoginAttempts(ip, email);
    }
  });
});
