from dslib import ex, kbd, matrix, mock, seal, themes

LOCK = (f'<a class="lockup" href="#top">{seal("lockup", decorative=True)}<span class="lockup__name">Christian Fitness</span></a>')
LIGHT = (f'<a class="lockup lockup--light" href="#top">{seal("lockup", light=True, decorative=True)}<span class="lockup__name">Christian Fitness</span></a>')
# Shown as it renders below 28rem; the page itself is wider, so the wordmark is hidden explicitly.
COMPACT = (f'<a class="lockup lockup--compact" href="#top">{seal("lockup", decorative=True)}<span class="lockup__name visually-hidden">Christian Fitness</span></a>')

SPEC = {
    "lead": "The seal and wordmark together are Christian Fitness: a cross inside a ring, beside the name in condensed italic capitals.",
    "meta": ["Status: stable", "Inline SVG", "Brand"],
    "overview": """<p>The lockup pairs the seal (a bordeaux cross in a ring) with the wordmark. The seal also appears alone at larger sizes with its ring lettering: "Christian Fitness · Health · Energy · Abundant life".</p>
<ul>
<li><b>Lockup</b>: top bar and site header, linking home.</li>
<li><b>Light lockup</b> (<code>.lockup--light</code>): on bordeaux or dark chrome; the cross turns gold.</li>
<li><b>Compact lockup</b> (<code>.lockup--compact</code>): the member top bar's. Below 28rem (448px) the seal stands alone in a 44 × 44px link and the wordmark stays in it as visually hidden text (ADR 0084).</li>
<li><b>Seal sizes</b>: lockup (small), sign-in, verse band, hero.</li>
</ul>""",
    "anatomy": {
        "figure": LOCK,
        "callouts": [(8, 50), (60, 50)],
        "parts": [("Seal", "Inline SVG ring and cross, <code>aria-hidden</code> inside the lockup."), ("Wordmark", "<code>.lockup__name</code>, Barlow Condensed italic, uppercase, 20px.")],
    },
    "variants": ex(LOCK, "Default, on light surfaces.", True) + ex(LIGHT, "Light, on brand panels and admin chrome.", True, mod="brand")
    + ex(COMPACT, "Compact, as the member top bar shows it below 28rem: the seal alone, the wordmark visually hidden.", True),
    "sizes": ex(seal("lockup", uid="s1") + seal("signin", uid="s2") + seal("verse", uid="s3") + seal("hero", uid="s4"),
                "Lockup · sign-in · verse · hero. The two small sizes drop the ring text; the two large carry it.", True),
    "states": {
        "intro": "<p>As a link the lockup has focus; it has no hover change.</p>",
        "matrix": matrix([("Default", ""), ("Focus", ' data-state="focus"')], [
            ("Lockup", '<a class="lockup" href="#top"{a}>' + seal("lockup", decorative=True) + '<span class="lockup__name">Christian Fitness</span></a>'),
        ]),
        "themes": themes(LOCK),
        "notes": "<p>The cross uses <code>--color-fg-accent</code>, so it brightens in dark theme.</p>",
    },
    "responsive": "<p>The default and light lockups never shrink or drop their wordmark. The compact lockup, used only by the member <a href=\"top-bar.html\">top bar</a>, shows the seal alone below 28rem (448px), where the bell, the profile button and Sign out need the room: the wordmark stays in the link as visually hidden text, so the link is still named \"Christian Fitness\", and the link is 44 × 44px. The bar then fits at 320px without the page scrolling sideways (ADR 0084).</p>",
    "theming": "<p>Ring and wordmark read <code>currentColor</code> (<code>--color-fg-default</code>); the cross reads <code>--color-fg-accent</code>. The light variant uses <code>--color-fg-on-brand</code> and <code>--color-highlight</code>.</p>",
    "accessibility": {
        "pattern": "<p>In the lockup the seal is decorative and the wordmark names the link. A standalone seal has <code>role=\"img\"</code> and <code>aria-label=\"Christian Fitness\"</code>.</p>",
        "keys": [(kbd("Enter"), "Follows the home link.")],
        "focus": "<p>Ring offset 4px; on dark, <code>--color-focus-ring-on-dark</code>.</p>",
        "labelling": "<p>Link name \"Christian Fitness\" from the wordmark text, also in the compact lockup, where that text is visually hidden.</p>",
        "pairs": [("Wordmark", "--color-fg-default", "--color-bg-surface", 4.5), ("Light wordmark", "--color-fg-on-brand", "--color-bg-brand", 4.5),
                  ("Cross", "--color-fg-accent", "--color-bg-surface", 3)],
        "motion": "<p>None.</p>",
        "touch": "<p>The lockup link is 44px tall; the compact lockup's seal-only link is 44 × 44px.</p>",
    },
    "content": "<ul><li>Always \"Christian Fitness\"; never abbreviated to CF in the product.</li><li>The ring text is fixed.</li></ul>",
    "dodont": [
        ("do", LOCK, "Seal and wordmark together, default colours."),
        ("dont", '<a class="lockup" href="#top"><span class="lockup__name">CF Fitness</span></a>', "Renaming or dropping the seal."),
        ("do", LIGHT, "Light lockup on brand panels."),
        ("dont", '<a class="lockup" href="#top">' + seal("lockup", uid="dd") + "</a>", "A seal-only home link made by hand; keep the wordmark beside the seal, or use the compact lockup, which keeps it in the link."),
    ],
    "tokens": [("Ring / wordmark", "--color-fg-default", "color"), ("Cross", "--color-fg-accent", "color"),
               ("Light / cross", "--color-fg-on-brand / --color-highlight", "color"),
               ("Seal sizes", "--size-seal-lockup / --size-seal-signin / --size-seal-verse / --size-seal-hero", "value"),
               ("Wordmark", "--font-size-xl", "value")],
    "code": {"snippet": '''<a class="lockup" href="/home">
  <svg class="seal seal--lockup" viewBox="0 0 200 200" aria-hidden="true">…</svg>
  <span class="lockup__name">Christian Fitness</span>
</a>''',
             "classes": [("<code>.lockup</code> <code>.lockup--light</code>", "Lockup; light variant."),
                         ("<code>.lockup--compact</code>", "Member top bar only: below 28rem the seal alone, with the wordmark visually hidden."), ("<code>.lockup__name</code>", "Wordmark."),
                         ("<code>.seal</code> <code>.seal--lockup|signin|verse|hero</code> <code>.seal--light</code>", "Seal and sizes.")]},
    "sources": {"mocks": [mock("pages/home/default", "lockup"), mock("pages/landing/default", "hero and verse seals"),
                          mock("pages/sign-in/default", "sign-in seal"), mock("pages/admin-dashboard/default", "light seal")],
                "drift": "The wordmark was 22px; it snaps to <code>--font-size-xl</code> (20px)."},
}
