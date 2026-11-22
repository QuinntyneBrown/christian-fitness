from dslib import ex, kbd, matrix, mock, themes

CATS = ["Run", "Workout", "Basketball", "Mobility", "Workshop", "Retreat"]
STATES = [("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'),
          ("Disabled", " disabled"), ("Invalid", ' aria-invalid="true"')]


def sel(sfx, label, options, selected, extra="", hint="", error=""):
    fid = f"sel-{sfx}"
    opts = "".join(f'<option{" selected" if o == selected else ""}>{o}</option>' for o in options)
    d = f' aria-describedby="{fid}-m"' if hint or error else ""
    inv = ' aria-invalid="true"' if error else ""
    msg = (f'<span class="field__error" id="{fid}-m">{error}</span>' if error
           else f'<span class="field__hint" id="{fid}-m">{hint}</span>' if hint else "")
    return (f'<div class="field"><label class="field__label" for="{fid}">{label}</label>'
            f'<select class="select" id="{fid}"{d}{inv}{extra}>{opts}</select>{msg}</div>')


KINDS = ["One-on-one session", "Small-group session", "Free 15-minute intro call"]

SPEC = {
    "lead": "A select picks one option from a list too long to show as radios: an event category, a session type, a role.",
    "meta": ["Status: stable", "Native <code>&lt;select&gt;</code>"],
    "overview": """<p>Use a select for one choice from five or more known options. For two to four options that people should compare, use a <a href="radio-group.html">radio group</a>, which shows every option at once. For actions, use a <a href="menu.html">menu</a>. The select is always native, so phones show their own picker.</p>
<ul><li><b>Default</b>: one option preselected when there is a sensible default.</li>
<li><b>With prompt</b>: a first option "Choose a category" when there is no default, which fails validation if left.</li></ul>""",
    "anatomy": {
        "figure": sel("anat", "Category", CATS, "Retreat"),
        "callouts": [(8, 15), (40, 62), (92, 62)],
        "parts": [
            ("Label", "14px semibold, tied with <code>for</code>/<code>id</code>."),
            ("Field", "Same border, radius and padding as the text field; shows the selected option."),
            ("Indicator", "The platform's native arrow; not restyled."),
        ],
    },
    "variants": ex(sel("v1", "Category", CATS, "Retreat"), "Category in the event editor.", True, mod="stack")
    + ex(sel("v2", "What would you like?", KINDS, "Free 15-minute intro call"), "Session type in request booking.", True, mod="stack")
    + ex(sel("v3", "Category", ["Choose a category"] + CATS, "Choose a category", error="Choose a category so members can filter for it"),
         "With prompt, invalid.", True, mod="stack"),
    "sizes": "<p>One size, matching the text field: 16px text, about 50px tall.</p>",
    "states": {
        "intro": "<p>The select shares the text-field states except read-only, which native selects do not support (use disabled plus a hidden input, or show the value as text).</p>",
        "matrix": matrix(STATES, [
            ("Select", '<select class="select" aria-label="Category"{a}><option>Run</option><option selected>Retreat</option></select>'),
        ]),
        "themes": themes(sel("th", "Category", CATS, "Run")),
        "notes": "<ul><li><b>Hover</b> in documentation is native only: <code>.select[data-state=\"hover\"]</code> is not defined.</li><li><b>Open</b> is drawn by the platform and cannot be styled.</li></ul>",
    },
    "responsive": "<p>Fills its column. On phones the native wheel or sheet appears; nothing to adapt.</p>",
    "theming": "<p>Shares the field tokens. <code>color-scheme</code> on the theme root makes the native dropdown follow light and dark.</p>",
    "accessibility": {
        "pattern": "<p>Native <code>&lt;select&gt;</code> with a visible label. Never a custom listbox when a native select will do.</p>",
        "keys": [
            (kbd("↑") + " / " + kbd("↓"), "Changes the option (opens the list on some platforms)."),
            (kbd("Space") + ", " + kbd("Alt", "↓"), "Opens the list."),
            ("Typing", "Jumps to the option starting with those letters."),
            (kbd("Esc"), "Closes the list without changing."),
        ],
        "focus": "<p>Accent border plus 2px <code>--color-accent-ring</code>.</p>",
        "labelling": "<p>Visible label; error via <code>aria-describedby</code> and <code>aria-invalid</code>. Do not change the page on change; let people confirm with the form's button.</p>",
        "pairs": [
            ("Value on surface", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Border on surface", "--color-border-strong", "--color-bg-surface", 3),
            ("Error", "--color-danger-fg", "--color-bg-surface", 4.5),
        ],
        "motion": "<p>Border transition only.</p>",
        "touch": "<p>About 50px tall; the platform picker handles the rest.</p>",
    },
    "content": "<ul><li>Options in sentence case, in a meaningful order (by frequency or the order people think of them), not alphabetical by default.</li><li>The prompt option starts with a verb: \"Choose a category\".</li></ul>",
    "dodont": [
        ("do", sel("dd1", "What would you like?", KINDS, "Free 15-minute intro call"), "A sensible default saves a step."),
        ("dont", sel("dd2", "Format", ["In person", "Virtual"], "In person"), "Two options belong in a radio group, visible at once."),
        ("do", sel("dd3", "Category", CATS, "Run"), "Native select, so phones show their own picker."),
        ("dont", '<div class="select" role="button" tabindex="0" aria-label="Category">Run</div>', "A div faking a select loses keyboard and screen-reader support."),
    ],
    "tokens": [
        ("Border / focus / invalid", "--color-border-strong / --color-accent / --color-danger-fg", "color"),
        ("Focus ring", "--color-accent-ring", "color"),
        ("Background / disabled", "--color-bg-surface / --color-bg-subtle", "color"),
        ("Text size", "--font-size-md", "value"),
        ("Padding", "--space-3 / --space-4", "value"),
        ("Radius", "--radius-md", "value"),
        ("Disabled opacity", "--opacity-disabled", "value"),
    ],
    "code": {
        "snippet": '''<div class="field">
  <label class="field__label" for="f-category">Category</label>
  <select class="select" id="f-category" name="category">
    <option>Run</option><option>Workout</option><option selected>Retreat</option>
  </select>
</div>''',
        "classes": [
            ("<code>.select</code>", "Native select styled like the text field."),
            ("<code>aria-invalid=\"true\"</code> · <code>disabled</code>", "Invalid, disabled."),
        ],
    },
    "sources": {
        "mocks": [
            mock("dialogs/event-editor/default", "Category"),
            mock("dialogs/request-booking/default", "What would you like?"),
            mock("dialogs/listing-editor/default", "Role"),
        ],
        "drift": "Border raised to <code>--color-border-strong</code> (WCAG 1.4.11). No mock had an invalid select; the state was added. <code>.select[data-state=\"hover\"]</code> is not defined in components.css.",
    },
}
