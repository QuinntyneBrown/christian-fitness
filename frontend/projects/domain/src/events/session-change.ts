import type { AdminSessionDto } from '@cf/api';
import { EVENT_TIME_ZONE } from './event-when';

/** What a session row offers (ADR 0103): Cancel date, Restore, or nothing. */
export type AdminSessionAction = 'cancel' | 'restore' | null;

/**
 * Cancel date on a date neither started nor cancelled, Restore on a cancelled date not started,
 * nothing else (L2-071 AC4, AC5; ADR 0103). `started` is the API's clock's.
 */
export function adminSessionActionOf(
  session: Pick<AdminSessionDto, 'state' | 'started'>,
): AdminSessionAction {
  if (session.started) return null;
  if (session.state === 'cancelled') return 'restore';
  return session.state === 'done' ? null : 'cancel';
}

/**
 * The Cancel a series date dialog's first paragraph (L2-071 AC4; mock `cancel-session/default`):
 * how many are going, joined and dropped in, who is told and that refunds are the host's.
 */
export function cancelSessionTextOf(joined: number, droppedIn: number): string {
  const going = joined + droppedIn;
  if (going === 0) return 'Nobody is going to this date yet.';
  const who = going === 1 ? '1 person is' : `${going} people are`;
  return (
    `${who} going to this date (${joined} joined, ${droppedIn} dropped in). ` +
    'Everyone going is told in the series chat and in their notifications. ' +
    'If anyone paid for it, the host will sort out refunds with them directly.'
  );
}

// Made once on first use, not at import: formatters are costly to create.
let dayFormat: Intl.DateTimeFormat | undefined;
let timeFormat: Intl.DateTimeFormat | undefined;

/** "Tue May 5" in Toronto. */
function dayOf(instant: string): string {
  dayFormat ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return dayFormat.format(new Date(instant)).replace(',', '');
}

/** "6:30 PM" in Toronto; ICU's narrow no-break space before AM and PM becomes a plain space. */
function timeOf(instant: string): string {
  timeFormat ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  });
  return timeFormat.format(new Date(instant)).replace(/\s/g, ' ');
}

/** "Couch to 5K Run Club · Session 5 · Tue May 5, 6:30 PM" (mock `cancel-session/default`). */
export function cancelSessionSubtitleOf(series: string, number: number, startsAt: string): string {
  return `${series} · Session ${number} · ${dayOf(startsAt)}, ${timeOf(startsAt)}`;
}

/** The toast's title: "Tue May 5 cancelled" or "Tue May 12 restored" (mocks `date-cancelled`, `date-restored`). */
export function sessionChangeTitleOf(startsAt: string, change: 'cancelled' | 'restored'): string {
  return `${dayOf(startsAt)} ${change}`;
}

const RESTORE_FAILED = "We couldn't restore";

/** The failed restore's toast title: "We couldn't restore Tue May 12" (mock `admin-series/restore-failed`). */
export function restoreFailedTitleOf(startsAt: string): string {
  return `${RESTORE_FAILED} ${dayOf(startsAt)}`;
}

/** Whether a toast's title is a failed restore's, which the page shows as danger. */
export function isRestoreFailedTitle(title: string): boolean {
  return title.startsWith(`${RESTORE_FAILED} `);
}

/** The toast's text: how many members were told (ADR 0103). */
export function toldTextOf(told: number): string {
  if (told === 0) return 'Nobody held a place, so nobody was told.';
  return told === 1 ? '1 member was told.' : `${told} members were told.`;
}
