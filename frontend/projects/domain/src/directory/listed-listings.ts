import type { ApiError, DirectoryListingUpdateDto, ListedListingDto, ListingKind } from '@cf/api';
import { listingKindInfo } from './listing-kinds';
import { listingInitials } from './listing-row-view';
import { kindLabel } from './suggestion-review';

/** A Listed row as the table shows it (mock `admin-listings/listed`; L2-073 AC10). */
export interface ListedRowView {
  id: string;
  name: string;
  verified: boolean;
  person: boolean;
  initials: string;
  photoSrc: string | null;
  kind: string;
  area: string;
  followers: string;
}

let countFormat: Intl.NumberFormat | undefined;

/** The photo's address, or none. */
export function listingPhotoSrc(photoKey: string | null): string | null {
  return photoKey === null ? null : `/api/directory/photos/${encodeURIComponent(photoKey)}`;
}

/** A listing as its Listed row shows it: the mark, the name, Verified, kind, area and followers. */
export function listedRowViewOf(listing: ListedListingDto): ListedRowView {
  countFormat ??= new Intl.NumberFormat('en-US');
  return {
    id: listing.id,
    name: listing.name,
    verified: listing.verified,
    person: listingKindInfo(listing.kind).person,
    initials: listingInitials(listing.kind, listing.name),
    photoSrc: listingPhotoSrc(listing.photoKey),
    kind: kindLabel(listing.kind),
    area: listing.area,
    followers: countFormat.format(listing.followers),
  };
}

/** What the staff editor's fields hold, as typed (mock `directory-listing-editor/default`). */
export interface DirectoryListingEditorValues {
  name: string;
  kind: ListingKind;
  area: string;
  tagline: string;
  about: string;
  /** As typed; blank for none. */
  website: string;
  photoKey: string | null;
  /** The chosen photo's file name, once one is chosen on this visit. */
  photoName: string | null;
}

/** The editor's fields, by the names its errors use. */
export type DirectoryListingFieldKey =
  'name' | 'kind' | 'area' | 'tagline' | 'about' | 'website' | 'photo';

/** The message under each field the server refused, by field. */
export type DirectoryListingFieldErrors = Partial<Record<DirectoryListingFieldKey, string>>;

/** The fields in the order the form shows them, which is the order of its error summary. */
const FIELD_ORDER: readonly DirectoryListingFieldKey[] = [
  'name',
  'kind',
  'area',
  'tagline',
  'about',
  'website',
  'photo',
];

/** The id of each field control, which the error summary links name (the mock `f-…` ids). */
const FIELD_IDS: Record<DirectoryListingFieldKey, string> = {
  name: 'f-name',
  kind: 'f-kind',
  area: 'f-area',
  tagline: 'f-tagline',
  about: 'f-about',
  website: 'f-website',
  photo: 'f-image',
};

/** What each field code says to staff (ADR 0090); the sentences the server writes are never shown. */
const MESSAGES: Record<string, string> = {
  name_required: 'Give the listing a name members will recognize',
  name_too_long: 'Use 120 characters or fewer',
  kind_invalid: 'Choose a kind from the list',
  area_required: 'Enter a neighbourhood or city',
  area_too_long: 'Use 120 characters or fewer',
  tagline_too_long: 'Use 100 characters or fewer',
  about_too_long: 'Use 1,000 characters or fewer',
  website_invalid: 'Enter a web address like lakeshorerunners.ca',
  website_too_long: 'Use 200 characters or fewer',
  photo_invalid: 'Use a JPEG, PNG or WebP image up to 5 MB',
};

/** The server's field names, by the editor's: the photo is sent as `photoKey`, uploaded as `photo`. */
const FIELD_OF: Record<string, DirectoryListingFieldKey> = {
  name: 'name',
  kind: 'kind',
  area: 'area',
  tagline: 'tagline',
  about: 'about',
  website: 'website',
  photoKey: 'photo',
  photo: 'photo',
};

const UNKNOWN_CODE = 'Check this field';

/** The editor opens on the listing as it stands: no website is blank. */
export function directoryListingValuesOf(listing: ListedListingDto): DirectoryListingEditorValues {
  return {
    name: listing.name,
    kind: listing.kind,
    area: listing.area,
    tagline: listing.tagline,
    about: listing.about,
    website: listing.website ?? '',
    photoKey: listing.photoKey,
    photoName: null,
  };
}

/** What a save sends: the values as typed, a blank website as none. */
export function directoryListingUpdateOf(
  values: DirectoryListingEditorValues,
): DirectoryListingUpdateDto {
  return {
    name: values.name,
    kind: values.kind,
    area: values.area,
    tagline: values.tagline,
    about: values.about,
    website: values.website.trim() === '' ? null : values.website,
    photoKey: values.photoKey,
  };
}

/**
 * The messages for the fields a save or an upload refused, or `null` when the failure is not a
 * field one. Fields the editor does not have are ignored.
 */
export function directoryListingErrorsOf(error: unknown): DirectoryListingFieldErrors | null {
  const { status, fieldCodes } = (error ?? {}) as Partial<ApiError>;
  if (status !== 400 || !fieldCodes) return null;
  const errors: DirectoryListingFieldErrors = {};
  for (const [key, code] of Object.entries(fieldCodes)) {
    const field = FIELD_OF[key];
    if (field) errors[field] = MESSAGES[code] ?? UNKNOWN_CODE;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/** The refused fields as the error summary lines, in the form order. */
export function directoryListingErrorItems(
  errors: DirectoryListingFieldErrors,
): readonly { text: string; target: string }[] {
  return FIELD_ORDER.flatMap((field) => {
    const text = errors[field];
    return text ? [{ text, target: FIELD_IDS[field] }] : [];
  });
}

/** Whether a refused save found the listing gone (404 `not_found`). */
export function directoryListingGone(error: unknown): boolean {
  const { status, code } = (error ?? {}) as { status?: unknown; code?: unknown };
  return status === 404 && code === 'not_found';
}
