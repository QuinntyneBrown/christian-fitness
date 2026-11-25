# Edit my listing

## Overview

Christian Fitness is a Christian community for health in body and spirit in the Greater Toronto Area. Once a listing is claimed (`docs/detailed-designs/directory/claim-listing/`), its owner keeps it accurate without asking staff (`L1-017`). Staff keep the listings no member owns from Listed's Edit, which journey 18 built (ADR 0090).

- **owner** — the member linked to a listing when they claimed it (`DirectoryListing.MemberId`, ADR 0092)
- **waiting change** — a new name or kind waiting for staff to approve (`PendingName`, `PendingKind`, `PendingSince` on the listing; ADR 0095)

This feature covers the Edit listing button on the owner's listing page and the dialog it opens, at `/directory/:id` (mocks `docs/mocks/pages/listing-profile/owner.html` and `docs/mocks/dialogs/owner-listing-editor/`, states `default`, `invalid`, `busy`, `failed`, `review` and `saved`), the waiting change in Listed (`docs/mocks/pages/admin-listings/change-waiting.html`), the staff editor's focus and contact fields (`docs/mocks/dialogs/directory-listing-editor/`), and requirement `L2-079`. ADR 0095 records the decisions.

## Description

The feature is a vertical slice from the dialog to the database.

### Member web app (`projects/web`) and libraries

- **`ListingProfilePage`** — shows "Edit listing" in place of Follow and Message when the profile's `isOwner` is true. The button imports and opens the dialog through the CDK Dialog service with the page's injector; there is no inline form. A save hands back the listing, which the page shows in place, with the toast "Your listing is updated".
- **`OwnerListingEditorDialog`** — CDK Dialog with the library's `dialog`, `alert`, `text-field`, `textarea` and `file-field`: name, about, website (optional), photo (optional), focus (one comma-separated field, up to 6) and contact email (optional). It opens on the profile's values, the waiting name when there is one, and the owner-only contact email. Focus starts on the name. "Save changes" reads "Saving…" with `disabled` and `aria-busy="true"` while saving, and the fields are read-only; Cancel and Close return to the page.
- **Invalid** — the server's field codes become an error summary (`role="alert"`, focused) and the field marked `aria-invalid="true"` (`L2-079` AC3).
- **Failed** — an `Alert` above the fields; everything typed is kept (`L2-079` AC6).
- **Review** — when the answer's `nameChangePending` is true the dialog stays open on an info `Alert` saying staff will check the new name while the other changes are live; closing it shows the toast (`L2-079` AC4, AC5).
- **`DirectoryApi`** — the contract in `projects/api/src/directory/` gains `updateOwn(id, update)`, answering `{ nameChangePending, listing }`, and `uploadPhoto(file)`. The profile page binds it, and the dialog is created with the page's injector.
- **`ownListingValuesOf`, `ownListingUpdateOf`, `ownListingErrorsOf`** — pure helpers in `projects/domain/src/directory/own-listing.ts` that fill the fields, build the request (focus split on commas, blanks dropped) and map each field code to its sentence, with unit tests.

### Admin web app (`projects/admin`)

- **Listed** — a row with a waiting change shows "New name waiting: {name}" (or kind) under the name, with Approve and Decline (`listed-cell`'s `change` variant), and a toast after each.
- **`DirectoryListingEditorDialog`** — gains Focus and Contact email; a save applies a name or kind at once.

### Christian Fitness API

- **`DirectoryController`** — `PUT api/directory/{id}` sends one `UpdateOwnListingCommand` (a class, so no generated `ToString` prints the values). `GET api/directory/{id}` answers `isOwner` and, for the owner only, `owner` (`contactEmail`, `pendingName`, `pendingKind`).
- **`UpdateOwnListingHandler`** — anything but a published listing is 404 `listing_not_found`; a caller who is not the owner is 403 `not_listing_owner`; the validator refuses fields with 400 `validation_failed` and their codes. About, website, photo, focus tags and contact apply at once; a name or kind that differs from the live one is kept as the waiting change and the live values stay. It saves and audits in one unit of work (`listing.edited`).
- **`DirectoryPhotosController`** — `POST api/directory/photos` stores a photo for a member who owns a published listing.
- **Staff** — `PUT api/admin/directory/listings/{id}` (ADR 0090) also takes focus and contact and applies a name or kind at once, dropping any waiting change (`L2-079` AC8). `POST api/admin/directory/listings/{id}/change/approve` and `.../change/decline` decide a waiting change; nothing waiting is 409 `no_change_waiting`.
- **Privacy** — the contact email is answered only to the owner, to staff and, from `POST api/directory/{id}/conversation`, to a member who messages the listing; no span, metric or log carries it, the about or the website (`L2-079` AC7).

### Open questions

- **Showing the contact email.** The conversation answer carries it, but no mock shows it in Messages; the app shows it once one does (ADR 0095).
- **Telling the owner.** A notification for an approved or declined name waits for its kind.

## Requirements

| Requirement | Traces to | Summary |
|---|---|---|
| `L2-079` | `L1-017` | The owner edits their listing; a name or kind change goes back to staff |
| `L2-078` | `L1-017`, `L1-023` | Claiming makes the member the owner |
| `L2-073` | `L1-017` | Staff edit a listing from Listed |

## Diagrams

### Behaviour — the owner edits a listing

A non-owner is refused with `not_listing_owner`; invalid input with `validation_failed`; valid changes go live at once, and a changed name or kind waits on the listing for staff.

![Sequence diagram: the owner edits a listing](diagrams/sequence-edit.png)

### Class structure

`OwnerListingEditorDialog` depends on `DirectoryApi`; `UpdateOwnListingHandler` applies the edit to `DirectoryListing`, which holds at most one waiting name or kind.

![Class diagram: edit my listing](diagrams/class.png)
