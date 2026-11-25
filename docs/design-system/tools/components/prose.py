from dslib import ex, icon, kbd, matrix, mock, na, themes

SUMMARY = [
    "We collect what you give us to run your account, your events and your messages. Nothing more.",
    "We never sell your information, and we don’t run ads.",
    "Your church, faith details and health goals are only shown to the people you choose in Preferences.",
]
SECTIONS = [
    ("collect", "What we collect", [
        "Account details: your name, email, password or Google sign-in, and the area you train in.",
        "Profile details you choose to add: your church, a short bio, goals and interests. These are optional."]),
    ("use", "How we use it", [
        "To run your account, register you for events, remind you about them and let hosts know who’s coming."]),
]


def summary(points=SUMMARY):
    return ('<section class="legal__summary" aria-label="The short version, example"><p class="display legal__summary-title">The short version</p>'
            f'<ul class="legal__points">{"".join(f"<li>{p}</li>" for p in points)}</ul>'
            '<p class="legal__summary-note">The full text below is what applies. This summary is here so you don’t have to read it all to know where you stand.</p></section>')


def sections(items=SECTIONS):
    return "".join(f'<section class="legal__section"><p class="legal__heading"><span class="legal__n">{i}.</span> {t}</p>'
                   + "".join(f"<p>{p}</p>" for p in ps) + "</section>" for i, (_, t, ps) in enumerate(items, 1))


QUESTIONS = ('<div class="legal__questions"><p class="legal__questions-title">Questions?</p>'
             '<p>Email privacy@christianfitness.ca, or <a class="inline-link" href="#top">send us a note</a>. Christian Fitness, 401 Richmond St W, Toronto, ON M5V 3A8.</p></div>')

TOC = ('<nav class="side-nav" aria-label="Contents, example"><p class="side-nav__title">Contents</p><ol class="side-nav__list">'
       + "".join(f'<li><a class="side-nav__link side-nav__link--numbered" href="#top"><span class="side-nav__n">{i}.</span>{t}</a></li>' for i, (_, t, _p) in enumerate(SECTIONS, 1))
       + "</ol></nav>")

PAGE = (f'<div class="legal"><a class="back-link" href="#top">{icon("arrow-left")} Christian Fitness</a>'
        '<p class="display detail-title legal__title">Privacy Policy</p><p class="subtitle legal__effective">Effective April 1, 2026</p>'
        f'<div class="legal__grid">{TOC}<div class="legal__body">{summary()}{sections()}{QUESTIONS}</div></div></div>')

BODY = f'<div class="legal">{summary(SUMMARY[:2])}{sections(SECTIONS[:1])}</div>'

SPEC = {
    "lead": "Prose sets long legal text, the Privacy Policy and Terms of Service, with a plain-language summary first and numbered sections people can jump to.",
    "meta": ["Status: new", "<code>&lt;main class=\"legal\"&gt;</code>", "Public site"],
    "overview": """<p>The legal pages are the only long reading in the product. <code>.legal</code> lays them out so a person can know where they stand in thirty seconds and still find the exact clause:</p>
<ol>
<li>Back link, title, and \"Effective April 1, 2026\".</li>
<li><b>The short version</b> (<code>.legal__summary</code>): five plain sentences on a blush panel, and a note that the full text is what applies.</li>
<li><b>Numbered sections</b> (<code>.legal__section</code>): \"1. What we collect\", each with short paragraphs, ruled apart.</li>
<li><b>Questions?</b> (<code>.legal__questions</code>): who to contact, after a 2px ink rule.</li>
</ol>
<p>From 1024px a <a href="side-navigation.html">side navigation</a> lists the sections on the left. Use <code>.legal</code> for policies and terms only; stories use the <a href="story.html">story</a> body, and short help text belongs in the page itself.</p>""",
    "anatomy": {
        "figure": BODY,
        "callouts": [(4, 8), (4, 25), (4, 52), (4, 72), (10, 72)],
        "parts": [
            ("Summary title", "\"The short version\" in display italic caps, accent."),
            ("Points", "<code>.legal__points</code>: an unordered list with accent dots, <code>--font-size-lg</code>."),
            ("Summary note", "Says the full text governs."),
            ("Section heading", "<code>.legal__heading</code> (<code>h2</code>), bold <code>--font-size-2xl</code>."),
            ("Number", "<code>.legal__n</code>, accent, part of the heading text."),
        ],
    },
    "variants": "<h3>Legal page</h3>" + ex(PAGE, "Privacy Policy: title, the short version, numbered sections and Questions. Contents shows from 1024px.", True, mod="block")
    + "<h3>Summary</h3>" + ex(summary(), "The short version on its own.", True, mod="block"),
    "sizes": "<p>One size. The grid is 15rem of contents and at most 45rem of text from 1024px, with a 64px gap. Text is <code>--font-size-lg</code> with relaxed leading.</p>",
    "states": na("Legal text is static reading. Its links follow Link; the contents' current section follows Side navigation."),
    "responsive": """<ul>
<li><b>Phones</b>: one column; the contents list is hidden (<code>.side-nav</code> shows from 1024px) and the summary comes straight after the title. The summary pads 24px.</li>
<li><b>From 640px</b>: summary pads 32px.</li>
<li><b>From 1024px</b>: two columns, contents 15rem and text up to 45rem.</li>
<li>Each section sets <code>scroll-margin-top: var(--layout-sticky-offset)</code> so a jump to it lands below the sticky masthead.</li>
</ul>""",
    "theming": "<p>Text is <code>--color-fg-default</code> on the site surface. The summary fills <code>--color-accent-subtle</code>; its title, the dots and the section numbers use <code>--color-fg-accent</code> / <code>--color-accent</code>. Section rules are <code>--color-border-default</code>; the Questions rule is 2px <code>--color-fg-default</code> with muted text.</p>",
    "accessibility": {
        "pattern": "<p>Plain document structure: one <code>h1</code>, the summary a <code>&lt;section aria-labelledby&gt;</code> its <code>h2</code>, each clause a <code>&lt;section id&gt;</code> with an <code>h2</code> whose number is real text (so \"3. Who we share it with\" is read whole). The contents is a <code>&lt;nav aria-label=\"Contents\"&gt;</code> with an ordered list of in-page links.</p>",
        "keys": [(kbd("Tab"), "Back link, contents links (1024px+), links in the text."), (kbd("Enter"), "Jumps to the section; focus and scroll move there.")],
        "focus": "<p>The shared ring. In-page jumps land 6rem below the top so the sticky masthead never covers the heading.</p>",
        "labelling": "<p>The summary is first in reading order. Section ids are words (<code>#collect</code>, <code>#sensitive</code>) so links can be shared.</p>",
        "pairs": [
            ("Body text", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Summary text", "--color-fg-default", "--color-accent-subtle", 4.5),
            ("Summary title", "--color-fg-accent", "--color-accent-subtle", 4.5),
            ("Section number", "--color-fg-accent", "--color-bg-surface", 4.5),
            ("Questions text", "--color-fg-muted", "--color-bg-surface", 4.5),
        ],
        "motion": "<p>Jumps scroll instantly; nothing animates.</p>",
        "touch": "<p>Links inside text are inline; contents links are full-width rows from Side navigation.</p>",
    },
    "content": """<ul>
<li>The short version is five sentences or fewer, each a promise in plain words: \"We never sell your information, and we don’t run ads.\"</li>
<li>Name sensitive data plainly: \"Your church, faith details and health goals…\". Say where data lives: \"stored in Canada and handled under PIPEDA\".</li>
<li>Headings are questions answered or plain nouns: \"What we collect\", \"Who we share it with\", \"Your choices\".</li>
<li>Always show the effective date and a real contact address.</li>
</ul>""",
    "dodont": [
        ("do", summary(SUMMARY[:2]), "Plain promises first; the full text below governs."),
        ("dont", '<section class="legal__summary" aria-label="Summary, don\'t example"><p class="display legal__summary-title">Summary</p><ul class="legal__points"><li>Christian Fitness may collect, process and disclose Personal Information as described herein, subject to applicable law.</li></ul></section>',
         "A summary in legalese: it summarises nothing."),
        ("do", sections(SECTIONS[:1]), "The number is part of the heading's text."),
        ("dont", '<section class="legal__section"><p class="legal__heading">WHAT WE COLLECT</p><p>Account details: your name, email, password or Google sign-in, and the area you train in.</p></section>',
         "Unnumbered, all-caps headings: harder to cite (\"see section 4\") and to read."),
    ],
    "tokens": [
        ("Text", "--color-fg-default / --color-fg-muted", "color"),
        ("Summary", "--color-accent-subtle / --color-fg-accent", "color"),
        ("Dots", "--color-accent", "color"),
        ("Rules", "--color-border-default", "color"),
        ("Type", "--font-size-lg / --font-size-2xl / --font-size-3xl / --line-height-relaxed", "value"),
        ("Grid gap", "--space-12 / --space-16", "value"),
        ("Section padding", "--space-8", "value"),
        ("Jump offset", "--layout-sticky-offset", "value"),
    ],
    "code": {
        "snippet": '''<main id="main" class="container page legal">
  <a class="back-link" href="/">…Christian Fitness</a>
  <h1 class="display detail-title legal__title">Privacy Policy</h1>
  <p class="subtitle legal__effective">Effective April 1, 2026</p>
  <div class="legal__grid">
    <nav class="side-nav" aria-label="Contents">…</nav>
    <div class="legal__body">
      <section class="legal__summary" aria-labelledby="short-title">
        <h2 class="display legal__summary-title" id="short-title">The short version</h2>
        <ul class="legal__points"><li>We never sell your information, and we don’t run ads.</li></ul>
        <p class="legal__summary-note">The full text below is what applies…</p>
      </section>
      <section class="legal__section" id="collect">
        <h2 class="legal__heading"><span class="legal__n">1.</span> What we collect</h2>
        <p>…</p>
      </section>
      <div class="legal__questions"><p class="legal__questions-title">Questions?</p><p>…</p></div>
    </div>
  </div>
</main>''',
        "classes": [
            ("<code>.legal</code> <code>__title</code> <code>__effective</code> <code>__grid</code>", "Page block, head spacing and the two-column grid."),
            ("<code>__summary</code> <code>__summary-title</code> <code>__points</code> <code>__summary-note</code>", "The short version."),
            ("<code>__section</code> <code>__heading</code> <code>__n</code>", "Numbered clauses."),
            ("<code>__questions</code> <code>__questions-title</code>", "Contact block."),
        ],
    },
    "sources": {
        "mocks": [mock("pages/privacy/default", "Privacy Policy"), mock("pages/terms/default", "Terms of Service")],
        "drift": "The page uses the <code>.legal</code> block; there is no general <code>.prose</code> class for it (a <code>.prose</code> class exists for single paragraphs such as a series summary). The section numbers' dots are drawn at <code>top: 0.7em</code>, an em offset rather than a token.",
    },
}
