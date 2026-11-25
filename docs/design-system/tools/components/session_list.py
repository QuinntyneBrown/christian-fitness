from dslib import ex, icon, kbd, mock, themes


def vmatrix(variant, rows):
    """A state matrix for wide blocks: states down, one variant column. rows: (state, html or None)."""
    body = "".join(f'<tr><th scope="row">{st}</th><td>{"—" if h is None else h}</td></tr>' for st, h in rows)
    return (f'<div class="ds-matrix"><table><thead><tr><th scope="col">State</th><th scope="col">{variant}</th></tr></thead>'
            f'<tbody>{body}</tbody></table></div>')


def meter(bars):
    mods = {"d": " session-meter__bar--done", "n": " session-meter__bar--next", "c": " session-meter__bar--cancelled"}
    return ('<span class="session-meter" aria-hidden="true">'
            + "".join(f'<span class="session-meter__bar{mods.get(b, "")}"></span>' for b in bars) + "</span>")


def srow(mod, month, day, n, wd, topic, end="", next_up=False):
    cls = f"session-row session-row--{mod}" if mod else "session-row"
    up = " · Next up" if next_up else ""
    return (f'<li class="{cls}"><div class="session-row__date" aria-hidden="true"><span class="session-row__month">{month}</span>'
            f'<span class="session-row__day">{day}</span></div><div class="session-row__body">'
            f'<p class="session-row__meta">Session {n} · {wd}<span class="visually-hidden">, {month} {day}</span>{up}</p>'
            f'<p class="session-row__topic">{topic}</p></div><div class="session-row__end">{end}</div></li>')


CAME = f'<span class="session-row__came">{icon("check")}You came</span>'
DONE = '<span class="session-row__status">Done</span>'
MISSED = '<span class="session-row__status">Missed</span>'
CANCELLED = '<span class="session-row__status">Cancelled</span>'


def details(n, a=""):
    return (f'<a class="btn btn--secondary btn--xs" href="#"{a}>Details<span class="visually-hidden"> of session {n}</span> '
            f'{icon("arrow-right", "icon--xs")}</a>')


def drop(n, when, checked=False):
    c = " checked" if checked else ""
    return (f'<label class="check"><input class="check__box" type="checkbox" name="dates" value="{n}"{c}> '
            f'<span>Drop in<span class="visually-hidden"> on {when}</span></span></label>')


JOINED = ('<ol class="list-ruled session-list">'
          + srow("past", "Apr", "07", 1, "Tue", "Walk, run 60 seconds, repeat. Meet your pace group", CAME)
          + srow("past", "Apr", "14", 2, "Tue", "Run 90 seconds, walk 2 minutes", CAME)
          + srow("next", "Apr", "21", 3, "Tue", "Same intervals, six times through", details(3), True)
          + srow("", "Apr", "28", 4, "Tue", "First 5-minute run")
          + srow("cancelled", "May", "12", 6, "Tue", "No class: Victoria Day week", CANCELLED)
          + "</ol>")
DROPIN = ('<ol class="list-ruled session-list">'
          + srow("past", "Apr", "18", 3, "Sat", "Upper body and carries", DONE)
          + srow("next", "Apr", "25", 4, "Sat", "Partner circuits", drop(4, "Sat, Apr 25", True), True)
          + srow("", "May", "02", 5, "Sat", "Hills and sprints", drop(5, "Sat, May 02"))
          + "</ol>")
LOADING = ('<ol class="list-ruled session-list" aria-busy="true" aria-label="Loading sessions"><li class="session-row">'
           '<span class="skeleton skeleton--date"></span><div class="session-row__body skeleton-stack">'
           '<span class="skeleton skeleton--text-sm w-30"></span><span class="skeleton skeleton--text w-80"></span></div></li></ol>')


def arow(mod, n, date, topic, end):
    cls = f"admin-session admin-session--{mod}" if mod else "admin-session"
    return (f'<li class="{cls}"><span class="admin-session__n" aria-hidden="true">{n}</span><span class="admin-session__date">{date}</span>'
            f'<span class="admin-session__topic">{topic}</span><span class="admin-session__end">{end}</span></li>')


def cancel(n, date, a=""):
    return (f'<button class="btn btn--link btn--link-quiet" type="button"{a}>Cancel date<span class="visually-hidden">: session {n}, {date}</span></button>')


ADMIN = ('<ol class="card card--list admin-sessions">'
         + arow("past", 2, "Tue Apr 14", "Run 90 seconds, walk 2 minutes", '<span class="admin-session__done">Done</span>')
         + arow("", 3, "Tue Apr 21", "Same intervals, six times through",
                '<span class="status status--published">Live</span>' + cancel(3, "Tue Apr 21"))
         + arow("", 4, "Tue Apr 28", "First 5-minute run", cancel(4, "Tue Apr 28"))
         + arow("cancelled", 6, "Tue May 12", "No class: Victoria Day week",
                '<span class="status status--cancelled">Cancelled</span><button class="btn btn--link" type="button">Restore'
                '<span class="visually-hidden"> session 6, Tue May 12</span></button>')
         + "</ol>")

SPEC = {
    "lead": "The session list shows every date of a series in order: which are done, which is next, which were cancelled, and what each one is about.",
    "meta": ["Status: new", "Ordered list <code>&lt;ol&gt;</code>", "Member app and admin console"],
    "overview": """<p>A series' dates are an ordered list: the order is the program. Three blocks share the job:</p>
<ul>
<li><b>Session row</b> (<code>.session-row</code> in a <code>.list-ruled.session-list</code>): the member's series page. A date tile, \"Session 3 · Tue\", the topic, and an end slot: \"You came\", Done or Missed, Details for the next date, a Drop in tick box, or Cancelled.</li>
<li><b>Session meter</b> (<code>.session-meter</code>): one bar per date, a glance at the same list in <a href="series-card.html">series rows</a> and series progress.</li>
<li><b>Admin sessions</b> (<code>.admin-sessions</code> of <code>.admin-session</code>): the admin Series screen, where staff cancel or restore a date.</li>
</ul>
<p>Use a <a href="list.html">list of event rows</a> for unrelated events, and the <a href="series-card.html">series card</a> for the next three dates on a session's own page.</p>""",
    "anatomy": {
        "figure": '<ol class="list-ruled session-list">' + srow("next", "Apr", "21", 3, "Tue", "Same intervals, six times through", details(3), True) + "</ol>",
        "callouts": [(12, 50), (30, 32), (30, 66), (84, 50)],
        "parts": [
            ("Date tile", "<code>.session-row__date</code>, 56px column (<code>--size-date-badge</code>): month over a display day; filled accent for the next date, outlined for upcoming, bare and muted for past and cancelled. <code>aria-hidden</code>."),
            ("Meta", "\"Session 3 · Tue\" with the date in visually hidden text, and \"· Next up\" on the next one; accent then, muted otherwise."),
            ("Topic", "What the session is about; semibold, regular and muted once past, struck through when cancelled."),
            ("End", "<code>.session-row__end</code>: Details (next), \"You came\" (accent, with a check), Done or Missed, Cancelled, or a Drop in tick box."),
        ],
    },
    "variants": "<h3>Member: joined series</h3>"
    + ex(JOINED, "Past with \"You came\", next with Details, upcoming, cancelled (event-series/default).", True, mod="block")
    + "<h3>Member: dropping in</h3>"
    + ex(DROPIN, "\"Pick dates to drop in\" chosen: each open date ends in a Drop in tick box; past ones say Done (event-series/drop-in).", True, mod="block")
    + "<h3>Session meter</h3>"
    + ex(meter("ddnuucuu") + '<p class="visually-hidden">2 of 7 sessions done</p>',
         "Done, next, upcoming, a cancelled bar at reduced opacity. Always <code>aria-hidden</code> with the count in text.", True, mod="block")
    + "<h3>Admin sessions</h3>"
    + ex(ADMIN, "Numbered rows on the admin Series screen: Done, Live with Cancel date, upcoming, Cancelled with Restore (admin-series/default).", True, mod="block"),
    "sizes": "<p>One size. Member rows are 16px top and bottom with a 56px date tile; admin rows are 16px × 20px and wrap under 12rem of topic. Meter bars are 6px tall in a series row and 8px in series progress.</p>",
    "states": {
        "intro": "<p>Rows are not links; the state of a session is a modifier (<code>--next</code>, <code>--past</code>, <code>--cancelled</code>) because it changes the whole row, and each state is also said in words in the meta or end slot. Interactive states belong to the controls in the end slot (<a href=\"button.html\">button</a>, <a href=\"checkbox.html\">checkbox</a>).</p>",
        "matrix": vmatrix("Session row", [
            ("Upcoming", '<ol class="list-ruled session-list">' + srow("", "Apr", "28", 4, "Tue", "First 5-minute run") + "</ol>"),
            ("Next", '<ol class="list-ruled session-list">' + srow("next", "Apr", "21", 3, "Tue", "Same intervals, six times through", details(3), True) + "</ol>"),
            ("Next, Details focused", '<ol class="list-ruled session-list">' + srow("next", "Apr", "21", 3, "Tue", "Same intervals, six times through", details(3, ' data-state="focus"'), True) + "</ol>"),
            ("Past, came", '<ol class="list-ruled session-list">' + srow("past", "Apr", "07", 1, "Tue", "Walk, run 60 seconds, repeat", CAME) + "</ol>"),
            ("Past, missed", '<ol class="list-ruled session-list">' + srow("past", "Apr", "07", 1, "Tue", "Walk, run 60 seconds, repeat", MISSED) + "</ol>"),
            ("Cancelled", '<ol class="list-ruled session-list">' + srow("cancelled", "May", "12", 6, "Tue", "No class: Victoria Day week", CANCELLED) + "</ol>"),
            ("Drop in, ticked", '<ol class="list-ruled session-list">' + srow("", "May", "09", 6, "Sat", "Mother’s Day mobility", drop(6, "Sat, May 09", True)) + "</ol>"),
        ]) + vmatrix("Admin session", [
            ("Past", '<ol class="card card--list admin-sessions">' + arow("past", 2, "Tue Apr 14", "Run 90 seconds, walk 2 minutes", '<span class="admin-session__done">Done</span>') + "</ol>"),
            ("Live", '<ol class="card card--list admin-sessions">' + arow("", 3, "Tue Apr 21", "Same intervals, six times through", '<span class="status status--published">Live</span>' + cancel(3, "Tue Apr 21")) + "</ol>"),
            ("Upcoming, Cancel date hovered", '<ol class="card card--list admin-sessions">' + arow("", 4, "Tue Apr 28", "First 5-minute run", cancel(4, "Tue Apr 28", ' data-state="hover"')) + "</ol>"),
            ("Cancelled", '<ol class="card card--list admin-sessions">' + arow("cancelled", 6, "Tue May 12", "No class: Victoria Day week", '<span class="status status--cancelled">Cancelled</span><button class="btn btn--link" type="button">Restore<span class="visually-hidden"> session 6, Tue May 12</span></button>') + "</ol>"),
        ])
        + "<h3>Loading</h3>" + ex(LOADING, "Skeleton rows: a date block and two text lines (event-series/loading).", True, mod="block"),
        "themes": themes(JOINED, mod="block") + themes(ADMIN, mod="block"),
        "notes": """<ul>
<li><b>Next</b> fills the date tile with <code>--color-accent</code> and adds \"Next up\" to the meta; <b>cancelled</b> strikes the topic and says \"Cancelled\": neither relies on colour or the line alone.</li>
<li>Cancelling a date opens the <a href="dialog.html">Cancel this date?</a> dialog; after it, the row reads Cancelled with Restore and a toast says who was told (admin-series/date-cancelled).</li>
</ul>""",
    },
    "responsive": """<ul>
<li><b>Session row</b>: the same three columns at every width (56px tile, flexible body, end slot sized to its content); topics wrap, the end never shrinks.</li>
<li><b>Admin session</b>: number, date, topic and end sit on one line when there is room; the row wraps so the end goes below the topic on narrow panels (<code>flex-wrap</code>, topic basis 12rem).</li>
<li><b>Meter</b>: bars share the width equally; in a series row it is capped at <code>--layout-conversations-width</code>.</li>
</ul>""",
    "theming": "<p>Date tiles read <code>--color-bg-surface</code> with a <code>--color-border-default</code> ring, the next one <code>--color-accent</code>/<code>--color-fg-on-accent</code>. Month, next meta and \"You came\" are <code>--color-fg-accent</code>; meta, status and past text <code>--color-fg-muted</code>. Admin rows reuse <a href=\"badge.html\">status badges</a> and quiet link buttons (<code>.btn--link-quiet</code>, <code>--color-fg-muted</code>).</p>",
    "accessibility": {
        "pattern": "<p>An <code>&lt;ol&gt;</code>: the order is meaningful and screen readers announce \"list, 8 items\". The date tile is <code>aria-hidden</code> and repeated in the meta's visually hidden text (\"Session 3 · Tue, Apr 21 · Next up\"). Controls in the end slot name their session in hidden text: \"Details of session 3\", \"Drop in on Sat, Apr 25\", \"Cancel date: session 4, Tue Apr 28\".</p>",
        "keys": [
            (kbd("Tab"), "Moves only between the controls in end slots (Details, Drop in, Cancel date, Restore); rows themselves are not focusable."),
            (kbd("Space"), "Ticks or unticks a Drop in box."),
            (kbd("Enter"), "Follows Details; activates Cancel date or Restore."),
        ],
        "focus": "<p>The shared ring on each control. After Cancel date's dialog closes, focus returns to the row's Restore button.</p>",
        "labelling": "<p>Row states are announced from text: \"Next up\", \"You came\", \"Done\", \"Missed\", \"Cancelled\". The struck-through topic is not the only cue. The meter is <code>aria-hidden</code>; its count (\"2 of 7 sessions done\") is visually hidden text.</p>",
        "pairs": [
            ("Topic", "--color-fg-default", "--color-bg-canvas", 4.5),
            ("Meta, status, past topic", "--color-fg-muted", "--color-bg-canvas", 4.5),
            ("Month, next meta, You came", "--color-fg-accent", "--color-bg-canvas", 4.5),
            ("Next date tile", "--color-fg-on-accent", "--color-accent", 4.5),
            ("Upcoming tile month", "--color-fg-accent", "--color-bg-surface", 4.5),
            ("Admin row text", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Meter bars (decorative)", "--color-border-default", "--color-bg-surface", 1),
        ],
        "motion": "<p>None in the rows; the controls use their own transitions.</p>",
        "touch": "<p>Details is a 36px button whose target extends to 44 × 44px on coarse pointers (<code>.session-row .btn--xs</code>); the Drop in label is the target for its box. Admin Cancel date and Restore are 24px link buttons whose target extends to 44 × 44px on coarse pointers.</p>",
    },
    "content": """<ul>
<li>Meta: \"Session 3 · Tue\"; add \"· Next up\" to the next one only.</li>
<li>Topics say what happens that day, in sentence case: \"First 5-minute run\", \"No class: Victoria Day week\".</li>
<li>End words: \"You came\" for the member's own attendance; \"Done\" when they had not joined; \"Missed\" when they joined and did not come; \"Cancelled\".</li>
<li>Admin dates read \"Tue Apr 21\"; actions are \"Cancel date\" and \"Restore\".</li>
</ul>""",
    "dodont": [
        ("do", '<ol class="list-ruled session-list">' + srow("cancelled", "May", "12", 6, "Tue", "No class: Victoria Day week", CANCELLED) + "</ol>",
         "Cancelled is said in words, and the reason is the topic."),
        ("dont", '<ol class="list-ruled session-list">' + srow("cancelled", "May", "12", 6, "Tue", "Two 8-minute runs") + "</ol>",
         "Only a strike-through: easy to miss, not announced, and no reason given."),
        ("do", '<ol class="list-ruled session-list">' + srow("", "May", "02", 5, "Sat", "Hills and sprints", drop(5, "Sat, May 02")) + "</ol>",
         "Every Drop in box names its date in hidden text."),
        ("dont", '<ol class="list-ruled session-list">' + srow("", "May", "02", 5, "Sat", "Hills and sprints",
                 '<label class="check"><input class="check__box" type="checkbox" name="dates-x" value="5"> Drop in</label>') + "</ol>",
         "Eight boxes all called \"Drop in\": a screen reader's list of form controls cannot tell them apart."),
    ],
    "tokens": [
        ("Date tile / ring", "--color-bg-surface / --color-border-default", "color"),
        ("Next tile", "--color-accent / --color-fg-on-accent", "color"),
        ("Month, next meta, You came", "--color-fg-accent", "color"),
        ("Meta, status, past", "--color-fg-muted", "color"),
        ("Meter done / next / upcoming", "--color-accent / --color-highlight / --color-border-default", "color"),
        ("Cancelled bar", "--opacity-disabled", "value"),
        ("Date column", "--size-date-badge", "value"),
        ("Tile radius", "--radius-md", "value"),
        ("Row padding / gap", "--space-4", "value"),
        ("Day size", "--font-size-2xl", "value"),
        ("Bar height / gap", "--space-1-5 / --space-1", "value"),
        ("Admin row padding", "--space-4 / --space-5", "value"),
        ("Admin number", "--font-size-xl / --space-6", "value"),
    ],
    "code": {
        "snippet": '''<ol class="list-ruled session-list">
  <li class="session-row session-row--next">
    <div class="session-row__date" aria-hidden="true"><span class="session-row__month">Apr</span><span class="session-row__day">21</span></div>
    <div class="session-row__body">
      <p class="session-row__meta">Session 3 · Tue<span class="visually-hidden">, Apr 21</span> · Next up</p>
      <p class="session-row__topic">Same intervals, six times through</p>
    </div>
    <div class="session-row__end"><a class="btn btn--secondary btn--xs" href="/events/couch-to-5k-week-3">Details<span class="visually-hidden"> of session 3</span> <svg class="icon icon--xs" aria-hidden="true">…</svg></a></div>
  </li>
</ol>

<ol class="card card--list admin-sessions">
  <li class="admin-session admin-session--cancelled">
    <span class="admin-session__n" aria-hidden="true">6</span>
    <span class="admin-session__date">Tue May 12</span>
    <span class="admin-session__topic">No class: Victoria Day week</span>
    <span class="admin-session__end"><span class="status status--cancelled">Cancelled</span><button class="btn btn--link" type="button">Restore<span class="visually-hidden"> session 6, Tue May 12</span></button></span>
  </li>
</ol>''',
        "classes": [
            ("<code>.session-list</code> <code>.session-row</code>", "Member list of a series' dates (with <code>.list-ruled</code>)."),
            ("<code>--next</code> <code>--past</code> <code>--cancelled</code>", "Row states: filled tile and accent meta; muted; muted and struck through."),
            ("<code>__date</code> <code>__month</code> <code>__day</code> <code>__body</code> <code>__meta</code> <code>__topic</code>", "Row parts."),
            ("<code>__end</code> <code>__status</code> <code>__came</code>", "End slot: plain status or the accent \"You came\"."),
            ("<code>.session-meter</code> <code>__bar</code> <code>__bar--done|next|cancelled</code>", "The bar meter."),
            ("<code>.admin-sessions</code> <code>.admin-session</code> <code>--past</code> <code>--cancelled</code>", "Admin list and row states."),
            ("<code>__n</code> <code>__date</code> <code>__topic</code> <code>__end</code> <code>__done</code>", "Admin row parts."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/event-series/default", "came, next, cancelled"),
            mock("pages/event-series/joined", "missed"),
            mock("pages/event-series/not-joined", "done, Details"),
            mock("pages/event-series/drop-in", "Drop in tick boxes"),
            mock("pages/event-series/drop-in-none", "nothing ticked"),
            mock("pages/event-series/full", "drop in when full"),
            mock("pages/event-series/booked", "booked dates"),
            mock("pages/event-series/loading", "skeleton rows"),
            mock("pages/events/series", "session meter in rows"),
            mock("pages/admin-series/default", "admin sessions"),
            mock("pages/admin-series/selected", "paid series"),
            mock("pages/admin-series/date-cancelled", "cancelled with Restore"),
            mock("dialogs/cancel-session/default", "cancel a date"),
        ],
        "drift": """<ul>
<li>The loading skeleton's date block is <code>.skeleton--date</code> (48px, <code>--size-date-col</code>) in a 56px column (<code>--size-date-badge</code>): the tile grows when rows load. Proposed: size the skeleton from <code>--size-date-badge</code> in session rows.</li>
<li>Fixed: admin Cancel date and Restore (<code>.btn--link</code>) had a 24px target; link buttons now extend to 44px on coarse pointers.</li>
<li><code>.admin-session--cancelled</code> only strikes the topic; its date and number stay full colour while <code>--past</code> mutes the row. Kept as drawn; the Cancelled badge carries the state.</li>
</ul>""",
    },
}
