import type { AdminCountsDto, StaffRoleName } from '@cf/api';
import { type AdminAreaKey, areasFor } from './admin-areas';

/** One area as the navigation shows it, with the work waiting there when there is any. */
export interface AdminNavArea {
  key: AdminAreaKey;
  label: string;
  href: string;
  count?: number;
  countLabel?: string;
}

/**
 * The navigation for `role` with the counts beside their areas (ADR 0079, ADR 0090): Listings
 * counts the suggestions waiting, named "{n} suggestions to check" (one: "1 suggestion to
 * check"). No count shows at zero or when the counts did not load (`null`).
 */
export function adminNavOf(role: StaffRoleName, counts: AdminCountsDto | null): AdminNavArea[] {
  return areasFor(role).map(({ key, label, path }) => {
    const waiting = key === 'listings' ? (counts?.suggestions ?? 0) : 0;
    return waiting > 0
      ? {
          key,
          label,
          href: path,
          count: waiting,
          countLabel: waiting === 1 ? '1 suggestion to check' : `${waiting} suggestions to check`,
        }
      : { key, label, href: path };
  });
}
