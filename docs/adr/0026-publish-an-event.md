# 0026. Publish an event: save then publish from the editor, one transition on the entity and a publish that can be retried

## Status

Accepted, 23 November 2026 (slice 11.1).

## Context

Slice 11.1 lets staff publish a draft so members can find it (L2-023 AC1). The editor mock already
draws Publish beside Save draft on a new event, with the states `busy` ("Publishing…") and the
`admin-toast/success` toast ("{title} is live"), and the danger toast "Couldn't publish {title}.
Your changes are saved as a draft." But a draft that is being edited showed only Save changes
(or, on a published event, "Move to drafts", dropped in ADR 0025), so a saved draft could not be
published, and the failure was a toast with a Try again action that the toast store cannot carry.
The members' Events and landing screens (slices 4.1 and 8.1) do not exist yet, so "members see it"
cannot be shown end to end here.

## Decision

- **One transition.** `Event.Publish()` moves a `Draft` to `Published`; any other status refuses
  with 409 `event_not_draft`. `POST /api/admin/events/{id}/publish` answers 200 with the
  `AdminEventDto`; an unknown id is 404 `not_found`. It is a staff command, audited as
  `event.published` (ADR 0023). A draft whose start has passed is refused with 400
  `validation_failed` and `fieldCodes.date` = `start_in_past`, since members would be offered
  something that has begun; editing the date lifts it.
- **Publish saves, then publishes.** In the editor, Publish sends the fields (create for a new
  event, update for a draft) and then the publish request, so what staff see is what goes live. The
  editor keeps the id the first save returned, so a retry updates that draft and never creates a
  second one.
- **Mock states added.** `event-editor/edit-draft` (a draft being edited: Save changes keeps it a
  draft, Publish makes it live) and `event-editor/publish-failed` (the save worked and the publish
  did not: the alert "Couldn't publish the event. Your changes are saved as a draft. Try again." at
  the top of the drawer, every field kept, Publish tries again). The mock's danger toast with Try
  again is replaced by that in-drawer alert, because a toast with an action is not a component the
  toast store supports and the alert already carries "everything kept".
- **A publish that fails after a save.** The editor stays open on the alert above. If staff close it
  instead, it closes with the saved draft, so the list shows it and says "Draft saved" or "Changes
  saved" as for any save.
- **Members see it later.** Whether a member sees a published event is the member queries' rule
  (slices 4.1 and 8.1 filter on `Published` and a future start). This slice proves the status
  change through the admin API and list; those slices prove the visibility.

## Consequences

- Slices 4.1 and 8.1 read `EventStatus.Published`; nothing here changes them.
- Slice 11.2 adds `Event.Cancel()` beside `Publish()` with the same shape.
- A draft in the past cannot be published until its date is edited, which is a rule staff can see.
