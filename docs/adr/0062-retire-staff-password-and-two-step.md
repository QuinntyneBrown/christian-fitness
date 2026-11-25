# 0062. Retire the staff password and application-owned two-step verification

## Status

Accepted, 25 November 2026. Supersedes [ADR 0013](0013-staff-two-step-verification.md).
This decision describes the target; the existing implementation has not yet been removed.

## Context

L2-018 requires staff to sign in only with a Google Workspace account in the team's domain
that has a console role. L2-046 withdraws the application's staff verification code: the team
enforces two-step verification in Google Workspace. The existing staff sign-in instead requires
a password and an application-owned authenticator code. The first Google sign-in decision is
being resolved in [issue 82](https://github.com/QuinntyneBrown/christian-fitness/issues/82).

## Decision

- Replace the staff password and code flow with Google staff sign-in. Google checks the
  credentials and the team's Workspace two-step policy; the application checks the verified
  identity, team's domain and staff role before opening a staff session. The existing session
  authorization, expiry and sign-out requirements remain.
- Remove `StaffSignInCommand`, `VerifyTwoStepCommand`, `StaffTwoStep`, `Totp`,
  `TwoStepChallenge`, `TwoStepFailure`, `ITwoStepCookie`, `CookieTwoStepCookie`,
  `StaffTwoStepSetUp`, `cf two-step`, and the password and two-step POST actions at
  `/api/admin/session` and `/api/admin/session/two-step`. Retain the session GET and DELETE.
  Staff sign-in no longer records `SignInFailure`; member password sign-in is unaffected.
- Remove the admin password form, `TwoStepPage`, `twoStepRefusalOf` and `TwoStepRequestDto`.
  `/sign-in/verify` falls through to the admin not-found page. Remove tests, end-to-end specs,
  page objects and fixture handlers that cover only the retired paths; retain the Google staff
  sign-in acceptance path.
- Remove the three two-step tables with an EF migration. Remove the seeded staff password and
  two-step settings from the deployment configuration and operational guides when the code
  changes; document the Google settings and the Workspace two-step policy instead.

## Consequences and rollout

- This is a decision, not an assertion that the code has already changed. Google staff sign-in
  must be implemented and verified before the old path is retired, so staff are not locked out.
  The remaining changes land in incremental slices with the requirements, designs and mocks
  aligned and the remaining suites green.
- The release job migrates and seeds before the new revision serves traffic (ADR 0047). A
  migration that drops the tables while the old revision still needs them would break that
  revision and rollback. First deploy a compatible revision that no longer uses the tables,
  then drop them in a later release after old revisions that require them are no longer rollback
  targets. The data cannot be recovered by activating an earlier revision.
- The current operations guides describe the deployed password and two-step setup until its
  replacement ships. Removing those instructions before then would mislead operators.
