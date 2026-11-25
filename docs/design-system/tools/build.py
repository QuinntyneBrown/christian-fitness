#!/usr/bin/env python3
"""Build the Christian Fitness design-system documentation site.

Every HTML page under docs/design-system/ (except nothing: all of them) is
generated from this folder so the shell, navigation, section order and token
tables stay identical across pages:

    tools/build.py          registry, shell, nav, section renderers (this file)
    tools/dslib.py          helpers the specs use (examples, state matrices, icons)
    tools/foundations.py    the twelve foundation pages; token tables come from tokens.css
    tools/components/*.py   one SPEC per component page
    tools/patterns/*.py     one SPEC per pattern page
    tools/index_page.py     index.html

Run, then verify:

    python3 docs/design-system/tools/build.py
    python3 .claude/skills/extracting-design-systems/scripts/check_design_system.py docs/design-system
    python3 .claude/skills/extracting-design-systems/scripts/check_contrast.py docs/design-system/tokens/tokens.css

Component SPEC keys (all required; a section that does not apply is
dslib.na("reason")):

    slug, name, group, lead, meta (list of pill texts)
    overview      HTML
    anatomy       {"figure": HTML, "callouts": [(left%, top%), ...], "parts": [(title, detail), ...]}
    variants      HTML (use dslib.ex for example frames)
    sizes         HTML | na(...)
    states        {"intro": HTML, "matrix": dslib.matrix(...), "themes": dslib.themes(...), "notes": HTML}
    responsive    HTML
    theming       HTML
    accessibility {"pattern", "focus", "labelling", "motion", "touch": HTML,
                   "keys": [(keys HTML, action), ...], "pairs": [(label, fg token, bg token, min), ...]}
    content       HTML
    dodont        [("do" | "dont", canvas HTML, caption), ...]   at least two pairs
    tokens        [(part, token | "--a / --b", "color" | "value"), ...]
    code          {"snippet": raw HTML, "classes": [(class or attribute HTML, effect), ...]}
    sources       {"mocks": [(path under docs/mocks without .html, note), ...], "drift": HTML}

Pattern SPEC keys: slug, name, lead, and HTML for overview, when, structure,
states, responsive, accessibility, content, do-dont (list like dodont above),
sources (same shape as above).
"""
from __future__ import annotations

import importlib.util
import re
import sys
from html import escape
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))

import dslib  # noqa: E402

PRODUCT = "Christian Fitness"
SITE = f"{PRODUCT} design system"
EXTRACTED = "2026-11-22"
UPDATED = "2026-11-25"
VERIFICATION = """Run on 2026-11-25, after adding the pages for the new mocks:

- `check_contrast.py`: 174 pairs passed in light and dark, 0 failed.
- `check_design_system.py`: 96 pages (75 components, 8 patterns, 12 foundations, index), 0 errors, 0 warnings.
- `check_mocks.py docs/mocks`: no new errors; the 25 it reports came with the mocks (see Drift).
- Horizontal overflow (Playwright, all 96 pages and every page and dialog mock at 360 and 1280px): none, except the two Google join mocks listed under Drift.
- Screenshots reviewed at 360 and 1280px in both themes for every new and changed component page.

Earlier run, 2026-11-22: 170 pairs passed; 67 pages; 28 screens and 131 mocks, 0 errors; screenshots of button, dialog, text-field, event-card and color."""

FOUNDATIONS = [
    ("color", "Color", "Brand bordeaux and borealis, warm stone neutrals, status colours and every contrast pair."),
    ("typography", "Typography", "Barlow and Barlow Condensed, the type scale, roles and measure."),
    ("spacing", "Spacing", "The 4px scale, half steps inside components, inside versus between."),
    ("layout", "Layout", "Breakpoints, columns, gutters, margins, containers and page templates."),
    ("elevation", "Elevation", "Shadow levels, surface hierarchy and z-order."),
    ("shape", "Shape", "Radii from keys to cards, and border widths."),
    ("motion", "Motion", "Durations, easings, choreography and reduced motion."),
    ("iconography", "Iconography", "Lucide-style 24-unit icons, sizes and labelling."),
    ("theming", "Theming", "Light and dark themes, token tiers and tokens.json."),
    ("responsive", "Responsive", "Mobile first: what each component does at each breakpoint."),
    ("accessibility", "Accessibility", "WCAG 2.2 AA commitments, interaction tokens and testing."),
    ("content", "Content", "Voice, sentence case, numbers, dates and the microcopy library."),
]

COMPONENT_GROUPS = ["Actions", "Inputs", "Navigation", "Containers and overlays", "Data display", "Feedback", "Brand"]

COMPONENTS = [
    # Actions
    ("button", "Button", "Actions", "Primary, secondary, ghost, danger, link and brand-panel buttons; icon buttons."),
    ("link", "Link", "Actions", "Inline, text and back links; external links."),
    ("menu", "Menu", "Actions", "A menu button that opens a list of actions."),
    ("google-button", "Google button", "Actions", "Continue with Google: Google's mark and wording on a neutral surface."),
    ("follow-button", "Follow button", "Actions", "A toggle that follows or unfollows a directory listing."),
    # Inputs
    ("text-field", "Text field", "Inputs", "Text, e-mail, password, search and one-time code inputs."),
    ("textarea", "Textarea", "Inputs", "Multi-line text with optional counter."),
    ("file-field", "File field", "Inputs", "Chooses one file, shows its name and lets people remove it."),
    ("select", "Select", "Inputs", "Native select for choosing one option."),
    ("checkbox", "Checkbox", "Inputs", "Single and grouped checkboxes."),
    ("radio-group", "Radio group", "Inputs", "One choice from a short list; list or card style."),
    ("switch", "Switch", "Inputs", "An on/off setting that applies immediately."),
    ("segmented-control", "Segmented control", "Inputs", "Two or three views of one list, switched in place."),
    ("choice-card", "Choice card", "Inputs", "Radio choices drawn as cards or chips, in a grid."),
    ("plan-option", "Plan option", "Inputs", "How to take part in a series: the whole program or single dates."),
    ("dropzone", "Dropzone", "Inputs", "A drop target and button for adding one image."),
    ("preference-row", "Preference row", "Inputs", "A setting with its explanation and a switch, in grouped lists."),
    ("form-field", "Form field", "Inputs", "Label, control, hint and error: the wrapper every input uses."),
    ("form-layout", "Form layout", "Inputs", "Field stacks, two-column rows, error summary and submit states."),
    # Navigation
    ("top-bar", "Top bar", "Navigation", "Member app header, public site header and their mobile forms."),
    ("tab-bar", "Tab bar", "Navigation", "Bottom navigation for the member app on phones."),
    ("bell", "Bell", "Navigation", "The member top bar's link to Notifications with the unread count."),
    ("sidebar-navigation", "Sidebar navigation", "Navigation", "The admin console sidebar with counts."),
    ("masthead", "Masthead", "Navigation", "The news front page's nameplate, date line and section navigation."),
    ("side-navigation", "Side navigation", "Navigation", "In-page section links for Preferences and the legal pages."),
    ("steps", "Steps", "Navigation", "What happens next, as a short numbered list after a form is sent."),
    ("tabs", "Tabs", "Navigation", "Underline tabs with counts for filtered views."),
    ("breadcrumb", "Breadcrumb", "Navigation", "Where a page sits; collapses to the parent on phones."),
    ("pagination", "Pagination", "Navigation", "Numbered and previous/next paging for long lists."),
    ("skip-link", "Skip link", "Navigation", "The first focusable element on every page."),
    ("footer", "Footer", "Navigation", "The public site footer."),
    # Containers and overlays
    ("card", "Card", "Containers and overlays", "Surfaces for grouped content; event, list and stat cards."),
    ("dialog", "Dialog", "Containers and overlays", "Modal dialogs that become bottom sheets on phones."),
    ("drawer", "Drawer", "Containers and overlays", "Side panels for editing without leaving the list."),
    ("save-bar", "Save bar", "Containers and overlays", "A sticky bar that holds unsaved changes and their Save action."),
    ("section-heading", "Section heading", "Containers and overlays", "Page heads, ruled section titles and eyebrows."),
    ("newsletter-box", "Newsletter box", "Containers and overlays", "Subscribe and join call-outs on the front page, stories and Subscribe."),
    ("review-card", "Review card", "Containers and overlays", "Admin side panels: review, send, summary and settings cards."),
    ("prose", "Prose", "Containers and overlays", "Long-form legal text with a plain-language summary."),
    ("tooltip", "Tooltip", "Containers and overlays", "Short labels for icon-only controls."),
    ("accordion", "Accordion", "Containers and overlays", "Show and hide sections with details and summary."),
    ("divider", "Divider", "Containers and overlays", "Hairline rules between content."),
    ("layout", "Layout primitives", "Containers and overlays", "Container, split, grid, stack and cluster."),
    # Data display
    ("table", "Table", "Data display", "Admin data tables that scroll inside their wrapper."),
    ("list", "List", "Data display", "Event rows, person rows, conversations and divided lists."),
    ("description-list", "Description list", "Data display", "Key-value facts and spec lists."),
    ("avatar", "Avatar", "Data display", "Initials, photos, group avatars and stacks."),
    ("badge", "Badge", "Data display", "Status pills, counts and unread dots."),
    ("chip", "Chip", "Data display", "Filter chips, interest toggles and tags."),
    ("stat", "Stat", "Data display", "Numbers that matter: stat hero, stat tiles and fill meters."),
    ("event-card", "Event card", "Data display", "The event summary card with image, date badge and seats."),
    ("message", "Message", "Data display", "Chat bubbles, day separators and the composer."),
    ("date-badge", "Date badge", "Data display", "Month and day tiles used across event surfaces."),
    ("story", "Story", "Data display", "Lead story, headlines, river rows, ranked lists and story cards."),
    ("issue", "Newsletter issue", "Data display", "An issue of the newsletter on the web and its preview."),
    ("feed-list", "Feed list", "Data display", "RSS feeds with their addresses and a copy action."),
    ("series-card", "Series card", "Data display", "Event series rows, the series summary, its panel and progress."),
    ("session-list", "Session list", "Data display", "The dated sessions of a series with their state and seat meter."),
    ("host-card", "Host card", "Data display", "Who hosts an event, and what a listing is hosting."),
    ("listing-row", "Listing row", "Data display", "Directory listings: mark, name, kind, verified mark and profile head."),
    ("editor", "Story editor", "Data display", "The admin writing surface with its notes and side panels."),
    ("pick-list", "Pick list", "Data display", "Choose stories, events and sessions for an issue or a post."),
    ("pick-art", "Pick art", "Data display", "Community Pick artwork in each size, captions and the Slack preview."),
    ("suggestion", "Suggestion", "Data display", "A suggested listing with the four checks staff record."),
    ("feedback-row", "Feedback row", "Data display", "Feedback inbox rows, kinds, the detail and what was said."),
    ("notification-row", "Notification row", "Data display", "One notification in the inbox: kind, title, text, time and unread."),
    # Feedback
    ("toast", "Toast", "Feedback", "Short-lived notices with optional action."),
    ("alert", "Alert", "Feedback", "Inline alerts and error summaries inside forms and pages."),
    ("banner", "Banner", "Feedback", "Page-level notices under the header."),
    ("inline-message", "Inline message", "Feedback", "Field hints, field errors and inline retry messages."),
    ("sso-notice", "Sign-in notice", "Feedback", "Which account is signing in, and notes about Google sign-in."),
    ("progress-bar", "Progress bar", "Feedback", "Determinate and indeterminate progress, and meters."),
    ("spinner", "Spinner", "Feedback", "Busy indicators inside buttons and regions."),
    ("skeleton", "Skeleton", "Feedback", "Placeholders that mirror the layout while loading."),
    ("empty-state", "Empty state", "Feedback", "First-run, no-results and nothing-yet states."),
    ("error-page", "Error page", "Feedback", "404, 403, 500 and offline pages."),
    # Brand
    ("brand-lockup", "Brand lockup", "Brand", "The seal and wordmark in every size."),
]

PATTERNS = [
    ("forms", "Forms", "Layout, validation timing, error summary, submit and success states."),
    ("feedback-and-loading", "Feedback and loading", "Which feedback for which action; skeleton vs spinner; undo."),
    ("empty-and-error-states", "Empty and error states", "Copy formulas and when to use which."),
    ("navigation", "Navigation and page structure", "Shells, page headers, back links and tabs."),
    ("dialogs-and-overlays", "Dialogs and overlays", "Dialog vs drawer vs page; stacking; mobile sheets."),
    ("tables-and-lists", "Tables and lists", "Density, filters, bulk actions and responsive strategy."),
    ("notifications", "Notifications", "Toast vs banner vs inline; priority and dismissal."),
    ("content-and-tone", "Content and tone", "Voice, faith language, verbs, numbers and microcopy."),
]

SECTION_TITLES = {
    "overview": "Overview", "anatomy": "Anatomy", "variants": "Variants", "sizes": "Sizes", "states": "States",
    "responsive": "Responsive behaviour", "theming": "Theming", "accessibility": "Accessibility", "content": "Content",
    "do-dont": "Do and don't", "tokens": "Tokens", "code": "Code", "sources": "Sources",
    "when": "When to use", "structure": "Structure", "usage": "Usage",
}
TOC_TITLES = dict(SECTION_TITLES, responsive="Responsive", accessibility="Accessibility")


# ---------------------------------------------------------------------------
# Shell
# ---------------------------------------------------------------------------
def nav(prefix: str) -> str:
    def items(folder: str, entries) -> str:
        return "".join(f'<li><a href="{prefix}{folder}/{slug}.html">{name}</a></li>' for slug, name, *_ in entries)

    comps = []
    for group in COMPONENT_GROUPS:
        entries = [c for c in COMPONENTS if c[2] == group]
        comps.append(f'<li class="ds-nav__group">{group}</li>{items("components", entries)}')
    return f"""<nav class="ds-nav" aria-label="Design system">
    <div class="ds-nav__brand"><a href="{prefix}index.html">{PRODUCT} DS</a><button class="ds-theme-toggle" type="button" aria-pressed="false">☾ Dark</button></div>
    <details open><summary>Foundations</summary><ul>{items("foundations", FOUNDATIONS)}</ul></details>
    <details open><summary>Components</summary><ul>{"".join(comps)}</ul></details>
    <details open><summary>Patterns</summary><ul>{items("patterns", PATTERNS)}</ul></details>
  </nav>"""


def page(*, title: str, description: str, header: str, body: str, depth: int = 1) -> str:
    prefix = "../" * depth
    return f"""<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)} — {SITE}</title>
<meta name="description" content="{escape(description)}">
<link rel="stylesheet" href="{prefix}tokens/tokens.css">
<link rel="stylesheet" href="{prefix}assets/components.css">
<link rel="stylesheet" href="{prefix}assets/ds.css">
</head>
<body id="top">
<a class="skip-link" href="#main">Skip to content</a>
<div class="ds-shell">
  {nav(prefix)}
  <main id="main" class="ds-main">
{header}
{body}
    <footer class="ds-footer"><span>{SITE} · extracted from <a href="{prefix}../mocks/index.html">docs/mocks</a> on {EXTRACTED}</span><a href="#top">Back to top</a></footer>
  </main>
</div>
<script src="{prefix}assets/ds.js"></script>
</body>
</html>
"""


def header(kicker: str, title: str, lead: str, sections: list[str], meta: list[str] | None = None) -> str:
    pills = ""
    if meta:
        pills = '<div class="ds-meta">' + "".join(
            f'<span class="ds-pill{" ds-pill--ok" if m.startswith("WCAG") else ""}">{m}</span>' for m in meta) + "</div>"
    toc = "".join(f'<li><a href="#{s}">{TOC_TITLES.get(s, s.replace("-", " ").capitalize())}</a></li>' for s in sections)
    return f"""    <header class="ds-header">
      <p class="ds-kicker">{kicker}</p>
      <h1>{title}</h1>
      <p class="ds-lead">{lead}</p>
      {pills}
      <ul class="ds-toc">{toc}</ul>
    </header>"""


def section(sid: str, inner: str, title: str | None = None) -> str:
    t = title or SECTION_TITLES.get(sid, sid)
    if isinstance(inner, dict) and "na" in inner:
        reason = escape(inner["na"])
        return (f'    <section class="ds-section" id="{sid}" data-na="{reason}"><h2><a href="#{sid}">{t}</a></h2>'
                f'<p class="ds-na">{inner["na"]}</p></section>')
    return f'    <section class="ds-section" id="{sid}"><h2><a href="#{sid}">{t}</a></h2>\n{inner}\n    </section>'


def swatch_cell(token: str, theme: str) -> str:
    return (f'<span class="ds-swatch-cell" data-theme="{theme}"><i data-token="{token}" data-swatch></i>'
            f'<span data-token="{token}"></span></span>')


def token_rows(rows: list[tuple[str, str, str]]) -> str:
    out = []
    for part, tokens, kind in rows:
        names = [t.strip() for t in tokens.split("/")]
        code = " / ".join(f"<code>{n}</code>" for n in names)
        if kind == "color":
            light = " ".join(swatch_cell(n, "light") for n in names)
            dark = " ".join(swatch_cell(n, "dark") for n in names)
            out.append(f"<tr><td>{part}</td><td>{code}</td><td>{light}</td><td>{dark}</td></tr>")
        else:
            vals = " / ".join(f'<span data-token="{n}"></span>' for n in names)
            out.append(f'<tr><td>{part}</td><td>{code}</td><td colspan="2">{vals}</td></tr>')
    return ('<div class="ds-table-wrap"><table class="ds-table"><thead><tr><th scope="col">Part</th><th scope="col">Token</th>'
            f'<th scope="col">Light</th><th scope="col">Dark</th></tr></thead><tbody>{"".join(out)}</tbody></table></div>')


def dodont(items: list[tuple[str, str, str]]) -> str:
    figs = []
    for kind, canvas, caption in items:
        cls = "ds-do" if kind == "do" else "ds-dont"
        figs.append(f'<figure class="{cls}"><div class="ds-example__canvas">{canvas}</div><figcaption>{caption}</figcaption></figure>')
    return f'<div class="ds-dodont">{"".join(figs)}</div>'


def sources(src: dict) -> str:
    lis = []
    for path, note in src["mocks"]:
        target = ROOT.parent / "mocks" / f"{path}.html"
        if not target.exists():
            raise SystemExit(f"source mock does not exist: docs/mocks/{path}.html")
        lis.append(f'<li><a href="../../mocks/{path}.html">{path}</a>{f" ({note})" if note else ""}</li>')
    listing = f"<p>Extracted from these mocks:</p><ul>{''.join(lis)}</ul>" if lis else "<p>No mock uses this component yet; it is part of the core set every product needs and follows the same tokens and conventions.</p>"
    return f"{listing}<p><b>Drift fixed during extraction:</b> {src['drift']}</p>"


# ---------------------------------------------------------------------------
# Component and pattern pages
# ---------------------------------------------------------------------------
COMPONENT_SECTIONS = ["overview", "anatomy", "variants", "sizes", "states", "responsive", "theming", "accessibility",
                      "content", "do-dont", "tokens", "code", "sources"]
PATTERN_SECTIONS = ["overview", "when", "structure", "states", "responsive", "accessibility", "content", "do-dont", "sources"]


def anatomy(a: dict) -> str:
    calls = "".join(f'<span class="ds-callout" style="left: {x}%; top: {y}%;" aria-hidden="true">{i}</span>'
                    for i, (x, y) in enumerate(a["callouts"], 1))
    parts = "".join(f"<li><div><b>{t}</b><small>{d}</small></div></li>" for t, d in a["parts"])
    return (f'<div class="ds-anatomy"><figure class="ds-anatomy__figure">{a["figure"]}{calls}</figure>'
            f'<ol class="ds-anatomy__list">{parts}</ol></div>')


def states(s: dict) -> str:
    return (f'{s.get("intro", "")}{s["matrix"]}<h3>Both themes</h3>{s["themes"]}{s.get("notes", "")}')


def accessibility(a: dict) -> str:
    keys = "".join(f"<tr><td>{k}</td><td>{v}</td></tr>" for k, v in a["keys"])
    pairs = "".join(
        f'<div class="ds-pair"><span>{label}</span><span class="ds-pair__ratio" data-contrast="{fg}|{bg}" data-min="{m}"></span></div>'
        for label, fg, bg, m in a["pairs"])
    return f"""<h3>Role and pattern</h3>{a["pattern"]}
<h3>Keyboard</h3><table class="ds-table ds-keys"><thead><tr><th scope="col">Key</th><th scope="col">Action</th></tr></thead><tbody>{keys}</tbody></table>
<h3>Focus</h3>{a["focus"]}
<h3>Labelling</h3>{a["labelling"]}
<h3>Contrast</h3><div class="ds-pairs">{pairs}</div>
<h3>Motion</h3>{a["motion"]}
<h3>Touch</h3>{a["touch"]}"""


def code_section(c: dict) -> str:
    rows = "".join(f"<tr><td>{k}</td><td>{v}</td></tr>" for k, v in c["classes"])
    return (f'{dslib.pre(c["snippet"])}<table class="ds-table"><thead><tr><th scope="col">Class / attribute</th>'
            f'<th scope="col">Effect</th></tr></thead><tbody>{rows}</tbody></table>')


def render_component(spec: dict) -> str:
    body = {
        "overview": spec["overview"],
        "anatomy": anatomy(spec["anatomy"]) if "na" not in spec["anatomy"] else spec["anatomy"],
        "variants": spec["variants"],
        "sizes": spec["sizes"],
        "states": states(spec["states"]) if "na" not in spec["states"] else spec["states"],
        "responsive": spec["responsive"],
        "theming": spec["theming"],
        "accessibility": accessibility(spec["accessibility"]),
        "content": spec["content"],
        "do-dont": dodont(spec["dodont"]),
        "tokens": token_rows(spec["tokens"]),
        "code": code_section(spec["code"]),
        "sources": sources(spec["sources"]),
    }
    meta = ["WCAG 2.2 AA"] + spec.get("meta", [])
    head = header(f"Component · {spec['group']}", spec["name"], spec["lead"], COMPONENT_SECTIONS, meta)
    sections = "\n".join(section(s, body[s]) for s in COMPONENT_SECTIONS)
    return page(title=spec["name"], description=re.sub("<[^>]+>", "", spec["lead"]), header=head, body=sections)


def render_pattern(spec: dict) -> str:
    body = dict(spec)
    body["do-dont"] = dodont(spec["do-dont"])
    body["sources"] = sources(spec["sources"])
    head = header("Pattern", spec["name"], spec["lead"], PATTERN_SECTIONS, ["WCAG 2.2 AA"])
    sections = "\n".join(section(s, body[s]) for s in PATTERN_SECTIONS)
    return page(title=spec["name"], description=re.sub("<[^>]+>", "", spec["lead"]), header=head, body=sections)


def load(folder: str, slug: str):
    path = HERE / folder / f"{slug.replace('-', '_')}.py"
    if not path.exists():
        return None
    mod_spec = importlib.util.spec_from_file_location(f"{folder}.{slug}", path)
    module = importlib.util.module_from_spec(mod_spec)
    mod_spec.loader.exec_module(module)
    return module.SPEC


def write(rel: str, html: str) -> None:
    target = ROOT / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(html, encoding="utf-8")


def main() -> int:
    import foundations
    import index_page

    missing = []
    failed: list[str] = []
    for slug, name, group, _ in COMPONENTS:
        try:
            spec = load("components", slug)
        except Exception as error:  # report and keep building the other pages
            print(f"ERROR components/{slug}: {type(error).__name__}: {error}")
            failed.append(slug)
            continue
        if spec is None:
            missing.append(f"components/{slug}")
            continue
        spec.setdefault("slug", slug)
        spec.setdefault("name", name)
        spec.setdefault("group", group)
        write(f"components/{slug}.html", render_component(spec))
    for slug, name, _ in PATTERNS:
        try:
            spec = load("patterns", slug)
        except Exception as error:
            print(f"ERROR patterns/{slug}: {type(error).__name__}: {error}")
            failed.append(slug)
            continue
        if spec is None:
            missing.append(f"patterns/{slug}")
            continue
        spec.setdefault("name", name)
        write(f"patterns/{slug}.html", render_pattern(spec))
    for slug, name, lead in FOUNDATIONS:
        write(f"foundations/{slug}.html", foundations.render(slug, name, lead))
    write("index.html", index_page.render())
    import readme
    write("README.md", readme.render())
    if missing:
        print("not yet written: " + ", ".join(missing))
    print(f"built {len(COMPONENTS) - len([m for m in missing if m.startswith('components')])} components, "
          f"{len(PATTERNS) - len([m for m in missing if m.startswith('patterns')])} patterns, {len(FOUNDATIONS)} foundations")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
