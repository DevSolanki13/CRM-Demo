import { validatedInput, contactSchema, updateContactSchema, contactImportSchema } from '../middleware/validation.js';
import { randomUUID } from 'node:crypto';
import { prisma } from '../prisma.js';
import { deleteUnlinkedCustomerRecord } from './deletionPolicy.js';

const VALID_CONTACT_KEYS = new Set([
  'id',
  'name',
  'email',
  'phone',
  'jobTitle',
  'companyId',
  'companyName',
  'ownerId',
  'ownerName',
  'customFields',
  'createdAt'
]);

const sanitizeContactData = (data = {}) => {
  const sanitized = {};
  for (const key of Object.keys(data)) {
    if (VALID_CONTACT_KEYS.has(key)) {
      sanitized[key] = data[key];
    }
  }
  return sanitized;
};

export const getContacts = async () => {
  return await prisma.contact.findMany({
    orderBy: { createdAt: 'desc' }
  });
};

export const createContact = async (data) => {
  data = validatedInput(contactSchema, data);
  const rawContact = {
    id: data.id || `cnt-${Date.now()}`,
    name: data.name,
    email: data.email || '',
    phone: data.phone || '',
    jobTitle: data.jobTitle || '',
    companyId: data.companyId || null,
    companyName: data.companyName || '',
    ownerId: data.ownerId || 'u-1',
    ownerName: data.ownerName || 'Alex Vance',
    customFields: data.customFields || {},
    createdAt: data.createdAt || new Date().toISOString().split('T')[0],
  };
  return await prisma.contact.create({ data: sanitizeContactData(rawContact) });
};

export const updateContact = async (id, data) => {
  data = validatedInput(updateContactSchema, data);
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) return null;
  return await prisma.contact.update({
    where: { id },
    data: {
      ...sanitizeContactData(existing),
      ...sanitizeContactData(data),
      ...('companyId' in data ? { companyId: data.companyId || null } : {}),
      id,
    }
  });
};

export const deleteContact = async (id) => {
  return prisma.$transaction(tx => deleteUnlinkedCustomerRecord(tx, 'Contact', id),
    { isolationLevel: 'Serializable' });
};

export const importContacts = async (items = []) => {
  items = validatedInput(contactImportSchema, { items }).items;
  return prisma.$transaction(async tx => {
  const created = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rawContact = {
      id: item.id || `cnt-imp-${randomUUID()}`,
      name: item.name || 'Unnamed Contact',
      email: item.email || '',
      phone: item.phone || '',
      jobTitle: item.jobTitle || 'Business Contact',
      companyId: item.companyId || null,
      companyName: item.companyName || 'Unknown Corp',
      ownerId: item.ownerId || 'u-1',
      ownerName: item.ownerName || 'Alex Vance',
      customFields: item.customFields || {},
      createdAt: item.createdAt || new Date().toISOString().split('T')[0],
    };
    const contact = sanitizeContactData(rawContact);
    const saved = await tx.contact.create({ data: contact });
    created.push(saved);
  }
  return created;
  }, { timeout: 30000 });
};
