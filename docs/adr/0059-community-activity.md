# 0000. Community activity

## Status

Accepted, 24 November 2026 (slice 28.1).

## Context

L2-020 gives the Dashboard six counts and a queue. Slice 28.1 builds only the activity: staff see new
members, registrations and messages over recent weeks. The design named no endpoint and no length;
the mock draws a hero count and two tiles (April totals), no weekly series.

## Decision

- **Endpoint.** `GET /api/admin/dashboard/activity` in `AdminDashboardController`, one MediatR query.
  Its route sits in the Dashboard area, so Admins and Moderators both read it (the mock's moderator
  state shows the Community section; ADR 0020). Anonymous is 401.
- **Weeks.** Eight, oldest first. A week runs Monday 00:00 UTC to the next Monday; the last is the
  one holding now and runs to now, so nothing in the future is counted and the weeks move on by one
  at each Monday. UTC, not Toronto, keeps the rule free of a time-zone database in the container and
  of daylight-saving weeks of 167 or 169 hours; the screen names a week by its UTC Monday ("Apr 13").
  Time comes from `TimeProvider`; tests use `FakeTimeProvider`.
- **Counts.** New members by `Member.JoinedAt`; registrations by `Registration.CreatedAt`; messages
  are event chat and direct messages together by `SentAt`. Counts only: the handler loads no row, so no
  name, email or message text is read, and nothing is logged. A registration later cancelled still
  counts as the day it was made (the table keeps no cancel time).
- **Screen.** The Dashboard route renders `AdminDashboardPage` in place of the stand-in. The heading
  stays "Dashboard" (L2-021 and the shell specs), not the mock's greeting. "Community activity" is the
  library `table` (Week of, New members, Registrations, Messages), newest week first with the current
  one "(this week)". Bars were not drawn: the figures are the content, a table needs no chart library
  and no new component, and `main` does not grow (admin 280.32 kB, under 280.35 kB).
- **States.** Loading shows skeleton rows; eight weeks of zeros shows "No activity yet"; a failure shows
  "Activity didn't load" with Try again and no word of the server's. The mock's `partial` state is
  this section's error beside the rest of the page; its `empty` state carries the empty note.
- **Mock.** The Community activity section is added to the `admin-dashboard` states default, moderator,
  empty, loading and partial by hand (`build_mocks.py` was not run). The hero and tiles stay as drawn
  for slice 28.2 and later, which align their copy.
- **Tests.** The week rule is cut only by the API, so its case table is in the API suite (instants at
  each boundary, both ends and the future); the client only formats a given Monday, with a unit test.

## Consequences

- 32 count queries per request (8 weeks by 4 tables), all small; a grouped query can replace them if
  the tables grow.
- A later slice adding totals or the queue reuses the route and the page.
