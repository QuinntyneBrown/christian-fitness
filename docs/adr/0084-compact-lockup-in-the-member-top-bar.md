# 0084. A compact lockup keeps the member top bar within a small phone

## Status

Accepted, 25 November 2026 (bug fix after journey 14). Amends the brand lockup and top bar pages of
the design system; builds on ADR 0068 and ADR 0083, which put the bell in the bar.

## Context

Journey 14 added the bell (44 × 44 px) to the member top bar beside the profile button and the
ghost "Sign out". Below 768 px the bar holds the lockup and those three controls. Measured in the
app at 360 px: lockup 182 px (seal 34, gap 10, wordmark 138), the bar's 24 px gap, and the end
group 190 px (bell 44, profile button 36, Sign out 86, two 12 px gaps), plus 16 px side padding:
428 px. Every signed-in member page scrolled sideways by 52 px at 360 px, and by more at 320 px,
the width WCAG 1.4.10 (Reflow) asks a page to fit. The mocks overflowed the same way.

The constraints: Sign out shows at every width, because the tab bar has no other way to sign out
(L2-008 AC4); every target stays at least 44 × 44 px; the bell stays. The wordmark is the widest
part, but it belongs to the brand lockup, which the design system said "never shrinks or drops its
wordmark", and a component never styles another block.

Options weighed, at 320 px (288 px inside the padding):

- **Tighten the bar only** (12 px gap below 640 px, as the design system already said, and smaller
  gaps in the end group): saves about 20 px. Not enough at 360 px, far from it at 320 px.
- **Stack the wordmark** ("CHRISTIAN" over "FITNESS"): the lockup becomes about 119 px. Fits 360 px
  with 7 px to spare but not 320 px (321 px needed), and the gap is gone the next time the bar gains
  a control.
- **Shrink the wordmark's type**: breaks the brand rule and still does not fit 320 px at a legible
  size.
- **Move Sign out into a menu** or the profile screen: breaks L2-008 AC4 and the top bar page.
- **A compact lockup: the seal alone, with the wordmark kept as visually hidden text** (chosen).
  44 + 12 + 190 = 246 px fits 288 px with room for the busy Sign out (a 16 px spinner and 8 px gap).

## Decision

- **The brand lockup gains a compact variant**, `.lockup--compact` (`compact` on `cf-brand-lockup`).
  Below 28rem (448 px) the wordmark is visually hidden inside the link and the seal stands alone in
  a link at least 44 × 44 px. The link keeps its accessible name, "Christian Fitness", from the
  hidden text, so the seal stays decorative. At 28rem and wider it is the ordinary lockup. The
  breakpoint and the rules live in the lockup's own stylesheet; the top bar only asks for the
  variant, so no component styles another's block.
- **Only the member top bar uses it.** The site header, the auth panel and the admin sidebar keep the
  full lockup; the design system's "never shrinks or drops its wordmark" now applies to the default
  and light lockups.
- **28rem, not 25rem.** The full lockup needs 182 + 12 + 190 + 32 = 416 px, and 440 px while Sign out
  shows its busy spinner; 448 px is the first tidy breakpoint above both. A 25rem (400 px) switch
  would leave 400 to 415 px overflowing.
- **The bar's gap is 12 px below 640 px**, as the top bar page already said; the code had kept 24 px.
- The mocks' generator (`docs/mocks/tools/cf_ui.py`) gives the member shell `lockup--compact`, every
  mock and design-system example of the member shell carries it, and
  `docs/design-system/assets/components.css` holds the same rules, so mock, design system and code
  agree.

## Consequences

- Below 448 px the brand shows as the seal alone in the member app's bar; the name is still the
  link's accessible name, and the full lockup returns from 448 px.
- A new control in the member top bar must be measured at 320 px; the acceptance spec
  `e2e/web/member-header.spec.ts` fails on any sideways scroll at 360 and 320 px.
- If a later control no longer fits at 320 px even with the compact lockup, the next step is to
  move the bell or profile button into the tab bar, which needs its own decision.
