import { prisma } from '../prisma.js';

const rows = await Promise.all([
  prisma.user.findMany({ select: { id: true } }),
  prisma.stage.findMany({ select: { id: true } }),
  prisma.company.findMany({ select: { id: true, name: true, ownerId: true } }),
  prisma.contact.findMany({ select: { id: true, email: true, companyId: true, ownerId: true } }),
  prisma.lead.findMany({ select: { id: true, ownerId: true } }),
  prisma.deal.findMany({ select: { id: true, status: true, stageId: true, leadId: true, parentDealId: true,
    companyId: true, contactId: true, ownerId: true, lostStageId: true } }),
  prisma.task.findMany({ select: { id: true, ownerId: true, linkedType: true, linkedId: true,
    stageGateCheckId: true } }),
  prisma.note.findMany({ select: { id: true, linkedType: true, linkedId: true } }),
  prisma.activity.findMany({ select: { id: true, linkedType: true, linkedId: true } }),
  prisma.stageGateCheck.findMany({ select: { id: true, dealId: true } }),
  prisma.session.findMany({ select: { userId: true } }),
]);
const [users, stages, companies, contacts, leads, deals, tasks, notes, activities, checks, sessions] = rows;
const ids = list => new Set(list.map(item => item.id));
const userIds = ids(users);
const stageIds = ids(stages);
const companyIds = ids(companies);
const contactIds = ids(contacts);
const leadIds = ids(leads);
const dealIds = ids(deals);
const checkIds = ids(checks);
const check = (items, field, valid) => ({
  empty: items.filter(item => item[field] === '').length,
  missing: items.filter(item => item[field] && !valid.has(item[field])).length,
  missingRecordIds: items.filter(item => item[field] && !valid.has(item[field])).map(item => item.id),
});
const linkedReferenceCheck = items => {
  const valid = { Company: companyIds, Contact: contactIds, Lead: leadIds, Deal: dealIds };
  return {
    empty: items.filter(item => item.linkedId === '').length,
    missing: items.filter(item => item.linkedId && valid[item.linkedType] &&
      !valid[item.linkedType].has(item.linkedId)).map(item => item.id),
    unsupportedType: items.filter(item => item.linkedId && !valid[item.linkedType]).map(item => item.id),
  };
};
const duplicates = (items, key) => {
  const counts = new Map();
  for (const item of items) {
    const value = item[key]?.trim().toLowerCase();
    if (value) counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.values()].filter(count => count > 1).length;
};
const result = {
  counts: { users: users.length, stages: stages.length, companies: companies.length,
    contacts: contacts.length, leads: leads.length, deals: deals.length,
    tasks: tasks.length, notes: notes.length, activities: activities.length,
    approvals: checks.length, sessions: sessions.length,
    lostDealsWithoutSourceStage: deals.filter(deal => deal.status === 'Lost' && !deal.lostStageId).length },
  references: {
    companyOwner: check(companies, 'ownerId', userIds),
    contactOwner: check(contacts, 'ownerId', userIds),
    contactCompany: check(contacts, 'companyId', companyIds),
    leadOwner: check(leads, 'ownerId', userIds),
    dealOwner: check(deals, 'ownerId', userIds),
    dealStage: check(deals, 'stageId', stageIds),
    dealLostStage: check(deals, 'lostStageId', stageIds),
    dealLead: check(deals, 'leadId', leadIds),
    dealParent: check(deals, 'parentDealId', dealIds),
    dealCompany: check(deals, 'companyId', companyIds),
    dealContact: check(deals, 'contactId', contactIds),
    taskOwner: check(tasks, 'ownerId', userIds),
    taskApproval: check(tasks, 'stageGateCheckId', checkIds),
    taskLink: linkedReferenceCheck(tasks),
    noteLink: linkedReferenceCheck(notes),
    activityLink: linkedReferenceCheck(activities),
    approvalDeal: check(checks, 'dealId', dealIds),
    sessionUser: check(sessions, 'userId', userIds),
  },
  duplicateGroups: {
    companyName: duplicates(companies, 'name'),
    contactEmail: duplicates(contacts, 'email'),
  },
};
console.log(JSON.stringify(result, null, 2));
await prisma.$disconnect();
