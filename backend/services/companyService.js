import { prisma } from '../prisma.js';
import { deleteUnlinkedCustomerRecord } from './deletionPolicy.js';

const VALID_COMPANY_KEYS = new Set([
  'id',
  'ownerId',
  'name',
  'industry',
  'website',
  'address',
  'notes',
  'createdAt'
]);

const sanitizeCompanyData = (data = {}) => {
  const sanitized = {};
  for (const key of Object.keys(data)) {
    if (VALID_COMPANY_KEYS.has(key)) {
      sanitized[key] = data[key];
    }
  }
  return sanitized;
};

export const getCompanies = async () => {
  return await prisma.company.findMany({
    orderBy: { createdAt: 'desc' }
  });
};

export const createCompany = async (data) => {
  const rawComp = {
    id: data.id || `c-${Date.now()}`,
    name: data.name,
    ownerId: data.ownerId || null,
    industry: data.industry || 'General',
    website: data.website || '',
    address: data.address || '',
    notes: data.notes || '',
    createdAt: data.createdAt || new Date().toISOString().split('T')[0],
  };
  return await prisma.company.create({ data: sanitizeCompanyData(rawComp) });
};

export const updateCompany = async (id, data) => {
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) return null;
  return await prisma.company.update({
    where: { id },
    data: {
      ...sanitizeCompanyData(existing),
      ...sanitizeCompanyData(data),
      ...('ownerId' in data ? { ownerId: data.ownerId || null } : {}),
      id, // Preserve immutable ID
    }
  });
};

export const deleteCompany = async (id) => {
  return prisma.$transaction(tx => deleteUnlinkedCustomerRecord(tx, 'Company', id),
    { isolationLevel: 'Serializable' });
};
