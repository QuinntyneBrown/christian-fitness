import type { StaffRoleName } from '@cf/api';
import { pathOf } from '../errors/server-error';

/** The areas of the admin app, in the order the navigation lists them (L2-021 AC1). */
export type AdminAreaKey =
  | 'dashboard'
  | 'stories'
  | 'newsletter'
  | 'events'
  | 'series'
  | 'community-pick'
  | 'listings'
  | 'services'
  | 'members';

/** One area: its key, the navigation's label and the path it opens. */
export interface AdminArea {
  key: AdminAreaKey;
  label: string;
  path: string;
}

/** Dashboard, Stories, Events, Event series, Community Pick, Listings, Services and Members (mock `admin-nav`; ADR 0011, ADR 0090, ADR 0094, ADR 0098). */
export const ADMIN_AREAS: readonly AdminArea[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/' },
  { key: 'stories', label: 'Stories', path: '/stories' },
  { key: 'newsletter', label: 'Newsletter', path: '/newsletter' },
  { key: 'events', label: 'Events', path: '/events' },
  { key: 'series', label: 'Event series', path: '/series' },
  { key: 'community-pick', label: 'Community Pick', path: '/community-pick' },
  { key: 'listings', label: 'Listings', path: '/listings' },
  { key: 'services', label: 'Services', path: '/services' },
  { key: 'members', label: 'Members', path: '/members' },
];

/**
 * The area a URL belongs to, marked `aria-current="page"` in the navigation (L2-021 AC1): the
 * Dashboard for `/` alone, any other area for its path and every path under it. The query and
 * fragment do not count. A URL in no area (a screen outside the shell) has none.
 */
export function currentAdminArea(url: string): AdminAreaKey | null {
  const path = pathOf(url).replace(/\/+$/, '') || '/';
  const area = ADMIN_AREAS.find((candidate) =>
    candidate.path === '/'
      ? path === '/'
      : path === candidate.path || path.startsWith(`${candidate.path}/`),
  );
  return area?.key ?? null;
}

/**
 * Whether the screen at `url` fills the admin page edge to edge, with no page padding: the story
 * editor, at `/stories/new` and `/stories/<id>`, has a sticky bar of its own (mock
 * `admin-story-editor/*`, `admin__page--flush`; ADR 0097). Bylines, under Stories, does not.
 */
export function adminPageIsFlush(url: string): boolean {
  const path = pathOf(url).replace(/\/+$/, '');
  return /^\/stories\/[^/]+$/.test(path) && path !== '/stories/bylines';
}

/** The areas a Moderator opens (L2-019 AC1; ADR 0020, ADR 0064, ADR 0091, ADR 0098; L2-070 AC12): they moderate members, review listings, run event series, make Community Picks and build the newsletter. */
const MODERATOR_AREAS: readonly AdminAreaKey[] = [
  'dashboard',
  'newsletter',
  'series',
  'community-pick',
  'listings',
  'members',
];

/**
 * Whether `role` may use `area` (L2-019 AC1, AC2; ADR 0020): an Admin every area, a Moderator the
 * Dashboard, Event series, Community Pick, Listings and Members. The API decides each request with the same table (`StaffAccess`); this
 * only adapts what the admin app shows. A role it does not know opens nothing.
 */
export function canManage(role: StaffRoleName, area: AdminAreaKey): boolean {
  switch (role) {
    case 'Admin':
      return true;
    case 'Moderator':
      return MODERATOR_AREAS.includes(area);
    default:
      return false;
  }
}

/** An event's Attendance tab: Moderators open it, though Events is for Admins only (L2-019 AC1 as amended; ADR 0106). */
const ATTENDANCE_PATH = /^\/events\/[^/]+\/attendance$/;

/**
 * Whether `role` may open the screen at `url` (L2-019 AC1, AC5; ADR 0020, ADR 0106): the area's
 * rule ({@link canManage}), except an event's Attendance tab, which Admins and Moderators open. A
 * screen in no area opens for any staff role.
 */
export function canOpen(role: StaffRoleName, url: string): boolean {
  const path = pathOf(url).replace(/\/+$/, '');
  if (ATTENDANCE_PATH.test(path)) return role === 'Admin' || role === 'Moderator';
  const area = currentAdminArea(url);
  return area === null || canManage(role, area);
}

/** The areas the navigation lists for `role`, in {@link ADMIN_AREAS} order (L2-019 AC5). */
export function areasFor(role: StaffRoleName): readonly AdminArea[] {
  return ADMIN_AREAS.filter((area) => canManage(role, area.key));
}
