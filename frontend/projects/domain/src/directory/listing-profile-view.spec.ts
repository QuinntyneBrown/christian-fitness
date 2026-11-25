import type { ListingProfileDto } from '@cf/api';
import { listingProfileViewOf, websiteLinkOf } from './listing-profile-view';

const profile = (over: Partial<ListingProfileDto> = {}): ListingProfileDto => ({
  id: 'id-1',
  kind: 'organization',
  name: 'Lakeshore Runners Fellowship',
  tagline: 'Beginner-friendly running club with a prayer at every finish',
  area: 'Etobicoke',
  description: 'A west-end run club.',
  focus: ['Running'],
  websiteUrl: 'https://lakeshorerunners.ca',
  isVerified: true,
  photoKey: null,
  followers: 612,
  listedYear: 2025,
  hostingCount: 0,
  hosting: [],
  ...over,
});

// L2-055 AC5 (ADR 0077, ADR 0085): only an absolute https address with a host is ever shown, as a
// link whose text is the host without "www."; anything else is not shown at all.
describe('websiteLinkOf', () => {
  it.each([
    {
      url: 'https://lakeshorerunners.ca',
      expected: { href: 'https://lakeshorerunners.ca/', text: 'lakeshorerunners.ca' },
    },
    {
      url: 'https://www.christian.fitness',
      expected: { href: 'https://www.christian.fitness/', text: 'christian.fitness' },
    },
    {
      url: 'https://northlineathletic.ca/shop?ref=cf',
      expected: { href: 'https://northlineathletic.ca/shop?ref=cf', text: 'northlineathletic.ca' },
    },
    {
      url: '  HTTPS://Example.ORG  ',
      expected: { href: 'https://example.org/', text: 'example.org' },
    },
    { url: 'http://lakeshorerunners.ca', expected: null },
    { url: 'javascript:alert(1)', expected: null },
    { url: 'ftp://files.example.org', expected: null },
    { url: 'lakeshorerunners.ca', expected: null },
    { url: '//lakeshorerunners.ca', expected: null },
    { url: 'https://', expected: null },
    { url: 'https://user:secret@example.org', expected: null },
    { url: '', expected: null },
    { url: null, expected: null },
  ])('$url is $expected', ({ url, expected }) => {
    expect(websiteLinkOf(url)).toEqual(expected);
  });
});

// L2-055 AC1 (mock `listing-profile/default`, `person`): the head's kind, mark and the key facts.
describe('listingProfileViewOf', () => {
  it('words an organization with a website', () => {
    expect(listingProfileViewOf(profile())).toEqual({
      kind: 'Organization',
      person: false,
      initials: 'LR',
      photoSrc: null,
      website: { href: 'https://lakeshorerunners.ca/', text: 'lakeshorerunners.ca' },
      followers: '612',
      since: 'Since 2025',
    });
  });

  it('words a person with a photo, no website and thousands of followers', () => {
    expect(
      listingProfileViewOf(
        profile({
          kind: 'church-ministry',
          name: 'Grace Fellowship Move Ministry',
          photoKey: 'a1b2.jpg',
          websiteUrl: 'http://grace.example.org',
          followers: 12_345,
          listedYear: 2024,
        }),
      ),
    ).toEqual({
      kind: 'Church Ministry',
      person: false,
      initials: 'GF',
      photoSrc: '/api/directory/photos/a1b2.jpg',
      website: null,
      followers: '12,345',
      since: 'Since 2024',
    });
    expect(listingProfileViewOf(profile({ kind: 'instructor', name: 'Danielle Okafor' }))).toEqual(
      expect.objectContaining({ kind: 'Instructor', person: true, initials: 'DO' }),
    );
  });
});
