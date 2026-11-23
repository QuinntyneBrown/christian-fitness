# 0033. Full events: a version on the event settles the last place

## Status

Accepted, 23 November 2026 (slice 6.2).

## Context

L2-011 AC2 refuses registration for a full event with `event_full` and the page says "This event is
full". AC3 asks that when two members take the last place at the same moment, exactly one succeeds.
Slice 6.1 (ADR 0032) checked `going >= capacity` before inserting, which two simultaneous requests can
both pass; the unique index on (event, member) does not stop two different members.

## Decision

- **`Event.RegistrationVersion`** is a concurrency token. `Event.TakePlace()` increments it in the same
  save as the new `Registration`, so two saves that read the same version cannot both commit; the
  database refuses the second with a concurrency conflict (a migration adds the column, default 0).
- **`RegisterForEventHandler`** loads the event tracked. On `DbUpdateConcurrencyException` it detaches
  its registration, reloads the event and decides again: a full event is refused `event_full` (409), a
  place still free is taken on the next attempt.
- **The page** shows "This event is full" in place of Register when no place is left and the member
  holds none, and also when its own Register is refused with `event_full` (the event is shown at capacity).
  No waitlist: no requirement states one.

## Consequences

- Tests: the handler's answer to a lost race (the store raises the conflict, as the join race does) and
  the token itself (two contexts, the second save refused). EF InMemory is not transactional, so a real
  pair of simultaneous requests cannot prove the rule there.
- A registration costs one more column write on the event row; contention is per event.
