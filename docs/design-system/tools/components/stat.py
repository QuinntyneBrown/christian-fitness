from dslib import ex, icon, kbd, matrix, mock, themes

HERO = (f'<div class="stat-hero"><p class="stat-hero__label">{icon("users")} Members</p>'
        '<p class="stat-hero__value">2,431</p><p class="stat-hero__sub">+86 joined in April</p></div>')
GRID = ('<dl class="stat-grid"><div class="stat"><dt>Registrations, April</dt><dd>221</dd></div>'
        '<div class="stat"><dt>Live listings</dt><dd>5</dd></div></dl>')


def fill(month, day, name, place, reg, cap, high=False):
    pct = round(reg * 100 / cap)
    pcls = "fill__pct fill__pct--high" if high else "fill__pct"
    return (f'<li><div class="event-row__date"><p class="event-row__month">{month}</p><p class="event-row__day">{day}</p></div>'
            f'<div class="mini-row__body"><p class="mini-row__name">{name}</p><p class="mini-row__text">{place}</p></div>'
            f'<div class="fill"><div class="fill__nums"><span class="fill__count">{reg} / {cap}</span><span class="{pcls}">{pct}%</span></div>'
            f'<meter class="fill__meter" min="0" max="{cap}" value="{reg}" aria-label="{name}: {reg} of {cap} registered"></meter></div></li>')


FILL = ('<ul class="fill-list">' + fill("Apr", "18", "Easter Sunrise 5K", "Martin Goodman Trail, Marilyn Bell Park", 142, 200)
        + fill("Apr", "30", "Women&#x27;s Hoops", "Downtown", 22, 24, True) + '</ul>')

SPEC = {
    "lead": "Stats show the numbers staff watch: how many members, how many registrations, how full each event is.",
    "meta": ["Status: stable", "Admin dashboard", "<code>&lt;dl&gt;</code> and <code>&lt;meter&gt;</code>"],
    "overview": """<ul>
<li><b>Stat hero</b> (<code>.stat-hero</code>): one headline number on a bordeaux panel, with a label and a change line. The dashboard's member count.</li>
<li><b>Stat tile</b> (<code>.stat</code> in a <code>.stat-grid</code>): smaller figures in a two-column description list.</li>
<li><b>Fill meter</b> (<code>.fill</code> in a <code>.fill-list</code>): registrations against capacity per event, as numbers and a native <code>&lt;meter&gt;</code>.</li>
</ul>
<p>Use a <a href="progress-bar.html">progress bar</a> for a task that finishes; a fill meter measures a quantity in a range.</p>""",
    "anatomy": {
        "figure": HERO,
        "callouts": [(14, 22), (14, 52), (14, 80)],
        "parts": [
            ("Label", "14px semibold <code>--color-fg-on-brand-highlight</code> with a 16px icon."),
            ("Value", "Barlow Condensed at <code>--font-size-6xl</code>, line-height 1, thousands separator."),
            ("Sub line", "Change over a named period in <code>--color-fg-on-brand-muted</code>."),
        ],
    },
    "variants": "<h3>Stat hero and tiles</h3>" + ex(HERO + GRID, "One hero per dashboard; tiles for the secondary figures.", True, mod="stack")
    + "<h3>Fill meters</h3>" + ex(FILL, "Count, percentage and meter; 90% and over is marked with <code>.fill__pct--high</code>.", True),
    "sizes": "<p>One size each. The hero value is <code>--font-size-6xl</code>, tile values <code>--font-size-3xl</code>, the meter <code>--size-meter</code> tall.</p>",
    "states": {
        "intro": "<p>Stats are read-only: no hover, focus, active or disabled. Their states are loading, empty (no events yet) and nearly full.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ""), ("Focus", ""), ("Active", ""), ("Disabled", ""), ("Loading", ""), ("Nearly full", "")], [
            ("Stat tile", '<dl class="stat-grid"><div class="stat"><dt>Live listings</dt><dd>5</dd></div></dl>',
             {"Hover": None, "Focus": None, "Active": None, "Disabled": None, "Nearly full": None}),
            ("Fill meter", '<div class="fill"><div class="fill__nums"><span class="fill__count">142 / 200</span><span class="fill__pct">71%</span></div><meter class="fill__meter" min="0" max="200" value="142" aria-label="Easter Sunrise 5K: 142 of 200 registered"></meter></div>',
             {"Hover": None, "Focus": None, "Active": None, "Disabled": None}),
        ]).replace('<td><dl class="stat-grid"><div class="stat"><dt>Live listings</dt><dd>5</dd></div></dl></td><td>—</td></tr>',
                   '<td><span class="skeleton skeleton--stat"></span></td><td>—</td></tr>', 1)
          .replace('<td><div class="fill"><div class="fill__nums"><span class="fill__count">142 / 200</span><span class="fill__pct">71%</span></div><meter class="fill__meter" min="0" max="200" value="142" aria-label="Easter Sunrise 5K: 142 of 200 registered"></meter></div></td></tr>',
                   '<td><div class="fill"><div class="fill__nums"><span class="fill__count">22 / 24</span><span class="fill__pct fill__pct--high">92%</span></div><meter class="fill__meter" min="0" max="24" value="22" aria-label="Women&#x27;s Hoops: 22 of 24 registered"></meter></div></td></tr>')
        .replace('<td><div class="fill"><div class="fill__nums"><span class="fill__count">142 / 200</span><span class="fill__pct">71%</span></div><meter class="fill__meter" min="0" max="200" value="142" aria-label="Easter Sunrise 5K: 142 of 200 registered"></meter></div></td><td>—</td><td>—</td><td>—</td><td>—</td><td>',
                 '<td><div class="fill"><div class="fill__nums"><span class="fill__count">142 / 200</span><span class="fill__pct">71%</span></div><meter class="fill__meter" min="0" max="200" value="142" aria-label="Easter Sunrise 5K: 142 of 200 registered"></meter></div></td><td>—</td><td>—</td><td>—</td><td>—</td><td><span class="skeleton skeleton--text"></span></td><td>'),
        "themes": themes(GRID + FILL),
        "notes": "<ul><li><b>Nearly full</b> (90% and over) makes the percentage accent and semibold; the number says it too.</li><li><b>Empty</b>: with no upcoming events the fill list becomes an empty state (\"No upcoming events\") with \"New event\".</li><li><b>Partial</b>: a figure that failed to load shows an inline retry in its place; the rest still render (dashboard partial).</li></ul>",
    },
    "responsive": "<ul><li>The tile grid is two columns at every width; the hero spans the column.</li><li>Fill rows put the date and name on one line and the meter full width beneath.</li></ul>",
    "theming": "<p>The hero reads <code>--color-bg-brand</code> with <code>--color-fg-on-brand</code>, <code>--color-fg-on-brand-highlight</code> and <code>--color-fg-on-brand-muted</code>. Tiles are surface cards. The meter track is <code>--color-border-default</code> and its value <code>--color-accent</code>.</p>",
    "accessibility": {
        "pattern": "<p>Tiles are a <code>&lt;dl&gt;</code>; the hero is text in a section with a heading. Fill uses a native <code>&lt;meter&gt;</code> with <code>min</code>, <code>max</code>, <code>value</code> and an <code>aria-label</code> naming the event and both numbers.</p>",
        "keys": [(kbd("Tab"), "Skips stats; they are not focusable.")],
        "focus": "<p>None.</p>",
        "labelling": "<p>Visible numbers come first; the meter repeats them in words (\"Easter Sunrise 5K: 142 of 200 registered\"), so the bar is never the only carrier.</p>",
        "pairs": [
            ("Hero value", "--color-fg-on-brand", "--color-bg-brand", 4.5),
            ("Hero label", "--color-fg-on-brand-highlight", "--color-bg-brand", 4.5),
            ("Hero sub", "--color-fg-on-brand-muted", "--color-bg-brand", 4.5),
            ("Tile label", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Meter value (non-text)", "--color-accent", "--color-border-default", 3),
        ],
        "motion": "<p>None; numbers and meters do not count up.</p>",
        "touch": "<p>Not interactive.</p>",
    },
    "content": "<ul><li>Labels name the measure and period: \"Registrations, April\".</li><li>Numbers use separators (\"2,431\"); changes are signed (\"+86 joined in April\").</li><li>Percentages are whole numbers.</li></ul>",
    "dodont": [
        ("do", FILL, "Numbers and a meter together (dashboard)."),
        ("dont", '<meter class="fill__meter" min="0" max="200" value="142"></meter>', "A bare meter: no numbers, no label."),
        ("do", '<dl class="stat-grid"><div class="stat"><dt>Registrations, April</dt><dd>221</dd></div></dl>', "Label says what and when."),
        ("dont", '<dl class="stat-grid"><div class="stat"><dt>Regs</dt><dd>221</dd></div></dl>', "Abbreviated labels with no period."),
    ],
    "tokens": [
        ("Hero fill / value", "--color-bg-brand / --color-fg-on-brand", "color"),
        ("Hero label / sub", "--color-fg-on-brand-highlight / --color-fg-on-brand-muted", "color"),
        ("Tile surface / ring", "--color-bg-surface / --color-border-default", "color"),
        ("Meter track / value", "--color-border-default / --color-accent", "color"),
        ("Hero radius / tile radius", "--radius-xl / --radius-lg", "value"),
        ("Hero value / tile value", "--font-size-6xl / --font-size-3xl", "value"),
        ("Meter height", "--size-meter", "value"),
    ],
    "code": {
        "snippet": '''<div class="fill">
  <div class="fill__nums"><span class="fill__count">142 / 200</span><span class="fill__pct">71%</span></div>
  <meter class="fill__meter" min="0" max="200" value="142"
         aria-label="Easter Sunrise 5K: 142 of 200 registered"></meter>
</div>''',
        "classes": [
            ("<code>.stat-hero</code> <code>__label</code> <code>__value</code> <code>__sub</code>", "Headline number on brand."),
            ("<code>.stat-grid</code> <code>.stat</code>", "Tiles in a description list."),
            ("<code>.fill-list</code> <code>.fill</code> <code>.fill__meter</code> <code>.fill__pct--high</code>", "Capacity rows and meter; nearly full."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/admin-dashboard/default", "hero, tiles, fill meters"),
            mock("pages/admin-dashboard/loading", "skeletons"),
            mock("pages/admin-dashboard/partial", "partial failure"),
            mock("pages/admin-dashboard/empty", "no upcoming events"),
        ],
        "drift": "The stat hero's 24px radius is now named <code>--radius-xl</code> (was 3xl); tiles' 16px is <code>--radius-lg</code> (was 2xl).",
    },
}
