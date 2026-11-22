from dslib import ex, icon, kbd, matrix, themes


def tip(uid, label="Copy link", key=None, static=False, open_=False):
    k = f'<kbd class="tooltip__key">{key}</kbd>' if key else ""
    mod = " tooltip--static" if static else ""
    st = ' data-state="open"' if open_ else ""
    return (f'<span class="tooltip-anchor"><button class="icon-button" type="button" aria-labelledby="{uid}">'
            f'{icon("send", "icon--lg")}</button><span class="tooltip{mod}" role="tooltip" id="{uid}"{st}>{label}{k}</span></span>')


def static(text, key=None):
    k = f'<kbd class="tooltip__key">{key}</kbd>' if key else ""
    return f'<span class="tooltip tooltip--static">{text}{k}</span>'


PAD = '<div style="padding-top: var(--space-10);">{}</div>'

SPEC = {
    "lead": "A tooltip names an icon-only control on hover and focus. It never holds anything people need to act on.",
    "meta": ["Status: proposed", "<code>role=\"tooltip\"</code>", "No mock yet"],
    "overview": """<p>Tooltips show a short label above an icon button after a brief delay (<code>--delay-tooltip</code>), on hover or keyboard focus. The button's accessible name comes from the tooltip through <code>aria-labelledby</code>, so the two never disagree.</p>
<ul>
<li>Use for icon-only buttons where the icon may not be obvious: send, copy link.</li>
<li>Do not put links, buttons or essential instructions in a tooltip; touch users rarely see it. Use a field hint instead.</li>
</ul>""",
    "anatomy": {
        "figure": static("Send message", "Enter"),
        "callouts": [(30, 50), (85, 50)],
        "parts": [("Label", "12px medium caption on the inverse surface."), ("Shortcut (optional)", "<code>.tooltip__key</code>, a keycap outline.")],
    },
    "variants": ex(static("Send message"), "Label only.", True) + ex(static("Send message", "Enter"), "With keyboard shortcut.", True)
    + ex(PAD.format(tip("tv1", "Send message", open_=True)), "Anchored above its button (forced open).", True, mod="relative"),
    "sizes": "<p>One size; wraps at 240px.</p>",
    "states": {
        "intro": "<p>Hidden until the anchor is hovered or contains focus, then shown after the delay. Forced open here with <code>data-state=\"open\"</code>.</p>",
        "matrix": matrix([("Hidden", ""), ("Open", "open")], [
            ("Tooltip", "{a}"),
        ]).replace("<td></td>", "<td>" + PAD.format(tip("tm1", "Send message")) + "</td>").replace("<td>open</td>", "<td>" + PAD.format(tip("tm2", "Send message", open_=True)) + "</td>"),
        "themes": themes(static("Send message", "Enter")),
        "notes": "<ul><li>Hides on <kbd>Esc</kbd> without moving focus.</li><li>Stays open while the pointer moves onto it (WCAG 1.4.13).</li></ul>",
    },
    "responsive": "<ul><li>Above the anchor, centred; flips below near the top edge.</li><li>On touch, the tooltip shows on long press only; the name is always there for screen readers.</li></ul>",
    "theming": "<p>Reads <code>--color-bg-inverse</code> and <code>--color-fg-inverse</code>, so it inverts in dark theme.</p>",
    "accessibility": {
        "pattern": '<p><a href="https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/">APG Tooltip</a>: <code>role="tooltip"</code> referenced by <code>aria-labelledby</code> (as the name) or <code>aria-describedby</code> (as extra).</p>',
        "keys": [(kbd("Tab"), "Focusing the anchor shows the tooltip."), (kbd("Esc"), "Hides it.")],
        "focus": "<p>Focus stays on the anchor; the tooltip is never focusable.</p>",
        "labelling": "<p>Its text is the button's name; do not also set <code>aria-label</code>.</p>",
        "pairs": [("Tooltip text", "--color-fg-inverse", "--color-bg-inverse", 4.5)],
        "motion": "<p>Fades over <code>--duration-fast</code> after <code>--delay-tooltip</code>.</p>",
        "touch": "<p>The anchor keeps its own 44 × 44px target.</p>",
    },
    "content": "<ul><li>Two or three words, sentence case, no full stop: \"Send message\".</li><li>Match the action, not the icon (\"Send message\", not \"Paper plane\").</li></ul>",
    "dodont": [
        ("do", static("Send message"), "A short name for an icon button."),
        ("dont", static("Click here to send your message to everyone in this group, or press Enter"), "A paragraph; put instructions in a hint."),
        ("do", static("Send message", "Enter"), "A shortcut as a keycap."),
        ("dont", static("Required: enter your e-mail"), "Essential info hidden from touch users."),
    ],
    "tokens": [("Background / text", "--color-bg-inverse / --color-fg-inverse", "color"), ("Key outline", "--color-border-inverse", "color"),
               ("Radius", "--radius-sm", "value"), ("Delay", "--delay-tooltip", "value"), ("Stacking", "--z-tooltip", "value")],
    "code": {"snippet": '''<span class="tooltip-anchor">
  <button class="icon-button" type="button" aria-labelledby="tip-send">…</button>
  <span class="tooltip" role="tooltip" id="tip-send">Send message<kbd class="tooltip__key">Enter</kbd></span>
</span>''',
             "classes": [("<code>.tooltip-anchor</code>", "Positions and reveals the tooltip on hover and focus."), ("<code>.tooltip</code>", "The label."),
                         ("<code>.tooltip__key</code>", "Shortcut keycap."), ("<code>.tooltip--static</code>", "Docs only: in flow and visible."),
                         ("<code>data-state=\"open\"</code>", "Docs only: force open.")]},
    "sources": {"mocks": [], "drift": "No mock uses a tooltip; icon buttons carry <code>aria-label</code>. Added from the core component set."},
}
