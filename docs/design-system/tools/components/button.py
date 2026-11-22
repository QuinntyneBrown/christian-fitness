from dslib import INTERACTIVE, ex, icon, kbd, matrix, mock, themes

PLUS = icon("plus")
SPIN = icon("loader", "icon--spin")

SPEC = {
    "lead": "Buttons let people act: register, send, save, approve. One primary button per view tells them what matters most.",
    "meta": ["Status: stable", "Native <code>&lt;button&gt;</code>"],
    "overview": f"""<p>Use a button when activating it changes something: it submits, registers, sends, opens a dialog or starts a process. Use a <a href="link.html">link</a> when it only takes the person somewhere (a link may wear button styling, as "Register" on the landing page does, but stays an <code>&lt;a href&gt;</code>). Use a <a href="menu.html">menu</a> when one trigger offers several actions.</p>
<ul>
<li><b>Primary</b> (bordeaux) is the one action the view exists for: "Register", "Send request", "Sign in". Never two per view.</li>
<li><b>Secondary</b> (outlined) is every other action that still matters: "Cancel", "Message", "Decline".</li>
<li><b>Ghost</b> sits in dense chrome where an outline would be noise: "Sign in" in the public header.</li>
<li><b>Danger</b> is for destructive actions and appears only inside a confirmation step.</li>
<li><b>Link</b> looks like a link but behaves like a button: "Retry" inside a failed message.</li>
<li><b>Inverse</b> and <b>On brand</b> are the primary and secondary pair for bordeaux panels (verse band, report card).</li>
<li><b>Icon button</b> (<code>.icon-button</code>) is the round, label-less button for close, dismiss and back.</li>
</ul>""",
    "anatomy": {
        "figure": f'<button class="btn btn--primary btn--lg" type="button">{PLUS}New event</button>',
        "callouts": [(30, 18), (55, 18), (78, 74)],
        "parts": [
            ("Leading icon (optional)", "16px (<code>--size-icon-sm</code>), inherits the label colour, <code>aria-hidden</code>."),
            ("Label", "A verb phrase in sentence case, 15px semibold; it is the accessible name."),
            ("Container", "Pill (<code>--radius-full</code>), min-height from <code>--control-height-*</code>, 1px border in the button's border colour (transparent unless outlined)."),
        ],
    },
    "variants": ex(
        '<button class="btn btn--primary" type="button">Register</button>'
        '<button class="btn btn--secondary" type="button">Message</button>'
        '<button class="btn btn--ghost" type="button">Sign in</button>'
        '<button class="btn btn--danger" type="button">Delete event</button>'
        '<button class="btn btn--link" type="button">Retry</button>',
        "Emphasis from highest to lowest; danger is reserved for destructive confirmations.", True)
    + "<h3>On brand panels</h3>"
    + ex('<button class="btn btn--inverse btn--sm" type="button">Suspend</button>'
         '<button class="btn btn--on-brand btn--sm" type="button">Dismiss report</button>',
         "Inverse (white) is the panel's primary; on-brand (outlined white) its secondary. Both switch to the borealis focus ring.",
         True, mod="brand")
    + "<h3>Icons, icon-only and width</h3>"
    + ex(f'<button class="btn btn--primary" type="button">{PLUS}New event</button>'
         f'<button class="icon-button" type="button" aria-label="Close">{icon("x", "icon--lg")}</button>'
         f'<button class="icon-button icon-button--sm" type="button" aria-label="Dismiss">{icon("x")}</button>'
         '<div class="btn-row"><button class="btn btn--secondary btn--grow" type="button">Cancel</button>'
         '<button class="btn btn--primary btn--grow" type="button">Send request</button></div>',
         "Icon buttons carry <code>aria-label</code>; <code>.btn--grow</code> splits a footer evenly; <code>.btn--block</code> fills the width.", True),
    "sizes": ex(
        '<button class="btn btn--primary btn--xs" type="button">Extra small</button>'
        '<button class="btn btn--primary btn--sm" type="button">Small</button>'
        '<button class="btn btn--primary" type="button">Medium</button>'
        '<button class="btn btn--primary btn--md" type="button">Medium, 16px</button>'
        '<button class="btn btn--primary btn--lg" type="button">Large</button>',
        "xs and sm: 36px min-height, 14px label (rows, cards, panels) · default: 44px, 15px · md: 16px label (dialog and drawer footers) · lg: 52px (auth submit, register).", True),
    "states": {
        "intro": "<p>Every variant has the same states. Pointer and focus states are forced here with <code>data-state</code>; real pages get them from <code>:hover</code>, <code>:focus-visible</code>, <code>:active</code>, <code>disabled</code> and <code>aria-busy</code>.</p>",
        "matrix": matrix(INTERACTIVE + [("Busy", ' aria-busy="true"')], [
            ("Primary", '<button class="btn btn--primary" type="button"{a}>Register</button>',
             {"Busy": ' aria-busy="true"'}),
            ("Secondary", '<button class="btn btn--secondary" type="button"{a}>Cancel</button>'),
            ("Ghost", '<button class="btn btn--ghost" type="button"{a}>Sign in</button>'),
            ("Danger", '<button class="btn btn--danger" type="button"{a}>Delete</button>'),
            ("Link", '<button class="btn btn--link" type="button"{a}>Retry</button>', {"Busy": None}),
            ("Icon button", f'<button class="icon-button" type="button" aria-label="Close"{{a}}>{icon("x", "icon--lg")}</button>',
             {"Busy": None}),
        ]) + "<h3>Busy with spinner</h3>" + ex(
            f'<button class="btn btn--primary btn--lg" type="submit" aria-busy="true">{SPIN}Signing in…</button>'
            f'<button class="btn btn--primary btn--md" type="submit" aria-busy="true">{SPIN}Sending…</button>',
            "Busy keeps the button in place, adds a spinner and a present-participle label, and ignores further presses.", True),
        "themes": themes('<button class="btn btn--primary" type="button">Register</button>'
                         '<button class="btn btn--secondary" type="button">Message</button>'
                         '<button class="btn btn--ghost" type="button">Sign in</button>'
                         '<button class="btn btn--danger" type="button">Delete</button>'),
        "notes": """<ul>
<li><b>Busy</b> sets <code>aria-busy="true"</code>, shows the spinner icon and a "…ing" label ("Signing in…", "Sending…", "Saving…"). The rest of the form stays readable.</li>
<li><b>Disabled</b> uses the native attribute at 70% opacity. Prefer an enabled button that explains the problem when pressed; disable only while a request is in flight or when the reason is visible ("Full").</li>
<li><b>Pressed</b> toggles are <a href="chip.html">chips</a> with <code>aria-pressed</code>, not buttons.</li>
</ul>""",
    },
    "responsive": """<ul>
<li>Auth forms use <code>.btn--lg.btn--block</code> at every width: the submit is the whole point of the screen.</li>
<li>Dialog and drawer footers put Cancel and the primary side by side with <code>.btn--grow</code>; on phones the dialog becomes a bottom sheet and the footer stays one row.</li>
<li><code>.btn-row--stack</code> stacks buttons below <code>--layout-breakpoint-sm</code> (640px) and lays them in a row above it (empty states, profile hero).</li>
<li>Under <code>(pointer: coarse)</code> small buttons and icon buttons extend their hit area to 44 × 44px with an invisible pseudo-element, without changing their look.</li>
<li>Labels never truncate; a label that wraps at 360px is too long.</li>
</ul>""",
    "theming": """<p>The button reads semantic tokens through six component tokens declared on <code>.btn</code>: <code>--btn-bg</code>, <code>--btn-bg-hover</code>, <code>--btn-bg-active</code>, <code>--btn-fg</code>, <code>--btn-border</code>, <code>--btn-border-hover</code>. Each variant only reassigns them, so a re-skin overrides component tokens and never touches the rules.</p>
<pre><code>/* A partner event page with its own accent, without touching .btn */
.partner .btn--primary { --btn-bg: var(--color-highlight); --btn-fg: var(--color-fg-default); }</code></pre>
<p>In the dark theme the accent brightens from bordeaux 700 to 600 (hover 500, active 400) so the white label stays above 4.5:1 while the button still reads as bordeaux; the outline uses the dark border tokens and the focus ring turns borealis.</p>""",
    "accessibility": {
        "pattern": '<p>Native <code>&lt;button type="button"&gt;</code>, or <code>type="submit"</code> inside a form (<a href="https://www.w3.org/WAI/ARIA/apg/patterns/button/">APG Button</a>). A link styled as a button stays an <code>&lt;a href&gt;</code>; never a <code>&lt;div&gt;</code> with a click handler.</p>',
        "keys": [
            (kbd("Tab") + " / " + kbd("Shift", "Tab"), "Moves focus to and from the button in DOM order."),
            (kbd("Enter") + ", " + kbd("Space"), "Activates the button (Space on key up, so moving away cancels)."),
            (kbd("Esc"), "No effect on the button; in a dialog it closes the dialog, not the busy request."),
        ],
        "focus": "<p>The shared ring, 2px <code>--color-focus-ring</code> at 2px offset, shows on <code>:focus-visible</code> only. On brand panels and in the dark theme it is borealis, which stays above 3:1 against bordeaux and the dark surfaces.</p>",
        "labelling": "<p>The visible label is the accessible name. Icon buttons set <code>aria-label</code> with the verb (\"Close\", \"Dismiss\", \"Back to conversations\"). Busy buttons keep a visible label (\"Signing in…\") and set <code>aria-busy</code>; the form's live region announces the outcome.</p>",
        "pairs": [
            ("Label on primary", "--color-fg-on-accent", "--color-accent", 4.5),
            ("Label on primary, hover", "--color-fg-on-accent", "--color-accent-hover", 4.5),
            ("Label on danger", "--color-fg-on-danger", "--color-danger-solid", 4.5),
            ("Inverse label on white", "--color-fg-brand-inverse", "--color-bg-brand-inverse", 4.5),
            ("Focus ring on surface", "--color-focus-ring", "--color-bg-surface", 3),
            ("Focus ring on brand panel", "--color-focus-ring-on-dark", "--color-bg-brand", 3),
        ],
        "motion": "<p>Background, border and colour transition over <code>--duration-fast</code> (150ms). Reduced motion zeroes the duration in the tokens. The busy spinner stops rotating under reduced motion; the label still says what is happening.</p>",
        "touch": "<p>Default (44px) and large (52px) buttons meet the 44px target. Small and extra-small (36px) extend to 44 × 44px on coarse pointers, and sit at least 8px (<code>--space-2</code>) apart in rows.</p>",
    },
    "content": """<ul>
<li>Verb first, sentence case: "Register", "Send request", "Save changes", "Approve", "Create a profile". Never "OK", "Submit" or "Click here".</li>
<li>Name the object when context does not: "Save event" in the editor, "Save" in a row.</li>
<li>Busy labels use the present participle with an ellipsis character: "Saving…", "Sending…".</li>
<li>Destructive labels name what is lost: "Cancel registration", "Suspend Jordan", not "Confirm".</li>
<li>Keep it to three words where possible.</li>
</ul>""",
    "dodont": [
        ("do", '<button class="btn btn--secondary btn--grow" type="button">Cancel</button><button class="btn btn--primary btn--grow" type="button">Send request</button>',
         "One primary, placed last, with the safe action beside it (request-booking footer)."),
        ("dont", '<button class="btn btn--primary" type="button">Save</button><button class="btn btn--primary" type="button">Save and publish</button>',
         "Two primaries compete; make one secondary."),
        ("do", f'<button class="icon-button" type="button" aria-label="Close">{icon("x", "icon--lg")}</button>',
         "Icon-only buttons name the action with <code>aria-label</code>."),
        ("dont", '<button class="btn btn--primary btn--sm" type="button">OK</button>',
         "Vague labels: say what happens (\"Register\", \"Approve\")."),
    ],
    "tokens": [
        ("Primary background / hover / active", "--color-accent / --color-accent-hover / --color-accent-active", "color"),
        ("Primary label", "--color-fg-on-accent", "color"),
        ("Secondary border / hover", "--color-border-default / --color-border-strong", "color"),
        ("Ghost hover", "--color-bg-subtle", "color"),
        ("Danger background / hover", "--color-danger-solid / --color-danger-solid-hover", "color"),
        ("Danger label", "--color-fg-on-danger", "color"),
        ("Link label / hover", "--color-fg-link / --color-fg-link-hover", "color"),
        ("Inverse background / label", "--color-bg-brand-inverse / --color-fg-brand-inverse", "color"),
        ("Focus ring / on dark", "--color-focus-ring / --color-focus-ring-on-dark", "color"),
        ("Min-height sm / md / lg", "--control-height-sm / --control-height-md / --control-height-lg", "value"),
        ("Padding", "--space-2-5 / --space-5", "value"),
        ("Label size sm / default / md", "--font-size-sm / --font-size-ui / --font-size-md", "value"),
        ("Radius", "--radius-full", "value"),
        ("Disabled / busy opacity", "--opacity-disabled / --opacity-busy", "value"),
        ("Transition", "--duration-fast / --ease-standard", "value"),
    ],
    "code": {
        "snippet": f'''<button class="btn btn--primary btn--lg btn--block" type="submit">Sign in</button>

<button class="btn btn--primary btn--lg btn--block" type="submit" aria-busy="true">
  <svg class="icon icon--spin" viewBox="0 0 24 24" aria-hidden="true">…</svg>Signing in…
</button>

<div class="btn-row">
  <button class="btn btn--secondary btn--grow" type="button">Cancel</button>
  <button class="btn btn--primary btn--grow" type="submit">Send request</button>
</div>

<button class="icon-button" type="button" aria-label="Close">…</button>''',
        "classes": [
            ("<code>.btn</code>", "Base: 44px, 15px label, pill. Add a variant."),
            ("<code>.btn--primary</code> <code>.btn--secondary</code> <code>.btn--ghost</code> <code>.btn--danger</code> <code>.btn--link</code>", "Emphasis variants."),
            ("<code>.btn--inverse</code> <code>.btn--on-brand</code>", "Primary and secondary on bordeaux panels."),
            ("<code>.btn--xs</code> <code>.btn--sm</code> <code>.btn--md</code> <code>.btn--lg</code>", "Sizes; omit for the default."),
            ("<code>.btn--block</code> <code>.btn--grow</code> <code>.btn--quiet</code>", "Full width; share a row equally; borderless full-width text action."),
            ("<code>.btn-row</code> <code>.btn-row--stack</code> <code>.btn-grid</code>", "Button groupings: row, row that stacks on phones, two-column grid."),
            ("<code>.icon-button</code> <code>.icon-button--sm</code>", "Round icon-only button; requires <code>aria-label</code>."),
            ("<code>disabled</code> · <code>aria-busy=\"true\"</code>", "Disabled; busy (pair with the spinner icon and an \"…ing\" label)."),
            ("<code>data-state=\"hover|focus|active\"</code>", "Documentation and mocks only: forces a pointer or focus state."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/event-detail/default", "Register, Message"),
            mock("pages/sign-in/submitting", "large block submit, busy"),
            mock("dialogs/request-booking/default", "footer pair with grow"),
            mock("pages/admin-members/flagged", "inverse and on-brand on the report panel"),
            mock("pages/landing/default", "ghost Sign in, link styled as primary"),
            mock("notifications/toast/info", "icon button dismiss"),
        ],
        "drift": "Buttons were sized by padding alone (42.5px tall at the default size); they now have a 44px min-height from <code>--control-height-md</code>. Secondary buttons were 2px taller than primaries because only they had a border; every variant now has a 1px border (transparent unless outlined) and padding reduced by 1px, so all variants share a height. No mock had a danger, link or active state; they were added from the core set.",
    },
}
