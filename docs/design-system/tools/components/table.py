from dslib import ex, kbd, mock, themes

ROW_MEMBER = ('<tr><td><div class="table__person"><span class="avatar avatar--table" aria-hidden="true">GT</span>'
              '<div class="mini-row__body"><p class="table__strong">Grace Thompson</p><p class="table__sub">grace.thompson@gmail.com</p></div></div></td>'
              '<td class="muted">Grace Fellowship, Scarborough</td><td class="table__nowrap">Jan 12, 2026</td>'
              '<td class="table__num">9</td><td><span class="status status--active">Active</span></td></tr>')
ROW_MEMBER_2 = ('<tr><td><div class="table__person"><span class="avatar avatar--table" aria-hidden="true">JR</span>'
                '<div class="mini-row__body"><p class="table__strong">Jordan Reyes</p><p class="table__sub">jreyes.fit@gmail.com</p></div></div></td>'
                '<td class="muted">Not shared</td><td class="table__nowrap">Apr 2, 2026</td>'
                '<td class="table__num">0</td><td><span class="status status--flagged">Flagged</span></td></tr>')
MEMBERS = ('<div class="table-wrap table-wrap--flush"><table class="table table--wider">'
           '<caption class="visually-hidden">Members</caption>'
           '<thead><tr><th scope="col">Member</th><th scope="col">Church</th><th scope="col">Joined</th><th scope="col">Events</th><th scope="col">Status</th></tr></thead>'
           f'<tbody>{ROW_MEMBER}{ROW_MEMBER_2}</tbody></table></div>')


def event_row(name, place, when, reg, cap, status, label):
    return (f'<tr><td><p class="table__strong">{name}</p><p class="table__sub">{place}</p></td>'
            f'<td class="table__nowrap">{when}</td>'
            f'<td class="table__nowrap"><span class="table__strong">{reg}</span><span class="muted"> / {cap}</span></td>'
            f'<td><span class="status status--{status}">{label}</span></td>'
            f'<td class="table__end"><button class="row-link" type="button">Edit<span class="visually-hidden"> {name}</span></button></td></tr>')


EVENTS = ('<div class="table-wrap table-wrap--flush"><table class="table">'
          '<caption class="visually-hidden">Events</caption>'
          '<thead><tr><th scope="col">Event</th><th scope="col">Date</th><th scope="col">Registered</th><th scope="col">Status</th>'
          '<th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead><tbody>'
          + event_row("Easter Sunrise 5K", "Martin Goodman Trail, Marilyn Bell Park", "Apr 18 · 6:45 AM", 142, 200, "published", "Published")
          + event_row("Whole Life Retreat", "Crieff Hills, Puslinch", "May 15 · 6:00 PM", 0, 60, "draft", "Draft")
          + '</tbody></table></div>')

def story_row(title, author, section, status, label, when, reads):
    r = reads or '<span aria-hidden="true">—</span><span class="visually-hidden">Not published</span>'
    return (f'<tr><td class="table__wrap"><a class="row-title" href="#">{title}</a><p class="table__sub">{author}</p></td>'
            f'<td class="table__nowrap">{section}</td><td><span class="status status--{status}">{label}</span></td>'
            f'<td class="table__nowrap muted">{when}</td><td class="table__end table__strong">{r}</td></tr>')


STORIES = ('<div class="table-wrap table-wrap--flush"><table class="table table--wide"><caption class="visually-hidden">Stories</caption>'
           '<thead><tr><th scope="col">Story</th><th scope="col">Section</th><th scope="col">Status</th><th scope="col">When</th>'
           '<th scope="col" class="table__end">Reads</th></tr></thead><tbody>'
           + story_row("Fasting and training: what a dietitian wants you to know", "Priya Raman", "Nutrition", "review", "In review", "Submitted 1 hour ago", "")
           + story_row("What to pack for the Whole Life Retreat", "CF Team", "Events", "scheduled", "Scheduled", "Sat Apr 18, 6:00 AM", "")
           + story_row("A West End church turned its basement into a free gym", "Naomi Clarke", "Community", "published", "Published", "Today, 7:12 AM", "3,412")
           + '</tbody></table></div>')
ACTIONS = ('<div class="table-wrap table-wrap--flush"><table class="table"><caption class="visually-hidden">Events with two actions</caption>'
           '<thead><tr><th scope="col">Event</th><th scope="col">Status</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead><tbody>'
           '<tr><td><p class="table__strong">Easter Sunrise 5K</p><p class="table__sub">Martin Goodman Trail, Marilyn Bell Park</p></td>'
           '<td><span class="status status--published">Published</span></td>'
           '<td class="table__end"><span class="row-actions"><a class="row-link row-link--quiet" href="#">Make it a pick<span class="visually-hidden">: Easter Sunrise 5K</span></a>'
           '<button class="row-link" type="button">Edit<span class="visually-hidden"> Easter Sunrise 5K</span></button></span></td></tr>'
           '</tbody></table></div>')

SMALL = ('<div class="table-wrap table-wrap--flush"><table class="table"><caption class="visually-hidden">Events, {cap}</caption>'
         '<thead><tr><th scope="col">Event</th><th scope="col">Registered</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>'
         '<tbody><tr><td class="table__strong">Saturday Park Bootcamp</td><td class="table__num">38 / 50</td>'
         '<td class="table__end"><button class="row-link" type="button"{a}>Edit<span class="visually-hidden"> Saturday Park Bootcamp ({cap})</span></button></td></tr></tbody></table></div>')

SPEC = {
    "lead": "Tables let staff compare many members or events at once. They scroll sideways inside their own frame so the page never does.",
    "meta": ["Status: stable", "Native <code>&lt;table&gt;</code>", "Admin console"],
    "overview": """<p>Use a table in the admin console when people compare rows across the same columns: members by church, join date and status; events by date, registrations and status. Use a <a href="list.html">list</a> when each item is read on its own (the member app's event rows and conversations), and a <a href="description-list.html">description list</a> for the facts of one thing.</p>
<ul>
<li><b>Standard</b> (<code>.table</code>) holds four or five short columns; the events table is the reference.</li>
<li><b>Wider</b> (<code>.table--wider</code>) gives a person column with avatar, name and e-mail room to breathe; the members table uses it.</li>
<li><b>Row action</b> is a <code>.row-link</code> button in the last, right-aligned column, with the row's name added for screen readers. Two actions sit in a <code>.row-actions</code> group: the quieter one (<code>.row-link--quiet</code>, muted) first, the main one last (admin events: "Make it a pick", "Edit").</li>
<li><b>Title link</b> (<code>.row-title</code>): when the row opens a page of its own (a story in the editor), its name is the link, semibold and underlined on hover; the cell is <code>.table__wrap</code>, capped at 22.5rem so long headlines wrap instead of widening the table.</li>
</ul>
<p>The member app has no tables: on a phone, a table of five columns is a sideways scroll, so member-facing data is a list instead.</p>""",
    "anatomy": {
        "figure": EVENTS,
        "callouts": [(4, 8), (10, 26), (30, 50), (66, 50), (92, 50)],
        "parts": [
            ("Wrapper", "<code>.table-wrap</code>: surface card, <code>--radius-xl</code>, hairline inset border, <code>overflow-x: auto</code>."),
            ("Header row", "14px semibold muted labels with <code>scope=\"col\"</code>; a hairline below."),
            ("Primary cell", "<code>.table__strong</code> name with a <code>.table__sub</code> second line (place or e-mail)."),
            ("Status cell", "A <a href=\"badge.html\">status badge</a>; its word carries the state, not its colour."),
            ("Action cell", "<code>.table__end</code> with a <code>.row-link</code>; the header is visually hidden \"Actions\"."),
        ],
    },
    "variants": "<h3>Standard: events</h3>" + ex(EVENTS, "Five columns at <code>--layout-table-min</code>; the last column holds the row action.", True)
    + "<h3>Wide: stories with title links</h3>" + ex(STORIES, "<code>.table--wide</code>; the headline is a <code>.row-title</code> link to the editor in a <code>.table__wrap</code> cell; Reads is right-aligned and a dash is spoken as \"Not published\" (admin stories).", True)
    + "<h3>Two row actions</h3>" + ex(ACTIONS, "<code>.row-actions</code> holds a quiet secondary link and the main action, 16px apart.", True)
    + "<h3>Listing cell</h3><p>The Listed table's first cell is a <a href=\"suggestion.html\"><code>.listed-cell</code></a>: mark, name and verified mark on one line.</p>"
    + "<h3>Wider: members with person cell</h3>" + ex(MEMBERS, "<code>.table--wider</code> and <code>.table__person</code> with a 40px avatar. Numbers use <code>.table__num</code> for tabular figures.", True),
    "sizes": "<p>One density. Header cells are 12px × 20px padding (<code>--space-3</code> / <code>--space-5</code>), body cells 16px × 20px (<code>--space-4</code> / <code>--space-5</code>). Width is set by the minimum: <code>--layout-table-min</code> for standard and <code>--layout-table-min-wide</code> (45rem) for <code>.table--wide</code> and <code>.table--wider</code>; below that the wrapper scrolls.</p>",
    "states": {
        "intro": "<p>Rows themselves are not interactive; the row action is. Its pointer and focus states are forced here with <code>data-state</code>. Loading and empty are whole-table states.</p>",
        "matrix":
        '<div class="ds-matrix"><table><thead><tr><th scope="col">Variant</th><th scope="col">Default</th><th scope="col">Hover</th><th scope="col">Focus</th><th scope="col">Active</th><th scope="col">Disabled</th></tr></thead><tbody><tr><th scope="row">Row action</th>'
        + "".join(f"<td>{SMALL.replace('{cap}', c).replace('{a}', a)}</td>" for c, a in [
            ("default", ""), ("hover", ' data-state="hover"'), ("focus", ' data-state="focus"'),
            ("active", ' data-state="active"'), ("disabled", " disabled")])
        + "</tr></tbody></table></div>"
        + "<h3>Loading</h3>"
        + ex('<div class="table-wrap table-wrap--flush" aria-busy="true"><table class="table"><caption class="visually-hidden">Events, loading</caption>'
             '<thead><tr><th scope="col">Event</th><th scope="col">Date</th><th scope="col">Status</th></tr></thead><tbody>'
             + '<tr><td><span class="skeleton skeleton--title"></span></td><td><span class="skeleton skeleton--text"></span></td><td><span class="skeleton skeleton--chip"></span></td></tr>' * 2
             + '</tbody></table></div>',
             "Header stays; body rows become skeletons of the same shape and the wrapper sets <code>aria-busy</code>.", True)
        + "<h3>Empty and no results</h3>"
        + ex('<div class="empty-state empty-state--tight"><p class="empty-state__title">No members match "Okafor"</p>'
             '<p class="empty-state__text">Check the spelling or clear the search.</p>'
             '<div class="empty-state__actions"><button class="btn btn--secondary btn--sm" type="button">Clear search</button></div></div>',
             "With nothing to show the table is replaced by an <a href=\"empty-state.html\">empty state</a>; never a header over no rows.", True),
        "themes": themes(MEMBERS),
        "notes": """<ul>
<li><b>Loading</b> keeps the header and draws skeleton rows (admin events and members loading).</li>
<li><b>Empty</b> ("No events yet") and <b>no results</b> ("No members match…") swap the table for an empty state with one next step.</li>
<li><b>Error</b> replaces the table with an inline error and "Try again"; stale rows are never shown as current.</li>
<li>There is no selected-row state: bulk actions are not part of the console.</li>
<li><b>Title link</b> states: <code>.row-title</code> underlines on hover and takes the shared focus ring; it has no <code>data-state="hover"</code> hook.</li>
</ul>""",
    },
    "responsive": """<ul>
<li>The table keeps its minimum width (<code>--layout-table-min</code>, or 45rem wide) and the wrapper scrolls sideways below it, so the page body never scrolls horizontally.</li>
<li>The wrapper is a keyboard-scrollable region in product code: give it <code>tabindex="0"</code>, <code>role="region"</code> and the caption's name so keyboard users can scroll it.</li>
<li>Dates and counts use <code>.table__nowrap</code> so "Apr 18 · 6:45 AM" never breaks mid-value; names and places wrap.</li>
<li>From <code>--layout-breakpoint-lg</code> the admin shell's sidebar is beside the table and every column fits at 1280px.</li>
</ul>""",
    "theming": "<p>The wrapper reads <code>--color-bg-surface</code> and <code>--color-border-default</code>; header text <code>--color-fg-muted</code>; row rules <code>--color-border-default</code>. In the dark theme those map to the dark surface and border, so the table needs no overrides. Status badges and row links bring their own tokens.</p>",
    "accessibility": {
        "pattern": "<p>A native data table: <code>&lt;caption&gt;</code> (visually hidden when the page heading already names it), <code>&lt;th scope=\"col\"&gt;</code> for headers. Never use a table for layout, and never rebuild one from <code>div</code>s with <code>role=\"grid\"</code>; no cell is editable inline, editing opens a <a href=\"drawer.html\">drawer</a>.</p>",
        "keys": [
            (kbd("Tab"), "Moves between row actions only; cells are not focusable."),
            (kbd("Enter") + ", " + kbd("Space"), "Activates the focused row action (\"Edit Easter Sunrise 5K\")."),
            (kbd("←") + " / " + kbd("→"), "Scroll the wrapper when it has focus and the table overflows."),
        ],
        "focus": "<p>Row actions show the shared 2px <code>--color-focus-ring</code>. The scroll wrapper, when focusable, shows the same ring around the card.</p>",
        "labelling": "<p>Each row action appends the row's name in a <code>.visually-hidden</code> span so a list of \"Edit\" links is unambiguous. The action column's header is \"Actions\", visually hidden. Avatars are decorative (<code>aria-hidden</code>) because the name is beside them.</p>",
        "pairs": [
            ("Header label", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Cell text", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Row link", "--color-fg-accent", "--color-bg-surface", 4.5),
            ("Quiet row link and When", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Row rule (non-text)", "--color-border-default", "--color-bg-surface", 1),
        ],
        "motion": "<p>None. Rows do not animate in; skeletons pulse only when motion is allowed.</p>",
        "touch": "<p>Row links sit in a 16px-padded cell and extend to 44 × 44px on coarse pointers. Sideways scrolling works by swipe inside the wrapper.</p>",
    },
    "content": """<ul>
<li>Header labels are nouns in sentence case: "Member", "Joined", "Registered".</li>
<li>Dates as "Jan 12, 2026"; event times as "Apr 18 · 6:45 AM". Counts as numerals, capacity as "142 / 200".</li>
<li>Missing optional data reads "Not shared" in muted text, never a dash alone; church and faith details are optional.</li>
<li>Row actions are one verb: "Edit", "Review"; a secondary action may be a short phrase: "Make it a pick".</li>
<li>Story times are relative where recent ("Today, 7:12 AM", "Submitted 1 hour ago") and dated when scheduled ("Sat Apr 18, 6:00 AM").</li>
</ul>""",
    "dodont": [
        ("do", '<button class="row-link" type="button">Edit<span class="visually-hidden"> Easter Sunrise 5K</span></button>',
         "Row actions carry the row's name for screen readers (admin events)."),
        ("dont", '<button class="row-link" type="button">Click to edit this event</button>',
         "Long instructions in a cell; the column already says what the row is."),
        ("do", '<span class="status status--flagged">Flagged</span>',
         "Status as a word in a badge, so colour is not the only signal (admin members)."),
        ("dont", '<span class="unread-dot" role="img" aria-label="Flagged"></span>',
         "A coloured dot alone in a status column; sighted people cannot tell flagged from active."),
    ],
    "tokens": [
        ("Wrapper surface / border", "--color-bg-surface / --color-border-default", "color"),
        ("Header label / quiet link", "--color-fg-muted", "color"),
        ("Row link", "--color-fg-accent", "color"),
        ("Row rule", "--color-border-default", "color"),
        ("Wrapper radius", "--radius-xl", "value"),
        ("Minimum width / wide", "--layout-table-min / --layout-table-min-wide", "value"),
        ("Header padding", "--space-3 / --space-5", "value"),
        ("Cell padding", "--space-4 / --space-5", "value"),
        ("Avatar size", "--size-avatar-md", "value"),
        ("Body / header size", "--font-size-ui / --font-size-sm", "value"),
        ("Row actions gap", "--space-4", "value"),
    ],
    "code": {
        "snippet": '''<div class="table-wrap" role="region" aria-label="Events" tabindex="0">
  <table class="table">
    <caption class="visually-hidden">Events</caption>
    <thead><tr><th scope="col">Event</th><th scope="col">Date</th>
      <th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>
    <tbody><tr>
      <td><p class="table__strong">Easter Sunrise 5K</p><p class="table__sub">Marilyn Bell Park</p></td>
      <td class="table__nowrap">Apr 18 · 6:45 AM</td>
      <td class="table__end"><button class="row-link" type="button">Edit<span class="visually-hidden"> Easter Sunrise 5K</span></button></td>
    </tr></tbody>
  </table>
</div>''',
        "classes": [
            ("<code>.table-wrap</code> <code>.table-wrap--flush</code>", "Scrolling card wrapper; flush reduces the top margin."),
            ("<code>.table</code> <code>.table--wide</code> <code>.table--wider</code>", "Base table; wide variants raise the minimum width to 45rem."),
            ("<code>.table__strong</code> <code>.table__sub</code>", "Primary text and muted second line."),
            ("<code>.table__person</code>", "Avatar plus name block in one cell."),
            ("<code>.table__num</code> <code>.table__nowrap</code> <code>.table__end</code>", "Tabular figures; no wrapping; right-aligned."),
            ("<code>.row-link</code>", "The row's action button or link."),
            ("<code>.row-link--quiet</code> · <code>.row-actions</code>", "Muted secondary action; a group of two actions, right-aligned."),
            ("<code>.row-title</code> · <code>.table__wrap</code>", "Row name as a link; a cell capped at 22.5rem so it wraps."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/admin-events/default", "standard table, row actions, status"),
            mock("pages/admin-members/default", "wider table with person cell"),
            mock("pages/admin-members/no-results", "no results state"),
            mock("pages/admin-events/loading", "skeleton rows"),
            mock("pages/admin-events/empty", "empty state"),
            mock("pages/admin-stories/default", "wide table, title links, statuses"),
            mock("pages/admin-series/loading", "table skeleton rows under the series"),
            mock("pages/admin-listings/listed", "listed cell"),
        ],
        "drift": "The members table avatar was 38px; it snapped to 40px (<code>--size-avatar-md</code>). <code>.table--wide</code> used a one-off 42.5rem minimum; it merged into <code>--layout-table-min-wide</code> (45rem), shared with <code>.table--wider</code>. The wrapper's 24px radius is now named <code>--radius-xl</code> (was 3xl). <code>.table__wrap</code> (a cell that wraps) is one character from <code>.table-wrap</code> (the scrolling wrapper); proposed rename <code>.table__cell--wrap</code>.",
    },
}
