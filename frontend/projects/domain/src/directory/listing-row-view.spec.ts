import type { DirectoryListingRowDto } from '@cf/api';
import { listingInitials, listingRowViewOf } from './listing-row-view';

const row = (over: Partial<DirectoryListingRowDto>): DirectoryListingRowDto => ({
  id: 'id-1',
  kind: 'organization',
  name: 'Christian Fitness',
  tagline: 'Faith-first fitness community for the GTA',
  area: 'Toronto-wide',
  isVerified: true,
  photoKey: null,
  hosting: 0,
  following: false,
  ...over,
});

// L2-054 AC2 (mock `directory/default`): a group's mark reads the first letters of its first two
// words; a person's those of their first and last names, after any title such as "Rev.".
describe('listingInitials', () => {
  it.each([
    { kind: 'organization', name: 'Christian Fitness', expected: 'CF' },
    { kind: 'organization', name: 'Lakeshore Runners Fellowship', expected: 'LR' },
    { kind: 'organization', name: 'Faith & Footwork', expected: 'FF' },
    { kind: 'church-ministry', name: 'Grace Fellowship Move Ministry', expected: 'GF' },
    { kind: 'church-ministry', name: 'St. Paul’s Sports Ministry', expected: 'SP' },
    { kind: 'company', name: 'Northline Athletic', expected: 'NA' },
    { kind: 'company', name: 'Kingdom', expected: 'K' },
    { kind: 'person', name: 'Rev. James Whitfield', expected: 'JW' },
    { kind: 'instructor', name: 'Danielle Okafor', expected: 'DO' },
    { kind: 'ambassador', name: 'Michael  Chen', expected: 'MC' },
    { kind: 'ambassador', name: 'Priya van Nair', expected: 'PN' },
    { kind: 'person', name: 'Dr. Émile', expected: 'É' },
    { kind: 'person', name: '  ', expected: '' },
  ] as const)('$kind "$name" -> $expected', ({ kind, name, expected }) => {
    expect(listingInitials(kind, name)).toBe(expected);
  });
});

describe('listingRowViewOf', () => {
  it('shows an organization squared with its initials, verified, hosting one', () => {
    expect(listingRowViewOf(row({ hosting: 1 }))).toEqual({
      id: 'id-1',
      href: '/directory/id-1',
      name: 'Christian Fitness',
      tagline: 'Faith-first fitness community for the GTA',
      area: 'Toronto-wide',
      verified: true,
      person: false,
      initials: 'CF',
      photoSrc: null,
      hosting: '1 hosting',
      hostingSome: true,
    });
  });

  it('shows a person round, with a photo by its key, and no events yet', () => {
    expect(
      listingRowViewOf(
        row({
          kind: 'instructor',
          name: 'Danielle Okafor',
          photoKey: 'abc.jpg',
          isVerified: false,
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        verified: false,
        person: true,
        initials: 'DO',
        photoSrc: '/api/directory/photos/abc.jpg',
        hosting: 'No events yet',
        hostingSome: false,
      }),
    );
  });

  it('counts several hosted events', () => {
    expect(listingRowViewOf(row({ hosting: 12 })).hosting).toBe('12 hosting');
  });
});
