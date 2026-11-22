from dslib import ex, icon, kbd, matrix, mock, themes

FACTS = ('<dl class="facts">'
         f'<div class="facts__item">{icon("clock", "facts__icon")}<div><dt>Sat, Apr 18</dt><dd>6:45 AM · about 90 minutes</dd></div></div>'
         f'<div class="facts__item">{icon("map-pin", "facts__icon")}<div><dt>Martin Goodman Trail, Marilyn Bell Park</dt><dd>Waterfront, Toronto</dd></div></div>'
         '</dl>')
SPECS = ('<dl class="spec-list">'
         '<div><dt>Credentials</dt><dd>Registered Dietitian, College of Dietitians of Ontario</dd></div>'
         '<div><dt>Rate</dt><dd>$95 first consult</dd></div></dl>')
STATS = ('<dl class="stat-grid"><div class="stat"><dt>Registrations, April</dt><dd>221</dd></div>'
         '<div class="stat"><dt>Live listings</dt><dd>5</dd></div></dl>')

SPEC = {
    "lead": "Description lists pair a name with its value: when and where an event is, a professional's credentials and rate.",
    "meta": ["Status: stable", "Native <code>&lt;dl&gt;</code>"],
    "overview": """<p>Use a description list for the facts of one thing. Use a <a href="table.html">table</a> to compare many things, and a <a href="list.html">list</a> for items that open.</p>
<ul>
<li><b>Facts</b> (<code>.facts</code>): icon, a bold term and a muted detail. Event detail's date and place.</li>
<li><b>Spec list</b> (<code>.spec-list</code>): muted term on the left, bold value on the right, hairlines between. A professional's credentials and rate.</li>
<li><b>Stat grid</b> (<code>.stat-grid</code>): label and big number tiles; documented on <a href="stat.html">Stat</a>.</li>
</ul>""",
    "anatomy": {
        "figure": SPECS,
        "callouts": [(10, 25), (80, 25), (50, 52)],
        "parts": [
            ("Term", "<code>&lt;dt&gt;</code>, muted 15px; names the value."),
            ("Value", "<code>&lt;dd&gt;</code>, semibold, right-aligned; wraps under itself on narrow widths."),
            ("Rule", "Hairline <code>--color-border-default</code> between pairs; each pair is a <code>&lt;div&gt;</code> inside the <code>&lt;dl&gt;</code>."),
        ],
    },
    "variants": "<h3>Facts</h3>" + ex(FACTS, "The icon is decorative; the term is the fact and the detail qualifies it.", True)
    + "<h3>Spec list</h3>" + ex(SPECS, "Key–value pairs in a side panel.", True)
    + "<h3>Stat grid</h3>" + ex(STATS, "The same <code>&lt;dl&gt;</code> semantics as tiles.", True),
    "sizes": "<p>One size each. Facts stack with a 16px gap (<code>--space-4</code>) and 24px icons; spec rows have 12px block padding (<code>--space-3</code>).</p>",
    "states": {
        "intro": "<p>Description lists are static text: no hover, focus, active or disabled. A value can contain a link, which brings its own states. The only list states are loading and a missing value.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ""), ("Focus", ""), ("Active", ""), ("Disabled", ""), ("Missing value", "")], [
            ("Spec list", '<dl class="spec-list"><div><dt>Rate</dt><dd>$95 first consult</dd></div></dl>',
             {"Hover": None, "Focus": None, "Active": None, "Disabled": None}),
        ]).replace('<td><dl class="spec-list"><div><dt>Rate</dt><dd>$95 first consult</dd></div></dl></td></tr>',
                   '<td><dl class="spec-list"><div><dt>Home church</dt><dd class="muted">Not shared</dd></div></dl></td></tr>')
        + "<h3>Loading</h3>" + ex('<div class="skeleton-stack" aria-busy="true" aria-label="Loading details"><span class="skeleton skeleton--text"></span><span class="skeleton skeleton--text-sm"></span></div>',
                                  "Skeleton lines stand in until the facts arrive.", True),
        "themes": themes(FACTS + SPECS),
        "notes": "<ul><li>A missing optional value (home church, faith details) reads \"Not shared\" in muted text, or the pair is left out; it is never required.</li></ul>",
    },
    "responsive": "<ul><li>Spec values wrap and stay right-aligned; on very narrow widths the value wraps under its own column, never under the term.</li><li>Facts are a single column at every width.</li></ul>",
    "theming": "<p>Terms read <code>--color-fg-muted</code> (spec) or <code>--color-fg-default</code> (facts), values the opposite; icons <code>--color-fg-accent</code>; rules <code>--color-border-default</code>. No component tokens; dark mode comes from the semantic tokens.</p>",
    "accessibility": {
        "pattern": "<p>Native <code>&lt;dl&gt;</code> with <code>&lt;dt&gt;</code>/<code>&lt;dd&gt;</code>, grouped in <code>&lt;div&gt;</code>s (valid HTML). Screen readers announce the list and the number of terms.</p>",
        "keys": [(kbd("Tab"), "Reaches only links inside values; the list itself is not focusable.")],
        "focus": "<p>None on the list. Links inside values use the shared ring.</p>",
        "labelling": "<p>Terms label their values. Fact icons are <code>aria-hidden</code>; the term already says \"Sat, Apr 18\".</p>",
        "pairs": [
            ("Spec term", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Value", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Fact icon (non-text)", "--color-fg-accent", "--color-bg-canvas", 3),
        ],
        "motion": "<p>None.</p>",
        "touch": "<p>Not interactive; links inside values follow the link target rules.</p>",
    },
    "content": "<ul><li>Terms are short nouns: \"Credentials\", \"Rate\". Values are specific: \"$95 first consult\".</li><li>Dates as \"Sat, Apr 18\"; times as \"6:45 AM · about 90 minutes\".</li><li>Optional personal details show \"Not shared\", never \"N/A\".</li></ul>",
    "dodont": [
        ("do", SPECS, "Name–value pairs as a description list (service detail)."),
        ("dont", '<p class="muted">Credentials: Registered Dietitian. Rate: $95 first consult.</p>', "A run-on sentence of facts; hard to scan and the pairs are lost to screen readers."),
        ("do", '<dl class="spec-list"><div><dt>Home church</dt><dd class="muted">Not shared</dd></div></dl>', "Optional faith details say \"Not shared\" kindly."),
        ("dont", '<dl class="spec-list"><div><dt>Home church</dt><dd>N/A</dd></div></dl>', "\"N/A\" reads as a judgement and as jargon."),
    ],
    "tokens": [
        ("Term / value", "--color-fg-muted / --color-fg-default", "color"),
        ("Fact icon", "--color-fg-accent", "color"),
        ("Rule", "--color-border-default", "color"),
        ("Fact gap / spec padding", "--space-4 / --space-3", "value"),
        ("Icon size", "--size-icon-lg", "value"),
    ],
    "code": {
        "snippet": '''<dl class="spec-list">
  <div><dt>Credentials</dt><dd>Registered Dietitian, College of Dietitians of Ontario</dd></div>
  <div><dt>Rate</dt><dd>$95 first consult</dd></div>
</dl>''',
        "classes": [
            ("<code>.facts</code> <code>.facts__item</code> <code>.facts__icon</code>", "Icon facts."),
            ("<code>.spec-list</code>", "Ruled key–value pairs."),
            ("<code>.stat-grid</code> <code>.stat</code>", "Number tiles (see Stat)."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/event-detail/default", "facts"),
            mock("pages/services/selected", "spec list"),
            mock("pages/admin-dashboard/default", "stat grid"),
        ],
        "drift": "none",
    },
}
