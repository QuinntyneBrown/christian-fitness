from dslib import ex, icon, kbd, matrix, mock, themes

NAV = [("home", "Home", "home"), ("events", "Events", "calendar-days"), ("services", "Services", "heart-handshake"),
       ("messages", "Messages", "message-circle"), ("profile", "Profile", "user")]
# The tab bar is position: fixed and hidden from 768px; examples pin it inside a frame that contains fixed children.
FRAME = '<div class="ds-frame" style="transform: translateZ(0); height: 6rem; width: 100%; max-width: 26rem;">{}</div>'
SHOW = ' style="display: grid;"'


def bar(cur="home", label="Primary, mobile example", unread=4):
    items = []
    for key, text, ic in NAV:
        c = ' aria-current="page"' if key == cur else ""
        dot = ('<span class="tab-bar__dot" aria-hidden="true"></span><span class="visually-hidden">, '
               f'{unread} unread</span>' if key == "messages" and unread else "")
        items.append(f'<a class="tab-bar__item" href="#top"{c}>{icon(ic, "icon--lg")}{text}{dot}</a>')
    return f'<nav class="tab-bar" aria-label="{label}"{SHOW}>{"".join(items)}</nav>'


def framed(cur="home", label="Primary, mobile example", unread=4):
    return FRAME.format(bar(cur, label, unread))


ITEM = '<a class="tab-bar__item" href="#top"{a}>' + icon("calendar-days", "icon--lg") + 'Events</a>'

SPEC = {
    "lead": "On phones the tab bar keeps the five places of the member app one thumb away.",
    "meta": ["Status: stable", "<code>&lt;nav&gt;</code> of links", "Fixed, phones only"],
    "overview": """<p>The tab bar is the mobile half of primary navigation in the member app: Home, Events, Services, Messages and Profile, each an icon above a label. It is fixed to the bottom of the viewport below 768px and hidden above, where the <a href="top-bar.html">top bar</a>'s links take over.</p>
<ul>
<li>Use it on every signed-in member screen, including full-height ones like Messages.</li>
<li>It is navigation, not a set of <a href="tabs.html">tabs</a>: each item is a link to a page, never a panel switcher.</li>
<li>Do not use it in the admin console (sidebar) or on public pages (site header).</li>
</ul>""",
    "anatomy": {
        "figure": framed(cur="home", label="Primary, mobile anatomy"),
        "callouts": [(10, 30), (10, 70), (68, 20), (50, 5)],
        "parts": [
            ("Icon", "24px (<code>icon--lg</code>), <code>aria-hidden</code>; it inherits the item colour."),
            ("Label", "12px semibold (<code>--font-size-xs</code>), always visible; it is the link's name."),
            ("Unread dot", "<code>.tab-bar__dot</code>, an 8px bordeaux dot, paired with a visually hidden \", 4 unread\" so the dot is never the only signal."),
            ("Bar", "Five equal columns, 64px tall (<code>--layout-tabbar-height</code>), surface background, hairline top border."),
        ],
    },
    "variants": ex(framed(cur="home", label="Primary, mobile example 1"), "With unread messages.", True)
    + ex(framed(cur="messages", label="Primary, mobile example 2", unread=0), "Messages current, nothing unread.", True),
    "sizes": "<p>One size: 64px tall, five equal columns across the full width.</p>",
    "states": {
        "intro": "<p>Items are links. Current is <code>aria-current=\"page\"</code>, shown by bordeaux colour on icon and label. There is no hover fill: the bar only appears on touch-sized screens.</p>",
        "matrix": matrix([("Default", ""), ("Focus", ' data-state="focus"'), ("Current", ' aria-current="page"')], [
            ("Item", ITEM),
        ]),
        "themes": themes(framed(cur="events", label="Primary, mobile theme example")),
        "notes": """<ul>
<li>Current changes colour and is announced through <code>aria-current</code>; colour is never the only carrier because the page title also changes.</li>
<li>Items never disable. Offline, each place opens and explains itself.</li>
<li>No press animation: the page change is the feedback.</li>
</ul>""",
    },
    "responsive": """<ul>
<li>Shown below 768px (<code>--layout-breakpoint-md</code>), hidden from 768px.</li>
<li>Pages reserve <code>--layout-tabbar-height</code> at the bottom of <code>.app__main</code> so the last item is never covered.</li>
<li>Labels never truncate; at 320px each column is 64px wide and "Messages" still fits.</li>
<li>On devices with a home indicator, the shipping app adds <code>env(safe-area-inset-bottom)</code> below the items.</li>
</ul>""",
    "theming": "<p>Reads <code>--color-bg-surface</code>, <code>--color-border-default</code>, <code>--color-fg-muted</code> for items and <code>--color-fg-accent</code> for current and the dot's <code>--color-accent</code>. Dark theme swaps all of them through the semantic tier.</p>",
    "accessibility": {
        "pattern": "<p>A <code>&lt;nav aria-label=\"Primary, mobile\"&gt;</code> of links, after <code>&lt;main&gt;</code> in the DOM. It is not an ARIA tablist; arrow keys do nothing special.</p>",
        "keys": [(kbd("Tab") + " / " + kbd("Shift", "Tab"), "Moves between items."), (kbd("Enter"), "Follows the link.")],
        "focus": "<p>The shared 2px <code>--color-focus-ring</code>, offset inward far enough to stay inside the bar.</p>",
        "labelling": "<p>Visible labels name every item. The unread dot is <code>aria-hidden</code>; the hidden text \", 4 unread\" makes the link read \"Messages, 4 unread\".</p>",
        "pairs": [
            ("Item label", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Current item", "--color-fg-accent", "--color-bg-surface", 4.5),
            ("Unread dot", "--color-accent", "--color-bg-surface", 3),
        ],
        "motion": "<p>None. The bar is fixed and never hides on scroll.</p>",
        "touch": "<p>Each item is the full column by 64px, well over 44 × 44px.</p>",
    },
    "content": """<ul>
<li>Exactly five items, one word each: Home, Events, Services, Messages, Profile.</li>
<li>Labels match the top bar's links word for word.</li>
</ul>""",
    "dodont": [
        ("do", framed(cur="events", label="Primary, mobile do example 1"), "Icon plus label on every item."),
        ("dont", FRAME.format(f'<nav class="tab-bar" aria-label="Primary, mobile don\'t example 1"{SHOW}>' + "".join(
            f'<a class="tab-bar__item" href="#top" aria-label="{t}">{icon(i, "icon--lg")}</a>' for _, t, i in NAV) + "</nav>"),
         "Icons alone: a heart-handshake does not say Services."),
        ("do", framed(cur="messages", label="Primary, mobile do example 2"), "Unread dot with hidden text."),
        ("dont", FRAME.format(f'<nav class="tab-bar" aria-label="Primary, mobile don\'t example 2" style="display: grid; grid-template-columns: repeat(6, minmax(0, 1fr));">'
            + "".join(f'<a class="tab-bar__item" href="#top">{icon(i, "icon--lg")}{t}</a>' for _, t, i in NAV + [("x", "Settings", "wrench")]) + "</nav>"),
         "A sixth item shrinks every target; Settings lives in Profile."),
    ],
    "tokens": [
        ("Bar background / border", "--color-bg-surface / --color-border-default", "color"),
        ("Item / current", "--color-fg-muted / --color-fg-accent", "color"),
        ("Unread dot", "--color-accent", "color"),
        ("Height", "--layout-tabbar-height", "value"),
        ("Label", "--font-size-xs", "value"),
        ("Dot", "--size-dot", "value"),
        ("Stacking", "--z-sticky", "value"),
    ],
    "code": {
        "snippet": '''<nav class="tab-bar" aria-label="Primary, mobile">
  <a class="tab-bar__item" href="/home" aria-current="page"><svg class="icon icon--lg" aria-hidden="true">…</svg>Home</a>
  …
  <a class="tab-bar__item" href="/messages"><svg class="icon icon--lg" aria-hidden="true">…</svg>Messages
    <span class="tab-bar__dot" aria-hidden="true"></span><span class="visually-hidden">, 4 unread</span></a>
  <a class="tab-bar__item" href="/profile"><svg class="icon icon--lg" aria-hidden="true">…</svg>Profile</a>
</nav>''',
        "classes": [
            ("<code>.tab-bar</code>", "Fixed five-column bar; hidden from 768px."),
            ("<code>.tab-bar__item</code>", "Icon over label link."),
            ("<code>.tab-bar__dot</code>", "Unread dot; pair with visually hidden text."),
            ("<code>aria-current=\"page\"</code>", "Current place."),
        ],
    },
    "sources": {
        "mocks": [mock("pages/home/default", "Home current, unread dot"), mock("pages/messages/default", "full-height screen"),
                  mock("pages/events/default", "Events current")],
        "drift": "Labels were 11px in the mocks; they snap to <code>--font-size-xs</code> (12px). No mock showed a focus state; it uses the shared ring.",
    },
}
