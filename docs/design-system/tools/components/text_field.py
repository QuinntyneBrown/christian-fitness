from dslib import ex, icon, kbd, matrix, mock, themes

SEARCH = icon("search", "search__icon")

STATES = [("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'),
          ("Disabled", " disabled"), ("Read-only", " readonly"), ("Invalid", ' aria-invalid="true"')]


def fld(sfx, label, value="", type_="text", hint="", error="", extra="", cls="input", opt=False):
    fid = f"tf-{sfx}"
    d = f' aria-describedby="{fid}-m"' if hint or error else ""
    inv = ' aria-invalid="true"' if error else ""
    msg = (f'<span class="field__error" id="{fid}-m">{error}</span>' if error
           else f'<span class="field__hint" id="{fid}-m">{hint}</span>' if hint else "")
    o = ' <span class="field__optional">(optional)</span>' if opt else ""
    v = f' value="{value}"' if value else ""
    return (f'<div class="field"><label class="field__label" for="{fid}">{label}{o}</label>'
            f'<input class="{cls}" id="{fid}" type="{type_}"{v}{d}{inv}{extra}>{msg}</div>')


SPEC = {
    "lead": "Text fields take one line of typing: a name, an e-mail, a password, a search, a six-digit code.",
    "meta": ["Status: stable", "Native <code>&lt;input&gt;</code>"],
    "overview": """<p>Use a text field for short, free-form answers. Use a <a href="textarea.html">textarea</a> for more than one line, a <a href="select.html">select</a> or <a href="radio-group.html">radio group</a> when the answers are known. A text field always sits inside a <a href="form-field.html">form field</a> with a visible label.</p>
<ul>
<li><b>Text, e-mail, number, date, time</b> use <code>.input</code> with the right <code>type</code>, <code>autocomplete</code> and <code>inputmode</code>.</li>
<li><b>Password</b> uses <code>type="password"</code> with <code>autocomplete="current-password"</code> or <code>new-password</code>.</li>
<li><b>Pill</b> (<code>.input--pill</code>) rounds the field to match the pill button beside it in a one-line sign-up: the newsletter box and Subscribe. <code>.input--lg</code> raises it to the 52px large-button height.</li>
<li><b>Small</b> (<code>.input--sm</code>) is the compact field in admin side panels: the story editor's schedule date and time.</li>
<li><b>Input group</b> (<code>.input-group</code>) puts fixed text before the typed part, as the story editor's link <code>/stories/</code> + slug.</li>
<li><b>One-time code</b> (<code>.input--code</code>) is large, centred and tabular. No current screen uses it: staff sign-in moved to Google Workspace and the two-step screen was removed.</li>
<li><b>Search</b> (<code>.search</code>) is a pill with a leading icon for filtering lists, labelled by <code>aria-label</code> or a hidden label.</li>
</ul>""",
    "anatomy": {
        "figure": fld("anat", "Email", "maya@example.ca", "email", hint="We'll send event reminders here"),
        "callouts": [(8, 12), (40, 48), (30, 85)],
        "parts": [
            ("Label", "14px semibold, above the input, tied with <code>for</code>/<code>id</code>."),
            ("Input", "16px text, 1px <code>--color-border-strong</code> border, <code>--radius-md</code>, padding <code>--space-3</code> / <code>--space-4</code>."),
            ("Hint or error", "14px, linked with <code>aria-describedby</code>; the error replaces the hint."),
        ],
    },
    "variants": ex(fld("v-name", "Full name", "Maya Okafor", extra=' autocomplete="name"')
                   + fld("v-email", "Email", "maya@example.ca", "email", extra=' autocomplete="email"')
                   + fld("v-pw", "Password", "", "password", hint="At least 8 characters", extra=' autocomplete="new-password"'),
                   "Text, e-mail and password from Join.", True, mod="stack")
    + ex(fld("v-code", "Six-digit code", "481 902", cls="input input--code", extra=' autocomplete="one-time-code" inputmode="numeric"'),
         "One-time code: kept in the stylesheet, used by no screen since the admin two-step screen was removed.", True, mod="stack")
    + "<h3>Pill and large</h3>"
    + ex('<form class="newsletter-box__form" action="#"><label class="visually-hidden" for="tf-pill">Email address</label>'
         '<input class="input input--pill" id="tf-pill" name="email" type="email" autocomplete="email" placeholder="you@example.com">'
         '<button class="btn btn--primary" type="submit">Subscribe free</button></form>',
         "Pill beside a pill button, in the front page's newsletter box (hidden label, example placeholder).", True, mod="stack")
    + ex('<div class="subscribe__form"><label class="field__label" for="tf-lg">Email address</label><div class="subscribe__row">'
         '<input class="input input--pill input--lg" id="tf-lg" name="email" type="email" autocomplete="email" value="grace.thompson@gmail.com" placeholder="you@example.com">'
         '<button class="btn btn--primary btn--lg" type="submit">Subscribe free</button></div></div>',
         "Pill, large (52px) beside a large button on Subscribe; the row stacks below 640px.", True, mod="stack")
    + "<h3>Small and input group</h3>"
    + ex('<div class="field-grid field-grid--2"><div><label class="visually-hidden" for="tf-date">Date</label><input class="input input--sm" id="tf-date" type="date" value="2026-04-18"></div>'
         '<div><label class="visually-hidden" for="tf-time">Time</label><input class="input input--sm" id="tf-time" type="time" value="06:00"></div></div>',
         "Small date and time under the story editor's \"Schedule\" choice, labelled by hidden labels.", True, mod="stack")
    + ex('<div class="field"><label class="field__label" for="tf-slug">Link</label>'
         '<div class="input-group"><span class="input-group__prefix" id="tf-slug-prefix">/stories/</span>'
         '<input class="input-group__input" id="tf-slug" name="slug" value="fasting-and-training" aria-describedby="tf-slug-prefix"></div></div>',
         "Input group: the fixed <code>/stories/</code> prefix and the editable slug share one border.", True, mod="stack")
    + ex(f'<label class="search">{SEARCH}<span class="visually-hidden">Search members</span><input class="search__input" type="search" placeholder="Search by name or email"></label>',
         "Search from admin members; the label is visually hidden.", True),
    "sizes": """<ul>
<li><b>Default</b>: 16px text (so iOS does not zoom) and about 50px tall, above the 44px target.</li>
<li><b>Large</b> (<code>.input--lg</code>): at least 52px (<code>--control-height-lg</code>), to line up with <code>.btn--lg</code> on Subscribe.</li>
<li><b>Small</b> (<code>.input--sm</code>): 14px text with 8px × 12px padding, about 39px tall. Admin side panels only; it is under the 44px target and below 16px text, so it is not for member screens on phones.</li>
<li><b>Input group</b>: 15px (<code>--font-size-ui</code>) text, about 44px tall.</li>
<li>The code field uses 24px text. The search pill is 44px tall at 15px.</li>
</ul>""",
    "states": {
        "intro": "<p>States are forced here with <code>data-state</code>; live inputs use <code>:hover</code> and <code>:focus</code>, plus the real <code>disabled</code>, <code>readonly</code> and <code>aria-invalid</code> attributes.</p>",
        "matrix": matrix(STATES, [
            ("Text", '<input class="input" type="text" aria-label="Full name" value="Maya Okafor"{a}>'),
            ("Pill", '<input class="input input--pill" type="email" aria-label="Email address" value="grace.thompson@gmail.com"{a}>'),
            ("Small", '<input class="input input--sm" type="time" aria-label="Time" value="06:00"{a}>'),
            ("Code", '<input class="input input--code" type="text" aria-label="Six-digit code" value="481 902"{a}>'),
            ("Search", '<input class="search__input" type="search" aria-label="Search members"{a}>',
             {"Hover": None, "Read-only": None, "Invalid": None}),
        ]),
        "themes": themes(fld("th", "Email", "maya@example.ca", "email") + fld("th-e", "Name", "", error="Enter your name so people know who you are")),
        "notes": """<ul>
<li><b>Invalid</b>: <code>aria-invalid="true"</code> turns the border danger and the hint becomes an error message; the message, not the colour, carries the meaning.</li>
<li><b>Read-only</b> is used while a form submits (sign in, join): the values stay readable and selectable but cannot change.</li>
<li><b>Disabled</b> is rare: prefer read-only, which stays in the tab order.</li>
<li><b>Input group</b> has only default and focus (<code>:focus-within</code> moves the accent border and halo to the group). It has no hover, invalid, read-only or disabled style yet, so a slug error must be carried by the field error text.</li>
</ul>""",
    },
    "responsive": "<ul><li>Inputs fill their column at every width.</li><li>In two-column <a href=\"form-layout.html\">form layouts</a> pairs stack below 640px.</li><li>The search pill is full width on phones and a fixed <code>--layout-search-width</code> from 640px.</li><li>The pill sign-up row stacks the field above its button below 640px (<code>.subscribe__row</code>, <code>.newsletter-box__form</code>) and sits side by side from 640px on Subscribe; the field takes the remaining width.</li><li>The input group's slug shrinks (<code>min-width: 0</code>) and the prefix keeps one line.</li></ul>",
    "theming": "<p>Field colours come from component tokens on <code>.field</code>: <code>--field-border</code>, <code>--field-border-focus</code>, <code>--field-border-invalid</code>, <code>--field-ring</code>, <code>--field-bg</code>, <code>--field-bg-readonly</code>. In the dark theme the border lifts so it still meets 3:1 against the dark surface.</p>",
    "accessibility": {
        "pattern": "<p>Native <code>&lt;input&gt;</code> with a visible <code>&lt;label for&gt;</code>. Set <code>type</code>, <code>autocomplete</code> (WCAG 1.3.5) and <code>inputmode</code>. Placeholder is never the label.</p>",
        "keys": [
            (kbd("Tab") + " / " + kbd("Shift", "Tab"), "Moves between fields."),
            (kbd("Enter"), "Submits the enclosing form."),
            (kbd("Esc"), "In a search field, clears the query."),
        ],
        "focus": "<p>Focus turns the border accent and adds a 2px <code>--color-accent-ring</code> halo; the ring is visible against surface and canvas in both themes.</p>",
        "labelling": "<p>Visible label via <code>for</code>/<code>id</code>; hint and error via <code>aria-describedby</code>; invalid via <code>aria-invalid</code>. Search, the newsletter pill and the small date and time fields use a visually hidden label. In an input group the prefix is linked to the input with <code>aria-describedby</code>, so \"/stories/\" is read after the label. Optional fields say \"(optional)\" in the label; required ones are the norm.</p>",
        "pairs": [
            ("Value on surface", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Border on surface", "--color-border-strong", "--color-bg-surface", 3),
            ("Hint on surface", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Error on surface", "--color-danger-fg", "--color-bg-surface", 4.5),
            ("Placeholder on surface", "--color-fg-subtle", "--color-bg-surface", 4.5),
        ],
        "motion": "<p>Border and ring transition over <code>--duration-fast</code>; reduced motion makes it instant.</p>",
        "touch": "<p>About 50px tall; the label is also a tap target for the input.</p>",
    },
    "content": """<ul>
<li>Labels are short nouns: "Email", "Full name", "Password".</li>
<li>Hints give the rule before people break it: "At least 8 characters".</li>
<li>Errors say how to fix it: "Enter your name so people know who you are", not "Invalid input".</li>
<li>Placeholders only show an example format, and only in search.</li>
</ul>""",
    "dodont": [
        ("do", fld("dd1", "Password", type_="password", hint="At least 8 characters"), "Put the rule in a hint before submit."),
        ("dont", '<input class="input" type="password" aria-label="Password" placeholder="Password (8+ characters)">', "A placeholder label disappears as people type."),
        ("do", fld("dd2", "Name", error="Enter your name so people know who you are"), "The error says what to do."),
        ("dont", fld("dd3", "Name", error="Field required"), "Generic errors leave people guessing."),
    ],
    "tokens": [
        ("Border / hover", "--color-border-strong / --color-fg-muted", "color"),
        ("Border focus / ring", "--color-accent / --color-accent-ring", "color"),
        ("Border invalid", "--color-danger-fg", "color"),
        ("Background / read-only", "--color-bg-surface / --color-bg-subtle", "color"),
        ("Placeholder", "--color-fg-subtle", "color"),
        ("Text size / code", "--font-size-md / --font-size-2xl", "value"),
        ("Padding", "--space-3 / --space-4", "value"),
        ("Radius / pill and search radius", "--radius-md / --radius-full", "value"),
        ("Pill padding inline", "--space-5", "value"),
        ("Large min-height", "--control-height-lg", "value"),
        ("Small padding / text", "--space-2 / --space-3 / --font-size-sm", "value"),
        ("Input group border / focus / halo", "--color-border-strong / --color-accent / --color-accent-ring", "color"),
        ("Input group prefix", "--color-fg-muted", "color"),
        ("Input group padding", "--space-3 / --space-2-5 / --space-1", "value"),
        ("Ring width", "--border-width-thick", "value"),
        ("Disabled opacity", "--opacity-disabled", "value"),
        ("Code letter spacing", "--letter-spacing-code", "value"),
    ],
    "code": {
        "snippet": '''<div class="field">
  <label class="field__label" for="f-email">Email</label>
  <input class="input" id="f-email" name="email" type="email" autocomplete="email"
         aria-describedby="f-email-error" aria-invalid="true">
  <span class="field__error" id="f-email-error">Enter an email like name@example.ca</span>
</div>''',
        "classes": [
            ("<code>.input</code>", "Single-line text input."),
            ("<code>.input--pill</code> <code>.input--lg</code>", "Pill-shaped field; 52px large size to sit beside <code>.btn--lg</code>."),
            ("<code>.input--sm</code>", "Compact 14px field for admin side panels."),
            ("<code>.input-group</code> <code>.input-group__prefix</code> <code>.input-group__input</code>", "Fixed prefix and an input inside one border; focus shows on the group."),
            ("<code>.input--code</code>", "Large centred one-time code (unused)."),
            ("<code>.search</code> <code>.search__icon</code> <code>.search__input</code>", "Search pill with leading icon."),
            ("<code>aria-invalid=\"true\"</code> · <code>readonly</code> · <code>disabled</code>", "Invalid, read-only, disabled."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/join/default", "name, e-mail, password"),
            mock("pages/join/invalid", "invalid fields"),
            mock("pages/sign-in/submitting", "read-only while submitting"),
            mock("pages/landing/default", "pill email in the newsletter box"),
            mock("pages/subscribe/default", "pill, large"),
            mock("pages/subscribe/invalid", "pill, large, invalid"),
            mock("pages/admin-story-editor/draft", "small date and time"),
            mock("pages/admin-story-editor/default", "input group: link slug"),
            mock("pages/admin-members/default", "search"),
        ],
        "drift": "Input borders were raised from <code>--color-border-default</code> to <code>--color-border-strong</code> to meet 3:1 non-text contrast (WCAG 1.4.11). Hover had no style for select and textarea in data-state form; only <code>.input[data-state=hover]</code> exists. The one-time code example came from admin two-step, which was removed with the move to Google Workspace sign-in; <code>.input--code</code> is unused and can be dropped from the stylesheet. The pill, large, small and input-group forms came with the front page, Subscribe and the story editor.",
    },
}
