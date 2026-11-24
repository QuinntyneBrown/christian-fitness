# 0000. Report a message

## Status

Accepted, 24 November 2026 (slice 25.1).

## Context

L2-017 lets a member report a message so staff can review the sender. The design left the dialog, the
error codes, the reason's limit, how a group and a direct message are told apart, and the repeat
report (it said "returns success") `<TO SUPPLY>`. No mock drew a Report action or its dialog.

## Decision

- **Endpoint.** `POST /api/messages/{id}/reports` with `{ "reason": string | null }` answers 201 with
  an empty body. The id is a group message's or a direct message's: both are v7 GUIDs in separate
  tables, so the handler looks in `ChatMessages` and then `DirectMessages`. Only a message the caller
  can read is reportable: a group message of an event they are registered for (ADR 0041), a direct
  message they sent or received. An unknown message and a message of a conversation the caller is not
  in are both 404 `message_not_found`, so the answer reveals nothing.
- **Refusals.** The caller's own message is 403 `cannot_report_own_message`. A second report of the
  same message by the same reporter is 409 `already_reported`: the task is "never twice", and a coded
  refusal lets the dialog say so rather than claim a report was sent. A reason over 500 characters is
  400 `field_too_long` (the existing code). A race of two identical reports is held by a unique index on
  (`ReporterId`, `MessageId`) and answered `already_reported`.
- **Stored.** `MessageReport` keeps the reporter, the message id, the sender, the optional reason
  (trimmed, none when blank) and the instant. The reason is staff's to read later and is never logged,
  put in a span or in the audit trail; the command and the body are classes so no generated `ToString`
  can print it. A member's report is not a staff change, so nothing is audited.
- **Flagging.** The handler reuses `Member.TryFlag` from slice 27.1 with the fixed note "Reported by a
  member". It flags only an Active sender; a Flagged or Suspended sender keeps their status and the
  report is still recorded. The staff Members screen therefore shows the sender as Flagged with that
  note, with no change to the staff code. A reinstated member is not flagged again by the same
  reporter's repeat (refused), only by a new report.
- **Mock.** A `report-message` dialog (default, busy, failed, duplicate, success) over the Messages
  thread; the thread's received messages gain a "Report" button (design-system `message` component,
  `message__report`, 44 px target). The confirmation is the library dialog's success state ("Message
  reported") as for Request a booking, not a toast: the page needs no toast region and `main` does not
  grow. This departs from the design's toast; the design is updated.
- **Frontend.** `REPORTS_SERVICE` in the api library, `HttpReportsService` provided on the chat page;
  the dialog is imported dynamically when Report is pressed and opens with the page's injector.
  Reporting a member directly, with no message, stays out of scope (L2-017's criteria describe
  messages only).
