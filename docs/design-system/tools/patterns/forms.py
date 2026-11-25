from dslib import cf_ui, ex, icon, kbd, mock

F = cf_ui
SPIN = icon("loader", "icon--spin")

DEFAULT = (
    '<form class="stack" novalidate aria-labelledby="fx-title">'
    '<p class="display section-title" id="fx-title">Request a booking</p>'
    + F.select("What would you like?", "fx-kind", ["One-on-one session", "Small-group session", "Free 15-minute intro call"], "Free 15-minute intro call")
    + F.field("When works for you?", "fx-when", "Weekday evenings after 6", hint="Days and times, in your own words")
    + F.textarea("Message", "fx-msg", "", rows=3, optional=True)
    + '<div class="btn-row"><button class="btn btn--secondary btn--grow" type="button">Cancel</button>'
      '<button class="btn btn--primary btn--grow" type="submit">Send request</button></div></form>'
)

INVALID = (
    '<form class="stack" novalidate aria-label="Publish event, with errors">'
    + F.error_summary("2 things to fix before publishing",
                      [("Give the event a title", "f-fi-title"), ("Pick a date in the future", "f-fi-date")], aid="fi-summary")
    + F.field("Title", "fi-title", "", error="Give the event a title")
    + F.field("Date", "fi-date", "", type_="date", error="Pick a date in the future")
    + '</form>'
)

BUSY = (
    '<form class="stack" novalidate aria-label="Edit profile, saving">'
    + F.field("Full name", "fb-name", "Grace Thompson", autocomplete="name", readonly=True)
    + '<div class="btn-row"><button class="btn btn--secondary btn--grow" type="button" disabled>Cancel</button>'
      f'<button class="btn btn--primary btn--grow" type="submit" disabled aria-busy="true">{SPIN}Saving…</button></div></form>'
)

FAILED = F.form_alert("We couldn't save your changes", "Nothing was lost. Check your connection and try again.").replace('tabindex="-1"', 'tabindex="-1" id="ff-alert"')

SUCCESS = F.form_alert("Check your email", "We sent a reset link to grace.thompson@gmail.com. It works for 30 minutes.",
                       kind="success", ic="circle-check", role="status").replace('tabindex="-1"', 'tabindex="-1" id="fs-alert"')

FULL_PAGE = (
    '<div class="form-page form-page--flush" style="width: 100%;">'
    '<form class="form-page__main" novalidate aria-labelledby="fp-title">'
    '<p class="display page-title" id="fp-title">Send feedback</p>'
    '<p class="form-page__lead">Tell us what’s working, what isn’t, and what you wish was here.</p>'
    '<div class="form-section form-section--tight">'
    + F.textarea("What would make this better?", "fp-text", "", rows=4, hint="For example: show which week of the plan each session is")
    + '</div><label class="check check--ui form-section form-section--tight"><input class="check__box" type="checkbox" checked> You can email me at grace.thompson@gmail.com about this</label>'
    '<div class="form-page__foot"><button class="btn btn--primary btn--md" type="submit">Send feedback</button></div></form>'
    '<aside class="form-page__aside" aria-labelledby="fp-said"><p class="display section-title" id="fp-said">You said, we did</p>'
    '<p class="said__lead">Recent changes that started as member feedback.</p><ul class="list-ruled said">'
    '<li><p class="said__quote">“Can I join a whole series instead of every date?”</p><p class="said__did">Join a series in one tap</p><p class="said__when">February 2026</p></li>'
    '</ul></aside></div>'
)

DONE = (
    '<section class="done" role="status" tabindex="-1" aria-labelledby="fd-title">'
    f'<span class="done__icon">{icon("check", "icon--lg")}</span>'
    '<p class="display page-title done__title" id="fd-title">Thanks, Grace</p>'
    '<p class="done__text">We’ve got your suggestion for <strong>Eastside Ladies Who Lift</strong>. Our team will look into it this week, and we’ll message you here when it’s decided either way.</p>'
    '<div class="done__actions"><a class="btn btn--primary btn--md" href="#">Back to the directory</a><a class="btn btn--secondary btn--md" href="#">Suggest another</a></div></section>'
)

SPEC = {
    "slug": "forms",
    "lead": "Forms ask for as little as possible, say what's wrong in plain words, and never lose what someone typed.",
    "overview": """<p>Every form in Christian Fitness, from sign-in to the admin event editor, follows one shape: a single column of <a href="../components/form-field.html">form fields</a>, an error summary that appears at the top only after submit, and a footer whose primary button names the outcome ("Send request", "Publish", "Save").</p>
<ul>
<li><b>Ask less.</b> Optional fields say <i>(optional)</i>; required ones say nothing. Faith details such as home church are always optional and never required to finish a form.</li>
<li><b>Validate on submit.</b> Errors appear when the person presses the primary button, not while they type.</li>
<li><b>Keep everything.</b> A failed submit keeps every value; the message says "Nothing was lost".</li>
</ul>""",
    "when": """<ul>
<li><b>Auth screens</b> (sign in, join, forgot and reset password): a full-width <code>.auth__form</code> with a large block submit. Staff sign in has no form: one Google button.</li>
<li><b>Full-page forms</b> (suggest a listing, send feedback): a page of their own when the form is long, has its own entry points and deserves context beside it. <code>.form-page</code>: the form in a 40rem column, an aside (what happens next, you said we did) beside it from 1024px; sending replaces the form with a <b>done</b> panel.</li>
<li><b>Short edits</b> (edit profile, request a booking): a <a href="../components/dialog.html">dialog</a>, which becomes a bottom sheet on phones.</li>
<li><b>Long staff edits</b> (event editor, listing editor): a <a href="../components/drawer.html">drawer</a> so the list stays in view.</li>
<li>Never an inline form inside a card or row; editing opens a dialog, drawer or screen.</li>
</ul>""",
    "structure": """<p>Top to bottom: title, alert slot (empty until submit), fields in reading order, a quiet hint about what happens next, then the footer with Cancel before the primary action. Fields use <code>.stack</code>; two short related fields (date and time) share a <code>.field-row</code> from the tablet breakpoint.</p>"""
        + ex(DEFAULT, "A dialog-style form: select, text field with hint, optional textarea, split footer.", True)
        + "<h3>Full-page form</h3><p>Title and a one-line lead, <code>.form-section</code>s (each a <code>&lt;fieldset&gt;</code> with a legend when it groups choices), then <code>.form-page__foot</code> with the primary action and who it is sent as (\"Sent as Grace Thompson\"). The aside follows the form in the DOM, so on phones it comes after.</p>"
        + ex(FULL_PAGE, "Send feedback: the form, then You said, we did beside it from 1024px.", True),
    "states": """<p>Forms have five states. Each one appears in every form mock (<code>invalid</code>, <code>busy</code>/<code>submitting</code>, <code>failed</code>/<code>error</code>, <code>success</code>).</p>
<h3>Invalid</h3>"""
        + ex(INVALID, "After submit: the summary takes focus, links to each field, and every field repeats its own error.", True)
        + "<h3>Submitting</h3>"
        + ex(BUSY, "Fields go read-only, Cancel is disabled and the primary button shows a spinner and an -ing label.", True)
        + "<h3>Failed</h3>"
        + ex(FAILED, "The server didn't answer: one alert at the top, values kept, button back to its resting label.", True)
        + "<h3>Success</h3>"
        + ex(SUCCESS, "Success says what happens next; a dialog swaps its body for a success panel with Done and the next step.", True)
        + "<h3>Done (full-page form)</h3>"
        + ex(DONE, "The form is replaced by a <code>.done</code> panel (<code>role=\"status\"</code>, focused): thanks by name, what happens now, and two ways on (suggest a listing success).", True),
    "responsive": """<ul>
<li>Phones: one column; footer buttons share the width (<code>.btn--grow</code>); dialogs open as bottom sheets with the footer pinned above the keyboard.</li>
<li>Tablet and up: <code>.field-row</code> puts two short fields side by side; the auth form sits beside the brand panel.</li>
<li>Full-page forms: one column with the aside after the form below 1024px; from 1024px the form is held to 40rem with the aside beside it, 64px apart; <code>.choice-grid--3</code> and <code>--4</code> go to three and four columns from 640px.</li>
<li>Inputs are 16px so phones don't zoom on focus, and at least 44px tall.</li>
</ul>""",
    "accessibility": f"""<ul>
<li>Every control has a visible <code>&lt;label for&gt;</code>; placeholders are never the label.</li>
<li>Errors set <code>aria-invalid="true"</code> and are joined with <code>aria-describedby</code>; hints are joined the same way when there's no error.</li>
<li>The error summary is <code>role="alert"</code>, <code>tabindex="-1"</code> and receives focus on submit; each link moves focus to its field.</li>
<li>Busy buttons carry <code>aria-busy="true"</code>; the spinner is decorative and the label changes to "Saving…".</li>
<li>{kbd("Enter")} submits from a single-line field; {kbd("Esc")} closes a dialog form only when nothing has changed, otherwise it asks first.</li>
<li>Use <code>autocomplete</code> tokens (<code>email</code>, <code>current-password</code>, <code>one-time-code</code>) so password managers and autofill work.</li>
</ul>""",
    "content": """<ul>
<li>Labels are short nouns or questions in sentence case: "Email", "When works for you?".</li>
<li>Field errors say how to fix it: "Enter an email address like name@example.com", not "Invalid email".</li>
<li>Summary titles count what's left: "2 things to fix before publishing"; a single problem may name it: "Check your email address".</li>
<li>The primary button names the outcome; its busy label is the same verb with -ing: "Send request" → "Sending…".</li>
<li>See <a href="content-and-tone.html">Content and tone</a> for the error message formula.</li>
</ul>""",
    "do-dont": [
        ("do", F.field("Email", "dd-email", "grace.thompson", type_="email", error="Enter an email address like name@example.com"),
         "Say how to fix it, next to the field."),
        ("dont", F.field("Email", "dd-email2", "grace.thompson", type_="email", error="Invalid input"),
         "Don't name the fault without the fix."),
        ("do", F.field("Home church", "dd-church", "", optional=True), "Mark faith details optional."),
        ("dont", F.field("Home church", "dd-church2", "", required=True, hint="Required to join"),
         "Don't require faith details to finish a form."),
        ("do", '<button class="btn btn--primary" type="submit">Send request</button>', "Name the outcome on the button."),
        ("dont", '<button class="btn btn--primary" type="submit">Submit</button>', "Don't use a generic Submit or OK."),
    ],
    "sources": {
        "mocks": [
            mock("dialogs/request-booking/default", "dialog form with select, hint and optional message"),
            mock("dialogs/request-booking/invalid", "error summary with one item"),
            mock("dialogs/request-booking/busy", "Sending… with Cancel disabled"),
            mock("dialogs/request-booking/failed", "\"Nothing was lost\" alert"),
            mock("dialogs/request-booking/success", "success panel"),
            mock("dialogs/event-editor/invalid", "counted summary title"),
            mock("pages/sign-in/invalid", "auth form errors"),
            mock("pages/forgot-password/success", "success alert"),
            mock("pages/suggest-listing/default", "full-page form with what happens next"),
            mock("pages/suggest-listing/invalid", "name marked"),
            mock("pages/suggest-listing/success", "done panel"),
            mock("pages/feedback/default", "full-page form with You said, we did"),
            mock("pages/feedback/error", "alert above the form, text kept"),
            mock("pages/feedback/success", "done panel"),
        ],
        "drift": """<ul>
<li>Error summary titles follow three formulas: counted ("2 things to fix before publishing", "1 thing to fix before listing"), "Check your …" (sign in, profile, forgot password) and a bare instruction ("Add when you're free", "Your passwords don't match"). Recommended: counted when there are two or more, "Check your …" for one.</li>
<li>Failed alerts mix "We couldn't save your changes" with subjectless "Couldn't publish" and "Couldn't save the listing". Recommended: the "We couldn't …" form in the member app; staff screens may stay terse but should be consistent.</li>
<li>Join labels "Home church" without "(optional)"; faith details must be marked optional.</li>
<li>Staff two-step sign-in (and its mock <code>pages/admin-two-step</code>) was removed in db05e2d: staff sign in with Google Workspace, so the one-time code input has no mock in use.</li>
<li>Busy submit buttons use <code>disabled</code> plus <code>aria-busy</code>, so focus drops from the button while saving. Prefer keeping it focusable with <code>aria-disabled="true"</code>.</li>
</ul>""",
    },
}
