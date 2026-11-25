from dslib import ex, icon, kbd, matrix, mock, themes

FOOT = ('<footer class="site-footer"><p>© 2026 Christian Fitness · Toronto</p>'
        '<p>Health · Energy · Abundant life</p></footer>')

NEWS = ('<footer class="site-footer"><p>© 2026 Christian Fitness · Toronto</p><p class="site-footer__links">'
        '<a href="#top">Newsletter</a>'
        f'<a href="#top">{icon("rss", "icon--xs")} RSS</a>'
        '<a href="#top">Send feedback</a><a href="#top">Privacy</a><a href="#top">Terms</a></p></footer>')

APP = ('<footer class="app-footer"><div class="app-footer__inner"><p>© 2026 Christian Fitness · Toronto</p><p class="app-footer__links">'
       '<a href="#top">Send feedback</a><a href="#top">Preferences</a><a href="#top">Privacy</a><a href="#top">Terms</a></p></div></footer>')

SPEC = {
    "lead": "The footer closes a page with who we are and where, and the few links people look for at the bottom: the newsletter, feedback, preferences and the legal pages.",
    "meta": ["Status: stable, extended", "<code>&lt;footer&gt;</code>", "Public site and member app"],
    "overview": """<p>There are three footers, all quiet, 14px and muted: the page above has already made its case.</p>
<ul>
<li><b>News footer</b> (<code>.site-footer</code> with <code>.site-footer__links</code>): the news front page. The copyright and city, then Newsletter, RSS, Send feedback, Privacy and Terms.</li>
<li><b>Plain site footer</b> (<code>.site-footer</code>): Subscribe. The copyright and the brand's three words, \"Health · Energy · Abundant life\"; no links, because the page has one job.</li>
<li><b>Member footer</b> (<code>.app-footer</code>): under every member page that scrolls (Home, Events, Directory, Services, Profile, event and listing pages, Preferences, Send feedback, error pages): the copyright, then Send feedback, Preferences, Privacy and Terms. A page that fills the window (Messages, <code>.app--fill</code>) has none.</li>
</ul>
<p>The admin console has no footer. Stories and the newsletter's web version end with their own <a href="newsletter-box.html">subscribe band</a> and <a href="issue.html">issue footer</a>.</p>""",
    "anatomy": {
        "figure": APP,
        "callouts": [(5, 50), (52, 50), (90, 50)],
        "parts": [("Legal line", "© year, name and city, 14px muted."),
                  ("Links", "<code>.app-footer__links</code> / <code>.site-footer__links</code>: a wrapping row, 20px apart."),
                  ("Rule", "The member footer sits under a hairline <code>--color-border-default</code> and reserves the tab bar's height on phones.")],
    },
    "variants": "<h3>News footer</h3>" + ex(NEWS, "Landing: copyright and five links, RSS with its mark.", True, mod="block")
    + "<h3>Plain site footer</h3>" + ex(FOOT, "Subscribe: two calm lines.", True, mod="block")
    + "<h3>Member footer</h3>" + ex(APP, "Every scrolling member page.", True, mod="block"),
    "sizes": "<p>One size. The site footer is centred in <code>--layout-container-max</code> with 32px vertical padding; the member footer's inner row has 24px vertical padding. Links are at least 44px tall (<code>--target-comfortable</code>).</p>",
    "states": {
        "intro": "<p>Footer links are muted and turn <code>--color-fg-default</code> on hover; focus is the shared ring. The hover rule is <code>:hover</code> only (no <code>data-state</code> hook), so it cannot be forced here.</p>",
        "matrix": matrix([("Default", ""), ("Focus", ' data-state="focus"')], [
            ("News footer link", '<footer class="site-footer"><p class="site-footer__links"><a href="#top"{a}>Send feedback</a></p></footer>'),
            ("Member footer link", '<footer class="app-footer"><div class="app-footer__inner"><p class="app-footer__links"><a href="#top"{a}>Preferences</a></p></div></footer>'),
        ]),
        "themes": themes(NEWS + APP, "block"),
        "notes": "<p>Footers are the same in their page's loading, empty and error states.</p>",
    },
    "responsive": """<ul>
<li><b>Below 640px</b>: the legal line and the links stack; links wrap onto more lines (4px between lines, 20px between links). Side padding 16px.</li>
<li><b>From 640px</b>: one row, spaced apart; side padding 24px.</li>
<li><b>Member footer below 768px</b>: bottom padding of <code>--layout-tabbar-height</code>, so the fixed <a href="tab-bar.html">tab bar</a> never covers it; <code>.app__main:has(+ .app-footer)</code> drops its own bottom padding so the space is not doubled. From 768px the padding goes.</li>
</ul>""",
    "theming": "<p>Text and links read <code>--color-fg-muted</code> on the page (site surface or app canvas), hover <code>--color-fg-default</code>; the member footer's rule is <code>--color-border-default</code>. Dark theme swaps them all.</p>",
    "accessibility": {
        "pattern": "<p>A <code>&lt;footer&gt;</code> outside <code>&lt;main&gt;</code>, so it becomes the contentinfo landmark; one per page. Links are plain links in a paragraph; the RSS icon is <code>aria-hidden</code> and the word \"RSS\" names the link.</p>",
        "keys": [(kbd("Tab"), "Moves through the footer links after the page content (and, in the member app, before the tab bar)."), (kbd("Enter"), "Follows the link.")],
        "focus": "<p>The shared 2px <code>--color-focus-ring</code>; the link's 24px min-height gives the ring room.</p>",
        "labelling": "<p>Links are words, not icons; the middle dots in the legal line read naturally.</p>",
        "pairs": [("Footer text on site", "--color-fg-muted", "--color-bg-surface", 4.5),
                  ("Footer text in app", "--color-fg-muted", "--color-bg-canvas", 4.5),
                  ("Hovered link", "--color-fg-default", "--color-bg-canvas", 4.5),
                  ("Focus ring", "--color-focus-ring", "--color-bg-canvas", 3)],
        "motion": "<p>Link colour over <code>--duration-fast</code>; reduced motion zeroes it.</p>",
        "touch": "<p>Links are 44px tall (<code>--target-comfortable</code>) with 20px between them.</p>",
    },
    "content": "<ul><li>\"© 2026 Christian Fitness · Toronto\": update the year each January.</li><li>Link labels are what people search for: \"Send feedback\", \"Preferences\", \"Privacy\", \"Terms\", \"Newsletter\", \"RSS\".</li><li>Brand line in sentence case with middle dots, matching the seal.</li></ul>",
    "dodont": [
        ("do", FOOT, "Two calm lines on a page with one job."),
        ("dont", '<footer class="site-footer"><p>© 2026 Christian Fitness · Toronto · Join free today! · Follow us · Download the app</p></footer>', "Calls to action pile up; the hero already asks."),
        ("do", APP, "The member footer: where people look for feedback, preferences and the policies."),
        ("dont", '<footer class="app-footer"><div class="app-footer__inner"><p class="app-footer__links"><a href="#top">Home</a><a href="#top">Events</a><a href="#top">Directory</a><a href="#top">Services</a><a href="#top">Messages</a></p></div></footer>',
         "Repeating primary navigation: it is already in the header and tab bar."),
        ("do", '<footer class="site-footer"><p>© 2026 Christian Fitness · Toronto</p><p>Health · Energy · Abundant life</p></footer>', "City named: this is a GTA community."),
        ("dont", '<footer class="site-footer"><p>COPYRIGHT 2026 CHRISTIAN FITNESS INC. ALL RIGHTS RESERVED.</p></footer>', "Shouting legal text; keep sentence case."),
    ],
    "tokens": [("Text / hover", "--color-fg-muted / --color-fg-default", "color"), ("Member rule", "--color-border-default", "color"),
               ("Size", "--font-size-sm", "value"),
               ("Padding", "--space-8 / --space-6 / --space-4", "value"), ("Link gap", "--space-1 / --space-5", "value"),
               ("Link height", "--target-comfortable", "value"), ("Tab bar clearance", "--layout-tabbar-height", "value"),
               ("Container", "--layout-container-max", "value"), ("Transition", "--duration-fast / --ease-standard", "value")],
    "code": {"snippet": '''<footer class="site-footer">
  <p>© 2026 Christian Fitness · Toronto</p>
  <p class="site-footer__links">
    <a href="/newsletter">Newsletter</a>
    <a href="/subscribe#rss"><svg class="icon icon--xs" aria-hidden="true">…</svg> RSS</a>
    <a href="/feedback">Send feedback</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a>
  </p>
</footer>

<footer class="app-footer">
  <div class="app-footer__inner">
    <p>© 2026 Christian Fitness · Toronto</p>
    <p class="app-footer__links"><a href="/feedback">Send feedback</a><a href="/preferences">Preferences</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></p>
  </div>
</footer>''',
             "classes": [("<code>.site-footer</code>", "Public footer; stacks below 640px."),
                         ("<code>.site-footer__links</code>", "Wrapping row of links on the news footer."),
                         ("<code>.app-footer</code> <code>__inner</code> <code>__links</code>", "Member footer: hairline, centred row, links; clears the tab bar below 768px."),
                         ("<code>.app__main:has(+ .app-footer)</code>", "Drops main's tab-bar padding when a footer follows.")]},
    "sources": {"mocks": [mock("pages/landing/default", "news footer with links"), mock("pages/landing/error", "same in error state"),
                          mock("pages/subscribe/default", "plain site footer"), mock("pages/home/default", "member footer"),
                          mock("pages/directory/default", "member footer"), mock("pages/preferences/default", "member footer")],
                "drift": "Fixed: footer links were <code>min-height: var(--target-min)</code> (24px), under AGENTS.md's 44px touch target; they now use <code>--target-comfortable</code>. Fixed: <code>.site-footer__links a</code> and <code>.app-footer__links a</code> gained <code>data-state=\"hover\"</code> hooks."},
}
