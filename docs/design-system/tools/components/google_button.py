from dslib import cf_ui, ex, icon, kbd, matrix, mock, themes

G = cf_ui.google_g()
G_SM = cf_ui.google_g("sm")
G_XL = cf_ui.google_g("xl")
SPIN = icon("loader", "icon--spin")
# A recoloured G, drawn only to show what not to do: every path takes the current text colour.
G_FLAT = (G.replace('fill="#EA4335"', 'fill="currentColor"').replace('fill="#4285F4"', 'fill="currentColor"')
          .replace('fill="#FBBC05"', 'fill="currentColor"').replace('fill="#34A853"', 'fill="currentColor"'))


def gbtn(label="Continue with Google", a=""):
    return f'<button class="google-button" type="button"{a}>{G}{label}</button>'


BUSY = f'<button class="google-button" type="button" disabled aria-busy="true">{SPIN}Opening Google…</button>'
FORM = '<div class="auth__form">{}</div>'
SSO = FORM.format(f'<div class="auth__sso">{gbtn()}<p class="divider--label">or with email</p></div>')

STATES = [("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'),
          ("Disabled", " disabled"), ("Busy", "")]

SPEC = {
    "lead": "The Google button starts sign-in or sign-up with a Google account. It wears Google's mark and Google's words, not ours.",
    "meta": ["Status: new", "Native <code>&lt;button&gt;</code>", "Member and admin sign-in"],
    "overview": f"""<p>Use the Google button wherever a person can sign in or create a profile with Google: member <b>Sign in</b> and <b>Join</b>, where it sits above the email form with an <a href="divider.html">or divider</a>, and <b>Staff sign in</b>, where it is the only way in (Google Workspace). It is not a <a href="button.html">button</a> variant: Google's branding rules decide its fill, border, mark and wording, so it has its own block.</p>
<ul>
<li><b>Mark</b>: Google's full-colour \"G\" (<code>.google-g</code>), unaltered: four colours, never recoloured, outlined, cropped or redrawn. It is decorative (<code>aria-hidden</code>); the words carry the name.</li>
<li><b>Wording</b>: one of Google's own calls to action. Sign in uses \"Continue with Google\", Join \"Sign up with Google\", Staff sign in \"Sign in with Google\".</li>
<li><b>Surface</b>: the surface fill and a neutral strong border, the pill shape and the 52px height of the large button beside it.</li>
</ul>
<p>The mark also comes in two other sizes for notes about the account Google returned (see <a href="sso-notice.html">Sign-in notice</a>): <code>.google-g--sm</code> (16px) beside an email address, and <code>.google-g--xl</code> (40px) on the mocked Google account chooser, which is Google's own page and never built.</p>""",
    "anatomy": {
        "figure": FORM.format(gbtn()),
        "callouts": [(31, 22), (56, 22), (90, 50)],
        "parts": [
            ("Google mark", "<code>.google-g</code>, 20px (<code>--size-icon-lg</code>), Google's four colours, <code>aria-hidden</code>. Replaced by the spinner only while the page is leaving for Google."),
            ("Label", "Google's wording, 16px (<code>--font-size-md</code>) semibold, in <code>--color-fg-default</code>; one line (<code>white-space: nowrap</code>)."),
            ("Container", "Full width, at least 52px (<code>--control-height-lg</code>), pill (<code>--radius-full</code>), <code>--color-bg-surface</code> fill and a 1px <code>--color-border-strong</code> border; mark and label centred 12px apart."),
        ],
    },
    "variants": "<h3>Member sign in and join</h3>"
    + ex(SSO, "Sign in: \"Continue with Google\" above the email form, then the or divider.", True, mod="stack")
    + ex(FORM.format(f'<div class="auth__sso">{gbtn("Sign up with Google")}<p class="divider--label">or with email</p></div>'),
         "Join: \"Sign up with Google\".", True, mod="stack")
    + "<h3>Staff sign in</h3>"
    + ex(FORM.format(f'<div class="staff__sso">{gbtn("Sign in with Google")}</div>'),
         "Staff sign in: the only way in, so there is no divider and no email form.", True, mod="stack")
    + "<h3>The mark on its own</h3>"
    + ex(f'{G_SM}{G}{G_XL}',
         "<code>.google-g--sm</code> 16px (account notes) · <code>.google-g</code> 20px (the button) · <code>.google-g--xl</code> 40px (the mocked Google account chooser).", True),
    "sizes": """<p>One size. The button is always full width and at least 52px tall (<code>--control-height-lg</code>), so it lines up with the large submit below it (<code>.btn--lg.btn--block</code>). Its padding is <code>--space-3-5</code> × <code>--space-5</code>, less the 1px border. The mark is 20px in the button; the 16px and 40px marks are for the account notes and the chooser, never inside the button.</p>""",
    "states": {
        "intro": "<p>Hover and focus are forced here with <code>data-state</code>; live pages get them from <code>:hover</code> and <code>:focus-visible</code>. Disabled and busy are the real <code>disabled</code> and <code>aria-busy=\"true\"</code> attributes. The block has no <code>:active</code> style: pressing it looks like hover.</p>",
        "matrix": matrix(STATES, [
            ("Sign in", f'<button class="google-button" type="button"{{a}}>{G}Continue with Google</button>', {"Busy": None}),
            ("Staff", f'<button class="google-button" type="button"{{a}}>{G}Sign in with Google</button>', {"Busy": None}),
            ("Redirecting", f'<button class="google-button" type="button" disabled aria-busy="true"{{a}}>{SPIN}Opening Google…</button>',
             {"Default": None, "Hover": None, "Focus": None, "Disabled": None}),
        ]),
        "themes": themes(SSO + FORM.format(f'<div class="staff__sso">{BUSY}</div>'), "stack"),
        "notes": """<ul>
<li><b>Redirecting</b> (<code>disabled aria-busy="true"</code>): pressed, the page is on its way to Google. The mark gives way to the spinner and the label reads \"Opening Google…\"; the button dims to <code>--opacity-busy</code>.</li>
<li><b>Disabled</b> (<code>disabled</code>): while the email form below is submitting (\"Signing in…\", \"Creating your profile…\"), so two sign-ins cannot race. It dims to <code>--opacity-disabled</code> and keeps the surface fill.</li>
<li><b>Google did not finish</b>: the button returns to default and a <a href="alert.html">form alert</a> above it says \"Google sign-in didn't finish\" (Sign in, Staff sign in) or \"Google sign-up didn't finish\" (Join).</li>
<li><b>Wrong account</b>: when Google returns an account that cannot be used, a <a href="sso-notice.html">sign-in notice</a> names it above the button.</li>
</ul>""",
    },
    "responsive": """<ul>
<li>Full width of its card or form at every width: the sign-in card (<code>.signin__card</code>), the Join form and the staff card are at most <code>--layout-form-max</code> (448px) wide.</li>
<li>The label never wraps (<code>white-space: nowrap</code>). The longest wording, \"Continue with Google\", fits the 360px phone card with room to spare; do not use longer words.</li>
<li>In member Sign in and Join the block sits 32px below the lead (<code>.auth__sso</code>), with the or divider 28px under it; on Staff sign in, 32px below the lead (<code>.staff__sso</code>).</li>
</ul>""",
    "theming": """<p>The button reads only semantic tokens: <code>--color-bg-surface</code> (hover <code>--color-bg-subtle</code>), <code>--color-border-strong</code> and <code>--color-fg-default</code>. In light it is the white button with a neutral border that Google's branding asks for; in dark it follows the dark surface with a light label, the analogue of Google's dark button. The mark keeps Google's four colours in both themes: it is the one place a page carries colours that are not tokens, because the mark must be unaltered.</p>""",
    "accessibility": {
        "pattern": '<p>A native <code>&lt;button type="button"&gt;</code> (<a href="https://www.w3.org/WAI/ARIA/apg/patterns/button/">APG Button</a>) that starts the redirect; it is not a link because pressing it starts a sign-in, not a visit. The mark is <code>aria-hidden</code>.</p>',
        "keys": [
            (kbd("Tab") + " / " + kbd("Shift", "Tab"), "Moves focus to and from the button; it comes before the email field."),
            (kbd("Enter") + ", " + kbd("Space"), "Starts sign-in with Google."),
        ],
        "focus": "<p>The shared ring: 2px <code>--color-focus-ring</code> at 2px offset, following the pill shape, on <code>:focus-visible</code> only. After a failed or refused Google sign-in, focus goes to the alert or notice above the button, not to the button.</p>",
        "labelling": "<p>The visible words are the accessible name (\"Continue with Google\"); the mark adds nothing to it. While redirecting, the name becomes \"Opening Google…\" and <code>aria-busy</code> is set. Never an icon-only Google button.</p>",
        "pairs": [
            ("Label on surface", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Label on hover", "--color-fg-default", "--color-bg-subtle", 4.5),
            ("Border on surface (non-text)", "--color-border-strong", "--color-bg-surface", 3),
            ("Border on canvas (non-text)", "--color-border-strong", "--color-bg-canvas", 3),
            ("Focus ring on surface", "--color-focus-ring", "--color-bg-surface", 3),
        ],
        "motion": "<p>The fill changes over <code>--duration-fast</code> (instant under reduced motion). The redirecting spinner stops rotating under reduced motion; \"Opening Google…\" still says what is happening.</p>",
        "touch": "<p>52px tall and the full width of the form, well over 44 × 44px; it sits 28px or more from the next control.</p>",
    },
    "content": """<ul>
<li>Use Google's own calls to action, word for word: \"Continue with Google\" (Sign in), \"Sign up with Google\" (Join), \"Sign in with Google\" (Staff sign in). Google, with a capital G, always last.</li>
<li>Never \"Log in with Google\", \"Use Google\", \"Google login\" or our own phrasing.</li>
<li>While redirecting: \"Opening Google…\", with the ellipsis character.</li>
<li>After a refused account, Staff sign in's mock offers \"Try another Google account\", which is not one of Google's phrases; prefer \"Sign in with Google\" again and let the <a href="sso-notice.html">notice</a> above say to pick the work account.</li>
</ul>""",
    "dodont": [
        ("do", FORM.format(gbtn()), "Google's mark in full colour and Google's words (Sign in)."),
        ("dont", f'<button class="google-button" type="button">{G_FLAT}Continue with Google</button>', "A recoloured G breaks Google's branding rules; the mark is never tinted to match the theme."),
        ("do", FORM.format(gbtn("Sign up with Google")), "\"Sign up with Google\" where a profile is created (Join)."),
        ("dont", f'<button class="btn btn--primary btn--lg btn--block" type="button">{G}Login with Google</button>', "A bordeaux button and made-up wording: Google's button has a neutral fill and Google's own call to action."),
        ("do", FORM.format(f'<div class="staff__sso">{gbtn("Sign in with Google")}</div>'), "After a refused account, the same Google wording; the notice above says what to do."),
        ("dont", FORM.format(f'<div class="staff__sso">{gbtn("Try another Google account")}</div>'), "Our own phrase on Google's button (Staff sign in, wrong-domain and no-access)."),
    ],
    "tokens": [
        ("Fill / hover", "--color-bg-surface / --color-bg-subtle", "color"),
        ("Border", "--color-border-strong", "color"),
        ("Label", "--color-fg-default", "color"),
        ("Spinner", "--color-fg-muted", "color"),
        ("Min-height", "--control-height-lg", "value"),
        ("Padding", "--space-3-5 / --space-5", "value"),
        ("Gap", "--space-3", "value"),
        ("Border width", "--border-width-hairline", "value"),
        ("Radius", "--radius-full", "value"),
        ("Label size / weight", "--font-size-md / --font-weight-semibold", "value"),
        ("Mark sm / default / xl", "--size-icon-sm / --size-icon-lg / --size-avatar-md", "value"),
        ("Disabled / busy opacity", "--opacity-disabled / --opacity-busy", "value"),
        ("Transition", "--duration-fast / --ease-standard", "value"),
    ],
    "code": {
        "snippet": '''<div class="auth__sso">
  <button class="google-button" type="button">
    <svg class="google-g" viewBox="0 0 48 48" aria-hidden="true">…Google's four paths, unaltered…</svg>Continue with Google
  </button>
  <p class="divider--label">or with email</p>
</div>

<!-- Redirecting -->
<button class="google-button" type="button" disabled aria-busy="true">
  <svg class="icon icon--spin" viewBox="0 0 24 24" aria-hidden="true">…</svg>Opening Google…
</button>''',
        "classes": [
            ("<code>.google-button</code>", "Full-width 52px pill with surface fill and strong border."),
            ("<code>.google-g</code> <code>.google-g--sm</code> <code>.google-g--xl</code>", "Google's mark at 20px, 16px and 40px. Copy the SVG from <code>docs/mocks/tools/cf_ui.py</code> (<code>GOOGLE_G</code>); never redraw it."),
            ("<code>.auth__sso</code> <code>.staff__sso</code>", "Placement in member auth forms and the staff card."),
            ("<code>disabled</code> · <code>aria-busy=\"true\"</code>", "Disabled while the email form submits; busy while redirecting."),
            ("<code>data-state=\"hover|focus\"</code>", "Documentation only: forces a state."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/sign-in/default", "Continue with Google above the email form"),
            mock("pages/sign-in/redirecting", "busy: Opening Google…"),
            mock("pages/sign-in/submitting", "disabled while the email form submits"),
            mock("pages/sign-in/google-failed", "back to default under the alert"),
            mock("pages/join/default", "Sign up with Google"),
            mock("pages/join/redirecting", "busy"),
            mock("pages/admin-sign-in/default", "Sign in with Google, the only way in"),
            mock("pages/admin-sign-in/wrong-domain", "Try another Google account"),
            mock("pages/google-account-chooser/default", "the 40px mark on Google's page"),
        ],
        "drift": "The decisions are recorded in the mocks README (Member sign in, Google's account chooser, Google did not finish, Staff sign in): a surface fill, neutral border, the full-colour G and Google's wording. Open: the staff screen's \"Try another Google account\" is our phrase, not Google's (proposed: \"Sign in with Google\"); the block has no <code>:active</code> style; and the dark-theme button follows our dark surface, which should be checked against Google's current dark-button guidance before launch.",
    },
}
