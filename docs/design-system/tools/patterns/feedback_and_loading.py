from dslib import cf_ui, ex, icon, mock

F = cf_ui
SPIN = icon("loader", "icon--spin")

SKELETON = F.loading_region("Loading events", (
    '<div class="card card--pad stack">'
    '<span class="skeleton skeleton--image-16x9"></span>'
    '<span class="skeleton skeleton--text-sm w-40"></span>'
    '<span class="skeleton skeleton--title"></span>'
    '<span class="skeleton skeleton--text"></span></div>'))

BUTTON = (f'<button class="btn btn--primary" type="button" disabled aria-busy="true">{SPIN}Registering…</button>'
          '<button class="btn btn--secondary" type="button">Cancel</button>')

SPINNER = ('<span class="spinner" role="status"><span class="spinner__ring" aria-hidden="true"></span>Loading older messages…</span>')

TOAST = F.toast("info", "You've left Easter Sunrise 5K", "Your spot goes to the waitlist in 10 minutes.",
                action=("Undo", "#"), icon_name="undo")

PROGRESS = ('<div class="progress progress--indeterminate"><div class="progress__head"><span class="progress__label" id="pg-l">Uploading photo</span></div>'
            '<div class="progress__track" role="progressbar" aria-labelledby="pg-l"><span class="progress__bar"></span></div></div>')

SPEC = {
    "slug": "feedback-and-loading",
    "lead": "Every action gets an answer: right away, in the place the person is looking, and in proportion to what happened.",
    "overview": """<p>Feedback has three jobs: show that something is happening, confirm what happened, and offer a way back. Pick the lightest element that does the job.</p>
<table class="ds-table"><thead><tr><th scope="col">Situation</th><th scope="col">Use</th></tr></thead><tbody>
<tr><td>Page or region loading for the first time</td><td><a href="../components/skeleton.html">Skeleton</a> shaped like the content</td></tr>
<tr><td>A button's action is in flight</td><td>Busy button: <a href="../components/spinner.html">spinner</a> plus "-ing" label</td></tr>
<tr><td>Small region refreshing or loading more</td><td>Inline spinner with a text label</td></tr>
<tr><td>Long task with known size (upload)</td><td><a href="../components/progress-bar.html">Progress bar</a></td></tr>
<tr><td>Done, and the person may want to undo</td><td><a href="../components/toast.html">Toast</a> with Undo</td></tr>
<tr><td>Done inside a dialog</td><td>Dialog success panel</td></tr>
<tr><td>Failed</td><td>Inline alert, error state or danger toast (see <a href="notifications.html">Notifications</a>)</td></tr>
</tbody></table>""",
    "when": """<ul>
<li><b>Skeleton, not spinner</b>, for first loads of anything with a known shape (event grid, profile, tables). It keeps the layout still.</li>
<li><b>Spinner</b> only inside a button or for a small region where a skeleton would be bigger than the result.</li>
<li><b>Nothing</b> for actions under 300 ms; don't flash a loader.</li>
<li><b>Optimistic updates</b> for chat: the message appears at once with "Sending…", then either settles or shows a retry link.</li>
<li><b>Undo over confirm</b> for reversible actions (leave an event, suspend a member); confirm dialogs only for what can't be undone.</li>
</ul>""",
    "structure": "<h3>Loading a region</h3>"
        + ex(SKELETON, "A skeleton card inside an <code>aria-busy</code> region with a visually hidden label.", True)
        + "<h3>Action in flight</h3>"
        + ex(BUTTON, "The button keeps its width, shows a spinner and the -ing label.", True)
        + ex(SPINNER, "Inline spinner with text for a small region.", True)
        + ex(PROGRESS, "Indeterminate progress; a determinate bar sets <code>--progress</code> and <code>aria-valuenow</code>.", True)
        + "<h3>Done, with a way back</h3>"
        + ex(TOAST, "Toast with Undo. Shown here inline; in the product it sits in the fixed toast region.", True),
    "states": """<p>The life of an action: <b>idle</b> → <b>busy</b> (button disabled, fields read-only) → <b>success</b> (toast or success panel, focus moves to the result) or <b>failed</b> (inline alert, values kept, button resets). Loading regions go <b>loading</b> → <b>loaded</b>, <b>empty</b>, <b>partial</b> (some panels failed) or <b>error</b>; see <a href="empty-and-error-states.html">Empty and error states</a>.</p>""",
    "responsive": """<p>Skeletons use the same grid as the content they replace, so they reflow the same way. Toasts sit above the <a href="../components/tab-bar.html">tab bar</a> on phones and bottom-right on wider screens. Busy buttons keep their width at every breakpoint so the footer doesn't jump.</p>""",
    "accessibility": """<ul>
<li>Loading regions carry <code>aria-busy="true"</code> and <code>aria-live="polite"</code> with a hidden "Loading events" label; skeleton pieces are silent.</li>
<li>Success toasts go in the <code>role="status"</code> live region; failures use <code>role="alert"</code>.</li>
<li>Spinners respect <code>prefers-reduced-motion</code>: the rotation stops and the label carries the meaning.</li>
<li>Toasts with Undo stay until dismissed or for at least 10 seconds, and pause on hover and focus (WCAG 2.2.1).</li>
<li>After success in a dialog, focus moves to the success panel's first button.</li>
</ul>""",
    "content": """<ul>
<li>Busy labels repeat the verb: "Registering…", "Saving…", "Publishing…", "Signing in…".</li>
<li>Success toasts lead with the outcome in past tense or second person: "You're registered", "Draft saved".</li>
<li>Undo toasts say what's reversible and for how long: "Your spot goes to the waitlist in 10 minutes."</li>
</ul>""",
    "do-dont": [
        ("do", SKELETON.replace("Loading events", "Loading profile"), "Mirror the content's shape while it loads."),
        ("dont", '<span class="spinner spinner--lg" role="status"><span class="spinner__ring" aria-hidden="true"></span>Loading…</span>',
         "Don't fill a whole page with one big spinner."),
        ("do", F.toast("info", "Kevin Brooks suspended", "Kevin can't sign in or message anyone until you lift it.", action=("Undo", "#"), icon_name="undo"),
         "Act at once and offer Undo."),
        ("dont", '<p class="lead">Are you sure you want to suspend Kevin Brooks?</p><div class="btn-row"><button class="btn btn--secondary" type="button">No</button><button class="btn btn--primary" type="button">Yes</button></div>',
         "Don't ask \"Are you sure?\" for something that can be undone."),
    ],
    "sources": {
        "mocks": [
            mock("pages/events/loading", "skeleton event grid"),
            mock("pages/admin-members/loading", "table skeleton"),
            mock("pages/event-detail/registering", "Registering… busy button"),
            mock("pages/messages/draft", "optimistic send"),
            mock("pages/messages/send-failed", "failed message with retry"),
            mock("notifications/toast/with-action", "Undo toast"),
            mock("notifications/admin-toast/with-action", "Undo after suspend"),
            mock("dialogs/request-booking/success", "dialog success panel"),
        ],
        "drift": """<ul>
<li>Undo toasts use the <code>info</code> kind with an undo icon, while other confirmations use <code>success</code> ("You're registered"). Both are fine, but "Kevin Brooks suspended" and "You've left Easter Sunrise 5K" are completed actions too; pick one kind for every completed action that offers Undo.</li>
<li>The mocks never show a determinate progress bar in use; it's documented from the component kit only.</li>
</ul>""",
    },
}
