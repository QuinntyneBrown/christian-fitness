# 0000. Work awaiting staff

## Status

Accepted, 24 November 2026 (slice 28.2).

## Context

L2-020 asks the Dashboard to show pending applications and flagged members, each linked to the screen
that resolves it. The design named the list sizes `<TO SUPPLY>`, the mock draws a "Needs attention" queue
with relative times ("2 days ago") and Review buttons, and the Services area is closed to Moderators
(ADR 0020) while the Dashboard area is open to them. No timestamp records when a member was flagged.

## Decision

- **Endpoint.** `GET /api/admin/dashboard/awaiting` in `AdminDashboardController`, one MediatR query. Its
  route is in the Dashboard area, so Admins and Moderators both read it; anonymous is 401.
- **Role in the handler, not the route.** The route cannot tell the two roles apart, so the handler reads
  the caller's staff role. An Admin gets `applications` and `flaggedMembers`; a Moderator gets
  `flaggedMembers` only. The `applications` key is omitted (never `null`, never a zero count), so a
  Moderator learns nothing of applications, and no application row is read for them.
- **Shape.** Each list is `{ total, items }`: the true count and the oldest three, a bound that keeps the
  answer and the section small. Applications are `{ id, name, role, submittedAt }`, oldest submitted
  first; flagged members are `{ id, name, note }`, oldest joined first (no flag time is kept), then by id.
  Nothing else is sent: no email, home church, credentials, about text or application detail. The name,
  role and note are what the Services queue and the Members table already show these roles.
- **Screen.** "Needs attention" heads the Dashboard, with the sum of both totals. It is a library `list`
  (card) of rows built in the page (title, line, a library `button` link "Review" with the row's words
  hidden for assistive technology). Applications link to `/services`, flagged members to
  `/members?status=flagged`. When more wait than are named, "All N pending applications" and "All N
  flagged members" text links follow the list. The mock's `queue` has no design-system component, so the
  rows are a page composite of library parts, with the page's own BEM block `attention`.
- **Dates.** The line under an application shows the role and the UTC date ("Apr 13"), not "2 days ago":
  an absolute day needs no clock and does not go stale while the page stays open.
- **Flagged wording.** The mock says "was reported"; the screen says "was flagged", the status staff
  see in Members, since a flag may come from staff and a report both. A flagged member with no note says
  "No note".
- **States.** Loading shows three skeleton blocks; nothing waiting shows "You're all caught up" (a
  Moderator's text names only member reports); a failure shows "Work waiting didn't load" with Try again
  and no word of the server's. The section loads, empties and fails apart from "Community activity",
  each with its own Try again. The mock has no state for this section's own error, so it is added as
  `attention-error`; the mock's `empty` note-card became the library `empty-state` (tight), as slice 28.1
  did for its empty state.
- **Not built.** The mock's Community hero and tiles, the upcoming-events list and the six totals of the
  design (L2-020 AC1) are not part of this slice's acceptance; the design's `GetDashboardSummaryQuery` is
  superseded by these two small queries.

## Consequences

- Two small counts and two three-row reads per request; an index on `Status` or `SubmittedAt` can follow
  if the tables grow.
- A later flag-time column can order flagged members by it without changing the shape.
