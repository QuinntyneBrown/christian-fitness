from dslib import ex, kbd, matrix, mock, themes

STATUSES = ('<span class="status status--published">Published</span><span class="status status--draft">Draft</span><span class="status status--cancelled">Cancelled</span>'
            '<span class="status status--active">Active</span><span class="status status--flagged">Flagged</span>'
            '<span class="status status--suspended">Suspended</span>')
PUBLISHING = ('<span class="status status--draft">Draft</span><span class="status status--review">In review</span>'
              '<span class="status status--scheduled">Scheduled</span><span class="status status--published">Published</span>'
              '<span class="status status--new">New</span><span class="status status--replied">Replied</span>')

SPEC = {
    "lead": "Badges label a state or a count in a word or a number: Published, Flagged, 4 unread.",
    "meta": ["Status: stable", "Inline <code>&lt;span&gt;</code>", "Not interactive"],
    "overview": """<p>Use a badge to show something's status or how many new things wait. It never acts; to filter, use a <a href="chip.html">chip</a>.</p>
<ul>
<li><b>Status</b> (<code>.status</code>): admin rows: Published, Draft, Cancelled (events); Active, Flagged, Suspended (members); <b>In review</b> (<code>--review</code>) and <b>Scheduled</b> (<code>--scheduled</code>) for stories and the newsletter issue; <b>New</b> (<code>--new</code>, same look as In review) and <b>Replied</b> (<code>--replied</code>, same look as Scheduled) for feedback.</li>
<li><b>Count badge</b> (<code>.count-badge</code>): unread total beside the Messages nav link.</li>
<li><b>Count pill</b> (<code>.count-pill</code>): unread total at the end of a conversation row.</li>
<li><b>Unread dot</b> (<code>.unread-dot</code>): a labelled dot when the exact number does not matter.</li>
<li><b>Going pill</b> (<code>.going-pill</code>): "Going" on an event card's image; see <a href="event-card.html">Event card</a>.</li>
</ul>""",
    "anatomy": {
        "figure": '<span class="status status--published">Published</span>',
        "callouts": [(50, 15), (50, 50)],
        "parts": [
            ("Container", "Pill (<code>--radius-full</code>), 4px × 10px padding; draft and active add a hairline inset border."),
            ("Label", "12px bold, one word, sentence case."),
        ],
    },
    "variants": "<h3>Status</h3>" + ex(STATUSES, "Event statuses, then member statuses. The word carries the meaning; fill only reinforces it.", True)
    + "<h3>Publishing and feedback statuses</h3>" + ex(PUBLISHING, "A story's life: Draft, In review (highlight: it waits for an editor), Scheduled (outlined: it will go out), Published. Feedback reuses two: New and Replied.", True)
    + "<h3>Counts and dots</h3>" + ex('<a class="app-nav__link" href="#">Messages<span class="count-badge" aria-label="4 unread">4</span></a>'
                                      '<span class="count-pill" aria-label="1 unread">1</span>'
                                      '<span class="unread-dot" role="img" aria-label="3 unread"></span>',
                                      "Count badge in navigation, count pill in a row, dot in home's preview.", True),
    "sizes": "<p>One size: 12px label (<code>--font-size-xs</code>). Counts above 99 read \"99+\". The dot is <code>--size-dot-lg</code>.</p>",
    "states": {
        "intro": "<p>Badges are static: no hover, focus, active or disabled. Their variants are their states. A count badge disappears at zero.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ""), ("Focus", ""), ("Active", ""), ("Disabled", ""), ("Zero", "")], [
            ("Status", '<span class="status status--active">Active</span>', {"Hover": None, "Focus": None, "Active": None, "Disabled": None, "Zero": None}),
            ("In review", '<span class="status status--review">In review</span>', {"Hover": None, "Focus": None, "Active": None, "Disabled": None, "Zero": None}),
            ("Scheduled", '<span class="status status--scheduled">Scheduled</span>', {"Hover": None, "Focus": None, "Active": None, "Disabled": None, "Zero": None}),
            ("Count pill", '<span class="count-pill" aria-label="1 unread">1</span>', {"Hover": None, "Focus": None, "Active": None, "Disabled": None}),
        ]).replace('<td><span class="count-pill" aria-label="1 unread">1</span></td></tr>', '<td><span class="muted">Hidden</span></td></tr>'),
        "themes": themes(STATUSES + PUBLISHING + '<span class="count-pill" aria-label="1 unread">1</span><span class="unread-dot" role="img" aria-label="3 unread"></span>'),
        "notes": "<ul><li>In review and New use the borealis highlight with dark text in both themes: they wait for someone. Scheduled and Replied are a strong outline: settled, nothing to do.</li><li>Flagged is the loudest (solid bordeaux) because it needs a decision; Suspended is inverse; Active and Draft are quiet outlines.</li><li>When the count changes in real time, the region announcing it is polite; the badge itself is not a live region.</li></ul>",
    },
    "responsive": "<ul><li>Badges never wrap (<code>white-space: nowrap</code>) or truncate.</li><li>On phones the count moves to the tab bar as a <code>.tab-bar__dot</code>.</li></ul>",
    "theming": "<p>Each status pairs a fill and a text token: published <code>--color-accent-subtle</code>/<code>--color-fg-accent</code>, flagged <code>--color-accent</code>/<code>--color-fg-on-accent</code>, suspended <code>--color-bg-inverse</code>/<code>--color-fg-inverse</code>, draft and active <code>--color-bg-canvas</code> with a <code>--color-border-default</code> ring; review and new <code>--color-highlight</code> with <code>--color-fg-on-highlight</code> text (a fixed dark ink, because the highlight is light in both themes); scheduled and replied <code>--color-bg-surface</code>/<code>--color-fg-default</code> with a <code>--color-border-strong</code> ring. Generic <code>.status--success</code>, <code>--warning</code>, <code>--danger</code> and <code>--info</code> use the status tokens.</p>",
    "accessibility": {
        "pattern": "<p>Plain text in a <code>&lt;span&gt;</code>. Status words are read in place. Numeric badges add an <code>aria-label</code> with the noun (\"4 unread\"); dots use <code>role=\"img\"</code> and an <code>aria-label</code>.</p>",
        "keys": [(kbd("Tab"), "Skips badges; they are not focusable.")],
        "focus": "<p>None.</p>",
        "labelling": "<p>A bare \"4\" means nothing when read; always label counts with what they count.</p>",
        "pairs": [
            ("Published", "--color-fg-accent", "--color-accent-subtle", 4.5),
            ("Flagged", "--color-fg-on-accent", "--color-accent", 4.5),
            ("Suspended", "--color-fg-inverse", "--color-bg-inverse", 4.5),
            ("Draft", "--color-fg-muted", "--color-bg-canvas", 4.5),
            ("In review and New", "--color-fg-on-highlight", "--color-highlight", 4.5),
            ("Scheduled and Replied", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Scheduled ring (non-text)", "--color-border-strong", "--color-bg-surface", 3),
            ("Unread dot (non-text)", "--color-accent", "--color-bg-surface", 3),
        ],
        "motion": "<p>None; counts update without animation.</p>",
        "touch": "<p>Not a target.</p>",
    },
    "content": "<ul><li>One word, sentence case: \"Published\", \"Flagged\". Not \"LIVE\" or \"OK\". Two words only where one would mislead: \"In review\".</li><li>Counts are numerals, capped at \"99+\".</li></ul>",
    "dodont": [
        ("do", '<span class="status status--suspended">Suspended</span>', "A word states the status (admin members)."),
        ("dont", '<span class="unread-dot" role="img" aria-label="Suspended"></span>', "A coloured dot as the only signal of a member's status."),
        ("do", '<span class="count-pill" aria-label="1 unread">1</span>', "Counts are labelled for screen readers."),
        ("dont", '<button class="status status--published" type="button">Published</button>', "A badge as a button; to change status, open the editor."),
    ],
    "tokens": [
        ("Published fill / text", "--color-accent-subtle / --color-fg-accent", "color"),
        ("Flagged and counts fill / text", "--color-accent / --color-fg-on-accent", "color"),
        ("Suspended fill / text", "--color-bg-inverse / --color-fg-inverse", "color"),
        ("Draft and active fill / ring", "--color-bg-canvas / --color-border-default", "color"),
        ("In review and new fill / text", "--color-highlight / --color-fg-on-highlight", "color"),
        ("Scheduled and replied fill / text / ring", "--color-bg-surface / --color-fg-default / --color-border-strong", "color"),
        ("Padding", "--space-1 / --space-2-5", "value"),
        ("Label", "--font-size-xs / --font-weight-bold", "value"),
        ("Radius", "--radius-full", "value"),
        ("Dot", "--size-dot-lg", "value"),
    ],
    "code": {
        "snippet": '''<span class="status status--flagged">Flagged</span>
<a class="app-nav__link" href="/messages">Messages<span class="count-badge" aria-label="4 unread">4</span></a>
<span class="unread-dot" role="img" aria-label="3 unread"></span>''',
        "classes": [
            ("<code>.status</code> + <code>--published</code> <code>--draft</code> <code>--active</code> <code>--flagged</code> <code>--suspended</code> <code>--cancelled</code>", "Product statuses."),
            ("<code>.status--review</code> <code>--new</code> · <code>.status--scheduled</code> <code>--replied</code>", "Publishing and feedback statuses (each pair shares one look)."),
            ("<code>.status--success</code> <code>--warning</code> <code>--danger</code> <code>--info</code>", "Generic statuses."),
            ("<code>.count-badge</code> <code>.count-pill</code>", "Counts in navigation and rows."),
            ("<code>.unread-dot</code>", "A labelled dot."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/admin-events/default", "published and draft"),
            mock("pages/admin-members/default", "active and flagged"),
            mock("pages/admin-members/suspended", "suspended"),
            mock("pages/home/default", "count badge, unread dot"),
            mock("pages/messages/default", "count pill"),
            mock("pages/admin-stories/default", "draft, in review, scheduled, published"),
            mock("pages/admin-story-editor/default", "in review in the editor bar"),
            mock("pages/admin-newsletter/scheduled", "scheduled issue"),
            mock("pages/admin-feedback/default", "new and replied"),
        ],
        "drift": "The 11px count badge snapped to 12px (<code>--font-size-xs</code>). Admin nav counts used palette colours; they now read <code>--color-bg-chrome-badge</code> (see Sidebar navigation). <code>.status--review</code> read the primitive <code>--palette-stone-1000</code> for its text; it now reads the semantic <code>--color-fg-on-highlight</code>. Resolved feedback reuses <code>.status--draft</code>.",
    },
}
