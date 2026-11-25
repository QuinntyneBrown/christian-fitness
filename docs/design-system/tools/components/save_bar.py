from dslib import ex, icon, kbd, mock, themes


def vmatrix(variant, rows):
    """A state matrix for wide blocks: states down, one variant column. rows: (state, html or None)."""
    body = "".join(f'<tr><th scope="row">{st}</th><td>{"—" if h is None else h}</td></tr>' for st, h in rows)
    return (f'<div class="ds-matrix"><table><thead><tr><th scope="col">State</th><th scope="col">{variant}</th></tr></thead>'
            f'<tbody>{body}</tbody></table></div>')


def inner(state="unsaved", a=""):
    if state == "saving":
        return (f'<div class="save-bar__inner"><p class="save-bar__text">Unsaved changes</p><button class="btn btn--inverse btn--sm" type="submit" '
                f'aria-busy="true" disabled>{icon("loader", "icon--spin")}Saving…</button></div>')
    if state == "saved":
        return f'<div class="save-bar__inner"><p class="save-bar__text save-bar__text--done">{icon("check")}Preferences saved</p></div>'
    if state == "failed":
        return (f'<div class="save-bar__inner"><p class="save-bar__text">Couldn’t save. Your changes are still here.</p>'
                f'<button class="btn btn--inverse btn--sm" type="submit"{a}>Try again</button></div>')
    return f'<div class="save-bar__inner"><p class="save-bar__text">Unsaved changes</p><button class="btn btn--inverse btn--sm" type="submit"{a}>Save</button></div>'


def bar(state="unsaved"):
    role = "alert" if state == "failed" else "status"
    return f'<div class="save-bar" role="{role}">{inner(state)}</div>'


def frame(html):
    """A screen-sized frame that contains the fixed bar (contain: paint makes it the bar's containing block)."""
    return f'<div class="ds-matrix ds-frame ds-frame--tall">{html}</div>'


SPEC = {
    "lead": "The save bar appears when a settings page has unsaved changes, holds the one Save action, and says when the changes are saved or could not be.",
    "meta": ["Status: new", "Fixed, <code>role=\"status\"</code>", "Preferences"],
    "overview": """<p>Preferences is a long page of switches and selects saved together. Rather than a Save button at the bottom, a dark pill floats above the tab bar the moment something changes: \"Unsaved changes · Save\". It reports saving, saved (for about two seconds) and failure, then goes.</p>
<p>Use it only for a page of settings saved together. Settings that apply at once use a <a href="switch.html">switch</a> and a <a href="toast.html">toast</a>; forms with a beginning and an end keep their submit button (<a href="form-layout.html">form layout</a>). A dialog keeps its own footer.</p>""",
    "anatomy": {
        "figure": inner(),
        "callouts": [(8, 50), (46, 50), (82, 50)],
        "parts": [
            ("Container", "<code>.save-bar__inner</code>: a pill (<code>--radius-full</code>) on <code>--color-toast-bg</code> with <code>--shadow-4</code>; 20px start padding, 8px elsewhere."),
            ("Text", "<code>.save-bar__text</code>: semibold, says the state."),
            ("Action", "A small inverse button: Save, or Try again after a failure; busy while saving."),
        ],
    },
    "variants": ex(frame(bar()), "Unsaved: appears after the first change (preferences/unsaved). The bar is fixed to the viewport; here a frame stands in for the screen.", bar(), mod="block")
    + ex(frame(bar("saved")), "Saved: a check and \"Preferences saved\", no action; leaves after about 2 seconds (preferences/saved).", bar("saved"), mod="block"),
    "sizes": "<p>One size: as wide as its text and button, 52px tall (a 36px button plus 8px padding).</p>",
    "states": {
        "intro": "<p>The bar's states are the save request's: hidden (nothing changed), unsaved, saving, saved, failed. The button carries the real attributes (<code>aria-busy</code>, <code>disabled</code>); hover and focus on it use <code>data-state</code>.</p>",
        "matrix": vmatrix("Save bar", [
            ("Hidden", "— (no changes: the bar is not rendered)"),
            ("Unsaved", inner()),
            ("Unsaved, Save hovered", inner(a=' data-state="hover"')),
            ("Unsaved, Save focused", inner(a=' data-state="focus"')),
            ("Saving (busy)", inner("saving")),
            ("Saved", inner("saved")),
            ("Failed", inner("failed")),
        ]),
        "themes": themes(inner() + '<div class="mt-3">' + inner("saved") + "</div>"),
        "notes": """<ul>
<li><b>Saving</b>: the settings above are read-only until the answer arrives (preferences/saving).</li>
<li><b>Failed</b>: the region becomes <code>role="alert"</code>, the changes stay as set, and Try again re-sends them (preferences/failed).</li>
<li><b>Turn off all email</b> also raises the bar: it is a change like any other, not saved at once (preferences/unsubscribed).</li>
</ul>""",
    },
    "responsive": """<ul>
<li>Fixed and centred, 16px from each side; below 768px it sits 16px above the tab bar (<code>--layout-tabbar-height</code> + <code>--space-4</code>), from 768px 24px from the bottom.</li>
<li>Above page content (<code>--z-toast</code>); the wrapper ignores the pointer so only the pill catches taps.</li>
<li>Long text wraps inside the pill; keep it to one line.</li>
</ul>""",
    "theming": "<p>The pill borrows the toast's tokens: <code>--color-toast-bg</code>, <code>--color-toast-fg</code> and the saved check in <code>--color-toast-accent</code>; dark on a light page and light on a dark one. The button is <code>.btn--inverse</code>; its focus ring uses <code>--color-focus-ring-on-dark</code>.</p>",
    "accessibility": {
        "pattern": "<p>The wrapper is a live region: <code>role=\"status\"</code> (polite) for unsaved, saving and saved, <code>role=\"alert\"</code> for failed. Keep the region in the page while the screen is open and change its text, so each change is announced. The button is a real <code>type=\"submit\"</code> for the preferences form.</p>",
        "keys": [(kbd("Tab"), "Reaches Save after the page's controls (the bar is last in the DOM)."), (kbd("Enter") + ", " + kbd("Space"), "Saves; Try again after a failure.")],
        "focus": "<p>The ring on Save uses <code>--color-focus-ring-on-dark</code>. Focus stays where it was when the bar appears; after a save it is not moved.</p>",
        "labelling": "<p>The text is the message: \"Unsaved changes\", \"Preferences saved\", \"Couldn't save. Your changes are still here.\" The check icon is decorative.</p>",
        "pairs": [
            ("Bar text", "--color-toast-fg", "--color-toast-bg", 4.5),
            ("Saved check", "--color-toast-accent", "--color-toast-bg", 3),
            ("Button label", "--color-fg-brand-inverse", "--color-bg-brand-inverse", 4.5),
        ],
        "motion": "<p>None in the CSS: the bar appears and leaves without animation.</p>",
        "touch": "<p>Save is a small button whose target extends to 44 × 44px on coarse pointers.</p>",
    },
    "content": "<ul><li>Unsaved: \"Unsaved changes\" + \"Save\".</li><li>Busy: \"Saving…\".</li><li>Done: \"Preferences saved\".</li><li>Failed: \"Couldn't save. Your changes are still here.\" + \"Try again\".</li></ul>",
    "dodont": [
        ("do", inner("failed"), "Say the changes are kept and offer Try again."),
        ("dont", '<div class="save-bar__inner"><p class="save-bar__text">Error 500</p></div>', "A code and no way forward."),
        ("do", inner(), "One bar for the whole page, saving everything changed."),
        ("dont", '<div class="pref__row pref__row--split"><span class="pref__legend">Training plan email</span><button class="btn btn--secondary btn--sm" type="button">Save</button></div>',
         "A Save per row: people miss some and leave with half their changes."),
    ],
    "tokens": [
        ("Pill / text", "--color-toast-bg / --color-toast-fg", "color"),
        ("Saved check", "--color-toast-accent", "color"),
        ("Shadow", "--shadow-4", "value"),
        ("Radius", "--radius-full", "value"),
        ("Padding", "--space-2 / --space-5", "value"),
        ("Offset below 768px", "--layout-tabbar-height / --space-4", "value"),
        ("Offset from 768px", "--space-6", "value"),
        ("Layer", "--z-toast", "value"),
    ],
    "code": {
        "snippet": '''<div class="save-bar" role="status">
  <div class="save-bar__inner">
    <p class="save-bar__text">Unsaved changes</p>
    <button class="btn btn--inverse btn--sm" type="submit">Save</button>
  </div>
</div>''',
        "classes": [
            ("<code>.save-bar</code>", "Fixed, centred wrapper above the tab bar; ignores the pointer."),
            ("<code>.save-bar__inner</code>", "The pill."),
            ("<code>.save-bar__text</code> <code>--done</code>", "Message; the saved form with a check."),
            ("<code>role=\"status\"</code> · <code>role=\"alert\"</code>", "Polite updates; the failure."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/preferences/unsaved", "unsaved"),
            mock("pages/preferences/saving", "busy"),
            mock("pages/preferences/saved", "saved"),
            mock("pages/preferences/failed", "failed, role alert"),
            mock("pages/preferences/unsubscribed", "turn off all email"),
        ],
        "drift": """<ul>
<li>The bar shares the toast's layer (<code>--z-toast</code>) and bottom offset, so a toast shown while changes are unsaved would cover it. Proposed: stack the toast region above the bar, or give the bar its own offset.</li>
<li>The mocks render a new region per state and switch its role between status and alert; a live region added with its message is often not announced. Proposed: keep one region from page load (as the toast region does) and change only its content.</li>
</ul>""",
    },
}
