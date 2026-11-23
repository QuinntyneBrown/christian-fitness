# 0027. Browse events: one cursor-paged member list, a bounded feed and fallback images

## Status

Accepted, 23 November 2026 (slice 4.1).

## Context

Slice 4.1 gives members the Events screen (L2-009 AC1, AC4, AC5): the published upcoming events,
soonest first, in pages of 20. The design left four things open: the bound on the client's event
window, the code for a bad cursor, what a card shows for an event with no image (the image is
optional, ADR 0025), and the mock's search box and "Only events I'm going to" toggle, which L2-009
does not ask for. The category filter is slice 4.2; registrations are slice 6.1, so "going" has no
source yet.

## Decision

- **One endpoint.** `GET /api/events?cursor=` answers `{ events, nextCursor }` for any signed-in
  member. It lists only `Published` events whose start is after now, ordered by start then id,
  20 to a page. An event is `{ id, title, category, startsAt, place, area, priceCents, capacity,
going, imageKey }`; the screen words the date, time and price. A draft, a cancelled or a past
  event never appears (AC4). The category parameter joins in slice 4.2.
- **Cursor.** The cursor is the last item's start and id, encoded opaque. A malformed cursor is 400
  `validation_failed` with `fieldCodes.cursor` = `cursor_invalid`. `nextCursor` is null on the last
  page; a page holds 20 only when more remain, which the handler learns by asking for 21.
- **Going.** `IRegistrationReader` gains a batched count by event ids, so a page is one query; the
  stand-in answers 0 until slice 6.1, and the acceptance test swaps in a reader that answers numbers.
- **A bounded feed.** `EventFeed` in `domain` appends pages, drops events it already has and stops
  asking at 200 events (10 pages), ending the list with "Showing the next 200 events. Choose a
  category to see others." (mock `capped`). Nothing is dropped from the top, so scrolling up never
  loses a card and the page never jumps; AGENTS.md's "bound what grows" is met by the cap.
- **Loading the next page.** A sentinel after the grid, watched by one `IntersectionObserver`,
  asks for the next page when it nears the viewport; the observer ends with the page. The mock gains
  `loading-more` (a spinner) and `more-error` (the cards stay, "More events didn't load" with Try
  again).
- **Images.** A card shows the event's image from `GET /api/events/images/{key}` (ADR 0025). With
  none, it shows a bundled per-category photo from the mocks' set (Run, Workout, Basketball,
  Mobility; Workshop and Retreat reuse the Workout and Run photos until staff upload their own),
  served from the app's own `public/` folder, never a CDN.
- **Not built.** The mock's search box and "Only events I'm going to" toggle have no requirement in
  L2-009, and the toggle needs registrations (slice 6.1). They stay in the mocks and are not built
  until a requirement states them; the "Going" pill on a card arrives with registrations.
- **Navigation.** The member app's header lists the places that exist: Home and Events, with
  Events current on `/events` and on an event under it. Services and Messages join as their slices
  land.

## Consequences

- Slice 4.2 adds the `category` parameter to the same query and the chip bar to the same page.
- Slice 5.1 links each card to `/events/{id}`; until then a card links there and opens Not found.
- Slice 6.1 swaps the reader and adds the Going pill; the page needs no change for counts.
