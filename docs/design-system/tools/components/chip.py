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
KINDS = [("All", 12), ("Organizations", 3), ("People", 1), ("Instructors", 2), ("Ambassadors", 2), ("Companies", 2), ("Church Ministries", 2)]
SCROLL = ('<nav class="chip-bar chip-bar--scroll" aria-label="Filter the directory by kind">' + "".join(
    f'<a class="chip" href="#"{" aria-current=" + chr(34) + "page" + chr(34) if i == 0 else ""}>{k}<span class="chip__count">{n}</span></a>'
    for i, (k, n) in enumerate(KINDS)) + "</nav>")
TIGHT = BAR.replace('class="chip-bar"', 'class="chip-bar chip-bar--tight"')
TAGS_SM = '<span class="tag tag--sm">Joined</span>'
TAGS_OUTLINE = '<ul class="tag-list"><li class="tag tag--outline">Running</li><li class="tag tag--outline">Beginners</li><li class="tag tag--outline">Race training</li></ul>'
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
    + ex(TIGHT, "<code>.chip-bar--tight</code>: 16px above instead of the default, when the bar follows the By date / Series switch (events/default).", True)
    + ex(SCROLL, "<code>.chip-bar--scroll</code> with counts (<code>.chip__count</code>): one line that scrolls sideways on phones and bleeds to the screen edge; wraps from 640px (directory/default).", True, mod="block")
    + "<h3>Interest toggles</h3>" + ex(INTERESTS, "Multi-select toggles; pressed ones fill bordeaux.", True)
    + "<h3>Tags</h3>" + ex(TAGS, "Read-only, accent-subtle.", True)
    + ex(TAGS_SM, "<code>.tag--sm</code>: 4px × 12px, the \"Joined\" marker in a series row (events/series).", True)
    + ex(TAGS_OUTLINE, "<code>.tag--outline</code>: surface with a hairline ring, default text, for a listing's focus areas (listing-profile/default).", True),
    "sizes": "<p>One size: chips 36px tall (8px padding, 14px label); interests and tags 6px × 14px padding; <code>.tag--sm</code> 4px × 12px. On coarse pointers chips extend to a 44px target.</p>",
    "states": {
        "intro": "<p>Filter chips are links: current via <code>aria-current=\"page\"</code>. Interests are toggles: pressed via <code>aria-pressed</code>. Pointer and focus are forced with <code>data-state</code>.</p>",
        "matrix": matrix(INTERACTIVE + [("Current or pressed", "")], [
            ("Filter chip", '<a class="chip" href="#"{a}>Run</a>', {"Disabled": None, "Current or pressed": ' aria-current="page"'}),
            ("Interest", '<button class="interest" type="button" aria-pressed="false"{a}>Mobility</button>',
             {"Current or pressed": ""}),
            ("Tag", '<span class="tag">Running</span>', {"Hover": None, "Focus": None, "Active": None, "Disabled": None, "Current or pressed": None}),
            ("Tag, outline", '<span class="tag tag--outline">Beginners</span>', {"Hover": None, "Focus": None, "Active": None, "Disabled": None, "Current or pressed": None}),
            ("Chip with count", '<a class="chip" href="#"{a}>Instructors<span class="chip__count">2</span></a>', {"Disabled": None, "Current or pressed": ' aria-current="page"'}),
        ]).replace('<td><button class="interest" type="button" aria-pressed="false">Mobility</button></td></tr>',
                   '<td><button class="interest" type="button" aria-pressed="true">Mobility</button></td></tr>'),
        "themes": themes(BAR + INTERESTS + '<div class="mt-3">' + TAGS_SM + " " + TAGS_OUTLINE + "</div>"),
        "notes": "<ul><li>Filter chips have no disabled state: a filter with no results still opens, and shows a no-results state.</li><li>Interests are disabled together while the dialog saves (edit-profile busy).</li></ul>",
    },
    "responsive": "<ul><li>The bar wraps onto more lines; chips never shrink or truncate.</li><li>The divider hides below <code>--layout-breakpoint-sm</code>, where the checkbox wraps to its own line.</li><li><code>.chip-bar--scroll</code> does not wrap below 640px: it scrolls sideways with its scrollbar hidden, its negative inline margin running the chips to the screen edge; from 640px it wraps like the default bar.</li></ul>",
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
            ("Outline tag", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Chip count", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Chip ring (non-text)", "--color-border-default", "--color-bg-canvas", 1),
        ],
        "motion": "<p>Background, ring and colour over <code>--duration-fast</code>; none under reduced motion.</p>",
        "touch": "<p>Chips are 36px and extend to 44 × 44px on coarse pointers; 8px gaps (<code>--space-2</code>) between.</p>",
    },
    "content": "<ul><li>One or two words, sentence case: \"Run\", \"Walking groups\".</li><li>The first filter is \"All\".</li><li>Counts appear only where a chip names a group of listings (\"Instructors 2\" in the directory); event filters have none, the results say how many.</li><li>Small tag: one word, \"Joined\". Outline tags: a listing's focus, \"Race training\".</li></ul>",
    "dodont": [
        ("do", '<a class="chip" href="#" aria-current="page">All</a><a class="chip" href="#">Run</a>', "Filter chips are links with a current one (events)."),
        ("dont", '<button class="chip" type="button">All</button><button class="chip" type="button">Run</button>', "Buttons with no pressed or current state; nobody can tell which filter is on."),
        ("do", '<button class="interest" type="button" aria-pressed="true">Running</button>', "Interests announce their pressed state."),
        ("dont", '<span class="tag">Running</span><span class="tag">Mobility</span>', "Tags used as toggles in the edit dialog; tags are read-only."),
        ("do", SCROLL, "Many long filters scroll on one line on phones, keeping the list in view (directory)."),
        ("dont", SCROLL.replace(" chip-bar--scroll", ""), "Seven wrapping chips push the directory off the first screen on a phone."),
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
        ("Outline tag", "--color-bg-surface / --color-fg-default / --color-border-default", "color"),
        ("Chip count", "--color-fg-muted", "color"),
        ("Small tag padding", "--space-1 / --space-3", "value"),
        ("Scroll bleed / tight margin", "--space-4", "value"),
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
            ("<code>.chip-bar--tight</code> <code>.chip-bar--scroll</code> <code>.chip__count</code>", "Bar with 16px top margin; one scrolling line on phones; a count in a chip."),
            ("<code>.tag--sm</code> <code>.tag--outline</code>", "Small tag; surface tag with a ring."),
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
            mock("pages/events/series", "tight bar, small tag"),
            mock("pages/directory/default", "scrolling bar with counts"),
            mock("pages/listing-profile/default", "outline tags"),
        ],
        "drift": "The directory's chip bar is a <code>&lt;nav&gt;</code> while the events bar is a <code>role=\"group\"</code>; both are sets of links to filtered views and either works, but one pattern is better. Proposed: <code>&lt;nav aria-label&gt;</code> for both. <code>.chip-bar--scroll</code> hides its scrollbar (<code>scrollbar-width: none</code>), so the only sign of more chips is the cut-off chip at the edge.",
    },
}
