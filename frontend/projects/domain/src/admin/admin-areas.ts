/** The four areas of the admin app, in the order the navigation lists them (L2-021 AC1). */
export type AdminAreaKey = 'dashboard' | 'events' | 'services' | 'members';

/** One area: its key, the navigation's label and the path it opens. */
export interface AdminArea {
  key: AdminAreaKey;
  label: string;
  path: string;
}

/** Dashboard, Events, Services and Members (mock `admin-nav`; ADR 0010). */
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
  const path = url.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
  const area = ADMIN_AREAS.find((candidate) =>
    candidate.path === '/'
      ? path === '/'
      : path === candidate.path || path.startsWith(`${candidate.path}/`),
  );
  return area?.key ?? null;
}
