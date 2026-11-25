from dslib import ex, icon, kbd, matrix, mock, themes

RELATIONS = [("self", "Myself", "I run it or I am them", ""), ("know", "Someone I know", "A friend, coach or group", ""),
             ("been", "Somewhere I’ve been", "I went and loved it", "")]
KINDS = [("idea", "An idea", "", "lightbulb"), ("broken", "Something’s off", "", "bug"), ("content", "A correction", "", "pen-line"),
         ("praise", "Thanks", "", "heart")]
LISTING_KINDS = ["Organization", "Person", "Instructor", "Ambassador", "Company", "Church Ministry"]


def card_items(name, options, picked, disabled=False):
    out = []
    for oid, label, hint, ic in options:
        desc = f'<span class="choice__desc">{hint}</span>' if hint else ""
        mark = icon(ic, "choice-card__icon") if ic else ""
        out.append(f'<label class="choice choice-card"><input class="choice__input" type="radio" name="{name}" value="{oid}"'
                   f'{" checked" if oid == picked else ""}{" disabled" if disabled else ""}>'
                   f'<span><span class="choice__label">{mark}{label}</span>{desc}</span></label>')
    return "".join(out)


def cards(legend, name, options, picked, cols, disabled=False):
    return (f'<fieldset class="form-section"><legend class="form-section__legend">{legend}</legend>'
            f'<div class="choice-grid choice-grid--{cols}">{card_items(name, options, picked, disabled)}</div></fieldset>')


def chips(name, picked="Organization", disabled=False):
    items = "".join(f'<label class="chip chip--choice"><input class="chip__input" type="radio" name="{name}" value="{k}"'
                    f'{" checked" if k == picked else ""}{" disabled" if disabled else ""}>{k}</label>' for k in LISTING_KINDS)
    return (f'<fieldset class="form-section"><legend class="form-section__legend">What kind of listing?</legend>'
            f'<div class="cluster form-section__body">{items}</div></fieldset>')


WHO = '<form action="#">' + cards("Who are you suggesting?", "relation", RELATIONS, "know", 3) + '</form>'
ABOUT = '<form action="#">' + cards("What’s it about?", "kind", KINDS, "idea", 4) + '</form>'
KIND = '<form action="#">' + chips("kind-l") + '</form>'

STATES = [("Default", ""), ("Focus", ' data-state="focus"'), ("Checked", " checked"), ("Disabled", " disabled"),
          ("Invalid", ' aria-invalid="true"')]

SPEC = {
    "lead": "Choice cards ask for one answer from a few, as tappable cards or chips that are real radio buttons underneath.",
    "meta": ["Status: new", "Native <code>&lt;input type=\"radio\"&gt;</code> in a <code>&lt;fieldset&gt;</code>", "Member forms"],
    "overview": f"""<p>Use choice cards in a form when one short answer, from two to four options, decides what the rest of the form asks: <b>Who are you suggesting?</b> on Suggest a listing (the fields change for \"Myself\") and <b>What's it about?</b> on Send feedback (the question and the screenshot field change). Use choice chips for one answer from a longer list of short words: <b>What kind of listing?</b></p>
<ul>
<li><b>Card</b> (<code>.choice.choice-card</code>): a <a href="radio-group.html">radio</a> row drawn as a bordered card, with its visible radio, a semibold label, an optional icon (<code>.choice-card__icon</code>) and an optional description. The chosen card fills with the accent tint and a 2px accent ring.</li>
<li><b>Grid</b> (<code>.choice-grid</code>): lays the cards out; <code>--3</code> gives three columns from 640px, <code>--4</code> two columns on phones and four from 640px.</li>
<li><b>Chip</b> (<code>.chip.chip--choice</code>): a <a href="chip.html">chip</a> wrapping a visually hidden radio (<code>.chip__input</code>); the chosen chip fills near-black.</li>
</ul>
<p>For a plain list of radios with longer descriptions (who can see your profile), use the <a href="radio-group.html">radio group</a>; for a price-bearing choice, the <a href="plan-option.html">plan option</a>; for several answers, <a href="checkbox.html">checkboxes</a>.</p>""",
    "anatomy": {
        "figure": f'<div class="choice-grid">{card_items("anat", KINDS[:1], "idea")}</div>',
        "callouts": [(6, 18), (12, 82), (24, 18), (88, 30)],
        "parts": [
            ("Radio", "<code>.choice__input</code>: the native radio, 20px (<code>--size-icon-lg</code>), tinted with <code>accent-color</code>; it stays visible, so the card is clearly one of a set."),
            ("Icon (optional)", "<code>.choice-card__icon</code>: 16px, muted; accent when chosen."),
            ("Label", "<code>.choice__label</code>: 15px semibold; with <code>.choice__desc</code> beneath in 14px muted when the options need a line of explanation."),
            ("Card", "<code>.choice-card</code>: <code>--radius-lg</code>, 12px × 16px padding, a hairline <code>--color-border-default</code> ring on <code>--color-bg-surface</code>; chosen: <code>--color-accent-subtle</code> and a 2px <code>--color-accent</code> ring."),
        ],
    },
    "variants": "<h3>Cards with descriptions, three columns</h3>"
    + ex(WHO, "Suggest a listing: who the suggestion is for.", True, mod="stack")
    + "<h3>Cards with icons, four columns</h3>"
    + ex(ABOUT, "Send feedback: what it is about; two columns on phones.", True, mod="stack")
    + "<h3>Choice chips</h3>"
    + ex(KIND, "Suggest a listing: the kind of listing, one of six.", True, mod="stack"),
    "sizes": "<p>One size. Cards are at least 44px tall (<code>--target-comfortable</code>) and as wide as their grid column; chips are the 36px chip. The grid gap is 8px (<code>--space-2</code>).</p>",
    "states": {
        "intro": "<p>Checked, disabled and invalid are real attributes on the radio; the card and chip style themselves from them with <code>:has()</code>. Focus is forced here with <code>data-state</code> on the radio (on the chip for chips, whose radio is hidden); live it is <code>:focus-visible</code>. Neither the card nor the chip block has a hover style of its own, so there is no hover column; the chip keeps the base chip's ring hover.</p>",
        "matrix": matrix(STATES, [
            ("Card", '<label class="choice choice-card"><input class="choice__input" type="radio" name="m-c"{a}><span><span class="choice__label">Someone I know</span><span class="choice__desc">A friend, coach or group</span></span></label>'),
            ("Card with icon", f'<label class="choice choice-card"><input class="choice__input" type="radio" name="m-i"{{a}}><span><span class="choice__label">{icon("bug", "choice-card__icon")}Something’s off</span></span></label>'),
            ("Chip", '<label class="chip chip--choice"><input class="chip__input" type="radio" name="m-h"{a}>Instructor</label>',
             {"Focus": None, "Invalid": None}),
        ]).replace('<td><label class="chip chip--choice"><input class="chip__input" type="radio" name="m-h">Instructor</label></td><td>—</td>',
                   '<td><label class="chip chip--choice"><input class="chip__input" type="radio" name="m-h">Instructor</label></td>'
                   '<td><label class="chip chip--choice" data-state="focus"><input class="chip__input" type="radio" name="m-h">Instructor</label></td>', 1),
        "themes": themes(WHO + KIND, "stack"),
        "notes": """<ul>
<li><b>Disabled</b>: while the form sends (\"Sending…\"), every card and chip is disabled; the label turns <code>--color-fg-disabled</code> on cards, the chip drops to <code>--opacity-disabled</code>.</li>
<li><b>Invalid</b>: never in the mocks, since one option is always chosen by default. If a question ever starts empty, mark the radios <code>aria-invalid</code> (a danger outline on the radio) and say what to pick in a field error under the legend.</li>
<li><b>Changing the answer</b> changes the form below at once (Myself hides \"Their email\"; Something's off adds Screenshot); nothing is lost that was typed in fields both answers share.</li>
</ul>""",
    },
    "responsive": """<ul>
<li><code>.choice-grid</code> alone is one column at every width.</li>
<li><code>.choice-grid--3</code>: one column below 640px (<code>--layout-breakpoint-sm</code>), three from 640px.</li>
<li><code>.choice-grid--4</code>: two columns below 640px, four from 640px; short labels with icons fit a 360px phone two by two.</li>
<li>Card text wraps inside the card; cards in a row stretch to the tallest. Chips wrap in their <code>.cluster</code>.</li>
</ul>""",
    "theming": "<p>Cards: <code>--color-bg-surface</code> with a <code>--color-border-default</code> ring; chosen <code>--color-accent-subtle</code> with a <code>--color-accent</code> ring; icon <code>--color-fg-muted</code>, chosen <code>--color-fg-accent</code>; radio tint <code>accent-color: var(--color-accent)</code>. Chips: the chip's surface and ring; chosen <code>--color-bg-inverse</code>/<code>--color-fg-inverse</code>. All follow the theme.</p>",
    "accessibility": {
        "pattern": "<p>Native radio buttons in a <code>&lt;fieldset&gt;</code> whose <code>&lt;legend&gt;</code> asks the question (<a href=\"https://www.w3.org/WAI/ARIA/apg/patterns/radio/\">APG Radio Group</a>, natively). Each card or chip is the radio's <code>&lt;label&gt;</code>, so the whole card is the target. The chip's radio is visually hidden but stays in the tab order and in the accessibility tree.</p>",
        "keys": [
            (kbd("Tab"), "Moves into the group, to the chosen option, and out again (one stop per group)."),
            (kbd("↑") + " / " + kbd("←") + ", " + kbd("↓") + " / " + kbd("→"), "Chooses the previous or next option."),
            (kbd("Space"), "Chooses the focused option if none is chosen."),
        ],
        "focus": "<p>Cards: the shared 2px ring at 2px offset around the radio itself. Chips: the same ring around the whole chip, drawn from <code>:has(.chip__input:focus-visible)</code>.</p>",
        "labelling": "<p>The legend is the question and the group name; the card's label and description are the option's name and description, read together. Icons are decorative. The chosen card is marked by the filled radio and the 2px ring as well as the tint; the chosen chip by its inverse fill (a strong change in lightness, and the radio state is announced).</p>",
        "pairs": [
            ("Card label", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Card description", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Chosen card label", "--color-fg-default", "--color-accent-subtle", 4.5),
            ("Chosen card description", "--color-fg-muted", "--color-accent-subtle", 4.5),
            ("Chosen card icon", "--color-fg-accent", "--color-accent-subtle", 3),
            ("Chosen card ring", "--color-fg-accent", "--color-bg-surface", 3),
            ("Chosen chip", "--color-fg-inverse", "--color-bg-inverse", 4.5),
            ("Focus ring on surface", "--color-focus-ring", "--color-bg-surface", 3),
        ],
        "motion": "<p>None of their own; the chip's colour change uses the chip's <code>--duration-fast</code> transition, instant under reduced motion.</p>",
        "touch": "<p>The whole card is the target, at least 44px tall and a column wide. Chips are 36px and extend to 44 × 44px on coarse pointers like every chip; 8px apart.</p>",
    },
    "content": """<ul>
<li>The legend asks the question in the member's words: \"Who are you suggesting?\", \"What's it about?\".</li>
<li>Card labels are short answers in sentence case: \"Someone I know\", \"Something's off\"; a description, if any, is one plain line: \"A friend, coach or group\".</li>
<li>Chip labels are the names of the kinds, as the directory shows them: \"Organization\", \"Church Ministry\".</li>
<li>Choose a sensible default (\"Someone I know\", \"An idea\") so the question is never left empty.</li>
</ul>""",
    "dodont": [
        ("do", '<fieldset class="form-section"><legend class="form-section__legend">What’s it about?</legend><div class="choice-grid">'
         + card_items("dd-a", KINDS, "idea") + '</div></fieldset>',
         "Real radios in a fieldset: arrow keys move between them and the legend names the group."),
        ("dont", '<div class="choice-grid choice-grid--4"><button class="choice-card" type="button">An idea</button><button class="choice-card" type="button">Something’s off</button><button class="choice-card" type="button">A correction</button><button class="choice-card" type="button">Thanks</button></div>',
         "Cards as buttons with no group, no checked state and no visible radio, as the frame drew them (mocks README: Radio cards)."),
        ("do", KIND, "Six short kinds as choice chips that wrap."),
        ("dont", '<fieldset class="form-section"><legend class="form-section__legend">What kind of listing?</legend><div class="choice-grid">'
         + card_items("dd-k", [(k, k, "", "") for k in LISTING_KINDS], "Organization") + '</div></fieldset>',
         "Six one-word answers as cards: a wall of boxes for a choice chips make in one line."),
    ],
    "tokens": [
        ("Card fill / ring", "--color-bg-surface / --color-border-default", "color"),
        ("Chosen card fill / ring", "--color-accent-subtle / --color-fg-accent", "color"),
        ("Icon / chosen icon", "--color-fg-muted / --color-fg-accent", "color"),
        ("Description / disabled label", "--color-fg-muted / --color-fg-disabled", "color"),
        ("Chosen chip", "--color-bg-inverse / --color-fg-inverse", "color"),
        ("Focus ring", "--color-focus-ring", "color"),
        ("Card padding", "--space-3 / --space-4", "value"),
        ("Card radius", "--radius-lg", "value"),
        ("Chosen ring width", "--border-width-thick", "value"),
        ("Grid gap / top margin", "--space-2 / --space-3", "value"),
        ("Radio size / row height", "--size-icon-lg / --target-comfortable", "value"),
        ("Icon gap", "--space-1-5", "value"),
        ("Chip disabled opacity", "--opacity-disabled", "value"),
    ],
    "code": {
        "snippet": '''<fieldset class="form-section">
  <legend class="form-section__legend">What’s it about?</legend>
  <div class="choice-grid choice-grid--4">
    <label class="choice choice-card">
      <input class="choice__input" type="radio" name="kind" value="idea" checked>
      <span><span class="choice__label"><svg class="icon choice-card__icon" aria-hidden="true">…</svg>An idea</span></span>
    </label>
    …
  </div>
</fieldset>

<fieldset class="form-section">
  <legend class="form-section__legend">What kind of listing?</legend>
  <div class="cluster form-section__body">
    <label class="chip chip--choice"><input class="chip__input" type="radio" name="kind" value="Organization" checked>Organization</label>
    …
  </div>
</fieldset>''',
        "classes": [
            ("<code>.choice-grid</code> <code>.choice-grid--3</code> <code>.choice-grid--4</code>", "Card grid; three, or two then four, columns."),
            ("<code>.choice.choice-card</code>", "A radio drawn as a card; fills when <code>:checked</code>."),
            ("<code>.choice__input</code> <code>.choice__label</code> <code>.choice__desc</code>", "The radio, its label and description."),
            ("<code>.choice-card__icon</code>", "Optional leading icon; accent when chosen."),
            ("<code>.chip.chip--choice</code> <code>.chip__input</code>", "A radio drawn as a chip; the radio is visually hidden."),
            ("<code>checked</code> · <code>disabled</code> · <code>aria-invalid=\"true\"</code>", "States, on the radio."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/suggest-listing/default", "three cards with descriptions; choice chips"),
            mock("pages/suggest-listing/self", "Myself chosen"),
            mock("pages/suggest-listing/submitting", "disabled while sending"),
            mock("pages/feedback/default", "four cards with icons"),
            mock("pages/feedback/broken", "Something’s off chosen"),
        ],
        "drift": "The frames drew these as cards with a hidden radio; the mocks use the design system's radio card with its visible radio, and the kind of listing as a radio group drawn as chips (mocks README: Radio cards). <code>.choice-card</code> is declared twice in components.css (a <code>--color-border-strong</code> ring, then overridden to <code>--color-border-default</code>); the later rule wins, so the unchosen card's ring is under 3:1 and the visible radio is what marks each card as a control. Proposed: merge the two rules. The cards have no hover style. Fixed: the chosen ring used <code>--color-accent</code> (about 2.2:1 on the dark surface); it now uses <code>--color-fg-accent</code>.",
    },
}
