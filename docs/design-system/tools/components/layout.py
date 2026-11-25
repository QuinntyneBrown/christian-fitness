from dslib import ex, kbd, mock, na

BOX = '<div class="card card--pad-sm muted">{t}</div>'

SPEC = {
    "lead": "Layout primitives place everything else: a centred container, a two-column split, grids, stacks and clusters.",
    "meta": ["Status: stable", "CSS only"],
    "overview": """<ul>
<li><b>Container</b> (<code>.container</code>): centres content at <code>--layout-container-max</code> with 16px, then 24px, side margins.</li>
<li><b>Split</b> (<code>.split</code> + a page modifier): one column on phones, main and aside from 1024px (home, event detail, profile, services, dashboard).</li>
<li><b>Console splits</b>: <code>--builder</code> (work, then a 20rem side column: newsletter), <code>--picker</code> (a 17.5rem list of records, then the chosen one: series), <code>--picker-wide</code> (18.75rem, with <code>--picker</code>: listing suggestions), <code>--pick</code> (a 21.25rem form, then the result: Community Pick) and <code>--inbox</code> (a 21.25rem list, then the open item: feedback). See <a href="../patterns/tables-and-lists.html">Tables and lists</a>.</li>
<li><b>Grid</b> (<code>.grid</code>, <code>.grid--cards</code>): the column grid, and an auto-fill card grid.</li>
<li><b>Stack</b> (<code>.stack</code>, <code>--sm</code>, <code>--lg</code>, <code>.stack-5</code>, <code>.aside-stack</code>): vertical rhythm. <code>.aside-stack</code> is 40px between panels; <code>--tight</code> 32px (listing profile), <code>--snug</code> 16px (the newsletter's send column, where the buttons belong to the card above).</li>
<li><b>Cluster</b> (<code>.cluster</code>): a wrapping row with an 8px gap for chips, buttons and meta.</li>
</ul>
<p>See the <a href="../foundations/layout.html">Layout foundation</a> for breakpoints, columns and gutters.</p>""",
    "anatomy": {
        "figure": '<div class="split split--flush split--home">' + BOX.format(t="Main (1.65fr)") + BOX.format(t="Aside (1fr)") + '</div>',
        "callouts": [(30, 50), (80, 50)],
        "parts": [("Main", "The page's primary column; <code>min-width: 0</code> so long content does not overflow."),
                  ("Aside", "Secondary panels; below the main column on phones.")],
    },
    "variants": "<h3>Split</h3>" + ex('<div class="split split--flush split--detail" style="width: 100%;">' + BOX.format(t="Event details") + BOX.format(t="Register panel") + '</div>', "Two columns from 1024px; modifiers set the ratio.", True)
    + "<h3>Console splits</h3>"
    + ex('<div class="split split--flush split--builder" style="width: 100%;">' + BOX.format(t="Issue #49 (1fr)") + BOX.format(t="Send (20rem)") + '</div>', "<code>.split--builder</code>: the work, then a fixed side column.", True)
    + ex('<div class="split split--flush split--picker" style="width: 100%;">' + BOX.format(t="Series (17.5rem)") + BOX.format(t="Chosen series (1fr)") + '</div>', "<code>.split--picker</code>; add <code>--picker-wide</code> for an 18.75rem list with a 24px gap and top margin.", True)
    + ex('<div class="split split--flush split--pick" style="width: 100%;">' + BOX.format(t="Event, note, Create (21.25rem)") + BOX.format(t="Assets (1fr)") + '</div>', "<code>.split--pick</code>: a form, then what it makes.", True)
    + ex('<div class="split split--flush split--inbox" style="width: 100%;">' + BOX.format(t="Feedback list (21.25rem)") + BOX.format(t="Open note (1fr)") + '</div>', "<code>.split--inbox</code>: list, then detail, 24px apart.", True)
    + "<h3>Aside stacks</h3>" + ex('<div class="aside-stack aside-stack--snug" style="width: 100%;">' + BOX.format(t="Send card") + BOX.format(t="Preview · Send me a test") + '</div>'
                                  '<div class="aside-stack aside-stack--tight" style="width: 100%;">' + BOX.format(t="Hosting") + BOX.format(t="Follow") + '</div>',
                                  "<code>--snug</code> (16px) and <code>--tight</code> (32px); the default is 40px.", True)
    + "<h3>Card grid</h3>" + ex('<div class="grid grid--cards" style="width: 100%;">' + "".join(BOX.format(t=f"Card {i}") for i in range(1, 5)) + '</div>', "Auto-fill columns at least 18rem wide.", True)
    + "<h3>Stack and cluster</h3>" + ex('<div class="stack stack--sm">' + BOX.format(t="One") + BOX.format(t="Two") + '</div>'
                                        '<div class="cluster"><span class="tag">Running</span><span class="tag">Strength</span><span class="tag">Nutrition</span></div>',
                                        "Stack gaps: sm 8px, default 16px, lg 32px. Cluster wraps with an 8px gap.", True, mod="stack"),
    "sizes": "<p>Stack gaps come from <code>--space-2</code>, <code>--space-4</code> and <code>--space-8</code>; split gap <code>--space-10</code>; grid gutter <code>--layout-gutter</code>.</p>",
    "states": na("Layout primitives are not interactive and have no states."),
    "responsive": """<ul>
<li>Mobile first: every split is one column until <code>--layout-breakpoint-lg</code> (1024px).</li>
<li>Console splits keep their gap at every width (32px for builder, picker and pick; 24px and a 24px top margin for picker-wide and inbox); their fixed first or last column only appears from 1024px. Below it the list comes first, so on a phone the picker, form or inbox list sits above the record.</li>
<li>Container margins grow from 16px to 24px at 640px.</li>
<li><code>.grid--cards</code> adds columns as space allows, with no breakpoints.</li>
<li>Children of splits and stacks set <code>min-width: 0</code> so tables and long words scroll or wrap inside them.</li>
</ul>""",
    "theming": "<p>Primitives carry no colour. A stack's gap can be set per use with <code>--stack-gap</code>.</p>",
    "accessibility": {
        "pattern": "<p>Layout never reorders content visually away from DOM order: the aside follows the main column on phones and sits to its right on desktop, matching reading and tab order.</p>",
        "keys": [(kbd("Tab"), "Follows DOM order, which matches the visual order.")],
        "focus": "<p>Not applicable; children own focus.</p>",
        "labelling": "<p>Use landmarks (<code>&lt;main&gt;</code>, <code>&lt;aside aria-label&gt;</code>) on the elements, not the primitives.</p>",
        "pairs": [],
        "motion": "<p>None.</p>",
        "touch": "<p>Cluster and stack gaps keep adjacent targets at least 8px apart.</p>",
    },
    "content": na("Layout primitives hold no copy of their own."),
    "dodont": [
        ("do", '<div class="cluster"><a class="chip" href="#">Run</a><a class="chip" href="#">Workout</a></div>', "A cluster lets chips wrap with even gaps."),
        ("dont", '<p><a class="chip" href="#">Run</a>&nbsp;&nbsp;<a class="chip" href="#">Workout</a></p>', "Spaces for spacing; gaps vary and do not wrap cleanly."),
        ("do", '<div class="split split--flush split--profile">' + BOX.format(t="About, goals") + BOX.format(t="Going to, groups") + '</div>', "Main content first in the DOM (profile)."),
        ("dont", '<div class="split split--flush split--profile">' + BOX.format(t="Going to, groups") + BOX.format(t="About, goals") + '</div>', "The aside first: on phones it pushes the main content down."),
    ],
    "tokens": [
        ("Container max", "--layout-container-max", "value"),
        ("Columns / gutter", "--layout-columns / --layout-gutter", "value"),
        ("Split gap", "--space-10", "value"),
        ("Console split gaps", "--space-8 / --space-6", "value"),
        ("Aside stack gaps", "--space-10 / --space-8 / --space-4", "value"),
        ("Stack gaps", "--space-2 / --space-4 / --space-8", "value"),
        ("Cluster gap", "--space-2", "value"),
        ("Container margins", "--space-4 / --space-6", "value"),
    ],
    "code": {
        "snippet": '''<main class="container page">
  <div class="split split--detail">
    <div>…main…</div>
    <aside class="aside-stack" aria-label="Register">…</aside>
  </div>
</main>''',
        "classes": [
            ("<code>.container</code> <code>.page</code> <code>.page--detail</code>", "Centred width; page block padding."),
            ("<code>.split</code> + <code>--home</code> <code>--detail</code> <code>--profile</code> <code>--services</code> <code>--dashboard</code> <code>--flush</code>", "Two-column page splits; flush removes the top margin."),
            ("<code>.split--builder</code> <code>--picker</code> <code>--picker-wide</code> <code>--pick</code> <code>--inbox</code>", "Console splits: side column, record picker, pick form, inbox."),
            ("<code>.aside-stack--tight</code> <code>--snug</code>", "Closer aside stacks (32px, 16px)."),
            ("<code>.grid</code> <code>.grid--cards</code> <code>.grid__span-full</code>", "Column grid, auto card grid, full-width child."),
            ("<code>.stack</code> <code>--sm</code> <code>--lg</code> <code>.stack-5</code> <code>.aside-stack</code>", "Vertical rhythm."),
            ("<code>.cluster</code>", "Wrapping row."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/home/default", "container, split--home"),
            mock("pages/event-detail/default", "split--detail, aside-stack"),
            mock("pages/profile/default", "split--profile"),
            mock("pages/admin-dashboard/default", "split--dashboard"),
            mock("pages/admin-newsletter/default", "split--builder, aside-stack--snug"),
            mock("pages/admin-series/default", "split--picker"),
            mock("pages/admin-listings/default", "split--picker split--picker-wide"),
            mock("pages/admin-community-pick/default", "split--pick"),
            mock("pages/admin-feedback/default", "split--inbox"),
            mock("pages/listing-profile/default", "aside-stack--tight"),
        ],
        "drift": "<code>.stack</code>, <code>.grid</code> and <code>.grid--cards</code> are core primitives with no mock usage; mocks space with one-off margins (<code>.mt-3</code>, <code>.mt-section</code>). The console splits repeat their gap inside and outside the 1024px query (<code>.split--picker-wide</code> and <code>--inbox</code> twice); the declarations inside the query are redundant and can go.",
    },
}
