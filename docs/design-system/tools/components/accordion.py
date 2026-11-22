from dslib import ex, icon, kbd, matrix, mock, themes

CHEV = icon("plus")


def item(q, a, open_=False, attr=""):
    o = " open" if open_ else ""
    return (f'<details class="accordion__item"{o}><summary class="accordion__summary"{attr}>{q}{CHEV}</summary>'
            f'<div class="accordion__body"><p>{a}</p></div></details>')


ACC = ('<div class="accordion">'
       + item("Do I need to be a Christian to join?", "No. Everyone is welcome at every event; devotions are short and optional.", True)
       + item("What should I bring to a run?", "Water, a layer you can tie around your waist and good shoes. We go at an easy pace.")
       + item("Is my home church shared with anyone?", "Only if you choose to show it on your profile. It is always optional.")
       + '</div>')

SPEC = {
    "lead": "Accordions tuck away answers people only sometimes need, so a page stays short and calm.",
    "meta": ["Status: stable", "Native <code>&lt;details&gt;</code>", "Core component, no mock"],
    "overview": """<p>Use an accordion for independent sections people scan by heading, like questions about events or privacy. Don't hide the main content of a page, a single paragraph, or anything someone must read before acting (event safety notes stay visible). For switching views use <a href="tabs.html">tabs</a>.</p>
<p>No current screen uses an accordion; it is part of the core set for help and FAQ content.</p>""",
    "anatomy": {
        "figure": '<div class="accordion">' + item("What should I bring to a run?", "Water, a layer and good shoes.", True) + '</div>',
        "callouts": [(10, 22), (94, 22), (10, 70)],
        "parts": [
            ("Summary", "<code>&lt;summary&gt;</code>, semibold, at least <code>--target-comfortable</code> tall; the whole row toggles."),
            ("Indicator", "16px icon at the end that rotates 180° when open; decorative."),
            ("Body", "Muted text with 16px bottom padding; hairline rules between items."),
        ],
    },
    "variants": ex(ACC, "A group of independent items; several may be open at once.", True),
    "sizes": "<p>One size. Summary min-height <code>--target-comfortable</code>, 12px block padding.</p>",
    "states": {
        "intro": "<p>Open and closed come from the native <code>open</code> attribute. Pointer and focus are forced on the summary with <code>data-state</code>. There is no disabled item: content that cannot be read is not listed.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'), ("Active", ' data-state="active"'), ("Disabled", None), ("Open", "OPEN")], [
            ("Item", '<div class="accordion">' + item("What should I bring?", "Water and a layer.", attr="{a}") + '</div>'),
        ]).replace('<summary class="accordion__summary"OPEN>', '<summary class="accordion__summary">').replace(
            '<details class="accordion__item"><summary class="accordion__summary">What should I bring?' + CHEV + '</summary><div class="accordion__body"><p>Water and a layer.</p></div></details></div></td></tr>',
            '<details class="accordion__item" open><summary class="accordion__summary">What should I bring?' + CHEV + '</summary><div class="accordion__body"><p>Water and a layer.</p></div></details></div></td></tr>'),
        "themes": themes(ACC),
        "notes": "<ul><li><b>Open</b> rotates the indicator and shows the body; the native element announces expanded or collapsed.</li><li>Items are independent; opening one does not close others.</li></ul>",
    },
    "responsive": "<p>Full width at every size; summaries wrap onto more lines rather than truncate.</p>",
    "theming": "<p>Rules read <code>--color-border-default</code>, the summary <code>--color-fg-default</code> and the body <code>--color-fg-muted</code>; all themed.</p>",
    "accessibility": {
        "pattern": "<p>Native <code>&lt;details&gt;</code>/<code>&lt;summary&gt;</code>: keyboard, expanded state and find-in-page work without script. If an item needs a heading level, put the heading inside the summary.</p>",
        "keys": [(kbd("Tab"), "Moves between summaries."), (kbd("Enter") + ", " + kbd("Space"), "Opens or closes the focused item.")],
        "focus": "<p>The shared 2px ring around the summary row.</p>",
        "labelling": "<p>The summary text is the name; the indicator is <code>aria-hidden</code>.</p>",
        "pairs": [
            ("Summary", "--color-fg-default", "--color-bg-canvas", 4.5),
            ("Body", "--color-fg-muted", "--color-bg-canvas", 4.5),
        ],
        "motion": "<p>The indicator rotates over <code>--duration-fast</code>; the body appears without animation. Reduced motion removes the rotation.</p>",
        "touch": "<p>The full-width summary is at least <code>--target-comfortable</code> tall.</p>",
    },
    "content": "<ul><li>Summaries are the question or topic in sentence case: \"What should I bring to a run?\"</li><li>Answers start with the answer: \"No.\", \"Water, a layer…\".</li></ul>",
    "dodont": [
        ("do", '<div class="accordion">' + item("Is my home church shared with anyone?", "Only if you choose to show it.") + '</div>', "Optional detail people may look for."),
        ("dont", '<div class="accordion">' + item("About this event", "An easy-paced run along the lake to watch the sun come up.") + '</div>', "Hiding an event's About text, which everyone needs (event detail keeps it open)."),
        ("do", '<div class="accordion">' + item("What should I bring to a run?", "Water and a layer.") + '</div>', "A specific question as the summary."),
        ("dont", '<div class="accordion">' + item("More", "Water and a layer.") + '</div>', "A vague summary; nobody knows what is inside."),
    ],
    "tokens": [
        ("Rule", "--color-border-default", "color"),
        ("Summary / body", "--color-fg-default / --color-fg-muted", "color"),
        ("Summary min-height", "--target-comfortable", "value"),
        ("Padding", "--space-3 / --space-4", "value"),
        ("Rotation", "--duration-fast / --ease-standard", "value"),
    ],
    "code": {
        "snippet": '''<div class="accordion">
  <details class="accordion__item">
    <summary class="accordion__summary">What should I bring to a run?<svg class="icon" aria-hidden="true">…</svg></summary>
    <div class="accordion__body"><p>Water, a layer and good shoes.</p></div>
  </details>
</div>''',
        "classes": [
            ("<code>.accordion</code>", "Group with top and bottom rules."),
            ("<code>.accordion__item</code> <code>__summary</code> <code>__body</code>", "Item parts."),
            ("<code>open</code>", "Native open state."),
        ],
    },
    "sources": {"mocks": [], "drift": "No mock uses an accordion; it is a core component added for help and FAQ content. The icon set has no chevron, so the plus icon stands in for the indicator."},
}
