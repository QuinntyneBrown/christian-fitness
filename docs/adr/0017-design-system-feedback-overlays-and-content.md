# 0017. Design-system feedback, overlays and content: unit tests as acceptance, shells without the CDK and a deferred toast store

## Status

Accepted, 22 November 2026 (slice 1.5).

## Context

AGENTS.md mandates that every component in `docs/design-system/components/` is built once in the
components library under its design-system name and reused. Slice 1.5 builds the feedback,
overlay and content components (L2-048): alert, banner, inline message, toast, dialog, drawer,
menu, empty state, skeleton, error page, card, event card, date badge, description list, list,
stat, table, pagination, accordion, tabs and message. Slice 1.4 builds the primitives in parallel
and slice 1.6 moves the built screens onto both.

Four things did not fit the usual slice shape:

- No screen uses most of these components yet, so a Playwright spec through a page object has
  nothing to open. The components library had no test target.
- `@angular/cdk` is not installed. AGENTS.md says editing opens a CDK Dialog, and the design
  system's dialog, drawer and menu pages assume CDK overlays.
- A toast needs a store (a queue, timers that pause on hover and focus, a bound on how many show)
  and no feature raises one yet.
- Encapsulated styles do not reach projected content, yet a list's rules (dividers between rows)
  must reach each row.

## Decision

- **Unit tests are the acceptance tests of a slice with no screen.** The components library gets
  an `@angular/build:unit-test` target with Vitest, like the domain library (ADR 0001), and
  `npm test` runs both. Each component with behaviour has tests that render it through TestBed
  and assert what a person or a screen reader meets: roles, names, focus, keys, attributes and
  emitted outputs; a table of states is one case per row. There are no snapshot or structure
  tests. Playwright proves each component once a screen composes it, starting with slice 1.6.
  Spec host components keep their small inline templates, so lint allows inline templates in
  `*.spec.ts` only.
- **The dialog and drawer are presentation shells.** Each draws its scrim and panel, a heading
  with a stable `titleId`, an optional description, Close, a body and a `[slot=foot]` footer,
  and emits `closed` from Close and the scrim. The CDK Dialog that the first editing screen adds
  owns the rest: `role="dialog"`, `aria-modal`, the focus trap, Escape and focus return. The
  opener passes the shell's `titleId` and `descriptionId` as `ariaLabelledBy` and
  `ariaDescribedBy` and opens it with no CDK backdrop, since the shell draws its own. Installing
  the CDK in a slice with no opener would only add a dependency to keep current.
- **The menu implements the APG menu button itself**: a roving tab index, `nextMenuIndex` for
  ArrowUp, ArrowDown, Home and End with wrapping, Escape returning focus to the trigger, Tab and a
  tap outside closing it. It is small, fully tested, and needs no overlay positioning, since the
  design system anchors it under its trigger with CSS.
- **The toast store is deferred** to the first slice that raises a toast. `cf-toast-region`
  renders the toasts it is given (polite ones in one `status` live region, each danger toast in
  its own `alert`) and emits `paused`, `dismissed` and `action`, so the store can own timers,
  bounding and focus return behind a contract and a token, as AGENTS.md requires.
- **Navigation components emit `navigate`.** Pagination and tabs render real links (so a new tab,
  Back and sharing work) and, on a plain click with no modifier key, prevent the default and emit
  `navigate`, the pattern of the admin navigation; the screen routes. Event rows and cards are
  plain links.
- **The list renders its own `<li>`.** `cf-list` takes its items and a `TemplateRef` for each
  row, so its divider rules apply to its own elements despite encapsulation. The list card
  (`card card--list`) is `cf-list`'s `card` variant rather than a `cf-card` with a projected list.
- **Global focus is the foundations' job.** The reset's `:focus-visible` outline already applies
  to every control, so component stylesheets add only a different colour where the background
  needs one (the brand banner), which also keeps the menu's stylesheet inside its 3 kB budget.
- **The error page grows a `staff` variant** for the admin console's "Staff only" card, keeping
  the mock's `staff__card` and `admin-eyebrow` classes; the existing `page` variant and the
  screens using it are unchanged.

## Consequences

- `npm test` runs the components' 140 tests with the domain's; CI still runs lint, build and the
  behaviour specs only.
- The first screen that opens a dialog or drawer installs `@angular/cdk`, binds the shell's ids
  and checks the initial bundle, as AGENTS.md's initial-bundle rule asks.
- The first screen that raises a toast adds the toast store, its contract and its token.
- Both apps' initial totals are unchanged (web 261.59 kB, admin 258.98 kB): nothing imports the
  new components until slice 1.6.
- Components that compose another (a field hint, a going list) wait for slice 1.4's primitives
  and slice 1.6's screens.
