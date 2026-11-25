import type { ListingProfileDto } from '@cf/api';
import { describe, expect, it } from 'vitest';
import {
  ownListingErrorItems,
  ownListingErrorsOf,
  ownListingUpdateOf,
  ownListingValuesOf,
} from './own-listing';

const profile = (over: Partial<ListingProfileDto> = {}): ListingProfileDto => ({
  id: 'eastside',
  kind: 'organization',
  name: 'Eastside Ladies Who Lift',
  tagline: 'Saturday morning strength group',
  area: 'East York',
  description: 'About 25 women.',
  focus: ['Strength', 'Beginners', 'Women'],
  websiteUrl: 'https://eastsideladies.ca',
  isVerified: true,
  photoKey: null,
  followers: 0,
  listedYear: 2026,
  hasOwner: true,
  hostingCount: 0,
  series: [],
  hosting: [],
  connections: [],
  serviceListingId: null,
  following: false,
  isOwner: true,
  owner: { contactEmail: 'eastside@example.org', pendingName: null, pendingKind: null },
  ...over,
});

describe('ownListingValuesOf', () => {
  it('opens on the listing as it stands, focus joined by commas', () => {
    expect(ownListingValuesOf(profile())).toEqual({
      name: 'Eastside Ladies Who Lift',
      kind: 'organization',
      about: 'About 25 women.',
      website: 'https://eastsideladies.ca',
      photoKey: null,
      photoName: null,
      focus: 'Strength, Beginners, Women',
      contact: 'eastside@example.org',
    });
  });

  it('opens on the waiting name and kind, so saving something else keeps them waiting', () => {
    const values = ownListingValuesOf(
      profile({
        owner: { contactEmail: null, pendingName: 'Eastside Strength', pendingKind: 'company' },
      }),
    );
    expect([values.name, values.kind, values.contact]).toEqual([
      'Eastside Strength',
      'company',
      '',
    ]);
  });

  it('reads no website and no owner fields as blank', () => {
    const values = ownListingValuesOf(profile({ websiteUrl: null, owner: null }));
    expect([values.website, values.contact]).toEqual(['', '']);
  });
});

describe('ownListingUpdateOf', () => {
  it.each([
    ['Strength, Beginners, Women', ['Strength', 'Beginners', 'Women']],
    ['  Strength ,, Women ,', ['Strength', 'Women']],
    ['', []],
    [' , ', []],
  ])('splits the focus %j on commas, trimmed, blanks dropped', (focus, tags) => {
    expect(ownListingUpdateOf({ ...ownListingValuesOf(profile()), focus }).focus).toEqual(tags);
  });

  it('sends a blank website or contact as none, and the rest as typed', () => {
    expect(
      ownListingUpdateOf({ ...ownListingValuesOf(profile()), website: '  ', contact: ' ' }),
    ).toEqual({
      name: 'Eastside Ladies Who Lift',
      kind: 'organization',
      about: 'About 25 women.',
      website: null,
      photoKey: null,
      focus: ['Strength', 'Beginners', 'Women'],
      contactEmail: null,
    });
  });
});

describe('ownListingErrorsOf', () => {
  it.each([
    ['name', 'name_required', 'name', 'Give the listing a name members will recognize'],
    ['name', 'name_too_long', 'name', 'Use 120 characters or fewer'],
    ['about', 'about_too_long', 'about', 'Use 1,000 characters or fewer'],
    ['website', 'website_invalid', 'website', 'Enter a web address like eastsideladies.ca'],
    ['website', 'website_too_long', 'website', 'Use 200 characters or fewer'],
    ['photoKey', 'photo_invalid', 'photo', 'Use a JPEG, PNG or WebP image up to 5 MB'],
    ['focus', 'focus_too_many', 'focus', 'Use 6 tags or fewer'],
    ['focus', 'focus_too_long', 'focus', 'Keep each tag to 40 characters or fewer'],
    ['contactEmail', 'contact_invalid', 'contact', 'Enter an email address like name@example.com'],
    ['contactEmail', 'contact_too_long', 'contact', 'Use 254 characters or fewer'],
    ['website', 'something_new', 'website', 'Check this field'],
  ])('maps %s %s to the %s field', (key, code, field, text) => {
    expect(
      ownListingErrorsOf({ status: 400, code: 'validation_failed', fieldCodes: { [key]: code } }),
    ).toEqual({ [field]: text });
  });

  it('is no field failure for anything but a 400 naming fields the editor shows', () => {
    expect(ownListingErrorsOf({ status: 403, code: 'not_listing_owner' })).toBeNull();
    expect(ownListingErrorsOf({ status: 400, code: 'validation_failed' })).toBeNull();
    expect(
      ownListingErrorsOf({ status: 400, code: 'validation_failed', fieldCodes: { kind: 'x' } }),
    ).toBeNull();
    expect(ownListingErrorsOf(new Error('offline'))).toBeNull();
  });

  it('lists the summary in the form order, each linking its field', () => {
    expect(ownListingErrorItems({ contact: 'C', website: 'W', name: 'N' })).toEqual([
      { text: 'N', target: 'f-name' },
      { text: 'W', target: 'f-website' },
      { text: 'C', target: 'f-contact' },
    ]);
  });
});
