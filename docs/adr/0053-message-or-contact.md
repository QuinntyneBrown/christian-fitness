# 0000. Message or contact a professional

## Status

Accepted, 24 November 2026 (slice 17.1).

## Context

L2-014 has a member choose Message on a listing and open a direct conversation with the professional,
or, for a listing without a linked account, Contact and open the professional's published contact
link, with no contact detail shown until chosen. The detailed design left four points to supply: the
refusal codes, whether a suspended member may start a conversation, how a listing is "linked", and the
Contact variant, which no mock draws. Direct conversations in this system are the pair of members
(ADR 0043); there is no `Conversation` row.

## Decision

- **Linked.** Every `ServiceListing` carries `MemberId`, the applicant of its source application. A
  listing is _linked_ (Message) unless staff published a contact link for it, which takes its place
  (Contact). `ServiceListing.ContactUrl` is new, nullable, at most 2,000 characters, set through
  `TrySetContactUrl`, which accepts only an absolute http or https address with a host and no sign-in
  details (a blank clears it). Nothing sets it yet: the admin listing editor is slice 23, so until then
  every listing is messaged here.
- **Endpoints.** `ServiceListingDto` gains `hasContactLink` (a flag; the address is never in a list or a
  listing). `POST /api/services/{id}/conversation` answers `{ memberId }`, the professional, whose
  direct conversation Messages opens at `/messages/{memberId}`; nothing is stored.
  `GET /api/services/{id}/contact-link` answers `{ url }`. Both are 404 `service_not_found` for an
  unknown id; Message on a listing with a contact link is 409 `professional_not_linked`; Contact on
  one without is 404 `contact_link_not_found`. A suspended professional, an unknown one or the
  caller's own listing is refused 403 `recipient_unavailable`, the rule and code of a direct message
  (ADR 0043), by reusing `DirectChat.OtherNameAsync`. A suspended caller is refused as everywhere
  else by the session.
- **Telemetry.** Routes are recorded as templates; the link, a message and a conversation are never in
  a log, a span or a metric.
- **Card.** `ServiceDetail` gains `hasContactLink`, `busy`, `problem` and the outputs `startMessage`
  and `openContact` (not `message` or `contact`, which are DOM event names). Message or Contact is one
  secondary button; a failure shows a `cf-alert` above it. The page-level logic is one class,
  `ProfessionalContact`, provided on each page that shows the card, with `safeContactUrl` in
  `@cf/domain` unit-tested on the same rows as the backend's `TrySetContactUrl`.
- **Opening the link.** Contact is a button, not an anchor: the address must not be in the page until
  the member chooses it. The page asks, checks `safeContactUrl` again and calls
  `window.open(url, '_blank', 'noopener,noreferrer')`. A browser that blocks a window opened after a
  request shows nothing; the member can press Contact again.
- **Errors.** The screen branches on `recipient_unavailable` only ("This professional can't be
  messaged right now."); any other failure is a generic sentence.

## Deviations and stand-ins

- No mock draws the Contact variant or the failure alert; both stand in with the existing secondary
  button and `alert` components.
- "Request a booking" stays off the card (slice 17.2); Message is the sole action, drawn as in the
  mock (secondary).
- The mock's Message is a link to the conversation; here it is a button, because the conversation is
  asked for first.

## Consequences

- One migration (`AddServiceListingContactUrl`, a nullable column).
- A listing with a contact link cannot be messaged until staff clear it.
- The initial bundle is unchanged (web 280.21 kB, admin 280.35 kB); the client methods and the
  contact class are in lazy chunks.
