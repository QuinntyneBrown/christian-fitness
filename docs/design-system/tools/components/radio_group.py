from dslib import ex, kbd, matrix, mock, themes

STATES = [("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'),
          ("Checked", " checked"), ("Disabled", " disabled"), ("Invalid", ' aria-invalid="true"')]

FMT = [("In person", "Meet at a studio or park in the GTA"), ("Virtual", "A video call from wherever you are"),
       ("Either", "Danielle will suggest what works")]


def rg(sfx, card=False, row=False, error="", checked=0, desc=True):
    d = f' aria-describedby="rg-{sfx}-e"' if error else ""
    inv = ' aria-invalid="true"' if error else ""
    err = f'<span class="field__error" id="rg-{sfx}-e">{error}</span>' if error else ""
    cc = " choice-card" if card else ""
    items = "".join(
        f'<label class="choice{cc}"><input class="choice__input" type="radio" name="rg-{sfx}"'
        f'{" checked" if i == checked else ""}{inv}><span><span class="choice__label">{l}</span>'
        + (f'<span class="choice__desc">{t}</span>' if desc else "") + '</span></label>'
        for i, (l, t) in enumerate(FMT))
    gcls = "choice-group choice-group--row" if row else "choice-group"
    return (f'<fieldset class="field"{d}><legend class="field__legend">Where would you like to meet?</legend>'
            f'<div class="{gcls}">{items}</div>{err}</fieldset>')


SPEC = {
    "lead": "A radio group asks for exactly one choice from a short list, with every option in view.",
    "meta": ["Status: new", "Native <code>&lt;input type=\"radio\"&gt;</code>"],
    "overview": """<p>Use radios for two to five options people should compare before choosing. For longer lists use a <a href="select.html">select</a>; for any number of choices use <a href="checkbox.html">checkboxes</a>; for switching a view use <a href="tabs.html">tabs</a>.</p>
<ul>
<li><b>List</b>: stacked options with optional descriptions.</li>
<li><b>Row</b> (<code>.choice-group--row</code>): short labels side by side, wrapping.</li>
<li><b>Card</b> (<code>.choice-card</code>): bordered options; the chosen card fills with the accent tint.</li>
</ul>""",
    "anatomy": {
        "figure": rg("anat"),
        "callouts": [(10, 8), (8, 30), (30, 28), (30, 40)],
        "parts": [
            ("Legend", "The question, as <code>.field__legend</code>."),
            ("Radio", "Native 20px radio tinted with <code>accent-color</code>."),
            ("Label", "Semibold; the whole label selects."),
            ("Description (optional)", "Muted 14px."),
        ],
    },
    "variants": ex(rg("v1"), "List.", True, mod="stack")
    + ex(rg("v2", row=True, desc=False), "Row.", True, mod="stack")
    + ex(rg("v3", card=True), "Card.", True, mod="stack"),
    "sizes": "<p>One size: 20px radio, 15px label, rows at least 44px tall.</p>",
    "states": {
        "intro": "<p>Pointer and focus forced with <code>data-state</code>; checked, disabled and invalid are real attributes.</p>",
        "matrix": matrix(STATES, [
            ("List option", '<label class="choice"><input class="choice__input" type="radio" name="m-list"{a}><span class="choice__label">Virtual</span></label>'),
            ("Card option", '<label class="choice choice-card"><input class="choice__input" type="radio" name="m-card"{a}><span class="choice__label">Virtual</span></label>'),
        ]),
        "themes": themes(rg("th", card=True, desc=False)),
        "notes": "<ul><li><b>No preselection</b> when there is no safe default; then leaving it empty shows the error \"Choose where you'd like to meet\".</li><li><b>Checked card</b> uses <code>:has(:checked)</code>: tint plus a 2px accent border, so the state is not colour alone.</li></ul>",
    },
    "responsive": "<ul><li>Row groups wrap; under 360px they read as a list.</li><li>Cards stack full width on phones and may sit in a <code>.field-grid</code> from 640px.</li></ul>",
    "theming": "<p>Radios are tinted by <code>accent-color</code>. Card borders use <code>--color-border-strong</code>, checked cards <code>--color-accent-subtle</code> and <code>--color-accent</code>, all of which switch with the theme.</p>",
    "accessibility": {
        "pattern": "<p>Native radios sharing a <code>name</code>, inside <code>&lt;fieldset&gt;</code> with <code>&lt;legend&gt;</code> (<a href=\"https://www.w3.org/WAI/ARIA/apg/patterns/radio/\">APG Radio group</a>).</p>",
        "keys": [
            (kbd("Tab"), "Moves into the group (to the checked radio, or the first) and out again."),
            (kbd("↓") + " / " + kbd("→"), "Selects the next option."),
            (kbd("↑") + " / " + kbd("←"), "Selects the previous option."),
            (kbd("Space"), "Selects the focused option if none is selected."),
        ],
        "focus": "<p>2px <code>--color-focus-ring</code> outline at 2px offset around the radio.</p>",
        "labelling": "<p>The legend names the question, each label an answer. The group error is linked from the fieldset and every radio gets <code>aria-invalid</code>.</p>",
        "pairs": [
            ("Label on surface", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Description", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Label on checked card", "--color-fg-default", "--color-accent-subtle", 4.5),
            ("Card border", "--color-border-strong", "--color-bg-surface", 3),
            ("Checked card border", "--color-accent", "--color-bg-surface", 3),
        ],
        "motion": "<p>None.</p>",
        "touch": "<p>The whole label or card is the target, at least 44px tall, 8px apart in rows.</p>",
    },
    "content": "<ul><li>The legend is a question: \"Where would you like to meet?\".</li><li>Options are parallel and short; descriptions add the consequence.</li><li>Order options logically, not alphabetically.</li></ul>",
    "dodont": [
        ("do", rg("dd1", card=True), "Descriptions help people choose."),
        ("dont", rg("dd2", row=True, desc=False).replace("Where would you like to meet?", "Options"), "A vague legend leaves the question unclear."),
        ("do", rg("dd3", desc=False), "Three options, all visible."),
        ("dont", '<fieldset class="field"><legend class="field__legend">Event category</legend><div class="choice-group choice-group--row">'
         + "".join(f'<label class="choice"><input class="choice__input" type="radio" name="dd4"><span class="choice__label">{c}</span></label>'
                   for c in ["Run", "Workout", "Basketball", "Mobility", "Workshop", "Retreat", "Walk", "Cycle"])
         + '</div></fieldset>', "Eight options: use a select."),
    ],
    "tokens": [
        ("Radio tint", "--color-accent", "color"),
        ("Label / description", "--color-fg-default / --color-fg-muted", "color"),
        ("Card border / checked", "--color-border-strong / --color-accent", "color"),
        ("Checked card background", "--color-accent-subtle", "color"),
        ("Invalid outline", "--color-danger-fg", "color"),
        ("Radio size", "--size-icon-lg", "value"),
        ("Row height", "--target-comfortable", "value"),
        ("Card radius / padding", "--radius-lg / --space-3 / --space-4", "value"),
        ("Row gap", "--space-6", "value"),
    ],
    "code": {
        "snippet": '''<fieldset class="field">
  <legend class="field__legend">Where would you like to meet?</legend>
  <div class="choice-group">
    <label class="choice choice-card">
      <input class="choice__input" type="radio" name="where" value="in-person">
      <span><span class="choice__label">In person</span>
      <span class="choice__desc">Meet at a studio or park in the GTA</span></span>
    </label>
  </div>
</fieldset>''',
        "classes": [
            ("<code>.choice-group</code> <code>.choice-group--row</code>", "Stacked or row."),
            ("<code>.choice</code> <code>.choice-card</code>", "Option; bordered card style."),
            ("<code>.choice__input</code> <code>.choice__label</code> <code>.choice__desc</code>", "Parts."),
            ("<code>checked</code> · <code>disabled</code> · <code>aria-invalid=\"true\"</code>", "States."),
        ],
    },
    "sources": {
        "mocks": [],
        "drift": "No mock uses radios yet (request booking asks \"Where\" in free text). The group, row and card styles were added from the core component set.",
    },
}
