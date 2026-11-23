# 0042. Conversation list

## Status

Accepted, 23 November 2026 (slice 15.1).

## Context

L2-015 lists a member's conversations newest first with name, last message, time and unread count, and
L2-016 AC7 makes a conversation's unread count zero when it is opened. The detailed design models a
`Conversation` with participants and `LastReadMessageId`, but the slices so far (ADR 0039 to 0041) made an
event's chat from the event and its registrations, with no conversation record. Direct messages arrive
in slice 14.1.

## Decision

- **A conversation is described, not stored.** `GET /api/conversations` returns `ConversationSummaryDto`
  rows with a `kind`: `group` today (its `id` is the event's id, its name the event's title, its member
  count the registrations), `direct` when 14.1 lands. The client routes by kind (`conversationHref`), so a
  direct conversation adds a handler branch and a route, not a new screen.
- **Read marker by instant.** `ChatReadMarker(MemberId, EventId, ReadAt)`, one row per pair, is set by
  `POST /api/events/{id}/chat/read` (204; `not_a_participant` 403 for anyone not registered). A message by
  someone else sent after `ReadAt` is unread. An instant, not a message id, matches how history is cut
  (ADR 0040) and needs no message lookup; the marker never moves back.
- **When it is set.** The chat page sets it once the chat has opened and again, one request at a time,
  as each message from another member arrives while the member is looking at it. A row opens the chat
  with a link, which is a full page load, so nothing is sent as the member leaves.
- **Order and bound.** Newest activity first: the last message's time, or the member's registration when
  nothing has been said. At most 50 are returned and the client holds only that list; a member in more
  chats than that sees the newest 50 (paging comes if it is ever needed). Unread counts are computed for
  those 50 only.
- **No new telemetry.** Nothing carries message text; routes are recorded as templates.

## Stand-ins and consequences

- Side by side on LG and wider (L2-015 AC3) is not built: a row opens the chat as its own screen at every
  width. Showing the thread beside the list needs the chat page to run inside the Messages page, which is
  the work of slice 14.1 (the thread must serve both kinds). Below LG, which is what AC3 asks for the
  narrow case, it is met.
- The detailed design's `ConversationListStore` and `orderConversations` are not built: the server
  orders, and the page holds one list, so a store would only wrap a signal.
- The member count shows as a line under the name (`mini-row__meta`, added to the design system's
  conversation row and the messages mocks); the mock only had it in the open thread's head.
- The header's Messages count of unread (`top-bar` `unread`) is slice 13.2.
- A marker is per instance of the clock: with several servers a skew of a few milliseconds could show
  one message as unread; acceptable for a count.
