"""Member web app: Suggest a listing, Send feedback, Preferences and the two legal pages.
Layout and copy follow the Magic Patterns prototype "Christian Fitness" frames Suggest a Listing, Feedback,
Manage Preferences, Privacy Policy and Terms of Service."""
from __future__ import annotations

from cf_data import ADD_ONS, EASTSIDE, LISTING_KINDS, ME, NEWSLETTER, PREF_AREAS, PREF_INTERESTS
from cf_ui import (busy_label, empty_block, error_block, error_summary, field, file_field, form_alert, href, icon, listing_mark,
                   loading_region, lockup, member_shell, screen, textarea, toast, toast_region, verified_badge)
from overlays import autofocus_first, dialog, over_member
from screens_directory import profile_page
from screens_member import DELETION_DATE as DELETION_ERASED, SRC


def choice_cards(legend: str, name: str, options: list, picked: str, *, cols: int, disabled: bool = False) -> str:
    """One choice out of a few, as cards: real radio buttons, so arrow keys move between them."""
    cards = "".join(f"""<label class="choice choice-card">
              <input class="choice__input" type="radio" name="{name}" value="{oid}"{" checked" if oid == picked else ""}{" disabled" if disabled else ""}>
              <span><span class="choice__label">{icon(ic, "choice-card__icon") if ic else ""}{label}</span>{f'<span class="choice__desc">{hint}</span>' if hint else ""}</span>
            </label>""" for oid, label, hint, ic in options)
    return f"""<fieldset class="form-section">
            <legend class="form-section__legend">{legend}</legend>
            <div class="choice-grid choice-grid--{cols}">{cards}</div>
          </fieldset>"""


def done_panel(title: str, text: str, actions: str) -> str:
    return f"""<section class="done" role="status" tabindex="-1" autofocus>
          <span class="done__icon">{icon("check", "icon--lg")}</span>
          <h1 class="display page-title done__title">{title}</h1>
          <p class="done__text">{text}</p>
          <div class="done__actions">{actions}</div>
        </section>"""


# ===========================================================================
# Suggest a listing
# ===========================================================================
RELATIONS = [("self", "Myself", "I run it or I am them", ""), ("know", "Someone I know", "A friend, coach or group", ""),
             ("been", "Somewhere I’ve been", "I went and loved it", "")]
STEPS = [
    ("We read it within 3 days", "A real person on our team, not a filter."),
    ("We run four checks", "Credentials, insurance where it applies, two references, and a conversation about faith and practice."),
    ("They approve their listing", "Nothing goes live without the listed person or group saying yes."),
    ("You hear back", "We message you when it’s approved, or tell you why not."),
]
SUGGEST_NOTE = ("Saturday morning strength group out of Danforth Baptist. About 25 women, coached by a CSEP trainer. "
                "They pray before and after and are so welcoming to beginners.")


def suggest_form(*, relation: str = "know", invalid: bool = False, busy: bool = False, failed: bool = False) -> str:
    me = relation == "self"
    alert = ('<div class="form-section">' + form_alert(
        "We couldn't send your suggestion", "Something went wrong on our side. Everything you typed is still here, so try again in a moment.").replace(
        'tabindex="-1"', 'tabindex="-1" autofocus') + "</div>" if failed else "")
    kinds = "".join(f'<label class="chip chip--choice"><input class="chip__input" type="radio" name="kind" value="{k}"'
                    f'{" checked" if k == ("Instructor" if me else "Organization") else ""}{" disabled" if busy else ""}>{k}</label>'
                    for k in LISTING_KINDS)
    name = "" if invalid else ("Coach Marcus Delaney" if me else "Eastside Ladies Who Lift")
    them = "" if me else f"""{field("Their email", "their-email", type_="email", optional=True, hint="So we can reach them directly", readonly=busy)}
            <label class="check check--ui"><input class="check__box" type="checkbox" name="tell" checked{" disabled" if busy else ""}> It’s fine to tell them you suggested them</label>"""
    submit = (f'<button class="btn btn--primary btn--md" type="submit" disabled aria-busy="true">{busy_label("Sending…")}</button>'
              if busy else '<button class="btn btn--primary btn--md" type="submit">Send suggestion</button>')
    return f"""<form class="form-page__main" action="success.html" novalidate>
          <h1 class="display page-title">Suggest a listing</h1>
          <p class="form-page__lead">Know a church ministry, club, coach or business that belongs here? Tell us about them and we’ll do the checking.</p>
          {alert}
          {choice_cards("Who are you suggesting?", "relation", RELATIONS, relation, cols=3, disabled=busy)}
          <fieldset class="form-section">
            <legend class="form-section__legend">What kind of listing?</legend>
            <div class="cluster form-section__body">{kinds}</div>
          </fieldset>
          <div class="form-section stack-5">
            {field("Your name or your organization’s" if me else "Their name", "name", name, error="Add a name so we know who to look up." if invalid else "", readonly=busy, required=True)}
            <div class="field-grid field-grid--2">
              {field("Where they meet or work", "where", "Mississauga" if me else "Danforth & Pape, Toronto", readonly=busy)}
              {field("Website or social", "website", "delaneyperformance.ca" if me else "instagram.com/eastsideladieslift", optional=True, readonly=busy)}
            </div>
            {field("Church connection", "church", "Hope Church Mississauga" if me else "", optional=True, hint="" if me else "For example: meets at Danforth Baptist", readonly=busy)}
            {textarea("What should members know about you?" if me else "Why should they be listed?", "why",
                      "I run speed and agility for youth athletes and lead a men’s Bible study at Hope Church. Looking to list my Saturday clinics." if me else SUGGEST_NOTE, readonly=busy)}
            {them}
          </div>
          <div class="form-page__foot">
            {submit}
            <p class="form-page__as">Sent as {ME["name"]}</p>
          </div>
        </form>"""


def suggest_page(main: str, *, vetting_published: bool = True) -> str:
    steps = "".join(f'<li class="steps__item"><span class="steps__n" aria-hidden="true">{i}</span><div><p class="steps__title">{t}</p>'
                    f'<p class="steps__text">{b}</p></div></li>' for i, (t, b) in enumerate(STEPS, 1))
    vetting_link = (f'<p class="form-page__more"><a class="text-link" href="{href("story", "vetting")}">How we vet every listing</a></p>'
                    if vetting_published else "")
    return f"""    <div class="container page">
      <a class="back-link" href="{href("directory")}">{icon("arrow-left")} Directory</a>
      <div class="form-page">
        {main}
        <aside class="form-page__aside form-page__aside--low" aria-labelledby="next-title">
          <h2 class="display section-title" id="next-title">What happens next</h2>
          <ol class="steps">{steps}</ol>
          {vetting_link}
        </aside>
      </div>
    </div>"""


s = screen("suggest-listing", "page", "Suggest a listing", route="/directory/suggest", source=SRC + "Suggest a Listing (1D7mRZ1pNeDDmTgGZtMkZv)",
           not_applicable={"loading": "A form; nothing loads before it renders.", "empty": "A form, not a collection."})


@s("default", "Suggest someone you know: who they are to you, the kind of listing, their name, where they are, a website, a church connection, why they belong, their email and whether to tell them; beside it, the four steps that follow.")
def _():
    return member_shell("directory", suggest_page(suggest_form()))

@s("vetting-unavailable", "The vetting story is missing or unpublished: the four steps remain, without the story link.")
def _():
    return member_shell("directory", suggest_page(suggest_form(), vetting_published=False))


@s("self", "\"Myself\" chosen: the labels speak to the person themselves and the fields about reaching someone else are gone.")
def _():
    return member_shell("directory", suggest_page(suggest_form(relation="self")))


@s("invalid", "Sent without a name: the field is marked and says what to add; nothing is sent.")
def _():
    return member_shell("directory", suggest_page(suggest_form(invalid=True)))


@s("submitting", "Send suggestion pressed: button busy, fields read-only.")
def _():
    return member_shell("directory", suggest_page(suggest_form(busy=True)))


@s("success", "Sent: thanks by name, what happens now, and ways back to the directory or to suggest another.")
def _():
    return member_shell("directory", suggest_page(done_panel(
        f"Thanks, {ME['first']}",
        "We’ve got your suggestion for <strong>Eastside Ladies Who Lift</strong>. Our team will look into it this week, and we’ll message you here when it’s decided either way.",
        f'<a class="btn btn--primary btn--md" href="{href("directory")}">Back to the directory</a>'
        '<a class="btn btn--secondary btn--md" href="default.html">Suggest another</a>')))


@s("error", "Sending failed: a message above the form (focused); everything typed is kept.")
def _():
    return member_shell("directory", suggest_page(suggest_form(failed=True)))


# ===========================================================================
# Send feedback
# ===========================================================================
KINDS = [("idea", "Idea", "", "lightbulb"), ("problem", "Something’s off", "", "bug"), ("correction", "Correction", "", "pen-line"),
         ("thanks", "Thanks", "", "heart")]
PROMPTS = {
    "idea": ("What would make this better?", "For example: show which week of the plan each session is"),
    "problem": ("What happened?", "What you tapped, what you expected, and what you saw instead"),
    "correction": ("What should it say?", "The detail that’s wrong, and the right one if you know it"),
    "thanks": ("What’s been good?", "A coach, an event, a moment. We pass these on."),
}
SHIPPED = [
    ("I never know if an event got moved.", "Change alerts for every event you’re going to", "March 2026"),
    ("Can I join a whole series instead of every date?", "Join a series in one tap", "February 2026"),
    ("The newsletter is too long on my phone.", "A shorter Weekly with one big story", "January 2026"),
]


def feedback_form(*, kind: str = "idea", context: str = "Event series › Couch to 5K Run Club", text: str = "", invalid: bool = False,
                  busy: bool = False, failed: bool = False, shot: str = "") -> str:
    prompt, hint = PROMPTS[kind]
    alert = ('<div class="form-section">' + form_alert(
        "We couldn't send your feedback", "Something went wrong on our side. What you wrote is still here, so try again in a moment.").replace(
        'tabindex="-1"', 'tabindex="-1" autofocus') + "</div>" if failed else "")
    about = (f"""<div class="context-chip">
            <div class="context-chip__body"><p class="context-chip__label">About this page</p><p class="context-chip__value">{context}</p></div>
            <button class="icon-button icon-button--sm" type="button" aria-label="Remove page"{" disabled" if busy else ""}>{icon("x")}</button>
          </div>""" if context else "")
    screenshot = ('<div class="form-section form-section--tight">' + file_field(
        "Screenshot", "screenshot", optional=True, filename=shot, choose="Add a screenshot", empty="None added",
        hint="JPEG, PNG or WebP, up to 5 MB", readonly=busy) + "</div>" if kind == "problem" else "")
    submit = (f'<button class="btn btn--primary btn--md" type="submit" disabled aria-busy="true">{busy_label("Sending…")}</button>'
              if busy else '<button class="btn btn--primary btn--md" type="submit">Send feedback</button>')
    return f"""<form class="form-page__main" action="success.html" novalidate>
          <h1 class="display page-title">Send feedback</h1>
          <p class="form-page__lead">Tell us what’s working, what isn’t, and what you wish was here.</p>
          {alert}
          {choice_cards("What’s it about?", "kind", KINDS, kind, cols=4, disabled=busy)}
          {about}
          <div class="form-section form-section--tight">
            {textarea(prompt, "text", text, rows=6, hint=hint if not text else "", error="Tell us a little more first." if invalid else "", readonly=busy)}
          </div>
          {screenshot}
          <label class="check check--ui form-section form-section--tight"><input class="check__box" type="checkbox" name="reply" checked{" disabled" if busy else ""}> You can email me at {ME["email"]} about this</label>
          <div class="form-page__foot">{submit}</div>
        </form>"""


def feedback_page(main: str) -> str:
    said = "".join(f'<li><p class="said__quote">“{q}”</p><p class="said__did">{d}</p><p class="said__when">{w}</p></li>' for q, d, w in SHIPPED)
    return f"""    <div class="container page">
      <div class="form-page form-page--flush">
        {main}
        <aside class="form-page__aside" aria-labelledby="said-title">
          <h2 class="display section-title" id="said-title">You said, we did</h2>
          <p class="said__lead">Recent changes that started as member feedback.</p>
          <ul class="list-ruled said">{said}</ul>
        </aside>
      </div>
    </div>"""


s = screen("feedback", "page", "Send feedback", route="/feedback", source=SRC + "Feedback (2w1Xg2bpM7GARSTBwsgZWR)", requirements=["L2-063"],
           not_applicable={"loading": "A form; nothing loads before it renders.", "empty": "A form, not a collection."})


@s("default", "Send feedback, opened from the Couch to 5K series page: what it is about (an idea, something off, a correction, thanks), the page it is about, the note, and whether the team may email back; beside it, changes that began as feedback.")
def _():
    return member_shell("", feedback_page(feedback_form()))


@s("broken", "\"Something's off\" chosen: the question changes to \"What happened?\" and a screenshot can be added.")
def _():
    return member_shell("", feedback_page(feedback_form(
        kind="problem", context="Events › Easter Sunrise 5K", shot="add-to-calendar.png",
        text="The “Add to calendar” button opens a blank page on my phone. Worked fine on my laptop. I tried twice.")))


@s("correction", "Opened from a story's \"Send a correction\": \"Correction\" is chosen and the story is the page it is about.")
def _():
    return member_shell("", feedback_page(feedback_form(kind="correction", context="Story › A West End church turned its basement into a free gym")))


@s("invalid", "Sent with nothing written: the note is marked and says what to add; nothing is sent.")
def _():
    return member_shell("", feedback_page(feedback_form(invalid=True)))


@s("submitting", "Send feedback pressed: button busy, fields read-only.")
def _():
    return member_shell("", feedback_page(feedback_form(busy=True, text="Could the series page show which week of the plan each session is? I missed week 3 and wasn’t sure where to pick back up.")))


@s("success", "Sent: thanks, what happens to it, and ways home or to send more.")
def _():
    return member_shell("", feedback_page(done_panel(
        "Got it. Thank you.", "Dana and the team read every note. If we need more detail we’ll email you, and we’ll let you know when it’s fixed.",
        f'<a class="btn btn--primary btn--md" href="{href("home")}">Back to Home</a>'
        '<a class="btn btn--secondary btn--md" href="default.html">Send more</a>')))


@s("error", "Sending failed: a message above the form (focused); what was written is kept.")
def _():
    return member_shell("", feedback_page(feedback_form(failed=True, text="Could the series page show which week of the plan each session is?")))


# ===========================================================================
# Preferences
# ===========================================================================
PREF_SECTIONS = [("email", "Email"), ("notifications", "Notifications"), ("privacy", "Privacy"), ("suggestions", "Suggestions"),
                 ("account", "Your data")]
VISIBILITY = [("public", "Anyone", "Including people who aren’t signed in"), ("members", "Members", "Anyone signed in to Christian Fitness"),
              ("groups", "Just my groups", "People in the group chats you’re part of")]
EMAILS = [("newsletter", NEWSLETTER["name"], f"The week’s stories and events. {NEWSLETTER['cadence']}.")] + [(i, l, d) for i, l, d in ADD_ONS]
PUSH = [("reminders", "Event reminders", "A day before anything you’re going to"),
        ("cancelled-events", "Cancelled events", "When an event you’re registered for is cancelled. We recommend keeping this on."),
        ("cancelled-dates", "Cancelled series dates", "When one date of a series you’ve joined is cancelled. We recommend keeping this on."),
        ("follows", "New dates from listings you follow", "When Lakeshore Runners or anyone you follow posts an event")]


def switch(name: str, label: str, desc: str, on: bool, disabled: bool = False) -> str:
    return (f'<label class="switch pref__row"><span class="switch__text"><span class="switch__label">{label}</span>'
            f'<span class="switch__desc">{desc}</span></span><input class="switch__input" type="checkbox" role="switch" name="{name}"'
            f'{" checked" if on else ""}{" disabled" if disabled else ""}></label>')


def pref_section(sid: str, title: str, sub: str, body: str) -> str:
    return f"""<section class="pref" id="{sid}" aria-labelledby="{sid}-title">
            <h2 class="display pref__title" id="{sid}-title">{title}</h2>
            <p class="pref__sub">{sub}</p>
            <div class="pref__rows">{body}</div>
          </section>"""


def save_bar(mode: str) -> str:
    if not mode:
        return ""
    if mode == "saved":
        inner = f'<p class="save-bar__text save-bar__text--done">{icon("check")}Preferences saved</p>'
    elif mode == "failed":
        inner = ('<p class="save-bar__text">Couldn’t save. Your changes are still here.</p>'
                 '<button class="btn btn--inverse btn--sm" type="submit">Try again</button>')
    elif mode == "saving":
        inner = ('<p class="save-bar__text">Unsaved changes</p>'
                 f'<button class="btn btn--inverse btn--sm" type="submit" disabled aria-busy="true">{busy_label("Saving…")}</button>')
    else:
        inner = '<p class="save-bar__text">Unsaved changes</p><button class="btn btn--inverse btn--sm" type="submit" data-mock-href="saved.html">Save</button>'
    role = "alert" if mode == "failed" else "status"
    return f'<div class="save-bar" role="{role}"><div class="save-bar__inner">{inner}</div></div>'


def preferences(*, emails: tuple = ("newsletter", "events", "devotion"), bar: str = "", plan: bool = False, download: bool = False,
                busy: bool = False) -> str:
    emails = emails + (("plan",) if plan else ())
    n = len(emails)
    email_sub = ("You won’t get any email from us except security and service notices." if n == 0 else f"{n} of 4 emails on.")
    email_rows = "".join(switch(f"email-{i}", l, d, i in emails, busy) for i, l, d in EMAILS)
    off = ('<p class="pref__action"><button class="btn btn--link" type="button" data-mock-href="unsubscribed.html">Turn off all email</button></p>' if n else "")
    push_rows = "".join(switch(f"notify-{i}", l, d, True, busy) for i, l, d in PUSH)
    radios = "".join(f"""<label class="choice"><input class="choice__input" type="radio" name="visibility" value="{v}"{" checked" if v == "members" else ""}{" disabled" if busy else ""}>
                  <span><span class="choice__label">{l}</span><span class="choice__desc">{d}</span></span></label>""" for v, l, d in VISIBILITY)
    privacy = f"""<fieldset class="pref__row pref__row--block">
                <legend class="pref__legend">Who can see your profile</legend>
                <div class="choice-group">{radios}</div>
              </fieldset>
              {switch("privacy-church", "Show my home church", "Only signed-in members who can see your profile can see it. Never shown to visitors.", False, busy)}
              {switch("privacy-attendee", "Show me on attendee lists", "Others going to an event can see you’re going", True, busy)}
              {switch("privacy-dms", "Let anyone message me", "When off, only people in your groups can start a chat", False, busy)}"""
    areas = "".join(f'<option{" selected" if a == "Scarborough" else ""}>{a}</option>' for a in PREF_AREAS)
    chips = "".join(f'<button class="interest" type="button" aria-pressed="{"true" if i in ME["interests"] else "false"}"{" disabled" if busy else ""}>'
                    f'{icon("check", "icon--xs") if i in ME["interests"] else ""}{i}</button>' for i in PREF_INTERESTS)
    suggestions = f"""<div class="pref__row pref__row--block">
                <label class="pref__legend" for="f-area">Your area</label>
                <select class="select pref__select" id="f-area" name="area"{" disabled" if busy else ""}>{areas}</select>
              </div>
              <fieldset class="pref__row pref__row--block">
                <legend class="pref__legend">Interests</legend>
                <div class="interest-list">{chips}</div>
              </fieldset>"""
    dl = (f'<p class="pref__done" role="status">{icon("check")}Requested. We’ll email you a link within 24 hours.</p>' if download
          else f'<button class="btn btn--secondary btn--sm" type="button" data-mock-href="download-requested.html">{icon("download")}Request download</button>')
    account = f"""<div class="pref__row pref__row--split">
                <div><p class="pref__legend">Download your data</p><p class="pref__desc">Your profile, events, messages and follows, as a .zip</p></div>
                {dl}
              </div>
              <div class="pref__row pref__row--split">
                <div><p class="pref__legend">Delete your account</p><p class="pref__desc">Erases your profile and sent message text after 30 days</p></div>
                <button class="btn btn--secondary btn--sm pref__delete" type="button" data-mock-href="{href("delete-account")}">Delete account</button>
              </div>
              <p class="pref__note">Read how we handle your information in our <a class="inline-link" href="{href("privacy")}">Privacy Policy</a>.</p>"""
    nav = "".join(f'<li><a class="side-nav__link" href="#{i}">{l}</a></li>' for i, l in PREF_SECTIONS)
    return f"""    <div class="container page">
      <a class="back-link" href="{href("profile")}">{icon("arrow-left")} Profile</a>
      <h1 class="display page-title page-title--after-back">Preferences</h1>
      <p class="subtitle">What we send you, what other members see, and what we suggest. Signed in as {ME["name"]}.</p>
      <form class="prefs" action="saved.html">
        <nav class="side-nav" aria-label="Preference sections"><ul class="side-nav__list">{nav}</ul></nav>
        <div class="prefs__sections">
          {pref_section("email", "Email", email_sub, email_rows + off)}
          {pref_section("notifications", "Notifications", "In the app, on the bell. Chat messages show as unread dots on Messages.", push_rows)}
          {pref_section("privacy", "Privacy", "Who can see you on Christian Fitness.", privacy)}
          {pref_section("suggestions", "Suggestions", "What we use to pick events and stories for you.", suggestions)}
          {pref_section("account", "Your data", "It’s yours. Take it with you or take it down.", account)}
        </div>
        {save_bar(bar)}
      </form>
    </div>"""


s = screen("preferences", "page", "Preferences", route="/preferences", source=SRC + "Manage Preferences (ksrMsnZWKaYcaxhYnauoQw)",
           not_applicable={"empty": "Settings, not a collection: every setting always has a value."})


@s("default", "Preferences: which emails and notifications arrive, who can see the profile, appear on attendee lists and start a chat, the area and interests used for suggestions, and downloading or deleting the account's data.")
def _():
    return member_shell("profile", preferences())


@s("unsaved", "A switch was changed (the training plan email turned on): a bar at the bottom says \"Unsaved changes\" with Save.")
def _():
    return member_shell("profile", preferences(plan=True, bar="unsaved"))


@s("saving", "Save pressed: the bar's button is busy and the settings are read-only until the answer arrives.")
def _():
    return member_shell("profile", preferences(plan=True, bar="saving", busy=True))


@s("saved", "Saved: the bar reads \"Preferences saved\" for about 2 seconds, then goes.")
def _():
    return member_shell("profile", preferences(plan=True, bar="saved"))


@s("failed", "Saving failed: the bar says so and offers Try again; the changes stay as set.")
def _():
    return member_shell("profile", preferences(plan=True, bar="failed"))


@s("unsubscribed", "\"Turn off all email\" pressed: all four email switches are off, the section says only security and service notices will come, and the change waits to be saved.")
def _():
    return member_shell("profile", preferences(emails=(), bar="unsaved"))


@s("download-requested", "Derived: Request download pressed: the button is replaced by a confirmation that a link will be emailed.")
def _():
    return member_shell("profile", preferences(download=True))


@s("loading", "Preferences loading: the heading is there; each section shows as skeleton rows.")
def _():
    row = ('<div class="pref__row skeleton-stack"><span class="skeleton skeleton--text w-40"></span>'
           '<span class="skeleton skeleton--text-sm w-80"></span></div>')
    sect = f'<div class="pref"><span class="skeleton skeleton--title w-20"></span><div class="pref__rows">{row * 3}</div></div>'
    body = f"""    <div class="container page">
      <a class="back-link" href="{href("profile")}">{icon("arrow-left")} Profile</a>
      <h1 class="display page-title page-title--after-back">Preferences</h1>
      <p class="subtitle">What we send you, what other members see, and what we suggest. Signed in as {ME["name"]}.</p>
      {loading_region("Loading your preferences", f'<div class="prefs"><div></div><div class="prefs__sections">{sect * 3}</div></div>')}
    </div>"""
    return member_shell("profile", body)


@s("error", "Preferences failed to load: retry, or go back to the profile. Nothing is shown as on or off that might not be.")
def _():
    body = f"""    <div class="container page">
      <a class="back-link" href="{href("profile")}">{icon("arrow-left")} Profile</a>
      <h1 class="display page-title page-title--after-back">Preferences</h1>
      {error_block("Your preferences didn't load", "We couldn't reach Christian Fitness. Check your connection and try again.", retry="default.html", back=("Back to profile", href("profile")), ref="CF-P4R9")}
    </div>"""
    return member_shell("profile", body)


# --- Delete your account (dialog) ----------------------------------------------
def delete_account(*, busy: bool = False, failed: bool = False, invalid: bool = False, staff: bool = False) -> str:
    alert = ('<div class="dialog__alert">' + form_alert("We couldn't delete your account", "Nothing was changed. Try again in a moment.") + "</div>"
             if failed else
             '<div class="dialog__alert">' + form_alert("We can't delete this account", "Staff accounts can't be deleted here. Ask an Admin.") + "</div>"
             if staff else "")
    body = f"""{alert}<p class="prose">If you delete your account, you'll be signed out immediately and your event places will go back to other members. Your profile, registrations and follows are removed after 30 days. Messages you sent will show as removed. Messages others sent you aren't affected. You can restore your account during the 30 days; after that, deletion can't be undone.</p>
    <div class="dialog__field">{field('Type "delete" to confirm', "confirm", "delet" if invalid else ("delete" if busy or failed or staff else ""), error="Type the word delete to confirm." if invalid else "", autocomplete="off", readonly=busy)}</div>"""
    keep = f'<button class="btn btn--secondary btn--grow" type="button" data-mock-href="{href("preferences")}"{" disabled" if busy else ""}>Keep my account</button>'
    go = (f'<button class="btn btn--danger btn--grow" type="submit" disabled aria-busy="true">{busy_label("Deleting…")}</button>' if busy
          else f'<button class="btn btn--danger btn--grow" type="submit" data-mock-href="{href("landing")}">Delete my account</button>')
    return over_member("profile", preferences(), dialog("Delete your account?", body, keep + go, sub=f"{ME['name']} · {ME['email']}"))


s = screen("delete-account", "dialog", "Delete your account", opens_from="preferences",
           source="Derived: the Manage Preferences frame's \"Delete account\" button; the prototype draws no confirmation.")


@s("default", "Confirm deleting the account: what is removed and when, and a word to type so it cannot happen by a slip.")
def _():
    return delete_account()


@s("invalid", "The word was mistyped: the field says what to type; nothing is deleted.")
def _():
    return delete_account(invalid=True)


@s("busy", "Delete my account pressed: button busy, the other disabled.")
def _():
    return delete_account(busy=True)


@s("failed", "Deleting failed: a message in the dialog; nothing was changed.")
def _():
    return delete_account(failed=True)


@s("staff-account", "The account holds a staff role (L2-066 AC9, 403 staff_account): a message in the dialog that staff accounts can't be deleted here and to ask an Admin; nothing was changed.")
def _():
    return delete_account(staff=True)


# --- Download page (the emailed link) ------------------------------------------
DOWNLOAD_EXPIRES = "April 22, 2026"  # 7 days after the archive was ready on Apr 15 (L2-066 AC2)
NA_DOWNLOAD = {"empty": "One archive, not a collection."}


def download_page(inner: str) -> str:
    return member_shell("profile", f"""    <div class="container page">
      <a class="back-link" href="{href("preferences")}">{icon("arrow-left")} Preferences</a>
{inner}
    </div>""")


s = screen("download", "page", "Download your data", route="/preferences/download/:id", group="Member app",
           source="Derived: the emailed link of L2-066 (AC1, AC2); the prototype draws no download page.", not_applicable=NA_DOWNLOAD)


@s("default", "The emailed link, opened signed in as its member and within 7 days: \"Your download is ready\", the browser starts the .zip, and a link downloads it again.")
def _():
    return download_page(f"""      <section class="done" role="status" tabindex="-1" autofocus>
        <span class="done__icon">{icon("check", "icon--lg")}</span>
        <h1 class="display page-title done__title">Your download is ready</h1>
        <p class="done__text">Your data is on its way to your device. If it doesn't start, download it again. The link works for 7 days, until {DOWNLOAD_EXPIRES}, and only while you're signed in.</p>
        <div class="done__actions"><a class="btn btn--primary" href="default.html">{icon("download")}Download again</a><a class="btn btn--secondary" href="{href("preferences")}">Back to preferences</a></div>
      </section>""")


@s("loading", "The link opened: the heading is there while the archive is checked.")
def _():
    return download_page(f"""      <h1 class="display page-title page-title--after-back">Your download</h1>
      {loading_region("Checking your download", '<div class="skeleton-stack"><span class="skeleton skeleton--text w-55"></span><span class="skeleton skeleton--text-sm w-80"></span></div>')}""")


@s("expired", "The link is past its 7 days, or is another member's, or is unknown (L2-066 AC2, 404 not_found, all the same): \"This download has expired. Request a new one.\"")
def _():
    return download_page(f"""      <section class="done" role="status" tabindex="-1" autofocus>
        <span class="done__icon">{icon("alert-circle", "icon--lg")}</span>
        <h1 class="display page-title done__title">This download has expired</h1>
        <p class="done__text">This download has expired. Request a new one.</p>
        <div class="done__actions"><a class="btn btn--primary" href="{href("preferences")}">Request a new download</a></div>
      </section>""")


@s("error", "The archive could not be fetched: retry, or go back to preferences. Nothing is shown as downloaded.")
def _():
    return download_page(f"""      <h1 class="display page-title page-title--after-back">Your download</h1>
      {error_block("Your download didn't start", "We couldn't reach Christian Fitness. Check your connection and try again.", retry="default.html", back=("Back to preferences", href("preferences")), ref="CF-D4L2")}""")


# --- Emails about the account and its data -----------------------------------
NA_EMAIL = {"loading": "An email is sent whole.", "empty": "An email is sent whole.", "error": "A failed send is the sender's log, not a screen."}


def email(subject: str, paras: list, *, action: tuple[str, str] | None = None, note: str = "") -> str:
    """An email as a mail app shows it: sender, address and subject above a card that carries the message."""
    body = "".join(f"<p>{p}</p>" for p in paras)
    button = f'<p class="email__action"><a class="btn btn--primary" href="{action[1]}">{action[0]}</a></p>' if action else ""
    foot = f'<p class="email__note">{note}</p>' if note else ""
    return f"""<main id="main" class="email">
  <header class="email__head">
    <p class="email__meta"><span class="email__label">From</span> Christian Fitness &lt;hello@christianfitness.ca&gt;</p>
    <p class="email__meta"><span class="email__label">To</span> {ME["name"]} &lt;{ME["email"]}&gt;</p>
    <h1 class="email__subject">{subject}</h1>
  </header>
  <article class="email__card" aria-label="Message">
    <p class="email__brand">{lockup(href("landing"))}</p>
    <p>Hi {ME["first"]},</p>
    {body}
    {button}
    <p>Christian Fitness</p>
    {foot}
  </article>
</main>"""


s = screen("email-deletion-requested", "page", "Email: account set to be deleted", group="Emails",
           source="Derived: sent when a member deletes their account (L2-066 AC6, AC8).", not_applicable=NA_EMAIL)


@s("default", "Sent to the account's address when the deletion is asked for: what happens now, the date it is erased and how to restore.")
def _():
    return email("Your Christian Fitness account is set to be deleted", [
        f"You asked us to delete your account. Your profile is hidden from everyone now, and you're signed out everywhere. On {DELETION_ERASED} we'll erase your profile, preferences, follows, registrations, suggestions, feedback and the text of your messages.",
        "Places you held at events have gone back to other members, and they aren't restored.",
        f"Changed your mind? Sign in before {DELETION_ERASED} and choose Restore my account."],
        action=("Restore my account", href("sign-in", "deleting")),
        note="If you didn't ask for this, restore your account and change your password, or write to privacy@christianfitness.ca.")


s = screen("email-deletion-done", "page", "Email: account deleted", group="Emails",
           source="Derived: sent when the 30 days have passed and the account is erased (L2-066 AC7, AC8).", not_applicable=NA_EMAIL)


@s("default", "Sent when the account is erased: what was erased, that the email is free to join again, and who to write to.")
def _():
    return email("Your Christian Fitness account has been deleted", [
        "Your account is deleted. We've erased your profile, preferences, follows, registrations, suggestions, feedback and the text of your messages.",
        "You're welcome back any time. You can join again with this email address as a new member.",
        "This is the last email we'll send to this address about your account."],
        note="Questions? Write to privacy@christianfitness.ca.")


s = screen("email-download-ready", "page", "Email: your download is ready", group="Emails",
           source="Derived: sent within 24 hours of Request download (L2-066 AC1, AC2).", not_applicable=NA_EMAIL)


@s("default", "Sent within 24 hours of Request download: a button to the download page, the 7 days it works and that it opens only when signed in as this member.")
def _():
    return email("Your Christian Fitness data is ready", [
        "You asked for a copy of your data. It's a .zip of your profile, preferences, registrations, follows, suggestions, feedback and the messages you sent.",
        f"The link works for 7 days, until {DOWNLOAD_EXPIRES}, and only when you're signed in as you. After that you can request a new one in Preferences."],
        action=("Download your data", href("download")),
        note="If you didn't ask for this, you can ignore this email. Nobody can open the link without signing in as you.")


# ===========================================================================
# Privacy Policy and Terms of Service
# ===========================================================================
def legal(title: str, summary: list, sections: list, other: tuple) -> str:
    toc = "".join(f'<li><a class="side-nav__link side-nav__link--numbered" href="#{sid}"><span class="side-nav__n">{i}.</span>{t}</a></li>'
                  for i, (sid, t, _) in enumerate(sections, 1))
    points = "".join(f"<li>{x}</li>" for x in summary)
    body = "".join(f'<section class="legal__section" id="{sid}"><h2 class="legal__heading"><span class="legal__n">{i}.</span> {t}</h2>'
                   + "".join(f"<p>{p}</p>" for p in paras) + "</section>" for i, (sid, t, paras) in enumerate(sections, 1))
    return f"""<div class="site">
  <header class="masthead">
    <div class="masthead__bar">
      {lockup(href("landing"))}
      <a class="btn btn--ghost masthead__back masthead__back--ink" href="{href(other[1])}">{other[0]}</a>
    </div>
  </header>
  <main id="main" class="container page legal">
    <a class="back-link" href="{href("landing")}">{icon("arrow-left")} Christian Fitness</a>
    <h1 class="display detail-title legal__title">{title}</h1>
    <p class="subtitle legal__effective">Effective April 1, 2026</p>
    <div class="legal__grid">
      <nav class="side-nav" aria-label="Contents">
        <p class="side-nav__title">Contents</p>
        <ol class="side-nav__list">{toc}</ol>
      </nav>
      <div class="legal__body">
        <section class="legal__summary" aria-labelledby="short-title">
          <h2 class="display legal__summary-title" id="short-title">The short version</h2>
          <ul class="legal__points">{points}</ul>
          <p class="legal__summary-note">The full text below is what applies. This summary is here so you don’t have to read it all to know where you stand.</p>
        </section>
        {body}
        <div class="legal__questions">
          <p class="legal__questions-title">Questions?</p>
          <p>Email privacy@christian.fitness, or <a class="inline-link" href="{href("feedback")}">send us a note</a>. Christian Fitness, 2091 Hurontario Street, Mississauga, Ontario, L5A 4E6.</p>
        </div>
      </div>
    </div>
  </main>
</div>"""


PRIVACY_SUMMARY = [
    "We collect what you give us to run your account, your events and your messages. Nothing more.",
    "We never sell your information, and we don’t run ads.",
    "Your church, faith details and health goals are only shown to the people you choose in Preferences.",
    "You can download everything or delete your account at any time.",
    "Your data is stored in Canada and handled under PIPEDA. Our email provider may process email addresses outside Canada.",
    "If we change this policy, we tell you at least 30 days ahead; carrying on after that date means you accept the new version.",
]
PRIVACY_SECTIONS = [
    ("collect", "What we collect", [
        "Account details: your name, email, password or Google sign-in, and the area you train in.",
        "Profile details you choose to add: your church, a short bio, goals and interests. These are optional.",
        "Activity: events and series you join, listings you follow, messages you send, and feedback you share.",
        "Basic technical information: device type, browser and approximate location from your IP address, used to keep the service secure and working."]),
    ("use", "How we use it", [
        "To run your account, register you for events, remind you about them and let the Christian Fitness team know who’s coming.",
        "To suggest events, stories and listings that fit your area and interests. You can change what we use in Preferences.",
        "To send the emails you’ve turned on, such as The Abundant Weekly. Every email has a one-click unsubscribe.",
        "To keep the community safe, including reviewing reports and removing spam."]),
    ("share", "Who we share it with", [
        "The Christian Fitness team runs events and sees who has registered.",
        "Service providers who help us run Christian Fitness, such as email delivery and hosting, under contracts that limit them to that work.",
        "Authorities, only when the law requires it. We will tell you when we are allowed to.",
        "We do not sell or rent your information to anyone, ever."]),
    ("sensitive", "Faith and health information", [
        "Your church affiliation and health goals can reveal sensitive things about you. We treat them as sensitive information: they are never used for advertising and never shared with other members unless you put them on your public profile."]),
    ("choices", "Your choices", [
        "In Preferences you can control who sees your profile, whether you appear on attendee lists, who can message you, and every email and notification we send.",
        "You can request a download of your data or delete your account from Preferences. You can restore your account during the 30-day grace period."]),
    ("retention", "How long we keep it", [
        "We keep your account information while your account is open. After you request deletion, your account is hidden immediately; after 30 days we erase it and your data. Messages you sent then show as “Message removed” from “Deleted member”. Messages others sent you stay with them.",
        "Download archives are deleted seven days after they are ready, or when you request account deletion. Decided listing suggestions and their contact emails are kept for 12 months after the decision. Decided message reports are kept for 12 months after the decision. Declined professional applications and associated declined listings are kept for 12 months after decline. Data belonging only to you is erased sooner if your account is erased.",
        "Audit entries are kept for two years after the action, with identifying references to you removed when your account is erased. Only Admins can read them. Newsletter subscriptions that are never confirmed are deleted 30 days after the latest request; unsubscribed addresses are deleted within 30 days unless they subscribe again."]),
    ("security", "Security", [
        "Your data is encrypted in transit and at rest and stored on servers in Canada. Our email delivery provider may process email addresses outside Canada, only to send you the email you ask for. Staff access is limited to the team members who need it."]),
    ("children", "Young people", [
        "You must be 16 or older to create an account. When you join we ask you to confirm that you are 16 or older. We do not ask for or keep your date of birth. Youth under 16 can attend events with a parent or guardian who registers for them."]),
    ("changes", "Changes to this policy", [
        "If we make a meaningful change we will email you and show a notice in the app at least 30 days before it takes effect. That email is a service notice, so you get it even if you have turned off all other email. If you keep using Christian Fitness after the effective date, you accept the new version; we do not ask you to accept it again. Earlier versions stay readable at dated addresses such as /privacy/2026-11-01."]),
]
TERMS_SUMMARY = [
    "Christian Fitness is free to join. Some events and services cost money, and the price is always shown before you register. Any fee is paid to the host directly.",
    "Treat people the way you’d want to be treated at church. No harassment, spam or selling in group chats.",
    "Exercise has risks. Know your limits and talk to a doctor before starting something new.",
    "Professionals in the directory are independent. We check them, but they are responsible for their own work.",
    "We can remove content or accounts that break these terms, and you can leave whenever you like.",
]
TERMS_SECTIONS = [
    ("account", "Your account", [
        "You must be 16 or older, which you confirm when you join, and give us accurate information. Keep your password to yourself; you’re responsible for what happens on your account."]),
    ("conduct", "Community standards", [
        "Christian Fitness is a faith community open to everyone who wants to take part respectfully, whatever their background or stage of faith.",
        "Don’t harass, shame or threaten anyone. Don’t post anything sexual, hateful or illegal. Don’t sell products, recruit for businesses or promote supplements in messages or group chats.",
        "Report anything that breaks these standards from the message or profile. Our team reviews every report."]),
    ("events", "Events and series", [
        "Hosts set the details, capacity and price of their events. Any fee for an event is paid to the host directly, under the host’s own terms; Christian Fitness takes no payment and gives no refunds.",
        "You can cancel your registration up to 24 hours before an event starts."]),
    ("health", "Health and safety", [
        "Physical activity carries a risk of injury. You take part in events at your own risk and should only do what is safe for you.",
        "Nothing on Christian Fitness, including stories, training plans and devotions, is medical advice. Talk to a doctor before starting a new exercise program, especially if you are pregnant, injured or managing a health condition."]),
    ("directory", "The directory and services", [
        "Listings are independent organizations and people. We check credentials, insurance, references and fit before a listing goes live, but we don’t supervise their work.",
        "Any agreement for services is between you and the provider."]),
    ("content", "What you post", [
        "You own what you post. You give us permission to show it on Christian Fitness so the service works, such as showing your messages to the people you sent them to.",
        "Don’t post anything you don’t have the right to share."]),
    ("ending", "Suspension and leaving", [
        "We may suspend or remove accounts that break these terms. Where we can, we’ll warn you first and tell you why.",
        "You can delete your account at any time from Preferences."]),
    ("liability", "Limits of our liability", [
        "Christian Fitness is provided as is. To the extent the law allows, we are not liable for indirect losses or for injuries at events run by independent hosts."]),
    ("law", "Governing law", [
        "These terms are governed by the laws of Ontario and the federal laws of Canada that apply there."]),
]
LEGAL_NA = {"loading": "A static page shipped with the app; nothing loads.", "empty": "A document, not a collection.",
            "error": "A static page shipped with the app; nothing can fail to load."}

s = screen("privacy", "page", "Privacy Policy", route="/privacy", source=SRC + "Privacy Policy (8tSZJ8o6AYCxUdTfkrsYBf)", group="Public",
           not_applicable=LEGAL_NA)


@s("default", "The Privacy Policy: a plain-language summary first, then nine numbered sections with a contents list that stays in view, and who to ask.")
def _():
    return legal("Privacy Policy", PRIVACY_SUMMARY, PRIVACY_SECTIONS, ("Terms of Service", "terms"))


s = screen("terms", "page", "Terms of Service", route="/terms", source=SRC + "Terms of Service (9Qs4AXZcWasYdN16XUCs5s)", group="Public",
           not_applicable=LEGAL_NA)


@s("default", "The Terms of Service, in the same layout: a plain-language summary, nine numbered sections with contents, and who to ask.")
def _():
    return legal("Terms of Service", TERMS_SUMMARY, TERMS_SECTIONS, ("Privacy Policy", "privacy"))


# ===========================================================================
# Claim a listing (L2-078) and the owner's listing editor (L2-079)
# ===========================================================================
CLAIM_EXPIRY = "December 9"


def claim_card(*, busy: bool = False, failed: bool = False, confirm: bool = False) -> str:
    """The listing as it will appear, with the two ways to answer; the claim link is single-use and lasts 14 days."""
    l = EASTSIDE
    alert = ('<div class="form-section">' + form_alert(
        "We couldn't publish your listing", "Something went wrong on our side. Nothing was published, so try again in a moment.").replace(
        'tabindex="-1"', 'tabindex="-1" autofocus') + "</div>" if failed else "")
    focus = "".join(f'<li class="tag tag--outline">{f}</li>' for f in l["focus"])
    d = " disabled" if busy else ""
    publish = (f'<button class="btn btn--primary btn--md" type="submit" disabled aria-busy="true">{busy_label("Publishing…")}</button>' if busy
               else '<button class="btn btn--primary btn--md" type="submit">Publish my listing</button>')
    return f"""    <div class="container page">
      <div class="form-page form-page--flush">
        <form class="form-page__main" action="published.html" novalidate>
          <h1 class="display page-title">Publish your listing</h1>
          <p class="form-page__lead">Our team has checked it. It goes into the directory only when you say it is yours. Here is how it will look.</p>
          {alert}
          <section class="form-section" aria-labelledby="preview-title">
            <h2 class="visually-hidden" id="preview-title">Your listing as members will see it</h2>
            <div class="listing-head__who">
              {listing_mark(l, "xl")}
              <div class="listing-head__body">
                <p class="eyebrow listing-head__kind">{l["kind"]} <span class="listing-head__verified">· {icon("badge-check")} Verified</span></p>
                <p class="display detail-title listing-head__name">{l["name"]}</p>
                <p class="subtitle">{l["tagline"]}</p>
              </div>
            </div>
            <p class="prose lead">{l["about"]}</p>
            <ul class="tag-list">{focus}</ul>
            <dl class="key-facts">
              <div class="key-facts__row"><dt>{icon("map-pin")}Area</dt><dd>{l["area"]}</dd></div>
              <div class="key-facts__row"><dt>{icon("globe")}Website</dt><dd>{l["website"]}</dd></div>
            </dl>
          </section>
          <p class="field__hint">Signed in as {ME["name"]}. Publishing makes you the owner, so you can edit it later. This link works once and expires on {CLAIM_EXPIRY}.</p>
          <div class="form-page__foot">
            {publish}
            <button class="btn btn--secondary btn--md" type="button" data-mock-href="declined.html"{d}>This isn’t me</button>
          </div>
        </form>
      </div>
    </div>"""


def claim_signed_out() -> str:
    return f"""<div class="signin">
  <header class="signin__header">
    {lockup(href("landing"))}
  </header>
  <main id="main" class="signin__main">
    <div class="signin__card">
      <h1 class="display auth__title">Claim {EASTSIDE["name"]}</h1>
      <p class="auth__lead">Sign in or join first, so the listing is yours and you can edit it later. We bring you straight back here.</p>
      <div class="form-page__foot">
        <a class="btn btn--primary btn--lg btn--block" href="{href("sign-in")}">Sign in</a>
        <a class="btn btn--secondary btn--lg btn--block" href="{href("join")}">Join Christian Fitness</a>
      </div>
      <p class="auth__alt">This link works once and expires on {CLAIM_EXPIRY}.</p>
    </div>
  </main>
</div>"""


s = screen("claim-listing", "page", "Claim a listing", route="/claim/:token", group="Public",
           source="Derived: approving a suggestion \"sends them a link to claim and publish their listing\" (L2-073 AC6); specified by L2-078.",
           not_applicable={"empty": "One listing behind one link, not a collection."})


@s("default", "A signed-in member opens the claim link: the listing as it will appear, with Publish my listing and This isn’t me, and the link’s single use and expiry stated.")
def _():
    return member_shell("", claim_card())


@s("signed-out", "The link opened signed out: the listing is named, and Sign in or Join comes first; the visitor returns here afterwards.")
def _():
    return claim_signed_out()


@s("loading", "The link is being checked: the listing as skeletons.")
def _():
    body = """    <div class="container page">
      <div class="form-page form-page--flush"><div class="form-page__main skeleton-stack">
        <h1 class="visually-hidden">Checking your link</h1>
        <span class="skeleton skeleton--title-lg"></span><span class="skeleton skeleton--block skeleton--tile"></span>
        <span class="skeleton skeleton--text w-90"></span><span class="skeleton skeleton--text w-80"></span></div></div>
    </div>"""
    return member_shell("", loading_region("Checking your link", body))


@s("busy", "Publish my listing pressed: the button reads Publishing…, both answers disabled, no second submit.")
def _():
    return member_shell("", claim_card(busy=True))


@s("published", "Published: the listing is in the directory and owned by the member, with ways to see it or edit it.")
def _():
    return member_shell("", """    <div class="container page">""" + done_panel(
        "Your listing is live",
        f"<strong>{EASTSIDE['name']}</strong> is in the directory and you own it. You can edit it any time from its page.",
        f'<a class="btn btn--primary btn--md" href="{href("listing-profile", "owner")}">See your listing</a>'
        f'<a class="btn btn--secondary btn--md" href="{href("directory")}">Back to the directory</a>') + "\n    </div>")


@s("declined", "This isn’t me pressed: the listing stays unpublished and the team is told; no one is contacted.")
def _():
    return member_shell("", """    <div class="container page">""" + done_panel(
        "Thanks for letting us know",
        "We won’t publish this listing, and we’ve told the team. Nothing about you was shared.",
        f'<a class="btn btn--primary btn--md" href="{href("directory")}">Back to the directory</a>') + "\n    </div>")


@s("expired", "The link is past its 14 days: it reads \"This link has expired. Ask us for a new one.\"; staff can resend it.")
def _():
    return member_shell("", f"""    <div class="container page">{done_panel(
        "This link has expired", "This link has expired. Ask us for a new one.",
        f'<a class="btn btn--primary btn--md" href="{href("feedback")}">Ask us for a new one</a>'
        f'<a class="btn btn--secondary btn--md" href="{href("directory")}">Back to the directory</a>').replace('role="status"', 'role="alert"').replace(icon("check", "icon--lg"), icon("clock", "icon--lg"))}
    </div>""")


@s("claimed", "The link was already used: the listing is not shown again and nothing can be changed from here.")
def _():
    return member_shell("", f"""    <div class="container page">{done_panel(
        "This listing has already been claimed", "A link works once. If that was you, find your listing in the directory and use Edit listing.",
        f'<a class="btn btn--primary btn--md" href="{href("directory")}">Back to the directory</a>')}
    </div>""")


@s("error", "Publishing failed: a message above the listing (focused); nothing was published and both answers stay available.")
def _():
    return member_shell("", claim_card(failed=True))


def owner_editor(*, invalid: bool = False, busy: bool = False, failed: bool = False, review: bool = False) -> str:
    l = EASTSIDE
    ro = busy
    d = " disabled" if ro else ""
    alert = ""
    if invalid:
        alert = error_summary("1 thing to fix before saving", [("Add a website that starts with https://", "f-website")]).replace('tabindex="-1"', 'tabindex="-1" autofocus')
    if failed:
        alert = form_alert("We couldn't save your listing", "Something went wrong on our side. Your changes are still here, so try again in a moment.")
    if review:
        alert = form_alert("Staff will check the new name", "A new name or kind goes back to our team before it shows. Until then the directory keeps the old one; your other changes are live.",
                           kind="info", ic="info", role="status")
    name = "Eastside Women’s Strength" if review else l["name"]
    focus = "".join(f'<li class="tag tag--outline">{f}</li>' for f in l["focus"])
    body = f"""    {alert}
    {field("Name", "name", name, readonly=ro, hint="Changing the name or the kind sends the listing back to staff to check" if not review else "")}
    {textarea("About", "about", l["about"], rows=4, readonly=ro)}
    {field("Website", "website", "eastsideladies" if invalid else l["website"], error="Add a website that starts with https://" if invalid else "", readonly=ro, optional=True)}
    {file_field("Photo", "photo", optional=True, choose="Choose photo", empty="No photo yet", hint="JPEG, PNG or WebP, up to 5 MB", readonly=ro)}
    <div class="field"><span class="field__label">Focus</span><ul class="tag-list">{focus}</ul></div>
    {field("Contact email", "contact", "eastsideladies@example.org", type_="email", optional=True, hint="Shown to members who message you", readonly=ro)}"""
    save = (f'<button class="btn btn--primary btn--grow" type="submit" disabled aria-busy="true">{busy_label("Saving…")}</button>' if busy
            else f'<button class="btn btn--primary btn--grow" type="submit" data-mock-href="{href("listing-profile", "owner")}">Save changes</button>')
    foot = f'    <button class="btn btn--secondary btn--grow" type="button"{d} data-mock-href="{href("listing-profile", "owner")}">Cancel</button>\n    {save}'
    html = dialog("Edit your listing", body, foot, sub=f"{l['name']} · Changes go live at once")
    if not invalid and not failed and not review and not busy:
        html = autofocus_first(html, 'id="f-name"')
    return over_member("directory", profile_page(l, owner=True), html)


s = screen("owner-listing-editor", "dialog", "Owner's listing editor", opens_from="listing-profile",
           source="Derived: Listed's Edit button and the owner's Edit listing button (docs/mocks/README.md open question 10); specified by L2-079.")


@s("default", "The owner edits their listing: name, about, website, photo, focus tags and contact; focus on the first field.")
def _():
    return owner_editor()


@s("invalid", "A website without https://: summary focused, inline error; nothing is saved.")
def _():
    return owner_editor(invalid=True)


@s("busy", "Save changes pressed: the button reads Saving…, fields read-only, no second submit.")
def _():
    return owner_editor(busy=True)


@s("failed", "Saving failed: a message above the fields; everything typed is kept.")
def _():
    return owner_editor(failed=True)


@s("review", "The name was changed: a notice says staff will check the new name while the other changes go live at once.")
def _():
    return owner_editor(review=True)


@s("saved", "Saved: the dialog closes and a toast over the listing says the changes are live.")
def _():
    t = toast("success", "Your listing is updated", "Your changes are live in the directory.")
    return member_shell("directory", profile_page(EASTSIDE, owner=True), after=toast_region(t))
# Notifications: the bell's inbox (ADR 0068)
# ===========================================================================
# (kind icon, title, text, when, link, unread). The four kinds that notify: a reminder 24 hours before,
# a cancelled event, a cancelled series date and new dates from a followed host.
NOTES = [
    ("clock", "Tomorrow: Saturday Park Bootcamp", "Sat, Apr 25 at 6:30 AM · Centennial Park, Etobicoke", "2 hours ago", "event-detail", True),
    ("calendar-x", "Cancelled: Stretch & Pray: Mobility Morning", "Wed, May 6. The host cancelled it; your registration is released.", "Yesterday", "events", True),
    ("calendar-plus", "Lakeshore Runners posted a new date", "Couch to 5K: Week 4 is Tue, Apr 28 at 6:30 PM.", "Yesterday", "listing-profile", False),
    ("calendar-x", "Cancelled date: Couch to 5K Run Club", "Tue, Apr 14 is off; the other dates in the series stand.", "Apr 12", "event-series", False),
    ("clock", "Tomorrow: Easter Sunrise 5K", "Sat, Apr 18 at 6:30 AM · Humber Bay Park", "Apr 17", "event-detail", False),
]


def note_row(n: tuple) -> str:
    ic, title, text, when, to, unread = n
    mark = '<span class="unread-dot" aria-hidden="true"></span><span class="visually-hidden">Unread</span>' if unread else ""
    return (f'<li class="note{" note--unread" if unread else ""}"><a class="note__link" href="{href(to)}">'
            f'<span class="note__icon" aria-hidden="true">{icon(ic)}</span>'
            f'<span class="note__body"><span class="note__title">{title}</span><span class="note__text">{text}</span>'
            f'<span class="note__time">{when}</span></span>{mark}</a></li>')


def notifications_page(body: str, *, mark_all: bool = True, foot: str = "") -> str:
    action = f'<button class="btn btn--secondary btn--sm" type="button">{icon("check")}Mark all as read</button>' if mark_all else ""
    return f"""    <div class="container page">
      <div class="notes-head">
        <div>
          <h1 class="display page-title">Notifications</h1>
          <p class="subtitle">Reminders, cancellations and new dates from hosts you follow. We keep the latest 50 from the last 30 days.</p>
        </div>
        <div class="notes-head__actions">{action}<a class="btn btn--link" href="{href("preferences", fragment="notifications")}">Notification settings</a></div>
      </div>
      {body}
      {foot}
    </div>"""


NOTES_FOOT = '<p class="notes-foot">That’s everything from the last 30 days.</p>'

s = screen("notifications", "page", "Notifications", route="/notifications", source="Added by ADR 0068 (no Magic Patterns frame)",
           description="The bell's inbox: event reminders, cancelled events and series dates, and new dates from followed hosts.")


@s("default", "Five notifications, newest first: two unread (a dot, bold title and \"Unread\" for assistive technology), then read ones; the bell shows 2.")
def _():
    return member_shell("notifications", notifications_page(
        f'<ul class="card card--list notes">{"".join(note_row(n) for n in NOTES)}</ul>', foot=NOTES_FOOT), notes=2)


@s("many", "Twelve unread: the bell shows 9+ and its label still says how many; the inbox keeps only the latest 50.")
def _():
    rows = [(ic, t, x, w, to, True) for ic, t, x, w, to, _u in NOTES] * 2 + list(NOTES[:2])
    rows = [(ic, t, x, w, to, i < 12) for i, (ic, t, x, w, to, _u) in enumerate(rows)]
    return member_shell("notifications", notifications_page(
        f'<ul class="card card--list notes">{"".join(note_row(n) for n in rows)}</ul>', foot=NOTES_FOOT), notes=12)


@s("loading", "Inbox loading: five row skeletons under the heading; the bell keeps the count it already had.")
def _():
    row = ('<li class="note"><div class="note__link"><span class="skeleton skeleton--avatar"></span>'
           '<div class="note__body skeleton-stack"><span class="skeleton skeleton--text w-60"></span>'
           '<span class="skeleton skeleton--text-sm w-80"></span></div></div></li>')
    return member_shell("notifications", notifications_page(
        loading_region("Loading your notifications", f'<ul class="card card--list notes">{row * 5}</ul>'), mark_all=False), notes=2)


@s("empty", "Nothing yet: says what will appear here and points to events; the bell has no badge.")
def _():
    return member_shell("notifications", notifications_page(empty_block(
        "No notifications yet", "Reminders for events you’ve joined, cancellations and new dates from hosts you follow will appear here.",
        f'<a class="btn btn--primary btn--sm" href="{href("events")}">Browse events</a>'), mark_all=False), notes=0)


@s("error", "Inbox failed to load: the heading stays; retry in place; the bell has no badge because the count is unknown.")
def _():
    return member_shell("notifications", notifications_page(error_block(
        "Notifications didn't load", "We couldn't reach Christian Fitness. Check your connection and try again.", retry="default.html", ref="CF-N7B2"),
        mark_all=False), notes=0)
