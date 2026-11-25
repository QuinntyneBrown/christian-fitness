# 0070. HTML email, custom headers and bulk sending

## Status

Accepted, 24 November 2026. Extends [ADR 0010](0010-password-reset-request.md).

## Context

`EmailMessage` has only To, Subject and Text. The newsletter needs an HTML body ("as the email
reads") and the `List-Unsubscribe` and `List-Unsubscribe-Post` headers for one-click unsubscribe
(RFC 8058, L2-058). `QueuedEmailSender` holds 500 messages and drops the rest, so an issue to
6,800 readers would lose mail. The feedback reply email also needs a From and a Reply-To, since the
relay sends as `no-reply@christian.fitness` (ADR 0047).

## Decision

- **Shared email contract.** `EmailMessage` gains an optional `Html` body and a `Headers` map.
  With `Html` set, the transport sends multipart/alternative: the text part stays, so every
  message has a plain-text form. `Headers` is limited to an allow-list, `List-Unsubscribe` and
  `List-Unsubscribe-Post`; any other name is refused before sending. A message without `Html`
  or `Headers` is sent exactly as before.
- **Bulk sending.** `IssueDelivery` rows are the durable queue: one per recipient, with a status
  and an attempt count. A drain job of the scheduler (#77) takes pending rows in batches and sends
  them within `Email:MaxPerMinute` and `Email:MaxPerDay` (documented in settings), records the outcome on each row, and
  resumes from the rows after a restart. A failed row is retried up to a fixed number of attempts,
  then marked failed. The newsletter never goes through `QueuedEmailSender`.
- **Transactional mail.** `QueuedEmailSender` and its 500-message bound stay for transactional
  mail only (password reset, confirmation, feedback reply).
- **Feedback reply email.** It is sent From `Christian Fitness <no-reply@christian.fitness>`, the
  address the relay may send as. A Reply-To is set only when `Email:ReplyTo` names a staff mailbox;
  without it the member cannot answer by email and the reply says so. The member's own address is
  never used as From.

## Consequences

- The newsletter design's open question on back-pressure is closed; the relay's own sending limits
  are the values of the two `Email:Max…` settings.
- Both settings are documented in [settings](../operations/settings.md).
- No log, metric or span carries a header value, because the unsubscribe header holds a token.
