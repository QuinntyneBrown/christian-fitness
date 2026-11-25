# 0094. Editing my listing: the owner's read and save, a waiting name or kind on the listing, approval from Listed, and the staff editor's same fields

## Status

Accepted, 25 November 2026 (journey 20, issue #170). Builds ADR 0086, ADR 0087, ADR 0090 and
ADR 0092; amends `L2-079` AC3 and the detailed design `directory/edit-listing`.

## Context

`L2-079` lets the member who claimed a listing (ADR 0092 makes them `DirectoryListing.MemberId`)
change its name, about, website, photo, focus tags and contact email. A changed name or kind waits
for staff; the rest goes live at once. Staff editing a staff-managed listing from Listed change the
same fields with no second review. The design and mocks left these open or drew them differently
from what the codebase now holds:

- The design names `PUT api/directory/listings/{id}` and a separate `ListingChangeRequest` record;
  the member directory's routes are `api/directory/{id}` and a listing holds at most one change.
- AC3 limits a name to 100 characters; ADR 0077 and ADR 0090 allow 120 for a suggestion and the
  staff editor, so an owner of a 110-character name could never save.
- The owner's dialog asks for no kind (AC2 lists the fields and the mock draws none), yet AC5 and
  AC8 speak of a changed kind.
- The mock draws the focus tags as a read-only tag list, so they could not be changed.
- Nothing in the codebase stores a contact email on a listing, nor lets a member upload a photo.
- No admin mock shows a waiting change (the design's open question), and Listed's editor (ADR 0090)
  has no focus or contact field.
- The issue names `dropzone` to build first; the mocks of this journey use `file-field`, which the
  library already has.

## Decision

- **The owner's read.** `GET api/directory/{id}` (`ListingProfileDto`) gains `isOwner`, true when
  the signed-in caller is the listing's `MemberId`, and `owner`, which is `null` for anyone else
  and for the owner `{ contactEmail, pendingName, pendingKind }`. The directory row and every other
  read carry neither. The profile shows "Edit listing" in place of Follow and Message when
  `isOwner` is true.
- **The owner's save.** `PUT api/directory/{id}` (a member) sends one `UpdateOwnListingCommand`, a
  class so no generated `ToString` prints its values, with `name`, `kind`, `about`, `website`,
  `photoKey`, `focus` (a list) and `contactEmail`. It answers `{ nameChangePending, listing }`,
  where `listing` is the profile as now saved and `nameChangePending` says a name or kind is waiting
  after this save. A listing that is not published is 404 `listing_not_found`; a published listing
  the caller does not own is 403 `not_listing_owner`. About, website, photo, focus and contact are
  saved at once; audited `listing.edited` against the listing.
- **Fields and codes.** 400 `validation_failed` with `fieldCodes`: `name_required`,
  `name_too_long` (over 120), `kind_invalid`, `about_too_long` (over 1,000), `website_invalid` and
  `website_too_long` (read as ADR 0086 reads a website: a bare host gains `https://`),
  `photo_invalid` (a key the store does not hold), `focus_too_many` (more than 6 tags),
  `focus_too_long` (a tag over 40 characters) and `contact_invalid` or `contact_too_long` (over
  254), using the sign-up email pattern. `L2-079` AC3's name limit becomes 120, the limit a
  suggestion and the staff editor already use, so one listing name is never valid in one editor
  and refused in another.
- **A waiting name or kind.** `DirectoryListing` holds `PendingName`, `PendingKind` and
  `PendingSince` rather than a separate `ListingChangeRequest`: a listing has at most one waiting
  change, a second save replaces it, and saving the live name and kind again withdraws it. The
  directory, the profile and every search keep the live name and kind. The owner's dialog has no
  kind control (AC2's fields; the mock), so it sends the live kind and only a name change reaches
  staff from the app; the API applies the same rule to a kind it is sent. The dialog opens on the
  waiting name when there is one, so saving something else does not withdraw it. With
  `nameChangePending` the dialog stays open on the info alert "Staff will check the new name"
  (mock `owner-listing-editor/review`); closing it shows the toast. Otherwise it closes, and the
  page shows the saved listing in place with the toast "Your listing is updated", "Your changes
  are live in the directory."
- **Staff approve or decline it in Listed.** `ListedListingDto` gains `focus`, `contactEmail`,
  `pendingName` and `pendingKind`. A row with a waiting change shows under its name "New name
  waiting: {name}" (or "New kind waiting: {kind}") with Approve and Decline (mock
  `admin-listings/change-waiting`, drawn by `listed-cell`'s new `change` variant).
  `POST api/admin/directory/listings/{id}/change/approve` applies it and `.../change/decline` drops
  it; both answer the row as saved, 404 `not_found` for an unknown listing and 409
  `no_change_waiting` when nothing waits. Audited `listing.change_approved` and
  `listing.change_declined`. Toasts: "{new name} is the new name" and "The directory shows it
  now."; "Kept {name}" and "The new name was declined."; a failure "We couldn't save that
  decision", "Nothing changed. Try again in a moment.". Telling the owner the outcome waits for a
  notification kind (journey 14's list has none for it).
- **Staff edit the same fields (AC8).** Listed's editor gains Focus and Contact email. A staff save
  applies the name and kind at once and drops any waiting change, since staff have reviewed it.
- **Focus tags** are one text field, "Focus", with the hint "Up to 6, separated by commas", in
  both editors (the mocks are changed so); blank entries are dropped.
- **Photos.** `POST api/directory/photos` (multipart `file`) stores a photo for a member who owns a
  published listing, by ADR 0090's rules (JPEG, PNG or WebP, up to 5 MB, judged by its first
  bytes), audited `listing_photo.uploaded`; anyone else is 403 `not_listing_owner`.
- **The contact email** is stored on the listing (`ContactEmail`, at most 254). It is answered to
  the owner (`owner`), to staff (Listed) and, as `contactEmail`, to a member who messages the
  listing (`POST api/directory/{id}/conversation`). No other read carries it. Showing it in the
  conversation needs a mock that does not exist, so the app does not show it yet. No span, metric
  or log carries it, the about or the website: the command is a class, the handler logs nothing,
  and the API test records every span and log line of a save.
- **Stand-ins.** The dialog's failure is the mock's alert ("We couldn't save your listing"). A
  website refused reads "Enter a web address like eastsideladies.ca", as the staff editor's does,
  since a bare host is accepted. A save that finds the listing no longer the caller's (403) or gone
  (404) shows the same failure alert.
- **Components.** The dialog composes the library's `dialog`, `alert`, `text-field`, `textarea` and
  `file-field`. `dropzone` is not built: no screen of this journey draws it (the story editor's
  journey will).

## Consequences

- A migration adds `ContactEmail`, `PendingName`, `PendingKind` and `PendingSince` to
  `DirectoryListings`. No new deployed setting.
- A notification telling the owner a waiting name was approved or declined is left to a later
  journey, with its kind.
- The member app's conversation does not show the listing's contact email until a mock draws it.
