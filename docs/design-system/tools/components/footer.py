from dslib import ex, matrix, mock, themes

FOOT = ('<footer class="site-footer"><p>© 2026 Christian Fitness · Toronto</p>'
        '<p>Health · Energy · Abundant life</p></footer>')

SPEC = {
    "lead": "The public footer closes the landing page with who we are, where, and what we stand for.",
    "meta": ["Status: stable", "<code>&lt;footer&gt;</code>", "Public site only"],
    "overview": """<p>The site footer is two short lines at the bottom of the landing page: the copyright with the city, and the brand's three words. It is quiet on purpose; the page above has already made the case.</p>
<ul>
<li>Use it on public pages only. Member and admin screens end with their content; the tab bar fills the bottom on phones.</li>
<li>When policy pages exist, add their links as a third item; keep it to one line on desktop.</li>
</ul>""",
    "anatomy": {
        "figure": FOOT,
        "callouts": [(5, 50), (70, 50)],
        "parts": [("Legal line", "© year, name and city, 14px muted."), ("Brand line", "\"Health · Energy · Abundant life\", the seal's ring words.")],
    },
    "variants": ex(FOOT, "The landing page footer.", True, mod="stack"),
    "sizes": "<p>One size, centred in <code>--layout-container-max</code> with 32px vertical padding.</p>",
    "states": {
        "intro": "<p>The footer is static text. If it gains links they use the <a href=\"link.html\">link</a> states.</p>",
        "matrix": matrix([("Default", "")], [("Footer", FOOT)]),
        "themes": themes(FOOT, "stack"),
        "notes": "<p>The footer is the same in the landing page's loading, empty and error states.</p>",
    },
    "responsive": "<ul><li>Below 640px the two lines stack; from 640px they sit on one row, spaced apart.</li><li>Side padding 16px, 24px from 640px.</li></ul>",
    "theming": "<p>Text reads <code>--color-fg-muted</code> on the page surface; dark theme swaps both.</p>",
    "accessibility": {
        "pattern": "<p>A <code>&lt;footer&gt;</code> outside <code>&lt;main&gt;</code>, so it becomes the contentinfo landmark. Only one per page.</p>",
        "keys": [],
        "focus": "<p>No focusable content today; future links use the shared ring.</p>",
        "labelling": "<p>The middle dots are punctuation and read naturally; no extra labels needed.</p>",
        "pairs": [("Footer text", "--color-fg-muted", "--color-bg-surface", 4.5)],
        "motion": "<p>None.</p>",
        "touch": "<p>Future links get a 44px hit area and 8px spacing.</p>",
    },
    "content": "<ul><li>\"© 2026 Christian Fitness · Toronto\": update the year each January.</li><li>Brand line in sentence case with middle dots, matching the seal.</li></ul>",
    "dodont": [
        ("do", FOOT, "Two calm lines."),
        ("dont", '<footer class="site-footer"><p>© 2026 Christian Fitness · Toronto · Join free today! · Follow us · Download the app</p></footer>', "Calls to action pile up; the hero already asks."),
        ("do", '<footer class="site-footer"><p>© 2026 Christian Fitness · Toronto</p><p>Health · Energy · Abundant life</p></footer>', "City named: this is a GTA community."),
        ("dont", '<footer class="site-footer"><p>COPYRIGHT 2026 CHRISTIAN FITNESS INC. ALL RIGHTS RESERVED.</p></footer>', "Shouting legal text; keep sentence case."),
    ],
    "tokens": [("Text", "--color-fg-muted", "color"), ("Size", "--font-size-sm", "value"),
               ("Padding", "--space-8 / --space-4 / --space-6", "value"), ("Container", "--layout-container-max", "value")],
    "code": {"snippet": FOOT.replace("><p>", ">\n  <p>").replace("</p></footer>", "</p>\n</footer>"),
             "classes": [("<code>.site-footer</code>", "Centred footer; stacks below 640px.")]},
    "sources": {"mocks": [mock("pages/landing/default", "footer"), mock("pages/landing/error", "same in error state")], "drift": "none"},
}
