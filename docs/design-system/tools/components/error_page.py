from dslib import ex, icon, kbd, matrix, mock, themes, seal

HOME = icon("home")
RETRY = icon("rotate-cw")


def system(code, title, text, actions):
    return (f'<div class="empty-state empty-state--system"><p class="system__code" aria-hidden="true">{code}</p>'
            f'<h2 class="display page-title system__title">{title}</h2><p class="empty-state__text">{text}</p>'
            f'<div class="empty-state__actions">{actions}</div></div>')


NOT_FOUND = system("404", "Page not found", "That link may be old, or the page has moved. Everything else is right where you left it.",
                   f'<a class="btn btn--primary btn--sm" href="#">{HOME}Go to home</a><a class="btn btn--secondary btn--sm" href="#">Browse events</a>')
SERVER = system("500", "Something went wrong", "That's on us, not you, and we've been notified. Try again in a moment. If it keeps happening, quote reference CF-4BF92F35.",
                f'<a class="btn btn--primary btn--sm" href="#">{RETRY}Try again</a><a class="btn btn--secondary btn--sm" href="#">Go to home</a>')
OFFLINE = system("Offline", "You're offline", "Check your Wi-Fi or data. Messages you write and registrations you make will send when you're back online.",
                 f'<button class="btn btn--primary btn--sm" type="button">{RETRY}Try again</button>')
FORBIDDEN = ('<div class="staff__card"><p class="admin-eyebrow">Admin console</p><h2 class="display staff__title">Staff only</h2>'
             '<p class="staff__lead">The admin console is for the Christian Fitness team. You\'re signed in as grace.thompson@gmail.com.</p>'
             '<a class="btn btn--primary btn--lg btn--block" href="#">Back to the app</a>'
             '<p class="staff__note">On the team? Ask a community director to give you staff access.</p></div>')

SPEC = {
    "lead": "When the app can't show what was asked for, an error page says so kindly and gives the way back.",
    "meta": ["Status: stable", "404 · 403 · 500 · offline", "Inside the app shell"],
    "overview": """<p>Error pages replace the main content when a whole route fails. The header and tab bar stay, so the person is never stranded.</p>
<ul>
<li><b>404 Page not found</b>: the route or record doesn't exist. "Go to home" and "Browse events".</li>
<li><b>500 Something went wrong</b>: the server failed. "Try again", "Go to home" and a reference code.</li>
<li><b>Offline</b>: no connection and nothing cached for this route. "Try again"; queued messages and registrations are promised to send.</li>
<li><b>403 Staff only</b>: a member reached the admin console. A centred card names the signed-in account and the way to get access.</li>
</ul>
<p>When a page's data fails but the route is fine, use the load error on the <a href="empty-state.html">empty state</a>. When the app is offline but has cached data, use the offline <a href="banner.html">banner</a> instead.</p>""",
    "anatomy": {
        "figure": NOT_FOUND,
        "callouts": [(8, 15), (25, 42), (45, 60), (30, 85)],
        "parts": [
            ("Code", "<code>.system__code</code>, Barlow Condensed italic 8xl in the accent; decorative, <code>aria-hidden</code>."),
            ("Title", "<code>.system__title</code>: the page heading, in plain words."),
            ("Text", "What happened, that it isn't the person's fault, and what still works."),
            ("Actions", "One primary way forward and one alternative."),
        ],
    },
    "variants": ex(NOT_FOUND, "404 in the member shell.", True)
    + ex(SERVER, "500 with retry and reference.", True)
    + ex(OFFLINE, "Offline with nothing cached.", True)
    + "<h3>403 in the admin console</h3>"
    + ex(FORBIDDEN, "A member who opens the admin console sees the staff card, not a code.", True, mod="canvas"),
    "sizes": "<p>One size. The code is <code>--font-size-8xl</code> at every width; the block sits <code>--space-12</code> below the header.</p>",
    "states": {
        "intro": "<p>Each page is a single state. Shown here as rows by cause; the actions inside have button states. In the real pages the title is the page's <code>h1</code>; on this page it is an <code>h2</code>.</p>",
        "matrix": matrix([("Example", "")], [
            ("404", system("404", "Page not found", "That link may be old.", '<a class="btn btn--primary btn--sm" href="#">Go to home</a>')),
            ("500", system("500", "Something went wrong", "That's on us, not you.", f'<a class="btn btn--primary btn--sm" href="#">{RETRY}Try again</a>')),
            ("Offline", system("Offline", "You're offline", "Check your Wi-Fi or data.", f'<button class="btn btn--primary btn--sm" type="button">{RETRY}Try again</button>')),
        ]),
        "themes": themes(system("404", "Page not found", "That link may be old, or the page has moved.", '<a class="btn btn--primary btn--sm" href="#">Go to home</a>')),
        "notes": "<ul><li>Try again on 500 and offline reloads the route; it turns busy while trying.</li><li>When the connection returns, the offline page reloads itself.</li><li>The document title matches the heading (\"Page not found · Christian Fitness\").</li></ul>",
    },
    "responsive": "<p>Left-aligned in the page container at every width; actions wrap on phones. The 403 card is centred, full-width with 32px padding on phones and 40px from 640px.</p>",
    "theming": "<p>The code reads <code>--color-fg-accent</code>, the text <code>--color-fg-muted</code>. In dark the accent brightens so the large code keeps 3:1. The 403 card uses <code>--color-bg-surface</code> on the canvas.</p>",
    "accessibility": {
        "pattern": "<p>A normal page: the title is the only <code>h1</code>, the code is hidden from assistive technology so it isn't read as \"four hundred and four\", and the reference is spoken in the text. On client-side navigation to an error route, focus moves to the <code>h1</code>. The server returns the matching HTTP status.</p>",
        "keys": [(kbd("Tab"), "Skip link, header, then the primary action."), (kbd("Enter"), "Follows the action.")],
        "focus": "<p>The shared ring on actions. Focus lands on the heading after an in-app navigation.</p>",
        "labelling": "<p>The title carries meaning without the code: \"Page not found\", not \"404\". Actions name their destinations.</p>",
        "pairs": [
            ("Code", "--color-fg-accent", "--color-bg-canvas", 3),
            ("Text", "--color-fg-muted", "--color-bg-canvas", 4.5),
            ("Title", "--color-fg-default", "--color-bg-canvas", 4.5),
        ],
        "motion": "<p>No motion.</p>",
        "touch": "<p>Small buttons extend to 44 × 44px on coarse pointers; the 403 action is a 52px block button.</p>",
    },
    "content": """<ul>
<li>Say what happened in plain words: "Page not found", "Something went wrong", "You're offline", "Staff only".</li>
<li>Take responsibility where it's ours: "That's on us, not you, and we've been notified."</li>
<li>Reassure about what's safe: "Everything else is right where you left it."</li>
<li>Give a reference code only for server errors.</li>
</ul>""",
    "dodont": [
        ("do", SERVER.replace("CF-4BF92F35", "CF-4BF92F35"), "Own the failure, offer a retry and a reference."),
        ("dont", system("500", "Internal server error", "An unexpected exception occurred.", ""), "Technical, cold and with no way forward."),
        ("do", FORBIDDEN, "Explain who the area is for and how to get access."),
        ("dont", system("403", "Forbidden", "Access denied.", ""), "A bare code feels like a punishment and gives no next step."),
    ],
    "tokens": [
        ("Code", "--color-fg-accent", "color"),
        ("Text / title", "--color-fg-muted / --color-fg-default", "color"),
        ("403 card", "--color-bg-surface", "color"),
        ("Code size / family", "--font-size-8xl / --font-family-display", "value"),
        ("Offset", "--space-12", "value"),
        ("403 card radius / padding", "--radius-xl / --space-8 / --space-10", "value"),
    ],
    "code": {
        "snippet": '''<div class="container page">
  <div class="empty-state empty-state--system">
    <p class="system__code" aria-hidden="true">404</p>
    <h1 class="display page-title system__title">Page not found</h1>
    <p class="empty-state__text">That link may be old, or the page has moved.</p>
    <div class="empty-state__actions">
      <a class="btn btn--primary btn--sm" href="/home">Go to home</a>
      <a class="btn btn--secondary btn--sm" href="/events">Browse events</a>
    </div>
  </div>
</div>''',
        "classes": [
            ("<code>.empty-state--system</code>", "Error page spacing."),
            ("<code>.system__code</code> <code>.system__title</code>", "Big decorative code and the heading."),
            ("<code>.staff__card</code> <code>.staff__title</code> <code>.staff__lead</code> <code>.staff__note</code>", "Admin 403 card."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/not-found/default", "404"),
            mock("pages/server-error/default", "500"),
            mock("pages/offline/default", "offline"),
            mock("pages/admin-forbidden/default", "403"),
        ],
        "drift": "The 403 card radius was the old <code>3xl</code>, now <code>--radius-xl</code>. Otherwise none.",
    },
}
