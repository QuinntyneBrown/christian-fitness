"""Helpers shared by the design-system page specs.

Component specs (tools/components/<slug>.py) and pattern specs
(tools/patterns/<slug>.py) import from here. Markup for product components is
the same markup the mocks use: brand, icon and form helpers come straight from
docs/mocks/tools/cf_ui.py so the two never drift.
"""
from __future__ import annotations

import sys
from html import escape
from pathlib import Path

HERE = Path(__file__).resolve().parent
MOCK_TOOLS = HERE.parent.parent / "mocks" / "tools"
sys.path.insert(0, str(MOCK_TOOLS))

import cf_ui  # noqa: E402

cf_ui.ASSETS = "../../mocks/assets"  # images resolve from docs/design-system/<folder>/

icon = cf_ui.icon
seal = cf_ui.seal
avatar = cf_ui.avatar
image = cf_ui.image
ICONS = cf_ui.ICONS

__all__ = ["esc", "icon", "seal", "avatar", "image", "ex", "matrix", "themes", "pre", "kbd", "mock", "na",
           "INTERACTIVE", "ICONS", "cf_ui"]


def esc(text: str) -> str:
    return escape(text, quote=False)


def pre(code: str) -> str:
    """A code block; `code` is raw HTML/CSS that gets escaped."""
    return f"<pre><code>{esc(code.strip())}</code></pre>"


def kbd(*keys: str) -> str:
    return " + ".join(f"<kbd>{k}</kbd>" for k in keys)


def ex(canvas: str, caption: str = "", code: str | bool | None = None, mod: str = "") -> str:
    """An example frame. `code=True` reuses the canvas markup as the HTML snippet.

    mod: "stack" (column layout), "canvas" (page background), "inverse", or a
    space-separated combination.
    """
    mods = "".join(f" ds-example__canvas--{m}" for m in mod.split()) if mod else ""
    cap = f'<div class="ds-example__caption"><span>{caption}</span></div>' if caption else ""
    snippet = canvas if code is True else code
    code_html = (f'<details class="ds-example__code"><summary>HTML</summary>{pre(snippet)}</details>'
                 if snippet else "")
    return f'<div class="ds-example"><div class="ds-example__canvas{mods}">{canvas}</div>{cap}{code_html}</div>'


# Column presets for state matrices: (label, attribute string inserted at {a}).
INTERACTIVE = [
    ("Default", ""),
    ("Hover", ' data-state="hover"'),
    ("Focus", ' data-state="focus"'),
    ("Active", ' data-state="active"'),
    ("Disabled", " disabled"),
]


def matrix(columns: list[tuple[str, str]], rows: list[tuple]) -> str:
    """State matrix: variants down, states across.

    rows: (label, template) or (label, template, {column label: attr override}).
    The template contains `{a}` where the column's attribute goes. An override
    of None renders an em dash (state does not exist for this variant).
    """
    head = "".join(f'<th scope="col">{label}</th>' for label, _ in columns)
    body = []
    for row in rows:
        label, template = row[0], row[1]
        overrides = row[2] if len(row) > 2 else {}
        cells = []
        for col, attr in columns:
            a = overrides.get(col, attr)
            cells.append("<td>—</td>" if a is None else f"<td>{template.replace('{a}', a)}</td>")
        body.append(f'<tr><th scope="row">{label}</th>{"".join(cells)}</tr>')
    return (f'<div class="ds-matrix"><table><thead><tr><th scope="col">Variant</th>{head}</tr></thead>'
            f'<tbody>{"".join(body)}</tbody></table></div>')


def themes(inner: str, mod: str = "") -> str:
    """The same markup in the light and dark theme, side by side."""
    cls = "ds-example__canvas" + ("".join(f" ds-example__canvas--{m}" for m in mod.split()) if mod else "")
    return ('<div class="ds-themes">'
            f'<div data-theme="light"><div class="{cls} ds-flush">{inner}</div></div>'
            f'<div data-theme="dark"><div class="{cls} ds-flush">{inner}</div></div></div>')


def mock(path: str, note: str = "") -> tuple[str, str]:
    """A source mock, as a path under docs/mocks without .html (e.g. 'pages/events/default')."""
    return (path, note)


def na(reason: str) -> dict:
    """Mark a component section as not applicable."""
    return {"na": reason}
