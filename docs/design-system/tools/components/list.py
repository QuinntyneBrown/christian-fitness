from dslib import INTERACTIVE, ex, icon, kbd, matrix, mock, themes


def event_row(month, day, title, meta, end, going=False, a=""):
    end_cls = "event-row__end event-row__end--going" if going else "event-row__end"
    return (f'<a class="event-row" href="#"{a}><div class="event-row__date"><p class="event-row__month">{month}</p>'
            f'<p class="event-row__day">{day}</p></div><div class="event-row__body"><p class="event-row__title">{title}</p>'
            f'<p class="event-row__meta">{meta}</p></div><span class="{end_cls}">{end}</span></a>')


EVENTS = ('<ul class="list-ruled">'
          f'<li>{event_row("Apr", "25", "Saturday Park Bootcamp", "Sat 8:00 AM · Waterfront", "$10")}</li>'
          f'<li>{event_row("Apr", "30", "Women&#x27;s Hoops &amp; Devotion Night", "Thu 7:00 PM · Downtown", "Going", True)}</li></ul>')


def mini(av, name, time, text, unread=False, end="", cls="mini-row", a=""):
    n = " mini-row__name--unread" if unread else ""
    tx = " mini-row__text--unread" if unread else ""
    return (f'<a class="{cls}" href="#"{a}>{av}<div class="mini-row__body"><p class="mini-row__top">'
            f'<span class="mini-row__name{n}">{name}</span><span class="mini-row__time">{time}</span></p>'
            f'<p class="mini-row__text{tx}">{text}</p></div>{end}</a>')


RAIL = ('<ul class="list-divided">'
        + event_row("Apr", "18", "Easter Sunrise 5K", "Sat 6:45 AM · Waterfront", "").replace('<span class="event-row__end"></span>', "")
        + event_row("Apr", "21", "Couch to 5K: Week 3", "Tue 6:30 PM · Etobicoke", "").replace('<span class="event-row__end"></span>', "")
        + "</ul>").replace('<a class="event-row"', '<li><a class="event-row"').replace("</a>", "</a></li>")
STATIC = ('<ul class="list-divided"><li class="event-row"><div class="event-row__date"><p class="event-row__month">Apr</p><p class="event-row__day">18</p></div>'
          '<div class="event-row__body"><p class="event-row__title event-row__title--wrap">Easter Sunrise 5K</p>'
          '<p class="event-row__meta">Sat 6:45 AM · Waterfront · Free</p></div></li></ul>')
RAIL_LOADING = ('<ul class="list-divided" aria-busy="true" aria-label="Loading events"><li class="event-row"><span class="skeleton skeleton--date"></span>'
                '<div class="event-row__body skeleton-stack"><span class="skeleton skeleton--text w-55"></span><span class="skeleton skeleton--text-sm w-80"></span></div></li></ul>')
GROUP = '<span class="avatar avatar--group" aria-hidden="true">5K</span>'
DO = '<span class="avatar" aria-hidden="true">DO</span>'
MINI = ('<ul class="mini-list">'
        f'<li>{mini(GROUP, "Sunrise 5K Crew", "8:42 AM", "Michael: Parking at Marilyn Bell fills up by 6:30", True, chr(10) + "<span class=" + chr(34) + "unread-dot" + chr(34) + " role=" + chr(34) + "img" + chr(34) + " aria-label=" + chr(34) + "3 unread" + chr(34) + "></span>")}</li>'
        f'<li>{mini(DO, "Danielle Okafor", "Yesterday", "See you Saturday!")}</li></ul>')
CONVS = ('<ul class="mini-list">'
         f'<li>{mini(GROUP, "Sunrise 5K Crew", "8:42 AM", "Michael: Parking at Marilyn Bell fills up by 6:30", True, cls="conversation", a=" aria-current=" + chr(34) + "true" + chr(34))}</li>'
         f'<li>{mini("<span class=" + chr(34) + "avatar avatar--group" + chr(34) + " aria-hidden=" + chr(34) + "true" + chr(34) + ">WH</span>", "Women&#x27;s Hoops", "Mon", "Priya: Who has the pinnies?", True, "<span class=" + chr(34) + "count-pill" + chr(34) + " aria-label=" + chr(34) + "1 unread" + chr(34) + ">1</span>", cls="conversation")}</li>'
         f'<li>{mini("<span class=" + chr(34) + "avatar" + chr(34) + " aria-hidden=" + chr(34) + "true" + chr(34) + ">MC</span>", "Michael Chen", "Apr 9", "Praying for your knee, Grace.", cls="conversation")}</li></ul>')
GOING = ('<ul class="going-list"><li><a class="going-item" href="#">'
         '<img class="going-item__image" src="../../mocks/assets/images/run.jpg" alt="" width="1376" height="768">'
         '<div class="mini-row__body"><p class="going-item__date">Sat, Apr 18</p><p class="mini-row__name">Easter Sunrise 5K</p></div></a></li></ul>')
GOALS = '<ul class="goals"><li>Half marathon in the fall</li><li>Strength twice a week</li><li>Sleep before 11</li></ul>'

SPEC = {
    "lead": "Lists show items people read one at a time: the next events, their conversations, the events they're going to.",
    "meta": ["Status: stable", "Native <code>&lt;ul&gt;</code> / <code>&lt;ol&gt;</code>"],
    "overview": """<p>Use a list when each item stands on its own and opens something. Use a <a href="table.html">table</a> when staff compare columns, and a <a href="description-list.html">description list</a> for name–value facts.</p>
<ul>
<li><b>Event row</b> (<code>.event-row</code>) in a <code>.list-ruled</code>: date column, title and meta, an end value (price or "Going"). Home and the events list.</li>
<li><b>Rail event row</b>: the same row with no end slot in a <code>.list-divided</code>, under "Upcoming events" in the landing page's rail. For signed-out visitors each row links to Join; a static, non-link form with a wrapping title (<code>.event-row__title--wrap</code>) lists events in the newsletter.</li>
<li><b>Mini row</b> (<code>.mini-row</code>) in a <code>.mini-list</code>: avatar, name, time and last line; home's message preview.</li>
<li><b>Conversation</b> (<code>.conversation</code>): the mini row inside the inbox, with a current state.</li>
<li><b>Going item</b> (<code>.going-item</code>): a thumbnail card row on the profile.</li>
<li><b>Ruled and divided lists</b> (<code>.list-ruled</code>, <code>.list-divided</code>, <code>.goals</code>, <code>.card--list</code>): plain hairline-separated lists for static text or service rows.</li>
</ul>""",
    "anatomy": {
        "figure": f'<ul class="list-ruled"><li>{event_row("Apr", "25", "Saturday Park Bootcamp", "Sat 8:00 AM · Waterfront", "$10")}</li></ul>',
        "callouts": [(6, 50), (40, 35), (40, 70), (94, 50)],
        "parts": [
            ("Date column", "<code>.event-row__date</code>: 12px uppercase accent month over a 24px display day, <code>--size-date-col</code> wide."),
            ("Title", "Semibold, one line with ellipsis; turns accent on hover."),
            ("Meta", "14px muted: weekday, time and area."),
            ("End", "<code>.event-row__end</code>: price, or \"Going\" in accent semibold."),
        ],
    },
    "variants": "<h3>Event rows</h3>" + ex(EVENTS, "Ruled list of whole-row links; the end slot says price or that you're going.", True)
    + "<h3>Rail event rows (landing)</h3>"
    + ex(RAIL, "Landing rail: no end slot, divided list; each row links to Join for visitors (landing/default).", True)
    + ex(STATIC, "Static row in the newsletter: an <code>&lt;li&gt;</code>, not a link; the title wraps and the price joins the meta (newsletter/default).", True)
    + "<h3>Mini rows and conversations</h3>" + ex(MINI, "Home's message preview: bold name and darker text when unread, plus an unread dot.", True)
    + ex(CONVS, "The inbox list: <code>aria-current=\"true\"</code> on the open conversation; count pill for unread.", True)
    + "<h3>Going items and static lists</h3>" + ex(GOING, "Profile's \"Going to\": a 16:9 thumbnail, date and name.", True)
    + ex(GOALS, "<code>.goals</code>: static 18px items between hairlines (profile goals).", True),
    "sizes": "<p>Event rows come in two sizes: default (24px day, 16px padding), used everywhere including the redrawn landing rail, and <code>.event-row--lg</code> (30px day, 20px padding, wrapping 18px title), which no mock uses since the landing page was redrawn. Mini rows and conversations have one size, with a 48px avatar (<code>--size-avatar-lg</code>).</p>"
    + ex(f'<ul class="list-ruled"><li>{event_row("Apr", "18", "Easter Sunrise 5K", "Sat 6:45 AM · Waterfront", "Free").replace("event-row", "event-row event-row--lg", 1)}</li></ul>', "Large event row.", True),
    "states": {
        "intro": "<p>Rows are links. Pointer and focus are forced with <code>data-state</code>; the open conversation uses <code>aria-current=\"true\"</code>; unread is a text and badge state.</p>",
        "matrix": matrix(INTERACTIVE + [("Current", ' aria-current="true"'), ("Unread", "")], [
            ("Event row", event_row("Apr", "25", "Park Bootcamp", "Sat 8:00 AM", "$10", a="{a}"),
             {"Disabled": None, "Current": None, "Unread": None}),
            ("Mini row", mini(DO, "Danielle", "Fri", "See you Saturday!", a="{a}"),
             {"Disabled": None, "Current": None,
              "Unread": None}),
            ("Conversation", mini(DO, "Danielle", "Fri", "See you Saturday!", cls="conversation", a="{a}"),
             {"Disabled": None}),
        ]).replace("<td>" + mini(DO, "Danielle", "Fri", "See you Saturday!", cls="conversation", a="") + "</td></tr>",
                   "<td>" + mini(DO, "Danielle", "Fri", "See you Saturday!", True, cls="conversation") + "</td></tr>")
        + "<h3>Loading and empty</h3>"
        + ex('<ul class="skeleton-stack" aria-busy="true" aria-label="Loading events"><li><span class="skeleton skeleton--date"></span></li><li><span class="skeleton skeleton--text"></span></li></ul>',
             "Loading draws skeleton rows of the same shape.", True)
        + ex(RAIL_LOADING, "Landing rail while events load: date block and two lines per row (landing/loading). If events fail while stories load, the list becomes an inline error with Try again (landing/events-error).", True)
        + ex('<div class="empty-inline"><p class="empty-inline__text">No messages yet.</p><a class="empty-inline__action" href="#">Find an event</a></div>',
             "Empty lists show an inline empty state with one next step.", True),
        "themes": themes(EVENTS + MINI),
        "notes": """<ul>
<li>Event rows and mini rows have no disabled state: an item that cannot be opened is not a link.</li>
<li><b>Current</b> applies to conversations only (<code>aria-current="true"</code>, accent-subtle background).</li>
<li><b>Unread</b> pairs bold text with a dot or count that has an <code>aria-label</code>, so weight is not the only signal.</li>
</ul>""",
    },
    "responsive": """<ul>
<li>Titles, meta and last lines truncate to one line with an ellipsis; the end slot never shrinks.</li>
<li>Large event rows and <code>.event-row__title--wrap</code> let the title wrap; the landing rail keeps one line because the rail is narrow beside the stories from 1024px and full width below.</li>
<li>On phones the inbox shows the conversation list or the thread, never both; from <code>--layout-breakpoint-md</code> the list sits beside the thread at <code>--layout-conversations-width</code>.</li>
</ul>""",
    "theming": "<p>Rows read <code>--color-fg-default</code>, <code>--color-fg-muted</code> and <code>--color-fg-accent</code>; hover uses <code>--color-bg-surface</code> (mini row) or <code>--color-bg-canvas</code> (conversation); current uses <code>--color-accent-subtle</code>. All are themed tokens, so dark mode needs no overrides.</p>",
    "accessibility": {
        "pattern": "<p>A <code>&lt;ul&gt;</code> of <code>&lt;li&gt;</code>, each holding one <code>&lt;a&gt;</code> that wraps the whole row. Lists that are not sections of their own take an <code>aria-label</code> (\"Professionals\").</p>",
        "keys": [
            (kbd("Tab") + " / " + kbd("Shift", "Tab"), "Moves from row to row."),
            (kbd("Enter"), "Opens the event or conversation."),
        ],
        "focus": "<p>The shared 2px ring wraps the whole row; rounded rows (mini, conversation, going item) follow their radius.</p>",
        "labelling": "<p>The row's text is its name, read in order: month and day, title, meta, end. Avatars and thumbnails are decorative. Unread dots and count pills carry <code>role=\"img\"</code> or an <code>aria-label</code> (\"3 unread\").</p>",
        "pairs": [
            ("Title", "--color-fg-default", "--color-bg-canvas", 4.5),
            ("Meta and time", "--color-fg-muted", "--color-bg-canvas", 4.5),
            ("Month and Going", "--color-fg-accent", "--color-bg-canvas", 4.5),
            ("Current conversation", "--color-fg-default", "--color-accent-subtle", 4.5),
        ],
        "motion": "<p>Colour and background transitions over <code>--duration-fast</code>; the arrow nudges 2px on hover. Reduced motion removes both.</p>",
        "touch": "<p>Every row is at least 56px tall and full width, well above the 44px target.</p>",
    },
    "content": """<ul>
<li>Meta reads "Sat 8:00 AM · Waterfront": weekday, time, area, joined by a middle dot.</li>
<li>Times in message rows are relative to today: "8:42 AM", "Yesterday", "Mon", then "Apr 9".</li>
<li>Last lines in group chats lead with the first name: "Michael: Parking at…".</li>
<li>End values are short: "$10", "Free", "Going".</li>
</ul>""",
    "dodont": [
        ("do", EVENTS, "One link per row, the whole row clickable (home)."),
        ("dont", '<ul class="list-ruled"><li><p class="event-row__title">Saturday Park Bootcamp</p><a class="text-link" href="#">View</a> <a class="text-link" href="#">Register</a></li></ul>',
         "Several small links per row; open the event and act there."),
        ("do", '<span class="mini-row__name mini-row__name--unread">Sunrise 5K Crew</span> <span class="unread-dot" role="img" aria-label="3 unread"></span>',
         "Unread is bold text plus a labelled dot."),
        ("dont", '<span class="mini-row__name mini-row__name--unread">Sunrise 5K Crew</span>',
         "Bold alone: weight is not announced and is easy to miss."),
    ],
    "tokens": [
        ("Row text / muted / accent", "--color-fg-default / --color-fg-muted / --color-fg-accent", "color"),
        ("Rule", "--color-border-default", "color"),
        ("Mini row hover / conversation hover", "--color-bg-surface / --color-bg-canvas", "color"),
        ("Current conversation", "--color-accent-subtle", "color"),
        ("Unread dot", "--color-accent", "color"),
        ("Date column / large", "--size-date-col / --size-date-col-lg", "value"),
        ("Thumbnail", "--size-thumb-w / --size-thumb-h", "value"),
        ("Row radius", "--radius-lg", "value"),
        ("Dot size", "--size-dot-lg", "value"),
        ("Hover shadow (going item)", "--shadow-2", "value"),
    ],
    "code": {
        "snippet": '''<ul class="list-ruled">
  <li><a class="event-row" href="/events/park-bootcamp">
    <div class="event-row__date"><p class="event-row__month">Apr</p><p class="event-row__day">25</p></div>
    <div class="event-row__body"><p class="event-row__title">Saturday Park Bootcamp</p>
      <p class="event-row__meta">Sat 8:00 AM · Waterfront</p></div>
    <span class="event-row__end">$10</span>
  </a></li>
</ul>''',
        "classes": [
            ("<code>.list-ruled</code> <code>.list-divided</code> <code>.goals</code> <code>.card--list</code>", "Hairline-separated lists: ruled adds top and bottom rules; divided only between."),
            ("<code>.event-row</code> <code>.event-row--lg</code> <code>.event-row__end--going</code>", "Event row, its large size and the Going end."),
            ("<code>.event-row__title--wrap</code>", "Lets the title wrap (static newsletter rows)."),
            ("<code>.mini-list</code> <code>.mini-row</code> <code>.conversation</code>", "Compact person rows; the inbox variant."),
            ("<code>.mini-row__name--unread</code> <code>.mini-row__text--unread</code>", "Unread emphasis."),
            ("<code>.going-list</code> <code>.going-item</code>", "Thumbnail card rows."),
            ("<code>aria-current=\"true\"</code>", "The open conversation."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/home/default", "event rows, mini rows with unread"),
            mock("pages/home/empty", "inline empty state"),
            mock("pages/messages/default", "conversations, current, count pill"),
            mock("pages/profile/default", "going items, goals"),
            mock("pages/landing/default", "rail event rows, no end slot"),
            mock("pages/landing/loading", "rail skeleton rows"),
            mock("pages/landing/events-error", "rail inline error"),
            mock("pages/newsletter/default", "static row, wrapping title"),
            mock("pages/services/default", "card list of service rows"),
        ],
        "drift": "The redrawn landing page dropped <code>.event-row--lg</code> for default rows in a <code>.list-divided</code> rail; the large size stays in components.css with no mock using it (proposed: remove it or keep it for a future wide list). The going-item hover shadow was the old shadow-2 (8/24); it merged into <code>--shadow-2</code> (12/32). The goals list was 17px; it snapped to 18px (<code>--font-size-lg</code>). Rounded rows' 16px radius is now <code>--radius-lg</code> (was 2xl).",
    },
}
