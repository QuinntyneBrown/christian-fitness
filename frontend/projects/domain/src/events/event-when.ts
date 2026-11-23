/** The community's time zone: events happen in the Greater Toronto Area (ADR 0020). */
export const EVENT_TIME_ZONE = 'America/Toronto';

// Made once on first use, not at import: the formatter is costly to create.
let dayFormat: Intl.DateTimeFormat | undefined;
let timeFormat: Intl.DateTimeFormat | undefined;

/**
 * An event's start as the staff list shows it, in Toronto whatever the browser's zone: "May 06 ·
 * 9:30 AM" (mock `admin-events`). Empty for a value that is not an instant.
 */
export function eventWhen(startsAt: string): string {
  const instant = new Date(startsAt);
  if (Number.isNaN(instant.getTime())) return '';
  dayFormat ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    month: 'short',
    day: '2-digit',
  });
  timeFormat ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  });
  // ICU puts a narrow no-break space before AM and PM; the mock has a plain space.
  return `${dayFormat.format(instant)} · ${timeFormat.format(instant).replace(/\s/g, ' ')}`;
}
