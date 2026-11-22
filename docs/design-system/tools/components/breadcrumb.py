from dslib import ex, icon, kbd, matrix, themes


def crumbs(label, items, collapsible=True):
    cls = ' class="breadcrumb--collapsible"' if collapsible else ""
    li = []
    *parents, last = items
    for t in parents:
        li.append(f'<li class="breadcrumb__item"><a class="breadcrumb__link" href="#top">{t}</a></li>')
    li.append(f'<li class="breadcrumb__item"><a class="breadcrumb__link" href="#top" aria-current="page">{last}</a></li>')
    if collapsible and parents:
        li.append(f'<li class="breadcrumb__item--parent-only"><a class="breadcrumb__link" href="#top">'
                  f'{icon("arrow-left")}{parents[-1]}</a></li>')
    return f'<nav{cls} aria-label="{label}"><ol class="breadcrumb__list">{"".join(li)}</ol></nav>'


EV = ["Events", "Sunrise Run Club"]
ADM = ["Admin", "Services", "Danielle Okafor"]

SPEC = {
    "lead": "A breadcrumb shows where a page sits and gives one step back up; on phones it shrinks to the parent.",
    "meta": ["Status: proposed", "<code>&lt;nav&gt;</code> + <code>&lt;ol&gt;</code>", "No mock yet"],
    "overview": """<p>Use a breadcrumb on pages two or more levels deep, where the back link alone would lose the trail: an admin listing inside Services, an event inside Events. The last item is the current page with <code>aria-current="page"</code>.</p>
<ul>
<li>Use a <a href="link.html">back link</a> when there is only one level up (the mocks do this today on event detail).</li>
<li><code>.breadcrumb--collapsible</code> shows only "← Parent" below 768px.</li>
<li>Never use it as the main navigation or for steps in a process.</li>
</ul>""",
    "anatomy": {
        "figure": crumbs("Breadcrumb, anatomy", ADM, False),
        "callouts": [(5, 30), (19, 30), (55, 30)],
        "parts": [
            ("Ancestor link", "14px semibold muted link, 44px tall hit area."),
            ("Separator", "A \"/\" drawn by CSS in <code>--color-fg-subtle</code>, never read aloud."),
            ("Current page", "Last item, <code>aria-current=\"page\"</code>, default colour, no underline."),
        ],
    },
    "variants": ex(crumbs("Breadcrumb, example 1", EV), "Two levels, collapsible.", True)
    + ex(crumbs("Breadcrumb, example 2", ADM, False), "Three levels, always full.", True),
    "sizes": "<p>One size: 14px (<code>--font-size-sm</code>).</p>",
    "states": {
        "intro": "<p>Ancestors are links with hover, focus and active; the current item is a link with <code>aria-current</code>.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'), ("Current", ' aria-current="page"')], [
            ("Link", '<a class="breadcrumb__link" href="#top"{a}>Services</a>'),
        ]),
        "themes": themes(crumbs("Breadcrumb, theme example", ADM, False)),
        "notes": "<ul><li>Hover underlines and darkens the link.</li><li>The current item keeps no underline on hover.</li><li>No disabled state: an ancestor you cannot open is left out.</li></ul>",
    },
    "responsive": "<ul><li>Below 768px <code>.breadcrumb--collapsible</code> hides every item but a \"← Parent\" link.</li><li>Above, items wrap rather than truncate.</li></ul>",
    "theming": "<p>Reads <code>--color-fg-muted</code>, <code>--color-fg-default</code> and <code>--color-fg-subtle</code>; dark theme swaps them.</p>",
    "accessibility": {
        "pattern": '<p><a href="https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/">APG Breadcrumb</a>: <code>&lt;nav aria-label="Breadcrumb"&gt;</code> around an ordered list; separators are CSS so they are not announced.</p>',
        "keys": [(kbd("Tab"), "Moves through the links."), (kbd("Enter"), "Follows the link.")],
        "focus": "<p>Shared ring with a 2px radius (<code>--radius-xs</code>).</p>",
        "labelling": "<p>The nav is labelled \"Breadcrumb\". The collapsed parent link reads \"Events\"; its arrow icon is hidden.</p>",
        "pairs": [("Ancestor", "--color-fg-muted", "--color-bg-canvas", 4.5), ("Current", "--color-fg-default", "--color-bg-canvas", 4.5)],
        "motion": "<p>None.</p>",
        "touch": "<p>Every link has a 44px minimum height (<code>--target-min</code>).</p>",
    },
    "content": "<ul><li>Use each page's own title, shortened only if the title is a sentence.</li><li>Do not repeat the current page title as a heading right beside it in a different form.</li></ul>",
    "dodont": [
        ("do", crumbs("Breadcrumb, do example 1", ADM, False), "Shows depth for an admin listing."),
        ("dont", crumbs("Breadcrumb, don't example 1", ["Home", "Events"], False), "One level up: use a back link."),
        ("do", crumbs("Breadcrumb, do example 2", EV), "Current page marked with <code>aria-current</code>."),
        ("dont", crumbs("Breadcrumb, don't example 2", ["Details", "Ticket", "Confirm"], False), "Process steps are not a hierarchy."),
    ],
    "tokens": [
        ("Link / hover", "--color-fg-muted / --color-fg-default", "color"),
        ("Separator", "--color-fg-subtle", "color"),
        ("Size", "--font-size-sm", "value"),
        ("Hit height", "--target-min", "value"),
        ("Focus radius", "--radius-xs", "value"),
    ],
    "code": {
        "snippet": '''<nav class="breadcrumb--collapsible" aria-label="Breadcrumb">
  <ol class="breadcrumb__list">
    <li class="breadcrumb__item"><a class="breadcrumb__link" href="/events">Events</a></li>
    <li class="breadcrumb__item"><a class="breadcrumb__link" href="/events/sunrise-run" aria-current="page">Sunrise Run Club</a></li>
    <li class="breadcrumb__item--parent-only"><a class="breadcrumb__link" href="/events">…Events</a></li>
  </ol>
</nav>''',
        "classes": [
            ("<code>.breadcrumb__list</code> <code>.breadcrumb__item</code> <code>.breadcrumb__link</code>", "List, item with CSS separator, link."),
            ("<code>.breadcrumb--collapsible</code> <code>.breadcrumb__item--parent-only</code>", "Collapse to the parent below 768px."),
            ("<code>aria-current=\"page\"</code>", "Current page."),
        ],
    },
    "sources": {"mocks": [], "drift": "No mock uses a breadcrumb; the screens use back links. Added from the core component set for deeper admin pages."},
}
