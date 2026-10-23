import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { hashPassword } from '../auth/passwords.js';
import { PUBLIC_USER_SELECT, ROLES } from '../auth/identity.js';

const fields = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().transform(value => value.trim().toLowerCase()),
  role: z.enum(ROLES),
  active: z.boolean(),
  avatarUrl: z.string().max(2048).nullable().optional(),
  password: z.string().min(12).max(128).optional(),
});

export const getUsers = () => prisma.user.findMany({ orderBy: { name: 'asc' }, select: PUBLIC_USER_SELECT });

async function userData(input, partial) {
  const result = (partial ? fields.partial() : fields).safeParse(input);
  if (!result.success) throw Object.assign(new Error('Invalid user details: ' + result.error.issues.map(issue => issue.message).join('; ')), { statusCode: 400 });
  const { password, ...data } = result.data;
  if (password) data.passwordHash = await hashPassword(password);
  return data;
}

async function ensureUniqueEmail(email, id) {
  if (email && await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, ...(id ? { id: { not: id } } : {}) } })) {
    throw Object.assign(new Error('Email is already in use'), { statusCode: 409 });
  }
}

export const createUser = async user => {
  const data = await userData({ role: 'Sales Rep', active: true, ...user }, false);
  if (!data.passwordHash) throw Object.assign(new Error('Set an initial password for the new user'), { statusCode: 400 });
  await ensureUniqueEmail(data.email);
  return prisma.user.create({ data: { id: randomUUID(), ...data }, select: PUBLIC_USER_SELECT });
};

export const updateUser = async (id, user, actor) => {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return null;
  const data = await userData(user, true);
  if (actor?.id === id && (data.active === false || (data.role && data.role !== 'Admin'))) {
    throw Object.assign(new Error('Use another administrator to change your own access'), { statusCode: 400 });
  }
  await ensureUniqueEmail(data.email, id);
  return prisma.$transaction(async tx => {
    const updated = await tx.user.update({ where: { id }, data, select: PUBLIC_USER_SELECT });
    if (data.passwordHash || data.active === false || (data.role && data.role !== existing.role)) await tx.session.deleteMany({ where: { userId: id } });
    return updated;
  });
};
