# 0080. Event series model

## Status

Accepted, 24 November 2026 (issue #87, step 24 of 37 of #63).

## Context

A series is a program of dated sessions (`L2-050` to `L2-053`, `L2-071`). The designs and mocks
disagreed on its chat, its counts, what Events lists, and what the console shows. Each line below is
one question raised in the designs and the answer taken, so that every series slice reads one rule.

## Decision

- **Chat is keyed by a conversation scope.** A series session's group chat is one chat per series,
  keyed by its `SeriesId`; a standalone event keeps its own event chat. `ChatMessage.EventId`,
  `ChatReadMarker`, `ChatMembership` and `IChatChannel` take a conversation scope (a kind, `Event` or
  `Series`, and an id) in place of an event id. The scope of an event is its series when it has one,
  otherwise itself. A member of the chat is one who holds a registration at any session of the
  series (ADR 0041). The migration rewrites existing rows to the `Event` scope with the same id, so no
  message, marker or membership is lost, and moves the rows of any event that already belongs to a
  series to its `Series` scope.
- **Spots left** when joining a series is the smallest number of places left among its remaining
  (not started, not cancelled) sessions, because joining takes a place in each. It is shown as
  "<left> of <capacity> spots left"; `series_full` is refused when that number is 0. A session's own
  event page keeps "capacity minus going" for that session.
- **`number` is derived.** A session's number is its position in date order among all the series'
  sessions, cancelled ones included, and is never stored; "Session 3 of 8" (`L2-071` AC6) is that
  position of the total. Adding, moving or cancelling a date renumbers by date.
- **The progress meter counts held sessions only.** "<done> of <total> sessions done" has the
  total of sessions not cancelled and the done of those past; "2 of 7 sessions done" leaves the
  cancelled date out of both. Likewise "<past> done · <remaining> to go" and "Sessions left" leave
  cancelled dates out. The two rules differ on purpose and each screen states which it uses.
- **Events lists only the next session of each series**, with "Part of {Series}" followed by
  "Session <n> of <total> · <cadence>". Every session has an event page, linked from the series page
  ("Details" on a session still to come); a session never has no page and no date is left unlinked.
- **Event detail "next sessions"** shows up to the next three sessions after this one; a cancelled
  date stays in the list marked "Cancelled" (struck through and the word), and counts toward the three.
- **Cap and order.** The list of series is capped at 100 with no paging (`L2-050`). The member list
  is by next session date; the console list (`L2-071` AC1) is by next session date, then series with
  no session left, last, then by title.
- **Cadence is derived from the dates**, never typed: "Weekly on Tuesdays" when all sessions fall
  7 days apart on one weekday, otherwise "<n> dates". Cancelled dates are ignored when deriving it.
- **Session events appear in admin Events** (with a series tag) and can be chosen for Community Pick.

## Consequences

- No `Number` or `Cadence` column: both are computed in the handler from the dates and tested with one
  case table in both stacks.
- The chat migration is a data migration run by the CLI before the new revision, compatible with the
  running one (ADR 0047).
- Mocks: the Events cards read "Part of {Series} · Session n of total · cadence", and the series card of
  an event shows a cancelled date as "Cancelled" with a struck-through topic.
