# 0113. The feedback inbox

## Status

Accepted, 27 November 2026. Builds on [ADR 0064](0064-moderator-areas.md),
[ADR 0065](0065-christian-fitness-sender-account.md), [ADR 0070](0070-html-email-headers-and-bulk-sending.md)
and [ADR 0109](0109-send-feedback.md).

## Context

Journey 31 builds the staff side of feedback (`L2-074`). Its design
(`feedback/read-feedback-inbox`) left several values to supply and one case with no answer.

## Decision

- **A Feedback staff area.** `api/admin/feedback` is `StaffArea.Feedback`, open to Admins and
  Moderators. The admin app lists Feedback last under Community, with the New notes counted beside
  it ("2 new notes"); `GET /api/admin/counts` gains `newFeedback` for both roles.
- **The list is bounded, with no cursor yet.** `GET /api/admin/feedback?status=` answers the
  newest 100 notes of the tab and the counts of all four tabs. Loading older notes on scrolling is
  left until an inbox holds more than a tab's hundred. A row's excerpt is the first 120 characters.
- **Replies are rows of their own.** `FeedbackReply` (note, staff member, text, time) is deleted
  with its note, and so with the member. A reply is at most 2,000 characters; an empty one is
  `validation_failed` with `fieldCodes.text = reply_required`.
- **How a reply travels.** With email allowed, one plain-text email goes to the member's address,
  greeting them by first name and saying the address is not read. No Reply-To is set: the email
  allow-list of ADR 0070 does not carry it yet. Otherwise it is a direct message from the Christian
  Fitness account reading "Reply to your feedback:" and, on the next line, the reply.
- **A reply that cannot arrive is refused.** A member who did not allow email and is suspended gets
  no direct messages (ADR 0043). Rather than keep a reply nobody receives, the API answers 409
  `member_unreachable`, keeps nothing and leaves the status. This settles the design's open question
  on suspended-member delivery for now; an appeal channel remains to be designed.
- **`member_deleting` waits for journey 36.** No account can be deleting until Delete my account
  exists. `L2-074` AC12 is built with that journey; the inbox already shows any refusal as "We
  couldn't send your reply" and keeps the draft.
- **The screenshot** is served at `GET api/admin/feedback/{id}/screenshot` to a staff session only,
  with `no-store`.
- **Who is offered the story.** The page reads the staff role from the session; "Open the story to
  correct it" shows only where `canManage(role, 'stories')` holds.
- **The thread** shows each kept reply's text under "Reply sent"; the list is read again after a
  reply or a change of status, so the rows and the tab counts follow.

## Consequences

- The Dashboard's feedback line (amended `L2-020`) is not built here; it belongs to the dashboard's
  own design and reads the same count.
- The navigation count is read with the other counts, so it refreshes when the shell does, not the
  moment a note is answered.
- A third migration of this branch, `AddFeedbackReplies`.
