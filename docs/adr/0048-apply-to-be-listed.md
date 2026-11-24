# 0000. Apply to be listed

## Status

Accepted, 24 November 2026 (slice 22.1).

## Context

L2-026 lets a signed-in member apply to be listed on Services with a role, category, credentials,
where, price and about, and refuses a second application while one is pending. The detailed design
(`docs/detailed-designs/admin-services/take-in-applications/`) left the host screen, the entry
point, the field limits, the refusal status and two eligibility rules to supply, and the Services
screen is not built yet (its listing is slice 16.1).

## Decision

- **Entry point.** An "Apply to be listed" button on the member Services page opens the Apply to be
  listed dialog (mock `docs/mocks/dialogs/apply-to-be-listed/`), a CDK Dialog around the library's
  `cf-dialog`, `cf-text-field`, `cf-select`, `cf-textarea` and `cf-alert`. No new library component
  is needed.
- **Minimal Services page.** Slice 22.1 adds the routed, lazy-loaded `/services` page with only the
  heading, the subtitle and the button; the professionals' list, the category chips and the detail
  panel are slice 16.1. The Services destination is not added to the top bar or the tab bar here,
  because the navigation lists only the places that can be browsed so far; slice 16.1 adds it. Until
  then the page is reached at `/services`.
- **Contract.** `POST /api/professional-applications` with `role`, `category`, `credentials`,
  `where`, `price` and `about`; 201 answers the application (`id`, the values, `status` `pending`,
  `submittedAt`). `PROFESSIONAL_APPLICATIONS_SERVICE` is bound on the Services page, so the client
  lives only while the screen does.
- **Fields.** All six are required. `category` is one of Training, Nutrition, Physio, Coaching,
  Counselling (read ignoring case). Lengths count the trimmed text: role 80, credentials 200, where
  80, price 60, about 300. Price is free text ("$70 / session"), not a number, as the mocks show
  sliding scales and first-consult prices. A blank field or an unknown category is a 400
  `validation_failed`; a field over its length is a 400 `field_too_long`; both name each field in
  `errors`, as the join and profile validators do. The web app's `validateApplication` and the API's
  `SubmitApplicationValidator` carry the same table of sentences.
- **Eligibility.** Only a Pending application blocks a new one: a member whose application was
  declined (or approved) may apply again. A second Pending application is refused 409
  `application_pending`. A suspended member is refused 403 `member_suspended`. Staff decide
  applications in slice 21; until then no code path leaves Pending.
- **What the dialog shows.** `application_pending` shows the mock's `refused` message ("You already
  have an application"). Every other refusal (suspended, a field the API refuses that the client
  accepted, a server error) and no answer show the mock's `failed` message ("Your application didn't
  send"), never the server's words. Every value is kept in both.
- **Credentials as text.** Credentials, like every field, are stored and rendered as text only.
- **Storage.** A `ProfessionalApplications` table (`ProfessionalApplication` entity, created through
  `ProfessionalApplication.Submit` with `SubmittedAt` from the injected `TimeProvider`), indexed by
  member and status. The command is a class so a logged request cannot print its values.

## Consequences

- The Services page has no navigation entry until slice 16.1, so the dialog is reachable by address
  only in the meantime. The Playwright specs open `/services` directly.
- Slice 21 adds the decision methods on `ProfessionalApplication`; the declined and approved
  re-apply rule is tested by setting the status in the store, as the suspended member is in other
  slices.
- Initial web bundle: the route and the shared chat loader net +90 bytes (280.21 kB before, 280.30
  kB after on the same machine); the page, the dialog, the service and the rules are lazy chunks.
