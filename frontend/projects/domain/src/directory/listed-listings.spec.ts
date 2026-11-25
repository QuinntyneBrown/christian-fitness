import type { ListedListingDto } from '@cf/api';
import { describe, expect, it } from 'vitest';
import {
  directoryListingErrorItems,
  directoryListingErrorsOf,
  directoryListingGone,
  directoryListingUpdateOf,
  directoryListingValuesOf,
  listedRowViewOf,
} from './listed-listings';

const LAKESHORE: ListedListingDto = {
  id: 'l-1',
  kind: 'organization',
  name: 'Lakeshore Runners Fellowship',
  area: 'Etobicoke',
  tagline: 'Beginner-friendly running club',
  about: 'A west-end run club.',
  website: 'https://lakeshorerunners.ca',
  photoKey: null,
  verified: true,
  followers: 2140,
};

// L2-073 AC10 (mock admin-listings/listed): a Listed row.
describe('a Listed row', () => {
  it('shows the mark, name, Verified, kind, area and followers', () => {
    expect(listedRowViewOf(LAKESHORE)).toEqual({
      id: 'l-1',
      name: 'Lakeshore Runners Fellowship',
      verified: true,
      person: false,
      initials: 'LR',
      photoSrc: null,
      kind: 'Organization',
      area: 'Etobicoke',
      followers: '2,140',
    });
  });

  it('shows a person round, with their photo', () => {
    const view = listedRowViewOf({
      ...LAKESHORE,
      kind: 'instructor',
      name: 'Danielle Okafor',
      photoKey: 'abc.jpg',
      followers: 0,
    });
    expect([view.person, view.initials, view.photoSrc, view.kind, view.followers]).toEqual([
      true,
      'DO',
      '/api/directory/photos/abc.jpg',
      'Instructor',
      '0',
    ]);
  });
});

// L2-073 AC13 (mocks directory-listing-editor/default and invalid): the staff editor.
describe('the staff listing editor', () => {
  it('opens on the listing as it stands and sends a blank website as none', () => {
    const values = directoryListingValuesOf({ ...LAKESHORE, website: null });
    expect(values.website).toBe('');
    expect(directoryListingUpdateOf({ ...values, website: '  ' })).toEqual({
      name: 'Lakeshore Runners Fellowship',
      kind: 'organization',
      area: 'Etobicoke',
      tagline: 'Beginner-friendly running club',
      about: 'A west-end run club.',
      website: null,
      photoKey: null,
    });
  });

  it.each([
    ['name', 'name_required', 'Give the listing a name members will recognize', 'f-name'],
    ['name', 'name_too_long', 'Use 120 characters or fewer', 'f-name'],
    ['kind', 'kind_invalid', 'Choose a kind from the list', 'f-kind'],
    ['area', 'area_required', 'Enter a neighbourhood or city', 'f-area'],
    ['area', 'area_too_long', 'Use 120 characters or fewer', 'f-area'],
    ['tagline', 'tagline_too_long', 'Use 100 characters or fewer', 'f-tagline'],
    ['about', 'about_too_long', 'Use 1,000 characters or fewer', 'f-about'],
    ['website', 'website_invalid', 'Enter a web address like lakeshorerunners.ca', 'f-website'],
    ['website', 'website_too_long', 'Use 200 characters or fewer', 'f-website'],
    ['photoKey', 'photo_invalid', 'Use a JPEG, PNG or WebP image up to 5 MB', 'f-image'],
    ['photo', 'photo_invalid', 'Use a JPEG, PNG or WebP image up to 5 MB', 'f-image'],
  ])('a refused %s (%s) reads "%s" and links %s', (field, code, text, target) => {
    const errors = directoryListingErrorsOf({
      status: 400,
      code: 'validation_failed',
      fieldCodes: { [field]: code },
    });
    expect(directoryListingErrorItems(errors ?? {})).toEqual([{ text, target }]);
  });

  it('lists two refused fields in the form order', () => {
    const errors = directoryListingErrorsOf({
      status: 400,
      code: 'validation_failed',
      fieldCodes: { website: 'website_invalid', name: 'name_required' },
    });
    expect(directoryListingErrorItems(errors ?? {}).map((item) => item.target)).toEqual([
      'f-name',
      'f-website',
    ]);
  });

  it.each<[string, unknown, boolean]>([
    ['a field refusal', { status: 400, code: 'validation_failed', fieldCodes: {} }, false],
    ['no answer', { status: 0, code: 'network' }, false],
    ['a field the editor lacks', { status: 400, fieldCodes: { focus: 'x' } }, false],
  ])('%s is not a field error', (_why, error) => {
    expect(directoryListingErrorsOf(error)).toBeNull();
  });

  it.each<[unknown, boolean]>([
    [{ status: 404, code: 'not_found' }, true],
    [{ status: 404, code: 'suggestion_not_found' }, false],
    [{ status: 0, code: 'network' }, false],
  ])('%j finds the listing gone: %s', (error, gone) => {
    expect(directoryListingGone(error)).toBe(gone);
  });
});
