from dslib import ex, icon, kbd, matrix, mock, themes

EMAILS = [("newsletter", "The Abundant Weekly", "The week’s stories and events. Every Saturday, 7 AM.", True),
          ("events", "Event alerts", "New runs, workouts and retreats the day they post", True),
          ("plan", "Training plan of the week", "One short session to do on your own, Mondays", False),
          ("devotion", "Morning devotion", "Two minutes of scripture for body and spirit, weekdays", True)]
VISIBILITY = [("public", "Anyone", "Including people who aren’t signed in"), ("members", "Members", "Anyone signed in to Christian Fitness"),
              ("groups", "Just my groups", "People in the group chats you’re part of")]


def switch(name, label, desc, on, disabled=False, a=""):
    return (f'<label class="switch pref__row"><span class="switch__text"><span class="switch__label">{label}</span>'
            f'<span class="switch__desc">{desc}</span></span><input class="switch__input" type="checkbox" role="switch" name="{name}"'
            f'{" checked" if on else ""}{" disabled" if disabled else ""}{a}></label>')


def section(sid, title, sub, body):
    return (f'<section class="pref" id="{sid}" aria-labelledby="{sid}-title"><h2 class="display pref__title" id="{sid}-title">{title}</h2>'
            f'<p class="pref__sub">{sub}</p><div class="pref__rows">{body}</div></section>')


def email(sfx="", busy=False):
    rows = "".join(switch(f"email-{i}{sfx}", l, d, on, busy) for i, l, d, on in EMAILS)
    return section(f"email{sfx}", "Email", "3 of 4 emails on.",
                   rows + '<p class="pref__action"><button class="btn btn--link" type="button">Turn off all email</button></p>')


def privacy(sfx=""):
    radios = "".join(f'<label class="choice"><input class="choice__input" type="radio" name="visibility{sfx}" value="{v}"{" checked" if v == "members" else ""}>'
                     f'<span><span class="choice__label">{l}</span><span class="choice__desc">{d}</span></span></label>' for v, l, d in VISIBILITY)
    body = (f'<fieldset class="pref__row pref__row--block"><legend class="pref__legend">Who can see your profile</legend>'
            f'<div class="choice-group">{radios}</div></fieldset>'
            + switch(f"privacy-attendee{sfx}", "Show me on attendee lists", "Others going to an event can see you’re going", True)
            + switch(f"privacy-dms{sfx}", "Let anyone message me", "When off, only people in your groups can start a chat", False))
    return section(f"privacy{sfx}", "Privacy", "Who can see you on Christian Fitness.", body)


def suggestions(sfx=""):
    areas = "".join(f'<option{" selected" if a == "Scarborough" else ""}>{a}</option>' for a in ["Toronto East", "Scarborough", "Durham"])
    return section(f"suggestions{sfx}", "Suggestions", "What we use to pick events and stories for you.",
                   f'<div class="pref__row pref__row--block"><label class="pref__legend" for="f-area{sfx}">Your area</label>'
                   f'<select class="select pref__select" id="f-area{sfx}" name="area">{areas}</select></div>')


def account(sfx="", requested=False):
    dl = (f'<p class="pref__done" role="status">{icon("check")}Requested. We’ll email you a link within 24 hours.</p>' if requested
          else f'<button class="btn btn--secondary btn--sm" type="button">{icon("download")}Request download</button>')
    return section(f"account{sfx}", "Your data", "It’s yours. Take it with you or take it down.",
                   f'<div class="pref__row pref__row--split"><div><p class="pref__legend">Download your data</p>'
                   f'<p class="pref__desc">Your profile, events, messages and follows, as a .zip</p></div>{dl}</div>'
                   '<div class="pref__row pref__row--split"><div><p class="pref__legend">Delete your account</p>'
                   '<p class="pref__desc">Removes your profile and messages within 30 days</p></div>'
                   '<button class="btn btn--secondary btn--sm pref__delete" type="button">Delete account</button></div>'
                   '<p class="pref__note">Read how we handle your information in our <a class="link" href="#">Privacy Policy</a>.</p>')


NAV = ('<nav class="side-nav" aria-label="Preference sections"><ul class="side-nav__list">'
       + "".join(f'<li><a class="side-nav__link" href="#{i}-p">{l}</a></li>' for i, l in
                 [("email", "Email"), ("privacy", "Privacy"), ("suggestions", "Suggestions"), ("account", "Your data")])
       + '</ul></nav>')
PAGE = (f'<form class="prefs" action="#">{NAV}<div class="prefs__sections">{email("-p")}{privacy("-p")}'
        f'{suggestions("-p")}{account("-p")}</div></form>')

STATES = [("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'), ("Disabled", " disabled")]

SPEC = {
    "lead": "Preference rows hold one setting each, with what it means, in titled groups on the Preferences page: switches, a choice, a select or an action.",
    "meta": ["Status: new", "<code>&lt;section&gt;</code> groups of <a href=\"switch.html\">switches</a> and fields", "Member app: Preferences"],
    "overview": f"""<p>Use preference rows to lay out a person's settings: which emails and notifications arrive, who can see them, what suggestions use, and their data. Each <b>section</b> (<code>.pref</code>) has a display title, a one-line summary and its rows (<code>.pref__rows</code>), separated by hairlines. A row is one of:</p>
<ul>
<li><b>Switch row</b> (<code>.switch.pref__row</code>): the <a href="switch.html">switch</a> with its label and description, at 16px.</li>
<li><b>Block row</b> (<code>.pref__row--block</code>): a legend or label over a <a href="radio-group.html">radio group</a>, a <a href="select.html">select</a> (<code>.pref__select</code>) or <a href="chip.html">interest toggles</a>.</li>
<li><b>Split row</b> (<code>.pref__row--split</code>): a title and description on the left, an action on the right: Request download, Delete account (<code>.pref__delete</code>, danger outline).</li>
<li>After the rows: an <b>action</b> (<code>.pref__action</code>, \"Turn off all email\"), a <b>note</b> (<code>.pref__note</code>) or a <b>done</b> message (<code>.pref__done</code>).</li>
</ul>
<p><code>.prefs</code> lays the page out: a <a href="side-navigation.html">side navigation</a> of the sections and the sections themselves. On Preferences nothing saves until Save in the <a href="save-bar.html">save bar</a>, so the switches here wait for it, unlike a lone switch.</p>""",
    "anatomy": {
        "figure": email("-a"),
        "callouts": [(16, 19), (16, 25), (16, 35), (85, 35), (16, 86)],
        "parts": [
            ("Title", "<code>.pref__title</code>: display italic caps, 30px (<code>--font-size-3xl</code>), an <code>&lt;h2&gt;</code> that names the section."),
            ("Summary", "<code>.pref__sub</code>: muted; says where the section stands: \"3 of 4 emails on.\""),
            ("Row", "<code>.pref__row</code>: 16px padding top and bottom, a hairline <code>--color-border-default</code> rule between rows."),
            ("Control", "The row's switch, at the row's end; the label and description wrap beside it."),
            ("Action", "<code>.pref__action</code>: a link button after the rows that acts on the whole section."),
        ],
    },
    "variants": "<h3>Switch rows and a section action</h3>"
    + ex(email("-v"), "Email: four switches and \"Turn off all email\".", True, mod="stack")
    + "<h3>Block rows</h3>"
    + ex(privacy("-v"), "Privacy: a radio group under a legend, then two switch rows.", True, mod="stack")
    + ex(suggestions("-v"), "Suggestions: a select under its label.", True, mod="stack")
    + "<h3>Split rows, note and done</h3>"
    + ex(account("-v"), "Your data: two split rows and a note.", True, mod="stack")
    + ex(account("-r", requested=True), "Download requested: the button gives way to a done message.", True, mod="stack")
    + "<h3>The page</h3>"
    + ex(PAGE, "<code>.prefs</code>: side navigation and sections, in two columns from 1024px (one column inside this frame).", True, mod="stack"),
    "sizes": "<p>One size. Switch rows take the switch's 44px minimum plus 16px padding top and bottom; the title is 30px; the select is capped at <code>--layout-conversations-width</code> (320px). Sections are 32px apart (<code>--space-8</code> padding), the first with none above.</p>",
    "states": {
        "intro": "<p>A row's states are its control's: the switch's hover and focus are forced here with <code>data-state</code>, checked and disabled are real attributes. The page adds three states of its own, carried by the <a href=\"save-bar.html\">save bar</a>: unsaved, saving (every control disabled) and saved or failed.</p>",
        "matrix": matrix(STATES + [("Checked", " checked")], [
            ("Switch row", switch("m", "Event alerts", "New runs, workouts and retreats the day they post", False, a="{a}")),
        ]),
        "themes": themes(email("-t") + account("-t"), "stack"),
        "notes": f"""<ul>
<li><b>Unsaved</b>: a change shows the save bar (\"Unsaved changes\", Save); the summary updates at once (\"4 of 4 emails on.\").</li>
<li><b>Saving</b>: every switch, radio, select and toggle is disabled until the answer comes back.</li>
<li><b>Unsubscribed</b>: \"Turn off all email\" turns the four switches off and the summary reads \"You won't get any email from us except receipts and security notices.\"; the action goes away.</li>
<li><b>Download requested</b>: <code>.pref__done</code> with <code>role=\"status\"</code> replaces the button.</li>
<li><b>Loading</b>: each section shows skeleton rows inside <code>.pref__rows</code>.</li>
</ul>""" + ex(email("-s", busy=True), "Saving: every switch disabled.", mod="stack"),
    },
    "responsive": """<ul>
<li>Below 1024px (<code>--layout-breakpoint-lg</code>) <code>.prefs</code> is one column: the side navigation, then the sections, 40px apart.</li>
<li>From 1024px it is two columns: a 200px side navigation and sections up to 720px wide, 64px apart; the navigation sticks under the header (<code>--layout-sticky-offset</code>), and each section scrolls to just below it (<code>scroll-margin-top</code>).</li>
<li>Switch labels and descriptions wrap beside the switch at every width. Split rows wrap: on a phone the button drops under its text.</li>
</ul>""",
    "theming": "<p>Rules <code>--color-border-default</code>; summary, descriptions and note <code>--color-fg-muted</code>; done message <code>--color-fg-accent</code>; Delete account outlined in <code>--color-danger-border</code> with <code>--color-danger-fg</code> text. Switch colours are the <a href=\"switch.html\">switch</a>'s. All follow the theme.</p>",
    "accessibility": {
        "pattern": "<p>Each section is a <code>&lt;section aria-labelledby&gt;</code> named by its <code>&lt;h2&gt;</code>, reachable from the side navigation's in-page links. Switch rows are the native <a href=\"https://www.w3.org/WAI/ARIA/apg/patterns/switch/\">APG Switch</a> (checkbox with <code>role=\"switch\"</code>) inside its label; block rows are a <code>&lt;fieldset&gt;</code> with a <code>&lt;legend&gt;</code>, or a <code>&lt;label for&gt;</code> and its select.</p>",
        "keys": [
            (kbd("Tab"), "Moves through the controls, section by section."),
            (kbd("Space"), "Flips a switch or toggles an interest."),
            (kbd("↑") + " / " + kbd("↓"), "Chooses within the radio group; changes the select."),
            (kbd("Enter"), "Follows a side navigation link to its section; presses an action."),
        ],
        "focus": "<p>Each control's own ring: 2px <code>--color-focus-ring</code> at 2px offset around the switch track, the radio and the buttons; the select's accent border and halo.</p>",
        "labelling": "<p>A switch's name is its label and description (\"Event alerts, New runs, workouts…\"); the section title gives context. The legend names a group of radios or interests. The done message is a <code>role=\"status\"</code> live region, so it is announced when it replaces the button.</p>",
        "pairs": [
            ("Title and labels", "--color-fg-default", "--color-bg-canvas", 4.5),
            ("Summary, descriptions, note", "--color-fg-muted", "--color-bg-canvas", 4.5),
            ("Done message", "--color-fg-accent", "--color-bg-canvas", 4.5),
            ("Delete account label", "--color-danger-fg", "--color-bg-canvas", 4.5),
            ("Switch track off (non-text)", "--color-border-strong", "--color-bg-canvas", 3),
            ("Focus ring on canvas", "--color-focus-ring", "--color-bg-canvas", 3),
        ],
        "motion": "<p>Only the switch's own thumb transition (<code>--duration-fast</code>), instant under reduced motion.</p>",
        "touch": "<p>Switch rows are the whole row: at least 44px plus padding. The small buttons extend to 44 × 44px on coarse pointers; \"Turn off all email\" is a link button 24px tall (<code>--target-min</code>) with no extension.</p>",
    },
    "content": """<ul>
<li>Section titles are one or two words: \"Email\", \"Notifications\", \"Privacy\", \"Suggestions\", \"Your data\".</li>
<li>The summary says where things stand, in the member's terms: \"3 of 4 emails on.\", \"Who can see you on Christian Fitness.\"</li>
<li>Labels name the setting, never the state: \"Let anyone message me\"; the description says what on means, or what off means when that is the surprise: \"When off, only people in your groups can start a chat\".</li>
<li>Recommend gently when a setting matters: \"We recommend keeping this on.\"</li>
<li>Data actions say what happens and when: \"Removes your profile and messages within 30 days\".</li>
</ul>""",
    "dodont": [
        ("do", section("dd1", "Privacy", "Who can see you on Christian Fitness.",
                       switch("dd1-a", "Let anyone message me", "When off, only people in your groups can start a chat", False)),
         "The label names the setting; the description explains the off state."),
        ("dont", section("dd2", "Privacy", "", switch("dd2-a", "Don’t let strangers message me", "", True)),
         "A negative label with no description: is on \"strangers can\" or \"cannot\"?"),
        ("do", account("-dd3"), "Danger-outlined Delete account in its own split row, beside what it removes."),
        ("dont", section("dd4", "Your data", "", '<div class="pref__row pref__row--split"><div><p class="pref__legend">Delete your account</p></div>'
                         '<button class="btn btn--danger btn--sm" type="button">Delete</button></div>'),
         "A solid danger button that acts in place, with no description: deleting opens a confirmation dialog first."),
    ],
    "tokens": [
        ("Row rules", "--color-border-default", "color"),
        ("Summary, descriptions, note", "--color-fg-muted", "color"),
        ("Done message", "--color-fg-accent", "color"),
        ("Delete account", "--color-danger-fg / --color-danger-border", "color"),
        ("Title size / line height", "--font-size-3xl / --line-height-3xl", "value"),
        ("Section padding / gap from sticky header", "--space-8 / --layout-sticky-offset", "value"),
        ("Row padding / rows top margin", "--space-4 / --space-2", "value"),
        ("Page gap one / two columns", "--space-10 / --space-16", "value"),
        ("Select max width", "--layout-conversations-width", "value"),
        ("Switch row text", "--font-size-md", "value"),
        ("Split gap / note and action padding", "--space-3 / --space-4 / --space-2", "value"),
    ],
    "code": {
        "snippet": '''<form class="prefs" action="/preferences">
  <nav class="side-nav" aria-label="Preference sections">…</nav>
  <div class="prefs__sections">
    <section class="pref" id="email" aria-labelledby="email-title">
      <h2 class="display pref__title" id="email-title">Email</h2>
      <p class="pref__sub">3 of 4 emails on.</p>
      <div class="pref__rows">
        <label class="switch pref__row">
          <span class="switch__text"><span class="switch__label">Event alerts</span>
          <span class="switch__desc">New runs, workouts and retreats the day they post</span></span>
          <input class="switch__input" type="checkbox" role="switch" name="email-events" checked>
        </label>
        <p class="pref__action"><button class="btn btn--link" type="button">Turn off all email</button></p>
      </div>
    </section>
  </div>
</form>''',
        "classes": [
            ("<code>.prefs</code>", "Page layout: side navigation and sections, two columns from 1024px."),
            ("<code>.pref</code> <code>.pref__title</code> <code>.pref__sub</code> <code>.pref__rows</code>", "A section, its title, summary and rows."),
            ("<code>.pref__row</code> <code>--block</code> <code>--split</code>", "A row; stacked label and control; text with an action."),
            ("<code>.pref__legend</code> <code>.pref__desc</code> <code>.pref__select</code>", "Row title, description, capped select."),
            ("<code>.pref__action</code> <code>.pref__note</code> <code>.pref__done</code> <code>.pref__delete</code>", "Section action, note, done message, danger-outlined button."),
            ("<code>.prefs__sections</code>", "Wrapper for the sections as the mocks write it; it has no rule of its own."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/preferences/default", "every row kind"),
            mock("pages/preferences/unsaved", "save bar after a change"),
            mock("pages/preferences/saving", "every control disabled"),
            mock("pages/preferences/unsubscribed", "all email off, summary updated"),
            mock("pages/preferences/download-requested", "done message"),
            mock("pages/preferences/loading", "skeleton rows"),
        ],
        "drift": "Switches are the design system's switch, and nothing saves until Save, as the frame draws it; saving, failed and download-requested were added (mocks README: Preferences). <code>.prefs__sections</code> appears in the mocks with no rule in components.css. \"Turn off all email\" is a 24px link button with no coarse-pointer hit area.",
    },
}
