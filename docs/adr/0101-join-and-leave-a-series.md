# 0101. Join and leave a series: the conversation scope, the series chat's members, the enrolment endpoints, the plan options and the joined panel

## Status

Accepted, 25 November 2026 (journey 12, issue 162). Builds on ADR 0033, ADR 0039 to ADR 0042,
ADR 0080, ADR 0091 and ADR 0096; amends the detailed design `events/join-and-leave-series`.

## Context

Journey 12 makes the series page's sign-up panel act (`L2-052` AC1 to AC9): join every remaining
session, join the series' one group chat, and leave. ADR 0080 decided that chat moves from an event
id to a conversation scope (a kind, `Event` or `Series`, and an id), and that a member of a series'
chat is one who holds a place at any of its sessions. The requirement, design and mocks left these
open or disagreed:

- ADR 0080's membership rule keeps a member who came to a past session in the chat after they
  leave, since a place at a started session stays in their history (AC9); AC9 also says they leave
  the chat.
- The direct conversations of slice 14.1 already keep their read markers in `ChatReadMarkers`,
  keyed by the other member's id, so a marker keyed by "kind and id" has no kind for them.
- Nothing said how the app addresses a series' chat, nor how the Messages list leads to it.
- The design names the endpoints but not every refusal: a series with no session to come, a join
  repeated at once by a double press, and a drop-in place already held.
- The mock `event-series/joined` words the payment note "How to pay. Pay $64 to the host at your
  first session…", while AC4 (resolved in #89) reads "Pay the host at your first session, by cash
  or e-transfer. You won't be charged online."
- AC4's "the join confirmation says so" for a date already dropped in on has no mock state.
- "All dates" writes a calendar file with every session to come, but a session in the series read
  has no end time.
- Choosing "Pick dates to drop in" is journey 13's; this journey must still draw the option.

## Decision

- **Conversation scope.** `ChatMessage.EventId` becomes `ScopeKind` (`Event` or `Series`, stored
  as text) and `ScopeId`. The scope of an event is its series when it has one, otherwise itself.
  `ChatReadMarker.EventId` becomes `ScopeId`, the conversation's id: an event's, a series' or, for a
  direct conversation, the other member's. Every id is a version 7 `Guid`, so no kind is needed in
  the marker's key. `IChatChannel` takes a `ChatScope`, and each scope is one hub group
  (`chat:event:<id>`, `chat:series:<id>`).
- **Addressing.** A chat is addressed by its scope's id. The hub's `Join` and `Send` and
  `/api/events/{id}/chat/messages` and `/read` take an event's or a series' id; the server finds the
  scope from the id. A session's own id has no chat (`not_a_participant`, as for an unknown id).
  The member app opens a series' chat at `/events/series/<id>/chat`, the event chat page with "Back
  to series" and "Series group". A session's event page leads its "Group chat" there. A Messages row
  for a series' chat has `kind: "series"` and leads there too. `ChatMessageDto.eventId` keeps its
  name on the wire and carries the scope's id.
- **Who is in a series' chat.** A member who joined the series (an enrolment), or who holds a place
  at one of its sessions that has not ended (`EndsAt`, else `StartsAt`, after now). A standalone
  event's chat keeps ADR 0041's rule: a registration. So leaving takes the member out of the chat
  although their places at started sessions stay in their history. A member who only dropped in
  leaves the chat when their last date ends; journey 13 may widen this. A series' chat is never
  read-only; cancelling one date does not close it (journey 15 tells its members).
- **Migration.** `AddConversationScope` renames the columns, sets every message to the `Event` scope
  with the same id, and moves the messages of an event that belongs to a series to that series'
  scope. Markers of a series' sessions merge into one marker per member and series, with the latest
  instant read. No message, marker or membership is lost. The migration also adds
  `EventSeries.EnrolmentVersion`.
- **Join.** `POST /api/events/series/{id}/enrolment` sends one `JoinSeriesCommand` and answers the
  series as the member now sees it (`SeriesDetailDto`). Refusals: 403 `account_suspended`, 404
  `series_not_found` (as the read), and 409 `series_full` when `SeriesPlaces.SpotsLeft` is 0 or
  there is no session to come. A member who already joined gets the series unchanged and no second
  place. Joining adds one `SeriesEnrolment` and a `Registration` at each session to come that the
  member does not hold, priced at the series price (reserved when it is above 0). A place already
  held, for example a drop-in, is kept with its own status and price (AC4, `L2-053` AC5).
- **Concurrency.** Each new place calls `Event.TakePlace()` (ADR 0033), and the series'
  `Enrol()` and `Withdraw()` bump its new `EnrolmentVersion` concurrency token. Two joins for the
  last place, or the same member's two joins, cannot both commit. The loser's
  `DbUpdateConcurrencyException` detaches its rows, reloads and decides again, so it is answered
  `series_full` or the unchanged series. A unique-index violation (`DbUpdateException`, on
  `(SeriesId, MemberId)` or `(EventId, MemberId)`) is decided again the same way. After three lost
  rounds the exception propagates.
- **Leave.** `DELETE /api/events/series/{id}/enrolment/me` sends one `LeaveSeriesCommand` and
  answers the series. A member who has not joined gets it unchanged. Otherwise the enrolment and
  every place at a session that has not started (cancelled ones included) are removed in one unit
  of work. Each touched session calls `ReleasePlace()`, and the series calls `Withdraw()`. Places
  at started sessions stay. The member leaves the chat when they are no longer in it.
- **The panel.** The design system's `plan-option` is built in the library
  (`components/src/plan-option/`, with the `plan-list` fieldset and its visually hidden legend "How
  would you like to come?"). "Every session" is chosen by default. A series with no drop-in price
  has only that option. While the join waits, both radios are disabled and the button reads
  "Joining…" (`aria-busy`). Choosing "Pick dates to drop in" shows the mock's "Tick dates in the
  list" and a disabled "Pick a date first" until journey 13 adds the tick boxes. Full: "Series
  full", "Every session" disabled with "Every place in the series is taken" and drop-in chosen. On
  `series_full` the page shows the series as full without asking again. Any other refusal
  (`account_suspended` included) or no answer shows "We couldn't sign you up. Try again in a
  moment." (`role="alert"`) above the button, which stays usable.
- **The joined panel.** "You're in for every session" (`role="status"`). A paid series then reads
  "Pay the host at your first session, by cash or e-transfer. You won't be charged online."; the
  mock `event-series/joined` is corrected to it. "Your progress" reads "Attendance not recorded
  yet" until journey 16 records attendance; its session meter is decorative, with the next date
  highlighted and cancelled ones faded. "All dates", "Group chat" and "Leave the series" follow.
- **The drop-in confirmation.** Right after a join, a paid series whose member already held places
  to come adds, below the payment note: "You'd already booked session 4, so it stays at the
  drop-in price ($10). Your other dates are at the series price." ("sessions 4 and 5, so they
  stay at the drop-in price ($10 each)"). The page works it out from the series before and after
  the join; the mock state `event-series/joined-drop-in` draws it.
- **All dates.** `SeriesSessionDto` gains `endsAt`. `seriesCalendarOf` writes one iCalendar file
  (RFC 5545) with a `VEVENT` per session to come, in UTC, text escaped and lines folded at 75
  octets. The page downloads it through an object URL, revoked at once, named for the series'
  title. The mock's info toast is not shown: the browser's download says it.
- **The leave dialog.** `LeaveSeriesDialog`, a CDK Dialog loaded on first use, reads "Leave the
  series?", "<title> · every Tuesday to May 26" ("<title> · <n> dates to May 26" without a weekly
  cadence), and "Your place at the <n> sessions still to come goes back to other members…", where
  <n> counts the places the member holds at sessions to come ("1 session"). Focus starts on "Stay
  in the series". While it waits both buttons are disabled and the second reads "Leaving…". A
  failure shows "We couldn't take you out of the series" and changes nothing. On success it closes
  with the series, which the page shows in place.

## Consequences

- One migration, `AddConversationScope`: renamed columns, a new text column, a series concurrency
  token and data moves. It needs no new PostgreSQL extension. It is compatible with the running
  revision only after the new revision is live (ADR 0047's order: migrate, then deploy).
- `SeriesDetailDto`'s sessions and `ConversationSummaryDto.kind` change, so their exact-keys tests
  and the e2e fixtures change with this ADR.
- `L2-052` AC10 (a cancelled date) stays with journey 15; the drop-in tick boxes with journey 13.
