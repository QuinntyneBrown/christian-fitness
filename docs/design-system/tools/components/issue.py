from cf_data import MEMBER_EVENTS, NEWSLETTER as N, STORIES
from dslib import ex, icon, image, kbd, matrix, mock, seal, themes

LEAD, MORE = STORIES[0], STORIES[1:]

MAST = (f'<header class="issue__masthead"><p class="issue__brand">{seal("lockup", light=True, decorative=True)}<span>Christian Fitness</span></p>'
        f'<p class="display issue__title">{N["name"]}</p><p class="issue__date">No. {N["issue"]} · {N["date"]}</p></header>')

NOTE = ('<section class="issue__section"><p class="issue__greeting">Morning, Grace.</p>'
        '<p class="issue__text">Spring finally showed up, and so did you: 142 of you have signed up for the Easter Sunrise 5K, our biggest start line yet.</p>'
        '<p class="issue__signoff">Naomi Clarke, editor</p></section>')

BIG = (f'<section class="issue__section"><p class="story__section">The big story · {LEAD["section"]}</p>{image(LEAD["image"], "issue__image")}'
       f'<h3 class="issue__lead-title">{LEAD["title"]}</h3><p class="issue__text">{LEAD["dek"]}</p>'
       '<a class="btn btn--primary issue__action" href="#top">Read the story</a></section>')

WEEK = "".join(f'<li class="event-row"><div class="event-row__date"><p class="event-row__month">{e["month"]}</p><p class="event-row__day">{e["day"]}</p></div>'
               f'<div class="event-row__body"><p class="event-row__title event-row__title--wrap">{e["title"]}</p>'
               f'<p class="event-row__meta">{e["weekday"]} {e["time"]} · {e["area"]} · {e["price"]}</p></div></li>' for e in MEMBER_EVENTS[:2])
CAL = (f'<section class="issue__section"><h3 class="display rule-title">On the calendar</h3><ul class="list-divided">{WEEK}</ul>'
       '<a class="link issue__more" href="#top">See every event</a></section>')

VERSE = ('<section class="issue__verse" aria-label="Scripture, example"><blockquote><p class="issue__quote">“Do you not know that your bodies are temples of the Holy Spirit?”</p>'
         '<cite class="issue__cite">1 Corinthians 6:19</cite></blockquote></section>')

FOOT = ('<footer class="issue__footer"><p>You’re getting this because you subscribed at www.christian.fitness. Know someone who’d like it? Forward it on.</p>'
        '<p class="issue__links"><a href="#top">Manage preferences</a><a href="#top">Follow by RSS</a><a href="#top">Unsubscribe</a></p>'
        '<p>Christian Fitness · 2091 Hurontario Street, Mississauga, Ontario, L5A 4E6</p></footer>')


def issue(body):
    return f'<article class="issue">{MAST}<div class="issue__body">{body}</div>{FOOT}</article>'


BAR = f'<div class="issue-page__bar"><a class="back-link" href="#top">{icon("arrow-left")} Christian Fitness</a><span>Issue {N["issue"]} · web version</span></div>'
PAGE = f'<div class="issue-page">{BAR}{issue(NOTE + BIG + CAL + VERSE)}</div>'

PREVIEW = ('<aside class="issue-preview" aria-label="Latest issue, example"><div class="issue-preview__head">'
           f'<p class="display rule-title rule-title--inline">Latest issue</p><p class="issue-preview__no">No. {N["issue"]}</p></div>'
           f'{image(LEAD["image"], "issue-preview__image")}<p class="issue-preview__lead">{LEAD["title"]}</p>'
           '<ul class="list-ruled issue-preview__list">'
           + "".join(f'<li><p class="story__section">{x["section"]}</p><p class="issue-preview__brief">{x["title"]}</p></li>' for x in MORE[:2])
           + f'</ul><a class="text-link issue-preview__more" href="#top">Read the full issue {icon("arrow-right")}</a></aside>')

LOADING = ('<div aria-busy="true" aria-live="polite"><p class="visually-hidden">Loading the newsletter</p><div class="issue"><div class="issue__body skeleton-stack">'
           '<span class="skeleton skeleton--title-lg"></span><span class="skeleton skeleton--text w-40"></span>'
           '<span class="skeleton skeleton--block skeleton--image-16x9"></span><span class="skeleton skeleton--title"></span>'
           '<span class="skeleton skeleton--text w-90"></span><span class="skeleton skeleton--text w-80"></span></div></div></div>')

ERROR = ('<div class="issue"><div class="issue__body"><div class="error-state" role="alert">'
         f'<span class="error-state__icon">{icon("alert-circle")}</span><div><p class="display empty-state__title">This issue didn\'t load</p>'
         '<p class="empty-state__text">We couldn\'t reach Christian Fitness. Check your connection and try again.</p>'
         f'<div class="empty-state__actions"><a class="btn btn--primary btn--sm" href="#top">{icon("rotate-cw")}Try again</a>'
         '<a class="btn btn--secondary btn--sm" href="#top">Back to news</a></div><p class="error-state__ref">Reference CF-N6W4</p></div></div></div></div>')

SPEC = {
    "lead": "A newsletter issue is The Abundant Weekly as readers get it: the email's web version, and a short preview of the latest issue on Subscribe.",
    "meta": ["Status: new", "<code>&lt;article&gt;</code>", "Public site and email"],
    "overview": """<p>The issue is designed to read the same in an inbox and in a browser, so it is one narrow column (<code>--layout-measure</code>) with a brand masthead and a dark footer.</p>
<ul>
<li><b>Issue page</b> (<code>.issue-page</code>): the web version at <code>/newsletter</code>, on the canvas with a small viewer bar (back to Christian Fitness, issue number) from 640px.</li>
<li><b>Issue</b> (<code>.issue</code>): masthead (brand, name, number and date), then sections in a fixed order: the editor's note, the big story, \"On the calendar\", \"Worth your time\" (a <a href="story.html">plain headline list</a>), a verse, and the footer with Manage preferences, Follow by RSS and Unsubscribe.</li>
<li><b>Issue preview</b> (<code>.issue-preview</code>): beside the Subscribe form, so people see what they are signing up for: the latest number, the lead image and headline, two briefs and \"Read the full issue\".</li>
</ul>
<p>The admin newsletter builder composes an issue from cards and does not render this block; its Preview opens the web version.</p>""",
    "anatomy": {
        "figure": f'<div class="w-80">{issue(NOTE)}</div>',
        "callouts": [(8, 10), (8, 22), (8, 48), (8, 60), (8, 88)],
        "parts": [
            ("Brand", "Light seal and \"Christian Fitness\" in italic display caps."),
            ("Title and date", "The newsletter's name, <code>--font-size-5xl</code> (6xl from 640px), then \"No. 48 · Saturday, April 11, 2026\"."),
            ("Section", "<code>.issue__section</code>, separated by hairlines: here the editor's note with greeting and sign-off."),
            ("Body text", "<code>.issue__text</code>, <code>--font-size-lg</code> with relaxed leading."),
            ("Footer", "Why you got it, the three links, and the address, on the chrome surface."),
        ],
    },
    "variants": "<h3>Issue page</h3>" + ex(PAGE, "The web version: viewer bar, masthead, note, big story, calendar, verse and footer. (In the product the title is the page's <code>h1</code>.)", True, mod="block canvas")
    + "<h3>Issue preview</h3>" + ex(f'<div class="w-80">{PREVIEW}</div>', "Subscribe: the latest issue beside the form.", True, mod="block"),
    "sizes": "<p>The issue is <code>--layout-measure</code> (42rem) wide at most; the preview fills its column. Side padding is 24px, 40px from 640px.</p>",
    "states": {
        "intro": "<p>The issue is read-only. Its page loads and can fail; links have the usual states, and footer links on the chrome surface use <code>--color-focus-ring-on-dark</code>.</p>"
        + "<h3>Loading</h3>" + ex(LOADING, "Skeletons in the issue's shape; the viewer bar is already there.", True, mod="block canvas")
        + "<h3>Error</h3>" + ex(ERROR, "The issue failed to load: retry, or back to the news, with a reference.", True, mod="block canvas")
        + "<h3>Links</h3>",
        "matrix": matrix([("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"')], [
            ("Read the story", '<a class="btn btn--primary issue__action" href="#top"{a}>Read the story</a>'),
            ("See every event", '<a class="link issue__more" href="#top"{a}>See every event</a>', {"Hover": None}),
            ("Footer link", '<footer class="issue__footer"><p class="issue__links"><a href="#top"{a}>Unsubscribe</a></p></footer>', {"Hover": None}),
        ]),
        "themes": themes(f'<div class="w-80">{issue(NOTE)}</div>', "block canvas"),
        "notes": "<p>The issue does not follow the reader's theme in email clients; on the web it does, through the same tokens.</p>",
    },
    "responsive": """<ul>
<li><b>Phones</b>: the issue runs edge to edge with no viewer bar; masthead, body and footer pad 24px.</li>
<li><b>From 640px</b>: the page pads 40px / 16px and shows the viewer bar; the issue is a centred card up to 42rem; side padding 40px; the title grows to <code>--font-size-6xl</code>.</li>
<li>The preview pads 20px, 28px from 640px.</li>
</ul>""",
    "theming": "<p>The issue sits on <code>--color-bg-surface</code> over the page's <code>--color-bg-canvas</code>. The masthead is <code>--color-bg-brand</code> with <code>--color-fg-on-brand</code> and <code>--color-fg-on-brand-strong</code>; the footer <code>--color-bg-chrome</code> with <code>--color-fg-on-chrome-muted</code> text and <code>--color-fg-on-chrome</code> links. The cite and \"See every event\" read <code>--color-fg-accent</code>. The preview is the canvas colour with a 2px ink rule under its head.</p>",
    "accessibility": {
        "pattern": "<p>An <code>&lt;article&gt;</code> with a <code>&lt;header&gt;</code> (the masthead, whose title is the page's <code>h1</code>) and a <code>&lt;footer&gt;</code>. Sections are <code>&lt;section aria-labelledby&gt;</code> their <code>h2</code>; the verse is a <code>&lt;blockquote&gt;</code> with <code>&lt;cite&gt;</code> in a section labelled \"Scripture\". The preview is an <code>&lt;aside&gt;</code> labelled by its heading.</p>",
        "keys": [(kbd("Tab"), "Back link, Read the story, See every event, the footer links."), (kbd("Enter"), "Follows the link.")],
        "focus": "<p>The shared ring on the surface; <code>--color-focus-ring-on-dark</code> on footer links.</p>",
        "labelling": "<p>Images are decorative. Footer links are underlined so they read as links on the dark surface without colour.</p>",
        "pairs": [
            ("Masthead date", "--color-fg-on-brand-strong", "--color-bg-brand", 4.5),
            ("Masthead title", "--color-fg-on-brand", "--color-bg-brand", 4.5),
            ("Footer text", "--color-fg-on-chrome-muted", "--color-bg-chrome", 4.5),
            ("Footer link", "--color-fg-on-chrome", "--color-bg-chrome", 4.5),
            ("Footer focus ring", "--color-focus-ring-on-dark", "--color-bg-chrome", 3),
            ("Cite, more link", "--color-fg-accent", "--color-bg-surface", 4.5),
            ("Preview number", "--color-fg-muted", "--color-bg-canvas", 4.5),
            ("Viewer bar", "--color-fg-muted", "--color-bg-canvas", 4.5),
        ],
        "motion": "<p>None.</p>",
        "touch": "<p>Footer links, \"See every event\" and buttons are 44px tall (<code>--target-comfortable</code>), with 20px between footer links.</p>",
    },
    "content": """<ul>
<li>Greet by first name: \"Morning, Grace.\" Sign off with the editor's name and role.</li>
<li>Section titles, always these: \"The big story\", \"On the calendar\", \"Worth your time\".</li>
<li>Number and date: \"No. 48 · Saturday, April 11, 2026\".</li>
<li>The footer says why: \"You’re getting this because you subscribed at www.christian.fitness.\" Unsubscribe is always there and needs no sign-in.</li>
</ul>""",
    "dodont": [
        ("do", FOOT, "Unsubscribe, in words, beside the other footer links."),
        ("dont", '<footer class="issue__footer"><p>You’re getting this because you subscribed. To stop, sign in and change your preferences.</p></footer>',
         "Hiding Unsubscribe behind sign-in: against CASL and against trust."),
        ("do", f'<div class="w-80">{PREVIEW}</div>', "The preview shows a real issue: the reader sees what they will get."),
        ("dont", '<aside class="issue-preview" aria-label="Latest issue, don\'t example"><div class="issue-preview__head"><p class="display rule-title rule-title--inline">Latest issue</p></div><p class="issue-preview__lead">Great content every week!</p></aside>',
         "A promise instead of an issue."),
    ],
    "tokens": [
        ("Page / issue", "--color-bg-canvas / --color-bg-surface", "color"),
        ("Masthead", "--color-bg-brand / --color-fg-on-brand / --color-fg-on-brand-strong", "color"),
        ("Footer", "--color-bg-chrome / --color-fg-on-chrome / --color-fg-on-chrome-muted", "color"),
        ("Footer focus", "--color-focus-ring-on-dark", "color"),
        ("Cite, more", "--color-fg-accent", "color"),
        ("Section rules", "--color-border-default", "color"),
        ("Width", "--layout-measure", "value"),
        ("Title", "--font-size-5xl / --font-size-6xl / --line-height-display", "value"),
        ("Body text", "--font-size-lg / --line-height-relaxed", "value"),
        ("Padding", "--space-6 / --space-7 / --space-10", "value"),
        ("Link height", "--target-comfortable", "value"),
    ],
    "code": {
        "snippet": '''<article class="issue">
  <header class="issue__masthead">
    <p class="issue__brand"><svg class="seal seal--lockup seal--light" aria-hidden="true">…</svg><span>Christian Fitness</span></p>
    <h1 class="display issue__title">The Abundant Weekly</h1>
    <p class="issue__date">No. 48 · Saturday, April 11, 2026</p>
  </header>
  <div class="issue__body">
    <section class="issue__section">…</section>
    <section class="issue__verse" aria-label="Scripture">
      <blockquote><p class="issue__quote">“…”</p><cite class="issue__cite">1 Corinthians 6:19</cite></blockquote>
    </section>
  </div>
  <footer class="issue__footer">
    <p>You’re getting this because you subscribed at www.christian.fitness…</p>
    <p class="issue__links"><a href="/subscribe">Manage preferences</a><a href="/subscribe#rss">Follow by RSS</a><a href="/unsubscribe?t=…">Unsubscribe</a></p>
  </footer>
</article>''',
        "classes": [
            ("<code>.issue-page</code> <code>__bar</code>", "Web-version page and its viewer bar (640px+)."),
            ("<code>.issue</code> <code>__masthead</code> <code>__brand</code> <code>__title</code> <code>__date</code>", "The issue and its brand band."),
            ("<code>__body</code> <code>__section</code> <code>__greeting</code> <code>__text</code> <code>__signoff</code>", "Sections and the editor's note."),
            ("<code>__image</code> <code>__lead-title</code> <code>__action</code> <code>__more</code>", "The big story and calendar link."),
            ("<code>__verse</code> <code>__quote</code> <code>__cite</code>", "The verse."),
            ("<code>__footer</code> <code>__links</code>", "Chrome footer and its links."),
            ("<code>.issue-preview</code> <code>__head</code> <code>__no</code> <code>__image</code> <code>__lead</code> <code>__list</code> <code>__brief</code> <code>__more</code>", "The latest-issue preview."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/newsletter/default", "web version"),
            mock("pages/newsletter/loading", ""),
            mock("pages/newsletter/error", ""),
            mock("pages/subscribe/default", "issue preview"),
        ],
        "drift": "The admin newsletter builder (pages/admin-newsletter) does not render <code>.issue</code> or <code>.issue-preview</code>. Fixed: footer links, <code>.issue__more</code> and <code>.issue-preview__more</code> were 24px tall (<code>--target-min</code>); they now use <code>--target-comfortable</code>.",
    },
}
