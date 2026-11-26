# 0037. Landing with upcoming events

## Status

Accepted, 23 November 2026 (slice 8.1). Its layout (hero, three "Coming up" events) is superseded
by [ADR 0107](0107-news-front-page.md); the guard, the anonymous events endpoint and the member
count left out still hold.

## Context

L2-001 and L2-002 give the public landing page at `/`. The detailed design names the endpoint, guard and page;
the mock draws a floating event card and a member count that no endpoint supplies.

## Decision

- **`GET /api/public/events/upcoming?take=`** is `[AllowAnonymous]` and answers an array of
  `{ id, title, category, startsAt, place }`, soonest first, at most 3 whatever `take` says. It carries no
  going count, price, capacity or member detail.
- **`redirectSignedInGuard`** sends a member with a session to `/home`; any failure shows the page.
- **Left out.** The hero's floating event card and "2,400+ members" are not drawn: no data backs them.
  The empty state uses the requirement's words, "No events posted yet. Check back soon.", and the mock
  `landing/empty` now says so.
- **Rows lead to Join**, as in the mock; the events screen needs a session.
- The first route is the lazy `landing-page`; the stand-in `start-page` is removed.

## Consequences

- Hero, band and verse are page-scoped blocks until a design-system page defines them.
- Specs that open `/` as a visitor must end the fixture's default session.
