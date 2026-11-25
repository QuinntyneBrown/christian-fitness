from dslib import ex, icon, kbd, mock, themes

STEP_DATA = [
    ("We read it within 3 days", "A real person on our team, not a filter."),
    ("We run four checks", "Credentials, insurance where it applies, two references, and a conversation about faith and practice."),
    ("They approve their listing", "Nothing goes live without the listed person or group saying yes."),
    ("You hear back", "We message you when it’s approved, or tell you why not."),
]


def steps(n=4):
    return ('<ol class="steps">' + "".join(
        f'<li class="steps__item"><span class="steps__n" aria-hidden="true">{i}</span><div><p class="steps__title">{t}</p>'
        f'<p class="steps__text">{d}</p></div></li>' for i, (t, d) in enumerate(STEP_DATA[:n], 1)) + "</ol>")


def done(title="Thanks, Grace", text="We’ve got your suggestion for <strong>Eastside Ladies Who Lift</strong>. Our team will look into it this week, and we’ll message you here when it’s decided either way.",
         a="", primary="Back to the directory", secondary="Suggest another"):
    return (f'<section class="done" role="status" tabindex="-1"{a}><span class="done__icon">{icon("check", "icon--lg")}</span>'
            f'<h2 class="display page-title done__title">{title}</h2><p class="done__text">{text}</p>'
            f'<div class="done__actions"><a class="btn btn--primary btn--md" href="#">{primary}</a><a class="btn btn--secondary btn--md" href="#">{secondary}</a></div></section>')


DONE_FEEDBACK = done("Got it. Thank you.", "Dana and the team read every note. If we need more detail we’ll email you, and we’ll let you know when it’s fixed.",
                     primary="Back to Home", secondary="Send more")


def chip(value="Event series › Couch to 5K Run Club"):
    return (f'<div class="context-chip"><div class="context-chip__body"><p class="context-chip__label">About this page</p>'
            f'<p class="context-chip__value">{value}</p></div><button class="icon-button icon-button--sm" type="button" aria-label="Remove page">{icon("x")}</button></div>')


ASIDE = ('<aside class="form-page__aside" aria-labelledby="next-v"><h2 class="display section-title" id="next-v">What happens next</h2>'
         + steps() + "</aside>")

SPEC = {
    "lead": "Steps tell people what happens after they send something: a short numbered list beside the form, and a thank-you that says the same in a sentence.",
    "meta": ["Status: new", "Ordered list <code>&lt;ol&gt;</code>", "Suggest a listing, feedback"],
    "overview": """<p>Three small blocks used by the member forms that send something to the team:</p>
<ul>
<li><b>Steps</b> (<code>.steps</code>): \"What happens next\", a numbered list joined by a thin line, beside the Suggest a listing form and its success state. It is information, not a progress tracker: no step is current or done.</li>
<li><b>Done</b> (<code>.done</code>): the success state that replaces a sent form: a check, a thank-you by name, what happens now, and two ways on. It takes focus and is announced.</li>
<li><b>Context chip</b> (<code>.context-chip</code>): \"About this page\" on the feedback form, naming the page the feedback came from, with a button to remove it.</li>
</ul>
<p>For progress through a multi-screen task use a page title and a back link (there is no stepper in this product); for a quick confirmation use a <a href="toast.html">toast</a>; for a form-level message an <a href="alert.html">alert</a>.</p>""",
    "anatomy": {
        "figure": '<div class="w-80">' + steps(2) + "</div>",
        "callouts": [(10, 23), (48, 18), (60, 28), (10, 42)],
        "parts": [
            ("Number", "<code>.steps__n</code>: a 32px circle (<code>--space-8</code>), surface with a hairline ring, accent display figure; <code>aria-hidden</code> because the list is ordered."),
            ("Title", "<code>.steps__title</code>: semibold, one short sentence."),
            ("Text", "<code>.steps__text</code>: 15px muted, relaxed leading."),
            ("Connector", "A hairline from each number to the next (<code>::before</code>), not after the last step."),
        ],
    },
    "variants": "<h3>Steps</h3>" + ex(ASIDE, "\"What happens next\" beside the form (suggest-listing/default).", True, mod="block")
    + "<h3>Done</h3>" + ex(done(), "After Suggest a listing: thanks by name, the listing in bold (suggest-listing/success).", True, mod="block")
    + ex(DONE_FEEDBACK, "After feedback (feedback/success).", True, mod="block")
    + "<h3>Context chip</h3>" + ex(chip(), "Opened from the Couch to 5K series page (feedback/default).", True, mod="block")
    + ex(chip("Story › A West End church turned its basement into a free gym"), "Long values truncate with an ellipsis (feedback/correction).", True, mod="block"),
    "sizes": "<p>One size each. Steps: 32px numbers, 16px gap, 24px between steps. Done: 48px icon circle (<code>--size-avatar-xl</code>), page-title heading, 18px text up to <code>--layout-lead-max</code>. Context chip: 12px × 16px padding.</p>",
    "states": {
        "intro": "<p>Steps are static. Done has one state, shown once, focused on arrival (the ring sits 8px out). The context chip's only control is its remove button (hover, focus).</p>",
        "matrix": """<div class="ds-matrix"><table><thead><tr><th scope="col">Block</th><th scope="col">Default</th><th scope="col">Focus or hover</th></tr></thead><tbody>"""
        + f'<tr><th scope="row">Steps</th><td><div class="w-80">{steps(1)}</div></td><td>—</td></tr>'
        + f'<tr><th scope="row">Done</th><td>{done()}</td><td>{done(a=chr(32) + "data-state=" + chr(34) + "focus" + chr(34))}</td></tr>'
        + f'<tr><th scope="row">Context chip</th><td>{chip()}</td><td>{chip().replace("icon-button--sm" + chr(34), "icon-button--sm" + chr(34) + " data-state=" + chr(34) + "focus" + chr(34))}</td></tr>'
        + "</tbody></table></div>"
        + "<p>While the form sends, the steps stay as they are; the form's button is busy (suggest-listing/submitting). On success the form becomes <b>Done</b> and the steps stay beside it.</p>",
        "themes": themes(steps(2)) + themes(done() + chip(), mod="block"),
        "notes": "<ul><li>Done uses <code>role=\"status\"</code> and receives focus (<code>tabindex=\"-1\"</code>, <code>autofocus</code> in the mock) so a screen reader reads the thanks and keyboard users start from it.</li><li>Removing the context chip sends the feedback without a page; the mocks do not draw that state.</li></ul>",
    },
    "responsive": """<ul>
<li>Steps sit in the form page's aside: below the form on phones, a second column from 1024px, pushed down (<code>.form-page__aside--low</code>) to line up with the first field.</li>
<li>Done's actions wrap onto two lines on narrow phones.</li>
<li>The context chip fills the form's width; its value truncates to one line.</li>
</ul>""",
    "theming": "<p>Step numbers: <code>--color-bg-surface</code>, ring <code>--color-border-default</code>, figure <code>--color-fg-accent</code>; connector <code>--color-border-default</code>; text <code>--color-fg-muted</code>. Done's icon is <code>--color-accent</code>/<code>--color-fg-on-accent</code>. The context chip is a surface with a hairline ring and a muted label.</p>",
    "accessibility": {
        "pattern": "<p>Steps: an <code>&lt;ol&gt;</code> under a heading; the visible numbers are <code>aria-hidden</code> because the list announces position. Done: a <code>&lt;section role=\"status\" tabindex=\"-1\"&gt;</code> with the page's <code>&lt;h1&gt;</code>, focused when shown. Context chip: text plus an icon button named \"Remove page\".</p>",
        "keys": [(kbd("Tab"), "From Done: Back to the directory, then Suggest another. On the chip: the Remove page button."), (kbd("Enter"), "Follows a Done action; removes the page.")],
        "focus": "<p>Done draws the shared ring 8px outside itself (<code>--space-2</code>) when it receives focus.</p>",
        "labelling": "<p>Steps read \"list, 4 items: We read it within 3 days. A real person on our team, not a filter.\" The chip's button name could say which page (\"Remove page: Couch to 5K Run Club\").</p>",
        "pairs": [
            ("Step number", "--color-fg-accent", "--color-bg-surface", 3),
            ("Step title", "--color-fg-default", "--color-bg-canvas", 4.5),
            ("Step text", "--color-fg-muted", "--color-bg-canvas", 4.5),
            ("Done icon (non-text)", "--color-fg-on-accent", "--color-accent", 3),
            ("Chip label", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Chip value", "--color-fg-default", "--color-bg-surface", 4.5),
        ],
        "motion": "<p>None.</p>",
        "touch": "<p>Steps have no targets. Done's buttons are 44px tall. The chip's remove button is 32px and extends to 44 × 44px on coarse pointers.</p>",
    },
    "content": """<ul>
<li>Step titles say who does what, in the present: \"We read it within 3 days\", \"You hear back\". Texts add the one detail that reassures.</li>
<li>Done thanks by first name when there is one (\"Thanks, Grace\"), names what was sent in bold, says what happens next and when.</li>
<li>Chip: \"About this page\" + \"Section › Title\".</li>
</ul>""",
    "dodont": [
        ("do", '<div class="w-80">' + steps(2) + "</div>", "Plain steps that set expectations (suggest-listing)."),
        ("dont", '<div class="w-80"><ol class="steps"><li class="steps__item"><span class="steps__n" aria-hidden="true">1</span><div><p class="steps__title">Submission received</p></div></li>'
         '<li class="steps__item"><span class="steps__n" aria-hidden="true">2</span><div><p class="steps__title">Under review</p></div></li></ol></div>',
         "System states with no who or when; it reads like a tracker that never updates."),
        ("do", done(), "Done names what was sent and the next step."),
        ("dont", '<section class="done" role="status" tabindex="-1"><h2 class="display page-title done__title">Success!</h2></section>', "\"Success!\" and nothing to do next: a dead end."),
    ],
    "tokens": [
        ("Number fill / ring / figure", "--color-bg-surface / --color-border-default / --color-fg-accent", "color"),
        ("Step text", "--color-fg-muted", "color"),
        ("Done icon", "--color-accent / --color-fg-on-accent", "color"),
        ("Chip surface / ring", "--color-bg-surface / --color-border-default", "color"),
        ("Number size", "--space-8", "value"),
        ("Step spacing", "--space-4 / --space-6", "value"),
        ("Done icon size", "--size-avatar-xl", "value"),
        ("Done text width", "--layout-lead-max", "value"),
        ("Chip padding / radius", "--space-3 / --space-4 / --radius-md", "value"),
    ],
    "code": {
        "snippet": '''<ol class="steps">
  <li class="steps__item"><span class="steps__n" aria-hidden="true">1</span>
    <div><p class="steps__title">We read it within 3 days</p><p class="steps__text">A real person on our team, not a filter.</p></div></li>
</ol>

<section class="done" role="status" tabindex="-1">
  <span class="done__icon"><svg class="icon icon--lg" aria-hidden="true">…</svg></span>
  <h1 class="display page-title done__title">Thanks, Grace</h1>
  <p class="done__text">We’ve got your suggestion for <strong>Eastside Ladies Who Lift</strong>. …</p>
  <div class="done__actions"><a class="btn btn--primary btn--md" href="/directory">Back to the directory</a><a class="btn btn--secondary btn--md" href="/directory/suggest">Suggest another</a></div>
</section>

<div class="context-chip">
  <div class="context-chip__body"><p class="context-chip__label">About this page</p><p class="context-chip__value">Event series › Couch to 5K Run Club</p></div>
  <button class="icon-button icon-button--sm" type="button" aria-label="Remove page"><svg class="icon" aria-hidden="true">…</svg></button>
</div>''',
        "classes": [
            ("<code>.steps</code> <code>__item</code> <code>__n</code> <code>__title</code> <code>__text</code>", "Numbered steps with a connector."),
            ("<code>.done</code> <code>__icon</code> <code>__title</code> <code>__text</code> <code>__actions</code>", "Success state replacing a sent form."),
            ("<code>.context-chip</code> <code>__body</code> <code>__label</code> <code>__value</code>", "The page the feedback is about."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/suggest-listing/default", "steps"),
            mock("pages/suggest-listing/submitting", "steps while sending"),
            mock("pages/suggest-listing/success", "done, steps"),
            mock("pages/feedback/success", "done"),
            mock("pages/feedback/default", "context chip"),
            mock("pages/feedback/correction", "long chip value"),
            mock("pages/feedback/broken", "chip on an event"),
        ],
        "drift": """<ul>
<li>\"Remove page\" does not say which page; when the chip's value is long or truncated that matters. Proposed: \"Remove page: Couch to 5K Run Club\" in visually hidden text.</li>
<li>The mock puts <code>autofocus</code> on the Done <code>&lt;section&gt;</code>; <code>autofocus</code> only works on load. In the app, focus it from code when it replaces the form.</li>
</ul>""",
    },
}
