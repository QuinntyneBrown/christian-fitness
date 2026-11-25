import {
  eventCategoryChips,
  eventGoingOf,
  eventListHref,
  eventListQueryOf,
  eventSearchOf,
} from './event-list-query';

/** A query-parameter reader over a plain object, as the router's `ParamMap` reads. */
const params = (values: Record<string, string>) => ({
  get: (name: string): string | null => values[name] ?? null,
});

// L2-075 AC2, AC3 (ADR 0081): the same rows as EventSearchTests.cs. The app sends the trimmed
// text and leaves blank text out; the API compares it in lower case.
describe('eventSearchOf', () => {
  it.each([
    { why: 'no parameter', raw: null, expected: '' },
    { why: 'empty', raw: '', expected: '' },
    { why: 'spaces', raw: '   ', expected: '' },
    { why: 'tab and newline', raw: '\t \n', expected: '' },
    { why: 'a word', raw: 'yoga', expected: 'yoga' },
    { why: 'padded, mixed case', raw: '  Sunrise 5K ', expected: 'Sunrise 5K' },
    { why: 'an ampersand', raw: 'HOOPS & Devotion', expected: 'HOOPS & Devotion' },
    { why: 'a percent sign', raw: '100%', expected: '100%' },
  ])('$why -> "$expected"', ({ raw, expected }) => {
    expect(eventSearchOf(raw)).toBe(expected);
  });
});

// L2-076 AC1, AC3 (ADR 0081): the same rows as ListEventsGoingTests.cs. Only exactly `true` is on.
describe('eventGoingOf', () => {
  it.each([
    { raw: null, expected: false },
    { raw: '', expected: false },
    { raw: 'true', expected: true },
    { raw: 'True', expected: false },
    { raw: '1', expected: false },
    { raw: 'false', expected: false },
    { raw: ' true ', expected: false },
  ])('$raw -> $expected', ({ raw, expected }) => {
    expect(eventGoingOf(raw)).toBe(expected);
  });
});

describe('eventListQueryOf', () => {
  it('reads the category, the trimmed search and the going filter from the address', () => {
    expect(eventListQueryOf(params({ category: 'run', q: ' sunrise ', going: 'true' }))).toEqual({
      category: 'run',
      q: 'sunrise',
      going: true,
    });
  });

  it('reads nothing as All with no search and every event, and an unknown category as All', () => {
    expect(eventListQueryOf(params({}))).toEqual({ category: null, q: '', going: false });
    expect(eventListQueryOf(params({ category: 'yoga', q: '  ', going: 'yes' }))).toEqual({
      category: null,
      q: '',
      going: false,
    });
  });
});

describe('eventListHref', () => {
  it.each([
    {
      why: 'nothing chosen',
      query: { category: null, q: '', going: false },
      expected: '/events',
    },
    {
      why: 'a category',
      query: { category: 'run', q: '', going: false },
      expected: '/events?category=run',
    },
    {
      why: 'a search',
      query: { category: null, q: 'sunrise', going: false },
      expected: '/events?q=sunrise',
    },
    {
      why: 'only mine',
      query: { category: null, q: '', going: true },
      expected: '/events?going=true',
    },
    {
      why: 'all three, the search encoded',
      query: { category: 'basketball', q: 'Hoops & Devotion', going: true },
      expected: '/events?category=basketball&q=Hoops%20%26%20Devotion&going=true',
    },
  ] as const)('$why -> $expected', ({ query, expected }) => {
    expect(eventListHref(query)).toBe(expected);
  });
});

describe('eventCategoryChips', () => {
  it('lists All and the six categories with their addresses, marking All current when none is selected', () => {
    expect(eventCategoryChips({ category: null, q: '', going: false })).toEqual([
      { label: 'All', href: '/events', current: true },
      { label: 'Run', href: '/events?category=run', current: false },
      { label: 'Workout', href: '/events?category=workout', current: false },
      { label: 'Basketball', href: '/events?category=basketball', current: false },
      { label: 'Mobility', href: '/events?category=mobility', current: false },
      { label: 'Workshop', href: '/events?category=workshop', current: false },
      { label: 'Retreat', href: '/events?category=retreat', current: false },
    ]);
  });

  it('marks only the chosen category current', () => {
    expect(
      eventCategoryChips({ category: 'workshop', q: '', going: false })
        .filter((chip) => chip.current)
        .map((chip) => chip.label),
    ).toEqual(['Workshop']);
  });

  it('keeps the search and the going filter in every address (ADR 0081)', () => {
    expect(
      eventCategoryChips({ category: 'run', q: 'sunrise', going: true }).map((chip) => chip.href),
    ).toEqual([
      '/events?q=sunrise&going=true',
      '/events?category=run&q=sunrise&going=true',
      '/events?category=workout&q=sunrise&going=true',
      '/events?category=basketball&q=sunrise&going=true',
      '/events?category=mobility&q=sunrise&going=true',
      '/events?category=workshop&q=sunrise&going=true',
      '/events?category=retreat&q=sunrise&going=true',
    ]);
  });
});
