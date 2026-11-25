import type { StaffRoleName } from '@cf/api';
import {
  ADMIN_AREAS,
  areasFor,
  adminPageIsFlush,
  canManage,
  currentAdminArea,
  type AdminAreaKey,
} from './admin-areas';

// L2-021 AC1: the navigation lists the areas and marks the one the URL is in (ADR 0011).
describe('ADMIN_AREAS', () => {
  it('lists Dashboard, Stories, Events, Event series, Listings, Services and Members with their paths', () => {
    expect(ADMIN_AREAS.map((area) => [area.label, area.path])).toEqual([
      ['Dashboard', '/'],
      ['Stories', '/stories'],
      ['Events', '/events'],
      ['Event series', '/series'],
      ['Community Pick', '/community-pick'],
      ['Listings', '/listings'],
      ['Services', '/services'],
      ['Members', '/members'],
    ]);
  });
});

// ADR 0097: the story editor fills the page edge to edge; every other screen keeps its padding.
describe('adminPageIsFlush', () => {
  it.each<[string, boolean]>([
    ['/stories/new', true],
    ['/stories/0193b000-0000-7000-8000-000000005701', true],
    ['/stories/0193b000-0000-7000-8000-000000005701?from=list', true],
    ['/stories', false],
    ['/stories?status=draft', false],
    ['/stories/bylines', false],
    ['/stories/0193b000/preview', false],
    ['/events/0193b000', false],
  ])('%s is %s', (url, flush) => {
    expect(adminPageIsFlush(url)).toBe(flush);
  });
});

describe('currentAdminArea', () => {
  it.each<{ why: string; url: string; expected: AdminAreaKey | null }>([
    { why: 'the root', url: '/', expected: 'dashboard' },
    { why: 'the root with a query', url: '/?from=sign-in', expected: 'dashboard' },
    { why: 'an empty URL', url: '', expected: 'dashboard' },
    { why: 'an area', url: '/events', expected: 'events' },
    { why: 'event series, not events', url: '/series?id=c5', expected: 'series' },
    {
      why: 'Community Pick with an event chosen',
      url: '/community-pick?event=e1',
      expected: 'community-pick',
    },
    { why: 'bylines, under stories', url: '/stories/bylines', expected: 'stories' },
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

// L2-019 AC1, AC5 (ADR 0020, ADR 0091): which role opens which area. The rows are the same as the
// five-area rows of StaffAccessTests.cs in backend/tests/ChristianFitness.Application.Tests/Members.
describe('canManage', () => {
  it.each<{ role: StaffRoleName; area: AdminAreaKey; allowed: boolean; why: string }>([
    { role: 'Admin', area: 'dashboard', allowed: true, why: 'an Admin may use every area' },
    { role: 'Admin', area: 'events', allowed: true, why: 'an Admin manages events' },
    { role: 'Admin', area: 'services', allowed: true, why: 'an Admin manages services' },
    { role: 'Admin', area: 'members', allowed: true, why: 'an Admin moderates members' },
    { role: 'Admin', area: 'listings', allowed: true, why: 'an Admin reviews listings (ADR 0064)' },
    {
      role: 'Moderator',
      area: 'listings',
      allowed: true,
      why: 'a Moderator reviews listings (ADR 0064)',
    },
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
    { role: 'Admin', area: 'series', allowed: true, why: 'an Admin manages event series' },
    { role: 'Moderator', area: 'series', allowed: true, why: 'a Moderator manages event series' },
    { role: 'Admin', area: 'community-pick', allowed: true, why: 'an Admin makes Community Picks' },
    {
      role: 'Moderator',
      area: 'community-pick',
      allowed: true,
      why: 'a Moderator makes Community Picks (ADR 0098)',
    },
    { role: 'Admin', area: 'stories', allowed: true, why: 'an Admin manages stories and bylines' },
    {
      role: 'Moderator',
      area: 'stories',
      allowed: false,
      why: 'a Moderator does not open Stories (L2-068 AC7, L2-077 AC10)',
    },
  ])('$role on $area is $allowed: $why', ({ role, area, allowed }) => {
    expect(canManage(role, area)).toBe(allowed);
  });

  it('refuses a role it does not know', () => {
    expect(canManage('Visitor' as StaffRoleName, 'dashboard')).toBe(false);
  });
});

describe('areasFor', () => {
  it('lists every area for an Admin, in navigation order', () => {
    expect(areasFor('Admin').map((area) => area.key)).toEqual([
      'dashboard',
      'stories',
      'events',
      'series',
      'community-pick',
      'listings',
      'services',
      'members',
    ]);
  });

  it('lists the Dashboard, Event series, Community Pick, Listings and Members for a Moderator', () => {
    expect(areasFor('Moderator').map((area) => area.key)).toEqual([
      'dashboard',
      'series',
      'community-pick',
      'listings',
      'members',
    ]);
  });
});
