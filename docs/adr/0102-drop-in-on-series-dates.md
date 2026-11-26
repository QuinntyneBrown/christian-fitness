# 0102. Drop in on series dates: the whole set of dates in one request, `full` on a session, `event_full` naming the sessions, Change dates for a joined member, and the stop-dates dialog

## Status

Accepted, 25 November 2026 (journey 13, issue 163). Builds on ADR 0032 to ADR 0034, ADR 0080,
ADR 0096 and ADR 0101; amends the detailed design `events/drop-in-on-series-dates`.

## Context

Journey 13 makes "Pick dates to drop in" act (`L2-053` AC1 to AC7). The requirement, design and
mocks left these open or disagreed:

- The design says a joined member changes dates only by leaving the series, while AC6 (resolved in
  #89) lets them untick single dates, and its open questions say both.
- The design leaves the refusal's extension and its words `<TO SUPPLY>`; the mock
  `event-series/drop-in-full` reads "Sat May 9 is full. Untick it and try again."
- AC7 says a session with no place left reads "Full" with no tick box, but no mock draws one, and
  the series read does not say which sessions are full.
- AC1's button is disabled until a date is ticked, yet AC4 lets a member untick every date. The
  mocks draw no Change dates state, nor what a joined member's list reads after AC6.
- The design refuses an unticked date that has started with `event_started`, but the screen only
  offers dates still to come, so a member can only "untick" a started date from a stale page.
- The design names a validator with field codes for a malformed set, which no screen can send.

## Decision

- **One request for the whole set.** `PUT /api/events/series/{id}/drop-ins` with
  `{ "sessionIds": [...] }` sends one `SetDropInDatesCommand`. The set is every date still to come
  that the member wants to hold after the change; the handler adds what is new and removes what is
  missing, in one unit of work, and answers the series as the member now sees it
  (`SeriesDetailDto`). A date that has started is outside the set's meaning: a place at it is kept
  whatever the set says (`L2-012`: a place cannot be given up once it starts), so a stale page that
  "unticks" it changes nothing there and the answer shows it held.
- **Refusals.** 403 `account_suspended` when a suspended member adds a date (removing is allowed,
  as cancelling is); 404 `series_not_found` as the read; 400 `sessions_invalid` (a top-level code,
  no field codes: no screen can send it) for an id that repeats, is not a session of the series, is
  cancelled, or has started and is not already held, and for a member who has not joined adding a
  date to a series with no drop-in price; 409 `event_full`, the code `L2-011` uses, when a newly
  ticked date has no place left, with a `sessions` extension listing every such session's number
  (a number, never words). Nothing is saved on any refusal (all or none, AC2).
- **Places and prices.** A new date is a `Registration.Of(sessionId, memberId, price, now)` and
  `TakePlace()` on its session, at the session's own capacity (`L2-011` AC1). A member who has not
  joined pays the session's price (the drop-in price), so a priced date is `Reserved`; a joined
  member who ticks a date again pays the series price, as joining did (ADR 0101). An unticked date
  calls `ReleasePlace()` and removes the registration, whichever way it was taken; a joined
  member's enrolment stays. Races are settled as joining's are (ADR 0033, ADR 0101): a
  `DbUpdateException` forgets the attempt, reads again and decides again, three times.
- **Chat.** ADR 0101's membership rule already puts a member who holds a date not ended in the
  series chat, so a first drop-in joins it. After saving, a member no longer in the chat (no
  enrolment and no date not ended) leaves it through `IChatChannel.LeaveAsync` (AC4).
- **`full` on a session.** `SeriesSessionDto` gains `full`: a session to come, not cancelled, whose
  going count has reached its capacity. While picking, such a session that the member does not hold
  reads "Full" in words and has no tick box (AC7); one they hold keeps its tick box, ticked. The mock
  `event-series/full` draws session 6 that way.
- **The refusal's words.** The page words the numbers by the sessions' dates: "Sat May 9 is full.
  Untick it and try again." or "Sat May 9 and Sat May 16 are full. Untick them and try again."
  (`role="alert"`, above the button). The ticks stay.
- **The panel.** With drop-in chosen, the note reads "Tick dates in the list" or "<n> picked
  below" and the button "Pick a date first" (disabled), then "Register for 1 date" or "Register for
  <n> dates", and "Registering…" (`aria-busy`) while it waits. Once a member who has not joined
  holds dates to come, the panel reads "Registered for <n> date(s)" (`role="status"`), then
  "Sessions 4, 6. You can add more dates any time." and, for a priced drop-in, "Pay $10 to the host
  at each session; online payment is not available yet.", and "Change dates" (the mock
  `event-series/booked`).
- **Change dates.** It shows the tick boxes with the dates held to come ticked; the button reads
  "Save dates" ("Saving…" while it waits), disabled until the ticks differ from what is held, so
  unticking every date can be saved (AC4); "Cancel" goes back without a change. A change that
  unticks a held date first asks in the stop-dates dialog; one that only adds is saved at once.
  The mock states `change-dates` and `joined-change` draw it.
- **The stop-dates dialog.** `StopDatesDialog`, a CDK Dialog loaded on first use, reads "Stop going
  to 1 date?" / "Stop going to <n> dates?", "<title> · Sat Apr 25 and Sat May 9", and "Your place
  goes to someone else. You can register for these dates again while places are left." Focus
  starts on "Keep my dates". "Stop going" sends the whole set; while it waits both buttons are
  disabled and it reads "Stopping…". A failure reads "We couldn't take you off those dates" / "You
  still have your places. Try again in a moment." and changes nothing; an `event_full` for a date
  ticked in the same change closes the dialog and the page names the date as above.
- **A joined member (AC6).** The joined panel gains "Change dates" between the actions and "Leave
  the series". Once a joined member holds fewer than every session to come, each session to come
  that is not cancelled reads "· Registered" or "· Not going" after its weekday, like "· Next up";
  while they hold them all the list reads as before. The confirmation reads "You're in for every
  session" while every such session is held, otherwise "You're in for <h> of <n> sessions to come".
  The mock states `joined-change` and `joined-changed` draw it.
- **Join after drop-ins (AC5)** is ADR 0101's: joining skips the dates already held, which keep
  their price.

## Consequences

- No migration: places and prices are the existing `Registration` and `Event` rows.
- `SeriesDetailDto`'s sessions gain `full`, so their exact-keys test and the e2e fixtures change.
- `RefusalException` gains an optional map of extensions, written into the ProblemDetails beside
  `code`; only `event_full` from this endpoint uses it.
- The detailed design's validator, its field code and its `event_started` refusal are replaced by
  the rules above.
