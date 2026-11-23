from dslib import avatar, ex, icon, kbd, mock

TABLE = (
    '<div class="table-wrap"><table class="table">'
    '<caption class="visually-hidden">Events (example)</caption>'
    '<thead><tr><th scope="col">Event</th><th scope="col">Date</th><th scope="col">Registered</th><th scope="col">Status</th>'
    '<th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead><tbody>'
    '<tr><td><p class="table__strong">Easter Sunrise 5K</p><p class="table__sub">Martin Goodman Trail</p></td>'
    '<td class="table__nowrap">Apr 18 · 6:45 AM</td><td class="table__nowrap"><span class="table__strong">142</span><span class="muted"> / 200</span></td>'
    '<td><span class="status status--published">Published</span></td>'
    '<td class="table__end"><button class="row-link" type="button">Edit<span class="visually-hidden"> Easter Sunrise 5K</span></button></td></tr>'
    '<tr><td><p class="table__strong">Whole Life Retreat</p><p class="table__sub">Muskoka Woods, Rosseau</p></td>'
    '<td class="table__nowrap">May 22 · 4:00 PM</td><td class="table__nowrap"><span class="table__strong">0</span><span class="muted"> / 60</span></td>'
    '<td><span class="status status--draft">Draft</span></td>'
    '<td class="table__end"><button class="row-link" type="button">Edit<span class="visually-hidden"> Whole Life Retreat</span></button></td></tr>'
    '</tbody></table></div>'
)

LIST = (
    '<ul class="mini-list">'
    '<li><a class="mini-row" href="#">' + avatar("SC", group=True) +
    '<div class="mini-row__body"><div class="mini-row__top"><p class="mini-row__name mini-row__name--unread">Sunrise 5K Crew</p>'
    '<span class="mini-row__time">8:12 AM</span></div><p class="mini-row__text mini-row__text--unread">Michael: See everyone at the trailhead!</p></div>'
    '<span class="unread-dot"><span class="visually-hidden">3 unread</span></span></a></li>'
    '<li><a class="mini-row" href="#">' + avatar("DO") +
    '<div class="mini-row__body"><div class="mini-row__top"><p class="mini-row__name">Danielle Okafor</p>'
    '<span class="mini-row__time">Mon</span></div><p class="mini-row__text">Sounds good, Tuesday at 6 works.</p></div></a></li></ul>'
)

SPEC = {
    "slug": "tables-and-lists",
    "lead": "Tables are for staff comparing many records; lists are for members scanning a few. Both stay readable on a phone.",
    "overview": """<p>Use a <a href="../components/table.html">table</a> when people compare values across columns (admin events, members, services). Use a <a href="../components/list.html">list</a> or <a href="../components/event-card.html">card grid</a> when each item is read on its own (conversations, upcoming events, professionals).</p>""",
    "when": """<ul>
<li><b>Table</b>: staff, 3+ comparable attributes, sorting or status scanning.</li>
<li><b>Event grid</b>: members browsing events; the image and date matter.</li>
<li><b>Divided list</b> (<code>.mini-list</code>, <code>.list-divided</code>): conversations, going list, people.</li>
<li><b>Description list</b>: facts about one record.</li>
</ul>
<p>Filters sit above: <a href="../components/tabs.html">tabs</a> for status, <a href="../components/chip.html">chips</a> for category, search on the right of the page head. Bulk actions are not in the mocks; add them only with a mock first.</p>""",
    "structure": """<p>Table: hidden caption, column headers with <code>scope</code>, the first column as the record's name plus a sub-line, numbers right-aligned in tabular figures, status as a <a href="../components/badge.html">status badge</a>, row action last.</p>"""
        + ex(TABLE, "Admin events table: name + place, date, fill, status, row action with a hidden record name.", True)
        + ex(LIST, "Conversation list: avatar, name, time, preview, unread dot with hidden count.", True),
    "states": """<p>Lists and tables go <b>loading</b> (skeleton rows of the same shape), <b>loaded</b>, <b>empty</b>, <b>no results</b> (keep filters, echo the query) and <b>error</b> (retry in place, tabs stay). Rows show hover and focus; unread rows are bold and carry a dot with a text count, never colour alone. Long session lists (chat, members) render a window, not everything.</p>""",
    "responsive": """<ul>
<li>Tables scroll horizontally inside <code>.table-wrap</code>; the page never scrolls sideways. <code>.table--wide</code> and <code>.table--wider</code> set a minimum width so columns don't crush.</li>
<li>Event grids go 1 → 2 → 3 columns; lists stay one column.</li>
<li>On phones, Messages shows the list or the thread, never both.</li>
</ul>""",
    "accessibility": f"""<ul>
<li>Every table has a caption (visible or hidden) and <code>scope</code> on headers.</li>
<li>Row actions name their record: "Edit<span class="visually-hidden"> Easter Sunrise 5K</span>" reads as "Edit Easter Sunrise 5K".</li>
<li>A scrolling <code>.table-wrap</code> is keyboard reachable ({kbd("Tab")} then arrow keys) and labelled.</li>
<li>Empty cells say so: the em dash is <code>aria-hidden</code> and visually hidden text beside it reads "Not given".</li>
<li>Whole-row links are one <code>&lt;a&gt;</code> per row; no nested interactive elements.</li>
</ul>""",
    "content": """<ul>
<li>Column headers are short nouns in sentence case: "Event", "Registered".</li>
<li>Dates in tables are compact ("Apr 18 · 6:45 AM"); in lists, relative for today ("8:12 AM") and weekday within a week ("Mon").</li>
<li>Numbers use digits and a thin separator for fill: "142 / 200".</li>
<li>Home church is optional; show "—" when not given and never sort or filter members by faith details.</li>
</ul>""",
    "do-dont": [
        ("do", '<button class="row-link" type="button">Edit<span class="visually-hidden"> Easter Sunrise 5K</span></button>',
         "Give row actions a hidden record name."),
        ("dont", '<button class="row-link" type="button">Edit</button><button class="row-link" type="button">Edit</button>',
         "Don't repeat identical \"Edit\" names down a column."),
        ("do", '<span class="status status--flagged">Flagged</span>', "Show status with a word and colour."),
        ("dont", '<span class="unread-dot"></span>', "Don't carry state with colour or a dot alone."),
    ],
    "sources": {
        "mocks": [
            mock("pages/admin-events/default", "events table with row action"),
            mock("pages/admin-members/default", "members table with avatar column"),
            mock("pages/admin-members/loading", "skeleton rows"),
            mock("pages/admin-members/no-results", "search no-results"),
            mock("pages/messages/list", "conversation list"),
            mock("pages/events/default", "event grid"),
        ],
        "drift": """<ul>
<li>The events table has a row action ("Edit"); the members table has none, so there's no keyboard path to act on a member except through the report banner.</li>
<li>The members table shows a Church column. Faith details are optional and sensitive; staff need a reason to see it, and it should not be searchable ("search by email or home church" in the no-results copy).</li>
</ul>""",
    },
}
