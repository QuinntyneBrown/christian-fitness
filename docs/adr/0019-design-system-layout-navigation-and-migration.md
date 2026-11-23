# 0019. Design-system layout, navigation and migration: shells built from the library, one shared navigation pattern, and every screen-specific duplicate removed

## Status

Accepted, 23 November 2026 (slice 1.6).

## Context

Slices 1.4 and 1.5 built the design system's primitives, form controls, feedback, overlays and
content components (ADR 0017, ADR 0018), but no screen used them. The screens still composed
duplicates built before the rule that every component in `docs/design-system/components/` is
built once under its design-system name (AGENTS.md, L2-038 AC7): `form-alert`, `text-link`,
`tag-list`, `auth-brand`, `app-header`, `admin-nav`, `admin-user`, `admin-layout`, `staff-layout`,
`profile-skeleton`, `empty-inline`, `error-state`, `going-list` and `interest-picker`. The layout
and navigation pages (layout, top bar, footer, sidebar navigation, tab bar, breadcrumb) had no
component at all.

Several things were left open: where the three page shells (`app`, `admin`, `auth` and `staff`
blocks of `components.css`) live, since no design-system page documents them; what the member
shell shows while most destinations have no screen; how the top bar's Sign out, which the page
does not draw, fits; and two places where the design system disagrees with itself.

## Decision

- **Folders follow the design-system pages (ADR 0018).**
  - `layout/` holds the layout page's primitives, `cf-container` (`container`, `page`,
    `page--detail`), `cf-split` (the five page ratios and `flush`), `cf-stack` (`sm`, default,
    `section`, `lg`, and `aside` for `aside-stack`), `cf-cluster` and `cf-grid` (`cards`), and the
    page shells, named for their blocks: `cf-admin-layout` (`admin`), `cf-auth-layout` (`auth`)
    and `cf-staff-layout` (`staff`). The shells keep their selectors, so no screen changed for
    them, and are now built from library components: the skip link, the sidebar navigation, the
    brand lockup and the seal. The auth layout's brand panel (`auth__brand`) is part of it rather
    than a component of its own.
  - `sidebar-navigation/` holds `cf-sidebar-navigation` (`admin__sidebar`) with the page's
    `admin-nav` block (`cf-admin-nav`, which gains the page's `admin-nav__count`, named by a full
    phrase such as "3 applications waiting" and gone at zero) and the `admin__user` element
    (`cf-admin-user`), split so each stylesheet stays under the 3.5 kB budget.
  - `top-bar/` holds `cf-top-bar` with its two variants, `app` (`app-header`, `app-nav`,
    `profile-button`) and `site` (`site-header`), and `MemberDestination`, the list both member
    bars take. `tab-bar/`, `breadcrumb/` and `footer/` hold one component each.
  - `chip/` gains `cf-tag-list` (the chip page's `tag-list` of `cf-tag`s) and `list/` gains
    `cf-going-item` with a `going` variant of `cf-list` (the list page's "Going items").
- **Layout primitives keep their look on projected content.** Encapsulated styles do not reach a
  screen's projected columns, so `cf-split` writes its tracks as `minmax(0, …)` instead of the
  page's `.split > * { min-width: 0 }`; a screen that spans a grid column sets it on its own
  element. Primitives carry no landmark: the screen keeps `main` and `aside aria-label` on its own
  elements (layout.html, "Labelling").
- **Both shells start with the skip link** (`cf-skip-link`, L2-038 AC2), as the meet-wcag design
  planned for the first shells with something to skip: the admin layout before the sidebar, the
  member shell before the top bar. It moves focus to `main#main`, which shows no ring of its own.
- **The member shell still shows only destinations whose screens exist** (ADR 0009, ADR 0015).
  `cf-top-bar` and `cf-tab-bar` take all five destinations, mark the current one and carry the
  unread count (L2-008 AC1 to AC3), and the shell passes none yet: Home and Profile are the only
  member screens, and links to the not-found screen help no one. The journey that builds Events,
  Services or Messages adds the destinations and the tab bar to the shell. The top bar draws no
  `nav` and the tab bar no bar while the list is empty.
- **The top bar keeps Sign out.** The design system's app header has no Sign out, but L2-008 AC4
  and ADR 0009 put a ghost Sign out button, 44 px tall, at its end at every viewport; it stays
  there, after the profile button.
- **Where the design system disagrees with itself, the component page wins.** The top-bar page
  caps counts at "9+" and the badge page at "99+"; the top bar uses the shared `cf-count-badge`,
  so "99+", still read as the real count. `components.css` draws the profile hero's avatar at
  `--size-avatar-3xl` with an italic face; the avatar page says the profile hero uses `2xl`, so
  the hero composes `cf-avatar size="2xl" variant="solid"`, and its loading state the matching
  `avatar-2xl` skeleton.
- **One navigation pattern.** Every navigation component renders real links and emits `navigate`
  for a plain click only (ADR 0017); the check is one helper, `isPlainClick`, in `link/`, used by
  the admin navigation, top bar, tab bar, breadcrumb, pagination and tabs.
- **The migration, old to new:**

  | Removed | Replaced by |
  | --- | --- |
  | `form-alert` | `cf-alert` (its sentence and link projected, the link a `cf-link`) |
  | `text-link` | `cf-link variant="text"` |
  | `tag-list` | `cf-tag-list` of `cf-tag` (chip page) |
  | `auth-brand` | `cf-auth-layout`'s brand panel, from `cf-brand-lockup` and `cf-seal` |
  | `app-header` | `cf-top-bar` (`app`) |
  | `admin-nav`, `admin-user` | `cf-sidebar-navigation` with `cf-admin-nav` and `cf-admin-user` |
  | `admin-layout` | `cf-admin-layout` in `layout/`, with `cf-skip-link` and `cf-sidebar-navigation` |
  | `staff-layout` | `cf-staff-layout` in `layout/`, its seal a `cf-seal` |
  | `profile-skeleton` | `cf-skeleton-region` around `cf-profile-hero loading` and `cf-skeleton`s in `cf-container` and `cf-split` |
  | `empty-inline` | `cf-empty-state variant="inline"` |
  | `error-state` | `cf-empty-state variant="error"` with its actions projected |
  | `going-list` | `cf-list variant="going"` of `cf-going-item` |
  | `interest-picker` | `cf-interest-list` of `cf-interest` |
  | the profile's goals list | `cf-list variant="goals"` |
  | hand-written `container`, `page`, `split`, `aside-stack` | `cf-container`, `cf-split`, `cf-stack` |
  | `mini-row__count` (slice 1.5) | `cf-unread-dot` on a mini row, `cf-count-badge pill` on a conversation (list.html, "States") |

  `cf-profile-hero` stays a screen composite, since no design-system page covers it, and is now
  built from `cf-avatar` and `cf-skeleton`.
- **`cf-skeleton-region` can name itself with a heading.** With `heading`, its hidden label is an
  `h1`, so a screen that is all skeletons (the profile while it loads) still has its one heading,
  as the profile mock does.
- **Page objects change only where a class did:** an alert's text is `.form-alert__text` (the
  alert projects its sentence into a wrapper instead of the form alert's bare `p`), and the profile
  hero's avatar is the avatar page's `.avatar`. Every behaviour spec asserts what it did before.
- **Acceptance.** The skip link is new behaviour on both shells, specified through their page
  objects and seen to fail first. The migration is proved by the existing behaviour specs, each
  run against a deliberately broken library component to see the right spec fail. Components no
  screen shows yet (tab bar, breadcrumb, footer, the site header, sidebar counts) are proved by
  component tests, one case per row of their state tables (ADR 0017).
- **Tree shaking still holds.** Both apps' initial totals are unchanged by the slice; the shells
  and screens that compose the new components are lazy chunks.

## Consequences

- No screen-specific duplicate of a design-system component remains in `projects/components`;
  `profile-hero` is the only composite, and every screen composes library components.
- The member shell grows its destinations and tab bar with the journeys that build Events,
  Services and Messages, and its unread count with the unread-count service the navigate design
  describes.
- The landing page (slice 8.1) composes `cf-top-bar variant="site"` and `cf-footer`; the first
  deep admin listing composes `cf-breadcrumb`.
- The profile hero's avatar is 96 px instead of 112 px, as the avatar page says.
