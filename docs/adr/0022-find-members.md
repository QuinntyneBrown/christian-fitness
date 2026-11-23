# 0022. Find members: one paged search, the URL as the screen's state, a registration count that answers none yet, and stand-ins until 25.1 and 27.1

## Status

Accepted, 23 November 2026 (slice 26.1).

## Context

Slice 26.1 lets staff find members on the admin Members screen (L2-028): 25 to a page, searched
by name or email, filtered by Active, Flagged or Suspended. It was built ahead of its place in
`docs/journeys.detailed.md`: nothing registers a member for an event before slice 6.1, nothing
reports a message before 25.1 and nothing flags or suspends a member before 27.1. The design left
four things `<TO SUPPLY>` (the sort order, what "events attended" counts, the search delay and the
form of pagination) and named a `MemberTable` component, which AGENTS.md now forbids beside the
library's table. The mocks disagreed with the requirement in three places: the search offered
"name, email or church" where L2-028 AC2 says name or email (and the design system says never to
filter members by faith details); the subtitle counted members joined this month, which no
requirement defines; and no mock drew the pages L2-028 AC1 implies or a status with nobody in it.

## Decision

- **One endpoint, `GET /api/admin/members?status=&q=&page=`,** under `api/admin/members`, so the
  staff area convention of ADR 0020 already opens it to Admins and Moderators alike (L2-019 AC1).
  The controller sends one `SearchMembersQuery`. The answer is
  `{ total, matches, page, pageSize, members: [...] }`: `total` counts every member of the
  community, `matches` those the search and status leave, and `page` is the page answered. A member
  is `{ id, name, email, homeChurch, joinedAt, eventsAttended, status }`, the status by its
  lower-case name (`active`, `flagged`, `suspended`) and the join date as an instant in UTC.
  Initials are not served: the avatar works them out from the name.
- **Newest joined first,** then by id, so the order is stable from page to page and the people
  staff most often need to look at, the newcomers, come first. A page past the last answers the
  last page; a page below 1, a status that is not one of the three or a search longer than 100
  characters is refused with 400 `validation_failed` (L2-028 AC6).
- **The search is a trimmed, case-insensitive "contains" on the name or the email,** never the
  home church. It is sent to the database as a value, so `%` and `_` are ordinary characters. The
  search term, the email and the home church are never logged or put on a span (L2-033).
- **Staff are members too,** so they are listed: L2-029 AC4 refuses staff suspending their own
  account, which presumes their row is there.
- **"Events attended" counts registrations,** as the design's overview says. It comes from
  `IRegistrationReader.CountsForAsync` (ADR 0015's reader), whose only implementation answers
  none until slice 6.1, so every member shows 0 until then; the API tests prove the pass-through
  with a fake reader.
- **The URL is the screen's state.** `/members?status=flagged&q=grace&page=2` names the tab, the
  search and the page; the tabs and the pages are links, the page reads the query and asks once
  for it, and Back, a reload and a shared link all show the same list. Typing waits 300 ms after
  the last key, then replaces the URL (no history entry per letter) and returns to page 1; a tab
  keeps the search and returns to page 1.
- **The library's components, none new.** The table gains a `person` cell (the design system's
  `table__person`: avatar, name, a muted second line) and a column's `empty` words for a cell
  with nothing in it; the screen composes it with the search field, tabs, status badge,
  pagination, skeleton region and empty state. There is no `MemberTable`.
- **A cell with no home church** shows an em dash that is `aria-hidden` beside visually hidden
  "Not given". The mock and the design system's pattern used `aria-label` on a `<span>`, which
  names nothing: ARIA does not allow a name on an element without a role.
- **Mocks changed before code.** The search placeholder is "Search name or email" and the
  no-results text no longer suggests the home church; the subtitle is the member count alone;
  `default` draws the pagination; `tab-empty` is new ("No flagged members"); `empty` lost its link
  to the landing page, which is another app's and slice 8.1's.
- **Stand-ins until 25.1 and 27.1.** The report banner above the tabs (mock `default`) arrives with
  reports (25.1) and its Suspend with 27.1; the moderation note and the row actions are 27.1's.
  The error state shows no reference, as on Events (ADR 0021): a failure the screen itself
  catches carries none. "No members yet" cannot be reached while a signed-in staff member is
  themselves a member; it stays as the answer to a `total` of 0.

## Consequences

- Slice 6.1 implements `CountsForAsync` over registrations and the Events column fills in with no
  change here.
- Slices 25.1 and 27.1 add the banner, the note and the actions to a screen whose list, filters
  and paging are already proved.
- A deep link to any page of any filter works, at the cost of one request per change of filter.
