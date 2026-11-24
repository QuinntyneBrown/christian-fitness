import type { AdminListingDto, ApiError } from '@cf/api';
import {
  listingEditorValuesOf,
  listingErrorHeading,
  listingErrorItems,
  listingFieldErrorsOf,
  listingGone,
  listingUpdateOf,
  listingVerifiedMonth,
} from './listing-editor';

const LISTING: AdminListingDto = {
  id: '1',
  name: 'Danielle Okafor',
  role: 'Personal trainer',
  category: 'Training',
  where: 'In person · East York',
  price: 'From $70 / session',
  credentials: 'NSCA-CPT',
  about: 'Strength.',
  contactUrl: null,
  publishedAt: '2026-03-12T15:00:00Z',
};

// L2-027 AC1: the editor opens on the listing, saves a blank link as none and names what was refused.
describe('listing editor values', () => {
  it('opens with a blank contact link when there is none, and sends it as none', () => {
    const values = listingEditorValuesOf(LISTING);

    expect(values.contactUrl).toBe('');
    expect(listingUpdateOf(values).contactUrl).toBeNull();
    expect(listingUpdateOf({ ...values, contactUrl: 'https://a.example/b' }).contactUrl).toBe(
      'https://a.example/b',
    );
  });
});

describe('listingFieldErrorsOf', () => {
  it.each([
    ['name', 'name_required', 'name', 'Enter the name of the professional'],
    ['name', 'name_too_long', 'name', 'Use 100 characters or fewer'],
    ['role', 'role_too_long', 'role', 'Use 80 characters or fewer'],
    ['category', 'category_invalid', 'category', 'Choose a category from the list'],
    ['price', 'price_required', 'price', 'Enter a rate, such as $70 / session'],
    ['about', 'about_too_long', 'about', 'Use 300 characters or fewer'],
    [
      'contactUrl',
      'contact_link_invalid',
      'contactUrl',
      'Enter an http or https address, or leave it empty',
    ],
    ['where', 'something_new', 'where', 'Check this field'],
  ])('%s with %s reads %s', (key, code, field, text) => {
    const error: ApiError = { status: 400, code: 'validation_failed', fieldCodes: { [key]: code } };

    expect(listingFieldErrorsOf(error)).toEqual({ [field]: text });
  });

  it('is not a field refusal without field codes, for another status or for another field', () => {
    expect(listingFieldErrorsOf({ status: 400, code: 'validation_failed' })).toBeNull();
    expect(
      listingFieldErrorsOf({ status: 500, code: 'x', fieldCodes: { name: 'name_required' } }),
    ).toBeNull();
    expect(
      listingFieldErrorsOf({ status: 400, code: 'x', fieldCodes: { other: 'name_required' } }),
    ).toBeNull();
  });

  it('lists the refused fields in the form order with the control each names', () => {
    const items = listingErrorItems({ contactUrl: 'c', name: 'n' });

    expect(items).toEqual([
      { text: 'n', target: 'f-name' },
      { text: 'c', target: 'f-contact' },
    ]);
    expect(listingErrorHeading(1)).toBe('1 thing to fix before saving');
    expect(listingErrorHeading(2)).toBe('2 things to fix before saving');
  });
});

describe('listing refusals and dates', () => {
  it('knows a listing that is gone by status and code together', () => {
    expect(listingGone({ status: 404, code: 'service_not_found' })).toBe(true);
    expect(listingGone({ status: 404, code: 'other' })).toBe(false);
    expect(listingGone(undefined)).toBe(false);
  });

  it('shows the month it was verified, in Toronto', () => {
    expect(listingVerifiedMonth('2026-03-12T15:00:00Z')).toBe('Mar 2026');
    expect(listingVerifiedMonth('2026-04-01T02:00:00Z')).toBe('Mar 2026');
    expect(listingVerifiedMonth('nope')).toBe('');
  });
});
