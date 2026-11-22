from dslib import cf_ui, ex, kbd, mock

F = cf_ui

TOASTS = (
    '<div class="stack">'
    + F.toast("success", "You're registered", "We've added you to the Saturday Park Bootcamp group chat.", action=("Open chat", "#"))
    + F.toast("warning", "Rain in Saturday's forecast", "The run goes ahead unless the team messages the group by 5 AM.")
    + F.toast("danger", "We couldn't register you", "Your spot isn't saved yet. Check your connection and try again.",
              action=("Try again", "#"), role="alert")
    + '</div>'
)
BANNERS = (
    '<div class="stack">'
    + F.banner("info", "mail", "<strong>Confirm your email.</strong> We sent a link to grace.thompson@gmail.com.", action=("Resend", "#"))
    + F.banner("warning", "wifi-off", "<strong>You're offline.</strong> Showing what was saved at 8:42 AM. We'll refresh when you're back.", dismiss=False)
    + '</div>'
)
INLINE = F.form_alert("Your request didn't send", "Nothing was lost. Check your connection and send it again.")

SPEC = {
    "slug": "notifications",
    "lead": "Tell people what changed at the level it matters: a toast for a moment, a banner for a condition, inline for a task.",
    "overview": """<table class="ds-table"><thead><tr><th scope="col">Element</th><th scope="col">Scope</th><th scope="col">Lifetime</th><th scope="col">Example</th></tr></thead><tbody>
<tr><td><a href="../components/toast.html">Toast</a></td><td>One action just finished</td><td>Auto-dismisses (success, info) or stays (danger, Undo)</td><td>"You're registered"</td></tr>
<tr><td><a href="../components/banner.html">Banner</a></td><td>A condition affecting the whole app</td><td>Until the condition ends or it's dismissed</td><td>"You're offline."</td></tr>
<tr><td><a href="../components/alert.html">Inline alert</a></td><td>One form or region</td><td>Until fixed or resubmitted</td><td>"Your request didn't send"</td></tr>
<tr><td><a href="../components/inline-message.html">Inline message</a></td><td>One field or message</td><td>Until fixed</td><td>"Not sent. Retry"</td></tr>
</tbody></table>""",
    "when": """<ul>
<li><b>Toast</b> confirms something the person just did, or a timely heads-up (rain forecast, event 80% full). Never for errors in a form they're still on.</li>
<li><b>Banner</b> for app-wide state: email not confirmed, offline, delayed messages, scheduled maintenance. One at a time, highest priority wins.</li>
<li><b>Inline</b> for anything tied to a task: the failure appears where the person is looking.</li>
<li>Priority: danger &gt; warning &gt; info &gt; success. A danger banner (messages delayed) replaces an info one.</li>
</ul>""",
    "structure": "<h3>Toasts</h3>"
        + ex(TOASTS, "Success, warning and danger toasts. Shown inline; in the product they stack in the fixed toast region, newest at the bottom, at most three.", True)
        + "<h3>Banners</h3>"
        + ex(BANNERS, "An info banner with action and dismiss, and a persistent offline banner with no dismiss.", True)
        + "<h3>Inline</h3>"
        + ex(INLINE, "A form-level failure sits at the top of the form.", True),
    "states": """<p>Kinds: <b>info</b>, <b>success</b>, <b>warning</b>, <b>danger</b>, plus <b>brand</b> for team announcements (maintenance). Each kind pairs a colour with an icon, so it never depends on colour alone. Toasts may carry one action (Open chat, Undo, Try again). Stacked toasts collapse beyond three; the oldest leaves first.</p>""",
    "responsive": """<p>The toast region spans the width above the tab bar on phones and sits bottom-right (<code>--layout-toast-width</code>) from 48rem; the admin console uses <code>.toast-region--admin</code>. Banners span the full width under the header and wrap their text; the action drops below on narrow screens.</p>""",
    "accessibility": f"""<ul>
<li>The toast region is a labelled <code>section</code> ("Notifications") holding a <code>role="status"</code> polite live region; danger toasts are <code>role="alert"</code>.</li>
<li>Toasts with an action stay until dismissed and pause on hover or focus; success toasts stay at least 5 seconds.</li>
<li>Dismiss buttons are named ("Dismiss"); {kbd("Esc")} dismisses the focused toast.</li>
<li>Toasts never take focus; anything the person must act on goes inline or in a banner.</li>
<li>Danger banners use <code>role="alert"</code>; the rest <code>role="status"</code>.</li>
</ul>""",
    "content": """<ul>
<li>Title: the outcome in a few words ("You're registered", "Draft saved"). Text: one sentence on what it means or what's next.</li>
<li>Banners lead with a bold sentence, then the detail: "<b>You're offline.</b> Showing what was saved at 8:42 AM."</li>
<li>Action labels are verbs: "Open chat", "Resend", "Undo", "Try again".</li>
</ul>""",
    "do-dont": [
        ("do", F.toast("success", "Draft saved", "Whole Life Retreat isn't visible to members yet."), "Confirm the outcome and what it means."),
        ("dont", F.toast("success", "Success!", "The operation completed successfully."), "Don't write a generic \"Success!\"."),
        ("do", INLINE.replace("Your request didn't send", "We couldn't save your changes"), "Put task failures inline, where the person is."),
        ("dont", F.toast("danger", "Error", "Something went wrong.", role="alert"), "Don't hide a form failure in a vague toast."),
    ],
    "sources": {
        "mocks": [
            mock("notifications/toast/success", "registered toast with action"),
            mock("notifications/toast/danger", "danger toast as alert"),
            mock("notifications/toast/stacked", "three stacked toasts"),
            mock("notifications/admin-toast/warning", "event 80% full"),
            mock("notifications/banner/info", "confirm email"),
            mock("notifications/banner/warning", "offline, not dismissible"),
            mock("notifications/banner/danger", "messages delayed"),
            mock("notifications/banner/persistent", "maintenance (brand)"),
        ],
        "drift": """<ul>
<li>The "persistent" banner mock is the brand maintenance notice and has a dismiss button, while the warning and danger banners, which are the truly persistent ones, have none. Rename the state or drop its dismiss.</li>
<li>"Couldn't publish Whole Life Retreat" is both a danger toast and the event editor's failed alert; when the drawer is open, the inline alert alone is enough.</li>
</ul>""",
    },
}
