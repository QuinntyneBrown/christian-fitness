from dslib import ex, icon, kbd, matrix, mock, themes, na

ARROW = icon("arrow-right")


def empty(title, text, actions, tag="h2", tight=False):
    t = " empty-state--tight" if tight else ""
    return (f'<div class="empty-state{t}"><{tag} class="display empty-state__title">{title}</{tag}>'
            f'<p class="empty-state__text">{text}</p><div class="empty-state__actions">{actions}</div></div>')


def err(title, text, ref, back=""):
    b = f'<a class="btn btn--secondary btn--sm" href="#">{back}</a>' if back else ""
    return (f'<div class="error-state"><span class="error-state__icon">{icon("alert-circle")}</span><div>'
            f'<h2 class="display empty-state__title">{title}</h2><p class="empty-state__text">{text}</p>'
            f'<div class="empty-state__actions"><a class="btn btn--primary btn--sm" href="#">{icon("rotate-cw")}Try again</a>{b}</div>'
            f'<p class="error-state__ref">Reference {ref}</p></div></div>')


BROWSE = '<a class="btn btn--primary btn--sm" href="#">Browse events</a>'
FIRST = empty("No events yet", "The team posts runs, workouts and gatherings every week. They'll show up here as soon as they're live.", BROWSE, tight=True)
NORES = empty("Nothing here yet", "No workshop events right now. New ones are posted every week.", '<button class="btn btn--secondary btn--sm" type="button">Show all events</button>', tag="p", tight=True)
CARD = ('<div class="empty-card"><h2 class="display empty-card__title">No events yet</h2>'
        '<p class="empty-card__text">Find a run, workout or gathering near you. Your next one will show here, with its group chat one tap away.</p>'
        f'<div class="empty-card__actions">{BROWSE}</div></div>')
INLINE = ('<div class="empty-inline"><p class="empty-inline__text">New runs and workouts are posted every week. Join free and we\'ll let you know when the next one is up.</p>'
          f'<p class="empty-inline__action"><a class="text-link" href="#">Join to hear first {ARROW}</a></p></div>')
ERROR = err("Events didn't load", "We couldn't reach the server. Try again in a moment.", "CF-A2E4")

SPEC = {
    "lead": "Empty states turn \"nothing here\" into the next step; the error block does the same when a page couldn't load.",
    "meta": ["Status: stable", "<code>.empty-state</code> · <code>.empty-card</code> · <code>.empty-inline</code> · <code>.error-state</code>"],
    "overview": """<p>Every list and page in Christian Fitness has an empty and an error form:</p>
<ul>
<li><b>First run</b> (<code>.empty-state</code>): nothing exists yet ("No events yet", "No messages yet"). Explain what will appear and offer the way to make it appear.</li>
<li><b>No results</b>: a filter or search matched nothing ("No members match “Jessica”"). Offer to clear or change it.</li>
<li><b>Empty card</b> (<code>.empty-card</code>): one empty section on a busy page (home's next event).</li>
<li><b>Empty inline</b> (<code>.empty-inline</code>): a small empty list inside a page section (landing's upcoming list).</li>
<li><b>Load error</b> (<code>.error-state</code>): the page's data didn't load. Retry, a way elsewhere, and a reference for support.</li>
</ul>
<p>For whole-app failures (404, 500, offline) use the <a href="error-page.html">error page</a>; for one failed section among working ones, the <a href="inline-message.html">section error</a>.</p>""",
    "anatomy": {
        "figure": ERROR,
        "callouts": [(6, 18), (40, 30), (40, 50), (30, 72), (25, 90)],
        "parts": [
            ("Icon (error only)", "40px circle in <code>--color-danger-bg</code> with the alert icon."),
            ("Title", "<code>.empty-state__title</code>, display face, 3xl."),
            ("Text", "<code>.empty-state__text</code>, muted, one or two sentences."),
            ("Actions", "<code>.empty-state__actions</code>: one primary and at most one secondary."),
            ("Reference (error only)", "<code>.error-state__ref</code>, tabular, for support."),
        ],
    },
    "variants": ex(FIRST, "First run: events.", True)
    + ex(NORES, "No results: the title is a <code>p</code> because the page heading already exists.", True)
    + ex(CARD, "Empty card on home.", True, mod="canvas")
    + ex(INLINE, "Empty inline on the landing page.", True, mod="canvas")
    + ex(ERROR, "Load error with retry and reference (admin events).", True),
    "sizes": "<p>Two spacings: the default <code>.empty-state</code> sits 64px below the page header for full-page emptiness; <code>.empty-state--tight</code> sits 16px below filters or tabs. The text is capped at <code>--layout-form-max</code>.</p>",
    "states": {
        "intro": "<p>The variants are the states. The matrix shows each kind by surface; buttons inside have their own states (see <a href=\"button.html\">Button</a>).</p>",
        "matrix": matrix([("Example", "")], [
            ("First run", empty("No messages yet", "Register for an event and you'll join its group chat.", BROWSE, tight=True)),
            ("No results", empty("No members match “Jessica”", "Check the spelling, or search by email or home church instead.", '<button class="btn btn--secondary btn--sm" type="button">Clear search</button>', tag="p", tight=True)),
            ("Load error", err("Members didn't load", "We couldn't reach the server. Try again in a moment.", "CF-A4M8")),
        ]),
        "themes": themes(CARD + ERROR.replace("CF-A2E4", "CF-A2E5")),
        "notes": "<ul><li>Retry turns busy (\"Trying again…\") and the block is replaced by skeletons, then content or the error again.</li><li>A no-results state keeps the filters and search visible and filled in.</li></ul>",
    },
    "responsive": "<ul><li>The block is left-aligned with the page content at every width.</li><li>Actions wrap; on phones two buttons may stack.</li><li><code>.empty-card</code> padding grows from 24px to 32px at 640px.</li></ul>",
    "theming": "<p>Titles use the default foreground, text <code>--color-fg-muted</code>; cards use <code>--color-bg-surface</code> with a hairline <code>--color-border-default</code> ring. The error icon uses the danger pair. All have dark values.</p>",
    "accessibility": {
        "pattern": '<p>Titles are real headings (<code>h2</code> under the page <code>h1</code>), or a <code>p</code> when they restate a filter result. A load error replaces a busy region; in the app the error block uses <code>role="alert"</code> so the failure is announced once (omitted here). Reference codes are plain text that can be selected and copied.</p>',
        "keys": [(kbd("Tab"), "Moves to the primary action, then the secondary."), (kbd("Enter"), "Activates the action.")],
        "focus": "<p>Focus is not moved into an empty state on load. After a failed retry, focus returns to Try again.</p>",
        "labelling": "<p>Action labels name the destination (\"Browse events\", \"Show all events\"); Try again carries a decorative icon only.</p>",
        "pairs": [
            ("Text", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Title", "--color-fg-default", "--color-bg-canvas", 4.5),
            ("Error icon", "--color-danger-fg", "--color-danger-bg", 3),
            ("Reference", "--color-fg-muted", "--color-bg-canvas", 4.5),
        ],
        "motion": "<p>No motion.</p>",
        "touch": "<p>Small buttons extend to 44 × 44px on coarse pointers and sit 8px apart.</p>",
    },
    "content": """<ul>
<li>First run: what will appear and how ("The team posts runs, workouts and gatherings every week. They'll show up here as soon as they're live.").</li>
<li>No results: repeat the query in curly quotes and suggest a fix ("Check the spelling, or search by email or home church instead.").</li>
<li>Load error: "<em>Thing</em> didn't load", then reassurance ("Your registration, if you have one, is safe.") and the reference.</li>
<li>Never blame the person; never say "No data".</li>
</ul>""",
    "dodont": [
        ("do", FIRST.replace("No events yet", "No events yet") , "Explain what will appear and give the next step."),
        ("dont", empty("No data", "There are no items.", ""), "A dead end with no explanation or action."),
        ("do", err("This event didn't load", "We couldn't reach Christian Fitness. Your registration, if you have one, is safe.", "CF-D4M1", "All events"), "Reassure, retry, and offer a way elsewhere."),
        ("dont", '<div class="error-state"><span class="error-state__icon">' + icon("alert-circle") + '</span><div><h2 class="display empty-state__title">Error 503</h2><p class="empty-state__text">Upstream timeout.</p></div></div>', "Jargon and no way forward."),
    ],
    "tokens": [
        ("Text / title", "--color-fg-muted / --color-fg-default", "color"),
        ("Card surface / ring", "--color-bg-surface / --color-border-default", "color"),
        ("Error icon", "--color-danger-bg / --color-danger-fg", "color"),
        ("Title size", "--font-size-3xl", "value"),
        ("Offsets", "--space-16 / --space-4 / --space-8", "value"),
        ("Card radius / padding", "--radius-xl / --space-6 / --space-8", "value"),
        ("Inline radius", "--radius-lg", "value"),
        ("Max width", "--layout-form-max", "value"),
    ],
    "code": {
        "snippet": '''<div class="empty-state empty-state--tight">
  <h2 class="display empty-state__title">No events yet</h2>
  <p class="empty-state__text">The team posts runs, workouts and gatherings every week.</p>
  <div class="empty-state__actions"><a class="btn btn--primary btn--sm" href="/events">Browse events</a></div>
</div>

<div class="error-state" role="alert">
  <span class="error-state__icon"><svg class="icon" aria-hidden="true">…</svg></span>
  <div>
    <h2 class="display empty-state__title">Events didn't load</h2>
    <p class="empty-state__text">We couldn't reach the server. Try again in a moment.</p>
    <div class="empty-state__actions"><a class="btn btn--primary btn--sm" href="">Try again</a></div>
    <p class="error-state__ref">Reference CF-A2E4</p>
  </div>
</div>''',
        "classes": [
            ("<code>.empty-state</code> <code>.empty-state--tight</code>", "Page-level empty block; tight under filters."),
            ("<code>.empty-state__title</code> <code>__text</code> <code>__actions</code>", "Parts, shared with the error block."),
            ("<code>.empty-card</code> <code>.empty-inline</code>", "Section-level empties."),
            ("<code>.error-state</code> <code>__icon</code> <code>__ref</code>", "Load error block."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/events/empty", "first run"),
            mock("pages/events/no-results", "filter matched nothing"),
            mock("pages/admin-members/no-results", "search"),
            mock("pages/home/empty", "empty card"),
            mock("pages/landing/empty", "empty inline"),
            mock("pages/admin-events/error", "load error with reference"),
            mock("pages/event-detail/error", "error with way back"),
        ],
        "drift": "Card radius was the old <code>3xl</code>, now <code>--radius-xl</code>; inline radius the old <code>2xl</code>, now <code>--radius-lg</code>. Otherwise none.",
    },
}
