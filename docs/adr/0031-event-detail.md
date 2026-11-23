# 0031. Event detail: one published-event read, 404 `event_not_found`, and registration left to slice 6.1

## Status

Accepted, 23 November 2026 (slice 5.1).

## Context

L2-010 asks for an event's image, title, category, date and time, place and area, price, summary,
going over capacity and "the registration action" (AC1), a not-found view for an id that is missing
or not published (AC2), and "You're going" with a group chat link for a registered member (AC3).
Registration (slice 6.1) and event group chats (slice 12.x) do not exist yet, so nobody can be going
and a Register button would do nothing. The mock draws a schedule and "about 90 minutes", a stack of
going avatars and a "Waitlist open" note for a full event; none has data or a requirement.

## Decision

- **One read.** `GET /api/events/{id}` returns `EventDetailDto` (the list's fields plus `summary`).
  It answers only a `Published` event; a draft, an unknown id and a cancelled event are 404 with
  code `event_not_found`. A published event that has started stays viewable (the design left this
  open; a member may follow an old link).
- **The screen is the mock's `unregistered` state without what has no data.** It shows the picture
  (its own, or its category's bundled photo), eyebrow, title, facts (day and time, place and area),
  About, and an aside with the price, "N of M spots left" (never below 0) and "N going". The
  Register button, the avatar stack, the schedule and the duration are left out until a requirement
  gives them data; a full event says "0 of M spots left" rather than a waitlist, which no
  requirement describes.
- **AC1's "registration action" and AC3 belong to slices 6.1 and 12.x.** This slice's tests prove
  AC1 without the action and AC2; the aside is where slice 6.1 puts Register and "You're going".
- **A 404 shows the not-found screen in place**, keeping the address, as the wildcard route does;
  any other failure shows "This event didn't load" with Try again.

## Consequences

- `EventsApi` gains `get(id)`; the screen provides the service on its route component.
- The mock `event-detail` states other than `unregistered`, `loading` and `error` wait for slice 6.1.
