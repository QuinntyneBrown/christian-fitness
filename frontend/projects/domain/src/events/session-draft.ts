import type { AddSessionDto, AdminSeriesDto, ApiError } from '@cf/api';
import { COMMUNITY_TIME_ZONE } from './going-date';

/** What Add a date shows: the Toronto date (`yyyy-MM-dd`), start and end (`HH:mm`) and a topic. */
export interface SessionEditorValues {
  date: string;
  startTime: string;
  endTime: string;
  topic: string;
}

export type SessionFieldKey = keyof SessionEditorValues;
export type SessionFieldErrors = Partial<Record<SessionFieldKey, string>>;

/** The id of each field's input, which an error summary links to (mock `add-session/invalid`). */
export const SESSION_FIELD_IDS: Record<SessionFieldKey, string> = {
  date: 'f-date',
  startTime: 'f-start',
  endTime: 'f-end',
  topic: 'f-topic',
};

const FIELD_ORDER: readonly SessionFieldKey[] = ['date', 'startTime', 'endTime', 'topic'];

/** The longest topic, as the API holds it. */
export const SESSION_TOPIC_MAX = 200;

const DAY_MS = 86_400_000;

const PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: COMMUNITY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const ADDED_DAY = new Intl.DateTimeFormat('en-US', {
  timeZone: COMMUNITY_TIME_ZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

/** The Toronto wall clock of `instant`: its date (`yyyy-MM-dd`) and time (`HH:mm`). */
function torontoClockOf(instant: Date): { date: string; time: string } {
  const parts = Object.fromEntries(PARTS.formatToParts(instant).map((p) => [p.type, p.value]));
  return {
    date: `${parts['year']}-${parts['month']}-${parts['day']}`,
    time: `${parts['hour']}:${parts['minute']}`,
  };
}

/** The minutes Toronto is ahead of UTC at `instant` (negative: behind). */
function torontoOffsetMinutes(instant: number): number {
  const { date, time } = torontoClockOf(new Date(instant));
  return (Date.parse(`${date}T${time}:00Z`) - Math.floor(instant / 60_000) * 60_000) / 60_000;
}

/**
 * The instant of `time` on `date` in Toronto, or `null` when either is missing or not a date or
 * time. Read as the API reads it (ADR 0021).
 */
export function torontoInstantOf(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const wall = Date.parse(`${date}T${time}:00Z`);
  if (Number.isNaN(wall) || new Date(wall).toISOString().slice(0, 10) !== date) return null;
  // Twice, so a guess on the far side of a clock change settles on the offset at the result.
  let instant = wall - torontoOffsetMinutes(wall) * 60_000;
  instant = wall - torontoOffsetMinutes(instant) * 60_000;
  return new Date(instant);
}

/**
 * What Add a date opens with (L2-071 AC14; mock `add-session/default`): the week after the series'
 * last date at its start and end, or nothing for a series with no dates.
 */
export function sessionEditorValuesOf(series: AdminSeriesDto): SessionEditorValues {
  const last = series.sessions.at(-1);
  if (!last) return { date: '', startTime: '', endTime: '', topic: '' };
  const start = torontoClockOf(new Date(Date.parse(last.startsAt) + 7 * DAY_MS));
  const end = last.endsAt ? torontoClockOf(new Date(Date.parse(last.endsAt) + 7 * DAY_MS)) : null;
  return { date: start.date, startTime: start.time, endTime: end?.time ?? '', topic: '' };
}

/** "Couch to 5K Run Club · becomes session 9": the number the new date takes. */
export function addSessionSubtitleOf(series: AdminSeriesDto): string {
  return `${series.title} · becomes session ${series.sessions.length + 1}`;
}

/** "6:30 PM" for "18:30". */
function clockText(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const h = (hours ?? 0) % 12 === 0 ? 12 : (hours ?? 0) % 12;
  return `${h}:${String(minutes ?? 0).padStart(2, '0')} ${(hours ?? 0) < 12 ? 'AM' : 'PM'}`;
}

const START_IN_PAST = 'Pick a date and start time after now';

/**
 * What must change before Add date sends (L2-071 AC14; mock `add-session/invalid`): a missing
 * date, start or end, a start not after `now` (named on the date), an end not after the start
 * (named on the end, with the start's time) and a topic over 200 characters.
 */
export function sessionDraftProblemsOf(values: SessionEditorValues, now: Date): SessionFieldErrors {
  const problems: SessionFieldErrors = {};
  const validDate = torontoInstantOf(values.date, '12:00') !== null;
  const start = torontoInstantOf(values.date, values.startTime);
  if (!validDate) problems.date = 'Pick a date';
  else if (start && start.getTime() <= now.getTime()) problems.date = START_IN_PAST;
  if (!/^\d{2}:\d{2}$/.test(values.startTime)) problems.startTime = 'Pick a start time';
  if (!/^\d{2}:\d{2}$/.test(values.endTime)) problems.endTime = 'Pick an end time';
  else if (/^\d{2}:\d{2}$/.test(values.startTime) && values.endTime <= values.startTime) {
    problems.endTime = `End the session after it starts, at ${clockText(values.startTime)}`;
  }
  if (values.topic.trim().length > SESSION_TOPIC_MAX) {
    problems.topic = 'Use 200 characters or fewer';
  }
  return problems;
}

/** What Add date sends: the fields as typed, a blank topic as none. */
export function sessionDraftOf(values: SessionEditorValues): AddSessionDto {
  const topic = values.topic.trim();
  return {
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime,
    topic: topic === '' ? null : topic,
  };
}

const UNKNOWN_CODE = 'Check this field';

/**
 * The messages for the fields the API refused, or `null` when the failure is not a field's. The
 * server's own sentences are never shown; `values` gives the start an end must follow.
 */
export function sessionFieldErrorsOf(
  error: ApiError,
  values: SessionEditorValues,
): SessionFieldErrors | null {
  if (error.status !== 400 || !error.fieldCodes) return null;
  const messages: Record<string, string> = {
    date_required: 'Pick a date',
    start_in_past: START_IN_PAST,
    start_time_required: 'Pick a start time',
    end_time_required: 'Pick an end time',
    end_not_after_start: values.startTime
      ? `End the session after it starts, at ${clockText(values.startTime)}`
      : 'End the session after it starts',
    topic_too_long: 'Use 200 characters or fewer',
  };
  const errors: SessionFieldErrors = {};
  for (const [key, code] of Object.entries(error.fieldCodes)) {
    if ((FIELD_ORDER as readonly string[]).includes(key)) {
      errors[key as SessionFieldKey] = messages[code] ?? UNKNOWN_CODE;
    }
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/** The fields to fix as the error summary's lines, in the form's order. */
export function sessionErrorItems(
  errors: SessionFieldErrors,
): readonly { text: string; target: string }[] {
  return FIELD_ORDER.flatMap((field) => {
    const text = errors[field];
    return text ? [{ text, target: SESSION_FIELD_IDS[field] }] : [];
  });
}

/** "2 things to fix before adding" (mock `add-session/invalid`). */
export function sessionErrorHeading(count: number): string {
  return `${count} ${count === 1 ? 'thing' : 'things'} to fix before adding`;
}

/** The toast's title for an added date: "Tue Jun 2 added" (mock `admin-series/date-added`). */
export function sessionAddedTitleOf(date: string): string {
  const noon = torontoInstantOf(date, '12:00');
  return `${noon ? ADDED_DAY.format(noon).replace(',', '') : date} added`;
}
