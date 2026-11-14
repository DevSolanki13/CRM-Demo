import { describe, expect, it } from 'vitest';
import { APP_PAGE_PATHS, LEAD_SECTION_PATHS, resolveAppLocation, resolveLeadLocation } from '../frontend/utils/leadRoutes.js';

describe('lead section routes', () => {
  it('resolves the two canonical section URLs without redirects', () => {
    expect(resolveLeadLocation('/leads/new')).toEqual({
      section: 'new',
      path: LEAD_SECTION_PATHS.new,
      leadId: null,
      needsRedirect: false,
    });
    expect(resolveLeadLocation('/leads/recurring')).toEqual({
      section: 'recurring',
      path: LEAD_SECTION_PATHS.recurring,
      leadId: null,
      needsRedirect: false,
    });
  });

  it.each(['/leads', '/leads/all', '/leads/board', '/leads/new/'])(
    'redirects legacy or unknown lead paths to New Leads (%s)',
    pathname => {
      expect(resolveLeadLocation(pathname)).toMatchObject({
        section: 'new',
        path: LEAD_SECTION_PATHS.new,
        needsRedirect: true,
      });
    },
  );

  it('redirects legacy hash navigation to the matching section URL', () => {
    expect(resolveLeadLocation('/', '#leads')).toMatchObject({
      section: 'new',
      path: LEAD_SECTION_PATHS.new,
      needsRedirect: true,
    });
    expect(resolveLeadLocation('/', '#leads/recurring')).toMatchObject({
      section: 'recurring',
      path: LEAD_SECTION_PATHS.recurring,
      needsRedirect: true,
    });
  });

  it('resolves detail routes and preserves their section', () => {
    expect(resolveLeadLocation('/leads/recurring/lead-1')).toMatchObject({
      section: 'recurring',
      path: '/leads/recurring/lead-1',
      leadId: 'lead-1',
      needsRedirect: false,
    });
  });

  it('maps every app page to a canonical pathname and keeps legacy hash links', () => {
    for (const [tab, pathname] of Object.entries(APP_PAGE_PATHS)) {
      if (tab === 'leads') continue;
      expect(resolveAppLocation({ pathname, search: '', hash: '' })).toMatchObject({
        activeTab: tab,
        canonicalUrl: null,
      });
    }
    expect(resolveAppLocation({ pathname: '/', search: '', hash: '#pipeline' })).toMatchObject({
      activeTab: 'pipeline',
      canonicalUrl: '/pipeline',
    });
    expect(resolveAppLocation({ pathname: '/', search: '', hash: '' })).toMatchObject({
      activeTab: 'dashboard',
      canonicalUrl: '/dashboard',
    });
  });

  it('does not claim non-lead routes', () => {
    expect(resolveLeadLocation('/', '#dashboard')).toBeNull();
    expect(resolveLeadLocation('/contacts')).toBeNull();
  });
});
