from dslib import cf_ui, ex, icon, kbd, matrix, mock, themes

G_SM = cf_ui.google_g("sm")
ALERT = icon("alert-circle")
FORM = '<div class="auth__form">{}</div>'

ACCOUNT = f"""<div class="sso-account">
  <span class="avatar" aria-hidden="true">G</span>
  <div class="sso-account__body">
    <p class="sso-account__email">grace.thompson@gmail.com</p>
    <p class="sso-account__via">{G_SM} Signing in with Google</p>
  </div>
  <a class="sso-account__change" href="#">Change<span class="visually-hidden"> how you sign in</span></a>
</div>"""

NO_ACCOUNT = f"""<div class="sso-notice" role="alert" tabindex="-1">
  <p class="sso-notice__account">{G_SM}<span>grace@gracefellowship.ca</span></p>
  <p class="sso-notice__text">There's no Christian Fitness profile on this Google account yet. Create one now — we'll bring over your name and photo.</p>
  <div class="sso-notice__actions">
    <a class="btn btn--primary btn--sm" href="#">Create my profile</a>
    <button class="btn btn--ghost btn--sm sso-notice__other" type="button">Use another account</button>
  </div>
</div>"""


def staff(title, email, text, a=""):
    return (f'<div class="sso-notice sso-notice--spaced" role="alert" tabindex="-1"{a}>'
            f'<p class="sso-notice__title">{ALERT}{title}</p>'
            f'<p class="sso-notice__account">{G_SM}<span>{email}</span></p>'
            f'<p class="sso-notice__text">{text}</p></div>')


WRONG = staff("That's not a staff account", "dana.reyes@gmail.com",
              "Only @christianfitness.ca accounts can open the console. Pick your work account instead.")
NO_ACCESS = staff("No admin access yet", "events@christianfitness.ca",
                  "Your Workspace account is fine, but it hasn’t been given a console role. Ask an Admin to add you to the team.")

SPEC = {
    "lead": "Sign-in notes name the Google account a person came back with: the account they are joining with, or the one that could not be used and why.",
    "meta": ["Status: new", "<code>&lt;div&gt;</code>, <code>role=\"alert\"</code> for refusals", "Member and admin sign-in"],
    "overview": f"""<p>After <a href="google-button.html">Continue with Google</a>, Google hands back an account. These two blocks show which one, so nobody is signed in, or refused, as the wrong person without seeing it.</p>
<ul>
<li><b>Account</b> (<code>.sso-account</code>): on Join, after Google, the account the profile will be made with: avatar, email, \"Signing in with Google\" and a <b>Change</b> link back to the start. It replaces the email and password fields.</li>
<li><b>Notice</b> (<code>.sso-notice</code>): the account Google returned could not be used. On member Sign in it has no profile yet and offers <b>Create my profile</b> or <b>Use another account</b>. On Staff sign in it is the wrong domain or has no console role, with a title, the account and what to do. <code>.sso-notice--spaced</code> adds the 32px gap it needs under the staff lead.</li>
</ul>
<p>When Google itself fails (\"Google sign-in didn't finish\"), there is no account to name: use a <a href="alert.html">form alert</a> instead.</p>""",
    "anatomy": {
        "figure": FORM.format(NO_ACCOUNT),
        "callouts": [(11, 30), (88, 55), (13, 78), (72, 78)],
        "parts": [
            ("Account", "<code>.sso-notice__account</code>: the 16px Google mark (<code>.google-g--sm</code>) and the email, 14px semibold, cut with an ellipsis when long."),
            ("Text", "<code>.sso-notice__text</code>: 15px, relaxed line height; says what happened and what to do."),
            ("Primary action (optional)", "A small primary <a href=\"button.html\">button</a> or link: \"Create my profile\"."),
            ("Other account (optional)", "<code>.sso-notice__other</code>: a small ghost button in the accent colour, \"Use another account\", back to Google's chooser."),
        ],
    },
    "variants": "<h3>Account (Join, after Google)</h3>"
    + ex(FORM.format(ACCOUNT), "The account the profile is being made with; Change goes back to the Join start.", True, mod="stack")
    + "<h3>Notice with actions (member Sign in)</h3>"
    + ex(FORM.format(NO_ACCOUNT), "No profile on this Google account yet (sign-in google-no-account).", True, mod="stack")
    + "<h3>Notice with a title (Staff sign in)</h3>"
    + ex(FORM.format(WRONG), "Wrong domain: <code>.sso-notice--spaced</code>, a title with the alert icon.", True, mod="stack")
    + ex(FORM.format(NO_ACCESS), "No console role yet.", True, mod="stack"),
    "sizes": "<p>One size each. The account row is 14px text in a 14px × 16px padded box with a 40px avatar; the notice has 20px padding (<code>--space-5</code>). Both fill the width of the form (at most <code>--layout-form-max</code>).</p>",
    "states": {
        "intro": "<p>Neither block is itself interactive; their states are those of the controls inside, plus the moment a notice appears. The Change link has a real <code>:hover</code> underline (no <code>data-state</code> hook); focus is the shared ring, forced here with <code>data-state</code>.</p>",
        "matrix": matrix([("Default", ""), ("Hover", None), ("Focus", ' data-state="focus"')], [
            ("Account: Change link", '<a class="sso-account__change" href="#"{a}>Change<span class="visually-hidden"> how you sign in</span></a>'),
            ("Notice: other account", '<button class="btn btn--ghost btn--sm sso-notice__other" type="button"{a}>Use another account</button>',
             {"Hover": ' data-state="hover"'}),
            ("Notice (focus on arrival)", f'<div class="sso-notice" role="alert" tabindex="-1"{{a}}><p class="sso-notice__account">{G_SM}<span>grace@gracefellowship.ca</span></p></div>'),
        ]),
        "themes": themes(FORM.format(ACCOUNT) + FORM.format(NO_ACCOUNT) + FORM.format(WRONG), "stack"),
        "notes": """<ul>
<li><b>Appears</b>: a notice is rendered with <code>role="alert"</code>, <code>tabindex="-1"</code> and focus moved to it, so it is announced and the next Tab reaches its actions or the Google button below.</li>
<li><b>Busy</b>: while Join submits, the account row stays as it is and the fields below turn read-only (join google-submitting).</li>
<li><b>Long email</b>: the address is cut with an ellipsis on one line; screen readers still read all of it.</li>
</ul>""",
    },
    "responsive": """<ul>
<li>Both fill their form at every width. The account row keeps avatar, email and Change on one line: the body shrinks (<code>min-width: 0</code>) and the email ellipsises; Change never wraps.</li>
<li>The notice's actions wrap onto a second line when they do not fit (<code>flex-wrap</code>, 8px gap); at 360px \"Create my profile\" and \"Use another account\" still share one line.</li>
</ul>""",
    "theming": """<p>The account row sits on <code>--color-bg-canvas</code> inside the surface form, with an accent avatar (<code>--color-accent</code>/<code>--color-fg-on-accent</code>), muted \"Signing in with Google\" and an accent Change link. The notice is <code>--color-accent-subtle</code> with an accent title (<code>--color-fg-accent</code>) and default text. The ghost \"other account\" button takes <code>--color-fg-accent</code> and a surface hover. All follow the theme; the Google mark keeps its own colours.</p>""",
    "accessibility": {
        "pattern": "<p>The account row is static content with a link. A refusal notice is a <code>role=\"alert\"</code> region (<a href=\"https://www.w3.org/WAI/ARIA/apg/patterns/alert/\">APG Alert</a>) that receives focus when the page loads with it. The Google mark is <code>aria-hidden</code>; the email is text.</p>",
        "keys": [
            (kbd("Tab"), "From the notice: to its actions, then to the Google button. In the account row: to Change."),
            (kbd("Enter"), "Follows Change or Create my profile."),
            (kbd("Enter") + ", " + kbd("Space"), "Use another account (a button)."),
        ],
        "focus": "<p>The notice takes focus on arrival (<code>tabindex=\"-1\"</code>), showing the shared 2px ring at 2px offset around its rounded box. Links and buttons inside use the same ring.</p>",
        "labelling": "<p>Change adds visually hidden context, so it is read as \"Change how you sign in\". The staff title (\"That's not a staff account\") is the first thing read; the email that Google returned follows, so the person knows which account was refused. The icon is decorative.</p>",
        "pairs": [
            ("Notice title", "--color-fg-accent", "--color-accent-subtle", 4.5),
            ("Notice account and text", "--color-fg-default", "--color-accent-subtle", 4.5),
            ("Account email on canvas", "--color-fg-default", "--color-bg-canvas", 4.5),
            ("Signing in with Google", "--color-fg-muted", "--color-bg-canvas", 4.5),
            ("Change link", "--color-fg-accent", "--color-bg-canvas", 4.5),
            ("Avatar initial", "--color-fg-on-accent", "--color-accent", 4.5),
            ("Focus ring on surface", "--color-focus-ring", "--color-bg-surface", 3),
        ],
        "motion": "<p>None; the notice is part of the page as it loads.</p>",
        "touch": "<p>The notice's buttons are small buttons (36px) that extend to 44 × 44px on coarse pointers. The Change link is 14px text with no extended hit area: it should get the coarse-pointer extension that <code>.text-link</code> has.</p>",
    },
    "content": """<ul>
<li>Always show the account Google returned, in full: \"dana.reyes@gmail.com\".</li>
<li>Say what is wrong in the person's terms, then what to do: \"Only @christianfitness.ca accounts can open the console. Pick your work account instead.\"</li>
<li>Staff titles are short and plain: \"That's not a staff account\", \"No admin access yet\".</li>
<li>Name the roles as the product does: \"Ask an Admin to add you to the team\".</li>
<li>\"Signing in with Google\" under the email; \"Change\" (with hidden \"how you sign in\").</li>
</ul>""",
    "dodont": [
        ("do", FORM.format(WRONG), "Name the account that was refused, so the person can see they picked the wrong one (L2-018)."),
        ("dont", FORM.format('<div class="sso-notice" role="alert" tabindex="-1"><p class="sso-notice__text">Access denied.</p></div>'), "No account, no reason, no next step."),
        ("do", FORM.format(NO_ACCOUNT), "No profile yet: offer to create one with the details Google gave, or another account."),
        ("dont", FORM.format(f'<div class="sso-notice" role="alert" tabindex="-1"><p class="sso-notice__account">{G_SM}<span>grace@gracefellowship.ca</span></p><p class="sso-notice__text">We couldn\'t find an account for this email.</p></div>'),
         "A dead end: the person came to sign in and is left with nothing to press."),
    ],
    "tokens": [
        ("Account row fill", "--color-bg-canvas", "color"),
        ("Avatar", "--color-accent / --color-fg-on-accent", "color"),
        ("Signing in with Google", "--color-fg-muted", "color"),
        ("Change link", "--color-fg-accent", "color"),
        ("Notice fill", "--color-accent-subtle", "color"),
        ("Notice title / other-account button", "--color-fg-accent", "color"),
        ("Other-account hover", "--color-bg-surface", "color"),
        ("Radius", "--radius-lg", "value"),
        ("Account padding", "--space-3-5 / --space-4", "value"),
        ("Notice padding", "--space-5", "value"),
        ("Spaced margin", "--space-8", "value"),
        ("Gaps", "--space-1-5 / --space-2 / --space-2-5 / --space-3", "value"),
        ("Text sizes", "--font-size-sm / --font-size-ui", "value"),
        ("Line height", "--line-height-relaxed", "value"),
    ],
    "code": {
        "snippet": '''<div class="sso-account">
  <span class="avatar" aria-hidden="true">G</span>
  <div class="sso-account__body">
    <p class="sso-account__email">grace.thompson@gmail.com</p>
    <p class="sso-account__via"><svg class="google-g google-g--sm" aria-hidden="true">…</svg> Signing in with Google</p>
  </div>
  <a class="sso-account__change" href="/join">Change<span class="visually-hidden"> how you sign in</span></a>
</div>

<div class="sso-notice sso-notice--spaced" role="alert" tabindex="-1">
  <p class="sso-notice__title"><svg class="icon" aria-hidden="true">…</svg>That's not a staff account</p>
  <p class="sso-notice__account"><svg class="google-g google-g--sm" aria-hidden="true">…</svg><span>dana.reyes@gmail.com</span></p>
  <p class="sso-notice__text">Only @christianfitness.ca accounts can open the console. Pick your work account instead.</p>
</div>''',
        "classes": [
            ("<code>.sso-account</code> <code>__body</code> <code>__email</code> <code>__via</code> <code>__change</code>", "The account a profile is being made with."),
            ("<code>.sso-notice</code> <code>.sso-notice--spaced</code>", "Tinted note about the returned account; spaced under the staff lead."),
            ("<code>.sso-notice__title</code> <code>__account</code> <code>__text</code> <code>__actions</code> <code>__other</code>", "Title with icon, account, text, actions, accent ghost button."),
            ("<code>role=\"alert\"</code> <code>tabindex=\"-1\"</code>", "Announce and focus a refusal on arrival."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/join/google", "account row after Google"),
            mock("pages/join/google-submitting", "account row while the form submits"),
            mock("pages/sign-in/google-no-account", "notice with actions"),
            mock("pages/admin-sign-in/wrong-domain", "notice with title, spaced"),
            mock("pages/admin-sign-in/no-access", "notice with title, spaced"),
            mock("pages/sign-in/google-failed", "no account to name: form alert instead"),
        ],
        "drift": "New with Google sign-in; the prototype had no state for a refused or unknown account, so these were added in the mocks (README: Google did not finish, Staff sign in). The Change link has no coarse-pointer hit area and no focus or hover hook beyond the shared ring; proposed: add it to the 44px extension list.",
    },
}
