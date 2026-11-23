# 0036. View event registrations

## Status

Accepted, 23 November 2026 (slice 24.1).

## Context

L2-024 AC1 lets an Admin open an event's registrations and see each registered member's name and
registration date, with a total that matches going. The detail design leaves the mock, the refusal code, the
page size and the CSV file name open (`<TO SUPPLY>`), and the slice list names only the list and the
capacity used.

## Decision

- **Mocks.** `pages/admin-event-registrations/` (default, loading, empty, error) is composed from the
  breadcrumb, progress bar, table, skeleton and empty-state components; the editor state `edit-published`
  gains a View registrations button beside Cancel event, so no row action is added to the table.
- **`GET /api/admin/events/{id}/registrations`** sends one `GetEventRegistrationsQuery` and answers
  `{ eventId, title, capacity, going, registrations: [{ name, registeredAt }] }`, oldest first. Nothing else about
  a member is in the answer. An unknown event is 404 `not_found`, as every other staff event read.
- **Bound.** One answer holds at most 500 rows (`GetEventRegistrationsQuery.Limit`); `going` is the true count.
- **The staff list's `going`** now counts the real registrations (it was fixed at 0 before slice 6.1), so the
  table and the registrations page agree.
- **Left out.** The CSV export (L2-024 AC2) is a separate slice of the journey; this slice answers AC1 only.

## Consequences

- The page reads one event's registrations at a time and holds them only while it is open.
- The CSV slice adds `registrations.csv` beside this endpoint and a button on the page.
