from dslib import cf_ui, ex, kbd, matrix, mock, themes

F = cf_ui.field

SPEC = {
    "lead": "The form field is the wrapper every input wears: a label above, the control, then a hint or an error below.",
    "meta": ["Status: stable", "<code>.field</code> wrapper"],
    "overview": """<p>Every <a href="text-field.html">text field</a>, <a href="textarea.html">textarea</a> and <a href="select.html">select</a> sits inside <code>.field</code>. Groups of <a href="checkbox.html">checkboxes</a> and <a href="radio-group.html">radios</a> use a <code>&lt;fieldset class="field"&gt;</code> with a legend. The wrapper fixes the order and spacing, carries the field component tokens and ties the parts together for assistive technology.</p>
<ul>
<li><b>Required</b> is the default and is not marked.</li>
<li><b>Optional</b> adds a muted "(optional)" to the label.</li>
<li><b>With hint</b>: guidance before people type.</li>
<li><b>With error</b>: the error replaces the hint and the control gets <code>aria-invalid</code>.</li>
<li><b>Label row</b> (<code>.field-row</code>): label with a trailing link, such as "Forgot password?".</li>
</ul>""",
    "anatomy": {
        "figure": F("Home church", "church-anat", "Grace Fellowship, Scarborough", optional=True, hint="Only shown on your profile"),
        "callouts": [(10, 12), (32, 12), (40, 50), (25, 86)],
        "parts": [
            ("Label", "<code>.field__label</code>, 14px semibold, <code>for</code> the control's id."),
            ("Optional marker", "<code>.field__optional</code>, regular weight, muted."),
            ("Control", "Any input; 6px (<code>--space-1-5</code>) below the label."),
            ("Hint or error", "<code>.field__hint</code> or <code>.field__error</code>, 6px below, referenced by <code>aria-describedby</code>."),
        ],
    },
    "variants": ex(F("Full name", "name-v", "Maya Okafor", autocomplete="name"), "Required (unmarked).", True, mod="stack")
    + ex(F("Home church", "church-v", optional=True, hint="Optional — helps you find people nearby"), "Optional with hint.", True, mod="stack")
    + ex(F("Name", "name-e", error="Enter your name so people know who you are"), "With error.", True, mod="stack")
    + ex('<div class="field"><div class="field-row"><label class="field__label" for="f-pw-row">Password</label>'
         '<a class="text-link" href="#">Forgot password?</a></div>'
         '<input class="input" id="f-pw-row" type="password" autocomplete="current-password"></div>',
         "Label row with a trailing link (sign in).", True, mod="stack"),
    "sizes": "<p>One size. The wrapper adds no width; the control fills the column.</p>",
    "states": {
        "intro": "<p>The field's state is its control's state plus the message beneath it.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'),
                          ("Disabled", " disabled"), ("Read-only", " readonly"), ("Invalid", ' aria-invalid="true"')], [
            ("Field", '<div class="field"><span class="field__label">Email</span><input class="input" type="email" aria-label="Email" value="maya@example.ca"{a}></div>'),
        ]),
        "themes": themes(F("Email", "email-th", "maya@example.ca", hint="We'll send reminders here") + F("Name", "name-th", error="Enter your name")),
        "notes": "<ul><li>Show errors after submit or when leaving a field that was changed, never while people are still typing.</li><li>Clear the error as soon as the value becomes valid.</li></ul>",
    },
    "responsive": "<p>Label always above the control at every width; side-by-side labels break at 320px and with zoom. See <a href=\"form-layout.html\">form layout</a> for columns.</p>",
    "theming": "<p><code>.field</code> declares <code>--field-border</code>, <code>--field-border-focus</code>, <code>--field-border-invalid</code>, <code>--field-ring</code>, <code>--field-bg</code> and <code>--field-bg-readonly</code>. Override them on a wrapper to re-skin every control inside.</p>",
    "accessibility": {
        "pattern": "<p><code>&lt;label for&gt;</code> plus <code>aria-describedby</code> for hint or error plus <code>aria-invalid</code>. Groups use <code>&lt;fieldset&gt;</code> and <code>&lt;legend class=\"field__legend\"&gt;</code>.</p>",
        "keys": [(kbd("Tab"), "Moves to the control; the label is not a stop.")],
        "focus": "<p>Focus sits on the control; see each control's page.</p>",
        "labelling": "<p>Label, hint and error ids are derived from the control id (<code>f-name</code>, <code>f-name-hint</code>, <code>f-name-error</code>) so they never collide. Errors are text, never just a red border (WCAG 3.3.1).</p>",
        "pairs": [
            ("Label", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Hint / optional", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Error", "--color-danger-fg", "--color-bg-surface", 4.5),
        ],
        "motion": "<p>None; messages appear instantly.</p>",
        "touch": "<p>Tapping the label focuses the control, enlarging the target.</p>",
    },
    "content": "<ul><li>Labels: short nouns in sentence case, no colon.</li><li>Mark optional, not required.</li><li>Hints: the rule or why we ask (\"Only shown on your profile\").</li><li>Errors: what to do, warm and specific (\"Pick a date after today, April 15\").</li></ul>",
    "dodont": [
        ("do", F("Home church", "church-dd", optional=True, hint="Only shown on your profile"), "Faith details are optional and say who sees them."),
        ("dont", '<div class="field"><label class="field__label" for="f-church-dd2">Home church *</label><input class="input" id="f-church-dd2" type="text"></div>', "Sensitive details are never required; asterisks are noise."),
        ("do", F("Date", "date-dd", type_="date", error="Pick a date after today, April 15"), "The error explains the fix."),
        ("dont", '<div class="field"><label class="field__label" for="f-date-dd2">Date</label><input class="input" id="f-date-dd2" type="date" aria-invalid="true"></div>', "A red border with no message tells people nothing."),
    ],
    "tokens": [
        ("Label / hint / error", "--color-fg-default / --color-fg-muted / --color-danger-fg", "color"),
        ("Field border / focus / invalid", "--color-border-strong / --color-accent / --color-danger-fg", "color"),
        ("Ring", "--color-accent-ring", "color"),
        ("Background / read-only", "--color-bg-surface / --color-bg-subtle", "color"),
        ("Label size / weight", "--font-size-sm / --font-weight-semibold", "value"),
        ("Gap label to control / control to message", "--space-1-5", "value"),
    ],
    "code": {
        "snippet": '''<div class="field">
  <label class="field__label" for="f-church">Home church <span class="field__optional">(optional)</span></label>
  <input class="input" id="f-church" name="church" type="text" aria-describedby="f-church-hint">
  <span class="field__hint" id="f-church-hint">Only shown on your profile</span>
</div>''',
        "classes": [
            ("<code>.field</code>", "Wrapper; declares field tokens."),
            ("<code>.field__label</code> <code>.field__optional</code> <code>.field__legend</code>", "Label, optional marker, group legend."),
            ("<code>.field__hint</code> <code>.field__error</code>", "Message under the control."),
            ("<code>.field-row</code>", "Label with a trailing link."),
        ],
    },
    "sources": {
        "mocks": [
            mock("dialogs/edit-profile/default", "optional home church with hint"),
            mock("dialogs/event-editor/invalid", "date error"),
            mock("pages/join/invalid", "name and e-mail errors"),
            mock("pages/sign-in/default", "password with trailing link"),
        ],
        "drift": "Control borders raised from <code>--color-border-default</code> to <code>--color-border-strong</code> (WCAG 1.4.11); field tokens were introduced on <code>.field</code>.",
    },
}
