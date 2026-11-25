# Claim a listing

## Overview

Christian Fitness is a Christian community for health in body and spirit in the Greater Toronto Area. When staff approve a listing suggestion (`L2-073`), nothing is published until the listed party says yes (`L1-017`, `L1-023`). This feature is how they say it: a claim link, a claim screen, and the rules for who receives the link.

- **claim link** — single-use address `/claim/{token}` that lasts 14 days; only a hash of the token is stored (`ListingClaim`)
- **claimer** — the signed-in member who opens the link and answers it
- **staff-managed listing** — a listing published by staff with no owner, because nobody can be reached to claim it
- **self-submission** — a suggestion with the relation Myself (`docs/detailed-designs/directory/suggest-listing/`)

This feature covers the Claim a listing screen of the Member web app at `/claim/:token` (mock `docs/mocks/pages/claim-listing/`, states `default`, `signed-out`, `loading`, `busy`, `published`, `declined`, `expired`, `claimed` and `error`), requirement `L2-075`, and the sending of the link when staff approve (`docs/detailed-designs/admin-directory/review-listing-suggestions/`). Editing afterwards is `docs/detailed-designs/directory/edit-listing/`.

## Description

The feature is a vertical slice from the link to the database. No part of it exists in the codebase yet; every name below is introduced by this design.

### Member web app (`projects/web`) and libraries

- **`ClaimListingPage`** — routed page at `/claim/:token`, loaded with `loadComponent`, outside the signed-in guard so a visitor can see why they must sign in. Its `providers` bind `LISTING_CLAIMS_SERVICE` to `HttpListingClaimsService`. Phases are `checking`, `signed-out`, `ready`, `publishing`, `failed` and the outcomes `published`, `declined`, `expired` and `claimed`, held as a signal.
- **Signed out** — names the listing and offers Sign in and Join; both carry a return address to the same link, so the visitor lands back on the claim screen (`L2-075` AC4).
- **Ready** — the listing as it will appear, built from `listing-mark`, `tag`, `key-facts` and the existing `form-page`, with "Publish my listing" and "This isn't me", and a line that the link works once and when it expires.
- **Busy** — "Publishing…", both answers `disabled`, `aria-busy="true"` (`L2-075` AC6).
- **Outcomes** — the existing `done` panel: "Your listing is live" (focused, `role="status"`), "Thanks for letting us know", "This link has expired" and "This listing has already been claimed" (`role="alert"`). Expired reads "This link has expired. Ask us for a new one."
- **Failed** — an `Alert` above the listing; nothing was published and both answers stay available.
- **`ListingClaimsApi` / `LISTING_CLAIMS_SERVICE`** — contract and token in `projects/api/src/directory/`: `get(token)`, `publish(token)`, `decline(token)`. Errors carry the codes below and the screen branches on them; the user sees the sentences above, never the code.

### Christian Fitness API

- **`ListingClaimsController`** — `api/claims/{token}`: `GET` sends `GetClaimQuery`; `POST .../publish` and `POST .../decline` send one command each. The token is a route parameter recorded as its template, never as its value.
- **`ListingClaim`** — domain entity: `ListingId`, `TokenHash`, `CreatedAt`, `ExpiresAt` (14 days after creation, from `TimeProvider`), `SpentAt`, `VoidedAt`. `Publish(member, now)` and `Decline(now)` hold the rules: an expired claim throws the domain refusal `claim_link_expired` (410), a spent or voided one `claim_link_used` (409), an unknown token is 404 `claim_not_found` with no hint whether a listing exists.
- **`DirectoryListing`** — gains `OwnerId` (nullable), `IsStaffManaged` and the status `Declined` next to `Draft` and `Listed`. `Publish` sets `Listed` and `OwnerId`; because a self-submission is claimed by its sender, the listing is then linked to the sender's account. `Decline` sets `Declined`, publishes nothing and contacts no one.
- **`PublishClaimHandler`, `DeclineClaimHandler`** — in one unit of work they apply the domain method, spend the claim and write the audit entry (`listing.claimed`, `listing.claim_declined`), the second also telling staff through the existing work-awaiting-staff count (`docs/adr/0060-work-awaiting-staff.md`). Both require an authenticated member (the fallback policy); only `GET` is `[AllowAnonymous]` and it returns the listing preview only once the caller is signed in, otherwise 401 so the page shows the signed-out state with the listing's name from a second anonymous `GET .../name`.
- **`ClaimLinkSender`** — called by `ApproveSuggestionHandler` with a fresh token (cryptographically random, 32 bytes, stored as SHA-256 hash). If the suggestion has an email it goes through `IEmailSender`. If not and the relation is Myself, it writes a `DirectMessage` from the Christian Fitness account to the sender (ADR for the sender account, issue #72) containing the link. Otherwise it creates no claim and the handler publishes the listing as staff-managed (`L2-075` AC1 to AC3).
- **Resend** — `POST /api/admin/directory/listings/{id}/claim-link/resend` (`ResendClaimLinkCommand`, Admins only) voids the open claim and creates a new one, then sends it as above. The admin screen for it is `<TO SUPPLY>`.
- **Audit and telemetry** — no span, metric or log carries the token, the email or the listing's words (`L2-075` AC11).

### Open questions

- **Admin resend.** Listed has no mock for a resend action yet; `docs/mocks/README.md` open question 9 notes it.
- **Staff-managed listings and messaging.** They cannot be messaged; how the Message button reads for them is decided with issue #74.

## Requirements

| Requirement | Traces to | Summary |
|---|---|---|
| `L2-075` | `L1-017`, `L1-023` | Claim link, claim screen, who receives the link, publish or decline |
| `L2-073` | `L1-023` | Approval makes the draft and sends the link |
| `L2-062` | `L1-017` | Self-submission and the outcome message |

## Diagrams

### Behaviour — send the claim link

On approval the handler stores a hashed, 14-day claim and sends the link by email, by direct message to a self-submitter, or not at all (a staff-managed listing). Staff can resend, which voids the old link.

![Sequence diagram: send the claim link](diagrams/sequence-send-link.png)

### Behaviour — claim a listing

A signed-out visitor signs in first. A valid link shows the listing; Publish makes it Listed and owned, This isn't me declines it; unknown, expired and used links are refused with their codes.

![Sequence diagram: claim a listing](diagrams/sequence-claim.png)

### Class structure

`ClaimListingPage` depends on `ListingClaimsApi`; `ListingClaim` publishes or declines its `DirectoryListing`; `ClaimLinkSender` creates the claim and chooses the channel.

![Class diagram: claim a listing](diagrams/class.png)
