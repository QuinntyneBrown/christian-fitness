import { adminEventTabOf, adminEventTabs, eventCategoryLabel } from './admin-event-tabs';

// L2-022 AC5 (ADR 0020): the tab a URL's `status` names; anything else is All.
describe('adminEventTabOf', () => {
  it.each([
    { why: 'no status', status: null, expected: 'all' },
    { why: 'published', status: 'published', expected: 'published' },
    { why: 'draft', status: 'draft', expected: 'draft' },
    { why: 'all, written out', status: 'all', expected: 'all' },
    { why: 'a status the list has no tab for', status: 'cancelled', expected: 'all' },
    { why: 'another case', status: 'Draft', expected: 'all' },
  ])('$why ($status) is $expected', ({ status, expected }) => {
    expect(adminEventTabOf(status)).toBe(expected);
  });
});

describe('adminEventTabs', () => {
  it('lists All, Published and Draft with their links, counts and the current one', () => {
    expect(adminEventTabs('draft', { all: 5, published: 4, draft: 1 })).toEqual([
      { label: 'All', href: '/events', count: 5, current: false },
      { label: 'Published', href: '/events?status=published', count: 4, current: false },
      { label: 'Draft', href: '/events?status=draft', count: 1, current: true },
    ]);
  });

  it('leaves the counts out while they are not known', () => {
    expect(adminEventTabs('all', null).map((tab) => tab.count)).toEqual([null, null, null]);
  });
});

// The table and the editor show each category by its label (mock event-editor).
describe('eventCategoryLabel', () => {
  it.each([
    { category: 'run', expected: 'Run' },
    { category: 'workout', expected: 'Workout' },
    { category: 'basketball', expected: 'Basketball' },
    { category: 'mobility', expected: 'Mobility' },
    { category: 'workshop', expected: 'Workshop' },
    { category: 'retreat', expected: 'Retreat' },
  ] as const)('$category is "$expected"', ({ category, expected }) => {
    expect(eventCategoryLabel(category)).toBe(expected);
  });
});
