from dslib import cf_ui, ex, icon, kbd, matrix, mock, themes

ICON = {"": "alert-circle", "info": "info", "success": "circle-check"}


def alert(title, text, kind="", ic=None, extra=""):
    k = f" form-alert--{kind}" if kind else ""
    return (f'<div class="form-alert{k}"{extra}>{icon(ic or ICON[kind])}'
            f'<div><p class="form-alert__title">{title}</p><p>{text}</p></div></div>')


DANGER = alert("Your request didn't send", "Nothing was lost. Check your connection and send it again.")
INFO = alert("Check your inbox", "If an account uses that email, we've sent a link to reset your password.", "info", "mail")
SUCCESS = alert("Password updated", "Sign in with your new password.", "success")
def summary(i):
    return ('<div class="form-alert" tabindex="-1" aria-labelledby="sum-title-%s">' % i + icon("alert-circle")
           + '<div><p class="form-alert__title" id="sum-title-%s">' % i + 'Fix 2 things to create your profile</p>'
           '<ul class="form-alert__list"><li><a href="#f-alert-email">Enter an email address, like name@example.com</a></li>'
           '<li><a href="#f-alert-pw">Use at least 8 characters for your password</a></li></ul></div></div>')


SUMMARY = summary(1)

SPEC = {
    "lead": "An alert explains, in place, why a form or page couldn't do what was asked, and what to do next.",
    "meta": ["Status: stable", "<code>.form-alert</code>", "Focus moves to it on submit"],
    "overview": """<p>Use an alert at the top of a form, dialog or drawer when a submit fails as a whole ("Your request didn't send", "Sign-in paused for 15 minutes") or when several fields need fixing (the <b>error summary</b>). It stays until the person acts again.</p>
<ul>
<li><b>Danger</b> (default): the submit failed. Nothing typed is lost; the alert says so.</li>
<li><b>Info</b>: a neutral outcome that needs reading ("Check your inbox").</li>
<li><b>Success</b>: the form worked and the person stays on the page ("Password updated").</li>
<li><b>Error summary</b>: a danger alert listing each invalid field as a link to it.</li>
</ul>
<p>Use an <a href="inline-message.html">inline message</a> for one field or one section, a <a href="toast.html">toast</a> for the result of an action outside a form, and a <a href="banner.html">banner</a> for a page-wide condition.</p>""",
    "anatomy": {
        "figure": summary(0),
        "callouts": [(5, 25), (30, 22), (40, 62)],
        "parts": [
            ("Icon", "20px tone icon, <code>aria-hidden</code>."),
            ("Title", "<code>.form-alert__title</code>, 16px semibold: what went wrong, in a sentence."),
            ("Body or list", "A sentence of next steps, or <code>.form-alert__list</code> of links to each invalid field."),
        ],
    },
    "variants": ex(DANGER + INFO + SUCCESS, "Danger (default), info and success.", True, mod="stack")
    + "<h3>Error summary</h3>"
    + ex(SUMMARY + cf_ui.field("Email", "alert-email", "grace.thompson@", type_="email", error="Enter an email address, like name@example.com")
         + cf_ui.field("Password", "alert-pw", type_="password", error="Use at least 8 characters for your password"), "Each link moves focus to its field; the field shows the same message under it.", True, mod="stack"),
    "sizes": "<p>One size: 16px padding, 14px body, 16px title. It fills the width of the form it belongs to.</p>",
    "states": {
        "intro": "<p>An alert is static once shown. Its states are the tone, whether it holds focus (after a submit) and whether its links are hovered or focused. Focus is forced here with <code>data-state</code>. Examples carry no live role to keep this page quiet; see Accessibility for the real role.</p>",
        "matrix": matrix([("Resting", ""), ("Focused (after submit)", ' tabindex="-1" data-state="focus"')], [
            ("Danger", f'<div class="form-alert"{{a}}>{icon("alert-circle")}<div><p class="form-alert__title">Couldn\'t publish</p><p>Your changes are still here.</p></div></div>'),
            ("Info", f'<div class="form-alert form-alert--info"{{a}}>{icon("info")}<div><p class="form-alert__title">Check your inbox</p><p>We sent a link.</p></div></div>'),
            ("Success", f'<div class="form-alert form-alert--success"{{a}}>{icon("circle-check")}<div><p class="form-alert__title">Password updated</p><p>Sign in again.</p></div></div>'),
        ]),
        "themes": themes(DANGER + INFO, mod="stack"),
        "notes": """<ul>
<li>On a failed submit the alert is inserted (or updated) and receives focus via <code>tabindex="-1"</code>, so keyboard and screen-reader users start at the explanation.</li>
<li>The form keeps every value; the submit button returns from busy to enabled.</li>
<li>When the person fixes everything and submits again, the alert is removed.</li>
</ul>""",
    },
    "responsive": "<p>The alert spans the form at every width. On phones the icon stays top-aligned with the title and the text wraps beside it. Inside a bottom-sheet dialog it sits above the fields, never in the sticky footer.</p>",
    "theming": "<p>Danger reads <code>--color-danger-bg</code> and <code>--color-danger-fg</code>; info reads the info pair; success uses the brand's accent pair (<code>--color-accent-subtle</code> and <code>--color-fg-accent</code>), so a successful form feels like Christian Fitness rather than a generic green. In dark each pair switches to its dark value; no rule changes.</p>",
    "accessibility": {
        "pattern": '<p>A failed submit inserts the alert with <code>role="alert"</code> and moves focus to it (<code>tabindex="-1"</code>). The error summary is labelled by its title (<code>aria-labelledby</code>) and lists links to field ids, following the GOV.UK error summary pattern. Info and success outcomes use <code>role="status"</code>.</p>',
        "keys": [
            (kbd("Tab"), "From the focused alert, moves to the first link in the summary, then on to the form."),
            (kbd("Enter"), "On a summary link, moves focus to that field."),
        ],
        "focus": "<p>The focused alert shows the shared 2px ring at <code>--focus-ring-offset</code>. Summary links show the ring like any link.</p>",
        "labelling": "<p>The title is the alert's name and says what failed. Each invalid field keeps its own <code>.field__error</code> linked by <code>aria-describedby</code>, so the summary and the field agree word for word.</p>",
        "pairs": [
            ("Danger text", "--color-danger-fg", "--color-danger-bg", 4.5),
            ("Info text", "--color-info-fg", "--color-info-bg", 4.5),
            ("Success text", "--color-fg-accent", "--color-accent-subtle", 4.5),
        ],
        "motion": "<p>No motion. The alert appears in place; focus moving to it is the cue.</p>",
        "touch": "<p>Summary links are full-line text targets with 4px between rows; inline links inside an alert are underlined and semibold.</p>",
    },
    "content": """<ul>
<li>Title says what didn't happen: "Your request didn't send", "We couldn't save your changes".</li>
<li>Body reassures, then directs: "Nothing was lost. Check your connection and try again."</li>
<li>Summary title counts and frames: "Fix 2 things to create your profile". Each item is the field's own error.</li>
<li>Blame the system, never the person: "Too many attempts, so we paused sign-in to keep your account safe."</li>
</ul>""",
    "dodont": [
        ("do", DANGER, "Say nothing was lost and what to do (request-booking dialog)."),
        ("dont", alert("Error", "An error occurred."), "A title that names nothing; the person can't act on it."),
        ("do", summary(2), "List each problem as a link to its field."),
        ("dont", alert("Please correct the errors below", "Some fields are invalid."), "Vague summary: name each field and its fix."),
    ],
    "tokens": [
        ("Danger background / text", "--color-danger-bg / --color-danger-fg", "color"),
        ("Info background / text", "--color-info-bg / --color-info-fg", "color"),
        ("Success background / text", "--color-accent-subtle / --color-fg-accent", "color"),
        ("Radius", "--radius-lg", "value"),
        ("Padding / gap", "--space-4 / --space-3", "value"),
        ("Title / body size", "--font-size-md / --font-size-sm", "value"),
        ("Icon", "--size-icon-lg", "value"),
    ],
    "code": {
        "snippet": '''<div class="form-alert" id="error-summary" role="alert" tabindex="-1" aria-labelledby="error-summary-title">
  <svg class="icon" aria-hidden="true">…</svg>
  <div>
    <p class="form-alert__title" id="error-summary-title">Fix 2 things to create your profile</p>
    <ul class="form-alert__list">
      <li><a href="#f-email">Enter an email address, like name@example.com</a></li>
      <li><a href="#f-password">Use at least 8 characters for your password</a></li>
    </ul>
  </div>
</div>''',
        "classes": [
            ("<code>.form-alert</code>", "Danger alert (default)."),
            ("<code>.form-alert--info</code> <code>.form-alert--success</code>", "Other tones."),
            ("<code>.form-alert__title</code> <code>.form-alert__list</code>", "Title and the summary's list of links."),
            ('<code>role="alert"</code> <code>tabindex="-1"</code>', "Announce and receive focus after a failed submit."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/sign-in/error", "sign-in paused"),
            mock("pages/join/invalid", "error summary"),
            mock("pages/join/error", "submit failed"),
            mock("dialogs/request-booking/failed", "request didn't send"),
        ],
        "drift": "The radius was the old <code>2xl</code>, now <code>--radius-lg</code>. Otherwise none.",
    },
}
