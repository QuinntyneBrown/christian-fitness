# 0106. Record event attendance: the Attendance staff area, the endpoints and their answers, one `Attendance` row per member and event, the audit, the busy box, and what members read

## Status

Accepted, 26 November 2026 (journey 16, issue 166). Builds on ADR 0011, ADR 0020, ADR 0023,
ADR 0036, ADR 0064, ADR 0096, ADR 0101 and ADR 0102; amends `L2-080` AC9, the detailed design
`admin-events/record-attendance`, the mock `admin-event-attendance/failed` and the design
system's `checkbox`.

## Context

Journey 16 lets staff tick who came to an event (`L2-080`) and shows members "You came",
"Missed", "Not recorded" and "Came to <attended> of <recorded>" on their series (`L2-051` AC3,
`L2-052` AC3 and AC9). The requirement, design and mocks left these open or disagreed:

- The design puts both endpoints on `AdminEventsController` under a new policy that admits
  Moderators, but a staff area is decided per controller from its route's first segment (ADR
  0020), and every `api/admin/events` route is the Events area, Admins only.
- The design's `AttendancePageDto` has no title or start, yet the page shows the event's title
  and, before the start, "<title> starts <when>". A Moderator cannot read the event itself
  (`GET /api/admin/events/{id}` is Events).
- The design leaves the answer of a saved tick open, and what happens on a second tick of a box
  whose save is still on its way.
- `L2-080` AC9 asks for "how many members were marked" in the audit entry, which records only who,
  what, which record and when (ADR 0023).
- `L2-080` AC9 says a member is refused with HTTP 403, but a member's session on `api/admin`
  answers 401 like nobody's (ADR 0011), as every admin endpoint does.
- The mock's toast reads "Her box is back as it was"; the app does not know a member's pronouns.
- The design-system checkbox has no busy state, and its name changes when its words read
  "Saving…"; the design system also says a choice that applies at once is a switch.

## Decision

- **The Attendance staff area.** A new `StaffArea.Attendance`, open to Admins and Moderators
  (`StaffAccess`), is the area of the route template `api/admin/events/{id:guid}/attendance`,
  matched ahead of the `events` segment. The endpoints live on their own controller,
  `AdminEventAttendanceController`, routed there; every other Events route stays Admins only.
- **Endpoints.** `GET /api/admin/events/{id}/attendance` answers `{ eventId, title, startsAt,
  started, registered, came, items }`, `items` being `{ memberId, name, came }` for each member
  holding a registration at the event, ordered by name and then member id, at most 500 (as ADR
  0036). Before the start `started` is false and `items` is empty, while `registered` still counts
  the registrations ("17 members are registered"). `came` is `true` only where staff saved a tick.
  `PUT /api/admin/events/{id}/attendance/{memberId}` with `{ came }` saves it and answers 204.
  Refusals: 404 `event_not_found`, 409 `event_not_started` (the start is after the API's clock,
  `AttendanceRules.HasStarted`), 404 `not_registered` (no registration of that member there).
- **One row per member and event.** `Attendance` (`EventId`, `MemberId`, `Came`, `RecordedBy`,
  `RecordedAt`), unique on the pair. A tick or a clear upserts it; either makes the session
  recorded for that member. Two staff saving the same member at once: the later insert meets the
  unique index, reloads the row and updates it. Registrations, enrolment and going counts are not
  touched (`L2-080` AC8).
- **The audit.** Each saved change is one entry, `event.attendance_recorded`, on the `Event`, by
  the staff member. A tick marks one member, so how many members were marked is the number of
  entries for the event, and the entry stays free of the member's id and name (ADR 0023). Saving
  the value already recorded changes nothing and records nothing. Telemetry adds no tag: the
  route is its template.
- **The refusal for members.** `L2-080` AC9 now reads that a member's session is refused like
  nobody's (HTTP 401, ADR 0011), and a staff member whose role was taken away with HTTP 403
  `not_staff` (`L2-019` AC4).
- **The page.** `/events/:id/attendance` in the admin app, a routed page with the event tabs
  Registrations and Attendance (the Registrations page gains them too). Moderators reach it by its
  address; the Events list stays Admins only (the design's open question stands).
- **The tick.** `AttendanceTracker` (domain, provided on the page) shows a tick at once, marks the
  box busy ("Saving <name>…" in the polite status line, the box's words "Saving…",
  `aria-busy="true"`) and sends it. A second tick while the first is on its way is shown and sent
  once the first answers, so the last tick wins and only one request per member is in flight. A
  failure puts the box back to the last saved value and shows the danger toast "We couldn't save
  <name>" with "Their box is back as it was. Try again."; focus stays on the box, which is never
  disabled, and no other box changes. The count, "Came: <n> of <registered>", is read from the
  boxes shown.
- **The checkbox.** The design-system checkbox gains a busy state (`aria-busy="true"`, still
  enabled) and an accessible name by `aria-label` for a box whose words change ("Came: Grace
  Thompson"). A Came box is a record in a list of people, as the requirement names it, so it stays
  a checkbox although it saves at once.
- **What members read.** `SeriesSessionDto` gains `attended`: `true`, `false`, or `null` where no
  row exists for the signed-in member at that session. A past session where they held a place
  reads "You came" (with the check icon, `session-row__came`), "Missed" or "Not recorded"; one
  where they held none reads "Done". "Came to <attended> of <recorded>" counts past sessions whose
  `attended` is not `null`; with none it reads "Attendance not recorded yet". The meter's bar of a
  session the member came to is `done`.

## Consequences

- A Moderator records attendance only by the address until the design's open question is decided.
- The audit can tell how many ticks were saved for an event, not who was marked, by design.
- The Members table's "events attended" does not yet read these rows.
