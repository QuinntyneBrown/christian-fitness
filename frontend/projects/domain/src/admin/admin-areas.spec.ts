import type { StaffRoleName } from '@cf/api';
import {
  ADMIN_AREAS,
  areasFor,
  canManage,
  currentAdminArea,
  type AdminAreaKey,
} from './admin-areas';

// L2-021 AC1: the navigation lists four areas and marks the one the URL is in (ADR 0011).
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

// L2-019 AC1, AC5 (ADR 0020): which role opens which area. The rows are the same as the four-area
// rows of StaffAccessTests.cs in backend/tests/ChristianFitness.Application.Tests/Members.
describe('canManage', () => {
  it.each<{ role: StaffRoleName; area: AdminAreaKey; allowed: boolean; why: string }>([
    { role: 'Admin', area: 'dashboard', allowed: true, why: 'an Admin may use every area' },
    { role: 'Admin', area: 'events', allowed: true, why: 'an Admin manages events' },
    { role: 'Admin', area: 'services', allowed: true, why: 'an Admin manages services' },
    { role: 'Admin', area: 'members', allowed: true, why: 'an Admin moderates members' },
    { role: 'Moderator', area: 'dashboard', allowed: true, why: 'a Moderator sees the dashboard' },
    {
      role: 'Moderator',
      area: 'events',
      allowed: false,
      why: 'a Moderator does not manage events',
    },
    {
      role: 'Moderator',
      area: 'services',
      allowed: false,
      why: 'a Moderator does not manage services',
    },
    { role: 'Moderator', area: 'members', allowed: true, why: 'a Moderator moderates members' },
  ])('$role on $area is $allowed: $why', ({ role, area, allowed }) => {
    expect(canManage(role, area)).toBe(allowed);
  });

  it('refuses a role it does not know', () => {
    expect(canManage('Visitor' as StaffRoleName, 'dashboard')).toBe(false);
  });
});

describe('areasFor', () => {
  it('lists all four areas for an Admin, in navigation order', () => {
    expect(areasFor('Admin').map((area) => area.key)).toEqual([
      'dashboard',
      'events',
      'services',
      'members',
    ]);
  });

  it('lists the Dashboard and Members for a Moderator', () => {
    expect(areasFor('Moderator').map((area) => area.key)).toEqual(['dashboard', 'members']);
  });
});
