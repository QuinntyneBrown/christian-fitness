"""README.md: GitHub summary generated from the registry, plus the drift log."""
import build

DRIFT = [
    ("assets/ui.css (inputs, search, composer)", "Control edges used `--color-border-default` (#e6e1df, 1.3:1 on white), failing WCAG 1.4.11.", "Inputs, selects, textareas, search and composer use `--color-border-strong` (stone 450, ≥ 3.5:1)."),
    ("assets/ui.css (buttons)", "Buttons sized by padding only (42.5px default); secondary 2px taller than primary.", "`min-height` from `--control-height-sm/md/lg` (36/44/52px); every variant has a 1px border so heights match."),
    ("assets/tokens.css (type)", "11px size (`--font-size-2xs`) on tab-bar labels, date badges and count badges; below the 12px floor.", "Snapped to 12px (`--font-size-xs`)."),
    ("assets/tokens.css (type)", "17px goals list and 22px wordmark off the scale; line heights 0.92 and 0.95.", "17px → 18px (`lg`), 22px → 20px (`xl`, same as the admin wordmark); both line heights → `--line-height-display` (0.9)."),
    ("assets/ui.css (line heights)", "Raw rem line heights (1rem … 2.5rem).", "Tokenised as `--line-height-xs/sm/lg/2xl/3xl/4xl`, paired with their font sizes."),
    ("assets/tokens.css (radii)", "Seven radii (4, 6, 8, 12, 16, 24px, full).", "Five + full: xs 4, sm 8 (6px collapsed into 8), md 12, lg 16, xl 24. Old names renamed (`3xl`→`xl`, `2xl`→`lg`, `xl`→`md`)."),
    ("assets/tokens.css (shadows)", "Five shadow levels; levels 2 (8/24) and 3 (12/32) nearly identical.", "Four levels: old 2 and 3 merged into `--shadow-2`; old 4 → 3, old 5 → 4; `--shadow-focus` added."),
    ("assets/tokens.css (motion)", "`--duration-base` 180ms unused next to `--duration-moderate` 200ms; raw `ease`, `ease-out`, 900ms spinner.", "One base of 200ms; easings and the spinner use tokens (`--ease-standard`, `--ease-enter`, `--duration-spin`)."),
    ("assets/tokens.css (colour)", "Near-duplicate neutrals #111111 / #121011 and #f7f5f4 / #f5f2f1; raw #0b0a0a in the dark theme.", "Collapsed into one stone ramp (950 ink, 50 canvas); #0b0a0a is `--palette-stone-1000`."),
    ("assets/ui.css (colour)", "Components read primitives (`--palette-white`, `--palette-bordeaux`, `--palette-borealis`, `--palette-ink`) and raw `rgb()` (brand hover, auth points, skeleton shine, toast text and close).", "Semantic tokens: `--color-bg-brand-inverse`, `--color-bg-chrome-current`, `--color-bg-chrome-badge`, `--color-bg-on-brand-hover`, `--color-fg-on-brand-strong`, `--color-skeleton-shine`, `--color-toast-danger-muted`, `--color-toast-close-hover`."),
    ("assets/ui.css (avatar, table)", "38px table avatar; `.table--wide` 42.5rem next to `.table--wider` 45rem.", "Avatar → 40px (`--size-avatar-md`); both tables → `--layout-table-min-wide`."),
    ("assets/ui.css (sizes)", "Raw sizes for lead width, toast width, schedule column, skeleton blocks, tab-bar dot offset.", "Layout tokens or spacing multiples."),
    ("tokens (missing roles)", "No subtle/disabled text, sunken surface, accent active, status icon/border/solid, danger hover, mono font, control heights, z-layers for menus and popovers.", "Added, contrast-checked in both themes."),
]


def table(head, rows):
    out = "| " + " | ".join(head) + " |\n|" + "---|" * len(head) + "\n"
    return out + "".join("| " + " | ".join(r) + " |\n" for r in rows)


def render():
    f = table(["Page", "Covers"], [(f"[{n}](foundations/{s}.html)", b) for s, n, b in build.FOUNDATIONS])
    c = table(["Component", "Group", "Covers"], [(f"[{n}](components/{s}.html)", g, b) for s, n, g, b in build.COMPONENTS])
    p = table(["Pattern", "Covers"], [(f"[{n}](patterns/{s}.html)", b) for s, n, b in build.PATTERNS])
    d = table(["Mock", "Issue", "Resolution"], DRIFT)
    return f"""# Christian Fitness design system

Extracted from [docs/mocks](../mocks/README.md) on {build.EXTRACTED}. Open [index.html](index.html) locally (no build step, no server).
The mocks now render with this system: `docs/mocks/assets/tokens.css` and `ui.css` only `@import` the files below.

## Foundations
{f}
## Components
{c}
## Patterns
{p}
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
{d}
## Verification
{build.VERIFICATION}
"""
