from dslib import ex, icon, kbd, matrix, mock, themes

REPEAT = icon("repeat")
CUR = ' aria-current="page"'
EVENTS = (f'<nav class="segmented" aria-label="View"><a class="segmented__option" href="#"{CUR}>By date</a>'
          f'<a class="segmented__option" href="#">{REPEAT}Series (3)</a></nav>')
EVENTS_SERIES = (f'<nav class="segmented" aria-label="View"><a class="segmented__option" href="#">By date</a>'
                 f'<a class="segmented__option" href="#"{CUR}>{REPEAT}Series (3)</a></nav>')


def platforms(current="Instagram"):
    opts = "".join(f'<a class="segmented__option segmented__option--ink" href="#"{CUR if p == current else ""}>{p}</a>'
                   for p in ["Instagram", "Facebook", "WhatsApp", "Slack"])
    return f'<nav class="segmented segmented--flush" aria-label="Platform">{opts}</nav>'


STATES = [("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'), ("Current", CUR)]

SPEC = {
    "lead": "A segmented control switches between two to four views of the same thing, in place: events by date or as series, a pick's art for each platform.",
    "meta": ["Status: new", "<code>&lt;nav&gt;</code> of links with <code>aria-current</code>"],
    "overview": f"""<p>Use a segmented control when one list or one set of assets has a few views that each have their own address, and people flip between them: Events <b>By date</b> or <b>Series</b>; Community Pick art for <b>Instagram</b>, <b>Facebook</b>, <b>WhatsApp</b> or <b>Slack</b>. Each option is a link to its view, and the current one carries <code>aria-current="page"</code>.</p>
<ul>
<li><b>Default</b> (<code>.segmented</code>): a surface pill with a hairline ring, 24px below the page head; the current option fills bordeaux.</li>
<li><b>Flush</b> (<code>.segmented--flush</code>): no top margin, never wider than its container, and scrolls sideways when the options do not fit. With <code>.segmented__option--ink</code> the current option fills near-black instead, for the admin console.</li>
</ul>
<p>Use <a href="tabs.html">tabs</a> for more than four views or views with counts that change; <a href="chip.html">filter chips</a> to narrow a list, not to change how it is shown; a <a href="radio-group.html">radio group</a> or <a href="choice-card.html">choice cards</a> for an answer in a form.</p>""",
    "anatomy": {
        "figure": EVENTS,
        "callouts": [(68, 30), (40, 24), (60, 24)],
        "parts": [
            ("Track", "<code>.segmented</code>: <code>--color-bg-surface</code> pill with a hairline <code>--color-border-default</code> inset ring and 4px padding; as wide as its options."),
            ("Current option", "Bordeaux fill (<code>--color-accent</code>) with the on-accent label; <code>aria-current=\"page\"</code>."),
            ("Option", "<code>.segmented__option</code>: 14px semibold muted label, optional 16px leading icon, 8px × 20px padding, pill."),
        ],
    },
    "variants": "<h3>Default (Events)</h3>"
    + ex(EVENTS, "By date is the current view; Series carries the repeat icon and the number of series.", True)
    + ex(EVENTS_SERIES, "Series view current.", True)
    + "<h3>Flush, ink (Community Pick)</h3>"
    + ex(platforms(), "Four platforms; the current one fills near-black; the control scrolls when narrower than its options.", True)
    + ex(platforms("WhatsApp"), "WhatsApp current.", True),
    "sizes": "<p>One size: options about 37px tall inside a 45px track (8px padding plus 4px track padding), 14px labels. The track is as wide as its options; flush caps it at its container's width.</p>",
    "states": {
        "intro": "<p>Current is the real <code>aria-current=\"page\"</code> (or <code>aria-selected=\"true\"</code> if the control is ever built as tabs). Hover and focus are forced here with <code>data-state</code>; live pages use <code>:hover</code> and <code>:focus-visible</code>. There is no disabled option: a view with nothing in it still opens and shows its empty state (events series-empty).</p>",
        "matrix": matrix(STATES, [
            ("Option", '<nav class="segmented" aria-label="View"><a class="segmented__option" href="#"{a}>By date</a></nav>'),
            ("Option with icon", f'<nav class="segmented" aria-label="View"><a class="segmented__option" href="#"{{a}}>{REPEAT}Series (3)</a></nav>'),
            ("Ink option", '<nav class="segmented segmented--flush" aria-label="Platform"><a class="segmented__option segmented__option--ink" href="#"{a}>Instagram</a></nav>'),
        ]),
        "themes": themes(EVENTS + platforms("Facebook"), "stack"),
        "notes": "<ul><li><b>Hover</b> only darkens the label from muted to default; the current option does not change on hover.</li><li><b>Loading</b>: the control stays and the view below shows its skeleton (events series-loading).</li></ul>",
    },
    "responsive": """<ul>
<li>Default: the track stays as wide as its two options at every width; at 360px \"By date\" and \"Series (3)\" fit with room to spare. Labels never wrap (<code>white-space: nowrap</code>).</li>
<li>Flush: <code>max-width: 100%</code> and <code>overflow-x: auto</code>, so on a phone the four platforms scroll sideways inside the pill instead of widening the page.</li>
<li>Under <code>(pointer: coarse)</code> options get an invisible hit-area pseudo-element, but sized to <code>--target-min</code> (24px), which the 37px option already exceeds.</li>
</ul>""",
    "theming": "<p>Track <code>--color-bg-surface</code> with a <code>--color-border-default</code> ring; option label <code>--color-fg-muted</code>, hover <code>--color-fg-default</code>; current <code>--color-accent</code>/<code>--color-fg-on-accent</code>, or with <code>--ink</code> <code>--color-bg-inverse</code>/<code>--color-fg-inverse</code> (near-black in light, near-white in dark).</p>",
    "accessibility": {
        "pattern": "<p>A <code>&lt;nav&gt;</code> landmark with an <code>aria-label</code> (\"View\", \"Platform\") holding plain links; the current one has <code>aria-current=\"page\"</code>. Each view is its own URL, so this is navigation, not the APG Tabs pattern: no roving focus and no arrow keys. If a future screen switches panels without changing the URL, build it as <a href=\"https://www.w3.org/WAI/ARIA/apg/patterns/tabs/\">APG Tabs</a> (<code>role=\"tablist\"</code>, <code>role=\"tab\"</code>, <code>aria-selected</code>); the stylesheet already styles <code>aria-selected=\"true\"</code>.</p>",
        "keys": [
            (kbd("Tab") + " / " + kbd("Shift", "Tab"), "Moves between options, in order."),
            (kbd("Enter"), "Opens that view."),
        ],
        "focus": "<p>The shared 2px <code>--color-focus-ring</code> at 2px offset around the focused option's pill. In the flush form the ring sits inside the 4px track padding, so the scrolling track does not clip it.</p>",
        "labelling": "<p>The nav's <code>aria-label</code> names the choice; each link's text names the view, including the count (\"Series (3)\"). The repeat icon is decorative. The current view is announced from <code>aria-current</code>; on screen it is a filled pill against an unfilled track, a change of shape and luminance rather than of hue alone. In the dark theme the bordeaux fill is only about 2.2:1 against the dark track, so the label change (muted to on-accent) and <code>aria-current</code> carry the state; a lighter dark-theme accent fill would fix it.</p>",
        "pairs": [
            ("Option label", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Option label, hover", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Current label", "--color-fg-on-accent", "--color-accent", 4.5),
            ("Current ink label", "--color-fg-inverse", "--color-bg-inverse", 4.5),
            ("Current fill vs track (supplementary, about 2.2:1 in dark)", "--color-accent", "--color-bg-surface", 1),
            ("Focus ring on surface", "--color-focus-ring", "--color-bg-surface", 3),
        ],
        "motion": "<p>Fill and label colour change over <code>--duration-fast</code>; the fill does not slide between options. Instant under reduced motion.</p>",
        "touch": "<p>Options are about 37px tall, under the 44px rule. Their coarse-pointer extension uses <code>--target-min</code> (24px), so it adds nothing; proposed: <code>--target-comfortable</code>, as chips and small buttons use.</p>",
    },
    "content": """<ul>
<li>One or two words per option, sentence case: \"By date\", \"Series\". Platform names as their owners write them: \"WhatsApp\".</li>
<li>A count goes in brackets after the label when it helps choose: \"Series (3)\".</li>
<li>Two to four options; the default view first.</li>
</ul>""",
    "dodont": [
        ("do", EVENTS, "Two views of the same events, each a link with its own address."),
        ("dont", '<nav class="segmented segmented--flush" aria-label="Filter events"><a class="segmented__option" href="#" aria-current="page">All</a><a class="segmented__option" href="#">Run</a><a class="segmented__option" href="#">Workout</a><a class="segmented__option" href="#">Basketball</a><a class="segmented__option" href="#">Mobility</a></nav>',
         "Filters in a segmented control: they narrow the list, so they are chips, and five do not fit a phone."),
        ("do", platforms(), "Flush with a scroll on phones, so four platforms never widen the page."),
        ("dont", '<div class="segmented"><button class="segmented__option" type="button">Instagram</button><button class="segmented__option" type="button">Facebook</button></div>',
         "Buttons with no current state and no group name: nobody can tell which platform is showing."),
    ],
    "tokens": [
        ("Track fill / ring", "--color-bg-surface / --color-border-default", "color"),
        ("Option label / hover", "--color-fg-muted / --color-fg-default", "color"),
        ("Current fill / label", "--color-accent / --color-fg-on-accent", "color"),
        ("Current ink fill / label", "--color-bg-inverse / --color-fg-inverse", "color"),
        ("Track padding / top margin", "--space-1 / --space-6", "value"),
        ("Option padding", "--space-2 / --space-5", "value"),
        ("Icon gap", "--space-1-5", "value"),
        ("Label size / weight", "--font-size-sm / --font-weight-semibold", "value"),
        ("Radius", "--radius-full", "value"),
        ("Ring width", "--border-width-hairline", "value"),
        ("Coarse-pointer target", "--target-min", "value"),
        ("Transition", "--duration-fast / --ease-standard", "value"),
    ],
    "code": {
        "snippet": '''<nav class="segmented" aria-label="View">
  <a class="segmented__option" href="/events" aria-current="page">By date</a>
  <a class="segmented__option" href="/events?view=series"><svg class="icon" aria-hidden="true">…</svg>Series (3)</a>
</nav>

<nav class="segmented segmented--flush" aria-label="Platform">
  <a class="segmented__option segmented__option--ink" href="…" aria-current="page">Instagram</a>
  <a class="segmented__option segmented__option--ink" href="…">Facebook</a>
</nav>''',
        "classes": [
            ("<code>.segmented</code>", "The track."),
            ("<code>.segmented--flush</code>", "No top margin; caps at the container and scrolls sideways."),
            ("<code>.segmented__option</code>", "An option link."),
            ("<code>.segmented__option--ink</code>", "Near-black current fill for the admin console."),
            ("<code>aria-current=\"page\"</code> · <code>aria-selected=\"true\"</code>", "The current view (links) or selected tab (tabs)."),
            ("<code>data-state=\"hover|focus\"</code>", "Documentation only: forces a state."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/events/default", "By date current"),
            mock("pages/events/series", "Series current"),
            mock("pages/events/series-empty", "the control stays over an empty view"),
            mock("pages/admin-community-pick/default", "flush, ink: Instagram"),
            mock("pages/admin-community-pick/whatsapp", "flush, ink: WhatsApp"),
        ],
        "drift": "New with event series and Community Pick. In the dark theme <code>--color-accent</code> is about 2.2:1 against <code>--color-bg-surface</code>, under the 3:1 a state indicator should meet, so the label and <code>aria-current</code> carry the state there (open: the dark accent, see the README drift log). Fixed: the coarse-pointer hit area used <code>--target-min</code>; it now uses <code>--target-comfortable</code> (44px). <code>.segmented__option--ink</code> has no hover rule of its own and shares the muted-to-default label hover.",
    },
}
