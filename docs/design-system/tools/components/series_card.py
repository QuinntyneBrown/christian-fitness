from dslib import ex, icon, image, kbd, mock, themes


def vmatrix(variant, rows):
    """A state matrix for wide blocks: states down, one variant column. rows: (state, html or None)."""
    body = "".join(f'<tr><th scope="row">{st}</th><td>{"—" if h is None else h}</td></tr>' for st, h in rows)
    return (f'<div class="ds-matrix"><table><thead><tr><th scope="col">State</th><th scope="col">{variant}</th></tr></thead>'
            f'<tbody>{body}</tbody></table></div>')


def meter(*bars):
    """Session meter: one bar per session; d(one), n(ext), c(ancelled), anything else upcoming."""
    mods = {"d": " session-meter__bar--done", "n": " session-meter__bar--next", "c": " session-meter__bar--cancelled"}
    return ('<span class="session-meter" aria-hidden="true">'
            + "".join(f'<span class="session-meter__bar{mods.get(b, "")}"></span>' for b in bars) + "</span>")


def row(img="run", when="Every Tuesday · 6:30 PM", title="Couch to 5K Run Club",
        sub="Lakeshore Runners Fellowship · Etobicoke · Apr 7 – May 26", bars="ddnuucuu", done="2 of 7 sessions done",
        end='<span class="tag tag--sm">Joined</span>', nxt="Next Apr 21", a="", tag="h2"):
    return (f'<a class="series-row" href="#"{a}>{image(img, "series-row__image")}<div class="series-row__body">'
            f'<p class="series-row__meta">{icon("repeat", "icon--xs")}{when}</p>'
            f'<{tag} class="display series-row__title">{title}</{tag}><p class="series-row__sub">{sub}</p>'
            f'{meter(*bars)}<p class="visually-hidden">{done}</p></div>'
            f'<div class="series-row__end">{end}<span class="series-row__next">{nxt} {icon("arrow-right", "icon--xs")}</span></div></a>')


JOINED = row()
OPEN = row("bootcamp", "Every Saturday · 8:00 AM", "Saturday Park Bootcamp", "Danielle Okafor · Waterfront · Apr 4 – May 23",
           "dddnuuuu", "3 of 8 sessions done", '<span class="series-row__price">$64 for all 8</span>', "Next Apr 25")
FREE = row("hoops", "Last Thursday of the month · 7:00 PM", "Women’s Hoops &amp; Devotion", "Faith &amp; Footwork · Downtown · Jan – Jun",
           "dddnuu", "3 of 6 sessions done", '<span class="series-row__price">Free</span>', "Next Apr 30")
LIST = f'<ul class="card card--list series-list"><li>{JOINED}</li><li>{OPEN}</li><li>{FREE}</li></ul>'
LOADING = ('<ul class="card card--list series-list" aria-busy="true" aria-label="Loading series"><li class="series-row">'
           '<span class="skeleton skeleton--block skeleton--image-16x9"></span><div class="series-row__body skeleton-stack">'
           '<span class="skeleton skeleton--text-sm w-40"></span><span class="skeleton skeleton--title"></span>'
           '<span class="skeleton skeleton--text-sm w-80"></span></div></li></ul>')


def card(hid="sc-v"):
    dates = [("Tue Apr 28", "First 5-minute run"), ("Tue May 05", "Two 8-minute runs"), ("Tue May 19", "Twenty minutes without stopping")]
    lis = "".join(f'<li class="series-card__date"><p class="series-card__when">{w}</p><p class="series-card__topic">{t}</p></li>' for w, t in dates)
    lab, hid_attr = (f' aria-labelledby="{hid}"', f' id="{hid}"') if hid else ("", "")
    return (f'<section class="series-card"{lab}><div class="series-card__head"><div>'
            f'<p class="series-card__meta">{icon("repeat")}Session 3 of 8 · Every Tuesday</p>'
            f'<h2 class="display series-card__title"{hid_attr}>Couch to 5K Run Club</h2></div>'
            f'<a class="btn btn--secondary btn--sm series-card__action" href="#">View series {icon("arrow-right")}</a></div>'
            f'<ul class="series-card__dates">{lis}</ul></section>')


def progress(count="Came to 2 of 2", bars="ddnuucuu"):
    return (f'<div class="series-progress"><p class="series-progress__head"><span class="series-progress__label">Your progress</span>'
            f'<span class="series-progress__count">{count}</span></p>{meter(*bars)}</div>')


def plan(value, title, note, price, checked=False, disabled=False):
    attrs = (" checked" if checked else "") + (" disabled" if disabled else "")
    return (f'<label class="plan-option"><input class="plan-option__input" type="radio" name="plan-{{n}}" value="{value}"{attrs}>'
            f'<span class="plan-option__body"><span class="plan-option__title">{title}</span><span class="plan-option__note">{note}</span></span>'
            f'<span class="plan-option__price">{price}</span></label>')


def panel(n, state="open"):
    """The sign-up panel on the series page in one of its states."""
    spots = "Series full" if state == "full" else "12 of 50 spots left"
    drop = state in ("drop-in", "full")
    busy = state == "joining"
    note2 = {"drop-in": "2 picked below", "full": "Tick dates in the list"}.get(state, "Come when you can")
    note1 = "Every place in the series is taken" if state == "full" else "Your spot is held each week"
    plans = (plan("all", "Every session (5 left)", note1, "$64 for all 8", checked=not drop, disabled=busy or state == "full")
             + plan("drop", "Pick dates to drop in", note2, "$10 each", checked=drop, disabled=busy)).replace("{n}", n)
    if state == "joining":
        btn = f'<button class="btn btn--primary btn--lg btn--block" type="button" aria-busy="true" disabled>{icon("loader", "icon--spin")}Joining…</button>'
    elif state == "full":
        btn = '<button class="btn btn--primary btn--lg btn--block" type="button" disabled>Pick a date first</button>'
    elif state == "drop-in":
        btn = '<button class="btn btn--primary btn--lg btn--block" type="button">Register for 2 dates</button>'
    else:
        btn = '<button class="btn btn--primary btn--lg btn--block" type="button">Join the series</button>'
    err = '<p class="register__error" role="alert">We couldn&#x27;t sign you up. Try again in a moment.</p>' if state == "failed" else ""
    return (f'<div class="card card--pad-sm"><div class="register__head"><h2 class="series-panel__title">Sign up</h2>'
            f'<p class="register__spots">{spots}</p></div><fieldset class="plan-list"><legend class="visually-hidden">How would you like to come?</legend>'
            f'{plans}</fieldset><div class="register__state">{err}{btn}<p class="register__note">One group chat for the whole series.</p></div></div>')


JOINED_PANEL = ('<div class="card card--pad-sm"><p class="register__confirmed" role="status">' + icon("check", "icon--lg")
                + 'You&#x27;re in for every session</p>' + progress()
                + '<div class="btn-grid mt-3"><button class="btn btn--secondary btn--sm" type="button">' + icon("calendar-plus")
                + 'All dates</button><a class="btn btn--secondary btn--sm" href="#">' + icon("message-circle") + 'Group chat</a></div>'
                '<button class="btn btn--quiet mt-3" type="button">Leave the series</button></div>')
BOOKED_PANEL = ('<div class="card card--pad-sm"><p class="register__confirmed" role="status">' + icon("check", "icon--lg")
                + 'Registered for 2 dates</p><p class="register__note register__note--start">Sessions 4, 6. You can add more dates any time. '
                'Pay $10 to the host at each session; online payment is not available yet.</p>'
                '<a class="btn btn--quiet mt-3" href="#">Change dates</a></div>')
NARROW = '<div class="w-80">{c}</div>'
HEAD = ('<img class="banner-image banner-image--wide" src="../../mocks/assets/images/run.jpg" alt="" width="1376" height="768">'
        f'<p class="eyebrow eyebrow--icon">{icon("repeat")}Run series · 8 sessions</p><h2 class="display detail-title">Couch to 5K Run Club</h2>'
        '<p class="prose lead series-summary">Eight weeks from walking to running a full 5K, together. Each week builds on the last, '
        'so the group stays together from week one to race day.</p>')

SPEC = {
    "lead": "A series is one program over many dates. These blocks list series, introduce one, sign people up for it and show how far along they are.",
    "meta": ["Status: new", "Member app", "Whole-row <code>&lt;a&gt;</code>"],
    "overview": """<p>An event series (a run club, a bootcamp, a monthly hoops night) shares one sign-up, one group chat and one host across its dates. Its blocks:</p>
<ul>
<li><b>Series row</b> (<code>.series-row</code> in a <code>.series-list</code> card): the Events page's <i>Series</i> view. Photo, cadence, name, host and area, a <a href="session-list.html">session meter</a>, then price or <i>Joined</i> and the next date.</li>
<li><b>Series page head</b>: a wide banner (<code>.banner-image--wide</code>), the eyebrow, title and facts, and the summary paragraph (<code>.series-summary</code>). The dates below are a <a href="session-list.html">session list</a>.</li>
<li><b>Series panel</b>: the sticky sign-up card (<code>.series-panel__title</code> \"Sign up\", <a href="plan-option.html">plan options</a>, the register state) and, once joined, <b>series progress</b> (<code>.series-progress</code>).</li>
<li><b>Series card</b> (<code>.series-card</code>): on the page of one dated session, which session it is, a link to the series and the next three dates.</li>
</ul>
<p>Use an <a href="event-card.html">event card</a> for a single date (a series date's card adds a series line), and the <a href="host-card.html">host card</a> for who runs it.</p>""",
    "anatomy": {
        "figure": f'<ul class="card card--list series-list">{"<li>" + JOINED + "</li>"}</ul>',
        "callouts": [(8, 44), (38.5, 30), (38.5, 44), (38.5, 64), (38.5, 75), (92, 44)],
        "parts": [
            ("Image", "16:9 photo, <code>--radius-lg</code>, decorative (<code>alt=\"\"</code>); 12rem column from 640px."),
            ("Meta", "Repeat icon and cadence: \"Every Tuesday · 6:30 PM\", accent semibold 14px."),
            ("Title", "Barlow Condensed <code>--font-size-3xl</code>; a heading so the list can be navigated by heading."),
            ("Sub", "Host · area · date range, muted 14px."),
            ("Session meter", "One bar per date (see <a href=\"session-list.html\">Session list</a>), <code>aria-hidden</code>, with a visually hidden \"2 of 7 sessions done\"."),
            ("End", "Price (\"$64 for all 8\", \"Free\") or a small <i>Joined</i> tag, then \"Next Apr 21 →\"."),
        ],
    },
    "variants": "<h3>Series rows</h3>"
    + ex(LIST, "Joined (tag), paid (price for the whole series), free. The meter's cancelled bar fades.", True)
    + "<h3>Series page head</h3>"
    + ex(HEAD, "Wide banner (16:9, 21:7 from 640px), eyebrow with icon, title, summary (<code>.series-summary</code> on a lead paragraph).", True, mod="block")
    + "<h3>Series panel</h3>"
    + ex(NARROW.format(c=panel("v1")), "Not joined: two plan options, \"Join the series\" (event-series/not-joined).", True)
    + ex(NARROW.format(c=JOINED_PANEL), "Joined: confirmation, series progress, All dates and Group chat, Leave the series (event-series/default).", True)
    + ex(NARROW.format(c=BOOKED_PANEL), "Dropped in on chosen dates: which sessions and how to pay (event-series/booked).", True)
    + "<h3>Series card</h3>"
    + ex(card(), "On a dated session's page: \"Session 3 of 8\", View series, the next three dates (event-detail/session).", True, mod="block"),
    "sizes": """<p>One size each. The series row is 16px padded on phones and 20px from 640px; the series card 20px, 24px from 640px. Series progress bars are 8px tall (<code>--space-2</code>); bars in a row are 6px (<code>--space-1-5</code>).</p>""",
    "states": {
        "intro": "<p>The series row is a link: hover and focus are forced with <code>data-state</code>. It has no disabled state. The sign-up panel moves through the states in the table below; its controls carry the real attributes (<code>checked</code>, <code>disabled</code>, <code>aria-busy</code>).</p>",
        "matrix": vmatrix("Series row", [(st, None if a is None else f'<ul class="card card--list series-list"><li>{row(tag="p", a=a)}</li></ul>') for st, a in
                                         [("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'),
                                          ("Active", None), ("Disabled", None)]])
        + """<h3>Sign-up panel</h3><div class="ds-matrix"><table><thead><tr><th scope="col">State</th><th scope="col">What changes</th><th scope="col">Mock</th></tr></thead><tbody>
<tr><th scope="row">Not joined</th><td>\"Every session\" checked; \"Join the series\".</td><td>event-series/not-joined</td></tr>
<tr><th scope="row">Drop in, none picked</th><td>\"Pick dates to drop in\" checked; each open date gets a Drop in tick box; the button is <code>disabled</code> and reads \"Pick a date first\".</td><td>event-series/drop-in-none</td></tr>
<tr><th scope="row">Drop in, picked</th><td>The note counts the dates (\"2 picked below\"); \"Register for 2 dates\".</td><td>event-series/drop-in</td></tr>
<tr><th scope="row">Joining (busy)</th><td>Both radios <code>disabled</code>; button <code>aria-busy=\"true\"</code> and <code>disabled</code>, spinner, \"Joining…\".</td><td>event-series/joining</td></tr>
<tr><th scope="row">Failed</th><td><code>.register__error</code> with <code>role=\"alert\"</code> above the button, which stays usable; the choice is kept.</td><td>event-series/failed</td></tr>
<tr><th scope="row">Series full</th><td>\"Series full\"; \"Every session\" <code>disabled</code> with \"Every place in the series is taken\"; drop-in still possible; no waitlist.</td><td>event-series/full</td></tr>
<tr><th scope="row">Joined</th><td><code>.register__confirmed</code> (<code>role=\"status\"</code>), how to pay, series progress, Leave the series.</td><td>event-series/default, joined</td></tr>
<tr><th scope="row">Booked dates</th><td>\"Registered for 2 dates\", which sessions, <code>.register__note--start</code>, Change dates.</td><td>event-series/booked</td></tr>
</tbody></table></div>"""
        + ex(NARROW.format(c=panel("s1", "joining")), "Joining: options read-only, button busy.", True)
        + ex(NARROW.format(c=panel("s2", "failed")), "Failed: a generic message; try again.", True)
        + ex(NARROW.format(c=panel("s3", "full")), "Series full: drop in only.", True)
        + "<h3>Loading, empty and error</h3>"
        + ex(LOADING, "Loading: skeleton rows with the row's shape (events/series-loading).", True, mod="block")
        + "<p>No series yet and a failed load replace the list with an <a href=\"empty-state.html\">empty state</a> (events/series-empty, series-error); the series page's failure is an error state with a reference (event-series/error).</p>",
        "themes": themes(NARROW.format(c=JOINED_PANEL)) + themes(card(None), mod="block")
        + '<div data-theme="dark">' + ex(f'<ul class="card card--list series-list"><li>{row(tag="p")}</li></ul>',
                                          "The series row in the dark theme, full width (it needs the page's width to lay out).", mod="block") + "</div>",
        "notes": """<ul>
<li><b>Hover</b> fills the row with <code>--color-bg-canvas</code> and turns the title accent.</li>
<li><b>Joined</b>, <b>full</b> and <b>next</b> are said in words (\"Joined\", \"Series full\", \"Next Apr 21\"), never by the meter's colours alone.</li>
</ul>""",
    },
    "responsive": """<ul>
<li><b>Series row</b>: one column on phones (image, body, then the end row with price left and next date right). From 640px (<code>--layout-breakpoint-sm</code>) a 12rem image column, the body and an end column stacked right-aligned.</li>
<li><b>Banner</b>: <code>.banner-image--wide</code> is 16:9 on phones and 21:7 from 640px (the plain banner is 21:8).</li>
<li><b>Series card</b>: the head wraps the button under the title when it does not fit; the three dates stack, then sit in three columns from 640px.</li>
<li><b>Series panel</b>: below the content on phones; from 1024px it is a sticky aside (<code>.sticky-aside</code>, <code>--layout-sticky-offset</code>).</li>
</ul>""",
    "theming": "<p>Rows sit on the card surface (<code>--color-bg-surface</code>) and hover to <code>--color-bg-canvas</code>. Meta and progress read <code>--color-fg-accent</code>; subs and counts <code>--color-fg-muted</code>. The series card is an <code>--color-accent-subtle</code> panel whose dates and button sit on <code>--color-bg-surface</code> (the card sets <code>--btn-bg</code> to it). Meter bars: done <code>--color-accent</code>, next <code>--color-highlight</code>, upcoming <code>--color-border-default</code>.</p>",
    "accessibility": {
        "pattern": "<p>The series list is a <code>&lt;ul&gt;</code> of whole-row links whose titles are <code>&lt;h2&gt;</code>s. The series card is a <code>&lt;section aria-labelledby&gt;</code> naming the series. The sign-up panel's choices are a radio group in a <code>&lt;fieldset&gt;</code> with a visually hidden legend (\"How would you like to come?\"); results are announced by <code>role=\"status\"</code> (joined) or <code>role=\"alert\"</code> (failed).</p>",
        "keys": [
            (kbd("Tab"), "Moves from series row to series row; in the panel, into the radio group, then to the button."),
            (kbd("Enter"), "Opens the series; activates View series or Join the series."),
            (kbd("↑") + " / " + kbd("↓"), "Moves between the two plan options."),
        ],
        "focus": "<p>The shared ring wraps the whole row; plan options draw it around the option (<code>:has(:focus-visible)</code>). After Join, focus stays on the panel and the confirmation is announced.</p>",
        "labelling": "<p>A row reads: cadence, title, host and dates, \"2 of 7 sessions done\", price or Joined, next date. The meter is <code>aria-hidden</code>; its count is in visually hidden text. \"View series\" sits in the section named by the series title.</p>",
        "pairs": [
            ("Meta, progress label", "--color-fg-accent", "--color-bg-surface", 4.5),
            ("Sub, next date, count", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Row title on hover fill", "--color-fg-default", "--color-bg-canvas", 4.5),
            ("Series card meta", "--color-fg-accent", "--color-accent-subtle", 4.5),
            ("Series card title", "--color-fg-default", "--color-accent-subtle", 4.5),
            ("Session topic in the card", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Meter: done bar (decorative)", "--color-accent", "--color-bg-surface", 1),
            ("Meter: next bar (decorative)", "--color-highlight", "--color-bg-surface", 1),
        ],
        "motion": "<p>Background and title colour over <code>--duration-fast</code>; none under reduced motion.</p>",
        "touch": "<p>Rows are full-width targets well over 44px tall. View series is a small button whose target extends to 44 × 44px on coarse pointers; plan options are 72px tall labels.</p>",
    },
    "content": """<ul>
<li>Cadence names the rhythm and time: \"Every Tuesday · 6:30 PM\", \"Last Thursday of the month · 7:00 PM\".</li>
<li>Sub: host · area · range: \"Lakeshore Runners Fellowship · Etobicoke · Apr 7 – May 26\".</li>
<li>Price says what it covers: \"$64 for all 8\", \"$10 each\", \"Free\".</li>
<li>Series card meta: \"Session 3 of 8 · Every Tuesday\"; dates as \"Tue Apr 28\" with the session's topic.</li>
<li>Panel results: \"You're in for every session\", \"Registered for 2 dates\", \"We couldn't sign you up. Try again in a moment.\"</li>
</ul>""",
    "dodont": [
        ("do", f'<ul class="card card--list series-list"><li>{row(tag="p")}</li></ul>', "The meter is hidden from assistive technology and its count is written out (events/series)."),
        ("dont", f'<ul class="card card--list series-list"><li>{row(tag="p").replace("<p class=" + chr(34) + "visually-hidden" + chr(34) + ">2 of 7 sessions done</p>", "")}</li></ul>',
         "A meter with no words: people who cannot see the bars lose how far the series has got."),
        ("do", '<span class="series-row__price">$64 for all 8</span>', "A series price says what it buys."),
        ("dont", '<span class="series-row__price">$64</span>', "A bare price on a series reads as one date's fee."),
        ("do", NARROW.format(c=panel("d1", "full")), "Full: say so and leave drop-in open; the button says what to do."),
        ("dont", '<div class="w-80"><div class="card card--pad-sm"><div class="register__head"><h2 class="series-panel__title">Sign up</h2></div>'
         '<div class="register__state"><button class="btn btn--primary btn--lg btn--block" type="button" disabled>Join the series</button></div></div></div>',
         "A disabled Join with no reason; nobody knows the series is full or that dates can still be picked."),
    ],
    "tokens": [
        ("Row surface / hover", "--color-bg-surface / --color-bg-canvas", "color"),
        ("Meta, progress label", "--color-fg-accent", "color"),
        ("Sub, next, count, topic", "--color-fg-muted", "color"),
        ("Series card", "--color-accent-subtle / --color-bg-surface", "color"),
        ("Meter done / next / upcoming", "--color-accent / --color-highlight / --color-border-default", "color"),
        ("Cancelled bar", "--opacity-disabled", "value"),
        ("Row padding", "--space-4 / --space-5", "value"),
        ("Row column gap (from 640px)", "--space-6", "value"),
        ("Title size: row / card", "--font-size-3xl / --font-size-2xl", "value"),
        ("Image / date radius", "--radius-lg", "value"),
        ("Card radius", "--radius-xl", "value"),
        ("Meter width in a row", "--layout-conversations-width", "value"),
        ("Bar height: row / progress", "--space-1-5 / --space-2", "value"),
        ("Transition", "--duration-fast / --ease-standard", "value"),
    ],
    "code": {
        "snippet": '''<ul class="card card--list series-list">
  <li><a class="series-row" href="/events/series/couch-to-5k">
    <img class="series-row__image" src="run.jpg" alt="" width="1376" height="768">
    <div class="series-row__body">
      <p class="series-row__meta"><svg class="icon icon--xs" aria-hidden="true">…</svg>Every Tuesday · 6:30 PM</p>
      <h2 class="display series-row__title">Couch to 5K Run Club</h2>
      <p class="series-row__sub">Lakeshore Runners Fellowship · Etobicoke · Apr 7 – May 26</p>
      <span class="session-meter" aria-hidden="true">
        <span class="session-meter__bar session-meter__bar--done"></span>
        <span class="session-meter__bar session-meter__bar--next"></span>
        <span class="session-meter__bar"></span>
      </span>
      <p class="visually-hidden">2 of 7 sessions done</p>
    </div>
    <div class="series-row__end"><span class="tag tag--sm">Joined</span><span class="series-row__next">Next Apr 21 <svg class="icon icon--xs" aria-hidden="true">…</svg></span></div>
  </a></li>
</ul>

<section class="series-card" aria-labelledby="series-card-title">
  <div class="series-card__head">
    <div><p class="series-card__meta"><svg class="icon" aria-hidden="true">…</svg>Session 3 of 8 · Every Tuesday</p>
      <h2 class="display series-card__title" id="series-card-title">Couch to 5K Run Club</h2></div>
    <a class="btn btn--secondary btn--sm series-card__action" href="/events/series/couch-to-5k">View series <svg class="icon" aria-hidden="true">…</svg></a>
  </div>
  <ul class="series-card__dates"><li class="series-card__date"><p class="series-card__when">Tue Apr 28</p><p class="series-card__topic">First 5-minute run</p></li></ul>
</section>''',
        "classes": [
            ("<code>.series-list</code> <code>.series-row</code> <code>__image</code> <code>__body</code>", "The Series view: a card list of whole-row links."),
            ("<code>__meta</code> <code>__title</code> <code>__sub</code> <code>__end</code> <code>__price</code> <code>__next</code>", "Row text and end column."),
            ("<code>.banner-image--wide</code> <code>.series-summary</code>", "Series page banner (21:7) and summary paragraph."),
            ("<code>.series-panel__title</code>", "\"Sign up\" in the panel head (with <code>.register__head</code>, <code>.plan-list</code>, <code>.register__state</code>)."),
            ("<code>.series-progress</code> <code>__head</code> <code>__label</code> <code>__count</code>", "Progress once joined; wraps a taller session meter."),
            ("<code>.series-card</code> <code>__head</code> <code>__meta</code> <code>__title</code> <code>__action</code>", "Series card on a dated session's page."),
            ("<code>__dates</code> <code>__date</code> <code>__when</code> <code>__topic</code>", "The next three dates."),
            ("<code>data-state=\"hover|focus\"</code>", "Documentation hooks on the row."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/events/series", "series rows, prices, meter"),
            mock("pages/events/series-joined", "joined tag"),
            mock("pages/events/series-loading", "skeleton rows"),
            mock("pages/events/series-empty", "empty state"),
            mock("pages/events/series-error", "error state"),
            mock("pages/event-series/default", "banner, summary, progress"),
            mock("pages/event-series/not-joined", "series panel"),
            mock("pages/event-series/drop-in-none", "disabled button"),
            mock("pages/event-series/drop-in", "dates picked"),
            mock("pages/event-series/joining", "busy"),
            mock("pages/event-series/failed", "register error"),
            mock("pages/event-series/full", "series full"),
            mock("pages/event-series/joined", "progress, how to pay"),
            mock("pages/event-series/booked", "registered for dates"),
            mock("pages/event-series/loading", "skeleton"),
            mock("pages/event-series/error", "error state"),
            mock("pages/event-detail/session", "series card"),
        ],
        "drift": """<ul>
<li>Fixed: the row title's accent hover gained a <code>data-state="hover"</code> hook.</li>
<li>The series page skeleton uses <code>.skeleton--image-banner</code> (21:8 from 640px) while the loaded banner is <code>.banner-image--wide</code> (21:7): the page shifts when it loads. Proposed: a <code>.skeleton--image-banner-wide</code> or matching ratio.</li>
<li>The meter tells the next date from upcoming ones by colour only, and the next bar (<code>--color-highlight</code>) is about 1.8:1 on the light surface; done bars (<code>--color-accent</code>) are about 2.2:1 on the dark surface. The meter is <code>aria-hidden</code> and the row and panel say the same in words, so nothing is lost; documented as decorative.</li>
</ul>""",
    },
}
