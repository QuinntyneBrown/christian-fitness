from dslib import ex, icon, kbd, mock, themes

SPIN = icon("loader", "icon--spin")
CHECKS = [("credentials", "Credentials", "Certification or registration number verified with the issuing body"),
          ("insurance", "Insurance", "Liability coverage on file, where the work calls for it"),
          ("references", "Two references", "At least one from a church or ministry leader"),
          ("conversation", "Conversation", "A call with our team about faith and how they work")]


def check(i, uid, on=False, disabled=False, a=""):
    k, label, desc = CHECKS[i]
    return (f'<label class="check-row"{a}><input class="check-row__box" type="checkbox" name="{uid}" value="{k}"{" checked" if on else ""}{" disabled" if disabled else ""}>'
            f'<span><span class="check-row__label">{label}</span><span class="check-row__desc">{desc}</span></span></label>')


def view(uid="sg", passed=3, decided="", busy=False):
    checks = "".join(f"<li>{check(i, uid, i < passed, bool(decided) or busy)}</li>" for i in range(4))
    if decided:
        foot = ('<p class="suggestion__result" role="status">' + ("Approved. We’ve sent them a link to claim and publish their listing." if decided == "approved"
                else "Declined. The person who suggested it has been told.") + "</p>"
                + ('<button class="btn btn--secondary btn--md" type="button">Send a new link</button>' if decided == "approved" else ""))
    else:
        ok = passed == 4
        approve = (f'<button class="btn btn--primary btn--md" type="submit" disabled aria-busy="true">{SPIN}Approving…</button>' if busy
                   else '<button class="btn btn--primary btn--md" type="submit"' + ("" if ok else f' disabled aria-describedby="{uid}-hint"') + ">Approve listing</button>")
        foot = (approve + f'<button class="btn btn--secondary btn--md" type="button"{" disabled" if busy else ""}>Decline</button>'
                + ("" if ok else f'<p class="suggestion__hint" id="{uid}-hint">Approve unlocks when all four checks pass.</p>'))
    return (f'<form class="card card--pad suggestion" novalidate aria-label="Suggestion ({uid})" style="width: 100%;">'
            '<p class="eyebrow eyebrow--sm">Instructor</p><h3 class="suggestion__name">Coach Marcus Delaney</h3>'
            '<p class="muted">Mississauga · <a class="link link--ink" href="https://delaneyperformance.ca" target="_blank" rel="noopener noreferrer">'
            f'delaneyperformance.ca {icon("external-link", "icon--xs")}<span class="visually-hidden"> (opens in a new tab)</span></a></p>'
            '<blockquote class="suggestion__note"><p>I run speed and agility for youth athletes and lead a men’s Bible study at Hope Church. Looking to list my Saturday clinics.</p></blockquote>'
            '<p class="suggestion__by">Submitted by the listing themselves</p>'
            '<fieldset class="suggestion__checks"><div class="section-head"><legend class="display section-title">Checks</legend>'
            f'<p class="section-head__note">{passed} of 4 passed</p></div><ul class="list-divided">{checks}</ul></fieldset>'
            f'<div class="suggestion__foot">{foot}</div></form>')


LISTED = ('<div class="table-wrap table-wrap--flush"><table class="table"><caption class="visually-hidden">Listed</caption>'
          '<thead><tr><th scope="col">Listing</th><th scope="col">Kind</th><th scope="col">Area</th><th scope="col" class="table__end">Followers</th>'
          '<th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead><tbody>'
          '<tr><td><span class="listed-cell"><span class="listing-mark listing-mark--sm" aria-hidden="true">CF</span><span class="table__strong">Christian Fitness</span>'
          f'<span class="verified-mark" role="img" aria-label="Verified">{icon("badge-check")}</span></span></td>'
          '<td class="table__nowrap">Organization</td><td class="table__nowrap muted">Greater Toronto Area</td><td class="table__end">6,812</td>'
          '<td class="table__end"><button class="row-link" type="button">Edit<span class="visually-hidden"> Christian Fitness</span></button></td></tr>'
          '<tr><td><span class="listed-cell"><span class="listing-mark listing-mark--person listing-mark--sm" aria-hidden="true">TG</span><span class="table__strong">Tasha Grant</span></span></td>'
          '<td class="table__nowrap">Instructor</td><td class="table__nowrap muted">North York</td><td class="table__end">214</td>'
          '<td class="table__end"><button class="row-link" type="button">Edit<span class="visually-hidden"> Tasha Grant</span></button></td></tr>'
          '</tbody></table></div>')
def change_cell(what="name", value="Eastside Women’s Strength", a="", disabled=False):
    """The listed cell's change variant alone: `a` goes on Approve (a data-state hook); `disabled` holds both actions."""
    d = " disabled" if disabled else ""
    return ('<span class="listed-cell listed-cell--change"><span class="listing-mark listing-mark--sm" aria-hidden="true">EL</span>'
            '<span class="table__strong">Eastside Ladies Who Lift</span>'
            f'<span class="verified-mark" role="img" aria-label="Verified">{icon("badge-check")}</span>'
            f'<span class="listed-cell__change"><span>New {what} waiting: <span class="listed-cell__new">{value}</span></span>'
            f'<button class="listed-cell__action" type="button"{a}{d}>Approve<span class="visually-hidden"> the new {what} of Eastside Ladies Who Lift</span></button>'
            f'<button class="listed-cell__action" type="button"{d}>Decline<span class="visually-hidden"> the new {what} of Eastside Ladies Who Lift</span></button></span></span>')


def change_table(cell):
    return ('<div class="table-wrap table-wrap--flush"><table class="table"><caption class="visually-hidden">Listed</caption>'
            '<thead><tr><th scope="col">Listing</th><th scope="col">Kind</th><th scope="col" class="table__end">Followers</th></tr></thead><tbody>'
            f'<tr><td>{cell}</td><td class="table__nowrap">Organization</td><td class="table__end">41</td></tr>'
            '</tbody></table></div>')


LISTED_CHANGE = change_table(change_cell())
CELL_W = '<div style="width: 100%; min-width: 18rem; max-width: 26rem;">{c}</div>'
ROW = '<div style="width: 100%; min-width: 18rem; max-width: 26rem;"><ul class="list-divided">{c}</ul></div>'


def grid(cols, rows):
    head = "".join(f'<th scope="col">{c}</th>' for c in cols)
    body = "".join(f'<tr><th scope="row">{label}</th>' + "".join("<td>—</td>" if c is None else f"<td>{c}</td>" for c in cells) + "</tr>"
                   for label, cells in rows)
    return f'<div class="ds-matrix"><table><thead><tr><th scope="col">Variant</th>{head}</tr></thead><tbody>{body}</tbody></table></div>'


SPEC = {
    "lead": "A suggestion is a listing a member proposed for the directory, with the four checks staff record before it can be approved.",
    "meta": ["Status: new", "Admin console", "<code>&lt;form&gt;</code> with checkbox rows"],
    "overview": """<p>On Listings, staff pick a suggestion from the <a href="pick-list.html">light pick cards</a> and work through it here: who it is, what the member said, who suggested it, and four checks. <b>Approve listing</b> stays disabled until all four pass, and says why.</p>
<ul>
<li><b>Suggestion</b> (<code>.card.card--pad.suggestion</code>): kind eyebrow, name, area and website, the note as a quote, who sent it, the checks, then the decision.</li>
<li><b>Check row</b> (<code>.check-row</code>): a large checkbox with a label and the standard it stands for.</li>
<li><b>Listed cell</b> (<code>.listed-cell</code>): in the Listed tab's <a href="table.html">table</a>, the listing's mark, name and verified mark on one line.</li>
</ul>
<p>Use check rows only for a short fixed checklist that gates one action. Settings that apply at once are <a href="switch.html">switches</a>; choices in a form are <a href="checkbox.html">checkboxes</a>.</p>""",
    "anatomy": {
        "figure": view("an"),
        "callouts": [(8, 6), (20, 11), (30, 16), (50, 28), (20, 38), (90, 45), (12, 58), (14, 92)],
        "parts": [
            ("Kind", "<code>.eyebrow--sm</code>: Instructor, Organization, Company."),
            ("Name", "<code>.suggestion__name</code>: 24px bold."),
            ("Area and website", "Muted line; the website opens in a new tab and says so."),
            ("Note", "<code>.suggestion__note</code>: the member's words as a <code>&lt;blockquote&gt;</code> with a left rule."),
            ("By", "<code>.suggestion__by</code>: who suggested it and how they know them."),
            ("Progress", "\"3 of 4 passed\" beside the Checks legend."),
            ("Check row", "<code>.check-row</code>: 28px checkbox, label, standard."),
            ("Decision", "<code>.suggestion__foot</code>: Approve listing, Decline and the hint, or the result."),
        ],
    },
    "variants": "<h3>Waiting</h3>" + ex(view("v1"), "Three of four checks: Approve listing is disabled and the hint says why (listings default).")
    + "<h3>Ready</h3>" + ex(view("v2", passed=4), "All four passed: Approve listing is available (listings ready).")
    + "<h3>Decided</h3>" + ex(view("v3", passed=4, decided="approved") + view("v4", decided="declined"),
                              "The decision replaces the buttons with a status line; the checks lock (approved, declined). "
                              "While a claim link is open or expired, Send a new link follows the line and reads “Sending…”, "
                              "disabled and <code>aria-busy</code>, while it waits (ADR 0092; resending).", mod="stack")
    + "<h3>Listed cell</h3>" + ex(LISTED, "Mark, name and verified mark in the Listed table.", True)
    + "<h3>Listed cell, change</h3>" + ex(LISTED_CHANGE, "<code>.listed-cell--change</code>: a name or kind the owner asked for waits on its own line under the live name, "
                                         "lined up with it, with Approve and Decline named for the listing. While a decision is on its way both are <code>disabled</code> "
                                         "(ADR 0095; listings change-waiting).", True),
    "sizes": "<p>One size. The card has 24px padding, 32px from 640px. Check rows are 12px block padding with a 28px (<code>--space-7</code>) checkbox. The listed cell's mark is <code>--size-avatar-md</code>.</p>",
    "states": {
        "intro": "<p>Check rows are labels around a native checkbox: checked and disabled come from it; focus is forced with <code>data-state=\"focus\"</code> on the row. The decision follows the checks.</p>",
        "matrix": grid(["Default", "Focus", "Checked", "Disabled", "Disabled and checked"], [
            ("Check row", [ROW.format(c=f"<li>{check(3, 'sm1')}</li>"), ROW.format(c=f"<li>{check(3, 'sm2', a=' data-state=' + chr(34) + 'focus' + chr(34))}</li>"),
                           ROW.format(c=f"<li>{check(0, 'sm3', True)}</li>"), ROW.format(c=f"<li>{check(3, 'sm4', disabled=True)}</li>"),
                           ROW.format(c=f"<li>{check(0, 'sm5', True, True)}</li>")]),
        ]) + "<h3>Approving</h3>" + ex(view("s1", passed=4, busy=True), "Approve listing pressed: busy, Decline disabled, checks read-only (listings approving)."),
        "themes": themes(view("th", passed=4)) + themes(LISTED_CHANGE, mod="block"),
        "notes": """<ul>
<li><b>Unchecked</b>: a new suggestion starts with no checks passed (listings unchecked).</li>
<li>A disabled check row has no style of its own: the native checkbox greys and the cursor goes back to default. Text stays full strength so a decided suggestion stays readable.</li>
<li><b>Loading</b>, <b>empty</b> (\"No suggestions waiting\") and <b>error</b> replace the picker and card with skeletons, an <a href="empty-state.html">empty state</a> or an inline error.</li>
<li><b>Listed cell, change</b>: Approve and Decline are text buttons with hover (underline), focus (the shared ring) and disabled (muted, no underline) while a decision is on its way; the matrix below forces hover and focus on Approve through <code>data-state</code>. When the decision lands the change line goes, the cell is a plain listed cell again and a <a href="toast.html">toast</a> says what changed; a failed decision keeps the line and a toast says \"We couldn't save that decision\" (ADR 0095).</li>
</ul>""" + grid(["Default", "Hover", "Focus", "Disabled"], [
            ("Change", [CELL_W.format(c=change_cell()), CELL_W.format(c=change_cell(a=' data-state="hover"')),
                        CELL_W.format(c=change_cell(a=' data-state="focus"')), CELL_W.format(c=change_cell(disabled=True))]),
            ("Change of kind", [CELL_W.format(c=change_cell("kind", "Company")), None, None, None]),
        ]),
    },
    "responsive": """<ul>
<li>Below 1024px the suggestion card follows the stacked pick cards; from 1024px it sits beside the 18.75rem picker (<code>.split--picker-wide</code>).</li>
<li>The decision row wraps: the hint drops under the buttons on narrow screens.</li>
<li>The listed cell keeps the mark and verified mark on the name's line; the table scrolls inside its wrapper. In the change variant the change line takes the cell's full width under them, indented to the name (<code>--size-avatar-md</code> + <code>--space-3</code>), and its actions wrap under the waiting value when the column is narrow.</li>
</ul>""",
    "theming": "<p>The card is a surface <a href=\"card.html\">card</a>. Rules (note, checks, foot) are <code>--color-border-default</code>; descriptions and hints <code>--color-fg-muted</code>; the checkboxes are drawn by the browser with <code>accent-color: var(--color-accent)</code>; the kind eyebrow is <code>--color-fg-accent</code>.</p>",
    "accessibility": {
        "pattern": "<p>A native form. The checks are a <code>&lt;fieldset&gt;</code> with the <code>&lt;legend&gt;</code> \"Checks\"; each row is a <code>&lt;label&gt;</code> around its checkbox. The disabled Approve listing is joined to its hint with <code>aria-describedby</code>. The decision is announced with <code>role=\"status\"</code>. In the listed cell's change variant, Approve and Decline are native <code>&lt;button&gt;</code>s after the waiting value, <code>disabled</code> while a decision is on its way.</p>",
        "keys": [
            (kbd("Tab"), "Website link, each check, Approve listing (when enabled), Decline."),
            (kbd("Space"), "Ticks or unticks a check."),
            (kbd("Enter"), "Approves (when all four pass) or declines."),
            (kbd("Tab") + " then " + kbd("Enter") + " or " + kbd("Space"), "In a listed cell with a change: Approve, then Decline; either decides the waiting name or kind."),
        ],
        "focus": "<p>The checkbox's own ring; the whole row is the target.</p>",
        "labelling": "<p>Each check reads its label and standard (\"Two references, At least one from a church or ministry leader\"). The verified mark is <code>role=\"img\"</code> with <code>aria-label=\"Verified\"</code>; the listing mark is decorative. The change actions carry hidden text that names what and whose: \"Approve the new name of Eastside Ladies Who Lift\".</p>",
        "pairs": [
            ("Name and labels", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Descriptions and hint", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Kind", "--color-fg-accent", "--color-bg-surface", 4.5),
            ("Checkbox fill (non-text)", "--color-accent", "--color-bg-surface", 3),
            ("Change line", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Waiting value", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Change action", "--color-fg-accent", "--color-bg-surface", 4.5),
        ],
        "motion": "<p>None.</p>",
        "touch": "<p>Check rows are full width and at least 52px tall; the box itself is 28px. The change actions are small text buttons whose target extends to 44 × 44px on coarse pointers (<code>--target-comfortable</code>).</p>",
    },
    "content": """<ul>
<li>Checks are nouns with the standard beneath: \"Credentials\", \"Certification or registration number verified with the issuing body\".</li>
<li>Progress: \"3 of 4 passed\". Hint: \"Approve unlocks when all four checks pass.\"</li>
<li>Results say what happened and who was told: \"Approved. We’ve sent them a link to claim and publish their listing.\" / \"Declined. The person who suggested it has been told.\"</li>
<li>By: \"Submitted by the listing themselves\" or \"Jordan Reid · knows them\".</li>
<li>Change line: \"New name waiting:\" or \"New kind waiting:\" and the value as the owner wrote it; the actions are the verbs alone, \"Approve\" and \"Decline\".</li>
</ul>""",
    "dodont": [
        ("do", '<div class="suggestion__foot" style="margin: 0;"><button class="btn btn--primary btn--md" type="submit" disabled aria-describedby="dd-hint">Approve listing</button>'
               '<p class="suggestion__hint" id="dd-hint">Approve unlocks when all four checks pass.</p></div>', "Say why the action is unavailable, beside it."),
        ("dont", '<div class="suggestion__foot" style="margin: 0;"><button class="btn btn--primary btn--md" type="submit" disabled>Approve listing</button></div>',
         "A silent disabled button: staff cannot tell what is missing."),
        ("do", ROW.format(c=f"<li>{check(2, 'dd1')}</li>"), "Name the check and the standard it stands for."),
        ("dont", '<div style="width: 100%; max-width: 26rem;"><label class="check check--ui"><input class="check__box" type="checkbox"> References OK</label></div>',
         "A small checkbox with a vague label: the standard is unwritten and the target is tiny."),
    ],
    "tokens": [
        ("Card", "--color-bg-surface / --color-border-default", "color"),
        ("Descriptions and hint", "--color-fg-muted", "color"),
        ("Checkbox", "--color-accent", "color"),
        ("Kind", "--color-fg-accent", "color"),
        ("Checkbox size", "--space-7", "value"),
        ("Row padding", "--space-3", "value"),
        ("Name", "--font-size-2xl", "value"),
        ("Note", "--font-size-lg / --line-height-relaxed", "value"),
        ("Note rule", "--border-width-thick", "value"),
        ("Change line / waiting value / action", "--color-fg-muted / --color-fg-default / --color-fg-accent", "color"),
        ("Change line text", "--font-size-sm", "value"),
        ("Change line indent", "--size-avatar-md / --space-3", "value"),
        ("Change line gap", "--space-1 / --space-4", "value"),
        ("Change action radius", "--radius-xs", "value"),
    ],
    "code": {
        "snippet": '''<form class="card card--pad suggestion" novalidate>
  <p class="eyebrow eyebrow--sm">Instructor</p>
  <h2 class="suggestion__name">Coach Marcus Delaney</h2>
  <p class="muted">Mississauga · <a class="link link--ink" href="https://delaneyperformance.ca" target="_blank" rel="noopener noreferrer">delaneyperformance.ca …<span class="visually-hidden"> (opens in a new tab)</span></a></p>
  <blockquote class="suggestion__note"><p>I run speed and agility for youth athletes …</p></blockquote>
  <p class="suggestion__by">Submitted by the listing themselves</p>
  <fieldset class="suggestion__checks">
    <div class="section-head"><legend class="display section-title">Checks</legend><p class="section-head__note">3 of 4 passed</p></div>
    <ul class="list-divided">
      <li><label class="check-row"><input class="check-row__box" type="checkbox" name="check" value="credentials" checked>
        <span><span class="check-row__label">Credentials</span><span class="check-row__desc">Certification or registration number verified with the issuing body</span></span></label></li>
    </ul>
  </fieldset>
  <div class="suggestion__foot">
    <button class="btn btn--primary btn--md" type="submit" disabled aria-describedby="approve-hint">Approve listing</button>
    <button class="btn btn--secondary btn--md" type="button">Decline</button>
    <p class="suggestion__hint" id="approve-hint">Approve unlocks when all four checks pass.</p>
  </div>
</form>

<span class="listed-cell listed-cell--change">
  <span class="listing-mark listing-mark--sm" aria-hidden="true">EL</span>
  <span class="table__strong">Eastside Ladies Who Lift</span>
  <span class="listed-cell__change">
    <span>New name waiting: <span class="listed-cell__new">Eastside Women’s Strength</span></span>
    <button class="listed-cell__action" type="button">Approve<span class="visually-hidden"> the new name of Eastside Ladies Who Lift</span></button>
    <button class="listed-cell__action" type="button">Decline<span class="visually-hidden"> the new name of Eastside Ladies Who Lift</span></button>
  </span>
</span>''',
        "classes": [
            ("<code>.suggestion__name</code> <code>__note</code> <code>__by</code>", "Who, what the member said, who sent it."),
            ("<code>.suggestion__checks</code> <code>__foot</code> <code>__hint</code> <code>__result</code>", "Checks fieldset and the decision row."),
            ("<code>.check-row</code> <code>__box</code> <code>__label</code> <code>__desc</code>", "Large checkbox row."),
            ("<code>.listed-cell</code>", "Mark, name and verified mark in a table cell."),
            ("<code>.listed-cell--change</code> <code>__change</code> <code>__new</code> <code>__action</code>", "A waiting name or kind under the name, with Approve and Decline (ADR 0095)."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/admin-listings/default", "3 of 4, hint"),
            mock("pages/admin-listings/unchecked", "no checks"),
            mock("pages/admin-listings/ready", "Approve available"),
            mock("pages/admin-listings/approving", "busy"),
            mock("pages/admin-listings/approved", "result"),
            mock("pages/admin-listings/declined", "result"),
            mock("pages/admin-listings/listed", "listed cell"),
            mock("pages/admin-listings/change-waiting", "listed cell, change"),
        ],
        "drift": "<ul><li><code>.check-row</code> has no disabled style beyond the cursor; the native checkbox greys. Fine for a decided suggestion, but there is no <code>data-state</code> hook for hover (it has no hover style either).</li><li>The Approve button is <code>disabled</code> with <code>aria-describedby</code>; a disabled button cannot be focused, so keyboard users never reach its description. Proposed: <code>aria-disabled=\"true\"</code> and refuse the submit, as the forms pattern recommends.</li></ul>",
    },
}
