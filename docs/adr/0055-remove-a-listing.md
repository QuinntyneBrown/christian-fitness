# 0055. Remove a listing

## Status

Accepted, 24 November 2026 (slice 23.2).

## Context

The design (admin-services, edit and remove listings) described removal as an unpublish that sets
`IsPublished` to false and records `RemovedAt`, and left two items to supply: the form of the
confirmation and whether removal is a soft or a hard delete. The mocks drew no Remove control.

## Decision

- **Hard delete.** `DELETE /api/admin/services/listings/{id}` deletes the `ServiceListing` row and
  answers 204. The system has no `IsPublished` column, and every member call (Services list, detail,
  contact link, Message, booking request) already reads the table, so all of them answer 404
  `service_not_found` at once, with no filter to forget and no migration. A direct conversation is the
  pair of members (ADR 0052), not the listing, so conversations and messages are untouched. The
  approved application keeps its record; nothing re-lists it, and a professional may apply again.
- **Errors and access.** A missing or already removed listing is 404 `service_not_found` (ADR 0051), so
  a repeated request is refused and leaves no second audit entry. The route sits under
  `api/admin/services`, so a Moderator gets 403 `forbidden_role` and a member or nobody gets 401.
- **Audit.** `RemoveListingCommand` is an `IAuditableCommand` named `listing.removed`; the entry holds
  the actor, action, `ServiceListing`, the id and the time, no text (ADR 0023).
- **Mock.** A hand-written dialog `remove-listing` with `default` (names the professional, "Keep
  listing" and "Remove listing", saying conversations stay), `busy` ("Removing…") and `failed`
  ("Couldn't remove the listing", the listing is still on Services), built like `cancel-event`. The
  Manage Services table in the mock gains a Remove action beside Edit.
- **Screen.** The library `table` gains an optional second row action (`secondActionLabel` and
  `secondAction`), because a row needs Edit and Remove. Remove opens a CDK Dialog imported on first use
  (the pattern of Cancel event); keeping it, Close, Escape and the scrim leave the listing alone; a
  refusal other than 404 keeps the dialog with the failed message; 404 counts as removed. A removal
  shows a "Listing removed" toast and reloads the list with its rows kept.

## Consequences

Removal cannot be undone, as the dialog says; the audit entry is the only trace of which listing went.
If a later requirement needs to restore listings, a soft delete and a migration would be added then.
