# 0021. Audit staff changes: a marker on each staff command, a trail the handler fills and a behaviour that saves it

## Status

Accepted, 23 November 2026 (slice 29.2).

## Context

L2-019 AC3 asks that every staff action that changes data, when it succeeds, leave an audit entry
recording who, what, which record and when, without personal data in telemetry. The design named
`IAuditableCommand`, `AuditBehavior` and `AuditEntry`, put the record type and id on the command,
read the actor from the session, and left retention `<TO SUPPLY>`.

When this slice started, the only staff commands on `main` were the staff session's: the password
step, the second step that starts the session and signing out. Slice 10.1's create-event command,
the first staff command on a record of the community, was being built beside it. A test-only
staff command could not prove the requirement.

Three things made the design's shape unworkable as written:

- **Who.** The second sign-in step is anonymous until its code is checked, and signing out ends the
  session the actor would be read from. Reading the actor before or after the handler is right for
  one and wrong for the other; a request carrying a member cookie as well would even name another
  person.
- **Which record.** A created record's id exists only inside the handler, so it cannot be a property
  of the command.
- **One unit of work.** A behaviour that saves its entry after the handler has saved commits the
  change and the entry separately, so a failure between the two keeps a change with no entry.

## Decision

- **A marker on each staff command.** `IAuditableCommand` (Application) carries `AuditAction`, a
  stable name `{record}.{past tense}`, implemented explicitly so model binding never sees it.
  `VerifyTwoStepCommand` is `staff_session.started` and `StaffSignOutCommand`
  `staff_session.ended`. The password step is not audited: it starts no session and proves no one is
  staff yet.
- **The handler names who and which record.** `AuditTrail` (Application, scoped per request) is
  opened by the behaviour with the command's action; the handler calls
  `Record(actorMemberId, recordType, recordId)` once, when the change is going ahead and before it
  saves. `Record` adds the `AuditEntry` to `IAppDbContext`, so a handler that saves its change there
  commits the change and its entry together, with no transaction to manage. A staff session's record
  is `StaffSession` with the staff member's own id, because the session's key is a secret.
- **The behaviour enforces and saves.** `AuditBehavior` runs after validation. Every other request
  passes straight through. For an auditable command it runs the handler and, on success, saves,
  which commits an entry whose change went elsewhere (the ticket store keeps sessions in a scope of
  its own), then logs `Staff change {AuditAction} audited` with the action as its only attribute. A
  refusal or failure throws first, so no entry is saved. An auditable command whose handler records
  nothing fails with HTTP 500, so a slice that forgets `Record` sees its own first test fail.
- **The entry holds identifiers only.** `AuditEntry` keeps `ActorMemberId`, `Action`, `RecordType`,
  `RecordId` and `OccurredAt` (from `TimeProvider`), and nothing personal: no name, email, field
  value or request text. The `AuditEntries` table has no foreign key, so an entry outlives the member
  and the record, and it is indexed by record and by actor, each with time.
- **Retention: keep everything for now.** Nothing reads the trail yet. Entries are kept with no
  automatic deletion; the slice that adds an audit view decides who may read it and any retention
  period (staff-roles design, open question 2). An entry holds a member id and no contact detail.
- **Proved on the staff session.** The acceptance tests sign staff in and out through the API and
  read the store: one entry each, with the exact actor, action, record and time of a
  `FakeTimeProvider`; a wrong password, the password step alone and a wrong code leave none; the
  telemetry test finds the action in the log and no member id, email, name or record type in any
  span or log. The behaviour's own cases (records and leaves the save to the behaviour, records and
  saves, refused after recording, refused before, names no record, not auditable) are a table in
  `AuditBehaviorTests`, with requests local to that test. When slice 10.1 lands, its create-event
  command adds the marker and one `Record` call, and one acceptance test proves it is audited.

## Consequences

- Every later staff command (events, services, members) is audited by adding the marker and one
  `Record` call before its save; nothing in the API, the controllers or the pipeline changes.
- Signing in and out of the admin app now writes one more row each.
- A change saved outside `IAppDbContext` (only the session today) is committed before its entry, so
  a database failure between the two keeps the change without its entry and the request answers
  500. Every record of the community goes through `IAppDbContext`, where the two commit together.
- `AddApplication` registers logging, since the behaviour logs; a host without a logging provider
  writes nothing.
