# 0034. Cancel a registration

## Status

Accepted, 23 November 2026 (slice 7.1).

## Context

L2-012 lets a registered member give up a place in a confirmation dialog before the event starts, and
refuses it with `event_started` after. The detail design leaves three questions open: no mock shows the
dialog (the event-detail mock offers "Can't make it" leading to an undo toast), the mock copy asks for 24
hours' notice, and a reserved (paid) place has no refund rule. The group chat does not exist yet
(slices 12.x), so there is no membership to remove.

## Decision

- **Dialog, not toast.** L2-012 AC1 names a dialog, so the mock `dialogs/cancel-registration/`
  (default, busy, failed) is added and "Can't make it" opens it. The mock's schedule copy about 24 hours
  is not a rule: only `now >= StartsAt` refuses, as the requirement states.
- **`DELETE /api/events/{id}/registrations/me`** sends one `CancelRegistrationCommand` and answers the
  event as the member now sees it (same `EventDetailDto`, `registration` null, `going` one lower). With
  no registration it changes nothing and answers the same; an unknown or unpublished event is
  `event_not_found`; a started one is 409 `event_started`.
- **`Event.ReleasePlace()`** bumps `RegistrationVersion` in the same save as the removal, so a cancel and
  a registration racing for the same place cannot both commit (ADR 0033); the handler reloads and decides
  again on a conflict.
- **The dialog makes the call** through the screen's `EVENTS_SERVICE`, stays open with the mock's
  `failed` message on any refusal (including `event_started`: the user sees a generic message) and closes
  with the updated event.
- **Left out.** Leaving the group chat (no chat yet; slice 12.x removes the participant when it creates
  one) and any refund for a reserved place: the payment is made outside the system, so nothing is
  returned.

## Consequences

- Registering again after a cancel is allowed while places are left.
- A started event keeps its registrations; staff cancelling an event is slice 11.2.
