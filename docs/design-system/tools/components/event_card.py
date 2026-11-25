from dslib import ex, icon, image, kbd, matrix, mock, themes


def card(img="run", month="Apr", day="18", kind="Run", when="Sat 6:45 AM", title="Easter Sunrise 5K",
         place="Martin Goodman Trail, Marilyn Bell Park", going="142 going", end='<span class="event-card__price">Free</span>',
         pill=True, a="", tag="h3", series=""):
    series_html = f'<p class="event-card__series">{icon("repeat", "icon--xs")}<span>{series}</span></p>' if series else ""
    pill_html = '<span class="going-pill">Going</span>' if pill else ""
    return (f'<a class="event-card" href="#"{a}><div class="event-card__media">{image(img, "event-card__image")}'
            f'<div class="date-badge" aria-hidden="true"><span class="date-badge__month">{month}</span><span class="date-badge__day">{day}</span></div>{pill_html}</div>'
            f'<div class="event-card__body"><p class="event-card__meta">{kind} · <span class="visually-hidden">{month} {day}, </span>{when}</p>{series_html}'
            f'<{tag} class="display event-card__title">{title}</{tag}>'
            f'<p class="place place--sm">{icon("map-pin")}<span>{place}</span></p><div class="event-card__spacer"></div>'
            f'<div class="event-card__foot"><span class="event-card__going">{going}</span>{end}</div></div></a>')


GOING = card()
OPEN = card("bootcamp", "Apr", "25", "Workout", "Sat 8:00 AM", "Saturday Park Bootcamp", "Trillium Park, Ontario Place", "38 going",
            '<span class="event-card__price">$10</span>', pill=False)
LOW = card("hoops", "Apr", "30", "Basketball", "Thu 7:00 PM", "Women&#x27;s Hoops &amp; Devotion Night", "Downtown Toronto", "22 going",
           '<span class="event-card__left">2 spots left</span>', pill=False)
SESSION = card("run", "Apr", "21", "Run", "Tue 6:30 PM", "Couch to 5K: Week 3", "Humber Bay Park East",
               '31 going<span class="event-card__left"> · 9 spots left</span>', '<span class="event-card__price">Free</span>',
               series="Session 3 of 8 · Every Tuesday")
BOOT_SESSION = card("bootcamp", "Apr", "25", "Workout", "Sat 8:00 AM", "Saturday Park Bootcamp", "Trillium Park, Ontario Place", "38 going",
                    '<span class="event-card__price">$10</span>', pill=False, series="Session 4 of 8 · Every Saturday")


def register(state="open"):
    """The register panel on an event page, in one of its states (event-detail/*)."""
    price, spots, going = ("$10", "12 of 50 spots left", "38 going")
    stack = ('<div class="register__going"><p class="register__count">{g}</p><div class="avatar-stack">'
             '<span class="avatar avatar--sm" aria-hidden="true">MC</span><span class="avatar avatar--sm" aria-hidden="true">DO</span>'
             '<span class="avatar avatar--sm" aria-hidden="true">PN</span><span class="avatar-stack__label">Michael, Danielle and {n} others</span></div></div>')
    note = '<p class="register__note">You&#x27;ll be added to the event&#x27;s group chat.</p>'
    if state == "busy":
        body = f'<button class="btn btn--primary btn--lg btn--block" type="button" aria-busy="true" disabled>{icon("loader", "icon--spin")}Registering…</button>{note}'
    elif state == "failed":
        body = '<p class="register__error" role="alert">We couldn&#x27;t register you. Try again in a moment.</p><button class="btn btn--primary btn--lg btn--block" type="button">Register</button>' + note
    elif state == "full":
        spots, going = "0 of 50 spots left", "50 going"
        body = '<p class="register__full" role="status">This event is full</p>'
    elif state == "reserved":
        spots, going = "11 of 50 spots left", "39 going"
        body = (f'<p class="register__confirmed" role="status">{icon("check", "icon--lg")}You&#x27;re going</p>'
                '<p class="register__note">Your spot is reserved. Pay the host at the event; online payment is not available yet.</p>'
                f'<div class="btn-grid mt-3"><button class="btn btn--secondary btn--sm" type="button">{icon("calendar-plus")}Calendar</button>'
                f'<a class="btn btn--secondary btn--sm" href="#">{icon("message-circle")}Group chat</a></div>'
                '<button class="btn btn--quiet mt-3" type="button">Can&#x27;t make it</button>')
    else:
        body = '<button class="btn btn--primary btn--lg btn--block" type="button">Register</button>' + note
    n = int(going.split()[0]) - 2
    return (f'<div class="w-80"><div class="card card--pad-sm"><div class="register__head"><p class="register__price">{price}</p>'
            f'<p class="register__spots">{spots}</p></div><div class="register__state">{body}</div>{stack.format(g=going, n=n)}</div></div>')


GRID = f'<ul class="event-grid"><li>{GOING}</li><li>{OPEN}</li></ul>'
SMALL = '<div class="w-40">{c}</div>'

SPEC = {
    "lead": "The event card is how members discover what's on: a photo, the date, what and where, and how many are going.",
    "meta": ["Status: stable", "Whole-card <code>&lt;a&gt;</code>", "Member app"],
    "overview": """<p>Use event cards in the events grid, where photos help people choose. Use an <a href="list.html">event row</a> where space is tight (home's "Coming up") and a <a href="table.html">table</a> in the admin console.</p>
<ul>
<li><b>Default</b>: price in the footer (\"Free\", \"$10\").</li>
<li><b>Going</b>: a \"Going\" pill on the image when the member is registered.</li>
<li><b>Few spots left</b>: the footer's end turns accent: \"2 spots left\"; \"Full\" when none.</li>
<li><b>Series date</b>: a muted repeat line, \"Session 3 of 8 · Every Tuesday\", under the meta; the card opens that date, whose page links to the series.</li>
</ul>
<p>On the event page, the <b>register panel</b> (<code>.register__*</code>) carries the price, spots, the Register action and its results: busy, failed, full, registered.</p>""",
    "anatomy": {
        "figure": SMALL.format(c=GOING),
        "callouts": [(50, 20), (14, 10), (86, 10), (20, 52), (30, 63), (30, 72), (50, 90)],
        "parts": [
            ("Image", "16:9 cover photo, decorative (<code>alt=\"\"</code>)."),
            ("Date badge", "See <a href=\"date-badge.html\">Date badge</a>; hidden from assistive technology."),
            ("Going pill", "Solid bordeaux, shown only when registered."),
            ("Meta", "Type and time in 14px accent semibold; the date is repeated in visually hidden text."),
            ("Title", "Barlow Condensed <code>--font-size-3xl</code>, a heading so the grid can be navigated by heading."),
            ("Place", "Pin icon and venue, one line with ellipsis."),
            ("Footer", "Going count, then price or spots left, above a hairline."),
        ],
    },
    "variants": ex(f'<ul class="event-grid"><li>{GOING}</li><li>{OPEN}</li><li>{LOW}</li></ul>',
                   "Going, open with price, few spots left.", True)
    + "<h3>A date of a series</h3>"
    + ex(f'<ul class="event-grid"><li>{SESSION}</li><li>{BOOT_SESSION}</li></ul>',
         "A series line under the meta (<code>.event-card__series</code>): which session and the cadence; spots left can follow the going count in the same line (events/default).", True)
    + "<h3>Register panel</h3>"
    + "<p>The event page's sticky panel (<code>.register__*</code> parts in a <code>.card--pad-sm</code>). The <a href=\"host-card.html\">host card</a> sits under it; a series date also gets the <a href=\"series-card.html\">series card</a>.</p>"
    + ex(register(), "Not registered: one primary Register (event-detail/unregistered).", True)
    + ex(register("reserved"), "Registered for a paid event: how to pay, calendar, group chat, Can't make it (event-detail/reserved).", True),
    "sizes": "<p>One size; the card fills its grid cell. Body padding is 20px, 24px from <code>--layout-breakpoint-sm</code>.</p>",
    "states": {
        "intro": "<p>The whole card is one link. Pointer and focus are forced with <code>data-state</code>. There is no disabled card: a full event still opens so people can see details.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'), ("Active", ' data-state="active"'), ("Disabled", None)], [
            ("Card", SMALL.format(c=card(pill=False, a="{a}", tag="p")), {}),
        ]) + "<h3>Loading</h3>"
        + ex('<div class="w-40 skeleton-stack" aria-busy="true" aria-label="Loading events"><span class="skeleton skeleton--image-16x9"></span><span class="skeleton skeleton--title"></span><span class="skeleton skeleton--text"></span></div>',
             "Skeleton with the card's shape while events load.", True),
        "themes": themes(SMALL.format(c=card(pill=True, tag="p")) + SMALL.format(c=SESSION.replace("<h3", "<p").replace("</h3>", "</p>")))
        + themes(register("failed") + register("full")),
        "notes": "<ul><li><b>Hover</b> lifts with <code>--shadow-2</code> and turns the title accent.</li><li><b>Going</b> and <b>few spots left</b> are content states with words, not colour alone.</li><li><b>Empty</b> and <b>no results</b> swap the grid for an empty state.</li></ul>"
        + """<h3>Register panel states</h3><div class="ds-matrix"><table><thead><tr><th scope="col">State</th><th scope="col">What changes</th><th scope="col">Mock</th></tr></thead><tbody>
<tr><th scope="row">Not registered</th><td>Register, and \"You'll be added to the event's group chat.\"</td><td>event-detail/unregistered</td></tr>
<tr><th scope="row">Registering (busy)</th><td>Button <code>aria-busy=\"true\"</code> and <code>disabled</code>, spinner, \"Registering…\".</td><td>event-detail/registering</td></tr>
<tr><th scope="row">Failed</th><td><code>.register__error</code> (<code>role=\"alert\"</code>, danger tint) above Register, which stays usable.</td><td>event-detail/failed</td></tr>
<tr><th scope="row">Full</th><td>\"0 of 50 spots left\"; <code>.register__full</code> (<code>role=\"status\"</code>) \"This event is full\" in place of the button; no waitlist.</td><td>event-detail/full</td></tr>
<tr><th scope="row">Registered</th><td><code>.register__confirmed</code>, Calendar and Group chat, Can't make it.</td><td>event-detail/default, session</td></tr>
<tr><th scope="row">Reserved (paid)</th><td>\"You're going\" and how to pay at the event.</td><td>event-detail/reserved</td></tr>
</tbody></table></div>"""
        + ex(register("busy"), "Registering.", True),
    },
    "responsive": "<ul><li>One column on phones; two columns from <code>--layout-breakpoint-sm</code> (<code>.event-grid</code>).</li><li>Cards in a row stretch to equal height; the spacer pushes the footer to the bottom.</li><li>Long titles wrap; the place truncates to one line.</li></ul>",
    "theming": "<p>Surface <code>--color-bg-surface</code> with a hairline <code>--color-border-default</code> ring; hover adds <code>--shadow-2</code>. Meta, spots left and the title hover use <code>--color-fg-accent</code>; the going pill <code>--color-accent</code>/<code>--color-fg-on-accent</code>.</p>",
    "accessibility": {
        "pattern": "<p>One <code>&lt;a&gt;</code> wraps the card; its content is the name. The title is an <code>&lt;h2&gt;</code> in the grid so heading navigation lists the events. No nested links or buttons.</p>",
        "keys": [(kbd("Tab"), "Moves from card to card."), (kbd("Enter"), "Opens the event.")],
        "focus": "<p>The shared ring around the whole card, following <code>--radius-xl</code>.</p>",
        "labelling": "<p>The card reads as: type, date, time, series line, title, place, going, price. The image and badge are hidden; the date is in visually hidden text in the meta line.</p>",
        "pairs": [
            ("Meta and spots left", "--color-fg-accent", "--color-bg-surface", 4.5),
            ("Title", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Going count", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Going pill", "--color-fg-on-accent", "--color-accent", 4.5),
            ("Series line", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Register error", "--color-danger-fg", "--color-danger-bg", 4.5),
            ("Event full", "--color-fg-default", "--color-bg-canvas", 4.5),
            ("Registered confirmation", "--color-fg-accent", "--color-accent-subtle", 4.5),
        ],
        "motion": "<p>Shadow over <code>--duration-base</code>, title colour over <code>--duration-fast</code>; reduced motion removes both.</p>",
        "touch": "<p>The whole card is the target.</p>",
    },
    "content": "<ul><li>Meta: \"Run · Sat 6:45 AM\".</li><li>Titles are the event's name, title case allowed for proper names (\"Easter Sunrise 5K\").</li><li>Footer: \"142 going\"; \"Free\" or \"$10\"; \"2 spots left\"; \"Full\"; or both: \"31 going · 9 spots left\".</li><li>Series line: \"Session 3 of 8 · Every Tuesday\"; a series date's title names the week: \"Couch to 5K: Week 3\".</li><li>Register results: \"You're registered\", \"You're going\", \"We couldn't register you. Try again in a moment.\", \"This event is full\".</li></ul>",
    "dodont": [
        ("do", SMALL.format(c=card(pill=True, tag="p")), "Decorative photo, one link; register on the detail page (events)."),
        ("dont", SMALL.format(c=card(pill=True, tag="p").replace('alt=""', 'alt="Easter Sunrise 5K, April 18"')),
         "Alt text that repeats the title and date: screen readers hear everything twice. The photo is decorative."),
        ("do", SMALL.format(c=LOW.replace("<h3", "<p").replace("</h3>", "</p>")), "Scarcity in words: \"2 spots left\"."),
        ("dont", SMALL.format(c=card(pill=False, tag="p", going="", end='<span class="event-card__left">●</span>')), "A coloured dot for scarcity; nobody knows what it means."),
        ("do", register("full"), "Full is said where the button was (event-detail/full)."),
        ("dont", '<div class="w-80"><div class="card card--pad-sm"><div class="register__state"><button class="btn btn--primary btn--lg btn--block" type="button" disabled>Register</button></div></div></div>',
         "A disabled Register with no reason."),
    ],
    "tokens": [
        ("Surface / ring", "--color-bg-surface / --color-border-default", "color"),
        ("Meta, spots left, title hover", "--color-fg-accent", "color"),
        ("Going pill", "--color-accent / --color-fg-on-accent", "color"),
        ("Hover shadow", "--shadow-2", "value"),
        ("Radius", "--radius-xl", "value"),
        ("Body padding", "--space-5 / --space-6", "value"),
        ("Title size", "--font-size-3xl", "value"),
        ("Transition", "--duration-base / --ease-standard", "value"),
        ("Series line", "--color-fg-muted", "color"),
        ("Register error", "--color-danger-bg / --color-danger-fg", "color"),
        ("Event full", "--color-bg-canvas", "color"),
        ("Registered", "--color-accent-subtle / --color-fg-accent", "color"),
        ("Register boxes radius / padding", "--radius-lg / --space-3 / --space-4", "value"),
    ],
    "code": {
        "snippet": '''<a class="event-card" href="/events/easter-sunrise-5k">
  <div class="event-card__media">
    <img class="event-card__image" src="run.jpg" alt="" width="1376" height="768">
    <div class="date-badge" aria-hidden="true"><span class="date-badge__month">Apr</span><span class="date-badge__day">18</span></div>
    <span class="going-pill">Going</span>
  </div>
  <div class="event-card__body">
    <p class="event-card__meta">Run · <span class="visually-hidden">Apr 18, </span>Sat 6:45 AM</p>
    <h2 class="display event-card__title">Easter Sunrise 5K</h2>
    <p class="place place--sm"><svg class="icon" aria-hidden="true">…</svg><span>Marilyn Bell Park</span></p>
    <div class="event-card__spacer"></div>
    <div class="event-card__foot"><span class="event-card__going">142 going</span><span class="event-card__price">Free</span></div>
  </div>
</a>''',
        "classes": [
            ("<code>.event-grid</code>", "One then two columns of cards."),
            ("<code>.event-card</code> <code>__media</code> <code>__image</code> <code>__body</code>", "Card structure."),
            ("<code>__meta</code> <code>__title</code> <code>__spacer</code> <code>__foot</code>", "Text and footer."),
            ("<code>__going</code> <code>__price</code> <code>__left</code>", "Footer values; left is accent for scarcity."),
            ("<code>.going-pill</code> <code>.date-badge</code>", "Overlays on the image."),
            ("<code>__series</code>", "Series line: repeat icon and \"Session 3 of 8 · Every Tuesday\", truncates."),
            ("<code>.register__head</code> <code>__price</code> <code>__spots</code> <code>__state</code> <code>__note</code> <code>__going</code> <code>__count</code>", "Register panel."),
            ("<code>.register__confirmed</code> <code>__error</code> <code>__full</code> <code>__note--start</code>", "Results: registered, failed, full; a left-aligned note (booked series dates)."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/events/default", "grid of cards, going pill"),
            mock("pages/events/going", "registered events"),
            mock("pages/events/loading", "skeleton cards"),
            mock("pages/events/no-results", "no results"),
            mock("pages/events/filtered", "series lines"),
            mock("pages/event-detail/unregistered", "register panel"),
            mock("pages/event-detail/registering", "busy"),
            mock("pages/event-detail/failed", "register error"),
            mock("pages/event-detail/full", "event full"),
            mock("pages/event-detail/reserved", "paid, reserved"),
            mock("pages/event-detail/session", "registered for a series date"),
        ],
        "drift": "The \"Posted by the Christian Fitness team\" line under the register panel became the <a href=\"host-card.html\">host card</a> (<code>.posted-by</code> is now unused). The card's 24px radius is now named <code>--radius-xl</code> (was 3xl). Hover shadow uses <code>--shadow-2</code> (12/32).",
    },
}
