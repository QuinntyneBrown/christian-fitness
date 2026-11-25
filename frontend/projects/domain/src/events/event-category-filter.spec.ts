import { eventCategoryOf, noCategoryEventsText } from './event-category-filter';

// L2-009 AC2, AC9, AC10 (ADR 0030): the same 11 rows as ListEventsValidatorTests.cs.
// What the API accepts as a category, the URL reader keeps; anything else shows All (`null`),
// so a crafted URL never asks the API a question it refuses.
describe('eventCategoryOf', () => {
  it.each([
    { why: 'no parameter', raw: null, expected: null },
    { why: 'run', raw: 'run', expected: 'run' },
    { why: 'workout', raw: 'workout', expected: 'workout' },
    { why: 'basketball', raw: 'basketball', expected: 'basketball' },
    { why: 'mobility', raw: 'mobility', expected: 'mobility' },
    { why: 'workshop', raw: 'workshop', expected: 'workshop' },
    { why: 'retreat', raw: 'retreat', expected: 'retreat' },
    { why: 'blank', raw: '', expected: null },
    { why: 'uppercase', raw: 'RUN', expected: null },
    { why: 'padded with spaces', raw: ' run ', expected: null },
    { why: 'unknown category', raw: 'yoga', expected: null },
  ])('$why ($raw) -> $expected', ({ raw, expected }) => {
    expect(eventCategoryOf(raw)).toBe(expected);
  });
});

// L2-009 AC3 (mock `events/no-results`): names the category that had no events.
describe('noCategoryEventsText', () => {
  it.each([
    {
      category: 'workshop',
      expected: 'No workshop events right now. New ones are posted every week.',
    },
    {
      category: 'retreat',
      expected: 'No retreat events right now. New ones are posted every week.',
    },
  ] as const)('words the empty state for $category', ({ category, expected }) => {
    expect(noCategoryEventsText(category)).toBe(expected);
  });
});
