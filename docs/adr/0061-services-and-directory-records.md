# 0000. Services and directory records

## Status

Accepted, 24 November 2026 (resolves issue 71; mocks open question 5).

## Context

Danielle Okafor, Tasha Grant and Rev. James Whitfield are both a Services professional (a vetted
application, bookable care) and a directory listing (a member's suggestion, community discovery), with
different copy. The console has Services (applications) and Listings (suggestions). The directory,
event-host and messaging designs waited on whether this is one record or two.

## Decision

- **Two records, two reviews.** `ServiceListing` (made when staff approve an application, reviewed under
  Services) and `DirectoryListing` (made from a suggestion, reviewed under Listings) stay separate, each
  with its own review, status and copy. They serve different purposes. Neither reuses the other's type.
- **Linked through the owning member.** Each record may name its owning member (`ServiceListing`'s
  professional member; `DirectoryListing.MemberId`, set when the listed party claims it). When one member
  owns both, each profile shows a cross-link: the directory profile "Also offers services" (to the
  Services listing), the Services detail "Also in the directory" (to the listing). A link is shown only
  to the other record's published state; an unpublished or removed one shows no link.
- **Optional staff link.** Staff may set `DirectoryListing.ServiceListingId` (nullable, no cascade) from
  Listings, for a person whose two records have no common member yet. Setting it never merges, publishes
  or changes either record; removing a Services listing clears it (ADR 0056). The cross-link shows when
  the owning member matches or this id is set.
- **Same conversation.** Direct conversations are keyed by the two members (ADR 0043), so Message from
  either profile reaches the same owner and the same thread. A listing with no owning member keeps the
  open question about its recipient (mocks open question 6).
- **Copy.** Each record keeps its own copy; the three people's seeds are not forced to match, because the
  Services text describes care and the directory text describes the person's part in the community.
- **Mock.** The `listing-profile` person state (Danielle Okafor) gains the "Also offers services" link.

## Consequences

- No shared review, no merge and no migration of existing rows; one nullable column on the directory table.
- Event hosts (`HostListingId`) and follows stay on `DirectoryListing`; booking stays on `ServiceListing`.
- The Listings editor needs a field for the optional link when the listing designs are built.
