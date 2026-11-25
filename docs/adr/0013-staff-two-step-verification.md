# 0013. Staff two-step verification: authenticator codes, a pending sign-in and a shared attempt window

## Status

Superseded by [ADR 0062](0062-retire-staff-password-and-two-step.md), 25 November 2026.
The implementation described below remains in place until the Google staff sign-in cutover.

## Context

Slice 9.2 makes staff confirm every admin sign-in with a second step (journey 9, L1-008, L1-013).
Slice 9.1 built the staff session: `POST /api/admin/session` checks the password through
`MemberCredentials`, reads the `StaffRole` and signs in with the `Staff` cookie scheme
(ADR 0011). Slice 20.1 made the rule "at most N attempts in a period" a stateless Domain record,
`AttemptWindow`, for every feature to share (ADR 0010). Slices 3.2 (the member lockout) and 20.2
(choosing a new password) are being built at the same time; neither is touched here.

The mock `admin-two-step` says "Open the authenticator app on your phone and enter the 6-digit
code for Christian Fitness" and warns that codes change every 30 seconds. It also drew "Trust
this browser for 30 days" and "Lost your phone? Use a backup code", and no screen for setting an
authenticator up, for an expired step or for too many codes. No requirement existed; L2-046 was
added (L2-045 is taken by slice 20.2's choose-a-new-password requirement).

## Decision

- **The channel is an authenticator app: TOTP (RFC 6238),** as the mock's copy says. HMAC-SHA1,
  6 digits, 30-second steps, which every authenticator app reads from an `otpauth://` link. The
  code of the current step and of one step either side is accepted, for clock drift; spaces are
  ignored ("481 920"). A step that already opened a session is refused as wrong, so a code seen
  over a shoulder cannot be used again. An emailed code was rejected: it would put a sign-in
  secret in a mailbox, the very account a password thief most often holds as well, and make sign-in
  depend on mail delivery. The algorithm is `Totp` (Domain), tested against the RFC's own vectors.
- **The password step answers 202 and starts a pending sign-in, not a session.** After the
  password and the staff role, the handler stores a `TwoStepChallenge` (only the SHA-256 hash of a
  32-byte random token, as reset links do) that expires 5 minutes after it was made, and sets the
  `__Host-cf-admin-step` cookie holding the token: `Secure`, `HttpOnly`, `SameSite=Strict`, path
  `/`, expiring with the challenge. `POST /api/admin/session` answers 202 with no body; no staff
  session exists until the code is right. A new password step replaces the account's earlier
  challenges.
- **`POST /api/admin/session/two-step` checks the code** (anonymous, like the password step; the
  antiforgery filter still applies). One MediatR request, `VerifyTwoStepCommand`, a class so the
  code can never reach a log through a generated `ToString`. The handler refuses, in this order:
  no cookie, an unknown or expired challenge (`two_step_expired`, 401); a full failure window
  (`too_many_attempts`, 429, whether the code is right or not, and the challenge ends); a wrong,
  malformed or reused code (`invalid_code`, 401, and one failure recorded). A right code ends the
  challenge, clears its cookie, records the step used and signs in through `IStaffSessionSignIn`,
  answering the staff session as the password step used to. The role is read again at this step,
  so a role removed in the meantime is refused `not_staff`.
- **Attempts are limited with the shared `AttemptWindow` (ADR 0010):** 5 wrong codes per account
  in 15 minutes, the member sign-in's figures (L2-004 AC3). Each wrong code is a `TwoStepFailure`
  row, counted per account, not per challenge, so signing in again does not reset the count; the
  window is checked before the code, so a full window tells nothing about a guess. With a
  one-in-a-million code and three accepted steps, 5 guesses in 15 minutes leave a thief with the
  password well under one chance in 60,000 a window. The tests move a `FakeTimeProvider` past each
  threshold; nothing sleeps.
- **Setting up is an operator's command, `cf two-step <email>`.** It makes a fresh 20-byte secret
  for a staff account (replacing any earlier one, which is how a lost phone is handled), stores it
  in `StaffTwoSteps` and prints the `otpauth://` link once, for the staff member to add to their
  app. A staff account without a secret is refused at the password step with
  `two_step_not_set_up` (403) and no session, so no staff session ever opens on a password alone.
  The first staff account is set up the same way after `cf seed`. A self-service setup screen
  with a QR code has no mock and no slice yet; the command keeps this slice to its budget.
- **The secret is stored as the authenticator needs it**, as ASP.NET Core Identity stores its
  authenticator keys: a TOTP secret cannot be hashed, since the server must compute the code.
  It is never returned by the API or written to a log, span or metric; encrypting the column with
  Data Protection keys was left out because those keys may live in memory (`DataProtection__KeysPath`
  unset), and losing them would lock every staff member out.
- **No "Trust this browser for 30 days" and no backup codes.** Every admin sign-in asks for a
  code: the admin app is the most privileged surface, a remembered browser would make a stolen
  laptop a staff session, and the staff session already ends with the browser (ADR 0011). Backup
  codes would need a screen to show them once and storage for them; an Admin re-running
  `cf two-step` does the same job for a team this size. The mock lost the checkbox, and its note
  now reads "Lost your phone? Ask an Admin to set up two-step verification again."
- **The screens.** `/sign-in/verify` in the admin app is a lazy `TwoStepPage` in the same
  `StaffLayout` card: "Enter your code", one Verification code field (`autocomplete="one-time-code"`,
  `inputmode="numeric"`, the design system's `input--code`), "Verify" and "Verifying…". A wrong
  code marks the field `aria-invalid` with the mock's sentence and keeps what was typed; a
  failure says "We couldn't check your code. Try again in a moment." in the same place, as the
  mock's manifest decided. An expired step or too many codes return to Staff sign in with a
  router navigation state the sign-in screen reads once, showing "Sign in again" or "Too many
  codes tried"; `two_step_not_set_up` shows "Two-step verification isn't set up" there. The
  three new `admin-sign-in` mock states and the code screen's `failed` state were added before
  the code. The sign-in screen's "Two-step verification required" note now shows, as the mock
  always drew it. `StaffLayout` gained an optional note with its icon, and `TextField` an
  `inputmode` and the `code` look.
- **Telemetry.** The route templates and outcome codes are recorded as for every request; the
  code, the secret, the challenge token and the step cookie never are.

## Consequences

- Every staff member needs an authenticator app, and an operator must run `cf two-step` for each
  before they can sign in; `docs/operations/settings.md` says so beside `cf seed`.
- The admin sign-in contract changed: `signIn` completes with no session, and `verify` answers
  the session. The e2e fixture answers the password step with 202.
- Two tables (`StaffTwoSteps`, `TwoStepChallenges`) and the `TwoStepFailures` window arrive with
  the `AddStaffTwoStep` migration. Old challenges and failures are left in place; a clean-up job
  can come with the first scheduled-task slice.
- A self-service setup screen, backup codes and an Admin screen to reset someone's two-step are
  future work, each with its own mock and requirement.
