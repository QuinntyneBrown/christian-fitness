from dslib import ex, icon, kbd, matrix, mock, themes

X = icon("x", "icon--lg")
# .dialog and .scrim are position: fixed. Each example sits in a frame with a transform, which becomes the
# containing block for fixed children, so the overlay stays inside the frame instead of covering the docs page.
FRAME = '<div class="ds-frame" style="transform: translateZ(0); width: 100%; height: {h};">{inner}</div>'


def dialog(uid, *, title="Request a booking", sub="Danielle Okafor · Personal trainer · From $70 / session",
           body=None, foot=None, h="34rem", busy=False, labelled=True):
    lab = f' aria-labelledby="{uid}-t" aria-describedby="{uid}-d"' if labelled else f' aria-label="{title}"'
    tid = f' id="{uid}-t"' if labelled else ""
    did = f' id="{uid}-d"' if labelled else ""
    body = body if body is not None else (
        f'<div class="field"><label class="field__label" for="{uid}-kind">What would you like?</label>'
        f'<select class="select" id="{uid}-kind" name="kind"><option>One-on-one session</option><option selected>Free 15-minute intro call</option></select></div>'
        f'<div class="field"><label class="field__label" for="{uid}-when">When works for you?</label>'
        f'<input class="input" id="{uid}-when" name="when" type="text" value="Weekday evenings after 6"></div>'
        '<p class="field__hint">Danielle replies in Messages, usually within a day. Nothing is charged until you both confirm a time.</p>')
    if foot is None:
        send = (f'<button class="btn btn--primary btn--grow" type="submit" aria-busy="true">{icon("loader", "icon--spin")}Sending…</button>'
                if busy else '<button class="btn btn--primary btn--grow" type="submit">Send request</button>')
        foot = f'<button class="btn btn--secondary btn--grow" type="button">Cancel</button>{send}'
    foot_html = f'<div class="dialog__foot">{foot}</div>' if foot else ""
    inner = ('<div class="scrim" aria-hidden="true"></div>'
             f'<div class="dialog" role="dialog" aria-modal="true"{lab}>'
             f'<div class="dialog__head"><div><h2 class="display dialog__title"{tid}>{title}</h2>'
             f'<p class="dialog__sub"{did}>{sub}</p></div>'
             f'<button class="icon-button dialog__close" type="button" aria-label="Close">{X}</button></div>'
             f'<div class="dialog__body">{body}</div>{foot_html}</div>')
    return FRAME.format(h=h, inner=inner)


SUCCESS = ('<div class="dialog__success" role="status"><span class="dialog__success-icon">' + icon("check", "icon--lg")
           + '</span><p class="mini-row__name">Request sent</p><p class="muted">Danielle will reply in Messages, usually within a day.</p></div>')

SPEC = {
    "lead": "A dialog asks for one short task, like requesting a booking or editing a profile, without leaving the page. On phones it rises as a bottom sheet.",
    "meta": ["Status: stable", "<code>role=\"dialog\"</code> + <code>aria-modal</code>", "CDK Dialog in the app"],
    "overview": """<p>Dialogs hold a short, focused task that belongs to the page behind it: request a booking from a professional's listing, edit your profile. The page behind is covered by a scrim and made inert; focus moves into the dialog and returns to the trigger on close.</p>
<ul>
<li>Use a dialog for a task of one to four fields, or a confirmation.</li>
<li>Use a <a href="drawer.html">drawer</a> for longer editing alongside a list (admin event and listing editors).</li>
<li>Use a page when the task has many steps or deserves its own URL.</li>
<li>In the Angular app every dialog opens through the CDK Dialog service; never a hand-rolled overlay or an inline form.</li>
</ul>""",
    "anatomy": {
        "figure": dialog("an"),
        "callouts": [(30, 20), (50, 30), (75, 22), (50, 55), (50, 88)],
        "parts": [
            ("Title", "<code>.dialog__title</code>, display face 30px; referenced by <code>aria-labelledby</code>."),
            ("Subtitle", "<code>.dialog__sub</code>, the context (who, what, price); referenced by <code>aria-describedby</code>."),
            ("Close", "<code>.icon-button.dialog__close</code>, labelled \"Close\"."),
            ("Body", "<code>.dialog__body</code>, scrolls when content is taller than the dialog."),
            ("Footer", "<code>.dialog__foot</code>: Cancel then the primary, each <code>.btn--grow</code>."),
        ],
    },
    "variants": "<h3>Form</h3>" + ex(dialog("v1"), "Request a booking: two fields, a reassurance hint, Cancel and Send request.", True)
    + "<h3>Success</h3>" + ex(dialog("v2", title="Request a booking", body=SUCCESS,
                                     foot='<button class="btn btn--primary btn--grow" type="button">Done</button>', h="26rem"),
                              "After sending: the body becomes a success message and the footer one Done button.", True),
    "sizes": "<p>One size: up to <code>--layout-dialog-max</code> (512px) wide, 16px clear of the viewport edges, and no taller than the viewport less 64px. On phones it is full width and up to 92% of the viewport tall.</p>",
    "states": {
        "intro": "<p>The dialog's own states are open, busy, failed and success; its controls keep their own states. Busy marks the primary with <code>aria-busy</code> and leaves the fields readable.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'), ("Active", ' data-state="active"')], [
            ("Close", '<button class="icon-button" type="button" aria-label="Close"{a}>' + X + "</button>"),
        ]) + "<h3>Busy</h3>" + ex(dialog("st1", busy=True), "Sending: primary busy with spinner, Cancel still available.")
        + "<h3>Failed</h3>" + ex(dialog("st2", body='<div class="form-alert" role="alert">' + icon("alert-circle") + '<div><p class="form-alert__title">Your request didn\'t send</p>'
                                                  '<p>Nothing was lost. Check your connection and send it again.</p></div></div>', h="26rem"),
                                "Failed: a form alert at the top of the body; the fields keep what was typed."),
        "themes": themes(dialog("th", labelled=False, h="30rem")),
        "notes": """<ul>
<li><b>Open</b>: the scrim fades in and the dialog scales from 96% (sheet slides up on phones). Focus moves to the first field.</li>
<li><b>Busy</b>: <code>aria-busy="true"</code> on the primary; Escape and Cancel still close, and the request is abandoned with a toast.</li>
<li><b>Failed</b>: an alert in the body; nothing typed is lost.</li>
<li><b>Success</b>: <code>.dialog__success</code> with <code>role="status"</code> and one Done button.</li>
</ul>""",
    },
    "responsive": """<ul>
<li>Below 640px: a bottom sheet, full width, top corners rounded, sliding up; the footer stays one row.</li>
<li>From 640px: centred, up to 512px wide.</li>
<li>The body scrolls; header and footer stay fixed inside the dialog.</li>
</ul>""",
    "theming": "<p>The panel reads <code>--color-bg-surface-raised</code> with <code>--shadow-4</code>; the scrim reads <code>--color-bg-backdrop</code>. Dark theme raises the surface a step above the page through tokens.</p>",
    "accessibility": {
        "pattern": '<p><a href="https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/">APG Dialog (modal)</a>: <code>role="dialog"</code>, <code>aria-modal="true"</code>, <code>aria-labelledby</code> the title and <code>aria-describedby</code> the subtitle. The page behind is <code>inert</code>. CDK Dialog provides the focus trap and focus return.</p>',
        "keys": [
            (kbd("Tab") + " / " + kbd("Shift", "Tab"), "Cycles focus within the dialog."),
            (kbd("Esc"), "Closes the dialog and returns focus to the trigger."),
            (kbd("Enter"), "Submits the form from a single-line field."),
        ],
        "focus": "<p>On open, focus goes to the first field (or the primary when there is none). On close it returns to the element that opened the dialog. Close the CDK dialog by its ref before navigating.</p>",
        "labelling": "<p>The title names the dialog; the subtitle describes it. Close is an icon button labelled \"Close\".</p>",
        "pairs": [
            ("Title on dialog", "--color-fg-default", "--color-bg-surface-raised", 4.5),
            ("Subtitle on dialog", "--color-fg-muted", "--color-bg-surface-raised", 4.5),
            ("Focus ring on dialog", "--color-focus-ring", "--color-bg-surface-raised", 3),
        ],
        "motion": "<p>Scrim fades over <code>--duration-base</code>; the dialog scales over <code>--duration-base</code> and the sheet slides over <code>--duration-slow</code>. Under reduced motion all three are removed.</p>",
        "touch": "<p>Close is 44 × 44px; footer buttons are 48px tall and split the width.</p>",
    },
    "content": """<ul>
<li>Title is the task as a verb phrase: "Request a booking", "Edit profile".</li>
<li>Subtitle gives the context people need to be sure: who, what, how much.</li>
<li>The primary repeats the title's verb: "Send request", "Save changes". Cancel is always "Cancel".</li>
<li>Reassure where money or commitment is involved: "Nothing is charged until you both confirm a time."</li>
</ul>""",
    "dodont": [
        ("do", dialog("d1", h="30rem"), "Short task, context in the subtitle, one primary that names the action."),
        ("dont", dialog("d2", title="Are you sure?", sub="Please confirm.", body='<p class="muted">Do you want to continue?</p>',
                        foot='<button class="btn btn--secondary btn--grow" type="button">No</button><button class="btn btn--primary btn--grow" type="button">OK</button>', h="22rem"),
         "Vague title and labels; say what will happen."),
        ("do", dialog("d3", body=SUCCESS, foot='<button class="btn btn--primary btn--grow" type="button">Done</button>', h="32rem"), "Success in place, then one way out."),
        ("dont", dialog("d4", title="New event", sub="Fill in every detail", body=''.join(
            f'<div class="field"><label class="field__label" for="d4-{i}">{t}</label><input class="input" id="d4-{i}" type="text"></div>'
            for i, t in enumerate(["Title", "Category", "Date", "Start time", "Location", "Price", "Capacity"])), h="30rem"),
         "A long editor crammed into a dialog; use a drawer."),
    ],
    "tokens": [
        ("Panel / shadow", "--color-bg-surface-raised / --shadow-4", "color"),
        ("Scrim", "--color-bg-backdrop", "color"),
        ("Dividers", "--color-border-default", "color"),
        ("Subtitle", "--color-fg-muted", "color"),
        ("Max width", "--layout-dialog-max", "value"),
        ("Radius", "--radius-xl", "value"),
        ("Padding", "--space-6 / --space-4", "value"),
        ("Stacking scrim / dialog", "--z-overlay / --z-modal", "value"),
        ("Motion", "--duration-base / --duration-slow / --ease-enter", "value"),
    ],
    "code": {
        "snippet": '''<div class="scrim" aria-hidden="true"></div>
<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-desc">
  <div class="dialog__head">
    <div><h2 class="display dialog__title" id="dlg-title">Request a booking</h2>
      <p class="dialog__sub" id="dlg-desc">Danielle Okafor · Personal trainer · From $70 / session</p></div>
    <button class="icon-button dialog__close" type="button" aria-label="Close">…</button>
  </div>
  <div class="dialog__body">…fields…</div>
  <div class="dialog__foot">
    <button class="btn btn--secondary btn--grow" type="button">Cancel</button>
    <button class="btn btn--primary btn--grow" type="submit">Send request</button>
  </div>
</div>''',
        "classes": [
            ("<code>.scrim</code>", "Fixed backdrop."),
            ("<code>.dialog</code>", "Bottom sheet below 640px, centred dialog above."),
            ("<code>.dialog__head</code> <code>.dialog__title</code> <code>.dialog__sub</code> <code>.dialog__close</code>", "Header."),
            ("<code>.dialog__body</code> <code>.dialog__foot</code>", "Scrolling body; footer actions."),
            ("<code>.dialog__success</code> <code>.dialog__success-icon</code>", "Success message."),
            ("<code>role=\"dialog\"</code> <code>aria-modal=\"true\"</code>", "Modal semantics; page behind gets <code>inert</code>."),
        ],
    },
    "sources": {
        "mocks": [mock("dialogs/request-booking/default", "form"), mock("dialogs/request-booking/busy", "busy"),
                  mock("dialogs/request-booking/failed", "failed"), mock("dialogs/request-booking/success", "success"),
                  mock("dialogs/edit-profile/default", "edit profile")],
        "drift": "The dialog used the old 3xl radius (24px), now <code>--radius-xl</code>; its shadow was the old level 5, now <code>--shadow-4</code>.",
    },
}
