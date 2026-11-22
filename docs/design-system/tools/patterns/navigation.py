from dslib import ex, icon, kbd, mock

CUR = ' aria-current="page"'

PAGE_HEAD = (
    '<div class="page-head"><div><p class="display page-title">Events</p>'
    '<p class="subtitle">Posted by the Christian Fitness team. Free unless marked.</p></div>'
    '<form class="search" role="search"><label class="visually-hidden" for="nv-search">Search events</label>'
    + icon("search", "search__icon")
    + '<input class="search__input" id="nv-search" type="search" placeholder="Search events"></form></div>'
)
BACK = f'<a class="back-link" href="#">{icon("arrow-left")} All events</a>'
TABS = ('<nav class="tabs" aria-label="Filter events (example)">'
        f'<a class="tabs__tab" href="#"{CUR}>All <span class="tabs__count">5</span></a>'
        '<a class="tabs__tab" href="#">Published <span class="tabs__count">4</span></a>'
        '<a class="tabs__tab" href="#">Draft <span class="tabs__count">1</span></a></nav>')
CHIPS = ('<div class="chip-bar" role="group" aria-label="Filter professionals (example)">'
         '<button class="chip" type="button" aria-pressed="true">All</button>'
         '<button class="chip" type="button" aria-pressed="false">Trainers</button>'
         '<button class="chip" type="button" aria-pressed="false">Dietitians</button></div>')
SIDENAV = ('<nav class="admin-nav" aria-label="Admin (example)">'
           f'<a class="admin-nav__item" href="#"{CUR}>{icon("layout-dashboard")}Dashboard</a>'
           f'<a class="admin-nav__item" href="#">{icon("calendar-days")}Events</a>'
           f'<a class="admin-nav__item" href="#">{icon("badge-check")}Services <span class="admin-nav__count">3</span></a>'
           f'<a class="admin-nav__item" href="#">{icon("users")}Members</a></nav>')

SPEC = {
    "slug": "navigation",
    "lead": "People always know where they are, how they got there and how to get back, on a phone or at a desk.",
    "overview": """<p>There are three shells, each with one navigation model:</p>
<ul>
<li><b>Public site</b> (landing, auth): the <a href="../components/top-bar.html">site header</a> with Sign in and Join, and the <a href="../components/footer.html">footer</a>.</li>
<li><b>Member app</b>: Home, Events, Services, Messages and Profile. A <a href="../components/top-bar.html">top bar</a> from tablet up; a <a href="../components/tab-bar.html">tab bar</a> on phones.</li>
<li><b>Admin console</b>: a <a href="../components/sidebar-navigation.html">sidebar</a> with Dashboard, Events, Services and Members, and counts for what needs staff.</li>
</ul>
<p>Every page starts with a <a href="../components/skip-link.html">skip link</a> and has exactly one <code>h1</code>.</p>""",
    "when": """<ul>
<li><b>Primary navigation</b> moves between top-level sections. Never more than five destinations in the tab bar.</li>
<li><b>Back link</b> on a detail page returns to its list ("All events"); prefer it to a <a href="../components/breadcrumb.html">breadcrumb</a> when the hierarchy is one level deep.</li>
<li><b><a href="../components/tabs.html">Tabs</a></b> are links that filter one list (All, Published, Draft) and change the URL.</li>
<li><b><a href="../components/chip.html">Chips</a></b> filter in place; they are toggle buttons, not navigation.</li>
<li><b><a href="../components/pagination.html">Pagination</a></b> for admin tables longer than one page.</li>
</ul>""",
    "structure": """<p>A page reads: shell navigation → back link (detail pages) → page head (title, subtitle, page action or search) → filters (tabs or chips) → content.</p>"""
        + ex(BACK + PAGE_HEAD + CHIPS, "Member list page: page head with search, then chips. A detail page adds the back link above.", True, mod="stack")
        + ex(TABS, "Admin tabs: links with counts; the current one has <code>aria-current=\"page\"</code>.", True)
        + ex(SIDENAV, "Admin sidebar items, shown here without the fixed sidebar.", True),
    "states": """<p>Navigation items have default, hover, focus, current (<code>aria-current="page"</code>, styled by a bar and weight, never colour alone) and, for the tab bar, an unread dot on Messages. Chips use <code>aria-pressed</code>. The current section stays marked on its detail pages (Events is current on an event detail).</p>""",
    "responsive": """<ul>
<li>Under 48rem the member top bar collapses to the brand and profile button, and the tab bar appears at the bottom; content gets bottom padding so nothing hides behind it.</li>
<li>Below 64rem the admin sidebar stacks above the content as a top strip; from 64rem it is a sticky full-height column.</li>
<li>Tabs and chip bars scroll horizontally inside themselves rather than wrapping.</li>
<li>Breadcrumbs collapse to the parent link on phones.</li>
</ul>""",
    "accessibility": f"""<ul>
<li>Each navigation landmark has a distinct <code>aria-label</code> ("Main", "Admin", "Filter events").</li>
<li>The skip link is first in tab order and jumps to <code>#main</code>.</li>
<li>Tab order follows reading order; {kbd("Tab")} moves between items, {kbd("Enter")} follows a link, {kbd("Space")} toggles a chip.</li>
<li>Icon-only items (profile button) have an accessible name; tab bar items always show their text label.</li>
<li>Counts are read as part of the link name ("Services 3"); give them hidden context where the number alone is unclear.</li>
</ul>""",
    "content": """<ul>
<li>Section names are single nouns: Home, Events, Services, Messages, Profile.</li>
<li>Back links name the destination, not "Back": "All events", "Back to home".</li>
<li>Page titles match the navigation label they came from.</li>
</ul>""",
    "do-dont": [
        ("do", BACK, "Name where the back link goes."),
        ("dont", f'<a class="back-link" href="#">{icon("arrow-left")} Back</a>', "Don't write a bare \"Back\"."),
        ("do", TABS.replace("(example)", "(do)"), "Use tabs as links that filter one list."),
        ("dont", '<nav class="tabs" aria-label="Sections (don\'t)"><a class="tabs__tab" href="#" aria-current="page">Events</a><a class="tabs__tab" href="#">Messages</a><a class="tabs__tab" href="#">Profile</a></nav>',
         "Don't use tabs for top-level sections; that's the shell's job."),
    ],
    "sources": {
        "mocks": [
            mock("pages/home/default", "member shell, top bar and tab bar"),
            mock("pages/events/default", "page head with search and chips"),
            mock("pages/event-detail/default", "back link"),
            mock("pages/admin-events/default", "admin sidebar and tabs with counts"),
            mock("pages/admin-members/default", "tabs without counts"),
            mock("pages/landing/default", "public header and footer"),
        ],
        "drift": """<ul>
<li>Event category chips are links with <code>aria-current</code> on the Events page but toggle buttons with <code>aria-pressed</code> elsewhere (Services). Pick one: buttons with <code>aria-pressed</code> when filtering in place, links when the filter changes the URL.</li>
<li>Admin event tabs show counts; member status tabs don't.</li>
</ul>""",
    },
}
