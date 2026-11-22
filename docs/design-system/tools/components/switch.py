from dslib import ex, kbd, matrix, themes

STATES = [("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'),
          ("Checked", " checked"), ("Disabled", " disabled")]


def sw(label, desc="", checked=False, start=False):
    d = f'<span class="switch__desc">{desc}</span>' if desc else ""
    return (f'<label class="switch{" switch--start" if start else ""}"><span class="switch__text">'
            f'<span class="switch__label">{label}</span>{d}</span>'
            f'<input class="switch__input" type="checkbox" role="switch"{" checked" if checked else ""}></label>')


SETTINGS = (sw("Show me on event attendee lists", "Other members see your first name and photo", True)
            + sw("Message notifications", "A push notification for each new message", False))

SPEC = {
    "lead": "A switch turns a setting on or off the moment it is flipped, with no Save button.",
    "meta": ["Status: new", "<code>&lt;input type=\"checkbox\" role=\"switch\"&gt;</code>"],
    "overview": """<p>Use a switch for a setting that applies immediately: privacy, notifications. If the change waits for a form submit, use a <a href="checkbox.html">checkbox</a>. Pair each switch with a label that names the setting, and say what changed in a <a href="toast.html">toast</a> only if it is not obvious.</p>
<ul><li><b>Trailing</b> (default): label left, switch right, as in settings lists.</li>
<li><b>Leading</b> (<code>.switch--start</code>): switch before the label for short inline settings.</li></ul>""",
    "anatomy": {
        "figure": sw("Show me on event attendee lists", "Other members see your first name and photo", True),
        "callouts": [(20, 35), (25, 70), (90, 50)],
        "parts": [
            ("Label", "Semibold 15px; names the setting."),
            ("Description (optional)", "Muted 14px; says what on means."),
            ("Track and thumb", "<code>--size-switch-w</code> × <code>--size-switch-h</code>; grey off, bordeaux on, thumb slides."),
        ],
    },
    "variants": ex(SETTINGS, "Trailing, in a settings list.", True, mod="stack")
    + ex(sw("Show my home church", checked=False, start=True), "Leading.", True),
    "sizes": "<p>One size, set by <code>--size-switch-w</code> and <code>--size-switch-h</code>; the row is at least 44px tall.</p>",
    "states": {
        "intro": "<p>Pointer and focus forced with <code>data-state</code>; checked and disabled are real attributes. There is no invalid state: a switch cannot be wrong. If saving fails, flip it back and show an error toast.</p>",
        "matrix": matrix(STATES, [
            ("Off", '<label class="switch"><span class="switch__label">Notifications</span><input class="switch__input" type="checkbox" role="switch"{a}></label>'),
            ("On", '<label class="switch"><span class="switch__label">Notifications</span><input class="switch__input" type="checkbox" role="switch" checked{a}></label>',
             {"Checked": None}),
        ]),
        "themes": themes(SETTINGS),
        "notes": "<ul><li><b>Busy</b>: while saving, keep the new position and set <code>aria-busy</code> on the row; on failure revert and explain.</li><li><b>Disabled</b> dims the row; say why nearby (\"Turn on notifications in your browser first\").</li></ul>",
    },
    "responsive": "<p>Trailing switches stay at the row end at every width; long labels wrap beside them.</p>",
    "theming": "<p>Track off uses <code>--color-border-strong</code>, on <code>--color-accent</code>; the thumb is <code>--color-bg-surface</code> with <code>--shadow-1</code>. All switch with the theme.</p>",
    "accessibility": {
        "pattern": "<p>A native checkbox with <code>role=\"switch\"</code>, so it is announced as on/off (<a href=\"https://www.w3.org/WAI/ARIA/apg/patterns/switch/\">APG Switch</a>). The wrapping label names it.</p>",
        "keys": [
            (kbd("Tab"), "Moves focus to the switch."),
            (kbd("Space"), "Toggles it."),
        ],
        "focus": "<p>2px <code>--color-focus-ring</code> outline at 2px offset around the track.</p>",
        "labelling": "<p>The label names the setting, not the state (\"Message notifications\", not \"On\"); the role announces on or off. The thumb position plus the fill carry the state, not colour alone.</p>",
        "pairs": [
            ("Label", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Description", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Track off on surface", "--color-border-strong", "--color-bg-surface", 3),
            ("Track on on surface", "--color-accent", "--color-bg-surface", 3),
        ],
        "motion": "<p>Thumb and track transition over <code>--duration-fast</code>; instant under reduced motion.</p>",
        "touch": "<p>The whole row is the target, at least 44px tall.</p>",
    },
    "content": "<ul><li>Label the setting in plain words: \"Show me on event attendee lists\".</li><li>Describe what on means, not both states.</li><li>Never put \"On\"/\"Off\" text next to it.</li></ul>",
    "dodont": [
        ("do", sw("Message notifications", "A push notification for each new message"), "Applies immediately; label names the setting."),
        ("dont", sw("Trust this browser for 30 days") + '<button class="btn btn--primary btn--sm" type="button">Verify</button>', "A choice that waits for submit is a checkbox."),
        ("do", sw("Show me on event attendee lists", "Other members see your first name and photo", True), "The description says what on means."),
        ("dont", sw("Hide me from attendee lists", checked=True), "Negative labels make on mean off."),
    ],
    "tokens": [
        ("Track off / hover", "--color-border-strong / --color-fg-muted", "color"),
        ("Track on / hover", "--color-accent / --color-accent-hover", "color"),
        ("Thumb", "--color-bg-surface", "color"),
        ("Disabled label", "--color-fg-disabled", "color"),
        ("Track size", "--size-switch-w / --size-switch-h", "value"),
        ("Thumb shadow", "--shadow-1", "value"),
        ("Row height", "--target-comfortable", "value"),
        ("Disabled opacity", "--opacity-unavailable", "value"),
        ("Transition", "--duration-fast / --ease-standard", "value"),
    ],
    "code": {
        "snippet": '''<label class="switch">
  <span class="switch__text">
    <span class="switch__label">Message notifications</span>
    <span class="switch__desc">A push notification for each new message</span>
  </span>
  <input class="switch__input" type="checkbox" role="switch" checked>
</label>''',
        "classes": [
            ("<code>.switch</code> <code>.switch--start</code>", "Row with trailing or leading switch."),
            ("<code>.switch__text</code> <code>.switch__label</code> <code>.switch__desc</code>", "Text parts."),
            ("<code>.switch__input</code> + <code>role=\"switch\"</code>", "The track; checked is on."),
            ("<code>checked</code> · <code>disabled</code>", "States."),
        ],
    },
    "sources": {
        "mocks": [],
        "drift": "No mock uses a switch yet. It was added from the core component set for profile privacy and notification settings.",
    },
}
