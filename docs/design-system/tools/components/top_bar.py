from dslib import ex, icon, kbd, matrix, mock, seal, themes

LOCKUP = (f'<a class="lockup" href="#top">{seal("lockup", decorative=True)}'
          '<span class="lockup__name">Christian Fitness</span></a>')


def app_header(cur="home", label="Primary example", unread=4, profile_cur=False):
    links = []
    for key, text in [("home", "Home"), ("events", "Events"), ("services", "Services"), ("messages", "Messages")]:
        c = ' aria-current="page"' if key == cur else ""
        badge = (f' <span class="count-badge" aria-label="{unread} unread">{unread}</span>'
                 if key == "messages" and unread else "")
        links.append(f'<a class="app-nav__link" href="#top"{c}>{text}{badge}</a>')
    pc = ' aria-current="page"' if profile_cur else ""
    return (f'<header class="app-header"><div class="app-header__inner">{LOCKUP}'
            f'<nav class="app-nav" aria-label="{label}">{"".join(links)}</nav>'
            f'<a class="profile-button" href="#top" aria-label="Your profile"{pc}>GT</a></div></header>')


SITE = (f'<header class="site-header">{LOCKUP}<div class="site-header__actions">'
        '<a class="btn btn--ghost site-header__signin" href="#top">Sign in</a>'
        '<a class="btn btn--primary" href="#top">Join free</a></div></header>')

SPEC = {
    "lead": "The top bar carries the brand and the main places in the member app, and the sign-in and join actions on the public site.",
    "meta": ["Status: stable", "<code>&lt;header&gt;</code> + <code>&lt;nav&gt;</code>", "Sticky"],
    "overview": """<p>There are two top bars. The <b>app header</b> (<code>.app-header</code>) sits on every signed-in member screen: the lockup, four primary links (Home, Events, Services, Messages) and the profile button. The <b>site header</b> (<code>.site-header</code>) sits on the public landing page: the lockup, a ghost "Sign in" and a primary "Join free".</p>
<ul>
<li>Use the app header on every member screen; it is the desktop half of primary navigation. On phones its links hide and the <a href="tab-bar.html">tab bar</a> takes over.</li>
<li>Use the site header only on public pages, where the job is to get someone signed in or joined.</li>
<li>The admin console does not use a top bar; it uses the <a href="sidebar-navigation.html">sidebar navigation</a>.</li>
<li>Page titles, filters and actions belong in the page head below the bar, never in the bar.</li>
</ul>""",
    "anatomy": {
        "figure": app_header(label="Primary, anatomy"),
        "callouts": [(4, 30), (38, 30), (60, 30), (96, 30)],
        "parts": [
            ("Lockup", 'The <a href="brand-lockup.html">brand lockup</a>, linking to Home. Its text is the link\'s name.'),
            ("Primary links", "<code>.app-nav__link</code> pills, 15px semibold, muted until current. Hidden below 768px."),
            ("Unread count", "<code>.count-badge</code> on Messages with <code>aria-label=\"4 unread\"</code>."),
            ("Profile button", "<code>.profile-button</code>, a 36px bordeaux disc with initials, <code>aria-label=\"Your profile\"</code>; gains a gold ring when Profile is current."),
        ],
    },
    "variants": "<h3>App header</h3>" + ex(app_header(label="Primary, app header example"),
        "Signed in, on Home, with four unread messages.", True, mod="stack")
    + "<h3>Site header</h3>" + ex(SITE.replace('<header', '<header').replace('href="#top">Sign in', 'href="#top">Sign in'),
        "Public landing page: ghost Sign in, primary Join free.", True, mod="stack"),
    "sizes": "<p>One size. The app header is 64px tall (<code>--layout-topbar-height</code>); the site header is at least 72px (<code>--layout-landing-header-height</code>) to give the landing page more air. Both centre their content in <code>--layout-container-max</code> (1152px).</p>",
    "states": {
        "intro": "<p>The bar itself has no states; its links do. Current is <code>aria-current=\"page\"</code>, so assistive technology hears it and the pill shows it in colour and fill.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'),
                          ("Current", ' aria-current="page"')], [
            ("Primary link", '<a class="app-nav__link" href="#top"{a}>Events</a>'),
            ("Profile button", '<a class="profile-button" href="#top" aria-label="Your profile"{a}>GT</a>', {"Hover": None}),
            ("Ghost Sign in", '<a class="btn btn--ghost" href="#top"{a}>Sign in</a>', {"Current": None}),
        ]),
        "themes": themes(app_header(cur="events", label="Primary, theme example"), "stack"),
        "notes": """<ul>
<li><b>Current</b> uses <code>aria-current="page"</code> on the link; the pill turns bordeaux on <code>--color-accent-subtle</code>.</li>
<li>Links never disable. A place that is not ready for the person (offline) still opens and explains itself.</li>
<li>The profile button has no hover fill; its current state is the gold ring.</li>
</ul>""",
    },
    "responsive": """<ul>
<li>Below 768px (<code>--layout-breakpoint-md</code>) the primary links hide; the lockup and profile button stay, and the <a href="tab-bar.html">tab bar</a> carries navigation.</li>
<li>Side padding is 16px on phones and 24px from 640px.</li>
<li>The site header hides "Sign in" below 640px; "Join free" always shows, and sign-in is linked from the hero.</li>
<li>The app header is <code>position: sticky</code> at the top with <code>--z-sticky</code>; content scrolls under it.</li>
</ul>""",
    "theming": "<p>The bar reads <code>--color-bg-surface</code> and a hairline <code>--color-border-default</code>. Links read <code>--color-fg-muted</code>, hover <code>--color-bg-canvas</code>, current <code>--color-accent-subtle</code> and <code>--color-fg-accent</code>. In the dark theme all of these swap through the semantic tokens; nothing in the rules changes.</p>",
    "accessibility": {
        "pattern": "<p>A <code>&lt;header&gt;</code> landmark holding a <code>&lt;nav aria-label=\"Primary\"&gt;</code> of plain links (<a href=\"https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/\">APG navigation</a>, without menus). The mobile tab bar is a second nav labelled \"Primary, mobile\" so the two never share a name. A <a href=\"skip-link.html\">skip link</a> comes before the bar.</p>",
        "keys": [
            (kbd("Tab") + " / " + kbd("Shift", "Tab"), "Moves through lockup, links and profile button in order."),
            (kbd("Enter"), "Follows the focused link."),
        ],
        "focus": "<p>Every link shows the shared 2px <code>--color-focus-ring</code> at 2px offset on <code>:focus-visible</code>. The sticky bar never hides a focused element below it: pages set <code>scroll-padding-top</code> to the bar's height.</p>",
        "labelling": "<p>The nav is labelled \"Primary\". The unread count has its own <code>aria-label</code> (\"4 unread\") so the link reads \"Messages 4 unread\". The profile button is labelled \"Your profile\" because its initials alone mean nothing to a screen reader.</p>",
        "pairs": [
            ("Link on bar", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Current link", "--color-fg-accent", "--color-accent-subtle", 4.5),
            ("Initials on profile button", "--color-fg-on-accent", "--color-accent", 4.5),
            ("Focus ring on bar", "--color-focus-ring", "--color-bg-surface", 3),
        ],
        "motion": "<p>Link fills transition over <code>--duration-fast</code>; reduced motion zeroes it. The bar never hides on scroll.</p>",
        "touch": "<p>Links are 36px tall on desktop only, where pointers are fine. On touch devices the tab bar's 64px targets take over. The profile button extends to 44 × 44px on coarse pointers.</p>",
    },
    "content": """<ul>
<li>Primary links are one word, nouns, in this order: Home, Events, Services, Messages. Do not add a fifth; Profile is the button.</li>
<li>The site header says "Sign in" and "Join free", never "Log in" or "Register".</li>
<li>Counts are numerals, capped at "9+".</li>
</ul>""",
    "dodont": [
        ("do", app_header(cur="messages", label="Primary, do example"), "One current link, marked with <code>aria-current</code>."),
        ("dont", '<header class="app-header"><div class="app-header__inner">' + LOCKUP + '<nav class="app-nav" aria-label="Primary, don\'t example"><a class="app-nav__link" href="#top">Home</a><a class="app-nav__link" href="#top">Events</a><a class="app-nav__link" href="#top">Services</a><a class="app-nav__link" href="#top">Messages</a><a class="app-nav__link" href="#top">Settings</a><a class="app-nav__link" href="#top">Help</a></div></header>'.replace('</div></header>', '</nav></div></header>'),
         "Extra links crowd the bar and have no tab-bar slot on phones; Settings and Help live in Profile."),
        ("do", SITE, "Public pages: one primary (Join free), sign-in as a ghost button."),
        ("dont", f'<header class="site-header">{LOCKUP}<div class="site-header__actions"><a class="btn btn--primary" href="#top">Sign in</a><a class="btn btn--primary" href="#top">Join free</a></div></header>',
         "Two primaries compete; Sign in is for people who already chose."),
    ],
    "tokens": [
        ("Bar background / border", "--color-bg-surface / --color-border-default", "color"),
        ("Link / hover background", "--color-fg-muted / --color-bg-canvas", "color"),
        ("Current link", "--color-fg-accent / --color-accent-subtle", "color"),
        ("Profile button", "--color-accent / --color-fg-on-accent", "color"),
        ("Profile current ring", "--color-highlight", "color"),
        ("Height app / site", "--layout-topbar-height / --layout-landing-header-height", "value"),
        ("Container", "--layout-container-max", "value"),
        ("Link radius", "--radius-full", "value"),
        ("Stacking", "--z-sticky", "value"),
    ],
    "code": {
        "snippet": '''<header class="app-header">
  <div class="app-header__inner">
    <a class="lockup" href="/home">…<span class="lockup__name">Christian Fitness</span></a>
    <nav class="app-nav" aria-label="Primary">
      <a class="app-nav__link" href="/home" aria-current="page">Home</a>
      <a class="app-nav__link" href="/events">Events</a>
      <a class="app-nav__link" href="/services">Services</a>
      <a class="app-nav__link" href="/messages">Messages <span class="count-badge" aria-label="4 unread">4</span></a>
    </nav>
    <a class="profile-button" href="/profile" aria-label="Your profile">GT</a>
  </div>
</header>''',
        "classes": [
            ("<code>.app-header</code> <code>.app-header__inner</code>", "Sticky member bar and its centred row."),
            ("<code>.app-nav</code> <code>.app-nav__link</code>", "Primary links; hidden below 768px."),
            ("<code>.profile-button</code>", "Initials disc linking to Profile."),
            ("<code>.site-header</code> <code>.site-header__actions</code> <code>.site-header__signin</code>", "Public header; Sign in hides below 640px."),
            ("<code>aria-current=\"page\"</code>", "Current place."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/home/default", "app header, Home current"),
            mock("pages/messages/default", "Messages current"),
            mock("pages/profile/default", "profile button current"),
            mock("pages/landing/default", "site header"),
        ],
        "drift": "The wordmark in the lockup was 22px in the mocks; it now uses <code>--font-size-xl</code> (20px). Link pills used the old xl radius in places; all now use <code>--radius-full</code>.",
    },
}
