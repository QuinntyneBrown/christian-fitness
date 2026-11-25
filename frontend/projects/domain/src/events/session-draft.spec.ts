import type { AdminSeriesDto, ApiError } from '@cf/api';
import {
  addSessionSubtitleOf,
  sessionAddedTitleOf,
  sessionDraftOf,
  sessionDraftProblemsOf,
  type SessionEditorValues,
  sessionEditorValuesOf,
  sessionErrorHeading,
  sessionErrorItems,
  sessionFieldErrorsOf,
  torontoInstantOf,
} from './session-draft';

/** The mocks' today: Wednesday April 15, 2026, 8:45 AM in Toronto. */
const NOW = new Date('2026-04-15T12:45:00Z');

const JUNE_2: SessionEditorValues = {
  date: '2026-06-02',
  startTime: '18:30',
  endTime: '19:30',
  topic: 'Make-up run for Victoria Day week',
};

function series(sessions: { startsAt: string; endsAt: string | null }[]): AdminSeriesDto {
  return {
    title: 'Couch to 5K Run Club',
    sessions: sessions.map((s, i) => ({
      id: `s${i}`,
      number: i + 1,
      topic: null,
      state: 'upcoming',
      ...s,
    })),
  } as unknown as AdminSeriesDto;
}

describe('torontoInstantOf', () => {
  it.each([
    { why: 'daylight time', date: '2026-06-02', time: '18:30', iso: '2026-06-02T22:30:00.000Z' },
    { why: 'standard time', date: '2026-01-15', time: '19:00', iso: '2026-01-16T00:00:00.000Z' },
    {
      why: 'the morning after spring forward',
      date: '2026-03-08',
      time: '08:00',
      iso: '2026-03-08T12:00:00.000Z',
    },
    {
      why: 'the morning after fall back',
      date: '2026-11-01',
      time: '08:00',
      iso: '2026-11-01T13:00:00.000Z',
    },
  ])('$why', ({ date, time, iso }) => {
    expect(torontoInstantOf(date, time)?.toISOString()).toBe(iso);
  });

  it.each([
    { date: '', time: '18:30' },
    { date: '2026-13-01', time: '18:30' },
    { date: '2026-02-30', time: '18:30' },
    { date: '2026-06-02', time: '' },
  ])('"$date" at "$time" is none', ({ date, time }) => {
    expect(torontoInstantOf(date, time)).toBeNull();
  });
});

// L2-071 AC14 (mock add-session/default): the week after the last date, at its times.
describe('sessionEditorValuesOf', () => {
  it('opens on the week after the last date at its start and end', () => {
    const couch = series([
      { startsAt: '2026-05-19T22:30:00Z', endsAt: '2026-05-19T23:30:00Z' },
      { startsAt: '2026-05-26T22:30:00Z', endsAt: '2026-05-26T23:30:00Z' },
    ]);
    expect(sessionEditorValuesOf(couch)).toEqual({
      date: '2026-06-02',
      startTime: '18:30',
      endTime: '19:30',
      topic: '',
    });
  });

  it('keeps the Toronto time across a clock change', () => {
    const fall = series([{ startsAt: '2026-10-27T22:30:00Z', endsAt: null }]);
    expect(sessionEditorValuesOf(fall)).toEqual({
      date: '2026-11-03',
      startTime: '17:30',
      endTime: '',
      topic: '',
    });
  });

  it('opens blank for a series with no dates, as session 1', () => {
    const none = series([]);
    expect(sessionEditorValuesOf(none)).toEqual({
      date: '',
      startTime: '',
      endTime: '',
      topic: '',
    });
    expect(addSessionSubtitleOf(none)).toBe('Couch to 5K Run Club · becomes session 1');
  });
});

// L2-071 AC14 (mock add-session/invalid).
describe('sessionDraftProblemsOf', () => {
  it.each<{ why: string; values: Partial<SessionEditorValues>; problems: Record<string, string> }>([
    { why: 'June 2, 6:30 to 7:30 PM', values: {}, problems: {} },
    {
      why: 'a past date and an end before the start',
      values: { date: '2026-04-10', endTime: '18:00' },
      problems: {
        date: 'Pick a date and start time after now',
        endTime: 'End the session after it starts, at 6:30 PM',
      },
    },
    {
      why: 'earlier today',
      values: { date: '2026-04-15', startTime: '08:44', endTime: '09:00' },
      problems: { date: 'Pick a date and start time after now' },
    },
    {
      why: 'later today',
      values: { date: '2026-04-15', startTime: '08:46', endTime: '09:00' },
      problems: {},
    },
    {
      why: 'an end at the start, in the morning',
      values: { startTime: '07:05', endTime: '07:05' },
      problems: { endTime: 'End the session after it starts, at 7:05 AM' },
    },
    {
      why: 'a start at noon',
      values: { startTime: '12:00', endTime: '11:00' },
      problems: { endTime: 'End the session after it starts, at 12:00 PM' },
    },
    {
      why: 'nothing typed',
      values: { date: '', startTime: '', endTime: '', topic: '' },
      problems: {
        date: 'Pick a date',
        startTime: 'Pick a start time',
        endTime: 'Pick an end time',
      },
    },
    { why: 'a topic of 200', values: { topic: 't'.repeat(200) }, problems: {} },
    {
      why: 'a topic of 201',
      values: { topic: 't'.repeat(201) },
      problems: { topic: 'Use 200 characters or fewer' },
    },
  ])('$why', ({ values, problems }) => {
    expect(sessionDraftProblemsOf({ ...JUNE_2, ...values }, NOW)).toEqual(problems);
  });
});

describe('sessionDraftOf', () => {
  it('sends the fields as typed and a blank topic as none', () => {
    expect(sessionDraftOf(JUNE_2)).toEqual({ ...JUNE_2 });
    expect(sessionDraftOf({ ...JUNE_2, topic: '  ' }).topic).toBeNull();
  });
});

describe('sessionFieldErrorsOf', () => {
  it.each([
    {
      field: 'date',
      code: 'start_in_past',
      key: 'date',
      text: 'Pick a date and start time after now',
    },
    { field: 'date', code: 'date_required', key: 'date', text: 'Pick a date' },
    {
      field: 'startTime',
      code: 'start_time_required',
      key: 'startTime',
      text: 'Pick a start time',
    },
    { field: 'endTime', code: 'end_time_required', key: 'endTime', text: 'Pick an end time' },
    {
      field: 'endTime',
      code: 'end_not_after_start',
      key: 'endTime',
      text: 'End the session after it starts, at 6:30 PM',
    },
    { field: 'topic', code: 'topic_too_long', key: 'topic', text: 'Use 200 characters or fewer' },
    { field: 'topic', code: 'something_new', key: 'topic', text: 'Check this field' },
  ])('$code on $field', ({ field, code, key, text }) => {
    const error: ApiError = {
      status: 400,
      code: 'validation_failed',
      fieldCodes: { [field]: code },
    };
    expect(sessionFieldErrorsOf(error, JUNE_2)).toEqual({ [key]: text });
  });

  it('is none for a failure that is not a field', () => {
    expect(sessionFieldErrorsOf({ status: 500, code: 'internal_error' }, JUNE_2)).toBeNull();
    expect(sessionFieldErrorsOf({ status: 404, code: 'not_found' }, JUNE_2)).toBeNull();
  });
});

describe('the summary and the toast', () => {
  it('lists the fields in form order, linked to their inputs', () => {
    expect(sessionErrorItems({ endTime: 'b', date: 'a' })).toEqual([
      { text: 'a', target: 'f-date' },
      { text: 'b', target: 'f-end' },
    ]);
  });

  it.each([
    { count: 1, text: '1 thing to fix before adding' },
    { count: 2, text: '2 things to fix before adding' },
  ])('$count: $text', ({ count, text }) => {
    expect(sessionErrorHeading(count)).toBe(text);
  });

  it('names the date added by its Toronto day', () => {
    expect(sessionAddedTitleOf('2026-06-02')).toBe('Tue Jun 2 added');
  });
});
