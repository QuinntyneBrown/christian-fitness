import { eventsViewOf, eventsViewOptions } from './series-filter';

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
