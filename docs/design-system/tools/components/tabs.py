from dslib import ex, kbd, matrix, mock, themes


def tabs(label, items, cur=0):
    out = []
    for i, (text, n) in enumerate(items):
        c = ' aria-current="page"' if i == cur else ""
        count = f' <span class="tabs__count">{n}</span>' if n is not None else ""
        out.append(f'<a class="tabs__tab" href="#top"{c}>{text}{count}</a>')
    return f'<nav class="tabs" aria-label="{label}">{"".join(out)}</nav>'


EVENTS = [("All", 5), ("Published", 4), ("Draft", 1)]
MEMBERS = [("All", None), ("Active", None), ("Flagged", None), ("Suspended", None)]

SPEC = {
    "lead": "Tabs switch between filtered views of one list, like published and draft events, and show how many are in each.",
    "meta": ["Status: stable", "<code>&lt;nav&gt;</code> of links", "Underline style"],
    "overview": """<p>Tabs sit under an admin page head and filter the table below it. Each tab is a link to a URL for that filter, so a filtered view can be bookmarked, shared and reached with Back. The current tab has a bordeaux underline and <code>aria-current="page"</code>.</p>
<ul>
<li>Use tabs for two to five mutually exclusive filters of the same list: All, Published, Draft.</li>
<li>Add counts (<code>.tabs__count</code>) when the numbers help someone decide where to look.</li>
<li>Use <a href="chip.html">filter chips</a> when filters combine, and the <a href="sidebar-navigation.html">sidebar</a> for separate sections.</li>
<li>These are navigation tabs, not an ARIA tablist; there are no in-page panels.</li>
</ul>""",
    "anatomy": {
        "figure": tabs("Filter events, anatomy", EVENTS),
        "callouts": [(4, 30), (14, 30), (8, 92), (50, 98)],
        "parts": [
            ("Tab label", "15px semibold, muted until current; the link's name."),
            ("Count", "<code>.tabs__count</code>, muted numeral after the label, part of the name (\"Published 4\")."),
            ("Current indicator", "2px <code>--color-accent</code> underline, overlapping the rule."),
            ("Rule", "Hairline <code>--color-border-default</code> across the full width."),
        ],
    },
    "variants": ex(tabs("Filter events, example", EVENTS), "With counts (admin events).", True, mod="stack")
    + ex(tabs("Filter members, example", MEMBERS), "Without counts (admin members).", True, mod="stack"),
    "sizes": "<p>One size: 15px labels, 24px apart, 12px above the underline.</p>",
    "states": {
        "intro": "<p>Tabs are links. Current is <code>aria-current=\"page\"</code>, shown by the underline and a darker label, so colour is not the only signal.</p>",
        "matrix": matrix([("Default", ""), ("Focus", ' data-state="focus"'), ("Current", ' aria-current="page"')], [
            ("Tab", '<a class="tabs__tab" href="#top"{a}>Published <span class="tabs__count">4</span></a>'),
        ]),
        "themes": themes(tabs("Filter events, theme example", EVENTS, 1), "stack"),
        "notes": """<ul>
<li><b>Hover</b> darkens the label to <code>--color-fg-default</code>; not forced here because the stylesheet has no <code>data-state="hover"</code> hook for tabs.</li>
<li>While the table loads, tabs stay usable and the counts stay put; the table shows a skeleton.</li>
<li>A tab with a zero count still shows ("Draft 0") so the set never jumps.</li>
</ul>""",
    },
    "responsive": "<ul><li>The row scrolls sideways (scrollbar hidden) when it does not fit; tabs never wrap or truncate.</li><li>Keep the current tab visible: scroll it into view on load.</li></ul>",
    "theming": "<p>Reads <code>--color-fg-muted</code>, <code>--color-fg-default</code>, <code>--color-accent</code> and <code>--color-border-default</code>; dark theme swaps them through the semantic tier.</p>",
    "accessibility": {
        "pattern": "<p>A <code>&lt;nav aria-label=\"Filter events\"&gt;</code> of links with <code>aria-current=\"page\"</code>. Because each tab loads a URL, the APG tablist pattern (arrow keys, panels) does not apply.</p>",
        "keys": [(kbd("Tab") + " / " + kbd("Shift", "Tab"), "Moves between tabs."), (kbd("Enter"), "Opens that filter.")],
        "focus": "<p>Shared 2px <code>--color-focus-ring</code> at 2px offset.</p>",
        "labelling": "<p>The nav names what is filtered (\"Filter members\"). The count is plain text inside the link so it is read with the label.</p>",
        "pairs": [
            ("Tab label", "--color-fg-muted", "--color-bg-canvas", 4.5),
            ("Current label", "--color-fg-default", "--color-bg-canvas", 4.5),
            ("Underline", "--color-accent", "--color-bg-canvas", 3),
        ],
        "motion": "<p>Colour transitions over <code>--duration-fast</code>. The underline does not slide.</p>",
        "touch": "<p>Tabs are 15px text with 12px below; the hit area extends to 44px tall on coarse pointers, and tabs sit 24px apart.</p>",
    },
    "content": "<ul><li>One or two words, sentence case, matching the status names in the table (Published, Draft, Flagged).</li><li>Put All first.</li><li>Counts are numerals without brackets.</li></ul>",
    "dodont": [
        ("do", tabs("Filter events, do example", EVENTS), "Statuses that match the table, with counts."),
        ("dont", tabs("Filter events, don't example", [("Show all events", None), ("Only the published ones", None)]), "Long labels; say All and Published."),
        ("do", tabs("Filter members, do example", MEMBERS, 2), "Exclusive filters of one list."),
        ("dont", tabs("Admin sections, don't example", [("Events", None), ("Services", None), ("Members", None)]), "Separate sections as tabs; they belong in the sidebar."),
    ],
    "tokens": [
        ("Label / current", "--color-fg-muted / --color-fg-default", "color"),
        ("Count", "--color-fg-muted", "color"),
        ("Underline / rule", "--color-accent / --color-border-default", "color"),
        ("Gap / below label", "--space-6 / --space-3", "value"),
        ("Underline width", "--border-width-thick", "value"),
        ("Label", "--font-size-ui", "value"),
    ],
    "code": {
        "snippet": '''<nav class="tabs" aria-label="Filter events">
  <a class="tabs__tab" href="/admin/events" aria-current="page">All <span class="tabs__count">5</span></a>
  <a class="tabs__tab" href="/admin/events?status=published">Published <span class="tabs__count">4</span></a>
  <a class="tabs__tab" href="/admin/events?status=draft">Draft <span class="tabs__count">1</span></a>
</nav>''',
        "classes": [
            ("<code>.tabs</code>", "Row with the rule; scrolls sideways."),
            ("<code>.tabs__tab</code>", "One filter link."),
            ("<code>.tabs__count</code>", "Muted count after the label."),
            ("<code>aria-current=\"page\"</code>", "Current filter."),
        ],
    },
    "sources": {
        "mocks": [mock("pages/admin-events/default", "with counts"), mock("pages/admin-events/draft", "Draft current"),
                  mock("pages/admin-members/default", "without counts"), mock("pages/admin-members/flagged", "Flagged current")],
        "drift": "none",
    },
}
