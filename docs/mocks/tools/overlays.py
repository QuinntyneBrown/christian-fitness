"""Dialogs, drawers, toasts and banners, each shown over the page it opens from."""
from __future__ import annotations

from cf_data import EV, INTERESTS, ME, SV
from cf_ui import (admin_shell, banner, busy_label, error_summary, field, file_field, form_alert, href, icon, member_shell, note,
                   screen, select, textarea, toast, toast_region)
import screens_admin as A
import screens_member as M


def dialog(title: str, body: str, foot: str, *, sub: str = "", did: str = "dlg") -> str:
    sub_html = f'<p class="dialog__sub" id="{did}-desc">{sub}</p>' if sub else ""
    desc = f' aria-describedby="{did}-desc"' if sub else ""
    return f"""<div class="scrim" aria-hidden="true"></div>
<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="{did}-title"{desc} data-dismiss-on-escape>
  <div class="dialog__head">
    <div><h2 class="display dialog__title" id="{did}-title">{title}</h2>{sub_html}</div>
    <button class="icon-button dialog__close" type="button" aria-label="Close">{icon("x", "icon--lg")}</button>
  </div>
  <div class="dialog__body">
{body}
  </div>
  <div class="dialog__foot">
{foot}
  </div>
</div>"""


def drawer(title: str, body: str, foot: str, *, did: str = "drw") -> str:
    return f"""<div class="scrim" aria-hidden="true"></div>
<aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="{did}-title" data-dismiss-on-escape>
  <div class="drawer__head">
    <h2 class="display drawer__title" id="{did}-title">{title}</h2>
    <button class="icon-button" type="button" aria-label="Close">{icon("x", "icon--lg")}</button>
  </div>
  <form class="drawer__body" novalidate>
{body}
  </form>
  <div class="drawer__foot">
{foot}
  </div>
</aside>"""


def over_member(active: str, page: str, overlay: str, **kw) -> str:
    return member_shell(active, page, inert=True, after=overlay, **kw)


def over_admin(active: str, page: str, overlay: str, **kw) -> str:
    return admin_shell(active, page, inert=True, after=overlay, **kw)


def autofocus_first(html: str, marker: str) -> str:
    return html.replace(marker, marker + " autofocus", 1)


# ===========================================================================
# Request a booking (member · Services)
# ===========================================================================
def services_page_okafor() -> str:
    return M.services_page(f'<div class="split split--services">{M.svc_list(M.SERVICES, "okafor")}{M.svc_detail(SV["okafor"])}</div>')


def booking(*, invalid=False, busy=False, failed=False) -> str:
    alert = ""
    if invalid:
        alert = error_summary("Add when you're free", [("Tell Danielle which days and times work for you", "f-when")]).replace('tabindex="-1"', 'tabindex="-1" autofocus')
    if failed:
        alert = form_alert("Your request didn't send", "Nothing was lost. Check your connection and send it again.")
    when = "" if invalid else "Weekday evenings after 6, or Saturday mornings"
    body = f"""    {alert}
    {select("What would you like?", "kind", ["One-on-one session", "Small-group session", "Free 15-minute intro call"], "Free 15-minute intro call", disabled=busy)}
    {field("When works for you?", "when", when, error="Tell Danielle which days and times work for you" if invalid else "", hint="Days and times, in your own words", readonly=busy)}
    {textarea("Message", "message", "Hi Danielle, I'm getting back into strength training after a knee niggle and training for a half marathon this fall. Would love your advice on where to start.", rows=4, optional=True, readonly=busy)}
    <p class="field__hint">Danielle replies in Messages, usually within a day. Nothing is charged until you both confirm a time.</p>"""
    send = (f'<button class="btn btn--primary btn--grow" type="submit" disabled aria-busy="true">{busy_label("Sending…")}</button>' if busy
            else '<button class="btn btn--primary btn--grow" type="submit" data-mock-href="success.html">Send request</button>')
    foot = f'    <button class="btn btn--secondary btn--grow" type="button"{" disabled" if busy else ""} data-mock-href="{href("services")}">Cancel</button>\n    {send}'
    html = dialog("Request a booking", body, foot, sub="Danielle Okafor · Personal trainer · From $70 / session")
    if not invalid:
        html = autofocus_first(html, 'id="f-kind"')
    return over_member("services", services_page_okafor(), html)


s = screen("request-booking", "dialog", "Request a booking", opens_from="services",
           source="Derived: the Services frame's \"Request a booking\" button.")


@s("default", "Ask Danielle Okafor for a session: what, when and an optional message; focus on the first field.")
def _():
    return booking()


@s("invalid", "\"When works for you?\" left empty: summary focused, inline error.")
def _():
    return booking(invalid=True)


@s("busy", "Send request pressed: busy, Cancel disabled, no second submit.")
def _():
    return booking(busy=True)


@s("failed", "Sending failed: message at the top, everything typed kept.")
def _():
    return booking(failed=True)


@s("success", "Sent: what happens next, and a way to the conversation.")
def _():
    body = f"""    <div class="dialog__success" role="status">
      <span class="dialog__success-icon">{icon("check", "icon--lg")}</span>
      <p class="lead">Danielle will reply in your messages, usually within a day. We've started the conversation for you.</p>
    </div>"""
    foot = f'    <button class="btn btn--secondary btn--grow" type="button" data-mock-href="{href("services")}" autofocus>Done</button>\n    <a class="btn btn--primary btn--grow" href="{href("messages", "direct")}">Go to messages</a>'
    return over_member("services", services_page_okafor(), dialog("Request sent", body, foot, sub="Danielle Okafor · Free 15-minute intro call"))


# ===========================================================================
# Edit profile (member · Profile)
# ===========================================================================
BIO_MAX = 300
# A bio of 312 characters and six goals: over both limits of L2-006 AC3 (mock `invalid-limits`).
LONG_BIO = (ME["bio"] + " Sundays I walk with my sister after church, and on weekdays I squeeze in a run before the kids wake up."
            " Looking for people to train with this spring and summer, and for a walking group on Sunday afternoons.")
SIX_GOALS = ME["goals"] + ["Run with the Sunrise 5K Crew every week", "Try a retreat", "Learn to swim"]


def edit_profile(*, invalid=False, limits=False, refused=False, busy=False, failed=False) -> str:
    alert = ""
    bio = LONG_BIO if limits else ME["bio"]
    goals = SIX_GOALS if limits else ME["goals"]
    if invalid:
        alert = error_summary("Check your profile", [("Enter your name so people know who you are", "f-name")]).replace('tabindex="-1"', 'tabindex="-1" autofocus')
    if limits:
        alert = error_summary("Check your profile", [("Keep your bio to 300 characters", "f-bio"), ("Choose up to 5 goals", "f-goals")]).replace('tabindex="-1"', 'tabindex="-1" autofocus')
    if refused:
        alert = form_alert("Check your profile", "Some of your changes weren't accepted. Check each field and try again.").replace('tabindex="-1"', 'tabindex="-1" autofocus')
    if failed:
        alert = form_alert("We couldn't save your changes", "Nothing was lost. Check your connection and try again.")
    chips = "".join(f'<button class="interest" type="button" aria-pressed="{"true" if i in ME["interests"] else "false"}"{" disabled" if busy else ""}>{i}</button>' for i in INTERESTS)
    left = BIO_MAX - len(bio)
    bio_hint = f"A sentence or two. {left} characters left." if left >= 0 else ""
    show = f'<label class="check check--ui"><input class="check__box" type="checkbox" id="f-show-church" name="showChurch"{" disabled" if busy else ""}> Show my home church to other members</label>'
    body = f"""    {alert}
    {field("Full name", "name", "" if invalid else ME["name"], autocomplete="name", error="Enter your name so people know who you are" if invalid else "", readonly=busy)}
    <div class="field-grid">
      {field("Home church", "church", ME["church"], optional=True, hint="Hidden from other members unless you show it", readonly=busy)}
      {field("City", "city", ME["city"], autocomplete="address-level2", optional=True, readonly=busy)}
    </div>
    {show}
    {textarea("About", "bio", bio, rows=3, hint=bio_hint, error="Keep your bio to 300 characters" if limits else "", readonly=busy)}
    {textarea("Goals this year", "goals", chr(10).join(goals), rows=3, hint="One per line, up to 5", error="Choose up to 5 goals" if limits else "", readonly=busy)}
    <fieldset><legend class="field__legend">Into</legend><div class="interest-list">{chips}</div></fieldset>"""
    save = (f'<button class="btn btn--primary btn--grow" type="submit" disabled aria-busy="true">{busy_label("Saving…")}</button>' if busy
            else f'<button class="btn btn--primary btn--grow" type="submit" data-mock-href="{href("profile")}">Save changes</button>')
    foot = f'    <button class="btn btn--secondary btn--grow" type="button"{" disabled" if busy else ""} data-mock-href="{href("profile")}">Cancel</button>\n    {save}'
    html = dialog("Edit profile", body, foot)
    if not (invalid or limits or refused):
        html = autofocus_first(html, 'id="f-name"')
    return over_member("profile", M.profile(ME, self_view=True), html)


s = screen("edit-profile", "dialog", "Edit profile", opens_from="profile",
           source="Derived: the Profile frame's \"Edit profile\" button.")


@s("default", "Edit name, home church (optional, hidden from other members until shown), city, bio, goals and interests; long body scrolls between fixed header and footer.")
def _():
    return edit_profile()


@s("invalid", "Name cleared: summary focused, inline error, other fields kept.")
def _():
    return edit_profile(invalid=True)


@s("invalid-limits", "A bio over 300 characters and six goals: summary focused, both fields marked, nothing sent.")
def _():
    return edit_profile(limits=True)


@s("refused", "The server refused the changes (field_too_long, too_many_goals or another 400): a generic message, everything typed kept.")
def _():
    return edit_profile(refused=True)


@s("busy", "Save pressed: busy button, fields read-only.")
def _():
    return edit_profile(busy=True)


@s("failed", "Save failed: message at the top, inputs preserved.")
def _():
    return edit_profile(failed=True)


# ===========================================================================
# Event editor drawer (admin · Manage events)
# ===========================================================================
CATS = ["Run", "Workout", "Basketball", "Mobility", "Workshop", "Retreat"]


def event_editor(*, edit=False, invalid=False, busy=False, saving=False, failed=False, image_invalid=False, capacity_below=False, draft=False, publish_failed=False) -> str:
    if edit and not draft:
        v = dict(title="Saturday Park Bootcamp", cat="Workout", date="2026-04-25", time="08:00", place="Trillium Park, Ontario Place",
                 area="Waterfront, Toronto", price="$10", cap="50", desc=EV["park-bootcamp"]["summary"])
    else:
        v = dict(title="Whole Life Retreat", cat="Retreat", date="2026-05-22", time="16:00", place="Muskoka Woods, Rosseau",
                 area="Muskoka Lakes", price="$340", cap="60", desc="Three days of trail runs, strength sessions, worship by the lake and real rest. Meals and cabins included.")
    alert = ""
    title_err = date_err = image_err = capacity_err = ""
    if invalid:
        v.update(title="", date="2026-04-10")
        title_err = "Give the event a title members will recognize"
        date_err = "Pick a date after today, April 15"
        alert = error_summary("2 things to fix before saving", [(title_err, "f-title"), (date_err, "f-date")]).replace('tabindex="-1"', 'tabindex="-1" autofocus')
    if image_invalid:
        image_err = "Use a JPEG, PNG or WebP image up to 5 MB"
        alert = error_summary("1 thing to fix before saving", [(image_err, "f-image")]).replace('tabindex="-1"', 'tabindex="-1" autofocus')
    if capacity_below:
        v.update(cap="20")
        capacity_err = "36 members are going. Set a capacity of at least 36"
        alert = error_summary("1 thing to fix before saving", [(capacity_err, "f-capacity")]).replace('tabindex="-1"', 'tabindex="-1" autofocus')
    if failed:
        alert = form_alert("Couldn't save the changes" if edit else "Couldn't save the draft",
                           "The server didn't respond. Your changes are still here; try again.")
    if publish_failed:
        alert = form_alert("Couldn't publish the event", "Your changes are saved as a draft. Try again.")
    ro = busy or saving
    body = f"""    {alert}
    {field("Title", "title", v["title"], error=title_err, readonly=ro)}
    {select("Category", "category", CATS, v["cat"], disabled=ro)}
    <div class="field-grid">
      {field("Date", "date", v["date"], type_="date", error=date_err, readonly=ro)}
      {field("Start time", "time", v["time"], type_="time", readonly=ro)}
    </div>
    {field("Place", "place", v["place"], readonly=ro)}
    {field("Area", "area", v["area"], hint="Neighbourhood and city, like Waterfront, Toronto", readonly=ro)}
    <div class="field-grid">
      {field("Price", "price", v["price"], hint="Leave blank for free", readonly=ro)}
      {field("Capacity", "capacity", v["cap"], type_="number", extra='min="1" inputmode="numeric"', error=capacity_err, readonly=ro)}
    </div>
    {textarea("Summary", "summary", v["desc"], rows=4, hint="Up to 1,000 characters", readonly=ro)}
    {file_field("Image", "image", filename="park-bootcamp.jpg" if edit and not draft and not image_invalid else "", hint="JPEG, PNG or WebP, up to 5 MB", error=image_err, optional=True, readonly=ro)}"""
    publish_label = "Save changes" if edit and not draft else "Publish"
    publish = (f'<button class="btn btn--primary btn--grow" type="button" disabled aria-busy="true">{busy_label("Publishing…")}</button>' if busy
               else f'<button class="btn btn--primary btn--grow" type="button" disabled>{publish_label}</button>' if saving
               else f'<button class="btn btn--primary btn--grow" type="button" data-mock-href="{href("admin-toast", "success")}">{publish_label}</button>')
    second = "Save changes" if draft else "Move to drafts" if edit else "Save draft"
    toast_state = "changes-saved" if draft else "info" if edit else "draft-saved"
    second_html = (f'<button class="btn btn--secondary btn--grow" type="button" disabled aria-busy="true">{busy_label("Saving…")}</button>' if saving
                   else f'<button class="btn btn--secondary btn--grow" type="button"{" disabled" if busy else ""} data-mock-href="{href("admin-toast", toast_state)}">{second}</button>')
    foot = f'    {second_html}\n    {publish}'
    if edit and not draft:
        save = (f'<button class="btn btn--primary btn--grow" type="button" disabled aria-busy="true">{busy_label("Saving…")}</button>' if saving
                else f'<button class="btn btn--primary btn--grow" type="button" data-mock-href="{href("admin-toast", "changes-saved")}">Save changes</button>')
        foot = f'    {save}'
    html = drawer("Edit event" if edit else "New event", body, foot)
    if not invalid and not busy and not saving:
        html = autofocus_first(html, 'id="f-title"')
    return over_admin("admin-events", A.manage_events(A.ev_table(A.ev_rows("All"))), html)


s = screen("event-editor", "dialog", "Event editor", opens_from="admin-events",
           source="Magic Patterns · prototype Admin Console · frame Manage Events (state composing: the New event drawer)")


@s("default", "New event drawer from the right: title, category, date, time, place, area, price, capacity, summary.")
def _():
    return event_editor() + note("Slides in from the right over 260 ms (fades under reduced motion); scrim click, Close and Escape dismiss; full width on phones.",
                                 "top: 1rem; left: 1rem;")


@s("edit", "Editing Saturday Park Bootcamp: same drawer, an image chosen, Save changes.")
def _():
    return event_editor(edit=True)


@s("edit-saving", "Save changes pressed: Saving…, fields read-only.")
def _():
    return event_editor(edit=True, saving=True)


@s("edit-invalid", "Capacity below the 36 going: the capacity field marked and the summary focused.")
def _():
    return event_editor(edit=True, capacity_below=True)


@s("edit-failed", "Saving failed: message at the top of the drawer, everything kept.")
def _():
    return event_editor(edit=True, failed=True)


@s("edit-draft", "Editing the Whole Life Retreat draft: Save changes keeps it a draft, Publish makes it live.")
def _():
    return event_editor(edit=True, draft=True)


@s("publish-failed", "Publishing failed after the fields were saved: message at the top of the drawer, everything kept, Publish tries again.")
def _():
    return event_editor(publish_failed=True)


@s("image-invalid", "An image that is not JPEG, PNG or WebP, or over 5 MB: the message under the image field.")
def _():
    return event_editor(image_invalid=True)


@s("invalid", "Missing title and a past date: summary focused, both fields marked.")
def _():
    return event_editor(invalid=True)


@s("busy", "Publish pressed: busy, fields read-only, Save draft disabled.")
def _():
    return event_editor(busy=True)


@s("failed", "Saving the draft failed: message at the top of the drawer, everything kept.")
def _():
    return event_editor(failed=True)


@s("saving", "Save draft pressed: Saving…, fields read-only, Publish disabled.")
def _():
    return event_editor(saving=True)


# ===========================================================================
# Listing editor drawer (admin · Manage services)
# ===========================================================================
def listing_editor(*, invalid=False, busy=False, failed=False) -> str:
    alert = ""
    check_err = ""
    if invalid:
        check_err = "Confirm you've checked their credentials before listing them"
        alert = error_summary("1 thing to fix before listing", [(check_err, "f-checked")]).replace('tabindex="-1"', 'tabindex="-1" autofocus')
    if failed:
        alert = form_alert("Couldn't save the listing", "The server didn't respond. Your changes are still here; try again.")
    ro = busy
    d = " disabled" if ro else ""
    check_desc = ' aria-describedby="f-checked-error" aria-invalid="true"' if invalid else ""
    check_html = (f'<div class="field"><label class="check check--ui"><input class="check__box" id="f-checked" type="checkbox"{"" if invalid else " checked"}{d}{check_desc}> '
                  f'I\'ve checked their registration, insurance and two references</label>'
                  + (f'<span class="field__error" id="f-checked-error">{check_err}</span>' if invalid else "") + "</div>")
    body = f"""    {alert}
    {field("Name", "name", "Hannah Bergstrom", readonly=ro)}
    <div class="field-grid">
      {field("Role", "role", "Registered massage therapist", readonly=ro)}
      {select("Category", "category", ["Training", "Nutrition", "Physio", "Coaching", "Counselling", "Massage"], "Massage", disabled=ro)}
    </div>
    {field("Where", "where", "In person · Leslieville", hint="In person, virtual, or both, with the neighbourhood", readonly=ro)}
    <div class="field-grid">
      {field("Rate", "rate", "From $95 / hour", readonly=ro)}
      {field("Credentials", "credentials", "RMT, CMTO #T4471", readonly=ro)}
    </div>
    {textarea("About", "about", "Sports and recovery massage for runners and lifters. Direct billing to most extended health plans.", rows=3, readonly=ro)}
    {check_html}"""
    save = (f'<button class="btn btn--primary btn--grow" type="button" disabled aria-busy="true">{busy_label("Listing…")}</button>' if busy
            else f'<button class="btn btn--primary btn--grow" type="button" data-mock-href="{href("admin-services", "decided")}">List professional</button>')
    foot = f'    <button class="btn btn--secondary btn--grow" type="button"{d} data-mock-href="{href("admin-services")}">Cancel</button>\n    {save}'
    html = drawer("Add listing", body, foot)
    if not invalid and not busy:
        html = autofocus_first(html, 'id="f-name"')
    return over_admin("admin-services", A.manage_services(A.application_cards(), "3"), html)


s = screen("listing-editor", "dialog", "Listing editor", opens_from="admin-services",
           source="Derived: the Manage Services frame's \"Add listing\" and \"Edit\" buttons; same drawer as the event editor.")


@s("default", "Add a vetted professional: name, role, category, where, rate, credentials, about and a vetting confirmation.")
def _():
    return listing_editor()


@s("invalid", "Vetting not confirmed: summary focused, error under the checkbox.")
def _():
    return listing_editor(invalid=True)


@s("busy", "List professional pressed: busy, read-only.")
def _():
    return listing_editor(busy=True)


@s("failed", "Saving failed: message at the top, everything kept.")
def _():
    return listing_editor(failed=True)


# ===========================================================================
# Toasts (member)
# ===========================================================================
def detail_page(mode="registered", ev="sunrise-5k"):
    return M.detail(EV[ev], mode)


TOAST_NOTE = "Success and info toasts auto-dismiss after 8 s and pause on hover or focus; danger toasts stay until dismissed."
s = screen("toast", "notification", "Toast", opens_from="event-detail",
           source="Derived: confirmations for the Event Detail frame's Register, Calendar and Can't make it actions.")


@s("info", "Calendar pressed: the event file was added.")
def _():
    t = toast("info", "Added to your calendar", "Easter Sunrise 5K, Saturday, April 18 at 6:45 AM.", icon_name="calendar-plus")
    return member_shell("events", detail_page(), after=toast_region(t)) + note(TOAST_NOTE, "top: 5rem; right: 1rem;")


@s("success", "Registered: confirms and offers the group chat.")
def _():
    t = toast("success", "You're registered", "We've added you to the Saturday Park Bootcamp group chat.", action=("Open chat", href("messages")))
    return member_shell("events", detail_page("registered", "park-bootcamp"), after=toast_region(t))


@s("warning", "An update from the team about an event Grace is going to.")
def _():
    t = toast("warning", "Rain in Saturday's forecast", "The run goes ahead unless the team messages the group by 5 AM.", action=("Open chat", href("messages")))
    return member_shell("events", detail_page(), after=toast_region(t))


@s("danger", "Registration failed: says the spot isn't saved; stays until dismissed.")
def _():
    t = toast("danger", "We couldn't register you", "Your spot isn't saved yet. Check your connection and try again.", action=("Try again", href("event-detail", "registering")), role="alert")
    return member_shell("events", detail_page("open", "park-bootcamp"), after=toast_region(t))


@s("with-action", "\"Can't make it\" pressed: Grace has left the event, with Undo instead of a confirmation.")
def _():
    t = toast("info", "You've left Easter Sunrise 5K", "Your spot goes to the waitlist in 10 minutes.", action=("Undo", href("event-detail")), icon_name="undo")
    return member_shell("events", detail_page("open"), after=toast_region(t)) + note("Undo is offered instead of a confirmation dialog: leaving is reversible for 10 minutes.", "top: 5rem; right: 1rem;")


@s("stacked", "Three toasts at once: newest at the bottom, 8 px apart, each dismissible.")
def _():
    ts = [toast("info", "Added to your calendar", "Easter Sunrise 5K, Saturday at 6:45 AM.", icon_name="calendar-plus"),
          toast("warning", "Rain in Saturday's forecast", "The run goes ahead unless the team messages by 5 AM."),
          toast("success", "You're registered", "Women's Hoops & Devotion Night, Thursday, April 30.", action=("Open chat", href("messages")))]
    return member_shell("events", detail_page(), after=toast_region(*ts))


# ===========================================================================
# Banners (member, under the header)
# ===========================================================================
s = screen("banner", "notification", "Banner", opens_from="home",
           source="Derived: page-level notices under the AppShell header.")


@s("info", "Email not confirmed yet: where the link went and a resend.")
def _():
    b = banner("info", "mail", f"<strong>Confirm your email.</strong> We sent a link to {ME['email']}.", action=("Resend", "info.html"))
    return member_shell("home", M.home(), banner=b)


@s("success", "Email confirmed: what it unlocks.")
def _():
    b = banner("success", "circle-check", "<strong>Email confirmed.</strong> You'll now get reminders the day before your events.")
    return member_shell("home", M.home(), banner=b)


@s("warning", "Offline: pages already opened stay visible until reconnected.")
def _():
    b = banner("warning", "wifi-off", "<strong>You're offline.</strong> Pages you've opened stay on screen. Check your connection to load new updates.", dismiss=False)
    return member_shell("home", M.home(), banner=b)


@s("danger", "Chat delayed: what's affected and that it's being worked on.", )
def _():
    b = banner("danger", "alert-triangle", "<strong>Messages are delayed.</strong> We're on it. New messages may take a few minutes to arrive.", role="alert", dismiss=False)
    return member_shell("home", M.home(), banner=b)


@s("persistent", "Scheduled maintenance: stays on every page until dismissed.")
def _():
    b = banner("brand", "wrench", "<strong>Scheduled maintenance Sunday, April 19, 1–3 AM.</strong> Messages and registration pause for those two hours.")
    return member_shell("home", M.home(), banner=b) + note("Persistent: shown on every signed-in page until dismissed; dismissal is remembered.", "top: 8rem; right: 1rem;")


# ===========================================================================
# Moderate a member (admin · Members)
# ===========================================================================
MODERATE_ACTIONS = {
    "flag": ("Flag", "Marks them for staff attention. They can still use the app."),
    "suspend": ("Suspend", "Signs them out everywhere. They cannot sign in until they are reinstated."),
    "reinstate": ("Reinstate", "Returns them to Active and clears the note on their row."),
}
# What each status allows, the milder first (L2-029; ADR 0028, ADR 0029).
MODERATE_ALLOWED = {"Active": ["flag", "suspend"], "Flagged": ["reinstate", "suspend"], "Suspended": ["reinstate"]}
MODERATE_SUBMIT = {"flag": "Flag member", "suspend": "Suspend member", "reinstate": "Reinstate member"}
MODERATE_TOAST = {"flag": "member-flagged", "suspend": "member-suspended", "reinstate": "member-reinstated"}


def moderate(*, member: str = "pn", action: str = "", invalid=False, busy=False, failed=False, refused=False) -> str:
    """The moderation dialog (L2-029; ADR 0028, ADR 0029): each status offers what it allows, the
    milder first. Flagging and suspending need a note, suspending a confirmation; reinstating
    needs neither."""
    m = next(x for x in A.MEMBERS if x["id"] == member)
    allowed = MODERATE_ALLOWED[m["status"]]
    action = action or allowed[0]
    suspend = action == "suspend"
    needs_note = action != "reinstate"
    note_err = "Write a note so other staff know why" if invalid else ""
    check_err = f"Confirm that {m['name']} should be suspended" if invalid and suspend else ""
    alert = ""
    if invalid:
        items = [(note_err, "f-note")] + ([(check_err, "f-confirmed")] if check_err else [])
        alert = error_summary(f"{len(items)} thing{'s' if len(items) > 1 else ''} to fix", items).replace('tabindex="-1"', 'tabindex="-1" autofocus')
    if failed:
        alert = form_alert("Couldn't save the change", "The server didn't respond. Nothing was lost; try again.")
    if refused:
        alert = form_alert("You can't moderate your own account", "Ask another Admin if your own account needs attention.")
    d = " disabled" if busy else ""
    choices = ""
    if len(allowed) > 1:
        items = "".join(
            f'<label class="choice"><input class="choice__input" type="radio" name="action" value="{a}"'
            f'{" checked" if a == action else ""}{d}><span><span class="choice__label">{MODERATE_ACTIONS[a][0]}</span>'
            f'<span class="choice__desc">{MODERATE_ACTIONS[a][1]}</span></span></label>' for a in allowed)
        choices = (f'<fieldset class="field"><legend class="field__legend">What do you want to do?</legend>'
                   f'<div class="choice-group">{items}</div></fieldset>')
    note_field = ""
    if needs_note:
        typed = "" if invalid else ("Spam messages to the Sunrise 5K group" if suspend else "Two members asked about messages from this account")
        note_field = textarea("Note", "note", typed, rows=3, error=note_err,
                              hint=f"Staff see this on the member's row. {500 - len(typed)} characters left.", readonly=busy)
    elif len(allowed) == 1:
        note_field = form_alert(f"{m['name']} will be able to sign in again",
                                "Their status goes back to Active and the note on their row is cleared.",
                                kind="info", ic="info", role="status").replace(' tabindex="-1"', "")
    check_html = ""
    if suspend:
        group_desc = ' aria-describedby="f-confirm-error"' if check_err else ""
        check_html = (f'<fieldset class="field"{group_desc}><legend class="field__legend">Confirm</legend>'
                      f'<label class="check check--ui"><input class="check__box" id="f-confirmed" type="checkbox"'
                      f'{"" if invalid else " checked"}{d}{" aria-invalid=" + chr(34) + "true" + chr(34) if check_err else ""}> Suspend {m["name"]} and end their sessions</label>'
                      + (f'<span class="field__error" id="f-confirm-error">{check_err}</span>' if check_err else "") + "</fieldset>")
    body = f"""    {alert}
    {choices}
    {note_field}
    {check_html}"""
    go = (f'<button class="btn btn--primary btn--grow" type="submit" disabled aria-busy="true">{busy_label("Saving…")}</button>' if busy
          else f'<button class="btn btn--primary btn--grow" type="submit" data-mock-href="{href("admin-toast", MODERATE_TOAST[action])}">{MODERATE_SUBMIT[action]}</button>')
    foot = f'    <button class="btn btn--secondary btn--grow" type="button"{d} data-mock-href="{href("admin-members")}">Cancel</button>\n    {go}'
    title = f"Moderate {m['name']}" if len(allowed) > 1 else f"Reinstate {m['name']}"
    html = dialog(title, body, foot, sub=f"{m['email']} · {m['status']}")
    if len(allowed) > 1 and not invalid and not busy and not failed and not refused:
        html = autofocus_first(html, f'name="action" value="{allowed[0]}"')
    return over_admin("admin-members", A.members_page(A.member_table(A.MEMBERS) + A.member_pagination()), html)


s = screen("moderate-member", "dialog", "Moderate a member", opens_from="admin-members", group="Admin console",
           source="Derived: the Members frame's rows; the prototype draws no flag, suspend or note control (ADR 0028).")


@s("default", "Moderate Priya Nair, an Active member: Flag chosen, a note to write; focus on the first choice.")
def _():
    return moderate()


@s("suspend", "Suspend chosen: the note, and a confirmation that their sessions end.")
def _():
    return moderate(action="suspend")


@s("flagged", "A Flagged member (Kevin Brooks) can be reinstated or suspended: Reinstate chosen, no note to write.")
def _():
    return moderate(member="kb")


@s("flagged-suspend", "Suspend chosen for a Flagged member: the note and the confirmation appear.")
def _():
    return moderate(member="kb", action="suspend")


@s("suspended", "A Suspended member (Tyler Simmons) can only be reinstated: no choice and no note, what it means, focus on the dialog.")
def _():
    return moderate(member="ts")


@s("invalid", "Suspend pressed with no note and no confirmation: summary focused, both named.")
def _():
    return moderate(action="suspend", invalid=True)


@s("busy", "Suspend member pressed: busy, the fields hold still, Cancel disabled.")
def _():
    return moderate(action="suspend", busy=True)


@s("failed", "Saving failed: message at the top, the note kept.")
def _():
    return moderate(action="suspend", failed=True)


@s("refused", "Staff chose their own row: the API refuses with cannot_moderate_self and the dialog says so.")
def _():
    return moderate(refused=True)


# ===========================================================================
# Admin toasts
# ===========================================================================
s = screen("admin-toast", "notification", "Admin toast", opens_from="admin-events", group="Admin console",
           source="Derived: confirmations for the admin console's Publish, Save draft, Suspend and Dismiss actions.")


def events_admin_page():
    return A.manage_events(A.ev_table(A.ev_rows("All")))


@s("info", "Report dismissed on Members: Kevin Brooks stays active.")
def _():
    t = toast("info", "Report dismissed", "Kevin Brooks stays active. The 4 members who reported the account won't be told who reviewed it.")
    body = A.admin_header("Members", "2,431 members · 86 joined this month", A.member_search()) + A.member_tabs("All") + A.member_table([dict(m, status="Active") if m["status"] == "Flagged" else m for m in A.MEMBERS])
    return admin_shell("admin-members", body, after=toast_region(t, admin=True), counts={"admin-members": 0})


@s("success", "Event published: live in the member app, with a link to view it.")
def _():
    t = toast("success", "Whole Life Retreat is live", "Members can register now. A group chat opens with the first registration.", action=("View in the app", href("events")))
    return admin_shell("admin-events", events_admin_page(), after=toast_region(t, admin=True))


@s("draft-saved", "Draft saved from the New event drawer: the draft is in the list; leaves after about 6 seconds.")
def _():
    t = toast("info", "Draft saved", "Whole Life Retreat isn't visible to members yet.")
    return admin_shell("admin-events", events_admin_page(), after=toast_region(t, admin=True))


@s("changes-saved", "Changes saved from the Edit event drawer; leaves after about 6 seconds.")
def _():
    t = toast("info", "Changes saved", "Whole Life Retreat is updated.")
    return admin_shell("admin-events", events_admin_page(), after=toast_region(t, admin=True))


@s("load-failed", "An event could not be opened for editing: the list stays; leaves after about 6 seconds.")
def _():
    t = toast("info", "Couldn't open the event", "We couldn't reach the server. Try Edit again in a moment.")
    return admin_shell("admin-events", events_admin_page(), after=toast_region(t, admin=True))
@s("member-flagged", "A member flagged from the moderation dialog: the note is on their row; leaves after about 6 seconds.")
def _():
    t = toast("info", "Priya Nair flagged", "They can still use the app. Your note is on their row.")
    return admin_shell("admin-members", A.members_page(A.member_table(A.MEMBERS) + A.member_pagination()), after=toast_region(t, admin=True))


@s("member-suspended", "A member suspended from the moderation dialog: signed out everywhere.")
def _():
    t = toast("info", "Priya Nair suspended", "They are signed out everywhere and cannot sign in.")
    return admin_shell("admin-members", A.members_page(A.member_table(A.MEMBERS) + A.member_pagination()), after=toast_region(t, admin=True))


@s("member-reinstated", "A member reinstated from the moderation dialog: Active again, the note cleared.")
def _():
    t = toast("info", "Tyler Simmons reinstated", "They are Active again and can sign in.")
    return admin_shell("admin-members", A.members_page(A.member_table(A.MEMBERS) + A.member_pagination()), after=toast_region(t, admin=True))


@s("warning", "An event is nearly full.")
def _():
    t = toast("warning", "Women's Hoops & Devotion Night is 80% full", "6 spots left. Registration closes when it fills, and a waitlist opens.")
    return admin_shell("admin-events", events_admin_page(), after=toast_region(t, admin=True))


@s("danger", "Publishing failed: draft is safe, retry offered; stays until dismissed.")
def _():
    t = toast("danger", "Couldn't publish Whole Life Retreat", "Your changes are saved as a draft.", action=("Try again", href("event-editor", "failed")), role="alert")
    return admin_shell("admin-events", events_admin_page(), after=toast_region(t, admin=True))


@s("with-action", "Member suspended on Members, with Undo.")
def _():
    t = toast("info", "Kevin Brooks suspended", "Kevin can't sign in or message anyone until you lift it.", action=("Undo", href("admin-members")), icon_name="undo")
    rows = [dict(m, status="Suspended") if m["status"] == "Flagged" else m for m in A.MEMBERS]
    body = A.admin_header("Members", "2,431 members · 86 joined this month", A.member_search()) + A.member_tabs("All") + A.member_table(rows)
    return admin_shell("admin-members", body, after=toast_region(t, admin=True), counts={"admin-members": 0})


@s("stacked", "Three admin toasts at once.")
def _():
    ts = [toast("info", "Draft saved", "Whole Life Retreat isn't visible to members yet."),
          toast("warning", "Women's Hoops & Devotion Night is 80% full", "6 spots left."),
          toast("success", "Whole Life Retreat is live", "Members can register now.", action=("View in the app", href("events")))]
    return admin_shell("admin-events", events_admin_page(), after=toast_region(*ts, admin=True))
