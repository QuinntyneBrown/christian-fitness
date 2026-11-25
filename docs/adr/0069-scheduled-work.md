# 0069. Scheduled work runs in the API with a database lease

## Status

Accepted, 24 November 2026. The scheduler and its jobs are not built yet.

## Context

Scheduled stories must publish within a minute (`L2-069`), newsletter issues must send at their
time (`L2-070`), unsubscribed addresses must be purged within 30 days (`L2-058`), and data
exports and account erasures need daily work (`L2-066`). ADR 0047 runs one API replica. A
scheduler must also avoid concurrent ticks if a second replica or an overlapping revision runs.

## Decision

- **One hosted scheduler.** `PublishingClock`, an in-process `BackgroundService` in the API,
  ticks every 30 seconds using `TimeProvider`. Before each tick it acquires a short, exclusive
  database lease; a replica that cannot acquire it skips that tick. The lease expires after an
  owner stops, so another replica can take over. Lease acquisition and renewal are atomic, and
  an owner that loses the lease stops starting work; mutations must be protected against a stale
  owner and overlapping runs. Each job runs in its own scope. Tests advance `FakeTimeProvider`.
- **Stories also evaluate on read.** Every public and staff read that selects or reports a story's
  status treats a Scheduled story with `PublishAt <= now` as Published, including landing,
  story, feed, newsletter selection and admin reads. The tick persists the transition and its
  audit entry. Status-changing commands apply the same effective status so a past-due story cannot
  be unscheduled as if it were still future. Read-time evaluation keeps a late tick from delaying
  visibility; it does not write or duplicate the audit entry.
- **The same scheduler runs all due jobs.** Every tick checks for due story publications and
  scheduled newsletter issues. `NewsletterUpkeep` is a daily job of this scheduler, not another
  hosted service; it purges unsubscribed addresses. Daily jobs also call the services behind
  `cf export-data` and `cf erase-accounts`. The `cf` commands remain available for manual runs,
  coordinated with scheduled runs so they cannot process the same work concurrently.
- **Recovery and delivery.** Due work remains eligible after a missed tick or restart. Daily jobs
  record their last successful run durably and run again when due, rather than relying on a
  particular process start time. Jobs use durable, idempotent transitions and retries: a lease
  alone cannot guarantee exactly-once external email delivery after a crash. Newsletter delivery
  and its transport still need the resolution noted in the newsletter design.
- **Add-on emails are deferred.** Event alerts, the training plan and devotions have no trigger or
  sender yet; their design is deferred to [#90](https://github.com/QuinntyneBrown/christian-fitness/issues/90).

## Consequences

- A running API and database are needed for scheduled work. An outage delays writes, sends and
  daily maintenance until recovery; story reads still use the scheduled time when the API returns.
  Daily processing alone does not guarantee a 24-hour export or 30-day purge during an outage.
- A daily run after an account reaches 30 days can lag the erasure deadline even without an
  outage; a daily export run can likewise finish after 24 hours. The implementation must resolve
  these deadline and recovery gaps without shortening the 30-day restoration period.
- RSS feeds are cacheable for 15 minutes (`L2-060`); a previously cached feed can remain stale
  past a story's scheduled time even though a fresh read evaluates it as Published. The
  implementation must resolve that freshness tension with `L2-069`.
- The lease protects scheduler work, not the rest of the app. A second replica still needs the
  SignalR backplane, shared mail queue and rate-limit review of ADR 0047.
- A scheduled Container Apps job would add a separate deployment and schedule; read-time evaluation
  alone cannot send issues or perform retention work. Neither replaces the hosted scheduler.
- Lease duration, renewal, fencing and job retry details must be specified and proved in the
  implementation slices, including failure and multi-replica cases.
