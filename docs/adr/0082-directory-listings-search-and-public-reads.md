# 0082. Directory listings, search and public reads

## Status

Accepted, 25 November 2026 (journey 5, issue 155). Amends ADR 0077's search mechanism.

## Context

Browsing the directory (`L2-054`) is the first slice that stores directory listings. The design
left open how the record is shaped, how a search ignores accents on both PostgreSQL and the
InMemory test store, who may read the list, how a listing's hosting count is found before event
hosts exist, and what the screen shows for the Follow button (journey 8) and the listing profile
(journey 6) that are not built yet. `L2-034` AC4 counts anonymous directory reads under
`public-reads`, which ADR 0072 defined but nothing implemented.

PostgreSQL refuses `LIKE` and `ILIKE` on a column with a nondeterministic collation before
version 18, so ADR 0077's `und-u-ks-level1` collation on `Name` cannot serve a "contains" search,
and it would not cover tagline, area or focus either.

## Decision

- **Record.** `DirectoryListing` (in `ChristianFitness.Domain/Directory/`) holds `Id`, `Kind`
  (`ListingKind`: Organization, Person, Instructor, Ambassador, Company, ChurchMinistry, declared
  in the directory's order), `Name`, `Tagline`, `Area`, `Description`, `Focus` (tags),
  `WebsiteUrl`, `PhotoKey`, `IsVerified`, `Status` (`ListingStatus`: Draft, Published, Declined,
  Removed; "Listed" in the console is `Published`), `ListedAt`, and the optional `MemberId`,
  `SuggestionId` and `ServiceListingId` of ADR 0061. Only `Published` is ever listed.
- **Search key.** The listing keeps two derived columns, rebuilt whenever its text changes:
  `NameKey`, the name folded to lower case with accents removed, and `SearchText`, the folded
  name, tagline, area and focus tags joined by line breaks. A search folds `q` the same way and
  matches `SearchText` containing it. PostgreSQL gets the `pg_trgm` extension and a trigram GIN
  index on `SearchText`, so the "contains" stays fast. The fold is one helper in the domain
  (Unicode decomposition, combining marks dropped, invariant lower case), so tests on InMemory
  and production on PostgreSQL agree. This replaces ADR 0077's collation; its limits stand: `q`
  under 2 characters after trimming is absent and over 100 is refused with 400 `query_too_long`.
- **Order and paging.** Rows are ordered by kind, then `NameKey`, then id, 50 to a page after an
  opaque cursor over those three values (as `EventCursor`). A malformed cursor is 400
  `validation_failed` with `fieldCodes.cursor` = `cursor_invalid`; an unknown kind is
  `fieldCodes.kind` = `kind_invalid`. The member app keeps at most 200 rows and then says
  "Showing the first 200. Narrow your search." (`L2-009` AC7; the `capped` mock said 100 and now
  says 200).
- **Kinds in the address and the API.** A kind is its ADR 0071 slug (`organization`, `person`,
  `instructor`, `ambassador`, `company`, `church-ministry`) in `/directory?kind=` and in the API's
  `kind` parameter and row field. The answer carries `counts`, one `{ kind, count }` per kind in
  order, of every published listing whatever the search; the app sums them for All.
- **Anonymous reads.** `GET /api/directory` is `[AllowAnonymous]`: it returns only what a
  published listing publishes. It uses the `public-reads` rate-limiter policy of ADR 0072: a
  sliding window of 120 requests a minute in 6 segments per client address
  (`ClientAddressPartition`), counting requests without a session; a signed-in member's reads are
  not counted. A refusal is 429 ProblemDetails with code `too_many_requests` and a `Retry-After`
  header in seconds. The member screen stays behind the member guard.
- **Hosts and hosting count.** `Event` gains a non-null `HostListingId`, defaulting to the stable
  id of the Listed Christian Fitness team listing (ADR 0067). The migration inserts that listing
  when it is missing, then adds the column with that default, so every existing event is the
  team's; the event editor's Host picker is journey 7. A listing's hosting count is the number of
  published events it hosts that have not started; series join the count when they exist
  (journey 9).
- **Seed.** `cf seed` adds the team listing by its stable id. The eleven sample listings of the
  mocks are added only when `Seed__DirectorySamples` is `true`, for demonstration and staging
  systems: a production directory never shows invented people as Verified. Each is keyed by its
  own stable id, so a second run changes nothing.
- **Not yet built.** The Follow button (journey 8) is left out of each row rather than shown
  inert, the "Suggest a listing" links of the page head and the no-results state wait for that
  screen (journey 17), and a row is not a link until the listing profile exists (journey 6): its head renders
  as the mock's non-link `div.listing-row__link`. A photo is shown when `photoKey` is set, served
  by the listing editor's image endpoint (journey 20); until then no listing has one.

## Consequences

- `L2-054` AC4 now names the folded search column and trigram index instead of the collation;
  ADR 0077's search bullet is superseded.
- Journeys 6 and 8 add the row link and the Follow button to `listing-row` without changing its
  inputs' meaning; journey 7 adds the Host picker over the same `HostListingId`.
- `Seed__DirectorySamples` is documented in `docs/operations/settings.md`.
