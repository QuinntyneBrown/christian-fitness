from dslib import ex, kbd, matrix, mock, themes

STATES = [("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'),
          ("Disabled", " disabled"), ("Read-only", " readonly"), ("Invalid", ' aria-invalid="true"')]


def ta(sfx, label, value, hint="", error="", rows=4, opt=False):
    fid = f"ta-{sfx}"
    d = f' aria-describedby="{fid}-m"' if hint or error else ""
    inv = ' aria-invalid="true"' if error else ""
    msg = (f'<span class="field__error" id="{fid}-m">{error}</span>' if error
           else f'<span class="field__hint" id="{fid}-m">{hint}</span>' if hint else "")
    o = ' <span class="field__optional">(optional)</span>' if opt else ""
    return (f'<div class="field"><label class="field__label" for="{fid}">{label}{o}</label>'
            f'<textarea class="textarea" id="{fid}" rows="{rows}"{d}{inv}>{value}</textarea>{msg}</div>')


BIO = "Runner, early riser, still learning to rest on Sundays."

SPEC = {
    "lead": "A textarea takes longer answers in people's own words: an About, a message to a professional, an event description.",
    "meta": ["Status: stable", "Native <code>&lt;textarea&gt;</code>"],
    "overview": """<p>Use a textarea when the answer may run past one line. For one line use a <a href="text-field.html">text field</a>. Like every input it sits in a <a href="form-field.html">form field</a>.</p>
<ul>
<li><b>Plain</b>: event description, credentials.</li>
<li><b>With counter</b>: the hint carries the remaining characters ("160 characters left") and is announced politely.</li>
<li><b>One per line</b>: Goals this year, with the hint "One per line".</li>
</ul>""",
    "anatomy": {
        "figure": ta("anat", "About", BIO, hint="A sentence or two. 106 characters left.", rows=3),
        "callouts": [(8, 10), (40, 45), (30, 88)],
        "parts": [
            ("Label", "14px semibold, tied with <code>for</code>/<code>id</code>."),
            ("Text area", "Same border, radius and padding as the text field; <code>rows</code> sets the starting height; no resize handle."),
            ("Hint or counter", "Linked with <code>aria-describedby</code>; replaced by the error when invalid."),
        ],
    },
    "variants": ex(ta("v1", "Description", "An easy-paced 5 km loop through High Park, then coffee and prayer at Grenadier Café."),
                   "Plain (event editor).", True, mod="stack")
    + ex(ta("v2", "About", BIO, hint="A sentence or two. 106 characters left.", rows=3),
         "With counter in the hint (edit profile).", True, mod="stack")
    + ex(ta("v3", "Message", "", opt=True, rows=3, hint="Danielle replies in Messages, usually within a day."),
         "Optional (request booking).", True, mod="stack"),
    "sizes": "<p>Height is set with <code>rows</code>: 3 for short bios and messages, 4 by default, 6 for event descriptions. Width fills the column.</p>",
    "states": {
        "intro": "<p>States follow the <a href=\"text-field.html\">text field</a>. Hover in documentation shows the native hover only, because <code>.textarea[data-state=\"hover\"]</code> is not defined.</p>",
        "matrix": matrix(STATES, [
            ("Textarea", '<textarea class="textarea" rows="2" aria-label="About"{a}>Runner, early riser.</textarea>'),
        ]),
        "themes": themes(ta("th", "About", BIO, rows=2) + ta("th-e", "Goals this year", "", error="Add at least one goal", rows=2)),
        "notes": "<ul><li><b>Counter</b>: update the hint text as people type; when the limit passes, switch to an error (\"12 characters over\") rather than truncating.</li><li><b>Read-only</b> while a dialog saves.</li></ul>",
    },
    "responsive": "<ul><li>Fills its column; in a two-column <a href=\"form-layout.html\">layout</a> a textarea spans both columns.</li><li>In a phone bottom-sheet dialog, keep <code>rows</code> at 3 so the footer stays visible above the keyboard.</li></ul>",
    "theming": "<p>Shares the field component tokens (<code>--field-border</code>, <code>--field-ring</code>, <code>--field-bg-readonly</code>) with text field and select.</p>",
    "accessibility": {
        "pattern": "<p>Native <code>&lt;textarea&gt;</code> with a visible label. The counter lives in the hint referenced by <code>aria-describedby</code>; announce changes with a separate polite live region updated after typing pauses, not every key.</p>",
        "keys": [
            (kbd("Tab"), "Moves to the next field (Tab is not captured)."),
            (kbd("Enter"), "Inserts a new line; it does not submit."),
        ],
        "focus": "<p>Accent border plus 2px <code>--color-accent-ring</code> halo.</p>",
        "labelling": "<p>Visible label, hint and error via <code>aria-describedby</code>, <code>aria-invalid</code> when invalid. Use <code>maxlength</code> only with a visible counter.</p>",
        "pairs": [
            ("Text on surface", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Border on surface", "--color-border-strong", "--color-bg-surface", 3),
            ("Counter hint", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Error", "--color-danger-fg", "--color-bg-surface", 4.5),
        ],
        "motion": "<p>Border transition over <code>--duration-fast</code>; none under reduced motion.</p>",
        "touch": "<p>Minimum two rows (about 80px); the label also focuses it.</p>",
    },
    "content": "<ul><li>Label the topic: \"About\", \"Message\", \"Description\".</li><li>Hints set expectations: \"A sentence or two\", \"One per line\".</li><li>Counters count down: \"160 characters left\".</li></ul>",
    "dodont": [
        ("do", ta("dd1", "About", BIO, hint="A sentence or two. 106 characters left.", rows=2), "Show the limit while typing."),
        ("dont", '<textarea class="textarea" rows="2" aria-label="About" maxlength="20">Runner, early riser,</textarea>', "Silently cutting text at a hidden limit loses words."),
        ("do", ta("dd2", "Goals this year", "Run a half marathon\nRead through Psalms", hint="One per line", rows=2), "Say how to structure the answer."),
        ("dont", '<input class="input" type="text" aria-label="Goals this year" value="Run a half marathon, read through Psalms, rest on Sundays">', "A one-line input for a list hides most of it."),
    ],
    "tokens": [
        ("Border / focus / invalid", "--color-border-strong / --color-accent / --color-danger-fg", "color"),
        ("Focus ring", "--color-accent-ring", "color"),
        ("Background / read-only", "--color-bg-surface / --color-bg-subtle", "color"),
        ("Text size", "--font-size-md", "value"),
        ("Padding", "--space-3 / --space-4", "value"),
        ("Radius", "--radius-md", "value"),
        ("Disabled opacity", "--opacity-disabled", "value"),
    ],
    "code": {
        "snippet": '''<div class="field">
  <label class="field__label" for="f-bio">About</label>
  <textarea class="textarea" id="f-bio" name="bio" rows="3" aria-describedby="f-bio-hint">…</textarea>
  <span class="field__hint" id="f-bio-hint">A sentence or two. 160 characters left.</span>
</div>''',
        "classes": [
            ("<code>.textarea</code>", "Multi-line input; no resize handle."),
            ("<code>rows</code>", "Starting height."),
            ("<code>aria-invalid=\"true\"</code> · <code>readonly</code> · <code>disabled</code>", "Invalid, read-only, disabled."),
        ],
    },
    "sources": {
        "mocks": [
            mock("dialogs/edit-profile/default", "About with counter, Goals one per line"),
            mock("dialogs/listing-editor/invalid", "credentials, invalid"),
            mock("dialogs/request-booking/default", "optional message"),
        ],
        "drift": "Border raised from <code>--color-border-default</code> to <code>--color-border-strong</code> (WCAG 1.4.11). No mock had a hover or disabled textarea; they were added from the core set. <code>.textarea[data-state=\"hover\"]</code> is not defined in components.css.",
    },
}
