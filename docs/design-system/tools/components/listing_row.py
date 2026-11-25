import re
from dslib import ex, icon, image, kbd, mock, themes


def vmatrix(variant, rows):
    """A state matrix for wide blocks: states down, one variant column. rows: (state, html or None)."""
    body = "".join(f'<tr><th scope="row">{st}</th><td>{"—" if h is None else h}</td></tr>' for st, h in rows)
    return (f'<div class="ds-matrix"><table><thead><tr><th scope="col">State</th><th scope="col">{variant}</th></tr></thead>'
            f'<tbody>{body}</tbody></table></div>')


VERIFIED = f'<span class="verified-mark" role="img" aria-label="Verified">{icon("badge-check")}</span>'


def follow(name, on=False, a=""):
    if on:
        return f'<button class="follow" type="button" aria-pressed="true"{a}>{icon("check")}Follow<span class="visually-hidden"> {name}</span></button>'
    return f'<button class="follow" type="button" aria-pressed="false"{a}>Follow<span class="visually-hidden"> {name}</span></button>'


def lrow(mark, name, tagline, area, hosting="1 hosting", verified=True, on=False, a="", fa=""):
    v = VERIFIED if verified else ""
    hcls = "listing-row__hosting listing-row__hosting--some" if hosting != "No events yet" else "listing-row__hosting"
    return (f'<li class="listing-row"><a class="listing-row__link" href="#"{a}>{mark}<span class="listing-row__body">'
            f'<span class="listing-row__name"><span>{name}</span>{v}</span><span class="listing-row__tagline">{tagline}</span>'
            f'<span class="listing-row__area listing-row__area--inline">{icon("map-pin", "icon--xs")}{area}</span></span>'
            f'<span class="listing-row__area listing-row__area--col">{icon("map-pin")}<span>{area}</span></span>'
            f'<span class="{hcls}">{hosting}</span></a>{follow(name, on, fa)}</li>')


LR = lrow('<span class="listing-mark" aria-hidden="true">LR</span>', "Lakeshore Runners Fellowship",
          "Beginner-friendly running club with a prayer at every finish", "Etobicoke", on=True)
CF = lrow('<span class="listing-mark" aria-hidden="true">CF</span>', "Christian Fitness", "Faith-first fitness community for the GTA", "Toronto-wide")
DO = lrow(image("trainer", "listing-mark listing-mark--person"), "Danielle Okafor", "Strength for women returning to fitness", "East York", on=True)
JW = lrow('<span class="listing-mark listing-mark--person" aria-hidden="true">JW</span>', "Rev. James Whitfield",
          "Pastor, speaker on rest and burnout", "Midtown", "No events yet")
NA = lrow('<span class="listing-mark" aria-hidden="true">NA</span>', "Northline Athletic", "Running shoes and gait analysis, Roncesvalles",
          "Roncesvalles", "No events yet", verified=False)


def group(title, blurb, rows):
    head = (f'<div class="directory-group__head"><h2 class="display section-title">{title}</h2>'
            f'<p class="directory-group__blurb">{blurb}</p></div>') if title else ""
    return f'<section class="directory-group">{head}<ul class="card card--list">{"".join(rows)}</ul></section>'


GROUPS = ('<div class="directory-groups">' + group("Organizations", "Clubs and groups that run events", [CF, LR])
          + group("People", "Speakers, pastors and community voices", [JW]) + "</div>")
MARKS = ('<div class="cluster"><span class="listing-mark listing-mark--sm" aria-hidden="true">NA</span>'
         '<span class="listing-mark" aria-hidden="true">LR</span><span class="listing-mark listing-mark--xl" aria-hidden="true">LR</span>'
         '<span class="listing-mark listing-mark--person listing-mark--sm" aria-hidden="true">MC</span>'
         '<span class="listing-mark listing-mark--person" aria-hidden="true">JW</span>'
         + image("trainer", "listing-mark listing-mark--person listing-mark--xl") + "</div>")


def head(mark, kind, name, sub, verified=True, on=True):
    v = f'<span class="listing-head__verified">· {icon("badge-check")} Verified</span>' if verified else ""
    btn = (f'<button class="follow follow--lg" type="button" aria-pressed="true">{icon("check")}Follow<span class="visually-hidden"> {name}</span></button>'
           if on else f'<button class="follow follow--lg" type="button" aria-pressed="false">Follow<span class="visually-hidden"> {name}</span></button>')
    return (f'<header class="listing-head"><div class="listing-head__who">{mark}<div class="listing-head__body">'
            f'<p class="eyebrow listing-head__kind">{kind}{v}</p><h2 class="display detail-title listing-head__name">{name}</h2>'
            f'<p class="subtitle">{sub}</p></div></div><div class="listing-head__actions">{btn}'
            '<a class="btn btn--secondary btn--md" href="#">Message</a></div></header>')


HEAD_ORG = head('<span class="listing-mark listing-mark--xl" aria-hidden="true">LR</span>', "Organization", "Lakeshore Runners Fellowship",
                "Beginner-friendly running club with a prayer at every finish")
HEAD_PERSON = head(image("trainer", "listing-mark listing-mark--person listing-mark--xl"), "Instructor", "Danielle Okafor",
                   "Strength for women returning to fitness")
HEAD_UNVERIFIED = head('<span class="listing-mark listing-mark--xl" aria-hidden="true">NA</span>', "Company", "Northline Athletic",
                       "Running shoes and gait analysis, Roncesvalles", verified=False, on=False)
LOADING = ('<section class="directory-group" aria-busy="true" aria-label="Loading listings"><span class="skeleton skeleton--title w-20"></span>'
           '<ul class="card card--list"><li class="listing-row"><div class="listing-row__link"><span class="skeleton skeleton--avatar skeleton--square"></span>'
           '<div class="listing-row__body skeleton-stack"><span class="skeleton skeleton--text w-40"></span><span class="skeleton skeleton--text-sm w-80"></span></div></div>'
           '<span class="skeleton skeleton--button-sm"></span></li></ul></section>')


def one(row):
    return f'<ul class="card card--list">{row}</ul>'


SPEC = {
    "lead": "The directory lists the churches, clubs, coaches and companies behind every event. A listing row names one and lets people follow it; the listing head opens its profile.",
    "meta": ["Status: new", "Link plus toggle button per row", "Member app"],
    "overview": """<ul>
<li><b>Listing mark</b> (<code>.listing-mark</code>): a listing's picture. Organizations, companies and ministries are initials on a dark rounded square; people (<code>--person</code>) are round, a photo or blush initials. Sizes <code>--sm</code> (40px), default (48px), <code>--xl</code> (112px).</li>
<li><b>Directory groups</b> (<code>.directory-groups</code> of <code>.directory-group</code>): the directory by kind, each with a heading and a one-line blurb; one ungrouped list when a kind chip is chosen.</li>
<li><b>Listing row</b> (<code>.listing-row</code>): a link (mark, name, <a href="host-card.html">verified mark</a>, tagline, area, how many events it hosts) and a <a href="follow-button.html">follow button</a> beside it.</li>
<li><b>Listing head</b> (<code>.listing-head</code>): the top of a listing's profile: big mark, kind and Verified, name, tagline, Follow and Message.</li>
</ul>
<p>The profile's facts (area, website, followers) are a <a href="description-list.html#variants">key facts list</a>; what the listing hosts are <a href="host-card.html">hosting rows</a>. Professionals people book are <a href="list.html">service rows</a>, not listings.</p>""",
    "anatomy": {
        "figure": '<div class="w-90" style="contain: inline-size">' + one(re.sub(r'<span class="listing-row__area listing-row__area--col">.*?</span></span>|<span class="listing-row__hosting[^"]*">[^<]*</span>', "", LR)) + "</div>",
        "callouts": [(7, 43), (40, 24), (40, 66), (93, 43)],
        "parts": [
            ("Mark", "48px listing mark, <code>aria-hidden</code> (the name follows)."),
            ("Name and verified mark", "Semibold, one line with ellipsis; the <a href=\"host-card.html\">verified mark</a> after it."),
            ("Tagline and area", "One muted line with ellipsis; below 768px the area follows on its own line (<code>__area--inline</code>). From 768px the area moves to a 9rem column (<code>__area--col</code>) and from 1024px a 7rem hosting column appears (<code>__hosting</code>, accent <code>--some</code> for \"1 hosting\"); see Variants. They are left out of this figure, which is narrower than the page."),
            ("Follow", "A toggle beside the link, never inside it: \"Follow\", pressed or not (<code>aria-pressed</code>, check icon when on)."),
        ],
    },
    "variants": "<h3>Listing marks</h3>"
    + ex(MARKS, "Organization <code>--sm</code>, default, <code>--xl</code>; person <code>--sm</code>, default and a photo <code>--xl</code>.", True)
    + "<h3>Directory groups</h3>"
    + ex(GROUPS, "Grouped by kind with a blurb (directory/default). Followed and not; hosting and not.", True, mod="block")
    + ex('<div class="directory-groups">' + group("", "", [DO]) + "</div>", "One kind chosen: one list, no group heading (directory/filtered).", True, mod="block")
    + "<h3>Listing head</h3>"
    + ex(HEAD_ORG, "An organization the member follows (listing-profile/default).", True, mod="block")
    + ex(HEAD_PERSON, "An instructor: round photo (listing-profile/person).", True, mod="block")
    + ex(HEAD_UNVERIFIED, "Not verified and not followed: no Verified, the primary Follow (listing-profile/unverified).", True, mod="block"),
    "sizes": "<p>Marks: <code>--sm</code> 40px (<code>--size-avatar-md</code>) in mini rows, default 48px (<code>--size-avatar-xl</code>) in rows and host cards, <code>--xl</code> 112px (<code>--size-avatar-3xl</code>) in the head. Initials are 36% of the mark. Rows are 16px padded, 20px from 640px; the head's name is <code>--font-size-4xl</code>, <code>--font-size-6xl</code> from 640px.</p>",
    "states": {
        "intro": "<p>The row's link takes hover (<code>data-state=\"hover\"</code>: canvas fill) and focus; the follow button has its own states (<code>aria-pressed</code>, see <a href=\"follow-button.html\">Follow button</a>). Rows have no disabled state.</p>",
        "matrix": vmatrix("Listing row", [
            ("Default", one(CF)),
            ("Hover", one(CF.replace('class="listing-row__link" href="#"', 'class="listing-row__link" href="#" data-state="hover"'))),
            ("Focus on link", one(CF.replace('class="listing-row__link" href="#"', 'class="listing-row__link" href="#" data-state="focus"'))),
            ("Followed", one(LR)),
            ("Not verified, no events", one(NA)),
            ("Active", None), ("Disabled", None),
        ])
        + "<h3>Loading, empty, no results, error</h3>"
        + ex(LOADING, "Loading: group title and row skeletons; the heading, search and chips are already there (directory/loading).", True, mod="block")
        + "<p>No listings, no results for a search (\"aquafit\") and a failed load use the <a href=\"empty-state.html\">empty state</a> under the kind chips (directory/empty, no-results, error). A failed Follow puts the button back to Follow and shows a <a href=\"toast.html\">toast</a> (directory/follow-failed).</p>",
        "themes": themes(MARKS) + '<div data-theme="dark">' + ex(GROUPS, "Directory groups in the dark theme.", mod="block")
        + ex(HEAD_ORG, "Listing head in the dark theme.", mod="block") + "</div>",
        "notes": "<ul><li>Hover fills the row and turns the name accent; the matrix shows both through the <code>data-state=\"hover\"</code> hook.</li><li>\"1 hosting\" is accent and semibold, \"No events yet\" muted: the words differ, so colour is not the only cue.</li></ul>",
    },
    "responsive": """<ul>
<li><b>Below 768px</b>: mark, name, tagline and the area inline under it; Follow on the right.</li>
<li><b>From 768px</b> (<code>--layout-breakpoint-md</code>): the area moves to its own 9rem column.</li>
<li><b>From 1024px</b> (<code>--layout-breakpoint-lg</code>): the 7rem hosting column appears.</li>
<li><b>Listing head</b>: stacked on phones with Follow and Message sharing the width; from 768px the actions sit right, aligned to the bottom of the name.</li>
<li>The kind chips above scroll sideways on phones (<a href="chip.html">chip bar, scroll</a>).</li>
</ul>""",
    "theming": "<p>Organization marks are <code>--color-bg-inverse</code>/<code>--color-fg-inverse</code> (light on dark in the light theme, dark on light in the dark theme); people's <code>--color-accent-subtle</code>/<code>--color-fg-accent</code>. Rows sit on the card surface and hover to <code>--color-bg-canvas</code>. Taglines, areas and blurbs are <code>--color-fg-muted</code>; \"1 hosting\" and the verified marks <code>--color-fg-accent</code>. The head's rule is <code>--color-border-default</code>.</p>",
    "accessibility": {
        "pattern": "<p>Each group is a <code>&lt;section&gt;</code> with an <code>&lt;h2&gt;</code> and a <code>&lt;ul&gt;</code>. A row holds two siblings: the link to the profile and a toggle button (<a href=\"https://www.w3.org/WAI/ARIA/apg/patterns/button/\">APG Button, toggle</a>) whose hidden text names the listing (\"Follow Christian Fitness\"). The head's name is the page's <code>&lt;h1&gt;</code>.</p>",
        "keys": [
            (kbd("Tab"), "Link, then its Follow button, then the next row."),
            (kbd("Enter"), "Opens the listing."),
            (kbd("Space") + ", " + kbd("Enter"), "Follows or unfollows."),
        ],
        "focus": "<p>The shared ring wraps the link area (not the Follow button), and the button draws its own pill ring.</p>",
        "labelling": "<p>The row reads: name, Verified, tagline, area (inline area hidden from 768px and the column read instead, never both), hosting. Marks are <code>aria-hidden</code> or decorative images (<code>alt=\"\"</code>).</p>",
        "pairs": [
            ("Name", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Tagline, area, blurb", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("1 hosting", "--color-fg-accent", "--color-bg-surface", 4.5),
            ("Name on hover fill", "--color-fg-accent", "--color-bg-canvas", 4.5),
            ("Organization initials", "--color-fg-inverse", "--color-bg-inverse", 4.5),
            ("Person initials", "--color-fg-accent", "--color-accent-subtle", 4.5),
            ("Head Verified text", "--color-fg-muted", "--color-bg-canvas", 4.5),
        ],
        "motion": "<p>Background over <code>--duration-fast</code>; none under reduced motion.</p>",
        "touch": "<p>The link is the full row height (at least 80px). Follow is 36px tall and extends to a 44px target on coarse pointers.</p>",
    },
    "content": """<ul>
<li>Names as the listing writes them (\"Rev. James Whitfield\", \"Faith &amp; Footwork\"); taglines are one line about what they do.</li>
<li>Kinds and blurbs: \"Organizations · Clubs and groups that run events\", \"Instructors · Certified coaches who lead sessions\".</li>
<li>Hosting: \"1 hosting\", \"No events yet\". Area: a neighbourhood or \"Toronto-wide\".</li>
<li>Head eyebrow: kind, then \"· Verified\" for verified listings.</li>
</ul>""",
    "dodont": [
        ("do", one(CF), "Follow sits beside the link and names the listing in hidden text."),
        ("dont", '<ul class="card card--list"><li class="listing-row"><a class="listing-row__link" href="#"><span class="listing-mark" aria-hidden="true">CF</span>'
         '<span class="listing-row__body"><span class="listing-row__name"><span>Christian Fitness</span></span></span>'
         '<span class="follow">Follow</span></a></li></ul>', "Follow inside the link: a control nested in a link cannot be reached or announced."),
        ("do", '<span class="listing-mark listing-mark--person" aria-hidden="true">JW</span><span class="listing-mark" aria-hidden="true">LR</span>',
         "People are round, organizations square: the shape tells them apart, not only the colour."),
        ("dont", '<span class="listing-mark" aria-hidden="true">JW</span><span class="listing-mark" aria-hidden="true">LR</span>',
         "A person drawn as an organization's square."),
    ],
    "tokens": [
        ("Organization mark", "--color-bg-inverse / --color-fg-inverse", "color"),
        ("Person mark", "--color-accent-subtle / --color-fg-accent", "color"),
        ("Row hover", "--color-bg-canvas", "color"),
        ("Tagline, area, blurb", "--color-fg-muted", "color"),
        ("Hosting some, verified", "--color-fg-accent", "color"),
        ("Head rule", "--color-border-default", "color"),
        ("Mark sizes", "--size-avatar-md / --size-avatar-xl / --size-avatar-3xl", "value"),
        ("Mark radius", "--radius-md / --radius-lg / --radius-full", "value"),
        ("Row padding", "--space-4 / --space-5", "value"),
        ("Group spacing", "--space-8 / --space-10", "value"),
        ("Head name", "--font-size-4xl / --font-size-6xl", "value"),
    ],
    "code": {
        "snippet": '''<div class="directory-groups">
  <section class="directory-group">
    <div class="directory-group__head"><h2 class="display section-title">Organizations</h2><p class="directory-group__blurb">Clubs and groups that run events</p></div>
    <ul class="card card--list">
      <li class="listing-row">
        <a class="listing-row__link" href="/directory/christian-fitness">
          <span class="listing-mark" aria-hidden="true">CF</span>
          <span class="listing-row__body">
            <span class="listing-row__name"><span>Christian Fitness</span><span class="verified-mark" role="img" aria-label="Verified">…</span></span>
            <span class="listing-row__tagline">Faith-first fitness community for the GTA</span>
            <span class="listing-row__area listing-row__area--inline"><svg class="icon icon--xs" aria-hidden="true">…</svg>Toronto-wide</span>
          </span>
          <span class="listing-row__area listing-row__area--col"><svg class="icon" aria-hidden="true">…</svg><span>Toronto-wide</span></span>
          <span class="listing-row__hosting listing-row__hosting--some">1 hosting</span>
        </a>
        <button class="follow" type="button" aria-pressed="false">Follow<span class="visually-hidden"> Christian Fitness</span></button>
      </li>
    </ul>
  </section>
</div>''',
        "classes": [
            ("<code>.listing-mark</code> <code>--person</code> <code>--sm</code> <code>--xl</code>", "A listing's picture: shape by kind, three sizes; also on an <code>&lt;img&gt;</code>."),
            ("<code>.directory-groups</code> <code>.directory-group</code> <code>__head</code> <code>__blurb</code>", "Groups by kind."),
            ("<code>.listing-row</code> <code>__link</code> <code>__body</code> <code>__name</code> <code>__tagline</code>", "Row and its link."),
            ("<code>__area--inline</code> <code>__area--col</code> <code>__hosting</code> <code>__hosting--some</code>", "Area (inline below 768px, column from it) and hosting (from 1024px)."),
            ("<code>.listing-head</code> <code>__who</code> <code>__body</code> <code>__kind</code> <code>__verified</code> <code>__name</code> <code>__actions</code>", "Profile head."),
            ("<code>data-state=\"hover|focus\"</code> on <code>__link</code>", "Documentation hooks."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/directory/default", "groups, rows, follow"),
            mock("pages/directory/filtered", "one kind, no group head"),
            mock("pages/directory/search", "search results, still grouped"),
            mock("pages/directory/loading", "skeleton rows"),
            mock("pages/directory/no-results", "no results"),
            mock("pages/directory/empty", "no listings"),
            mock("pages/directory/error", "error"),
            mock("pages/directory/follow-failed", "follow failed"),
            mock("pages/listing-profile/default", "listing head, marks sm and xl"),
            mock("pages/listing-profile/person", "person head"),
            mock("pages/listing-profile/unverified", "unverified head"),
            mock("pages/listing-profile/loading", "head skeleton"),
        ],
        "drift": """<ul>
<li>The listing profile's loading skeleton draws the mark at 96px (<code>.skeleton--avatar-2xl</code>) while the loaded <code>.listing-mark--xl</code> is 112px: the head shifts on load. Proposed: a skeleton sized from <code>--size-avatar-3xl</code>.</li>
<li>Fixed: the name's hover colour gained a <code>data-state="hover"</code> hook.</li>
<li>The key facts list on the profile is documented once, on <a href="description-list.html">Description list</a>, beside the spec list it resembles.</li>
</ul>""",
    },
}
