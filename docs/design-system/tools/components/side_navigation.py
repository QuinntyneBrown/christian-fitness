from dslib import ex, kbd, mock, themes

PREF_ITEMS = ["Email", "Notifications", "Privacy", "Suggestions", "Your data"]
LEGAL_ITEMS = ["What we collect", "How we use it", "Who we share it with", "Faith and health information", "Your choices"]


def plain_list(a=None):
    a = a or {}
    return ('<ul class="side-nav__list">' + "".join(
        f'<li><a class="side-nav__link" href="#"{a.get(i, "")}>{t}</a></li>' for i, t in enumerate(PREF_ITEMS)) + "</ul>")


def numbered_list(a=None):
    a = a or {}
    return ('<ol class="side-nav__list">' + "".join(
        f'<li><a class="side-nav__link side-nav__link--numbered" href="#"{a.get(i, "")}><span class="side-nav__n">{i + 1}.</span>{t}</a></li>'
        for i, t in enumerate(LEGAL_ITEMS)) + "</ol>")


PREFS = f'<nav class="side-nav" aria-label="Preference sections">{plain_list()}</nav>'
LEGAL = f'<nav class="side-nav" aria-label="Contents"><p class="side-nav__title">Contents</p>{numbered_list()}</nav>'
# Below 1024px .side-nav is display: none (as in the product); the bare list shows the links at every width.
NOTE = " The block is hidden below 1024px; widen the window to see it."
SPEC = {
    "lead": "Side navigation lists the sections of one long page beside it, so people can jump to Privacy or to section 4 of the terms without scrolling.",
    "meta": ["Status: new", "<code>&lt;nav&gt;</code> of in-page links", "From 1024px"],
    "overview": """<p>Use side navigation on a long, single page split into titled sections: Preferences and the legal pages (Privacy, Terms). Each link jumps to a section on the same page.</p>
<ul>
<li><b>Plain</b> (<code>.side-nav__link</code> in a <code>&lt;ul&gt;</code>): Preferences.</li>
<li><b>Numbered</b> (<code>.side-nav__link--numbered</code> with <code>.side-nav__n</code> in an <code>&lt;ol&gt;</code>, under a <code>.side-nav__title</code> \"Contents\"): Privacy and Terms, whose sections are numbered.</li>
</ul>
<p>It is not app navigation: moving between screens is the <a href="top-bar.html">top bar</a>, <a href="tab-bar.html">tab bar</a> and <a href="sidebar-navigation.html">admin sidebar</a>. For views of one list use <a href="tabs.html">tabs</a>.</p>""",
    "anatomy": {
        "figure": '<div class="w-80"><p class="side-nav__title">Contents</p>' + numbered_list({0: ' data-state="hover"'}) + "</div>",
        "callouts": [(24, 12), (10, 25), (86, 25), (60, 50)],
        "parts": [
            ("Title (optional)", "<code>.side-nav__title</code>: \"Contents\", 14px muted semibold."),
            ("Number", "<code>.side-nav__n</code>: 20px wide, tabular figures, so titles align."),
            ("Link", "15px muted semibold (regular when numbered), 8px × 12px padding, <code>--radius-sm</code>; hover fills <code>--color-bg-subtle</code>."),
            ("List", "<code>.side-nav__list</code>: sticky at <code>--layout-sticky-offset</code>, 4px between links."),
        ],
    },
    "variants": ex(PREFS, "Plain, for Preferences (preferences/default)." + NOTE, True)
    + ex(LEGAL, "Numbered with a title, for Privacy and Terms (privacy/default)." + NOTE, True),
    "sizes": "<p>One size. Plain links are 8px × 12px padded (about 40px tall); numbered links are tighter, 6px × 8px. The column is 12.5rem on Preferences (<code>.prefs</code>) and 15rem on legal pages (<code>.legal__grid</code>).</p>",
    "states": {
        "intro": "<p>Links take hover (<code>data-state=\"hover\"</code>) and focus. There is no current-section state in the CSS: the mocks do not mark which section is in view (see Sources). There is no disabled link.</p>",
        "matrix": '<div class="ds-matrix"><table><thead><tr><th scope="col">State</th><th scope="col">Plain</th><th scope="col">Numbered</th></tr></thead><tbody>'
        + "".join(f'<tr><th scope="row">{st}</th>' + ("<td>—</td><td>—</td>" if a is None else
                  f'<td><ul class="side-nav__list"><li><a class="side-nav__link" href="#"{a}>Email</a></li></ul></td>'
                  f'<td><ol class="side-nav__list"><li><a class="side-nav__link side-nav__link--numbered" href="#"{a}><span class="side-nav__n">4.</span>Faith and health</a></li></ol></td>') + "</tr>"
                  for st, a in [("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'), ("Active", None), ("Disabled", None), ("Current section", None)])
        + "</tbody></table></div>",
        "themes": themes('<div class="w-80">' + plain_list({1: ' data-state="hover"'}) + "</div>")
        + themes('<div class="w-80"><p class="side-nav__title">Contents</p>' + numbered_list() + "</div>"),
        "notes": "<ul><li>The matrix and themes show the list without its <code>.side-nav</code> wrapper so the links are visible at every width; in the product the whole <code>&lt;nav&gt;</code> is hidden below 1024px.</li></ul>",
    },
    "responsive": """<ul>
<li><b>Below 1024px</b> (<code>--layout-breakpoint-lg</code>): <code>.side-nav</code> is <code>display: none</code>. The page is one column and its section headings are the way through; nothing replaces the list.</li>
<li><b>From 1024px</b>: the left column of a two-column grid; the list sticks at <code>--layout-sticky-offset</code> while the sections scroll, and each section has a matching <code>scroll-margin-top</code> so its heading lands below the sticky header.</li>
</ul>""",
    "theming": "<p>Links read <code>--color-fg-muted</code>; hover <code>--color-bg-subtle</code> with <code>--color-fg-default</code>. The title is <code>--color-fg-muted</code>. No component tokens.</p>",
    "accessibility": {
        "pattern": "<p>A <code>&lt;nav&gt;</code> landmark with an <code>aria-label</code> (\"Preference sections\", \"Contents\") holding a list of same-page links (<code>href=\"#privacy\"</code>). Numbered pages use <code>&lt;ol&gt;</code> and write the number as text so it matches the section heading (\"4. Faith and health information\").</p>",
        "keys": [(kbd("Tab"), "Moves through the links."), (kbd("Enter"), "Jumps to the section; focus moves with it.")],
        "focus": "<p>The shared ring around the link's rounded box. Each target section should be focusable (<code>tabindex=\"-1\"</code>) so focus follows the jump.</p>",
        "labelling": "<p>The link text is the section heading, word for word. The visible \"Contents\" title repeats the nav's label.</p>",
        "pairs": [
            ("Link", "--color-fg-muted", "--color-bg-canvas", 4.5),
            ("Link on hover", "--color-fg-default", "--color-bg-subtle", 4.5),
            ("Title", "--color-fg-muted", "--color-bg-canvas", 4.5),
        ],
        "motion": "<p>Background and colour over <code>--duration-fast</code>. The jump itself does not animate; smooth scrolling, if added, must stop under reduced motion.</p>",
        "touch": "<p>The list only shows from 1024px, where a pointer is expected; links are at least 44px tall (<code>--target-comfortable</code>) and full column width.</p>",
    },
    "content": "<ul><li>Use the section headings exactly: \"Your data\", \"Who we share it with\".</li><li>Number only when the sections are numbered in the text: \"1.\", \"2.\".</li><li>Title the list \"Contents\" on legal pages; Preferences needs no title.</li></ul>",
    "dodont": [
        ("do", '<div class="w-80">' + numbered_list() + "</div>", "Numbers match the numbered sections of the policy (privacy/default)."),
        ("dont", '<div class="w-80"><ul class="side-nav__list"><li><a class="side-nav__link" href="#">Collection</a></li><li><a class="side-nav__link" href="#">Usage</a></li></ul></div>',
         "Short labels that differ from the headings make people match two lists."),
        ("do", '<div class="w-80">' + plain_list() + "</div>", "Same-page links for one long settings page."),
        ("dont", '<div class="w-80"><ul class="side-nav__list"><li><a class="side-nav__link" href="#">Events</a></li><li><a class="side-nav__link" href="#">Directory</a></li></ul></div>',
         "Links to other screens: that is app navigation, not this page's contents."),
    ],
    "tokens": [
        ("Link / hover text", "--color-fg-muted / --color-fg-default", "color"),
        ("Hover fill", "--color-bg-subtle", "color"),
        ("Link padding", "--space-2 / --space-3", "value"),
        ("Numbered padding", "--space-1-5 / --space-2", "value"),
        ("Number width", "--space-5", "value"),
        ("Radius", "--radius-sm", "value"),
        ("Sticky offset", "--layout-sticky-offset", "value"),
        ("Link size", "--font-size-ui", "value"),
        ("Transition", "--duration-fast / --ease-standard", "value"),
    ],
    "code": {
        "snippet": '''<nav class="side-nav" aria-label="Contents">
  <p class="side-nav__title">Contents</p>
  <ol class="side-nav__list">
    <li><a class="side-nav__link side-nav__link--numbered" href="#collect"><span class="side-nav__n">1.</span>What we collect</a></li>
    <li><a class="side-nav__link side-nav__link--numbered" href="#use"><span class="side-nav__n">2.</span>How we use it</a></li>
  </ol>
</nav>''',
        "classes": [
            ("<code>.side-nav</code>", "The block; hidden below 1024px."),
            ("<code>.side-nav__title</code> <code>.side-nav__list</code>", "Optional title; the sticky list."),
            ("<code>.side-nav__link</code> <code>--numbered</code> <code>.side-nav__n</code>", "Link; numbered variant and its number."),
            ("<code>data-state=\"hover|focus\"</code>", "Documentation hooks."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/preferences/default", "plain"),
            mock("pages/privacy/default", "numbered, Contents"),
            mock("pages/terms/default", "numbered, Contents"),
        ],
        "drift": """<ul>
<li>No current-section state: none of the mocks marks which section is in view, and components.css has no <code>.side-nav__link[aria-current]</code> rule. Proposed: add <code>aria-current="true"</code> on the link of the section in view, styled like hover with <code>--color-fg-default</code>, and a mock state for it.</li>
<li>Fixed: links were about 40px (plain) and 34px (numbered) tall; they now have <code>min-height: var(--target-comfortable)</code>.</li>
</ul>""",
    },
}
