import { ADMIN_AREAS, currentAdminArea, type AdminAreaKey } from './admin-areas';

// L2-021 AC1: the navigation lists four areas and marks the one the URL is in (ADR 0010).
describe('ADMIN_AREAS', () => {
  it('lists Dashboard, Events, Services and Members with their paths', () => {
    expect(ADMIN_AREAS.map((area) => [area.label, area.path])).toEqual([
      ['Dashboard', '/'],
      ['Events', '/events'],
      ['Services', '/services'],
      ['Members', '/members'],
    ]);
  });
});

describe('currentAdminArea', () => {
  it.each<{ why: string; url: string; expected: AdminAreaKey | null }>([
    { why: 'the root', url: '/', expected: 'dashboard' },
    { why: 'the root with a query', url: '/?from=sign-in', expected: 'dashboard' },
    { why: 'an empty URL', url: '', expected: 'dashboard' },
    { why: 'an area', url: '/events', expected: 'events' },
    { why: 'an area with a trailing slash', url: '/services/', expected: 'services' },
    { why: 'a screen under an area', url: '/members/0190c0de', expected: 'members' },
    {
      why: 'an area with a query and a fragment',
      url: '/events?tab=draft#list',
      expected: 'events',
    },
    { why: 'a path that only starts like an area', url: '/eventsx', expected: null },
    { why: 'a screen outside the shell', url: '/sign-in', expected: null },
  ])('$why ($url) is $expected', ({ url, expected }) => {
    expect(currentAdminArea(url)).toBe(expected);
  });
});
