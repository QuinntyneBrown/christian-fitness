from cf_data import MOST_READ, ST, STORIES, STORY_BODY
from dslib import ex, icon, image, kbd, matrix, mock, themes


def a(text):
    return f'<a class="story-link" href="#top">{text}</a>'


def headline(st, tag="h3"):
    return (f'<li class="headline"><div class="headline__body"><p class="story__section">{st["section"]}</p>'
            f'<{tag} class="headline__title">{a(st["title"])}</{tag}>'
            f'<p class="story__meta">{st["author"]} · {st["ago"]}</p></div>{image(st["image"], "headline__image")}</li>')


def lead(st=STORIES[0], tag="h2"):
    return (f'<article class="story-lead">{image(st["image"], "story-lead__image")}'
            f'<p class="story__section story-lead__section">{st["section"]}</p>'
            f'<{tag} class="story-lead__title">{a(st["title"])}</{tag}>'
            f'<p class="story-lead__dek">{st["dek"]}</p>'
            f'<p class="story__meta story-lead__meta"><strong>{st["author"]}</strong> · {st["ago"]}</p></article>')


def headlines(items, plain=False, tag="h3"):
    return f'<ul class="headline-list{" headline-list--plain" if plain else ""}">{"".join(headline(x, tag) for x in items)}</ul>'


def row(st):
    dek = f'<p class="story-row__dek">{st["dek"]}</p>' if st.get("dek") else ""
    return (f'<li class="story-row"><div class="story-row__body">'
            f'<p class="story__section">{st["section"]} <span class="story__ago">· {st["ago"]}</span></p>'
            f'<h3 class="story-row__title">{a(st["title"])}</h3>{dek}<p class="story__meta">{st["author"]}</p></div>'
            f'{image(st["image"], "story-row__image")}</li>')


def river(items, title="The latest"):
    return f'<section class="river" aria-label="Stories, example"><p class="display river__title">{title}</p><ul class="river__list">{"".join(row(x) for x in items)}</ul></section>'


RANKED = '<ol class="ranked">' + "".join(
    f'<li><span class="ranked__n" aria-hidden="true">{i}</span><p class="ranked__title"><a href="#">{t}</a></p></li>' for i, t in enumerate(MOST_READ, 1)) + "</ol>"
RAIL = f'<aside class="rail" aria-label="Most read, example"><section><p class="display rule-title">Most read</p>{RANKED}</section></aside>'

TOP = f'<section class="top-stories" aria-label="Top stories, example">{lead()}{headlines(STORIES[1:5])}</section>'
NEWS = f'<div class="news">{river(STORIES[5:7])}{RAIL}</div>'
NEWS_FLUSH = f'<div class="news news--flush">{river([x for x in STORIES if x["section"] == "Events"][:2], "Events")}{RAIL}</div>'


def nxt(label="In the directory", title="Find church sports ministries near you", a_=""):
    return (f'<a class="story-next" href="#top"{a_}><span class="story-next__body"><span class="story-next__label">{label}</span>'
            f'<span class="story-next__title">{title}</span></span>{icon("arrow-right", "icon--lg story-next__arrow")}</a>')


def card(st):
    return (f'<a class="story-card" href="#top">{image(st["image"], "story-card__image")}'
            f'<span class="story__section story-card__section">{st["section"]}</span>'
            f'<span class="story-card__title">{st["title"]}</span>'
            f'<span class="story__meta">{st["author"]} · {st["ago"]}</span></a>')


MORE = ('<section class="story-more" aria-label="Keep reading, example"><div class="story-more__inner">'
        '<p class="display river__title">Keep reading</p><ul class="story-more__list">'
        + "".join(f"<li>{card(x)}</li>" for x in (ST["walking-seniors"], ST["easter-5k-record"], ST["okafor-interview"]))
        + "</ul></div></section>")

BG = ST["basement-gym"]


def byline(copied=False):
    return (f'<div class="story__byline"><div class="story__byline-body"><p class="story__author">{BG["author"]}</p>'
            f'<p class="story__when">{BG["ago"]} · {BG["read"]}</p></div>'
            f'<button class="btn btn--secondary btn--sm" type="button">{icon("check" if copied else "link-2")}{"Link copied" if copied else "Copy link"}</button>'
            f'<p class="visually-hidden" role="status">{"Link copied" if copied else ""}</p></div>')


def paras(body):
    return "".join(f'<blockquote class="story__quote"><p>{p[2:]}</p></blockquote>' if p.startswith("> ") else f"<p>{p}</p>" for p in body)


ARTICLE = (f'<article class="story"><header class="story__head"><a class="back-link" href="#top">{icon("arrow-left")} All stories</a>'
           f'<p class="story__section story__kicker">{BG["section"]}</p><h2 class="story__title">{BG["title"]}</h2>'
           f'<p class="story__dek">{BG["dek"]}</p>{byline()}</header>'
           f'<figure class="story__figure">{image(BG["image"], "story__image")}</figure>'
           f'<div class="story__body">{paras(STORY_BODY["basement-gym"][:3])}{nxt()}'
           f'<p class="story__correct">{icon("message-square-warning")} Spotted a mistake? <a class="link" href="#top">Send a correction</a></p></div></article>')

SMALL_ROW = f'<ul class="river__list">{row(STORIES[6])}</ul>'

SKELETON = ('<div aria-busy="true" aria-live="polite"><p class="visually-hidden">Loading stories</p><ul class="river__list">'
            + ('<li class="story-row"><div class="story-row__body skeleton-stack"><span class="skeleton skeleton--text-sm w-30"></span>'
               '<span class="skeleton skeleton--title"></span><span class="skeleton skeleton--text w-80"></span></div>'
               '<span class="skeleton skeleton--tile"></span></li>') * 2 + '</ul></div>')

ERROR = (f'<div class="river"><p class="display river__title">The latest</p><div class="inline-error" role="alert">{icon("alert-circle")}'
         '<div class="inline-error__body"><p class="inline-error__title">Stories didn\'t load.</p><p>Check your connection, then try again.</p>'
         '<button type="button">Try again</button></div></div></div>')

SIZES = """<div class="ds-table-wrap"><table class="ds-table"><thead><tr><th scope="col">Form</th><th scope="col">Title (phone → 640px)</th><th scope="col">Image</th><th scope="col">Heading level</th></tr></thead><tbody>
<tr><td>Story page title <code>.story__title</code></td><td><code>--font-size-3xl</code> → <code>4xl</code>, bold</td><td>16:9, up to 64rem</td><td><code>h1</code></td></tr>
<tr><td>Lead <code>.story-lead__title</code></td><td><code>--font-size-3xl</code> → <code>4xl</code>, bold</td><td>16:9, column width</td><td><code>h1</code> on Latest</td></tr>
<tr><td>Story row <code>.story-row__title</code></td><td><code>--font-size-xl</code> → <code>2xl</code>, bold</td><td>4:3, 7rem → 14rem</td><td><code>h3</code> under the river's <code>h2</code></td></tr>
<tr><td>Headline <code>.headline__title</code></td><td><code>--font-size-lg</code>, bold</td><td>5rem square</td><td><code>h2</code> on the front page, <code>h3</code> in an issue</td></tr>
<tr><td>Story card <code>.story-card__title</code></td><td><code>--font-size-lg</code>, bold</td><td>16:10, card width</td><td>none: the card is a link</td></tr>
<tr><td>Story next <code>.story-next__title</code></td><td><code>--font-size-lg</code>, bold</td><td>none</td><td>none: the card is a link</td></tr>
<tr><td>Ranked <code>.ranked__title</code></td><td><code>--font-size-md</code>, semibold; numeral <code>--font-size-3xl</code></td><td>accent, underlined</td><td>none</td></tr>
</tbody></table></div>"""

SPEC = {
    "lead": "Stories are how the news front page, a story and the newsletter present what was written: one lead, headlines, a river, a ranked list, cards and the story itself.",
    "meta": ["Status: new", "Headline links, not whole-card links (except cards)", "Public site"],
    "overview": """<p>One family of blocks shows stories at different weights. Pick the form by how much attention the story should get and how much room there is:</p>
<ul>
<li><b>Story lead</b> (<code>.story-lead</code>): the single most important story, on the front page's Latest view only, with a 16:9 photo, its section, a large headline, the dek and the byline.</li>
<li><b>Headline list</b> (<code>.headline-list</code>, <code>.headline</code>): the next four stories beside the lead under a 2px ink rule; small thumbnails. <code>--plain</code> drops the rule where a <a href="section-heading.html">rule title</a> already heads the list (the newsletter's "Worth your time").</li>
<li><b>Top stories</b> (<code>.top-stories</code>): the lead and the headline list together, two columns from 1024px.</li>
<li><b>River</b> (<code>.river</code>, <code>.story-row</code>): the newest stories in order, each a row with section and age, headline, dek and author, and a 4:3 photo on the right. Used for "The latest" and for a section's page.</li>
<li><b>Ranked list</b> (<code>.ranked</code>): "Most read", numbered in italic display numerals, each title a link to its story. Rail only.</li>
<li><b>News layout</b> (<code>.news</code>, <code>.rail</code>): the river and the rail (Join card, upcoming events, newsletter box, most read) side by side from 1024px. <code>--flush</code> drops the top border when there are no top stories above it (section pages, empty and error states).</li>
<li><b>Story page</b> (<code>.story</code>): one story to read: head (back link, section, title, dek, byline with Copy link), figure, body with pull quotes.</li>
<li><b>Story next</b> (<code>.story-next</code>): the one next step a story points to: an event to register for or a listing to visit. Only when the story has one.</li>
<li><b>Keep reading</b> (<code>.story-more</code>, <code>.story-card</code>): three cards after a story, same section first.</li>
</ul>
<p>Headlines are links (<code>.story-link</code>) inside headings; the photo, section and meta around them are not. Only the story card and story next are whole-block links, because they hold no other content.</p>""",
    "anatomy": {
        "figure": f'<div class="w-80">{SMALL_ROW}</div>',
        "callouts": [(8, 18), (30, 34), (40, 62), (8, 85), (88, 30)],
        "parts": [
            ("Section and age", "<code>.story__section</code> in 14px accent semibold; <code>.story__ago</code> in muted regular."),
            ("Headline", "A heading holding one <code>.story-link</code>; underlines on hover."),
            ("Dek", "<code>.story-row__dek</code>, muted, relaxed line height; hidden below 640px."),
            ("Meta", "<code>.story__meta</code>: author, and age where the section line does not carry it; <code>strong</code> bolds the author in the lead."),
            ("Photo", "Decorative (<code>alt=\"\"</code>), cropped with <code>object-fit: cover</code>, square corners as in print."),
        ],
    },
    "variants": "<h3>Top stories: lead and headline list</h3>" + ex(TOP, "Landing, Latest: the lead (an <code>h1</code> on that page) and four headlines with thumbnails. Two columns from 1024px.", True, mod="block")
    + "<h3>News: river and rail</h3>" + ex(NEWS, "Landing: \"The latest\" as story rows beside the rail's Most read. The full rail also holds the Join card, events and the newsletter box.", True, mod="block")
    + "<h3>News, flush</h3>" + ex(NEWS_FLUSH, "A section page (Events): no top stories, so <code>.news--flush</code> drops the top border; the river title is the page's <code>h1</code>.", mod="block")
    + "<h3>Plain headline list</h3>" + ex(headlines([ST["meal-prep-ministry"], ST["sabbath-rest"]], plain=True), "Newsletter issue, \"Worth your time\": no 2px rule, because the section's rule title is right above.", True, mod="block")
    + "<h3>Ranked</h3>" + ex(RAIL, "Rail, Most read: numerals hidden from assistive technology; the <code>&lt;ol&gt;</code> carries the order.", True, mod="block")
    + "<h3>Story page</h3>" + ex(ARTICLE, "A story: head with byline and Copy link, figure, body with pull quote, story next and the correction line. (Its title is the page's <code>h1</code>.)", True, mod="block")
    + "<h3>Story next</h3>" + ex(nxt("From this story", "Register for the Easter Sunrise 5K") + nxt(), "\"From this story\" points to an event; \"In the directory\" to a listing.", True, mod="stack")
    + "<h3>Keep reading</h3>" + ex(MORE, "After every story: three cards, same section first. One column, three from 768px.", True, mod="block"),
    "sizes": SIZES,
    "states": {
        "intro": "<p>Story links underline on hover and show the shared focus ring. Only <code>.story-next</code> has a <code>data-state=\"hover\"</code> hook; headline links and story cards are hover-styled through <code>:hover</code> alone, so their hover cannot be shown statically here (see sources). Nothing disables: an unavailable story is the not-found page.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"')], [
            ("Story next", nxt(a_="{a}")),
            ("Headline link", '<p class="headline__title"><a class="story-link" href="#top"{a}>Danielle Okafor on coaching strength without the shame</a></p>', {"Hover": None}),
            ("Story card", '<div class="w-40"><a class="story-card" href="#top"{a}>' + image("coach", "story-card__image")
             + '<span class="story__section story-card__section">Pros</span><span class="story-card__title">Danielle Okafor on coaching strength without the shame</span></a></div>', {"Hover": None}),
            ("Copy link", f'<button class="btn btn--secondary btn--sm" type="button"{{a}}>{icon("link-2")}Copy link</button>'),
        ]) + "<h3>Link copied</h3>" + ex(byline(copied=True), "Copy link pressed: the button reads \"Link copied\" with a check for a moment, and a status message says so.", True, mod="block")
        + "<h3>Loading</h3>" + ex(SKELETON, "Story rows as skeletons while the river loads; the lead and headlines have their own skeleton shapes.", True, mod="block")
        + "<h3>Empty</h3>" + ex('<div class="river"><p class="display river__title">Training</p><p class="river__empty">No stories in Training yet this week.</p></div>'
                                '<aside class="rail" aria-label="Upcoming events, empty example"><p class="rail__empty">No events posted yet. Check back soon.</p></aside>',
                                "A section with no stories, and the rail's empty events list.", True, mod="block")
        + "<h3>Error</h3>" + ex(ERROR, "Stories failed to load: an inline error with a retry in place; the rail still works.", True, mod="block"),
        "themes": themes(f'<div class="news news--flush">{river([STORIES[5]])}{RAIL}</div>', "block"),
        "notes": """<ul>
<li><b>Hover</b>: headline links and card titles underline (<code>--space-0-5</code> offset); story next deepens to <code>--color-accent-subtle-hover</code>.</li>
<li><b>Focus</b>: the shared ring around the link: just the headline for rows and headlines, the whole card for story cards and story next.</li>
<li><b>Link copied</b> is announced through a <code>role="status"</code> region, not just the changed label.</li>
<li><b>Plain story</b>: a story with no dek and nothing to point to drops the dek and the story next; nothing leaves a gap.</li>
</ul>""",
    },
    "responsive": """<ul>
<li><b>Phones</b>: everything is one column. The lead's photo is full width; headlines keep a 5rem thumbnail; story rows keep a 7rem 4:3 photo and hide the dek; the rail follows the river; cards stack.</li>
<li><b>From 640px</b> (<code>--layout-breakpoint-sm</code>): side padding 24px; lead and story titles grow to <code>--font-size-4xl</code>, row titles to <code>2xl</code>; the row photo grows to 14rem and the dek shows; row gap 32px.</li>
<li><b>From 768px</b>: Keep reading becomes three columns; the story subscribe band goes to one row.</li>
<li><b>From 1024px</b> (<code>--layout-breakpoint-lg</code>): top stories become 1.75fr / 1fr; the news layout becomes river / 21.25rem rail, and the rail sticks under the masthead (<code>top: 2 × --layout-topbar-height</code>).</li>
<li>The story body is capped at <code>--layout-measure</code> (42rem), the head at 48rem and the figure at 64rem, all centred.</li>
<li>Grid children set <code>min-width: 0</code>, so long headlines wrap (<code>text-wrap: pretty</code>) instead of widening the page.</li>
</ul>""",
    "theming": "<p>Stories sit on the site surface <code>--color-bg-surface</code>. Sections, ranked numerals, the story-next label and arrow read <code>--color-fg-accent</code>; deks, meta, ages and the correction line <code>--color-fg-muted</code>; headlines <code>--color-fg-default</code>. Rules are <code>--color-fg-default</code> at 2px (headline list, Keep reading) or <code>--color-border-default</code> hairlines between items. Story next fills <code>--color-accent-subtle</code>, hover <code>--color-accent-subtle-hover</code>; the pull quote's bar is <code>--color-accent</code>. Photos are unchanged in dark theme.</p>",
    "accessibility": {
        "pattern": "<p>Lists of stories are <code>&lt;ul&gt;</code> (<code>&lt;ol&gt;</code> for Most read); each headline is a real heading holding one link, so heading navigation lists the stories and the link name is the headline alone. The lead is an <code>&lt;article&gt;</code>; the story page is an <code>&lt;article&gt;</code> with a <code>&lt;header&gt;</code>. Pull quotes are <code>&lt;blockquote&gt;</code>. Story cards and story next are single links with no nested controls.</p>",
        "keys": [
            (kbd("Tab"), "Moves from headline link to headline link; on a story page: All stories, Copy link, links in the text, story next, Send a correction, then the cards."),
            (kbd("Enter"), "Opens the story, or follows story next."),
            (kbd("Enter") + " / " + kbd("Space"), "On Copy link: copies the story's address; the status region says \"Link copied\"."),
        ],
        "focus": "<p>The shared 2px <code>--color-focus-ring</code> at 2px offset. Square-cornered blocks (cards, story next) take a square ring.</p>",
        "labelling": "<p>Photos are decorative (<code>alt=\"\"</code>) because the headline says what the story is. Ranked numerals are <code>aria-hidden</code>; the ordered list announces position. The section landmarks are named: \"Top stories\", \"Stories\", \"Keep reading\". The page's <code>h1</code> is the lead headline on Latest, the section name on a section page, and the story's title on a story.</p>",
        "pairs": [
            ("Section label", "--color-fg-accent", "--color-bg-surface", 4.5),
            ("Meta, dek, age", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Headline", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Story next label", "--color-fg-accent", "--color-accent-subtle", 4.5),
            ("Story next title", "--color-fg-default", "--color-accent-subtle", 4.5),
            ("Story next label, hover", "--color-fg-accent", "--color-accent-subtle-hover", 4.5),
            ("Pull quote bar", "--color-fg-accent", "--color-bg-surface", 3),
            ("Focus ring", "--color-focus-ring", "--color-bg-surface", 3),
        ],
        "motion": "<p>Story next's fill changes over <code>--duration-fast</code>; reduced motion zeroes it. Underlines appear without animation.</p>",
        "touch": "<p>Headline links are the full headline, at least two lines of 18px or larger type in practice, so well over 24px tall. Story cards and story next are large single targets. Copy link is a small button (36px); give it 8px of space from its neighbours.</p>",
    },
    "content": """<ul>
<li>Headlines in sentence case, specific and complete: \"Easter Sunrise 5K hits a record 142 sign-ups with ten days to go\". No clickbait, no all caps.</li>
<li>Deks add what the headline left out, one sentence: \"Rowers, kettlebells and a Thursday prayer circle: how St. Anne’s made fitness the front door to its parish.\"</li>
<li>Meta: author, then a relative age (\"2 hours ago\", \"Yesterday\", \"3 days ago\"); story pages add reading time (\"6 min read\").</li>
<li>Story next labels: \"From this story\" (an event) or \"In the directory\" (a listing); the title is a verb phrase: \"Register for the Easter Sunrise 5K\".</li>
<li>Empty: \"No stories in Training yet this week.\" Error: \"Stories didn't load. Check your connection, then try again.\"</li>
</ul>""",
    "dodont": [
        ("do", f'<ul class="river__list">{row(STORIES[5])}</ul>', "The headline is the link; photo and meta are not, so a screen reader hears one link per story."),
        ("dont", f'<ul class="river__list"><li class="story-row"><div class="story-row__body"><p class="story__section"><a class="story-link" href="#top">Events</a></p><p class="story-row__title"><a class="story-link" href="#top">Twelve GTA churches will run the Toronto Half as one team this fall</a></p><p class="story__meta"><a class="story-link" href="#top">Read more</a></p></div></li></ul>',
         "Several links per story, one of them \"Read more\": three tab stops, and two of them say nothing about the story."),
        ("do", RANKED.replace("<ol", '<ol aria-label="Most read, do example"', 1), "Numbers from the <code>&lt;ol&gt;</code>; the italic numerals are decoration."),
        ("dont", '<ul class="ranked"><li><span class="ranked__n">1</span><p class="ranked__title">Why your rest day might be the most spiritual part of your training plan</p></li><li><span class="ranked__n">2</span><p class="ranked__title">A beginner’s guide to your first outdoor bootcamp</p></li></ul>',
         "A <code>&lt;ul&gt;</code> with visible numerals read aloud: the order is in the text, not the structure."),
        ("do", nxt("From this story", "Register for the Easter Sunrise 5K"), "One next step that says what happens."),
        ("dont", nxt("From this story", "Register") + nxt("In the directory", "See Danielle Okafor’s listing") + nxt("In the directory", "Find church sports ministries near you"),
         "A stack of next steps: the story points to one thing, or to none."),
    ],
    "tokens": [
        ("Section, ranked numeral, story-next label", "--color-fg-accent", "color"),
        ("Dek, meta, age", "--color-fg-muted", "color"),
        ("Headline, ink rules", "--color-fg-default", "color"),
        ("Hairlines", "--color-border-default", "color"),
        ("Story next / hover", "--color-accent-subtle / --color-accent-subtle-hover", "color"),
        ("Pull quote bar", "--color-fg-accent", "color"),
        ("Title sizes", "--font-size-lg / --font-size-xl / --font-size-2xl / --font-size-3xl / --font-size-4xl", "value"),
        ("Line heights", "--line-height-tight / --line-height-snug / --line-height-relaxed", "value"),
        ("Rules", "--border-width-hairline / --border-width-thick", "value"),
        ("Container, measure", "--layout-container-max / --layout-measure", "value"),
        ("Rail offset", "--layout-topbar-height", "value"),
        ("Gaps", "--space-4 / --space-5 / --space-8 / --space-10 / --space-12", "value"),
        ("Ranked numeral font", "--font-family-display", "value"),
        ("Transition", "--duration-fast / --ease-standard", "value"),
    ],
    "code": {
        "snippet": '''<section class="top-stories" aria-label="Top stories">
  <article class="story-lead">
    <img class="story-lead__image" src="church-gym.jpg" alt="" width="1376" height="768">
    <p class="story__section story-lead__section">Community</p>
    <h1 class="story-lead__title"><a class="story-link" href="/stories/basement-gym">A West End church turned its basement…</a></h1>
    <p class="story-lead__dek">Rowers, kettlebells and a Thursday prayer circle…</p>
    <p class="story__meta story-lead__meta"><strong>Naomi Clarke</strong> · 2 hours ago</p>
  </article>
  <ul class="headline-list">
    <li class="headline">
      <div class="headline__body">
        <p class="story__section">Events</p>
        <h2 class="headline__title"><a class="story-link" href="…">Easter Sunrise 5K hits a record 142 sign-ups…</a></h2>
        <p class="story__meta">CF Team · 4 hours ago</p>
      </div>
      <img class="headline__image" src="run.jpg" alt="" width="1376" height="768">
    </li>
  </ul>
</section>
<div class="news">
  <section class="river" aria-label="Stories">
    <h2 class="display river__title">The latest</h2>
    <ul class="river__list"><li class="story-row">…</li></ul>
  </section>
  <aside class="rail" aria-label="Join, events and newsletter">…<ol class="ranked">…</ol></aside>
</div>''',
        "classes": [
            ("<code>.top-stories</code>", "Lead and headline list; 1.75fr / 1fr from 1024px."),
            ("<code>.story-lead</code> <code>__image</code> <code>__section</code> <code>__title</code> <code>__dek</code> <code>__meta</code>", "The lead story."),
            ("<code>.headline-list</code> <code>--plain</code>", "Headline stack under a 2px ink rule, or without it."),
            ("<code>.headline</code> <code>__body</code> <code>__title</code> <code>__image</code>", "One headline with a square thumbnail."),
            ("<code>.news</code> <code>--flush</code>", "River and rail; flush drops the top border."),
            ("<code>.river</code> <code>__title</code> <code>__list</code> <code>__empty</code>", "The story river, its heading and empty text."),
            ("<code>.story-row</code> <code>__body</code> <code>__title</code> <code>__dek</code> <code>__image</code>", "A river row."),
            ("<code>.rail</code> <code>__empty</code>", "The sticky side column and its empty text."),
            ("<code>.ranked</code> <code>__n</code> <code>__title</code>", "Most read."),
            ("<code>.story-link</code>", "A headline link: underline on hover."),
            ("<code>.story__section</code> <code>__ago</code> <code>__meta</code>", "Shared label and meta lines."),
            ("<code>.story</code> <code>__head</code> <code>__kicker</code> <code>__title</code> <code>__dek</code> <code>__byline</code> <code>__author</code> <code>__when</code> <code>__figure</code> <code>__image</code> <code>__body</code> <code>__quote</code> <code>__correct</code>", "The story page."),
            ("<code>.story-next</code> <code>__body</code> <code>__label</code> <code>__title</code> <code>__arrow</code>", "The one next step; <code>data-state=\"hover\"</code> supported."),
            ("<code>.story-more</code> <code>__inner</code> <code>__list</code>", "Keep reading band."),
            ("<code>.story-card</code> <code>__image</code> <code>__section</code> <code>__title</code>", "A whole-card story link."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/landing/default", "top stories, river, rail, ranked"),
            mock("pages/landing/section", "news--flush, river title as h1"),
            mock("pages/landing/section-empty", "river empty"),
            mock("pages/landing/loading", "skeletons"),
            mock("pages/landing/empty", "river and rail empty"),
            mock("pages/landing/error", "inline error in the river"),
            mock("pages/story/default", "story page, story next, Keep reading"),
            mock("pages/story/link-copied", "Copy link confirmed"),
            mock("pages/story/plain", "no dek, no story next"),
            mock("pages/story/loading", "story skeleton"),
            mock("pages/newsletter/default", "headline-list--plain"),
        ],
        "drift": "Photos use square corners, as in the prototype's print style, rather than the app's <code>--radius-xl</code>. Closed: Most read titles (<code>.ranked__title</code>) are now links, so a reader can open a most-read story from the rail. <code>.story-link</code> and <code>.story-card</code> have no <code>data-state=\"hover\"</code> hook, unlike <code>.story-next</code> (open).",
    },
}
