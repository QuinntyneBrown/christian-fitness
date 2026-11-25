# 0065. A "Christian Fitness" sender account for direct messages

## Status

Accepted, 24 November 2026 (owner accepted the recommended answers; issue 72, step 9 of 37 of #62).

## Context

Suggestion outcomes (L2-062 AC9), claim links (L2-073 AC6) and feedback replies (L2-074 AC5, L2-063
AC11) are direct messages "from Christian Fitness". A `DirectMessage` is between two members
(ADR 0043: `DirectMessages(Id, SenderId, RecipientId, Text, SentAt)`), so the organisation needs a
sender, and the question of whether a member can answer it.

## Decision

- **A seeded system member, "Christian Fitness".** `cf seed` creates it idempotently (insert when
  absent, never duplicated) with a fixed id, `SystemMembers.ChristianFitnessId`. No new kind of
  message and no new table: its messages are ordinary `DirectMessage`s, so ADR 0043, the unread
  marker of ADR 0042 and the conversation list work unchanged.
- **It cannot sign in.** It has no credentials, no password hash and no external login, and every
  sign-in and password-reset path refuses it with the same answer as an unknown account. Its
  `Member` row carries an `IsSystem` flag the sign-in handlers check.
- **It is not a person to find.** It never appears in member search, member lists, event
  registrations or the admin Members list, and has no profile page (the profile route answers 404
  `member_not_found`). It shows the organisation's mark (the seal) as its avatar, with initials
  "CF" where an initials avatar is used.
- **Members cannot reply.** The API refuses a send (hub `SendDirect` answer, REST) to the system
  member with the code `system_account` (a hub answer, 403 ProblemDetails over REST). In a
  conversation with it the composer is replaced by the note "This account doesn't read replies. To
  reach the team, use Send feedback." with "Send feedback" linking to `/feedback`. The refusal is
  only for a stale client; the screen shows "That message wasn't sent. This account doesn't take
  messages." and keeps the note. A member can still read its messages and report one (ADR 0058).
- **Sending is internal only.** Only application services send as it (`SuggestionOutcome`, the claim
  link step of approval, `ReplyToFeedbackCommand`), through `SendDirectMessageCommand` with the
  system sender, in the caller's unit of work. The messaging rule of L2-065 AC5 does not refuse it,
  and the Suspended check applies to the recipient as for any message. No endpoint, hub method or
  CLI command lets a person choose the sender.
- **Message texts** (every name and the staff's reply are text, never HTML; none is logged):
  - Suggestion approved: "Thanks for suggesting {Listing}. It's now in the directory."
  - Suggestion declined: "Thanks for suggesting {Listing}. We won't be adding it this time." Staff's
    reason is not added: it is kept for staff.
  - Claim link: "{Listing} was suggested for the Christian Fitness directory. Claim and publish it
    here: {link}. The link works for 14 days." Sent to the suggested person only where they are a
    member; otherwise the claim link goes by email as L2-073 AC6 states.
  - Feedback reply: "Reply to your feedback:" and, after a line break, the Admin's text.
- **Telemetry.** As for any message: no text, no recipient detail; the route is a template.

## Stand-ins and consequences

- Replies to the account go nowhere by design; Send feedback is the way to reach staff.
- The mock gains hand-written states `messages/system`, `system-refused`, `system-loading` and
  `system-error`, and a `composer--note` rule in the mocks' `ui.css` (the note is a state of the
  `composer` of the Message design-system component, built there with the thread).
- Behaviour is built later in ATDD slices; this decision adds no code.
