# 0039. Real-time group chat

## Status

Accepted, 23 November 2026 (slice 12.1).

## Context

L2-016 asks for messages that reach every participant within a second, refused with `message_invalid`
and `not_a_participant`, shown as plain text, with at most 200 held in the client. Slice 12.1 is the first
real-time slice: live send and receive in an event's group chat. History, failed-send retry and the
catch-up after a dropped connection belong to 12.2, and leaving the group on cancelling a registration to
12.3. The messages mock draws the whole inbox (conversation list, direct messages); the list is 15.1 and
direct messages 14.1.

## Decision

- **Hub `ChatHub` at `/api/chat`.** `Join(eventId)` and `Send(eventId, text)` each send one MediatR request
  and return its `ChatAnswer { code, title, memberId }`. A refusal is an answer with a `code`, never an
  exception. The session cookie authenticates the connection through the fallback policy, under `/api` so
  the dev proxy and the e2e fixture already cover it. Pushed message: `MessageReceived(ChatMessageDto)`.
- **Participant = registered for the event.** `JoinChatHandler` and `SendChatMessageHandler` read the
  registration; no other membership record exists yet (12.3 reworks leaving). An unknown event and an
  unregistered member are both `not_a_participant`. Text outside 1 to 2,000 characters (blank counts as
  empty) is `message_invalid`.
- **`IChatChannel`** (Application) hides the hub: `HubChatChannel` adds a connection to the group
  `event-chat:{id}` and sends to it. Handlers stay testable and the hub checks nothing.
- **Not stored yet.** A message is delivered live and not saved; history is slice 12.2, which adds the
  table. Telemetry carries no text: the only recorded request is the negotiate route template.
- **Client.** Contract `ChatConnection` and token `CHAT_CONNECTION` in `@cf/api`; `SignalRChatConnection`
  is provided on the chat page only, imports `@microsoft/signalr` on first join, and on destroy removes the
  handler, completes its stream and stops the connection. `withChatMessage` (domain) bounds the page's
  messages to 200 and de-duplicates by id.
- **Screen.** Route `/events/:id/chat` (lazy `EventChatPage`) uses the library's `thread` and `composer`
  with a page-scoped head (back link, name, "Event group"). The mock's inbox list beside the thread is
  15.1's. Event detail shows a **Group chat** button beside "Can't make it" for a registered member
  (L2-010 AC3, mock `event-detail/default`); a refused join says "You're not in this group chat".
- **`Thread` scrolls to the newest message** when it grows (`ngAfterViewChecked`, no timer or listener).
- **Tests.** Hub tests connect a real SignalR client (long polling, through the in-memory server's
  handler) and await each message with a timeout that names who it waited for. The Playwright fixture
  `FakeChatHub` answers negotiate and speaks SignalR's JSON protocol over a routed WebSocket.

## Consequences

- Several server instances need a backplane; this deployment runs one, and the setting is documented when
  scale-out is planned.
- 12.2 must persist messages and add history; 12.3 replaces "registered" by a membership that leaves on
  cancel (a cancelled registration already leaves the chat on the next join or send).
- A member already joined keeps receiving until they disconnect, even after cancelling: closed by 12.3.
