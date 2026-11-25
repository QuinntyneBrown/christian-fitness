# 0094. View an event series: the series page, its read-only sign-up panel, the session's series card and series under Hosting

## Status

Accepted, 25 November 2026 (journey 11, issue 161). Builds on ADR 0080, ADR 0087, ADR 0089,
ADR 0091 and ADR 0093; amends the detailed design `events/view-event-series`.

## Context

Journey 11 builds the member's series page at `/events/series/<id>` (`L2-051`), the series card on
a session's event page (`L2-010` AC5, AC6) and series under a listing's Hosting (`L2-055` AC2), on
journey 9's model and journey 10's list. The requirement, design and mocks left these open or
disagreed:

- `L2-051` AC6 opens a "published series", but `EventSeries` has no status (ADR 0091), and ADR
  0093's "listed" rule (a session still to come) would make a finished series' page vanish while
  its sessions' pages, and their "View series", still open.
- AC1 words a weekly cadence "Weekly on Tuesdays" (ADR 0080); ADR 0091 changed the wording to
  "Every Tuesday", as the mocks draw it.
- AC3's "You came" and "Missed" need attendance, which journey 16 records (`L2-080`); no
  attendance field exists yet.
- The sign-up panel's join, drop-in and leave behaviour is journeys 12 and 13's; this journey
  shows the panel "read-only", which no mock state draws.
- The design asks for an ADR on "spots left", leaves open which sessions get "Details", and
  names a `SeriesDetailDto` and `SessionDto` without their final fields.
- The event page's card must say "View series" or "Join the series", so the event read needs the
  caller's enrolment; nothing said how many later dates it carries, nor what a series row under
  Hosting carries.
- ADR 0087's Hosting served only one-off events and said series join "when series exist"; the
  directory row's hosting count (ADR 0082) counts every session event as one.

## Decision

- **Which series open.** A series opens when at least one of its sessions is published and not
  cancelled, whatever its date; an unknown id, a series with no dates, or one whose every date is
  cancelled is 404 `series_not_found` (a new refusal code, by analogy with `event_not_found`).
  A finished series keeps its page, so a past session's series card still leads somewhere; the
  Series view still lists only series with a session to come (ADR 0093).
- **Endpoint.** `GET /api/events/series/{id:guid}`, behind the fallback authentication policy,
  sends one `GetSeriesQuery`. It answers `id`, `title`, `category`, `summary`, `imageKey`, `host`
  (the event page's `{ id, kind, name, isVerified, photoKey }`), `cadence` (ADR 0091's
  `{ weekday, dates }`), `startsAt` (the next held session's start, else the last held one's),
  `firstStartsAt` and `lastStartsAt` (the first and last held dates), `place`, `area`,
  `priceCents`, `dropInPriceCents`, `capacity`, `spotsLeft`, `sessionsLeft`, `joined` and
  `sessions`, each `{ id, number, startsAt, topic, state, held }`: `number` its position among all
  dates (cancelled ones included, ADR 0080), `state` ADR 0091's `done`, `live`, `upcoming` or
  `cancelled` by the API's clock, and `held` whether the caller holds a place (a registration) at
  it. Numbers and states are data; the app words them in Toronto time.
- **Spots left** (ADR 0080) is `SeriesPlaces.SpotsLeft`: the smallest `capacity − going` among the
  sessions still to come (published, not cancelled, not started), never below 0, and `null` when
  none is to come. `sessionsLeft` is how many there are. A domain service with a case table; the
  app only words the number, so the table lives in the backend suite alone.
- **The page.** The head reads "<Category> series · <n> sessions" (all dates, cancelled ones
  included), the title, the cadence and time "Every Tuesday, 6:30 PM" over the date range
  ("Apr 7 – May 26", ADR 0093's range), place over area, and the summary. "Weekly on Tuesdays"
  in `L2-051` AC1 reads "Every Tuesday", as ADR 0091 decided. The sessions' heading note reads
  "<done> done · <to go> to go", `done` counting `done` sessions and `to go` the `live` and
  `upcoming` ones, so cancelled dates count in neither (AC4). The `live` session is "Next up".
- **A row's end.** `cancelled`: "Cancelled" with the topic struck through. `live` and `upcoming`:
  "Details", a link to the session's event page, on every session still to come (the design's
  open question; AC5 gives every session an event page). `done`: "Done" where the member held no
  place; where they held one, "Not recorded" until journey 16 records attendance, when "You came"
  and "Missed" join (AC3 is otherwise deferred to journey 16). "Not recorded" is the true state:
  nothing has been recorded, and it never reads "Missed".
- **The read-only panel.** Until journey 12 adds joining, the panel shows "Sign up" with "<left>
  of <capacity> spots left" ("Series full" at 0; "No sessions left" when none is to come), then the
  two ways to come as a read-only list in the plan options' look, with no radio and no button:
  "Every session (<left> left)", "Your spot is held each week" (weekly) or "Your spot is held at
  every date", and "<price> for all <held>" or "Free"; and, where the series has a drop-in price,
  "Pick dates to drop in", "Come when you can" and "<price> each" or "Free". A full series' first
  option reads "Every place in the series is taken". It ends with "One group chat for the whole
  series." A member who joined sees "You're in for every session" (`role="status"`) in place of
  the options. Journey 12 replaces the list with the radio group and the Join button the mocks
  draw. This is a stand-in, not a mock state; the mock's classes are kept.
- **Library parts.** `session-list` (block `session-list`, rows `session-row`) is built in
  `components/src/session-list/`; a row's end is chosen by data (`details`, `status`), not by
  projection, so each end is declared once and journey 13 adds its `drop-in` tick box as one more
  kind. `series-panel` and `series-card` are built in `components/src/series-card/`; the
  `host-card` is the library's, with no kind on the series page ("Hosted by").
- **The event page's series card.** `EventDetailDto` gains `series`, null for a standalone event
  (`L2-010` AC6): `{ id, title, number, total, cadence, joined, next }`, `next` being up to three
  sessions after this one in date order, cancelled ones included and counted (ADR 0080), each
  `{ id, startsAt, topic, cancelled }`. The card reads "Session <n> of <total> · <cadence>", the
  title, the dates as "Tue Apr 28" ("Tue May 12 · Cancelled" with the topic struck through), and
  one link to the series: "View series" when the member joined it, "Join the series" when not.
  The read, register and cancel answers all carry it.
- **Hosting.** The profile gains `series`, the listed series (ADR 0093's rule) the listing hosts,
  by next session, then id, at most 20, each `{ id, title, imageKey, cadence, startsAt,
  sessionsLeft }`; `hosting` keeps the one-off events and no longer holds a session event.
  `hostingCount` is the number of such series plus such one-off events, and the directory row's
  `hosting` count follows the same rule (`L2-054` AC2). A series row reads "Series · Every
  Tuesday", the title and "Next: Tue Apr 21, 6:30 PM · 5 sessions left" ("1 session left"), and
  leads to the series page.
- **Route.** `events/series/:id` is a lazy child of the member shell titled "Event series"; its
  service is bound on the page's own `providers`. A 5xx opens the server-error screen, a 404 the
  not-found view, any other failure "This series didn't load" with Try again and All events.

## Consequences

- No migration: the reads use `EventSeries`, the session events, `Registration` and
  `SeriesEnrolment` as they are.
- Journey 12 turns the read-only list into the plan-option radio group with Join and Leave;
  journey 13 adds the drop-in tick boxes as a `session-list` end; journey 16 adds `attended` to a
  session and the "You came" and "Missed" ends.
- `EventDetailDto` and `ListingProfileDto` gain a field, so their exact-keys tests change with
  this ADR; the e2e fixtures default `series` to null and `series` to empty.
