from dslib import ex, icon, kbd, matrix, mock, themes

DIRECTORY = ('<div class="page-head"><div><p class="display page-title">Directory</p>'
             '<p class="subtitle subtitle--narrow">The churches, clubs, coaches and companies behind every event. Follow one to see their new dates first.</p>'
             '<p class="page-head__more"><a class="text-link text-link--ui" href="#top">Know someone who belongs here? Suggest a listing</a></p></div>'
             f'<form class="search search--wide" role="search"><label class="visually-hidden" for="sh-search">Search the directory</label>{icon("search", "search__icon")}'
             '<input class="search__input" id="sh-search" type="search" placeholder="Search names, areas, sports"></form></div>')

ADMIN = ('<div class="page-head page-head--wrap"><div><p class="display admin-title">Manage stories</p>'
         '<p class="subtitle">Write, schedule and publish stories for the news front page.</p></div>'
         f'<a class="btn btn--primary" href="#top">{icon("plus")}New story</a></div>')

AFTER_BACK = (f'<a class="back-link" href="#top">{icon("arrow-left")} Profile</a>'
              '<p class="display page-title page-title--after-back">Preferences</p>'
              '<p class="subtitle">What we send you, what other members see, and what we suggest. Signed in as Grace Thompson.</p>')

RULE = '<p class="display rule-title">Upcoming events</p>'
RULE_INLINE = ('<div class="issue-preview__head"><p class="display rule-title rule-title--inline">Latest issue</p>'
               '<p class="issue-preview__no">No. 48</p></div>')

SECTION_HEAD = ('<div class="section-head"><p class="display section-title">Sessions</p>'
                '<p class="section-head__note">3 done · 5 to go</p></div>')
SECTION_SM = '<p class="display section-title section-title--sm">Connected</p>'
EYEBROW_ICON = f'<p class="eyebrow eyebrow--icon">{icon("repeat")}Running series · 8 sessions</p><p class="display detail-title">Couch to 5K: Spring</p>'
EYEBROW_SM = '<p class="eyebrow eyebrow--sm">Church</p><p class="suggestion__name">St. Paul’s Sports Ministry</p>'

SPEC = {
    "lead": "Headings give a page and its parts their names: the page head with its title and subtitle, ruled titles for news columns, section heads with a note, and eyebrows above a title.",
    "meta": ["Status: stable, extended", "Real headings (<code>h1</code>–<code>h3</code>)", "Every app"],
    "overview": """<p>These are typographic blocks, not containers: they name what follows. Use the real heading level the outline needs and pick the class for its look.</p>
<ul>
<li><b>Page head</b> (<code>.page-head</code>): the row at the top of a list page: title (<code>.page-title</code>), <code>.subtitle</code>, and a page action or search, as in the <a href="../patterns/navigation.html">navigation pattern</a>. <code>--wrap</code> keeps title and action on one wrapping row (the admin console). <code>.page-head__more</code> adds one secondary link under the subtitle (Directory: \"Suggest a listing\"). <code>.subtitle--narrow</code> caps a long subtitle at <code>--layout-measure-narrow</code>.</li>
<li><b>Title after a back link</b> (<code>.page-title--after-back</code>): a page title that follows a <a href="link.html">back link</a> (Preferences) gets 16px above it.</li>
<li><b>Rule title</b> (<code>.rule-title</code>): a news-column heading over a 2px ink rule (rail \"Upcoming events\", \"Most read\"; the newsletter's \"On the calendar\"). <code>--inline</code> drops the rule when the title sits in a row that draws its own (\"Latest issue\" with its number).</li>
<li><b>Section head</b> (<code>.section-head</code>): a <code>.section-title</code> with a muted note or link on the same baseline (\"Sessions · 3 done · 5 to go\").</li>
<li><b>Small section title</b> (<code>.section-title--sm</code>): a section in a side column (\"Connected\" on a listing).</li>
<li><b>Eyebrow</b> (<code>.eyebrow</code>): a short accent line above a title. <code>--icon</code> leads with an icon (\"Running series · 8 sessions\"); <code>--sm</code> is 14px for cards and panels (a suggestion's kind).</li>
</ul>
<p>A heading inside a <a href="card.html">card</a> is that card's optional first line; these blocks are for the page and its columns.</p>""",
    "anatomy": {
        "figure": DIRECTORY,
        "callouts": [(4, 14), (4, 42), (4, 70), (80, 30)],
        "parts": [
            ("Page title", "<code>.display.page-title</code>, <code>--font-size-5xl</code>; the page's <code>h1</code>."),
            ("Subtitle", "<code>.subtitle</code>, muted; <code>--narrow</code> caps it at the narrow measure."),
            ("More link", "<code>.page-head__more</code>: one secondary link, 8px under the subtitle."),
            ("Action or search", "The page's one action, aligned to the title's bottom from 640px."),
        ],
    },
    "variants": "<h3>Page head</h3>" + ex(DIRECTORY, "Directory: title, measured subtitle, more link and search.", True, mod="block")
    + "<h3>Page head, wrap</h3>" + ex(ADMIN, "Admin console: title and action stay on one row and wrap when tight.", True, mod="block")
    + "<h3>Title after a back link</h3>" + ex(AFTER_BACK, "Preferences: back link, title, subtitle.", True, mod="block")
    + "<h3>Rule title</h3>" + ex(RULE + RULE_INLINE, "Rail column title over a 2px rule; inline in the issue preview's head row, whose own rule runs under the number too.", True, mod="block")
    + "<h3>Section head and small title</h3>" + ex(SECTION_HEAD + SECTION_SM, "Event series \"Sessions\" with its note; a listing's \"Connected\".", True, mod="block")
    + "<h3>Eyebrows</h3>" + ex(EYEBROW_ICON, "Event series: icon eyebrow over the detail title.", True, mod="block")
    + ex(EYEBROW_SM, "Admin suggestion: small eyebrow naming the kind.", True, mod="block"),
    "sizes": """<div class="ds-table-wrap"><table class="ds-table"><thead><tr><th scope="col">Class</th><th scope="col">Size</th><th scope="col">Use</th></tr></thead><tbody>
<tr><td><code>.page-title</code></td><td><code>--font-size-5xl</code></td><td>Page <code>h1</code></td></tr>
<tr><td><code>.section-title</code></td><td><code>--font-size-2xl</code></td><td>Section <code>h2</code></td></tr>
<tr><td><code>.rule-title</code></td><td><code>--font-size-2xl</code> + 2px rule</td><td>News column <code>h2</code></td></tr>
<tr><td><code>.section-title--sm</code></td><td><code>--font-size-xl</code></td><td>Side-column <code>h2</code></td></tr>
<tr><td><code>.eyebrow</code> / <code>--sm</code></td><td>body (<code>--font-size-md</code>) / <code>--font-size-sm</code></td><td>Label above a title, not a heading</td></tr>
</tbody></table></div>""",
    "states": {
        "intro": "<p>Headings have no states. A page head's link and action do; they follow <a href=\"link.html\">Link</a> and <a href=\"button.html\">Button</a>.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"')], [
            ("More link", '<p class="page-head__more"><a class="text-link text-link--ui" href="#top"{a}>Know someone who belongs here? Suggest a listing</a></p>', {"Hover": None}),
        ]),
        "themes": themes(RULE + SECTION_HEAD + EYEBROW_ICON, "block"),
        "notes": "<p>The text link's hover (underline) is <code>:hover</code> only; there is no <code>data-state</code> hook for it.</p>",
    },
    "responsive": """<ul>
<li><b>Phones</b>: <code>.page-head</code> stacks title block above the action, 16px apart; <code>--wrap</code> stays a row and wraps.</li>
<li><b>From 640px</b>: <code>.page-head</code> is a row, bottom-aligned, space between.</li>
<li>Titles wrap; nothing truncates. <code>.section-head</code> keeps title and note on one baseline row; it does not wrap, so keep notes short (\"3 done · 5 to go\").</li>
</ul>""",
    "theming": "<p>Titles read <code>--color-fg-default</code>; subtitles and section-head notes <code>--color-fg-muted</code>; eyebrows <code>--color-fg-accent</code>. The rule is <code>--color-fg-default</code>, so it stays ink in both themes.</p>",
    "accessibility": {
        "pattern": "<p>Use real heading elements in order: one <code>h1</code> per page (the page title), <code>h2</code> for sections and rule titles, <code>h3</code> below. The classes never set the level. An eyebrow is a <code>&lt;p&gt;</code> before the heading, not part of it, so heading navigation hears the title alone; its icon is <code>aria-hidden</code>. A section labelled by its heading uses <code>aria-labelledby</code>.</p>",
        "keys": [(kbd("Tab"), "Reaches only the links and actions in a page head.")],
        "focus": "<p>Not applicable to headings; links show the shared ring.</p>",
        "labelling": "<p>Rule titles name their <code>&lt;section&gt;</code> through <code>aria-labelledby</code> (\"Upcoming events\", \"Most read\").</p>",
        "pairs": [
            ("Title", "--color-fg-default", "--color-bg-canvas", 4.5),
            ("Subtitle, note", "--color-fg-muted", "--color-bg-canvas", 4.5),
            ("Eyebrow", "--color-fg-accent", "--color-bg-canvas", 4.5),
            ("Eyebrow on a card", "--color-fg-accent", "--color-bg-surface", 4.5),
            ("Rule title on site", "--color-fg-default", "--color-bg-surface", 4.5),
        ],
        "motion": "<p>None.</p>",
        "touch": "<p>Not applicable to headings.</p>",
    },
    "content": """<ul>
<li>Page titles are the place's name, one or two words: \"Directory\", \"Preferences\", \"Manage stories\".</li>
<li>Subtitles say what the page is for, in one sentence.</li>
<li>Rule and section titles are short nouns: \"Upcoming events\", \"Most read\", \"Sessions\".</li>
<li>Eyebrows give context, not the title again: \"Running series · 8 sessions\".</li>
</ul>""",
    "dodont": [
        ("do", EYEBROW_ICON, "Eyebrow as a paragraph above the heading."),
        ("dont", '<p class="display detail-title"><span class="eyebrow">Running series</span> Couch to 5K: Spring</p>', "Eyebrow inside the heading: every heading list reads \"Running series Couch to 5K\"."),
        ("do", '<section aria-label="Upcoming events, do example">' + RULE + "</section>", "A rule title is a real heading naming its section."),
        ("dont", '<p class="display rule-title">Upcoming events</p><p class="display rule-title">Next week</p>', "Two rule titles stacked: the rule says \"a new column starts here\"; use a section title for a sub-part."),
    ],
    "tokens": [
        ("Title / rule", "--color-fg-default", "color"),
        ("Subtitle, note", "--color-fg-muted", "color"),
        ("Eyebrow", "--color-fg-accent", "color"),
        ("Sizes", "--font-size-5xl / --font-size-2xl / --font-size-xl / --font-size-sm", "value"),
        ("Rule", "--border-width-rule", "value"),
        ("Measure", "--layout-measure-narrow", "value"),
        ("Spacing", "--space-2 / --space-4", "value"),
    ],
    "code": {
        "snippet": '''<div class="page-head">
  <div>
    <h1 class="display page-title">Directory</h1>
    <p class="subtitle subtitle--narrow">The churches, clubs, coaches and companies behind every event…</p>
    <p class="page-head__more"><a class="text-link text-link--ui" href="/directory/suggest">Know someone who belongs here? Suggest a listing</a></p>
  </div>
  <form class="search search--wide" role="search">…</form>
</div>

<section aria-labelledby="rail-events">
  <h2 class="display rule-title" id="rail-events">Upcoming events</h2>
  …
</section>

<p class="eyebrow eyebrow--icon"><svg class="icon" aria-hidden="true">…</svg>Running series · 8 sessions</p>
<h1 class="display detail-title">Couch to 5K: Spring</h1>''',
        "classes": [
            ("<code>.page-head</code> <code>--wrap</code> <code>__more</code>", "Title block and action; stacked then a row; wrapping row; one more link."),
            ("<code>.page-title</code> <code>--after-back</code>", "Page title; 16px above when it follows a back link."),
            ("<code>.subtitle</code> <code>--narrow</code>", "Muted line under a title; capped at the narrow measure."),
            ("<code>.rule-title</code> <code>--inline</code>", "Column heading over a 2px ink rule; inline drops the rule."),
            ("<code>.section-head</code> <code>__note</code>", "Section title and a muted note on one baseline."),
            ("<code>.section-title</code> <code>--sm</code>", "Section heading; small in side columns."),
            ("<code>.eyebrow</code> <code>--icon</code> <code>--sm</code>", "Accent line above a title; with an icon; 14px."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/directory/default", "page head with more link, subtitle--narrow"),
            mock("pages/preferences/default", "page-title--after-back"),
            mock("pages/landing/default", "rule titles in the rail"),
            mock("pages/subscribe/default", "rule-title--inline"),
            mock("pages/event-series/default", "eyebrow--icon, section head with note"),
            mock("pages/listing-profile/default", "section-title--sm"),
            mock("pages/admin-listings/default", "eyebrow--sm, page-head--wrap"),
        ],
        "drift": "Closed: the duplicate <code>.subtitle--measure</code> was removed; <code>.subtitle--narrow</code> remains. <code>.section-head</code> has no wrap rule, so a long note squeezes the title on phones (open).",
    },
}
