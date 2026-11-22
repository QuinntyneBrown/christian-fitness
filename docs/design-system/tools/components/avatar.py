from dslib import avatar, ex, image, kbd, matrix, mock, themes

STACK = ('<div class="avatar-stack">' + "".join(avatar(i, size="sm") for i in ["MC", "DO", "PN", "AK", "JR"])
         + '<span class="avatar-stack__label">Michael, Danielle and 140 others</span></div>')

SPEC = {
    "lead": "Avatars put a face or initials beside a name, so people recognise each other across events, chats and the admin console.",
    "meta": ["Status: stable", "<code>&lt;span&gt;</code> or <code>&lt;img&gt;</code>", "Decorative"],
    "overview": """<p>Use an avatar next to a person's or group's name. It is always decorative: the name beside it carries the meaning, so the avatar is <code>aria-hidden</code> (initials) or has empty <code>alt</code> (photo).</p>
<ul>
<li><b>Initials</b> (default): accent-subtle circle with one or two display-font letters.</li>
<li><b>Photo</b>: an <code>&lt;img class="avatar"&gt;</code>, used for vetted professionals.</li>
<li><b>Group</b> (<code>.avatar--group</code>): a rounded square in inverse colours for event group chats ("5K").</li>
<li><b>Solid</b> (<code>.avatar--solid</code>): bordeaux fill for the signed-in person's own avatar.</li>
<li><b>Stack</b> (<code>.avatar-stack</code>): overlapping small avatars with a "Michael, Danielle and 140 others" label.</li>
</ul>""",
    "anatomy": {
        "figure": '<span class="avatar avatar--xl" aria-hidden="true">GT</span>',
        "callouts": [(50, 10), (50, 50)],
        "parts": [
            ("Container", "Circle (<code>--radius-full</code>) or rounded square for groups and square photos; <code>--color-accent-subtle</code> fill."),
            ("Initials", "Barlow Condensed semibold at 36% of the size, <code>--color-fg-accent</code>; at most two letters."),
        ],
    },
    "variants": ex(avatar("GT") + avatar("5K", group=True) + '<span class="avatar avatar--solid" aria-hidden="true">GT</span>'
                   + image("trainer", "avatar", "") + image("trainer", "avatar avatar--xl avatar--photo-square", ""),
                   "Initials, group, solid, photo and square photo.", True)
    + "<h3>Stack</h3>" + ex(STACK, "Who's going on event detail: five small avatars and a label naming the rest.", True),
    "sizes": ex(avatar("GT", size="sm") + avatar("GT", size="md") + avatar("GT") + avatar("GT", size="xl") + avatar("GT", size="2xl"),
                "sm (<code>--size-avatar-sm</code>, stacks) · md 40px (tables, <code>.avatar--table</code>) · default lg 48px (rows) · xl (service rows) · 2xl (profile hero).", True),
    "states": {
        "intro": "<p>Avatars are not interactive, so they have no pointer, focus or disabled state. When one sits in a link or button (the header's profile button) the control owns the state. The only avatar states are photo, initials fallback and loading.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ""), ("Focus", ""), ("Active", ""), ("Disabled", ""), ("Loading", "")], [
            ("Initials", avatar("GT"), {"Hover": None, "Focus": None, "Active": None, "Disabled": None}),
            ("Group", avatar("5K", group=True), {"Hover": None, "Focus": None, "Active": None, "Disabled": None}),
        ]).replace(f"<td>{avatar('GT')}</td></tr>", '<td><span class="skeleton skeleton--avatar"></span></td></tr>')
          .replace(f"<td>{avatar('5K', group=True)}</td></tr>", '<td><span class="skeleton skeleton--avatar"></span></td></tr>'),
        "themes": themes(avatar("GT") + avatar("5K", group=True) + '<span class="avatar avatar--solid" aria-hidden="true">GT</span>' + STACK),
        "notes": "<ul><li><b>Fallback</b>: a photo that fails to load is replaced by initials; never a broken image icon.</li><li><b>Loading</b> uses a round skeleton of the same size.</li></ul>",
    },
    "responsive": "<ul><li>Sizes do not change with the viewport; the profile hero uses 2xl at every width.</li><li>Stacks show at most five avatars; the label carries the total.</li></ul>",
    "theming": "<p>Initials read <code>--color-accent-subtle</code> / <code>--color-fg-accent</code>; group <code>--color-bg-inverse</code> / <code>--color-fg-inverse</code>; solid <code>--color-accent</code> / <code>--color-fg-on-accent</code>. The stack's separating ring is <code>--color-bg-surface</code>, so it matches the card in either theme.</p>",
    "accessibility": {
        "pattern": "<p>Decorative: <code>aria-hidden=\"true\"</code> on initials, <code>alt=\"\"</code> on photos, because the person's name is always next to it. Where no name is visible (the header's profile button), the control has the label (\"Your profile\").</p>",
        "keys": [(kbd("Tab"), "Skips avatars; they are never focusable on their own.")],
        "focus": "<p>None on the avatar.</p>",
        "labelling": "<p>The adjacent name labels the person. A stack's <code>.avatar-stack__label</code> is real text, so the count is read.</p>",
        "pairs": [
            ("Initials", "--color-fg-accent", "--color-accent-subtle", 4.5),
            ("Group initials", "--color-fg-inverse", "--color-bg-inverse", 4.5),
            ("Solid initials", "--color-fg-on-accent", "--color-accent", 4.5),
        ],
        "motion": "<p>None.</p>",
        "touch": "<p>Not a target; its row or button is.</p>",
    },
    "content": "<ul><li>Initials: first letter of first and last name, uppercase (\"GT\"). Group chats use the event's short code (\"5K\").</li><li>Stack labels name two people then count: \"Michael, Danielle and 140 others\".</li></ul>",
    "dodont": [
        ("do", '<div class="table__person">' + avatar("GT", size="md") + '<p class="table__strong">Grace Thompson</p></div>', "Avatar beside the name, hidden from screen readers."),
        ("dont", '<span class="avatar" aria-label="Grace Thompson" role="img">GT</span><span class="table__strong">Grace Thompson</span>', "Labelling the avatar too: the name is read twice."),
        ("do", STACK, "A stack with a label that names the total."),
        ("dont", '<div class="avatar-stack">' + "".join(avatar(i, size="sm") for i in ["MC", "DO", "PN", "AK", "JR", "GT", "SL", "TB"]) + '</div>', "Eight avatars and no label; the count is lost."),
    ],
    "tokens": [
        ("Initials fill / text", "--color-accent-subtle / --color-fg-accent", "color"),
        ("Group fill / text", "--color-bg-inverse / --color-fg-inverse", "color"),
        ("Solid fill / text", "--color-accent / --color-fg-on-accent", "color"),
        ("Stack ring", "--color-bg-surface", "color"),
        ("Sizes", "--size-avatar-sm / --size-avatar-md / --size-avatar-lg / --size-avatar-xl / --size-avatar-2xl", "value"),
        ("Group radius / square photo", "--radius-md / --radius-lg", "value"),
        ("Stack ring width", "--border-width-thick", "value"),
    ],
    "code": {
        "snippet": '''<span class="avatar" aria-hidden="true">GT</span>
<img class="avatar avatar--xl" src="trainer.jpg" alt="" width="1024" height="1024">
<div class="avatar-stack">
  <span class="avatar avatar--sm" aria-hidden="true">MC</span>…
  <span class="avatar-stack__label">Michael, Danielle and 140 others</span>
</div>''',
        "classes": [
            ("<code>.avatar</code>", "Base: 48px initials circle."),
            ("<code>.avatar--sm</code> <code>.avatar--md</code> <code>.avatar--table</code> <code>.avatar--xl</code> <code>.avatar--2xl</code>", "Sizes; table is an alias of md."),
            ("<code>.avatar--group</code> <code>.avatar--solid</code> <code>.avatar--photo-square</code>", "Group chat, own avatar, square photo."),
            ("<code>.avatar-stack</code> <code>.avatar-stack__label</code>", "Overlapping stack and its label."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/admin-members/default", "table avatars"),
            mock("pages/event-detail/default", "avatar stack"),
            mock("pages/messages/default", "group and person avatars"),
            mock("pages/services/default", "photo avatars"),
            mock("pages/profile/default", "2xl profile avatar"),
        ],
        "drift": "The table avatar was 38px; it snapped to 40px (<code>--size-avatar-md</code>), and <code>.avatar--table</code> now equals <code>.avatar--md</code>. The square photo's 16px radius is now <code>--radius-lg</code> (was 2xl) and the group's 12px <code>--radius-md</code> (was xl).",
    },
}
