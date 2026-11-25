from cf_data import ADD_ONS, NEWSLETTER as N
from dslib import cf_ui, ex, icon, kbd, matrix, mock, themes


def box(uid="nb", a=""):
    return (f'<section class="newsletter-box" aria-label="{N["name"]}, {uid}"><p class="display newsletter-box__title">{N["name"]}</p>'
            f'<p class="newsletter-box__text">The week’s stories and events in one email. {N["cadence"]}.</p>'
            f'<form class="newsletter-box__form" action="#top"><label class="visually-hidden" for="{uid}-email">Email address</label>'
            f'<input class="input input--pill" id="{uid}-email" name="email" type="email" autocomplete="email" placeholder="you@example.com"{a}>'
            f'<button class="btn btn--primary" type="submit">Subscribe free</button></form>'
            f'<a class="text-link text-link--quiet newsletter-box__rss" href="#top">{icon("rss")} Or follow by RSS</a></section>')


JOIN = (f'<div class="join-card"><p class="display join-card__title">Life to the full.</p>'
        '<p class="join-card__text">A Christian community for health in body and spirit. Find events, train with friends, and meet professionals who share your faith.</p>'
        f'<a class="btn btn--inverse" href="#top">Join the community {icon("arrow-right")}</a>'
        '<p class="join-card__proof">2,400+ members across the GTA</p></div>')

BAND = ('<section class="story-subscribe" aria-label="Newsletter band, example"><div class="story-subscribe__inner"><div>'
        f'<p class="display story-subscribe__title">{N["name"]}</p>'
        f'<p class="story-subscribe__text">Stories like this one, and the week’s events. {N["cadence"]}.</p></div>'
        '<a class="btn btn--inverse btn--md" href="#top">Subscribe free</a></div></section>')


def form(uid, *, invalid=False, busy=False, failed=False, limited=False, email="grace.thompson@gmail.com"):
    alert = ""
    if failed:
        alert = cf_ui.form_alert("We couldn't subscribe you", "Something went wrong on our side. Your email is still here, so try again in a moment.")
    if limited:
        alert = cf_ui.form_alert("Too many sign-ups", "Too many addresses were added from this network in the last hour. Try again later.")
    err = (f'<p class="field__error" id="{uid}-error">That email doesn’t look right. Check for a typo and try again.</p>' if invalid else "")
    submit = (f'<button class="btn btn--primary btn--lg" type="submit" disabled aria-busy="true">{cf_ui.busy_label("Subscribing…")}</button>'
              if busy else '<button class="btn btn--primary btn--lg" type="submit">Subscribe free</button>')
    d = " disabled" if busy else ""
    addons = "".join(f'<li><label class="check check--ui subscribe__addon"><input class="check__box" type="checkbox" name="also" value="{i}"'
                     f'{" checked" if i == "events" else ""}{d}><span><span class="subscribe__addon-label">{label}</span>'
                     f'<span class="subscribe__addon-detail">{detail}</span></span></label></li>' for i, label, detail in ADD_ONS)
    value = "grace.thompson@gmail" if invalid else email
    inv = f' aria-invalid="true" aria-describedby="{uid}-error"' if invalid else ""
    return (f'<form class="subscribe__form" action="#top" novalidate>{alert}'
            f'<label class="field__label" for="{uid}-email">Email address</label><div class="subscribe__row">'
            f'<input class="input input--pill input--lg" id="{uid}-email" name="email" type="email" autocomplete="email" value="{value}" placeholder="you@example.com"{inv}{" readonly" if busy else ""}>'
            f'{submit}</div>{err}<fieldset class="subscribe__addons"><legend class="field__label">Also send me</legend>'
            f'<ul class="list-ruled">{addons}</ul></fieldset>'
            f'<p class="subscribe__note">Joined by {N["readers"]} readers. One click to unsubscribe, and we never share your address.</p></form>')


def panel(ic, title, text, actions):
    return (f'<div class="subscribe__panel" role="status" tabindex="-1">{icon(ic, "subscribe__panel-icon")}'
            f'<p class="subscribe__panel-title">{title}</p><p class="subscribe__panel-text">{text}</p>'
            f'<div class="subscribe__panel-actions">{actions}</div></div>')


SUCCESS = panel("mail-check", "Check your inbox",
                'We sent a confirmation link to <strong>grace.thompson@gmail.com</strong>. Tap it and your first issue arrives Saturday morning.',
                f'<a class="btn btn--primary" href="#top">Read last week’s issue {icon("arrow-right")}</a>'
                '<a class="btn btn--ghost subscribe__panel-alt" href="#top">Use a different email</a>')
CONFIRMED = panel("circle-check", "You're subscribed",
                  'The Abundant Weekly will arrive at <strong>grace.thompson@gmail.com</strong> on Saturday at 7 AM, with event alerts as they post.',
                  f'<a class="btn btn--primary" href="#top">Read last week’s issue {icon("arrow-right")}</a>')
UNSUB = panel("circle-check", "You're unsubscribed",
              'We won\'t email <strong>grace.thompson@gmail.com</strong> again. Changed your mind? You can subscribe again any time.',
              '<a class="btn btn--secondary" href="#top">Subscribe again</a>')


def page(main):
    return (f'<section class="subscribe"><div class="subscribe__main"><p class="display detail-title">{N["name"]}</p>'
            '<p class="subscribe__lead">The week in Christian fitness across the GTA: the stories worth reading, the events worth showing up for, and one verse to carry into your training. '
            f'{N["cadence"]}.</p><div class="subscribe__state">{main}</div></div></section>')


def state(main):
    return f'<div class="subscribe__state">{main}</div>'


SPEC = {
    "lead": "Newsletter call-outs invite readers to The Abundant Weekly or to join, from the front page's rail, the foot of a story and the Subscribe page.",
    "meta": ["Status: new", "<code>&lt;form&gt;</code> and links", "Public site"],
    "overview": """<p>Four call-outs, one per place, each asking for one thing:</p>
<ul>
<li><b>Newsletter box</b> (<code>.newsletter-box</code>): in the front page's rail. A 2px ink frame, the newsletter's name, one line, an email field and "Subscribe free", and a quiet "Or follow by RSS". The field posts to Subscribe, where the address is confirmed.</li>
<li><b>Join card</b> (<code>.join-card</code>): the first thing in the rail, on a bordeaux brand panel: \"Life to the full.\", what the community is, \"Join the community\" and social proof. It asks people to join, not to subscribe.</li>
<li><b>Story subscribe band</b> (<code>.story-subscribe</code>): the last thing on a story page, on the dark chrome surface: the newsletter's name, one line and \"Subscribe free\" as a link to Subscribe. No field: a reader who has just finished a story decides on the next page.</li>
<li><b>Subscribe</b> (<code>.subscribe</code>): the Subscribe page's main column: title, lead, the form with optional extras, and the panels that replace the form when it is done.</li>
</ul>
<p>Use one call-out per view. A story already ends with the band; do not add a newsletter box to it.</p>""",
    "anatomy": {
        "figure": f'<div class="w-80">{box("anatomy")}</div>',
        "callouts": [(6, 12), (6, 32), (50, 52), (50, 72), (20, 90)],
        "parts": [
            ("Title", "The newsletter's name in Barlow Condensed italic caps, <code>--font-size-2xl</code>."),
            ("Text", "What it is and when it comes, muted."),
            ("Email field", "A pill input, labelled \"Email address\" (visually hidden, the title and placeholder carry it visually)."),
            ("Subscribe free", "Primary button, full width in the rail."),
            ("RSS link", "Quiet text link to the feeds on Subscribe; 24px tall."),
        ],
    },
    "variants": "<h3>Newsletter box</h3>" + ex(f'<div class="w-40">{box("variant")}</div>', "Landing rail. 2px ink frame, no fill.", True, mod="block")
    + "<h3>Join card</h3>" + ex(f'<div class="w-40">{JOIN}</div>', "Landing rail, first: brand panel with an inverse button.", True, mod="block")
    + "<h3>Story subscribe band</h3>" + ex(BAND, "Foot of every story: chrome band, inverse button linking to Subscribe.", True, mod="block")
    + "<h3>Subscribe page</h3>" + ex(page(form("page")), "Subscribe: the form with three optional extras (Event alerts checked).", True, mod="block"),
    "sizes": "<p>The box and join card fill the rail (21.25rem from 1024px; full width below). The band and the Subscribe section stretch to <code>--layout-container-max</code>. Subscribe's field and button are <code>--lg</code> (48px); the box uses the default 44px.</p>",
    "states": {
        "intro": "<p>The Subscribe form carries the full set of states, each with its real attribute: <code>aria-invalid</code> and <code>aria-describedby</code> on a bad address, <code>disabled</code> and <code>aria-busy=\"true\"</code> on the button while sending, <code>readonly</code> on the field. When the form is done a <code>role=\"status\"</code> panel replaces it and takes focus. The rail's box has only the field and button states; it hands everything else to Subscribe.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'), ("Disabled", " disabled")], [
            ("Subscribe free", '<button class="btn btn--primary" type="submit"{a}>Subscribe free</button>'),
            ("Join the community", f'<div class="join-card"><a class="btn btn--inverse" href="#top"{{a}}>Join the community {icon("arrow-right")}</a></div>', {"Disabled": None}),
            ("Band button", '<div class="story-subscribe"><div class="story-subscribe__inner"><a class="btn btn--inverse btn--md" href="#top"{a}>Subscribe free</a></div></div>', {"Disabled": None}),
            ("Or follow by RSS", f'<a class="text-link text-link--quiet newsletter-box__rss" href="#top"{{a}}>{icon("rss")} Or follow by RSS</a>', {"Disabled": None}),
        ])
        + "<h3>Invalid</h3>" + ex(state(form("inv", invalid=True)), "Malformed address: marked, says what to fix; nothing is sent.", True, mod="block")
        + "<h3>Submitting</h3>" + ex(state(form("busy", busy=True)), "\"Subscribing…\": button disabled and busy, field read-only, extras disabled.", True, mod="block")
        + "<h3>Success</h3>" + ex(state(SUCCESS), "The address was taken: check your inbox. Nothing is sent until the link is tapped.", True, mod="block")
        + "<h3>Confirmed and unsubscribed</h3>" + ex(state(CONFIRMED) + state(UNSUB), "After the confirmation link; after Unsubscribe in an issue.", True, mod="block")
        + "<h3>Limited</h3>" + ex(state(form("lim", limited=True)), "Too many sign-ups from one network: a message above the form, focused; the email stays.", True, mod="block")
        + "<h3>Error</h3>" + ex(state(form("err", failed=True)), "The server failed: a message above the form, focused; the email and extras stay.", True, mod="block")
        + "<h3>Link expired</h3>" + ex('<div class="subscribe__state"><div class="subscribe__alert">' + cf_ui.form_alert("That link has expired", "Confirmation links last 7 days. Enter your email again and we'll send a new one.") + "</div>" + form("exp", email="") + "</div>",
                                       "An old or used confirmation link: say so and offer the form again, empty.", True, mod="block"),
        "themes": themes(f'<div class="w-80">{box("theme")}</div>' + f'<div class="w-80">{JOIN}</div>', "stack"),
        "notes": """<ul>
<li>Panels and alerts move focus to themselves (<code>tabindex="-1"</code>) so the result is read at once.</li>
<li>The busy button keeps its width: the spinner replaces nothing, it sits before the words.</li>
<li>Limited and error keep the address so nobody retypes it.</li>
</ul>""",
    },
    "responsive": """<ul>
<li><b>Phones</b>: the box's field and button stack full width; Subscribe's field and button stack (<code>.subscribe__row</code>); the band's text and button stack, left aligned.</li>
<li><b>From 640px</b>: Subscribe's field and button share a row, the field growing; side padding 24px.</li>
<li><b>From 768px</b>: the band is one row, text left and button right.</li>
<li><b>From 1024px</b>: Subscribe becomes two columns, the form (1.1fr) beside the latest issue preview (1fr); the box and join card sit in the 21.25rem rail.</li>
</ul>""",
    "theming": "<p>The box is the page surface framed in <code>--color-fg-default</code>; its text is <code>--color-fg-muted</code>. The join card is <code>--color-bg-brand</code> with <code>--color-fg-on-brand</code> and <code>--color-fg-on-brand-strong</code>; the band is <code>--color-bg-chrome</code> with <code>--color-fg-on-chrome</code> and <code>--color-fg-on-chrome-muted</code>. Both dark panels use the inverse button and <code>--color-focus-ring-on-dark</code>. Subscribe's panels fill <code>--color-accent-subtle</code> with a 2px <code>--color-accent</code> bar.</p>",
    "accessibility": {
        "pattern": "<p>Native <code>&lt;form&gt;</code>s with a labelled <code>type=\"email\"</code> input and <code>autocomplete=\"email\"</code>. Extras are a <code>&lt;fieldset&gt;</code> of checkboxes with the legend \"Also send me\". Results are <code>role=\"status\"</code> panels; failures are <code>role=\"alert\"</code> <a href=\"alert.html\">form alerts</a>. The box and band are named regions (<code>aria-labelledby</code> their titles).</p>",
        "keys": [
            (kbd("Tab"), "Field, Subscribe free, then the extras and RSS link."),
            (kbd("Enter"), "In the field: submits."),
            (kbd("Space"), "Toggles an extra."),
        ],
        "focus": "<p>The field shows the accent border and ring; buttons the shared ring. On the brand and chrome panels the ring is <code>--color-focus-ring-on-dark</code>. After submit, focus moves to the alert or result panel; on invalid it stays in the field, which names the error.</p>",
        "labelling": "<p>The box's label is visually hidden but present: a placeholder is never the label. The error is tied to the field with <code>aria-describedby</code>. The address in a result panel is in <code>strong</code> so people can check it.</p>",
        "pairs": [
            ("Box text", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Join card text", "--color-fg-on-brand-strong", "--color-bg-brand", 4.5),
            ("Band text", "--color-fg-on-chrome-muted", "--color-bg-chrome", 4.5),
            ("Band title", "--color-fg-on-chrome", "--color-bg-chrome", 4.5),
            ("Ring on brand", "--color-focus-ring-on-dark", "--color-bg-brand", 3),
            ("Ring on chrome", "--color-focus-ring-on-dark", "--color-bg-chrome", 3),
            ("Panel text", "--color-fg-muted", "--color-accent-subtle", 4.5),
            ("Panel icon", "--color-fg-accent", "--color-accent-subtle", 3),
            ("Panel title", "--color-fg-default", "--color-accent-subtle", 4.5),
        ],
        "motion": "<p>The busy spinner rotates; reduced motion stops it and the words \"Subscribing…\" remain.</p>",
        "touch": "<p>Fields and buttons are 44px (48px on Subscribe). The RSS link is 44px tall (<code>--target-comfortable</code>). Extras are full-row labels.</p>",
    },
    "content": f"""<ul>
<li>The name is always \"{N["name"]}\"; say when it comes: \"{N["cadence"]}\".</li>
<li>The button says \"Subscribe free\"; the join card \"Join the community\". Never \"Sign up\" for both.</li>
<li>Results say what happened and what to do: \"Check your inbox\", \"You're subscribed\", \"You're unsubscribed\".</li>
<li>Errors: \"That email doesn’t look right. Check for a typo and try again.\" \"Too many sign-ups.\" \"We couldn't subscribe you.\"</li>
<li>Reassure at the point of asking: \"One click to unsubscribe, and we never share your address.\"</li>
</ul>""",
    "dodont": [
        ("do", f'<div class="w-80">{box("do")}</div>', "A visually hidden label keeps the field named."),
        ("dont", f'<div class="w-80"><section class="newsletter-box"><p class="display newsletter-box__title">{N["name"]}</p><form class="newsletter-box__form" action="#top"><input class="input input--pill" type="email" aria-label="Email" placeholder="Email address"><button class="btn btn--primary" type="submit">Go</button></form></section></div>',
         "Placeholder as label and a \"Go\" button: the hint vanishes on typing and the action says nothing."),
        ("do", BAND, "End of a story: one band that links to Subscribe."),
        ("dont", BAND + f'<div class="w-40">{box("dont")}</div>', "A band and a box together on a story: two asks for the same thing."),
        ("do", state(SUCCESS), "Say where the link went and what happens next."),
        ("dont", '<div class="subscribe__state"><div class="subscribe__panel" role="status"><p class="subscribe__panel-title">Success!</p></div></div>',
         "\"Success!\": the reader does not know they must confirm, so the first issue never comes."),
    ],
    "tokens": [
        ("Box frame / title", "--color-fg-default", "color"),
        ("Box text", "--color-fg-muted", "color"),
        ("Join card", "--color-bg-brand / --color-fg-on-brand / --color-fg-on-brand-strong", "color"),
        ("Band", "--color-bg-chrome / --color-fg-on-chrome / --color-fg-on-chrome-muted", "color"),
        ("Ring on dark", "--color-focus-ring-on-dark", "color"),
        ("Panel", "--color-accent-subtle / --color-accent / --color-fg-accent", "color"),
        ("Frame width", "--border-width-thick", "value"),
        ("Padding", "--space-5 / --space-6", "value"),
        ("Title sizes", "--font-size-2xl / --font-size-3xl", "value"),
        ("RSS link height", "--target-comfortable", "value"),
        ("Measure", "--layout-measure-narrow", "value"),
    ],
    "code": {
        "snippet": '''<section class="newsletter-box" aria-labelledby="rail-newsletter">
  <h2 class="display newsletter-box__title" id="rail-newsletter">The Abundant Weekly</h2>
  <p class="newsletter-box__text">The week’s stories and events in one email. Every Saturday, 7 AM.</p>
  <form class="newsletter-box__form" action="/subscribe">
    <label class="visually-hidden" for="rail-email">Email address</label>
    <input class="input input--pill" id="rail-email" name="email" type="email" autocomplete="email" placeholder="you@example.com">
    <button class="btn btn--primary" type="submit">Subscribe free</button>
  </form>
  <a class="text-link text-link--quiet newsletter-box__rss" href="/subscribe#rss">…Or follow by RSS</a>
</section>''',
        "classes": [
            ("<code>.newsletter-box</code> <code>__title</code> <code>__text</code> <code>__form</code> <code>__rss</code>", "The rail's framed sign-up."),
            ("<code>.join-card</code> <code>__title</code> <code>__text</code> <code>__proof</code>", "Brand panel asking people to join."),
            ("<code>.story-subscribe</code> <code>__inner</code> <code>__title</code> <code>__text</code>", "Chrome band after a story."),
            ("<code>.subscribe</code> <code>__main</code> <code>__lead</code> <code>__state</code> <code>__form</code> <code>__row</code> <code>__alert</code>", "Subscribe page and form."),
            ("<code>__addons</code> <code>__addon</code> <code>__addon-label</code> <code>__addon-detail</code> <code>__note</code>", "Optional extras and the reassurance line."),
            ("<code>__panel</code> <code>__panel-icon</code> <code>__panel-title</code> <code>__panel-text</code> <code>__panel-actions</code> <code>__panel-alt</code>", "Result panels."),
            ("<code>aria-invalid</code> <code>aria-busy</code> <code>disabled</code> <code>readonly</code>", "Invalid and submitting states."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/landing/default", "newsletter box, join card"),
            mock("pages/story/default", "story subscribe band"),
            mock("pages/subscribe/default", "form"),
            mock("pages/subscribe/invalid", ""),
            mock("pages/subscribe/submitting", ""),
            mock("pages/subscribe/success", ""),
            mock("pages/subscribe/confirmed", ""),
            mock("pages/subscribe/unsubscribed", ""),
            mock("pages/subscribe/limited", ""),
            mock("pages/subscribe/error", ""),
            mock("pages/subscribe/link-expired", ""),
        ],
        "drift": "Fixed: the RSS link (<code>.newsletter-box__rss</code>) was <code>min-height: var(--target-min)</code> (24px); it now uses <code>--target-comfortable</code>. The form-level alerts reuse <code>.form-alert</code> (the <a href=\"alert.html\">alert</a> component).",
    },
}
