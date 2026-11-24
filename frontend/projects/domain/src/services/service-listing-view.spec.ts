import type { ServiceListingDto } from '@cf/api';
import { selectedListing, serviceRowViewOf, verifiedText } from './service-listing-view';

function listing(id: string): ServiceListingDto {
  return {
    id,
    name: `Name ${id}`,
    role: 'Registered dietitian',
    category: 'Nutrition',
    where: 'Virtual · Ontario-wide',
    price: '$95 first consult',
    credentials: 'RD',
    about: 'About',
    publishedAt: '2026-03-12T15:00:00Z',
  };
}

describe('serviceRowViewOf', () => {
  it('words the line from the role and where, and links to the listing in the same category', () => {
    expect(serviceRowViewOf(listing('a'), 'Nutrition')).toEqual({
      id: 'a',
      href: '/services?category=Nutrition&selected=a',
      name: 'Name a',
      text: 'Registered dietitian · Virtual · Ontario-wide',
      price: '$95 first consult',
    });
    expect(serviceRowViewOf(listing('a'), null).href).toBe('/services?selected=a');
  });
});

describe('selectedListing', () => {
  const list = [listing('a'), listing('b'), listing('c')];

  it.each([
    { why: 'the one named', selected: 'b', expected: 'b' },
    { why: 'none named', selected: null, expected: 'a' },
    { why: 'one not in the list', selected: 'zzz', expected: 'a' },
  ])('$why -> $expected', ({ selected, expected }) => {
    expect(selectedListing(list, selected)?.id).toBe(expected);
  });

  it('is none for an empty list', () => {
    expect(selectedListing([], 'a')).toBeNull();
  });
});

describe('verifiedText', () => {
  it.each([
    { why: 'mid month', at: '2026-03-12T15:00:00Z', expected: 'March 2026' },
    // Midnight in Toronto is 04:00 UTC in April (daylight time).
    { why: 'start of month in Toronto', at: '2026-04-01T04:30:00Z', expected: 'April 2026' },
    { why: 'still last month in Toronto', at: '2026-04-01T03:30:00Z', expected: 'March 2026' },
    { why: 'new year in winter time', at: '2027-01-01T04:59:00Z', expected: 'December 2026' },
  ])('$why ($at) -> $expected', ({ at, expected }) => {
    expect(verifiedText(at)).toBe(`Verified by Christian Fitness, ${expected}`);
  });

  it('is empty for a value that is not an instant', () => {
    expect(verifiedText('soon')).toBe('');
  });
});
