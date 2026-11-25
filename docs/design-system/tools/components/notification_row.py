from dslib import ex, icon, kbd, mock, themes

NOTES = [
    ("clock", "Tomorrow: Saturday Park Bootcamp", "Sat, Apr 25 at 6:30 AM · Centennial Park, Etobicoke", "2 hours ago", True),
    ("calendar-x", "Cancelled: Stretch &amp; Pray: Mobility Morning", "Wed, May 6. The host cancelled it; your registration is released.", "Yesterday", True),
    ("calendar-plus", "Lakeshore Runners posted a new date", "Couch to 5K: Week 4 is Tue, Apr 28 at 6:30 PM.", "Yesterday", False),
    ("calendar-x", "Cancelled date: Couch to 5K Run Club", "Tue, Apr 14 is off; the other dates in the series stand.", "Apr 12", False),
]


def row(i, a="", unread=None):
    ic, title, text, when, is_unread = NOTES[i]
    is_unread = is_unread if unread is None else unread
    mark = '<span class="unread-dot" aria-hidden="true"></span><span class="visually-hidden">Unread</span>' if is_unread else ""
    return (f'<li class="note{" note--unread" if is_unread else ""}"><a class="note__link" href="#"{a}>'
            f'<span class="note__icon" aria-hidden="true">{icon(ic)}</span>'
            f'<span class="note__body"><span class="note__title">{title}</span><span class="note__text">{text}</span>'
            f'<span class="note__time">{when}</span></span>{mark}</a></li>')


def notes(rows):
    return f'<div style="width: 100%;"><ul class="card card--list notes">{rows}</ul></div>'


SKELETON = ('<li class="note"><div class="note__link"><span class="skeleton skeleton--avatar"></span>'
            '<div class="note__body skeleton-stack"><span class="skeleton skeleton--text w-60"></span>'
            '<span class="skeleton skeleton--text-sm w-80"></span></div></div></li>')


def grid(cols, rows):
    head = "".join(f'<th scope="col">{c}</th>' for c in cols)
    body = "".join(f'<tr><th scope="row">{label}</th>' + "".join(f"<td>{c}</td>" for c in cells) + "</tr>" for label, cells in rows)
    return f'<div class="ds-matrix"><table><thead><tr><th scope="col">Variant</th>{head}</tr></thead><tbody>{body}</tbody></table></div>'


SPEC = {
    "lead": "A notification row is one entry of the member's notifications: what happened, a line of detail, when, and whether it is unread.",
    "meta": ["Status: new", "<code>&lt;li&gt;&lt;a&gt;</code> in a list card", "Member app: Notifications"],
    "overview": """<p>The Notifications screen lists the member's latest 50 notifications from the last 30 days, newest first, as notification rows in a <a href="card.html">list card</a> (<code>.notes</code>) under a head (<code>.notes-head</code>) with Mark all as read and Notification settings (ADR 0068, ADR 0083). Each row links to what it is about: the event, the series or the host.</p>
<ul>
<li><b>Read</b> (<code>.note</code>): icon, title, text and time.</li>
<li><b>Unread</b> (<code>.note--unread</code>): a bold title, the <a href="badge.html">unread dot</a> and the visually hidden word \"Unread\".</li>
</ul>
<p>The icon says the kind: a clock for a reminder, a crossed calendar for a cancelled event or series date, a calendar with a plus for new dates from a followed host.</p>""",
    "anatomy": {
        "figure": notes(row(0)),
        "callouts": [(6, 45), (30, 22), (40, 50), (20, 78), (96, 30)],
        "parts": [
            ("Kind icon", "<code>.note__icon</code>: a 40px accent-subtle circle, <code>aria-hidden</code>."),
            ("Title", "<code>.note__title</code>: medium weight, bold while unread."),
            ("Text", "<code>.note__text</code>: 14px muted, plain text."),
            ("Time", "<code>.note__time</code>: 14px muted: \"2 hours ago\", \"Yesterday\", \"Apr 12\"."),
            ("Unread mark", "The unread dot, <code>aria-hidden</code>, and \"Unread\" in visually hidden text."),
        ],
    },
    "variants": "<h3>List</h3>" + ex(notes("".join(row(i) for i in range(4))), "Two unread, then read ones, newest first (notifications default).")
    + "<h3>Loading</h3>" + ex(notes(SKELETON * 3), "Skeleton rows while the list loads (notifications loading).", True),
    "sizes": "<p>One size: rows 16px padded, at least 44px tall; the list is at most 48rem wide.</p>",
    "states": {
        "intro": "<p>Rows are links: hover is forced with <code>data-state=\"hover\"</code>, focus with <code>data-state=\"focus\"</code>. Unread is a content state.</p>",
        "matrix": grid(["Default", "Hover", "Focus"], [
            ("Read", [notes(row(2)), notes(row(2, ' data-state="hover"')), notes(row(2, ' data-state="focus"'))]),
            ("Unread", [notes(row(0)), notes(row(0, ' data-state="hover"')), notes(row(0, ' data-state="focus"'))]),
        ]),
        "themes": themes(notes(row(0) + row(2))),
        "notes": "<ul><li><b>Empty</b>: \"No notifications yet\" in the <a href=\"empty-state.html\">empty state</a> with Browse events; <b>error</b>: \"Notifications didn't load\" with Try again.</li><li>Mark all as read turns every unread row read at once; if it fails a toast says so and the rows stay as they were.</li><li>A pushed notification appears first while the screen is open.</li></ul>",
    },
    "responsive": "<p>Full width on phones; the head's actions wrap under the title below 640px. The text wraps; nothing truncates.</p>",
    "theming": "<p>Rows sit in a list <a href=\"card.html\">card</a>; hover fills <code>--color-bg-subtle</code>. The icon is <code>--color-fg-accent</code> on <code>--color-accent-subtle</code>; text and time <code>--color-fg-muted</code>; the dot <code>--color-accent</code>.</p>",
    "accessibility": {
        "pattern": "<p>A <code>&lt;ul&gt;</code> of links. A row reads its title, text and time, then \"Unread\" when it is, so weight and the dot are not the only carriers.</p>",
        "keys": [
            (kbd("Tab"), "Row to row."),
            (kbd("Enter"), "Opens what the row is about."),
        ],
        "focus": "<p>The shared ring around the row.</p>",
        "labelling": "<p>The row's name is its text; the icon is decorative. Titles and texts are rendered as text, never as HTML.</p>",
        "pairs": [
            ("Title", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Text and time", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Icon", "--color-fg-accent", "--color-accent-subtle", 3),
        ],
        "motion": "<p>Row background over <code>--duration-fast</code>; none under reduced motion.</p>",
        "touch": "<p>Each row is full width and at least 44px tall.</p>",
    },
    "content": """<ul>
<li>Titles lead with what changed: \"Tomorrow: …\", \"Cancelled: …\", \"Cancelled date: …\", \"Lakeshore Runners posted a new date\".</li>
<li>The text gives the when and where, or what it means for the member.</li>
<li>Times are relative within a day (\"5 min ago\", \"2 hours ago\"), then \"Yesterday\", then the date (\"Apr 12\").</li>
<li>The foot reads \"That’s everything from the last 30 days.\"</li>
</ul>""",
    "dodont": [
        ("do", notes(row(0)), "Unread is bold, dotted and said in words."),
        ("dont", notes(row(0).replace('<span class="visually-hidden">Unread</span>', "")), "Unread only as a dot and weight: a screen reader hears no difference."),
    ],
    "tokens": [
        ("Row hover", "--color-bg-subtle", "color"),
        ("Icon", "--color-accent-subtle / --color-fg-accent", "color"),
        ("Text and time", "--color-fg-muted", "color"),
        ("Unread dot", "--color-accent", "color"),
        ("Row padding / gap", "--space-4 / --space-3", "value"),
        ("Icon size", "2.5rem", "value"),
        ("List width", "48rem", "value"),
    ],
    "code": {
        "snippet": '''<ul class="card card--list notes">
  <li class="note note--unread"><a class="note__link" href="/events/…">
    <span class="note__icon" aria-hidden="true"><svg class="icon">…</svg></span>
    <span class="note__body"><span class="note__title">Tomorrow: Saturday Park Bootcamp</span>
      <span class="note__text">Sat, Apr 25 at 6:30 AM · Centennial Park, Etobicoke</span>
      <span class="note__time">2 hours ago</span></span>
    <span class="unread-dot" aria-hidden="true"></span><span class="visually-hidden">Unread</span>
  </a></li>
</ul>''',
        "classes": [
            ("<code>.notes</code> <code>.notes-head</code> <code>__actions</code> <code>.notes-foot</code>", "The list, its head and its foot."),
            ("<code>.note</code> <code>--unread</code>", "A row; unread."),
            ("<code>.note__link</code> <code>__icon</code> <code>__body</code> <code>__title</code> <code>__text</code> <code>__time</code>", "Row parts."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/notifications/default", "two unread"),
            mock("pages/notifications/many", "twelve unread"),
            mock("pages/notifications/mark-failed", "mark all failed"),
            mock("pages/notifications/loading", "skeletons"),
            mock("pages/notifications/empty", "nothing yet"),
            mock("pages/notifications/error", "didn't load"),
        ],
        "drift": "none",
    },
}
