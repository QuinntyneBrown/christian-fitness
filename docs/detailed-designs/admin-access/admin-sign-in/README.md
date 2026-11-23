# Admin sign-in

## Overview

Christian Fitness is a Christian community for health in body and spirit in the Greater Toronto
Area. It runs two web apps: the *Member web app* for members and the *Admin web app* for the team.
This feature is the door to the Admin web app. It lets a staff member sign in with a password and
a second-step code, keeps every admin endpoint closed to anyone without a staff session, and ends
an idle session.

- **staff member** — person whose account holds a staff role (Admin or Moderator, see `staff-roles`)
- **staff session** — authenticated cookie session issued by the admin sign-in and accepted only by admin endpoints
- **second step** — a 6-digit code from the staff member's authenticator app (TOTP, RFC 6238), asked after the password on every sign-in
- **pending sign-in** — `TwoStepChallenge` held for 5 minutes between the password and the code, named by the `__Host-cf-admin-step` cookie
- **idle timeout** — interval of 30 minutes without a request after which a staff session expires
- **lockout** — refusal of further sign-ins for one email after 5 failures within 15 minutes (`L2-004` AC3)

A member account without a staff role holds valid credentials but is refused with code
`not_staff`. Wrong credentials produce one generic message that does not reveal whether the
email or the password was wrong.

## Description

The slice runs from the Staff sign in screen (mock `docs/mocks/pages/admin-sign-in/`) through
the code screen (mock `docs/mocks/pages/admin-two-step/`) to the member store
([ADR 0011](../../../adr/0011-staff-sign-in-and-admin-shell.md),
[ADR 0012](../../../adr/0012-staff-two-step-verification.md)).

- **`SignInPage`** — routed page `/sign-in` in `projects/admin`, loaded with `loadComponent`. It
  renders the `staff` card through `StaffLayout` (`components`) with `TextField`, `FormAlert` and
  `Button`: Work email, Password, Sign in, and the `submitting` state ("Signing in…", disabled,
  fields read-only). A refusal shows one `form-alert` that takes focus, chosen from the error
  `code` by `staffSignInRefusalOf` (`domain`): `invalid` (no field marked, L2-018 AC3),
  `not-staff` (AC2), `two-step-not-set-up` (L2-046 AC6) or `failed`. What was typed stays. The
  note "Two-step verification required" shows under the button. Success (202) navigates to
  `/sign-in/verify`. Arriving back from the code screen with a router navigation state of
  `expired` or `locked` (read once by `twoStepEndingOf`) shows "Sign in again" or "Too many
  codes tried" (mock states `two-step-expired`, `two-step-locked`).
- **`TwoStepPage`** — routed page `/sign-in/verify`, loaded with `loadComponent`, in the same
  `StaffLayout` card: "Enter your code", the authenticator lead, one Verification code
  `TextField` (`autocomplete="one-time-code"`, `inputmode="numeric"`, the `input--code` look),
  Verify and "Verifying…" (disabled, field read-only), and the note "Lost your phone? Ask an Admin
  to set up two-step verification again." `twoStepRefusalOf` (`domain`) reads a refusal:
  `invalid-code` marks the field with the mock's sentence, `failed` puts "We couldn't check your
  code. Try again in a moment." in the same place (both keep the code), and `expired` or `locked`
  return to Staff sign in with that state. A right code navigates to the Dashboard.
- **`StaffSessionApi` / `STAFF_SESSION_SERVICE`** — contract and injection token in the `api`
  library: `current()`, `signIn(request)` (completes on 202, no session), `verify(request)`
  (answers the session) and `signOut()`. Refusals arrive as an `ApiError` with `code`.
- **`HttpStaffSessionService`** — HTTP implementation bound in the admin `app.config.ts`, which
  also provides the HTTP client with `serverErrorInterceptor` and `antiforgeryInterceptor`.
- **`staffAuthGuard`** (`domain`) — on the shell that parents every staff route. It calls
  `current()`; a 401 sends the visitor to `/sign-in`, a 5xx is left to the server-error screen.
- **`StaffSessionController`** — ASP.NET Core controller. `POST /api/admin/session` is
  `[AllowAnonymous]` and answers 202; `POST /api/admin/session/two-step` is `[AllowAnonymous]`
  too; `GET` and `DELETE` require the `Staff` policy. Each action sends one MediatR request:
  `StaffSignInCommand`, `VerifyTwoStepCommand`, `GetStaffSessionQuery`, `StaffSignOutCommand`.
- **`StaffSignInHandler`** — checks the credentials through `MemberCredentials`, the check the
  member sign-in shares (unknown email and wrong password give the same `invalid_credentials`,
  in the same time), then reads the `StaffRole`: none refuses `not_staff` (403) and sets no
  cookie. Staff without a `StaffTwoStep` are refused `two_step_not_set_up` (403). Otherwise the
  handler replaces the account's `TwoStepChallenge` (token hash only, 5 minutes) and sets the
  step cookie through `ITwoStepCookie`; no session yet. No validator: a blank field is simply
  wrong credentials.
- **`VerifyTwoStepHandler`** — reads the step cookie and its challenge (none or expired:
  `two_step_expired`, 401), counts the account's `TwoStepFailure`s against
  `TwoStepChallenge.FailureWindow`, the shared `AttemptWindow(5, 15 minutes)` (full:
  `too_many_attempts`, 429, the challenge ends), then `StaffTwoStep.TryUse(code, now)`: `Totp`
  accepts the code of the current step or one either side, spaces ignored, never a step already
  used. Wrong: one failure recorded, `invalid_code` (401). Right: the step is recorded, the
  challenge and its cookie end, the role is read again and `IStaffSessionSignIn` starts the
  session, answered as `StaffSessionDto`.
- **`cf two-step <email>`** — the CLI command that gives a staff account a fresh 20-byte secret
  (`StaffTwoStepSetUp`) and prints its `otpauth://` link once; running it again replaces the
  secret, which is how a lost phone is handled.
- **Step cookie** — `__Host-cf-admin-step`: `Secure`, `HttpOnly`, `SameSite=Strict`, path `/`,
  expiring with its challenge; set and cleared by `CookieTwoStepCookie` (Infrastructure). `GetStaffSessionHandler` reads the role again, so a role removed since
  sign-in is refused `not_staff`.
- **Staff cookie scheme** — `Staff`, cookie `__Host-cf-admin`: `Secure`, `HttpOnly`,
  `SameSite=Strict`, path `/`, not persistent. The ticket (member id and role claim) lives in the
  `Sessions` table through the same `DatabaseTicketStore` as the member session, so sign-out
  (L2-018 AC6) ends it on the server.
- **`Staff` policy** — authenticates only the `Staff` scheme and requires a role claim; a
  convention adds it to every controller routed under `api/admin`. A visitor or a member session
  gets 401 with a ProblemDetails and nothing else (`L2-018` AC4).

Error codes: `invalid_credentials` (401, one generic message), `not_staff` (403),
`two_step_not_set_up` (403), `invalid_code` (401), `two_step_expired` (401) and
`too_many_attempts` (429). There is no "Trust this browser" and no backup code (ADR 0012). The lockout of
`L2-004` AC3 (`too_many_attempts`, 429), which AC3 applies here too, arrives with slice 3.2 in
`MemberCredentials`, so both sign-ins get it; the mock's locked copy is that slice's. The 30-minute idle expiry (AC5) and its session-expired notice
are slice 9.3's. Telemetry records the route template and outcome code, never the email, the code, the secret or
the step cookie (L2-046 AC8).

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-046` | `L1-008`, `L1-013` | Given a staff account with two-step verification set up, when it signs in with correct credentials, then the API answers 202 and the app opens "Enter your code" at `/sign-in/verify`. Given the current authenticator code (or one 30 seconds either side) within 5 minutes, then the staff session starts; a used code is refused. A wrong code is refused `invalid_code` (401) with the field marked; after 5 wrong codes in 15 minutes, `too_many_attempts` (429); after 5 minutes, `two_step_expired` (401); staff without two-step set up are refused `two_step_not_set_up` (403); "Verifying…" while checking; no telemetry carries the code, the secret or the cookie. |
| `L2-018` | `L1-008` | Given a staff account, when it signs in to the admin app with correct credentials and confirms with its second-step code (L2-046), then it lands on the Dashboard. Given a member account without a staff role, when it signs in to the admin app, then it is refused with code `not_staff` and HTTP 403. Given wrong credentials, when signing in, then one generic message is shown, and the L2-004 AC3 lockout applies. Given a request to any admin endpoint without a staff session, when it arrives, then it is refused with HTTP 401 or 403 and no data is returned. Given an admin session idle for 30 minutes, when the next request arrives, then the session has expired and the user must sign in again. Given a signed-in staff member, when they choose Sign out, then the staff session is ended on the server and they return to Staff sign in. |

## Diagrams

### System context

Staff members sign in to Christian Fitness through its Admin web app; the system exports
telemetry without personal data.

![C4 system context for admin sign-in](diagrams/c4-context.png)

### Containers

The Admin web app posts credentials to the Christian Fitness API, which checks the member store
and issues the staff cookie.

![C4 container view for admin sign-in](diagrams/c4-container.png)

### Components

The page calls the `STAFF_SESSION_SERVICE` contract; the controller, behind the `Staff` policy,
sends `StaffSignInCommand`, and the handler checks the credentials and the staff role.

![C4 component view for admin sign-in](diagrams/c4-component.png)

### Class structure

`StaffSignInHandler` handles `StaffSignInCommand`, verifies through `MemberCredentials`, reads
`StaffRole`, and returns `StaffSessionDto` or refuses with a code.

![Class diagram for admin sign-in](diagrams/class.png)

### Behaviour — sign in

The handler checks the credentials, then the staff role, then two-step set-up, and starts a
pending sign-in (`L2-018` AC1–AC3, `L2-046` AC1, AC6); the lockout joins the credential check in
slice 3.2.

![Sequence diagram for staff sign-in](diagrams/sequence-sign-in.png)

### Behaviour — second step

The code is checked only while the pending sign-in is open and the failure window has room; a
right code starts the staff session (`L2-046` AC2–AC5).

![Sequence diagram for staff two-step verification](diagrams/sequence-two-step.png)

### Behaviour — idle session expires

A request after 30 minutes of inactivity finds an expired cookie; the API refuses it with HTTP
401 and the interceptor returns the user to sign-in (`L2-018` AC4–AC5).

![Sequence diagram for an expired staff session](diagrams/sequence-session-expiry.png)
