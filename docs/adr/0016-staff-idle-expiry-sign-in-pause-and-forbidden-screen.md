# 0016. Staff idle expiry, the staff sign-in pause and the forbidden screen

## Status

Accepted, 22 November 2026 (slice 9.3).

## Context

Slice 9.3 ends an idle staff session (L2-018 AC5) and shows the "Staff only" screen when the API
refuses staff something (journey 9, "forbidden actions show the forbidden screen"). It also takes
over what slice 3.2 left: the lockout of L2-004 AC3, which L2-018 AC3 applies to staff, lives in
the member `SignInHandler`, around the shared `MemberCredentials` check, so staff sign-in was never
paused (ADR 0011 had expected it inside `MemberCredentials`).

Until now the staff cookie (`__Host-cf-admin`, ADR 0011) had the cookie handler's default
server-side lifetime of 14 days and no sliding rule. The cookie handler's own sliding expiration
renews a ticket only when more than half of its lifetime has gone, so with a 30-minute lifetime a
request at minute 10 would not move the expiry and the session would end 20 minutes later, idle
for only 20. The admin app sent no request when staff moved between areas: `staffAuthGuard` ran
once, on the shell's first activation.

The `admin-forbidden` mock drew a member who opened the admin console, "You're signed in as
grace.thompson@gmail.com", and a "Back to the app" link. Neither fits: a member is refused at
sign-in with `not_staff` (slice 9.1) and never holds a staff session, a 403 carries no email
(L2-030 AC1), and the admin app does not know the member app's address. The one 403 a staff
session can meet today is `GET /api/admin/session` after the staff role was taken away (ADR
0011); slice 29.1 adds the Moderator's. The sign-in mock's locked state said "This account is
locked … wait 30 minutes", disabled Sign in and offered an unlock by another admin, none of which
is the 15-minute sliding pause of L2-004 AC3. No mock drew an expired session.

## Decision

- **A staff session ends after 30 minutes without a request (L2-018 AC5).** The `Staff` scheme
  sets `ExpireTimeSpan` to 30 minutes with `SlidingExpiration`, and its
  `OnCheckSlidingExpiration` event renews on every authenticated request instead of after half
  the lifetime. The renewal writes the new expiry to the session's row (`DatabaseTicketStore`)
  and sends the cookie again, so every admin request costs one row update; staff are few, and the
  rule is then exactly "30 minutes after the last request". The cookie stays a browser-session
  cookie. The cookie handler and the ticket store read the same `TimeProvider`, so the API tests
  move a `FakeTimeProvider` past 30 minutes and never sleep. An expired session's row is deleted
  when it is next read, so the session ends on the server.
- **`session_expired` (401) when the staff cookie names an expired session.** The ticket store
  implements `ITicketStore`'s `RetrieveAsync` with the `HttpContext`, and when the row it finds has
  expired it deletes it and marks the request (`DatabaseTicketStore.FoundExpired`). The staff
  scheme's challenge then answers 401 with the ProblemDetails code `session_expired` instead of
  `unauthenticated` and expires the cookie. A request with no staff cookie, a copy of a cookie
  that was signed out (its row is gone) or a key no session has still gets `unauthenticated`:
  only a session known to have run out says so, and a first visit is not told its session
  expired. `ProblemCodes.Override` puts a code on the request for the status-code page to write.
- **The admin app checks the session on every screen change.** `staffAuthGuard` moves from
  `canActivate` to `canActivateChild` on the shell, so it runs on the first visit and on every
  move between areas, which makes moving around a request that keeps the session open or finds it
  expired. The first visit still asks once (the guard) plus once (the shell, for the name).
- **`sessionExpiredInterceptor` (`domain`)** returns staff to Staff sign in when any `/api/admin/`
  request is refused 401 `session_expired`, with the router navigation state
  `{ session: 'expired' }`, once (not while Staff sign in already shows). The guard leaves that
  401 to it and sends any other 401 to `/sign-in` as before. Staff sign in reads the state once, as
  it reads the code screen's endings (ADR 0013), from an imperative navigation that follows an
  earlier one, and shows the `form-alert` "Your session expired" / "You were signed out after 30
  minutes without activity. Sign in again to carry on." (new mock state `session-expired`). A
  reload of an admin URL after the session expired shows Staff sign in without the notice: no
  navigation has succeeded yet, and the reason cannot be told apart from a state restored by the
  browser.
- **The "Staff only" screen for a 403 to a read (L2-047).** `forbiddenInterceptor` (`domain`)
  opens `/forbidden` when a GET to `/api/` answers 403, with the router's `browserUrl` set to the
  URL staff asked for: where the navigation in flight was going (the guard's request is the one
  refused when staff move to another area) or else the current URL. `skipLocationChange`, which
  the server-error screen uses, would leave the address bar on the area staff were leaving; a write's 403 stays with the screen that sent it, so
  Staff sign in keeps showing `not_staff` and `two_step_not_set_up` itself. The guard already
  leaves a 403 where it is. The screen is `ForbiddenPage`, lazy, in the `StaffLayout` card: the
  heading "Staff only", which takes focus (`StaffLayout`'s new `focusHeading` input), "The admin
  console is for the Christian Fitness team, and this account doesn't have staff access right
  now.", a Sign out button and the note "On the team? Ask a community director to give you staff
  access." Sign out ends the staff session (a role taken away leaves the session itself valid) and
  opens Staff sign in; "Signing out…" while it waits, enabled again if it fails. The mock was
  corrected to this and gained the state `submitting`. Slice 29.1 adds its own words for a
  Moderator on an Admin screen.
- **One sign-in pause for both apps (L2-018 AC3, L2-004 AC3).** The failure window moves from
  `SignInHandler` into `MemberCredentials`, which both sign-ins call: 5 failures for one email in
  15 minutes refuse the next attempt with `too_many_attempts` (429) before the password is
  checked, a refused attempt and a blank field are not recorded, and the count is the same
  `SignInFailures` table, so failures in either app count for both. Each handler forgets the
  email's failures only on its own success: the member sign-in after the suspension check, the
  staff sign-in when it starts the pending sign-in. Staff sign in shows "Sign-in paused for 15
  minutes" / "Too many attempts, so we paused sign-in to keep the account safe. Wait 15 minutes,
  then try again." and keeps Sign in enabled and what was typed (mock state `error`, corrected).
  Wrong second-step codes keep their own window (ADR 0013).

## Consequences

- An admin request answers with a fresh `Set-Cookie` and updates one `Sessions` row; the member
  session keeps its 14-day sliding rule and is untouched.
- Every move between admin areas sends `GET /api/admin/session`. Later admin screens that load
  data meet an expired session through the interceptor, whichever request finds it.
- A staff member whose role was taken away meets "Staff only" on their next screen and can only
  sign out. The `Staff` policy still trusts the role claim of a session until it ends; checking
  the role on every request is slice 29.1's.
- The admin app's initial bundle carries two more small interceptors.
