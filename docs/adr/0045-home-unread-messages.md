# 0045. Unread messages on Home and in member navigation

## Status

Accepted, 23 November 2026 (slice 13.2).

## Context

L2-007 AC1 requires Home to show the member's unread message count alongside their next and
suggested events, L2-008 AC1 to AC3 require both the desktop header and the mobile bottom bar to
show the unread count as text on Messages, and `journeys.detailed.md` (slice 13.2) requires Home's
Messages section with its partial and empty states (`docs/mocks/pages/home/default.html`,
`empty.html`, `loading.html`, `partial.html`). The detailed design left the rule for independent
failure (`partial`) as `<TO SUPPLY>`.

## Decision

- **`unreadCount` on `GET /api/home`.** `HomeDto` gains `unreadCount` (`int`), counting messages
  from other members after the caller's `ChatReadMarker` (or all messages from others when no
  marker exists) across the events the caller is registered for and the direct conversations they
  have received messages in, matching `ListConversationsHandler` (ADR 0042, ADR 0043).
- **Messages section on Home.** `HomePage` shows the `Messages` aside from `CONVERSATIONS`
  (`GET /api/conversations`): up to the three newest conversations as `cf-mini-row` items with
  `cf-avatar` and `cf-unread-dot` (`"{n} unread"`), an Open link to `/messages`, skeleton mini-rows
  while loading, and `cf-empty-state` (`inline`) reading "No messages yet. Register for an event
  and you'll join its group chat." when the member has no conversations.
- **Partial failure.** Because events come from `GET /api/home` and conversations from
  `GET /api/conversations`, a failure of `GET /api/conversations` (4xx or no answer; a 5xx opens
  the server-error screen, L2-043 AC4) while `GET /api/home` succeeded leaves the events on screen
  and renders `cf-inline-message` ("Messages didn't load." / "Your events are up to date.") with
  Try again, which reloads the conversations in place.
- **Shell navigation and shared inbox.** `MemberShell` renders both `cf-top-bar` and mobile
  `cf-tab-bar` (`Home`, `Events`, `Messages`, `Profile`; `Services` joins when its slice lands) and
  provides a shell-scoped `MemberInbox` service backed by `CONVERSATIONS`. Navigating between
  member screens refreshes the inbox once per navigation, so `MemberShell` (total `unread`) and
  `HomePage` (the three newest rows and retry) share a single `GET /api/conversations` request on
  `/home` and the unread badge updates after a member reads a chat.

## Consequences

- The shared Playwright fixture answers `GET /api/conversations` with `{ conversations: [] }` and
  includes `unreadCount: 0` on `GET /api/home` by default, so existing member specs stay answered.
- The mock's "New professionals" section in the Home aside remains out of scope until slice 16.1.
