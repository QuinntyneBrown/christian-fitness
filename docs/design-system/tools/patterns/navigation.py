from dslib import cf_ui, ex, icon, kbd, mock

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
SECTIONS = ["Latest", "Events", "Training", "Nutrition", "Faith &amp; Body", "Community", "Pros"]
NEWS_SHELL = (
    '<div style="width: 100%;"><header class="masthead"><div class="masthead__bar">' + cf_ui.lockup("#")
    + '<div class="site-header__actions"><a class="btn btn--ghost site-header__signin" href="#">Sign in</a><a class="btn btn--primary" href="#">Join free</a></div></div>'
    '<nav class="section-nav" aria-label="Sections (example)">'
    + "".join(f'<a class="section-nav__link" href="#"{CUR if n == "Latest" else ""}>{n}</a>' for n in SECTIONS) + '</nav></header>'
    '<p class="muted" style="padding: var(--space-8) var(--space-4); text-align: center;">Lead story, headlines, the latest…</p>'
    '<footer class="site-footer"><p>© 2026 Christian Fitness · Toronto</p><p class="site-footer__links">'
    '<a href="#">Newsletter</a><a href="#">' + icon("rss") + ' RSS</a><a href="#">Send feedback</a><a href="#">Privacy</a><a href="#">Terms</a></p></footer></div>'
)
MEMBER_FOOTER = ('<footer class="app-footer" style="width: 100%;"><div class="app-footer__inner"><p>© 2026 Christian Fitness · Toronto</p>'
                 '<p class="app-footer__links"><a href="#">Send feedback</a><a href="#">Preferences</a><a href="#">Privacy</a><a href="#">Terms</a></p></div></footer>')
SIDE_PREFS = ('<nav class="side-nav" aria-label="Preference sections (example)"><ul class="side-nav__list">'
              + "".join(f'<li><a class="side-nav__link" href="#">{n}</a></li>' for n in ["Email", "Notifications", "Privacy", "Suggestions", "Your data"])
              + '</ul></nav>')
SIDE_LEGAL = ('<nav class="side-nav" aria-label="Contents (example)"><p class="side-nav__title">Contents</p><ol class="side-nav__list">'
              + "".join(f'<li><a class="side-nav__link side-nav__link--numbered" href="#"><span class="side-nav__n">{i}.</span>{n}</a></li>'
                        for i, n in enumerate(["What we collect", "How we use it", "Who we share it with", "Faith and health information"], 1))
              + '</ol></nav>')
def _li(inner):
    return f'<li>{inner}</li>'


GROUPED = ('<div class="admin__sidebar" style="position: static; height: auto; width: 100%; max-width: 16rem;">'
           '<nav class="admin-nav" aria-label="Admin (grouped example)">'
           '<ul class="admin-nav__list">'
           + _li(f'<a class="admin-nav__item" href="#">{icon("layout-dashboard", "icon--md")}Dashboard</a>') + '</ul>'
           '<h2 class="admin-nav__group" id="nav-group-publish">Publish</h2>'
           '<ul class="admin-nav__list" aria-labelledby="nav-group-publish">'
           + _li(f'<a class="admin-nav__item" href="#"{CUR}>{icon("newspaper", "icon--md")}Stories<span class="admin-nav__count" aria-label="1 story to review">1</span></a>')
           + _li(f'<a class="admin-nav__item" href="#">{icon("mail", "icon--md")}Newsletter</a>') + '</ul>'
           '<h2 class="admin-nav__group" id="nav-group-gather">Gather</h2>'
           '<ul class="admin-nav__list" aria-labelledby="nav-group-gather">'
           + _li(f'<a class="admin-nav__item" href="#">{icon("calendar-days", "icon--md")}Events</a>') + '</ul>'
           '<h2 class="admin-nav__group" id="nav-group-community">Community</h2>'
           '<ul class="admin-nav__list" aria-labelledby="nav-group-community">'
           + _li(f'<a class="admin-nav__item" href="#">{icon("message-square-text", "icon--md")}Feedback<span class="admin-nav__count" aria-label="2 new notes">2</span></a>') + '</ul>'
           '</nav></div>')

SPEC = {
    "slug": "navigation",
    "lead": "People always know where they are, how they got there and how to get back, on a phone or at a desk.",
    "overview": """<p>There are four shells, each with one navigation model:</p>
<ul>
<li><b>News front page</b> (the public landing, sections, stories, subscribe): the <a href="../components/masthead.html">masthead</a> (lockup, Sign in and Join free) with its section navigation (Latest, Events, Training, Nutrition, Faith &amp; Body, Community, Pros), and the site <a href="../components/footer.html">footer</a> with Newsletter, RSS, Send feedback, Privacy and Terms. Pages reached from it (Subscribe, the legal pages) use the plain masthead with a back link.</li>
<li><b>Public auth</b>: the <a href="../components/top-bar.html">site header</a> with Sign in and Join.</li>
<li><b>Member app</b>: Home, Events, Services, Messages and Profile. A <a href="../components/top-bar.html">top bar</a> from tablet up; a <a href="../components/tab-bar.html">tab bar</a> on phones; and the member <a href="../components/footer.html">footer</a> under every page that scrolls (Send feedback, Preferences, Privacy, Terms). Messages fills the window and has none.</li>
<li><b>Admin console</b>: a <a href="../components/sidebar-navigation.html">sidebar</a> of ten sections grouped by the job (Publish, Gather, Community), with counts for what needs staff.</li>
</ul>
<p>Inside a long page, <a href="../components/side-navigation.html">side navigation</a> lists its sections (Preferences, the legal pages). A choice between views of one thing is a <a href="../components/segmented-control.html">segmented control</a>; unsaved changes travel in a <a href="../components/save-bar.html">save bar</a>, not in the navigation.</p>
<p>Every page starts with a <a href="../components/skip-link.html">skip link</a> and has exactly one <code>h1</code>.</p>""",
    "when": """<ul>
<li><b>Primary navigation</b> moves between top-level sections. Never more than five destinations in the tab bar.</li>
<li><b>Back link</b> on a detail page returns to its list ("All events"); prefer it to a <a href="../components/breadcrumb.html">breadcrumb</a> when the hierarchy is one level deep.</li>
<li><b><a href="../components/tabs.html">Tabs</a></b> are links that filter one list (All, Published, Draft) and change the URL.</li>
<li><b><a href="../components/chip.html">Chips</a></b> filter in place; they are toggle buttons, not navigation.</li>
<li><b><a href="../components/pagination.html">Pagination</a></b> for admin tables longer than one page.</li>
<li><b><a href="../components/side-navigation.html">Side navigation</a></b> for in-page jumps on a long page with named sections: Preferences (Email, Notifications, Privacy, Suggestions, Your data) and the numbered contents of Privacy and Terms. Links to fragments; not more primary navigation.</li>
<li><b>Footers</b> hold what everyone needs once in a while (feedback, preferences, legal), never a primary destination.</li>
</ul>""",
    "structure": """<p>A page reads: shell navigation → back link (detail pages) → page head (title, subtitle, page action or search) → filters (tabs or chips) → content.</p>"""
        + ex(BACK + PAGE_HEAD + CHIPS, "Member list page: page head with search, then chips. A detail page adds the back link above.", True, mod="stack")
        + ex(TABS, "Admin tabs: links with counts; the current one has <code>aria-current=\"page\"</code>.", True)
        + "<h3>News front page shell</h3>" + ex(NEWS_SHELL, "Masthead with section navigation (current: Latest), the page, then the site footer (landing).", True, mod="stack")
        + "<h3>Member footer</h3>" + ex(MEMBER_FOOTER, "Under every member page that scrolls; on phones it clears the tab bar.", True, mod="stack")
        + "<h3>In-page side navigation</h3>" + ex(SIDE_PREFS + SIDE_LEGAL, "Preferences' sections, and the legal pages' numbered contents with a title. Shown from 1024px, sticky under the header.", True)
        + "<h3>Grouped console navigation</h3>" + ex(GROUPED, "Group labels (from 1024px) above their items; Stories current.", True),
    "states": """<p>Navigation items have default, hover, focus, current (<code>aria-current="page"</code>, styled by a bar and weight, never colour alone) and, for the tab bar, an unread dot on Messages. Chips use <code>aria-pressed</code>. The current section stays marked on its detail pages (Events is current on an event detail).</p>""",
    "responsive": """<ul>
<li>Under 48rem the member top bar collapses to the brand and profile button, and the tab bar appears at the bottom; content gets bottom padding so nothing hides behind it.</li>
<li>Below 64rem the admin sidebar stacks above the content as a top strip and hides the group labels; from 64rem it is a sticky full-height column whose link list scrolls inside it when it outgrows the viewport.</li>
<li>The section navigation under the masthead scrolls sideways inside itself on phones.</li>
<li>Side navigation is hidden below 64rem (the sections simply follow one another); from 64rem it is a sticky column beside the content.</li>
<li>The member footer stacks on phones and pads its bottom by the tab bar's height; from 640px it is one row.</li>
<li>Tabs and chip bars scroll horizontally inside themselves rather than wrapping.</li>
<li>Breadcrumbs collapse to the parent link on phones.</li>
</ul>""",
    "accessibility": f"""<ul>
<li>Each navigation landmark has a distinct <code>aria-label</code> ("Main", "Admin", "Filter events", "Sections", "Preference sections", "Contents").</li>
<li>Footer links are 44px tall targets; side navigation links scroll to sections that set <code>scroll-margin-top</code> so the sticky header never covers the heading.</li>
<li>Console groups are an <code>&lt;h2 id&gt;</code> plus a <code>&lt;ul aria-labelledby&gt;</code> of links.</li>
<li>The skip link is first in tab order and jumps to <code>#main</code>.</li>
<li>Tab order follows reading order; {kbd("Tab")} moves between items, {kbd("Enter")} follows a link, {kbd("Space")} toggles a chip.</li>
<li>Icon-only items (profile button) have an accessible name; tab bar items always show their text label.</li>
<li>Counts are read as part of the link name ("Services 3"); give them hidden context where the number alone is unclear.</li>
</ul>""",
    "content": """<ul>
<li>Section names are single nouns: Home, Events, Services, Messages, Profile.</li>
<li>Back links name the destination, not "Back": "All events", "Back to home".</li>
<li>Page titles match the navigation label they came from.</li>
<li>News sections are the story sections' names: Latest, Events, Training, Nutrition, Faith &amp; Body, Community, Pros.</li>
<li>Console groups are one word for the job: Publish, Gather, Community.</li>
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
            mock("pages/landing/default", "news front page: masthead, section navigation, site footer"),
            mock("pages/landing/section", "a section current"),
            mock("pages/subscribe/default", "plain masthead with back link"),
            mock("pages/feedback/default", "member footer"),
            mock("pages/preferences/default", "side navigation"),
            mock("pages/privacy/default", "numbered contents"),
            mock("pages/admin-feedback/default", "grouped console navigation"),
        ],
        "drift": """<ul>
<li>Event category chips are links with <code>aria-current</code> on the Events page but toggle buttons with <code>aria-pressed</code> elsewhere (Services). Pick one: buttons with <code>aria-pressed</code> when filtering in place, links when the filter changes the URL.</li>
<li>Admin event tabs show counts; member status tabs don't.</li>
<li>The site footer and the member footer are two blocks (<code>.site-footer</code>, <code>.app-footer</code>) with different link sets; both now carry Send feedback, Privacy and Terms.</li>
</ul>""",
    },
}
