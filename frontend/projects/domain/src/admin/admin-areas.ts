import type { StaffRoleName } from '@cf/api';
import { pathOf } from '../errors/server-error';

/** The four areas of the admin app, in the order the navigation lists them (L2-021 AC1). */
export type AdminAreaKey = 'dashboard' | 'events' | 'services' | 'members';

/** One area: its key, the navigation's label and the path it opens. */
export interface AdminArea {
  key: AdminAreaKey;
  label: string;
  path: string;
}

/** Dashboard, Events, Services and Members (mock `admin-nav`; ADR 0011). */
export const ADMIN_AREAS: readonly AdminArea[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/' },
  { key: 'events', label: 'Events', path: '/events' },
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

/** The areas a Moderator opens (L2-019 AC1; ADR 0020): they moderate members, nothing more. */
const MODERATOR_AREAS: readonly AdminAreaKey[] = ['dashboard', 'members'];

/**
 * Whether `role` may use `area` (L2-019 AC1, AC2; ADR 0020): an Admin every area, a Moderator the
 * Dashboard and Members. The API decides each request with the same table (`StaffAccess`); this
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

/** The areas the navigation lists for `role`, in {@link ADMIN_AREAS} order (L2-019 AC5). */
export function areasFor(role: StaffRoleName): readonly AdminArea[] {
  return ADMIN_AREAS.filter((area) => canManage(role, area.key));
}
