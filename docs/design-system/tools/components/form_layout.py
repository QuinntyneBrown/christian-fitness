from dslib import cf_ui, ex, icon, kbd, mock

F = cf_ui.field
SPIN = icon("loader", "icon--spin")

SUMMARY = cf_ui.error_summary("2 things to fix before publishing",
                              [("Give the event a title members will recognize", "f-title-s"),
                               ("Pick a date after today, April 15", "f-date-s")], aid="es-v")

STACK = (F("Email", "email-st", autocomplete="email") +
         F("Password", "pw-st", type_="password", hint="At least 8 characters", autocomplete="new-password"))

GRID = ('<div class="field-grid">' + F("Date", "date-g", type_="date") + F("Start time", "time-g", type_="time")
        + F("Capacity", "cap-g", type_="number") + F("Price", "price-g", optional=True, hint="Leave blank for free") + '</div>')

KINDS = "".join(f'<label class="chip chip--choice"><input class="chip__input" type="radio" name="kind-{{n}}" value="{k}"{" checked" if i == 0 else ""}>{k}</label>'
                for i, k in enumerate(["Organization", "Person", "Instructor", "Company"]))
STEPS = ('<ol class="steps"><li class="steps__item"><span class="steps__n" aria-hidden="true">1</span><div><p class="steps__title">We read it within 3 days</p>'
         '<p class="steps__text">A real person on our team, not a filter.</p></div></li><li class="steps__item"><span class="steps__n" aria-hidden="true">2</span>'
         '<div><p class="steps__title">We run four checks</p><p class="steps__text">Credentials, insurance where it applies, two references, and a conversation about faith and practice.</p></div></li></ol>')


def form_page(n="v", flush=False):
    return (f'<div class="form-page{" form-page--flush" if flush else ""}"><form class="form-page__main" novalidate>'
            '<p class="display page-title">Suggest a listing</p>'
            '<p class="form-page__lead">Know a church ministry, club, coach or business that belongs here? Tell us about them and we’ll do the checking.</p>'
            f'<fieldset class="form-section"><legend class="form-section__legend">What kind of listing?</legend><div class="cluster form-section__body">{KINDS.replace("{n}", n)}</div></fieldset>'
            f'<div class="form-section stack-5">{F("Their name", "name-" + n, "Eastside Ladies Who Lift")}</div>'
            '<div class="form-page__foot"><button class="btn btn--primary btn--md" type="submit">Send suggestion</button><p class="form-page__as">Sent as Grace Thompson</p></div></form>'
            f'<aside class="form-page__aside form-page__aside--low" aria-label="What happens next"><p class="display section-title">What happens next</p>{STEPS}'
            '<p class="form-page__more"><a class="text-link" href="#">How we vet every listing</a></p></aside></div>')


TIGHT = (
         '<div class="form-section form-section--tight">' + F("What would make this better?", "text-t", hint="For example: show which week of the plan each session is") + "</div>"
         '<label class="check check--ui form-section form-section--tight"><input class="check__box" type="checkbox" name="reply" checked> You can email me at grace.thompson@gmail.com about this</label>')
STACK4 = '<div class="stack-4">' + F("Section", "section-s4", "Nutrition") + F("Byline", "byline-s4", "Priya Raman") + "</div>"

SPEC = {
    "lead": "Form layout arranges fields into one calm column, pairs short related fields, and puts the error summary and the submit where people expect them.",
    "meta": ["Status: stable", "<code>.field-grid</code>, <code>.form-alert</code>"],
    "overview": """<p>Forms are one column of <a href="form-field.html">form fields</a>, top to bottom, with the primary <a href="button.html">button</a> last. Short related fields (date and time, capacity and price) may pair in a <code>.field-grid</code> from 640px. After a failed submit an error summary appears at the top and takes focus. See the <a href="../patterns/forms.html">forms pattern</a> for validation timing.</p>
<ul>
<li><b>Stack</b>: auth screens (join, sign in, password).</li>
<li><b>Two-column grid</b>: editor dialogs.</li>
<li><b>Error summary</b> (<code>.form-alert</code> with <code>.form-alert__list</code>): links to each invalid field.</li>
<li><b>Form alert</b>: a single problem that is not a field's fault ("Sign-in paused for 15 minutes").</li>
<li><b>Form page</b> (<code>.form-page</code>): a full-page member form with an aside: Suggest a listing (\"What happens next\", <a href="steps.html">steps</a>) and Send feedback (\"You said, we did\"). Title, lead (<code>__lead</code>), <b>form sections</b> (<code>.form-section</code>, a <code>&lt;fieldset&gt;</code> with a <code>__legend</code> or a plain group), and a foot (<code>__foot</code>) with the submit and who it is sent as (<code>__as</code>). <code>--flush</code> drops the top margin when there is no back link above (feedback).</li>
<li><b>Stack 4</b> (<code>.stack-4</code>): 16px between children, for fields in a side panel (story editor).</li>
</ul>""",
    "anatomy": {
        "figure": SUMMARY.replace('id="es-v', 'id="es-anat') + STACK.replace("-st", "-an"),
        "callouts": [(10, 15), (40, 55), (40, 85)],
        "parts": [
            ("Error summary", "Top of the form; <code>role=\"alert\"</code>, <code>tabindex=\"-1\"</code>, focused after submit; links jump to fields."),
            ("Field stack", "Fields separated by <code>--space-4</code> to <code>--space-5</code>."),
            ("Submit", "Primary button last; block and large on auth screens."),
        ],
    },
    "variants": ex(STACK + '<button class="btn btn--primary btn--lg btn--block" type="submit">Create account</button>',
                   "Stack (join).", True, mod="stack")
    + ex(GRID, "Two-column grid (event editor); stacks under 640px.", True, mod="stack")
    + ex(SUMMARY + F("Title", "title-s", error="Give the event a title members will recognize")
         + F("Date", "date-s", type_="date", error="Pick a date after today, April 15"),
         "Error summary linking to its fields.", True, mod="stack")
    + "<h3>Form page</h3>"
    + ex(form_page(), "Form and aside; the aside drops to line up with the first field from 1024px (<code>.form-page__aside--low</code>) (suggest-listing/default).", True, mod="block")
    + ex(TIGHT, "<code>.form-section--tight</code>: 24px instead of 32px between the note and the reply box (feedback/default).", True, mod="block")
    + ex(STACK4, "<code>.stack-4</code>: 16px between fields in a panel (admin-story-editor/default).", True, mod="block")
    + ex(cf_ui.form_alert("Sign-in paused for 15 minutes", "Too many attempts, so we paused sign-in to keep your account safe."),
         "Form alert for a non-field problem.", True, mod="stack"),
    "sizes": "<p>Forms are at most about 28rem wide on auth screens and fill the dialog body in editors; a form page's form column is at most 40rem from 1024px. Do not stretch single inputs across a wide page.</p>",
    "states": {
        "intro": "<p>A form moves through default, invalid, submitting, failed and success.</p>",
        "matrix": """<div class="ds-matrix"><table><thead><tr><th scope="col">State</th><th scope="col">What changes</th></tr></thead><tbody>
<tr><th scope="row">Default</th><td>Fields empty or prefilled; primary enabled.</td></tr>
<tr><th scope="row">Invalid</th><td>Error summary at top, focused; each field shows its error and <code>aria-invalid</code>.</td></tr>
<tr><th scope="row">Submitting (busy)</th><td>Fields <code>readonly</code>; primary <code>aria-busy="true"</code> with spinner and "…ing" label.</td></tr>
<tr><th scope="row">Failed</th><td>Fields editable again; a form alert says what went wrong and how to retry; values kept.</td></tr>
<tr><th scope="row">Success</th><td>Success alert (<code>.form-alert--success</code>) or navigation onward.</td></tr>
<tr><th scope="row">Hover, focus, active, disabled</th><td>Belong to the controls inside; see their pages.</td></tr>
</tbody></table></div>""" + "<h3>Submitting</h3>" + ex(
            F("Email", "email-busy", "grace.thompson@gmail.com", readonly=True)
            + f'<button class="btn btn--primary btn--lg btn--block" type="submit" aria-busy="true">{SPIN}Signing in…</button>',
            "Fields read-only, button busy.", True, mod="stack"),
        "themes": '<div class="ds-themes"><div data-theme="light"><div class="ds-example__canvas ds-flush">'
                  + cf_ui.form_alert("Check your email", "We sent a reset link.", kind="success", ic="circle-check", role="status")
                  + '</div></div><div data-theme="dark"><div class="ds-example__canvas ds-flush">'
                  + cf_ui.form_alert("Check your email", "We sent a reset link.", kind="success", ic="circle-check", role="status")
                  + '</div></div></div>',
        "notes": "<ul><li>Never clear what people typed after a failure.</li><li>The summary count matches the number of field errors: \"2 things to fix before publishing\".</li></ul>",
    },
    "responsive": "<ul><li><code>.field-grid</code> is one column below 640px (<code>--layout-breakpoint-sm</code>) and two from there.</li><li>Dialog forms become bottom sheets on phones; the footer stays visible.</li><li><code>.form-page</code> is one column (form, then aside, 48px apart) below 1024px; from 1024px the form takes up to 40rem and the aside the rest, 64px apart, and <code>__aside--low</code> pads the aside 80px down to meet the first field.</li><li>The foot wraps \"Sent as Grace Thompson\" under the button on narrow phones.</li><li>Order fields so the single-column reading order makes sense when the grid collapses.</li></ul>",
    "theming": "<p>The error summary reads <code>--color-danger-bg</code> and <code>--color-danger-fg</code>; info and success alerts use the info and accent tints. All switch with the theme.</p>",
    "accessibility": {
        "pattern": "<p>A <code>&lt;form&gt;</code> with native submit. On failed submit, focus the summary (<code>role=\"alert\"</code>, <code>tabindex=\"-1\"</code>, <code>aria-labelledby</code> its title); each link targets a field id (WCAG 3.3.1, 3.3.3).</p>",
        "keys": [
            (kbd("Enter"), "Submits from any single-line field."),
            (kbd("Tab"), "From the summary, moves through the error links, then the fields."),
            (kbd("Enter") + " on a summary link", "Moves focus to that field."),
        ],
        "focus": "<p>The summary shows the shared focus ring when focused; links inside it are underlined.</p>",
        "labelling": "<p>The summary is labelled by its title. Success alerts use <code>role=\"status\"</code> rather than alert.</p>",
        "pairs": [
            ("Summary text", "--color-danger-fg", "--color-danger-bg", 4.5),
            ("Info alert text", "--color-info-fg", "--color-info-bg", 4.5),
            ("Success alert text", "--color-fg-accent", "--color-accent-subtle", 4.5),
            ("Form page lead, sent as", "--color-fg-muted", "--color-bg-canvas", 4.5),
        ],
        "motion": "<p>No animation; focus moves to the summary instantly.</p>",
        "touch": "<p>Summary links are full-line targets; fields are spaced at least 16px apart.</p>",
    },
    "content": "<ul><li>Summary titles count and name the goal: \"1 thing to fix before listing\".</li><li>Summary items repeat the field errors word for word.</li><li>Form alerts say what happened and what to do next, with a link when there is one.</li><li>Form page legends are questions: \"Who are you suggesting?\", \"What kind of listing?\", \"What's it about?\". The foot says who it is from: \"Sent as Grace Thompson\".</li></ul>",
    "dodont": [
        ("do", SUMMARY.replace('id="es-v', 'id="es-dd'), "Summary links take people straight to each problem."),
        ("dont", '<div class="form-alert" role="alert"><p class="form-alert__title">Form contains errors</p></div>', "A vague banner with no links makes people hunt."),
        ("do", '<div class="field-grid">' + F("Date", "date-dd", type_="date") + F("Start time", "time-dd", type_="time") + '</div>', "Pair only short, related fields."),
        ("do", '<fieldset class="form-section"><legend class="form-section__legend">What kind of listing?</legend><div class="cluster form-section__body">' + KINDS.replace("{n}", "dd") + "</div></fieldset>",
         "A group of choices is a fieldset whose legend asks the question."),
        ("dont", '<div class="form-section"><p class="form-section__legend">What kind of listing?</p><div class="cluster form-section__body">' + KINDS.replace("{n}", "dd2") + "</div></div>",
         "A paragraph styled as a legend: the radios lose their question for screen readers."),
        ("dont", '<div class="field-grid">' + F("Title", "title-dd") + F("Email", "email-dd", type_="email") + '</div>', "Unrelated fields side by side break the reading order."),
    ],
    "tokens": [
        ("Summary background / text", "--color-danger-bg / --color-danger-fg", "color"),
        ("Info background / text", "--color-info-bg / --color-info-fg", "color"),
        ("Success background / text", "--color-accent-subtle / --color-fg-accent", "color"),
        ("Grid gap", "--space-4", "value"),
        ("Alert padding / radius", "--space-4 / --radius-lg", "value"),
        ("Alert icon", "--size-icon-lg", "value"),
        ("Grid breakpoint", "--layout-breakpoint-sm", "value"),
        ("Form page gap / from 1024px", "--space-12 / --space-16", "value"),
        ("Section spacing / tight", "--space-8 / --space-6", "value"),
        ("Foot rule", "--color-border-default", "color"),
        ("Lead, sent as", "--color-fg-muted", "color"),
        ("Lead size / width", "--font-size-lg / --layout-lead-max", "value"),
        ("Aside drop", "--space-20", "value"),
        ("Stack 4", "--space-4", "value"),
    ],
    "code": {
        "snippet": '''<form novalidate>
  <div class="form-alert" id="error-summary" role="alert" tabindex="-1" aria-labelledby="error-summary-title">
    <svg class="icon" aria-hidden="true">…</svg>
    <div><p class="form-alert__title" id="error-summary-title">2 things to fix before publishing</p>
      <ul class="form-alert__list"><li><a href="#f-title">Give the event a title members will recognize</a></li></ul></div>
  </div>
  <div class="field-grid">
    <div class="field">…date…</div>
    <div class="field">…start time…</div>
  </div>
  <button class="btn btn--primary btn--md" type="submit">Publish</button>
</form>''',
        "classes": [
            ("<code>.field-grid</code>", "One column, two from 640px."),
            ("<code>.form-alert</code> <code>.form-alert__title</code> <code>.form-alert__list</code>", "Error summary or form alert."),
            ("<code>.form-alert--info</code> <code>.form-alert--success</code>", "Info and success alerts."),
            ("<code>readonly</code> on fields · <code>aria-busy</code> on submit", "Submitting."),
            ("<code>.form-page</code> <code>--flush</code> <code>__lead</code> <code>__aside--low</code> <code>__foot</code> <code>__as</code> <code>__more</code>", "Full-page form with an aside."),
            ("<code>.form-section</code> <code>--tight</code> <code>__legend</code> <code>__body</code>", "A titled group of fields; 32px (tight: 24px) above."),
            ("<code>.stack-4</code>", "16px between children."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/join/default", "stack"),
            mock("pages/sign-in/error", "form alert"),
            mock("pages/sign-in/submitting", "read-only fields, busy submit"),
            mock("dialogs/event-editor/invalid", "error summary"),
            mock("dialogs/edit-profile/default", "two-column grid"),
            mock("pages/forgot-password/success", "success alert"),
            mock("pages/suggest-listing/default", "form page, sections, aside low"),
            mock("pages/suggest-listing/invalid", "invalid name"),
            mock("pages/suggest-listing/submitting", "busy"),
            mock("pages/feedback/default", "flush form page, tight sections"),
            mock("pages/feedback/error", "send failed"),
            mock("pages/admin-story-editor/default", "stack-4 panel"),
        ],
        "drift": "The form page mocks use <code>.form-page__main</code> and <code>.form-page__aside</code> as names only; components.css styles neither (only <code>.form-page__aside--low</code>), so they are hooks for the app, not styles. A <code>.form-page__aside--low</code> modifier without its base class is unusual BEM; proposed: style or drop the base class.",
    },
}
