import type { AdminEventDto } from '@cf/api';

/**
 * The line under an event's title in Events: its place, after "Part of <series>" when it is a
 * series' session (L2-071 AC6; ADR 0091; mock `admin-events/default`).
 */
export function adminEventSubOf(event: AdminEventDto): string {
  return event.series ? `Part of ${event.series.title} · ${event.place}` : event.place;
}
