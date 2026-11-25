# Browse event series

## Overview

Christian Fitness is a Christian community for health in body and spirit in the Greater Toronto Area. An _event_ is a gathering staff publish for members: a run, workout, basketball game, mobility session, workshop or retreat. The events subsystem lets a member find events and series, read their detail, and take a place within each one's capacity (`L1-005`).

- **event series** — program of dated sessions with one host, one place, one capacity and one group chat, such as eight Tuesdays of Couch to 5K
- **session** — one dated meeting of a series, stored as an `Event` that carries the series' id and its number
- **cadence** — text naming how often a series meets, such as "Every Tuesday" or "Last Thursday of the month"
- **enrolment** — record that a member joined a series and holds a place at each of its sessions still to come
- **listed series** — published series with at least one session that is neither started nor cancelled

This feature covers the Series view of the Events screen in the Member web app (mocks `docs/mocks/pages/events/series.html`, `series-joined.html`, `series-empty.html`, `series-loading.html` and `series-error.html`). A view switch on Events offers "By date" and "Series (<count>)". The Series view lists the listed series by next session date, narrows them by category and by "Only series I've joined", and leads each row to the series (`L2-051`).

**How a series relates to existing types.** A series is a new `EventSeries` row. Each of its sessions is an ordinary `Event` (`backend/src/ChristianFitness.Domain/Events/Event.cs`) with three new nullable fields: `SeriesId`, `SessionNumber` and `Topic`. A session takes the series' category, place, area and capacity, and the drop-in price as its `PriceCents`. A place at a session is an ordinary `Registration`. The By-date list (`ListEventsHandler`) therefore lists sessions with no change to its query, and the capacity rules of `L2-011` apply to each session unchanged.

## Description

The feature is a vertical slice from the Series view to the database.

- **`EventsPage`** — existing routed page in `projects/web` (`pages/events/events-page.ts`). It gains a `view` signal read from the address (`view=series`, anything else is "By date", `L2-050` AC7) and renders the `SegmentedControl`. On arrival it asks `count()` once for the "Series (<count>)" label (`L2-050` AC6). It binds `EVENT_SERIES_SERVICE` to `HttpEventSeriesService` on its own `providers`, beside `EVENTS_SERVICE`.
- **`EventSeriesView`** — new component in `pages/events/`, created only while the view is "Series", so the By-date feed and the series list never live at once. It holds the filter and the loaded rows as signals. It shows the skeleton rows, the `series-row` list, the "No series here yet" empty state with "Show all series", and the "Series didn't load" error state with Try again; the switch and filters stay in each state (`L2-050` AC3, AC4).
- **Search** — the shared "Search events" field filters series titles using trimmed, case-insensitive text alongside category and joined-only filters (`L2-075`). Changing it replaces the list; "Show all series" clears the search and both filters (mock `series-search-no-results`).
- **`SegmentedControl`** — new presentation component (`components/src/segmented-control/`, block `segmented`, design-system page `segmented-control`). Each option is a link with `aria-current="page"` on the current one, as the category chips are (ADR 0030).
- **`SeriesCard`** — new presentation component (`components/src/series-card/`, design-system page `series-card`). Its row form renders block `series-row`: image, cadence and time, title, host, area and date range, the session meter, "Joined" (`tag`) or the price, and "Next <date>". It takes a view model input and renders every text as text.
- **`SessionList`** — new presentation component (`components/src/session-list/`); this slice uses its `session-meter` element: one bar per session, modified `--done`, `--next` or `--cancelled`, with a visually hidden "<done> of <total> sessions done".
- **`ChipBar`, `Chip`, `Checkbox`, `EmptyState`, `Skeleton`** — existing components, reused for the category filter, the "Only series I've joined" tick, the empty and error states and the skeleton rows.
- **`seriesFilterOf` / `seriesAddressOf`** — pure helpers in `domain/src/events/series-filter.ts`. They read and write `view`, `category` and `joined` in the address; an unknown category falls back to all, as `eventCategoryOf` does (`L2-009` AC9).
- **`seriesRowViewOf` / `seriesMeterOf`** — pure helpers in `domain/src/events/series-row-view.ts`. They word the date range ("Apr 7 – May 26"; months only for a monthly cadence, as "Jan – Jun"), the price ("$64 for all 8", "Free"), "Next Apr 21", and the meter bars and done text, in Toronto time.
- **`EventSeriesApi / EVENT_SERIES_SERVICE`** — new contract and token in `api/src/events/event-series.ts`. `list(filter)` returns a `SeriesListDto`; `count()` returns the number of listed series. Later slices add `get`, `join`, `leave` and `setDropIns` to the same contract.
- **`HttpEventSeriesService`** — new HTTP implementation in `projects/web/src/app/services/`. It calls `GET /api/events/series` with category, joined and search filters, and `GET /api/events/series/count`.
- **`SeriesController`** — new ASP.NET Core controller at `api/events/series`, behind the fallback authentication policy. Each action sends one MediatR request and checks nothing.
- **`ListSeriesQuery / ListSeriesHandler`** — new MediatR query and handler in `Application/Series/`. The handler reads published `EventSeries` with a session whose `StartsAt > now` (from `TimeProvider`) and whose status is not `Cancelled` (`L2-050` AC5). It applies the optional category, title search and, with `JoinedOnly`, the caller's `SeriesEnrolment`. It orders by the next session's start, then `Id`, and returns at most 100 rows. Each row's `Sessions` holds one state per session: `done`, `next`, `upcoming` or `cancelled`.
- **`CountSeriesQuery / CountSeriesHandler`** — counts the same list with no category and no tick (`L2-050` AC6).
- **`ListSeriesValidator`** — refuses an unknown category with 400 `validation_failed` and `fieldCodes.category` = `category_invalid`, as `ListEventsValidator` does (ADR 0030).
- **`EventSeries`** — new domain entity in `Domain/Events/`: `Title`, `Category`, `Cadence`, `Place`, `Area`, `Summary`, `ImageKey`, `HostListingId`, `PriceCents`, `DropInPriceCents`, `Capacity`, `Status` (the existing `EventStatus`) and `CreatedAt`. `IAppDbContext` gains `EventSeries` and `SeriesEnrolments` sets; a migration adds the tables and the `Event` columns, with an index on `Event.SeriesId`.
- **`SeriesEnrolment`** — new domain entity (`SeriesId`, `MemberId`, `Status`, `CreatedAt`) with a unique index on (`SeriesId`, `MemberId`); its rules belong to `join-and-leave-series`. This slice reads it for "Joined".

The list holds at most 100 rows and is replaced, never appended, on each filter change, so a long session does not grow it (`L2-037`).

### Open questions

- The Events screen mock lists one session per series in the By-date view ("Session 3 of 8 · Every Tuesday"), while `L2-050` states that each session with an event page is listed as an event. The design stores every session as an `Event`, so every session to come is listed. Whether some sessions have no event page, or only the next session is listed, is `<TO SUPPLY>`; a rule other than "every session" needs an ADR.
- The mock reads "2 of 7 sessions done" for Couch to 5K, which has 8 sessions with 1 cancelled: the total leaves cancelled sessions out, while `L2-071` AC6 counts cancelled sessions in "Session <n> of <total>". The design follows the mock for the meter text and `L2-071` AC6 for the session number; an ADR should record both counts.
- `L2-050` states no paging. The design caps the answer at 100 rows; the cap needs an ADR or a requirement.
- Cadence is stored as staff type it. Whether it is derived from the session dates is `<TO SUPPLY>` until a screen to create a series exists (`docs/mocks/README.md` open question 10).
- The host is a directory listing (`L2-055`). `HostListingId` depends on the listing type the directory designs introduce; no listing entity exists in the code yet.
- The `search` field is future work under `L2-075`.
- `L2-009` AC1 and AC11 (the "Session <n> of <total> · <cadence>" line and the switch on the By-date view) belong to `events/browse-events`; this design supplies the count and the series fields they read.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier. The L2 specification states its requirements as acceptance criteria; the text below condenses those criteria faithfully.

| L2 ID    | Refines (L1) | Requirement |
| -------- | ------------ | ----------- |
| `L2-050` | `L1-005`     | Choosing "Series" on Events shall set the address to `/events?view=series` and list published series with a session still to come by next session date, each with image, cadence and time, title, host, area, date range, one bar per session (done, next, still to come, cancelled) with "<done> of <total> sessions done" for assistive technology, "Joined" or the series price, and the next session's date, each leading to the series. A category shall narrow the list, mark its chip current and appear in the address; "Only series I've joined" shall narrow it to joined series. No match shall read "No series here yet" with "Show all series", which clears the search and both filters. Loading shall show skeleton rows; a failure shall offer Try again while the switch and filters stay. A series that is unpublished or has every session past or cancelled shall not be listed. "Series (<count>)" shall count the unfiltered list. An address with `view=series` shall open the Series view with its filters; any other `view` shall show "By date". |
| `L2-037` | `L1-014`     | When a screen is left and destroyed, its subscriptions, timers, listeners and real-time handlers shall be released; after 50 moves between screens the heap shall return to within 10% of its level after the first visit. The series list is bounded and replaced on each filter change. |
| `L2-075` | `L1-005` | The Events screen shall let a member search the current list by text. |

## Diagrams

### System context

A member browses series in Christian Fitness; staff publish them. The system exports telemetry without personal data.

![C4 system context: browse event series](diagrams/c4-context.png)

### Containers

The Member web app calls the Christian Fitness API, which reads series, their session events and the caller's enrolments from the database.

![C4 container view: browse event series](diagrams/c4-container.png)

### Components

`SeriesController` sends `ListSeriesQuery` or `CountSeriesQuery`; the handlers read through `IAppDbContext` and validate the category with `ListSeriesValidator`.

![C4 component view: browse event series](diagrams/c4-component.png)

### Class structure

An `EventSeries` owns its sessions as `Event` rows linked by `SeriesId`, and its enrolments. `EventsPage` owns `EventSeriesView`, which depends on `EventSeriesApi` and the domain helpers.

![Class diagram: browse event series](diagrams/class.png)

### Behaviour — list and filter series

The page asks for the count, then the view asks for the list; a category or the tick replaces the list and updates the address.

![Sequence diagram: list and filter event series](diagrams/sequence-list.png)
