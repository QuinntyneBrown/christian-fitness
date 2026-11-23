# 0015. Create a draft event: Toronto start times, field codes, a lazy CDK drawer and stand-ins until 10.2 and 11.1

## Status

Accepted, 23 November 2026 (slice 10.1).

## Context

Slice 10.1 lets staff list events and create a draft in the event editor (L2-022 AC1, AC2, AC5,
AC6). It is the first admin screen with data and the first CDK Dialog in either app. The design
left the field codes and the image store `<TO SUPPLY>`, and its "Gaps against the mock" listed
four disagreements between L2-022 and the event editor mock: the mock had Location but no area, no
image, "Description" for the summary, and a "Create a group chat" checkbox L2-022 does not
mention. Slices 29.1 (roles) and 29.2 (audit) are not built yet, and slice 9.3 (idle expiry and
the forbidden screen) is being built at the same time. Editing (10.2) and publishing (11.1) come
next.

## Decision

- **Endpoints under `api/admin/events`,** so the `Staff` policy convention of ADR 0011 covers them;
  each action sends one MediatR request. `GET /api/admin/events?status=all|published|draft`
  answers `{ counts: { all, published, draft }, events: [...] }`, soonest first, at most 100
  events (`ListAdminEventsQuery`). `POST /api/admin/events` creates a draft and answers 201 with the
  event (`CreateEventCommand`). They are plain staff requests: who may create events (Admins
  only, L2-019) and the audit entry are slices 29.1 and 29.2, which apply to these commands
  without changing them.
- **The fields and their codes (L2-022 AC2).** Title (up to 120 characters), category (one of
  the six), date and start time, place (up to 200), area (up to 100), price in whole cents
  (0 to 1,000,000, so $0 to $10,000; blank in the editor is free), capacity (1 to 10,000) and
  summary (up to 1,000). A refused body answers 400 with code `validation_failed`, the usual
  `errors` sentences, and a new `fieldCodes` extension naming each failed field's code:
  `title_required`, `title_too_long`, `category_required`, `date_required`,
  `start_time_required`, `start_in_past`, `place_required`, `place_too_long`, `area_required`,
  `area_too_long`, `price_invalid`, `capacity_required`, `capacity_out_of_range`,
  `summary_required`, `summary_too_long`. Only failures whose code is one of these appear in
  `fieldCodes`, so the Join refusals keep their shape. The editor's invalid state, which maps
  them to fields, is slice 10.2's.
- **Start times are Toronto times.** The editor sends the date and time it shows
  (`2026-05-22`, `16:00`); the API reads them in `America/Toronto` (`EventSchedule`), stores the
  instant in UTC and refuses one that is not after now (`TimeProvider`) with `start_in_past`. A
  time inside the spring-forward gap takes the standard offset. The list formats each instant
  back in `America/Toronto` (`eventWhen`, `domain`), so staff anywhere see the community's time.
- **Area is free text,** the line under the place on the event detail mock ("Waterfront,
  Toronto"); the editor mock gained an Area field with that hint, Location became Place and
  Description became Summary, as L2-022 names them.
- **No group chat checkbox.** L2-011 and L2-012 give every event a group chat that members join
  by registering; the checkbox and the empty state's "with a group chat if you want one" left the
  mock.
- **The image comes with slice 10.2.** Uploading, checking (AC4) and storing an image is a
  feature of its own; a draft is saved without one until 10.2 adds the field, its upload and
  `image_required`, and 11.1 refuses to publish an event without an image. The `image_required`
  code and the image store's choice stay with 10.2.
- **Stand-ins until 10.2 and 11.1.** The editor's footer shows Save draft only; Publish arrives with
  11.1, and the table's Edit column with 10.2. Both stay in the mocks, which draw the finished
  screen. Until 10.2 designs the invalid and failed states, a refused or failed save shows the
  existing `form-alert` at the top of the drawer, "Couldn't save the draft" / "Check every field
  and try again. Your changes are still here.", and makes the fields editable again; nothing is
  marked per field yet.
- **The editor is a CDK Dialog drawer, loaded on first use.** `@angular/cdk` joins the
  dependencies. On the first New event the events page imports the editor's file, which holds
  `EventEditorDialog` and `openEventEditor`; that file alone imports CDK Dialog and Overlay, so
  neither the dialog, its fields nor the CDK is in the page's chunk. The page passes its own
  injector, which binds `ADMIN_EVENTS_SERVICE` and `TOASTS_SERVICE` on the routed component. The
  dialog is `aria-modal`, named by the drawer's heading, starts focus on Title and gives it back to
  what opened it; Escape and the scrim close it, except while a save is on its way. It closes by
  its ref with the created event; the page then shows the Draft saved toast and loads the list
  again. The drawer's look is the design system's `drawer` block (`Drawer`, `components`), placed
  by a global position strategy at the right edge, full height, up to `--layout-dialog-max`
  (32 rem) and full width on phones. Its scrim is the `cf-scrim` backdrop class in the global
  utilities, since the overlay renders it outside any component. The CDK loads its own structural
  overlay styles when the first overlay opens, so `styles.scss` imports nothing.
- **The admin initial budget rises to 280 kB (warning) and 290 kB (error).** The dialog's chunk
  is lazy, but the parts of `@angular/core` that CDK Dialog uses to create a component in a portal
  (about 14 kB) and rxjs's async scheduler (about 2 kB) are bundled with the rest of
  `@angular/core` and rxjs in `main`, which a lazy chunk cannot split. The events page adds
  2.4 kB of core. The admin initial total goes from 257.70 kB to 274.73 kB, within 0.27 kB of the
  old error budget; every later dialog reuses what is now paid for.
- **Toasts are a screen's service.** `TOASTS_SERVICE` (`ToastsApi`, `api`) is bound to
  `ToastStore` (`domain`) on the events page: a toast leaves after 6 seconds, Dismiss removes it at
  once, at most three show, and the store's timers end with the page. `ToastRegion`
  (`components`) draws the region, always present so its polite status is announced.
- **Two stand-ins in the list's states.** The error state leaves out the mock's reference line
  ("Reference CF-A2E4"): a failed `GET` that got no answer has no trace id to show. The Draft tab
  with no drafts, which no mock draws, reuses the `tab-empty` layout with "No drafts" / "Save an
  event as a draft and it waits here until you publish it."
- **New mock states:** `event-editor/saving` (Save draft busy, Publish disabled),
  `admin-events/tab-empty` (a tab with no events) and `admin-toast/draft-saved` (the toast after
  a draft is saved, leaving after about 6 seconds, as the design system's toast timing says).
- **The events list's error state is for a request that got no answer or a 4xx;** a 5xx to the
  `GET` opens the server-error screen through `serverErrorInterceptor`, as for every GET
  (L2-043 AC4). Try again loads the list again in place. The shared e2e fixture gains a handler
  reply that aborts a request, and stops counting the browser's log of it as a page error.

## Consequences

- Slice 10.2 adds `GET` and `PUT /api/admin/events/{id}`, the Edit column, the invalid and failed
  states (mapping `fieldCodes`), and the image; slice 11.1 adds Publish.
- Slices 29.1 and 29.2 restrict `CreateEventCommand` to Admins and audit it; nothing here needs
  to change for that.
- The list holds at most 100 events; paging waits until the community has more.
- `@angular/cdk` is the first dialog library in the workspace; later dialogs reuse it.
