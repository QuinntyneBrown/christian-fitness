# 0010. Password reset request: one answer for every email, hashed tokens and a queued email sender

## Status

Accepted, 22 November 2026 (slice 20.1).

## Context

L2-044 asks a member who has forgotten their password to request a reset link by email, without
the answer revealing which emails have an account. The product had no email at all, no settings
for a mail server and no rate rule shared between features. Slice 3.2 (the failed sign-in window,
5 in 15 minutes) was being built at the same time and had not chosen where its attempts live.

The OWASP Forgot Password Cheat Sheet asks for: the same answer and a similar time for a known
and an unknown account; random, single-use, short-lived tokens stored hashed; a link built from a
configured address, never from the request's `Host` header; and protection against flooding one
inbox.

## Decision

- **One answer.** `POST /api/account/password-reset` (`[AllowAnonymous]`, antiforgery token
  required like every write) answers **202 with no body** for any well-formed email, registered or
  not, inside its window or not. A malformed body is refused 400 `validation_failed`, which says
  nothing about accounts.
- **Similar time.** The handler never waits for the mail server: `IEmailSender` in production is
  `QueuedEmailSender`, which writes to a bounded in-process `Channel` (500 messages; when full, the
  message is dropped and a warning logged with no content), and `EmailDispatcher`, a hosted
  service, delivers it after the answer. The work left that differs between a known and an unknown
  email is one count and one insert in the database.
- **Tokens.** 32 bytes from `RandomNumberGenerator`, base64url in the link, SHA-256 hex in the
  `PasswordResets` table with the member, the request time and `ExpiresAt` 30 minutes later. The
  link is `{MemberApp:BaseUrl}/reset-password#token=…`: in the fragment, so neither the static host
  nor the API ever receives it in a request line or a `Referer`. Slice 20.2 reads it, checks the
  hash and expiry, and marks it used.
- **Window.** At most 3 reset emails per account per hour, counted from its `PasswordResets` rows,
  so the count holds across API instances and restarts. Over the limit the answer is the same 202
  and no email is sent. The rule is the Domain record `AttemptWindow(Limit, Period)`, a pure
  function of a count and `TimeProvider`'s now; slice 3.2 may feed it its own failed-attempt count.
- **Mail transport.** MailKit (MIT), Microsoft's recommended replacement for
  `System.Net.Mail.SmtpClient`, in Infrastructure, pinned in `Directory.Packages.props`. Settings
  `Email:From`, `Email:Smtp:Host`, `Email:Smtp:Port`, `Email:Smtp:UserName`,
  `Email:Smtp:Password` and `MemberApp:BaseUrl` are documented in
  [settings](../operations/settings.md). Without `Email:Smtp:Host`, `RecordingEmailSender` keeps
  the latest 50 messages in memory and sends none; that is the development and test sender.
  Outside Development the API refuses to start without a host, a sender address and the member
  app's address, so production never drops mail silently.
- **Screens.** `/forgot-password` is lazy. The success state is the `auth` block as a notice (a
  `<div>`, not a `<form>`); its "send it again" is a `<button class="auth__alt-action">`, since it
  acts rather than navigates, added to the design system and the mock.

## Consequences

- No screen and no API answer can tell a registered email from an unknown one; the screen always
  says "If an account exists for …".
- A mail queued but not delivered when the API stops is lost; the member asks again. A durable
  outbox can replace the channel behind the same `IEmailSender` when more email is sent.
- There is no per-address (IP) limit yet; it is built with the account-creation limit of L2-034.
- The API tests replace `IEmailSender` with `RecordingEmailSender` and remove `EmailDispatcher`
  from the shared host; `SmtpEmailTransport` is tested against an in-process SMTP listener.
