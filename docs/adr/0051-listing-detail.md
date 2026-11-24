# 0051. Listing detail

## Status

Accepted, 24 November 2026 (slice 16.2).

## Context

L2-013 AC4 opens a selected listing as its own screen with a back action below LG, and AC3 keeps the
card beside the list from LG. Slice 16.1 served the full listing in the list (ADR 0050) and left the
card under the list below LG as a stand-in. The mocks have the card (`services/selected`) but no
screen of its own, and the detailed design left the id's error code to supply.

## Decision

- **Endpoint.** `GET /api/services/{id:guid}` for any signed-in member answers the same listing
  shape as a list row. An id that is not a listing (unknown, or an application not yet approved) is
  404 `service_not_found` (`RefusalCodes`). A visitor is refused 401 by the fallback policy. There is
  no "unpublished" listing state: a listing that exists is published (ADR 0049), and slice 23
  deletes the row.
- **Screen.** `/services/:id` (lazy, title "Professional") is `ServiceDetailPage`: a back link
  ("All services") and the `ServiceDetail` card, with a skeleton card while loading, the not-found
  screen for a 404 (action "Browse services"), and "This professional didn't load" with Try again for
  any other failure. `SERVICES_SERVICE` gains `get(id)` and is provided on the page.
- **Which screen.** The list page decides by viewport when a row is chosen: from LG (1024 px,
  `matchMedia`) the address changes to `?selected=` and the card beside the list updates; below LG it
  navigates to `/services/:id?category=`. The card beside the list is hidden below LG by CSS, so
  it no longer follows the list (the 16.1 stand-in is removed).
- **Back.** The back link goes to `/services` with the category the list was filtered by, read from
  `?category=` on the listing's address through `serviceCategoryOf` (anything unknown shows All).
- **Mock.** No mock draws the screen; it is the `selected` card under the standard back link
  (as Event detail), recorded here as a stand-in.
- **Bundle.** The extra route cost 130 bytes in the web `main` (280.43 kB against the 280.30 budget).
  A route loader that returns a module's `default` export needs no `.then((m) => m.X)`, so the new
  page and five existing routed pages (Events, Event detail, Services, Messages, Member profile)
  export their component as `default`, which brought `main` to 280.21 kB without raising a budget.

## Deviations and stand-ins

- "Request a booking" and "Message" stay off the card (slices 17.1 and 17.2).
- Resizing across LG while the listing screen is open keeps that screen; it does not redirect.

## Consequences

- One more request on opening a listing's own screen (the list has the same data, but the screen
  is an address a member can open or reload directly, so it asks for itself).
- The listing screen and its client go with the screen; nothing is kept in `root`.
