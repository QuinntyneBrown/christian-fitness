# 0041. Group membership

## Status

Accepted, 23 November 2026 (slice 12.3).

## Context

L2-016 lets only registered members into an event's group chat, L2-012 AC1 makes cancelling a
registration leave it, and L2-023 AC2 makes a cancelled event's chat show a cancellation notice. ADR 0034
and ADR 0035 deferred leaving and the notice to the chat; ADR 0039 left a joined member receiving until
they disconnected.

## Decision

- **A registration is the membership.** No separate membership record: it would have to be kept equal to
  the registration. Join, send and history already read the registration.
- **Leaving.** `CancelRegistrationHandler` calls `IChatChannel.LeaveAsync(memberId, eventId)` after the
  save. `HubChatChannel` records each joined connection by member and event, and removes those
  connections from the SignalR group. A closed connection is dropped from the map in
  `OnDisconnectedAsync`, so the map is as large as the live connections.
- **Cancelled event.** `CancelEventHandler` calls `NotifyCancelledAsync`, which pushes
  `EventCancelled(eventId)` to the group. A send to a cancelled event is refused `event_cancelled`; the
  history carries `cancelled` so a member opening the chat later sees the notice. The chat stays
  readable. The notice is an info alert in place of the composer (mock `messages/cancelled`), not a stored
  message, so no message of the system is invented.

## Consequences

- With several server instances the map and group live per instance; the backplane noted in ADR 0039
  must carry leaves too.
- A member who cancels while the chat page is open is not told on screen; their next send fails as "Not
  sent". A member-facing "you left" state can follow the messages list (15.1).
