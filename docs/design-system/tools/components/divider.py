from dslib import ex, kbd, matrix, mock, themes

SPEC = {
    "lead": "Dividers are hairlines that separate content without adding weight.",
    "meta": ["Status: stable", "<code>&lt;hr&gt;</code> or decorative <code>&lt;span&gt;</code>"],
    "overview": """<ul>
<li><b>Horizontal</b> (<code>.divider</code>): an <code>&lt;hr&gt;</code> between sections.</li>
<li><b>Labelled</b> (<code>.divider--label</code>): a rule with centred text, such as \"or\" between sign-in methods.</li>
<li><b>Vertical</b> (<code>.divider--vertical</code>, <code>.chip-bar__divider</code>): separates groups in a row, like the event filters from the \"going\" checkbox.</li>
</ul>
<p>Prefer spacing first; most mock sections are separated by <code>.block-section</code> or <code>.divided-section</code>, which put the rule on the section. Lists separate items with <code>.list-ruled</code>, not dividers.</p>""",
    "anatomy": {
        "figure": '<p class="muted">Above</p><hr class="divider"><p class="muted">Below</p>',
        "callouts": [(50, 50)],
        "parts": [("Rule", "1px (<code>--border-width-hairline</code>) <code>--color-border-default</code>, 24px block margin.")],
    },
    "variants": ex('<p class="muted">Section one</p><hr class="divider"><p class="muted">Section two</p>', "Horizontal.", True, mod="stack")
    + ex('<div class="divider--label" role="separator" aria-label="or">or</div>', "Labelled.", True, mod="stack")
    + ex('<div class="cluster"><a class="chip" href="#" aria-current="page">All</a><a class="chip" href="#">Run</a><span class="divider--vertical" aria-hidden="true"></span><label class="check"><input class="check__box" type="checkbox"> Only events I&#x27;m going to</label></div>',
         "Vertical, decorative between groups.", True),
    "sizes": "<p>One weight. Vertical dividers are <code>--size-divider-h</code> tall at minimum.</p>",
    "states": {
        "intro": "<p>Dividers have no interactive states. The only variation is visibility: the filter bar's vertical divider hides on phones.</p>",
        "matrix": matrix([("Default", ""), ("Hover", None), ("Focus", None), ("Active", None), ("Disabled", None)], [
            ("Horizontal", '<hr class="divider">'),
            ("Vertical", '<div class="cluster"><span class="muted">A</span><span class="divider--vertical" aria-hidden="true"></span><span class="muted">B</span></div>'),
        ]),
        "themes": themes('<hr class="divider"><div class="divider--label" role="separator" aria-label="or">or</div>', "stack"),
        "notes": "<ul><li>Hidden: <code>.chip-bar__divider</code> is <code>display: none</code> below 640px, where the bar wraps.</li></ul>",
    },
    "responsive": "<p>Horizontal dividers span their container. Vertical dividers in wrapping rows hide below <code>--layout-breakpoint-sm</code>, since a rule at the start of a line means nothing.</p>",
    "theming": "<p>One token: <code>--color-border-default</code>, themed for dark mode.</p>",
    "accessibility": {
        "pattern": "<p>A thematic break is an <code>&lt;hr&gt;</code> (implicit <code>separator</code> role). Purely visual dividers inside a row are <code>aria-hidden</code> spans. A labelled divider has <code>role=\"separator\"</code> and its text.</p>",
        "keys": [(kbd("Tab"), "Not focusable.")],
        "focus": "<p>None.</p>",
        "labelling": "<p>Usually none. A labelled divider's text (\"or\") is read.</p>",
        "pairs": [("Rule (non-text)", "--color-border-default", "--color-bg-canvas", 1), ("Label", "--color-fg-muted", "--color-bg-canvas", 4.5)],
        "motion": "<p>None.</p>",
        "touch": "<p>Not a target.</p>",
    },
    "content": "<p>Labelled dividers use one lowercase word: \"or\".</p>",
    "dodont": [
        ("do", '<span class="chip-bar__divider" aria-hidden="true"></span>', "Decorative row dividers are hidden from assistive technology (events filters)."),
        ("dont", '<hr class="divider"><hr class="divider">', "Stacked rules; use spacing."),
        ("do", '<ul class="list-ruled"><li class="muted">Half marathon in the fall</li><li class="muted">Strength twice a week</li></ul>', "Lists draw their own rules."),
        ("dont", '<p class="muted">Half marathon in the fall</p><hr class="divider"><p class="muted">Strength twice a week</p>', "Dividers between list items lose the list semantics."),
    ],
    "tokens": [
        ("Rule", "--color-border-default", "color"),
        ("Label", "--color-fg-muted", "color"),
        ("Weight", "--border-width-hairline", "value"),
        ("Margin", "--space-6", "value"),
        ("Vertical height", "--size-divider-h", "value"),
    ],
    "code": {
        "snippet": '''<hr class="divider">
<div class="divider--label" role="separator" aria-label="or">or</div>
<span class="divider--vertical" aria-hidden="true"></span>''',
        "classes": [
            ("<code>.divider</code>", "Horizontal rule."),
            ("<code>.divider--label</code>", "Rule with centred text."),
            ("<code>.divider--vertical</code> <code>.chip-bar__divider</code>", "Vertical rules; the chip-bar one hides on phones."),
            ("<code>.block-section</code> <code>.divided-section</code>", "Section with a top rule; prefer these between page sections."),
        ],
    },
    "sources": {
        "mocks": [mock("pages/events/default", "chip-bar divider"), mock("pages/event-detail/default", "block sections with top rules")],
        "drift": "none",
    },
}
