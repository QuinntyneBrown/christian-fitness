import type { AdminCountsDto, StaffRoleName } from '@cf/api';
import { type AdminAreaKey, areasFor } from './admin-areas';

/** The groups an Admin's navigation names (L2-021 AC1; ADR 0079). */
export type AdminAreaGroup = 'Publish' | 'Gather' | 'Community';

/** One area as the navigation shows it: its group, and the work waiting there when there is any. */
export interface AdminNavArea {
  key: AdminAreaKey;
  label: string;
  href: string;
  /** Its group, none for the Dashboard, which stands alone. */
  group: AdminAreaGroup | null;
  count?: number;
  countLabel?: string;
}

/** Each area's group (ADR 0079); a group shows only once it holds an area (ADR 0091). */
const AREA_GROUPS: Record<AdminAreaKey, AdminAreaGroup | null> = {
  dashboard: null,
  stories: 'Publish',
  newsletter: 'Publish',
  events: 'Gather',
  series: 'Gather',
  'community-pick': 'Gather',
  listings: 'Community',
  services: 'Community',
  members: 'Community',
};

/**
 * The navigation for `role`, each area in its group, with the counts beside their areas (ADR 0079,
 * ADR 0090, ADR 0091, ADR 0097): Listings counts the suggestions waiting, named "{n} suggestions to
 * check" (one: "1 suggestion to check"), and Stories the stories in review, named "{n} stories to
 * review" (one: "1 story to review"). No count shows at zero or when the counts did not load
 * (`null`).
 */
export function adminNavOf(role: StaffRoleName, counts: AdminCountsDto | null): AdminNavArea[] {
  return areasFor(role).map(({ key, label, path }) => {
    const area = { key, label, href: path, group: AREA_GROUPS[key] };
    const waiting =
      key === 'listings'
        ? (counts?.suggestions ?? 0)
        : key === 'stories'
          ? (counts?.storiesInReview ?? 0)
          : 0;
    if (waiting <= 0) return area;
    const countLabel =
      key === 'stories'
        ? waiting === 1
          ? '1 story to review'
          : `${waiting} stories to review`
        : waiting === 1
          ? '1 suggestion to check'
          : `${waiting} suggestions to check`;
    return { ...area, count: waiting, countLabel };
  });
}

/** Whether `role`'s navigation names its groups: an Admin's does, a Moderator's one list does not (L2-021 AC1). */
export function showsAreaGroups(role: StaffRoleName): boolean {
  return role === 'Admin';
}
