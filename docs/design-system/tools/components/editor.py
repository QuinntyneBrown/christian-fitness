from dslib import cf_ui, ex, icon, image, kbd, mock, themes

SPIN = icon("loader", "icon--spin")
LENT = ("Fasting and training: what a dietitian wants you to know before Lent ends",
        "Lena Park, RD, on how to keep a fast and keep moving, and the signs it’s time to ease off.",
        "For many members, Lent means giving something up. For some, it means fasting for whole days.\n\n"
        "> “Fasting and training can live together. The mistake is pretending the fast isn’t happening.”")
STATUS = {"In review": "review", "Draft": "draft", "Scheduled": "scheduled", "Published": "published"}


def grid(cols, rows):
    head = "".join(f'<th scope="col">{c}</th>' for c in cols)
    body = "".join(f'<tr><th scope="row">{label}</th>' + "".join("<td>—</td>" if c is None else f"<td>{c}</td>" for c in cells) + "</tr>"
                   for label, cells in rows)
    return f'<div class="ds-matrix"><table><thead><tr><th scope="col">Variant</th>{head}</tr></thead><tbody>{body}</tbody></table></div>'


def actions(status, busy=False, schedule=False):
    d = " disabled" if busy else ""
    sec = {"Draft": "Send for review", "In review": "Request changes", "Scheduled": "Unschedule", "Published": "Unpublish"}[status]
    pri = {"Draft": "Schedule" if schedule else "Publish now", "In review": "Approve &amp; publish",
           "Scheduled": "Publish now", "Published": "Update"}[status]
    p = (f'<button class="btn btn--primary btn--sm" type="submit" disabled aria-busy="true">{SPIN}Saving…</button>' if busy
         else f'<button class="btn btn--primary btn--sm" type="submit">{pri}</button>')
    return (f'<button class="btn btn--secondary btn--sm" type="button"{d}>{icon("eye")}Preview</button>'
            f'<button class="btn btn--secondary btn--sm" type="button"{d}>{sec}</button>{p}')


def bar(status="In review", saved="Saved 2 min ago", busy=False, schedule=False):
    return (f'<div class="editor__bar"><a class="back-link" href="#">{icon("arrow-left")} Stories</a>'
            f'<span class="status status--{STATUS[status]}">{status}</span><span class="editor__saved">{saved}</span>'
            f'<div class="editor__actions">{actions(status, busy, schedule)}</div></div>')


NOTE = (f'<div class="editor-note">{icon("message-square", "icon--lg editor-note__icon")}'
        '<div><p class="editor-note__title">Note from Priya Raman</p><p class="editor-note__text">Dietitian quotes are checked with Lena. '
        'Could we run this before Lent ends on the 18th?</p></div></div>')


def text(uid, title, dek, body, *, invalid=False, ro=False, a=""):
    r = " readonly" if ro else ""
    inv = ' aria-invalid="true"' if invalid else ""
    return (f'<div class="editor__text"><label class="visually-hidden" for="{uid}-h">Headline</label>'
            f'<textarea class="editor__headline" id="{uid}-h" rows="2" placeholder="Headline"{inv}{r}{a}>{title}</textarea>'
            f'<label class="visually-hidden" for="{uid}-s">Summary</label>'
            f'<textarea class="editor__summary" id="{uid}-s" rows="2" placeholder="One or two sentences that make people want to read it"{r}>{dek}</textarea>'
            f'<label class="visually-hidden" for="{uid}-b">Story</label>'
            f'<textarea class="editor__story" id="{uid}-b" rows="6" placeholder="Start writing. Begin a paragraph with &gt; to make it a pull quote."{r}>{body}</textarea></div>')


def side(uid, ro=False):
    d = " disabled" if ro else ""
    return (f'<aside class="editor__side" aria-label="Publishing ({uid})"><section class="card card--pad-sm panel">'
            f'<h2 class="display section-title">Publishing</h2>'
            f'<div class="panel__group"><div class="field"><label class="field__label" for="{uid}-pl">Front page</label>'
            f'<select class="select" id="{uid}-pl"{d}><option>Lead story</option><option selected>Top headlines</option><option>The latest</option></select></div></div>'
            f'<label class="check check--ui panel__group panel__group--ruled"><input class="check__box" type="checkbox" checked{d}>'
            '<span><span class="panel__strong">Include in the Weekly</span><span class="panel__sub">Issue #49, Sat Apr 18</span></span></label>'
            '<p class="panel__note">Goes to the All stories and Nutrition RSS feeds when published.</p></section></aside>')


def editor(uid, status="In review", *, note=True, lead="image", alert="", invalid=False, busy=False, saved="Saved 2 min ago",
           title=LENT[0], dek=LENT[1], body=LENT[2], with_side=True):
    d = " disabled" if busy else ""
    lead_html = (f'<div class="editor__image">{image("stretch", "editor__photo")}<button class="btn btn--secondary btn--sm editor__replace" type="button"{d}>Replace image</button></div>'
                 if lead == "image" else
                 f'<button class="dropzone" type="button"{d}>{icon("image-plus", "dropzone__icon")}<span class="dropzone__title">Add a lead image</span>'
                 '<span class="dropzone__hint">16:9, at least 1600 px wide</span></button>')
    grid_cls = "editor__grid" if with_side else "editor__writing"
    inner = (f'<div class="editor__writing">{alert}{NOTE if note else ""}{lead_html}{text(uid, title, dek, body, invalid=invalid, ro=busy)}</div>'
             + (side(uid, busy) if with_side else ""))
    if not with_side:
        inner = f'<div class="editor__grid" style="display: block;">{inner}</div>'
    else:
        inner = f'<div class="{grid_cls}">{inner}</div>'
    return f'<div style="width: 100%;"><form class="editor" novalidate aria-label="Edit story ({uid})">{bar(status, saved, busy)}{inner}</form></div>' 


ALERT_INVALID = '<div class="editor__alert">' + cf_ui.form_alert("Add a headline before publishing", "A story needs a headline and some text to go out.") + "</div>"
ALERT_FAILED = '<div class="editor__alert">' + cf_ui.form_alert("We couldn't save your changes", "What you wrote is still here. Try again in a moment.") + "</div>"
BOX = '<div style="width: 100%; min-width: 16rem; max-width: 24rem;">{c}</div>'


def head(uid, a="", invalid=False, ro=False, value=LENT[0]):
    inv = ' aria-invalid="true"' if invalid else ""
    return BOX.format(c=f'<label class="visually-hidden" for="{uid}">Headline</label><textarea class="editor__headline" id="{uid}" rows="3" placeholder="Headline"{inv}{" readonly" if ro else ""}{a}>{value}</textarea>')


SPEC = {
    "lead": "The story editor is a quiet writing surface: a sticky bar with status and actions, the lead image, headline, summary and story, and the publishing panels beside it.",
    "meta": ["Status: new", "Admin console", "<code>&lt;form&gt;</code> with bare textareas"],
    "overview": """<p>Staff write and approve stories here. The page is one <code>&lt;form class="editor"&gt;</code>: what is written sits on the canvas with no field borders so it reads like the story will, and every setting lives in the side column's <a href="review-card.html">panels</a>.</p>
<ul>
<li><b>Bar</b> (<code>.editor__bar</code>): back to Stories, the story's <a href="badge.html">status</a> (Draft, In review, Scheduled, Published), when it was saved, and the actions for that status. Sticky at the top.</li>
<li><b>Editor note</b> (<code>.editor-note</code>): the writer's note to the editor, shown only while the story is <i>In review</i>.</li>
<li><b>Lead image</b> (<code>.editor__image</code>) with Replace image, or a <a href="dropzone.html">dropzone</a> when there is none.</li>
<li><b>Text</b> (<code>.editor__text</code>): headline, summary and story as borderless textareas at reading measure.</li>
</ul>
<p>Use the editor only for long writing that is previewed as it will publish. Short staff edits (an event, a listing) open a <a href="drawer.html">drawer</a> or <a href="dialog.html">dialog</a> with ordinary <a href="text-field.html">fields</a>.</p>""",
    "anatomy": {
        "figure": editor("an", note=True, with_side=False),
        "callouts": [(6, 5), (32, 5), (50, 17), (50, 33), (50, 57), (50, 75)],
        "parts": [
            ("Back link", "\"Stories\": returns to the list."),
            ("Status and saved", "A status pill and \"Saved 2 min ago\" (hidden below 640px)."),
            ("Editor note", "<code>.editor-note</code>: surface card, accent icon, title and text."),
            ("Lead image", "16:9 photo with Replace image in its corner, or a dropzone."),
            ("Headline", "<code>.editor__headline</code>: 30px, 36px from 640px, bold, tight."),
            ("Summary and story", "<code>.editor__summary</code> 20px muted; <code>.editor__story</code> 18px under a hairline."),
        ],
    },
    "variants": "<h3>In review</h3>" + ex(editor("v1"), "The writer's note, the image and text; actions: Preview, Request changes, Approve &amp; publish (story editor default).")
    + "<h3>New story</h3>" + ex(editor("v2", "Draft", note=False, lead="drop", saved="Not saved yet", title="", dek="", body=""),
                               "No image yet: a dropzone; empty textareas show their hints; actions: Send for review, Publish now (story editor new).")
    + "<h3>Bar for each status</h3>" + ex(bar("Draft", "Saved yesterday") + bar("Scheduled") + bar("Published", "Published today, 7:12 AM"),
                                          "Draft: Send for review and Publish now (or Schedule). Scheduled: Unschedule and Publish now. Published: Unpublish and Update.", True, mod="stack")
    + "<h3>Editor note</h3>" + ex(NOTE, "Only while a story is In review.", True),
    "sizes": "<p>One size. The grid is <code>--layout-container-max</code> wide with a 20rem side column from 1024px; the text column is held to <code>--layout-measure</code>. Headline <code>--font-size-3xl</code>, <code>--font-size-4xl</code> from 640px; summary <code>--font-size-xl</code>; story <code>--font-size-lg</code>.</p>",
    "states": {
        "intro": "<p>The textareas are real form controls: focus shows the shared ring (forced here with <code>data-state=\"focus\"</code>), an empty required headline after Publish is <code>aria-invalid=\"true\"</code> (a 2px danger ring), and while saving they are <code>readonly</code>. The whole editor's states follow.</p>",
        "matrix": grid(["Default", "Placeholder", "Focus", "Invalid", "Read-only"], [
            ("Headline", [head("sh1"), head("sh2", value=""), head("sh3", ' data-state="focus"'), head("sh4", invalid=True, value=""), head("sh5", ro=True)]),
        ])
        + "<h3>Invalid</h3>" + ex(editor("s-inv", "Draft", note=False, lead="drop", alert=ALERT_INVALID, invalid=True, saved="Saved yesterday", title="",
                                      dek="", body="On Wednesday nights the gym at Scarborough Community Church has a waiting list for its four courts."),
                               "Publish pressed with no headline: an alert above the story takes focus and the headline is marked; nothing is published.")
        + "<h3>Saving</h3>" + ex(editor("s-busy", busy=True, saved="Saving…"), "The primary button is busy, the others disabled, the text read-only.")
        + "<h3>Failed</h3>" + ex(ALERT_FAILED + NOTE, "What was written is kept; the alert says so.", mod="stack")
        + "<h3>Loading</h3>" + ex('<div class="editor" style="width: 100%;" aria-busy="true" aria-label="Loading story"><div class="editor__bar"><a class="back-link" href="#">'
                                  + icon("arrow-left") + ' Stories</a></div><div class="editor__grid"><div class="editor__writing skeleton-stack">'
                                  '<span class="skeleton skeleton--block skeleton--image-16x9"></span><span class="skeleton skeleton--title-lg"></span>'
                                  '<span class="skeleton skeleton--text w-90"></span><span class="skeleton skeleton--text w-80"></span></div>'
                                  '<div class="editor__side skeleton-stack"><span class="skeleton skeleton--tile"></span><span class="skeleton skeleton--tile"></span></div></div></div>',
                                  "The bar is there at once; image, text and panels are skeletons."),
        "themes": themes('<div style="width: 100%;">' + bar() + '<div class="editor__grid" style="display: block;"><div class="editor__writing">' + NOTE + text("th", *LENT) + "</div></div></div>", "stack"),
        "notes": """<ul>
<li><b>Approved</b>: after Approve &amp; publish the status reads Published and a <a href="toast.html">toast</a> confirms \"Approved and published\".</li>
<li><b>Error</b>: a story that fails to load is an inline error with Try again and a link back to Stories; the editor is not drawn.</li>
<li>\"Saved 2 min ago\" is the only autosave signal; it reads \"Saving…\" and then \"Not saved\" when saving failed.</li>
</ul>""",
    },
    "responsive": """<ul>
<li>Below 640px the bar wraps, \"Saved …\" hides and the actions move under the back link; padding is 16px.</li>
<li>640px to 1023px: 32px side padding; the side column follows the text.</li>
<li>From 1024px (<code>--layout-breakpoint-lg</code>): two columns (text, 20rem side) and the side column sticks below the bar.</li>
<li>The bar is sticky at the top in every width (<code>--z-raised</code>) and keeps the canvas fill so text scrolls under it.</li>
</ul>""",
    "theming": "<p>The writing surface is the canvas (<code>--color-bg-canvas</code>); the bar has a <code>--color-border-default</code> hairline. Placeholders use <code>--color-fg-subtle</code>, the summary <code>--color-fg-muted</code>, the invalid ring <code>--color-danger-fg</code>. The note is a surface card with an inset <code>--color-border-default</code> ring and a <code>--color-fg-accent</code> icon. The Replace image button sits on the photo with a <code>--color-bg-surface</code> fill and <code>--shadow-1</code>.</p>",
    "accessibility": {
        "pattern": "<p>A native form: each textarea has a visually hidden <code>&lt;label&gt;</code> (Headline, Summary, Story) because the type itself says what each is. The page's <code>&lt;h1&gt;</code> is visually hidden (\"Edit story\", \"New story\"). The side column is an <code>&lt;aside aria-label=\"Publishing\"&gt;</code>. On invalid or failed save, the <a href=\"alert.html\">alert</a> above the story is focused.</p>",
        "keys": [
            (kbd("Tab"), "Back link, Preview, the status actions, then the image, headline, summary, story and the panels."),
            (kbd("Enter"), "In a textarea, a new line; on an action, runs it."),
            (kbd("Shift", "Tab"), "Back from the story to the summary and headline."),
        ],
        "focus": "<p>Borderless textareas show the shared 2px <code>--color-focus-ring</code> around their <code>--radius-sm</code> box when focused, so it is always clear which part is being edited.</p>",
        "labelling": "<p>The headline's invalid state is announced from <code>aria-invalid</code> and the focused alert names the fix (\"Add a headline before publishing\"). The status pill is text. The lead photo is decorative (<code>alt=\"\"</code>); Replace image names its job.</p>",
        "pairs": [
            ("Headline and story", "--color-fg-default", "--color-bg-canvas", 4.5),
            ("Summary and saved", "--color-fg-muted", "--color-bg-canvas", 4.5),
            ("Placeholder", "--color-fg-subtle", "--color-bg-canvas", 4.5),
            ("Invalid ring (non-text)", "--color-danger-fg", "--color-bg-canvas", 3),
            ("Note text", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Focus ring", "--color-focus-ring", "--color-bg-canvas", 3),
        ],
        "motion": "<p>None of its own. The sticky bar and side column do not animate.</p>",
        "touch": "<p>Bar buttons are the small size (<code>.btn--sm</code>) and extend to 44 × 44px on coarse pointers; the textareas are large targets. The dropzone is the full 16:9 box.</p>",
    },
    "content": """<ul>
<li>Placeholders are hints, never labels: \"Headline\", \"One or two sentences that make people want to read it\", \"Start writing. Begin a paragraph with &gt; to make it a pull quote.\"</li>
<li>Actions name the outcome for the status: \"Approve &amp; publish\", \"Send for review\", \"Unschedule\", \"Update\". Busy: \"Saving…\".</li>
<li>Saved line: \"Saved 2 min ago\", \"Saved yesterday\", \"Not saved yet\", \"Published today, 7:12 AM\".</li>
<li>Editor note title: \"Note from Priya Raman\"; the text is the writer's own words.</li>
</ul>""",
    "dodont": [
        ("do", head("dd1", invalid=True, value=""), "Mark the empty headline with <code>aria-invalid</code> and say why in the alert above the story."),
        ("dont", head("dd2", value="").replace('placeholder="Headline"', 'placeholder="Headline is required!"'),
         "An error written into the placeholder: it vanishes on the first keystroke and is not announced."),
        ("do", bar(), "One primary action for the status, on the right; Preview always there."),
        ("dont", bar().replace('<div class="editor__actions">', '<div class="editor__actions"><button class="btn btn--primary btn--sm" type="button">Publish now</button><button class="btn btn--primary btn--sm" type="button">Schedule</button>'),
         "Several primary buttons in the bar: nobody can tell which one finishes the job."),
    ],
    "tokens": [
        ("Surface / bar rule", "--color-bg-canvas / --color-border-default", "color"),
        ("Summary / placeholder", "--color-fg-muted / --color-fg-subtle", "color"),
        ("Invalid ring", "--color-danger-fg", "color"),
        ("Note card / icon", "--color-bg-surface / --color-fg-accent", "color"),
        ("Bar stacking", "--z-raised", "value"),
        ("Text measure", "--layout-measure", "value"),
        ("Grid width", "--layout-container-max", "value"),
        ("Headline", "--font-size-3xl / --font-size-4xl", "value"),
        ("Summary / story", "--font-size-xl / --font-size-lg", "value"),
        ("Image radius / note radius", "--radius-lg", "value"),
        ("Replace button shadow", "--shadow-1", "value"),
    ],
    "code": {
        "snippet": '''<form class="editor" novalidate>
  <div class="editor__bar">
    <a class="back-link" href="/admin/stories">…Stories</a>
    <span class="status status--review">In review</span>
    <span class="editor__saved">Saved 2 min ago</span>
    <div class="editor__actions">…Preview, Request changes, Approve &amp; publish…</div>
  </div>
  <div class="editor__grid">
    <div class="editor__writing">
      <h1 class="visually-hidden">Edit story</h1>
      <div class="editor-note">…<div><p class="editor-note__title">Note from Priya Raman</p><p class="editor-note__text">…</p></div></div>
      <div class="editor__image"><img class="editor__photo" src="stretch.jpg" alt=""><button class="btn btn--secondary btn--sm editor__replace" type="button">Replace image</button></div>
      <div class="editor__text">
        <label class="visually-hidden" for="f-headline">Headline</label>
        <textarea class="editor__headline" id="f-headline" name="headline" rows="2" placeholder="Headline">…</textarea>
        …summary, story…
      </div>
    </div>
    <aside class="editor__side" aria-label="Publishing">…panels…</aside>
  </div>
</form>''',
        "classes": [
            ("<code>.editor__bar</code> <code>__saved</code> <code>__actions</code>", "Sticky bar, saved line, actions pushed right."),
            ("<code>.editor__grid</code> <code>__writing</code> <code>__side</code>", "Two-column grid from 1024px; sticky side column."),
            ("<code>.editor__alert</code> <code>.editor-note</code> <code>__icon</code> <code>__title</code> <code>__text</code>", "Alert slot and the writer's note."),
            ("<code>.editor__image</code> <code>__photo</code> <code>__replace</code>", "Lead image and its Replace button."),
            ("<code>.editor__text</code> <code>__headline</code> <code>__summary</code> <code>__story</code>", "Borderless textareas at reading measure."),
            ("<code>aria-invalid=\"true\"</code> · <code>readonly</code>", "Missing headline; saving."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/admin-story-editor/default", "in review, editor note"),
            mock("pages/admin-story-editor/new", "dropzone, placeholders"),
            mock("pages/admin-story-editor/draft", "Schedule"),
            mock("pages/admin-story-editor/scheduled", "Unschedule"),
            mock("pages/admin-story-editor/published", "Unpublish, Update"),
            mock("pages/admin-story-editor/approved", "toast"),
            mock("pages/admin-story-editor/saving", "busy, read-only"),
            mock("pages/admin-story-editor/invalid", "headline marked"),
            mock("pages/admin-story-editor/failed", "save failed"),
            mock("pages/admin-story-editor/loading", "skeletons"),
            mock("pages/admin-story-editor/error", "failed to load"),
        ],
        "drift": """<ul>
<li>The editor's textareas have no focus style of their own beyond the global ring; that is intended (the ring is the only frame they get).</li>
<li>The saving state sets <code>readonly</code> on the textareas but <code>disabled</code> on the panel controls and Replace image; keep one rule (<code>readonly</code> where the control supports it) so values stay readable and focusable.</li>
</ul>""",
    },
}
