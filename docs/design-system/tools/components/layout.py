from dslib import ex, kbd, mock, na

BOX = '<div class="card card--pad-sm muted">{t}</div>'

SPEC = {
    "lead": "Layout primitives place everything else: a centred container, a two-column split, grids, stacks and clusters.",
    "meta": ["Status: stable", "CSS only"],
    "overview": """<ul>
<li><b>Container</b> (<code>.container</code>): centres content at <code>--layout-container-max</code> with 16px, then 24px, side margins.</li>
<li><b>Split</b> (<code>.split</code> + a page modifier): one column on phones, main and aside from 1024px (home, event detail, profile, services, dashboard).</li>
<li><b>Grid</b> (<code>.grid</code>, <code>.grid--cards</code>): the column grid, and an auto-fill card grid.</li>
<li><b>Stack</b> (<code>.stack</code>, <code>--sm</code>, <code>--lg</code>, <code>.stack-5</code>, <code>.aside-stack</code>): vertical rhythm.</li>
<li><b>Cluster</b> (<code>.cluster</code>): a wrapping row with an 8px gap for chips, buttons and meta.</li>
</ul>
<p>See the <a href="../foundations/layout.html">Layout foundation</a> for breakpoints, columns and gutters.</p>""",
    "anatomy": {
        "figure": '<div class="split split--flush split--home">' + BOX.format(t="Main (1.65fr)") + BOX.format(t="Aside (1fr)") + '</div>',
        "callouts": [(30, 50), (80, 50)],
        "parts": [("Main", "The page's primary column; <code>min-width: 0</code> so long content does not overflow."),
                  ("Aside", "Secondary panels; below the main column on phones.")],
    },
    "variants": "<h3>Split</h3>" + ex('<div class="split split--flush split--detail">' + BOX.format(t="Event details") + BOX.format(t="Register panel") + '</div>', "Two columns from 1024px; modifiers set the ratio.", True)
    + "<h3>Card grid</h3>" + ex('<div class="grid grid--cards">' + "".join(BOX.format(t=f"Card {i}") for i in range(1, 5)) + '</div>', "Auto-fill columns at least 18rem wide.", True)
    + "<h3>Stack and cluster</h3>" + ex('<div class="stack stack--sm">' + BOX.format(t="One") + BOX.format(t="Two") + '</div>'
                                        '<div class="cluster"><span class="tag">Running</span><span class="tag">Strength</span><span class="tag">Nutrition</span></div>',
                                        "Stack gaps: sm 8px, default 16px, lg 32px. Cluster wraps with an 8px gap.", True, mod="stack"),
    "sizes": "<p>Stack gaps come from <code>--space-2</code>, <code>--space-4</code> and <code>--space-8</code>; split gap <code>--space-10</code>; grid gutter <code>--layout-gutter</code>.</p>",
    "states": na("Layout primitives are not interactive and have no states."),
    "responsive": """<ul>
<li>Mobile first: every split is one column until <code>--layout-breakpoint-lg</code> (1024px).</li>
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
        ],
        "drift": "<code>.stack</code>, <code>.grid</code> and <code>.grid--cards</code> are core primitives with no mock usage; mocks space with one-off margins (<code>.mt-3</code>, <code>.mt-section</code>).",
    },
}
