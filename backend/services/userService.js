import { prisma } from '../prisma.js';

export const getUsers = async () => {
  return await prisma.user.findMany({
    orderBy: { name: 'asc' }
  });
};

export const createUser = async (user) => {
  const newUser = {
    id: user.id || `u-${Date.now()}`,
    name: user.name || 'New Staff Member',
    email: user.email || 'user@salescrm.io',
    role: user.role || 'Sales Rep',
    active: user.active ?? true,
    avatarUrl: user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  };
  return await prisma.user.create({ data: newUser });
};

export const updateUser = async (id, user) => {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return null;
  return await prisma.user.update({
    where: { id },
    data: {
      ...existing,
      ...user,
      id,
    }
  });
};
