# 0112. The Newsletter desk, sending an issue and the web version

## Status

Accepted, 26 November 2026. Builds on [ADR 0069](0069-scheduled-work.md),
[ADR 0070](0070-html-email-headers-and-bulk-sending.md) and
[ADR 0110](0110-subscribe-to-the-newsletter.md).

## Context

Journeys 28 and 29 build the Newsletter desk (`L2-070`) and the newsletter on the web (`L2-059`).
The designs (`publishing/build-and-schedule-newsletter`, `news/read-newsletter-on-web`) left some
choices open, and a few of their details could not be built as written.

## Decision

- **A Newsletter staff area.** `api/admin/newsletter` is `StaffArea.Newsletter`, open to Admins and
  Moderators (`L2-070` AC12); the admin app lists Newsletter under Publish, after Stories.
- **One job on the publishing clock, no second background service.** `SendDueIssueCommand` runs on
  the leased clock's 30-second tick after the story and purge jobs. It marks a Draft whose time
  passed as missed, moves a missed issue to the next send time once its Toronto day has passed,
  starts a Scheduled issue (status Sending, the captured content, one `IssueDelivery` per confirmed
  subscriber and the audit entry, in one save) and then sends waiting deliveries. The design's
  separate `IssueSender` service is not built: the lease already guarantees one sender.
- **The relay's limits bound each tick.** A tick sends at most what `Email:MaxPerMinute` and
  `Email:MaxPerDay` leave room for, counted from the deliveries sent in the last minute and the
  last 24 hours. While either setting is unset, an issue starts at its time but no email leaves.
  Issue emails go through `IBulkEmailSender` (the SMTP transport directly), never the bounded
  queue of transactional mail. A delivery that fails is tried on later ticks, three times in all,
  then given up; the count shown under Sent is of emails that left. An address that unsubscribed
  after sending started is sent nothing.
- **Deliveries are deleted when the issue is Sent**, so nothing records who was sent an issue.
- **The audit entry of a send** is `newsletter_issue.sent_by_scheduler`, against the Admin who
  scheduled it: `AuditEntry` has no free-text column for "sent by scheduler", so the action says it.
- **A missed issue is rescheduled with a time.** `POST …/schedule` takes `sendTime` (`HH:mm`,
  today in Toronto); one that is missing, malformed or already past is `validation_failed` with
  `fieldCodes.sendTime = send_time_invalid`. The Dashboard's "Needs attention" answer carries
  `missedIssue` for both roles.
- **Stories are preselected in the admin app, once.** An issue with nothing written or picked has
  the stories marked "Include in the Weekly" ticked, newest first, until three are (`L2-070` AC3).
  An issue already written keeps its own picks, so unticking survives a reload.
- **The email is plain text.** The issue email is text with direct links to the member app, no
  image and no redirect (`L2-070` AC10). An HTML body (ADR 0070) is not built; the web version is
  where the issue is drawn.
- **Captured content is JSON on the issue.** `NewsletterIssue.Captured` holds the note, the big
  story, the briefs, the next four published events of that moment and the verse, written when
  sending starts. The web version reads it and hides stories since unpublished (`L2-059` AC7).
- **No sign-off line.** The mock's "Naomi Clarke, editor" has no field on the desk and no
  requirement; the web version and the email leave it out.
- **Preview** is `GET …/issues/{number}/preview`, the issue as saved in the web version's shape,
  shown at `/newsletter/preview?issue=<number>` in the admin app, outside the shell. It greets
  nobody, and its links to the member app go nowhere.
- **The big story is never also one of the others.** Choosing a ticked story as the big story
  unticks it; "Also this week" lists every published story but the big one.

## Consequences

- An operator must set `Email__MaxPerMinute` and `Email__MaxPerDay` before the first issue; until
  then a scheduled issue waits in Sending (docs/operations/settings.md).
- Sending is spread over ticks: 6,800 subscribers at 100 a minute take a little over an hour.
- The designs' diagrams still show `IssueSender` as its own service and the open and click
  counting the requirement dropped; they are to be redrawn.
- A second migration, `AddIssueCapturedContent`, follows `AddNewsletterIssues`.
