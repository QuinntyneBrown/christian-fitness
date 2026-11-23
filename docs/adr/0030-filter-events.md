# 0030. Filter events: category chips are links, and the category is in the address

## Status

Accepted, 23 November 2026 (slice 4.2).

## Context

L2-009 AC2 says the category filter is a button with `aria-pressed="true"`. The design system's
`chip` is a link inside a `chip-bar` that carries `aria-current="page"` (docs/design-system/
components/chip.html), and the mocks draw it so. The journeys table says "Filter by type, date and
location", but L2-009 asks only for the category, and the mocks have no date or location control.
The mock's chip bar also lacks Retreat, which L2-009 lists, and its no-results action reads "Show
all events" where L2-009 says Clear filter.

## Decision

- **Chips are links, as the design system draws them.** A filter changes what the page shows and
  should have an address a member can share, bookmark and go back to, which a link gives and a
  toggle button does not. The state is announced by `aria-current="page"` on the current chip, never
  by colour alone. L2-009 AC2 is amended to say so (and AC9 adds the address). A plain click moves
  the router (`navigate` on `cf-chip`, as the top bar does), so the page does not reload.
- **The category is a query parameter.** `/events?category=run`; no parameter is All. An unknown
  value in the address shows All. The Events request takes the same `category` and refuses one it
  does not know with 400 `validation_failed` and `fieldCodes.category` = `category_invalid` (AC10).
  Changing the category starts a new feed; the cursor is only meaningful for one category.
- **Categories.** All, Run, Workout, Basketball, Mobility, Workshop and Retreat; the mock gains the
  Retreat chip.
- **No results.** A category with no events shows the mock's "Nothing here yet" with a Clear filter
  action (the mock's "Show all events" becomes "Clear filter", as L2-009 AC3 says), and the chips
  stay.
- **Date and location are not built.** The journeys table's "date and location" has no requirement
  in L2-009 and no mock. They are recorded here, not invented; a requirement and a mock must state
  them before they are built, and they would add parameters to the same query.

## Consequences

- `cf-chip` gains a `navigate` output and `cf-chip-bar` takes the design system's top margin;
  nothing else in the library changes.
- The "Only events I'm going to" toggle stays out (ADR 0027) until registrations exist.
