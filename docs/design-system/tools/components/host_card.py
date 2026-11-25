from dslib import ex, icon, image, kbd, mock, themes


def vmatrix(variant, rows):
    """A state matrix for wide blocks: states down, one variant column. rows: (state, html or None)."""
    body = "".join(f'<tr><th scope="row">{st}</th><td>{"—" if h is None else h}</td></tr>' for st, h in rows)
    return (f'<div class="ds-matrix"><table><thead><tr><th scope="col">State</th><th scope="col">{variant}</th></tr></thead>'
            f'<tbody>{body}</tbody></table></div>')


VERIFIED = f'<span class="verified-mark" role="img" aria-label="Verified">{icon("badge-check")}</span>'


def host(mark, label, name, verified=True, a=""):
    v = VERIFIED if verified else ""
    return (f'<a class="host-card" href="#"{a}>{mark}<span class="host-card__body"><span class="host-card__label">{label}</span>'
            f'<span class="host-card__name"><span>{name}</span>{v}</span></span>{icon("arrow-right", "host-card__arrow")}</a>')


ORG = host('<span class="listing-mark" aria-hidden="true">LR</span>', "Hosted by", "Lakeshore Runners Fellowship")
ONEOFF = host('<span class="listing-mark" aria-hidden="true">CF</span>', "Hosted by · Organization", "Christian Fitness")
PERSON = host(image("trainer", "listing-mark listing-mark--person"), "Hosted by · Instructor", "Danielle Okafor")
UNVERIFIED = host('<span class="listing-mark" aria-hidden="true">NA</span>', "Hosted by · Company", "Northline Athletic", verified=False)
HREF = 'class="hosting-row" href="#"'
DS = ' data-state="{}"'
NARROW = '<div class="w-80">{c}</div>'


def hrow(img="run", meta=None, title="Couch to 5K Run Club", sub="Next: Tue Apr 21, 6:30 PM · 5 sessions left", a=""):
    meta = meta if meta is not None else f'{icon("repeat", "icon--xs")}Series · Every Tuesday'
    return (f'<a class="hosting-row" href="#"{a}>{image(img, "hosting-row__image")}<span class="hosting-row__body">'
            f'<span class="hosting-row__meta">{meta}</span><span class="display hosting-row__title">{title}</span>'
            f'<span class="hosting-row__sub">{sub}</span></span>{icon("arrow-right", "hosting-row__arrow")}</a>')


SERIES = hrow()
ONE = hrow("run", "Run · Sat Apr 18", "Easter Sunrise 5K", "6:45 AM · Martin Goodman Trail, Marilyn Bell Park")
BOOT = hrow("bootcamp", f'{icon("repeat", "icon--xs")}Series · Every Saturday', "Saturday Park Bootcamp", "Next: Sat Apr 25, 8:00 AM · 5 sessions left")
HOSTING = f'<ul class="hosting"><li>{SERIES}</li><li>{ONE}</li></ul>'
EMPTY = '<p class="hosting__empty">Northline Athletic isn&#x27;t hosting anything right now. Follow to hear when they post a date.</p>'

SPEC = {
    "lead": "Who runs an event, and what a listing runs: the host card links an event to its host's listing, and hosting rows link a listing back to its events.",
    "meta": ["Status: new", "Whole-card <code>&lt;a&gt;</code>", "Member app"],
    "overview": """<p>Every event and series is hosted by a <a href="listing-row.html">directory listing</a> (an organization, an instructor, a church ministry). Two blocks make that link both ways:</p>
<ul>
<li><b>Host card</b> (<code>.host-card</code>): under the sign-up panel on an event or series page. The listing's mark, \"Hosted by · Instructor\", the name with a <b>verified mark</b>, and an arrow to the listing. It replaced the old \"Posted by the Christian Fitness team\" line.</li>
<li><b>Hosting</b> (<code>.hosting</code> of <code>.hosting-row</code>): the Hosting section of a listing's profile; one row per series or one-off event, or a sentence (<code>.hosting__empty</code>) when there is nothing.</li>
<li><b>Verified mark</b> (<code>.verified-mark</code>): the accent badge-check after a verified name, wherever the name appears (host card, listing row).</li>
</ul>
<p>Use an <a href="event-card.html">event card</a> to browse events and a <a href="series-card.html">series row</a> to browse series; hosting rows are for one listing's own events.</p>""",
    "anatomy": {
        "figure": '<div class="w-90" style="contain: inline-size">' + ORG + "</div>",
        "callouts": [(7, 45), (36, 28), (30, 68), (62, 52), (92, 45)],
        "parts": [
            ("Mark", "<a href=\"listing-row.html\">Listing mark</a> 48px: initials on a dark square for organizations, a round photo or blush initials for people. Decorative."),
            ("Label", "\"Hosted by\", plus the listing's kind on event pages (\"· Instructor\"); 14px muted."),
            ("Name", "Semibold, one line with ellipsis; accent on hover."),
            ("Verified mark", "<code>.verified-mark</code>: badge-check icon, accent, <code>role=\"img\" aria-label=\"Verified\"</code>; left out when the listing is not verified."),
            ("Arrow", "Muted arrow-right, decorative: the whole card is the link."),
        ],
    },
    "variants": "<h3>Host card</h3>"
    + ex(NARROW.format(c=ORG), "Series page: \"Hosted by\" (event-series/default).", True)
    + ex(NARROW.format(c=ONEOFF), "One-off event: the kind after the label (event-detail/default).", True)
    + ex(NARROW.format(c=PERSON), "A person: round photo (event-detail/unregistered).", True)
    + ex(NARROW.format(c=UNVERIFIED), "Not verified: no mark; the card is otherwise the same.", True)
    + "<h3>Hosting rows</h3>"
    + ex(HOSTING, "A series (repeat icon, cadence, next date and sessions left) and a one-off (type and date, time and place) (listing-profile/default, one-off).", True, mod="block")
    + ex(EMPTY, "Nothing hosted: one sentence that says so and what to do (listing-profile/unverified).", True, mod="block"),
    "sizes": "<p>One size each. The host card is 16px padded with a 48px mark (<code>--size-avatar-xl</code>). Hosting rows are 12px padded with a 5.5rem 4:3 image, 8rem from 640px.</p>",
    "states": {
        "intro": "<p>Both are links. Hover is forced with <code>data-state=\"hover\"</code> (host card: surface fill; hosting row: lifted shadow), focus with <code>data-state=\"focus\"</code>. Neither has an active or disabled state: a listing or event that cannot be opened is not shown.</p>",
        "matrix": vmatrix("Host card", [
            ("Default", NARROW.format(c=ORG)),
            ("Hover", NARROW.format(c=ORG.replace('class="host-card" href="#"', 'class="host-card" href="#" data-state="hover"'))),
            ("Focus", NARROW.format(c=ORG.replace('class="host-card" href="#"', 'class="host-card" href="#" data-state="focus"'))),
            ("Active", None), ("Disabled", None),
        ]) + vmatrix("Hosting row", [
            ("Default", f'<ul class="hosting">{"<li>" + BOOT + "</li>"}</ul>'),
            ("Hover", f'<ul class="hosting"><li>{BOOT.replace(HREF, HREF + DS.format("hover"))}</li></ul>'),
            ("Focus", f'<ul class="hosting"><li>{BOOT.replace(HREF, HREF + DS.format("focus"))}</li></ul>'),
            ("Active", None), ("Disabled", None),
            ("Empty", EMPTY),
        ])
        + "<h3>Loading</h3>" + ex('<div class="skeleton-stack" aria-busy="true" aria-label="Loading listing"><span class="skeleton skeleton--title w-20"></span>'
                                  '<span class="skeleton skeleton--block skeleton--tile"></span></div>',
                                  "Hosting loads as a title line and a tile (listing-profile/loading).", True, mod="block"),
        "themes": themes(NARROW.format(c=PERSON) + NARROW.format(c=ONEOFF)) + themes(f'<ul class="hosting"><li>{SERIES}</li></ul>', mod="block"),
        "notes": "<ul><li>Hover turns the name accent on both blocks, with the fill or the shadow; the matrix shows it through the <code>data-state="hover"</code> hook.</li><li><b>Verified</b> is announced (\"Verified\"), and an unverified listing simply has no mark, never a warning.</li></ul>",
    },
    "responsive": """<ul>
<li><b>Host card</b>: fills the aside; the name truncates with an ellipsis and the verified mark never shrinks. Below 1024px the aside, and the card, sit under the content.</li>
<li><b>Hosting row</b>: 5.5rem image column on phones, 8rem from 640px; title and sub truncate to one line each.</li>
</ul>""",
    "theming": "<p>The host card has no fill at rest, a <code>--color-border-default</code> ring, and <code>--color-bg-surface</code> on hover. Hosting rows sit on <code>--color-bg-surface</code> with the same ring and add <code>--shadow-2</code> on hover. Meta and the verified mark read <code>--color-fg-accent</code>; labels and subs <code>--color-fg-muted</code>.</p>",
    "accessibility": {
        "pattern": "<p>Each is one <code>&lt;a&gt;</code> wrapping the whole card or row, with <code>&lt;span&gt;</code>s inside (no block elements or nested controls). The verified mark is an image role with the name \"Verified\"; the mark and arrows are <code>aria-hidden</code>. Hosting rows sit in a <code>&lt;ul&gt;</code> under the \"Hosting 1\" heading.</p>",
        "keys": [(kbd("Tab"), "Moves to the host card or the next hosting row."), (kbd("Enter"), "Opens the listing or the event.")],
        "focus": "<p>The shared ring follows the card's <code>--radius-xl</code> and the row's <code>--radius-lg</code>.</p>",
        "labelling": "<p>The host card reads \"Hosted by · Instructor, Danielle Okafor, Verified\". A hosting row reads its meta, title and sub in order.</p>",
        "pairs": [
            ("Host name", "--color-fg-default", "--color-bg-canvas", 4.5),
            ("Host label", "--color-fg-muted", "--color-bg-canvas", 4.5),
            ("Name on hover fill", "--color-fg-accent", "--color-bg-surface", 4.5),
            ("Verified mark (non-text)", "--color-fg-accent", "--color-bg-canvas", 3),
            ("Hosting meta", "--color-fg-accent", "--color-bg-surface", 4.5),
            ("Hosting sub", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Empty sentence", "--color-fg-muted", "--color-bg-canvas", 4.5),
        ],
        "motion": "<p>Background (host card) and shadow (hosting row) over <code>--duration-fast</code> and <code>--duration-base</code>; none under reduced motion.</p>",
        "touch": "<p>Both are full-width targets at least 80px tall.</p>",
    },
    "content": """<ul>
<li>Label: \"Hosted by\" on a series page; \"Hosted by · Organization\" or \"· Instructor\" on an event page.</li>
<li>Series rows: \"Series · Every Tuesday\" and \"Next: Tue Apr 21, 6:30 PM · 5 sessions left\". One-off rows: \"Run · Sat Apr 18\" and \"6:45 AM · Martin Goodman Trail, Marilyn Bell Park\".</li>
<li>Empty: \"Northline Athletic isn't hosting anything right now. Follow to hear when they post a date.\"</li>
</ul>""",
    "dodont": [
        ("do", NARROW.format(c=ORG), "Name the host and link to their listing (event-series/default)."),
        ("dont", '<p class="posted-by">Posted by the Christian Fitness team</p>', "The old line: names no host and leads nowhere."),
        ("do", '<span class="host-card__name"><span>Christian Fitness</span>' + VERIFIED + "</span>", "The verified mark has a name."),
        ("dont", '<span class="host-card__name"><span>Christian Fitness</span><span class="verified-mark">' + icon("badge-check") + "</span></span>",
         "A bare icon: screen readers skip it and the listing's vetting is lost."),
        ("do", EMPTY, "Say there is nothing hosted and what to do."),
        ("dont", '<ul class="hosting"></ul><p class="hosting__empty">None</p>', "\"None\" under an empty list says nothing useful."),
    ],
    "tokens": [
        ("Card ring / hover fill", "--color-border-default / --color-bg-surface", "color"),
        ("Row surface", "--color-bg-surface", "color"),
        ("Name, title", "--color-fg-default", "color"),
        ("Label, sub, arrow, empty", "--color-fg-muted", "color"),
        ("Meta, verified mark, hover name", "--color-fg-accent", "color"),
        ("Row hover shadow", "--shadow-2", "value"),
        ("Card radius / row radius / image radius", "--radius-xl / --radius-lg / --radius-md", "value"),
        ("Card padding / row padding", "--space-4 / --space-3", "value"),
        ("Row title", "--font-size-2xl", "value"),
        ("Mark size", "--size-avatar-xl", "value"),
        ("Empty sentence width", "--layout-lead-max", "value"),
        ("Transition", "--duration-fast / --duration-base / --ease-standard", "value"),
    ],
    "code": {
        "snippet": '''<a class="host-card" href="/directory/lakeshore-runners">
  <span class="listing-mark" aria-hidden="true">LR</span>
  <span class="host-card__body">
    <span class="host-card__label">Hosted by</span>
    <span class="host-card__name"><span>Lakeshore Runners Fellowship</span><span class="verified-mark" role="img" aria-label="Verified"><svg class="icon" aria-hidden="true">…</svg></span></span>
  </span>
  <svg class="icon host-card__arrow" aria-hidden="true">…</svg>
</a>

<ul class="hosting">
  <li><a class="hosting-row" href="/events/series/couch-to-5k">
    <img class="hosting-row__image" src="run.jpg" alt="" width="1376" height="768">
    <span class="hosting-row__body">
      <span class="hosting-row__meta"><svg class="icon icon--xs" aria-hidden="true">…</svg>Series · Every Tuesday</span>
      <span class="display hosting-row__title">Couch to 5K Run Club</span>
      <span class="hosting-row__sub">Next: Tue Apr 21, 6:30 PM · 5 sessions left</span>
    </span>
    <svg class="icon hosting-row__arrow" aria-hidden="true">…</svg>
  </a></li>
</ul>''',
        "classes": [
            ("<code>.host-card</code> <code>__body</code> <code>__label</code> <code>__name</code> <code>__arrow</code>", "Host card."),
            ("<code>.verified-mark</code>", "Accent badge-check after a verified name; <code>role=\"img\" aria-label=\"Verified\"</code>."),
            ("<code>.hosting</code> <code>.hosting__empty</code>", "The Hosting list and its empty sentence."),
            ("<code>.hosting-row</code> <code>__image</code> <code>__body</code> <code>__meta</code> <code>__title</code> <code>__sub</code> <code>__arrow</code>", "Hosting row."),
            ("<code>data-state=\"hover|focus\"</code>", "Documentation hooks."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/event-detail/default", "host card, organization"),
            mock("pages/event-detail/unregistered", "host card, instructor photo"),
            mock("pages/event-series/default", "host card on a series"),
            mock("pages/listing-profile/default", "hosting a series"),
            mock("pages/listing-profile/one-off", "hosting a one-off"),
            mock("pages/listing-profile/person", "instructor hosting"),
            mock("pages/listing-profile/unverified", "hosting nothing, no verified mark"),
            mock("pages/listing-profile/loading", "skeleton"),
            mock("pages/directory/default", "verified marks in rows"),
        ],
        "drift": """<ul>
<li>The \"Posted by the Christian Fitness team\" line (<code>.posted-by</code>) on event pages became the host card; <code>.posted-by</code> stays in components.css but no mock uses it now. Proposed: remove it.</li>
<li>Fixed: the name's accent hover on <code>.host-card</code> and <code>.hosting-row</code> gained <code>data-state="hover"</code> hooks.</li>
<li>The hosting row's arrow has <code>margin-right: var(--space-2)</code> inside the row's own padding, so its end inset (20px) differs from the host card's (16px). Kept as drawn.</li>
</ul>""",
    },
}
