# 0093. Browse event series: the Series view, its address and one session a series in By date

## Status

Accepted, 25 November 2026 (journey 10, issue 160). Builds on ADR 0030, ADR 0080, ADR 0081 and
ADR 0091.

## Context

Journey 10 builds the member's Series view of Events (`L2-050`), the view switch and new subtitle
(`L2-009` AC11) and the "next session only" rule of the By-date list (`L2-009` AC1, ADR 0080) on
the series model of journey 9. The requirement, design and mocks left these open or disagreed:

- `L2-050` lists "published series", but `EventSeries` has no status (ADR 0091): a session is
  published as soon as it is added.
- The design's open questions: whether By date lists every session or only the next one (now
  settled by `L2-009` AC1 and ADR 0080), the two counts of a session (`Session 3 of 8` against
  `2 of 7 sessions done`, settled by ADR 0080), the cap of 100 (settled by `L2-050` AC5) and the
  series search, which ADR 0081 left to this journey.
- What the address holds in the Series view, what the switch keeps, what "Series (<count>)" reads
  before the count arrives, what the meter's "next" bar is when ADR 0091's states say `live`, and
  how the row words its price and date range ("$64 for all 8", "Apr 7 – May 26", "Jan – Jun").
- Where a row leads: the series page (`L2-051`) is journey 11's.

## Decision

- **A listed series** is one with at least one session that is published, not cancelled and not
  started (`StartsAt` after the API's now). With no series status, "not published" is a series
  with no such session: one with no dates, or only past or cancelled ones, is not listed
  (`L2-050` AC5).
- **Endpoints**, each behind the fallback authentication policy and sending one MediatR request:
  `GET /api/events/series?category=&q=&joined=true` answers `{ series: [...] }`, the listed series
  by next session start, then id, at most 100 with no paging; `GET /api/events/series/count`
  answers `{ count }`, the same list with no filter (`L2-050` AC6). An unknown category is 400
  `validation_failed` with `fieldCodes.category` = `category_invalid`, as `GET /api/events`.
  `q` is ADR 0081's search (trimmed, any case, blank is none) and `joined=true`, exactly, keeps
  the series the **signed-in member** holds an enrolment in, read from the session.
- **A row** carries `id`, `title`, `category`, `imageKey`, `host` (the editor's `{ id, kind, name }`), `area`,
  `cadence` (ADR 0091's `{ weekday, dates }`), `startsAt` (the next listed session's start),
  `firstStartsAt` and `lastStartsAt` (the first and last held dates), `sessions` (one state a
  session in date order, ADR 0091's `done`, `live`, `upcoming` or `cancelled`), `priceCents` and
  `joined` (a boolean). Numbers and states are data; the app words them.
- **The row's words.** The meta reads cadence and the next session's Toronto time ("Every Tuesday ·
  6:30 PM"). The line under the title reads host, area and the date range: days for a weekly
  cadence ("Apr 7 – May 26"), months otherwise ("Jan – Jun", one month alone). The meter draws a
  bar a session: `done` filled, `live` as the next bar (`session-meter__bar--next`), `upcoming`
  plain and `cancelled` faded; its hidden text "<done> of <total> sessions done" counts the held
  sessions only (ADR 0080). The end reads "Joined" (a `tag`) where the member has joined, else
  "Free" or "<price> for all <held>", and "Next <Mon D>".
- **The address.** The Series view is `/events?view=series`, then `category`, `q` and
  `joined=true`, each left out when unset; any other `view` is By date (`L2-050` AC7). The chips
  keep the search and the tick; the tick keeps the category and the search; typing waits 300 ms
  and replaces the address (ADR 0081). The view switch's options are `/events` and
  `/events?view=series`: switching views clears the search and the filters, since each view has
  its own tick.
- **The count.** Events asks for it once on arrival, not on each filter. Until it answers, or if
  it fails with a 4xx or no answer, the option reads "Series", so the switch never waits on it and
  such a failure is silent; a 5xx opens the server-error screen, as every request's does (ADR 0006).
- **No match.** The Series view reads "No series here yet" and "Series are weekly or monthly
  programs you can join once and come to every time." whatever filter is set; "Show all series"
  goes to `/events?view=series` and empties the field (`L2-050` AC3). With nothing chosen the same
  state shows without the action, which would change nothing.
- **Rows lead to `/events/series/<id>`**, the series page journey 11 builds; until then the
  address opens the member app's not-found screen.
- **By date lists one session a series**: of the sessions that match the selection (category,
  search, "Only events I'm going to"), only each series' first, by start then id, before the
  cursor pages. Its card adds the line "Part of <series> · Session <n> of <total> · <cadence>",
  with `n` its position among all the series' dates and `total` all of them, cancelled ones
  included (ADR 0080, `L2-071` AC6). `EventSummaryDto` gains `series`
  (`{ id, title, number, total, cadence }`), null for a standalone event.
- **Library parts.** `segmented-control` (block `segmented`), `series-row` in `series-card/`
  and `session-meter` in `session-list/` are built in the components library from their design
  system pages; the series list is the library's card `list`, the filters the existing chip bar,
  checkbox, empty state and skeleton. The event card gains an optional `series` line
  (`event-card__series`).

## Consequences

- No migration: the read uses journey 9's `EventSeries`, `Event.SeriesId` and `SeriesEnrolment`.
- The e2e fixture answers `GET /api/events/series/count` with no series by default, since every
  visit to Events now asks for it.
- Journey 11 builds the page each row leads to; journey 12 creates the enrolments that "Joined"
  and the tick read.
