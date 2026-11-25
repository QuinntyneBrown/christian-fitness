import type { ListingKind, ListingProfileDto } from '@cf/api';

/** What the owner's editor fields hold, as typed (mock `owner-listing-editor/default`; ADR 0093). */
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
 * any, so a save of something else does not withdraw them (ADR 0093).
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
