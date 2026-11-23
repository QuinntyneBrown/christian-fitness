# 0014. Choosing a new password: a checked link, single use, every session ended and no sign-in

## Status

Accepted, 22 November 2026 (slice 20.2).

## Context

L2-045 asks that a valid, unexpired reset link set a new password once. Slice 20.1 (ADR 0010)
emails `{MemberApp:BaseUrl}/reset-password#token=…` and stores only the token's SHA-256 hash with
its expiry. The mock draws the email of the account above the fields ("For
grace.thompson@gmail.com."), an expired state, and a success that says "We've signed you out on
your other devices" and offers "Sign in". Sessions live in the `Sessions` table since slice 3.1
(ADR 0009), so the server can end them.

The OWASP Forgot Password Cheat Sheet asks that a token work once, that the new password be
confirmed, that existing sessions be invalidated, and that the user not be logged in
automatically, which keeps the reset flow apart from the sign-in flow (and the protections slice
3.2 adds to sign-in).

## Decision

- **Two endpoints, the token in the body.** `POST /api/account/password-reset/check` with
  `{ token }` answers 200 `{ email }` for a usable link, so the screen can name the account and a
  password manager can file the new password under it. `POST /api/account/password-reset/complete`
  with `{ token, password }` answers 204. Both are `[AllowAnonymous]` and need the antiforgery
  token, like every write. Neither is a GET, so the token never travels in a URL, a log line or a
  `Referer`.
- **One refusal for every unusable link.** An unknown, used or expired token, or a blank one, is
  refused **410 Gone** with code `reset_link_expired` (a new `RefusalKind.Gone`). The screen shows
  the mock's "This link has expired", whose words already cover all three ("Reset links last 30
  minutes, and each one works once"). A short password is refused 400 `validation_failed` by a
  validator, with Join's rule of at least 8 characters.
- **Single use, even in a race.** `PasswordReset.UsedAt` is set when the password changes and is
  an EF Core concurrency token: two saves with one link both read it empty, and the database
  updates only the first; the second save raises `DbUpdateConcurrencyException`, which the handler
  answers `reset_link_expired`. The new password, the used link and the ended sessions are one
  `SaveChanges`, so a refused save changes nothing. Saving also marks every other unused link of
  the member used, so an older email cannot undo the change.
- **Every session ends; nobody is signed in.** `ISessionRevocation.EndAllAsync(memberId)`
  (Application contract, Infrastructure implementation over the `Sessions` table) removes the
  member's sessions in the same unit of work, the browser's own included. The member then signs in
  with the new password, through Sign in and its protections. The mock's success already says so.
- **The token leaves the address bar.** The screen reads `#token=` from the route's fragment once,
  keeps it in a field and replaces the URL with `/reset-password` (`Location.replaceState`), so it
  is not left in history or on screen. A reload after that shows the expired state: the member asks
  for a new link.
- **A limit per address on reset requests.** Slice 3.2 (ADR 0012) merged while this slice was
  open, with a client address keyed by IPv4 address or IPv6 /64 and an in-memory sliding hour.
  Its window moves into an abstract `AddressRateLimiter`, which `AccountCreationLimiter` (5 an
  hour) and a new `PasswordResetRequestLimiter` (10 an hour) extend. `RequestPasswordResetHandler`
  takes a lease before it looks up the email and, with 10 requests from the address in the hour,
  refuses 429 `rate_limited` with no lookup and no email (L2-034 AC3). Every request counts,
  whether the email has an account or not, and none is given back, so the refusal depends only on
  the address and reveals no account. Ten leaves room for a household or a church network
  sharing one address, while the per-account window of ADR 0010 (3 emails an hour) still guards
  each inbox. Link checks and saves are not limited: a 256-bit token cannot be guessed. The
  Forgot password screen shows "Too many requests" for a 429 (mock `forgot-password/limited`).
- **Screen states.** The mock gains `loading` ("Checking your link…"), `failed` ("We couldn't save
  your password", fields kept) and `unchecked` ("We couldn't check your link", "Try again"), drawn
  before code. A write that fails is the screen's to show; the server-error interceptor only acts
  on GETs (ADR 0006).

## Consequences

- A token holder learns the account's email; only the inbox owner holds the token.
- Resetting signs the member out of every device, this browser included, as the mock says. Staff
  sessions (ADR 0011) live in the same `Sessions` table, so a staff member's admin sessions end
  too.
- A suspended member can reset a password; slice 3.2's sign-in refusal still keeps them out.
- The counts of reset requests per address live in memory, like the account creations of ADR
  0012: a restart forgets them, and each instance counts its own if the API ever runs on more
  than one.
