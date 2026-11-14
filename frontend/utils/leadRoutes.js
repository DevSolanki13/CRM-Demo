export const LEAD_SECTION_PATHS = Object.freeze({
  new: '/leads/new',
  recurring: '/leads/recurring',
});

export const APP_PAGE_PATHS = Object.freeze({
  dashboard: '/dashboard',
  leads: LEAD_SECTION_PATHS.new,
  pipeline: '/pipeline',
  contacts: '/contacts',
  companies: '/companies',
  tasks: '/tasks',
  employees: '/employees',
  reports: '/reports',
  settings: '/settings',
  connections: '/connections',
});

export function resolveLeadLocation(pathname, hash = '') {
  const normalizedPath = String(pathname || '/').replace(/\/+$/, '') || '/';
  const hashRoute = String(hash || '').replace(/^#/, '').split('?')[0];
  const isLeadPath = normalizedPath === '/leads' || normalizedPath.startsWith('/leads/');
  const isLegacyLeadHash = normalizedPath === '/' &&
    (hashRoute === 'leads' || hashRoute.startsWith('leads/'));

  if (!isLeadPath && !isLegacyLeadHash) return null;

  const segments = normalizedPath.split('/');
  const section = isLeadPath
    ? segments[2] === 'recurring' ? 'recurring' : 'new'
    : hashRoute === 'leads/recurring' ? 'recurring' : 'new';
  const leadId = isLeadPath && ['new', 'recurring'].includes(segments[2]) && segments.length === 4
    ? decodeURIComponent(normalizedPath.split('/')[3])
    : null;
  const path = `${LEAD_SECTION_PATHS[section]}${leadId ? `/${encodeURIComponent(leadId)}` : ''}`;

  return { section, path, leadId, needsRedirect: pathname !== path || Boolean(hash) };
}

export function resolveAppLocation(location) {
  const leadRoute = resolveLeadLocation(location.pathname, location.hash);
  if (leadRoute) {
    const canonicalUrl = `${leadRoute.path}${location.search}`;
    return {
      activeTab: 'leads',
      leadSection: leadRoute.section,
      leadId: leadRoute.leadId,
      requestedTab: 'leads',
      canonicalUrl: leadRoute.needsRedirect ||
        `${location.pathname}${location.search}${location.hash}` !== canonicalUrl
        ? canonicalUrl : null,
    };
  }

  const pathname = String(location.pathname || '/').replace(/\/+$/, '') || '/';
  const legacyHash = location.hash.slice(1);
  const [legacyTab, legacyQuery = ''] = legacyHash.split('?');
  const pageFromPath = Object.keys(APP_PAGE_PATHS).find(tab =>
    tab !== 'leads' && APP_PAGE_PATHS[tab] === pathname);
  const pageFromHash = pathname === '/' && APP_PAGE_PATHS[legacyTab] ? legacyTab : null;
  const requestedTab = pageFromPath || pageFromHash || (pathname === '/' && !legacyHash ? 'dashboard' : 'dashboard');
  const params = new URLSearchParams(location.search);
  if (legacyQuery) {
    new URLSearchParams(legacyQuery).forEach((value, key) => {
      if (!params.has(key)) params.set(key, value);
    });
  }
  const search = params.toString();
  const hasInvite = legacyHash.startsWith('invite=');
  const canonicalUrl = pageFromHash
    ? `${APP_PAGE_PATHS[pageFromHash]}${search ? `?${search}` : ''}`
    : !pageFromPath && !hasInvite
      ? `${APP_PAGE_PATHS.dashboard}${search ? `?${search}` : ''}`
      : null;

  return {
    activeTab: requestedTab,
    leadSection: 'new',
    leadId: null,
    requestedTab: pageFromHash || requestedTab,
    canonicalUrl,
  };
}
