from dslib import INTERACTIVE, ex, kbd, matrix, mock, themes

BAR = ('<div class="chip-bar" role="group" aria-label="Filter events">'
       '<a class="chip" href="#" aria-current="page">All</a><a class="chip" href="#">Run</a><a class="chip" href="#">Workout</a>'
       '<a class="chip" href="#">Basketball</a><span class="chip-bar__divider" aria-hidden="true"></span>'
       '<label class="check"><input class="check__box" type="checkbox"> Only events I&#x27;m going to</label></div>')
INTERESTS = ('<fieldset><legend class="field__legend">Into</legend><div class="interest-list">'
             '<button class="interest" type="button" aria-pressed="true">Running</button>'
             '<button class="interest" type="button" aria-pressed="true">Strength</button>'
             '<button class="interest" type="button" aria-pressed="false">Walking groups</button>'
             '<button class="interest" type="button" aria-pressed="false">Mobility</button></div></fieldset>')
TAGS = '<div class="tag-list"><span class="tag">Running</span><span class="tag">Strength</span><span class="tag">Nutrition</span></div>'

SPEC = {
    "lead": "Chips narrow a list or pick interests in one tap. Tags show those interests back, read-only.",
    "meta": ["Status: stable", "<code>&lt;a&gt;</code>, <code>&lt;button aria-pressed&gt;</code>, <code>&lt;span&gt;</code>"],
    "overview": """<ul>
<li><b>Filter chip</b> (<code>.chip</code>) in a <code>.chip-bar</code>: each is a link to a filtered view; the current one has <code>aria-current="page"</code>. Events by type, professionals by kind.</li>
<li><b>Interest toggle</b> (<code>.interest</code>): a <code>&lt;button aria-pressed&gt;</code> in the edit-profile dialog; several can be on.</li>
<li><b>Tag</b> (<code>.tag</code>): a read-only label on the profile.</li>
</ul>
<p>Use a <a href="tabs.html">tab</a> for views of one thing, a <a href="checkbox.html">checkbox</a> inside a form that submits, and a <a href="badge.html">badge</a> for status.</p>""",
    "anatomy": {
        "figure": '<a class="chip" href="#" aria-current="page">All</a><a class="chip" href="#">Run</a>',
        "callouts": [(30, 50), (70, 50)],
        "parts": [
            ("Current chip", "Inverse fill (<code>--color-bg-inverse</code>), no ring."),
            ("Chip", "Surface pill with a hairline inset ring, 14px semibold, 8px × 16px padding."),
        ],
    },
    "variants": "<h3>Filter chips</h3>" + ex(BAR, "A group of links; one is current. A divider separates the type filters from the \"going\" checkbox above 640px.", True)
    + "<h3>Interest toggles</h3>" + ex(INTERESTS, "Multi-select toggles; pressed ones fill bordeaux.", True)
    + "<h3>Tags</h3>" + ex(TAGS, "Read-only, accent-subtle.", True),
    "sizes": "<p>One size: chips 36px tall (8px padding, 14px label); interests and tags 6px × 14px padding. On coarse pointers chips extend to a 44px target.</p>",
    "states": {
        "intro": "<p>Filter chips are links: current via <code>aria-current=\"page\"</code>. Interests are toggles: pressed via <code>aria-pressed</code>. Pointer and focus are forced with <code>data-state</code>.</p>",
        "matrix": matrix(INTERACTIVE + [("Current or pressed", "")], [
            ("Filter chip", '<a class="chip" href="#"{a}>Run</a>', {"Disabled": None, "Current or pressed": ' aria-current="page"'}),
            ("Interest", '<button class="interest" type="button" aria-pressed="false"{a}>Mobility</button>',
             {"Current or pressed": ""}),
            ("Tag", '<span class="tag">Running</span>', {"Hover": None, "Focus": None, "Active": None, "Disabled": None, "Current or pressed": None}),
        ]).replace('<td><button class="interest" type="button" aria-pressed="false">Mobility</button></td></tr>',
                   '<td><button class="interest" type="button" aria-pressed="true">Mobility</button></td></tr>'),
        "themes": themes(BAR + INTERESTS),
        "notes": "<ul><li>Filter chips have no disabled state: a filter with no results still opens, and shows a no-results state.</li><li>Interests are disabled together while the dialog saves (edit-profile busy).</li></ul>",
    },
    "responsive": "<ul><li>The bar wraps onto more lines; chips never shrink or truncate.</li><li>The divider hides below <code>--layout-breakpoint-sm</code>, where the checkbox wraps to its own line.</li></ul>",
    "theming": "<p>Chip: <code>--color-bg-surface</code>, ring <code>--color-border-default</code> (hover <code>--color-border-hover</code>), current <code>--color-bg-inverse</code>/<code>--color-fg-inverse</code>. Interest pressed: <code>--color-accent</code>/<code>--color-fg-on-accent</code>. Tag: <code>--color-accent-subtle</code>/<code>--color-fg-accent</code>.</p>",
    "accessibility": {
        "pattern": "<p>Filter chips are links in a <code>role=\"group\"</code> with an <code>aria-label</code>; the current one has <code>aria-current=\"page\"</code>. Interests are toggle buttons (<a href=\"https://www.w3.org/WAI/ARIA/apg/patterns/button/\">APG Button, toggle</a>) inside a <code>&lt;fieldset&gt;</code> with a legend.</p>",
        "keys": [
            (kbd("Tab"), "Moves between chips."),
            (kbd("Enter"), "Follows a filter chip."),
            (kbd("Space") + ", " + kbd("Enter"), "Toggles an interest."),
        ],
        "focus": "<p>The shared 2px ring at 2px offset follows the pill shape.</p>",
        "labelling": "<p>The chip text is the name. The group label (\"Filter events\") or legend (\"Into\") gives context. Pressed and current are announced from the attributes, and the fill change is backed by the attribute, not colour alone.</p>",
        "pairs": [
            ("Chip label", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Current chip", "--color-fg-inverse", "--color-bg-inverse", 4.5),
            ("Pressed interest", "--color-fg-on-accent", "--color-accent", 4.5),
            ("Tag", "--color-fg-accent", "--color-accent-subtle", 4.5),
            ("Chip ring (non-text)", "--color-border-default", "--color-bg-canvas", 1),
        ],
        "motion": "<p>Background, ring and colour over <code>--duration-fast</code>; none under reduced motion.</p>",
        "touch": "<p>Chips are 36px and extend to 44 × 44px on coarse pointers; 8px gaps (<code>--space-2</code>) between.</p>",
    },
    "content": "<ul><li>One or two words, sentence case: \"Run\", \"Walking groups\".</li><li>The first filter is \"All\".</li><li>No counts inside chips; results say how many.</li></ul>",
    "dodont": [
        ("do", '<a class="chip" href="#" aria-current="page">All</a><a class="chip" href="#">Run</a>', "Filter chips are links with a current one (events)."),
        ("dont", '<button class="chip" type="button">All</button><button class="chip" type="button">Run</button>', "Buttons with no pressed or current state; nobody can tell which filter is on."),
        ("do", '<button class="interest" type="button" aria-pressed="true">Running</button>', "Interests announce their pressed state."),
        ("dont", '<span class="tag">Running</span><span class="tag">Mobility</span>', "Tags used as toggles in the edit dialog; tags are read-only."),
    ],
    "tokens": [
        ("Chip fill / ring / hover ring", "--color-bg-surface / --color-border-default / --color-border-hover", "color"),
        ("Current chip", "--color-bg-inverse / --color-fg-inverse", "color"),
        ("Pressed interest", "--color-accent / --color-fg-on-accent", "color"),
        ("Tag", "--color-accent-subtle / --color-fg-accent", "color"),
        ("Chip padding", "--space-2 / --space-4", "value"),
        ("Interest and tag padding", "--space-1-5 / --space-3-5", "value"),
        ("Radius", "--radius-full", "value"),
        ("Divider height", "--size-divider-h", "value"),
    ],
    "code": {
        "snippet": '''<div class="chip-bar" role="group" aria-label="Filter events">
  <a class="chip" href="/events" aria-current="page">All</a>
  <a class="chip" href="/events?type=run">Run</a>
</div>
<button class="interest" type="button" aria-pressed="true">Running</button>
<span class="tag">Running</span>''',
        "classes": [
            ("<code>.chip-bar</code> <code>.chip</code> <code>.chip-bar__divider</code>", "Filter bar, chip, divider."),
            ("<code>.interest-list</code> <code>.interest</code>", "Interest toggles."),
            ("<code>.tag-list</code> <code>.tag</code>", "Read-only tags."),
            ("<code>aria-current=\"page\"</code> · <code>aria-pressed</code>", "Current filter; pressed toggle."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/events/default", "filter chips, divider"),
            mock("pages/services/default", "service filter chips"),
            mock("dialogs/edit-profile/default", "interest toggles"),
            mock("dialogs/edit-profile/busy", "disabled interests"),
            mock("pages/profile/default", "tags"),
        ],
        "drift": "none",
    },
}
