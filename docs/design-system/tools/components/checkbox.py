from dslib import ex, kbd, matrix, mock, themes

STATES = [("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'),
          ("Checked", " checked"), ("Disabled", " disabled"), ("Invalid", ' aria-invalid="true"')]

TRUST = '<label class="check check--ui"><input class="check__box" type="checkbox" checked> Trust this browser for 30 days</label>'
GOING = "<label class=\"check\"><input class=\"check__box\" type=\"checkbox\"> Only events I'm going to</label>"


def group(sfx, error=""):
    d = f' aria-describedby="cb-{sfx}-e"' if error else ""
    inv = ' aria-invalid="true"' if error else ""
    err = f'<span class="field__error" id="cb-{sfx}-e">{error}</span>' if error else ""
    opts = [("Event reminders", "A day before anything you've registered for", True),
            ("New messages", "When someone writes in a group or to you", True),
            ("Community news", "A short monthly note from the team", False)]
    items = "".join(f'<label class="choice"><input class="choice__input" type="checkbox"{" checked" if c else ""}{inv}>'
                    f'<span><span class="choice__label">{l}</span><span class="choice__desc">{dsc}</span></span></label>'
                    for l, dsc, c in opts)
    return (f'<fieldset class="field"{d}><legend class="field__legend">Email me about</legend>'
            f'<div class="choice-group">{items}</div>{err}</fieldset>')


SPEC = {
    "lead": "A checkbox turns one thing on or off as part of a form, or lets people pick any number from a list.",
    "meta": ["Status: stable", "Native <code>&lt;input type=\"checkbox\"&gt;</code>"],
    "overview": """<p>Use a checkbox when the choice takes effect on submit ("Trust this browser for 30 days") or when several options can be picked together. Use a <a href="switch.html">switch</a> for a setting that applies immediately, a <a href="radio-group.html">radio group</a> for exactly one choice, and a <a href="chip.html">chip</a> for filters people toggle often.</p>
<ul>
<li><b>Compact</b> (<code>.check</code>): 14px semibold, for filter bars ("Only events I'm going to").</li>
<li><b>Form</b> (<code>.check.check--ui</code>): 15px, wraps, for confirmations inside forms.</li>
<li><b>Group with descriptions</b> (<code>.choice</code> in <code>.choice-group</code>): a fieldset of options, each with a bold label and a muted description.</li>
</ul>""",
    "anatomy": {
        "figure": group("anat"),
        "callouts": [(10, 8), (8, 30), (30, 28), (30, 40)],
        "parts": [
            ("Legend", "Names the group (<code>.field__legend</code>)."),
            ("Box", "Native checkbox, 20px in groups (16px compact), tinted with <code>accent-color</code>."),
            ("Label", "Semibold, part of the wrapping <code>&lt;label&gt;</code>, so it toggles the box too."),
            ("Description (optional)", "Muted 14px under the label."),
        ],
    },
    "variants": ex(GOING, "Compact, in the events filter bar.", True)
    + ex(TRUST, "Form checkbox on admin two-step.", True)
    + ex(group("v"), "Group with descriptions.", True, mod="stack"),
    "sizes": "<p>Compact boxes are 16px (<code>--size-icon-sm</code>), group boxes 20px (<code>--size-icon-lg</code>). Each row is at least 44px tall in groups.</p>",
    "states": {
        "intro": "<p>Pointer and focus forced with <code>data-state</code>; checked, disabled and invalid use real attributes. Indeterminate is set by script (<code>el.indeterminate = true</code>) for a parent of a partly checked list.</p>",
        "matrix": matrix(STATES, [
            ("Compact", "<label class=\"check\"><input class=\"check__box\" type=\"checkbox\"{a}> Going</label>", {"Invalid": None}),
            ("Group option", '<label class="choice"><input class="choice__input" type="checkbox"{a}><span class="choice__label">Event reminders</span></label>'),
        ]),
        "themes": themes(TRUST + GOING),
        "notes": "<ul><li><b>Invalid</b> (a required confirmation left unchecked) adds <code>aria-invalid</code> and a field error: \"Confirm you've checked their credentials before listing them\".</li><li><b>Disabled</b> dims the label to <code>--color-fg-disabled</code>.</li></ul>",
    },
    "responsive": "<ul><li>Compact checks never wrap (filter bars scroll instead).</li><li>Form checks and groups wrap their labels; the box stays top-aligned.</li></ul>",
    "theming": "<p>The native box is tinted by <code>accent-color: var(--color-accent)</code>, which follows the theme. The browser draws the tick, so it adapts automatically.</p>",
    "accessibility": {
        "pattern": "<p>Native checkbox inside a <code>&lt;label&gt;</code>. Groups use <code>&lt;fieldset&gt;</code> and <code>&lt;legend&gt;</code> (<a href=\"https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/\">APG Checkbox</a>).</p>",
        "keys": [
            (kbd("Tab"), "Moves to each checkbox in turn."),
            (kbd("Space"), "Toggles the focused checkbox."),
        ],
        "focus": "<p>The shared 2px <code>--color-focus-ring</code> outline at 2px offset around the box.</p>",
        "labelling": "<p>The wrapping label is the name; descriptions are inside the label so they are read with it. Group errors link from the fieldset with <code>aria-describedby</code>.</p>",
        "pairs": [
            ("Label on surface", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Description", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Checked box on surface", "--color-accent", "--color-bg-surface", 3),
            ("Invalid outline", "--color-danger-fg", "--color-bg-surface", 3),
        ],
        "motion": "<p>None.</p>",
        "touch": "<p>The whole label is the target; group rows are at least 44px (<code>--target-comfortable</code>). Compact checks in the filter bar extend with padding.</p>",
    },
    "content": "<ul><li>Labels state what is true when checked: \"Trust this browser for 30 days\".</li><li>Never negative (\"Don't send me news\").</li><li>Confirmations are first person: \"I've checked their registration, insurance and two references\".</li></ul>",
    "dodont": [
        ("do", TRUST, "Positive, specific label."),
        ("dont", '<label class="check check--ui"><input class="check__box" type="checkbox"> Don\'t remember me</label>', "Negatives make people think twice about what checked means."),
        ("do", group("dd"), "Related options in a fieldset with a legend."),
        ("dont", '<label class="check check--ui"><input class="check__box" type="checkbox"> Dark mode</label>', "An instant setting belongs in a switch."),
    ],
    "tokens": [
        ("Box tint", "--color-accent", "color"),
        ("Label / description", "--color-fg-default / --color-fg-muted", "color"),
        ("Disabled label", "--color-fg-disabled", "color"),
        ("Invalid outline", "--color-danger-fg", "color"),
        ("Box size compact / group", "--size-icon-sm / --size-icon-lg", "value"),
        ("Row height", "--target-comfortable", "value"),
        ("Gap", "--space-2 / --space-2-5 / --space-3", "value"),
    ],
    "code": {
        "snippet": '''<label class="check check--ui">
  <input class="check__box" type="checkbox" name="trust"> Trust this browser for 30 days
</label>

<fieldset class="field">
  <legend class="field__legend">Email me about</legend>
  <div class="choice-group">
    <label class="choice"><input class="choice__input" type="checkbox" checked>
      <span><span class="choice__label">Event reminders</span>
      <span class="choice__desc">A day before anything you've registered for</span></span></label>
  </div>
</fieldset>''',
        "classes": [
            ("<code>.check</code> <code>.check--ui</code> <code>.check__box</code>", "Compact and form checkbox."),
            ("<code>.choice</code> <code>.choice__input</code> <code>.choice__label</code> <code>.choice__desc</code>", "Option row with description."),
            ("<code>.choice-group</code> <code>.choice-group--row</code>", "Stacked or wrapping row of options."),
            ("<code>checked</code> · <code>disabled</code> · <code>aria-invalid=\"true\"</code>", "States."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/events/default", "compact filter check"),
            mock("pages/admin-two-step/default", "trust this browser"),
            mock("dialogs/listing-editor/invalid", "required confirmation, invalid"),
        ],
        "drift": "Grouped checkboxes with descriptions (<code>.choice</code>) were added from the core set; the mocks only had single checks. <code>.check__box</code> has no invalid style, so required confirmations should use <code>.choice__input</code>.",
    },
}
