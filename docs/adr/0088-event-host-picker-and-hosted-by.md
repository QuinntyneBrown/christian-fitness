# 0088. Event host picker and the Hosted by card

## Status

Accepted, 25 November 2026 (journey 7, issue 157). Builds on ADR 0067 and ADR 0082.

## Context

ADR 0067 asks every event to have a Listed host that an Admin chooses in the event editor, and
ADR 0082 already gave `Event` a non-null `HostListingId` that defaults to the team listing, with
the migration that backfills it. Journey 6 (ADR 0087) lists a listing's hosted one-off events on
its profile. What is left is the editor's Host picker (`L2-022` AC1, AC11, AC12) and the event's
"Hosted by" card (`L2-010` AC4). The requirement, design and mocks leave these open: how the
editor finds the default and the matches, the refusal codes, what a choice in the picker is
(the mock draws links), what a failed search shows, and what a member's event answer carries.

## Decision

- **Endpoints.** Under `api/admin/events`, so the Staff policy and the Admin role apply (ADR 0011,
  ADR 0020): `GET /api/admin/events/hosts?q=` answers `{ hosts }`, at most 10 `Published`
  directory listings whose folded name contains the folded search (2 to 100 characters, the
  directory's rules: `LIKE` with escaped wildcards, ADR 0082), in name order, each as
  `EventHostDto` (`id`, `kind` slug, `name`); a search under 2 characters answers none, and one
  over 100 is 400 with code `query_too_long`, as the directory's is.
  `GET /api/admin/events/hosts/default` answers the team listing (ADR 0067's stable id) as an
  `EventHostDto`. `GET /api/admin/events/{id}` adds `host`, the saved host as an `EventHostDto`.
- **Saving.** Create and edit take `hostListingId`. A missing one is refused with
  `fieldCodes.hostListingId` = `host_required`; one that is not a `Published` listing (unknown,
  a draft or a removed listing) with `host_not_listed`; both under 400 `validation_failed`, and
  nothing is saved. The editor shows both as "Choose a Listed host" at the Host field
  (`f-host`) and in the error summary, after Category, as the mock orders the fields.
- **The picker.** The Host field is a text field labelled "Host (required)" with the hint
  "Choose a Listed directory listing." A new event asks for the default when the editor opens and
  shows its name; editing shows the saved host's name. Any edit of the text clears the choice.
  From 2 characters, 250 ms after the last key (a timer cleared on each key and on close, as the
  events search does), the editor asks for matches and shows them under the field as stacked
  pick cards titled "Matching hosts", each "<name>" with "<Kind> · Listed". The mock draws them
  as links; inside a form a choice is a `button` (`pick-card` gains a button form in the design
  system's `pick-list` page), and choosing one sets the field to its name, hides the list and
  returns focus to the field. No match shows the mock's status line, "No Listed hosts match
  “<search>”. Try another search."
- **Stand-ins for undrawn states.** A search that fails shows a status line in the same place,
  "Couldn't search hosts. Check your connection and type again."; a default that fails to load
  leaves the field empty for the Admin to search, and a save without a choice is refused as
  above. No mock draws either; they are recorded here rather than invented in a mock.
- **Hosted by.** `GET /api/events/{id}`, and the register and cancel answers that share its shape, add `host`: `id`, `kind`, `name`, `isVerified` and
  `photoKey`, read through `HostListingId`; the field names match the directory's. The member
  page shows the library's `host-card` under the registration card in the aside, replacing the
  line "Posted by the Christian Fitness team": the listing mark (initials, or the photo once
  listings have one), "Hosted by · <Kind>", the name as text and, when verified, the verified
  mark named "Verified". It links to `/directory/{id}` and routes in the app on a plain click.
  The card shows the event's host whatever the listing's status: the event keeps its host
  (ADR 0067), and a host that is no longer listed opens the profile's not-found view.

## Consequences

- Every event read for a member joins one listing row; the foreign key guarantees it exists.
- The test host's InMemory store holds the team listing from the start, as the migration
  guarantees in a real database, so every event created with the default host can be read.
- The series editor's host (journeys 9 to 11, issue 159) reuses the same endpoints, codes and
  picker.
