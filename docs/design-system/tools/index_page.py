"""index.html: entry page linking every foundation, component and pattern."""
import build

START = [("foundations/color.html", "Color", "Bordeaux, borealis, stone and contrast."),
         ("foundations/typography.html", "Typography", "Barlow, Barlow Condensed and the scale."),
         ("foundations/layout.html", "Layout", "Breakpoints, grid and page templates."),
         ("components/button.html", "Button", "The most used component."),
         ("components/form-field.html", "Form field", "How every input is labelled."),
         ("components/dialog.html", "Dialog", "Dialogs and mobile sheets.")]


def cards(items):
    return '<div class="ds-cards">' + "".join(
        f'<a class="ds-card" href="{href}"><b>{name}</b><span>{blurb}</span></a>' for href, name, blurb in items) + "</div>"


def render():
    found = [(f"foundations/{s}.html", n, b) for s, n, b in build.FOUNDATIONS]
    comps = ""
    for g in build.COMPONENT_GROUPS:
        comps += f"<h3>{g}</h3>" + cards([(f"components/{s}.html", n, b) for s, n, gg, b in build.COMPONENTS if gg == g])
    pats = [(f"patterns/{s}.html", n, b) for s, n, b in build.PATTERNS]
    body = "\n".join([
        build.section("start", cards(START), "Start here"),
        build.section("foundations", cards(found), "Foundations"),
        build.section("components", comps, "Components"),
        build.section("patterns", cards(pats), "Patterns"),
        build.section("how", """<ol>
<li>Link <code>tokens/tokens.css</code> once as a global foundation; it self-hosts the fonts.</li>
<li>Use the BEM blocks from <code>assets/components.css</code>; in Angular each component's encapsulated stylesheet keeps the block name and reads tokens by role.</li>
<li>States assistive technology needs are attributes (<code>aria-current</code>, <code>aria-pressed</code>, <code>aria-invalid</code>, <code>aria-busy</code>, <code>disabled</code>); style through them.</li>
<li>Generate platform constants from <code>tokens/tokens.json</code> (DTCG).</li>
<li>Change the system in <code>tools/</code> and <code>tokens/</code>, then run <code>python3 docs/design-system/tools/build.py</code> and the checkers (see README).</li>
</ol>""", "How to use"),
        build.section("provenance", f'<p>Extracted on {build.EXTRACTED} from <a href="../mocks/index.html">the HTML mocks</a> (131 mocks, 28 screens), whose light values come 1:1 from the Magic Patterns prototype. The mocks now render with these tokens and components. Drift corrected during extraction is listed in <a href="README.md">README.md</a>.</p>', "Provenance"),
    ])
    ids = ["start", "foundations", "components", "patterns", "how", "provenance"]
    head = build.header("Design system", "Christian Fitness",
                        "Tokens, components and patterns for a Christian community for health in body and spirit: the member app and the admin console, in light and dark, to WCAG 2.2 AA.",
                        ids, ["WCAG 2.2 AA", f"{len(build.COMPONENTS)} components", f"{len(build.PATTERNS)} patterns", "Light and dark"])
    return build.page(title="Overview", description="The Christian Fitness design system.", header=head, body=body, depth=0)
