from dslib import ex, icon, kbd, matrix, mock, themes

X = icon("x")
ICON = {"info": "info", "success": "circle-check", "warning": "alert-triangle", "danger": "alert-circle"}


def toast(kind, title, text="", action="", ic=None, extra=""):
    t = f'<p class="toast__text">{text}</p>' if text else ""
    a = f'<a class="toast__action" href="#">{action}</a>' if action else ""
    return (f'<div class="toast toast--{kind}"{extra}>{icon(ic or ICON[kind])}'
            f'<div class="toast__body"><p class="toast__title">{title}</p>{t}{a}</div>'
            f'<button class="icon-button icon-button--sm toast__close" type="button" aria-label="Dismiss">{X}</button></div>')


INFO = toast("info", "Added to your calendar", "Easter Sunrise 5K, Saturday, April 18 at 6:45 AM.", ic="calendar-plus")
SUCCESS = toast("success", "You're registered", "We've added you to the Saturday Park Bootcamp group chat.", "Open chat")
WARNING = toast("warning", "Rain in Saturday's forecast", "The run goes ahead unless the team messages the group by 5 AM.", "Open chat")
DANGER = toast("danger", "We couldn't register you", "Your spot isn't saved yet. Check your connection and try again.", "Try again")
UNDO = toast("info", "You've left Easter Sunrise 5K", "Your spot goes to the waitlist in 10 minutes.", "Undo", ic="undo")

SPEC = {
    "lead": "A toast confirms what just happened, or says it didn't, without moving the person away from what they were doing.",
    "meta": ["Status: stable", "Polite live region", "Dark surface in both themes"],
    "overview": """<p>Use a toast for the result of an action the person just took: registered, saved, published, left an event. It appears at the bottom of the screen (above the tab bar on phones, bottom right on wider screens), stacks with others and goes away on its own unless it carries an action or an error.</p>
<ul>
<li><b>Info</b>: a neutral confirmation ("Added to your calendar", "Draft saved").</li>
<li><b>Success</b>: the action worked and something new is waiting ("You're registered" with "Open chat").</li>
<li><b>Warning</b>: worth knowing, nothing failed ("Women's Hoops &amp; Devotion Night is 80% full").</li>
<li><b>Danger</b>: the action failed; the toast stays until dismissed and offers "Try again".</li>
</ul>
<p>Use a <a href="banner.html">banner</a> for a condition that lasts (offline, maintenance), an <a href="alert.html">alert</a> for a failure inside a form or dialog, and an <a href="inline-message.html">inline message</a> for a problem tied to one field or section. Never put the only copy of important information in a toast.</p>""",
    "anatomy": {
        "figure": SUCCESS,
        "callouts": [(6, 22), (40, 22), (40, 55), (40, 80), (94, 22)],
        "parts": [
            ("Tone icon", "20px (<code>--size-icon-lg</code>) in <code>--color-toast-accent</code>, or <code>--color-toast-warning</code> for warnings; <code>aria-hidden</code>."),
            ("Title", "One short sentence, semibold. It carries the message on its own."),
            ("Text (optional)", "Detail in <code>--color-toast-muted</code>: what changed, what happens next."),
            ("Action (optional)", "One text action in the accent colour: \"Open chat\", \"Undo\", \"Try again\"."),
            ("Dismiss", "Small icon button named \"Dismiss\"."),
        ],
    },
    "variants": ex(INFO + SUCCESS + WARNING + DANGER, "Info, success, warning and danger. The surface stays dark in both themes; danger switches to a solid red surface.", True, mod="stack")
    + "<h3>With undo</h3>"
    + ex(UNDO, "An undo toast names what happened and how long the person has to reverse it.", True, mod="stack")
    + "<h3>Admin console</h3>"
    + ex(toast("success", "Whole Life Retreat is live", "Members can register now. A group chat opens with the first registration.", "View in the app")
         + toast("info", "Report dismissed", "Kevin Brooks stays active. The 4 members who reported the account won't be told who reviewed it."),
         "The admin console uses the same toast; only the region's offset changes (<code>.toast-region--admin</code>, no tab bar).", True, mod="stack"),
    "sizes": '<p>One size. Width comes from the region: the full width minus 16px margins on phones, <code>--layout-toast-width</code> from 768px. Text wraps; the toast grows in height.</p>',
    "states": {
        "intro": "<p>A toast has an entering, resting, hover/focus (on its controls) and dismissed state. The dismiss button's hover is forced here with <code>data-state</code>; real pages use <code>:hover</code> and <code>:focus-visible</code>. Examples here have no live role so the page does not announce them; in the app the region provides it.</p>",
        "matrix": matrix([("Resting", ""), ("Dismiss hover", ' data-state="hover"'), ("Dismiss focus", ' data-state="focus"')], [
            ("Info", f'<div class="toast toast--info">{icon("info")}<div class="toast__body"><p class="toast__title">Draft saved</p></div><button class="icon-button icon-button--sm toast__close" type="button" aria-label="Dismiss"{{a}}>{X}</button></div>'),
            ("Success", f'<div class="toast toast--success">{icon("circle-check")}<div class="toast__body"><p class="toast__title">You\'re registered</p></div><button class="icon-button icon-button--sm toast__close" type="button" aria-label="Dismiss"{{a}}>{X}</button></div>'),
            ("Warning", f'<div class="toast toast--warning">{icon("alert-triangle")}<div class="toast__body"><p class="toast__title">6 spots left</p></div><button class="icon-button icon-button--sm toast__close" type="button" aria-label="Dismiss"{{a}}>{X}</button></div>'),
            ("Danger", f'<div class="toast toast--danger">{icon("alert-circle")}<div class="toast__body"><p class="toast__title">Couldn\'t publish</p></div><button class="icon-button icon-button--sm toast__close" type="button" aria-label="Dismiss"{{a}}>{X}</button></div>'),
        ]) + "<h3>Stacked</h3>" + ex(
            toast("info", "Added to your calendar", "Easter Sunrise 5K, Saturday at 6:45 AM.", ic="calendar-plus")
            + toast("warning", "Rain in Saturday's forecast", "The run goes ahead unless the team messages by 5 AM.")
            + toast("success", "You're registered", "Women's Hoops &amp; Devotion Night, Thursday, April 30.", "Open chat"),
            "Up to three at once, newest last (nearest the thumb). A fourth replaces the oldest.", True, mod="stack"),
        "themes": themes(INFO + DANGER, mod="stack"),
        "notes": """<ul>
<li><b>Entering</b>: fades and rises 8px over <code>--duration-base</code> with <code>--ease-enter</code>; no animation under reduced motion.</li>
<li><b>Timing</b>: info, success and warning toasts without an action leave after about 6 seconds. The timer pauses while the pointer is over the region or focus is inside it. Toasts with an action, and every danger toast, stay until dismissed.</li>
<li><b>Dismissed</b>: removed from the DOM; focus, if it was inside, returns to the control that caused the toast.</li>
</ul>""",
    },
    "responsive": """<ul>
<li>Phones (member app): the region spans the width with 16px margins and sits 16px above the tab bar (<code>--layout-tabbar-height</code>).</li>
<li>From 768px: the region moves to the bottom right, 24px from the edges, and is <code>--layout-toast-width</code> wide.</li>
<li>Admin console: <code>.toast-region--admin</code> drops the tab-bar offset.</li>
<li>Toasts never cover the composer or a dialog footer's primary action; the region sits below dialogs in z-order (<code>--z-toast</code> is above content, below modal overlays).</li>
</ul>""",
    "theming": """<p>The toast reads its own tier of tokens, <code>--color-toast-*</code>, so it can stay a dark, high-contrast surface in the light theme and still separate from the dark theme's page. In dark it lifts to a lighter stone so it reads against <code>--color-bg-canvas</code>. Danger uses <code>--color-toast-danger-bg</code> with white text and <code>--color-toast-danger-muted</code> for detail.</p>
<pre><code>/* Re-skin: override the toast tier, never the .toast rules */
[data-theme="dark"] { --color-toast-bg: var(--color-bg-raised); }</code></pre>""",
    "accessibility": {
        "pattern": '<p>Toasts render inside one <code>&lt;section class="toast-region" aria-label="Notifications"&gt;</code> that exists from page load. Info, success and warning toasts go into its <code>role="status" aria-live="polite"</code> container; a danger toast is a sibling with <code>role="alert"</code> so the failure is announced at once. Adding the region with the toast would not be announced, so it is always present and empty.</p>',
        "keys": [
            (kbd("Tab"), "Reaches the action and then Dismiss in DOM order; the toast never takes focus on its own."),
            (kbd("Enter"), "Activates the action or Dismiss."),
            (kbd("Esc"), "With focus inside a toast, dismisses it."),
        ],
        "focus": "<p>Focus is not moved to a toast. Inside it, the ring is <code>--color-toast-accent</code> (white on danger), which keeps 3:1 against the dark surface. When a focused toast leaves, focus returns to the control that triggered it.</p>",
        "labelling": "<p>The title is written to stand alone, because screen readers announce the whole toast text once. Dismiss carries <code>aria-label=\"Dismiss\"</code>; the icon is decorative. An undo toast states the deadline in words (\"in 10 minutes\").</p>",
        "pairs": [
            ("Title on toast", "--color-toast-fg", "--color-toast-bg", 4.5),
            ("Detail on toast", "--color-toast-muted", "--color-toast-bg", 4.5),
            ("Action on toast", "--color-toast-accent", "--color-toast-bg", 4.5),
            ("Warning icon on toast", "--color-toast-warning", "--color-toast-bg", 3),
            ("Title on danger toast", "--color-fg-on-accent", "--color-toast-danger-bg", 4.5),
            ("Detail on danger toast", "--color-toast-danger-muted", "--color-toast-danger-bg", 4.5),
        ],
        "motion": "<p>Enter animation only (<code>--duration-base</code>, <code>--ease-enter</code>), switched off under <code>prefers-reduced-motion</code>. Auto-dismiss timing is long enough to read twice and pauses on hover and focus (WCAG 2.2.1).</p>",
        "touch": "<p>Dismiss is a 36px icon button that extends to 44 × 44px on coarse pointers. The action is a text link with at least 24px height and the toast's padding around it.</p>",
    },
    "content": """<ul>
<li>Title: what happened, past tense, plain: "You're registered", "Draft saved", "Kevin Brooks suspended".</li>
<li>Failures say what wasn't done and that nothing is lost: "We couldn't register you. Your spot isn't saved yet."</li>
<li>Detail adds what happens next, not a repeat of the title.</li>
<li>One action at most, a verb: "Open chat", "Undo", "Try again", "View in the app".</li>
<li>No exclamation marks; no "Success!" or "Error".</li>
</ul>""",
    "dodont": [
        ("do", SUCCESS, "Say what happened and offer the next step (registration on event detail)."),
        ("dont", toast("success", "Success!", "Your request was processed."), "Generic copy tells the person nothing; name the event and the result."),
        ("do", DANGER, "A failure stays until dismissed and offers a retry."),
        ("dont", toast("danger", "Error 503", "Service unavailable."), "Codes and jargon; say what wasn't done and what to try."),
    ],
    "tokens": [
        ("Surface / text", "--color-toast-bg / --color-toast-fg", "color"),
        ("Detail text", "--color-toast-muted", "color"),
        ("Icon and action / warning icon", "--color-toast-accent / --color-toast-warning", "color"),
        ("Danger surface / detail", "--color-toast-danger-bg / --color-toast-danger-muted", "color"),
        ("Dismiss hover", "--color-toast-close-hover", "color"),
        ("Radius", "--radius-lg", "value"),
        ("Shadow", "--shadow-3", "value"),
        ("Padding / gap", "--space-3-5 / --space-3 / --space-4", "value"),
        ("Region width / z-index", "--layout-toast-width / --z-toast", "value"),
        ("Enter", "--duration-base / --ease-enter", "value"),
    ],
    "code": {
        "snippet": '''<section class="toast-region" aria-label="Notifications">
  <div role="status" aria-live="polite">
    <div class="toast toast--success">
      <svg class="icon" aria-hidden="true">…</svg>
      <div class="toast__body">
        <p class="toast__title">You're registered</p>
        <p class="toast__text">We've added you to the Saturday Park Bootcamp group chat.</p>
        <a class="toast__action" href="/messages">Open chat</a>
      </div>
      <button class="icon-button icon-button--sm toast__close" type="button" aria-label="Dismiss">…</button>
    </div>
  </div>
  <!-- danger toasts: a sibling <div class="toast toast--danger" role="alert"> -->
</section>''',
        "classes": [
            ("<code>.toast-region</code> <code>.toast-region--admin</code>", "Fixed region at the bottom; admin variant has no tab-bar offset."),
            ("<code>.toast</code>", "The dark notice surface."),
            ("<code>.toast--info</code> <code>.toast--success</code> <code>.toast--warning</code> <code>.toast--danger</code>", "Tone; warning recolours the icon, danger the surface."),
            ("<code>.toast__body</code> <code>.toast__title</code> <code>.toast__text</code> <code>.toast__action</code>", "Content parts."),
            ("<code>.toast__close</code>", "Dismiss, with <code>.icon-button.icon-button--sm</code>."),
            ('<code>role="status"</code> · <code>role="alert"</code>', "Polite container in the region; assertive for danger only."),
        ],
    },
    "sources": {
        "mocks": [
            mock("notifications/toast/info", "calendar"),
            mock("notifications/toast/success", "registered, Open chat"),
            mock("notifications/toast/warning", "forecast"),
            mock("notifications/toast/danger", "registration failed, role alert"),
            mock("notifications/toast/with-action", "undo"),
            mock("notifications/toast/stacked", "three toasts"),
            mock("notifications/admin-toast/stacked", "admin offset"),
        ],
        "drift": "Danger detail text and the dismiss hover used raw <code>rgb()</code> values; they are now <code>--color-toast-danger-muted</code> and <code>--color-toast-close-hover</code>. The shadow was the old level 4; toasts now use <code>--shadow-3</code>. The radius was the old <code>2xl</code>, now <code>--radius-lg</code>.",
    },
}
