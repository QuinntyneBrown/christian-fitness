# Christian Fitness design system

Extracted from [docs/mocks](../mocks/README.md) on 2026-11-22. Open [index.html](index.html) locally (no build step, no server).
The mocks now render with this system: `docs/mocks/assets/tokens.css` and `ui.css` only `@import` the files below.

## Foundations
| Page | Covers |
|---|---|
| [Color](foundations/color.html) | Brand bordeaux and borealis, warm stone neutrals, status colours and every contrast pair. |
| [Typography](foundations/typography.html) | Barlow and Barlow Condensed, the type scale, roles and measure. |
| [Spacing](foundations/spacing.html) | The 4px scale, half steps inside components, inside versus between. |
| [Layout](foundations/layout.html) | Breakpoints, columns, gutters, margins, containers and page templates. |
| [Elevation](foundations/elevation.html) | Shadow levels, surface hierarchy and z-order. |
| [Shape](foundations/shape.html) | Radii from keys to cards, and border widths. |
| [Motion](foundations/motion.html) | Durations, easings, choreography and reduced motion. |
| [Iconography](foundations/iconography.html) | Lucide-style 24-unit icons, sizes and labelling. |
| [Theming](foundations/theming.html) | Light and dark themes, token tiers and tokens.json. |
| [Responsive](foundations/responsive.html) | Mobile first: what each component does at each breakpoint. |
| [Accessibility](foundations/accessibility.html) | WCAG 2.2 AA commitments, interaction tokens and testing. |
| [Content](foundations/content.html) | Voice, sentence case, numbers, dates and the microcopy library. |

## Components
| Component | Group | Covers |
|---|---|---|
| [Button](components/button.html) | Actions | Primary, secondary, ghost, danger, link and brand-panel buttons; icon buttons. |
| [Link](components/link.html) | Actions | Inline, text and back links; external links. |
| [Menu](components/menu.html) | Actions | A menu button that opens a list of actions. |
| [Text field](components/text-field.html) | Inputs | Text, e-mail, password, search and one-time code inputs. |
| [Textarea](components/textarea.html) | Inputs | Multi-line text with optional counter. |
| [Select](components/select.html) | Inputs | Native select for choosing one option. |
| [Checkbox](components/checkbox.html) | Inputs | Single and grouped checkboxes. |
| [Radio group](components/radio-group.html) | Inputs | One choice from a short list; list or card style. |
| [Switch](components/switch.html) | Inputs | An on/off setting that applies immediately. |
| [Form field](components/form-field.html) | Inputs | Label, control, hint and error: the wrapper every input uses. |
| [Form layout](components/form-layout.html) | Inputs | Field stacks, two-column rows, error summary and submit states. |
| [Top bar](components/top-bar.html) | Navigation | Member app header, public site header and their mobile forms. |
| [Tab bar](components/tab-bar.html) | Navigation | Bottom navigation for the member app on phones. |
| [Sidebar navigation](components/sidebar-navigation.html) | Navigation | The admin console sidebar with counts. |
| [Tabs](components/tabs.html) | Navigation | Underline tabs with counts for filtered views. |
| [Breadcrumb](components/breadcrumb.html) | Navigation | Where a page sits; collapses to the parent on phones. |
| [Pagination](components/pagination.html) | Navigation | Numbered and previous/next paging for long lists. |
| [Skip link](components/skip-link.html) | Navigation | The first focusable element on every page. |
| [Footer](components/footer.html) | Navigation | The public site footer. |
| [Card](components/card.html) | Containers and overlays | Surfaces for grouped content; event, list and stat cards. |
| [Dialog](components/dialog.html) | Containers and overlays | Modal dialogs that become bottom sheets on phones. |
| [Drawer](components/drawer.html) | Containers and overlays | Side panels for editing without leaving the list. |
| [Tooltip](components/tooltip.html) | Containers and overlays | Short labels for icon-only controls. |
| [Accordion](components/accordion.html) | Containers and overlays | Show and hide sections with details and summary. |
| [Divider](components/divider.html) | Containers and overlays | Hairline rules between content. |
| [Layout primitives](components/layout.html) | Containers and overlays | Container, split, grid, stack and cluster. |
| [Table](components/table.html) | Data display | Admin data tables that scroll inside their wrapper. |
| [List](components/list.html) | Data display | Event rows, person rows, conversations and divided lists. |
| [Description list](components/description-list.html) | Data display | Key-value facts and spec lists. |
| [Avatar](components/avatar.html) | Data display | Initials, photos, group avatars and stacks. |
| [Badge](components/badge.html) | Data display | Status pills, counts and unread dots. |
| [Chip](components/chip.html) | Data display | Filter chips, interest toggles and tags. |
| [Stat](components/stat.html) | Data display | Numbers that matter: stat hero, stat tiles and fill meters. |
| [Event card](components/event-card.html) | Data display | The event summary card with image, date badge and seats. |
| [Message](components/message.html) | Data display | Chat bubbles, day separators and the composer. |
| [Date badge](components/date-badge.html) | Data display | Month and day tiles used across event surfaces. |
| [Toast](components/toast.html) | Feedback | Short-lived notices with optional action. |
| [Alert](components/alert.html) | Feedback | Inline alerts and error summaries inside forms and pages. |
| [Banner](components/banner.html) | Feedback | Page-level notices under the header. |
| [Inline message](components/inline-message.html) | Feedback | Field hints, field errors and inline retry messages. |
| [Progress bar](components/progress-bar.html) | Feedback | Determinate and indeterminate progress, and meters. |
| [Spinner](components/spinner.html) | Feedback | Busy indicators inside buttons and regions. |
| [Skeleton](components/skeleton.html) | Feedback | Placeholders that mirror the layout while loading. |
| [Empty state](components/empty-state.html) | Feedback | First-run, no-results and nothing-yet states. |
| [Error page](components/error-page.html) | Feedback | 404, 403, 500 and offline pages. |
| [Brand lockup](components/brand-lockup.html) | Brand | The seal and wordmark in every size. |

## Patterns
| Pattern | Covers |
|---|---|
| [Forms](patterns/forms.html) | Layout, validation timing, error summary, submit and success states. |
| [Feedback and loading](patterns/feedback-and-loading.html) | Which feedback for which action; skeleton vs spinner; undo. |
| [Empty and error states](patterns/empty-and-error-states.html) | Copy formulas and when to use which. |
| [Navigation and page structure](patterns/navigation.html) | Shells, page headers, back links and tabs. |
| [Dialogs and overlays](patterns/dialogs-and-overlays.html) | Dialog vs drawer vs page; stacking; mobile sheets. |
| [Tables and lists](patterns/tables-and-lists.html) | Density, filters, bulk actions and responsive strategy. |
| [Notifications](patterns/notifications.html) | Toast vs banner vs inline; priority and dismissal. |
| [Content and tone](patterns/content-and-tone.html) | Voice, faith language, verbs, numbers and microcopy. |

## Tokens and stylesheets
- `tokens/tokens.css` — source of truth (primitives, semantic tokens, light and dark themes, preference overrides; self-hosts Barlow and Barlow Condensed from `assets/fonts/`).
- `tokens/tokens.json` — DTCG export generated from `tokens.css`.
- `tokens/contrast-pairs.json` — every foreground/background pairing the components rely on; checked in both themes.
- `assets/components.css` — the product's BEM component stylesheet; token-driven, with `data-state` hooks for documentation.
- `assets/ds.css`, `assets/ds.js` — documentation-site chrome only.

## Changing the system
Pages are generated; edit `tools/` (registry and shell in `tools/build.py`, one spec per page in `tools/components/` and `tools/patterns/`, foundations in `tools/foundations.py`) or `tokens/`, then:

```sh
python3 docs/design-system/tools/build.py
python3 .claude/skills/extracting-design-systems/scripts/tokens_to_json.py docs/design-system/tokens/tokens.css
python3 .claude/skills/extracting-design-systems/scripts/check_contrast.py docs/design-system/tokens/tokens.css
python3 .claude/skills/extracting-design-systems/scripts/check_design_system.py docs/design-system
python3 .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks
```

## Drift found in the mocks
| Mock | Issue | Resolution |
|---|---|---|
| assets/ui.css (inputs, search, composer) | Control edges used `--color-border-default` (#e6e1df, 1.3:1 on white), failing WCAG 1.4.11. | Inputs, selects, textareas, search and composer use `--color-border-strong` (stone 450, ≥ 3.5:1). |
| assets/ui.css (buttons) | Buttons sized by padding only (42.5px default); secondary 2px taller than primary. | `min-height` from `--control-height-sm/md/lg` (36/44/52px); every variant has a 1px border so heights match. |
| assets/tokens.css (type) | 11px size (`--font-size-2xs`) on tab-bar labels, date badges and count badges; below the 12px floor. | Snapped to 12px (`--font-size-xs`). |
| assets/tokens.css (type) | 17px goals list and 22px wordmark off the scale; line heights 0.92 and 0.95. | 17px → 18px (`lg`), 22px → 20px (`xl`, same as the admin wordmark); both line heights → `--line-height-display` (0.9). |
| assets/ui.css (line heights) | Raw rem line heights (1rem … 2.5rem). | Tokenised as `--line-height-xs/sm/lg/2xl/3xl/4xl`, paired with their font sizes. |
| assets/tokens.css (radii) | Seven radii (4, 6, 8, 12, 16, 24px, full). | Five + full: xs 4, sm 8 (6px collapsed into 8), md 12, lg 16, xl 24. Old names renamed (`3xl`→`xl`, `2xl`→`lg`, `xl`→`md`). |
| assets/tokens.css (shadows) | Five shadow levels; levels 2 (8/24) and 3 (12/32) nearly identical. | Four levels: old 2 and 3 merged into `--shadow-2`; old 4 → 3, old 5 → 4; `--shadow-focus` added. |
| assets/tokens.css (motion) | `--duration-base` 180ms unused next to `--duration-moderate` 200ms; raw `ease`, `ease-out`, 900ms spinner. | One base of 200ms; easings and the spinner use tokens (`--ease-standard`, `--ease-enter`, `--duration-spin`). |
| assets/tokens.css (colour) | Near-duplicate neutrals #111111 / #121011 and #f7f5f4 / #f5f2f1; raw #0b0a0a in the dark theme. | Collapsed into one stone ramp (950 ink, 50 canvas); #0b0a0a is `--palette-stone-1000`. |
| assets/ui.css (colour) | Components read primitives (`--palette-white`, `--palette-bordeaux`, `--palette-borealis`, `--palette-ink`) and raw `rgb()` (brand hover, auth points, skeleton shine, toast text and close). | Semantic tokens: `--color-bg-brand-inverse`, `--color-bg-chrome-current`, `--color-bg-chrome-badge`, `--color-bg-on-brand-hover`, `--color-fg-on-brand-strong`, `--color-skeleton-shine`, `--color-toast-danger-muted`, `--color-toast-close-hover`. |
| assets/ui.css (avatar, table) | 38px table avatar; `.table--wide` 42.5rem next to `.table--wider` 45rem. | Avatar → 40px (`--size-avatar-md`); both tables → `--layout-table-min-wide`. |
| assets/ui.css (sizes) | Raw sizes for lead width, toast width, schedule column, skeleton blocks, tab-bar dot offset. | Layout tokens or spacing multiples. |
| tokens (missing roles) | No subtle/disabled text, sunken surface, accent active, status icon/border/solid, danger hover, mono font, control heights, z-layers for menus and popovers. | Added, contrast-checked in both themes. |

## Verification
Run on 2026-11-22:

- `check_contrast.py`: 170 pairs passed in light and dark, 0 failed.
- `check_design_system.py`: 67 pages (46 components, 8 patterns, 12 foundations, index), 0 errors, 0 warnings.
- `check_mocks.py docs/mocks` after pointing the mocks at this system: 28 screens, 131 mocks, 0 errors.
- Horizontal overflow (Playwright, every page at 360 and 1280px): none.
- Screenshots reviewed: button, dialog, text-field, event-card and color in both themes at 1280 and 360px; mocks events, sign-in (invalid), admin members and request-booking against the pre-extraction originals (only intended changes: stronger input borders, button heights).
