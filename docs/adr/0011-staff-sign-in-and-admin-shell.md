# 0011. Staff sign-in and the admin shell: a staff cookie scheme, a shared credential check and a navigation band

## Status

Accepted, 22 November 2026 (slice 9.1).

## Context

Slice 9.1 lets staff sign in to the admin app and land in its layout, and refuses members
(L2-018 AC1 to AC4, L2-021). Slice 3.1 built the member session: the `__Host-cf-session` cookie,
sessions kept on the server by `DatabaseTicketStore`, antiforgery tokens and security headers
(ADR 0009). The admin app had no HTTP client: ADR 0006 and 0007 left `serverErrorInterceptor` and
the client to this slice. The Dashboard is slice 28.1's, the second step slice 9.2's, the idle
expiry slice 9.3's and the lockout of L2-004 AC3, which L2-018 AC3 also asks for, slice 3.2's,
which is being built at the same time.

The admin-sign-in design left two things `<TO SUPPLY>`: the two-step flow (slice 9.2) and the
locked message's copy (slice 3.2). The mocks drew the sign-in `invalid` state as an inline error
on the password with the attempts left, which names the field that was wrong, against L2-018
AC3; no mock drew a member refused with `not_staff` or a server failure. L2-021 AC2 asked for a
menu button below LG, while the design system and every admin mock draw the sidebar below
1024 px as a band whose links scroll sideways, with no disclosure, and hid Sign out there.

## Decision

- **A second cookie scheme, `Staff`, for the admin session.** Its cookie is `__Host-cf-admin`:
  `Secure`, `HttpOnly`, `SameSite=Strict` (staff never arrive from a link in an email), path `/`,
  and not persistent, so it ends with the browser. It shares everything else with the member
  scheme: the same `DatabaseTicketStore` and `Sessions` table, the same Data Protection keys, the
  same refusal with a status instead of a redirect. A member's session and a staff session never
  replace each other, even on one host (the dev servers share `localhost`), and slice 9.3 can give
  the staff session its own idle rule. The ticket holds the member id and a role claim (`Admin` or
  `Moderator`) and nothing personal. Until slice 9.3, a staff session lasts until the browser
  closes or staff sign out, with the cookie handler's default server-side lifetime. Whatever names
  no scheme reads the member session, except `GET /api/antiforgery` with only the staff cookie,
  which reads the staff session, so the admin app's token belongs to its staff member; an admin
  endpoint's policy makes the request's user the staff member, so its answer carries a staff
  token too.
- **`/api/admin/session`.** `StaffSessionController` sends one MediatR request per method:
  `POST` (anonymous) signs in, `GET` answers who is signed in, `DELETE` signs out (204). The answer
  is `StaffSessionDto` (`memberId`, `name`, `role`). Sign-out ends the session on the server, as
  the member's does; L2-018 gains AC6 for it, since the shell offers Sign out.
- **The `Staff` policy on every admin endpoint (L2-018 AC4).** The policy authenticates only the
  `Staff` scheme and requires a role claim. A convention adds it to every controller routed under
  `api/admin`, so a later admin endpoint cannot forget it; only `[AllowAnonymous]` (the sign-in)
  opts out. A request with no staff cookie, or with only a member's, is refused 401 with a
  ProblemDetails and nothing else.
- **One credential check for both sign-ins.** `MemberCredentials` (Application) holds what
  `SignInHandler` did: the email's lookup key, the PBKDF2 check, the fixed hash for an unknown
  email so the timing says nothing, and the one refusal `invalid_credentials` (401). The member
  and staff handlers both call it, so the lockout slice 3.2 adds there covers both
  (L2-018 AC3). `StaffSignInHandler` then reads the member's `StaffRole`: none refuses with
  `not_staff`, a new `RefusalKind.Forbidden` answered 403 (L2-018 AC2), and no cookie is set.
- **The Staff sign in screen** (`/sign-in` in the admin app) uses the mock's `staff` card through
  `StaffLayout` (`components`), with `TextField`, `FormAlert` and `Button`. A refusal shows one
  `form-alert`, which takes focus, chosen by `staffSignInRefusalOf` (`domain`):
  `invalid-credentials` "Email or password is incorrect" / "Check both and try again." with no
  field marked (L2-018 AC3; the `invalid` mock was corrected to match), `not-staff` "This account
  isn't on the team" with who can give access (new mock state `not-staff`), and `failed` for
  anything else (new mock state `failed`). What was typed stays. The mock's "Two-step verification
  required" note is left out until slice 9.2 makes it true; its locked state is slice 3.2's.
- **The admin app gets its client:** `provideHttpClient` with the same XSRF configuration and the
  same `serverErrorInterceptor` and `antiforgeryInterceptor` as the member app, so a 5xx to a GET
  opens the admin server-error screen and every write carries the token.
- **`staffAuthGuard` (`domain`) protects the shell,** as `memberAuthGuard` does the member routes:
  a staff session opens it, a 401 sends the visitor to `/sign-in`, anything else keeps them where
  they are. It is its own guard on `STAFF_SESSION_SERVICE`, not a shared factory, because slice
  3.2 is changing `memberAuthGuard` to return to the route asked for.
- **`AdminShell` parents every staff route** and renders `AdminLayout` (`components`, block
  `admin`, with `AdminNav`, block `admin-nav`, and `AdminUser`, the `admin__user` element): the
  brand, the four links Dashboard, Events, Services and Members with `aria-current="page"` on the
  current one (`currentAdminArea`, `domain`), and the signed-in staff member's initials
  (`initialsOf`), name and role with a Sign out button. The shell reads the session once for
  them, so opening the admin app asks `GET /api/admin/session` twice (guard and shell), as Home
  does in the member app. `AdminUser` is its own component because the layout's stylesheet passed
  the 3 kB warning; the user block is a real seam. The links are real `href`s; a plain click is
  handed to the router by the shell, so the page does not reload, while a modified click opens a
  new tab as a link should. The counts beside Services and Members come with the dashboard
  summary (slice 28.1 and the queues' slices).
- **Stand-ins until their slices.** The Dashboard (`/`, slice 28.1), Events (`/events`, 10.1),
  Services (`/services`, 21.1) and Members (`/members`, 26.1) each open one lazy `AreaPage`
  with the area's heading and nothing else, so every link of L2-021 AC1 leads somewhere and
  `aria-current` can be seen to move. Each slice replaces its page and keeps its route.
- **Below LG, a band, not a menu (L2-021 AC2 corrected).** The design system's sidebar page and
  every admin mock draw a band: the brand row, then the four links in one row that scrolls
  sideways within itself. Four flat links behind a menu button would hide them for no gain and
  need an overlay library the app does not load. L2-021 AC2 now says so. The band hid Sign out,
  with "Sign out moves to the dashboard", which leaves every other screen without it; Sign out now
  stays at the end of the brand row (the name and role hide), and the icon button is 44 × 44 px
  everywhere. The design system's stylesheet and sidebar page were changed to match. The design
  system's LG is 1024 px (`64rem`) while L2's viewport table says 992 px; the components follow the
  design system, as earlier slices did, and the specs check 375 and 1440 px.
- **The admin initial budget rises** to 260 kB (warning) and 275 kB (error), as the member app's
  did for the same client (ADR 0007). The initial total went from 224.70 kB to 257.44 kB raw
  (58.40 kB to 67.39 kB to transfer). Diffing `--stats-json` inputs of `main` against the base
  put 24.2 kB in `@angular/common` (`HttpClient`, its XSRF support and interceptors), 11.5 kB in
  `@angular/core` (the template, signal and input features the sign-in screen and the shell are
  the first admin screens to use, paid once), 2.2 kB in `domain` (the guard, the interceptors, the
  areas) and 0.9 kB in the router (the parent route and its guard). The sign-in screen (12.95 kB) and the shell (12.86 kB) load lazily.

## Consequences

- Every later admin endpoint lives under `api/admin` and gets the `Staff` policy without asking.
- Removing a staff role takes effect at the staff member's next sign-in: the role is read when
  the session starts. `GET /api/admin/session` reads it again and refuses `not_staff` once it is
  gone. Role-by-role permissions are slice 29.1's.
- Until slice 9.2, a staff session needs only the password; until 9.3, it does not expire when
  idle; until 3.2, failed sign-ins are not limited for staff or members.
- The admin app's initial bundle carries `HttpClient`, the interceptors and the guard.
