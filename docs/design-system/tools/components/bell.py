from dslib import ex, icon, kbd, mock, themes

BELL_ICON = icon("bell")


def bell(count=0, current=False, a=""):
    label = f"Notifications, {count} unread" if count else "Notifications"
    badge = f'<span class="bell__count" aria-hidden="true">{"9+" if count > 9 else count}</span>' if count else ""
    cur = ' aria-current="page"' if current else ""
    return f'<a class="bell" href="#" aria-label="{label}"{cur}{a}>{BELL_ICON}{badge}</a>'


BOX = '<div class="cluster" style="justify-content: center;">{c}</div>'


def grid(cols, rows):
    head = "".join(f'<th scope="col">{c}</th>' for c in cols)
    body = "".join(f'<tr><th scope="row">{label}</th>' + "".join(f"<td>{c}</td>" for c in cells) + "</tr>" for label, cells in rows)
    return f'<div class="ds-matrix"><table><thead><tr><th scope="col">Variant</th>{head}</tr></thead><tbody>{body}</tbody></table></div>'


SPEC = {
    "lead": "The bell sits in the member top bar before the profile button and says how many notifications are unread.",
    "meta": ["Status: new", "<code>&lt;a aria-label&gt;</code>", "Member app: every signed-in screen"],
    "overview": """<p>The bell links to the Notifications screen (<code>/notifications</code>) from every member screen (ADR 0068, ADR 0083). It carries the unread count of the member's notifications:</p>
<ul>
<li><b>None</b>: nothing unread, or the count is unknown because the list failed to load: the icon alone.</li>
<li><b>Count</b> (<code>.bell__count</code>): one to nine unread, the number in a small bordeaux pill over the icon.</li>
<li><b>9+</b>: more than nine unread; the accessible name still says the exact number.</li>
</ul>
<p>It is not a <a href="badge.html">count badge</a> on a navigation link: it has no text of its own, so the number lives in its accessible name. Chat messages are not notifications; they stay as the unread count on Messages.</p>""",
    "anatomy": {
        "figure": BOX.format(c=bell(2)),
        "callouts": [(45, 55), (58, 25)],
        "parts": [
            ("Icon", "The 20px <code>bell</code> icon, <code>aria-hidden</code>, muted until hovered or current."),
            ("Count", "<code>.bell__count</code>: 12px bold, white on <code>--color-accent</code>, <code>aria-hidden</code>; the name carries the number."),
        ],
    },
    "variants": "<h3>None, count and 9+</h3>" + ex(BOX.format(c=bell(0) + bell(2) + bell(12)),
                                                    "Nothing unread; two unread; twelve unread, shown as 9+ (notifications default, many).", True),
    "sizes": "<p>One size: a 44 × 44 px (2.75rem) circle, the minimum touch target, at every viewport.</p>",
    "states": {
        "intro": "<p>The bell is a link: hover is forced with <code>data-state=\"hover\"</code>, focus with <code>data-state=\"focus\"</code>, and on the Notifications screen it is <code>aria-current=\"page\"</code>.</p>",
        "matrix": grid(["Default", "Hover", "Focus", "Current"], [
            ("None", [bell(0), bell(0, a=' data-state="hover"'), bell(0, a=' data-state="focus"'), bell(0, True)]),
            ("Count", [bell(2), bell(2, a=' data-state="hover"'), bell(2, a=' data-state="focus"'), bell(2, True)]),
            ("9+", [bell(12), bell(12, a=' data-state="hover"'), bell(12, a=' data-state="focus"'), bell(12, True)]),
        ]),
        "themes": themes(BOX.format(c=bell(0) + bell(2) + bell(12, True))),
        "notes": "<ul><li>While the Notifications screen loads, the bell keeps the count it had (notifications loading).</li><li>A pushed notification raises the count at once, on any member screen.</li></ul>",
    },
    "responsive": "<p>The same at every width: in the app header between the navigation and the profile button; on phones, where the navigation moves to the tab bar, it stays in the header.</p>",
    "theming": "<p>Icon <code>--color-fg-muted</code>, hover <code>--color-fg-default</code> on <code>--color-bg-subtle</code>; current <code>--color-fg-accent</code> on <code>--color-accent-subtle</code>; count <code>--color-fg-on-accent</code> on <code>--color-accent</code>. All follow the theme.</p>",
    "accessibility": {
        "pattern": "<p>A plain link with an <code>aria-label</code>: \"Notifications\" with nothing unread, \"Notifications, 12 unread\" otherwise. The pill is <code>aria-hidden</code> so the number is not read twice and \"9+\" is never read.</p>",
        "keys": [
            (kbd("Tab"), "Reaches the bell after the navigation, before the profile button."),
            (kbd("Enter"), "Opens Notifications."),
        ],
        "focus": "<p>The shared 2px ring around the circle.</p>",
        "labelling": "<p>The name carries the exact number, so neither the colour nor the pill is the only carrier of \"unread\".</p>",
        "pairs": [
            ("Icon", "--color-fg-muted", "--color-bg-surface", 3),
            ("Current icon", "--color-fg-accent", "--color-accent-subtle", 3),
            ("Count", "--color-fg-on-accent", "--color-accent", 4.5),
        ],
        "motion": "<p>Background over <code>--duration-fast</code>; none under reduced motion. The count does not animate.</p>",
        "touch": "<p>44 × 44 px at every viewport.</p>",
    },
    "content": "<ul><li>Name: \"Notifications\", then \", N unread\" when any are.</li><li>The pill shows 1 to 9, then \"9+\".</li></ul>",
    "dodont": [
        ("do", BOX.format(c=bell(12)), "The pill says 9+ and the name says 12."),
        ("dont", BOX.format(c='<a class="bell" href="#">' + BELL_ICON + '<span class="bell__count">12</span></a>'),
         "No accessible name and a visible pill read aloud: a screen reader hears \"12\" with no subject."),
    ],
    "tokens": [
        ("Icon / hover", "--color-fg-muted / --color-fg-default", "color"),
        ("Hover fill / current fill", "--color-bg-subtle / --color-accent-subtle", "color"),
        ("Count", "--color-accent / --color-fg-on-accent", "color"),
        ("Size", "2.75rem", "value"),
        ("Count text", "--font-size-xs / --font-weight-bold", "value"),
        ("Radius", "--radius-full", "value"),
    ],
    "code": {
        "snippet": '''<a class="bell" href="/notifications" aria-label="Notifications, 12 unread">
  <svg class="icon" aria-hidden="true">…</svg>
  <span class="bell__count" aria-hidden="true">9+</span>
</a>''',
        "classes": [
            ("<code>.bell</code>", "The link: a 44px circle."),
            ("<code>.bell__count</code>", "The unread pill; omitted at zero."),
            ("<code>aria-current=\"page\"</code>", "On the Notifications screen."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/notifications/default", "2 unread, current"),
            mock("pages/notifications/many", "9+"),
            mock("pages/notifications/empty", "none"),
            mock("pages/home/default", "in the app header"),
        ],
        "drift": "none",
    },
}
