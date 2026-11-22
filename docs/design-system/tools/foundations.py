"""The twelve foundation pages.

Token tables are generated from tokens/tokens.css: every token is assigned to
exactly one page by prefix (CATEGORY below) and appears there in a
data-token cell, so ds.js shows its live value in each theme.
"""
from __future__ import annotations

import re

import build
from dslib import ICONS, ex, icon, pre, themes

TOKENS_CSS = build.ROOT / "tokens" / "tokens.css"

CATEGORY = [  # first match wins
    ("--size-icon-", "iconography"),
    ("--palette-", "color"), ("--color-", "color"),
    ("--font-", "typography"), ("--line-height-", "typography"), ("--letter-spacing-", "typography"), ("--text-", "typography"),
    ("--space-", "spacing"),
    ("--layout-", "layout"), ("--size-", "layout"),
    ("--shadow-", "elevation"), ("--z-", "elevation"),
    ("--radius-", "shape"), ("--border-width-", "shape"),
    ("--duration-", "motion"), ("--ease-", "motion"), ("--delay-", "motion"),
    ("--target-", "accessibility"), ("--focus-ring-", "accessibility"), ("--control-height-", "accessibility"),
    ("--opacity-", "accessibility"),
]


def parse_tokens() -> list[tuple[str, str, str]]:
    """(name, value, comment) for every token declared in the first :root block, in file order."""
    css = TOKENS_CSS.read_text(encoding="utf-8")
    root = css[css.index(":root {"):]
    root = root[:root.index("\n}\n")]
    out = []
    for m in re.finditer(r"(--[\w-]+)\s*:\s*([^;]+);[ \t]*(?:/\*\s*(.*?)\s*\*/)?", root):
        out.append((m.group(1), m.group(2).strip(), (m.group(3) or "").strip()))
    return out


TOKENS = parse_tokens()


def category(name: str) -> str:
    for prefix, page in CATEGORY:
        if name.startswith(prefix):
            return page
    raise SystemExit(f"token {name} has no foundation page; add its prefix to CATEGORY")


def tokens_of(page: str, prefix: str = "") -> list[tuple[str, str, str]]:
    return [t for t in TOKENS if category(t[0]) == page and t[0].startswith(prefix)]


def is_colour(name: str) -> bool:
    return name.startswith(("--palette-", "--color-"))


def token_table(rows: list[tuple[str, str, str]]) -> str:
    body = []
    for name, value, comment in rows:
        if is_colour(name):
            light = build.swatch_cell(name, "light")
            dark = build.swatch_cell(name, "dark")
            body.append(f"<tr><td><code>{name}</code></td><td>{light}</td><td>{dark}</td><td>{comment}</td></tr>")
        else:
            body.append(f'<tr><td><code>{name}</code></td><td colspan="2"><span data-token="{name}"></span></td><td>{comment}</td></tr>')
    return ('<div class="ds-table-wrap"><table class="ds-table"><thead><tr><th scope="col">Token</th><th scope="col">Light</th>'
            f'<th scope="col">Dark</th><th scope="col">Use</th></tr></thead><tbody>{"".join(body)}</tbody></table></div>')


def all_tokens_section(page: str, intro: str = "") -> str:
    rows = tokens_of(page)
    return build.section("tokens", f"<p>{intro or 'Every token of this category, with its live value in each theme.'} {len(rows)} tokens.</p>{token_table(rows)}", "Tokens")


def pair(label: str, fg: str, bg: str, minimum: float) -> str:
    return (f'<div class="ds-pair"><span>{label}</span><span class="ds-pair__ratio" data-contrast="{fg}|{bg}" '
            f'data-min="{minimum}"></span></div>')


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------
def color() -> list[str]:
    import json
    ramps = {}
    for name, value, _ in TOKENS:
        m = re.match(r"--palette-([a-z]+)-(\d+)$", name)
        if m:
            ramps.setdefault(m.group(1), []).append((m.group(2), name))
    ramp_html = "".join(
        f'<h3>{fam.capitalize()}</h3><div class="ds-ramp">'
        + "".join(f'<span data-step="{step}" style="--swatch: var({name});"></span>' for step, name in steps) + "</div>"
        for fam, steps in ramps.items())
    roles = [("--color-bg-canvas", "Canvas"), ("--color-bg-surface", "Surface"), ("--color-bg-surface-raised", "Raised"),
             ("--color-bg-brand", "Brand panel"), ("--color-bg-chrome", "Admin chrome"), ("--color-accent", "Accent"),
             ("--color-accent-subtle", "Accent subtle"), ("--color-highlight", "Highlight (borealis)"),
             ("--color-fg-default", "Text"), ("--color-fg-muted", "Muted text"), ("--color-border-default", "Divider"),
             ("--color-border-strong", "Control edge")]
    swatches = "".join(
        f'<div class="ds-swatch"><div class="ds-swatch__chip" style="--swatch: var({n});"></div>'
        f'<div class="ds-swatch__body"><span class="ds-swatch__name">{label}</span><span class="ds-swatch__value">{n}</span></div></div>'
        for n, label in roles)
    status = "".join(
        f'<span class="status status--{s}">{icon(ic, "icon--xs")}{label}</span>'
        for s, ic, label in [("info", "info", "Info"), ("success", "circle-check", "Confirmed"),
                             ("warning", "alert-triangle", "Almost full"), ("danger", "alert-circle", "Needs attention")])
    pairs = json.loads((build.ROOT / "tokens" / "contrast-pairs.json").read_text())["pairs"]
    pair_rows = "".join(pair(p["note"], p["fg"], p["bg"], p["min"]) for p in pairs if "themes" not in p)
    return [
        build.section("overview", """<p>Colour comes from the prototype: <b>ink</b> text on a warm <b>canvas</b>, <b>bordeaux</b> for the one thing to do, <b>borealis</b> blue as the second brand colour on bordeaux and ink panels, and <b>blush</b> for selected and confirmed states. Neutrals are a warm stone ramp, never pure grey. Errors use bordeaux too (the prototype's choice), always with an icon and words so colour is never the only signal.</p>
<p>Components read <b>semantic</b> tokens (<code>--color-*</code>) only. Primitives (<code>--palette-*</code>) exist to be referenced by semantic tokens and by nothing else.</p>"""),
        build.section("ramps", f"<p>Primitive ramps. Step numbers rise with darkness; 700 bordeaux, 800 bordeaux-deep, 50 blush, 300 borealis, 50 canvas, 200 line and 950 ink are the prototype's own values.</p>{ramp_html}", "Primitive ramps"),
        build.section("roles", f"<p>The semantic roles a screen is built from, in the current theme.</p><div class=\"ds-swatches\">{swatches}</div>"
                      + "<h3>Status</h3>" + ex(status, "Status = colour + icon + words. Each tone has bg, fg, border, icon and solid tokens.")
                      + "<h3>Both themes</h3>" + themes(
                          '<div class="card card--pad-sm stack stack--sm"><p class="eyebrow">Run · Sat 6:45 AM</p><p class="display section-title">Easter Sunrise 5K</p>'
                          '<p class="muted">Martin Goodman Trail</p><div class="cluster"><button class="btn btn--primary btn--sm" type="button">Register</button>'
                          '<span class="tag">Going</span></div></div>'), "Semantic roles"),
        build.section("usage", """<ul>
<li>One accent per view: bordeaux marks the primary action, the current place and counts that need attention. Do not use it for decoration.</li>
<li>Brand panels (<code>--color-bg-brand</code>) take white text, borealis highlights and the borealis focus ring; the same holds on admin chrome.</li>
<li>Text on canvas, surface and raised surfaces uses <code>--color-fg-default</code>, <code>-muted</code> or <code>-subtle</code>; all three pass 4.5:1 on every surface in both themes.</li>
<li>Dividers and card rings (<code>--color-border-default</code>) are decorative. Anything that identifies a control, such as an input edge, uses <code>--color-border-strong</code> (3:1).</li>
<li>Adding a brand theme: add a <code>[data-theme="name"]</code> block that overrides semantic tokens only, add its pairs to <code>contrast-pairs.json</code> and run the contrast check. See <a href="theming.html">Theming</a>.</li>
</ul>"""),
        build.section("accessibility", f"<p>Every pairing a component relies on is listed in <code>tokens/contrast-pairs.json</code> and checked by <code>check_contrast.py</code> in both themes. Live ratios for the current theme (toggle the theme to see dark):</p><div class=\"ds-pairs\">{pair_rows}</div>"),
        all_tokens_section("color", "Primitives first, then semantic tokens."),
    ]


def typography() -> list[str]:
    roles = [("--text-display", "Display", "Health in body and spirit", "display"), ("--text-h1", "Heading 1", "Events", "upper"),
             ("--text-h2", "Heading 2", "Request a booking", "upper"), ("--text-h3", "Heading 3", "Coming up", ""),
             ("--text-h4", "Heading 4", "What to bring", ""), ("--text-body-lg", "Body large", "Run, pray and keep going together.", ""),
             ("--text-body", "Body", "A Christian community for health in body and spirit.", ""),
             ("--text-body-sm", "Body small", "Martin Goodman Trail, Marilyn Bell Park", ""),
             ("--text-label", "Label", "Email", ""), ("--text-caption", "Caption", "Sent 7:42 AM", ""),
             ("--text-overline", "Overline", "ADMIN CONSOLE", ""), ("--text-code", "Code", "--color-accent", "")]
    spec = "".join(
        f'<div class="ds-specimen"><div class="ds-specimen__meta">{label}<br>{name}</div>'
        f'<p style="font: var({name});{" text-transform: uppercase; letter-spacing: var(--letter-spacing-wide);" if kind else ""}">{text}</p></div>'
        for name, label, text, kind in roles)
    sizes = [t for t in TOKENS if t[0].startswith("--font-size-")]
    scale = "".join(f'<div class="ds-specimen"><div class="ds-specimen__meta">{n} · {c}</div><p style="font-size: var({n}); line-height: var(--line-height-tight);">Keep going together</p></div>' for n, _, c in sizes)
    return [
        build.section("overview", """<p>Two self-hosted families from the prototype, both SIL OFL and bundled in <code>assets/fonts/</code> (never a CDN): <b>Barlow Condensed</b> italic, uppercase, for display and page titles (<code>.display</code>), and <b>Barlow</b> for everything people read and operate. A system monospace serves code.</p>"""),
        build.section("roles", f"<p>Role shorthands are complete <code>font</code> values: <code>font: var(--text-h3)</code>. Display roles add <code>text-transform: uppercase</code> and <code>--letter-spacing-wide</code> through <code>.display</code>.</p>{spec}", "Roles"),
        build.section("scale", f"<p>Thirteen sizes. 15px (<code>--font-size-ui</code>) is the prototype's size for buttons, navigation, table cells and chat; body copy and inputs stay 16px; nothing is smaller than 12px.</p>{scale}", "Scale"),
        build.section("usage", """<ul>
<li>One display heading per screen (the page title); section titles are Barlow semibold 24px.</li>
<li>Weights: 400 body, 500 display, 600 labels and emphasis, 700 badges and counts.</li>
<li>Prose is capped at <code>--layout-measure</code> (42rem, about 75 characters).</li>
<li>Numbers in tables, schedules and stats use <code>font-variant-numeric: tabular-nums</code>.</li>
<li>Display headings scale by breakpoint, not by viewport units: the landing hero is 60 → 72 → 96px; page titles 36 → 48px.</li>
</ul>"""),
        build.section("accessibility", """<ul>
<li>Sizes are in rem, so browser zoom and the user's default font size scale everything.</li>
<li>Body text is 16px with 1.5 line height; nothing below 12px (the prototype's 11px tab labels were raised).</li>
<li>Uppercase is limited to display headings and short overlines, which assistive technology reads from the source text in sentence case.</li>
<li>Layouts survive WCAG 1.4.12 text spacing: no fixed heights on text containers.</li>
</ul>"""),
        all_tokens_section("typography"),
    ]


def spacing() -> list[str]:
    rows = "".join(f'<div class="ds-scale__row"><code>{n}</code><span data-token="{n}"></span><span class="ds-scale__bar" style="--size: var({n});"></span></div>'
                   for n, _, _ in tokens_of("spacing") if n not in ("--space-0",))
    return [
        build.section("overview", "<p>Spacing is a 4px scale from the prototype's Tailwind classes. Half steps (2, 6, 10, 14px) exist for padding inside small components only; layout spacing uses whole steps.</p>"),
        build.section("scale", f'<div class="ds-scale">{rows}</div>', "Scale"),
        build.section("usage", """<table class="ds-table"><thead><tr><th scope="col">Where</th><th scope="col">Tokens</th></tr></thead><tbody>
<tr><td>Icon to label</td><td><code>--space-1</code>–<code>--space-2</code></td></tr>
<tr><td>Label to input, hint to input</td><td><code>--space-1-5</code></td></tr>
<tr><td>Between form fields</td><td><code>--space-5</code></td></tr>
<tr><td>Button and input padding</td><td><code>--space-2-5</code>–<code>--space-3</code> × <code>--space-4</code>–<code>--space-5</code></td></tr>
<tr><td>Card padding</td><td><code>--space-6</code> (phone) → <code>--space-8</code> (≥ sm)</td></tr>
<tr><td>Dialog head, body, foot</td><td><code>--space-6</code> sides, <code>--space-4</code>–<code>--space-5</code> vertical</td></tr>
<tr><td>Between page blocks</td><td><code>--space-8</code>; sections <code>--space-10</code>; bands <code>--space-16</code>–<code>--space-20</code></td></tr>
</tbody></table><p>Inside a component use ≤ <code>--space-6</code>; between components use ≥ <code>--space-6</code>.</p>"""),
        all_tokens_section("spacing"),
    ]


def layout() -> list[str]:
    cols = "".join(f"<span>{i}</span>" for i in range(1, 13))
    return [
        build.section("overview", "<p>Mobile first. Base styles target a 360px phone; breakpoints add margin, columns and navigation. The member app caps content at 80rem, the admin console at 72rem.</p>"),
        build.section("breakpoints", """<table class="ds-table"><thead><tr><th scope="col">Breakpoint</th><th scope="col">Width</th><th scope="col">Columns</th><th scope="col">Gutter</th><th scope="col">Margin</th><th scope="col">What changes</th></tr></thead><tbody>
<tr><td>base</td><td>0–639px</td><td>4</td><td>16px</td><td>16px</td><td>Bottom tab bar, one column, dialogs as bottom sheets</td></tr>
<tr><td>sm</td><td>640px</td><td>4</td><td>16px</td><td>24px</td><td>Margins grow, two-column event grid and field rows, dialogs centre</td></tr>
<tr><td>md</td><td>768px</td><td>8</td><td>24px</td><td>24px</td><td>Top navigation replaces the tab bar; messages show list and thread</td></tr>
<tr><td>lg</td><td>1024px</td><td>12</td><td>32px</td><td>24px</td><td>Two-column pages (content + aside), admin sidebar, sticky asides</td></tr>
<tr><td>xl</td><td>1280px</td><td>12</td><td>32px</td><td>auto</td><td>Container max reached; landing hero at 96px</td></tr>
</tbody></table><p>Media queries use <code>min-width</code> in rem; custom properties cannot appear inside <code>@media</code>, so the values repeat <code>--layout-breakpoint-*</code> by convention.</p>""", "Breakpoints"),
        build.section("grid", f'<p>Live grid at the current width (resize the window):</p><div class="ds-grid-demo">{cols}</div><p>Page splits use named ratios instead of spans: home 1.65fr / 1fr, event detail 1.6fr / 1fr, profile 1.4fr / 1fr, services 1fr / 1.1fr, dashboard 1.5fr / 1fr.</p>', "Grid, gutters and margins"),
        build.section("templates", """<ul>
<li><b>Member shell</b>: sticky top bar (64px), content in <code>.container.page</code>, bottom tab bar below md.</li>
<li><b>Auth</b>: bordeaux brand aside and a 28rem form column side by side from lg; stacked below.</li>
<li><b>Admin shell</b>: 16rem ink sidebar from lg (horizontal scroller above), page capped at 72rem.</li>
<li><b>Detail</b>: banner image, then content and a sticky register aside from lg.</li>
<li><b>Messages</b>: fills the viewport; 20rem conversation list beside the thread from md.</li>
</ul>""", "Page templates"),
        build.section("usage", "<ul><li>Use <code>.container</code> for page width and margin; never set page padding by hand.</li><li>Grids use <code>minmax(0, 1fr)</code> so long words do not blow out columns.</li><li>Full-height layouts use <code>100dvh</code>.</li><li>Component sizes (<code>--size-*</code>) keep avatars, seals, date tiles and thumbnails consistent.</li></ul>"),
        all_tokens_section("layout"),
    ]


def elevation() -> list[str]:
    grid = "".join(f'<div style="--shadow: var(--shadow-{i});">--shadow-{i}</div>' for i in range(1, 5))
    return [
        build.section("overview", "<p>Surfaces are flat with a 1px ring (<code>--color-border-default</code>); shadows appear only for things that float or respond: hovered cards, menus, toasts and dialogs.</p>"),
        build.section("levels", f'<div class="ds-shadow-grid">{grid}</div><table class="ds-table"><thead><tr><th scope="col">Level</th><th scope="col">Use</th></tr></thead><tbody><tr><td>1</td><td>Resting next-event card</td></tr><tr><td>2</td><td>Hovered event cards and rows, menus</td></tr><tr><td>3</td><td>Floating hero card, toasts</td></tr><tr><td>4</td><td>Dialogs and drawers over the scrim</td></tr></tbody></table>', "Shadow levels"),
        build.section("surfaces", "<p>Canvas &lt; surface &lt; raised. In the dark theme surfaces get lighter as they rise (stone 950 → 900 → 850), shadows get darker and stronger, and dialogs use <code>--color-bg-surface-raised</code> so they read as raised without relying on the shadow.</p>" + themes('<div class="card card--pad-sm">Surface card</div><div class="card card--pad-sm" style="background: var(--color-bg-surface-raised); box-shadow: var(--shadow-4);">Raised dialog surface</div>'), "Surfaces"),
        build.section("z-order", "<p>Components never set a raw <code>z-index</code>; they use a layer token. Sticky chrome sits under menus, the scrim under dialogs, toasts and tooltips on top.</p>", "Z-order"),
        all_tokens_section("elevation"),
    ]


def shape() -> list[str]:
    boxes = "".join(f'<div class="ds-scale__row"><code>{n}</code><span data-token="{n}"></span><span class="ds-scale__box" style="--size: var({n});"></span></div>' for n, _, _ in tokens_of("shape", "--radius-"))
    return [
        build.section("overview", "<p>Soft and friendly: buttons, chips and avatars are pills; cards, images and dialogs have 24px corners. Radius grows with the element.</p>"),
        build.section("radii", f'<div class="ds-scale">{boxes}</div>', "Radii"),
        build.section("usage", "<table class=\"ds-table\"><thead><tr><th scope=\"col\">Radius</th><th scope=\"col\">For</th></tr></thead><tbody><tr><td>xs 4px</td><td>Keys, ticks, focus outlines on text</td></tr><tr><td>sm 8px</td><td>Chat bubble tail, skeleton titles, sign-out button</td></tr><tr><td>md 12px</td><td>Inputs, date badges, icon tiles, group avatars, thumbnails</td></tr><tr><td>lg 16px</td><td>Rows, alerts, toasts, stat tiles, chat bubbles</td></tr><tr><td>xl 24px</td><td>Cards, images, tables, dialogs, panels</td></tr><tr><td>full</td><td>Buttons, chips, badges, avatars, search and composer inputs</td></tr></tbody></table><p>Borders are 1px hairlines; 2px marks the selected tab and focus rings.</p>"),
        all_tokens_section("shape"),
    ]


def motion() -> list[str]:
    demos = "".join(
        f'<div class="ds-motion-demo" style="--demo-duration: var({d}); --demo-ease: var({e});"><button class="btn btn--secondary btn--sm" type="button" data-motion-run>Play {label}</button><span class="dot" aria-hidden="true"></span></div>'
        for d, e, label in [("--duration-fast", "--ease-standard", "fast · standard"), ("--duration-base", "--ease-enter", "base · enter"),
                            ("--duration-slow", "--ease-enter", "slow · enter (sheet)"), ("--duration-base", "--ease-spring", "base · spring")])
    return [
        build.section("overview", "<p>Motion is quick and quiet: it confirms a change and shows where something came from. Nothing loops except loading indicators.</p>"),
        build.section("demos", f'<div class="stack">{demos}</div>', "Durations and easings"),
        build.section("usage", "<ul><li>Hover and colour changes: fast (150ms), standard easing.</li><li>Card shadow, scrim, dialog scale-in, toast slide-up: base (200ms), enter easing.</li><li>Drawer and bottom sheet slide: slow (260ms), enter easing; exits use the exit easing.</li><li>Skeleton shimmer: deliberate (1.4s) loop; spinners 900ms per turn.</li><li>Tooltips wait 300ms before showing and hide immediately.</li></ul>"),
        build.section("accessibility", "<p>Under <code>prefers-reduced-motion: reduce</code> the duration tokens drop to 0.01ms, so transitions become instant without per-component media queries. Looping animations (spinner, shimmer, indeterminate progress) are switched off explicitly, and the loading text still says what is happening.</p>"),
        all_tokens_section("motion"),
    ]


def iconography() -> list[str]:
    sheet = "".join(f'<figure class="ds-icon"><svg class="icon icon--lg" viewBox="0 0 24 24" aria-hidden="true">{p}</svg><figcaption>{n}</figcaption></figure>' for n, p in ICONS.items())
    return [
        build.section("overview", "<p>Icons are Lucide-style outlines on a 24-unit grid with a 2px round stroke in <code>currentColor</code>, inlined as SVG with the <code>.icon</code> class. They support a label; they rarely replace one.</p>"),
        build.section("set", f'<p>Every icon the mocks use ({len(ICONS)}):</p><div class="ds-icon-grid">{sheet}</div>', "Icon set"),
        build.section("sizes", ex(icon("calendar-days", "icon--xs") + icon("calendar-days") + icon("calendar-days", "icon--md") + icon("calendar-days", "icon--lg"), "14 · 16 (default) · 18 · 20px"), "Sizes"),
        build.section("usage", "<ul><li>Decorative icons next to text are <code>aria-hidden=\"true\"</code>.</li><li>Icon-only buttons carry <code>aria-label</code> with the verb.</li><li>One icon means one thing: the cross-free map pin is a place, the flag is a report, the badge-check is vetted.</li><li>The brand seal is not an icon; see <a href=\"../components/brand-lockup.html\">Brand lockup</a>.</li></ul>"),
        all_tokens_section("iconography"),
    ]


def theming() -> list[str]:
    return [
        build.section("overview", "<p>Light is the default theme. Dark applies when the page sets <code>data-theme=\"dark\"</code> on <code>&lt;html&gt;</code>, or when the OS prefers dark and the page has not forced <code>data-theme=\"light\"</code>. Each theme sets <code>color-scheme</code> so native controls and scrollbars follow.</p>" + themes('<button class="btn btn--primary btn--sm" type="button">Register</button><span class="status status--published">Published</span><span class="chip" aria-pressed="true">All</span>')),
        build.section("tiers", """<table class="ds-table"><thead><tr><th scope="col">Tier</th><th scope="col">Example</th><th scope="col">Changed by</th></tr></thead><tbody>
<tr><td>Primitive</td><td><code>--palette-bordeaux-700: #6c1d36</code></td><td>A brand refresh</td></tr>
<tr><td>Semantic</td><td><code>--color-accent: var(--palette-bordeaux-700)</code></td><td>A theme (dark, a partner theme)</td></tr>
<tr><td>Component</td><td><code>--btn-bg: var(--color-accent)</code></td><td>A re-skin of one component</td></tr>
</tbody></table>""", "Token tiers"),
        build.section("adding", "<ol><li>Add <code>[data-theme=\"name\"] { … }</code> to <code>tokens.css</code>, overriding semantic tokens only.</li><li>Add the theme's pairs to <code>contrast-pairs.json</code> and run <code>check_contrast.py</code>.</li><li>Regenerate <code>tokens.json</code> with <code>tokens_to_json.py</code>.</li><li>Screenshot the component pages in the new theme.</li></ol>"
                      + pre('[data-theme="dark"] {\n  --color-bg-canvas: var(--palette-stone-950);\n  --color-accent: var(--palette-bordeaux-600);\n  color-scheme: dark;\n}'), "Adding a theme"),
        build.section("dark", "<p>Dark is built from roles, not by inverting light: surfaces rise from stone 950 to 850, the accent brightens one step so white labels still pass, text on blush-equivalent selected states uses rose, status backgrounds become deep tints with light text, the focus ring becomes borealis, and toasts invert to a light card.</p>", "How dark is built"),
        build.section("usage", "<ul><li>Never read a primitive in a component; never hard-code a colour.</li><li>The Angular app imports <code>tokens.css</code> once as a global foundation and reads tokens by role in each component's encapsulated stylesheet.</li><li><code>tokens/tokens.json</code> is the DTCG export (<code>$type</code>, <code>$value</code>, aliases as <code>{group.token}</code>, dark values under <code>$extensions</code>) for tooling and native platforms.</li><li>The theme toggle on these pages persists to <code>localStorage</code>; press <kbd>t</kbd> to switch.</li></ul>"),
    ]


def responsive() -> list[str]:
    return [
        build.section("overview", "<p>Every screen works from 320px up and is designed at 360, 768 and 1280px. Breakpoints add space and navigation; they never remove content.</p>"),
        build.section("components", """<table class="ds-table"><thead><tr><th scope="col">Component</th><th scope="col">Below the breakpoint</th><th scope="col">At or above</th></tr></thead><tbody>
<tr><td>Member navigation</td><td>Bottom tab bar (64px), labels under icons</td><td>md: links in the top bar</td></tr>
<tr><td>Admin navigation</td><td>Horizontal scroller under the brand</td><td>lg: 16rem sticky sidebar</td></tr>
<tr><td>Dialog</td><td>Bottom sheet, full width, 92dvh max</td><td>sm: centred, 32rem</td></tr>
<tr><td>Drawer</td><td>Full width</td><td>sm: 32rem from the right</td></tr>
<tr><td>Toasts</td><td>Full width above the tab bar</td><td>md: 24rem, bottom right</td></tr>
<tr><td>Tables</td><td>Scroll inside <code>.table-wrap</code> (min 40rem)</td><td>Fit</td></tr>
<tr><td>Forms</td><td>One column</td><td>sm: short related fields in two columns</td></tr>
<tr><td>Page head</td><td>Title, then actions below</td><td>sm: actions beside the title</td></tr>
<tr><td>Messages</td><td>List or thread, one at a time, with a back button</td><td>md: both side by side</td></tr>
<tr><td>Tabs, chip bars</td><td>Scroll horizontally; never wrap to two rows</td><td>Fit</td></tr>
</tbody></table>""", "Component behaviour"),
        build.section("touch", "<ul><li>Targets are at least 44 × 44px; small buttons, chips, tabs and links extend their hit area under <code>(pointer: coarse)</code> without changing their look.</li><li>Nothing relies on hover; hover only adds emphasis.</li><li>Fixed bottom bars sit above the safe area.</li></ul>", "Touch and pointer"),
        build.section("testing", "<p>Screenshot each page and mock at 360×800, 768×1024 and 1280×800 in both themes. Check: no horizontal page scroll, no clipped text, dialogs become sheets, navigation collapses, tables scroll inside their wrapper.</p>", "Testing matrix"),
    ]


def accessibility() -> list[str]:
    checklist = [
        "Text ≥ 4.5:1, large text and control edges ≥ 3:1, in both themes (checked by script).",
        "Status uses colour + icon + words; links in prose are underlined.",
        "Everything works by keyboard; DOM order is visual order; no positive tabindex.",
        "One shared focus ring, 2px at 2px offset, ≥ 3:1; borealis on dark surfaces.",
        "Targets ≥ 44 × 44px on touch (AGENTS.md), never below 24px.",
        "Skip link to #main and landmarks on every page; one h1; unique titles.",
        "Every control has a visible label; hints and errors are linked with aria-describedby; aria-invalid on errors; an error summary takes focus on submit.",
        "Dialogs trap focus, close on Esc and return focus; the page behind is inert.",
        "Toasts announce through a polite status region; errors use role=\"alert\" and never auto-dismiss.",
        "Reduced motion zeroes durations; loops stop.",
        "Faith details (home church) are optional and never required to use the product.",
        "User-supplied names and messages are rendered as text, never as HTML.",
    ]
    return [
        build.section("overview", "<p>The system targets WCAG 2.2 AA by construction. Each component page documents role, keyboard, focus, labelling, contrast, motion and touch; the checkers enforce the mechanical parts.</p>"),
        build.section("commitments", '<ul class="ds-checklist">' + "".join(f"<li>{c}</li>" for c in checklist) + "</ul>", "Commitments"),
        build.section("focus", ex('<button class="btn btn--primary" type="button" data-state="focus">Register</button><button class="btn btn--secondary" type="button" data-state="focus">Message</button><a class="text-link" href="#focus" data-state="focus">See all events</a>', "Forced focus states") + ex('<button class="btn btn--inverse btn--sm" type="button" data-state="focus">Suspend</button>', "Borealis ring on brand panels", mod="brand"), "Focus"),
        build.section("testing", "<ul><li><code>check_contrast.py</code> on every declared pair in both themes.</li><li><code>check_design_system.py</code> for labels, names, alt text, landmarks, headings and links.</li><li>Manual: tab through each page, screen reader on one dialog, one form and one table, zoom to 200% and 400%, emulate reduced motion and forced colours.</li><li>Product: Playwright accessibility sweeps on request (AGENTS.md).</li></ul>", "Testing"),
        all_tokens_section("accessibility", "Interaction tokens: target sizes, focus ring, control heights and state opacities."),
    ]


def content() -> list[str]:
    lib = [("Primary actions", "Register · Send request · Save changes · Sign in · Create a profile · Approve · Publish"),
           ("Secondary", "Cancel · Message · Decline · Back to events · Not now"),
           ("Busy", "Signing in… · Sending… · Saving… · Registering…"),
           ("Success", "You're registered · Request sent · Changes saved"),
           ("Errors", "Check your details · We couldn't load events. Try again. · That message didn't send. Retry"),
           ("Empty", "No events yet · Nothing matches those filters · No messages yet"),
           ("Counts", "142 going · 6 spots left · 3 applications waiting")]
    rows = "".join(f"<tr><td>{a}</td><td>{b}</td></tr>" for a, b in lib)
    return [
        build.section("overview", "<p>Warm, plain and encouraging; a friend from church who also coaches. Faith is welcome and never assumed: scripture appears in brand moments, not in errors or forms.</p>"),
        build.section("rules", """<ul>
<li>Sentence case everywhere, except display headings, which are styled uppercase from sentence-case source text.</li>
<li>Buttons start with a verb and name the object when needed.</li>
<li>Canadian English: "colour", "cancelled", "centre"; times as "7:00 PM", dates as "Sat, Apr 18".</li>
<li>Numbers as numerals with units: "6 spots left", "$10", "Free".</li>
<li>Error formula: what happened + what to do. "We couldn't send your request. Check your connection and try again."</li>
<li>Empty formula: what will be here + the first step. "No events yet. When the team posts one, it shows up here."</li>
<li>Never blame: "That email and password don't match", not "You entered the wrong password".</li>
</ul>""", "Rules"),
        build.section("library", f'<table class="ds-table"><thead><tr><th scope="col">Situation</th><th scope="col">Copy</th></tr></thead><tbody>{rows}</tbody></table>', "Microcopy library"),
        build.section("usage", '<p>See <a href="../patterns/content-and-tone.html">Content and tone</a> for the full pattern with examples.</p>'),
    ]


PAGES = {"color": color, "typography": typography, "spacing": spacing, "layout": layout, "elevation": elevation,
         "shape": shape, "motion": motion, "iconography": iconography, "theming": theming, "responsive": responsive,
         "accessibility": accessibility, "content": content}


def render(slug: str, name: str, lead: str) -> str:
    sections = PAGES[slug]()
    ids = re.findall(r'<section class="ds-section" id="([\w-]+)"', "".join(sections))
    head = build.header("Foundation", name, lead, ids, ["WCAG 2.2 AA"])
    return build.page(title=name, description=lead, header=head, body="\n".join(sections))
