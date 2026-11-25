from dslib import ex, kbd, matrix, mock, themes


def option(value, title, note, price, on=False, disabled=False, a="", name="plan"):
    return (f'<label class="plan-option"{a}><input class="plan-option__input" type="radio" name="{name}" value="{value}"'
            f'{" checked" if on else ""}{" disabled" if disabled else ""}>'
            f'<span class="plan-option__body"><span class="plan-option__title">{title}</span><span class="plan-option__note">{note}</span></span>'
            f'<span class="plan-option__price">{price}</span></label>')


def plans(mode="all", name="plan"):
    full = mode == "full"
    busy = mode == "busy"
    drop = mode in ("drop", "full")
    every_note = "Every place in the series is taken" if full else "Your spot is held each week"
    drop_note = {"drop": "2 picked below", "full": "Tick dates in the list"}.get(mode, "Come when you can")
    return ('<div class="card card--pad-sm"><fieldset class="plan-list"><legend class="visually-hidden">How would you like to come?</legend>'
            + option("all", "Every session (5 left)", every_note, "$64 for all 8", on=not drop, disabled=full or busy, name=name)
            + option("drop", "Pick dates to drop in", drop_note, "$10 each", on=drop, disabled=busy, name=name)
            + '</fieldset></div>')


PANEL = '<form class="auth__form" action="#">{}</form>'

SPEC = {
    "lead": "A plan option is one way to take part in an event series, with what it means and what it costs: every session, or the dates you pick.",
    "meta": ["Status: new", "Native <code>&lt;input type=\"radio\"&gt;</code> in a <code>&lt;fieldset&gt;</code>", "Member app: Event series"],
    "overview": f"""<p>Use plan options in a series' <b>Sign up</b> panel, where a member decides how to come before pressing the panel's one button: <b>Every session</b> (join the whole program, the spot held each week) or <b>Pick dates to drop in</b> (tick dates in the session list). Each option shows a title, a short note that changes with the state, and the price for that choice.</p>
<ul>
<li><b>Plan option</b> (<code>.plan-option</code>): a radio drawn as a full-width row card; the chosen one fills with the accent tint and an accent ring.</li>
<li><b>Plan list</b> (<code>.plan-list</code>): the borderless <code>&lt;fieldset&gt;</code> that stacks them 8px apart, with a visually hidden legend.</li>
</ul>
<p>For answers without a price, use <a href="choice-card.html">choice cards</a> or a <a href="radio-group.html">radio group</a>.</p>""",
    "anatomy": {
        "figure": PANEL.format(plans()),
        "callouts": [(22, 25), (45, 25), (55, 42), (74, 25)],
        "parts": [
            ("Radio", "<code>.plan-option__input</code>: the native radio, 16px (<code>--size-icon-sm</code>), tinted with <code>accent-color</code>."),
            ("Title", "<code>.plan-option__title</code>: semibold, with the count when it matters: \"Every session (5 left)\"."),
            ("Note", "<code>.plan-option__note</code>: 14px muted; says what the choice means now (\"Your spot is held each week\", \"2 picked below\")."),
            ("Price", "<code>.plan-option__price</code>: Barlow Condensed (<code>--font-family-display</code>) 20px semibold, never shrinks: \"$64 for all 8\", \"$10 each\", \"Free\"."),
        ],
    },
    "variants": ex(PANEL.format(plans()), "Every session chosen (not joined yet).", True, mod="stack")
    + ex(PANEL.format(plans("drop", "plan-d")), "Drop in chosen; the note counts the dates ticked in the list.", True, mod="stack")
    + ex(PANEL.format(plans("full", "plan-f")), "Series full: every session is unavailable, dates can still be picked.", True, mod="stack"),
    "sizes": "<p>One size: 16px padding all round, so an option with a note is about 70px tall; it fills the panel's width. The radio is 16px; the whole row is the target.</p>",
    "states": {
        "intro": "<p>Checked and disabled are real attributes on the radio; the row styles itself from them with <code>:has()</code>. Hover is real <code>:hover</code> only (the block has no <code>data-state</code> hook), so it is not forced here. Focus is forced with <code>data-state</code> on the row, which draws the same ring <code>:has(:focus-visible)</code> draws live. States run down the table here, since the row is wide.</p>",
        "matrix": matrix([("Every session option", "")], [
            ("Default", option("all", "Every session (5 left)", "Your spot is held each week", "$64 for all 8", name="m1")),
            ("Focus", option("all", "Every session (5 left)", "Your spot is held each week", "$64 for all 8", name="m2", a=' data-state="focus"')),
            ("Checked", option("all", "Every session (5 left)", "Your spot is held each week", "$64 for all 8", on=True, name="m3")),
            ("Disabled", option("all", "Every session (5 left)", "Every place in the series is taken", "$64 for all 8", disabled=True, name="m4")),
            ("Checked, disabled", option("all", "Every session (5 left)", "Your spot is held each week", "$64 for all 8", on=True, disabled=True, name="m5")),
        ]),
        "themes": themes(PANEL.format(plans()) + PANEL.format(plans("full", "plan-tf")), "stack"),
        "notes": """<ul>
<li><b>Busy</b>: while \"Joining…\" or \"Registering…\" runs, both options are disabled (the chosen one keeps its fill) and dim to <code>--opacity-unavailable</code>.</li>
<li><b>Full</b>: \"Every session\" is disabled with the note \"Every place in the series is taken\"; there is no waitlist (mocks README: Series, full).</li>
<li><b>Failed</b>: the options stay as chosen; the error appears above the panel's button.</li>
<li><b>Joined</b> or <b>booked</b>: the options give way to the confirmation; a member changes dates from there.</li>
</ul>""",
    },
    "responsive": """<ul>
<li>The options fill the Sign up panel at every width: the panel sits beside the sessions from 1024px and under them on phones.</li>
<li>The price never shrinks (<code>flex-shrink: 0</code>); the title and note wrap beside it. At 360px \"$64 for all 8\" keeps one line and the note wraps to two.</li>
</ul>""",
    "theming": "<p>Unchosen: transparent with a hairline <code>--color-border-default</code> ring (<code>--color-border-hover</code> on hover). Chosen: <code>--color-accent-subtle</code> and a hairline <code>--color-accent</code> ring. Note in <code>--color-fg-muted</code>; radio tint <code>--color-accent</code>. All follow the theme.</p>",
    "accessibility": {
        "pattern": "<p>Native radios in a <code>&lt;fieldset&gt;</code> with a visually hidden <code>&lt;legend&gt;</code> \"How would you like to come?\" (<a href=\"https://www.w3.org/WAI/ARIA/apg/patterns/radio/\">APG Radio Group</a>, natively). The whole row is the radio's <code>&lt;label&gt;</code>, so title, note and price are its name.</p>",
        "keys": [
            (kbd("Tab"), "Moves into the group (to the chosen option) and on to the panel's button."),
            (kbd("↑") + " / " + kbd("↓"), "Chooses the other option."),
            (kbd("Space"), "Chooses the focused option if none is chosen."),
        ],
        "focus": "<p>The shared 2px <code>--color-focus-ring</code> at 2px offset around the whole row, from <code>:has(.plan-option__input:focus-visible)</code>.</p>",
        "labelling": "<p>The legend names the question for screen readers; each row reads as \"Every session (5 left), Your spot is held each week, $64 for all 8\". The chosen row is marked by the filled radio and the ring as well as the tint. A disabled option keeps its note, which says why.</p>",
        "pairs": [
            ("Title and price", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Note", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Chosen title", "--color-fg-default", "--color-accent-subtle", 4.5),
            ("Chosen note", "--color-fg-muted", "--color-accent-subtle", 4.5),
            ("Chosen ring", "--color-fg-accent", "--color-bg-surface", 3),
            ("Focus ring on surface", "--color-focus-ring", "--color-bg-surface", 3),
        ],
        "motion": "<p>Fill and ring change over <code>--duration-fast</code>; instant under reduced motion.</p>",
        "touch": "<p>The whole row is the target, about 70px tall and the panel's width; the two rows are 8px apart.</p>",
    },
    "content": """<ul>
<li>Titles say what you sign up for: \"Every session (5 left)\", \"Pick dates to drop in\".</li>
<li>The note says what it means now and changes with the state: \"Your spot is held each week\", \"Come when you can\", \"Tick dates in the list\", \"2 picked below\", \"Every place in the series is taken\".</li>
<li>Prices in full and plain: \"$64 for all 8\", \"$10 each\", \"Free\". No payment happens online yet; the panel says to pay the host.</li>
</ul>""",
    "dodont": [
        ("do", PANEL.format(plans("full", "plan-dd1")), "A full series keeps the option, disabled, and the note says why."),
        ("dont", PANEL.format('<div class="card card--pad-sm"><fieldset class="plan-list"><legend class="visually-hidden">How would you like to come?</legend>'
                              + option("drop", "Pick dates to drop in", "Tick dates in the list", "$10 each", on=True, name="plan-dd2") + '</fieldset></div>'),
         "Removing the full option: members no longer see that the series exists as a whole, or why they cannot join it."),
        ("do", PANEL.format(plans("drop", "plan-dd3")), "The price states the unit: \"$10 each\", \"$64 for all 8\"."),
        ("dont", PANEL.format('<div class="card card--pad-sm"><fieldset class="plan-list"><legend class="visually-hidden">How would you like to come?</legend>'
                              + option("all", "Series", "", "$64", on=True, name="plan-dd4")
                              + option("drop", "Drop-in", "", "$10", name="plan-dd4") + '</fieldset></div>'),
         "Bare prices and jargon: is $64 per week or for all eight?"),
    ],
    "tokens": [
        ("Ring / hover", "--color-border-default / --color-border-hover", "color"),
        ("Chosen fill / ring", "--color-accent-subtle / --color-fg-accent", "color"),
        ("Note", "--color-fg-muted", "color"),
        ("Focus ring", "--color-focus-ring", "color"),
        ("Padding / gap", "--space-4 / --space-3", "value"),
        ("Gap between options / list top margin", "--space-2 / --space-4", "value"),
        ("Radius", "--radius-lg", "value"),
        ("Ring width", "--border-width-hairline", "value"),
        ("Radio size", "--size-icon-sm", "value"),
        ("Price", "--font-family-display / --font-size-xl / --font-weight-semibold", "value"),
        ("Disabled opacity", "--opacity-unavailable", "value"),
        ("Transition", "--duration-fast / --ease-standard", "value"),
    ],
    "code": {
        "snippet": '''<fieldset class="plan-list">
  <legend class="visually-hidden">How would you like to come?</legend>
  <label class="plan-option">
    <input class="plan-option__input" type="radio" name="plan" value="all" checked>
    <span class="plan-option__body">
      <span class="plan-option__title">Every session (5 left)</span>
      <span class="plan-option__note">Your spot is held each week</span>
    </span>
    <span class="plan-option__price">$64 for all 8</span>
  </label>
  <label class="plan-option">…Pick dates to drop in…</label>
</fieldset>''',
        "classes": [
            ("<code>.plan-list</code>", "Borderless fieldset; stacks options 8px apart."),
            ("<code>.plan-option</code>", "A radio drawn as a row card; fills when checked."),
            ("<code>.plan-option__input</code> <code>__body</code> <code>__title</code> <code>__note</code> <code>__price</code>", "Radio, text column, title, note, price."),
            ("<code>checked</code> · <code>disabled</code>", "States, on the radio."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/event-series/not-joined", "every session chosen"),
            mock("pages/event-series/drop-in", "drop in chosen, 2 picked"),
            mock("pages/event-series/drop-in-none", "drop in chosen, none picked"),
            mock("pages/event-series/full", "every session disabled"),
            mock("pages/event-series/joining", "both disabled while joining"),
        ],
        "drift": "New with event series. The frame offered \"Join the waitlist\" when full; there is no waitlist, so the every-session option is disabled and dates can still be picked (mocks README: Series, full). The block has no <code>data-state</code> hook for hover, unlike most blocks. Fixed: the chosen hairline ring used <code>--color-accent</code> (about 2.2:1 on the dark surface); it now uses <code>--color-fg-accent</code>.",
    },
}
