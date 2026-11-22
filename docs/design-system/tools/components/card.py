from dslib import avatar, ex, image, kbd, matrix, mock, themes

PAD = ('<div class="card card--pad-sm"><div class="register__head"><p class="register__price">Free</p>'
       '<p class="register__spots">58 of 200 spots left</p></div>'
       '<button class="btn btn--primary btn--lg btn--block mt-3" type="button">Register</button></div>')
LIST = ('<ul class="card card--list" aria-label="{l}">'
        f'<li><a class="service-row" href="#top">{image("trainer", "avatar avatar--xl")}'
        '<div class="mini-row__body"><p class="mini-row__name">Danielle Okafor</p><p class="mini-row__text">Personal trainer · In person · East York</p></div>'
        '<span class="service-row__price">From $70 / session</span></a></li>'
        f'<li><a class="service-row" href="#top">{avatar("ML", size="xl")}'
        '<div class="mini-row__body"><p class="mini-row__name">Marcus Lee, RD</p><p class="mini-row__text">Registered dietitian · Virtual · Ontario-wide</p></div>'
        '<span class="service-row__price">From $95 / visit</span></a></li></ul>')
CLIP = (f'<div class="card card--clip">{image("stretch", "event-card__image", "People stretching on mats in a sunlit studio")}'
        '<div class="card--pad"><p class="mini-row__name">Sunday Mobility</p><p class="muted">Recharge after the week, gently.</p></div></div>')

SPEC = {
    "lead": "A card is a quiet surface that groups related content: a register panel, a list of professionals, a profile section.",
    "meta": ["Status: stable", "Container", "Not interactive itself"],
    "overview": """<p>Cards are white (surface) panels with a hairline inset border and the large <code>--radius-xl</code> corners, sitting on the warm canvas. They hold content; they do not act. When a whole card should be clickable, use the <a href="event-card.html">event card</a> or a row link inside a list card.</p>
<ul>
<li><b>Padded</b> (<code>.card--pad</code>, <code>.card--pad-sm</code>): a panel of related content, like Register on event detail.</li>
<li><b>List</b> (<code>.card--list</code>): a <code>&lt;ul&gt;</code> of rows divided by hairlines, like the Services list.</li>
<li><b>Clip</b> (<code>.card--clip</code>): edge-to-edge media with rounded corners.</li>
</ul>""",
    "anatomy": {
        "figure": PAD,
        "callouts": [(8, 15), (8, 50), (50, 85), (98, 4)],
        "parts": [("Heading or eyebrow", "Optional first line naming the panel."), ("Content", "Text, facts, rows."),
                  ("Actions", "Optional buttons at the bottom."), ("Surface", "<code>--color-bg-surface</code>, hairline inset border, <code>--radius-xl</code>.")],
    },
    "variants": "<h3>Padded</h3>" + ex(PAD, "Register panel on event detail.", True, mod="canvas")
    + "<h3>List</h3>" + ex(LIST.replace("{l}", "Professionals, example"), "Services list: rows divided by hairlines.", True, mod="canvas stack")
    + "<h3>Clip</h3>" + ex(CLIP, "Media clipped to the corners.", True, mod="canvas"),
    "sizes": "<p>Padding: <code>.card--pad</code> is 24px, 32px from 640px; <code>.card--pad-sm</code> is 24px, 28px from 640px. Width comes from the layout.</p>",
    "states": {
        "intro": "<p>The card has no states of its own. Rows inside a list card hover and show <code>aria-current</code> for the selected item.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'), ("Selected", ' aria-current="true"')], [
            ("Row in list card", '<ul class="card card--list"><li><a class="service-row" href="#top"{a}>' + avatar("ML", size="xl")
             + '<div class="mini-row__body"><p class="mini-row__name">Marcus Lee, RD</p></div></a></li></ul>'),
        ]),
        "themes": themes(PAD, "canvas"),
        "notes": "<ul><li>Loading cards keep their shape with skeleton lines (<code>.skeleton-stack</code>).</li><li>A card never disables; its controls do.</li></ul>",
    },
    "responsive": "<ul><li>Cards fill their column; at 1024px detail asides become sticky (<code>.sticky-aside</code>).</li><li>Padding grows from 640px.</li></ul>",
    "theming": "<p>Reads <code>--color-bg-surface</code> and <code>--color-border-default</code>. In dark theme the surface lifts above the canvas through tokens, and the border carries the edge, not a shadow.</p>",
    "accessibility": {
        "pattern": "<p>Use the element that fits: <code>&lt;article&gt;</code> with <code>aria-labelledby</code> for a self-contained panel, <code>&lt;ul&gt;</code> for a list card, <code>&lt;div&gt;</code> otherwise. The card adds no role.</p>",
        "keys": [(kbd("Tab"), "Moves to controls inside; the card itself is never focusable.")],
        "focus": "<p>Controls inside show the shared ring; rows in a list card show it inset.</p>",
        "labelling": "<p>A list card gets <code>aria-label</code> (\"Professionals\"). A panel with a heading uses <code>aria-labelledby</code>.</p>",
        "pairs": [("Text on card", "--color-fg-default", "--color-bg-surface", 4.5), ("Muted text on card", "--color-fg-muted", "--color-bg-surface", 4.5),
                  ("Card edge on canvas", "--color-border-default", "--color-bg-canvas", 1.2)],
        "motion": "<p>None on the card.</p>",
        "touch": "<p>Rows in list cards are at least 64px tall.</p>",
    },
    "content": "<ul><li>Lead with the fact people came for (price, spots left), then the action.</li><li>Do not title a card \"Info\" or \"Details\".</li></ul>",
    "dodont": [
        ("do", PAD, "One panel, one job, one primary.", ),
        ("dont", '<div class="card card--pad"><div class="card card--pad"><p class="muted">58 of 200 spots left</p></div></div>', "Cards inside cards double the edges."),
        ("do", LIST.replace("{l}", "Professionals, do example"), "Rows share one card with dividers."),
        ("dont", '<div class="card card--pad-sm"><p class="mini-row__name">Danielle Okafor</p></div><div class="card card--pad-sm"><p class="mini-row__name">Marcus Lee, RD</p></div>', "A stack of one-line cards; use a list card."),
    ],
    "tokens": [("Surface", "--color-bg-surface", "color"), ("Edge / row divider", "--color-border-default", "color"),
               ("Radius", "--radius-xl", "value"), ("Padding", "--space-6 / --space-7 / --space-8", "value"), ("Edge width", "--border-width-hairline", "value")],
    "code": {"snippet": '''<div class="card card--pad-sm">…</div>

<ul class="card card--list" aria-label="Professionals">
  <li><a class="service-row" href="/services/danielle-okafor" aria-current="true">…</a></li>
</ul>''',
             "classes": [("<code>.card</code>", "Surface, hairline edge, large radius."), ("<code>.card--pad</code> <code>.card--pad-sm</code>", "Padding."),
                         ("<code>.card--list</code>", "Rows with hairline dividers."), ("<code>.card--clip</code>", "Clip media to the corners.")]},
    "sources": {"mocks": [mock("pages/event-detail/default", "register panel"), mock("pages/services/default", "list card and detail article"),
                          mock("pages/services/loading", "skeleton card")],
                "drift": "Cards used the old 3xl radius (24px); it is now <code>--radius-xl</code>. Empty and note cards share the same surface rules."},
}
