# 0083. Notification inbox: one stored list, one real-time connection per member session

## Status

Accepted, 25 November 2026 (journey 14, issue #164). Builds ADR 0068 and amends ADR 0039.

## Context

ADR 0068 chose an in-app inbox: a bell in the member top bar and a Notifications screen, fed over
"the existing SignalR connection through the shared real-time client, never a new connection", with
a client list bounded to 50 and 30 days of storage. It left the record, the API and how a
notification reaches the bell to the first slice.

Until now the real-time connection (ADR 0039) was provided on the chat screen and stopped when the
member left it, so no connection existed on Home, Events or the Notifications screen, and the bell
could not change live. A second connection for notifications would break ADR 0068 and double every
member's sockets. No sender exists yet: journey 15 (cancelled series dates) is the first, then
reminders, cancelled events and followed hosts. The scheduler of ADR 0069 is not built.

## Decision

- **One connection per member session, owned by the member shell.** `SignalRChatConnection` (the
  real-time client) moves from the chat screen's `providers` to the member shell's. It is bound to
  two tokens: `CHAT_CONNECTION` (join, send, messages, cancelled; unchanged) and
  `NOTIFICATION_STREAM` (`received`). The shell starts it once it has rendered; the client library is
  still imported dynamically, so it stays out of the initial bundle. It stops, and drops every
  handler, when the shell is destroyed (sign out, or leaving the member area). The chat screen injects
  the shell's client and no longer stops it on leaving.
- **Chat groups after leaving a chat.** The connection stays in a chat's group until it closes, as a
  second open tab did before; the chat screen already keeps only messages for its own id, so a later
  chat never shows another's messages. Leaving a group explicitly is not needed by any requirement.
- **The record.** `Notifications(Id, MemberId, Kind, Title, Text, Href, CreatedAt, ReadAt)`: plain
  text title (at most 120 characters) and text (at most 300), and `Href`, an app-relative path
  (`/events/{id}`) the row links to. `Kind` is `NotificationKind`: `EventReminder`, `EventCancelled`,
  `SeriesDateCancelled` and `FollowedHostDates`, the four kinds of ADR 0068. Ids are version 7 from
  the creation instant; order is `CreatedAt`, then `Id`, newest first, indexed by member.
- **One way to send.** Application's `INotifier.NotifyAsync(NotificationRequest)` is the only way to
  create one: it checks the request (a known member, a kind, non-empty title within its limit, an
  app-relative `Href` starting with one `/`), stores it, drops that member's notifications older than
  30 days, saves once and pushes it to every connection of the member with `Clients.User` as
  `NotificationReceived` (a `NotificationDto`). Journey 33 adds the `MemberPreferences.Allows(kind)`
  check inside `NotifyAsync`, so no sender reads preferences itself. No feature calls it yet; the API
  tests call it as the test path. Journey 15 is the first sender.
- **API.** `GET /api/notifications` answers `{ notifications, unread }`: the caller's newest 50 from the
  last 30 days (`id`, `kind`, `title`, `text`, `href`, `createdAt`, `read`) and the number unread over
  the same 30 days (it can exceed 50). `POST /api/notifications/read` marks every unread notification of
  the caller read (204). Both need a member session (fallback policy); a person sees and changes only
  their own.
- **Retention without a scheduler.** A notification older than 30 days is never listed or counted
  (evaluated on read, ADR 0069's rule for stories), and each new notification deletes that member's
  expired ones. When the scheduler of ADR 0069 exists, a daily job may sweep members who receive
  nothing.
- **Client state.** `NotificationStore` (domain library, shell-scoped) holds the latest 50, newest
  first, and the unread count. It loads once when the shell opens and again when the Notifications
  screen opens; a pushed notification is put first (a repeated id is ignored), the oldest beyond 50 is
  dropped, and the count goes up by one. "Mark all as read" marks the held ones read and sets the
  count to zero once the server answers; a failure leaves them and says so in a toast-free inline
  alert on the screen. The bell reads the count: none at zero, the number to 9, `9+` above, and an
  accessible name "Notifications, 12 unread" (ADR 0068).
- **Telemetry.** Spans record `api/notifications` and `api/notifications/read` as templates; no log,
  metric or span carries a title, a text or an `Href`.

## Consequences

- Every member screen now opens one WebSocket once the shell renders; the e2e fixture answers the
  negotiate request and holds a default hub socket for every spec, and `FakeChatHub` adds `notify`.
- A notification sent while the member is offline is in the list the next time a screen loads it;
  reconnecting does not replay pushes (`withAutomaticReconnect` as before).
- `NotificationKind` replaces the kinds listed in the preferences design before ADR 0068 (`Message`,
  `FollowedListingDate`, `EventChange`); the design is updated in the same change.
- Web push, email for these kinds and the preference switches (journey 33) remain outside this ADR.
