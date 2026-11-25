import type { ListingProfileDto } from '@cf/api';
import { describe, expect, it } from 'vitest';
import { ownListingValuesOf } from './own-listing';

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
