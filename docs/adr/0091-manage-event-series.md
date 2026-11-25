# 0090. Manage event series and the grouped console navigation

## Status

Accepted, 25 November 2026 (journey 9, issue 159). Builds on ADR 0064, ADR 0079, ADR 0080 and
ADR 0089; amends the cadence wording and the "Sessions left" example of ADR 0080.

## Context

Journey 9 builds the first series code: the console's Event series screen (`L2-071` AC1–3, AC6–8,
AC10–16), the series editor and the Add a date dialog, under the grouped navigation of `L2-021`
with ADR 0064's table of what a Moderator opens. No series code existed: no `EventSeries`, no
session fields on `Event`, no `Series` staff area. The requirement, design, ADRs and mocks left
these open or disagreed:

- `L2-021` AC1 lists ten areas, but only Dashboard, Events, Services and Members have screens.
  AC3's counts need `GET /api/admin/counts` and an admin hub, neither of which exists.
- The Host picker's endpoints sit under `api/admin/events`, which refuses a Moderator, and so does
  the event image upload; a Moderator must be able to create a series (AC16, ADR 0064).
- The design asks whether the editor has a category (an open question); a session is an `Event`,
  which needs one, and members filter Events by it (`L2-009`).
- The design names `invalid_series` and `invalid_session`; AC11 says 400 `validation_failed` with
  `fieldCodes`, as events do.
- The mocks read "Every Tuesday · 6:30 PM" where ADR 0080 says "Weekly on Tuesdays", and
  "Sessions left 5 of 8" for eight dates with one cancelled, where ADR 0080 leaves the cancelled
  date out of both numbers.
- Nothing said what "joined" counts before members can join (journey 12), what a session event
  costs, whether "Done" and "Live" are decided by the API or the app, or what the admin Events
  "series tag" looks like (no mock drew it).

## Decision

- **Navigation.** `ADMIN_AREAS` carries each area's group (none, Publish, Gather or Community) and
  lists the areas that have a screen: Dashboard; Gather: Events, Event series; Community: Services,
  Members. A group shows only when it holds an area the role opens, so Publish appears with
  Stories or Newsletter. Each later area joins the list, in `L2-021`'s order, with its screen. An
  Admin sees each group as an `h2.admin-nav__group` over a `ul.admin-nav__list` labelled by it,
  Dashboard in an unlabelled list first (ADR 0079); a Moderator sees one unlabelled list. Below LG
  the group names are hidden and the lists run on in one sideways row. From LG the links scroll
  inside the column while the brand and the person stay in view (AC4). The counts of AC3 wait for
  `GET /api/admin/counts` and the admin hub (ADR 0079), a slice of their own; until then no link
  carries one.
- **Moderator areas (ADR 0064).** `StaffArea` gains `Series` (route segment `series`), opened to
  Admins and Moderators by `StaffAccess.Allows`; the other ADR 0064 areas gain their member with
  their first controller, as ADR 0064 says. `canManage` opens `series` to a Moderator. The "Admins
  only" screen reads ADR 0064's general words.
- **Endpoints.** Under `api/admin/series`, each sending one MediatR request: `GET` (the list),
  `GET {id}`, `POST` (create, 201), `PUT {id}`, `POST {id}/sessions` (add a date, 201),
  `GET hosts?q=`, `GET hosts/default` and `POST images`. The last three send the same requests as
  the event editor's (ADR 0089, ADR 0025), so the picker and the upload behave alike and a
  Moderator can use them; images are still served from `/api/events/images/{key}`.
- **Model.** `EventSeries`: `Title`, `Category`, `Summary` (the description), `ImageKey`,
  `HostListingId` (non-null, a Listed listing), `PriceCents` (0 is free), `DropInPriceCents`
  (null is no drop-in), `Capacity`, `Place`, `Area` (the suggestion area) and `CreatedAt`. A
  session is an `Event` with `SeriesId`, an optional `Topic` (up to 200 characters) and an
  `EndsAt`; standalone events keep all three null. A session's number is derived (ADR 0080).
  `SeriesEnrolment` (`SeriesId`, `MemberId`, `Status`, `CreatedAt`, unique per pair) is created
  here so "Joined" and the capacity rule read it; journey 12 adds joining and leaving.
- **Category.** The editor asks for one, the same list as events, so sessions file under it in
  Events (`L2-071` AC12 amended; the series-editor mocks gain the field).
- **A session event** is published as soon as it is added, with the series' title, category,
  place, area, capacity, description, image and host, and as its price the drop-in price, or the
  series price when there is no drop-in. Saving the series copies those fields to every session
  that has not started; started sessions keep what members attended.
- **Refusals.** 400 `validation_failed` with `fieldCodes`, the event editor's codes for the shared
  fields (`title_required`, `category_required`, `host_required`, `host_not_listed`,
  `summary_required`, `place_required`, `area_required`, `price_invalid` on `priceCents` and
  `dropInPriceCents`, `capacity_required`, `capacity_out_of_range`, `image_invalid` and the
  too-long codes). Add a date: `date_required`, `start_time_required`, `end_time_required`,
  `start_in_past` (on `date`, the start not after now), `end_not_after_start` (on `endTime`) and
  `topic_too_long`. A capacity below the members joined is 409 `capacity_below_joined`; the editor
  names the number from the series it opened with. An unknown series is 404 `not_found`.
- **Answers.** The list row carries `id`, `title`, `cadence`, `startsAt`, `joined` and `capacity`;
  the series adds the host, place, area, prices, `firstStartsAt`, `lastStartsAt`, `sessionsLeft`,
  `sessionsHeld` and the sessions, each with `id`, `number`, `startsAt`, `endsAt`, `topic` and
  `state`. `cadence` is numbers, never words: `{ weekday, dates }`, the weekday (0 Sunday to 6
  Saturday, in Toronto) when every held date falls 7 days after the one before on that weekday,
  else null, and the count of held dates. `startsAt` is the next held session's start, else the
  last held one's, else null. The API decides each `state`: `cancelled`; `done` once a held
  session's end (its start when it has none) has passed; `live` for the first held session not
  done; `upcoming` for the rest. The app words them "Cancelled", "Done", "Live" and nothing.
- **Wording.** A weekly cadence reads "Every Tuesday", as the mocks and the design system draw it,
  in place of ADR 0080's "Weekly on Tuesdays"; otherwise "<n> dates", and "No dates yet" with
  none. "Sessions left <left> of <held>" leaves cancelled dates out of both, as ADR 0080 decides;
  the mocks' "5 of 8" becomes "5 of 7".
- **Order.** By the next held session's start, then series with no session left, then by title,
  then id (ADR 0080), at most 100.
- **Series tag in Events.** `AdminEventDto` gains `series` (`id`, `title`) for a session event;
  the Events row reads "Part of <series> · <place>" under its title (the `admin-events` mock gains
  such a row). Member Events lists every session event until journey 10 applies ADR 0080's "next
  session only" rule.
- **Toasts.** "<title> created", "<title> updated" and "<Tue Jun 2> added", with the toast region
  every admin screen uses.
- **Audit and telemetry.** `series.created`, `series.updated` and `series.session_added`, each
  recorded as `EventSeries` with the series' id; no log, span or metric carries a title,
  description or topic.

## Consequences

- Journeys 10 to 13 build on `EventSeries`, the session fields and `SeriesEnrolment` without a new
  table; journey 12 adds joining (and the enrolment's status rules), journey 15 cancelling and
  restoring a date, which this screen does not offer yet.
- A Moderator's navigation reads Dashboard, Event series and Members until their other areas ship.
- The navigation counts and the admin hub remain to be built (`L2-021` AC3).
