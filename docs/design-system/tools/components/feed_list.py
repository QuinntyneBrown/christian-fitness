from cf_data import FEEDS
from dslib import ex, icon, kbd, matrix, mock, themes


def feed(i, label, url, count, copied=False, a=""):
    copy = (f'<button class="btn btn--secondary btn--sm feed__copy" type="button"{a}>{icon("check" if copied else "copy")}'
            f'{"Copied" if copied else "Copy URL"}<span class="visually-hidden"> of the {label.replace("&", "&amp;")} feed</span></button>')
    lab = label.replace("&", "&amp;")
    return (f'<li class="feed{" feed--all" if i == "all" else ""}"><div class="feed__body">'
            f'<p class="feed__name">{lab} <span class="feed__count">{count}</span></p><p class="feed__url">{url}</p></div>'
            f'<div class="feed__actions">{copy}<a class="btn btn--neutral btn--sm" href="#top">Open in Feedly'
            f'<span class="visually-hidden"> the {lab} feed (opens in a new tab)</span></a></div></li>')


def feed_list(rows=FEEDS, copied=""):
    live = f'<p class="visually-hidden" role="status">{"Feed address copied" if copied else ""}</p>'
    return f'<ul class="feed-list">{"".join(feed(*r, copied=(r[0] == copied)) for r in rows)}</ul>{live}'


def rss(inner):
    return ('<section class="rss" aria-label="Prefer RSS, example"><div class="rss__inner"><div>'
            f'<p class="display rss__title">{icon("rss", "rss__icon")}Prefer RSS?</p>'
            '<p class="rss__text">Follow every story, or just the sections you care about, in Feedly, Inoreader, NetNewsWire or any reader. No email or account needed.</p>'
            f'</div>{inner}</div></section>')


SHORT = FEEDS[:3]

SPEC = {
    "lead": "The feed list offers every RSS feed with its address, how often it posts, a Copy URL button and a way to open it in a reader.",
    "meta": ["Status: new", "<code>&lt;ul&gt;</code> of feeds", "Subscribe page"],
    "overview": """<p>The RSS section (<code>.rss</code>) closes the Subscribe page for readers who would rather not give an email address: a title with the RSS mark, one paragraph, and the feed list.</p>
<ul>
<li><b>All stories</b> (<code>.feed--all</code>) comes first on a blush fill: it is what most readers want.</li>
<li>Then one feed per section (Events, Training, Nutrition, Faith &amp; Body, Community), each with its posting rate (\"~6 a week\").</li>
<li>Each row offers <b>Copy URL</b>, the universal way into any reader, and <b>Open in Feedly</b>, a one-click shortcut.</li>
</ul>
<p>Use it only for feeds. A list of things to pick belongs in a <a href="list.html">list</a>; a list of settings in preference rows.</p>""",
    "anatomy": {
        "figure": f'<ul class="feed-list">{feed(*FEEDS[0])}</ul>',
        "callouts": [(4, 30), (20, 30), (4, 62), (62, 50), (86, 50)],
        "parts": [
            ("Name", "<code>.feed__name</code>, semibold."),
            ("Rate", "<code>.feed__count</code>, muted 14px: \"~20 a week\"."),
            ("Address", "<code>.feed__url</code> in the mono font, one line, truncated with an ellipsis."),
            ("Copy URL", "Secondary small button, fixed 7rem so \"Copied\" does not shift the row."),
            ("Open in Feedly", "Neutral small button; opens a new tab."),
        ],
    },
    "variants": "<h3>RSS section</h3>" + ex(rss(feed_list(SHORT)), "Subscribe, Prefer RSS?: the title and text, then the list (three of six feeds shown).", True, mod="block")
    + "<h3>Feed rows</h3>" + ex(f'<ul class="feed-list">{feed(*FEEDS[0])}{feed(*FEEDS[4])}</ul>', "All stories (<code>.feed--all</code>, blush) and a section feed.", True, mod="block"),
    "sizes": "<p>One size. Rows pad 16px (20px sides from 640px); buttons are <code>btn--sm</code>.</p>",
    "states": {
        "intro": "<p>The rows are static; the buttons carry the states. After Copy URL the button reads \"Copied\" with a check for a moment, and a visually hidden <code>role=\"status\"</code> says \"Feed address copied\".</p>",
        "matrix": matrix([("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'), ("Active", ' data-state="active"')], [
            ("Copy URL", f'<button class="btn btn--secondary btn--sm feed__copy" type="button"{{a}}>{icon("copy")}Copy URL</button>'),
            ("Open in Feedly", '<a class="btn btn--neutral btn--sm" href="#top"{a}>Open in Feedly</a>'),
        ]) + "<h3>Copied</h3>" + ex(feed_list(SHORT, copied="all"), "Copy URL pressed on All stories.", True, mod="block"),
        "themes": themes(f'<ul class="feed-list">{feed(*FEEDS[0], copied=True)}{feed(*FEEDS[1])}</ul>', "block"),
        "notes": "<ul><li>\"Copied\" reverts to \"Copy URL\" after about two seconds; the status message stays for screen readers.</li><li>If the clipboard is refused, the address is already visible and selectable: no error is shown.</li></ul>",
    },
    "responsive": """<ul>
<li><b>Phones</b>: each row stacks, name and address above the two buttons.</li>
<li><b>From 640px</b>: one row, text growing and buttons at the end; the address truncates instead of wrapping.</li>
<li><b>From 1024px</b>: the RSS section is two columns, the title and text (1fr) beside the list (2fr).</li>
</ul>""",
    "theming": "<p>The list is <code>--color-bg-surface</code> with hairline <code>--color-border-default</code> rules, on the section's <code>--color-bg-canvas</code>. All stories fills <code>--color-accent-subtle</code>. Rate and address read <code>--color-fg-muted</code>; the RSS mark <code>--color-fg-accent</code>.</p>",
    "accessibility": {
        "pattern": "<p>A <code>&lt;ul&gt;</code> of feeds with native buttons and links. Each button's name says which feed through visually hidden text: \"Copy URL of the Events feed\", \"Open in Feedly the Events feed (opens in a new tab)\". The copy result is a polite live region.</p>",
        "keys": [(kbd("Tab"), "Copy URL, then Open in Feedly, feed by feed."), (kbd("Enter") + " / " + kbd("Space"), "Copies the address."), (kbd("Enter"), "Opens Feedly in a new tab.")],
        "focus": "<p>The shared ring on each button; focus stays on Copy URL after copying.</p>",
        "labelling": "<p>Visible text stays short; the hidden suffix makes every name unique so a list of buttons is not twelve identical \"Copy URL\"s. The new-tab warning is in the name.</p>",
        "pairs": [
            ("Name", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Rate, address", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Rate on All stories", "--color-fg-muted", "--color-accent-subtle", 4.5),
            ("RSS mark", "--color-fg-accent", "--color-bg-canvas", 3),
            ("Section text", "--color-fg-muted", "--color-bg-canvas", 4.5),
        ],
        "motion": "<p>None beyond the buttons' colour transition.</p>",
        "touch": "<p>Small buttons are 36px tall with an 8px gap; on phones they sit below the text, away from it.</p>",
    },
    "content": """<ul>
<li>Feed names match the sections exactly: \"All stories\", \"Events\", \"Faith &amp; Body\".</li>
<li>Rates are approximate and weekly: \"~4 a week\".</li>
<li>Show the full address, starting https://; never shorten it.</li>
<li>Buttons: \"Copy URL\" → \"Copied\"; \"Open in Feedly\".</li>
</ul>""",
    "dodont": [
        ("do", f'<ul class="feed-list">{feed(*FEEDS[1])}</ul>', "Each button names its feed for screen readers."),
        ("dont", '<ul class="feed-list"><li class="feed"><div class="feed__body"><p class="feed__name">Events</p></div><div class="feed__actions"><button class="btn btn--secondary btn--sm feed__copy" type="button">Copy URL</button></div></li><li class="feed"><div class="feed__body"><p class="feed__name">Training</p></div><div class="feed__actions"><button class="btn btn--secondary btn--sm feed__copy" type="button">Copy URL</button></div></li></ul>',
         "Identical \"Copy URL\" names and no visible address: nothing to check, and a screen reader hears the same button six times."),
        ("do", f'<ul class="feed-list">{feed(*FEEDS[0])}{feed(*FEEDS[2])}</ul>', "All stories first, highlighted: most readers want everything."),
        ("dont", f'<ul class="feed-list">{feed(*FEEDS[2])}{feed(*FEEDS[0])}</ul>'.replace(" feed--all", ""), "All stories buried among the sections with no emphasis."),
    ],
    "tokens": [
        ("List / rules", "--color-bg-surface / --color-border-default", "color"),
        ("All stories", "--color-accent-subtle", "color"),
        ("Rate, address", "--color-fg-muted", "color"),
        ("Section / mark", "--color-bg-canvas / --color-fg-accent", "color"),
        ("Address font", "--font-family-mono", "value"),
        ("Row padding", "--space-4 / --space-5", "value"),
        ("Gaps", "--space-2 / --space-3 / --space-6", "value"),
        ("Section padding", "--space-12 / --space-16", "value"),
    ],
    "code": {
        "snippet": '''<ul class="feed-list">
  <li class="feed feed--all">
    <div class="feed__body">
      <p class="feed__name">All stories <span class="feed__count">~20 a week</span></p>
      <p class="feed__url">https://christianfitness.ca/feed</p>
    </div>
    <div class="feed__actions">
      <button class="btn btn--secondary btn--sm feed__copy" type="button"><svg class="icon" aria-hidden="true">…</svg>Copy URL<span class="visually-hidden"> of the All stories feed</span></button>
      <a class="btn btn--neutral btn--sm" href="https://feedly.com/i/subscription/feed/…" target="_blank" rel="noopener noreferrer">Open in Feedly<span class="visually-hidden"> the All stories feed (opens in a new tab)</span></a>
    </div>
  </li>
</ul>
<p class="visually-hidden" role="status"></p>''',
        "classes": [
            ("<code>.rss</code> <code>__inner</code> <code>__title</code> <code>__icon</code> <code>__text</code>", "The Prefer RSS? section."),
            ("<code>.feed-list</code>", "Surface list with hairline rules."),
            ("<code>.feed</code> <code>--all</code>", "A feed row; All stories is blush."),
            ("<code>__body</code> <code>__name</code> <code>__count</code> <code>__url</code>", "Feed text; the address truncates."),
            ("<code>__actions</code> <code>__copy</code>", "Buttons; Copy URL is a fixed width."),
        ],
    },
    "sources": {
        "mocks": [mock("pages/subscribe/default", "Prefer RSS? and the six feeds"), mock("pages/subscribe/copied", "Copied on All stories")],
        "drift": "<code>.feed__copy</code> is a fixed <code>7rem</code> wide, a raw size rather than a token; acceptable as a component dimension but worth a <code>--size-*</code> token if reused.",
    },
}
