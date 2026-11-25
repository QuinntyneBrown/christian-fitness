# 0091. Claiming a listing: one anonymous read, publish and decline, the codes, resend from Suggestions, and the signed-out route

## Status

Accepted, 25 November 2026 (journey 19, issue #169). Builds ADR 0064, ADR 0065 and ADR 0090; amends
the detailed design `directory/claim-listing`.

## Context

`L2-078` asks the listed party to open `/claim/{token}`, sign in or join, and publish their listing
or say it is not them; expired, used and unknown links are refused, and staff can resend a link.
ADR 0090 already issues the claim (`ListingClaim`, the SHA-256 hash of a 32-byte token, 14 days)
and sends it by email or as a direct message from the Christian Fitness account. The design left
these open or drew them differently from what the codebase now holds: a second anonymous
`GET .../name` beside a `GET` that answers 401 signed out; an `OwnerId` and an `IsStaffManaged`
flag where `DirectoryListing` has `MemberId` and ADR 0090 publishes a staff-managed listing with no
member; a resend screen marked `<TO SUPPLY>`; how staff are told of "This isn't me"; what a voided
link reads; what an unknown token shows; and how Join returns to the link. Join had no return
address at all.

## Decision

- **Endpoints.** `ListingClaimsController` at `api/claims/{token}`; each action sends one MediatR
  request. The token is a route value, so a span records the template `api/claims/{token}`.

  | Request                                                | Who                   | Answer                                    |
  | ------------------------------------------------------ | --------------------- | ----------------------------------------- |
  | `GET api/claims/{token}`                               | anyone (public reads) | `{ name, expiresAt, listing }`            |
  | `POST api/claims/{token}/publish`                      | a member              | `{ listingId }`                           |
  | `POST api/claims/{token}/decline`                      | a member              | `{ listingId }`                           |
  | `POST api/admin/directory/suggestions/{id}/claim-link` | Directory area        | the suggestion's panel, as `GET` gives it |

  `listing` is the preview (kind, name, tagline, area, about, focus, website, verified, photo key)
  for a signed-in caller and `null` for anyone else, so a visitor learns the name and the expiry
  and nothing else (AC4). One read replaces the design's two.

- **Codes.** An unknown token, or one longer than 128 characters, is 404 `claim_not_found`. A link
  past its 14 days, or voided by a resend, is 410 `claim_link_expired`: a voided link has not been
  claimed, so "already claimed" would be untrue, and its holder should ask for the new one. A spent
  link, or one whose listing is no longer a draft, is 409 `claim_link_used`. The read, publish and
  decline check in that order: unknown, used, expired. None of the answers says whether a listing
  exists.
- **Publish.** In one unit of work the draft becomes `Published` ("Listed") with
  `MemberId` the claimer and `ListedAt` now, the claim is spent (`UsedAt`), and the audit entry
  `listing.claimed` records the claimer and the listing. A self-submitter is the claimer, so their
  listing is linked to their account. There is no `OwnerId` or `IsStaffManaged`: the owner is
  `MemberId`, and a staff-managed listing is a published one with none (ADR 0090).
- **Decline.** The draft becomes `ListingStatus.Declined`, the claim is spent, the audit entry is
  `listing.claim_declined`, and nobody is contacted. Staff are told where they decided it: the
  approved suggestion's panel reads "Approved. They said this listing isn't them, so it wasn't
  published." The suggestion's panel (`GET suggestions/{id}`) gains `claim`: `sent`, `expired`,
  `claimed`, `declined` or `staff-managed` for an approved suggestion, `null` otherwise.
- **Resend.** `POST api/admin/directory/suggestions/{id}/claim-link`, in the Directory area that
  an Admin and a Moderator open (ADR 0064, ADR 0090), not the design's Admin-only
  `listings/{id}/claim-link/resend`: Listed shows only published listings, and the approved
  suggestion is where staff see the link was sent. It voids every open claim of the suggestion's
  listing (`VoidedAt`), issues a new one and sends it by the channel approval used: the email, or
  the direct message to a self-submitter. Audited `listing.claim_link_resent`. A suggestion that is
  not approved, or whose listing is no longer a draft, is 409 `claim_closed`; an unknown one 404
  `suggestion_not_found`. The panel of an approved suggestion whose claim is `sent` or `expired`
  offers "Send a new link"; it reads "Sending…" while it waits, and a toast says "New link sent"
  with "The old link no longer works." A failure toasts "We couldn't send a new link" with
  "Nothing changed. Try again in a moment." (mocks `admin-listings/approved`,
  `resending`, `link-resent`, `resend-failed` and `claim-declined`).
- **Routes.** `/claim/:token` is two routes. Before the member shell, a `canMatch` guard
  (`signedOutGuard`) matches only when `GET /api/session` is 401, and loads the signed-out page in
  the auth layout (mock `signed-out`), as the app's Sign in screen uses it for the mock's sign-in card. Otherwise the member shell's child loads the claim page with
  the member header. Sign in and Join carry `returnUrl=/claim/{token}`; Join now follows a return
  address with the rule sign-in uses (`signInReturnPathOf`), so a crafted one opens Home.
- **States the mocks do not draw.** An unknown token shows the app's 404 (mock `not-found`), as a
  listing's profile does. Signed out, an expired or used link shows the auth layout's notice with the
  same headings and sentences as signed in, with Sign in (mocks `signed-out-expired` and
  `signed-out-claimed`), and "Checking your link…"
  while the read waits. A decline that fails shows the alert "We couldn't send your answer" with
  "Something went wrong on our side. Nothing changed, so try again in a moment." A publish or
  decline refused as expired or used shows that outcome. A read that fails with a 5xx opens the
  server-error screen, as every `GET` does.
- **Words.** The expiry is the date in Toronto, "December 9". The hint reads "Signed in as {name}.
  Publishing makes you the owner, so you can edit it later. This link works once and expires on
  {date}." A draft made from a suggestion has no tagline, about or focus tags yet; the preview
  leaves out what is empty.
- **Components.** The screen is built from `form-page` (now with an optional aside, the mock's
  `form-page--flush`), `listing-head` (with `nameLevel` so the name is a paragraph under the page's
  `h1`), `done` (with `alert` for the expired outcome's `role="alert"`), `alert`, `tag-list`,
  `description-list`, `button`, `skeleton`, `error-page` and `auth-layout` (whose note line may now
  stand without a link). The issue named `section-heading` to build first; the classes it defines
  that this screen uses (`page-title`, `eyebrow`, `subtitle`, `detail-title`) are drawn inside
  those components, as every screen since slice 1.1 draws them, so no standalone component was
  added: one with no consumer would be dead code.

## Consequences

- Journey 20 (edit my listing) builds on `MemberId` as the owner and on the claimed listing.
- A migration adds `ListingClaims.VoidedAt`. No new deployed setting: the link still starts with
  `MemberApp__BaseUrl`.
- The design's sequence and class diagrams follow this ADR.
