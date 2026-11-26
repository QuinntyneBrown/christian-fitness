import type { SeriesDetailDto } from '@cf/api';
import {
  dropInBookedOf,
  dropInFullTextOf,
  dropInPickOf,
  dropInRefusalOf,
  stopDatesWordsOf,
} from './drop-in-pick';

/** Saturday Park Bootcamp's eight Saturdays at 8:00 AM from April 4: three done, April 25 next. */
const SATURDAYS: SeriesDetailDto['sessions'] = ['04', '11', '18', '25', '02', '09', '16', '23'].map(
  (day, n) => ({
    id: `s${n + 1}`,
    number: n + 1,
    startsAt: `2026-0${n < 4 ? 4 : 5}-${day}T12:00:00Z`,
    endsAt: null,
    topic: null,
    state: n < 3 ? 'done' : n === 3 ? 'live' : n === 6 ? 'cancelled' : 'upcoming',
    held: false,
    full: false,
    attended: null,
  }),
);
const holding = (...numbers: number[]): SeriesDetailDto['sessions'] =>
  SATURDAYS.map((session) => ({ ...session, held: numbers.includes(session.number) }));

// L2-053 AC1, AC3 and AC4 (ADR 0102): the drop-in option's note and the panel's button while
// dates are picked, registered or changed, one case per row.
describe('dropInPickOf', () => {
  it.each([
    {
      why: 'nothing ticked: the button waits for a date',
      state: { picked: 0 },
      note: 'Tick dates in the list',
      button: { label: 'Pick a date first', disabled: true, busy: false },
    },
    {
      why: 'one date ticked',
      state: { picked: 1 },
      note: '1 picked below',
      button: { label: 'Register for 1 date', disabled: false, busy: false },
    },
    {
      why: 'two dates ticked, as the mock drop-in draws them',
      state: { picked: 2 },
      note: '2 picked below',
      button: { label: 'Register for 2 dates', disabled: false, busy: false },
    },
    {
      why: 'registering: busy and disabled',
      state: { picked: 2, busy: true },
      note: '2 picked below',
      button: { label: 'Registering…', disabled: true, busy: true },
    },
    {
      why: 'changing dates, nothing changed yet',
      state: { picked: 2, changing: true, changed: false },
      note: '2 picked below',
      button: { label: 'Save dates', disabled: true, busy: false },
    },
    {
      why: 'changing dates, one unticked',
      state: { picked: 1, changing: true, changed: true },
      note: '1 picked below',
      button: { label: 'Save dates', disabled: false, busy: false },
    },
    {
      why: 'changing dates, every date unticked can still be saved',
      state: { picked: 0, changing: true, changed: true },
      note: 'Tick dates in the list',
      button: { label: 'Save dates', disabled: false, busy: false },
    },
    {
      why: 'saving the change',
      state: { picked: 1, changing: true, changed: true, busy: true },
      note: '1 picked below',
      button: { label: 'Saving…', disabled: true, busy: true },
    },
  ])('$why', ({ state, note, button }) => {
    expect(dropInPickOf(state)).toEqual({ note, button });
  });
});

// L2-053 AC3 (ADR 0102): the booked panel, one case per row.
describe('dropInBookedOf', () => {
  it.each([
    {
      why: 'two dates of a $10 drop-in, as the mock booked draws them',
      series: { joined: false, dropInPriceCents: 1000, sessions: holding(4, 6) },
      view: {
        confirmed: 'Registered for 2 dates',
        note: 'Sessions 4, 6. You can add more dates any time. Pay $10 to the host at each session; online payment is not available yet.',
      },
    },
    {
      why: 'one free date: "Session", and nothing about paying',
      series: { joined: false, dropInPriceCents: 0, sessions: holding(5) },
      view: {
        confirmed: 'Registered for 1 date',
        note: 'Session 5. You can add more dates any time.',
      },
    },
    {
      why: 'a past date held is not counted',
      series: { joined: false, dropInPriceCents: 0, sessions: holding(2, 8) },
      view: {
        confirmed: 'Registered for 1 date',
        note: 'Session 8. You can add more dates any time.',
      },
    },
    {
      why: 'a cancelled date held is not counted',
      series: { joined: false, dropInPriceCents: 0, sessions: holding(7) },
      view: null,
    },
    {
      why: 'no date held: no booked panel',
      series: { joined: false, dropInPriceCents: 1000, sessions: holding() },
      view: null,
    },
    {
      why: 'a joined member has the joined panel instead',
      series: { joined: true, dropInPriceCents: 1000, sessions: holding(4, 5, 6, 8) },
      view: null,
    },
  ])('$why', ({ series, view }) => {
    expect(dropInBookedOf(series)).toEqual(view);
  });
});

// L2-053 AC2 (ADR 0102): a refusal naming full dates, by their numbers; anything else is generic.
describe('dropInRefusalOf', () => {
  it.each([
    {
      why: 'event_full with numbers',
      error: { status: 409, code: 'event_full', sessions: [6] },
      kind: { kind: 'full', sessions: [6] },
    },
    {
      why: 'event_full without numbers',
      error: { status: 409, code: 'event_full' },
      kind: { kind: 'failed' },
    },
    {
      why: 'event_full naming no date',
      error: { status: 409, code: 'event_full', sessions: [] },
      kind: { kind: 'failed' },
    },
    {
      why: 'event_full with words, not numbers',
      error: { status: 409, code: 'event_full', sessions: ['6'] },
      kind: { kind: 'failed' },
    },
    {
      why: 'account_suspended',
      error: { status: 403, code: 'account_suspended' },
      kind: { kind: 'failed' },
    },
    { why: 'no answer', error: { status: 0, code: 'network' }, kind: { kind: 'failed' } },
    { why: 'not an ApiError', error: new Error('boom'), kind: { kind: 'failed' } },
  ])('$why', ({ error, kind }) => {
    expect(dropInRefusalOf(error)).toEqual(kind);
  });
});

// ADR 0102: the full dates named by their Toronto dates.
describe('dropInFullTextOf', () => {
  it.each([
    { numbers: [6], text: 'Sat May 9 is full. Untick it and try again.' },
    { numbers: [5, 8], text: 'Sat May 2 and Sat May 23 are full. Untick them and try again.' },
    {
      numbers: [8, 4, 5],
      text: 'Sat Apr 25, Sat May 2 and Sat May 23 are full. Untick them and try again.',
    },
  ])('$numbers', ({ numbers, text }) => {
    expect(dropInFullTextOf(SATURDAYS, numbers)).toBe(text);
  });
});

// L2-053 AC4 (ADR 0102): the dialog names how many held dates are unticked, and which.
describe('stopDatesWordsOf', () => {
  it.each([
    {
      numbers: [6],
      words: { heading: 'Stop going to 1 date?', subtitle: 'Saturday Park Bootcamp · Sat May 9' },
    },
    {
      numbers: [6, 4],
      words: {
        heading: 'Stop going to 2 dates?',
        subtitle: 'Saturday Park Bootcamp · Sat Apr 25 and Sat May 9',
      },
    },
  ])('$numbers', ({ numbers, words }) => {
    expect(
      stopDatesWordsOf({ title: 'Saturday Park Bootcamp', sessions: SATURDAYS }, numbers),
    ).toEqual(words);
  });
});
