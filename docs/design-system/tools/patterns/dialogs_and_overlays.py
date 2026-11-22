from dslib import cf_ui, ex, icon, kbd, mock

F = cf_ui

PARTS = (
    '<div class="card card--clip">'
    '<div class="dialog__head"><div><p class="display dialog__title" id="dg-t">Request a booking</p>'
    '<p class="dialog__sub">Danielle Okafor · Personal trainer · From $70 / session</p></div>'
    f'<button class="icon-button dialog__close" type="button" aria-label="Close">{icon("x", "icon--lg")}</button></div>'
    '<div class="dialog__body">'
    + F.field("When works for you?", "dg-when", "Weekday evenings after 6", hint="Days and times, in your own words")
    + '</div><div class="dialog__foot"><button class="btn btn--secondary btn--grow" type="button">Cancel</button>'
      '<button class="btn btn--primary btn--grow" type="submit">Send request</button></div></div>'
)
SUCCESS = (
    '<div class="card card--clip"><div class="dialog__body"><div class="dialog__success" role="status">'
    f'<span class="dialog__success-icon">{icon("check", "icon--lg")}</span>'
    '<p class="lead">Danielle will reply in your messages, usually within a day. We\'ve started the conversation for you.</p></div></div>'
    '<div class="dialog__foot"><button class="btn btn--secondary btn--grow" type="button">Done</button>'
    '<a class="btn btn--primary btn--grow" href="#">Go to messages</a></div></div>'
)

SPEC = {
    "slug": "dialogs-and-overlays",
    "lead": "Overlays keep people in context for a short, focused task, then put them back exactly where they were.",
    "overview": """<p>Christian Fitness uses three overlays and nothing else:</p>
<ul>
<li><b><a href="../components/dialog.html">Dialog</a></b>: a short task with one outcome (request a booking, edit profile). Bottom sheet on phones, centred on wider screens.</li>
<li><b><a href="../components/drawer.html">Drawer</a></b>: a long staff edit beside the list it changes (new event, add listing).</li>
<li><b><a href="../components/menu.html">Menu</a></b> and <b><a href="../components/tooltip.html">tooltip</a></b>: small, non-modal, anchored to their trigger.</li>
</ul>
<p>Anything longer, or anything people may want to link to, is a page.</p>""",
    "when": """<table class="ds-table"><thead><tr><th scope="col">Task</th><th scope="col">Use</th></tr></thead><tbody>
<tr><td>3 fields or fewer, one outcome</td><td>Dialog</td></tr>
<tr><td>Long form, staff needs the list in view</td><td>Drawer</td></tr>
<tr><td>Content people share or return to (event, profile)</td><td>Page</td></tr>
<tr><td>Confirm something that can't be undone</td><td>Dialog with a danger button</td></tr>
<tr><td>Reversible action</td><td>No overlay; act and offer Undo in a toast</td></tr>
</tbody></table>""",
    "structure": """<p>Head (title, optional subtitle with context, close button) → body (alert slot, fields) → foot (Cancel, then the primary action). Below, the dialog's parts are shown in a card; in the product they sit in the fixed <code>.dialog</code> over a <code>.scrim</code> and the page behind is <code>inert</code>.</p>"""
        + ex(PARTS, "Dialog parts: head with context, body, split footer.", True)
        + ex(SUCCESS, "Success replaces the body; the footer offers Done and the next step.", True),
    "states": """<p>Dialogs and drawers share the form states: <b>default</b> (focus on the first field), <b>invalid</b> (error summary focused), <b>busy</b> (close and Cancel disabled), <b>failed</b> (alert at top, values kept) and <b>success</b> (dialogs only; drawers close and confirm with a toast). Never stack one overlay on another: a confirmation inside a drawer replaces the drawer's footer instead.</p>""",
    "responsive": """<ul>
<li>Under 48rem a dialog is a bottom sheet, full width, up to 92% of the viewport height; its body scrolls, its head and foot stay.</li>
<li>From 48rem it centres with a max width of <code>--layout-dialog-max</code>.</li>
<li>Drawers fill the screen on phones and slide in from the right on wider screens.</li>
</ul>""",
    "accessibility": f"""<ul>
<li><code>role="dialog"</code>, <code>aria-modal="true"</code>, <code>aria-labelledby</code> the title and <code>aria-describedby</code> the subtitle.</li>
<li>Focus moves into the overlay (first field, or the error summary) and is trapped; the page behind is <code>inert</code>.</li>
<li>{kbd("Esc")} and the close button dismiss when nothing has changed; on close, focus returns to the trigger.</li>
<li>Use the native <code>&lt;dialog&gt;</code> or CDK Dialog; never a hand-rolled modal.</li>
<li>Scrim clicks close only non-destructive overlays with no unsaved changes.</li>
</ul>""",
    "content": """<ul>
<li>The title is the task as a verb phrase: "Request a booking", "Edit profile", "New event".</li>
<li>The subtitle gives context: who or what it's about.</li>
<li>The success title is the outcome ("Request sent") and the text says what happens next.</li>
</ul>""",
    "do-dont": [
        ("do", '<div class="btn-row"><button class="btn btn--secondary btn--grow" type="button">Cancel</button><button class="btn btn--primary btn--grow" type="submit">Save</button></div>',
         "Cancel first, the primary action last."),
        ("dont", '<div class="btn-row"><button class="btn btn--primary btn--grow" type="submit">Save</button><button class="btn btn--primary btn--grow" type="button">Save and close</button></div>',
         "Don't offer two primary actions."),
        ("do", '<p class="lead">Edit the event in a drawer; the list stays beside it.</p>', "Use a drawer for long staff edits."),
        ("dont", '<p class="lead">A dialog that opens a second dialog on top of it.</p>', "Don't stack overlays."),
    ],
    "sources": {
        "mocks": [
            mock("dialogs/request-booking/default", "dialog with subtitle"),
            mock("dialogs/request-booking/success", "success panel"),
            mock("dialogs/edit-profile/busy", "busy dialog"),
            mock("dialogs/event-editor/default", "drawer"),
            mock("dialogs/listing-editor/failed", "drawer failed state"),
        ],
        "drift": """<ul>
<li>Dialog close buttons have the <code>.dialog__close</code> class; drawer close buttons have none.</li>
<li>Drawer bodies are a <code>&lt;form&gt;</code>; dialog bodies are a <code>&lt;div&gt;</code> with the submit button outside any form. Both should wrap fields and footer in one form so Enter submits.</li>
</ul>""",
    },
}
