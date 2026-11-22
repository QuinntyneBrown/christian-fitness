from dslib import ex, kbd, mock, na

SPEC = {
    "lead": "The skip link is the first thing a keyboard user reaches on every page. It jumps past the header straight to the content.",
    "meta": ["Status: stable", "WCAG 2.4.1 Bypass blocks"],
    "overview": """<p>Every page in both apps starts with <code>&lt;a class="skip-link" href="#main"&gt;Skip to content&lt;/a&gt;</code> as the first child of <code>&lt;body&gt;</code>. It sits off screen until it receives focus, then slides into the top-left corner as a bordeaux pill. Activating it moves focus to <code>&lt;main id="main"&gt;</code>.</p>
<p>There is one variant. Pages with a long filter bar still skip to <code>main</code>, never into the middle of a form.</p>""",
    "anatomy": {
        "figure": '<a class="skip-link" href="#main" data-state="focus">Skip to content</a>',
        "callouts": [(30, 50), (70, 50)],
        "parts": [
            ("Label", "\"Skip to content\", 15px semibold, white on bordeaux."),
            ("Container", "Pill (<code>--radius-full</code>), padding <code>--space-2</code> / <code>--space-4</code>, above everything (<code>--z-tooltip</code>)."),
        ],
    },
    "variants": ex('<a class="skip-link" href="#main" data-state="focus">Skip to content</a>',
                   "The only variant, shown in its focused position.", True),
    "sizes": na("A skip link has one size."),
    "states": {
        "intro": "<p>The skip link has two states that matter: hidden (not focused) and shown (focused). It has no hover, active or disabled styling beyond the shared focus ring.</p>",
        "matrix": """<div class="ds-matrix"><table><thead><tr><th scope="col">State</th><th scope="col">Appearance</th></tr></thead><tbody>
<tr><th scope="row">Default</th><td>Positioned at <code>top: calc(-1 * var(--space-24))</code>, off screen, still in the tab order.</td></tr>
<tr><th scope="row">Focus</th><td><code>.skip-link:focus</code> moves it to <code>top: var(--space-2)</code> with the focus ring.</td></tr>
<tr><th scope="row">Hover, active, disabled</th><td>—</td></tr>
</tbody></table></div>""",
        "themes": '<p>In the dark theme the pill reads the brighter dark accent so the white label keeps 4.5:1; the ring turns borealis.</p>',
        "notes": "<ul><li>Never hide it with <code>display: none</code> or <code>visibility: hidden</code>; that removes it from the tab order.</li><li>The target <code>main</code> needs <code>id=\"main\"</code>; add <code>tabindex=\"-1\"</code> only if a browser fails to move focus.</li></ul>",
    },
    "responsive": "<p>Identical at every width: <code>left: var(--space-4)</code> matches the page gutter on phones. Touch users rarely meet it; it costs nothing.</p>",
    "theming": "<p>Reads <code>--color-accent</code> and <code>--color-fg-on-accent</code>, the same pair as the primary button, so it themes with it.</p>",
    "accessibility": {
        "pattern": "<p>A native same-page link (<code>&lt;a href=\"#main\"&gt;</code>) satisfying WCAG 2.4.1. It must be the first focusable element.</p>",
        "keys": [
            (kbd("Tab"), "From page load, the first press shows and focuses the skip link."),
            (kbd("Enter"), "Moves focus to the main landmark; the next Tab goes to the first control in it."),
        ],
        "focus": "<p>The shared 2px ring at 2px offset, plus the move into view. It is never covered by the sticky header (<code>--z-tooltip</code> sits above <code>--z-sticky</code>), satisfying 2.4.11 Focus not obscured.</p>",
        "labelling": "<p>\"Skip to content\" is the accessible name. Do not add <code>aria-label</code>.</p>",
        "pairs": [
            ("Label on pill", "--color-fg-on-accent", "--color-accent", 4.5),
            ("Focus ring on surface", "--color-focus-ring", "--color-bg-surface", 3),
        ],
        "motion": "<p>It appears instantly; no slide transition.</p>",
        "touch": "<p>Padding gives a target about 40px tall and over 140px wide, above the 24px minimum of 2.5.8.</p>",
    },
    "content": "<ul><li>Always \"Skip to content\": same words on every page in both apps.</li><li>Sentence case, no full stop.</li></ul>",
    "dodont": [
        ("do", '<a class="skip-link" href="#main" data-state="focus">Skip to content</a>', "First element in <code>body</code>, pointing at <code>#main</code>."),
        ("dont", '<a class="skip-link" href="#main" data-state="focus">Skip navigation links</a>', "Do not use jargon; every page says \"Skip to content\"."),
        ("do", '<p>Hidden off screen, revealed on focus.</p>', "Off-screen positioning keeps it in the tab order."),
        ("dont", '<p><code>.skip-link { display: none; }</code></p>', "<code>display: none</code> removes it for the very people it is for."),
    ],
    "tokens": [
        ("Background", "--color-accent", "color"),
        ("Label", "--color-fg-on-accent", "color"),
        ("Focus ring", "--color-focus-ring", "color"),
        ("Hidden offset / shown offset", "--space-24 / --space-2", "value"),
        ("Left inset", "--space-4", "value"),
        ("Padding", "--space-2 / --space-4", "value"),
        ("Radius", "--radius-full", "value"),
        ("Stacking", "--z-tooltip", "value"),
    ],
    "code": {
        "snippet": '''<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="topbar">…</header>
  <main id="main">…</main>
</body>''',
        "classes": [
            ("<code>.skip-link</code>", "Off screen until focused, then a bordeaux pill top-left."),
            ("<code>data-state=\"focus\"</code>", "Documentation only: shows it in its focused position."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/home/default", "first element in body"),
            mock("pages/admin-dashboard/default", "same link in the admin console"),
        ],
        "drift": "none",
    },
}
