/** Where the community meets, so the time zone every date on screen is read in (ADR 0015). */
export const COMMUNITY_TIME_ZONE = 'America/Toronto';

const GOING_DATE = new Intl.DateTimeFormat('en-CA', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: COMMUNITY_TIME_ZONE,
});

/**
 * The day of an event the member is going to (L2-005 AC1; mock `going-item__date`): its weekday,
 * month and day in Toronto, such as "Sat, Apr 18".
 */
export function goingDateOf(startsAt: string): string {
  return GOING_DATE.format(new Date(startsAt));
}
