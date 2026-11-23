# 0044. Home events

## Status

Accepted, 23 November 2026 (slice 13.1).

## Context

L2-007 AC1 and AC2 have Home show the member's next registered event and up to three suggested
events matching their interests; the detailed design left the suggestion order and the interest to
category rule as `<TO SUPPLY>`. Unread messages (L2-007's third part) and the mock's `partial` state
belong to slice 13.2, and the mock's aside (Messages, New professionals) to later slices.

## Decision

- **One request.** `GET /api/home` sends one `GetHomeQuery` and answers `{ nextEvent, suggested }`,
  each an `EventSummaryDto` (ADR 0027), so the app words dates and prices as it does for Events.
  Slice 13.2 adds its unread count to the same answer.
- **Next event.** The earliest published event with a start after now that the caller has a
  registration for. A cancelled event is not offered; `nextEvent` is `null` with none.
- **Suggested events.** Published, upcoming events of the categories the member's interests name,
  that they are not registered for, soonest first (then id), at most 3. Both queries are bounded in
  the database; the going counts of at most four events come in one question.
- **Interest to category.** One table in the domain (`InterestCategories`): running and
  walking-groups to Run, strength and cycling to Workout, basketball to Basketball, mobility to
  Mobility, nutrition to Workshop, retreats to Retreat. A member with no interest, or none that
  matches, has no suggestions, and Home leaves the "Coming up" section out.
- **Home page.** `HomePage` provides `HOME_SERVICE` on its routed component. The next event is the
  new library component `next-event` (the mock's `.next-event` block, which had no design-system
  page); the rows are `event-row` (given a `loading` form) in `list`; the invitation is
  `empty-state` card and the failure `empty-state` error. The greeting stays the session's
  `welcomeOf` (ADR 0007).

## Consequences

- The shared Playwright fixture answers `GET /api/home` with nothing by default, so every flow that
  lands on Home stays answered.
- The mock's second column is not drawn until 13.2 and the services slices; the main column keeps
  its `split--home` width so the page does not shift when they arrive.
