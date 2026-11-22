from dslib import ex, icon, kbd, matrix, mock, seal, themes

ITEMS = [("Dashboard", "layout-dashboard", 0, ""), ("Events", "calendar-days", 0, ""),
         ("Services", "heart-handshake", 3, "applications waiting"), ("Members", "users", 1, "report to review")]
# The sidebar is sticky and 100dvh tall from 1024px; examples give it a fixed height and static position.
BOX = ' style="position: static; height: 30rem;"'


def nav(cur="Dashboard", label="Admin example"):
    out = []
    for text, ic, n, what in ITEMS:
        c = ' aria-current="page"' if text == cur else ""
        badge = f'<span class="admin-nav__count" aria-label="{n} {what}">{n}</span>' if n else ""
        out.append(f'<a class="admin-nav__item" href="#top"{c}>{icon(ic, "icon--md")}{text}{badge}</a>')
    return f'<nav class="admin-nav" aria-label="{label}">{"".join(out)}</nav>'


def sidebar(cur="Dashboard", label="Admin example"):
    return (f'<aside class="admin__sidebar"{BOX} aria-label="{label} sidebar"><div class="admin__brand">{seal("lockup", light=True, decorative=True)}'
            '<div><p class="admin__brand-name">Christian Fitness</p><p class="admin__brand-sub">Admin console</p></div></div>'
            f'{nav(cur, label)}'
            '<div class="admin__user"><span class="admin__user-avatar" aria-hidden="true">RA</span>'
            '<div class="admin__user-body"><p class="admin__user-name">Rachel Adeyemi</p><p class="admin__user-role">Community lead</p></div>'
            f'<a class="admin__signout" href="#top" aria-label="Sign out">{icon("log-out")}</a></div></aside>')


ROW = ('<div class="admin__sidebar" style="padding-top: var(--space-3);"><div class="admin-nav">'
       '<a class="admin-nav__item" href="#top"{a}>' + icon("heart-handshake", "icon--md")
       + 'Services<span class="admin-nav__count" aria-label="3 applications waiting">3</span></a></div></div>')

SPEC = {
    "lead": "The admin sidebar is where staff move between Dashboard, Events, Services and Members, with counts for what needs them.",
    "meta": ["Status: stable", "<code>&lt;nav&gt;</code> in <code>&lt;aside&gt;</code>", "Admin console only"],
    "overview": """<p>The sidebar is the admin console's primary navigation. It holds the brand, four links with icons, counts for work waiting (applications to review, reports to handle) and, at the bottom, the signed-in staff member with Sign out.</p>
<ul>
<li>Use it on every admin console screen. Member screens use the <a href="top-bar.html">top bar</a> and <a href="tab-bar.html">tab bar</a>.</li>
<li>Counts show work that needs a person; leave them off when the count is zero.</li>
<li>Filters within a section are <a href="tabs.html">tabs</a> in the page, not more sidebar items.</li>
</ul>""",
    "anatomy": {
        "figure": sidebar(label="Admin anatomy"),
        "callouts": [(15, 8), (40, 33), (85, 50), (30, 92)],
        "parts": [
            ("Brand", "Light seal and \"Christian Fitness\" with the gold \"Admin console\" eyebrow."),
            ("Item", "<code>.admin-nav__item</code>: 20px icon and label, 15px semibold, <code>--radius-md</code>."),
            ("Count", "<code>.admin-nav__count</code> pill with its own <code>aria-label</code> (\"3 applications waiting\")."),
            ("Signed-in user", "<code>.admin__user</code>: initials, name, role and the Sign out icon link; desktop only."),
        ],
    },
    "variants": "<h3>Desktop column</h3>" + ex(sidebar(label="Admin example 1"), "From 1024px: a 256px column, sticky and full height.", True)
    + "<h3>Phone and tablet row</h3>" + ex('<div class="admin__sidebar">' + nav("Members", "Admin example 2").replace('class="admin-nav"', 'class="admin-nav" style="flex-direction: row; overflow-x: auto; padding-top: var(--space-3);"') + "</div>",
        "Below 1024px the items become a horizontal, scrollable row under the brand; the user block hides.", mod="stack"),
    "sizes": "<p>One size: <code>--layout-sidebar-width</code> (256px) wide on desktop. Items are 44px tall.</p>",
    "states": {
        "intro": "<p>Items are links on the dark chrome. Current is <code>aria-current=\"page\"</code>: a filled bordeaux-chrome background, white label, and the count turns white with bordeaux text.</p>",
        "matrix": matrix([("Default", ""), ("Focus", ' data-state="focus"'), ("Current", ' aria-current="page"')], [
            ("Item with count", ROW),
        ]),
        "themes": themes(sidebar(cur="Services", label="Admin theme example")),
        "notes": """<ul>
<li><b>Hover</b> fills with <code>--color-bg-on-chrome-hover</code>; it is not forced here because the stylesheet has no <code>data-state="hover"</code> hook for this item.</li>
<li>Focus on the chrome uses <code>--color-focus-ring-on-dark</code>.</li>
<li>Items never disable; a staff member without access sees the forbidden page.</li>
</ul>""",
    },
    "responsive": """<ul>
<li>From 1024px (<code>--layout-breakpoint-lg</code>): a sticky 256px column, full viewport height, user block at the bottom.</li>
<li>Below 1024px: the sidebar becomes a top band; items scroll horizontally with hidden scrollbars and the user block hides (Sign out moves to the dashboard).</li>
<li>Labels never truncate.</li>
</ul>""",
    "theming": "<p>The chrome tokens do the work: <code>--color-bg-chrome</code>, <code>--color-fg-on-chrome</code>, <code>--color-fg-on-chrome-muted</code>, <code>--color-bg-on-chrome-hover</code>, <code>--color-bg-chrome-current</code>, <code>--color-bg-chrome-badge</code>. In dark theme the chrome stays dark and gains a hairline right border so it separates from the canvas.</p>",
    "accessibility": {
        "pattern": "<p>An <code>&lt;aside&gt;</code> holding <code>&lt;nav aria-label=\"Admin\"&gt;</code> of plain links. No disclosure or tree: four flat items.</p>",
        "keys": [(kbd("Tab") + " / " + kbd("Shift", "Tab"), "Moves through items, then Sign out."), (kbd("Enter"), "Follows the link.")],
        "focus": "<p>2px <code>--color-focus-ring-on-dark</code> (borealis), which holds 3:1 on the chrome.</p>",
        "labelling": "<p>Counts carry their meaning: \"3 applications waiting\", \"1 report to review\". Sign out is an icon link with <code>aria-label=\"Sign out\"</code>.</p>",
        "pairs": [
            ("Item on chrome", "--color-fg-on-chrome-muted", "--color-bg-chrome", 4.5),
            ("Current item", "--color-fg-on-chrome", "--color-bg-chrome-current", 4.5),
            ("Count", "--color-fg-on-chrome-badge", "--color-bg-chrome-badge", 4.5),
            ("Focus ring on chrome", "--color-focus-ring-on-dark", "--color-bg-chrome", 3),
        ],
        "motion": "<p>Background and colour transition over <code>--duration-fast</code>; reduced motion zeroes it.</p>",
        "touch": "<p>Items are 44px tall; in the phone row they sit 4px apart and scroll sideways.</p>",
    },
    "content": """<ul>
<li>Section names are plural nouns: Dashboard, Events, Services, Members.</li>
<li>Count labels say what is waiting, in a full phrase for screen readers.</li>
<li>The role under the name is the staff title in sentence case ("Community lead").</li>
</ul>""",
    "dodont": [
        ("do", '<div class="admin__sidebar" style="padding-top: var(--space-3);">' + nav("Services", "Admin do example") + "</div>", "Counts only where work is waiting, each with its own label."),
        ("dont", '<div class="admin__sidebar" style="padding-top: var(--space-3);"><nav class="admin-nav" aria-label="Admin don\'t example"><a class="admin-nav__item" href="#top">' + icon("layout-dashboard", "icon--md") + 'Dashboard<span class="admin-nav__count">0</span></a><a class="admin-nav__item" href="#top">' + icon("calendar-days", "icon--md") + 'Events<span class="admin-nav__count">0</span></a></nav></div>',
         "Zero counts are noise, and a bare number says nothing to a screen reader."),
        ("do", '<div class="admin__sidebar" style="padding-top: var(--space-3);"><nav class="admin-nav" aria-label="Admin do example 2"><a class="admin-nav__item" href="#top" aria-current="page">' + icon("users", "icon--md") + "Members</a></nav></div>", "Current set with <code>aria-current</code>."),
        ("dont", '<div class="admin__sidebar" style="padding-top: var(--space-3);"><nav class="admin-nav" aria-label="Admin don\'t example 2"><a class="admin-nav__item" href="#top" aria-current="page">' + icon("users", "icon--md") + 'Members</a><a class="admin-nav__item" href="#top">' + icon("flag", "icon--md") + "Flagged members</a></nav></div>",
         "A filter as a sidebar item; Flagged is a tab inside Members."),
    ],
    "tokens": [
        ("Chrome / label", "--color-bg-chrome / --color-fg-on-chrome", "color"),
        ("Item / hover", "--color-fg-on-chrome-muted / --color-bg-on-chrome-hover", "color"),
        ("Current", "--color-bg-chrome-current", "color"),
        ("Count / on current", "--color-bg-chrome-badge / --color-bg-brand-inverse", "color"),
        ("Eyebrow", "--color-highlight", "color"),
        ("Divider", "--color-border-on-chrome", "color"),
        ("Focus ring", "--color-focus-ring-on-dark", "color"),
        ("Width", "--layout-sidebar-width", "value"),
        ("Item radius", "--radius-md", "value"),
        ("Stacking", "--z-sticky", "value"),
    ],
    "code": {
        "snippet": '''<aside class="admin__sidebar">
  <div class="admin__brand">…<div><p class="admin__brand-name">Christian Fitness</p><p class="admin__brand-sub">Admin console</p></div></div>
  <nav class="admin-nav" aria-label="Admin">
    <a class="admin-nav__item" href="/admin" aria-current="page">…Dashboard</a>
    <a class="admin-nav__item" href="/admin/services">…Services<span class="admin-nav__count" aria-label="3 applications waiting">3</span></a>
  </nav>
  <div class="admin__user">…<a class="admin__signout" href="/admin/sign-in" aria-label="Sign out">…</a></div>
</aside>''',
        "classes": [
            ("<code>.admin__sidebar</code>", "Chrome column (desktop) or band (phones)."),
            ("<code>.admin__brand</code> <code>.admin__brand-name</code> <code>.admin__brand-sub</code>", "Brand block."),
            ("<code>.admin-nav</code> <code>.admin-nav__item</code> <code>.admin-nav__count</code>", "Links and counts."),
            ("<code>.admin__user</code> … <code>.admin__signout</code>", "Signed-in staff member and Sign out."),
            ("<code>aria-current=\"page\"</code>", "Current section."),
        ],
    },
    "sources": {
        "mocks": [mock("pages/admin-dashboard/default", "Dashboard current"), mock("pages/admin-services/default", "applications count"),
                  mock("pages/admin-members/flagged", "report count")],
        "drift": "Items used palette tokens for hover and current; they now use <code>--color-bg-on-chrome-hover</code> and <code>--color-bg-chrome-current</code>. Item radius was the old xl (12px), now <code>--radius-md</code>.",
    },
}
