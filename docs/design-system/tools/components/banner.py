from dslib import ex, icon, kbd, matrix, mock, themes

X = icon("x")


def banner(kind, ic, text, action="", dismiss=True, extra=""):
    a = f'<a class="banner__action" href="#">{action}</a>' if action else ""
    c = (f'<button class="icon-button icon-button--sm banner__close" type="button" aria-label="Dismiss"{extra}>{X}</button>'
         if dismiss else "")
    return f'<div class="banner banner--{kind}"><div class="banner__inner">{icon(ic)}<p class="banner__text">{text}</p>{a}{c}</div></div>'


INFO = banner("info", "mail", "<strong>Confirm your email.</strong> We sent a link to grace.thompson@gmail.com.", "Resend")
SUCCESS = banner("success", "circle-check", "<strong>Email confirmed.</strong> You'll now get reminders the day before your events.")
WARNING = banner("warning", "wifi-off", "<strong>You're offline.</strong> Showing what was saved at 8:42 AM. We'll refresh when you're back.", dismiss=False)
DANGER = banner("danger", "alert-triangle", "<strong>Messages are delayed.</strong> We're on it. New messages may take a few minutes to arrive.", dismiss=False)
BRAND = banner("brand", "wrench", "<strong>Scheduled maintenance Sunday, April 19, 1–3 AM.</strong> Messages and registration pause for those two hours.")

SPEC = {
    "lead": "A banner tells everyone on a page about a condition that lasts: offline, delayed, maintenance, an email still to confirm.",
    "meta": ["Status: stable", "Full width under the header", "Five tones"],
    "overview": """<p>Use a banner for something true of the whole app for a while, not the result of one action. It sits directly under the top bar, spans the page and stays until the condition ends or the person dismisses it.</p>
<ul>
<li><b>Info</b>: a task the person can finish ("Confirm your email" with "Resend").</li>
<li><b>Success</b>: a lasting condition just resolved ("Email confirmed").</li>
<li><b>Warning</b>: the app works, with limits ("You're offline. Showing what was saved at 8:42 AM.").</li>
<li><b>Danger</b>: a service is degraded ("Messages are delayed").</li>
<li><b>Brand</b>: planned announcements from the team (scheduled maintenance).</li>
</ul>
<p>For the result of an action use a <a href="toast.html">toast</a>; for a failure in a form use an <a href="alert.html">alert</a>. Show one banner at a time; the most severe wins.</p>""",
    "anatomy": {
        "figure": INFO,
        "callouts": [(4, 50), (40, 50), (86, 50), (95, 50)],
        "parts": [
            ("Icon", "20px, names the condition (mail, wifi-off, wrench), <code>aria-hidden</code>."),
            ("Text", "A bold lead sentence, then one sentence of detail."),
            ("Action (optional)", "<code>.banner__action</code>, an underlined text link: \"Resend\"."),
            ("Dismiss (optional)", "Small icon button; absent while the condition is still true (offline, delayed)."),
        ],
    },
    "variants": ex(INFO + SUCCESS + WARNING + DANGER + BRAND, "Info, success, warning, danger and brand.", True, mod="stack"),
    "sizes": "<p>One size. The inner row is capped at <code>--layout-container-max</code> so the text lines up with the page content while the colour spans the full width.</p>",
    "states": {
        "intro": "<p>Tones are rows. A banner is either dismissible or persistent; its dismiss button has the usual hover and focus, forced here with <code>data-state</code>. Examples carry no live role; see Accessibility.</p>",
        "matrix": matrix([("Resting", ""), ("Dismiss hover", ' data-state="hover"'), ("Dismiss focus", ' data-state="focus"')], [
            ("Info", banner("info", "mail", "<strong>Confirm your email.</strong>", extra="{a}")),
            ("Success", banner("success", "circle-check", "<strong>Email confirmed.</strong>", extra="{a}")),
            ("Warning", banner("warning", "wifi-off", "<strong>You're offline.</strong>", dismiss=False), {"Dismiss hover": None, "Dismiss focus": None}),
            ("Danger", banner("danger", "alert-triangle", "<strong>Messages are delayed.</strong>", dismiss=False), {"Dismiss hover": None, "Dismiss focus": None}),
            ("Brand", banner("brand", "wrench", "<strong>Maintenance Sunday.</strong>", extra="{a}")),
        ]),
        "themes": themes(WARNING + BRAND, mod="stack"),
        "notes": """<ul>
<li><b>Persistent</b> banners (offline, delayed) have no dismiss; they leave on their own when the condition clears, and a success toast or banner may follow.</li>
<li><b>Dismissed</b> banners stay dismissed for the session; a new condition shows a new banner.</li>
</ul>""",
    },
    "responsive": "<ul><li>Phones: 16px side padding, the icon aligns to the first line and text wraps.</li><li>From 640px: 24px padding and the icon, text, action and dismiss centre on one row.</li><li>The banner pushes content down; it never overlays the page.</li></ul>",
    "theming": "<p>Each tone reads its status pair (<code>--color-*-bg</code>, <code>--color-*-fg</code>); brand reads <code>--color-bg-brand</code> and <code>--color-fg-on-brand</code> and switches its focus ring to <code>--color-focus-ring-on-dark</code>. The hairline bottom border uses <code>--color-border-default</code> (transparent on brand).</p>",
    "accessibility": {
        "pattern": '<p>The banner container exists in the page shell; its content changes. Info, success, warning and brand banners use <code>role="status"</code>; danger uses <code>role="alert"</code> because a service the person relies on is failing. A banner already present at page load is read as page content.</p>',
        "keys": [
            (kbd("Tab"), "Reaches the action, then Dismiss, right after the top bar."),
            (kbd("Enter"), "Activates the action or Dismiss. After dismiss, focus moves to the main heading."),
        ],
        "focus": "<p>Shared 2px ring; on the brand banner it is borealis (<code>--color-focus-ring-on-dark</code>).</p>",
        "labelling": "<p>The bold lead sentence carries the meaning; the icon is decorative. Dismiss is named \"Dismiss\". Colour is never the only cue: the text names the condition.</p>",
        "pairs": [
            ("Info text", "--color-info-fg", "--color-info-bg", 4.5),
            ("Success text", "--color-success-fg", "--color-success-bg", 4.5),
            ("Warning text", "--color-warning-fg", "--color-warning-bg", 4.5),
            ("Danger text", "--color-danger-fg", "--color-danger-bg", 4.5),
            ("Brand text", "--color-fg-on-brand", "--color-bg-brand", 4.5),
            ("Focus ring on brand", "--color-focus-ring-on-dark", "--color-bg-brand", 3),
        ],
        "motion": "<p>No motion; the banner appears in place.</p>",
        "touch": "<p>Dismiss is 36px and extends to 44 × 44px on coarse pointers. The action link is spaced 12px from Dismiss.</p>",
    },
    "content": """<ul>
<li>Lead sentence in bold names the condition: "You're offline.", "Messages are delayed."</li>
<li>Then what still works and what happens next: "Showing what was saved at 8:42 AM. We'll refresh when you're back."</li>
<li>Dates and times in full: "Sunday, April 19, 1–3 AM".</li>
<li>Action is one verb: "Resend".</li>
</ul>""",
    "dodont": [
        ("do", WARNING, "Say what still works and that it will recover (home, offline)."),
        ("dont", banner("warning", "wifi-off", "<strong>Network error.</strong>"), "Names the fault without telling the person what they can still do."),
        ("do", BRAND, "Announce planned downtime with the exact window."),
        ("dont", banner("success", "circle-check", "<strong>You're registered for Easter Sunrise 5K.</strong>"), "The result of one action belongs in a toast, not a page banner."),
    ],
    "tokens": [
        ("Info / success / warning / danger background", "--color-info-bg / --color-success-bg / --color-warning-bg / --color-danger-bg", "color"),
        ("Info / success / warning / danger text", "--color-info-fg / --color-success-fg / --color-warning-fg / --color-danger-fg", "color"),
        ("Brand background / text", "--color-bg-brand / --color-fg-on-brand", "color"),
        ("Bottom border", "--color-border-default", "color"),
        ("Inner width", "--layout-container-max", "value"),
        ("Padding / gap", "--space-3 / --space-4 / --space-6", "value"),
        ("Text size", "--font-size-ui", "value"),
    ],
    "code": {
        "snippet": '''<div class="banner banner--warning" role="status">
  <div class="banner__inner">
    <svg class="icon" aria-hidden="true">…</svg>
    <p class="banner__text"><strong>You're offline.</strong> Showing what was saved at 8:42 AM.</p>
  </div>
</div>''',
        "classes": [
            ("<code>.banner</code> <code>.banner__inner</code>", "Full-width band and its centred row."),
            ("<code>.banner--info</code> <code>--success</code> <code>--warning</code> <code>--danger</code> <code>--brand</code>", "Tones."),
            ("<code>.banner__text</code> <code>.banner__action</code> <code>.banner__close</code>", "Parts."),
            ('<code>role="status"</code> · <code>role="alert"</code>', "Polite for most tones; assertive for danger."),
        ],
    },
    "sources": {
        "mocks": [
            mock("notifications/banner/info", "confirm email"),
            mock("notifications/banner/success", "email confirmed"),
            mock("notifications/banner/warning", "offline"),
            mock("notifications/banner/danger", "messages delayed"),
            mock("notifications/banner/persistent", "maintenance, brand"),
            mock("pages/home/offline", "offline on home"),
        ],
        "drift": "none",
    },
}
