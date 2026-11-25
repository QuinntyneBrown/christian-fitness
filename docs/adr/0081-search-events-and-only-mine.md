# 0081. Search events and "Only events I'm going to": both live in the address and the API reads the member from the session

## Status

Accepted, 25 November 2026 (journey 4, Search events and see mine).

## Context

L2-075 asks for a "Search events" field and L2-076 for an "Only events I'm going to" checkbox on the
"By date" view of Events. They combine with the category chips (ADR 0030), restart pagination
(ADR 0027) and have a shared no-results state offering "Clear search and filters" (mocks
`events/search-no-results` and `events/going-empty`). The requirements leave several choices open:
where the selection lives, the parameter names, when typing asks the API, how history behaves, which
no-results wording wins when several filters apply, and whether the search has a length limit. The
Series view's search belongs to journey 10 and is not built here.

## Decision

- **The address holds the whole selection.** `/events?category=run&q=sunrise&going=true`, in that
  order, each left out when it is not set. Back, a reload and a shared link show the same list. The
  app reads the address through one pure helper (`eventListQueryOf`): `q` is trimmed and blank text
  is no search, `going` is on only for the exact value `true`, and the category is read as before.
  The category chips keep the search and the checkbox; the checkbox keeps the category and the
  search.
- **The API takes the same names.** `GET /api/events?q=&going=true` with `cursor` and `category`.
  The handler trims `q`, ignores it when blank, and keeps the published upcoming events whose title
  contains it in any case (`lower(title)` contains the lower-cased text, sent as a value so `%` and
  `_` are ordinary characters). `going=true` keeps the events the **signed-in member** holds a
  registration for, read from the session through `ICurrentMember`; the request names no member, and
  any other `going` value (or none) does not narrow the list. All filters apply before the order and
  the page, so the cursor pages inside the selection.
- **No length limit is added.** L2-075 states none, and Kestrel already bounds the request line.
  A search longer than any title simply matches nothing. The query is a class, not a record, so no
  generated `ToString` can print what a member typed (lesson 26.1), and nothing logs it (L2-040).
- **Typing waits 300 ms** after the last key, as the staff member search does (ADR 0022), then
  **replaces** the address, so a search is one place in history, not one a letter. The field is the
  member's while they type and the address overwrites it only when it names a different search.
  Escape clears the field (the library `search-field`). Ticking or clearing the checkbox, and
  choosing a chip, **push** a new address, as the chips already do.
- **Every change starts again.** Any new address resets the feed and the cursor and replaces the
  cards; the loading, error, "More events didn't load" and 200-event cap states apply unchanged.
- **No results.** With the checkbox ticked: "No events you’re going to" and "You have no upcoming
  registrations matching these filters." Otherwise, with a search: "No events match your search" and
  "Try another search or clear the search and filters." Both offer "Clear search and filters", which
  goes to `/events` (By date, unfiltered) and empties the field. A category alone keeps L2-009's
  "Nothing here yet" with Clear filter (ADR 0030).
- **Library parts only.** The field is the library's `search-field` labelled "Search events"; the
  checkbox is the library's compact `checkbox` placed after the chip bar's divider (`chip-bar`
  `divided`). The mock's `form role="search"` wrapper is not added: the field is named by its label,
  and the page has no submit.

## Consequences

- `EventsApi.page` takes the whole selection; `HttpEventsService` sends `q` and `going=true` only
  when set.
- The e2e fixture answers `q` and `going` as the API does, from a set of event ids the spec says the
  member is going to.
- The Series view's search (journey 10) reuses `q` and the same no-results wording.
