from dslib import ex, icon, kbd, matrix, mock, themes, na

SPIN = icon("loader", "icon--spin")


def spinner(label, size="", hidden=False):
    s = f" spinner--{size}" if size else ""
    lab = f'<span class="visually-hidden">{label}</span>' if hidden else f"<span>{label}</span>"
    return f'<span class="spinner{s}"><span class="spinner__ring" aria-hidden="true"></span>{lab}</span>'


SPEC = {
    "lead": "A spinner says \"working on it\" for a short wait, always next to words that say what is happening.",
    "meta": ["Status: stable", "<code>.spinner</code> · <code>.icon--spin</code>"],
    "overview": """<p>Two forms:</p>
<ul>
<li><b>Busy icon</b> (<code>.icon--spin</code> on the loader icon) inside a busy <a href="button.html">button</a>: "Signing in…", "Sending…". This is the form the mocks use.</li>
<li><b>Spinner</b> (<code>.spinner</code>): a ring with a label for a small region that is refreshing, such as a retried section or loading older messages.</li>
</ul>
<p>Use a <a href="skeleton.html">skeleton</a> when a page or list is loading for the first time and its layout is known; use a <a href="progress-bar.html">progress bar</a> when the wait is long and measurable. Never cover a whole page with a spinner.</p>""",
    "anatomy": {
        "figure": spinner("Loading older messages…", "lg"),
        "callouts": [(15, 50), (60, 50)],
        "parts": [
            ("Ring", "A 2px track (<code>--color-border-default</code>) with an accent arc, rotating; <code>aria-hidden</code>."),
            ("Label", "14px muted text saying what is loading; visible, or visually hidden when context makes it obvious."),
        ],
    },
    "variants": ex(spinner("Refreshing…") + spinner("Loading older messages…", "lg"), "Region spinner, default and large.", True)
    + "<h3>In a button</h3>" + ex(f'<button class="btn btn--primary" type="submit" aria-busy="true">{SPIN}Sending…</button>', "The busy icon replaces nothing; it sits before the busy label.", True),
    "sizes": ex(spinner("Small", "sm") + spinner("Default") + spinner("Large", "lg"), "sm 16px (<code>--size-icon-sm</code>) inline · default 20px · lg 40px (<code>--size-avatar-md</code>) for a section.", True),
    "states": {
        "intro": "<p>A spinner has one state: spinning. Under reduced motion it stops and shows a half-filled ring; the label keeps the meaning.</p>",
        "matrix": matrix([("Example", "")], [
            ("Region", spinner("Refreshing…")),
            ("Hidden label", spinner("Loading", "sm", hidden=True)),
            ("Button busy", f'<button class="btn btn--secondary btn--sm" type="button" aria-busy="true">{SPIN}Saving…</button>'),
        ]),
        "themes": themes(spinner("Refreshing…") + f'<button class="btn btn--primary btn--sm" type="button" aria-busy="true">{SPIN}Sending…</button>'),
        "notes": "<ul><li>Show a spinner only after about 300ms, so fast responses don't flash.</li><li>If the wait passes about 10 seconds, replace it with words (\"Still working…\") or an error with a retry.</li></ul>",
    },
    "responsive": "<p>Same at every width. A region spinner centres in the region it replaces.</p>",
    "theming": "<p>The arc reads <code>--color-accent</code>, the track <code>--color-border-default</code>, the label <code>--color-fg-muted</code>. In a button the icon inherits the label colour.</p>",
    "accessibility": {
        "pattern": '<p>The spinning ring is decorative. The busy region carries <code>aria-busy="true"</code> and the label sits in a polite live region (the mocks wrap loading regions in <code>aria-live="polite"</code> with a visually hidden "Loading events"). A busy button sets <code>aria-busy</code> and keeps a visible label.</p>',
        "keys": [(kbd("Tab"), "Not focusable; a busy button stays in the tab order but ignores presses.")],
        "focus": na("Spinners are not interactive; focus stays where it was."),
        "labelling": "<p>Always a label: visible text or <code>.visually-hidden</code>. Never a bare animated ring.</p>",
        "pairs": [
            ("Arc on surface", "--color-accent", "--color-bg-surface", 3),
            ("Label", "--color-fg-muted", "--color-bg-surface", 4.5),
        ],
        "motion": "<p>Rotates once per <code>--duration-spin</code>, linear. <code>prefers-reduced-motion</code> stops the rotation for both the ring and <code>.icon--spin</code>.</p>",
        "touch": na("Not interactive."),
    },
    "content": "<ul><li>Present participle with an ellipsis character: \"Sending…\", \"Refreshing…\", \"Loading older messages…\".</li><li>Name the thing when it helps: \"Loading older messages…\" beats \"Loading…\".</li></ul>",
    "dodont": [
        ("do", f'<button class="btn btn--primary" type="submit" aria-busy="true">{SPIN}Signing in…</button>', "Spinner plus words, in place (sign-in submitting)."),
        ("dont", '<span class="spinner spinner--lg"><span class="spinner__ring" aria-hidden="true"></span></span>', "A bare ring says nothing to screen readers or anyone else."),
        ("do", spinner("Loading older messages…", "sm"), "A small spinner for a small region."),
        ("dont", spinner("Loading…", "lg"), "A large generic spinner where a page's layout is known: use skeletons."),
    ],
    "tokens": [
        ("Arc / track", "--color-accent / --color-border-default", "color"),
        ("Label", "--color-fg-muted", "color"),
        ("Size sm / default / lg", "--size-icon-sm / --size-icon-lg / --size-avatar-md", "value"),
        ("Ring width", "--border-width-thick", "value"),
        ("Rotation", "--duration-spin", "value"),
    ],
    "code": {
        "snippet": '''<span class="spinner">
  <span class="spinner__ring" aria-hidden="true"></span><span>Refreshing…</span>
</span>

<button class="btn btn--primary" type="submit" aria-busy="true">
  <svg class="icon icon--spin" aria-hidden="true">…</svg>Sending…
</button>''',
        "classes": [
            ("<code>.spinner</code> <code>.spinner__ring</code>", "Region spinner and its ring."),
            ("<code>.spinner--sm</code> <code>.spinner--lg</code>", "Sizes."),
            ("<code>.icon--spin</code>", "Rotates any icon; used with the loader icon in busy buttons."),
        ],
    },
    "sources": {
        "mocks": [mock("pages/sign-in/submitting", "busy button"), mock("pages/join/submitting", "busy button")],
        "drift": "The mocks only had the spinning icon in buttons; the ring spinner and its sizes were added from the core set.",
    },
}
