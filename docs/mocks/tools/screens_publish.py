"""Admin console: Stories, the story editor, Newsletter, Event series, Community Pick, Listings and Feedback.
Layout and copy follow the Magic Patterns prototype "Admin Console" frames Manage Stories, Story Editor, Manage
Newsletter, Manage Event Series, Community Pick, Manage Listings and Feedback Inbox."""
from __future__ import annotations

from cf_data import (ADMIN_STORIES, MODERATOR, LISTING_KINDS, AUTHORS, BYLINES, CHECKS, EV, FEEDBACK, FEEDBACK_KIND_ICON, LISTINGS, LS,
                     MEMBER_EVENTS, NEWSLETTER, PAST_ISSUES, SECTIONS, SERIES, SR, ST, STORIES, STORY_BODY, STORY_STATUSES, SUGGESTIONS)
from cf_ui import (CUR, banner, admin_header, admin_shell, avatar, busy_label, empty_block, error_block, error_summary, field, file_field,
                   form_alert, href, icon, image, listing_mark, loading_region, screen, select, textarea, toast, toast_region,
                   verified_badge)
from overlays import autofocus_first, dialog, drawer, over_admin
from screens_admin import G, SRC, table_skeleton
from screens_news import story_page, story_shell

N = NEWSLETTER
STATUS_CLASS = {"In review": "review", "New": "new", "Scheduled": "scheduled", "Replied": "replied", "Published": "published",
                "Live": "published", "Sent": "published", "Draft": "draft", "Resolved": "draft", "Cancelled": "cancelled"}


def pill(status: str) -> str:
    return f'<span class="status status--{STATUS_CLASS[status]}">{status}</span>'


def tabs(label: str, items: list, active: str) -> str:
    return (f'<nav class="tabs" aria-label="{label}">' + "".join(
        f'<a class="tabs__tab" href="{h}"{CUR if n == active else ""}>{n} <span class="tabs__count">{c}</span></a>' for n, c, h in items) + "</nav>")


# ===========================================================================
# Stories
# ===========================================================================
EDITOR_STATE = {"In review": "default", "Draft": "draft", "Scheduled": "scheduled", "Published": "published"}


def bylines_link() -> str:
    return f'<a class="btn btn--secondary btn--md" href="{href("admin-bylines")}">{icon("users")}Bylines</a>'


def stories_page(body: str, active: str = "All", *, review: bool = True, counts: bool = True) -> str:
    def count(k):
        if not counts:
            return ""
        return len(ADMIN_STORIES) if k == "All" else sum(1 for x in ADMIN_STORIES if x[4] == k)
    new = f'<a class="btn btn--primary btn--md" href="{href("admin-story-editor", "new")}">{icon("plus")}New story</a>'
    bylines = f'<a class="btn btn--secondary btn--md" href="{href("admin-bylines")}">{icon("users")}Bylines</a>'
    banner = ""
    if review:
        for sid, title, section, author, status, when, _ in ADMIN_STORIES:
            if status == "In review":
                banner += f"""<a class="review-card" href="{href("admin-story-editor")}">
        <span class="review-card__body">
          <span class="review-card__label">Waiting for your review · {when}</span>
          <span class="review-card__title">{title}</span>
          <span class="review-card__meta">{author} · {section}</span>
        </span>
        <span class="btn btn--inverse btn--md review-card__action">Review {icon("arrow-right")}</span>
      </a>"""
    links = [("All", count("All"), href("admin-stories"))] + [(k, count(k), href("admin-stories", "filtered")) for k in STORY_STATUSES]
    return (admin_header("Stories", "What members read on the front page, in RSS and in the Weekly.", bylines + new) + "\n" + banner + "\n"
            + tabs("Filter stories", links, active) + "\n" + body)


def stories_table(rows) -> str:
    trs = "".join(f"""<tr>
                <td class="table__wrap"><a class="row-title" href="{href("admin-story-editor", EDITOR_STATE[status])}">{title}</a><p class="table__sub">{author}</p></td>
                <td class="table__nowrap">{section}</td>
                <td>{pill(status)}</td>
                <td class="table__nowrap muted">{when}</td>
                <td class="table__end table__strong">{views or '<span aria-hidden="true">—</span><span class="visually-hidden">Not published</span>'}</td>
              </tr>""" for sid, title, section, author, status, when, views in rows)
    return f"""<div class="table-wrap">
          <table class="table table--wide">
            <caption class="visually-hidden">Stories</caption>
            <thead><tr><th scope="col">Story</th><th scope="col">Section</th><th scope="col">Status</th><th scope="col">When</th><th scope="col" class="table__end">Reads</th></tr></thead>
            <tbody>{trs}</tbody>
          </table>
        </div>"""


s = screen("admin-stories", "page", "Manage stories", route="/admin/stories", group=G, source=SRC + "Manage Stories (uEziYrDxcukG3Lb5EowXum)")


@s("default", "Every story with its section, status (Draft, In review, Scheduled, Published), when it went or goes out and how often it was read; the story waiting for review is called out above the list.")
def _():
    return admin_shell("admin-stories", stories_page(stories_table(ADMIN_STORIES)))


@s("filtered", "Draft chosen: only drafts; the call-out for the story in review stays.")
def _():
    return admin_shell("admin-stories", stories_page(stories_table([x for x in ADMIN_STORIES if x[4] == "Draft"]), "Draft"))


@s("loading", "Stories loading: the heading and New story are there; the table shows skeleton rows.")
def _():
    return admin_shell("admin-stories", stories_page(loading_region("Loading stories", table_skeleton(5)), review=False, counts=False))


@s("empty", "No stories yet: says what stories are for and offers New story.")
def _():
    body = empty_block("No stories yet", "Stories appear on the front page, in the RSS feeds and in the Weekly once they are published.",
                       f'<a class="btn btn--primary btn--sm" href="{href("admin-story-editor", "new")}">{icon("plus")}New story</a>')
    return admin_shell("admin-stories", admin_header("Stories", "What members read on the front page, in RSS and in the Weekly.", bylines_link()) + body,
                       counts={"admin-stories": 0})


@s("error", "Stories failed to load: retry in place.")
def _():
    return admin_shell("admin-stories", stories_page(error_block(
        "Stories didn't load", "We couldn't reach Christian Fitness. Check your connection and try again.", retry="default.html", ref="CF-A7S1"),
        review=False, counts=False))


# --- Story editor ---------------------------------------------------------------
LENT = {"title": "Fasting and training: what a dietitian wants you to know before Lent ends",
        "dek": "Lena Park, RD, on how to keep a fast and keep moving, and the signs it’s time to ease off.",
        "body": STORY_BODY["lent-fasting"], "image": "stretch", "section": "Nutrition", "author": "Priya Raman",
        "related": "Listing · Lena Park, RD", "slug": "fasting-and-training", "placement": "Top headlines"}
GYM = {"title": ST["basement-gym"]["title"], "dek": ST["basement-gym"]["dek"], "body": STORY_BODY["basement-gym"], "image": "church-gym",
       "section": "Community", "author": "Naomi Clarke", "related": "Listing · St. Paul’s Sports Ministry", "slug": "basement-gym",
       "placement": "Lead story"}
RETREAT = {"title": "What to pack for the Whole Life Retreat", "dek": "Three days at Muskoka Woods, one bag. Here is what the team is bringing.",
           "body": ["The Whole Life Retreat runs May 22 to 24 at Muskoka Woods. Cabins have bedding; you bring the rest.",
                    "Pack layers for cold mornings by the lake, trail shoes you have already broken in, a water bottle and a notebook."],
           "image": "", "section": "Events", "author": "CF Team", "related": "Nothing", "slug": "retreat-packing-list", "placement": "The latest"}
PICKLE = {"title": "Pickleball is filling church gyms in Scarborough. Here’s why", "dek": "", "image": "", "section": "Community",
          "body": ["On Wednesday nights the gym at Scarborough Community Church has a waiting list for its four courts."],
          "author": "Naomi Clarke", "related": "Nothing", "slug": "scarborough-pickleball", "placement": "The latest"}
EMPTY = {"title": "", "dek": "", "body": [], "image": "", "section": "Community", "author": "CF Team", "related": "Nothing", "slug": "",
         "placement": "The latest"}


def editor_actions(status: str, *, busy: bool = False, schedule: bool = False) -> str:
    def sec(label, to=""):
        return f'<button class="btn btn--secondary btn--sm" type="button"{" disabled" if busy else ""}{f" data-mock-href={chr(34)}{to}{chr(34)}" if to else ""}>{label}</button>'

    def pri(label, to=""):
        if busy:
            return f'<button class="btn btn--primary btn--sm" type="submit" disabled aria-busy="true">{busy_label("Saving…")}</button>'
        return f'<button class="btn btn--primary btn--sm" type="submit"{f" data-mock-href={chr(34)}{to}{chr(34)}" if to else ""}>{label}</button>'
    if status == "Draft":
        return sec("Send for review") + pri("Schedule" if schedule else "Publish now")
    if status == "In review":
        return sec("Back to draft") + pri("Approve &amp; schedule" if schedule else "Approve &amp; publish", "approved.html")
    if status == "Scheduled":
        return sec("Unschedule") + pri("Publish now")
    return sec("Unpublish") + pri("Update")


def editor(d: dict, status: str, *, schedule: bool = False, invalid: bool = False, busy: bool = False, failed: bool = False,
           saved: str = "Saved 2 min ago") -> str:
    ro = busy
    alert = ""
    if invalid:
        alert = '<div class="editor__alert">' + form_alert("Add a headline before publishing", "A story needs a headline and some text to go out.").replace(
            'tabindex="-1"', 'tabindex="-1" autofocus') + "</div>"
    if failed:
        alert = '<div class="editor__alert">' + form_alert("We couldn't save your changes", "What you wrote is still here. Try again in a moment.").replace(
            'tabindex="-1"', 'tabindex="-1" autofocus') + "</div>"
    lead = (f"""<div class="editor__image">{image(d["image"], "editor__photo")}<button class="btn btn--secondary btn--sm editor__replace" type="button"{" disabled" if ro else ""}>Replace image</button></div>"""
            if d["image"] else f"""<button class="dropzone" type="button"{" disabled" if ro else ""}>{icon("image-plus", "dropzone__icon")}<span class="dropzone__title">Add a lead image</span><span class="dropzone__hint">16:9, at least 1600 px wide</span></button>""")
    r = " readonly" if ro else ""
    body = "\n\n".join(d["body"])
    when = f"""<fieldset class="panel__group">
              <legend class="field__label">When</legend>
              <div class="choice-group">
                <label class="choice"><input class="choice__input" type="radio" name="when"{"" if schedule else " checked"}{" disabled" if ro else ""}><span class="choice__label choice__label--plain">As soon as it’s published</span></label>
                <label class="choice"><input class="choice__input" type="radio" name="when"{" checked" if schedule else ""}{" disabled" if ro else ""}><span class="choice__label choice__label--plain">Schedule</span></label>
              </div>
              {'<div class="field-grid field-grid--2 panel__when"><div><label class="visually-hidden" for="f-date">Date</label><input class="input input--sm" id="f-date" type="date" value="2026-04-18"></div><div><label class="visually-hidden" for="f-time">Time</label><input class="input input--sm" id="f-time" type="time" value="06:00"></div></div>' if schedule else ''}
            </fieldset>"""
    related = ["Nothing"] + [f'Event · {e["title"]}' for e in MEMBER_EVENTS] + [f'Listing · {l["name"]}' for l in LISTINGS[:6]]
    if d["related"] not in related:
        related.insert(1, d["related"])
    return f"""<form class="editor" novalidate>
      <div class="editor__bar">
        <a class="back-link" href="{href("admin-stories")}">{icon("arrow-left")} Stories</a>
        {pill(status)}
        <span class="editor__saved">{saved}</span>
        <div class="editor__actions">
          {f'<button class="btn btn--secondary btn--sm" type="button" disabled>{icon("eye")}Preview</button>' if ro or not d["title"] else f'<a class="btn btn--secondary btn--sm" href="{href("admin-story-preview")}" target="_blank" rel="noopener">{icon("eye")}Preview<span class="visually-hidden"> (opens in a new tab)</span></a>'}
          {editor_actions(status, busy=busy, schedule=schedule)}
        </div>
      </div>
      <div class="editor__grid">
        <div class="editor__writing">
          <h1 class="visually-hidden">{'New story' if not d["title"] else 'Edit story'}</h1>
          {alert}
          {lead}
          <div class="editor__text">
            <label class="visually-hidden" for="f-headline">Headline</label>
            <textarea class="editor__headline" id="f-headline" name="headline" rows="2" placeholder="Headline"{' aria-invalid="true"' if invalid else ''}{r}>{d["title"]}</textarea>
            <label class="visually-hidden" for="f-summary">Summary</label>
            <textarea class="editor__summary" id="f-summary" name="summary" rows="2" placeholder="One or two sentences that make people want to read it"{r}>{d["dek"]}</textarea>
            <label class="visually-hidden" for="f-story">Story</label>
            <textarea class="editor__story" id="f-story" name="story" rows="16" placeholder="Start writing. Begin a paragraph with &gt; to make it a pull quote."{r}>{body}</textarea>
          </div>
        </div>
        <aside class="editor__side" aria-label="Publishing">
          <section class="card card--pad-sm panel">
            <h2 class="display section-title">Publishing</h2>
            {when}
            <div class="panel__group panel__group--ruled">
              {select("Front page", "placement", ["Lead story", "Top headlines", "The latest"], d["placement"], disabled=ro)}
            </div>
            <label class="check check--ui panel__group panel__group--ruled"><input class="check__box" type="checkbox" name="weekly" checked{" disabled" if ro else ""}>
              <span><span class="panel__strong">Include in the Weekly</span><span class="panel__sub">Issue #{N["issue"] + 1}, Sat Apr 18</span></span></label>
            <p class="panel__note">Goes to the All stories and {d["section"]} RSS feeds when published.</p>
          </section>
          <section class="card card--pad-sm panel stack-4">
            {select("Section", "section", SECTIONS[1:], d["section"], disabled=ro)}
            {select("Byline", "byline", AUTHORS, d["author"], disabled=ro)}
            {select("Points readers to", "related", related, d["related"], disabled=ro)}
            <div class="field"><label class="field__label" for="f-slug">Link</label>
              <div class="input-group"><span class="input-group__prefix" id="slug-prefix">/stories/</span><input class="input-group__input" id="f-slug" name="slug" value="{d["slug"]}" aria-describedby="slug-prefix"{r}></div></div>
          </section>
        </aside>
      </div>
    </form>"""


def editor_page(*a, after: str = "", **kw) -> str:
    return admin_shell("admin-stories", editor(*a, **kw), after=after).replace('<div class="admin__page">', '<div class="admin__page admin__page--flush">', 1)


s = screen("admin-story-editor", "page", "Story editor", route="/admin/stories/:id", group=G, source=SRC + "Story Editor (aC6BNBAfK3eL6TegAPxd5b)",
           not_applicable={"empty": "One story; a new one is the new state, and a missing one is the admin not-found page."})


@s("default", "A story in review: the lead image, headline, summary and text; when it publishes, where it sits on the front page, whether it goes in the Weekly, its section, byline (chosen from the Bylines list), what it points readers to and its link. An Admin can send it back to draft or approve and publish.")
def _():
    return editor_page(LENT, "In review")


@s("new", "A new story: no image yet, empty headline, summary and text with their hints; it can be sent for review or published.")
def _():
    return editor_page(EMPTY, "Draft", saved="Not saved yet")


@s("draft", "A draft set to publish at a date and time: the primary action reads \"Schedule\".")
def _():
    return editor_page(PICKLE, "Draft", schedule=True, saved="Saved yesterday")


@s("scheduled", "A scheduled story: it can be unscheduled back to a draft, or published now.")
def _():
    return editor_page(RETREAT, "Scheduled", schedule=True)


@s("published", "A published story: changes go live with Update; Unpublish takes it away from readers.")
def _():
    return editor_page(GYM, "Published", saved="Published today, 7:12 AM")


@s("approved", "Approve & publish pressed: the status is Published and a toast confirms it.")
def _():
    return editor_page(LENT, "Published", saved="Saved just now",
                       after=toast_region(toast("success", "Approved and published", "It is on the front page and in the Nutrition feed."), admin=True))


@s("saving", "A change is being saved: the primary button is busy and the fields are read-only.")
def _():
    return editor_page(LENT, "In review", busy=True, saved="Saving…")


@s("invalid", "Publish pressed with no headline: a message above the story (focused) and the headline is marked; nothing is published.")
def _():
    return editor_page(dict(PICKLE, title=""), "Draft", invalid=True)


@s("failed", "Saving failed: a message above the story (focused); what was written is kept.")
def _():
    return editor_page(LENT, "In review", failed=True, saved="Not saved")


@s("loading", "The story is loading: the bar is there; the image, text and panels show as skeletons.")
def _():
    sk = f"""<div class="editor"><div class="editor__bar"><a class="back-link" href="{href("admin-stories")}">{icon("arrow-left")} Stories</a></div>
      <div class="editor__grid"><div class="editor__writing skeleton-stack"><h1 class="visually-hidden">Loading story</h1>
        <span class="skeleton skeleton--block skeleton--image-16x9"></span><span class="skeleton skeleton--title-lg"></span>
        <span class="skeleton skeleton--text w-90"></span><span class="skeleton skeleton--text w-80"></span></div>
        <div class="editor__side skeleton-stack"><span class="skeleton skeleton--tile"></span><span class="skeleton skeleton--tile"></span></div></div></div>"""
    return admin_shell("admin-stories", loading_region("Loading story", sk)).replace('<div class="admin__page">', '<div class="admin__page admin__page--flush">', 1)


@s("error", "The story failed to load: retry, or go back to Stories.")
def _():
    return admin_shell("admin-stories", f'<a class="back-link" href="{href("admin-stories")}">{icon("arrow-left")} Stories</a><h1 class="visually-hidden">Story</h1>' + error_block(
        "This story didn't load", "We couldn't reach Christian Fitness. Check your connection and try again.", retry="default.html",
        back=("Stories", href("admin-stories")), ref="CF-A2E6"))


def preview_bar(status: str) -> str:
    return banner("warning", "eye", f"Preview · {status}. Only Admins can see this page. Readers see the story once it is published.",
                  action=("Close preview", href("admin-story-editor")), dismiss=False)


s = screen("admin-story-preview", "page", "Story preview", route="/admin/stories/:id/preview", group=G, opens_from="admin-story-editor",
           source="Derived: the Story Editor frame's \"Preview\" button, which has no screen in the prototype; the story as readers see it, opened in a new tab.",
           not_applicable={"empty": "One story; a missing one is the admin not-found page, and a Moderator sees Admins only."})


@s("default", "The story In review as readers will see it, under a bar saying it is a preview that only Admins can see.")
def _():
    return story_shell(preview_bar("In review") + story_page(ST["basement-gym"]))


@s("loading", "Preview loading: the bar and masthead are there; the headline, image and text show as skeletons.")
def _():
    sk = ('<div class="story"><div class="story__head skeleton-stack"><h1 class="visually-hidden">Loading preview</h1>'
          '<span class="skeleton skeleton--text-sm w-20"></span><span class="skeleton skeleton--title-lg"></span>'
          '<span class="skeleton skeleton--title-lg w-80"></span><span class="skeleton skeleton--text w-40"></span></div>'
          '<div class="story__figure"><span class="skeleton skeleton--block skeleton--image-16x9"></span></div>'
          '<div class="story__body skeleton-stack"><span class="skeleton skeleton--text w-90"></span>'
          '<span class="skeleton skeleton--text w-90"></span><span class="skeleton skeleton--text w-80"></span></div></div>')
    return story_shell(preview_bar("loading") + loading_region("Loading preview", sk))


@s("error", "Preview failed to load: retry, or close the preview and go back to the editor.")
def _():
    return story_shell(preview_bar("not loaded") + '<div class="story"><div class="story__head"><h1 class="visually-hidden">Story preview</h1>' + error_block(
        "The preview didn't load", "We couldn't reach Christian Fitness. Check your connection and try again.", retry="default.html",
        back=("Back to the editor", href("admin-story-editor")), ref="CF-A5P2") + "</div></div>")


# ===========================================================================
# Bylines (Stories > Bylines; L2-077)
# ===========================================================================
def byline_uses(name: str) -> int:
    return sum(1 for x in ADMIN_STORIES if x[3] == name)


def uses_text(n: int) -> str:
    return "Not used yet" if n == 0 else f"{n} stor{'y' if n == 1 else 'ies'}"


def bylines_head(action: bool = True) -> str:
    add = f'<button class="btn btn--primary btn--md" type="button" data-mock-href="{href("byline-editor")}">{icon("plus")}Add byline</button>' if action else ""
    return (f'<a class="back-link" href="{href("admin-stories")}">{icon("arrow-left")} Stories</a>'
            + admin_header("Bylines", "The names a story can run under. Admins choose one in the story editor.", add))


def bylines_table(rows=BYLINES) -> str:
    trs = ""
    for name, initials, bio in rows:
        n = byline_uses(name)
        dlg = href("remove-byline", "in-use" if n else "default")
        trs += f"""<tr>
                <td><div class="table__person">{avatar(initials, size="table")}<p class="table__strong">{name}</p></div></td>
                <td class="table__wrap muted">{bio}</td>
                <td class="table__nowrap">{uses_text(n)}</td>
                <td class="table__end"><span class="row-actions"><button class="row-link" type="button" data-mock-href="{href("byline-editor", "edit")}">Edit<span class="visually-hidden"> {name}</span></button><button class="row-link row-link--quiet" type="button" data-mock-href="{dlg}">Remove<span class="visually-hidden"> {name}</span></button></span></td>
              </tr>"""
    return f"""<div class="table-wrap">
          <table class="table table--wide">
            <caption class="visually-hidden">Bylines</caption>
            <thead><tr><th scope="col">Byline</th><th scope="col">Short bio</th><th scope="col">Used by</th><th scope="col" class="table__end"><span class="visually-hidden">Actions</span></th></tr></thead>
            <tbody>{trs}</tbody>
          </table>
        </div>"""


def bylines_page(body: str, *, action: bool = True, after: str = "") -> str:
    return admin_shell("admin-stories", bylines_head(action) + "\n" + body, after=after)


s = screen("admin-bylines", "page", "Manage bylines", route="/admin/stories/bylines", group=G,
           source="Derived: the story editor's Byline picker needs a list to read; the prototype draws a fixed one (L2-077).")


@s("default", "Every byline with its short bio and how many stories use it; Add byline, and Edit and Remove on each row.")
def _():
    return bylines_page(bylines_table())


@s("saved", "A byline was saved from the dialog: the list shows it and a toast confirms it.")
def _():
    return bylines_page(bylines_table(), after=toast_region(toast("info", "Byline saved", "Admins can choose Marcus Bell in the story editor."), admin=True))


@s("removed", "A byline nobody uses was removed: it is gone from the list and a toast confirms it.")
def _():
    return bylines_page(bylines_table([b for b in BYLINES if b[0] != "CF Team"]), after=toast_region(toast("info", "Byline removed", "CF Team is no longer in the story editor's list."), admin=True))


@s("loading", "Bylines loading: the heading and Add byline are there; the table shows skeleton rows.")
def _():
    return bylines_page(loading_region("Loading bylines", table_skeleton(4)))


@s("empty", "No bylines yet: says a story cannot be published without one and offers Add byline.")
def _():
    body = empty_block("No bylines yet", "A story needs a byline before it can be published. Add the first one.",
                       f'<a class="btn btn--primary btn--sm" href="{href("byline-editor")}">{icon("plus")}Add byline</a>')
    return bylines_page(body, action=False)


@s("error", "Bylines failed to load: retry in place.")
def _():
    return bylines_page(error_block("Bylines didn't load", "We couldn't reach Christian Fitness. Check your connection and try again.",
                                    retry="default.html", ref="CF-A7B1"))


def bylines_behind() -> str:
    return bylines_head() + "\n" + bylines_table()


def byline_editor(*, edit: bool = False, invalid: bool = False, busy: bool = False, failed: bool = False, taken: bool = False) -> str:
    """Add or edit a byline (L2-077): a name, a short bio and an optional photo. The name is unique."""
    name, bio = ("Marcus Bell", next(b[2] for b in BYLINES if b[0] == "Marcus Bell")) if edit else ("", "")
    if invalid:
        name = bio = ""
    if taken:
        name, bio = "Priya Raman", "Nutrition writer."
    name_err = "Add a name" if invalid else ("A byline called Priya Raman already exists" if taken else "")
    bio_err = "Add a short bio" if invalid else ""
    alert = ""
    if invalid:
        alert = error_summary("2 things to fix", [(name_err, "f-name"), (bio_err, "f-bio")]).replace('tabindex="-1"', 'tabindex="-1" autofocus')
    if failed:
        alert = form_alert("Couldn't save the byline", "The server didn't respond. Nothing was lost; try again.")
    body = f"""    {alert}
    {field("Name", "name", name, error=name_err, readonly=busy, hint="" if name_err else "As readers see it under a story.")}
    {textarea("Short bio", "bio", bio, rows=3, error=bio_err, hint=f"One or two sentences. {200 - len(bio)} characters left.", readonly=busy)}
    {file_field("Photo", "photo", optional=True, hint="JPEG, PNG or WebP, at most 5 MB. Initials show without one.", readonly=busy)}"""
    d = " disabled" if busy else ""
    label = "Save byline" if edit else "Add byline"
    go = (f'<button class="btn btn--primary btn--grow" type="submit" disabled aria-busy="true">{busy_label("Saving…")}</button>' if busy
          else f'<button class="btn btn--primary btn--grow" type="submit" data-mock-href="{href("admin-bylines", "saved")}">{label}</button>')
    foot = f'    <button class="btn btn--secondary btn--grow" type="button"{d} data-mock-href="{href("admin-bylines")}">Cancel</button>\n    {go}'
    html = dialog("Edit byline" if edit else "Add a byline", body, foot)
    if not (invalid or failed or busy or taken):
        html = autofocus_first(html, 'id="f-name"')
    return over_admin("admin-stories", bylines_behind(), html)


s = screen("byline-editor", "dialog", "Add or edit a byline", opens_from="admin-bylines", group=G,
           source="Derived: the story editor's Byline picker and the Listing editor's form; the prototype draws no byline form (L2-077).")


@s("default", "Add a byline: name, short bio and an optional photo; focus on the name.")
def _():
    return byline_editor()


@s("edit", "Edit Marcus Bell: the fields hold his name and bio.")
def _():
    return byline_editor(edit=True)


@s("invalid", "Add byline pressed with no name and no bio: summary focused, both named.")
def _():
    return byline_editor(invalid=True)


@s("busy", "Save byline pressed: busy, the fields hold still, Cancel disabled.")
def _():
    return byline_editor(edit=True, busy=True)


@s("failed", "Saving failed: message at the top, the fields kept.")
def _():
    return byline_editor(edit=True, failed=True)


@s("refused", "The name is already a byline (code byline_name_taken): the dialog says so and marks the field.")
def _():
    return byline_editor(taken=True)


def remove_byline(*, in_use: bool = False, busy: bool = False, failed: bool = False, refused: bool = False) -> str:
    """Remove a byline (L2-077): one stories use cannot be removed, so the dialog says so and offers no Remove."""
    name = "Marcus Bell" if in_use else "CF Team"
    n = byline_uses(name)
    alert = ""
    if failed:
        alert = form_alert("Couldn't remove the byline", "The server didn't respond. Nothing was lost; try again.")
    if refused:
        alert = form_alert("A story now uses this byline", "Someone chose it while this was open. Change those stories' byline first.")
    if in_use:
        body = (f'    {form_alert(f"{name} is on {n} stories", "Choose another byline on each of them, then remove this one.", kind="info", ic="info", role="status").replace(" tabindex=" + chr(34) + "-1" + chr(34), "")}')
        foot = f'    <button class="btn btn--secondary btn--grow" type="button" data-mock-href="{href("admin-bylines")}">Close</button>'
        html = dialog(f"Can't remove {name}", body, foot, sub="A byline that stories use stays until they run under another.")
        html = autofocus_first(html, 'type="button" data-mock-href')
        return over_admin("admin-stories", bylines_behind(), html)
    d = " disabled" if busy else ""
    body = f"""    {alert}
    <p>No story uses {name}. Admins will no longer see it in the story editor.</p>"""
    go = (f'<button class="btn btn--primary btn--grow" type="submit" disabled aria-busy="true">{busy_label("Removing…")}</button>' if busy
          else f'<button class="btn btn--primary btn--grow" type="submit" data-mock-href="{href("admin-bylines", "removed")}">Remove byline</button>')
    foot = f'    <button class="btn btn--secondary btn--grow" type="button"{d} data-mock-href="{href("admin-bylines")}">Keep it</button>\n    {go}'
    html = dialog(f"Remove {name}?", body, foot)
    if not (busy or failed or refused):
        html = autofocus_first(html, 'type="button"{d} data-mock-href'.replace("{d}", d))
    return over_admin("admin-stories", bylines_behind(), html)


s = screen("remove-byline", "dialog", "Remove a byline", opens_from="admin-bylines", group=G,
           source="Derived: the Remove a listing dialog; the prototype draws no byline list (L2-077).",
           not_applicable={"invalid": "There is nothing to type: it asks one question."})


@s("default", "Remove CF Team, which no story uses here: Keep it or Remove byline.")
def _():
    return remove_byline()


@s("in-use", "Marcus Bell is on stories: the dialog says to change those stories first and offers only Close.")
def _():
    return remove_byline(in_use=True)


@s("busy", "Remove byline pressed: busy, Keep it disabled.")
def _():
    return remove_byline(busy=True)


@s("failed", "Removing failed: message at the top; nothing was removed.")
def _():
    return remove_byline(failed=True)


@s("refused", "A story began using it while the dialog was open (code byline_in_use): the dialog says so.")
def _():
    return remove_byline(refused=True)


# ===========================================================================
# Newsletter
# ===========================================================================
def newsletter_page(*, scheduled: bool = False, tested: bool = False, invalid: bool = False, busy: bool = False) -> str:
    d = " disabled" if scheduled or busy else ""
    ro = scheduled or busy
    picked = ("sabbath-rest", "meal-prep-ministry", "walking-seniors")
    lead = "okafor-interview"
    also = []
    for x in [y for y in STORIES if y["id"] != lead][:6]:
        on = x["id"] in picked
        off = d or ("" if on else " disabled")
        also.append(f"""<li><label class="check check--ui pick-row"><input class="check__box" type="checkbox" name="also" value="{x["id"]}"{" checked" if on else ""}{off}>
                  <span><span class="pick-row__title">{x["title"]}</span><span class="pick-row__meta">{x["section"]} · {x["ago"]}</span></span></label></li>""")
    evs = "".join(f'<button class="interest" type="button" aria-pressed="{"true" if i < 3 else "false"}"{d}>{icon("check", "icon--xs") if i < 3 else ""}{e["title"]}</button>'
                  for i, e in enumerate(MEMBER_EVENTS))
    opts = "".join(f'<option value="{x["id"]}"{" selected" if x["id"] == lead else ""}>{x["title"]}</option>' for x in STORIES)
    send = (f'<button class="btn btn--on-brand btn--md btn--block" type="button" data-mock-href="default.html">Unschedule to edit</button>' if scheduled
            else f'<button class="btn btn--inverse btn--md btn--block" type="submit" disabled aria-busy="true">{busy_label("Scheduling…")}</button>' if busy
            else f'<button class="btn btn--inverse btn--md btn--block" type="submit" data-mock-href="scheduled.html">{icon("send")}Schedule issue</button>')
    test = (f'<button class="btn btn--secondary btn--sm btn--grow" type="button">{icon("check")}Test sent</button>' if tested
            else '<button class="btn btn--secondary btn--sm btn--grow" type="button" data-mock-href="test-sent.html">Send me a test</button>')
    past = "".join(f"""<tr><td class="table__nowrap"><span class="table__strong">#{n}</span> <span class="muted">· {date}</span></td><td>{subject}</td>
                <td class="table__end table__strong">{sent:,}</td></tr>""" for n, date, subject, sent in PAST_ISSUES)
    return f"""{admin_header("Newsletter", f'{N["name"]} · {N["readers"]} subscribers · {N["cadence"]}')}
      <form class="split split--builder" novalidate>
        <section class="card card--pad" aria-labelledby="issue-title">
          <div class="cluster"><h2 class="display builder__title" id="issue-title">Issue #{N["issue"] + 1}</h2>{pill("Scheduled" if scheduled else "Draft")}</div>
          <div class="builder__fields stack-5">
            {field("Subject line", "subject", "" if invalid else "Shame is a terrible coach (and other things we learned this week)", error="Add a subject line before scheduling." if invalid else "", readonly=ro)}
            {textarea("Editor’s note", "note", "Morning, friends. This week Danielle Okafor tells us why shame is a terrible coach, and Pastor Ruth makes the case for doing nothing on purpose. See you at the 5K.", rows=3, readonly=ro)}
            <div class="field"><label class="field__label" for="f-lead">The big story</label><select class="select" id="f-lead" name="lead"{d}>{opts}</select></div>
            <fieldset><legend class="field__label">Also this week <span class="field__optional">· 3 of 3</span></legend>
              <ul class="card card--list pick-list">{''.join(also)}</ul></fieldset>
            <fieldset><legend class="field__label">Events this week</legend><div class="interest-list">{evs}</div></fieldset>
            <div class="field-grid field-grid--verse">
              {field("Verse to carry", "verse", "Come to me, all who are weary, and I will give you rest.", readonly=ro)}
              {field("Reference", "reference", "Matthew 11:28", readonly=ro)}
            </div>
          </div>
        </section>
        <aside class="aside-stack aside-stack--snug sticky-aside" aria-label="Send">
          <section class="send-card">
            <p class="send-card__label">{'Scheduled for' if scheduled else 'Goes out'}</p>
            <p class="send-card__date">Sat Apr 18</p>
            <p class="send-card__meta">7:00 AM Eastern · {N["readers"]} people</p>
            {send}
          </section>
          <div class="btn-row"><a class="btn btn--secondary btn--sm btn--grow" href="{href("newsletter")}">{icon("eye")}Preview</a>{test}</div>
          <p class="visually-hidden" role="status">{"Test sent to dana@christian.fitness" if tested else ""}</p>
          <p class="builder__note">Add-on emails (event alerts, training plan, devotions) send on their own schedules.</p>
        </aside>
      </form>
      <section class="mt-12" aria-labelledby="sent-title">
        <h2 class="display section-title" id="sent-title">Sent</h2>
        <div class="table-wrap table-wrap--flush"><table class="table">
          <caption class="visually-hidden">Sent issues</caption>
          <thead><tr><th scope="col">Issue</th><th scope="col">Subject</th><th scope="col" class="table__end">Sent to</th></tr></thead>
          <tbody>{past}</tbody></table></div>
      </section>"""


s = screen("admin-newsletter", "page", "Manage newsletter", route="/admin/newsletter", group=G, source=SRC + "Manage Newsletter (a8DT1WJeneyWzSHPUmcZow)",
           not_applicable={"empty": "There is always a next issue to build; before the first is sent the Sent table says so."})


@s("default", "Build the next issue: subject line, editor's note, the big story, up to three more stories, the week's events and a verse; beside it, when it goes out and to how many, Schedule issue, Preview and Send me a test; below, the issues already sent with how many opened and clicked.")
def _():
    return admin_shell("admin-newsletter", newsletter_page())


@s("moderator", "A Moderator (L2-019 AC5; ADR 0064) on Newsletter: the navigation shows their areas, without group names, and the issue is built, scheduled and sent as an Admin does; nothing on the screen differs.")
def _():
    return admin_shell("admin-newsletter", newsletter_page(), staff=MODERATOR)


@s("scheduled", "The issue is scheduled: its fields are locked and the card offers \"Unschedule to edit\".")
def _():
    return admin_shell("admin-newsletter", newsletter_page(scheduled=True))


@s("test-sent", "Send me a test pressed: the button reads \"Test sent\" and a status message names the address.")
def _():
    return admin_shell("admin-newsletter", newsletter_page(tested=True))


@s("invalid", "Schedule pressed with no subject line: the field is marked and says what to add; nothing is scheduled.")
def _():
    return admin_shell("admin-newsletter", newsletter_page(invalid=True))


@s("submitting", "Schedule issue pressed: button busy, fields read-only.")
def _():
    return admin_shell("admin-newsletter", newsletter_page(busy=True))


@s("loading", "Newsletter loading: the heading is there; the issue, send card and sent table show as skeletons.")
def _():
    sk = ('<div class="split split--builder"><div class="card card--pad skeleton-stack"><span class="skeleton skeleton--title w-30"></span>'
          '<span class="skeleton skeleton--button-block"></span><span class="skeleton skeleton--tile"></span><span class="skeleton skeleton--tile"></span></div>'
          '<div class="skeleton-stack"><span class="skeleton skeleton--tile"></span><span class="skeleton skeleton--button-block"></span></div></div>')
    return admin_shell("admin-newsletter", admin_header("Newsletter", f'{N["name"]} · {N["cadence"]}') + loading_region("Loading the newsletter", sk))


@s("error", "Newsletter failed to load: retry in place.")
def _():
    return admin_shell("admin-newsletter", admin_header("Newsletter", f'{N["name"]} · {N["cadence"]}') + error_block(
        "The newsletter didn't load", "We couldn't reach Christian Fitness. Check your connection and try again.", retry="default.html", ref="CF-A4N8"))


# ===========================================================================
# Event series
# ===========================================================================
NEW_DATE = {"n": 9, "weekday": "Tue", "month": "Jun", "day": "02", "topic": "Make-up run for Victoria Day week", "status": "upcoming"}
NEW_SERIES = {"id": "sunday-stretch", "title": "Sunday Stretch & Prayer", "host": "faith-footwork", "cadence": "Every Sunday", "time": "4:00 PM",
              "range": "No dates yet", "place": "St. Lawrence Community Rec Centre", "image": "hoops", "series_price": "Free", "drop_in": "Free",
              "enrolled": 0, "capacity": 25, "sessions": []}


def series_admin(sr: dict, *, cancelled: tuple = (), extra: bool = False, picks: tuple = ()) -> str:
    def status(x):
        return "cancelled" if x["n"] in cancelled else x["status"]
    sessions = sr["sessions"] + ([NEW_DATE] if extra else [])
    remaining = sum(1 for x in sessions if status(x) in ("next", "upcoming"))
    picker = "".join(f"""<li><a class="pick-card" href="{href("admin-series", "default" if x["id"] == "couch-to-5k" else "series-created" if x["id"] == "sunday-stretch" else "selected")}"{CUR if x["id"] == sr["id"] else ""}>
              <span class="pick-card__title">{x["title"]}</span><span class="pick-card__meta">{x["cadence"]} · {x["time"]}</span>
              <span class="pick-card__count">{x["enrolled"]} / {x["capacity"]} joined</span></a></li>""" for x in list(picks) + SERIES)
    rows = []
    for x in sessions:
        st = status(x)
        past, gone = st == "past", st == "cancelled"
        name = f'session {x["n"]}, {x["weekday"]} {x["month"]} {x["day"]}'
        end = ('<span class="admin-session__done">Done</span>' if past
               else f'{pill("Cancelled")}<button class="btn btn--link" type="button">Restore<span class="visually-hidden"> {name}</span></button>' if gone
               else (pill("Live") if st == "next" else "") + f'<button class="btn btn--link btn--link-quiet" type="button" data-mock-href="{href("cancel-session")}">Cancel date<span class="visually-hidden">: {name}</span></button>')
        mod = " admin-session--past" if past else " admin-session--cancelled" if gone else ""
        rows.append(f"""<li class="admin-session{mod}"><span class="admin-session__n" aria-hidden="true">{x["n"]}</span>
                <span class="admin-session__date">{x["weekday"]} {x["month"]} {x["day"]}</span>
                <span class="admin-session__topic">{x["topic"]}</span><span class="admin-session__end">{end}</span></li>""")
    pct = round(sr["enrolled"] / sr["capacity"] * 100)
    new = f'<button class="btn btn--primary btn--md" type="button" data-mock-href="{href("series-editor")}">{icon("plus")}New series</button>'
    return f"""{admin_header("Event series", "Recurring programs. Members join the whole series or drop in to one date.", new)}
      <div class="split split--picker">
        <nav aria-label="Series"><ul class="pick-cards">{picker}</ul></nav>
        <section aria-labelledby="series-title">
          <div class="card card--pad-sm series-summary-card">
            {image(sr["image"], "series-summary-card__image")}
            <div class="series-summary-card__body">
              <h2 class="series-summary-card__title" id="series-title">{sr["title"]}</h2>
              <p class="muted">Hosted by {LS[sr["host"]]["name"]}</p>
              <p class="series-summary-card__facts"><span>{icon("repeat")}{sr["cadence"]}, {sr["time"]} · {sr["range"]}</span><span>{icon("map-pin")}{sr["place"]}</span></p>
            </div>
            <button class="btn btn--secondary btn--sm" type="button" data-mock-href="{href("series-editor", "edit" if sr["id"] == "couch-to-5k" else "edit-bootcamp")}">Edit details<span class="visually-hidden">: {sr["title"]}</span></button>
            <dl class="series-summary-card__stats">
              <div><dt>Joined</dt><dd>{sr["enrolled"]} of {sr["capacity"]}</dd>
                <dd><meter class="fill__meter" min="0" max="{sr["capacity"]}" value="{sr["enrolled"]}">{pct}% full</meter></dd></div>
              <div><dt>Price</dt><dd>{sr["series_price"]}</dd><dd class="series-summary-card__sub">Drop-in {sr["drop_in"]}</dd></div>
              <div><dt>Sessions left</dt><dd>{remaining} of {len(sr["sessions"])}</dd></div>
            </dl>
          </div>
          <div class="section-head mt-section">
            <h3 class="display section-title">Sessions</h3>
            <button class="btn btn--link" type="button" data-mock-href="{href("add-session")}">{icon("plus")}Add a date</button>
          </div>
          {f'<ol class="card card--list admin-sessions">{"".join(rows)}</ol>' if rows else empty_block("No dates yet", "Members can join once the series has dates. Add the first one.", f'<button class="btn btn--primary btn--sm" type="button" data-mock-href="{href("add-session")}">{icon("plus")}Add a date</button>', tag="p", tight=True)}
          <p class="builder__note">Cancelling a date notifies everyone who joined the series and refunds drop-ins.</p>
        </section>
      </div>"""


s = screen("admin-series", "page", "Manage event series", route="/admin/series", group=G, source=SRC + "Manage Event Series (g6Yoc6foAh3AGmnPX2Khdx)")


@s("default", "Couch to 5K Run Club chosen from the three series: host, cadence, place, how many joined, prices, sessions left, and every session with Done, Live or Cancelled and a way to cancel or restore a date.")
def _():
    return admin_shell("admin-series", series_admin(SR["couch-to-5k"]))


@s("moderator", "A Moderator (L2-019 AC5; ADR 0064) on Event series: the navigation shows their areas, without group names, and series and their dates are managed as an Admin does; nothing on the screen differs.")
def _():
    return admin_shell("admin-series", series_admin(SR["couch-to-5k"]), staff=MODERATOR)


@s("selected", "Saturday Park Bootcamp chosen: a paid series with a drop-in price.")
def _():
    return admin_shell("admin-series", series_admin(SR["park-bootcamp"]))


@s("date-cancelled", "A date was just cancelled (session 5): it reads Cancelled with Restore, the sessions left fall by one and a toast confirms who was told.")
def _():
    return admin_shell("admin-series", series_admin(SR["couch-to-5k"], cancelled=(5,)),
                       after=toast_region(toast("success", "Tue May 5 cancelled", "31 members were told."), admin=True))


@s("series-created", "A series was just created: the new series is chosen with no dates yet, and a toast says it was created.")
def _():
    return admin_shell("admin-series", series_admin(NEW_SERIES, picks=(NEW_SERIES,)),
                       after=toast_region(toast("success", "Sunday Stretch & Prayer created", "Add its first date so members can join."), admin=True))


@s("series-saved", "Edit details saved: the summary shows the changes and a toast says so.")
def _():
    return admin_shell("admin-series", series_admin(SR["couch-to-5k"]),
                       after=toast_region(toast("success", "Couch to 5K Run Club updated", "Members see the changes now."), admin=True))


@s("date-added", "A date was just added (session 9): it joins the list as upcoming, Sessions left rises by one and a toast confirms it.")
def _():
    return admin_shell("admin-series", series_admin(SR["couch-to-5k"], extra=True),
                       after=toast_region(toast("success", "Tue Jun 2 added", "It is now listed under Events."), admin=True))


@s("loading", "Series loading: the list and the chosen series show as skeletons.")
def _():
    sk = ('<div class="split split--picker"><div class="skeleton-stack"><span class="skeleton skeleton--tile"></span><span class="skeleton skeleton--tile"></span>'
          '<span class="skeleton skeleton--tile"></span></div><div class="skeleton-stack"><span class="skeleton skeleton--tile"></span>' + table_skeleton(4) + '</div></div>')
    return admin_shell("admin-series", admin_header("Event series", "Recurring programs. Members join the whole series or drop in to one date.") + loading_region("Loading series", sk))


@s("empty", "No series yet: says what a series is and offers New series.")
def _():
    return admin_shell("admin-series", admin_header("Event series", "Recurring programs. Members join the whole series or drop in to one date.") + empty_block(
        "No series yet", "A series is a run of dated sessions members join once, such as eight Tuesdays of Couch to 5K.",
        f'<button class="btn btn--primary btn--sm" type="button" data-mock-href="{href("series-editor")}">{icon("plus")}New series</button>'))


@s("error", "Series failed to load: retry in place.")
def _():
    return admin_shell("admin-series", admin_header("Event series", "Recurring programs. Members join the whole series or drop in to one date.") + error_block(
        "Series didn't load", "We couldn't reach Christian Fitness. Check your connection and try again.", retry="default.html", ref="CF-A9R3"))


def cancel_session(*, busy: bool = False, failed: bool = False) -> str:
    alert = ('<div class="dialog__alert">' + form_alert("We couldn't cancel this date", "Nothing was changed and nobody was told. Try again in a moment.") + "</div>"
             if failed else "")
    body = f'{alert}<p class="prose">The 31 members who joined the series are told, anyone who dropped in for this date is refunded, and the date shows as Cancelled on the series. You can restore it until it would have started.</p>'
    keep = f'<button class="btn btn--secondary btn--grow" type="button" data-mock-href="{href("admin-series")}"{" disabled" if busy else " autofocus"}>Keep the date</button>'
    go = (f'<button class="btn btn--primary btn--grow" type="submit" disabled aria-busy="true">{busy_label("Cancelling…")}</button>' if busy
          else f'<button class="btn btn--primary btn--grow" type="submit" data-mock-href="{href("admin-series", "date-cancelled")}">Cancel date</button>')
    return over_admin("admin-series", series_admin(SR["couch-to-5k"]),
                      dialog("Cancel this date?", body, keep + go, sub="Couch to 5K Run Club · Session 5 · Tue May 5, 6:30 PM"))


s = screen("cancel-session", "dialog", "Cancel a series date", group=G, opens_from="admin-series",
           source="Derived: the Manage Event Series frame's \"Cancel date\" action, confirmed in a dialog as cancelling an event is (ADR 0035), since it notifies members.",
           not_applicable={"invalid": "A confirmation with nothing to type."})


@s("default", "Confirm cancelling one date: who is told, what is refunded and that it can be restored; focus starts on \"Keep the date\".")
def _():
    return cancel_session()


@s("busy", "Cancel date pressed: button busy, the other disabled.")
def _():
    return cancel_session(busy=True)


@s("failed", "Cancelling failed: a message in the dialog; nothing was changed and nobody was told.")
def _():
    return cancel_session(failed=True)


def series_editor(*, edit: bool = False, invalid: bool = False, busy: bool = False, failed: bool = False, host: str = "",
                  bootcamp: bool = False) -> str:
    """The series dialog. host is "" (the saved or default host), "searching", "selected" or "no-results" (ADR 0067)."""
    if edit:
        sr = SR["park-bootcamp" if bootcamp else "couch-to-5k"]
        v = dict(title=sr["title"], host="Danielle Okafor" if bootcamp else LS["lakeshore-runners"]["name"], price="Free", drop="Free",
                 cap="30" if bootcamp else "40", place="Centennial Park, Etobicoke" if bootcamp else "Humber Bay Park East",
                 area="Etobicoke", desc=sr["summary"])
    else:
        v = dict(title="Sunday Stretch & Prayer", host="Christian Fitness", price="Free", drop="Free", cap="25",
                 place="St. Lawrence Community Rec Centre", area="Downtown",
                 desc="Forty minutes of gentle stretching and mobility, then a short time of prayer. All levels, no equipment.")
    if host == "searching":
        v["host"] = "Lakeshore"
    elif host == "no-results":
        v["host"] = "Northside"
    elif host == "selected":
        v["host"] = LS["lakeshore-runners"]["name"]
    title_err = cap_err = host_err = ""
    alert = ""
    if invalid:
        if edit:
            v.update(cap="20")
            cap_err = "31 members have joined. Set a capacity of at least 31"
            alert = error_summary("1 thing to fix before saving", [(cap_err, "f-capacity")])
        else:
            v.update(title="", host="", cap="0")
            title_err = "Give the series a title members will recognize"
            host_err = "Choose a Listed host"
            cap_err = "Set a capacity of at least 1"
            alert = error_summary("3 things to fix before saving",
                                  [(title_err, "f-title"), (host_err, "f-host"), (cap_err, "f-capacity")])
        alert = alert.replace('tabindex="-1"', 'tabindex="-1" autofocus')
    if failed:
        alert = form_alert("Couldn't save the changes" if edit else "Couldn't create the series",
                           "The server didn't respond. Nothing was changed and what you typed is still here; try again.")
    ro = busy
    if host == "searching":
        results = ('<ul class="pick-cards" aria-label="Matching hosts"><li><a class="pick-card" href="selected.html">'
                   f'<span class="pick-card__title">{LS["lakeshore-runners"]["name"]}</span>'
                   '<span class="pick-card__meta">Group · Listed</span></a></li></ul><a href="no-results.html">See no results</a>')
    elif host == "no-results":
        results = '<p role="status">No Listed hosts match “Northside”. Try another search.</p><a href="searching.html">Search again</a>'
    elif ro:
        results = ""
    else:
        results = '<a href="searching.html">Search hosts</a>'
    body = f"""{alert}
    {field("Title", "title", v["title"], error=title_err, readonly=ro)}
    {field("Host", "host", v["host"], required=True, error=host_err, hint="" if host_err else "Search Listed directory listings", readonly=ro)}{results}
    {textarea("Description", "description", v["desc"], rows=3, hint="Up to 1,000 characters", readonly=ro)}
    {file_field("Image", "image", filename="couch-to-5k.jpg" if edit and not bootcamp else "", hint="JPEG, PNG or WebP, up to 5 MB", optional=True, readonly=ro)}
    <div class="field-grid">
      {field("Series price", "series-price", v["price"], hint="Leave blank for free", readonly=ro)}
      {field("Drop-in price", "drop-in-price", v["drop"], hint="Leave blank if there is no drop-in", readonly=ro)}
    </div>
    {field("Capacity", "capacity", v["cap"], type_="number", extra='min="1" inputmode="numeric"', error=cap_err, readonly=ro)}
    {field("Location", "place", v["place"], readonly=ro)}
    {field("Suggestion area", "area", v["area"], hint="Where members are told about it: neighbourhood and city", readonly=ro)}"""
    verb = "Save changes" if edit else "Create series"
    to = href("admin-series", "series-saved" if edit else "series-created")
    go = (f'<button class="btn btn--primary btn--grow" type="submit" disabled aria-busy="true">{busy_label("Saving…" if edit else "Creating…")}</button>' if busy
          else f'<button class="btn btn--primary btn--grow" type="submit" data-mock-href="{to}">{verb}</button>')
    cancel = f'<button class="btn btn--secondary btn--grow" type="button" data-mock-href="{href("admin-series")}"{" disabled" if busy else ""}>Cancel</button>'
    sub = f"{v['title']} · changes show to members at once" if edit else "Dates are added from the series itself, once it exists."
    html = dialog("Edit series details" if edit else "New series", body, cancel + go, did="dlg", sub=sub)
    if not invalid and not busy and not host:
        html = autofocus_first(html, 'id="f-title"')
    return over_admin("admin-series", series_admin(SR["park-bootcamp" if bootcamp else "couch-to-5k"]), html)


s = screen("series-editor", "dialog", "Series editor", group=G, opens_from="admin-series",
           source="Derived: the Manage Event Series frame's \"New series\" and \"Edit details\" buttons, which have no screen in the prototype; a dialog, as AGENTS.md rules out inline forms. The Host picker follows ADR 0067.")


@s("default", "New series: title, a Host defaulting to the Christian Fitness team listing, description, image, series and drop-in prices, capacity, location and suggestion area; Create series.")
def _():
    return series_editor()


@s("searching", "Searching Listed hosts: matching listings show as choices.")
def _():
    return series_editor(host="searching")


@s("selected", "A matching Listed host has been chosen.")
def _():
    return series_editor(host="selected")


@s("no-results", "A host search with no matching Listed listings says so.")
def _():
    return series_editor(host="no-results")


@s("invalid", "Create pressed with no title, no host and no capacity: each field marked, an error summary focused; nothing is saved.")
def _():
    return series_editor(invalid=True)


@s("busy", "Create series pressed: button busy, the other disabled, fields read-only.")
def _():
    return series_editor(busy=True)


@s("failed", "Creating failed: a message in the dialog; nothing was changed and what was typed stays.")
def _():
    return series_editor(failed=True)


@s("edit", "Edit details on Couch to 5K Run Club: the same fields filled in with its saved host; Save changes.")
def _():
    return series_editor(edit=True)


@s("edit-bootcamp", "Edit Saturday Park Bootcamp with its saved host Danielle Okafor.")
def _():
    return series_editor(edit=True, bootcamp=True)


@s("edit-invalid", "Capacity set below the 31 who joined: the field is marked and says the lowest allowed; nothing is saved.")
def _():
    return series_editor(edit=True, invalid=True)


@s("edit-busy", "Save changes pressed: button busy, fields read-only.")
def _():
    return series_editor(edit=True, busy=True)


@s("edit-failed", "Saving failed: a message in the dialog; the series is unchanged and the edits stay.")
def _():
    return series_editor(edit=True, failed=True)


def add_session(*, invalid: bool = False, busy: bool = False, failed: bool = False) -> str:
    v = dict(date="2026-06-02", start="18:30", end="19:30", topic="Make-up run for Victoria Day week")
    date_err = end_err = ""
    alert = ""
    if invalid:
        v.update(date="2026-04-10", end="18:00")
        date_err = "Pick a date after today, April 15"
        end_err = "End the session after it starts, at 6:30 PM"
        alert = error_summary("2 things to fix before adding", [(date_err, "f-date"), (end_err, "f-end")]).replace('tabindex="-1"', 'tabindex="-1" autofocus')
    if failed:
        alert = form_alert("We couldn't add this date", "Nothing was changed and nobody was told. Try again in a moment.")
    ro = busy
    body = f"""{alert}
    {field("Date", "date", v["date"], type_="date", error=date_err, readonly=ro)}
    <div class="field-grid">
      {field("Start time", "start", v["start"], type_="time", readonly=ro)}
      {field("End time", "end", v["end"], type_="time", error=end_err, readonly=ro)}
    </div>
    {field("Topic", "topic", v["topic"], optional=True, hint="What this session covers", readonly=ro)}"""
    go = (f'<button class="btn btn--primary btn--grow" type="submit" disabled aria-busy="true">{busy_label("Adding…")}</button>' if busy
          else f'<button class="btn btn--primary btn--grow" type="submit" data-mock-href="{href("admin-series", "date-added")}">Add date</button>')
    cancel = f'<button class="btn btn--secondary btn--grow" type="button" data-mock-href="{href("admin-series")}"{" disabled" if busy else ""}>Cancel</button>'
    html = dialog("Add a date", body, cancel + go, sub="Couch to 5K Run Club · becomes session 9")
    if not invalid and not busy:
        html = autofocus_first(html, 'id="f-date"')
    return over_admin("admin-series", series_admin(SR["couch-to-5k"]), html)


s = screen("add-session", "dialog", "Add a series date", group=G, opens_from="admin-series",
           source="Derived: the Manage Event Series frame's \"Add a date\" button, which has no screen in the prototype; it makes the session event.")


@s("default", "Add a date to the chosen series: date, start and end time and an optional topic; Add date.")
def _():
    return add_session()


@s("invalid", "A past date and an end before the start: both fields marked, an error summary focused; nothing is added.")
def _():
    return add_session(invalid=True)


@s("busy", "Add date pressed: button busy, the other disabled, fields read-only.")
def _():
    return add_session(busy=True)


@s("failed", "Adding failed: a message in the dialog; nothing was changed and what was typed stays.")
def _():
    return add_session(failed=True)


# ===========================================================================
# Community Pick
# ===========================================================================
PLATFORMS = ["Instagram", "Facebook", "WhatsApp", "Slack"]
PICKED = {"hoops-night": "Apr 6"}  # id -> when the console last picked it
PICK_NOTE = "Flat, stroller-friendly, and you finish as the sun comes up."


def pick_art(e: dict, shape: str, photo: bool = True) -> str:
    """The branded graphic, drawn in HTML here; the product renders it to a PNG at the size named beside it.
    An event with no image gets the brand pattern in place of the photo."""
    back = image(e["image"], "pick-art__photo") if photo else '<div class="pick-art__pattern"></div>'
    return f"""<div class="pick-art pick-art--{shape}{"" if photo else " pick-art--pattern"}" role="img" aria-label="Community Pick graphic: {e["title"]}, {e["weekday"]} {e["month"]} {int(e["day"])}">
              {back}
              <div class="pick-art__shade"></div>
              <p class="pick-art__label">Community Pick</p>
              <div class="pick-art__body"><p class="pick-art__title">{e["title"]}</p><p class="pick-art__when">{e["weekday"]} {e["month"]} {int(e["day"])} · {e["time"]} · {e["area"]}</p>
              <p class="pick-art__note">{PICK_NOTE}</p></div>
            </div>"""


def asset(label: str, file: str, art: str) -> str:
    return f"""<figure class="asset">{art}
            <figcaption class="asset__caption"><span class="asset__label">{label}</span>
            <button class="btn btn--secondary btn--xs" type="button">{icon("download")}PNG<span class="visually-hidden">: {file}</span></button></figcaption></figure>"""


def caption(text: str, hint: str = "") -> str:
    return f"""<div class="caption">
            <div class="caption__head"><h3 class="caption__title">Caption</h3><button class="btn btn--neutral btn--xs" type="button">{icon("copy")}Copy<span class="visually-hidden"> caption</span></button></div>
            <pre class="caption__text">{text}</pre>
            {f'<p class="caption__hint">{hint}</p>' if hint else ''}
          </div>"""


def pick_assets(e: dict, platform: str, photo: bool = True) -> str:
    slug = f'community-pick-{e["id"]}'
    art_of = lambda ev, shape: pick_art(ev, shape, photo)  # noqa: E731
    link = f'www.christian.fitness/e/{e["public_id"]}'
    when = f'{e["weekday"]}, {e["month"]} {int(e["day"])} at {e["time"]}'
    left = e["capacity"] - e["going"]
    tabs_ = "".join(f'<a class="segmented__option segmented__option--ink" href="{"default" if p == "Instagram" else p.lower()}.html"{CUR if p == platform else ""}>{p}</a>' for p in PLATFORMS)
    head = f'<nav class="segmented segmented--flush" aria-label="Platform">{tabs_}</nav>'
    if platform == "Instagram":
        body = f"""<div class="assets assets--insta">{asset("Post · 1080 × 1080", f"{slug}-instagram-post.png", art_of(e, "square"))}{asset("Story · 1080 × 1920", f"{slug}-instagram-story.png", art_of(e, "story"))}</div>
          {caption(f"Community Pick: {e['title']}\n\n{PICK_NOTE}\n\n{when}\n{e['place']}\n{e['price']}. Link in bio, or register at {link}\n\n#ChristianFitness #CommunityPick #TorontoFitness #FaithAndFitness")}"""
    elif platform == "Facebook":
        body = f"""{asset("Link image · 1200 × 630", f"{slug}-facebook.png", art_of(e, "landscape"))}
          {caption(f"This week’s Community Pick: {e['title']}.\n\n{PICK_NOTE}\n\n{when} · {e['place']}\n{e['price']}, {left} spots left.\n\nRegister: https://{link}")}"""
    elif platform == "WhatsApp":
        body = f"""<div class="assets assets--pair">{asset("Image · 1080 × 1080", f"{slug}-whatsapp.png", art_of(e, "square"))}
          {caption(f"*Community Pick: {e['title']}*\n_{PICK_NOTE}_\n\n{when}\n{e['place']}\n{e['price']}\n\nRegister: https://{link}", "Asterisks and underscores format as bold and italic in WhatsApp.")}</div>"""
    else:
        body = f"""<div class="card card--pad-sm slack-preview" aria-label="How the post will look in Slack">
            <span class="avatar avatar--group" aria-hidden="true">CF</span>
            <div class="slack-preview__body"><p><strong>Christian Fitness</strong> <span class="muted">9:02 AM</span></p>
              <p><strong>Community Pick:</strong> <span class="slack-preview__link">{e["title"]}</span></p><p>{PICK_NOTE}</p><p>{when} · {e["place"]} · {e["price"]}</p>
              <div class="slack-preview__unfurl"><p class="slack-preview__site">www.christian.fitness</p>{art_of(e, "landscape")}</div></div>
          </div>
          <div class="assets assets--pair">{asset("Unfurl image · 1200 × 630", f"{slug}-slack.png", art_of(e, "landscape"))}
          {caption(f"*Community Pick:* &lt;https://{link}|{e['title']}&gt;\n{PICK_NOTE}\n{when} · {e['place']} · {e['price']}", "Slack formatting: the title becomes a link.")}</div>"""
    return head + f'<div class="pick-assets">{body}</div>'


def pick_page(right: str, *, creating: bool = False, changed: bool = False, events: list | None = None, failed: bool = False) -> str:
    events = MEMBER_EVENTS if events is None else events
    rows = "".join(f"""<li><label class="event-choice"><input class="event-choice__input" type="radio" name="event" value="{x["id"]}"{" checked" if i == 0 else ""}{" disabled" if creating else ""}>
              {image(x["image"], "event-choice__image")}
              <span class="event-choice__body"><span class="event-choice__when">{x["weekday"]} {x["month"]} {x["day"]}</span><span class="event-choice__title">{x["title"]}</span><span class="event-choice__area">{x["area"]}{" · Last picked " + PICKED[x["id"]] if x["id"] in PICKED else ""}</span></span>
            </label></li>""" for i, x in enumerate(events))
    btn = (f'<button class="btn btn--primary btn--lg btn--block" type="submit" disabled aria-busy="true">{busy_label("Creating…")}</button>' if creating
           else f'<button class="btn btn--primary btn--lg btn--block" type="submit" data-mock-href="default.html">{icon("sparkles")}{"Recreate assets" if changed else "Create assets"}</button>')
    stale = ('<p class="caption__hint" role="status">You changed the event or note. Recreate to update.</p>' if changed else "")
    err = ('<p class="register__error" role="alert">We couldn\'t create the assets. Try again in a moment.</p>' if failed else "")
    return f"""{admin_header("Community Pick", "Choose an event and get branded posts for Instagram, Facebook, WhatsApp and Slack.")}
      <div class="split split--pick">
        <form class="sticky-aside" novalidate>
          <fieldset><legend class="field__label field__label--md">Event</legend><ul class="event-choices">{rows}</ul></fieldset>
          <div class="pick-note">{textarea("Why it’s a pick", "note", PICK_NOTE, rows=2, hint=f"One line. It goes on the graphics and in every caption. {len(PICK_NOTE)} of 70 characters.", readonly=creating)}</div>
          {err}{stale}{btn}
        </form>
        <section aria-label="Assets">{right}</section>
      </div>"""


PICK_EMPTY = f"""<div class="pick-empty"><div class="pick-empty__art">{pick_art(EV["sunrise-5k"], "square")}</div>
          <p class="pick-empty__title">Five files, four platforms, one click</p>
          <p class="pick-empty__text">Instagram post and story, a Facebook and Slack link image, and a WhatsApp square, each with its caption ready to paste.</p></div>"""

s = screen("admin-community-pick", "page", "Community Pick", route="/admin/community-pick", group=G, source=SRC + "Community Pick (amrjvVDHvcFBrmhSctpEJv)")


@s("default", "Assets made for the Easter Sunrise 5K, Instagram chosen: a square post and a tall story to download as PNG, and the caption to copy.")
def _():
    return admin_shell("admin-community-pick", pick_page(pick_assets(EV["sunrise-5k"], "Instagram")))


@s("moderator", "A Moderator (L2-019 AC5; ADR 0064) on Community Pick: the navigation shows their areas, without group names, and the assets are made and downloaded as an Admin does; nothing on the screen differs.")
def _():
    return admin_shell("admin-community-pick", pick_page(pick_assets(EV["sunrise-5k"], "Instagram")), staff=MODERATOR)


@s("pick", "Before anything is made: choose an event, write one line on why it is a pick, and Create assets; the right side previews what will come.")
def _():
    return admin_shell("admin-community-pick", pick_page(PICK_EMPTY))


@s("creating", "Create assets pressed: the button is busy and the event and note are read-only.")
def _():
    return admin_shell("admin-community-pick", pick_page(PICK_EMPTY, creating=True))


@s("facebook", "Facebook chosen: one link image and a caption with the registration link and spots left.")
def _():
    return admin_shell("admin-community-pick", pick_page(pick_assets(EV["sunrise-5k"], "Facebook")))


@s("whatsapp", "WhatsApp chosen: a square image and a caption with WhatsApp's bold and italic marks.")
def _():
    return admin_shell("admin-community-pick", pick_page(pick_assets(EV["sunrise-5k"], "WhatsApp")))


@s("slack", "Slack chosen: a preview of the post as it will look in a channel, the unfurl image and the caption in Slack's link format.")
def _():
    return admin_shell("admin-community-pick", pick_page(pick_assets(EV["sunrise-5k"], "Slack")))


@s("changed", "The event or note was changed after the assets were made: a notice and \"Recreate assets\"; the assets shown stay those last made.")
def _():
    return admin_shell("admin-community-pick", pick_page(pick_assets(EV["sunrise-5k"], "Instagram"), changed=True))


@s("no-image", "An event with no image: the graphic is built from the brand pattern, with the title, date and place set in type.")
def _():
    return admin_shell("admin-community-pick", pick_page(pick_assets(EV["sunrise-5k"], "Instagram", photo=False)))


@s("failed", "Creating the assets failed: a message above the button, which stays usable; nothing on the right changes.")
def _():
    return admin_shell("admin-community-pick", pick_page(PICK_EMPTY, failed=True))


@s("loading", "Events loading: the event list shows as skeleton rows.")
def _():
    sk = '<div class="split split--pick"><div class="skeleton-stack">' + '<span class="skeleton skeleton--tile"></span>' * 4 + '</div><div></div></div>'
    return admin_shell("admin-community-pick", admin_header("Community Pick", "Choose an event and get branded posts for Instagram, Facebook, WhatsApp and Slack.") + loading_region("Loading events", sk))


@s("empty", "No published upcoming event to pick: says so and points to Events.")
def _():
    return admin_shell("admin-community-pick", admin_header("Community Pick", "Choose an event and get branded posts for Instagram, Facebook, WhatsApp and Slack.") + empty_block(
        "No events to pick yet", "A pick is made from a published event that is still to come.",
        f'<a class="btn btn--primary btn--sm" href="{href("admin-events")}">Go to Events</a>'))


@s("error", "Events failed to load: retry in place.")
def _():
    return admin_shell("admin-community-pick", admin_header("Community Pick", "Choose an event and get branded posts for Instagram, Facebook, WhatsApp and Slack.") + error_block(
        "Events didn't load", "We couldn't reach Christian Fitness. Check your connection and try again.", retry="default.html", ref="CF-A5P2"))


# ===========================================================================
# Listings
# ===========================================================================
def listings_page(body: str, tab: str = "Suggestions", *, pending: object = 3, listed: object = len(LISTINGS)) -> str:
    return (admin_header("Listings", "Nothing goes in the directory until it passes all four checks.") + "\n"
            + tabs("Listings", [("Suggestions", pending, href("admin-listings")), ("Listed", listed, href("admin-listings", "listed"))], tab) + "\n" + body)


def suggestion_view(sel: str = "s2", *, passed: tuple | None = None, decided: str = "", busy: bool = False) -> str:
    sg = next(x for x in SUGGESTIONS if x["id"] == sel)
    passed = sg["passed"] if passed is None else passed
    items = []
    for x in SUGGESTIONS:
        who = "Self-submitted" if x["relation"] == "Is them" else f'From {x["by"]}'
        tag = f'<span class="pick-card__tag">{decided.capitalize()}</span>' if decided and x["id"] == sel else ""
        items.append(f"""<li><a class="pick-card pick-card--light" href="{'default' if x["id"] == 's2' else 'unchecked'}.html"{CUR if x["id"] == sel else ""}>
              <span class="pick-card__title">{x["name"]}{tag}</span><span class="pick-card__meta">{x["kind"]} · {x["area"]}</span>
              <span class="pick-card__meta">{who} · {x["submitted"]}</span></a></li>""")
    checks = "".join(f"""<li><label class="check-row"><input class="check-row__box" type="checkbox" name="check" value="{k}"{" checked" if k in passed else ""}{" disabled" if decided or busy else ""}>
                <span><span class="check-row__label">{label}</span><span class="check-row__desc">{detail}</span></span></label></li>""" for k, label, detail in CHECKS)
    n = len(passed)
    if decided:
        foot = ('<p class="suggestion__result" role="status">' + ("Approved. We’ve sent them a link to claim and publish their listing." if decided == "approved"
                else "Declined. The person who suggested it has been told.") + "</p>")
    else:
        ok = n == 4
        approve = (f'<button class="btn btn--primary btn--md" type="submit" disabled aria-busy="true">{busy_label("Approving…")}</button>' if busy
                   else f'<button class="btn btn--primary btn--md" type="submit" data-mock-href="approved.html"{"" if ok else " disabled aria-describedby=" + chr(34) + "approve-hint" + chr(34)}>Approve listing</button>')
        foot = (approve + f'<button class="btn btn--secondary btn--md" type="button" data-mock-href="declined.html"{" disabled" if busy else ""}>Decline</button>'
                + ("" if ok else '<p class="suggestion__hint" id="approve-hint">Approve unlocks when all four checks pass.</p>'))
    site = (f' · <a class="inline-link inline-link--ink" href="https://{sg["website"]}" target="_blank" rel="noopener noreferrer">{sg["website"]} {icon("external-link", "icon--xs")}<span class="visually-hidden"> (opens in a new tab)</span></a>'
            if sg["website"] else "")
    by = "Submitted by the listing themselves" if sg["relation"] == "Is them" else f'{sg["by"]} · {sg["relation"].lower()}'
    return f"""<div class="split split--picker split--picker-wide">
        <nav aria-label="Suggestions"><ul class="pick-cards pick-cards--stack">{''.join(items)}</ul></nav>
        <form class="card card--pad suggestion" novalidate>
          <p class="eyebrow eyebrow--sm">{sg["kind"]}</p>
          <h2 class="suggestion__name">{sg["name"]}</h2>
          <p class="muted">{sg["area"]}{site}</p>
          <blockquote class="suggestion__note"><p>{sg["note"]}</p></blockquote>
          <p class="suggestion__by">{by}</p>
          <fieldset class="suggestion__checks">
            <div class="section-head"><legend class="display section-title">Checks</legend><p class="section-head__note">{n} of 4 passed</p></div>
            <ul class="list-divided">{checks}</ul>
          </fieldset>
          <div class="suggestion__foot">{foot}</div>
        </form>
      </div>"""


def listed_table() -> str:
    trs = "".join(f"""<tr><td><span class="listed-cell">{listing_mark(l, "sm")}<span class="table__strong">{l["name"]}</span>{verified_badge() if l["verified"] else ''}</span></td>
                <td class="table__nowrap">{l["kind"]}</td><td class="table__nowrap muted">{l["area"]}</td><td class="table__end">{l["followers"]:,}</td>
                <td class="table__end"><button class="row-link" type="button" data-mock-href="{href("directory-listing-editor")}">Edit<span class="visually-hidden"> {l["name"]}</span></button></td></tr>""" for l in LISTINGS)
    return f"""<div class="table-wrap"><table class="table">
          <caption class="visually-hidden">Listed</caption>
          <thead><tr><th scope="col">Listing</th><th scope="col">Kind</th><th scope="col">Area</th><th scope="col" class="table__end">Followers</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>
          <tbody>{trs}</tbody></table></div>"""


s = screen("admin-listings", "page", "Manage listings", route="/admin/listings", group=G, source=SRC + "Manage Listings (bVtWr4Cpi9NPbyGgeq31br)")


@s("default", "Suggestions: Coach Marcus Delaney chosen, three of the four checks passed, so Approve listing is not yet available and says why.")
def _():
    return admin_shell("admin-listings", listings_page(suggestion_view()))


@s("moderator", "A Moderator (L2-019 AC5; ADR 0064) on Listings: the navigation shows their areas, without group names, and suggestions are checked, approved and declined as an Admin does; nothing on the screen differs.")
def _():
    return admin_shell("admin-listings", listings_page(suggestion_view()), staff=MODERATOR)


@s("unchecked", "Another suggestion chosen (Rooted Physio, from a member who knows them): no check passed yet.")
def _():
    return admin_shell("admin-listings", listings_page(suggestion_view("s3")))


@s("ready", "All four checks ticked: Approve listing is available.")
def _():
    return admin_shell("admin-listings", listings_page(suggestion_view(passed=tuple(k for k, _, _ in CHECKS))))


@s("approving", "Approve listing pressed: button busy, the checks read-only.")
def _():
    return admin_shell("admin-listings", listings_page(suggestion_view(passed=tuple(k for k, _, _ in CHECKS), busy=True)))


@s("approved", "Approved: the suggestion says a link to claim and publish the listing was sent; the count of suggestions falls.")
def _():
    return admin_shell("admin-listings", listings_page(suggestion_view(passed=tuple(k for k, _, _ in CHECKS), decided="approved"), pending=2),
                       counts={"admin-listings": 2})


@s("declined", "Declined: the suggestion says the person who suggested it was told.")
def _():
    return admin_shell("admin-listings", listings_page(suggestion_view(decided="declined"), pending=2), counts={"admin-listings": 2})


@s("listed", "Listed: every listing in the directory with its kind, area and followers, and Edit.")
def _():
    return admin_shell("admin-listings", listings_page(listed_table(), "Listed"))


@s("listing-saved", "Edit saved: Listed shows the listing as changed and a toast says it is live in the directory.")
def _():
    return admin_shell("admin-listings", listings_page(listed_table(), "Listed"),
                       after=toast_region(toast("success", "Lakeshore Runners Fellowship updated", "The directory shows the changes now."), admin=True))


@s("loading", "Suggestions loading: the list and the chosen suggestion show as skeletons.")
def _():
    sk = ('<div class="split split--picker split--picker-wide"><div class="skeleton-stack"><span class="skeleton skeleton--tile"></span><span class="skeleton skeleton--tile"></span></div>'
          '<div class="card card--pad skeleton-stack"><span class="skeleton skeleton--title w-40"></span><span class="skeleton skeleton--text w-90"></span><span class="skeleton skeleton--tile"></span></div></div>')
    return admin_shell("admin-listings", listings_page(loading_region("Loading suggestions", sk), pending="", listed=""))


@s("empty", "No suggestions waiting: says so; the Listed tab is one step away.")
def _():
    return admin_shell("admin-listings", listings_page(empty_block(
        "No suggestions waiting", "When a member suggests someone for the directory, it shows here with the four checks to run.",
        f'<a class="btn btn--secondary btn--sm" href="{href("admin-listings", "listed")}">See what is listed</a>', tag="p"), pending=0),
        counts={"admin-listings": 0})


@s("error", "Suggestions failed to load: retry in place.")
def _():
    return admin_shell("admin-listings", listings_page(error_block(
        "Suggestions didn't load", "We couldn't reach Christian Fitness. Check your connection and try again.", retry="default.html", ref="CF-A1L5"),
        pending="", listed=""))


def directory_listing_editor(*, invalid: bool = False, busy: bool = False, failed: bool = False) -> str:
    lk = LS["lakeshore-runners"]
    v = dict(name=lk["name"], kind=lk["kind"], area=lk["area"], tagline=lk["tagline"], about=lk["about"], website=lk["website"])
    name_err = web_err = ""
    alert = ""
    if invalid:
        v.update(name="", website="lakeshore runners")
        name_err = "Give the listing a name members will recognize"
        web_err = "Enter a web address like lakeshorerunners.ca"
        alert = error_summary("2 things to fix before saving", [(name_err, "f-name"), (web_err, "f-website")]).replace('tabindex="-1"', 'tabindex="-1" autofocus')
    if failed:
        alert = form_alert("Couldn't save the changes", "The server didn't respond. The listing is unchanged and what you typed is still here; try again.")
    ro = busy
    body = f"""{alert}
    {field("Name", "name", v["name"], error=name_err, readonly=ro)}
    {select("Kind", "kind", LISTING_KINDS, v["kind"], disabled=ro)}
    {field("Area", "area", v["area"], hint="Neighbourhood or city", readonly=ro)}
    {field("Tagline", "tagline", v["tagline"], hint="One line, up to 100 characters", readonly=ro)}
    {textarea("About", "about", v["about"], rows=4, hint="Up to 1,000 characters", readonly=ro)}
    {field("Website", "website", v["website"], error=web_err, optional=True, readonly=ro)}
    {file_field("Logo or photo", "image", hint="JPEG, PNG or WebP, up to 5 MB", optional=True, readonly=ro)}
    <p class="field__hint">The Verified mark comes from the four checks and cannot be changed here.</p>"""
    go = (f'<button class="btn btn--primary btn--grow" type="submit" disabled aria-busy="true">{busy_label("Saving…")}</button>' if busy
          else f'<button class="btn btn--primary btn--grow" type="submit" data-mock-href="{href("admin-listings", "listing-saved")}">Save changes</button>')
    cancel = f'<button class="btn btn--secondary btn--grow" type="button" data-mock-href="{href("admin-listings", "listed")}"{" disabled" if busy else ""}>Cancel</button>'
    html = dialog("Edit listing", body, cancel + go, sub=f'{lk["name"]} · changes show in the directory at once')
    if not invalid and not busy:
        html = autofocus_first(html, 'id="f-name"')
    return over_admin("admin-listings", listings_page(listed_table(), "Listed"), html)


s = screen("directory-listing-editor", "dialog", "Directory listing editor", group=G, opens_from="admin-listings",
           source="Derived: Listed's \"Edit\" button, which has no screen in the prototype; the same editor a listing's owner gets after claiming it, opened by staff from Listed.")


@s("default", "Edit a listed directory listing: name, kind, area, tagline, about, website and image; the Verified mark is not editable here.")
def _():
    return directory_listing_editor()


@s("invalid", "Saved with no name and a malformed website: both fields marked, an error summary focused; nothing is saved.")
def _():
    return directory_listing_editor(invalid=True)


@s("busy", "Save changes pressed: button busy, the other disabled, fields read-only.")
def _():
    return directory_listing_editor(busy=True)


@s("failed", "Saving failed: a message in the dialog; the listing is unchanged and the edits stay.")
def _():
    return directory_listing_editor(failed=True)


# ===========================================================================
# Feedback inbox
# ===========================================================================
FB_STATE = {"f1": "default", "f2": "correction", "f3": "default", "f4": "resolved"}


def feedback_inbox(sel: str = "f1", *, tab: str = "All", reply: str = "", status: dict | None = None,
                   busy: bool = False, variant: str = "", sent_reply: str = "",
                   moderator: bool = False) -> str:
    notes = [x.copy() for x in FEEDBACK]
    if variant == "suspended":
        notes[0].update({"from": "Tyler Simmons", "initials": "TS", "email": "tsimmons22@gmail.com",
                         "text": "Please review my suspension. I would like to appeal.",
                         "hint": "Let them know what happens next"})
    elif variant == "failed":
        notes[0].update({"from": "A former member", "initials": "?", "email": "Account being deleted"})
    st = {x["id"]: x["status"] for x in notes} | (status or {})
    f = next(x for x in notes if x["id"] == sel)
    shown = [x for x in notes if tab == "All" or st[x["id"]] == tab]
    rows = "".join(f"""<li><a class="feedback-row" href="{variant if variant and x["id"] == "f1" else FB_STATE[x["id"]]}.html"{CUR if x["id"] == sel else ""}>
              {icon(FEEDBACK_KIND_ICON[x["kind"]], "feedback-row__icon")}
              <span class="feedback-row__body"><span class="feedback-row__top"><span class="feedback-row__from{' feedback-row__from--new' if st[x["id"]] == 'New' else ''}">{x["from"]}</span><span class="feedback-row__when">{x["when"]}</span></span>
              <span class="feedback-row__text">{x["text"]}</span><span class="visually-hidden">{x["kind"]}, {st[x["id"]]}</span></span></a></li>""" for x in shown)
    rows = rows or '<li class="feedback-row feedback-row--empty">Nothing here.</li>'
    counts = [("All", len(notes), "default.html")] + [(k, sum(1 for v in st.values() if v == k), "default.html" if k != "Resolved" else "resolved.html") for k in ("New", "Replied", "Resolved")]
    story = (f'<p class="feedback__link"><a class="btn btn--secondary btn--sm" href="{href("admin-story-editor", "published")}">{icon("pen-line")}Open the story to correct it</a></p>'
             if f["kind"] == "Correction" and not moderator else "")
    first = "the member" if variant == "failed" else f["from"].split()[0]
    send_target = ' data-mock-href="failed.html"' if variant == "failed" else ""
    resolve_target = "" if variant else ' data-mock-href="resolved.html"'
    send = (f'<button class="btn btn--primary btn--md" type="submit" disabled aria-busy="true">{busy_label("Sending…")}</button>' if busy
            else (f'<button class="btn btn--primary btn--md" type="button"{send_target}>{icon("send")}Send reply</button>' if variant
                  else f'<button class="btn btn--primary btn--md" type="submit" data-mock-href="replied.html">{icon("send")}Send reply</button>'))
    other = ('<button class="btn btn--secondary btn--md" type="button" data-mock-href="default.html">Reopen</button>' if st[sel] == "Resolved"
             else f'<button class="btn btn--secondary btn--md" type="button"{resolve_target}{" disabled" if busy else ""}>Mark resolved</button>')
    label = ' <span class="status status--suspended">Suspended</span>' if variant == "suspended" else ""
    thread = f'<section aria-labelledby="thread-title"><h3 id="thread-title">Reply sent</h3><p>{sent_reply}</p></section>' if sent_reply else ""
    refusal = '<div class="form-alert" role="alert"><div><p class="form-alert__title">We couldn’t send your reply</p><p>Nothing was changed. Your reply is still here.</p></div></div>' if variant == "failed" else ""
    header = admin_header("Feedback", "Ideas, bugs, corrections and thanks from members. Everyone hears back.").replace("\n  \n", "\n\n")
    return f"""{header}
      {tabs("Filter feedback", counts, tab)}
      <div class="split split--inbox">
        <nav aria-label="Feedback"><ul class="card card--list feedback-list">{rows}</ul></nav>
        <form class="card card--pad feedback-detail" novalidate>
          <div class="feedback-detail__head"><span class="kind-tag">{icon(FEEDBACK_KIND_ICON[f["kind"]])}{f["kind"]}</span>{pill(st[sel])}<span class="feedback-detail__when">{f["when"]}</span></div>
          <h2 class="visually-hidden">{f["kind"]} from {f["from"]}</h2>
          <p class="feedback-detail__text">{f["text"]}</p>
          <dl class="feedback-detail__facts">
            <div class="feedback-detail__from">{avatar(f["initials"], size="sm")}<div><dt class="visually-hidden">From</dt><dd class="feedback-detail__strong">{f["from"]}{label}</dd><dd class="feedback-detail__sub">{f["email"]}</dd></div></div>
            <div><dt>Sent from</dt><dd class="feedback-detail__strong">{f["page"]}</dd></div>
            <div><dt>Device</dt><dd class="feedback-detail__strong feedback-detail__device">{icon("monitor")}{f["device"]}</dd></div>
          </dl>
{story}{thread}{refusal}
          <div class="feedback-detail__reply">{textarea(f"Reply to {first}", "reply", reply, hint="" if reply else f["hint"], readonly=busy)}</div>
          <div class="cluster">{send}{other}</div>
        </form>
      </div>"""


s = screen("admin-feedback", "page", "Feedback inbox", route="/admin/feedback", group=G, source=SRC + "Feedback Inbox (p1eGpLPP99JReJ5WHBovdM)", requirements=["L2-074"])


@s("default", "Every note from members, newest first, with its kind and status; the chosen one (a bug report) shows in full with who sent it, the page it was sent from, their device, a reply box and Mark resolved.")
def _():
    return admin_shell("admin-feedback", feedback_inbox())


@s("correction", "A correction to a story chosen: a button opens that story in the editor.")
def _():
    return admin_shell("admin-feedback", feedback_inbox("f2"))


@s("suspended", "A feedback note from a suspended member, labelled Suspended in the inbox.")
def _():
    return admin_shell("admin-feedback", feedback_inbox(variant="suspended"))


@s("failed", "A reply to a deleting member is refused; the draft and note status are unchanged.")
def _():
    return admin_shell("admin-feedback", feedback_inbox(variant="failed", reply="Thanks for letting us know."))


@s("replying", "Send reply pressed: button busy, the reply read-only.")
def _():
    return admin_shell("admin-feedback", feedback_inbox(reply="Thanks, Michael. We can reproduce it on iPhone and a fix goes out this week.", busy=True))


@s("replied", "The reply was sent: the note is Replied, the reply box is empty again and a toast confirms it; one fewer note is new.")
def _():
    return admin_shell("admin-feedback", feedback_inbox(status={"f1": "Replied"}, sent_reply="Thanks, Michael. We can reproduce it on iPhone and a fix goes out this week."), counts={"admin-feedback": 1},
                       after=toast_region(toast("success", "Reply sent.", "Michael Chen gets it by email."), admin=True))


@s("moderator", "A Moderator (L2-019 AC5; ADR 0064) on a correction to a story: the navigation shows their areas, and the note can be read, answered and resolved, but \"Open the story to correct it\" is not offered, since Stories is Admins only.")
def _():
    return admin_shell("admin-feedback", feedback_inbox("f2", moderator=True), staff=MODERATOR)


@s("resolved", "A resolved note chosen: it can be reopened.")
def _():
    return admin_shell("admin-feedback", feedback_inbox("f4", tab="Resolved"))


@s("loading", "Feedback loading: the list and the chosen note show as skeletons.")
def _():
    sk = ('<div class="split split--inbox"><div class="skeleton-stack"><span class="skeleton skeleton--tile"></span><span class="skeleton skeleton--tile"></span>'
          '<span class="skeleton skeleton--tile"></span></div><div class="card card--pad skeleton-stack"><span class="skeleton skeleton--text w-30"></span>'
          '<span class="skeleton skeleton--title"></span><span class="skeleton skeleton--text w-90"></span><span class="skeleton skeleton--tile"></span></div></div>')
    return admin_shell("admin-feedback", admin_header("Feedback", "Ideas, bugs, corrections and thanks from members. Everyone hears back.") + loading_region("Loading feedback", sk))


@s("empty", "No feedback yet: says where notes come from.")
def _():
    return admin_shell("admin-feedback", admin_header("Feedback", "Ideas, bugs, corrections and thanks from members. Everyone hears back.") + empty_block(
        "No feedback yet", "Notes members send from \"Send feedback\" and from a story's \"Send a correction\" show here.", ""),
        counts={"admin-feedback": 0})


@s("error", "Feedback failed to load: retry in place.")
def _():
    return admin_shell("admin-feedback", admin_header("Feedback", "Ideas, bugs, corrections and thanks from members. Everyone hears back.") + error_block(
        "Feedback didn't load", "We couldn't reach Christian Fitness. Check your connection and try again.", retry="default.html", ref="CF-A6F4"))
