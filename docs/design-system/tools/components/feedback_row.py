from dslib import avatar, ex, icon, kbd, mock, themes

SPIN = icon("loader", "icon--spin")
CUR = ' aria-current="page"'
FB = [("bug", "Michael Chen", "35 min ago", "The “Add to calendar” button opens a blank page on my phone. Worked fine on my laptop. I tried twice.", "Something’s broken", "New"),
      ("pen-line", "Adaeze Kalu", "2 hours ago", "Small correction: RCCG Jesus House is one of the twelve churches but isn’t in the list in the story. Pastor Femi confirmed last week.", "Content", "New"),
      ("lightbulb", "Grace Thompson", "Yesterday", "Could the series page show which week of the plan each session is? I missed week 3 and wasn’t sure where to pick back up.", "Idea", "Replied"),
      ("heart", "Priya Nair", "2 days ago", "The verse at the end of the newsletter has become my Saturday long-run mantra. Thank you for that.", "Praise", "Resolved")]
STATUS = {"New": "new", "Replied": "replied", "Resolved": "draft"}


def frow(i, cur=-1, a=""):
    ic, who, when, text, kind, st = FB[i]
    new = " feedback-row__from--new" if st == "New" else ""
    return (f'<a class="feedback-row" href="#"{CUR if i == cur else ""}{a}>{icon(ic, "feedback-row__icon")}'
            f'<span class="feedback-row__body"><span class="feedback-row__top"><span class="feedback-row__from{new}">{who}</span>'
            f'<span class="feedback-row__when">{when}</span></span><span class="feedback-row__text">{text}</span>'
            f'<span class="visually-hidden">{kind}, {st}</span></span></a>')


def flist(cur=0, label="Feedback"):
    lis = "".join(f"<li>{frow(i, cur)}</li>" for i in range(4))
    return f'<nav aria-label="{label}"><ul class="card card--list feedback-list">{lis}</ul></nav>'


EMPTY_LIST = '<ul class="card card--list feedback-list"><li class="feedback-row feedback-row--empty">Nothing here.</li></ul>'


def detail(i=0, uid="fd", reply="", busy=False, status=None):
    ic, who, when, text, kind, st = FB[i]
    st = status or st
    email = ["mchen.runs@outlook.com", "adaeze.k@yahoo.ca", "grace.thompson@gmail.com", "priya.nair@gmail.com"][i]
    page = ["Events › Easter Sunrise 5K", "Story › Twelve GTA churches will run the Toronto Half", "Event series › Couch to 5K", "Newsletter"][i]
    device = ["iPhone · Safari 18", "Android · Chrome 124", "Mac · Chrome 124", "iPhone · Mail"][i]
    hint = ["Let them know we can reproduce it and when to expect a fix", "Thank them and say when the correction is live",
            "Thank them, and tell them honestly whether it’s on the list", "Say thanks, and let them know who you passed it on to"][i]
    initials = "".join(p[0] for p in who.split())
    story = (f'<p class="feedback__link"><a class="btn btn--secondary btn--sm" href="#">{icon("pen-line")}Open the story to correct it</a></p>'
             if kind == "Content" else "")
    first = who.split()[0]
    send = (f'<button class="btn btn--primary btn--md" type="submit" disabled aria-busy="true">{SPIN}Sending…</button>' if busy
            else f'<button class="btn btn--primary btn--md" type="submit">{icon("send")}Send reply</button>')
    other = ('<button class="btn btn--secondary btn--md" type="button">Reopen</button>' if st == "Resolved"
             else f'<button class="btn btn--secondary btn--md" type="button"{" disabled" if busy else ""}>Mark resolved</button>')
    desc = f' aria-describedby="{uid}-hint"' if not reply else ""
    hint_html = f'<span class="field__hint" id="{uid}-hint">{hint}</span>' if not reply else ""
    return (f'<form class="card card--pad feedback-detail" novalidate aria-label="{kind} from {who} ({uid})" style="width: 100%;">'
            f'<div class="feedback-detail__head"><span class="kind-tag">{icon(ic)}{kind}</span><span class="status status--{STATUS[st]}">{st}</span>'
            f'<span class="feedback-detail__when">{when}</span></div>'
            f'<p class="feedback-detail__text">{text}</p>'
            f'<dl class="feedback-detail__facts"><div class="feedback-detail__from">{avatar(initials, size="sm")}<div><dt class="visually-hidden">From</dt>'
            f'<dd class="feedback-detail__strong">{who}</dd><dd class="feedback-detail__sub">{email}</dd></div></div>'
            f'<div><dt>Sent from</dt><dd class="feedback-detail__strong">{page}</dd></div>'
            f'<div><dt>Device</dt><dd class="feedback-detail__strong feedback-detail__device">{icon("monitor")}{device}</dd></div></dl>'
            f'{story}<div class="feedback-detail__reply"><div class="field"><label class="field__label" for="{uid}-reply">Reply to {first}</label>'
            f'<textarea class="textarea" id="{uid}-reply" rows="4"{desc}{" readonly" if busy else ""}>{reply}</textarea>{hint_html}</div></div>'
            f'<div class="cluster">{send}{other}</div></form>')


SAID = ('<section aria-labelledby="said-title-{u}"><h3 class="display section-title" id="said-title-{u}">You said, we did</h3>'
        '<p class="said__lead">Recent changes that started as member feedback.</p><ul class="list-ruled said">'
        '<li><p class="said__quote">“I never know if an event got moved.”</p><p class="said__did">Change alerts for every event you’re going to</p><p class="said__when">March 2026</p></li>'
        '<li><p class="said__quote">“Can I join a whole series instead of every date?”</p><p class="said__did">Join a series in one tap</p><p class="said__when">February 2026</p></li>'
        '<li><p class="said__quote">“The newsletter is too long on my phone.”</p><p class="said__did">A shorter Weekly with one big story</p><p class="said__when">January 2026</p></li>'
        '</ul></section>')
LIST_BOX = '<div style="width: 100%; max-width: 21.25rem;">{c}</div>'
ROW_BOX = '<div style="width: 100%; min-width: 16rem; max-width: 21.25rem;"><ul class="card card--list feedback-list"><li>{c}</li></ul></div>'
INBOX = f'<div class="split split--flush split--inbox" style="width: 100%;">{flist()}{detail()}</div>'


def grid(cols, rows):
    head = "".join(f'<th scope="col">{c}</th>' for c in cols)
    body = "".join(f'<tr><th scope="row">{label}</th>' + "".join("<td>—</td>" if c is None else f"<td>{c}</td>" for c in cells) + "</tr>"
                   for label, cells in rows)
    return f'<div class="ds-matrix"><table><thead><tr><th scope="col">Variant</th>{head}</tr></thead><tbody>{body}</tbody></table></div>'


SPEC = {
    "lead": "The feedback inbox lists every note from members, newest first; the chosen one opens beside it with who sent it, from where, and a reply box.",
    "meta": ["Status: new", "Admin console, member Send feedback", "Current link list + detail form"],
    "overview": """<p>Members send ideas, bug reports, corrections and thanks from <b>Send feedback</b> and from a story's \"Send a correction\". Staff read and answer them in the inbox:</p>
<ul>
<li><b>Feedback row</b> (<code>.feedback-row</code> in a <code>.feedback-list</code>): a link with the kind's icon, who sent it (bold while New), when, and two lines of the note. The open one has <code>aria-current=\"page\"</code>. <code>--empty</code> is the row that says \"Nothing here.\" when a filter has nothing.</li>
<li><b>Feedback detail</b> (<code>.feedback-detail</code>): the <b>kind tag</b> (<code>.kind-tag</code>), status and time; the note in full; facts (from, sent from, device); for a correction, a link to the story (<code>.feedback__link</code>); then the reply and Mark resolved or Reopen.</li>
<li><b>You said, we did</b> (<code>.said</code>): on the member's Send feedback page, changes that began as feedback.</li>
</ul>
<p>The inbox is the list-and-detail split described in <a href="../patterns/tables-and-lists.html">Tables and lists</a>. Member conversations use the <a href="list.html">list</a> and <a href="message.html">message</a> components instead.</p>""",
    "anatomy": {
        "figure": LIST_BOX.format(c=f'<ul class="card card--list feedback-list"><li>{frow(0, 0)}</li><li>{frow(2)}</li></ul>'),
        "callouts": [(8, 14), (30, 12), (88, 12), (50, 28), (50, 64)],
        "parts": [
            ("Kind icon", "<code>.feedback-row__icon</code>: bug, pen, lightbulb or heart; accent when open."),
            ("From", "<code>__from</code>: semibold; bold (<code>--new</code>) while the note is New."),
            ("When", "<code>__when</code>: 12px muted, pushed to the end."),
            ("Open row", "<code>aria-current=\"page\"</code>: <code>--color-accent-subtle</code> fill."),
            ("Text", "<code>__text</code>: two lines, clamped; kind and status follow in visually hidden text."),
        ],
    },
    "variants": "<h3>Inbox</h3>" + ex(INBOX, "The list beside the open note (admin feedback default).")
    + "<h3>Correction</h3>" + ex(detail(1, "fv2"), "A correction to a story adds \"Open the story to correct it\" (admin feedback correction).")
    + "<h3>Resolved</h3>" + ex(detail(3, "fv3"), "A resolved note can be reopened.")
    + "<h3>Empty filter</h3>" + ex(LIST_BOX.format(c=EMPTY_LIST), "A filter with nothing in it keeps the list frame and says so.", True)
    + "<h3>You said, we did</h3>" + ex(LIST_BOX.format(c=SAID.format(u="v")), "Beside the member's Send feedback form.", True),
    "sizes": "<p>One size. Rows: 16px padding, text 14px clamped to two lines. The list column is 21.25rem from 1024px. The detail is a padded <a href=\"card.html\">card</a>; its note is 20px.</p>",
    "states": {
        "intro": "<p>Rows are links: hover is forced with <code>data-state=\"hover\"</code>, focus with <code>data-state=\"focus\"</code>, open with <code>aria-current=\"page\"</code>. New is a content state (bold name, \"New\" in hidden text and on the detail).</p>",
        "matrix": grid(["Default", "Hover", "Focus", "Open", "New"], [
            ("Feedback row", [ROW_BOX.format(c=frow(2)), ROW_BOX.format(c=frow(2, a=' data-state="hover"')), ROW_BOX.format(c=frow(2, a=' data-state="focus"')),
                              ROW_BOX.format(c=frow(2, 2)), ROW_BOX.format(c=frow(1))]),
        ]) + "<h3>Replying and replied</h3>"
        + ex(detail(0, "fs1", reply="Thanks, Michael. We can reproduce it on iPhone and a fix goes out this week.", busy=True),
             "Send reply pressed: busy, the reply read-only, Mark resolved disabled (admin feedback replying).")
        + ex(detail(0, "fs2", status="Replied"), "Sent: the note is Replied, the reply box is empty again and a toast confirms it (admin feedback replied)."),
        "themes": themes(LIST_BOX.format(c=flist(0, "Feedback theme")) + LIST_BOX.format(c=SAID.format(u="t"))),
        "notes": """<ul>
<li><b>Loading</b>: the list and the open note show as skeleton tiles; <b>empty</b>: \"No feedback yet\" says where notes come from; <b>error</b>: retry in place.</li>
<li>The empty row (<code>--empty</code>) is a plain <code>&lt;li&gt;</code>, not a link: it has no hover or focus.</li>
<li>Status pills: New (<code>.status--new</code>, highlight), Replied (<code>.status--replied</code>, outline), Resolved (<code>.status--draft</code>); see <a href="badge.html">Badge</a>.</li>
</ul>""",
    },
    "responsive": """<ul>
<li>Below 1024px the list stacks above the detail; choosing a row loads the detail below (it is a page, so the URL changes).</li>
<li>From 1024px: list 21.25rem, detail the rest (<code>.split--inbox</code>).</li>
<li>The facts row is one column on phones and three from 640px; name, email and page truncate with an ellipsis.</li>
<li>Row names truncate; the time never wraps.</li>
</ul>""",
    "theming": "<p>Rows sit in a list <a href=\"card.html\">card</a>; hover fills <code>--color-bg-canvas</code>, open fills <code>--color-accent-subtle</code> with the icon in <code>--color-fg-accent</code>. The kind tag is a <code>--color-bg-canvas</code> pill with an accent icon. Facts sit between <code>--color-border-default</code> rules. The said list uses muted italic quotes.</p>",
    "accessibility": {
        "pattern": "<p>The list is a <code>&lt;nav aria-label=\"Feedback\"&gt;</code> of links with <code>aria-current=\"page\"</code> on the open one (not a listbox: each row is its own URL). The detail is a <code>&lt;form&gt;</code> with a visually hidden <code>&lt;h2&gt;</code> (\"Something’s broken from Michael Chen\"); the facts are a <code>&lt;dl&gt;</code>. The reply has a visible label (\"Reply to Michael\") and a hint joined with <code>aria-describedby</code>.</p>",
        "keys": [
            (kbd("Tab"), "Row to row, then into the detail: story link, reply, Send reply, Mark resolved."),
            (kbd("Enter"), "Opens a note; sends the reply from the button."),
        ],
        "focus": "<p>The shared ring around the row.</p>",
        "labelling": "<p>A row reads: name, time, the note, then \"Something’s broken, New\" from hidden text, so kind and status are not carried by the icon or weight alone. Icons are decorative.</p>",
        "pairs": [
            ("Name and note", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Row text and time", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Open row text", "--color-fg-default", "--color-accent-subtle", 4.5),
            ("Open row muted", "--color-fg-muted", "--color-accent-subtle", 4.5),
            ("Kind tag", "--color-fg-default", "--color-bg-canvas", 4.5),
            ("New pill", "--palette-stone-1000", "--color-highlight", 4.5),
        ],
        "motion": "<p>Row background over <code>--duration-fast</code>; none under reduced motion.</p>",
        "touch": "<p>Rows are full width and at least 72px tall.</p>",
    },
    "content": """<ul>
<li>Kinds: Idea, Something’s broken, Content (a correction), Praise. On the member form: \"An idea\", \"Something’s off\", \"A correction\", \"Thanks\".</li>
<li>Times are relative: \"35 min ago\", \"Yesterday\", \"2 days ago\".</li>
<li>Reply hints tell staff what a good answer says: \"Let them know we can reproduce it and when to expect a fix\".</li>
<li>Said: the member's words in quotes, what changed, and the month.</li>
</ul>""",
    "dodont": [
        ("do", ROW_BOX.format(c=frow(1)), "New is bold and stated in words (hidden text and the detail's pill)."),
        ("dont", ROW_BOX.format(c=frow(1).replace('<span class="visually-hidden">Content, New</span>', "").replace(" feedback-row__from--new", "")),
         "Kind only as an icon and New only as a dot or weight: screen readers hear neither."),
        ("do", detail(1, "dd1"), "A correction links straight to the story to fix it."),
        ("dont", '<div class="feedback-detail" style="width: 100%;"><p class="feedback-detail__text">Small correction: RCCG Jesus House is one of the twelve churches…</p>'
                 '<div class="cluster"><button class="btn btn--primary btn--md" type="button">Done</button></div></div>',
         "No reply and a vague \"Done\": the member never hears back, and nobody knows whether it was fixed."),
    ],
    "tokens": [
        ("Row hover / open", "--color-bg-canvas / --color-accent-subtle", "color"),
        ("Icon / open icon", "--color-fg-muted / --color-fg-accent", "color"),
        ("Kind tag", "--color-bg-canvas / --color-fg-accent", "color"),
        ("Facts rules", "--color-border-default", "color"),
        ("Row padding", "--space-4", "value"),
        ("Detail note", "--font-size-xl / --line-height-relaxed", "value"),
        ("Kind tag radius", "--radius-full", "value"),
        ("Transition", "--duration-fast / --ease-standard", "value"),
    ],
    "code": {
        "snippet": '''<nav aria-label="Feedback"><ul class="card card--list feedback-list">
  <li><a class="feedback-row" href="/admin/feedback/f1" aria-current="page"><svg class="icon feedback-row__icon" aria-hidden="true">…</svg>
    <span class="feedback-row__body">
      <span class="feedback-row__top"><span class="feedback-row__from feedback-row__from--new">Michael Chen</span><span class="feedback-row__when">35 min ago</span></span>
      <span class="feedback-row__text">The “Add to calendar” button opens a blank page on my phone. …</span>
      <span class="visually-hidden">Something’s broken, New</span>
    </span></a></li>
</ul></nav>
<form class="card card--pad feedback-detail" novalidate>
  <div class="feedback-detail__head"><span class="kind-tag">…Something’s broken</span><span class="status status--new">New</span><span class="feedback-detail__when">35 min ago</span></div>
  <h2 class="visually-hidden">Something’s broken from Michael Chen</h2>
  <p class="feedback-detail__text">…</p>
  <dl class="feedback-detail__facts">…</dl>
  <div class="feedback-detail__reply">…Reply to Michael…</div>
  <div class="cluster">…Send reply, Mark resolved…</div>
</form>''',
        "classes": [
            ("<code>.feedback-list</code> <code>.feedback-row</code> <code>--empty</code>", "The inbox list and its rows."),
            ("<code>.feedback-row__icon</code> <code>__body</code> <code>__top</code> <code>__from</code> <code>__from--new</code> <code>__when</code> <code>__text</code>", "Row parts."),
            ("<code>.feedback-detail__head</code> <code>__when</code> <code>__text</code> <code>__facts</code> <code>__from</code> <code>__strong</code> <code>__sub</code> <code>__device</code> <code>__reply</code>", "Detail parts."),
            ("<code>.kind-tag</code> · <code>.feedback__link</code>", "Kind pill; the correction's story link."),
            ("<code>.said</code> <code>__lead</code> <code>__quote</code> <code>__did</code> <code>__when</code>", "You said, we did."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/admin-feedback/default", "inbox, open bug report"),
            mock("pages/admin-feedback/correction", "story link"),
            mock("pages/admin-feedback/replying", "busy"),
            mock("pages/admin-feedback/replied", "Replied"),
            mock("pages/admin-feedback/resolved", "Reopen, Resolved filter"),
            mock("pages/admin-feedback/loading", "skeletons"),
            mock("pages/admin-feedback/empty", "no feedback"),
            mock("pages/feedback/default", "You said, we did"),
        ],
        "drift": "<ul><li>The Resolved status reuses <code>.status--draft</code>; a <code>.status--resolved</code> alias would say what it means.</li><li><code>.feedback</code> exists only as <code>.feedback__link</code> (a top margin); there is no <code>.feedback</code> block.</li></ul>",
    },
}
