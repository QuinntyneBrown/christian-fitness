import type { ListedListingDto } from '@cf/api';
import { describe, expect, it } from 'vitest';
import {
  directoryListingErrorItems,
  directoryListingErrorsOf,
  directoryListingGone,
  directoryListingUpdateOf,
  directoryListingValuesOf,
  listedRowViewOf,
  listingChangeToast,
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
  focus: [],
  contactEmail: null,
  pendingName: null,
  pendingKind: null,
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
      change: null,
    });
  });

  // L2-079 AC5 (ADR 0095; mock admin-listings/change-waiting): a waiting name or kind.
  it.each([
    ['nothing waits', null, null, null],
    [
      'a new name waits',
      'Lakeshore Runners',
      'organization',
      { what: 'name', label: 'New name waiting:', value: 'Lakeshore Runners' },
    ],
    [
      'a new kind waits with the live name',
      'Lakeshore Runners Fellowship',
      'church-ministry',
      { what: 'kind', label: 'New kind waiting:', value: 'Church Ministry' },
    ],
    [
      'a new name and kind: the name is shown',
      'Lakeshore Runners',
      'company',
      { what: 'name', label: 'New name waiting:', value: 'Lakeshore Runners' },
    ],
  ] as const)('shows the change when %s', (_, pendingName, pendingKind, change) => {
    expect(listedRowViewOf({ ...LAKESHORE, pendingName, pendingKind }).change).toEqual(change);
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
  it('opens on the listing as it stands and sends a blank website and contact as none', () => {
    const values = directoryListingValuesOf({
      ...LAKESHORE,
      website: null,
      focus: ['Running', 'Beginners'],
    });
    expect([values.website, values.focus, values.contact]).toEqual(['', 'Running, Beginners', '']);
    expect(
      directoryListingUpdateOf({
        ...values,
        website: '  ',
        focus: ' Running,, Prayer ',
        contact: ' ',
      }),
    ).toEqual({
      name: 'Lakeshore Runners Fellowship',
      kind: 'organization',
      area: 'Etobicoke',
      tagline: 'Beginner-friendly running club',
      about: 'A west-end run club.',
      website: null,
      photoKey: null,
      focus: ['Running', 'Prayer'],
      contactEmail: null,
    });
  });

  it('opens on the contact email staff can see (ADR 0095)', () => {
    expect(
      directoryListingValuesOf({ ...LAKESHORE, contactEmail: 'hello@lakeshore.example' }).contact,
    ).toBe('hello@lakeshore.example');
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
    ['focus', 'focus_too_many', 'Use 6 tags or fewer', 'f-focus'],
    ['focus', 'focus_too_long', 'Keep each tag to 40 characters or fewer', 'f-focus'],
    [
      'contactEmail',
      'contact_invalid',
      'Enter an email address like name@example.com',
      'f-contact',
    ],
    ['contactEmail', 'contact_too_long', 'Use 254 characters or fewer', 'f-contact'],
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
    ['a field the editor lacks', { status: 400, fieldCodes: { verified: 'x' } }, false],
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

// L2-079 AC5 (ADR 0095; mock admin-listings/change-approved): what a decision's toast says.
describe('a decided listing change', () => {
  const waiting = {
    ...LAKESHORE,
    pendingName: 'Lakeshore Runners',
    pendingKind: 'organization',
  } as const;

  it.each([
    [
      'approved',
      'name',
      waiting,
      ['Lakeshore Runners is the new name', 'The directory shows it now.'],
    ],
    [
      'declined',
      'name',
      waiting,
      ['Kept Lakeshore Runners Fellowship', 'The new name was declined.'],
    ],
    [
      'approved',
      'kind',
      { ...LAKESHORE, pendingName: LAKESHORE.name, pendingKind: 'company' },
      ['Company is the new kind', 'The directory shows it now.'],
    ],
    [
      'declined',
      'kind',
      { ...LAKESHORE, pendingName: LAKESHORE.name, pendingKind: 'company' },
      ['Kept Lakeshore Runners Fellowship', 'The new kind was declined.'],
    ],
  ] as const)('%s, of a new %s', (decision, _, before, toast) => {
    expect(listingChangeToast(decision, before)).toEqual(toast);
  });
});
