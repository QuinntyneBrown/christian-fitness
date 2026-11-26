import { EVENT_TIME_ZONE } from './event-when';

/** One of an event's tabs (mocks `admin-event-registrations`, `admin-event-attendance`). */
export interface EventTabView {
  label: string;
  href: string;
}

/** Registrations and Attendance, the tabs of one event in the console (L2-080 AC1; ADR 0106). */
export function eventTabsOf(id: string): EventTabView[] {
  const base = `/events/${encodeURIComponent(id)}`;
  return [
    { label: 'Registrations', href: `${base}/registrations` },
    { label: 'Attendance', href: `${base}/attendance` },
  ];
}

// Made once on first use, not at import: formatters are costly to create.
let dayFormat: Intl.DateTimeFormat | undefined;
let timeFormat: Intl.DateTimeFormat | undefined;

/** "Sat Apr 18 at 8:00 AM" in Toronto; ICU's narrow no-break space before AM and PM becomes a plain space. */
function startOf(instant: string): string {
  dayFormat ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  timeFormat ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  });
  const at = new Date(instant);
  return `${dayFormat.format(at).replace(',', '')} at ${timeFormat.format(at).replace(/\s/g, ' ')}`;
}

/**
 * The not-started state's sentence (L2-080 AC5; mock `admin-event-attendance/not-started`): "Stretch
 * & Pray: Mobility Morning starts Sat Apr 18 at 8:00 AM. Until then, 17 members are registered; see
 * Registrations."
 */
export function attendanceNotStartedTextOf(
  title: string,
  startsAt: string,
  registered: number,
): string {
  const who =
    registered === 0
      ? 'nobody is registered'
      : registered === 1
        ? '1 member is registered'
        : `${registered} members are registered`;
  return `${title} starts ${startOf(startsAt)}. Until then, ${who}; see Registrations.`;
}

/**
 * The polite status line above the list (L2-080 AC1, AC2; mocks `default`, `saving`): "Saving
 * <name>…" while a tick is saved, else "Came: <n> of <registered>. Changes save as you tick."
 */
export function attendanceStatusOf(
  came: number,
  registered: number,
  saving: string | null,
): string {
  return saving === null
    ? `Came: ${came} of ${registered}. Changes save as you tick.`
    : `Saving ${saving}…`;
}
