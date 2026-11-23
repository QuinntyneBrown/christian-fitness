"""Dialogs, drawers, toasts and banners, each shown over the page it opens from."""
from __future__ import annotations

from cf_data import EV, INTERESTS, ME, SV
from cf_ui import (admin_shell, banner, busy_label, error_summary, field, form_alert, href, icon, member_shell, note,
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
def edit_profile(*, invalid=False, busy=False, failed=False) -> str:
    alert = ""
    if invalid:
        alert = error_summary("Check your profile", [("Enter your name so people know who you are", "f-name")]).replace('tabindex="-1"', 'tabindex="-1" autofocus')
    if failed:
        alert = form_alert("We couldn't save your changes", "Nothing was lost. Check your connection and try again.")
    chips = "".join(f'<button class="interest" type="button" aria-pressed="{"true" if i in ME["interests"] else "false"}"{" disabled" if busy else ""}>{i}</button>' for i in INTERESTS)
    body = f"""    {alert}
    {field("Full name", "name", "" if invalid else ME["name"], autocomplete="name", error="Enter your name so people know who you are" if invalid else "", readonly=busy)}
    <div class="field-grid">
      {field("Home church", "church", ME["church"], optional=True, hint="Only shown on your profile", readonly=busy)}
      {field("City", "city", ME["city"], autocomplete="address-level2", readonly=busy)}
    </div>
    {textarea("About", "bio", ME["bio"], rows=3, hint="A sentence or two. 160 characters left.", readonly=busy)}
    {textarea("Goals this year", "goals", chr(10).join(ME["goals"]), rows=3, hint="One per line", readonly=busy)}
    <fieldset><legend class="field__legend">Into</legend><div class="interest-list">{chips}</div></fieldset>"""
    save = (f'<button class="btn btn--primary btn--grow" type="submit" disabled aria-busy="true">{busy_label("Saving…")}</button>' if busy
            else f'<button class="btn btn--primary btn--grow" type="submit" data-mock-href="{href("profile")}">Save changes</button>')
    foot = f'    <button class="btn btn--secondary btn--grow" type="button"{" disabled" if busy else ""} data-mock-href="{href("profile")}">Cancel</button>\n    {save}'
    html = dialog("Edit profile", body, foot)
    if not invalid:
        html = autofocus_first(html, 'id="f-name"')
    return over_member("profile", M.profile(ME, self_view=True), html)


s = screen("edit-profile", "dialog", "Edit profile", opens_from="profile",
           source="Derived: the Profile frame's \"Edit profile\" button.")


@s("default", "Edit name, home church (optional), city, bio, goals and interests; long body scrolls between fixed header and footer.")
def _():
    return edit_profile()


@s("invalid", "Name cleared: summary focused, inline error, other fields kept.")
def _():
    return edit_profile(invalid=True)


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


def event_editor(*, edit=False, invalid=False, busy=False, saving=False, failed=False) -> str:
    if edit:
        v = dict(title="Saturday Park Bootcamp", cat="Workout", date="2026-04-25", time="08:00", place="Trillium Park, Ontario Place",
                 area="Waterfront, Toronto", price="$10", cap="50", desc=EV["park-bootcamp"]["summary"])
    else:
        v = dict(title="Whole Life Retreat", cat="Retreat", date="2026-05-22", time="16:00", place="Muskoka Woods, Rosseau",
                 area="Muskoka Lakes", price="$340", cap="60", desc="Three days of trail runs, strength sessions, worship by the lake and real rest. Meals and cabins included.")
    alert = ""
    title_err = date_err = ""
    if invalid:
        v.update(title="", date="2026-04-10")
        title_err = "Give the event a title members will recognize"
        date_err = "Pick a date after today, April 15"
        alert = error_summary("2 things to fix before publishing", [(title_err, "f-title"), (date_err, "f-date")]).replace('tabindex="-1"', 'tabindex="-1" autofocus')
    if failed:
        alert = form_alert("Couldn't publish", "The server didn't respond. Your changes are still here; try again, or save a draft.")
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
      {field("Capacity", "capacity", v["cap"], type_="number", extra='min="1" inputmode="numeric"', readonly=ro)}
    </div>
    {textarea("Summary", "summary", v["desc"], rows=4, hint="Up to 1,000 characters", readonly=ro)}"""
    publish_label = "Save changes" if edit else "Publish"
    publish = (f'<button class="btn btn--primary btn--grow" type="button" disabled aria-busy="true">{busy_label("Publishing…")}</button>' if busy
               else f'<button class="btn btn--primary btn--grow" type="button" disabled>{publish_label}</button>' if saving
               else f'<button class="btn btn--primary btn--grow" type="button" data-mock-href="{href("admin-toast", "success")}">{publish_label}</button>')
    second = "Move to drafts" if edit else "Save draft"
    toast_state = "info" if edit else "draft-saved"
    second_html = (f'<button class="btn btn--secondary btn--grow" type="button" disabled aria-busy="true">{busy_label("Saving…")}</button>' if saving
                   else f'<button class="btn btn--secondary btn--grow" type="button"{" disabled" if busy else ""} data-mock-href="{href("admin-toast", toast_state)}">{second}</button>')
    foot = f'    {second_html}\n    {publish}'
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


@s("edit", "Editing Saturday Park Bootcamp: same drawer, Save changes and Move to drafts.")
def _():
    return event_editor(edit=True)


@s("invalid", "Missing title and a past date: summary focused, both fields marked.")
def _():
    return event_editor(invalid=True)


@s("busy", "Publish pressed: busy, fields read-only, Save draft disabled.")
def _():
    return event_editor(busy=True)


@s("failed", "Publishing failed: message at the top of the drawer, everything kept.")
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


@s("warning", "Offline: cached content, when it was saved, and that it refreshes itself.")
def _():
    b = banner("warning", "wifi-off", "<strong>You're offline.</strong> Showing what was saved at 8:42 AM. We'll refresh when you're back.", dismiss=False)
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
MODERATE_ACTIONS = [
    ("Flag", "Marks them for staff attention. They can still use the app."),
    ("Suspend", "Signs them out everywhere. They cannot sign in until they are reinstated."),
]


def moderate(*, member: str = "pn", action: str = "flag", invalid=False, busy=False, failed=False, refused=False) -> str:
    """The moderation dialog (L2-029 AC1, AC2, AC4; ADR 0023): an Active member can be flagged or
    suspended, a Flagged one suspended; a note is required, and suspending asks for confirmation."""
    m = next(x for x in A.MEMBERS if x["id"] == member)
    flagged = m["status"] == "Flagged"
    suspend = flagged or action == "suspend"
    note_err = "Write a note so other staff know why" if invalid else ""
    check_err = f"Confirm that {m['name']} should be suspended" if invalid and suspend else ""
    alert = ""
    if invalid:
        items = [(note_err, "f-note")] + ([(check_err, "f-confirmed")] if check_err else [])
        alert = error_summary(f"{len(items)} thing{'s' if len(items) > 1 else ''} to fix", items).replace('tabindex="-1"', 'tabindex="-1" autofocus')
    if failed:
        alert = form_alert("Couldn't save the change", "The server didn't respond. Your note is still here; try again.")
    if refused:
        alert = form_alert("You can't flag or suspend your own account", "Ask another Admin if your own account needs attention.")
    d = " disabled" if busy else ""
    choices = ""
    if not flagged:
        items = "".join(
            f'<label class="choice"><input class="choice__input" type="radio" name="action" value="{l.lower()}"'
            f'{" checked" if (l == "Suspend") == suspend else ""}{d}><span><span class="choice__label">{l}</span>'
            f'<span class="choice__desc">{desc}</span></span></label>' for l, desc in MODERATE_ACTIONS)
        choices = (f'<fieldset class="field"><legend class="field__legend">What do you want to do?</legend>'
                   f'<div class="choice-group">{items}</div></fieldset>')
    typed = "" if invalid else ("Spam messages to the Sunrise 5K group" if suspend else "Two members asked about messages from this account")
    note_field = textarea("Note", "note", typed, rows=3, error=note_err,
                          hint=f"Staff see this on the member's row. {500 - len(typed)} characters left.", readonly=busy)
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
    label = "Suspend member" if suspend else "Flag member"
    toast_state = "member-suspended" if suspend else "member-flagged"
    go = (f'<button class="btn btn--primary btn--grow" type="submit" disabled aria-busy="true">{busy_label("Saving…")}</button>' if busy
          else f'<button class="btn btn--primary btn--grow" type="submit" data-mock-href="{href("admin-toast", toast_state)}">{label}</button>')
    foot = f'    <button class="btn btn--secondary btn--grow" type="button"{d} data-mock-href="{href("admin-members")}">Cancel</button>\n    {go}'
    title = f"Suspend {m['name']}" if flagged else f"Moderate {m['name']}"
    html = dialog(title, body, foot, sub=f"{m['email']} · {m['status']}")
    if not invalid and not busy and not failed and not refused:
        html = autofocus_first(html, 'id="f-note"' if flagged else 'name="action" value="flag"')
    return over_admin("admin-members", A.members_page(A.member_table(A.MEMBERS) + A.member_pagination()), html)


s = screen("moderate-member", "dialog", "Moderate a member", opens_from="admin-members", group="Admin console",
           source="Derived: the Members frame's rows; the prototype draws no flag, suspend or note control (ADR 0023).")


@s("default", "Moderate Priya Nair, an Active member: Flag chosen, a note to write; focus on the first choice.")
def _():
    return moderate()


@s("suspend", "Suspend chosen: the note, and a confirmation that their sessions end.")
def _():
    return moderate(action="suspend")


@s("flagged", "A Flagged member (Kevin Brooks) can only be suspended: no choice, focus on the note.")
def _():
    return moderate(member="kb")


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


@s("member-flagged", "A member flagged from the moderation dialog: the note is on their row; leaves after about 6 seconds.")
def _():
    t = toast("info", "Priya Nair flagged", "They can still use the app. Your note is on their row.")
    return admin_shell("admin-members", A.members_page(A.member_table(A.MEMBERS) + A.member_pagination()), after=toast_region(t, admin=True))


@s("member-suspended", "A member suspended from the moderation dialog: signed out everywhere.")
def _():
    t = toast("info", "Priya Nair suspended", "They are signed out everywhere and cannot sign in.")
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
