from dslib import ex, icon, kbd, matrix, mock, themes

X = icon("x", "icon--lg")
# .drawer and .scrim are position: fixed; the transformed frame contains them.
FRAME = '<div class="ds-frame" style="transform: translateZ(0); width: 100%; height: {h};">{inner}</div>'


def drawer(uid, *, title="New event", busy=False, body=None, h="36rem", labelled=True):
    lab = f' aria-labelledby="{uid}-t"' if labelled else f' aria-label="{title}"'
    tid = f' id="{uid}-t"' if labelled else ""
    body = body if body is not None else (
        f'<div class="field"><label class="field__label" for="{uid}-title">Title</label><input class="input" id="{uid}-title" type="text" value="Whole Life Retreat"></div>'
        f'<div class="field-grid"><div class="field"><label class="field__label" for="{uid}-date">Date</label><input class="input" id="{uid}-date" type="date" value="2026-05-22"></div>'
        f'<div class="field"><label class="field__label" for="{uid}-time">Start time</label><input class="input" id="{uid}-time" type="time" value="16:00"></div></div>'
        f'<div class="field"><label class="field__label" for="{uid}-loc">Location</label><input class="input" id="{uid}-loc" type="text" value="Muskoka Woods, Rosseau"></div>')
    pub = (f'<button class="btn btn--primary btn--grow" type="button" aria-busy="true">{icon("loader", "icon--spin")}Publishing…</button>'
           if busy else '<button class="btn btn--primary btn--grow" type="button">Publish</button>')
    inner = ('<div class="scrim" aria-hidden="true"></div>'
             f'<aside class="drawer" role="dialog" aria-modal="true"{lab}>'
             f'<div class="drawer__head"><h2 class="display drawer__title"{tid}>{title}</h2>'
             f'<button class="icon-button" type="button" aria-label="Close">{X}</button></div>'
             f'<form class="drawer__body" novalidate>{body}</form>'
             f'<div class="drawer__foot"><button class="btn btn--secondary btn--grow" type="button">Save draft</button>{pub}</div></aside>')
    return FRAME.format(h=h, inner=inner)


SPEC = {
    "lead": "A drawer slides in from the right so staff can create or edit an event or listing without losing their place in the list.",
    "meta": ["Status: stable", "<code>role=\"dialog\"</code> + <code>aria-modal</code>", "Admin console"],
    "overview": """<p>The drawer is a modal side panel for longer editing tied to a list: the admin event editor and listing editor. The list stays visible (dimmed) on wide screens, so staff keep their bearings.</p>
<ul>
<li>Use a drawer for forms of five or more fields that edit one item in a list.</li>
<li>Use a <a href="dialog.html">dialog</a> for short tasks and confirmations.</li>
<li>Opens through CDK Dialog with a right-side position; never a hand-rolled panel.</li>
</ul>""",
    "anatomy": {
        "figure": drawer("an"),
        "callouts": [(70, 7), (96, 7), (75, 45), (75, 93)],
        "parts": [
            ("Title", "<code>.drawer__title</code>, \"New event\" or \"Edit event\"; names the dialog."),
            ("Close", "Icon button labelled \"Close\"."),
            ("Body", "<code>.drawer__body</code>, the form; scrolls."),
            ("Footer", "<code>.drawer__foot</code>: Save draft and Publish, each <code>.btn--grow</code>."),
        ],
    },
    "variants": ex(drawer("v1"), "New event.", True)
    + ex(drawer("v2", title="Edit event"), "Edit event: same layout, filled values.", True),
    "sizes": "<p>One size: up to <code>--layout-dialog-max</code> (512px) wide, full height; full width on phones.</p>",
    "states": {
        "intro": "<p>Open, busy, invalid and failed, like the dialog. Controls keep their own states.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'), ("Active", ' data-state="active"')], [
            ("Close", '<button class="icon-button" type="button" aria-label="Close"{a}>' + X + "</button>"),
        ]) + "<h3>Busy</h3>" + ex(drawer("st1", busy=True), "Publishing: the primary is busy; fields stay readable."),
        "themes": themes(drawer("th", labelled=False, h="30rem")),
        "notes": "<ul><li><b>Invalid</b>: an error summary at the top of the body links to each field.</li><li><b>Failed</b>: a form alert at the top; nothing is lost.</li><li>On success the drawer closes and an admin toast confirms (\"Event published\").</li></ul>",
    },
    "responsive": "<ul><li>Below 512px the drawer fills the width.</li><li>Above, it is 512px against the right edge; the dimmed list shows to the left.</li><li>Two-column field rows (<code>.field-grid</code>) stack on phones.</li></ul>",
    "theming": "<p>Reads <code>--color-bg-surface-raised</code>, <code>--shadow-4</code> and <code>--color-bg-backdrop</code>; dark theme swaps them.</p>",
    "accessibility": {
        "pattern": "<p>Same as a modal dialog: <code>role=\"dialog\"</code>, <code>aria-modal=\"true\"</code>, <code>aria-labelledby</code> the title, the page behind <code>inert</code>.</p>",
        "keys": [(kbd("Tab") + " / " + kbd("Shift", "Tab"), "Cycles within the drawer."), (kbd("Esc"), "Closes and returns focus to the trigger.")],
        "focus": "<p>Focus goes to the first field on open and back to the trigger (\"New event\" or the row's Edit) on close.</p>",
        "labelling": "<p>The title names it; Close is labelled.</p>",
        "pairs": [("Title on drawer", "--color-fg-default", "--color-bg-surface-raised", 4.5), ("Focus ring on drawer", "--color-focus-ring", "--color-bg-surface-raised", 3)],
        "motion": "<p>Slides in from the right over <code>--duration-slow</code>; under reduced motion it appears without sliding.</p>",
        "touch": "<p>Close 44 × 44px; footer buttons 48px tall.</p>",
    },
    "content": "<ul><li>Title: \"New event\", \"Edit event\", \"Edit listing\".</li><li>Footer: \"Save draft\" and \"Publish\" (or \"Save changes\").</li></ul>",
    "dodont": [
        ("do", drawer("d1", h="30rem"), "Draft and Publish side by side; publish is primary."),
        ("dont", drawer("d2", title="Delete event?", body='<p class="muted">This can\'t be undone.</p>', h="30rem"), "A confirmation in a drawer; use a dialog."),
        ("do", drawer("d3", title="Edit event", h="30rem"), "Edit in place over the list."),
        ("dont", drawer("d4", title="Event", h="30rem"), "A vague title; say New or Edit."),
    ],
    "tokens": [
        ("Panel / shadow", "--color-bg-surface-raised / --shadow-4", "color"),
        ("Scrim", "--color-bg-backdrop", "color"),
        ("Dividers", "--color-border-default", "color"),
        ("Width", "--layout-dialog-max", "value"),
        ("Stacking", "--z-overlay / --z-modal", "value"),
        ("Motion", "--duration-slow / --ease-enter", "value"),
    ],
    "code": {
        "snippet": '''<div class="scrim" aria-hidden="true"></div>
<aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drw-title">
  <div class="drawer__head">
    <h2 class="display drawer__title" id="drw-title">New event</h2>
    <button class="icon-button" type="button" aria-label="Close">…</button>
  </div>
  <form class="drawer__body" novalidate>…</form>
  <div class="drawer__foot">
    <button class="btn btn--secondary btn--grow" type="button">Save draft</button>
    <button class="btn btn--primary btn--grow" type="submit">Publish</button>
  </div>
</aside>''',
        "classes": [("<code>.drawer</code>", "Fixed right panel."), ("<code>.drawer__head</code> <code>.drawer__title</code>", "Header."),
                    ("<code>.drawer__body</code> <code>.drawer__foot</code>", "Scrolling form; actions."), ("<code>.scrim</code>", "Backdrop.")],
    },
    "sources": {"mocks": [mock("dialogs/event-editor/default", "new event"), mock("dialogs/event-editor/edit", "edit"),
                          mock("dialogs/event-editor/busy", "busy"), mock("dialogs/listing-editor/default", "listing editor")],
                "drift": "The drawer's shadow was the old level 5, now <code>--shadow-4</code>."},
}
