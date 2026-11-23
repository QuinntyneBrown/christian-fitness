# 0009. Sign in and sign out: a session endpoint, antiforgery tokens, security headers and a member shell

## Status

Accepted, 22 November 2026 (slice 3.1).

## Context

Slice 3.1 lets a member sign in with email and password and sign out (L2-004 AC1, AC2, AC5).
Slice 2.1 already issues the session cookie when a visitor joins (ADR 0007), and deferred three
things to this slice: the antiforgery protection and the security headers of L2-030 AC3 and AC4,
and the guard that sends a visitor who opens a member route to sign in. Slice 2.2's "Sign in
instead?" link points at `/sign-in`, which the not-found screen answered until now.

The lockout after five failures, the suspended refusal and the return to the route first asked
for (L2-004 AC3, AC4, AC6's second half) are slice 3.2's.

The mocks drew the sign-in screen's default, submitting, invalid and error (locked) states. Their
`invalid` state marked the password field invalid with "That email and password don't match",
which both contradicts the requirement's words ("Email or password is incorrect") and tells the
visitor that the email is registered. No mock drew a server failure on sign-in, and the prototype
had no way to sign out of the member app (mocks README, open question 1). The secure-sessions
design left the readable antiforgery cookie's name and the static host `<TO SUPPLY>`.

## Decision

- **`POST /api/session` signs in; `DELETE /api/session` signs out.** `SessionController` sends one
  MediatR request per method. `POST` is anonymous: `SignInHandler` looks the member up by the
  email's lookup key (trimmed, lower case) and verifies the password with the PBKDF2 hasher. An
  unknown email is verified against a fixed hash, so it costs the same time as a wrong password
  and the answer's timing does not say which was wrong. Either failure throws `RefusalException`
  with code `invalid_credentials` and the new kind `Unauthenticated`, answered 401. Success signs
  the member in through `ISessionSignIn` and answers 200 with the `SessionDto` (`memberId`,
  `name`). `DELETE` requires the session: `SignOutHandler` calls `ISessionSignIn.SignOutAsync`,
  which ends the session on the server and expires the cookie, and the answer is 204.
- **Sessions live on the server** (L2-004 AC5: "ends the session on the server"). The cookie
  carries only a random key: `DatabaseTicketStore`, the cookie handler's `ITicketStore`, keeps
  each authentication ticket in a new `Sessions` table (migration `AddSessions`, cascade-deleted
  with its member). Sign-out deletes the row, so a copy of the old cookie replayed afterwards is
  refused 401; the member's sessions on other devices stay open. A row past its expiry is deleted
  when it is next read, and a member's expired rows when they next sign in.
- **No validator on sign-in.** A blank email or password is simply wrong credentials: the answer
  is the same 401, so the form shows the one generic message. No maximum length is applied, since
  Join applies none and a member must be able to sign in with the password they chose. A sign-in
  body that cannot be read is refused 400 as every other body is.
- **The screen says one generic thing for wrong credentials** (L2-004 AC2): the `form-alert`
  "Email or password is incorrect" / "Check both and try again.", which takes focus. No field is
  marked invalid, since marking the password would say the email is right. The `invalid` mock
  was changed to match. Any other refusal, a 5xx or no answer shows the new mock state `failed`,
  "We couldn't sign you in" / "Something went wrong on our side. Try again in a moment." What was
  typed stays; the password is not cleared, as on Join. `signInRefusalOf` in `domain` makes the
  choice from the `ApiError`; slice 3.2 adds `too_many_attempts` and `account_suspended` to it.
- **"Forgot your password?" is left out until journey 20** builds the screen it opens; a link to
  the not-found screen would be a dead end. The mock keeps it.
- **Antiforgery (L2-030 AC3).** ASP.NET Core antiforgery is registered with an HttpOnly,
  `Secure`, `SameSite=Strict` cookie `__Host-cf-antiforgery` and the header `X-XSRF-TOKEN`.
  A global filter, `AntiforgeryValidationFilter`, refuses every `POST`, `PUT`, `PATCH` and
  `DELETE` to a controller without a valid token, anonymous ones (join, sign-in) included, which
  also stops a forged sign-in into an attacker's account. A refusal is 400 ProblemDetails with
  code `antiforgery_failed`. The filter is our own because `AutoValidateAntiforgeryTokenAttribute`
  needs the MVC view services, which an API registered with `AddControllers` does not have. Both
  cookies are marked `Secure` whatever the scheme the API sees, as the `__Host-` prefix requires;
  behind a proxy that ends TLS the API sees plain HTTP, where `SecurePolicy = Always` would
  refuse to issue a token.
- **The readable token is the cookie `__Host-cf-xsrf`** (`Secure`, not HttpOnly,
  `SameSite=Strict`, path `/`). `UseAntiforgeryTokens` issues a fresh one on every `/api/`
  response for whoever the request ends as: `CookieSessionSignIn` sets the request's user when it
  signs a member in or out, so the response to join, sign-in and sign-out already carries a token
  for the new identity. `GET /api/antiforgery` (anonymous, 204) gives a visitor their first one.
- **Angular sends the token.** The member app configures
  `withXsrfConfiguration({ cookieName: '__Host-cf-xsrf', headerName: 'X-XSRF-TOKEN' })`, and
  `antiforgeryInterceptor` (`domain`) fetches `GET /api/antiforgery` first when an unsafe request
  to the API finds no token cookie to read, then sends the request with the header. No component
  handles the token. The admin app gets the same when it gets its client (slice 9.1).
- **Security headers (L2-030 AC4).** `UseSecurityHeaders` adds to every API response
  `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none';
form-action 'none'` (an API serves no script at all), `X-Content-Type-Options: nosniff` and
  `Referrer-Policy: strict-origin-when-cross-origin`, as the response starts, so refusals and
  errors carry them too. `UseHsts` adds
  `Strict-Transport-Security: max-age=31536000; includeSubDomains` outside the Development
  environment.
- **The static host sends the apps' headers.** The built apps are static files, so the host that
  serves them sets the headers, listed in `docs/operations/settings.md` ("Static host"): the same
  `nosniff`, `Referrer-Policy` and HSTS, and a CSP whose `script-src 'self'` has no
  `unsafe-inline`. The production build turns off Angular's inline critical CSS
  (`optimization.styles.inlineCritical: false`), whose inline `<script>` that swaps the
  stylesheet in such a policy blocks.
  Which platform hosts the files is the deployment journey's choice (L2-041); any host that can
  set response headers will do.
- **`memberAuthGuard` (`domain`) protects the member routes** (the first half of L2-004 AC6): it
  asks `SESSION_SERVICE.current()`; a session lets the route open, a 401 sends the visitor to
  `/sign-in`, and anything else keeps them where they are (a 5xx already opens the server-error
  screen through `serverErrorInterceptor`; being offline is slice 30.2's). The return to the
  route asked for is slice 3.2's.
- **`MemberShell` parents the member routes** with the guard, and renders `AppHeader`
  (`components`): the mock's `app-header` with the lockup, linking to Home, and a ghost **Sign
  out** button at its end (L2-008 AC4, new), 44 px tall, at every viewport. The mocks gained the
  button beside the profile avatar in every member screen. Until the screens they open exist, the
  shell leaves out the destinations, the profile avatar and the bottom bar, as Home left them
  out in slice 2.1: links that open the not-found screen help no one. Each journey that builds a
  destination adds it.
- **Sign out goes to the landing page** (`/`) once the API answers 204, or 401 (the session had
  already ended, so the member is signed out either way). Any other failure leaves the member
  where they are with the button enabled to try again; no mock draws a message for it, so a
  toast for it waits for the member toast (no slice yet).
- **`serverErrorInterceptor` records the URL being opened.** When the guard's request fails with a
  5xx, the first navigation has not finished, so "Try again" must load where the visitor was
  going (the navigation in flight), not the router's previous URL.
- **The e2e fixture answers two requests by default:** `GET /api/antiforgery` sets the token
  cookie and `GET /api/session` answers a signed-in member, so every spec that opens a member
  route passes the guard; a spec about visitors overrides the session with a 401.
- **Home asks for the session itself,** as in slice 2.1, so arriving on Home makes two
  `GET /api/session` requests (guard and page) until slice 13.1 replaces the page with one that
  loads its own summary.

## Consequences

- Every state-changing endpoint, now and later, needs the token; a test or a client that skips
  `GET /api/antiforgery` is refused 400 `antiforgery_failed`. The API tests send it through a
  handler that does what the browser does.
- A member who signs out in one tab is signed out in all tabs of that browser; other devices stay
  signed in until they sign out or their session expires.
- Every request with a session reads its row from the database; the cookie handler renews the
  row with the sliding expiry.
- The initial bundle of the member app grew from 256.21 kB to 258.23 kB (budget warning 260 kB):
  the antiforgery interceptor, the guard, the session service's new methods and the parent route.
  The sign-in screen (2.85 kB) and the shell (3.73 kB) load lazily.
- Until slice 3.2, there is no limit on failed sign-ins and a suspended member can sign in.
