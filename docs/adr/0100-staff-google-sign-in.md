# 0100. Staff sign in with Google Workspace: a new session key on every sign-in, the 12-hour maximum, the first Admin, and retiring the password and two-step code

## Status

Accepted, 25 November 2026 (journey 3, issues 153, 148 and 83). Builds on ADR 0011, ADR 0016,
ADR 0062 and ADR 0074; supersedes [ADR 0013](0013-staff-two-step-verification.md) as ADR 0074
decided, and carries out ADR 0074's removal.

## Context

Journey 3 builds staff sign-in with Google Workspace (`L2-018`, `L2-049` AC15) on the shared
OpenID Connect handler journey 2 builds for members, then removes the staff password and the
application's two-step code (`L2-046`, ADR 0074). Several points were left open:

- A Copilot investigation (PR 150) found that signing in again while sending an existing staff
  cookie kept that cookie's server-side session key: ASP.NET Core's cookie handler renews the key a
  request already names (`SessionStore.RenewAsync`), so a copy of the old cookie inherits the new
  sign-in (session fixation, OWASP ASVS 3.2.1). The member session has the same flaw.
- `L2-018` AC9 asks for a 12-hour maximum, but the cookie handler moves `IssuedUtc` on every
  sliding renewal, so it cannot tell when staff signed in. Issue 148 decided that sessions with no
  recorded sign-in time count as past the maximum.
- `session_expired` now has two causes, 30 idle minutes (`L2-018` AC6) and the 12-hour maximum
  (AC9); the mock `session-expired` draws only the second's words ("You were signed out after 12
  hours").
- `L2-049` AC15 has `cf seed` create the first Admin from `Seed:AdminEmail`, which names no
  display name and no password.
- ADR 0074 asked for the two-step tables to be dropped "in a later release", once no old revision
  needs them; issue 83 (decided by the owner) asks for the migration in this change.

## Decision

- **A new session key on every sign-in, member and staff.** When a sign-in request carries the
  scheme's cookie, its session is ended on the server, the cookie is taken off the request, and a
  handler that has not read it stores the ticket under a new key (`CookieSignIn`). Only the new
  cookie is answered; the old one opens nothing.
- **The 12-hour maximum.** The staff scheme records the sign-in time in the ticket
  (`cf.signedInAt`, `StaffSessionAge`) when the session starts. `OnValidatePrincipal` ends a session
  12 hours or more after it, or one with no recorded time, on the server and answers 401
  `session_expired`, as an idle session is. A request in the 12th hour is still answered.
- **Which ending.** The 12-hour ending's ProblemDetails carries `reason: "max_age"`; an idle
  ending carries `reason: "idle"`. Staff sign in shows "Your session expired" with "You were signed
  out after 12 hours. Sign in again to continue." for the first, and "You were signed out after 30
  minutes without activity. Sign in again to carry on." for the second.
- **Staff sign-in.** `POST /api/admin/session/google/start` starts the shared Google sign-in with
  the `GoogleStaff` scheme, which asks Google for the team's domain (`hd`); `POST
  /api/admin/session/google` finishes it (`CompleteStaffGoogleSignInCommand`), in the design's
  order: no Google identity or an unverified email (401, the shared codes), a hosted domain that is
  not `Google:StaffDomain` (403 `wrong_domain` with the `account` extension), no member or no staff
  role (403 `not_staff` with `account`), a suspended member (403 `account_suspended`), otherwise a
  staff session, audited as `staff_session.started`. Every refusal forgets the Google identity, so
  "Try another Google account" starts afresh with Google's chooser (`prompt=select_account`).
- **Binding a staff account.** A staff `Member` is found by Google subject first; on its first
  Google sign-in, one with no subject is found by its email (case-insensitively) and bound to the
  subject. A member already bound to another subject is not matched by email.
- **The first Admin.** `cf seed` reads `Seed__AdminEmail` (required to make the Admin; ADR 0111 lets a release go on without it) and `Seed__AdminName`
  (optional, "Christian Fitness Admin" when unset) and creates that Admin with no password and no
  Google subject; the first Google sign-in binds it. A second run changes nothing. `Seed__StaffEmail`,
  `Seed__StaffPassword` and `Seed__StaffName` and the job secret `seed-staff-password` are removed.
- **Removal (ADR 0074).** The password step, the two-step code, `cf two-step`, their endpoints,
  cookie, screens and tests go in this change, and the migration `RemoveStaffTwoStep` drops
  `StaffTwoSteps`, `TwoStepChallenges` and `TwoStepFailures`. Staff sign-in records no
  `SignInFailure`; staff starts count against the shared limit of 20 Google starts per network in 15
  minutes (`too_many_attempts`, `L2-049` AC7). `/sign-in/verify` falls through to the admin
  not-found page.
- **Not configured.** The admin app's start refused `google_unavailable` (503) shows "Sign-in isn't
  set up yet. Ask the person who runs Christian Fitness." (mock `not-configured`, `L2-018` AC10).

## Consequences

- Every staff member is signed out once on release (their sessions have no recorded sign-in time),
  as issue 148 accepted.
- The release is forward-only for staff sign-in: the migration drops the two-step tables in the
  same release that stops using them, as issue 83 decided, so an earlier revision activated after it
  cannot sign staff in. ADR 0074's two-release ordering is not followed; a rollback of this release
  needs a fix forward instead.
- Operators must register both callback addresses with the Google client, set `Google__ClientId`,
  `Google__ClientSecret`, `Google__StaffDomain` and `Seed__AdminEmail`, and enforce two-step
  verification for the domain in Google Workspace (`L2-046` AC2) before the release.
- Signing in again from a browser that already holds a session costs one more write (the old
  session's deletion) and no longer reuses its row.
