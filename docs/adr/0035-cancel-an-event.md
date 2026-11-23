# 0035. Cancel an event

## Status

Accepted, 23 November 2026 (slice 11.2).

## Context

L2-023 AC2 lets an Admin cancel a published event after confirming: it leaves member lists, registered
members see it as cancelled in Profile and its group chat shows a cancellation notice. The detail design
leaves the confirmation mock, the refusal code and the Profile mark open, and the group chat does not exist
yet (slices 12.x), so there is no conversation to post to.

## Decision

- **Mocks.** `dialogs/cancel-event/` (default, busy, failed), the editor state `edit-published` (a
  published event offers Cancel event beside Save changes), the admin toast `event-cancelled` and the
  profile state `cancelled` are added. The design system gains the status `cancelled` and the
  `going-item--cancelled` row.
- **`POST /api/admin/events/{id}/cancel`** sends one `CancelEventCommand`, audited as `event.cancelled`
  (ADR 0023), and answers the `AdminEventDto` with status `cancelled`. Any status but `Published` is 409
  `event_not_published`; an unknown id is 404.
- **`Event.Cancel()`** bumps `RegistrationVersion` (ADR 0033), so a registration racing the cancel cannot
  commit; the handler reloads and decides again.
- **Registrations are kept.** Registered members still see the event in Profile "Going to", now with
  `cancelled: true` on the `UpcomingEventDto`; that row is not a link, because the event detail answers
  `event_not_found` for an event that is not published. Member lists, the landing page, detail and
  registering already read only `Published` events.
- **Staff list.** A cancelled event shows under All with a Cancelled badge; the Published tab and count
  exclude it.
- **Left out.** The cancellation notice in the group chat: no chat exists yet, so slice 12.x posts it when
  it creates the conversation, for any event already cancelled.

## Consequences

- A cancelled event cannot be published or cancelled again, or edited back to life.
- The member count of "going" in the admin list still counts the kept registrations.
