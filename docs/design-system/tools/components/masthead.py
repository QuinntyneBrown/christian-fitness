from cf_data import SECTIONS
from dslib import cf_ui, ex, icon, kbd, matrix, mock, themes

CUR = ' aria-current="page"'
LOCKUP = cf_ui.lockup("#top")
ACTIONS = ('<div class="site-header__actions">'
           '<a class="btn btn--ghost site-header__signin" href="#top">Sign in</a>'
           '<a class="btn btn--primary" href="#top">Join free</a></div>')


def section_nav(current="Latest", label="Sections"):
    links = "".join(f'<a class="section-nav__link" href="#top"{CUR if s == current else ""}>{s.replace("&", "&amp;")}</a>'
                    for s in SECTIONS)
    return f'<nav class="section-nav" aria-label="{label}">{links}</nav>'


def news(current="Latest", label="Sections"):
    return f'<header class="masthead"><div class="masthead__bar">{LOCKUP}{ACTIONS}</div>{section_nav(current, label)}</header>'


STORY = f'<header class="masthead"><div class="masthead__bar">{LOCKUP}{ACTIONS}</div></header>'
PLAIN = (f'<header class="masthead masthead--plain"><div class="masthead__bar">{LOCKUP}'
         f'<a class="btn btn--ghost masthead__back" href="#top">{icon("arrow-left")}Back to news</a></div></header>')
LEGAL = (f'<header class="masthead"><div class="masthead__bar">{LOCKUP}'
         '<a class="btn btn--ghost masthead__back masthead__back--ink" href="#top">Terms of Service</a></div></header>')

SPEC = {
    "lead": "The masthead heads every public news page: the nameplate, the way in (Sign in, Join free) and, on the front page, the sections.",
    "meta": ["Status: new", "<code>&lt;header&gt;</code> + <code>&lt;nav&gt;</code>", "Public site"],
    "overview": """<p>The masthead replaced the landing page's <a href="top-bar.html">site header</a> when the front page became a news page. It is the header of every public page that is not a sign-in form: the news front page, stories, Subscribe and the two legal pages. Members inside the app see the <a href="top-bar.html">app header</a> instead; the newsletter's web version has its own brand band (<a href="issue.html">Newsletter issue</a>).</p>
<ul>
<li><b>News</b> (<code>.masthead</code> + <code>.section-nav</code>): the front page. The bar holds the lockup, a ghost "Sign in" and a primary "Join free"; below it, the sections Latest, Events, Training, Nutrition, Faith &amp; Body, Community and Pros. Sticky.</li>
<li><b>Story</b> (<code>.masthead</code>, no section nav): a story page. Same bar, so a reader who arrives from a shared link can still join; the "All stories" back link in the story takes them to the front page.</li>
<li><b>Plain</b> (<code>.masthead--plain</code>): Subscribe. Not sticky, and the actions give way to one quiet "Back to news" (<code>.masthead__back</code>): this page has one job and should not invite a detour to sign in.</li>
<li><b>Legal</b> (<code>.masthead__back--ink</code>): Privacy and Terms. Sticky, with a link to the other legal page in ink, so the two read as a pair.</li>
</ul>""",
    "anatomy": {
        "figure": news(label="Sections, anatomy"),
        "callouts": [(4, 22), (80, 22), (94, 22), (6, 80), (30, 80)],
        "parts": [
            ("Bar", "<code>.masthead__bar</code>: the lockup and actions in one 64px row (<code>--layout-topbar-height</code>), centred in <code>--layout-container-max</code>."),
            ("Sign in", "Ghost button, <code>.site-header__signin</code>; hidden below 640px (sign-in stays one tap away from Join)."),
            ("Join free", "The one primary action on public pages."),
            ("Section nav", "<code>.section-nav</code>: a row of links that scrolls sideways on phones, labelled \"Sections\"."),
            ("Current section", "<code>aria-current=\"page\"</code>: accent text and a 2px accent underline."),
        ],
    },
    "variants": "<h3>News front page</h3>" + ex(news(label="Sections, news example"), "Landing, Latest: bar and sections. Sticky.", True, mod="block")
    + "<h3>Story</h3>" + ex(STORY, "Story page: the bar only. Sticky.", True, mod="block")
    + "<h3>Plain</h3>" + ex(PLAIN, "Subscribe: <code>.masthead--plain</code> is static, with a muted Back to news.", True, mod="block")
    + "<h3>Legal</h3>" + ex(LEGAL, "Privacy: the other legal page in ink (<code>.masthead__back--ink</code>).", True, mod="block")
    + "<h3>A section chosen</h3>" + ex(news("Events", "Sections, Events example"), "Landing, Events: the section's link is current; the page's <code>h1</code> is the section name.", mod="block"),
    "sizes": "<p>One size. The bar is <code>--layout-topbar-height</code> (64px); the section nav adds a row of about 38px links (about 48px on coarse pointers). The whole masthead is about 104px tall on the front page and 64px elsewhere.</p>",
    "states": {
        "intro": "<p>The bar has no states; its links and buttons do. A section link is current through <code>aria-current=\"page\"</code>, which assistive technology announces; hover is forced here with <code>data-state=\"hover\"</code> and focus with <code>data-state=\"focus\"</code>. Buttons follow <a href=\"button.html\">Button</a>.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'), ("Current", CUR)], [
            ("Section link", '<a class="section-nav__link" href="#top"{a}>Training</a>'),
            ("Back to news", f'<a class="btn btn--ghost masthead__back" href="#top"{{a}}>{icon("arrow-left")}Back to news</a>', {"Current": None}),
            ("Legal back (ink)", '<a class="btn btn--ghost masthead__back masthead__back--ink" href="#top"{a}>Terms of Service</a>', {"Current": None}),
        ]),
        "themes": themes(news("Events", "Sections, theme example"), "block"),
        "notes": """<ul>
<li><b>Current</b> is colour plus a 2px underline, so it never relies on colour alone.</li>
<li>Section links never disable. A section with no stories still opens and says "No stories in Training yet this week."</li>
<li>While the front page loads, the masthead is already complete: it is static, so loading, empty and error states only change what is under it.</li>
</ul>""",
    },
    "responsive": """<ul>
<li><b>Below 640px</b>: bar padding 16px; "Sign in" hides (<code>.site-header__signin</code>); the section nav scrolls sideways inside itself with its scrollbar hidden, padding 8px.</li>
<li><b>From 640px</b> (<code>--layout-breakpoint-sm</code>): bar padding 24px, section nav padding 16px; Sign in shows.</li>
<li><b>From 1152px</b>: the bar and nav stop growing at <code>--layout-container-max</code> and centre; the border and surface run full width.</li>
<li><b>Coarse pointers</b>: section links grow to 12px vertical padding, about 48px tall.</li>
<li><code>.masthead</code> is <code>position: sticky</code> at the top with <code>--z-sticky</code>; <code>--plain</code> scrolls away with the page.</li>
</ul>""",
    "theming": "<p>The masthead reads <code>--color-bg-surface</code> over a hairline <code>--color-border-default</code>. Section links read <code>--color-fg-muted</code>, hover <code>--color-fg-default</code>, current <code>--color-fg-accent</code> with a <code>--color-accent</code> underline. Back to news sets the ghost button's <code>--btn-fg</code> to <code>--color-fg-muted</code>; the ink modifier sets it to <code>--color-fg-default</code>. Dark theme swaps every one through the semantic tokens.</p>",
    "accessibility": {
        "pattern": "<p>A <code>&lt;header&gt;</code> outside <code>&lt;main&gt;</code>, so it is the page's banner landmark, holding a <code>&lt;nav aria-label=\"Sections\"&gt;</code> of plain links (<a href=\"https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/\">APG navigation</a> without menus). Sections are pages with their own URLs, so they are links with <code>aria-current</code>, not tabs. A <a href=\"skip-link.html\">skip link</a> comes first.</p>",
        "keys": [
            (kbd("Tab") + " / " + kbd("Shift", "Tab"), "Lockup, Sign in, Join free, then each section in order. A focused section scrolls into view in the nav."),
            (kbd("Enter"), "Follows the link: the section's page, or the button's destination."),
        ],
        "focus": "<p>The shared 2px <code>--color-focus-ring</code> at 2px offset on <code>:focus-visible</code>; the lockup uses a 4px offset. The sticky masthead must not cover focus: pages under it set <code>scroll-padding-top</code>, and the legal sections use <code>scroll-margin-top: var(--layout-sticky-offset)</code>.</p>",
        "labelling": "<p>The nav is labelled \"Sections\", distinct from the member app's \"Primary\". The lockup's text, \"Christian Fitness\", names its link; the seal is hidden. Back to news has a visible label and a hidden arrow icon.</p>",
        "pairs": [
            ("Section link", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Current section", "--color-fg-accent", "--color-bg-surface", 4.5),
            ("Current underline", "--color-fg-accent", "--color-bg-surface", 3),
            ("Hovered section", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Focus ring", "--color-focus-ring", "--color-bg-surface", 3),
        ],
        "motion": "<p>Link colour and underline change over <code>--duration-fast</code>; reduced motion zeroes it. The masthead never hides or shrinks on scroll.</p>",
        "touch": "<p>Section links are about 38px tall with a pointer and about 48px on touch (<code>@media (pointer: coarse)</code>); buttons are 44px. On a phone the section row scrolls by swipe, and the hidden scrollbar is acceptable because the last section is visibly cut at the edge.</p>",
    },
    "content": """<ul>
<li>Sections, in this order: Latest, Events, Training, Nutrition, Faith &amp; Body, Community, Pros. One or two words each; \"&amp;\" is allowed in Faith &amp; Body.</li>
<li>Actions: \"Sign in\" and \"Join free\", never \"Log in\" or \"Register\".</li>
<li>The plain variant's link says where it goes: \"Back to news\". The legal variant names the other page: \"Terms of Service\" or \"Privacy Policy\".</li>
</ul>""",
    "dodont": [
        ("do", news(label="Sections, do example"), "Sections are links with one <code>aria-current</code>; each has its own page and URL."),
        ("dont", f'<header class="masthead"><div class="masthead__bar">{LOCKUP}{ACTIONS}</div><div class="section-nav" role="tablist" aria-label="Sections, don\'t example">'
         + "".join(f'<button class="section-nav__link" type="button" role="tab" aria-selected="{"true" if s == "Latest" else "false"}">{s.replace("&", "&amp;")}</button>' for s in SECTIONS[:4]) + "</div></header>",
         "Sections as tabs: they change the URL and the page's <code>h1</code>, so they are navigation, not a tab panel."),
        ("do", PLAIN, "Subscribe: one quiet way back; the form is the only call to action."),
        ("dont", f'<header class="masthead masthead--plain"><div class="masthead__bar">{LOCKUP}{ACTIONS}</div>{section_nav(label="Sections, second don\'t example")}</header>',
         "The full masthead on Subscribe: Join free competes with Subscribe free, and the sections invite a detour."),
    ],
    "tokens": [
        ("Surface / border", "--color-bg-surface / --color-border-default", "color"),
        ("Section link / hover", "--color-fg-muted / --color-fg-default", "color"),
        ("Current section / underline", "--color-fg-accent", "color"),
        ("Bar height", "--layout-topbar-height", "value"),
        ("Container", "--layout-container-max", "value"),
        ("Bar padding", "--space-4 / --space-6", "value"),
        ("Link padding", "--space-1 / --space-3 / --space-2-5", "value"),
        ("Link type", "--font-size-ui / --font-weight-semibold", "value"),
        ("Underline", "--border-width-thick", "value"),
        ("Stacking", "--z-sticky", "value"),
        ("Transition", "--duration-fast / --ease-standard", "value"),
    ],
    "code": {
        "snippet": '''<header class="masthead">
  <div class="masthead__bar">
    <a class="lockup" href="/">…<span class="lockup__name">Christian Fitness</span></a>
    <div class="site-header__actions">
      <a class="btn btn--ghost site-header__signin" href="/sign-in">Sign in</a>
      <a class="btn btn--primary" href="/join">Join free</a>
    </div>
  </div>
  <nav class="section-nav" aria-label="Sections">
    <a class="section-nav__link" href="/" aria-current="page">Latest</a>
    <a class="section-nav__link" href="/sections/events">Events</a>
    …
  </nav>
</header>

<!-- Subscribe -->
<header class="masthead masthead--plain">
  <div class="masthead__bar">
    <a class="lockup" href="/">…</a>
    <a class="btn btn--ghost masthead__back" href="/"><svg class="icon" aria-hidden="true">…</svg>Back to news</a>
  </div>
</header>''',
        "classes": [
            ("<code>.masthead</code>", "Sticky public header: surface, hairline under it."),
            ("<code>.masthead--plain</code>", "Static: scrolls away (Subscribe)."),
            ("<code>.masthead__bar</code>", "The 64px row, centred in the container."),
            ("<code>.masthead__back</code> <code>--ink</code>", "Ghost button pushed right; muted, or ink for the legal pair."),
            ("<code>.site-header__actions</code> <code>.site-header__signin</code>", "Sign in and Join free (shared with the <a href=\"top-bar.html\">site header</a>)."),
            ("<code>.section-nav</code> <code>.section-nav__link</code>", "Sideways-scrolling section links."),
            ("<code>aria-current=\"page\"</code>", "The current section."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/landing/default", "news masthead, Latest current"),
            mock("pages/landing/section", "Events current"),
            mock("pages/story/default", "story masthead without sections"),
            mock("pages/subscribe/default", "plain masthead with Back to news"),
            mock("pages/privacy/default", "legal masthead, ink link to Terms"),
            mock("pages/terms/default", "ink link to Privacy"),
            mock("pages/newsletter/default", "no site masthead: the issue's own brand band, see Newsletter issue"),
        ],
        "drift": "The landing page's <code>.site-header</code> was replaced by <code>.masthead</code>; its <code>.site-header__actions</code> and <code>__signin</code> classes are kept inside the masthead bar, so no mock now renders <code>.site-header</code> itself. Section links use <code>--font-size-ui</code> and the 2px <code>--border-width-thick</code> underline rather than the prototype's 15px and 2px literals.",
    },
}
