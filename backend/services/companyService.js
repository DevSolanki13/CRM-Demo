import { prisma } from '../prisma.js';

export const getCompanies = async () => {
  return await prisma.company.findMany({
    orderBy: { createdAt: 'desc' }
  });
};

export const createCompany = async (data) => {
  const newComp = {
    id: data.id || `c-${Date.now()}`,
    name: data.name,
    industry: data.industry || 'General',
    website: data.website || '',
    address: data.address || '',
    notes: data.notes || '',
    createdAt: data.createdAt || new Date().toISOString().split('T')[0],
  };
  return await prisma.company.create({ data: newComp });
};

export const updateCompany = async (id, data) => {
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) return null;
  return await prisma.company.update({
    where: { id },
    data: {
      ...existing,
      ...data,
      id, // Preserve immutable ID
    }
  });
};

export const deleteCompany = async (id) => {
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.company.delete({ where: { id } });
  return true;
};
