import {
  eventsViewOf,
  eventsViewOptions,
  seriesCategoryChips,
  seriesFiltered,
  seriesListHref,
  seriesQueryOf,
} from './series-filter';

/** A query-parameter reader over a plain object, as the router's `ParamMap` reads. */
const params = (values: Record<string, string>) => ({
  get: (name: string): string | null => values[name] ?? null,
});

// L2-050 AC7 (ADR 0093): only exactly `view=series` opens the Series view.
describe('eventsViewOf', () => {
  it.each([
    { why: 'no view', values: {} as Record<string, string>, expected: 'date' },
    { why: 'series', values: { view: 'series' }, expected: 'series' },
    { why: 'another view', values: { view: 'calendar' }, expected: 'date' },
    { why: 'upper case', values: { view: 'Series' }, expected: 'date' },
    { why: 'empty', values: { view: '' }, expected: 'date' },
  ])('$why -> $expected', ({ values, expected }) => {
    expect(eventsViewOf(params(values))).toBe(expected);
  });
});

// L2-009 AC11, L2-050 AC6 (ADR 0093).
describe('eventsViewOptions', () => {
  it('marks By date current and counts the series', () => {
    expect(eventsViewOptions('date', 3)).toEqual([
      { label: 'By date', href: '/events', current: true },
      { label: 'Series (3)', href: '/events?view=series', current: false, icon: 'repeat' },
    ]);
  });

  it('marks Series current, and counts none as (0)', () => {
    expect(eventsViewOptions('series', 0).map((o) => [o.label, o.current])).toEqual([
      ['By date', false],
      ['Series (0)', true],
    ]);
  });

  it('reads Series with no count until it answers or when it failed', () => {
    expect(eventsViewOptions('date', null)[1]?.label).toBe('Series');
  });
});

// L2-050 AC2, AC7, L2-075 (ADR 0093): the address holds the Series view's selection.
describe('seriesQueryOf', () => {
  it.each([
    {
      why: 'nothing',
      values: {} as Record<string, string>,
      expected: { category: null, q: '', joined: false },
    },
    {
      why: 'everything',
      values: { view: 'series', category: 'run', q: '  Couch ', joined: 'true' },
      expected: { category: 'run', q: 'Couch', joined: true },
    },
    {
      why: 'an unknown category',
      values: { category: 'yoga' },
      expected: { category: null, q: '', joined: false },
    },
    {
      why: 'blank search',
      values: { q: '   ' },
      expected: { category: null, q: '', joined: false },
    },
    {
      why: 'joined not exactly true',
      values: { joined: 'True' },
      expected: { category: null, q: '', joined: false },
    },
  ])('$why', ({ values, expected }) => {
    expect(seriesQueryOf(params(values))).toEqual(expected);
  });
});

describe('seriesListHref', () => {
  it.each([
    { query: { category: null, q: '', joined: false }, expected: '/events?view=series' },
    {
      query: { category: 'run' as const, q: 'hoops & devotion', joined: true },
      expected: '/events?view=series&category=run&q=hoops%20%26%20devotion&joined=true',
    },
    { query: { category: null, q: '', joined: true }, expected: '/events?view=series&joined=true' },
  ])('$expected', ({ query, expected }) => {
    expect(seriesListHref(query)).toBe(expected);
  });

  it('reads back as the same selection', () => {
    const query = { category: 'mobility' as const, q: '100% stretch', joined: true };
    const url = new URL(seriesListHref(query), 'http://localhost');
    expect(seriesQueryOf(url.searchParams)).toEqual(query);
  });
});

describe('seriesFiltered', () => {
  it.each([
    { query: { category: null, q: '', joined: false }, expected: false },
    { query: { category: 'run' as const, q: '', joined: false }, expected: true },
    { query: { category: null, q: 'x', joined: false }, expected: true },
    { query: { category: null, q: '', joined: true }, expected: true },
  ])('$query -> $expected', ({ query, expected }) => {
    expect(seriesFiltered(query)).toBe(expected);
  });
});

describe('seriesCategoryChips', () => {
  it('marks the current category and keeps the search and the tick in every address', () => {
    const chips = seriesCategoryChips({ category: 'workout', q: 'park', joined: true });

    expect(chips.map((chip) => chip.label)).toEqual([
      'All',
      'Run',
      'Workout',
      'Basketball',
      'Mobility',
      'Workshop',
      'Retreat',
    ]);
    expect(chips.filter((chip) => chip.current).map((chip) => chip.label)).toEqual(['Workout']);
    expect(chips[0]?.href).toBe('/events?view=series&q=park&joined=true');
    expect(chips[1]?.href).toBe('/events?view=series&category=run&q=park&joined=true');
  });
});
