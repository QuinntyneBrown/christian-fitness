from dslib import ex, icon, kbd, matrix, mock, themes

CHECK = icon("check")


def follow(name, on=False, lg=False, a=""):
    cls = "follow follow--lg" if lg else "follow"
    return (f'<button class="{cls}" type="button" aria-pressed="{"true" if on else "false"}"{a}>'
            f'{CHECK if on else ""}Follow<span class="visually-hidden"> {name}</span></button>')


ROW = f'<div class="cluster">{follow("Christian Fitness")}{follow("Lakeshore Runners Fellowship", True)}</div>'
HEAD = ('<div class="listing-head__actions">' + follow("Lakeshore Runners Fellowship", True, True)
        + '<a class="btn btn--secondary btn--md" href="#">Message</a></div>')
HEAD_OFF = ('<div class="listing-head__actions">' + follow("Christian Fitness", False, True)
            + '<a class="btn btn--secondary btn--md" href="#">Message</a></div>')
TOAST = (f'<div class="toast toast--danger" role="alert">{icon("alert-circle")}<div class="toast__body">'
         '<p class="toast__title">We couldn\'t follow Faith &amp; Footwork</p><p class="toast__text">Try again in a moment.</p></div>'
         f'<button class="icon-button icon-button--sm toast__close" type="button" aria-label="Dismiss">{icon("x")}</button></div>')

STATES = [("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"')]

SPEC = {
    "lead": "The follow button follows or unfollows a directory listing in one tap, so its new dates reach the member first.",
    "meta": ["Status: new", "<code>&lt;button aria-pressed&gt;</code>", "Member app: Directory"],
    "overview": f"""<p>Use the follow button wherever a listing (an organization, person, instructor or church ministry) can be followed: on each <a href="listing-row.html">listing row</a> in the Directory and in the head of a listing's profile. It acts at once in both directions, with no confirmation; if the request fails, the button goes back and a <a href="toast.html">toast</a> says so.</p>
<ul>
<li><b>Row</b> (<code>.follow</code>): a fixed-width outlined pill at the end of a directory row; \"Follow\" always, tinted with a check when pressed.</li>
<li><b>Large</b> (<code>.follow--lg</code>): the profile's main action, beside Message. Not followed, it is the bordeaux primary; followed, it turns tinted like the row button.</li>
</ul>
<p>It is a toggle, not a <a href="button.html">button</a> variant and not a <a href="chip.html">chip</a>: one listing, on or off, saved immediately.</p>""",
    "anatomy": {
        "figure": follow("Lakeshore Runners Fellowship", True),
        "callouts": [(43, 22), (53, 22), (62, 70)],
        "parts": [
            ("Check (followed only)", "16px <code>check</code> icon, <code>aria-hidden</code>; the shape, not just the tint, says it is on."),
            ("Label", "\"Follow\" in every state, 14px semibold, plus the listing's name in visually hidden text."),
            ("Container", "A 108px (6.75rem) pill, 36px tall (<code>--control-height-sm</code>), so the pressed and unpressed buttons take the same space and the row does not jump."),
        ],
    },
    "variants": "<h3>Row</h3>"
    + ex(ROW, "Not followed and followed, as on Directory rows.", True)
    + "<h3>Large, in a profile head</h3>"
    + ex(HEAD_OFF, "Not followed: the bordeaux primary beside Message (one-off).", True)
    + ex(HEAD, "Followed: tinted, with the check (default).", True),
    "sizes": """<ul>
<li><b>Row</b> (<code>.follow</code>): 108px wide, at least 36px tall, 14px label.</li>
<li><b>Large</b> (<code>.follow--lg</code>): at least 44px (<code>--control-height-md</code>), 16px label, 24px side padding; it grows to share the row with Message on phones and takes its own width from 768px.</li>
</ul>""",
    "states": {
        "intro": "<p>On and off are the real <code>aria-pressed</code> attribute; hover and focus are forced here with <code>data-state</code> (live: <code>:hover</code>, <code>:focus-visible</code>). Hover darkens the row button's outline and the large button's fill. A followed button's hover is real <code>:hover</code> only: forcing it with <code>data-state</code> on the large button would show the unfollowed fill, so that cell is left empty.</p>",
        "matrix": matrix(STATES, [
            ("Row, off", follow("Christian Fitness", a="{a}")),
            ("Row, on", follow("Lakeshore Runners Fellowship", True, a="{a}")),
            ("Large, off", follow("Christian Fitness", lg=True, a="{a}")),
            ("Large, on", follow("Lakeshore Runners Fellowship", True, True, a="{a}"), {"Hover": None}),
        ]),
        "themes": themes(ROW + HEAD_OFF + HEAD, "stack"),
        "notes": f"""<ul>
<li><b>Failed</b>: the button goes back to where it was and a danger toast names the listing (directory follow-failed). Nothing else on the page changes.</li>
<li><b>Busy</b>: none. The press flips the button at once and the request runs behind it.</li>
<li><b>Disabled</b>: none. A listing that cannot be followed shows no follow button.</li>
</ul>""" + ex(f'<div class="cluster">{follow("Faith &amp; Footwork")}</div>' + TOAST,
              "Failed: back to Follow, with the toast.", mod="stack"),
    },
    "responsive": """<ul>
<li><b>Row</b>: fixed width at every breakpoint, at the end of the listing row, never wrapping (<code>white-space: nowrap</code>, <code>flex-shrink: 0</code>).</li>
<li><b>Large</b>: below 768px it grows (<code>flex: 1</code>) to share the profile's action row with Message; from 768px (<code>--layout-breakpoint-md</code>) it sizes to its label.</li>
<li>Under <code>(pointer: coarse)</code> an invisible pseudo-element extends the target, but only to <code>--target-min</code> (24px), which the 36px button already exceeds, so in practice it stays 36px tall.</li>
</ul>""",
    "theming": """<p>Off, the row button is transparent with a <code>--color-border-default</code> outline (<code>--color-border-strong</code> on hover) and default text. On, both sizes take <code>--color-accent-subtle</code> and <code>--color-fg-accent</code> (large hover <code>--color-accent-subtle-hover</code>). The large button off is <code>--color-accent</code> with <code>--color-fg-on-accent</code> (hover <code>--color-accent-hover</code>). All switch with the theme.</p>""",
    "accessibility": {
        "pattern": '<p>A toggle button: native <code>&lt;button&gt;</code> with <code>aria-pressed</code> (<a href="https://www.w3.org/WAI/ARIA/apg/patterns/button/">APG Button</a>). The label is fixed (\"Follow\") and never changes while toggling, as the APG asks of a toggle button: <code>aria-pressed</code> carries the state to assistive technology, and the fill plus a check icon carry it visually.</p>',
        "keys": [
            (kbd("Tab"), "Moves to the button (after the row's link)."),
            (kbd("Enter") + ", " + kbd("Space"), "Follows or unfollows."),
        ],
        "focus": "<p>The shared ring: 2px <code>--color-focus-ring</code> at 2px offset, following the pill. Focus stays on the button after it flips and after a failure.</p>",
        "labelling": "<p>Every button names its listing in visually hidden text (\"Follow Christian Fitness\"), since a page has many. The pressed state is announced from <code>aria-pressed</code>; the check icon makes it visible without relying on the tint, and the label never changes.</p>",
        "pairs": [
            ("Row label, off", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Label, on", "--color-fg-accent", "--color-accent-subtle", 4.5),
            ("Label, on, large hover", "--color-fg-accent", "--color-accent-subtle-hover", 4.5),
            ("Large label, off", "--color-fg-on-accent", "--color-accent", 4.5),
            ("Large label, off, hover", "--color-fg-on-accent", "--color-accent-hover", 4.5),
            ("Row outline (non-text)", "--color-border-default", "--color-bg-surface", 1),
            ("Focus ring on surface", "--color-focus-ring", "--color-bg-surface", 3),
        ],
        "motion": "<p>Fill, outline and colour change over <code>--duration-fast</code>; instant under reduced motion.</p>",
        "touch": "<p>The large button is 44px tall. The row button is 36px tall and 108px wide; its coarse-pointer extension uses <code>--target-min</code> (24px) instead of <code>--target-comfortable</code> (44px), so it falls short of the 44px rule. Proposed: extend to <code>--target-comfortable</code> as small buttons and chips do.</p>",
    },
    "content": """<ul>
<li>\"Follow\", nothing else, in both states: no \"Unfollow\" on hover, no \"Subscribe\".</li>
<li>Always add the listing's name in visually hidden text, so a screen reader hears \"Follow Lakeshore Runners Fellowship\".</li>
<li>The failure toast names the listing and the fix: \"We couldn't follow Faith &amp; Footwork\" / \"Try again in a moment.\"</li>
</ul>""",
    "dodont": [
        ("do", follow("Lakeshore Runners Fellowship", True), "The check and the tint both mark it on; width stays the same."),
        ("dont", '<button class="follow" type="button" aria-pressed="true">Follow</button>', "No check and no listing name: on is shown by tint alone, and a screen reader hears the same name twenty times down the Directory."),
        ("do", HEAD_OFF, "One primary in the profile head: Follow, with Message beside it as secondary."),
        ("dont", '<div class="listing-head__actions"><button class="btn btn--primary btn--md" type="button">Follow</button><a class="btn btn--primary btn--md" href="#">Message</a></div>',
         "A plain button has no pressed state, and two primaries compete."),
    ],
    "tokens": [
        ("Row outline / hover", "--color-border-default / --color-border-strong", "color"),
        ("On fill / label", "--color-accent-subtle / --color-fg-accent", "color"),
        ("On, large hover", "--color-accent-subtle-hover", "color"),
        ("Large fill / hover / label", "--color-accent / --color-accent-hover / --color-fg-on-accent", "color"),
        ("Row height / large height", "--control-height-sm / --control-height-md", "value"),
        ("Label size row / large", "--font-size-sm / --font-size-md", "value"),
        ("Large padding", "--space-6", "value"),
        ("Gap", "--space-1-5", "value"),
        ("Border width / radius", "--border-width-hairline / --radius-full", "value"),
        ("Coarse-pointer target", "--target-min", "value"),
        ("Transition", "--duration-fast / --ease-standard", "value"),
    ],
    "code": {
        "snippet": '''<button class="follow" type="button" aria-pressed="false">
  Follow<span class="visually-hidden"> Christian Fitness</span>
</button>

<button class="follow follow--lg" type="button" aria-pressed="true">
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">…</svg>Follow<span class="visually-hidden"> Lakeshore Runners Fellowship</span>
</button>''',
        "classes": [
            ("<code>.follow</code>", "Fixed-width outlined toggle for directory rows."),
            ("<code>.follow--lg</code>", "Profile head size: primary when off, tinted when on."),
            ("<code>aria-pressed=\"true|false\"</code>", "Followed or not; styles the on state."),
            ("<code>data-state=\"hover|focus\"</code>", "Documentation only: forces a state."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/directory/default", "row buttons, on and off"),
            mock("pages/directory/follow-failed", "back to Follow with a danger toast"),
            mock("pages/listing-profile/default", "large, following"),
            mock("pages/listing-profile/one-off", "large, not followed"),
            mock("pages/listing-profile/person", "large, following a person"),
        ],
        "drift": "New with the Directory. Follow is instant both ways as the frame draws it; a failure puts the button back with a toast (mocks README: Follow). Closed: the label no longer changes with <code>aria-pressed</code> (fixed \"Follow\", fill and check icon show the state). Open: <code>.follow--lg[data-state=\"hover\"]</code> overrides the pressed fill, so a forced hover on a followed large button shows the wrong colour (live <code>:hover</code> is right). Fixed: the coarse-pointer extension used <code>--target-min</code>; it now uses <code>--target-comfortable</code>.",
    },
}
