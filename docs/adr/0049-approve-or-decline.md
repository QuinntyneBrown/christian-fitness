# 0049. Approve or decline an application

## Status

Accepted, 24 November 2026 (slice 21.2).

## Context

L2-025 AC2 and AC3 let an Admin approve a pending professional application, which publishes a
listing, or decline it with a reason, which publishes nothing; either leaves the queue. The detailed
design (`docs/detailed-designs/admin-services/review-applications/`) left the refusal code, the
longest reason, the decline dialog and whether the applicant is told to supply, and the mocks drew
Approve and Decline buttons that went straight to the `decided` state with no reason field. The
queue (ADR 0048) and the application (ADR 0047) already exist; browsing listings (slice 16.1) and
editing and removing them (slice 23) are later slices.

## Decision

- **Endpoints.** `POST /api/admin/services/applications/{id}/approve` (no body) and
  `POST .../{id}/decline` with `{ "reason": "..." }`, on the queue's controller, so the Services
  area's policy applies as it is: an Admin is answered, a Moderator is refused 403 `forbidden_role`,
  a member or nobody 401. Each sends one MediatR command. Both answer `200` with
  `{ applicationId, status: "approved" | "declined", listingId }`; `listingId` is null for a decline.
- **The listing.** Approving adds a `ServiceListing` in the same save that marks the application
  `Approved`: the applicant's name as it is at that moment (so a later rename does not touch a
  published listing), and the application's role, category, credentials, where, price and about,
  `PublishedAt` and the source application. One listing per application (a unique index). There is
  no `IsPublished` flag: a listing that exists is published, and slice 23 removes the row.
- **The decision.** `ProfessionalApplication.TryApprove` and `TryDecline` own the transition from
  `Pending`; a decided application answers false. The application also records `DecidedAt` and,
  for a decline, `DeclineReason`.
- **Reason.** Required (`reason_required`) and at most 500 characters once trimmed
  (`reason_too_long`), named in the 400's `fieldCodes.reason`. It is stored trimmed on the
  application so staff can read it later, is never logged or put in an audit entry, never
  appears in a response, and the command is a class so no generated `ToString` can print it. The
  applicant is not sent it, and is not notified of the decision in this slice: members reach no
  notification system yet and a declined member may apply again (ADR 0047).
- **Refusals.** An unknown id is 404 `application_not_found`; one already approved or declined is
  409 `application_decided`. Neither changes anything and neither leaves an audit entry. The
  screen treats both the same way: someone else decided it, so it says so and shows the queue as it
  is now.
- **Audit.** Both commands are `IAuditableCommand` (ADR 0023): `application.approved` and
  `application.declined`, recorded against the record type `ProfessionalApplication` and the
  application's id, in the same save as the change.
- **Screen.** Each card has Approve and Decline buttons named for the applicant ("Approve Lena Park,
  RD"). Approve decides at once (the button is busy meanwhile); Decline opens the CDK dialog
  `DeclineApplicationDialog`, imported on the first Decline, with the reason field. A decided card
  stays in the list and says "Approved, now listed" or "Declined" (mock `admin-services/decided`),
  keeps focus on that sentence, and the count above the list falls. An approval that does not go
  through shows an alert above the list (mock `admin-services/failed`); a decline that does not
  shows it in the dialog (mocks `decline-application/failed` and `refused`) and keeps the reason.
- **Mocks.** The prototype has no reason field, so the dialog mock `decline-application` (five
  states) and the page state `failed` were added, in the generator sources and, as in slice 22.1,
  written by rendering only those screens (the generator's full build was not run, so no other mock
  changed beyond the Decline buttons now opening the dialog).
- **Not here.** The live listings table (slice 23) is still not drawn: the decided state's
  evidence is the card itself. The queue's `total` is not re-fetched after a decision; the page
  lowers the count it holds by the cards decided in this visit and the next load is exact.
- **No design-system component.** The decision line and the button pair follow the mock's
  `decision` and `btn-grid`, styled in the page's stylesheet over the library's `cf-button`,
  `cf-alert`, `cf-dialog` and `cf-textarea`, as ADR 0048 did for the card.

## Consequences

- Slice 16.1 can read `ServiceListings` by category and `PublishedAt`; slice 23 adds edit and remove
  to the same table.
- A migration (`AddServiceListings`) adds the table and the application's `DecidedAt` and
  `DeclineReason`; the API does not migrate on startup, so `cf migrate` must run before deploying.
- The admin initial bundle measures 280.35 kB (280.34 kB before, +10 bytes), 351 bytes over the
  280 kB warning and under the 290 kB error. The dialog, its field and the decision helpers are lazy
  chunks; the small difference is the page's own code. No budget was
  raised.
