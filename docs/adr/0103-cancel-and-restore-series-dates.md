# 0103. Cancel and restore series dates: who is told, the session's counts and `started`, the endpoints and their answers, the notices and the toasts

## Status

Accepted, 25 November 2026 (journey 15, issue 165). Builds on ADR 0035, ADR 0064, ADR 0080,
ADR 0083, ADR 0091 and ADR 0101; amends the detailed design `admin-events/manage-event-series`
and the mocks `admin-series` and `cancel-session`.

## Context

Journey 15 lets staff cancel a series date and restore it (`L2-071` AC4, AC5, AC9) and tells the
members who held a place (`L2-052` AC10). The requirement, design and mocks left these open or
disagreed:

- The `cancel-session` mock said "The 31 members who joined the series are told, anyone who
  dropped in for this date is refunded", while AC4 and the design's resolved questions (#89) say the
  dialog counts those who joined and those who dropped in, and that refunds are sorted out with the
  host directly; the page's note said Cancel "refunds drop-ins" too.
- "Who joined" and "who dropped in" were not defined for one date: a member may join after a date
  was cancelled (Join takes only dates that are held), and a member may drop in and later join.
- The series read answers each session's state, but "Live" is the first date not done, which may
  already have started, so the state alone cannot say whether Cancel date or Restore is offered.
- The design names a `SessionChangeDto` without its fields, and no answer for Restore.
- AC5 says restored members "are told" without saying how; there is no notification kind for a
  restored date, and no mock of a restore that succeeded.
- A notification's title is at most 120 characters, and a series title may be 120 itself.
- After Cancel date the row's button becomes Restore; if it were a new element, the CDK Dialog's
  restored focus would land on `body`.

## Decision

- **Who holds a place, and who is told.** The members told about a date are those who hold a
  place (a `Registration`) at that session, each once. Of them, one who has an enrolment in the
  series counts as "joined"; anyone else as "dropped in". The registrations are kept on cancel (ADR
  0035), so Restore gives the same members their places back and tells the same members.
- **The session's counts and `started`.** `AdminSessionDto` gains `started` (its start is not after
  the API's clock), `joinedGoing` and `droppedInGoing`. The app offers "Cancel date" on a session
  that is not cancelled and not started, and "Restore" on one that is cancelled and not started
  (`adminSessionViewOf`, a case table). The server checks the same rules.
- **Endpoints.** `POST /api/admin/series/{id}/sessions/{sessionId}/cancel` and `…/restore` in the
  Series area (Admins and Moderators, ADR 0064), each sending one command, each answering
  `{ series, told }`: the series as the page shows it and how many members were told. Refusals: 404
  `not_found` (an unknown series, or a session not of it), 409 `session_started` (new), 409
  `event_not_published` (cancel of a date already cancelled) and 409 `event_not_cancelled` (new;
  restore of a date that is not cancelled). Each is audited (`series.session_cancelled`,
  `series.session_restored`) as `Record(actor, "Event", sessionId)`; the session's `SeriesId` names
  the series. A concurrency conflict reloads the session and decides again, as cancelling an event
  does.
- **`Event.Restore(now)`.** Cancelled to Published, only for a session (`SeriesId` set) whose
  start is after `now`; it bumps `RegistrationVersion`. A standalone event's cancellation stays
  final (`L2-023`).
- **The chat notice.** Each change posts one message to the series chat as the Christian Fitness
  account (ADR 0090): "<Tue, May 5> is cancelled. The other dates in the series stand." or "<Tue,
  May 12> is back on. If you held a place, it is yours again." It is stored and pushed like any
  message, so a member reads it later in the chat's history.
- **The notification.** On cancel, each member told gets a `series-date-cancelled` notification
  (ADR 0083): title "Cancelled date: <series>" (cut to 120 characters with "…"), text "<Tue, May
  5> is off; the other dates in the series stand.", linking to `/events/series/<id>`. Restore sends
  no notification: there is no kind or preference for it (ADR 0068), and the chat notice tells
  them.
- **The member's view.** On the member's series read a cancelled session is not `held`, so the
  place "ends" (`L2-052` AC10) while its registration is kept for Restore; restored, it is held
  again.
- **Dialog and toasts.** The dialog (`cancel-session`) reads "<n> people are going to this date
  (<j> joined, <d> dropped in). Everyone going is told in the series chat and in their
  notifications. If anyone paid for it, the host will sort out refunds with them directly." and
  "You can restore the date until it would have started."; with nobody going, "Nobody is going to
  this date yet." The toasts read "<Tue May 5> cancelled" or "<Tue May 12> restored" with "<n>
  members were told." ("1 member was told.", "Nobody held a place, so nobody was told."). A
  failed restore shows the `restore-failed` toast and changes nothing; the mock `date-restored` is
  added.
- **Focus.** Each row that is not done keeps one action button whose words change between
  "Cancel date" and "Restore", so the dialog's restored focus and a pressed Restore stay on it.

## Consequences

- Members told of a cancelled date can read it twice (chat and inbox), as the requirement asks.
- A member who joins after a date was cancelled holds no place there, so a Restore neither gives
  them one nor counts them; they may drop in on it (journey 13).
- Cancelling a session through admin Events (ADR 0035) still cancels it without these notices;
  Event series is where staff manage dates.
- Notifications are sent after the cancel is saved; the preference check arrives with journey 33
  inside `INotifier`, so this sender needs no change then.
