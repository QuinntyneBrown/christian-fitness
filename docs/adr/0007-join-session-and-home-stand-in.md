# 0007. Join: a session from the first request, a Home stand-in and the member app's HTTP client

## Status

Accepted, 22 November 2026 (slice 2.1).

## Context

Slice 2.1 is the first slice through every layer: a visitor fills in the Join screen, the API
creates the account and the visitor "is signed in and taken to Home" (L2-003 AC1). Four things
it needs do not exist yet:

- **A session.** Sign-in is slice 3.1, but the account must be signed in the moment it exists.
  The secure-sessions design left the SameSite mode and the member session's lifetime
  `<TO SUPPLY>`.
- **Home.** The Home screen with the next and suggested events is slice 13.1, which needs events,
  registrations and messages that later slices build.
- **The HTTP client.** No screen called the API before, so neither app provides `HttpClient`, and
  ADR 0006 left `serverErrorInterceptor` unregistered until the first screen that loads data.
- **A form library.** The create-account design said "an Angular reactive form", but the
  components library takes inputs and outputs only, and the rules with many cases live in tested
  helpers in `domain`.

## Decision

- **Join signs the new member in.** `POST /api/account/join` is anonymous; `CreateAccountHandler`
  hashes the password with ASP.NET Core Identity's PBKDF2 hasher, saves the `Member` and signs it
  in through `ISessionSignIn` (Application), which `CookieSessionSignIn` (Infrastructure)
  implements with the cookie scheme. The answer is `201 Created` with a `SessionDto`
  (`memberId`, `name`) and the cookie. The controller sends one MediatR request.
- **The cookie is `__Host-cf-session`:** `Secure`, `HttpOnly`, `SameSite=Lax`, path `/`, no
  domain (L2-030 AC2). `Lax`, not `Strict`, so a member who follows a link to the app from an
  email or a chat arrives signed in. It is persistent for 14 days and slides: a member who comes
  back within 14 days stays signed in, as on a phone they expect to. Staff sessions get their own
  idle rule in slice 9.3. The cookie carries only the member id.
- **The keys that protect the cookie** are ASP.NET Core Data Protection's. When
  `DataProtection__KeysPath` is set, they persist to that folder, so sessions survive a restart
  and every instance reads the same keys; unset, they live in memory, which suits one process in
  development and the tests (`docs/operations/settings.md`).
- **`GET /api/session` arrives now,** ahead of the rest of `SessionController` (slice 3.1): it
  answers the signed-in member's `SessionDto`, and the fallback policy answers a visitor 401. It
  is the read that proves the visitor landed signed in.
- **Home is a stand-in until slice 13.1.** The lazy route `/home`, titled "Home · Christian
  Fitness", renders one `main` with the mock's greeting heading (`display page-title--greeting`)
  reading "Welcome, {first name}" from `GET /api/session` through `SESSION_SERVICE`, and
  "Welcome" until the answer arrives or when it fails. The mock's "Good morning, Grace" needs the
  time-of-day rule, the next event, messages and professionals, which are slice 13.1's; the
  stand-in has no app shell, no guard (slice 3.1) and nothing else. Slice 13.1 replaces the page
  and keeps the route.
- **The member app provides the client,**
  `provideHttpClient(withInterceptors([serverErrorInterceptor]))` in its `app.config.ts`, as ADR
  0006 planned. The admin app does not yet: no admin screen calls the API, and the client costs
  about 21 kB of the initial bundle; slice 9.1 (staff sign-in) provides it there.
  `HttpAccountService` and `HttpSessionService` live in the member app and are bound to
  `ACCOUNT_SERVICE` and `SESSION_SERVICE` in `app.config.ts`; they hold no state.
- **The member app's initial budget rises from 225 kB to 260 kB (warning) and from 250 kB to
  275 kB (error).** The initial total went from 220.40 kB to 255.10 kB raw (57.41 kB to 66.67 kB
  to transfer). Diffing `--stats-json` inputs against `main` put the cost in framework code:
  `HttpClient` and its interceptor 21.1 kB; the first `@for` (the interest toggles) 5.4 kB; the
  `ng-template` and `ngTemplateOutlet` that AGENTS.md asks of a component rendering `<a>` or
  `<button>` 3.3 kB; and the property bindings, listeners and boolean inputs of the first form
  about 3.6 kB. Each is paid once for every later screen. The client is not lazy-loaded behind a
  route group: the landing page (slice 8.1), Home and almost every screen after them load data on
  arrival, so a lazy client would be one more request before the first screen's data, not a
  saving. The admin app keeps 225 kB; its total is 224.70 kB, the `<button>` branch included.
- **Component styles warn at 3 kB instead of 2 kB** in both apps (the error stays 4 kB).
  Emulated encapsulation adds an attribute to every selector, so the `btn` block with its sizes
  and states and the brand panel with its seal measure 2.05 kB and 2.16 kB; the brand panel is
  already its own component (`AuthBrand`), apart from the form (`AuthLayout`).
- **The Join form holds its values in signals, not `@angular/forms`.** `TextField` (a `value`
  input and a `valueChange` output) and `InterestPicker` (a `selected` input and a `toggled`
  output) are presentation components; `JoinPage` keeps one signal per field and builds the
  `JoinRequestDto` with `joinRequestOf`, and the selection with `toggleInterest`, both in `domain`.
  The client-side rules of slice 2.2 go into a pure helper in `domain` with a unit test per row,
  where the platform's validators would scatter them across the page. No form module is loaded.
- **Interests are keys:** `running`, `strength`, `basketball`, `walking-groups`, `mobility`,
  `nutrition`, `cycling` and `retreats`, with the mock's labels, listed once in `api`
  (`INTERESTS`) and once in `Domain` (`Interests.All`). Refusing an unknown key, like the other
  refusals, is slice 2.2.

## Consequences

- A visitor who joins is signed in on any device for 14 days of inactivity, until sign-out
  (slice 3.1) ends the session.
- A deployment with more than one API instance, or one that restarts, must set
  `DataProtection__KeysPath` to shared, persistent storage, or members are signed out.
- Until slice 13.1, Home is only a greeting, and until slice 3.1 a visitor who opens `/home`
  sees "Welcome" with no name instead of being sent to sign in.
- Until slice 2.2, the API stores what the form sends without validating it, and a failed join
  gives the form back as it was with no message: the refusals and the mock's error state are
  that slice's.
- The antiforgery filter and the security headers of L2-030 AC3 and AC4 arrive with sign-in in
  slice 3.1; join is anonymous and changes no signed-in member's data.
