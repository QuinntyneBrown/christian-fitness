# 0117. Download my data

## Status

Accepted, 27 November 2026. Builds journey 35 (`L2-066` AC1 to AC3 and AC10); follows
[ADR 0078](0078-personal-data-erasure-and-retention.md) and the scheduler of
[ADR 0069](0069-scheduled-work.md) and [ADR 0104](0104-schedule-stories.md). Leaves the
deletion half of the same design to journey 36.

## Context

The design ([download and delete data](../detailed-designs/preferences/download-and-delete-data/README.md))
runs the archive builder daily and asks the implementation to resolve how a daily run meets the
24-hour promise. It names the archive's seven files but not their fields, and its table puts
staff replies to feedback in the archive although `L2-066` AC2 says the archive holds no other
person's messages. The mock draws "Download again" as a link to the archive, and has no state for
a request that gets no answer.

## Decision

- **Cadence.** The builder runs on every tick of the publishing clock (30 seconds, under its
  lease), not daily: a request is built within a minute, far inside 24 hours, and a tick missed in
  an outage is caught by the next one, since every request without `ReadyAt` stays due. A tick
  builds at most 10 archives, oldest first. The same tick deletes each archive whose 7 days are
  over and clears its key, so the link stops working. No `cf export-data` command is added: the
  clock is the only runner, and an operator never needs to build one by hand.
- **Request.** `POST /api/data-exports` is an auditable member command (`data_export.requested`,
  record type `DataExportRequest`, the member as actor, as ADR 0078 amends ADR 0023). A request
  younger than 24 hours is answered again with its time and nothing is added or audited.
  `GET /api/preferences` answers `downloadRequestedAt` while the latest request is younger than 24
  hours, so the confirmation shows in place of the button for that long (AC3). The server alone
  decides the 24 hours; the page shows the confirmation whenever the field is set.
- **Archive.** `README.txt` and `profile.json` (with `legalAcceptance` and `suggestions`),
  `preferences.json` (the four sections of Preferences), `registrations.json` (events and series),
  `follows.json`, `messages.json` (`groupChats` by chat title, and `direct` by the display name of
  the member written to), `feedback.json` and `subscriptions.json`. No file holds an id. Left out
  because they are another person's: messages received, the email of a person suggested for the
  directory, and the text of staff replies to feedback (only `repliedAt` stays). Left out because
  they are staff's words: a moderation note and a suggestion's decline reason. A group chat names
  its event or series only, not its other members. Screenshots stay out; a note says
  `hasScreenshot`. Times are UTC.
- **Storage.** `IArchiveStore` keeps each .zip under a new key (`{guid}.zip`) in
  `Exports__Directory` (documented in `docs/operations/settings.md`; `/data/exports` on the
  container app's share). Nothing serves that folder.
- **Link.** The email (mock `email-download-ready`) links to `/preferences/download/{id}` in the
  member shell, so a member signs in first. `GET /api/data-exports/{id}` answers `expiresAt`, and
  `GET /api/data-exports/{id}/archive` the .zip as a `private, no-store` attachment, only for the
  caller's own request while `ExpiresAt` is in the future; any other id, another member's, one not
  built yet or one past its 7 days is the same 404 `not_found` (`L2-031` AC3). The page therefore
  shows mock `expired` for every 404: it cannot, and must not, tell another member's link from an
  expired one.
- **Download in the page.** The page reads the archive with `HttpClient` and hands it to the
  browser through an object URL that it revokes straight after the save begins, or when the page is
  destroyed. A browser download of the archive's address would bypass the app's error handling and
  the e2e fixture, which cannot intercept it. "Download again" is therefore a button that reads it
  again, not a link to the archive as the mock draws it; the mock now draws a button.
- **States the mocks do not draw.** A request that gets no answer shows the library's inline
  message under the row, "Your download wasn't requested." with Try again; the button stays. The
  expired state uses the `done` block's alert variant (its clock icon), not the mock's circle.
  A 5xx on the download page's check is the app's server-error screen, as on every screen.
- **Telemetry.** The clock logs how many archives it built, never whose or what they hold. No
  handler logs; the email's body is not logged (ADR 0010).

## Consequences

A member gets their copy within a minute of asking, not within a day. The archive is held in
memory once while it is built and once in the page while it is saved, which keeps each archive
small enough only while members' data stays small; a member with very many messages would need a
streamed archive. Journey 36 deletes a deleting member's archives and requests.
