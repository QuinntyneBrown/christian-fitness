# 0067. Event and series hosts

## Status

Accepted, 24 November 2026 (issue 75).

## Context

Every event and series shows a host directory listing (`L2-010` AC4, `L2-051` AC1), but existing events predate the directory and neither editor specified who chooses the host. Services professionals and directory listings are separate records (issue 71); a host is a directory listing, not a Services record.

## Decision

- An Admin sets a required Host in both the event and series editors. New records default to the Listed "Christian Fitness" team listing; editing shows the saved host. The searchable picker offers Listed directory listings only and shows a no-results state. The server refuses a missing or non-Listed selection; the field and error summary identify the error.
- Every event, including a series session, and every series has a non-null `HostListingId` foreign key to a directory listing. The event and series each store their own host; this decision does not specify propagation when either changes.
- `cf seed` creates the Listed Christian Fitness team listing idempotently using a stable identity. The migration ensures that same listing exists before backfilling every existing event and series, including drafts and cancelled records, and then enforces the non-null foreign keys. It must not overwrite an existing host on a rerun or replace an existing team listing.
- The migration also creates or reuses the listing because releases run `cf migrate` before `cf seed` (ADR 0047). The migration and seed use the same stable identity, so the subsequent seed does not duplicate it. The new foreign-key columns default to that identity in the database, allowing the running older revision to insert events without a host during rollout (ADR 0047).

## Consequences

- Older events and series display the team as host until an Admin changes them. There is no hostless state.
- The series editor mock specifies the host field; the other series editing and session-management rules remain to be specified separately.
- Host selection uses the directory's Listed records, independent of any optional link to a Services professional.
