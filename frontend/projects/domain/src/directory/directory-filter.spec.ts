import { listingKindOf } from './listing-kinds';
import {
  directoryHref,
  directoryKindChips,
  directorySearchTerm,
  noDirectoryMatchText,
} from './directory-filter';

// L2-054 AC4 (ADR 0077): what the member typed, as the search the directory sends.
describe('directorySearchTerm', () => {
  it.each([
    { why: 'nothing', text: null, expected: null },
    { why: 'blank', text: '   ', expected: null },
    { why: 'one character', text: 'a', expected: null },
    { why: 'one character padded', text: '  a  ', expected: null },
    { why: 'two characters', text: 'ab', expected: 'ab' },
    { why: 'two characters padded', text: ' ab ', expected: 'ab' },
    { why: 'one accented letter and a space', text: 'é ', expected: null },
    { why: 'an accented pair', text: 'ét', expected: 'ét' },
    { why: 'a phrase', text: 'faith & footwork', expected: 'faith & footwork' },
    { why: '100 characters', text: 'x'.repeat(100), expected: 'x'.repeat(100) },
    { why: '101 characters, cut to 100', text: 'y'.repeat(101), expected: 'y'.repeat(100) },
  ])('$why -> $expected', ({ text, expected }) => {
    expect(directorySearchTerm(text)).toBe(expected);
  });
});

// ADR 0071: the address's kind is the singular slug; anything else shows All.
describe('listingKindOf', () => {
  it.each([
    { raw: null, expected: null },
    { raw: 'organization', expected: 'organization' },
    { raw: 'person', expected: 'person' },
    { raw: 'instructor', expected: 'instructor' },
    { raw: 'ambassador', expected: 'ambassador' },
    { raw: 'company', expected: 'company' },
    { raw: 'church-ministry', expected: 'church-ministry' },
    { raw: 'Church Ministry', expected: null },
    { raw: 'Organization', expected: null },
    { raw: 'organizations', expected: null },
    { raw: '', expected: null },
    { raw: '0', expected: null },
  ])('$raw -> $expected', ({ raw, expected }) => {
    expect(listingKindOf(raw)).toBe(expected);
  });
});

describe('directoryHref', () => {
  it.each([
    { kind: null, q: null, expected: '/directory' },
    { kind: 'instructor', q: null, expected: '/directory?kind=instructor' },
    { kind: null, q: 'run club', expected: '/directory?q=run+club' },
    { kind: 'church-ministry', q: 'é&x', expected: '/directory?kind=church-ministry&q=%C3%A9%26x' },
  ] as const)('$kind $q -> $expected', ({ kind, q, expected }) => {
    expect(directoryHref(kind, q)).toBe(expected);
  });
});

// L2-054 AC3: All and each kind with its count; the chosen one current; each keeps the search.
describe('directoryKindChips', () => {
  const counts = [
    { kind: 'organization' as const, count: 3 },
    { kind: 'person' as const, count: 1 },
    { kind: 'instructor' as const, count: 2 },
    { kind: 'ambassador' as const, count: 2 },
    { kind: 'company' as const, count: 2 },
    { kind: 'church-ministry' as const, count: 2 },
  ];

  it('counts each kind and sums them for All, with All current', () => {
    expect(directoryKindChips(null, counts, null)).toEqual([
      { label: 'All', count: '12', href: '/directory', current: true },
      { label: 'Organizations', count: '3', href: '/directory?kind=organization', current: false },
      { label: 'People', count: '1', href: '/directory?kind=person', current: false },
      { label: 'Instructors', count: '2', href: '/directory?kind=instructor', current: false },
      { label: 'Ambassadors', count: '2', href: '/directory?kind=ambassador', current: false },
      { label: 'Companies', count: '2', href: '/directory?kind=company', current: false },
      {
        label: 'Church Ministries',
        count: '2',
        href: '/directory?kind=church-ministry',
        current: false,
      },
    ]);
  });

  it('marks the chosen kind and keeps the search in every address', () => {
    const chips = directoryKindChips('instructor', counts, 'run');
    expect(chips.filter((c) => c.current).map((c) => c.label)).toEqual(['Instructors']);
    expect(chips.map((c) => c.href)).toEqual([
      '/directory?q=run',
      '/directory?kind=organization&q=run',
      '/directory?kind=person&q=run',
      '/directory?kind=instructor&q=run',
      '/directory?kind=ambassador&q=run',
      '/directory?kind=company&q=run',
      '/directory?kind=church-ministry&q=run',
    ]);
  });

  it('shows "…" for every count before the first answer, and 0 for a kind not counted', () => {
    expect(directoryKindChips(null, null, null).map((c) => c.count)).toEqual(Array(7).fill('…'));
    expect(directoryKindChips(null, [counts[0]], null).map((c) => c.count)).toEqual([
      '3',
      '3',
      '0',
      '0',
      '0',
      '0',
      '0',
    ]);
  });
});

describe('noDirectoryMatchText', () => {
  it('quotes the search as text', () => {
    expect(noDirectoryMatchText('aquafit')).toBe(
      'Nothing in the directory matches “aquafit”. Know someone who should be listed? Our team checks every suggestion.',
    );
  });
});
