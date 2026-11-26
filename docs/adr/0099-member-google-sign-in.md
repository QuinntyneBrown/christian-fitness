# 0099. Members join and sign in with Google: the start answers an address, the server finishes, and "Finish your profile" makes the account

## Status

Accepted, 26 November 2026 (journey 2, issue 152). Builds on
[ADR 0062](0062-first-google-sign-in-slice.md), which settled the error codes, the external
identity's 10-minute lifetime, the picture and the account chooser. Journey 3's
[ADR 0100](0100-staff-google-sign-in.md) builds staff sign-in on the same handler.

## Context

Journey 2 builds "Continue with Google" on Sign in and "Sign up with Google" on Join (`L2-003`
AC7 to AC11, `L2-004` AC2 and AC7 to AC11, `L2-049` AC1 to AC14) with ASP.NET Core's OpenID
Connect handler, completed on the server. The design
([sign in with Google](../detailed-designs/member-access/sign-in-with-google/README.md)) left these
points open, and building it found more:

- A single-page app cannot follow a `302` from an XHR to Google: the browser must leave in a
  full-page redirect, but the start is a `POST` that carries the antiforgery header.
- `redirect_uri` must be the address Google has registered for each app, which the API cannot
  read from a request that arrives through the app's own origin.
- The refusal codes need statuses; `no_account` must name the Google account on screen; an
  unconfigured Google client needs a refusal of its own.
- The handler checks `state`, nonce, PKCE and the token, but not the attempt's age: the
  correlation cookie's expiry is the browser's to keep.
- An email that matches an account already bound to another Google subject would bind it again.
- Join has no mock for a finish in flight, a suspended account, or a Google email that already
  has a profile.

## Decision

- **The start answers the address.** `POST /api/session/google/start` (antiforgery-checked, 20
  per network per 15 minutes) takes `intent` (`sign-in` or `join`), an optional `returnUrl` and
  `selectAccount`, and answers `200 {location}` with Google's authorization address, built by the
  handler's own challenge (state, nonce, PKCE). The page leaves with `location.assign`. Only
  `selectAccount` ("Use another account") sends `prompt=select_account` (`L2-049` AC13).
- **Redirect addresses.** `redirect_uri` is `MemberApp:BaseUrl` (or `AdminApp:BaseUrl`) plus the
  callback path, so it is always a registered address. The settings are in
  `docs/operations/settings.md`.
- **Unconfigured.** With no `Google:ClientId` or `Google:ClientSecret`, the handler is registered
  with a placeholder client and the start refuses `google_unavailable` with HTTP 503. A new
  `RefusalKind.Unavailable` maps to 503, and `RefusalException.Extensions` carries ProblemDetails
  extensions such as `account`.
- **The callback.** It lands on the API, signs the identity into the `__Host-cf-google` cookie
  (`GoogleExternal` scheme, 10 minutes), keeps only the claims `sub`, `email`, `email_verified`,
  `name`, `picture` and `hd` and the scheme that made it (so one app cannot finish another's
  identity), and sends the browser back to the screen that started it with `google=returned`.
  A Google error, a failed check or an attempt older than 10 minutes (checked by the server from
  `cf.started` against `TimeProvider`) comes back as `google=failed`; a cancel comes back with no
  marker. A failed `state` or nonce loses the return address, since the properties cannot be
  trusted. The screen drops the marker from the address so a reload repeats nothing.
- **Finishing.** `POST /api/session/google` refuses, in order: `google_email_unverified` (401)
  for no identity or an unverified email, which is forgotten; `no_account` (404) with the
  `account` extension (the Google email), the identity kept; `account_suspended` (403). Otherwise
  the member is signed in and the identity forgotten. The exception handler clears response
  headers, so the cookie is deleted in `Response.OnStarting`.
- **Matching.** By the stored `GoogleSubject` first, then by email, and an email binds only an
  account that has no Google subject yet: an account bound to another Google account is not taken
  over (`no_account`).
- **Joining.** `GET /api/account/google` answers the kept identity's `email` and `name`;
  `DELETE /api/account/google` ("Change") forgets it; `POST /api/account/join/google` takes the
  name, home church, interests and `ageConfirmed` and answers 201 with the session, refusing as the
  email join does (`rate_limited`, `age_not_confirmed`, `validation_failed`, `field_too_long`,
  `email_taken`) and `google_email_unverified`. `Member.JoinWithGoogle` stores no password. Sign
  in's "Create my profile" opens `/join?google=finish`.
- **The photo.** At join the server fetches the Google picture once, only from `https`
  `*.googleusercontent.com`, at most 5 MB and 5 seconds, keeps it in `IImageStore` when its bytes
  are an image, and stores the key on `Member.PhotoKey`. A failure joins without a photo. The
  mock's copy ("we'll bring over your name and photo") promises it, so there is no keep/discard
  choice.
- **Passwords.** A password sign-in for an account with no password is verified against the
  fixed hash and refused `invalid_credentials` like a wrong password, and the message adds "If you
  joined with Google, use Continue with Google." for every email alike (`L2-004` AC2).
- **Screens.** Sign in moves to the design system's `signin` card layout (`SignInLayout`).
  `google_unavailable` and any other failure read as "didn't finish" in the member app. While a
  finish is in flight the screen stays as it is (no mock draws a busy state). Join, which has no
  mock for them, says "Your account is suspended" as Sign in does and, for a taken Google email,
  "This email already has a profile" with a Sign in link.

## Consequences

- Both apps share one handler and one external cookie; ADR 0100 adds the staff domain check.
- The external cookie is stateless: within its 10 minutes a copy of it can be replayed to the
  finish endpoints. It holds only the identity, and each finish that ends the attempt deletes it.
- `.sso-notice__other` keeps the default link colour rather than the design system's accent, a
  known difference left for the sso-notice owner.
- `account_deleting` (`L2-049` AC11) is built with deleting an account, in journey 36.
- Telemetry is guarded by the redaction processor and by tests that look for the code, tokens,
  `state`, nonce, email, name, subject and cookie in every span and log.
