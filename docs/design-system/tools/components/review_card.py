from dslib import ex, icon, image, kbd, mock, themes

SPIN = icon("loader", "icon--spin")


def review(a="", title="Fasting and training: what a dietitian wants you to know",
           label="Waiting for your review · Submitted 1 hour ago", meta="Priya Raman · Nutrition"):
    return (f'<a class="review-card" href="#"{a}><span class="review-card__body">'
            f'<span class="review-card__label">{label}</span>'
            f'<span class="review-card__title">{title}</span>'
            f'<span class="review-card__meta">{meta}</span></span>'
            f'<span class="btn btn--inverse btn--md review-card__action">Review {icon("arrow-right")}</span></a>')


def send(mode=""):
    label = "Scheduled for" if mode == "scheduled" else "Goes out"
    if mode == "scheduled":
        btn = '<button class="btn btn--on-brand btn--md btn--block" type="button">Unschedule to edit</button>'
    elif mode == "busy":
        btn = f'<button class="btn btn--inverse btn--md btn--block" type="submit" disabled aria-busy="true">{SPIN}Scheduling…</button>'
    else:
        a = ' data-state="focus"' if mode == "focus" else ""
        btn = f'<button class="btn btn--inverse btn--md btn--block" type="submit"{a}>{icon("send")}Schedule issue</button>'
    return (f'<section class="send-card" aria-label="Send ({mode or "default"})"><p class="send-card__label">{label}</p>'
            '<p class="send-card__date">Sat Apr 18</p><p class="send-card__meta">7:00 AM Eastern · 6,800 people</p>'
            f'{btn}</section>')


def panel(uid="p", ro=False, schedule=False):
    d = " disabled" if ro else ""
    when = (f'<div class="field-grid field-grid--2 panel__when"><div><label class="visually-hidden" for="{uid}-date">Date</label>'
            f'<input class="input input--sm" id="{uid}-date" type="date" value="2026-04-18"{d}></div>'
            f'<div><label class="visually-hidden" for="{uid}-time">Time</label><input class="input input--sm" id="{uid}-time" type="time" value="06:00"{d}></div></div>'
            if schedule else "")
    return (f'<section class="card card--pad-sm panel" aria-labelledby="{uid}-title">'
            f'<h3 class="display section-title" id="{uid}-title">Publishing</h3>'
            '<fieldset class="panel__group"><legend class="field__label">When</legend><div class="choice-group">'
            f'<label class="choice"><input class="choice__input" type="radio" name="{uid}-when"{"" if schedule else " checked"}{d}><span class="choice__label choice__label--plain">As soon as it’s published</span></label>'
            f'<label class="choice"><input class="choice__input" type="radio" name="{uid}-when"{" checked" if schedule else ""}{d}><span class="choice__label choice__label--plain">Schedule</span></label>'
            f'</div>{when}</fieldset>'
            f'<div class="panel__group panel__group--ruled"><div class="field"><label class="field__label" for="{uid}-placement">Front page</label>'
            f'<select class="select" id="{uid}-placement" name="placement"{d}><option>Lead story</option><option selected>Top headlines</option><option>The latest</option></select></div></div>'
            f'<label class="check check--ui panel__group panel__group--ruled"><input class="check__box" type="checkbox" name="weekly" checked{d}>'
            '<span><span class="panel__strong">Include in the Weekly</span><span class="panel__sub">Issue #49, Sat Apr 18</span></span></label>'
            '<p class="panel__note">Goes to the All stories and Nutrition RSS feeds when published.</p></section>')


def summary(uid="s", title="Couch to 5K Run Club", host="Lakeshore Runners Fellowship", img="run",
            when="Every Tuesday, 6:30 PM · Apr 7 – May 26", place="Humber Bay Park East",
            joined=(31, 40), price="Free", drop="Free", left="5 of 8"):
    pct = round(joined[0] / joined[1] * 100)
    return (f'<div class="card card--pad-sm series-summary-card">{image(img, "series-summary-card__image")}'
            f'<div class="series-summary-card__body"><h3 class="series-summary-card__title" id="{uid}-title">{title}</h3>'
            f'<p class="muted">Hosted by {host}</p>'
            f'<p class="series-summary-card__facts"><span>{icon("repeat")}{when}</span><span>{icon("map-pin")}{place}</span></p></div>'
            f'<button class="btn btn--secondary btn--sm" type="button">Edit details<span class="visually-hidden">: {title}</span></button>'
            '<dl class="series-summary-card__stats">'
            f'<div><dt>Joined</dt><dd>{joined[0]} of {joined[1]}</dd><dd><meter class="fill__meter" min="0" max="{joined[1]}" value="{joined[0]}">{pct}% full</meter></dd></div>'
            f'<div><dt>Price</dt><dd>{price}</dd><dd class="series-summary-card__sub">Drop-in {drop}</dd></div>'
            f'<div><dt>Sessions left</dt><dd>{left}</dd></div></dl></div>')


def grid(cols, rows):
    """A state matrix whose cells are given directly (None renders an em dash)."""
    head = "".join(f'<th scope="col">{c}</th>' for c in cols)
    body = "".join(f'<tr><th scope="row">{label}</th>' + "".join("<td>—</td>" if c is None else f"<td>{c}</td>" for c in cells) + "</tr>"
                   for label, cells in rows)
    return f'<div class="ds-matrix"><table><thead><tr><th scope="col">Variant</th>{head}</tr></thead><tbody>{body}</tbody></table></div>'


NARROW = '<div style="width: 100%; min-width: 18rem; max-width: 22rem;">{c}</div>'
PANEL_BOX = '<div style="width: 100%; min-width: 15rem; max-width: 20rem;">{c}</div>'

SPEC = {
    "lead": "The console's side cards: a call-out for the story waiting for review, the newsletter's send card, the editor's settings panels and the summary of a series.",
    "meta": ["Status: new", "Admin console", "<code>&lt;a&gt;</code>, <code>&lt;section&gt;</code>"],
    "overview": """<p>Four related cards hold what a staff member decides about one thing. They sit beside or above the work, never inside a table row.</p>
<ul>
<li><b>Review card</b> (<code>.review-card</code>): a whole-card link on the dark chrome, above the Stories table, for each story <i>In review</i>. One per story waiting; none when nothing waits.</li>
<li><b>Send card</b> (<code>.send-card</code>): the newsletter builder's dark card that says when the issue goes out and to how many, and holds Schedule issue.</li>
<li><b>Panel</b> (<code>.card.card--pad-sm.panel</code>): a settings card in the story editor's side column: when it publishes, where it sits on the front page, whether it goes in the Weekly. Groups inside are <code>.panel__group</code>, separated by <code>--ruled</code> hairlines.</li>
<li><b>Series summary card</b> (<code>.series-summary-card</code>): the chosen series' photo, name, host, cadence and place, Edit details, and three stats (joined with a meter, price, sessions left).</li>
</ul>
<p>Use a <a href="banner.html">banner</a> for a notice about the whole page, a <a href="card.html">card</a> for general grouping, and a <a href="stat.html">stat</a> for numbers on the dashboard. The member app's series panel is the <a href="series-card.html">series card</a>.</p>""",
    "anatomy": {
        "figure": NARROW.format(c=review()),
        "callouts": [(10, 18), (40, 42), (30, 62), (60, 86)],
        "parts": [
            ("Label", "<code>.review-card__label</code>: 14px semibold in <code>--color-highlight</code>: what waits and since when."),
            ("Title", "<code>.review-card__title</code>: the story's headline, 20px bold."),
            ("Meta", "<code>.review-card__meta</code>: writer and section in <code>--color-fg-on-chrome-muted</code>."),
            ("Action", "<code>.review-card__action</code>: a <code>&lt;span&gt;</code> drawn as an inverse button; the whole card is the link, so it is not a second control."),
        ],
    },
    "variants": "<h3>Review card</h3>" + ex(review(), "Above the Stories table, one per story in review (admin stories).", True)
    + "<h3>Send card</h3>" + ex(PANEL_BOX.format(c=send()) + PANEL_BOX.format(c=send("scheduled")),
                                 "Draft issue: Schedule issue. Scheduled: the label reads \"Scheduled for\" and the button \"Unschedule to edit\" (admin newsletter).", True)
    + "<h3>Panel</h3>" + ex(PANEL_BOX.format(c=panel("pv")) + PANEL_BOX.format(c=panel("pvs", schedule=True)),
                             "The story editor's Publishing panel; choosing Schedule adds date and time in <code>.panel__when</code>.", True)
    + "<h3>Series summary card</h3>" + ex(summary("sv"), "Couch to 5K Run Club chosen in the series picker (admin series).", True),
    "sizes": "<p>One size each; they fill their column. The review card is full width with 20px padding, 24px from 640px. The send card and panels sit in the 20rem side column of <code>.split--builder</code> and <code>.editor__grid</code>. The series summary image is 8rem × 6rem.</p>",
    "states": {
        "intro": "<p>The review card is a link: focus is forced with <code>data-state=\"focus\"</code> (the shared ring). It has no hover style and no disabled state. The send card's states are its button's. Panels and the summary card are containers; their states are their controls'.</p>",
        "matrix": grid(["Default", "Focus", "Busy", "Read-only"], [
            ("Review card", [NARROW.format(c=review()), NARROW.format(c=review(' data-state="focus"')), None, None]),
            ("Send card", [PANEL_BOX.format(c=send()), PANEL_BOX.format(c=send("focus")), PANEL_BOX.format(c=send("busy")), PANEL_BOX.format(c=send("scheduled"))]),
            ("Panel", [PANEL_BOX.format(c=panel("ps1")), None, None, PANEL_BOX.format(c=panel("ps2", ro=True))]),
        ]),
        "themes": themes(review() + summary("st") + PANEL_BOX.format(c=send()), "stack"),
        "notes": """<ul>
<li><b>Busy</b>: while the issue schedules, the send card's button reads \"Scheduling…\" with <code>aria-busy</code> (admin newsletter submitting); while a story saves, every panel control is <code>disabled</code> (story editor saving).</li>
<li><b>Scheduled</b> is the send card's locked state: the builder's fields are read-only and the only action is \"Unschedule to edit\" (<code>.btn--on-brand</code>).</li>
<li>The review card disappears when no story is in review; there is no empty review card.</li>
<li>In the dark theme the review card's action keeps <code>--color-fg-default</code> from <code>.review-card__action</code> on the white inverse fill, which fails contrast; see Drift.</li>
</ul>""",
    },
    "responsive": """<ul>
<li><b>Review card</b>: wraps, so below about 480px the action drops under the text; padding grows from 20px to 24px at 640px.</li>
<li><b>Send card and panels</b>: below 1024px the side column follows the main column (<code>.split--builder</code>, <code>.editor__grid</code>); from 1024px the column is 20rem and sticky (<code>.sticky-aside</code>, <code>.editor__side</code>).</li>
<li><b>Series summary card</b>: wraps; the stats row always takes the full width in three equal columns; Edit details falls under the text on narrow screens.</li>
</ul>""",
    "theming": "<p>Review and send cards use the chrome: <code>--color-bg-chrome</code> with <code>--color-fg-on-chrome</code>, the label in <code>--color-highlight</code> and meta in <code>--color-fg-on-chrome-muted</code>; they stay dark in both themes. Their buttons are inverse (<code>--color-bg-brand-inverse</code>/<code>--color-fg-brand-inverse</code>) and focus on the chrome uses <code>--color-focus-ring-on-dark</code>. Panels and the summary card are ordinary <a href=\"card.html\">cards</a> on <code>--color-bg-surface</code>; rules are <code>--color-border-default</code> and fact icons <code>--color-fg-accent</code>.</p>",
    "accessibility": {
        "pattern": "<p>The review card is one <code>&lt;a&gt;</code> whose text is its name; the \"Review\" pill inside is a <code>&lt;span&gt;</code>, not a nested control. The send card and panels are <code>&lt;section&gt;</code>s in an <code>&lt;aside aria-label&gt;</code> (\"Send\", \"Publishing\"); a panel's choices are a <code>&lt;fieldset&gt;</code> with a <code>&lt;legend&gt;</code>. The summary card's stats are a <code>&lt;dl&gt;</code>; the meter is a native <code>&lt;meter&gt;</code> with fallback text \"78% full\".</p>",
        "keys": [
            (kbd("Tab"), "Review card: one stop. Panels: each radio group, select and checkbox in turn."),
            (kbd("Enter"), "Opens the story in the editor (review card); schedules the issue (send card)."),
            (kbd("↑") + " / " + kbd("↓"), "Moves between \"As soon as it’s published\" and \"Schedule\"."),
            (kbd("Space"), "Ticks \"Include in the Weekly\"."),
        ],
        "focus": "<p>The review card shows the shared ring outside its <code>--radius-xl</code> corners in <code>--color-focus-ring</code> (it sits on the canvas). Buttons inside the send card use <code>--color-focus-ring-on-dark</code>.</p>",
        "labelling": "<p>The review card reads as: \"Waiting for your review · Submitted 1 hour ago, Fasting and training: …, Priya Raman · Nutrition, Review\". The summary card's Edit details adds the series name in visually hidden text. Date and time in a panel have visually hidden labels because the legend \"When\" names them.</p>",
        "pairs": [
            ("Review and send label", "--color-highlight", "--color-bg-chrome", 4.5),
            ("Title and date on chrome", "--color-fg-on-chrome", "--color-bg-chrome", 4.5),
            ("Meta on chrome", "--color-fg-on-chrome-muted", "--color-bg-chrome", 4.5),
            ("Send button", "--color-fg-brand-inverse", "--color-bg-brand-inverse", 4.5),
            ("Review action", "--color-fg-brand-inverse", "--color-bg-brand-inverse", 4.5),
            ("Panel note and sub", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Focus on chrome", "--color-focus-ring-on-dark", "--color-bg-chrome", 3),
        ],
        "motion": "<p>None of their own; buttons transition their fill over <code>--duration-fast</code>.</p>",
        "touch": "<p>The review card is one large target. Send card buttons are 44px tall and full width. Panel radios and the checkbox take their whole label as the target.</p>",
    },
    "content": """<ul>
<li>Review label: what is waiting and since when: \"Waiting for your review · Submitted 1 hour ago\"; the action is one verb: \"Review\".</li>
<li>Send card: \"Goes out\" then the date in display type (\"Sat Apr 18\"), then \"7:00 AM Eastern · 6,800 people\". Scheduled: \"Scheduled for\" and \"Unschedule to edit\".</li>
<li>Panel notes say what follows from the choice: \"Goes to the All stories and Nutrition RSS feeds when published.\"</li>
<li>Series stats are counts in words and numerals: \"31 of 40\", \"Drop-in $10\", \"5 of 8\".</li>
</ul>""",
    "dodont": [
        ("do", NARROW.format(c=review()), "The whole card is the link; \"Review\" is drawn inside it (admin stories)."),
        ("dont", NARROW.format(c=review().replace('<span class="btn btn--inverse btn--md review-card__action">', '<button class="btn btn--inverse btn--md review-card__action" type="button">').replace("</span></a>", "</button></a>")),
         "A real button inside the link: two nested controls, one tab stop that does two things."),
        ("do", PANEL_BOX.format(c=send()), "One primary action on the send card, naming the outcome: \"Schedule issue\"."),
        ("dont", PANEL_BOX.format(c=send().replace(f'{icon("send")}Schedule issue</button>', 'Submit</button><button class="btn btn--on-brand btn--md btn--block" type="button">Preview</button><button class="btn btn--on-brand btn--md btn--block" type="button">Send me a test</button>')),
         "Every action crammed into the dark card. Preview and Send me a test sit under it as secondary buttons."),
    ],
    "tokens": [
        ("Chrome card / text", "--color-bg-chrome / --color-fg-on-chrome", "color"),
        ("Label", "--color-highlight", "color"),
        ("Meta on chrome", "--color-fg-on-chrome-muted", "color"),
        ("Inverse button", "--color-bg-brand-inverse / --color-fg-brand-inverse", "color"),
        ("Focus on chrome", "--color-focus-ring-on-dark", "color"),
        ("Panel rule / note", "--color-border-default / --color-fg-muted", "color"),
        ("Fact icon", "--color-fg-accent", "color"),
        ("Radius", "--radius-xl", "value"),
        ("Padding", "--space-5 / --space-6", "value"),
        ("Send date", "--font-family-display / --font-size-4xl", "value"),
        ("Review title", "--font-size-xl / --line-height-snug", "value"),
    ],
    "code": {
        "snippet": '''<a class="review-card" href="/admin/stories/lent-fasting">
  <span class="review-card__body">
    <span class="review-card__label">Waiting for your review · Submitted 1 hour ago</span>
    <span class="review-card__title">Fasting and training: what a dietitian wants you to know</span>
    <span class="review-card__meta">Priya Raman · Nutrition</span>
  </span>
  <span class="btn btn--inverse btn--md review-card__action">Review <svg class="icon" aria-hidden="true">…</svg></span>
</a>

<section class="send-card">
  <p class="send-card__label">Goes out</p>
  <p class="send-card__date">Sat Apr 18</p>
  <p class="send-card__meta">7:00 AM Eastern · 6,800 people</p>
  <button class="btn btn--inverse btn--md btn--block" type="submit">…Schedule issue</button>
</section>

<section class="card card--pad-sm panel">
  <h2 class="display section-title">Publishing</h2>
  <fieldset class="panel__group"><legend class="field__label">When</legend>…</fieldset>
  <div class="panel__group panel__group--ruled">…select…</div>
  <p class="panel__note">Goes to the All stories and Nutrition RSS feeds when published.</p>
</section>''',
        "classes": [
            ("<code>.review-card</code> <code>__body</code> <code>__label</code> <code>__title</code> <code>__meta</code> <code>__action</code>", "Review call-out on the chrome."),
            ("<code>.send-card</code> <code>__label</code> <code>__date</code> <code>__meta</code>", "Newsletter send card; buttons inside get the on-dark focus ring."),
            ("<code>.panel</code> <code>__group</code> <code>__group--ruled</code> <code>__when</code>", "Settings panel groups, ruled separators, date and time row."),
            ("<code>.panel__strong</code> <code>__sub</code> <code>__note</code>", "Checkbox label lines and the panel's note."),
            ("<code>.series-summary-card</code> <code>__image</code> <code>__body</code> <code>__title</code> <code>__facts</code> <code>__stats</code> <code>__sub</code>", "Series summary with its stats."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/admin-stories/default", "review card"),
            mock("pages/admin-stories/filtered", "review card stays on a filtered list"),
            mock("pages/admin-newsletter/default", "send card"),
            mock("pages/admin-newsletter/scheduled", "Scheduled for, Unschedule to edit"),
            mock("pages/admin-newsletter/submitting", "Scheduling…"),
            mock("pages/admin-story-editor/default", "Publishing and details panels"),
            mock("pages/admin-story-editor/draft", "Schedule with date and time"),
            mock("pages/admin-story-editor/saving", "panels disabled"),
            mock("pages/admin-series/default", "series summary card"),
            mock("pages/admin-series/selected", "paid series with drop-in price"),
        ],
        "drift": """<ul>
<li>Fixed: <code>.review-card__action</code> set <code>--btn-fg: var(--color-fg-default)</code> on the white inverse fill (1.09:1 in dark); the override is removed, so the button keeps <code>--color-fg-brand-inverse</code>.</li>
<li>The review card has no hover style (and so no <code>data-state="hover"</code> hook), unlike every other whole-card link. Proposed: lighten to <code>--color-bg-chrome-current</code> on hover.</li>
<li><code>.panel</code> has no rule of its own: it is a <a href="card.html">card</a> plus <code>.panel__*</code> parts and a scoped <code>.panel .check--ui</code> alignment fix.</li>
</ul>""",
    },
}
