# 0020. Staff roles by area: a policy per area, the role read on every request and an "Admins only" screen

## Status

Accepted, 22 November 2026 (slice 29.1). Amended by [ADR 0064](0064-moderator-areas.md): a Moderator also opens Newsletter, Event series, Community Pick, Listings and Feedback, and the "Admins only" words no longer name Events and Services.

## Context

L2-019 gives staff two roles: an Admin may do everything, a Moderator may moderate members but
not manage events or services (HTTP 403). Until now one `Staff` policy covered every admin
endpoint (ADR 0011): the staff cookie and a role claim of either role, written into the cookie at
sign-in. A role changed or taken away after sign-in therefore kept its old access until the
session ended; ADR 0016 left checking the role on every request to this slice. The design named
a claims transformation, `StaffOnly` and `AdminOnly` policies set on each controller, and the
code `forbidden_role` as `<TO SUPPLY>`.

When this slice started, the only admin endpoints on `main` were the staff session's. Slice 10.1
(events under `api/admin/events`) was being built beside it without naming a policy, and the
Members, Dashboard and Services endpoints come later. The admin app's areas were stand-ins that
call no endpoint of their own.

## Decision

- **An area per admin route, a policy per area.** `StaffArea` (Domain) is `Console` (the session
  and anything at `api/admin` itself), `Dashboard`, `Members`, `Events`, `Services` and
  `Unlisted`. `StaffAccess.Allows(role, area)` is the one rule: Admin everything, Moderator
  `Console`, `Dashboard` and `Members`. The staff area convention (ADR 0011) now reads the route
  segment after `api/admin` and adds the area's policy to the controller: `Staff` for `Console`
  (the old policy's name) and `Staff:{Area}` for the others. A segment no area names is
  `Unlisted`, closed to Moderators, so a new area fails closed until its slice names it. No
  controller names a policy: slice 10.1's controller, and every later one, gets its area's rule by
  where it is routed. Explicit `[Authorize(Policy = …)]` on each controller, as the design first
  had it, would be as clear but can be forgotten; the convention cannot.
- **The role is read from the database on every admin request.** Each policy carries a
  `StaffAreaRequirement(area)`; `StaffAreaAuthorizationHandler` (Infrastructure, scoped) reads the
  member id from the staff session and that member's `StaffRole` through `IAppDbContext` and asks
  `StaffAccess.Allows`. One indexed read by primary key per admin request; staff are few. A
  requirement handler was chosen over the design's claims transformation: a transformation runs on
  every authentication of every scheme, member requests included, and would need to know which
  ones to skip, while the handler runs only where a staff policy is evaluated. The role claim the
  cookie carries from sign-in is no longer read for access.
- **Two refusal codes.** A staff session whose member holds no role is refused 403 `not_staff`
  (the code sign-in and the session already used, L2-018 AC2); a role the area refuses is 403
  `forbidden_role`, the design's name, which says the account is staff but not in a role for this.
  The handler fails with the code as its `AuthorizationFailureReason`, and
  `StaffRefusalResultHandler` (an `IAuthorizationMiddlewareResultHandler`) puts it on the request
  through `ProblemCodes.Override` before the default handler forbids, so the status-code page
  writes the usual ProblemDetails with that code and nothing else. Nothing logs the role or the
  member.
- **Proved through the API with probe endpoints.** The acceptance tests sign in as each role and
  ask the real staff session (`Console`) and, for the areas with no endpoint yet, small probe
  controllers in the test assembly routed under `api/admin/dashboard`, `members`, `events`,
  `services` and an unlisted segment, added only to that fixture's host. They go through the same
  convention, policies, handler and refusal writer as real endpoints; when an area's real endpoint
  lands, its own tests can ask it as a Moderator.
- **The admin app adapts.** `canManage(role, area)` and `areasFor(role)` (`domain`) are the four
  frontend rows of the same table, held in both suites. `AdminShell` lists only the areas the
  session's role opens and shows no link until the session has loaded. `staffAuthGuard` checks
  `canManage` for the area of the URL being opened and redirects with `RedirectCommand` to
  `/admins-only`, `browserUrl` set to that URL, so the address bar keeps `/events`.
  `forbiddenInterceptor` opens `/admins-only` instead of `/forbidden` for a GET refused
  `forbidden_role`. `/admins-only` is `ForbiddenPage` with the route data `{ reason: 'role' }` and
  its own title, so the words come from the route rather than navigation state and a reload of
  the kept address asks again. The screen says "Admins only", "Events and Services are run by
  admins. As a moderator, you look after members from the Dashboard and Members.", offers "Go to
  dashboard" (a plain link, as the error screens' actions are, ADR 0006) and the note "Need to
  manage events or services? Ask a community director to make you an admin." A Moderator's
  session is valid, so it has no Sign out. The mock gained `admin-forbidden/role` and
  `admin-dashboard/moderator`.

## Consequences

- Every admin request reads one `StaffRoles` row besides the session's; a role change applies at
  the next request, and a Moderator made Admin sees the new navigation at the next full load (the
  shell reads the session once).
- A later slice routes its endpoints under the area they belong to, or names a new segment in the
  convention's table; an unnamed one is Admins only until it does.
- Granting and changing roles still has no screen (design open question 1).
- The audit of L2-019 AC3 is slice 29.2's.
