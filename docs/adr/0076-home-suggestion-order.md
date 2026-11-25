# 0076. How Home orders suggestions

## Status

Accepted, 24 November 2026.

## Context

Area, interests and followed hosts each promise to shape what a member sees (L2-065 AC7, L2-056 AC7), but
events store only a free-text place (`Event.Area`, at most 100 characters), the requirements disagreed on
where the ordering applies (L2-065 AC7 named the landing page, which L2-001 AC8 redirects a signed-in member
away from), "Coming up" meant two lists, and the interest list differed between the mock and `Interests.All`.

## Decision

- **Where.** The ordering applies to Home's suggested events. The landing page is for visitors and orders by
  date only. L2-001 AC8 and L2-065 AC7 are corrected to say so.
- **Area matching.** An event gains a **suggestion area**: one of the eight areas of L2-065 AC6 or
  "GTA-wide", chosen in the event editor from the same fixed list as the member's area. The free-text place
  stays for display. A migration maps existing events to an area by staff review in seed or data; any left
  unmapped become "GTA-wide". A place-to-area mapping table is not built.
- **Order.** Ties are broken by date, soonest first. Events rank by: (1) the member's area or GTA-wide,
  then within those (2) events hosted by a listing the member follows, (3) events matching an interest
  (`InterestCategories`), (4) the rest. A member with no area chosen skips (1) and ranks on (2) to (4).
- **New events of a followed host.** Events published after the member followed the listing and not yet
  seen by the member. Events the member is registered for are not suggested.
- **"Coming up".** Home's "Coming up" is the member's own registrations (L2-007), the next three, with "See
  all". It is not ordered by area, interests or follows; L2-056 AC7 is amended to say its follows rank in
  the suggestions.
- **Interests.** The union of both lists: Pickleball joins `Interests.All` (key `pickleball`, category
  Workout in `InterestCategories`) and Cycling is in the mock. `INTERESTS` in `@cf/api` and `Interests.All`
  are the single source; the mock tools read the labels from `interests.ts`.

## Consequences

The event editor, its contract and the events table gain the suggestion area in the slice that builds it
(requirement, design and mock first). Home's handler orders by the rule above as a pure function with one
test case per row. Behaviour is built later in ATDD slices.
