# 0111. A release goes through without the first Admin

## Status

Accepted, 26 November 2026. Amends ADR 0100 where it makes `Seed__AdminEmail` required.

## Context

ADR 0100 moved staff sign-in to Google and made `cf seed` stop with exit code 2 when
`Seed__AdminEmail` is missing. The release job runs `cf migrate` and then `cf seed` before a new
version is served (ADR 0047), and `tools/deploy/provision.sh` sets the job's settings only when it
creates the job. A deployment provisioned before ADR 0100 therefore has no `Seed__AdminEmail`, and
every release after it failed at the seed: nothing merged since reached production, though none of
it depended on staff sign-in. Staff Google sign-in is not fully set up in production yet.

## Decision

- **A missing `Seed__AdminEmail` is not a failure.** `cf seed` names the setting on standard error,
  makes no Admin and applies every other seed (the system account, the bylines, the listings). It
  exits 0.
- **The first Admin is made when the setting arrives.** Setting `Seed__AdminEmail` on the release
  job and running a release creates the Admin as ADR 0100 describes; seeds stay idempotent.
- **A missing connection string still stops the command** with exit code 2.

## Consequences

- Unfinished staff sign-in no longer blocks a release of member-facing work.
- A deployment can run with no Admin who can open the console, and the only sign of it is the
  line on the release job's standard error and the console's "Sign-in isn't set up yet". Whoever
  finishes Google sign-in must set `Seed__AdminEmail` (docs/operations/settings.md).
- `provision.sh` still asks for `ADMIN_EMAIL` when it creates a job, so a new deployment gets its
  Admin from the start.
