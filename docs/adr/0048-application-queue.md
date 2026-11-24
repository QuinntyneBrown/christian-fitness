# 0048. Application queue

## Status

Accepted, 24 November 2026 (slice 21.1).

## Context

L2-025 AC1 and AC4 let an Admin open Manage Services and see each pending professional
application, oldest first, or an empty state. The detailed design
(`docs/detailed-designs/admin-services/review-applications/`) left the page size, the shape of
the queue answer and the screen's host to supply. The Services area already exists in the staff
policies (Admins only, ADR 0020) and the admin app has a stand-in `/services` page. Approving,
declining (slice 21.2) and the live listings table (slice 23) are later slices.

## Decision

- **Endpoint.** `GET /api/admin/services/applications`, routed under `api/admin/services`, so the
  Services area's policy applies as it is: an Admin is answered, a Moderator is refused 403
  `forbidden_role`, a member or nobody 401. `AdminApplicationsController` sends one
  `ListPendingApplicationsQuery`.
- **Answer.** `{ total, applications }`: each application has `id`, `name` (the applicant's member
  name), `role`, `credentials` and `submittedAt`; nothing else about the application or the member
  (no email, category, where, price or about). Only `Pending` applications are listed.
- **Bound.** At most 50 applications, the oldest first (`SubmittedAt`, then `Id`). `total` counts
  every pending application, so the heading's count stays true when the list is capped; the queue
  is expected to be short, and a decision removes an application from it. Paging (L2-036) is not
  added until a queue needs it.
- **Screen.** The lazy admin Manage Services page replaces the `/services` stand-in and shows the
  page head and the Applications section as the mocks `admin-services` draw them: a card per
  application (avatar, name, "2 days ago", role, credentials), the "No applications waiting"
  note, skeleton cards while loading, and the error state with Try again. When it is open, the
  sent time reads relative to now in whole minutes, hours and days, then by date in Toronto
  (`applicationSent`, one table of cases in the domain tests). Approve and Decline, Add listing
  and the Live listings table are not drawn yet: slices 21.2, 23 and 24 add them.
- **No design-system component.** The design system has no application card, so the cards are the
  page's own markup (BEM block `application`, styled in the page's stylesheet from the mock) over
  the library's `cf-avatar`, `cf-skeleton`, `cf-empty-state` and `cf-button`.
- **Text only.** Names and credentials are interpolated as text, never as HTML.
- **Scope of state.** `ADMIN_SERVICES_SERVICE` is provided on the routed page, so the client lives
  only while the screen does; the page holds one answer of at most 50 applications.

## Consequences

- Slice 21.2 adds approve and decline to the same controller and the page, and the `ApplicationCard`
  of the design may then become a library component once a second screen needs it.
- The admin initial bundle measures 280.34 kB (279.93 kB before on the same machine, +410 bytes),
  339 bytes over the 280 kB warning and under the 290 kB error, as web already is. The new lazy
  route and its first service that uses `HttpClient` from lazy code account for it; the page, the
  service, the contract and `applicationSent` are lazy chunks. No budget was raised.
