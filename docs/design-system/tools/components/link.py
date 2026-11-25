from dslib import ex, icon, kbd, matrix, mock, themes

EXT = '<svg class="icon link__external" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>'
ARROW = icon("arrow-right")
BACK = icon("arrow-left")
EXT_XS = icon("external-link", "icon--xs")
TERMS = ('<p class="auth__terms">By creating a profile you agree to our <a class="inline-link" href="#">Terms of Service</a> '
         'and <a class="inline-link" href="#">Privacy Policy</a>.</p>')
INK = ('<p class="muted">Mississauga · <a class="inline-link inline-link--ink" href="#" target="_blank" rel="noopener noreferrer">'
       f'delaneyperformance.ca {EXT_XS}<span class="visually-hidden"> (opens in a new tab)</span></a></p>')

LINK_STATES = [("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'),
               ("Active", ' data-state="active"'), ("Current", ' aria-current="page"')]

SPEC = {
    "lead": "Links take people somewhere: another page, a section, a profile, a partner's site. They never change anything on their own.",
    "meta": ["Status: stable", "Native <code>&lt;a href&gt;</code>"],
    "overview": """<p>Use a link when activating it navigates. Use a <a href="button.html">button</a> when it changes something (register, send, retry), even if it should look like a link: that is <code>.btn--link</code>.</p>
<ul>
<li><b>Inline link</b> (<code>.link</code>) sits inside running text: underlined, in the link colour, so it is never told apart by colour alone.</li>
<li><b>Inline link, semibold</b> (<code>.inline-link</code>) is the inline link the newer screens use: underlined and semibold in the link colour, in a sentence ("Privacy Policy" on Preferences, the Join terms, the delete-account dialog). Inside <code>.auth__terms</code> it drops to regular weight and the sentence's muted colour, keeping only the underline. <code>.inline-link--ink</code> sets it in the body colour with an inline-flex icon slot, for a website beside other muted facts (admin listings suggestion).</li>
<li><b>Text link</b> (<code>.text-link</code>) is a standalone semibold link beside a section heading: "All events →", "Open". The quiet form (<code>.text-link--quiet</code>) recedes in muted text; <code>.text-link--ui</code> raises it to 15px under a page title ("Know someone who belongs here? Suggest a listing").</li>
<li><b>Row link, quiet</b> (<code>.row-link.row-link--quiet</code>) is the secondary action in an admin table row, muted beside the accent <code>.row-link</code>: "Make it a pick" before "Edit" on Manage events. It never wraps.</li>
<li><b>Back link</b> (<code>.back-link</code>) leads to the parent list at the top of a detail page: "← All events".</li>
<li><b>External link</b> adds the small out-arrow (<code>.link__external</code>) and says so to screen readers.</li>
</ul>""",
    "anatomy": {
        "figure": f'<p>Read the <a class="link" href="#">community guidelines{EXT}<span class="visually-hidden"> (opens in a new tab)</span></a> before you post.</p>',
        "callouts": [(40, 30), (62, 30), (40, 78)],
        "parts": [
            ("Label", "The words that say where it goes; they are the accessible name."),
            ("External icon (optional)", "12px (<code>--size-icon-xs</code>) out-arrow, <code>aria-hidden</code>, paired with visually hidden \"(opens in a new tab)\"."),
            ("Underline", "Offset by <code>--space-0-5</code>; thickens on hover so the state does not rely on colour."),
        ],
    },
    "variants": ex(
        '<p>New here? Read <a class="link" href="#">how events work</a> before your first run.</p>',
        "Inline link inside body copy.", True)
    + ex(f'<a class="text-link" href="#">All events {ARROW}</a>'
         '<a class="text-link" href="#">Open</a>'
         '<a class="text-link text-link--quiet" href="#">Not now</a>',
         "Text links beside section headings on Home; quiet for secondary escapes.", True)
    + ex(TERMS, "Inline link, semibold; inside the Join terms it takes the sentence's muted colour and regular weight.", True)
    + ex('<p class="pref__note">Read how we handle your information in our <a class="inline-link" href="#">Privacy Policy</a>.</p>',
         "Inline link, semibold, in a note (Preferences).", True)
    + ex(INK, "Inline link, ink: a website in body colour among muted facts, with the external icon (admin listings).", True)
    + ex('<p class="page-head__more"><a class="text-link text-link--ui" href="#">Know someone who belongs here? Suggest a listing</a></p>',
         "Text link at UI size, under the Directory title.", True)
    + ex('<span class="row-actions"><a class="row-link row-link--quiet" href="#">Make it a pick<span class="visually-hidden">: Easter Sunrise 5K</span></a>'
         '<a class="row-link" href="#">Edit<span class="visually-hidden">: Easter Sunrise 5K</span></a></span>',
         "Quiet row link before the row's main link, with hidden context (Manage events).", True)
    + ex(f'<a class="back-link" href="#">{BACK} All events</a>',
         "Back link at the top of event detail.", True)
    + ex(f'<p>Danielle is registered with the <a class="link" href="#" target="_blank" rel="noopener">College of Kinesiologists of Ontario{EXT}<span class="visually-hidden"> (opens in a new tab)</span></a>.</p>',
         "External link: icon plus hidden text.", True),
    "sizes": """<p>Links take the size of their context. Inline links inherit the paragraph's size; text, row and back links are 14px semibold (<code>--font-size-sm</code>). The one size modifier is <code>.text-link--ui</code>, 15px (<code>--font-size-ui</code>), for a text link that stands alone under a page title.</p>""",
    "states": {
        "intro": "<p>Pointer and focus states are forced with <code>data-state</code>; live pages use <code>:hover</code>, <code>:focus-visible</code> and <code>:active</code>. A link that points at the current page carries <code>aria-current=\"page\"</code>. Links have no disabled state: remove the link and show plain text instead.</p>",
        "matrix": matrix(LINK_STATES, [
            ("Inline", '<a class="link" href="#"{a}>Guidelines</a>'),
            ("Text link", '<a class="text-link" href="#"{a}>All events</a>', {"Current": None}),
            ("Inline, semibold", '<a class="inline-link" href="#"{a}>Privacy Policy</a>', {"Current": None}),
            ("Inline, ink", '<a class="inline-link inline-link--ink" href="#"{a}>delaneyperformance.ca</a>', {"Current": None}),
            ("Quiet text link", '<a class="text-link text-link--quiet" href="#"{a}>Not now</a>', {"Current": None}),
            ("Text link, UI size", '<a class="text-link text-link--ui" href="#"{a}>Suggest a listing</a>', {"Current": None}),
            ("Quiet row link", '<a class="row-link row-link--quiet" href="#"{a}>Make it a pick</a>', {"Current": None}),
            ("Back link", '<a class="back-link" href="#"{a}>All events</a>', {"Current": None}),
        ]),
        "themes": themes('<p>Read <a class="link" href="#">how events work</a>.</p>'
                         '<a class="text-link" href="#">All events</a>'
                         '<a class="back-link" href="#">Back</a>'),
        "notes": """<ul>
<li><b>Visited</b> is not styled: most links are app navigation where "visited" means nothing.</li>
<li><b>Disabled</b> does not exist. A link that cannot go anywhere is text.</li>
<li><b>Hover</b>: <code>.inline-link</code>, <code>.inline-link--ink</code> and <code>.row-link--quiet</code> have no hover style of their own, so the matrix shows no change; <code>.row-link--quiet</code> takes the row link's underline on real <code>:hover</code> only (there is no <code>data-state</code> hook). The underline already marks the inline links.</li>
<li><b>Current</b> uses <code>aria-current="page"</code>; navigation components (<a href="tabs.html">tabs</a>, <a href="sidebar-navigation.html">sidebar</a>) style it.</li>
</ul>""",
    },
    "responsive": """<ul>
<li>Inline links wrap with their sentence; never set <code>white-space: nowrap</code> on long names.</li>
<li>Under <code>(pointer: coarse)</code> text links extend their hit area to 44 × 44px with a pseudo-element.</li>
<li>Back links collapse a breadcrumb on phones: the parent becomes the back link.</li>
<li><code>.row-link--quiet</code> keeps one line (<code>white-space: nowrap</code>); the admin table scrolls inside its wrapper instead of wrapping actions.</li>
</ul>""",
    "theming": """<p>Inline links (<code>.link</code>, <code>.inline-link</code>) read <code>--color-fg-link</code> and <code>--color-fg-link-hover</code>; <code>.inline-link--ink</code> reads <code>--color-fg-default</code>; text and row links read <code>--color-fg-accent</code>, and the quiet row link <code>--color-fg-muted</code>. In the dark theme both lift to lighter bordeaux tints so they keep 4.5:1 on dark surfaces. Re-skin by reassigning the semantic tokens, never by colouring a single link.</p>""",
    "accessibility": {
        "pattern": '<p>Native <code>&lt;a href&gt;</code> (<a href="https://www.w3.org/WAI/ARIA/apg/patterns/link/">APG Link</a>). Never a <code>&lt;span&gt;</code> with a click handler, never an <code>&lt;a&gt;</code> without <code>href</code>.</p>',
        "keys": [
            (kbd("Tab") + " / " + kbd("Shift", "Tab"), "Moves focus to and from the link."),
            (kbd("Enter"), "Follows the link (Space scrolls the page, as browsers do)."),
        ],
        "focus": "<p>The shared ring, 2px <code>--color-focus-ring</code> at 2px offset, on <code>:focus-visible</code>; <code>--radius-xs</code> rounds it around inline links.</p>",
        "labelling": "<p>The link text says where it goes out of context: \"All events\", not \"Click here\" or \"More\". When a row repeats \"Open\", add hidden context: <code>Open&lt;span class=\"visually-hidden\"&gt; Saturday run chat&lt;/span&gt;</code>. New-tab links say so in hidden text.</p>",
        "pairs": [
            ("Inline link on surface", "--color-fg-link", "--color-bg-surface", 4.5),
            ("Inline link hover", "--color-fg-link-hover", "--color-bg-surface", 4.5),
            ("Text link on canvas", "--color-fg-accent", "--color-bg-canvas", 4.5),
            ("Ink inline link on surface", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Quiet row link on surface", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Back link on canvas", "--color-fg-muted", "--color-bg-canvas", 4.5),
            ("Focus ring on surface", "--color-focus-ring", "--color-bg-surface", 3),
        ],
        "motion": "<p>No motion. Colour and underline thickness change instantly.</p>",
        "touch": "<p>Text links extend to 44 × 44px on coarse pointers. Row links (and so <code>.row-link--quiet</code>) are listed for the coarse-pointer extension but get only <code>position: relative</code>, not the <code>::after</code> hit area, so they stay at their text height; that is a stylesheet gap to fix. Inline links in body text are exempt (WCAG 2.5.8 inline exception) but keep at least one line of space between stacked links.</p>",
    },
    "content": """<ul>
<li>Name the destination: "All events", "Community guidelines", "Danielle's profile".</li>
<li>Sentence case; no trailing full stop inside the link.</li>
<li>Back links name the parent ("All events"), not "Back".</li>
<li>Do not link a whole sentence; link the noun phrase that names the place. A text link under a title may be a question and an answer: "Know someone who belongs here? Suggest a listing".</li>
<li>A row link that repeats per row adds the row's name in hidden text: "Make it a pick" plus a visually hidden ": Easter Sunrise 5K".</li>
</ul>""",
    "dodont": [
        ("do", f'<a class="text-link" href="#">All events {ARROW}</a>', "Name the destination (Home, beside \"This week\")."),
        ("dont", '<a class="text-link" href="#">Click here</a>', "\"Click here\" means nothing in a list of links and assumes a mouse."),
        ("do", '<p>Read <a class="link" href="#">how events work</a> first.</p>', "Inline links are underlined, not just coloured."),
        ("dont", '<button class="btn btn--link" type="button">Events</button>', "A button that only navigates breaks Open in new tab and history; use a link."),
        ("do", INK, "An external website says it opens a new tab, in hidden text beside the icon."),
        ("dont", '<p class="muted">Mississauga · <a class="inline-link inline-link--ink" href="#" target="_blank" rel="noopener noreferrer">delaneyperformance.ca</a></p>', "A new tab with no warning, as the admin listings mock draws it: screen-reader users lose their place."),
    ],
    "tokens": [
        ("Inline link / hover / active", "--color-fg-link / --color-fg-link-hover / --color-accent-active", "color"),
        ("Text link / row link", "--color-fg-accent", "color"),
        ("Ink inline link", "--color-fg-default", "color"),
        ("Quiet row link", "--color-fg-muted", "color"),
        ("Inline link weight", "--font-weight-semibold", "value"),
        ("Ink icon gap", "--space-1", "value"),
        ("Text link UI size", "--font-size-ui", "value"),
        ("Quiet text link / hover", "--color-fg-muted / --color-fg-default", "color"),
        ("Focus ring", "--color-focus-ring", "color"),
        ("Underline offset", "--space-0-5", "value"),
        ("Hover underline", "--border-width-thick", "value"),
        ("Focus rounding", "--radius-xs", "value"),
        ("External icon", "--size-icon-xs", "value"),
        ("Text link size", "--font-size-sm", "value"),
    ],
    "code": {
        "snippet": '''<a class="link" href="/guidelines">community guidelines</a>

<a class="text-link" href="/events">All events <svg class="icon" aria-hidden="true">…</svg></a>

<a class="back-link" href="/events"><svg class="icon" aria-hidden="true">…</svg> All events</a>

<a class="link" href="https://example.org" target="_blank" rel="noopener">
  College of Kinesiologists<svg class="icon link__external" aria-hidden="true">…</svg>
  <span class="visually-hidden"> (opens in a new tab)</span>
</a>''',
        "classes": [
            ("<code>.link</code>", "Inline, underlined link in running text."),
            ("<code>.link__external</code>", "12px out-arrow icon for external links."),
            ("<code>.inline-link</code> <code>.inline-link--ink</code>", "Semibold underlined inline link; ink colour with an icon slot."),
            ("<code>.text-link</code> <code>.text-link--quiet</code> <code>.text-link--ui</code>", "Standalone semibold link; muted variant; 15px size."),
            ("<code>.row-link</code> <code>.row-link--quiet</code>", "Admin table row action; muted, one-line secondary."),
            ("<code>.back-link</code>", "Muted link to the parent page with a leading arrow."),
            ("<code>aria-current=\"page\"</code>", "Marks the link to the current page."),
            ("<code>data-state=\"hover|focus|active\"</code>", "Documentation only: forces a state."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/home/default", "text links beside section headings"),
            mock("pages/event-detail/default", "back link to All events"),
            mock("pages/landing/default", "links in the public site"),
            mock("pages/join/default", "inline links in the terms"),
            mock("pages/preferences/default", "inline link in a note"),
            mock("dialogs/delete-account/default", "inline link"),
            mock("pages/admin-listings/default", "ink inline link to a website"),
            mock("pages/directory/default", "text link at UI size"),
            mock("pages/admin-events/default", "quiet row link Make it a pick"),
        ],
        "drift": "The mocks only had text and back links; the inline <code>.link</code> and its external icon were added from the core set so links in body copy are underlined (WCAG 1.4.1). Text link hit areas grow to 44px on coarse pointers. The newer screens use <code>.inline-link</code> (semibold, no hover change) where the core set has <code>.link</code>: two inline links. Proposed: one inline link, <code>.link</code>, with the semibold weight as an option. The admin listings mock opens a website in a new tab without saying so; the example here adds the hidden \"(opens in a new tab)\".",
    },
}
