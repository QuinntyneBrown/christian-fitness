# 0085. Listing profile: one read, connections, listing messages and the services cross-links

## Status

Accepted, 25 November 2026 (journey 6, issue 156). Builds on ADR 0061, ADR 0066 and ADR 0082.

## Context

The listing profile (`L2-055`; design `directory/view-listing-profile`) is the first screen that
reads one directory listing, its connections and its owner. The design left a code and a cap to
supply, and several parts it describes depend on journeys not yet built: following (journey 8),
event series (journeys 9 to 11), claims (journey 19), the owner's editor (journey 20) and the
"Let anyone message me" preference (journey 34, `L2-065`). ADR 0061 asks for the "Also offers
services" and "Also in the directory" links, which no mock drew.

## Decision

- **One read.** `GET /api/directory/{id}` answers a `Published` listing as a `ListingProfileDto`:
  `id`, `kind` (slug), `name`, `tagline`, `area`, `description`, `focus`, `websiteUrl` (as stored),
  `isVerified`, `photoKey`, `followers`, `listedYear` (the year of `ListedAt` in Toronto),
  `hasOwner`, `hosting`, `connections` and `serviceListingId`. Anything else, an unknown id
  included, is 404 with code `listing_not_found`. Like the list, the read is `[AllowAnonymous]`
  under the `public-reads` policy (ADR 0082): it carries only what the listing publishes, never a
  member id, contact detail or the owner's name. The member screen stays behind the member guard.
- **Website.** The API serves the stored address; the app shows it only when it is an absolute
  `https` address with a host (one pure helper, `websiteLinkOf`), as a link that opens a new tab
  with `rel="noopener noreferrer"` and the hidden words "(opens in a new tab)". Any other address is
  not shown, neither as a link nor as text (`L2-055` AC5, ADR 0077). A directory listing has no
  other contact field, so for a listing with no owner its website is the contact offered.
- **Hosting.** The one-off events the listing hosts (`Event.HostListingId`) that are published and
  have not started, in start order, at most 20 rows (the cap the design left to supply); the head's
  count is the number of all of them, the same rule as the directory row's. Each row carries
  `id`, `title`, `category`, `startsAt`, `place` and `imageKey`; the app words it in Toronto time.
  Series rows join first when series exist (journey 11); until then none is served.
- **Connections.** A new `ListingConnection` record (`ListingId`, `ConnectedListingId`,
  `Relation` of 1 to 60 characters, unique per pair, both foreign keys cascading) holds a relation
  worded from the first listing's side. The profile serves those whose connected listing is
  `Published`, in the directory's order (kind, then folded name), each as `id`, `kind`, `name`,
  `photoKey` and `relation`. Staff and owners set them in the listing editors (journeys 18 and
  20); until then `cf seed` adds the mocks' connections between the sample listings only when
  `Seed__DirectorySamples` is `true`, idempotently.
- **Listing messages.** `POST /api/directory/{id}/conversation` (authenticated) answers
  `{ memberId }`, the owner (`DirectoryListing.MemberId`), whose direct conversation Messages then
  opens. An unknown or unpublished listing is 404 `listing_not_found`; a published listing with no
  owner is 409 `listing_unreachable`; a suspended owner or the caller's own listing is 403
  `recipient_unavailable`, as for any direct message. Nothing is stored (ADR 0043).
- **The preference exception.** `L2-065`'s "Let anyone message me" does not exist yet (journey 34),
  so today every member may start a conversation with any other and the exception of ADR 0066
  holds without a check. Journey 34 adds the setting and, with it, the listing context on the
  history, join and first-send requests that ADR 0066 asks the server to verify.
- **Cross-links (ADR 0061).** The profile's `serviceListingId` names the Services listing that the
  same member owns (`ServiceListing.MemberId` equals `DirectoryListing.MemberId`) or that staff
  linked (`DirectoryListing.ServiceListingId`), when it exists; the profile then shows "Also offers
  services" leading to `/services/<id>`. The Services listing gains `directoryListingId`: the
  published directory listing owned by the same member or linked to it, the oldest first when
  several match; its detail then shows "Also in the directory" leading to `/directory/<id>`. A
  Services listing is published while it exists (staff remove it by deleting it, ADR 0056). The
  mocks `listing-profile/person` and `services/selected` now draw both links.
- **Not yet built.** The Follow button is left out of the head, as of the directory rows, until
  journey 8; the follower count is served and shown, and reads 0 until follows exist. The owner's
  own view ("Edit listing" in place of Follow and Message, mock `listing-profile/owner`) is
  journey 20's; until then an owner sees Message, which is refused `recipient_unavailable` with a
  generic message. Directory rows now lead to the profile.

## Consequences

- `L2-055` and `L2-014` AC1, AC2 and AC6 are met for one-off events; the series rows of AC2 wait
  for journey 11.
- One migration adds `ListingConnections`; the seed gains the sample connections.
- `listing_not_found` and `listing_unreachable` are refusal codes the member app branches on.
