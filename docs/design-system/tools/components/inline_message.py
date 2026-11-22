from dslib import cf_ui, ex, icon, kbd, matrix, mock, themes

field = cf_ui.field


def inline_error(title, text, retry=True):
    b = '<button class="btn btn--link" type="button">Try again</button>' if retry else ""
    return (f'<div class="inline-error">{icon("alert-circle")}<div class="inline-error__body">'
            f'<p class="inline-error__title">{title}</p><p>{text}</p>{b}</div></div>')


HINT = field("Email", "im-email", "grace.thompson@gmail.com", type_="email", hint="We'll send event reminders here. Never shared.")
ERROR = field("Email", "im-email-bad", "grace.thompson@", type_="email", error="Enter an email address, like name@example.com")
SECTION = inline_error("Messages didn't load.", "Your events are up to date.")

SPEC = {
    "lead": "Inline messages sit right where the problem or help is: under a field, or in place of one section that didn't load.",
    "meta": ["Status: stable", "<code>.field__hint</code> · <code>.field__error</code> · <code>.inline-error</code>"],
    "overview": """<p>Three small messages that live inside the content rather than above it:</p>
<ul>
<li><b>Field hint</b> (<code>.field__hint</code>): help that prevents an error ("We'll send event reminders here. Never shared.").</li>
<li><b>Field error</b> (<code>.field__error</code>): what is wrong with this field and how to fix it. It replaces the hint while shown.</li>
<li><b>Section error</b> (<code>.inline-error</code>): one part of a page failed while the rest worked ("Messages didn't load. Your events are up to date.") with an in-place "Try again".</li>
</ul>
<p>When the whole page fails use the <a href="empty-state.html">error state block</a>; when a whole form submit fails use an <a href="alert.html">alert</a>.</p>""",
    "anatomy": {
        "figure": SECTION,
        "callouts": [(6, 30), (40, 28), (40, 52), (22, 78)],
        "parts": [
            ("Icon", "16px alert icon, <code>aria-hidden</code>."),
            ("Title", "<code>.inline-error__title</code>: what didn't load."),
            ("Reassurance", "What still works."),
            ("Retry", "A link-style button that reloads only this section."),
        ],
    },
    "variants": "<h3>Field hint and field error</h3>" + ex(HINT + ERROR,
        "The hint and error share one slot under the control, linked with <code>aria-describedby</code>; the invalid input sets <code>aria-invalid=\"true\"</code>.", True, mod="stack")
    + "<h3>Section error</h3>" + ex(SECTION + inline_error("Upcoming events didn't load.", "The queue above is up to date."),
        "Member home (messages) and admin dashboard (upcoming events).", True, mod="stack"),
    "sizes": "<p>Field messages are 14px (<code>--font-size-sm</code>), 6px below the control. The section error is 14px with 16px padding and fills its section.</p>",
    "states": {
        "intro": "<p>A field moves between three states: hint, error and valid (hint again). Errors appear on blur or submit, never on each keystroke, and clear as soon as the value is valid.</p>",
        "matrix": matrix([("Hint", "hint"), ("Error", "error")], [
            ("Email", "{a}"),
        ]).replace("<td>hint</td>", "<td>" + field("Email", "im-m1", type_="email", hint="We'll send reminders here.") + "</td>")
          .replace("<td>error</td>", "<td>" + field("Email", "im-m2", "grace@", type_="email", error="Enter a full email address") + "</td>"),
        "themes": themes('<div class="field"><input class="input" type="text" aria-label="Name" aria-invalid="true"><span class="field__error">Enter your name</span></div>' + SECTION, mod="stack"),
        "notes": """<ul>
<li>The section error's retry turns busy (spinner + "Loading…") while the section reloads, then the section returns or the error stays.</li>
<li>The error colour is never the only cue: the message text and the icon (section) say it.</li>
</ul>""",
    },
    "responsive": "<p>Messages wrap under their field at any width. The section error stacks icon and body in a row and the retry wraps under the text on phones.</p>",
    "theming": "<p>Hint uses <code>--color-fg-muted</code>; field error and section error use <code>--color-danger-fg</code>, the section on <code>--color-danger-bg</code>. Both have dark values; no rule changes.</p>",
    "accessibility": {
        "pattern": '<p>Field messages are linked with <code>aria-describedby</code>; the invalid input sets <code>aria-invalid="true"</code>. On submit, focus goes to the <a href="alert.html">error summary</a>, not to each message. A section error inserted after load uses <code>role="alert"</code> once; examples here omit it.</p>',
        "keys": [(kbd("Tab"), "Reaches the field, then the section's Try again."), (kbd("Enter"), "Activates Try again.")],
        "focus": "<p>The input shows its focus ring; an invalid input keeps a danger border while focused. Try again shows the shared ring.</p>",
        "labelling": "<p>The label names the field; the hint or error is its description. The error starts with the fix (\"Enter…\", \"Use…\").</p>",
        "pairs": [
            ("Hint text", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Field error text", "--color-danger-fg", "--color-bg-surface", 4.5),
            ("Section error text", "--color-danger-fg", "--color-danger-bg", 4.5),
        ],
        "motion": "<p>No motion.</p>",
        "touch": "<p>Try again is a text button padded to at least 24px height; on coarse pointers it extends to 44px.</p>",
    },
    "content": """<ul>
<li>Errors say how to fix, not what's wrong: "Enter an email address, like name@example.com", not "Invalid email".</li>
<li>Hints are one sentence and explain why ("Never shared").</li>
<li>Section errors name the section and reassure about the rest: "Messages didn't load. Your events are up to date."</li>
</ul>""",
    "dodont": [
        ("do", field("Email", "im-d1", "grace@", type_="email", error="Enter an email address, like name@example.com"), "Say how to fix it."),
        ("dont", field("Email", "im-d2", "grace@", type_="email", error="Invalid input"), "Says it's wrong but not what to do."),
        ("do", inline_error("Messages didn't load.", "Your events are up to date."), "Fail one section; keep the rest of home."),
        ("dont", inline_error("Error", "Something went wrong.", retry=False), "No section name, no retry: a dead end."),
    ],
    "tokens": [
        ("Hint text", "--color-fg-muted", "color"),
        ("Error text", "--color-danger-fg", "color"),
        ("Section background", "--color-danger-bg", "color"),
        ("Size", "--font-size-sm", "value"),
        ("Gap under control", "--space-1-5", "value"),
        ("Section radius / padding", "--radius-lg / --space-4", "value"),
    ],
    "code": {
        "snippet": '''<div class="field">
  <label class="field__label" for="f-email">Email</label>
  <input class="input" id="f-email" type="email" aria-invalid="true" aria-describedby="f-email-error">
  <span class="field__error" id="f-email-error">Enter an email address, like name@example.com</span>
</div>

<div class="inline-error" role="alert">
  <svg class="icon" aria-hidden="true">…</svg>
  <div class="inline-error__body">
    <p class="inline-error__title">Messages didn't load.</p>
    <p>Your events are up to date.</p>
    <button class="btn btn--link" type="button">Try again</button>
  </div>
</div>''',
        "classes": [
            ("<code>.field__hint</code> <code>.field__error</code>", "Help and error under a control."),
            ('<code>aria-invalid="true"</code> <code>aria-describedby</code>', "Invalid state and the link to its message."),
            ("<code>.inline-error</code> <code>.inline-error__body</code> <code>.inline-error__title</code>", "Section-level failure with retry."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/join/invalid", "field errors"),
            mock("pages/join/default", "field hints"),
            mock("pages/home/partial", "messages didn't load"),
            mock("pages/admin-dashboard/partial", "upcoming events didn't load"),
        ],
        "drift": "The section error radius was the old <code>2xl</code>, now <code>--radius-lg</code>. Otherwise none.",
    },
}
