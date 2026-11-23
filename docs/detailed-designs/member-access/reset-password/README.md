# Reset a forgotten password

## Overview

A member who has forgotten their password asks for a link by email and chooses a
new password through it. This feature covers the "Forgot your password?" link on
Sign in, the Forgot password screen at `/forgot-password`, the reset request the API
answers and the reset email. It belongs to the member-access subsystem.

- **reset request** — a visitor's request for a reset link to an email address
- **reset link** — single-use link to `/reset-password` holding a random token, valid
  for 30 minutes after the request
- **password reset** — the stored record of one issued link: the member, a hash of the
  token, when it was requested and when it expires
- **reset window** — one hour in which one account is sent at most 3 reset emails

The answer to a reset request never says whether an account has the email: a
registered email and an unknown one get the same 202 and the same "Check your email"
screen. Only a registered email, inside its reset window, is sent a link.

## Description

Slice 20.1 builds the request, the screen and the email
([ADR 0010](../../../adr/0010-password-reset-request-and-email.md)); slice 20.2 builds
the Reset password screen that the link opens and sets the new password.

- **`SignInPage`** — gains the mock's "Forgot your password?" link under the password
  field, a `TextLink` to `/forgot-password` (L2-044 AC1). It loads the document, as the
  other auth links do.
- **`ForgotPasswordPage`** — routed, lazy page at `/forgot-password`, title "Forgot
  password · Christian Fitness", built from the mock's `auth`, `field`, `input` and
  `form-alert` blocks with one signal for the email. Submitting checks the email with
  `emailErrorOf` (`domain`, the Join rule of ADR 0008): a blank or malformed email sends
  nothing and shows the summary "Check your email address", which takes focus and links
  to the field, and marks the field `aria-invalid` with "Enter an email address like
  name@example.com" (L2-044 AC5, mock `invalid`). Editing the field clears its error.
  While the request is on its way the button reads "Sending…", is disabled and busy, and
  the field is read-only (L2-044 AC7, mock `submitting`). A 202 replaces the form with
  "Check your email", naming the email as typed (rendered as text), the 30-minute
  expiry, "Back to sign in" (`/sign-in`) and "send it again", which sends the same email
  again through the busy state (L2-044 AC4, mock `success`); the heading takes focus.
  `resetRequestRefusalOf` (`domain`) reads a failure: a 400 `validation_failed` marks the
  field as invalid, and anything else shows "We couldn't send the email" with the email
  kept (L2-044 AC7, mock `error`).
- **`AuthLayout`** (`components`) — gains a notice form: with `notice` it renders the
  `auth__form` as a `<div>` instead of a `<form>` and focuses its heading when it
  appears. `lead` may be completed by a `[slot=lead]` node (the bold email), `altText`
  is optional, `altEnd` closes the line, and without `altHref` the alternative is a
  `<button class="auth__alt-action">` that emits `altChosen`. The slots are declared once
  in one template both branches show.
- **`TextLink`** (`components`) — the design system's `text-link` block as a link, with
  its 44 × 44 px touch target on coarse pointers.
- **`AccountApi.requestPasswordReset` / `ACCOUNT_SERVICE`** — the contract in `api`
  takes a `PasswordResetRequestDto` (`email`) and completes on 202; a refusal errors with
  an `ApiError`. `HttpAccountService` implements it; no new token is bound.
- **`AccountController`** — `POST /api/account/password-reset`, `[AllowAnonymous]`, with
  the antiforgery token like every write; it sends one
  `RequestPasswordResetCommand` and answers 202 with no body.
- **`RequestPasswordResetValidator`** — the email is required, at most 254 characters
  and of the Join shape; otherwise 400 with code `validation_failed` (L2-044 AC5).
- **`RequestPasswordResetHandler`** — looks the member up by the email's lookup key
  (trimmed, lower case). With no member it returns at once. Otherwise it counts the
  member's `PasswordReset` rows requested since `AttemptWindow.Since(now)`; when 3 are
  inside the hour it returns without sending (L2-044 AC6). Else it issues a
  `PasswordReset`, saves it and sends the email through `IEmailSender`. The answer is the
  same 202 in every case (L2-044 AC2, AC3). Time comes from `TimeProvider`.
- **`PasswordReset`** (Domain) — `Issue(memberId, now)` makes 32 random bytes from
  `RandomNumberGenerator`, encoded base64url, and keeps only their SHA-256 hash in hex
  (`HashOf`), with `ExpiresAt = RequestedAt + 30 minutes`. The token itself exists
  only in the email (L2-044 AC2). Slice 20.2 adds its use.
- **`AttemptWindow`** (Domain) — the rule "at most `Limit` attempts within `Period`":
  `Since(now)` is the oldest instant still inside the window, and `IsFull(count)` says
  whether `count` attempts since then reach the limit. It holds no state, so any store
  can feed it; slice 3.2's failed sign-in window (5 in 15 minutes) can share it.
- **`IEmailSender`** (Application) — sends an `EmailMessage` (`To`, `Subject`,
  `Text`). With `Email:Smtp:Host` set, `QueuedEmailSender` writes it to a bounded
  in-process channel and `EmailDispatcher`, a hosted service, delivers it with
  `SmtpEmailTransport` (MailKit), so the API answers before the mail server does and the
  time to answer does not depend on whether a mail was sent. Without a host,
  `RecordingEmailSender` keeps the latest messages in memory, sending none: the
  development and test sender. Outside Development a missing host or member-app address
  stops the API at start-up ([settings](../../../operations/settings.md)).
- **The email** — plain text, to the account's address: subject "Reset your Christian
  Fitness password", the member's first name, the link
  `{MemberApp:BaseUrl}/reset-password#token=…`, the 30-minute expiry and a line saying
  to ignore it if they did not ask. The link's address comes from configuration, never
  from the request's `Host` header. The token is in the fragment, which no browser sends
  to a server or in a `Referer`.
- **Telemetry** — the route is recorded as its template; no span, metric or log carries
  the email, the token or the link (L2-044 AC8, L2-033 AC2). A delivery failure is logged
  by the exception's type only.

### Open questions

- A per-address (IP) limit on reset requests belongs with the account-creation limit of
  `L2-034` AC2 and is not built here; the per-account window already stops one inbox
  being flooded.
- The queue is in process: a mail not yet delivered when the API stops is lost, and the
  member asks again. A durable outbox may replace it when other emails need one.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-044` | `L1-002`, `L1-013` | A member who has forgotten their password shall ask for a reset link by email from the Sign in screen, and the answer shall never reveal whether an account has the email given (acceptance criteria 1–8). |

## Diagrams

### System context

The member reaches Christian Fitness over HTTPS; the system sends the reset email through an SMTP relay and exports telemetry to an OpenTelemetry collector.

![C4 system context for reset a forgotten password](diagrams/c4-context.png)

### Containers

The Member web app posts the email to the API, which reads members and writes password resets in the database and hands the email to the mail relay.

![C4 container view for reset a forgotten password](diagrams/c4-container.png)

### Components

The components below are the parts slice 20.1 touches; the controller sends one MediatR request and the dispatcher delivers mail after the answer.

![C4 component view for request a reset link](diagrams/c4-component.png)

### Class structure

The class diagram shows the screen and its helpers, the contract, the request and handler, the domain types they use and the email senders.

![Class diagram for request a reset link](diagrams/class-structure.png)

### Behaviour — request a reset link

A malformed email never leaves the screen. Any other request is answered 202; only a registered email inside its reset window gets a new password reset and an email (`L2-044`).

![Sequence diagram for member requests a reset link](diagrams/sequence-request-reset-link.png)
