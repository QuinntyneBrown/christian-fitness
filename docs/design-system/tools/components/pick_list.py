from dslib import ex, icon, image, kbd, mock, themes

CUR = ' aria-current="page"'
STORIES = [("Why your rest day might be the most spiritual part of your training plan", "Faith &amp; Body · 11 hours ago", True),
           ("Inside the Scarborough kitchen prepping 300 healthy meals a week for shift workers", "Nutrition · 9 hours ago", True),
           ("The Tuesday walking group that got 40 seniors off the couch and into the park", "Community · Yesterday", True),
           ("Twelve GTA churches will run the Toronto Half as one team this fall", "Events · Yesterday", False)]
SERIES = [("Couch to 5K Run Club", "Every Tuesday · 6:30 PM", "31 / 40 joined"),
          ("Saturday Park Bootcamp", "Every Saturday · 8:00 AM", "38 / 50 joined"),
          ("Women’s Hoops &amp; Devotion", "Last Thursday of the month · 7:00 PM", "24 / 30 joined")]
SUGG = [("Eastside Ladies Who Lift", "Organization · Danforth &amp; Pape", "From Adaeze Kalu · 4 hours ago"),
        ("Coach Marcus Delaney", "Instructor · Mississauga", "Self-submitted · Yesterday"),
        ("Rooted Physio", "Company · Leslieville", "From Jordan Reid · 3 days ago")]
EVENTS = [("Easter Sunrise 5K", "Sat Apr 18", "Waterfront", "run"), ("Couch to 5K: Week 3", "Tue Apr 21", "Etobicoke", "run"),
          ("Saturday Park Bootcamp", "Sat Apr 25", "Waterfront", "bootcamp")]


def row(title, meta, on, uid, disabled=False, a=""):
    d = " disabled" if disabled else ""
    return (f'<li><label class="check check--ui pick-row"><input class="check__box" type="checkbox" name="{uid}"{" checked" if on else ""}{d}{a}>'
            f'<span><span class="pick-row__title">{title}</span><span class="pick-row__meta">{meta}</span></span></label></li>')


def pick_list(uid="pl", full=True):
    rows = "".join(row(t, m, on, f"{uid}-{i}", disabled=full and not on) for i, (t, m, on) in enumerate(STORIES))
    return (f'<fieldset><legend class="field__label">Also this week <span class="field__optional">· 3 of 3</span></legend>'
            f'<ul class="card card--list pick-list">{rows}</ul></fieldset>')


def series_card(i=0, cur=0, a=""):
    t, m, c = SERIES[i]
    return (f'<a class="pick-card" href="#"{CUR if i == cur else ""}{a}><span class="pick-card__title">{t}</span>'
            f'<span class="pick-card__meta">{m}</span><span class="pick-card__count">{c}</span></a>')


def sugg_card(i=1, cur=1, tag="", a=""):
    n, k, w = SUGG[i]
    tag_html = f'<span class="pick-card__tag">{tag}</span>' if tag else ""
    return (f'<a class="pick-card pick-card--light" href="#"{CUR if i == cur else ""}{a}><span class="pick-card__title">{n}{tag_html}</span>'
            f'<span class="pick-card__meta">{k}</span><span class="pick-card__meta">{w}</span></a>')


def cards(kind="series", stack=False, label="Series"):
    items = "".join(f"<li>{series_card(i) if kind == 'series' else sugg_card(i)}</li>" for i in range(3))
    return f'<nav aria-label="{label}"><ul class="pick-cards{" pick-cards--stack" if stack else ""}">{items}</ul></nav>'


def choice(i, uid, checked=False, disabled=False, a=""):
    t, w, area, img = EVENTS[i]
    return (f'<label class="event-choice"{a}><input class="event-choice__input" type="radio" name="{uid}"{" checked" if checked else ""}{" disabled" if disabled else ""}>'
            f'{image(img, "event-choice__image")}<span class="event-choice__body"><span class="event-choice__when">{w}</span>'
            f'<span class="event-choice__title">{t}</span><span class="event-choice__area">{area}</span></span></label>')


def choices(uid="ec", disabled=False):
    lis = "".join(f"<li>{choice(i, uid, i == 0, disabled)}</li>" for i in range(3))
    return f'<fieldset><legend class="field__label field__label--md">Event</legend><ul class="event-choices">{lis}</ul></fieldset>'


NOTE = ('<div class="pick-note"><div class="field"><label class="field__label" for="pn-note">Why it’s a pick</label>'
        '<textarea class="textarea" id="pn-note" rows="2" aria-describedby="pn-note-hint">Flat, stroller-friendly, and you finish as the sun comes up.</textarea>'
        '<span class="field__hint" id="pn-note-hint">One line. It goes on the graphics and in every caption. 59 of 70 characters.</span></div></div>')
EMPTY = ('<div class="pick-empty"><div class="pick-empty__art"><div class="pick-art pick-art--square" role="img" aria-label="Community Pick graphic: Easter Sunrise 5K, Sat Apr 18">'
         + image("run", "pick-art__photo") + '<div class="pick-art__shade"></div><p class="pick-art__label">Community Pick</p>'
         '<div class="pick-art__body"><p class="pick-art__title">Easter Sunrise 5K</p><p class="pick-art__when">Sat Apr 18 · 6:45 AM · Waterfront</p></div></div></div>'
         '<p class="pick-empty__title">Five files, four platforms, one click</p>'
         '<p class="pick-empty__text">Instagram post and story, a Facebook and Slack link image, and a WhatsApp square, each with its caption ready to paste.</p></div>')
BUILDER = ('<section class="card card--pad" aria-labelledby="bd-title" style="width: 100%;"><div class="cluster"><h3 class="display builder__title" id="bd-title">Issue #49</h3>'
           '<span class="status status--draft">Draft</span></div><div class="builder__fields stack-5">' + pick_list("bd") + '</div></section>'
           '<p class="builder__note">Add-on emails (event alerts, training plan, devotions) send on their own schedules.</p>')
COL = '<div style="width: 100%; max-width: 20rem;">{c}</div>'
WIDE = '<div style="width: 100%; min-width: 16rem; max-width: 24rem;">{c}</div>'


def grid(cols, rows):
    head = "".join(f'<th scope="col">{c}</th>' for c in cols)
    body = "".join(f'<tr><th scope="row">{label}</th>' + "".join("<td>—</td>" if c is None else f"<td>{c}</td>" for c in cells) + "</tr>"
                   for label, cells in rows)
    return f'<div class="ds-matrix"><table><thead><tr><th scope="col">Variant</th>{head}</tr></thead><tbody>{body}</tbody></table></div>'


def one(content):
    return f'<ul class="card card--list pick-list">{content}</ul>'


SPEC = {
    "lead": "Pick lists let staff choose what goes into something: stories for an issue, the series or suggestion to work on, the event for a Community Pick.",
    "meta": ["Status: new", "Admin console", "Checkboxes, radios and current links"],
    "overview": """<p>Three ways to choose, each with the native control that matches the choice:</p>
<ul>
<li><b>Pick list</b> (<code>.pick-list</code> of <code>.pick-row</code>s): several of a few with checkboxes, in the newsletter <b>builder</b> (<code>.builder</code>): \"Also this week · 3 of 3\". When the limit is reached the rest are disabled.</li>
<li><b>Pick cards</b> (<code>.pick-cards</code> of <code>.pick-card</code>s): links in a <code>&lt;nav&gt;</code> that choose which record the page shows; the shown one has <code>aria-current=\"page\"</code>. Dark when current for series; <code>--light</code> (a bordeaux ring) for listing suggestions.</li>
<li><b>Event choices</b> (<code>.event-choices</code> of <code>.event-choice</code>s): one of a few with radio buttons and a photo, for the Community Pick. Followed by the <b>pick note</b> (<code>.pick-note</code>) and, before anything is made, the <b>pick empty</b> preview (<code>.pick-empty</code>).</li>
</ul>
<p>Use <a href="chip.html">interest toggles</a> for short labels (the issue's events), a <a href="select.html">select</a> for one of many (the big story), and a <a href="table.html">table</a> for comparing records.</p>""",
    "anatomy": {
        "figure": COL.format(c=one(row(*STORIES[0], "an1")) + '<ul class="pick-cards pick-cards--stack" style="margin-top: var(--space-4);"><li>' + series_card(0) + "</li></ul>"),
        "callouts": [(8, 14), (50, 10), (50, 22), (50, 55), (50, 64), (50, 74)],
        "parts": [
            ("Checkbox", "Native <code>.check__box</code>, aligned to the first line."),
            ("Row title", "<code>.pick-row__title</code>: 16px semibold, snug."),
            ("Row meta", "<code>.pick-row__meta</code>: section and age, 14px muted."),
            ("Card title", "<code>.pick-card__title</code>, with an optional <code>__tag</code> at its end (\"Approved\")."),
            ("Card meta", "<code>.pick-card__meta</code>: cadence and time, or kind and area."),
            ("Count", "<code>.pick-card__count</code>: \"31 / 40 joined\" in accent (inverse text when current)."),
        ],
    },
    "variants": "<h3>Builder with a pick list</h3>" + ex(BUILDER, "Three of four chosen, the fourth disabled until one is unticked (admin newsletter).", True, mod="stack")
    + "<h3>Pick cards</h3>" + ex(COL.format(c=cards(stack=True)) + COL.format(c=cards("sugg", stack=True, label="Suggestions")),
                                 "Series (current is inverse) and listing suggestions (<code>--light</code>: current gets a bordeaux ring).", True)
    + "<h3>Event choices, pick note and empty preview</h3>" + ex(COL.format(c=choices() + NOTE) + WIDE.format(c=EMPTY),
                                                                "Community Pick before anything is made: one event, one line, and what will come.", True),
    "sizes": "<p>One size each. Pick rows: 12px × 16px padding. Pick cards: 16px padding; 16rem wide each in the phone scroller. Event choices: 10px padding with a 4rem × 3.5rem photo. The empty preview is at least 26rem tall.</p>",
    "states": {
        "intro": "<p>Pick rows and event choices are labels around a native input: checked and disabled come from the input. Pick cards are links: hover is forced with <code>data-state=\"hover\"</code>, focus with <code>data-state=\"focus\"</code>, current with <code>aria-current=\"page\"</code>.</p>",
        "matrix": grid(["Default", "Hover", "Focus", "Checked or current", "Disabled"], [
            ("Pick row", [WIDE.format(c=one(row(*STORIES[3][:2], False, "sr1"))), None,
                          WIDE.format(c=one(row(*STORIES[3][:2], False, "sr2", a=' data-state="focus"'))),
                          WIDE.format(c=one(row(*STORIES[0][:2], True, "sr3"))),
                          WIDE.format(c=one(row(*STORIES[3][:2], False, "sr4", disabled=True)))]),
            ("Pick card", [WIDE.format(c=series_card(1)), WIDE.format(c=series_card(1, a=' data-state="hover"')),
                           WIDE.format(c=series_card(1, a=' data-state="focus"')), WIDE.format(c=series_card(0)), None]),
            ("Pick card, light", [WIDE.format(c=sugg_card(0)), WIDE.format(c=sugg_card(0, a=' data-state="hover"')),
                                  WIDE.format(c=sugg_card(0, a=' data-state="focus"')), WIDE.format(c=sugg_card(1, tag="Approved")), None]),
            ("Event choice", [WIDE.format(c=choice(1, "se1")), None, WIDE.format(c=choice(1, "se2", a=' data-state="focus"')),
                              WIDE.format(c=choice(0, "se3", checked=True)), WIDE.format(c=choice(1, "se4", disabled=True))]),
        ]),
        "themes": themes(COL.format(c=cards(stack=True, label="Series theme")) + COL.format(c=cards("sugg", stack=True, label="Suggestions theme"))
                         + COL.format(c=choices("thc")), ""),
        "notes": """<ul>
<li><b>Hover</b> on pick rows and event choices: event choices darken their ring (<code>--color-border-hover</code>) on real hover only; there is no <code>data-state</code> hook to show it here. Pick rows have no hover style.</li>
<li><b>Disabled</b> event choices (while assets are created) look exactly like enabled ones: <code>.event-choice</code> has no disabled style. See Drift.</li>
<li><b>Read-only</b>: a scheduled issue disables every row; the list stays readable.</li>
<li><b>Loading</b>: pick cards and event choices are replaced by skeleton tiles of the same height.</li>
</ul>""",
    },
    "responsive": """<ul>
<li><b>Pick cards</b>: below 1024px a horizontal scroller of 16rem cards (scrollbar hidden; swipe or Tab to move); <code>--stack</code> keeps them stacked at every width. From 1024px they always stack in the 17.5rem or 18.75rem picker column (<code>.split--picker</code>, <code>--picker-wide</code>).</li>
<li><b>Event choices</b>: one column at every width; the title truncates with an ellipsis, the date and area do not.</li>
<li><b>Builder</b>: the issue card is the main column of <code>.split--builder</code>; the send column follows it below 1024px.</li>
</ul>""",
    "theming": "<p>Rows, cards and choices sit on <code>--color-bg-surface</code> with an inset <code>--color-border-default</code> ring, <code>--color-border-hover</code> on hover. Current pick card: <code>--color-bg-inverse</code>/<code>--color-fg-inverse</code> with its count in <code>--color-fg-inverse</code>; light current and checked event choice: a 2px <code>--color-fg-accent</code> ring. Dates and counts are <code>--color-fg-accent</code>; meta <code>--color-fg-muted</code>.</p>",
    "accessibility": {
        "pattern": "<p>Pick lists are checkboxes in a <code>&lt;fieldset&gt;</code> whose legend counts the limit (\"Also this week · 3 of 3\"). Event choices are a radio group (<a href=\"https://www.w3.org/WAI/ARIA/apg/patterns/radio/\">APG Radio Group</a>, native). Pick cards are links in a labelled <code>&lt;nav&gt;</code> (\"Series\", \"Suggestions\") with <code>aria-current=\"page\"</code>, not tabs: each loads a different record.</p>",
        "keys": [
            (kbd("Tab"), "Into the list, then from checkbox to checkbox; into the radio group once; from card to card."),
            (kbd("Space"), "Ticks or unticks a pick row."),
            (kbd("↑") + " / " + kbd("↓"), "Moves between event choices and selects."),
            (kbd("Enter"), "Opens a pick card's record."),
        ],
        "focus": "<p>Pick rows: the checkbox's own ring. Event choices: the whole card gets the shared ring when its radio has visible focus (<code>:has(:focus-visible)</code>). Pick cards: the shared ring around the card.</p>",
        "labelling": "<p>The whole row or card is the label, so title and meta are read with the control. The event photo is decorative. Pick card tags (\"Approved\", \"Declined\") are text. The empty preview's graphic has <code>role=\"img\"</code> and an <code>aria-label</code> naming the event.</p>",
        "pairs": [
            ("Row and card title", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Meta", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Count and date", "--color-fg-accent", "--color-bg-surface", 4.5),
            ("Current card", "--color-fg-inverse", "--color-bg-inverse", 4.5),
            ("Count on current card", "--color-fg-inverse", "--color-bg-inverse", 4.5),
            ("Selected ring", "--color-fg-accent", "--color-bg-surface", 3),
        ],
        "motion": "<p>Ring colour over <code>--duration-fast</code>; none under reduced motion.</p>",
        "touch": "<p>Every row, card and choice is the whole target and at least 56px tall; checkboxes and radios are small but their labels carry the tap.</p>",
    },
    "content": """<ul>
<li>Legends count the limit: \"Also this week · 3 of 3\".</li>
<li>Pick row: the story's headline, then \"Section · age\" (\"Nutrition · 9 hours ago\").</li>
<li>Series card: name, \"Every Tuesday · 6:30 PM\", \"31 / 40 joined\". Suggestion card: name, \"Instructor · Mississauga\", \"Self-submitted · Yesterday\".</li>
<li>Pick note hint counts characters: \"59 of 70 characters\". Empty preview: \"Five files, four platforms, one click\".</li>
</ul>""",
    "dodont": [
        ("do", WIDE.format(c=pick_list("dd1")), "Disable the rest once the limit is reached, and say the limit in the legend."),
        ("dont", WIDE.format(c=pick_list("dd2", full=False).replace("· 3 of 3", "")), "No limit shown and nothing disabled: the fourth tick fails only on save."),
        ("do", COL.format(c=cards(stack=True, label="Series do")), "Records to open are links with <code>aria-current</code>."),
        ("dont", COL.format(c=f'<ul class="event-choices"><li>{choice(0, "dd3", True)}</li><li>{choice(1, "dd3")}</li></ul>'.replace("Easter Sunrise 5K", "Couch to 5K Run Club")),
         "Radio choices to switch which series the page shows; changing a radio must not navigate."),
    ],
    "tokens": [
        ("Surface / ring / hover ring", "--color-bg-surface / --color-border-default / --color-border-hover", "color"),
        ("Current card", "--color-bg-inverse / --color-fg-inverse", "color"),
        ("Count on current", "--color-fg-inverse", "color"),
        ("Selected ring", "--color-fg-accent", "color"),
        ("Date and count", "--color-fg-accent", "color"),
        ("Meta", "--color-fg-muted", "color"),
        ("Empty border", "--color-border-default", "color"),
        ("Radius", "--radius-md / --radius-lg / --radius-xl", "value"),
        ("Disabled row", "--opacity-disabled", "value"),
        ("Row padding", "--space-3 / --space-4", "value"),
        ("Transition", "--duration-fast / --ease-standard", "value"),
    ],
    "code": {
        "snippet": '''<fieldset><legend class="field__label">Also this week <span class="field__optional">· 3 of 3</span></legend>
  <ul class="card card--list pick-list">
    <li><label class="check check--ui pick-row"><input class="check__box" type="checkbox" name="also" value="sabbath-rest" checked>
      <span><span class="pick-row__title">Why your rest day might be …</span><span class="pick-row__meta">Faith &amp; Body · 11 hours ago</span></span></label></li>
  </ul>
</fieldset>

<nav aria-label="Series"><ul class="pick-cards">
  <li><a class="pick-card" href="/admin/series/couch-to-5k" aria-current="page">
    <span class="pick-card__title">Couch to 5K Run Club</span><span class="pick-card__meta">Every Tuesday · 6:30 PM</span>
    <span class="pick-card__count">31 / 40 joined</span></a></li>
</ul></nav>

<ul class="event-choices">
  <li><label class="event-choice"><input class="event-choice__input" type="radio" name="event" value="sunrise-5k" checked>
    <img class="event-choice__image" src="run.jpg" alt="">
    <span class="event-choice__body"><span class="event-choice__when">Sat Apr 18</span><span class="event-choice__title">Easter Sunrise 5K</span><span class="event-choice__area">Waterfront</span></span>
  </label></li>
</ul>''',
        "classes": [
            ("<code>.builder__title</code> <code>__fields</code> <code>__note</code>", "Newsletter builder heading, field stack and footnote."),
            ("<code>.pick-list</code> <code>.pick-row</code> <code>__title</code> <code>__meta</code>", "Checkbox rows in a list card."),
            ("<code>.pick-cards</code> <code>--stack</code> <code>.pick-card</code> <code>--light</code>", "Current-link cards; scroller below 1024px unless stacked."),
            ("<code>.pick-card__title</code> <code>__meta</code> <code>__count</code> <code>__tag</code>", "Card text."),
            ("<code>.event-choices</code> <code>.event-choice</code> <code>__input</code> <code>__image</code> <code>__body</code> <code>__when</code> <code>__title</code> <code>__area</code>", "Radio cards with a photo."),
            ("<code>.pick-note</code> <code>.pick-empty</code> <code>__art</code> <code>__title</code> <code>__text</code>", "Note slot and the empty preview."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/admin-newsletter/default", "builder, pick list 3 of 3"),
            mock("pages/admin-newsletter/scheduled", "rows disabled"),
            mock("pages/admin-series/default", "pick cards, scroller"),
            mock("pages/admin-series/selected", "another series current"),
            mock("pages/admin-listings/default", "light pick cards, stacked"),
            mock("pages/admin-listings/approved", "Approved tag"),
            mock("pages/admin-community-pick/pick", "event choices, pick note, empty preview"),
            mock("pages/admin-community-pick/creating", "choices disabled"),
        ],
        "drift": """<ul>
<li>Fixed: the current series card's count used <code>--color-highlight</code> on <code>--color-bg-inverse</code> (1.70:1 in dark); it now uses <code>--color-fg-inverse</code>.</li>
<li>Fixed: the selected ring (<code>.pick-card--light[aria-current]</code>, <code>.event-choice:has(:checked)</code>) used <code>--color-accent</code> (2.16:1 on the dark surface); it now uses <code>--color-fg-accent</code>.</li>
<li>Fixed: <code>.event-choice</code> had no disabled style (the creating state disabled the radios but the cards looked live) and no <code>data-state="hover"</code> hook; both are added.</li>
<li><code>.builder</code> has no rule of its own; only its parts are styled.</li>
</ul>""",
    },
}
