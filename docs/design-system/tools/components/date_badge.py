from dslib import ex, image, kbd, matrix, mock, themes

BADGE = '<div class="date-badge" aria-hidden="true"><span class="date-badge__month">Apr</span><span class="date-badge__day">18</span></div>'
TILE = '<div class="date-tile" aria-hidden="true"><span class="date-tile__month">Apr</span><span class="date-tile__day">18</span></div>'
ROWDATE = '<div class="event-row__date"><p class="event-row__month">Apr</p><p class="event-row__day">25</p></div>'


def on_image(name="run"):
    return f'<div class="event-card__media">{image(name, "event-card__image")}{BADGE}</div>'


SPEC = {
    "lead": "Date badges show month and day at a glance, so people find Saturday's run before they read a word.",
    "meta": ["Status: stable", "Decorative; the date is also in text"],
    "overview": """<ul>
<li><b>Date badge</b> (<code>.date-badge</code>): a white tile pinned to the top left of an <a href="event-card.html">event card</a> image.</li>
<li><b>Date tile</b> (<code>.date-tile</code>): a solid bordeaux tile in the landing hero's floating card.</li>
<li><b>Date column</b> (<code>.event-row__date</code>): the untiled month and day at the start of an <a href="list.html">event row</a> and dashboard fill row.</li>
</ul>
<p>All three are visual shortcuts: the full date is always in text nearby, often visually hidden.</p>""",
    "anatomy": {
        "figure": TILE,
        "callouts": [(50, 25), (50, 68)],
        "parts": [
            ("Month", "12px uppercase, semibold (tile) or bold (badge), three letters."),
            ("Day", "Barlow Condensed 24px semibold, line-height 1."),
        ],
    },
    "variants": ex('<div class="w-40">' + on_image() + '</div>' + TILE + ROWDATE,
                   "Badge on an image, solid tile, plain row column.", True),
    "sizes": "<p>Badge <code>--size-date-badge</code> wide; tile and row column <code>--size-date-col</code>; the large event row widens the column to <code>--size-date-col-lg</code> with a 30px day.</p>",
    "states": {
        "intro": "<p>Date badges are not interactive: no hover, focus, active or disabled of their own. They follow the card or row that holds them. The only state is loading.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ""), ("Focus", ""), ("Active", ""), ("Disabled", ""), ("Loading", "")], [
            ("Tile", TILE, {"Hover": None, "Focus": None, "Active": None, "Disabled": None}),
            ("Row column", ROWDATE, {"Hover": None, "Focus": None, "Active": None, "Disabled": None}),
        ]).replace(f"<td>{TILE}</td></tr>", '<td><span class="skeleton skeleton--date"></span></td></tr>')
          .replace(f"<td>{ROWDATE}</td></tr>", '<td><span class="skeleton skeleton--date"></span></td></tr>'),
        "themes": themes(TILE + ROWDATE),
        "notes": "<ul><li>Loading uses <code>.skeleton--date</code> of the same size.</li><li>Past events are not shown on member surfaces, so there is no past state.</li></ul>",
    },
    "responsive": "<p>Fixed size at every width; it never wraps or scales with the card.</p>",
    "theming": "<p>Badge: <code>--color-bg-surface</code> with an accent month (<code>--color-fg-accent</code>). Tile: <code>--color-accent</code> with <code>--color-fg-on-accent</code>. In the dark theme the badge becomes the dark surface, still legible over photos because it is opaque.</p>",
    "accessibility": {
        "pattern": "<p>Decorative: <code>aria-hidden=\"true\"</code> on the badge, with the full date in text in the card (\"<span class=\"visually-hidden\">Apr 18, </span>Sat 6:45 AM\"), so screen readers hear \"Apr 18\" once, not \"Apr\" \"18\".</p>",
        "keys": [(kbd("Tab"), "Not focusable; the card or row is.")],
        "focus": "<p>None.</p>",
        "labelling": "<p>Hidden from assistive technology; the card's meta line carries the date.</p>",
        "pairs": [
            ("Badge month", "--color-fg-accent", "--color-bg-surface", 4.5),
            ("Badge day", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Tile text", "--color-fg-on-accent", "--color-accent", 4.5),
        ],
        "motion": "<p>None.</p>",
        "touch": "<p>Not a target.</p>",
    },
    "content": "<ul><li>Month as three letters (\"Apr\"), uppercased by CSS so screen readers that see it read a word, not letters.</li><li>Day without a leading zero (\"8\", not \"08\").</li></ul>",
    "dodont": [
        ("do", TILE + '<p class="hero__float-meta"><span class="visually-hidden">Sat, Apr 18 · </span>142 going · Free</p>', "Hidden badge plus the date in text (landing hero)."),
        ("dont", '<div class="date-tile"><span class="date-tile__month">Apr</span><span class="date-tile__day">18</span></div><p class="hero__float-meta">142 going · Free</p>', "The badge as the only date, read as \"Apr 18\" in pieces, or missed."),
        ("do", '<div class="date-tile" aria-hidden="true"><span class="date-tile__month">Apr</span><span class="date-tile__day">8</span></div>', "Day without a leading zero."),
        ("dont", '<div class="date-tile" aria-hidden="true"><span class="date-tile__month">April</span><span class="date-tile__day">08</span></div>', "A full month name overflows the tile; padded day."),
    ],
    "tokens": [
        ("Badge fill / month", "--color-bg-surface / --color-fg-accent", "color"),
        ("Tile fill / text", "--color-accent / --color-fg-on-accent", "color"),
        ("Width badge / tile", "--size-date-badge / --size-date-col", "value"),
        ("Radius", "--radius-md", "value"),
        ("Month / day size", "--font-size-xs / --font-size-2xl", "value"),
        ("Inset on image", "--space-4", "value"),
    ],
    "code": {
        "snippet": '''<div class="event-card__media">
  <img class="event-card__image" src="run.jpg" alt="" width="1376" height="768">
  <div class="date-badge" aria-hidden="true"><span class="date-badge__month">Apr</span><span class="date-badge__day">18</span></div>
</div>''',
        "classes": [
            ("<code>.date-badge</code> <code>__month</code> <code>__day</code>", "Pinned badge; needs a positioned parent (<code>.event-card__media</code>)."),
            ("<code>.date-tile</code> <code>__month</code> <code>__day</code>", "Solid in-flow tile."),
            ("<code>.event-row__date</code> <code>.event-row__month</code> <code>.event-row__day</code>", "Untiled row column."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/events/default", "badge on card images"),
            mock("pages/landing/default", "tile in the hero card"),
            mock("pages/home/default", "row date column"),
        ],
        "drift": "Badge months were 11px; they snapped to 12px (<code>--font-size-xs</code>). The 12px radius is now named <code>--radius-md</code> (was xl).",
    },
}
