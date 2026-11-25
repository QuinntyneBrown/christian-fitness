from dslib import ex, icon, kbd, matrix, mock, seal, themes

ITEMS = [("Dashboard", "layout-dashboard", 0, ""), ("Events", "calendar-days", 0, ""),
         ("Services", "heart-handshake", 3, "applications waiting"), ("Members", "users", 1, "member to review")]
# The sidebar is sticky and 100dvh tall from 1024px; examples give it a fixed height and static position.
BOX = ' style="position: static; height: 30rem;"'


def nav(cur="Dashboard", label="Admin example"):
    out = []
    for text, ic, n, what in ITEMS:
        c = ' aria-current="page"' if text == cur else ""
        badge = f'<span class="admin-nav__count" aria-label="{n} {what}">{n}</span>' if n else ""
        out.append(f'<li><a class="admin-nav__item" href="#top"{c}>{icon(ic, "icon--md")}{text}{badge}</a></li>')
    return f'<nav class="admin-nav" aria-label="{label}"><ul class="admin-nav__list">{"".join(out)}</ul></nav>'


def sidebar(cur="Dashboard", label="Admin example"):
    return (f'<aside class="admin__sidebar"{BOX} aria-label="{label} sidebar"><div class="admin__brand">{seal("lockup", light=True, decorative=True)}'
            '<div><p class="admin__brand-name">Christian Fitness</p><p class="admin__brand-sub">Admin console</p></div></div>'
            f'{nav(cur, label)}'
            '<div class="admin__user"><span class="admin__user-avatar" aria-hidden="true">RA</span>'
            '<div class="admin__user-body"><p class="admin__user-name">Rachel Adeyemi</p><p class="admin__user-role">Community lead</p></div>'
            f'<button class="admin__signout" type="button" aria-label="Sign out">{icon("log-out")}</button></div></aside>')


GROUPED = [("", [("Dashboard", "layout-dashboard", 0, "")]),
           ("Publish", [("Stories", "newspaper", 1, "story to review"), ("Newsletter", "mail", 0, "")]),
           ("Gather", [("Events", "calendar-days", 0, ""), ("Event series", "repeat", 0, ""), ("Community Pick", "megaphone", 0, "")]),
           ("Community", [("Listings", "book-user", 3, "suggestions to check"), ("Services", "heart-handshake", 3, "applications waiting"),
                          ("Members", "users", 1, "member to review"), ("Feedback", "message-square-text", 2, "new notes")])]


def grouped_nav(cur="Feedback", label="Admin grouped example"):
    out = []
    for group, entries in GROUPED:
        lis = []
        for text, ic, count, what in entries:
            c = ' aria-current="page"' if text == cur else ""
            badge = f'<span class="admin-nav__count" aria-label="{count} {what}">{count}</span>' if count else ""
            lis.append(f'<li><a class="admin-nav__item" href="#top"{c}>{icon(ic, "icon--md")}{text}{badge}</a></li>')
        gid = f"nav-group-{group.lower()}"
        if group:
            out.append(f'<h2 class="admin-nav__group" id="{gid}">{group}</h2>')
        label_attr = f' aria-labelledby="{gid}"' if group else ""
        out.append(f'<ul class="admin-nav__list"{label_attr}>{"".join(lis)}</ul>')
    return f'<nav class="admin-nav" aria-label="{label}">{"".join(out)}</nav>'


def grouped_sidebar(cur="Feedback", label="Admin grouped example", height="50rem"):
    return (f'<aside class="admin__sidebar" style="position: static; height: {height};" aria-label="{label} sidebar"><div class="admin__brand">{seal("lockup", light=True, decorative=True)}'
            '<div><p class="admin__brand-name">Christian Fitness</p><p class="admin__brand-sub">Admin console</p></div></div>'
            f'{grouped_nav(cur, label)}'
            '<div class="admin__user"><span class="admin__user-avatar" aria-hidden="true">DR</span>'
            '<div class="admin__user-body"><p class="admin__user-name">Dana Reyes</p><p class="admin__user-role">Community director</p></div>'
            f'<button class="admin__signout" type="button" aria-label="Sign out">{icon("log-out")}</button></div></aside>')


ROW = ('<div class="admin__sidebar" style="position: static; height: auto; width: 100%; padding-top: var(--space-3);"><div class="admin-nav">'
       '<a class="admin-nav__item" href="#top"{a}>' + icon("heart-handshake", "icon--md")
       + 'Services<span class="admin-nav__count" aria-label="3 applications waiting">3</span></a></div></div>')

SPEC = {
    "lead": "The admin sidebar is where staff move between the console's sections, grouped by the job (Publish, Gather, Community), with counts for what needs them.",
    "meta": ["Status: stable", "<code>&lt;nav&gt;</code> in <code>&lt;aside&gt;</code>", "Admin console only"],
    "overview": """<p>The sidebar is the admin console's primary navigation. It holds the brand, four links with icons, counts for work waiting (applications to review, reports to handle) and, at the bottom, the signed-in staff member with Sign out.</p>
<ul>
<li>Use it on every admin console screen. Member screens use the <a href="top-bar.html">top bar</a> and <a href="tab-bar.html">tab bar</a>.</li>
<li>Counts show work that needs a person; leave them off when the count is zero.</li>
<li>Filters within a section are <a href="tabs.html">tabs</a> in the page, not more sidebar items.</li>
<li><b>Grouped</b> (<code>.admin-nav__group</code>): with ten sections the console groups them by the job: Dashboard alone, then <b>Publish</b> (Stories, Newsletter), <b>Gather</b> (Events, Event series, Community Pick) and <b>Community</b> (Listings, Services, Members, Feedback). A Moderator sees only Dashboard and Members, with no group labels.</li>
</ul>""",
    "anatomy": {
        "figure": sidebar(label="Admin anatomy"),
        "callouts": [(15, 8), (40, 33), (85, 50), (30, 92)],
        "parts": [
            ("Brand", "Light seal and \"Christian Fitness\" with the gold \"Admin console\" eyebrow."),
            ("Item", "<code>.admin-nav__item</code>: 20px icon and label, 15px semibold, <code>--radius-md</code>."),
            ("Count", "<code>.admin-nav__count</code> pill with its own <code>aria-label</code> (\"3 applications waiting\")."),
            ("Signed-in user", "<code>.admin__user</code>: initials, name, role and the Sign out icon button (44 × 44 px); below 1024px only Sign out shows, at the end of the brand row."),
        ],
    },
    "variants": "<h3>Grouped console navigation</h3>" + ex(grouped_sidebar(), "From 1024px: group labels in small caps above their items; the link list scrolls inside the column when it outgrows the viewport, the person stays at the foot.", True)
    + "<h3>Desktop column (ungrouped)</h3>" + ex(sidebar(label="Admin example 1"), "From 1024px: a 256px column, sticky and full height.", True)
    + "<h3>Phone and tablet row</h3>" + ex('<div class="admin__sidebar" style="position: static; height: auto; width: 100%;">' + nav("Members", "Admin example 2").replace('class="admin-nav"', 'class="admin-nav" style="flex-direction: row; overflow-x: auto; padding-top: var(--space-3);"') + "</div>",
        "Below 1024px the items become a horizontal, scrollable row under the brand; Sign out stays at the end of the brand row.", mod="stack"),
    "sizes": "<p>One size: <code>--layout-sidebar-width</code> (256px) wide on desktop. Items are 44px tall.</p>",
    "states": {
        "intro": "<p>Items are links on the dark chrome. Current is <code>aria-current=\"page\"</code>: a filled bordeaux-chrome background, white label, and the count turns white with bordeaux text.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'), ("Current", ' aria-current="page"')], [
            ("Item with count", ROW),
        ]),
        "themes": themes(grouped_sidebar(cur="Stories", label="Admin theme example", height="50rem")),
        "notes": """<ul>
<li><b>Hover</b> fills with <code>--color-bg-on-chrome-hover</code> (forced above with <code>data-state="hover"</code>).</li>
<li>Focus on the chrome uses <code>--color-focus-ring-on-dark</code>.</li>
<li>Items never disable; a staff member without access sees the forbidden page.</li>
<li>Group labels are not interactive and have no states.</li>
</ul>""",
    },
    "responsive": """<ul>
<li>From 1024px (<code>--layout-breakpoint-lg</code>): a sticky 256px column, full viewport height, user block at the bottom.</li>
<li>Below 1024px: the sidebar becomes a top band; items scroll horizontally with hidden scrollbars within the band, never the page; the name and role hide and Sign out stays at the end of the brand row.</li>
<li>Labels never truncate.</li>
<li><b>Group labels</b> show only from 1024px (<code>.admin-nav__group</code> is <code>display: none</code> below): the phone band is a single scrolling row.</li>
<li>From 1024px the column is flex again (brand, links, person; restored in db05e2d): <code>.admin-nav</code> takes the free height and scrolls vertically (<code>overflow-y: auto</code>) when ten items and three labels outgrow a short viewport, so Sign out is never pushed off screen.</li>
</ul>""",
    "theming": "<p>The chrome tokens do the work: <code>--color-bg-chrome</code>, <code>--color-fg-on-chrome</code>, <code>--color-fg-on-chrome-muted</code>, <code>--color-bg-on-chrome-hover</code>, <code>--color-bg-chrome-current</code>, <code>--color-bg-chrome-badge</code>. In dark theme the chrome stays dark and gains a hairline right border so it separates from the canvas.</p>",
    "accessibility": {
        "pattern": "<p>An <code>&lt;aside&gt;</code> holding <code>&lt;nav aria-label=\"Admin\"&gt;</code> of plain links. No disclosure or tree: four flat items.</p>",
        "keys": [(kbd("Tab") + " / " + kbd("Shift", "Tab"), "Moves through items, then Sign out."), (kbd("Enter"), "Follows the link.")],
        "focus": "<p>2px <code>--color-focus-ring-on-dark</code> (borealis), which holds 3:1 on the chrome.</p>",
        "labelling": "<p>Each group is an <code>&lt;h2 id&gt;</code> followed by a <code>&lt;ul aria-labelledby&gt;</code> of its links, so assistive technology announces the group name and its number of links; below 1024px the headings are hidden with the band and the lists stay named. Dashboard sits alone in an unlabelled list, and a Moderator's single list has no headings. Counts carry their meaning: \"3 applications waiting\", \"1 member to review\". Sign out is an icon link with <code>aria-label=\"Sign out\"</code>.</p>",
        "pairs": [
            ("Item on chrome", "--color-fg-on-chrome-muted", "--color-bg-chrome", 4.5),
            ("Current item", "--color-fg-on-chrome", "--color-bg-chrome-current", 4.5),
            ("Count", "--color-fg-on-chrome-badge", "--color-bg-chrome-badge", 4.5),
            ("Group label", "--color-fg-on-chrome-subtle", "--color-bg-chrome", 4.5),
            ("Focus ring on chrome", "--color-focus-ring-on-dark", "--color-bg-chrome", 3),
        ],
        "motion": "<p>Background and colour transition over <code>--duration-fast</code>; reduced motion zeroes it.</p>",
        "touch": "<p>Items are 44px tall; in the phone row they sit 4px apart and scroll sideways.</p>",
    },
    "content": """<ul>
<li>Section names are plural nouns: Dashboard, Stories, Events, Listings, Members.</li>
<li>Group labels name the job in one word: Publish, Gather, Community.</li>
<li>Count labels say what is waiting, in a full phrase for screen readers.</li>
<li>The role under the name is the staff title in sentence case ("Community lead").</li>
</ul>""",
    "dodont": [
        ("do", '<div class="admin__sidebar" style="position: static; height: auto; width: 100%; padding-top: var(--space-3);">' + nav("Services", "Admin do example") + "</div>", "Counts only where work is waiting, each with its own label."),
        ("dont", '<div class="admin__sidebar" style="position: static; height: auto; width: 100%; padding-top: var(--space-3);"><nav class="admin-nav" aria-label="Admin don\'t example"><a class="admin-nav__item" href="#top">' + icon("layout-dashboard", "icon--md") + 'Dashboard<span class="admin-nav__count">0</span></a><a class="admin-nav__item" href="#top">' + icon("calendar-days", "icon--md") + 'Events<span class="admin-nav__count">0</span></a></nav></div>',
         "Zero counts are noise, and a bare number says nothing to a screen reader."),
        ("do", '<div class="admin__sidebar" style="position: static; height: auto; width: 100%; padding-top: var(--space-3);"><nav class="admin-nav" aria-label="Admin do example 2"><a class="admin-nav__item" href="#top" aria-current="page">' + icon("users", "icon--md") + "Members</a></nav></div>", "Current set with <code>aria-current</code>."),
        ("dont", '<div class="admin__sidebar" style="position: static; height: auto; width: 100%; padding-top: var(--space-3);"><nav class="admin-nav" aria-label="Admin don\'t example 2"><a class="admin-nav__item" href="#top" aria-current="page">' + icon("users", "icon--md") + 'Members</a><a class="admin-nav__item" href="#top">' + icon("flag", "icon--md") + "Flagged members</a></nav></div>",
         "A filter as a sidebar item; Flagged is a tab inside Members."),
    ],
    "tokens": [
        ("Chrome / label", "--color-bg-chrome / --color-fg-on-chrome", "color"),
        ("Item / hover", "--color-fg-on-chrome-muted / --color-bg-on-chrome-hover", "color"),
        ("Current", "--color-bg-chrome-current", "color"),
        ("Count / on current", "--color-bg-chrome-badge / --color-bg-brand-inverse", "color"),
        ("Eyebrow", "--color-highlight", "color"),
        ("Divider", "--color-border-on-chrome", "color"),
        ("Group label", "--color-fg-on-chrome-subtle", "color"),
        ("Group label type", "--font-size-xs / --letter-spacing-wider", "value"),
        ("Focus ring", "--color-focus-ring-on-dark", "color"),
        ("Width", "--layout-sidebar-width", "value"),
        ("Item radius", "--radius-md", "value"),
        ("Stacking", "--z-sticky", "value"),
    ],
    "code": {
        "snippet": '''<aside class="admin__sidebar">
  <div class="admin__brand">…<div><p class="admin__brand-name">Christian Fitness</p><p class="admin__brand-sub">Admin console</p></div></div>
  <nav class="admin-nav" aria-label="Admin">
    <ul class="admin-nav__list">
      <li><a class="admin-nav__item" href="/admin" aria-current="page">…Dashboard</a></li>
    </ul>
    <h2 class="admin-nav__group" id="nav-group-community">Community</h2>
    <ul class="admin-nav__list" aria-labelledby="nav-group-community">
      <li><a class="admin-nav__item" href="/admin/services">…Services<span class="admin-nav__count" aria-label="3 applications waiting">3</span></a></li>
    </ul>
  </nav>
  <div class="admin__user">…<button class="admin__signout" type="button" aria-label="Sign out">…</button></div>
</aside>''',
        "classes": [
            ("<code>.admin__sidebar</code>", "Chrome column (desktop) or band (phones)."),
            ("<code>.admin__brand</code> <code>.admin__brand-name</code> <code>.admin__brand-sub</code>", "Brand block."),
            ("<code>.admin-nav</code> <code>.admin-nav__item</code> <code>.admin-nav__count</code>", "Links and counts."),
            ("<code>.admin-nav__group</code>", "Group heading (an <code>h2</code>) that names the <code>ul.admin-nav__list</code> after it through <code>aria-labelledby</code>; shown from 1024px."),
            ("<code>.admin__user</code> … <code>.admin__signout</code>", "Signed-in staff member and Sign out."),
            ("<code>aria-current=\"page\"</code>", "Current section."),
        ],
    },
    "sources": {
        "mocks": [mock("pages/admin-dashboard/default", "Dashboard current"), mock("pages/admin-services/default", "applications count"),
                  mock("pages/admin-members/flagged", "report count"),
                  mock("pages/admin-feedback/default", "grouped navigation, Feedback current"),
                  mock("pages/admin-stories/default", "Publish group, story to review"),
                  mock("pages/admin-community-pick/default", "Gather group"),
                  mock("pages/admin-dashboard/moderator", "Moderator: no groups")],
        "drift": "Items used palette tokens for hover and current; they now use <code>--color-bg-on-chrome-hover</code> and <code>--color-bg-chrome-current</code>. Item radius was the old xl (12px), now <code>--radius-md</code>. The second batch of mocks (db05e2d) grouped the ten sections and restored the column layout from 1024px (the band's grid had been applying to the desktop column).",
    },
}
