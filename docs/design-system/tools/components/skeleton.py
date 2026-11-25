from dslib import ex, kbd, mock, themes, na

ROW = ('<li class="event-row"><span class="skeleton skeleton--date"></span><div class="event-row__body skeleton-stack">'
       '<span class="skeleton skeleton--text w-55"></span><span class="skeleton skeleton--text-sm w-40"></span></div></li>')
LIST = f'<ul class="list-ruled">{ROW * 3}</ul>'
MINI = ('<li class="mini-row"><span class="skeleton skeleton--avatar"></span><div class="mini-row__body skeleton-stack">'
        '<span class="skeleton skeleton--text w-55"></span><span class="skeleton skeleton--text-sm w-90"></span></div></li>')
CARD = ('<div class="next-event"><span class="skeleton skeleton--block skeleton--image-16x8"></span>'
        '<div class="skeleton-stack"><span class="skeleton skeleton--text-sm w-40"></span><span class="skeleton skeleton--title-lg"></span>'
        '<span class="skeleton skeleton--text w-55"></span></div></div>')


def region(label, inner):
    return f'<div aria-busy="true"><p class="visually-hidden">{label}</p>{inner}</div>'


SPEC = {
    "lead": "Skeletons hold the shape of a page while it loads, so it settles into place instead of jumping.",
    "meta": ["Status: stable", "Shimmer stops with reduced motion"],
    "overview": """<p>Use skeletons for a first load whose layout is known: the home page, event lists, conversations, profiles, admin tables. Each skeleton matches the size of the content it stands in for (a date badge, a title line, an avatar), and known content (the greeting "Good morning, Grace", page titles) renders for real.</p>
<p>Use a <a href="spinner.html">spinner</a> for a small refresh and a <a href="progress-bar.html">progress bar</a> for a long, measurable task. If loading fails, the skeletons are replaced by an <a href="inline-message.html">inline message</a> or the error block on the <a href="empty-state.html">empty state</a> page.</p>""",
    "anatomy": {
        "figure": region("Loading events", f'<ul class="list-ruled">{ROW}</ul>'),
        "callouts": [(6, 50), (40, 38), (35, 64)],
        "parts": [
            ("Shape", "<code>.skeleton--date</code>, <code>--avatar</code>, <code>--button</code> and so on: the exact box of the real part."),
            ("Line", "<code>.skeleton--text</code> (title-height) with a width utility (<code>.w-55</code>) so lines vary."),
            ("Short line", "<code>.skeleton--text-sm</code> for meta text; <code>.skeleton-stack</code> spaces lines 8px apart."),
        ],
    },
    "variants": ex(region("Loading events", LIST), "Event rows: date tile and two lines.", True)
    + ex(region("Loading conversations", f'<ul class="list-ruled">{MINI * 2}</ul>'), "Conversation or person rows: avatar and two lines.", True)
    + ex(region("Loading your next event", CARD), "Next-event card: image block, eyebrow, large title, meta.", True),
    "sizes": ex('<div class="skeleton-stack"><span class="skeleton skeleton--title-lg"></span><span class="skeleton skeleton--title"></span>'
                '<span class="skeleton skeleton--text"></span><span class="skeleton skeleton--text-sm"></span></div>'
                '<span class="skeleton skeleton--avatar"></span><span class="skeleton skeleton--avatar-xl"></span>'
                '<span class="skeleton skeleton--button"></span><span class="skeleton skeleton--chip"></span>',
                "Lines: title-lg, title, text, text-sm. Shapes: avatar, avatar-xl, button, chip. Heights are multiples of <code>--space-1</code>.", True),
    "states": {
        "intro": "<p>Skeletons have one state, loading, with a shimmer sweep. When data arrives the region swaps to real content in one step; partial results may replace sections one at a time.</p>",
        "matrix": na("A skeleton has no interactive or tonal states; the loading-to-content swap is described below."),
        "themes": themes(region("Loading events", f'<ul class="list-ruled">{ROW * 2}</ul>')),
        "notes": "<ul><li>Show skeletons immediately; don't delay them like a spinner.</li><li>Keep the count close to reality (3 to 5 rows), never a screen of 20.</li><li>Under reduced motion the shimmer stops and the shapes stay as flat blocks.</li></ul>",
    },
    "responsive": "<p>Skeletons live inside the real layout classes (<code>.event-row</code>, <code>.event-grid</code>, <code>.split</code>), so they reflow exactly as the content will. The banner image skeleton changes from 16:9 to 21:8 at 640px like the image.</p>",
    "theming": "<p>The base is <code>--color-bg-skeleton</code> and the shimmer is a gradient to <code>--color-skeleton-shine</code>; both have light and dark values, so no theme-specific rule exists.</p>",
    "accessibility": {
        "pattern": '<p>The loading region sets <code>aria-busy="true"</code> and contains a <code>.visually-hidden</code> label ("Loading events"); in the app it is also <code>aria-live="polite"</code> so the arrival of content is not announced line by line. Skeleton spans have no content and no role; as decorative placeholders they are exempt from contrast minimums, so no pair is listed.</p>',
        "keys": [(kbd("Tab"), "Skips skeletons entirely; known controls (search, filters) stay usable while lists load.")],
        "focus": na("Skeletons are not focusable."),
        "labelling": "<p>One hidden label per region, naming what is loading. A page whose heading is not yet known keeps a visually hidden <code>h1</code> (\"Loading event\").</p>",
        "pairs": [],
        "motion": "<p>The shimmer sweeps continuously; <code>prefers-reduced-motion</code> removes the animation.</p>",
        "touch": na("Not interactive."),
    },
    "content": "<ul><li>Render known text for real: the page title, greeting and filter chips.</li><li>The hidden label is \"Loading\" plus the thing: \"Loading events\", \"Loading your home page\".</li></ul>",
    "dodont": [
        ("do", region("Loading events", f'<ul class="list-ruled">{ROW * 2}</ul>'), "Match the real row: date tile and two lines (events loading)."),
        ("dont", '<div aria-busy="true"><p class="visually-hidden">Loading events</p><span class="skeleton skeleton--block skeleton--image-16x9"></span></div>', "One big grey block hides the shape and still shifts the layout."),
        ("do", '<div class="skeleton-stack"><span class="skeleton skeleton--text w-55"></span><span class="skeleton skeleton--text-sm w-90"></span></div>', "Vary line widths so it reads as text."),
        ("dont", '<div class="skeleton-stack"><span class="skeleton skeleton--text w-90"></span><span class="skeleton skeleton--text w-90"></span><span class="skeleton skeleton--text w-90"></span></div>', "Identical bars look like a broken page."),
    ],
    "tokens": [
        ("Base / shine", "--color-bg-skeleton / --color-skeleton-shine", "color"),
        ("Line and shape heights", "--space-1", "value"),
        ("Avatar sizes", "--size-avatar-lg / --size-avatar-xl", "value"),
        ("Date tile width", "--size-date-col", "value"),
        ("Radius", "--radius-full / --radius-sm / --radius-lg", "value"),
    ],
    "code": {
        "snippet": '''<div aria-busy="true" aria-live="polite">
  <p class="visually-hidden">Loading events</p>
  <ul class="list-ruled">
    <li class="event-row">
      <span class="skeleton skeleton--date"></span>
      <div class="event-row__body skeleton-stack">
        <span class="skeleton skeleton--text w-55"></span>
        <span class="skeleton skeleton--text-sm w-40"></span>
      </div>
    </li>
  </ul>
</div>''',
        "classes": [
            ("<code>.skeleton</code>", "Base block with shimmer."),
            ("<code>.skeleton--text</code> <code>--text-sm</code> <code>--title</code> <code>--title-lg</code>", "Lines."),
            ("<code>.skeleton--avatar</code> <code>--avatar-xl</code> <code>--avatar-profile</code> <code>--mark-xl</code> <code>--date</code> <code>--button</code> <code>--chip</code> <code>--bubble</code> <code>--tile</code> <code>--stat</code>", "Shapes."),
            ("<code>.skeleton--block</code> <code>--image-16x8</code> <code>--image-16x9</code> <code>--image-banner</code> <code>--image-banner-wide</code>", "Images: the banner ratios are those of <code>.banner-image</code> and <code>.banner-image--wide</code> (16:9, 21:8 and 21:7 from 640px)."),
            ("<code>.skeleton-stack</code> <code>.w-40</code> … <code>.w-90</code>", "Line spacing and widths."),
            ('<code>aria-busy="true"</code>', "On the loading region."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/home/loading", "next-event card, rows"),
            mock("pages/events/loading", "event cards"),
            mock("pages/messages/loading", "bubbles"),
            mock("pages/profile/loading", "profile hero"),
            mock("pages/admin-dashboard/loading", "stats, queue"),
        ],
        "drift": "The shimmer used a raw <code>rgb()</code> per theme; it is now <code>--color-skeleton-shine</code>. Sizes were raw rem values; they are now multiples of <code>--space-1</code> and size tokens. Closed: the proportions now match the loaded parts: the date skeleton is the 52px height of <code>.date-tile</code>, the banner skeletons use the ratios of <code>.banner-image</code> and <code>--wide</code>, and the listing mark skeleton is the 112px <code>--avatar-profile</code> with the <code>.listing-mark--xl</code> radius.",
    },
}
