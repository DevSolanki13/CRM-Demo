const teamRoles = ['Admin', 'Manager'];
const accountRoles = [...teamRoles, 'Sales Rep'];

export const PAGE_ACCESS = {
  dashboard: accountRoles, leads: accountRoles, pipeline: accountRoles,
  contacts: accountRoles, companies: accountRoles, tasks: accountRoles,
  reports: accountRoles, connections: accountRoles,
  employees: teamRoles, settings: ['Admin'],
};

export const canAccessPage = (user, page) => PAGE_ACCESS[page]?.includes(user?.role) || false;
export const canManageTeam = user => teamRoles.includes(user?.role);
export const canEditCompany = (user, company) => canManageTeam(user) || Boolean(user?.id && company?.ownerId === user.id);
export const getRecordUsers = (user, users = []) => users.filter(account =>
  account.active && (canManageTeam(user) || account.id === user?.id));
