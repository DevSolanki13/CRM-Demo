import { AsyncLocalStorage } from 'node:async_hooks';

// Audit writers inherit the verified request actor, including nested service calls.
export const actorContext = new AsyncLocalStorage();
export const PUBLIC_USER_SELECT = {
  id: true, name: true, email: true, role: true, active: true, avatarUrl: true,
};
export const ROLES = ['Admin', 'Manager', 'Sales Rep'];

export function publicUser(user) {
  return Object.fromEntries(Object.keys(PUBLIC_USER_SELECT).map(key => [key, user[key]]));
}
