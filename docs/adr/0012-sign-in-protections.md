# 0012. Sign-in protections: a failure window in the database, a suspended refusal, a checked return address and a join limit per address

## Status

Accepted, 22 November 2026 (slice 3.2).

## Context

Slice 3.1 signs members in and out (ADR 0009) and left three criteria of L2-004 to this slice:
five failed sign-ins for one email within 15 minutes refuse a sixth with `too_many_attempts` and
HTTP 429 until the window passes (AC3); a suspended member is refused with `account_suspended`
and a message to contact the team (AC4); and a visitor sent to sign in from a member route is
returned to it afterwards (AC6's second half). Slice 2.2 carried over L2-034 AC2: more than five
account creations from one IP address in an hour are refused with HTTP 429.

The sign-in design left where failed attempts are stored to this slice. The rate-limits design
planned ASP.NET Core's rate-limiting middleware for Join and left the trust of forwarded headers
`<TO SUPPLY>`. The mocks drew the paused state (`sign-in/error`) with the submit button disabled
and a "Reset your password" link, and drew no suspended state and no refused join for too many
accounts. Staff suspend members in slice 27.1; until then only the tests make a member suspended.

## Decision

- **Failed sign-ins are rows in the database**, a new `SignInFailures` table (migration
  `AddSignInFailures`) of `SignInFailure` (`Id`, `EmailKey`, `FailedAt`), so the window holds
  across API instances and restarts. `EmailKey` is the SHA-256 of the email's lookup key in hex:
  an address a stranger typed is not kept. `SignInHandler` reads the time from `TimeProvider`, so
  the tests advance a `FakeTimeProvider` instead of waiting.
- **The order of the checks** is: a blank field is `invalid_credentials` (401, not recorded); 5
  or more failures for the email in the last 15 minutes refuse the attempt with
  `too_many_attempts` (429) before the password is checked, right or wrong; an unknown email or a
  wrong password records a failure and is `invalid_credentials` (401); a `Suspended` member with
  the right password is `account_suspended` (403); anything else clears the email's failures
  and signs in. An unknown email's failures count like a known one's, so the pause never says
  whether an account exists; a suspended member is told only once the right password is given.
  The window slides: each failure leaves it 15 minutes after it was made, so the pause ends when
  the oldest of the five does, as AC3 says ("until the window passes"). A refused 429 is not
  recorded, so nobody can keep a member out longer by trying on.
- **The table stays small**: recording a failure deletes every row older than the window, so
  it holds at most the last 15 minutes' failures. Two attempts at the same instant may both pass
  the count of four; the sixth then meets five. The window is a brake on guessing, not an exact
  counter, and a transaction per attempt would cost more than it saves.
- **`RefusalKind` gains `Forbidden` (403) and `TooManyRequests` (429)**, answered by the existing
  exception handler with the refusal's code. No `Retry-After` header is sent: the screen says
  "15 minutes", which is the window's length and never more than the time left.
- **The screen** (`signInRefusalOf`) shows a focused `form-alert` for each code and marks no field:
  "Sign-in paused for 15 minutes" / "Too many attempts, so we paused sign-in to keep your account
  safe." for `too_many_attempts`; "Your account is suspended" / "Contact the Christian Fitness
  team to talk it through." for `account_suspended` (new mock state `sign-in/suspended`). No team
  address is given, since none is decided yet; the sentence names who to contact, as AC4 asks.
- **The submit button stays enabled while sign-in is paused.** The pause belongs to one email on
  the server, which answers 429 again while it lasts; a disabled button would also refuse a member
  who corrects a mistyped email, and could only be enabled again by a timer the screen does not
  need. The `sign-in/error` mock was changed to match, and its alert now takes focus as every
  other refusal does.
- **"Reset your password" ends the paused alert** and opens `/forgot-password`, the screen slice
  20.1 built, so a paused member can get back in without waiting. `FormAlert` gains an optional
  link after its sentence (`link`, `linkHref`), as `TextField` has after an error; the mock's
  trailing "to get back in now" was dropped so that the link ends the sentence.
- **The return address.** `memberAuthGuard` redirects a visitor to
  `/sign-in?returnUrl=<the URL asked for>`. `SignInPage` reads `returnUrl` once from the route
  snapshot and passes it through `signInReturnPathOf` (`domain`): only a path inside the app is followed
  (one leading `/`, not `//`, no `\`, no control character, not `/sign-in` again); anything else,
  or nothing, opens `/home`. A crafted link to sign in therefore cannot send a member to another
  site after they sign in (an open redirect). L2-004 AC6 now says so.
- **Account creations are limited in the handler, not by the rate-limiting middleware.**
  `CreateAccountHandler` asks `AccountCreationLimiter` (an Application singleton) for a lease on
  the client address before it checks the email. The limiter keeps, in memory and under a lock,
  each address's creations of the last hour, read from `TimeProvider`; with 5 already, the join
  is refused with `rate_limited` and HTTP 429. A join that then fails (a taken email, a lost race,
  a fault) gives its lease back, so what is counted is accounts created, as L2-034 AC2 says, and
  a body that fails validation never reaches the handler. The middleware's limiters were set
  aside because they count requests (a visitor who mistyped an email five times could create
  nothing more), and they keep their own clock, so a test could only prove the hour passing by
  waiting it out, which AGENTS.md forbids.
- **The client address** is `IClientAddress`, read by `HttpClientAddress` (Infrastructure) from
  `HttpContext.Connection.RemoteIpAddress`: an IPv4 address (an IPv4-mapped IPv6 address counts as
  its IPv4 address), or the first 64 bits of an IPv6 address, since one IPv6 host is usually given
  a whole /64 and could otherwise use a fresh address for every account. The address is kept only
  in the limiter's memory and never logged or stored.
- **Forwarded headers.** Behind the reverse proxy the settings page already describes, the API
  sees the proxy's address. `ASPNETCORE_FORWARDEDHEADERS_ENABLED=true`, ASP.NET Core's own switch,
  makes it take the address the proxy appended to `X-Forwarded-For` (and the scheme from
  `X-Forwarded-Proto`). It trusts whichever peer sends the header, so it is for an API that only
  the proxy can reach; it is documented in `docs/operations/settings.md`. No code was needed.
- **Join's screen** shows the new mock state `join/limited` for any 429: "Too many new profiles" /
  "Too many profiles were made from this network in the last hour. Try again later." The form
  keeps what was typed.
- **Tests make a member suspended through EF Core** (the property's private setter), since no
  product code suspends anyone before slice 27.1, which adds the domain method it needs.
- **The API tests give each request its own client address** unless a test names one in the
  `X-Test-Client-Address` header: the fixture's startup filter sets `RemoteIpAddress`, so the
  joins of other test classes do not share one limit, and the limit's own tests choose theirs.

## Consequences

- Each sign-in reads the failure count once; each failed sign-in also deletes expired rows and
  writes one. A successful sign-in deletes the email's rows.
- With several API instances, each one limits account creations on its own, so the limit is
  5 per address per hour per instance; a restart forgets the counts. A shared store (the database
  or a cache) is the change to make when the API is scaled out; the deployment journey (L2-041)
  decides it.
- Without `ASPNETCORE_FORWARDEDHEADERS_ENABLED` behind a proxy, every visitor shares the proxy's
  address and only five accounts an hour can be created in all.
- A member who is paused can still sign in with another account's email; the pause is per email,
  as AC3 states, not per device or address.
- The rule for a path inside the app is shared: `isAppPath` (`domain`) serves the server-error
  screen's "Try again" and the sign-in return alike. The initial bundle of the member app grew
  by 0.09 kB (the guard's `createUrlTree`), to 258.59 kB on top of slice 20.1; the sign-in
  screen's lazy chunk carries the refusals and the reset link.
- The failure window is slice 20.1's `AttemptWindow` (5 in 15 minutes), whose edges are the same
  as the ones this slice tested: one rule for "at most N attempts in a period".
- The window and the suspension live in the member `SignInHandler`, around the credential check
  `MemberCredentials` that slice 9.1 shares with staff sign-in (ADR 0011): a refusal from it records
  a failure unless a field was blank. Staff sign-in is left as 9.1 built it; whether it should pause
  too belongs to the staff two-step journey.
