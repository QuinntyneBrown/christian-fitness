import type { AdminListingDto, ApiError, ServiceCategory, UpdateListingDto } from '@cf/api';
import { EVENT_TIME_ZONE } from '../events/event-when';

/** What the listing editor's fields hold, as typed (mock `listing-editor/edit`). */
export interface ListingEditorValues {
  name: string;
  role: string;
  category: ServiceCategory;
  where: string;
  /** The rate as typed, such as "From $70 / session"; sent as the listing's `price`. */
  price: string;
  credentials: string;
  about: string;
  /** An http or https address, or blank for none. */
  contactUrl: string;
}

/** The editor's fields, by the names its errors use. */
export type ListingFieldKey = keyof ListingEditorValues;

/** The message under each field the server refused, by field. */
export type ListingFieldErrors = Partial<Record<ListingFieldKey, string>>;

/** The fields in the order the form shows them, which is the order of its error summary. */
export const LISTING_FIELD_ORDER: readonly ListingFieldKey[] = [
  'name',
  'role',
  'category',
  'where',
  'price',
  'credentials',
  'about',
  'contactUrl',
];

/** The id of each field control, which the error summary links name (the mock `f-…` ids). */
export const LISTING_FIELD_IDS: Record<ListingFieldKey, string> = {
  name: 'f-name',
  role: 'f-role',
  category: 'f-category',
  where: 'f-where',
  price: 'f-rate',
  credentials: 'f-credentials',
  about: 'f-about',
  contactUrl: 'f-contact',
};

/** What each field code says to staff (ADR 0054); the sentences the server writes are never shown. */
const MESSAGES: Record<string, string> = {
  name_required: 'Enter the name of the professional',
  name_too_long: 'Use 100 characters or fewer',
  role_required: 'Enter a role, such as Personal trainer',
  role_too_long: 'Use 80 characters or fewer',
  category_invalid: 'Choose a category from the list',
  where_required: 'Enter where they work, such as Mississauga',
  where_too_long: 'Use 80 characters or fewer',
  price_required: 'Enter a rate, such as $70 / session',
  price_too_long: 'Use 60 characters or fewer',
  credentials_required: 'Enter their credentials',
  credentials_too_long: 'Use 200 characters or fewer',
  about_required: 'Enter a short description',
  about_too_long: 'Use 300 characters or fewer',
  contact_link_invalid: 'Enter an http or https address, or leave it empty',
};

const UNKNOWN_CODE = 'Check this field';

/** The editor opens on the listing as it stands: no contact link is blank. */
export function listingEditorValuesOf(listing: AdminListingDto): ListingEditorValues {
  return {
    name: listing.name,
    role: listing.role,
    category: listing.category,
    where: listing.where,
    price: listing.price,
    credentials: listing.credentials,
    about: listing.about,
    contactUrl: listing.contactUrl ?? '',
  };
}

/** What a save sends: the values as typed, a blank contact link as none. */
export function listingUpdateOf(values: ListingEditorValues): UpdateListingDto {
  return { ...values, contactUrl: values.contactUrl.trim() === '' ? null : values.contactUrl };
}

/**
 * The messages for the fields a save refused, or `null` when the failure is not a field one: a 400
 * names each failed field code in `fieldCodes`. Fields the editor does not have are ignored.
 */
export function listingFieldErrorsOf(error: ApiError): ListingFieldErrors | null {
  if (error.status !== 400 || !error.fieldCodes) return null;
  const errors: ListingFieldErrors = {};
  for (const [key, code] of Object.entries(error.fieldCodes)) {
    if (LISTING_FIELD_ORDER.includes(key as ListingFieldKey)) {
      errors[key as ListingFieldKey] = MESSAGES[code] ?? UNKNOWN_CODE;
    }
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/** The refused fields as the error summary lines, in the form order. */
export function listingErrorItems(
  errors: ListingFieldErrors,
): readonly { text: string; target: string }[] {
  return LISTING_FIELD_ORDER.flatMap((field) => {
    const text = errors[field];
    return text ? [{ text, target: LISTING_FIELD_IDS[field] }] : [];
  });
}

/** The error summary heading: "1 thing to fix before saving", "2 things to fix before saving". */
export function listingErrorHeading(count: number): string {
  return `${count} ${count === 1 ? 'thing' : 'things'} to fix before saving`;
}

/** Whether a refused save found the listing gone (404 `service_not_found`). */
export function listingGone(error: unknown): boolean {
  const { status, code } = (error ?? {}) as { status?: unknown; code?: unknown };
  return status === 404 && code === 'service_not_found';
}

let monthFormat: Intl.DateTimeFormat | undefined;

/** The Verified column (mock `admin-services/default`): when staff approved it, such as "Mar 2026". */
export function listingVerifiedMonth(publishedAt: string): string {
  const instant = new Date(publishedAt);
  if (Number.isNaN(instant.getTime())) return '';
  monthFormat ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    month: 'short',
    year: 'numeric',
  });
  return monthFormat.format(instant);
}
