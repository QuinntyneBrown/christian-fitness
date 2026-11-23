import { COMMUNITY_TIME_ZONE } from '../events/going-date';

const MONTH_YEAR = new Intl.DateTimeFormat('en-CA', {
  month: 'long',
  year: 'numeric',
  timeZone: COMMUNITY_TIME_ZONE,
});
const CALENDAR_DAY = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: COMMUNITY_TIME_ZONE,
});

/**
 * The profile's join date (L2-005 AC1; mock `profile-hero__meta`): "Member since today" when the
 * member joined on `now`'s date in Toronto, otherwise "Member since" with the month and year they
 * joined in Toronto, such as "Member since January 2026" (ADR 0015).
 */
export function memberSinceOf(joinedAt: string, now: Date): string {
  const joined = new Date(joinedAt);
  return CALENDAR_DAY.format(joined) === CALENDAR_DAY.format(now)
    ? 'Member since today'
    : `Member since ${MONTH_YEAR.format(joined)}`;
}
