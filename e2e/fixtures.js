import { test as base, expect } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';
import { prisma } from '../backend/prisma.js';
import { hashPassword } from '../backend/auth/passwords.js';

export const test = base.extend({
  account: [async ({ browserName: _browserName }, use) => {
    const id = `e2e-${randomUUID()}`;
    const password = randomBytes(24).toString('hex');
    const email = `${id}@example.test`;
    await prisma.user.create({ data: { id, name: 'Test Administrator', email, role: 'Admin', active: true, passwordHash: await hashPassword(password) } });
    try {
      await use({ id, email, password });
    } finally {
      // Remove only records owned by this temporary test account.
      const leads = await prisma.lead.findMany({ where: { ownerId: id }, select: { id: true } });
      const deals = await prisma.deal.findMany({ where: { ownerId: id }, select: { id: true } });
      const entityIds = [...leads, ...deals].map(row => row.id);
      await prisma.task.deleteMany({ where: { OR: [{ ownerId: id }, { linkedId: { in: entityIds } }] } });
      await prisma.activity.deleteMany({ where: { OR: [{ authorId: id }, { linkedId: { in: entityIds } }] } });
      await prisma.note.deleteMany({ where: { authorId: id } });
      await prisma.stageGateCheck.deleteMany({ where: { submittedBy: id } });
      await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: id }, { entityId: { in: entityIds } }] } });
      await prisma.deal.deleteMany({ where: { ownerId: id } });
      await prisma.lead.deleteMany({ where: { ownerId: id } });
      await prisma.user.delete({ where: { id } });
      await prisma.$disconnect();
    }
  }, { scope: 'worker' }],
  signedIn: [true, { option: true }],
  authenticated: [async ({ page, account, signedIn }, use) => {
    if (signedIn) {
      const response = await page.request.post('/api/auth/login', { data: { email: account.email, password: account.password } });
      expect(response.ok()).toBeTruthy();
    }
    await use();
  }, { auto: true }],
});
export { expect };
