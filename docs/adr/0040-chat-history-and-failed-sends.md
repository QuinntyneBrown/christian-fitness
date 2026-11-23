# 0040. Chat history and failed sends

## Status

Accepted, 23 November 2026 (slice 12.2).

## Context

L2-016 AC6 asks that opening a conversation loads its latest 50 messages, that earlier ones load on
scrolling up and that the client holds at most 200. Slice 12.1 delivered messages live and stored none
(ADR 0039). A send that fails also needs somewhere to go: the mocks' `send-failed` state keeps the text
in the thread with "Not sent. Try again". The catch-up after a dropped connection ("Reconnecting…",
AC5) stays for a later slice; this one adds the stored history it will read.

## Decision

- **Messages are stored.** `ChatMessage` (Domain) holds the event, the author, the text and the instant;
  table `ChatMessages` (migration `AddChatMessages`) with an index on event, instant and id.
  `SendChatMessageHandler` saves the message, then broadcasts the stored one, so the id the members see is
  the stored id. No log, metric or span carries the text; the history route is recorded as its template.
- **Order is by instant, then id.** EF Core InMemory generates no value for a non-key column, and a
  database sequence would make the order differ between tests and PostgreSQL. A page is cut at an
  instant (`SentAt < the cursor message's`); the clock's 100 ns ticks keep two messages from sharing
  one in production, and tests advance `FakeTimeProvider` between sends.
- **`GET /api/events/{id}/chat/messages?before={messageId}`** (`ChatController`, one MediatR query)
  answers `{ messages, hasMore }`: up to 50 messages, oldest first, the latest when `before` is absent.
  The handler reads 51 to know `hasMore`. A member not registered for the event, and an unknown event,
  get 403 `not_a_participant` with no message in the body; an unknown cursor answers an empty page.
- **Client.** Contract `ChatHistory` and token `CHAT_HISTORY` in `@cf/api`; `HttpChatHistoryService` is
  provided on the chat page beside the hub connection. `withEarlierMessages` (domain) puts a page first,
  skips ids already held and, beyond 200, drops the newest off the end.
- **Thread.** The design system's `thread` gains an "Earlier messages" text button (`.thread__earlier`,
  mock `messages/history`) and the `earlier`, `loadingEarlier` and `loadEarlier` API; reaching the top by
  scrolling asks the same. When the thread grows at the top it moves by the height added, so the reader
  keeps their place; a new last entry scrolls to the end as before.
- **Past the window.** When older pages push the newest message off the end, live messages are not added
  out of place and "Back to the latest messages" reloads the end.
- **Failed sends.** A send the hub refuses or that errors stays in the thread as the thread's `failed`
  message ("Not sent." with Try again) until it is sent or the screen closes;
  at most 20 are kept. Try again removes it and sends the same text again, so it shows once, with its
  time, when the hub delivers it. Replaces the generic line above the composer.
- **Tests.** API tests send through the hub and read the history with 60, 50 and two chats'
  messages, a stranger, an unknown event and no session. Playwright's `FakeChatHub` answers history from
  a stored list and can fail the next sends as a dropped connection does.

## Consequences

- Messages are kept without a limit of age or count; a retention rule belongs to a later decision.
- A page cut at an instant would skip a message sharing the cursor's exact instant; clock ticks make
  that vanishingly rare, and it is the price of an order that is the same in every store.
- The unread count (AC7) and the catch-up after reconnecting (AC5) are not part of this slice.
