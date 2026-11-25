import type { ApiError, ListingKind, ListingProfileDto, OwnListingUpdateDto } from '@cf/api';

/** What the owner's editor fields hold, as typed (mock `owner-listing-editor/default`; ADR 0094). */
export interface OwnListingEditorValues {
  name: string;
  /** The listing's kind, or the one waiting; the dialog has no control for it (L2-079 AC2). */
  kind: ListingKind;
  about: string;
  /** As typed; blank for none. */
  website: string;
  photoKey: string | null;
  /** The chosen photo's file name, once one is chosen on this visit. */
  photoName: string | null;
  /** The focus tags as typed, separated by commas. */
  focus: string;
  /** As typed; blank for none. */
  contact: string;
}

/**
 * The editor opens on the listing as it stands, but on the waiting name and kind when there are
 * any, so a save of something else does not withdraw them (ADR 0094).
 */
export function ownListingValuesOf(profile: ListingProfileDto): OwnListingEditorValues {
  return {
    name: profile.owner?.pendingName ?? profile.name,
    kind: profile.owner?.pendingKind ?? profile.kind,
    about: profile.description,
    website: profile.websiteUrl ?? '',
    photoKey: profile.photoKey,
    photoName: null,
    focus: profile.focus.join(', '),
    contact: profile.owner?.contactEmail ?? '',
  };
}

/**
 * What a save sends: the values as typed, the focus split on commas with blanks dropped, and a
 * blank website or contact as none.
 */
export function ownListingUpdateOf(values: OwnListingEditorValues): OwnListingUpdateDto {
  return {
    name: values.name,
    kind: values.kind,
    about: values.about,
    website: values.website.trim() === '' ? null : values.website,
    photoKey: values.photoKey,
    focus: values.focus
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag !== ''),
    contactEmail: values.contact.trim() === '' ? null : values.contact,
  };
}

/** The editor's fields, by the names its errors use. */
export type OwnListingFieldKey = 'name' | 'about' | 'website' | 'photo' | 'focus' | 'contact';

/** The message under each field the server refused, by field. */
export type OwnListingFieldErrors = Partial<Record<OwnListingFieldKey, string>>;

/** The fields in the order the form shows them, which is the order of its error summary. */
const FIELD_ORDER: readonly OwnListingFieldKey[] = [
  'name',
  'about',
  'website',
  'photo',
  'focus',
  'contact',
];

/** The server's field names, by the editor's: the photo is `photoKey` (or `photo` on upload), the contact `contactEmail`. */
const FIELD_OF: Record<string, OwnListingFieldKey> = {
  name: 'name',
  about: 'about',
  website: 'website',
  photoKey: 'photo',
  photo: 'photo',
  focus: 'focus',
  contactEmail: 'contact',
};

/** What each field code says to the owner (ADR 0094); the sentences the server writes are never shown. */
const MESSAGES: Record<string, string> = {
  name_required: 'Give the listing a name members will recognize',
  name_too_long: 'Use 120 characters or fewer',
  about_too_long: 'Use 1,000 characters or fewer',
  website_invalid: 'Enter a web address like eastsideladies.ca',
  website_too_long: 'Use 200 characters or fewer',
  photo_invalid: 'Use a JPEG, PNG or WebP image up to 5 MB',
  focus_too_many: 'Use 6 tags or fewer',
  focus_too_long: 'Keep each tag to 40 characters or fewer',
  contact_invalid: 'Enter an email address like name@example.com',
  contact_too_long: 'Use 254 characters or fewer',
};

const UNKNOWN_CODE = 'Check this field';

/**
 * The messages for the fields a save or an upload refused, or `null` when the failure is not a
 * field one. Fields the editor does not show (the kind) are ignored.
 */
export function ownListingErrorsOf(error: unknown): OwnListingFieldErrors | null {
  const { status, fieldCodes } = (error ?? {}) as Partial<ApiError>;
  if (status !== 400 || !fieldCodes) return null;
  const errors: OwnListingFieldErrors = {};
  for (const [key, code] of Object.entries(fieldCodes)) {
    const field = FIELD_OF[key];
    if (field) errors[field] = MESSAGES[code] ?? UNKNOWN_CODE;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/** The refused fields as the error summary lines, in the form order. */
export function ownListingErrorItems(
  errors: OwnListingFieldErrors,
): readonly { text: string; target: string }[] {
  return FIELD_ORDER.flatMap((field) => {
    const text = errors[field];
    return text ? [{ text, target: `f-${field}` }] : [];
  });
}
