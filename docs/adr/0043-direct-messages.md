# 0043. Direct messages

## Status

Accepted, 23 November 2026 (slice 14.1).

## Context

L2-014 AC1 and L2-016 call for a private conversation between two members, started from a member's
profile (ADR 0038 left the Message button off the profile until this slice). ADR 0042 made a
conversation something the API describes, not stores, and left a `direct` kind in the list for this
slice. The chat hub, client and thread (ADRs 0039 to 0041) should serve both kinds.

## Decision

- **A direct conversation is the pair, keyed by the other member.** Its id on the wire and in the
  route is the other member's id: `/messages/:id`. Nothing is stored by opening it.
- **One table.** `DirectMessages(Id, SenderId, RecipientId, Text, SentAt)`, read by pair, newest
  first, indexed both ways. Ids are version 7 from the send instant, as in ADR 0040.
- **Read marker reuses `ChatReadMarkers`.** Its second key column holds the other member's id for a
  direct conversation (a v7 member id and an event id cannot collide), so the unread count and its
  "never moves back" rule are the ones of ADR 0042. No new table, no foreign key to either.
- **Hub.** `JoinDirect(memberId)` and `SendDirect(memberId, text)` send one MediatR request each and
  answer a `ChatAnswer`. There is no group: a message goes with `Clients.User` to each of the two
  members' connections as `MessageReceived`, whose `eventId` carries the *other* member's id, so each
  side keys the conversation by the other and the page filters by it, as it does for an event.
- **REST.** `GET /api/messages/{memberId}/messages?before=` (50 a page, oldest first, `hasMore`, the
  same shape as an event's) and `POST /api/messages/{memberId}/read` (204).
- **Refusals.** A target who is unknown, Suspended or the caller is refused with the code
  `recipient_unavailable` (a hub answer; 403 ProblemDetails over REST), the same for all three so the
  answer reveals nothing. Only the two participants can read or receive: history is the caller's own
  pair, and delivery is by user.
- **List.** `GET /api/conversations` adds `direct` rows (name is the other member, no member count,
  last line "You: ..." when the caller spoke last), merged with the groups and cut to the newest 50.
  The last message of each of at most 50 partners is read one at a time; a single query would need a
  correlated subquery and the bound keeps this to 50 reads.
- **Client.** The chat page serves both: `/messages/:id` has route data `direct`, and `ChatConnection`
  and `ChatHistory` take an optional `direct` flag. The profile's Message button
  (`profile-hero` action slot) links to `/messages/:id`.
- **Telemetry.** No message text anywhere; routes are recorded as templates.

## Stand-ins and consequences

- Side by side on LG and wider (L2-015 AC3) is still not built; a row opens the conversation as its own
  screen at every width. It needs the list and the thread to share one routed shell, and group chats
  live at `/events/:id/chat`, outside it. It is recorded as the remaining part of slice 15.1's AC3.
- Starting a conversation with oneself is refused only when joining; the profile shows Message on every
  member's profile, including the caller's own, which then shows "You can't message this member".
- Telemetry, not message text, is all that is recorded; the hub is single-instance (no backplane),
  as in ADR 0039.
