# 0104. Schedule stories

## Status

Accepted, 26 November 2026 (journey 23, issue 173). Builds on ADR 0021, ADR 0023, ADR 0069 and
ADR 0097.

## Context

Journey 23 adds `L2-069` AC4 and the scheduling half of AC2, AC3 and AC7: with a date and time
chosen the editor's primary action reads "Schedule" (or "Approve & schedule"), the story becomes
Scheduled, `PublishingClock` (ADR 0069) publishes it within a minute and audits it, every read
treats a past-due Scheduled story as Published, "Unschedule" makes it a Draft and "Publish now"
publishes it. The design and ADR 0069 left these open:

- The design scheduled through `POST {id}/publish` with an optional time, but its API list named
  only `unschedule`; how the editor reads a Scheduled story's time was not said.
- ADR 0069 left the lease's duration, renewal and fencing, and the tick's failure and
  multi-replica cases, to the implementation.
- There is no mock state for a time refused as past, and the mocks label the date and time
  visually hidden.

## Decision

- **Its own action.** `POST /api/admin/stories/{id}/schedule` (`ScheduleStoryCommand`, audited
  `story.scheduled`) takes the editor's fields, the version, and `publishDate` (`yyyy-MM-dd`)
  and `publishTime` (`HH:mm`) in Toronto, turned into an instant by `EventSchedule` as events
  are (ADR 0021). It is allowed from Draft and In review. `POST {id}/unschedule` takes only the
  version and is allowed from Scheduled. Publish keeps its meaning ("now") and is also allowed
  from Scheduled, applying the fields sent. One verb per action keeps each validator simple.
- **Refusals.** A missing date or time is `publish_date_required` or `publish_time_required` on
  its field; a time not after now (`TimeProvider`) is `publish_at_in_past` on `publishDate`. The
  editor names them above the story ("Add a date and a time before scheduling", "Choose a time
  after now") and marks the field; the past-time state has no mock, so this message is a
  stand-in built like `admin-story-editor/invalid`.
- **The story answers its time.** `AdminStoryDto` gains `publishAt`, set while Scheduled and not
  yet due. The editor opens a Scheduled story with Schedule chosen and its Toronto date and time;
  both are disabled until Unschedule, since a time cannot be changed in place. When and its
  fields are never autosaved; they are sent with Schedule only.
- **Labels.** The date and time use the library's `text-field`, whose label is visible ("Date",
  "Time"), where the mock hides them; a visible label serves more people (WCAG 3.3.2) and adds no
  variant to the component.
- **Effective status everywhere.** `Story.EffectiveStatus(now)` reads a Scheduled story due at
  `now` as Published, at `PublishAt`. The list's counts, tabs and rows, the editor read and
  Preview use it. Every status command first catches a due story up (`StoryActions.CatchUp`):
  it persists the publication and its `story.published` audit, in the command's unit of work and
  under the story's concurrency token, then refuses Unschedule with `status_conflict`.
- **Published at the scheduled time.** A due story's `PublishedAt` and `FirstPublishedAt` are its
  `PublishAt`, not the tick's time, so a late tick does not move it in the feeds. The audit entry
  is recorded against the Admin who scheduled it (`ScheduledById`).
- **The lease.** A `SchedulerLeases` row (`Name` key, `Holder`, `ExpiresAt`, `Fence`, `Version`
  concurrency token). Each tick takes or renews `publishing-clock` for 60 seconds, twice the
  interval, so one missed tick does not hand it over; a holder change increments `Fence`. Two
  replicas racing on the row lose on its concurrency token or on its key, and the loser skips the
  tick. The holder is the machine name and a random id per process.
- **The tick.** `PublishDueStoriesCommand` publishes at most 100 due stories a tick, oldest first,
  saving each story alone with its audit entry, so a story changed meanwhile (its version) stops
  the batch without undoing the others; the next tick goes on. A failed tick is logged by
  exception type only.
- **Tests.** The clock raises `Ticked` after each tick, which tests await with a timeout instead
  of sleeping while they advance `FakeTimeProvider`. The shared test host removes the clock, so
  other tests' stories are not published under them; the clock's tests run their own host.

## Consequences

- No new setting. The lease row lives in the database the API already uses; a migration adds it
  and `Stories.ScheduledById`.
- Reading a past-due story as Published in each query costs a conditional expression in its
  `WHERE` and `GROUP BY`; the stories list is small and paged.
- Landing, story, feed and newsletter reads (journeys 24 onward) must use the same effective
  status; the RSS freshness tension of ADR 0069 remains for journey 24.
- A Scheduled story cannot be edited; changing its time or words means Unschedule first, as the
  design's table allows.
