import { prisma } from '../prisma.js';

export const getContacts = async () => {
  return await prisma.contact.findMany({
    orderBy: { createdAt: 'desc' }
  });
};

export const createContact = async (data) => {
  const newContact = {
    id: data.id || `cnt-${Date.now()}`,
    name: data.name,
    email: data.email || '',
    phone: data.phone || '',
    jobTitle: data.jobTitle || '',
    companyId: data.companyId || '',
    companyName: data.companyName || '',
    ownerId: data.ownerId || 'u-1',
    ownerName: data.ownerName || 'Alex Vance',
    customFields: data.customFields || {},
    createdAt: data.createdAt || new Date().toISOString().split('T')[0],
  };
  return await prisma.contact.create({ data: newContact });
};

export const updateContact = async (id, data) => {
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) return null;
  return await prisma.contact.update({
    where: { id },
    data: {
      ...existing,
      ...data,
      id,
    }
  });
};

export const deleteContact = async (id) => {
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.contact.delete({ where: { id } });
  return true;
};

export const importContacts = async (items = []) => {
  const created = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const contact = {
      id: item.id || `cnt-imp-${Date.now()}-${i}`,
      name: item.name || 'Unnamed Contact',
      email: item.email || '',
      phone: item.phone || '',
      jobTitle: item.jobTitle || 'Business Contact',
      companyId: item.companyId || '',
      companyName: item.companyName || 'Unknown Corp',
      ownerId: item.ownerId || 'u-1',
      ownerName: item.ownerName || 'Alex Vance',
      customFields: item.customFields || {},
      createdAt: item.createdAt || new Date().toISOString().split('T')[0],
    };
    const saved = await prisma.contact.upsert({
      where: { id: contact.id },
      update: contact,
      create: contact,
    });
    created.push(saved);
  }
  return created;
};
