# 0018. Design-system primitives and form controls: one folder per page, shared Sass for shared looks, and component tests as the acceptance tests

## Status

Accepted, 23 November 2026 (slice 1.4).

## Context

Only 3 of the 46 components in `docs/design-system/components/` existed in
`frontend/projects/components` (button, error-page, text-field); earlier slices built
screen-specific duplicates instead (`form-alert`, `text-link`, `tag-list`, `auth-brand` and
others). AGENTS.md now mandates that every design-system component is built once, under its
design-system name, and reused. Slice 1.4 builds the primitives and form controls: button
(complete it), link, text-field (complete it), textarea, select, checkbox, radio-group, switch,
form-field, form-layout, chip, badge, avatar, divider, spinner, progress-bar, tooltip, skip-link
and brand-lockup. Slice 1.5 builds feedback, overlays and content at the same time; slice 1.6
builds layout and navigation and migrates every screen. Slice 1.5 merged first, with
ADR 0017; where both slices met one design-system block, this slice keeps the one already
built.

No screen uses the new components yet, so a Playwright spec cannot reach them. Several pages also leave behaviour open: when a tooltip flips, how long
a spinner waits, when a textarea's counter is announced, and what a skip link does under
`<base href="/">`.

## Decision

- **One folder per design-system page, named as the page.** `components/src/<name>/` holds the
  page's main block. Other blocks the same page documents live in the same folder as their own
  components: `icon-button` and `button-row` (`btn-row`, `btn-grid`) in `button/`, `search-field`
  (`search`) in `text-field/`, `checkbox-group` in `checkbox/`, `chip-bar`, `interest`,
  `interest-list` and `tag` in `chip/`, `status`, `count-badge` (and `count-pill`) and
  `unread-dot` in `badge/`, `avatar-stack` in `avatar/`, and `seal` in `brand-lockup/`. The
  meter that the progress-bar page shows (`fill__meter`) is slice 1.5's `cf-fill` in `stat/`, the
  page that owns it; it is not built twice. Each keeps the page's block, element and
  modifier names, so e2e locators and the mocks agree.
- **The form field is the one wrapper.** `cf-form-field` renders the label (or, with `group`, a
  `fieldset` and its legend), the "(optional)" marker, the `field-row` label action, and the hint
  or error. The text field, textarea, select, checkbox group, radio group and interest list compose
  it instead of repeating that markup; `fieldDescribedBy` gives each control its
  `aria-describedby`.
- **Shared looks are Sass mixins, compiled into each encapsulated stylesheet.** The design system
  styles `.input, .select, .textarea` with one rule and the checkbox and radio option row with
  another. `form-field/_control.scss` and `checkbox/_choice.scss` hold those rules once; each
  component includes them under its own block. No global style and no `ViewEncapsulation.None`.
- **Tree shaking through the one public API.** Libraries are compiled from source (ADR 0001) and
  `@cf/components` declares `"sideEffects": false`, so an app's build keeps only the components it
  imports. Secondary entry points would add a `tsconfig` path per component and buy nothing the
  barrel does not already give. Measured: the initial totals did not move (member app 261.59 kB,
  admin app 258.98 kB, before and after every sub-slice).
- **Component tests are this slice's acceptance tests,** as ADR 0017 decided for slice 1.5: the
  library's `test` target (`@angular/build:unit-test`, Vitest, `happy-dom`) renders each component
  with TestBed, and `npm test` runs the domain and the components suites. Each behaviour (keyboard, output,
  ARIA state, focus, timers) has a test, with one case per row where a page has a table of states,
  and each was proved red by breaking its guard. Slice 1.6 proves the components through Playwright
  on the screens that adopt them. CI still runs no unit tests (AGENTS.md).
- **The button follows the page's sizes.** `size` is now `xs | sm | default | md | lg`, where `md`
  is the page's `btn--md` (the 16 px label of dialog footers) and `default` the 44 px button with
  no modifier. A busy button ignores presses: its click neither submits the form nor reaches the
  consumer. Screens keep projecting their spinner icon while busy, as they do today; slice 1.6 may
  move it into the button.
- **Behaviour the pages leave open:**
  - The tooltip hides on Escape until the pointer leaves or focus moves on (WCAG 1.4.13). It flips
    below its anchor with `placement="below"`, chosen by the screen that knows its anchor sits near
    the top edge, instead of measuring the page.
  - The spinner appears only after 300 ms (`delay`), and drops its timer when destroyed.
  - The textarea's counter sets no `maxlength`: past the limit the count becomes the field's error
    ("12 characters over") and nothing is cut. The count is announced in a polite live region
    1 second after typing pauses.
  - The skip link prevents the default and focuses its target, giving it `tabindex="-1"` when it
    has none, because `<base href="/">` would resolve `#main` against `/` and reload the page.
  - The avatar falls back to initials when its photo fails and tries a new `src` again; initials
    are the first letters of the first and last word.
  - A count badge disappears at zero, shows "99+" above 99 and still reads the real count
    ("140 unread").
- **The component-style warning budget goes from 3 kB to 3.5 kB** in both apps; the error stays
  4 kB. The button is one block with eight variants and five sizes; after moving its padding into
  component tokens (`--btn-pad-y`, `--btn-pad-x`) and folding shared rules it is 3.28 kB, and the
  page's variants cannot be split along a real seam.

## Consequences

- Screens can compose every primitive and form control from the library now; none does yet.
  The duplicates (`text-link`, `tag-list`, `auth-brand`, `form-alert` and the others) stay until
  slice 1.6 replaces them, and the error summary and form alert are the alert component of
  slice 1.5. The removable input chip (`chip--input`) is in `components.css` but on no page, so it
  waits for a screen that needs it.
- The text field now wraps its label in the form field's `field-row`; the label, hint, error and
  `.field .input` locators every page object uses are unchanged, and every behaviour spec passed.
- A button with `size="md"` would now take the 16 px label; no screen used it.
- Slice 1.5's `mini-row` draws its own unread count (`mini-row__count`); slice 1.6 moves it onto
  `cf-count-badge` with the screens, and its avatar slot takes `cf-avatar`.
