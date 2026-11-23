from dslib import ex, icon, kbd, matrix, themes

PREV, NEXT = icon("arrow-left"), icon("arrow-right")


def pager(label, cur=2, total=8, summary=True):
    def num(n):
        c = ' aria-current="page"' if n == cur else ""
        return f'<li class="pagination__number"><a class="pagination__link" href="#top" aria-label="Page {n}"{c}>{n}</a></li>'
    prev = ('<li><a class="pagination__link" aria-disabled="true" role="link" aria-label="Previous page">' + PREV + '</a></li>'
            if cur == 1 else f'<li><a class="pagination__link" href="#top" aria-label="Previous page">{PREV}</a></li>')
    nxt = ('<li><a class="pagination__link" aria-disabled="true" role="link" aria-label="Next page">' + NEXT + '</a></li>'
           if cur == total else f'<li><a class="pagination__link" href="#top" aria-label="Next page">{NEXT}</a></li>')
    pages = [1, 2, 3] if cur <= 3 else [1, cur - 1, cur, cur + 1]
    items = "".join(num(n) for n in pages)
    items += '<li class="pagination__number pagination__gap" aria-hidden="true">…</li>' + num(total) if total not in pages else ""
    only = f'<li class="pagination__page-only">Page {cur} of {total}</li>'
    summ = f'<p class="pagination__summary">Showing {(cur-1)*20+1}–{min(cur*20, 154)} of 154 members</p>' if summary else ""
    return f'<nav aria-label="{label}">{summ}<ol class="pagination__list">{prev}{items}{only}{nxt}</ol></nav>'


SPEC = {
    "lead": "Pagination splits long admin lists into pages (25 members to a page) and says where you are in them.",
    "meta": ["Status: proposed", "<code>&lt;nav&gt;</code> of links", "Mock: admin-members"],
    "overview": """<p>Use pagination on admin tables that can grow past one screen: members, events, applications. Each page is a URL (<code>?page=3</code>) so Back and sharing work. On phones the numbers collapse to "Page 2 of 8" between Previous and Next.</p>
<ul>
<li>Member-facing lists (events, messages) load more as you scroll or use a "Show more" button instead; they are windowed, not paged.</li>
<li>Show the summary ("Showing 21–40 of 154 members") when people need the total.</li>
</ul>""",
    "anatomy": {
        "figure": pager("Pagination, anatomy"),
        "callouts": [(20, 15), (4, 70), (25, 70), (50, 70)],
        "parts": [
            ("Summary", "<code>.pagination__summary</code>, 14px muted."),
            ("Previous / Next", "Icon links with <code>aria-label</code>; <code>aria-disabled</code> at either end."),
            ("Current page", "Inverse filled pill, <code>aria-current=\"page\"</code>."),
            ("Gap", "<code>.pagination__gap</code>, an ellipsis hidden from assistive technology."),
        ],
    },
    "variants": ex(pager("Pagination, example 1", 1), "First page: Previous is unavailable.", True, mod="stack")
    + ex(pager("Pagination, example 2", 5, summary=False), "Middle page without summary.", True, mod="stack"),
    "sizes": "<p>One size: 48 × 48px pills (<code>--target-comfortable</code>).</p>",
    "states": {
        "intro": "<p>Pages are links. Current uses <code>aria-current=\"page\"</code>; the unavailable end uses <code>aria-disabled=\"true\"</code> on a link without <code>href</code>.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'),
                          ("Current", ' aria-current="page"'), ("Unavailable", ' aria-disabled="true"')], [
            ("Page", '<a class="pagination__link" href="#top" aria-label="Page 3"{a}>3</a>', {"Unavailable": None}),
            ("Next", f'<a class="pagination__link" href="#top" aria-label="Next page"{{a}}>{NEXT}</a>', {"Current": None}),
        ]),
        "themes": themes(pager("Pagination, theme example", 3, summary=False)),
        "notes": "<ul><li>While the next page loads, the table shows a skeleton; pagination stays usable.</li><li>Unavailable ends stay visible so the row does not shift.</li></ul>",
    },
    "responsive": "<ul><li>Below 640px, numbered pages hide and \"Page 2 of 8\" shows between Previous and Next.</li><li>The row wraps rather than overflowing.</li></ul>",
    "theming": "<p>Reads <code>--color-fg-muted</code>, <code>--color-bg-subtle</code> (hover), <code>--color-bg-inverse</code> and <code>--color-fg-inverse</code> (current), <code>--color-fg-disabled</code>.</p>",
    "accessibility": {
        "pattern": "<p><code>&lt;nav aria-label=\"Pagination\"&gt;</code> with an ordered list of links. Page links carry <code>aria-label=\"Page 3\"</code>.</p>",
        "keys": [(kbd("Tab"), "Moves through Previous, pages and Next; unavailable ends are skipped because they have no href."), (kbd("Enter"), "Opens the page and moves focus to the table caption.")],
        "focus": "<p>Shared 2px ring around the pill.</p>",
        "labelling": "<p>Icon links are named \"Previous page\" and \"Next page\". The gap is <code>aria-hidden</code>.</p>",
        "pairs": [("Page number", "--color-fg-muted", "--color-bg-canvas", 4.5), ("Current", "--color-fg-inverse", "--color-bg-inverse", 4.5)],
        "motion": "<p>Background transitions over <code>--duration-fast</code>.</p>",
        "touch": "<p>48 × 48px targets, 4px apart.</p>",
    },
    "content": "<ul><li>\"Showing 21–40 of 154 members\": en dash for the range, the plural noun of the list.</li><li>\"Page 2 of 8\" on phones.</li></ul>",
    "dodont": [
        ("do", pager("Pagination, do example 1", 1, summary=False), "Keep the unavailable end in place."),
        ("dont", pager("Pagination, don't example 1", 1, summary=False).replace('<li><a class="pagination__link" aria-disabled="true" role="link" aria-label="Previous page">' + PREV + '</a></li>', ""), "Removing Previous shifts every number."),
        ("do", pager("Pagination, do example 2", 2), "Totals in the summary for admin lists."),
        ("dont", '<nav aria-label="Pagination, don\'t example 2"><ol class="pagination__list"><li><a class="pagination__link" href="#top">1</a></li><li><a class="pagination__link" href="#top">2</a></li></ol></nav>', "No current page and unnamed numbers."),
    ],
    "tokens": [
        ("Link / hover", "--color-fg-muted / --color-bg-subtle", "color"),
        ("Current", "--color-bg-inverse / --color-fg-inverse", "color"),
        ("Unavailable", "--color-fg-disabled", "color"),
        ("Gap", "--color-fg-subtle", "color"),
        ("Target", "--target-comfortable", "value"),
        ("Radius", "--radius-full", "value"),
    ],
    "code": {
        "snippet": '''<nav aria-label="Pagination">
  <p class="pagination__summary">Showing 21–40 of 154 members</p>
  <ol class="pagination__list">
    <li><a class="pagination__link" href="?page=1" aria-label="Previous page">…</a></li>
    <li class="pagination__number"><a class="pagination__link" href="?page=2" aria-label="Page 2" aria-current="page">2</a></li>
    <li class="pagination__number pagination__gap" aria-hidden="true">…</li>
    <li class="pagination__page-only">Page 2 of 8</li>
    <li><a class="pagination__link" href="?page=3" aria-label="Next page">…</a></li>
  </ol>
</nav>''',
        "classes": [
            ("<code>.pagination__list</code> <code>.pagination__link</code>", "Row and pill link."),
            ("<code>.pagination__number</code> <code>.pagination__page-only</code>", "Numbers hide and \"Page x of y\" shows below 640px."),
            ("<code>.pagination__gap</code> <code>.pagination__summary</code>", "Ellipsis; range summary."),
            ("<code>aria-current=\"page\"</code> · <code>aria-disabled=\"true\"</code>", "Current; unavailable end."),
        ],
    },
    "sources": {"mocks": [], "drift": "No mock pages a list; admin tables show every row. Added from the core component set for when lists grow."},
}
