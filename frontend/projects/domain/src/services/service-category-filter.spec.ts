import {
  noCategoryServicesText,
  serviceCategoryChips,
  serviceCategoryOf,
  servicesHref,
} from './service-category-filter';

// L2-013 AC2 (ADR 0050): the same 11 rows as ListServicesValidatorTests.cs. What the API accepts as
// a category, the URL reader keeps; anything else shows All (`null`), so a crafted URL never asks
// the API a question it refuses.
describe('serviceCategoryOf', () => {
  it.each([
    { why: 'no parameter', raw: null, expected: null },
    { why: 'Training', raw: 'Training', expected: 'Training' },
    { why: 'Nutrition', raw: 'Nutrition', expected: 'Nutrition' },
    { why: 'Physio', raw: 'Physio', expected: 'Physio' },
    { why: 'Coaching', raw: 'Coaching', expected: 'Coaching' },
    { why: 'Counselling', raw: 'Counselling', expected: 'Counselling' },
    { why: 'blank', raw: '', expected: null },
    { why: 'lowercase', raw: 'training', expected: null },
    { why: 'padded with spaces', raw: ' Training ', expected: null },
    { why: 'a number', raw: '1', expected: null },
    { why: 'unknown category', raw: 'Yoga', expected: null },
  ])('$why ($raw) -> $expected', ({ raw, expected }) => {
    expect(serviceCategoryOf(raw)).toBe(expected);
  });
});

describe('servicesHref', () => {
  it.each([
    { category: null, selected: null, expected: '/services' },
    { category: 'Physio' as const, selected: null, expected: '/services?category=Physio' },
    { category: null, selected: 'abc', expected: '/services?selected=abc' },
    {
      category: 'Training' as const,
      selected: 'abc',
      expected: '/services?category=Training&selected=abc',
    },
  ])('$category and $selected -> $expected', ({ category, selected, expected }) => {
    expect(servicesHref(category, selected)).toBe(expected);
  });
});

describe('serviceCategoryChips', () => {
  it('lists All and the five categories with their addresses, marking All current when none is selected', () => {
    expect(serviceCategoryChips(null)).toEqual([
      { label: 'All', href: '/services', current: true },
      { label: 'Training', href: '/services?category=Training', current: false },
      { label: 'Nutrition', href: '/services?category=Nutrition', current: false },
      { label: 'Physio', href: '/services?category=Physio', current: false },
      { label: 'Coaching', href: '/services?category=Coaching', current: false },
      { label: 'Counselling', href: '/services?category=Counselling', current: false },
    ]);
  });

  it('marks only the chosen category current', () => {
    expect(
      serviceCategoryChips('Coaching')
        .filter((chip) => chip.current)
        .map((chip) => chip.label),
    ).toEqual(['Coaching']);
  });
});

describe('noCategoryServicesText', () => {
  it('names the category', () => {
    expect(noCategoryServicesText('Physio')).toBe(
      'No Physio professionals right now. New ones are listed as the team approves them.',
    );
  });
});
