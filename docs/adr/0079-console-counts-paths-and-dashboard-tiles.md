# 0000. Console navigation counts, area paths and Dashboard tiles

## Status

Accepted, 25 November 2026. Succeeds the count rule of [ADR 0060](0060-work-awaiting-staff.md) and
amends its queue and date rules.

## Context

The grouped navigation (L2-021) and the amended Dashboard (L2-020) disagreed with their requirements
and with ADR 0060: the navigation took its counts from the Dashboard's waiting-work answer, "reports"
and "flagged members" were two names for the Members count, six area paths were unset, the group names
were plain text, the Community tiles matched neither AC1's list nor its 7-day windows, the queue count
read 7 for 10 items, the feedback line quoted a member's note, and times were relative where ADR 0060
shows absolute dates.

## Decision

- **Navigation counts.** `GET /api/admin/counts`, a totals-only endpoint with one MediatR query. It is
  scoped to the caller's role (ADR 0020 as amended by ADR 0064): an Admin gets `stories`,
  `suggestions`, `applications`, `members` and `feedback`; a Moderator gets `members`, `suggestions`
  and `feedback`, and the other keys are omitted, never `null` or zero. It reads no row, only counts, and carries no name or
  text. The admin hub pushes a `countsChanged` signal, with no payload, when a count may have changed;
  the shell then asks again, and also asks once on entry. A failed read leaves the links without counts
  and shows no error. The Dashboard keeps its own query (`GET /api/admin/dashboard/awaiting`), so a
  change of area no longer reads three rows of every queue.
- **Members count.** One number: members needing review, the open message reports (ADR 0058) plus the
  flagged members, each member counted once. A flagged member with an open report is one. Its words
  are "{n} member(s) to review".
- **Area paths.** `/stories`, `/newsletter`, `/events`, `/series`, `/community-pick`, `/listings`,
  `/services`, `/members` and `/feedback`; the Dashboard is `/`. `/series` is not under `/events`, so
  `currentAdminArea` never marks Events for a series.
- **Group headings.** Each group is an `<h2 class="admin-nav__group" id>` followed by a
  `<ul class="admin-nav__list" aria-labelledby>` of `<li>` links; Dashboard is alone in an unlabelled
  list, and a Moderator's single list has no headings. Below LG the headings are hidden with the
  band's group names. The design system's sidebar-navigation page and the mocks follow.
- **Dashboard tiles.** "Community" shows Members (the total) with "+{n} in the last 7 days" for those
  who joined, Registrations in the last 7 days and Live listings, all over the 7 days up to the request
  in UTC (L2-020 AC1 amended). "Upcoming events" shows the next 5 published events by start, with
  registrations against capacity and Manage opening Events.
- **Queue.** The count is of items (L2-020 AC11): the mock reads 10 for one story, three suggestions,
  two notes, three applications and one flagged member. Stories show the oldest three in review, then
  "All {n} stories in review" when more wait (ADR 0060's bound for the other lists).
- **Feedback line.** Kind and age only ("Idea · 2 hours ago"). The Dashboard never reads a note's
  words, so none reaches the page.
- **Times.** A time within the last 24 hours reads relative ("1 hour ago"), in `<time datetime>` with
  the absolute date as its tooltip; an older one shows the absolute UTC date ("Apr 13"), also in
  `<time datetime>`. The relative text is worked out when the answer arrives and is not refreshed
  while the page stays open. This replaces ADR 0060's absolute-only rule.

## Consequences

- The navigation's cost no longer grows with the Dashboard's rows.
- `GetWorkAwaitingStaffHandler` and `GetAdminCountsHandler` share the count queries, so the two can
  not disagree; a test of the rule belongs to the slice that builds the endpoint.
- The hub carries one more message, with no data in it.
