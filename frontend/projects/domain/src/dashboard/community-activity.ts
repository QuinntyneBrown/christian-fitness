import type { ActivityWeekDto } from '@cf/api';

/** One row of the activity table: the week as words and its three counts, already formatted. */
export interface ActivityRow {
  /** The week's start, which names the row. */
  id: string;
  week: string;
  newMembers: string;
  registrations: string;
  messages: string;
}

const dayFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
});
const countFormat = new Intl.NumberFormat('en-US');

/**
 * The weeks as table rows, newest first, so the current week leads (ADR 0000). A week is named by
 * the Monday that opens it, read in UTC where the API cut it ("Apr 13"); the current week, the
 * last the API answers, says so in words. Counts carry their thousands separator.
 */
export function activityRowsOf(weeks: readonly ActivityWeekDto[]): ActivityRow[] {
  return weeks
    .map((week, i) => {
      const start = new Date(week.start);
      const day = Number.isNaN(start.getTime()) ? '' : dayFormat.format(start);
      return {
        id: week.start,
        week: i === weeks.length - 1 ? `${day} (this week)` : day,
        newMembers: countFormat.format(week.newMembers),
        registrations: countFormat.format(week.registrations),
        messages: countFormat.format(week.messages),
      };
    })
    .reverse();
}

/** Whether any week has a join, a registration or a message; none shows the empty state. */
export function hasActivity(weeks: readonly ActivityWeekDto[]): boolean {
  return weeks.some((w) => w.newMembers + w.registrations + w.messages > 0);
}
