from dslib import ex, icon, image, kbd, matrix, mock, themes


def card(img="run", month="Apr", day="18", kind="Run", when="Sat 6:45 AM", title="Easter Sunrise 5K",
         place="Martin Goodman Trail, Marilyn Bell Park", going="142 going", end='<span class="event-card__price">Free</span>',
         pill=True, a="", tag="h3"):
    pill_html = '<span class="going-pill">Going</span>' if pill else ""
    return (f'<a class="event-card" href="#"{a}><div class="event-card__media">{image(img, "event-card__image")}'
            f'<div class="date-badge" aria-hidden="true"><span class="date-badge__month">{month}</span><span class="date-badge__day">{day}</span></div>{pill_html}</div>'
            f'<div class="event-card__body"><p class="event-card__meta">{kind} · <span class="visually-hidden">{month} {day}, </span>{when}</p>'
            f'<{tag} class="display event-card__title">{title}</{tag}>'
            f'<p class="place place--sm">{icon("map-pin")}<span>{place}</span></p><div class="event-card__spacer"></div>'
            f'<div class="event-card__foot"><span class="event-card__going">{going}</span>{end}</div></div></a>')


GOING = card()
OPEN = card("bootcamp", "Apr", "25", "Workout", "Sat 8:00 AM", "Saturday Park Bootcamp", "Trillium Park, Ontario Place", "38 going",
            '<span class="event-card__price">$10</span>', pill=False)
LOW = card("hoops", "Apr", "30", "Basketball", "Thu 7:00 PM", "Women&#x27;s Hoops &amp; Devotion Night", "Downtown Toronto", "22 going",
           '<span class="event-card__left">2 spots left</span>', pill=False)
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
</ul>""",
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
                   "Going, open with price, few spots left.", True),
    "sizes": "<p>One size; the card fills its grid cell. Body padding is 20px, 24px from <code>--layout-breakpoint-sm</code>.</p>",
    "states": {
        "intro": "<p>The whole card is one link. Pointer and focus are forced with <code>data-state</code>. There is no disabled card: a full event still opens so people can see details.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'), ("Active", ' data-state="active"'), ("Disabled", None)], [
            ("Card", SMALL.format(c=card(pill=False, a="{a}", tag="p")), {}),
        ]) + "<h3>Loading</h3>"
        + ex('<div class="w-40 skeleton-stack" aria-busy="true" aria-label="Loading events"><span class="skeleton skeleton--image-16x9"></span><span class="skeleton skeleton--title"></span><span class="skeleton skeleton--text"></span></div>',
             "Skeleton with the card's shape while events load.", True),
        "themes": themes(SMALL.format(c=card(pill=True, tag="p"))),
        "notes": "<ul><li><b>Hover</b> lifts with <code>--shadow-2</code> and turns the title accent.</li><li><b>Going</b> and <b>few spots left</b> are content states with words, not colour alone.</li><li><b>Empty</b> and <b>no results</b> swap the grid for an empty state.</li></ul>",
    },
    "responsive": "<ul><li>One column on phones; two columns from <code>--layout-breakpoint-sm</code> (<code>.event-grid</code>).</li><li>Cards in a row stretch to equal height; the spacer pushes the footer to the bottom.</li><li>Long titles wrap; the place truncates to one line.</li></ul>",
    "theming": "<p>Surface <code>--color-bg-surface</code> with a hairline <code>--color-border-default</code> ring; hover adds <code>--shadow-2</code>. Meta, spots left and the title hover use <code>--color-fg-accent</code>; the going pill <code>--color-accent</code>/<code>--color-fg-on-accent</code>.</p>",
    "accessibility": {
        "pattern": "<p>One <code>&lt;a&gt;</code> wraps the card; its content is the name. The title is an <code>&lt;h2&gt;</code> in the grid so heading navigation lists the events. No nested links or buttons.</p>",
        "keys": [(kbd("Tab"), "Moves from card to card."), (kbd("Enter"), "Opens the event.")],
        "focus": "<p>The shared ring around the whole card, following <code>--radius-xl</code>.</p>",
        "labelling": "<p>The card reads as: type, date, time, title, place, going, price. The image and badge are hidden; the date is in visually hidden text in the meta line.</p>",
        "pairs": [
            ("Meta and spots left", "--color-fg-accent", "--color-bg-surface", 4.5),
            ("Title", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Going count", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Going pill", "--color-fg-on-accent", "--color-accent", 4.5),
        ],
        "motion": "<p>Shadow over <code>--duration-base</code>, title colour over <code>--duration-fast</code>; reduced motion removes both.</p>",
        "touch": "<p>The whole card is the target.</p>",
    },
    "content": "<ul><li>Meta: \"Run · Sat 6:45 AM\".</li><li>Titles are the event's name, title case allowed for proper names (\"Easter Sunrise 5K\").</li><li>Footer: \"142 going\"; \"Free\" or \"$10\"; \"2 spots left\"; \"Full\".</li></ul>",
    "dodont": [
        ("do", SMALL.format(c=card(pill=True, tag="p")), "Decorative photo, one link; register on the detail page (events)."),
        ("dont", SMALL.format(c=card(pill=True, tag="p").replace('alt=""', 'alt="Easter Sunrise 5K, April 18"')),
         "Alt text that repeats the title and date: screen readers hear everything twice. The photo is decorative."),
        ("do", SMALL.format(c=LOW.replace("<h3", "<p").replace("</h3>", "</p>")), "Scarcity in words: \"2 spots left\"."),
        ("dont", SMALL.format(c=card(pill=False, tag="p", going="", end='<span class="event-card__left">●</span>')), "A coloured dot for scarcity; nobody knows what it means."),
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
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/events/default", "grid of cards, going pill"),
            mock("pages/events/going", "registered events"),
            mock("pages/events/loading", "skeleton cards"),
            mock("pages/events/no-results", "no results"),
        ],
        "drift": "The card's 24px radius is now named <code>--radius-xl</code> (was 3xl). Hover shadow uses <code>--shadow-2</code> (12/32).",
    },
}
