"""Admin console: staff sign in, two-step, dashboard, events, services, members, forbidden.
Layout and copy follow the Magic Patterns prototype "Admin Console" frame for frame."""
from __future__ import annotations

from cf_data import ADMIN, APPLICATIONS, DRAFT_EVENT, EVENTS, MEMBERS, SERVICES
from cf_ui import (CUR, admin_header, admin_shell, avatar, busy_label, empty_block, error_block, error_summary, field,
                   form_alert, href, icon, loading_region, screen, seal, service_avatar)

SRC = "Magic Patterns · prototype Admin Console · frame "
G = "Admin console"


# ===========================================================================
# Staff sign in and two-step
# ===========================================================================
def staff(inner: str) -> str:
    return f"""<main id="main" class="staff">
  <div class="staff__card">
    <div class="staff__brand">
      {seal("signin", decorative=True)}
      <div>
        <p class="staff__name">Christian Fitness</p>
        <p class="admin-eyebrow">Admin console</p>
      </div>
    </div>
{inner}
  </div>
</main>"""


def signin(*, invalid: bool = False, busy: bool = False, locked: bool = False, not_staff: bool = False, failed: bool = False,
           step: str = "") -> str:
    alert = ""
    # The second step's endings and refusals (L2-046 AC4 to AC6; ADR 0013).
    step_alerts = {
        "expired": ("Sign in again", "Your sign-in timed out before a code was entered. Sign in again to get a new code."),
        "locked": ("Too many codes tried", "For your security, wait 15 minutes, then sign in again."),
        "not-set-up": ("Two-step verification isn't set up", "Ask an Admin to set it up for your account, then sign in again."),
        # L2-018 AC5: the staff session ended after 30 idle minutes (ADR 0014).
        "session-expired": ("Your session expired", "You were signed out after 30 minutes without activity. Sign in again to carry on."),
    }
    if step:
        alert = '<div class="auth__alert">' + form_alert(*step_alerts[step]) + "</div>"
    elif locked:
        # L2-018 AC3 with L2-004 AC3: the member sign-in's pause, counted per email in both apps (ADR 0014).
        alert = '<div class="auth__alert">' + form_alert("Sign-in paused for 15 minutes", "Too many attempts, so we paused sign-in to keep the account safe. Wait 15 minutes, then try again.") + "</div>"
    elif invalid:
        # L2-018 AC3: one generic message that names neither field (ADR 0011).
        alert = '<div class="auth__alert">' + form_alert("Email or password is incorrect", "Check both and try again.") + "</div>"
    elif not_staff:
        alert = '<div class="auth__alert">' + form_alert("This account isn't on the team", "The admin console is for the Christian Fitness team. On the team? Ask a community director to give you staff access.") + "</div>"
    elif failed:
        alert = '<div class="auth__alert">' + form_alert("We couldn't sign you in", "Something went wrong on our side. Try again in a moment.") + "</div>"
    err = ""
    submit = (f'<button class="btn btn--primary btn--lg btn--block auth__submit" type="submit" disabled aria-busy="true">{busy_label("Signing in…")}</button>'
              if busy else '<button class="btn btn--primary btn--lg btn--block auth__submit" type="submit">Sign in</button>')
    return staff(f"""    <form action="{href("admin-two-step")}" novalidate>
      <h1 class="display staff__title">Staff sign in</h1>
      <p class="staff__lead">For the Christian Fitness team only.</p>
      {alert}
      <div class="auth__fields">
        {field("Work email", "email", ADMIN["email"], type_="email", autocomplete="username", readonly=busy)}
        {field("Password", "password", "••••••••••", type_="password", autocomplete="current-password", error=err, readonly=busy)}
      </div>
      {submit}
      <p class="staff__note">{icon("lock", "icon--xs")} Two-step verification required</p>
    </form>""")


s = screen("admin-sign-in", "page", "Staff sign in", route="/admin/sign-in", group=G, source=SRC + "Sign In (x7rTtnFLo7JruWBh3LepjD)",
           not_applicable={"loading": "Static form.", "empty": "A form, not a collection."})


@s("default", "Staff sign in on the ink background: work email, password, two-step notice.")
def _():
    return signin()


@s("invalid", "Wrong email or password: one generic alert that names neither field (L2-018 AC3).")
def _():
    return signin(invalid=True)


@s("submitting", "Sign in pressed: \"Signing in…\", button disabled.")
def _():
    return signin(busy=True)


@s("error", "5 failed sign-ins for the email in 15 minutes (L2-018 AC3, L2-004 AC3): sign-in paused for 15 minutes; what was typed stays and Sign in stays enabled.")
def _():
    return signin(locked=True)


@s("not-staff", "A member account without a staff role: refused with not_staff (L2-018 AC2); who can give access.")
def _():
    return signin(not_staff=True)


@s("failed", "The server failed or did not answer: what was typed stays; try again.")
def _():
    return signin(failed=True)


@s("two-step-expired", "Back from the code screen after 5 minutes: sign in again for a new code (L2-046 AC5).")
def _():
    return signin(step="expired")


@s("two-step-locked", "Back from the code screen after 5 wrong codes in 15 minutes: wait, then sign in again (L2-046 AC4).")
def _():
    return signin(step="locked")


@s("two-step-not-set-up", "Staff whose two-step verification is not set up: who can set it up (L2-046 AC6).")
def _():
    return signin(step="not-set-up")


@s("session-expired", "The staff session ended after 30 minutes without a request: sign in again (L2-018 AC5).")
def _():
    return signin(step="session-expired")


def two_step(*, invalid: bool = False, busy: bool = False, failed: bool = False) -> str:
    err = ("That code doesn't match. Codes change every 30 seconds, so enter the newest one." if invalid
           else "We couldn't check your code. Try again in a moment." if failed else "")
    value = "481 920" if not invalid else "481 902"
    submit = (f'<button class="btn btn--primary btn--lg btn--block auth__submit" type="submit" disabled aria-busy="true">{busy_label("Verifying…")}</button>'
              if busy else '<button class="btn btn--primary btn--lg btn--block auth__submit" type="submit">Verify</button>')
    return staff(f"""    <form action="{href("admin-dashboard")}" novalidate>
      <h1 class="display staff__title">Enter your code</h1>
      <p class="staff__lead">Open the authenticator app on your phone and enter the 6-digit code for Christian Fitness.</p>
      <div class="auth__fields">
        {field("Verification code", "code", value, autocomplete="one-time-code", extra='inputmode="numeric"', cls="input input--code", error=err, readonly=busy)}
      </div>
      {submit}
      <p class="staff__note">{icon("smartphone", "icon--xs")} Lost your phone? Ask an Admin to set up two-step verification again.</p>
    </form>""")


s = screen("admin-two-step", "page", "Two-step verification", route="/admin/sign-in/verify", group=G,
           source="Derived from the Sign In frame (its \"Two-step verification required\" notice).",
           not_applicable={"loading": "Static form.", "empty": "A form, not a collection.", "error": "Server failures show as the invalid state's message pattern (state failed); an expired or locked sign-in goes back to sign in."})


@s("default", "Second step: a 6-digit authenticator code; every sign-in asks for one (ADR 0013).")
def _():
    return two_step()


@s("invalid", "Wrong code: inline error that explains codes rotate.")
def _():
    return two_step(invalid=True)


@s("submitting", "Verify pressed: busy button.")
def _():
    return two_step(busy=True)


@s("failed", "The server failed or did not answer: the field says so and keeps the code (L2-046 AC7).")
def _():
    return two_step(failed=True)


def forbidden(*, busy: bool = False) -> str:
    submit = (f'<button class="btn btn--primary btn--lg btn--block auth__submit" type="submit" disabled aria-busy="true">{busy_label("Signing out…")}</button>'
              if busy else '<button class="btn btn--primary btn--lg btn--block auth__submit" type="submit">Sign out</button>')
    return staff(f"""    <form action="{href("admin-sign-in")}" novalidate>
      <h1 class="display staff__title" tabindex="-1">Staff only</h1>
      <p class="staff__lead">The admin console is for the Christian Fitness team, and this account doesn't have staff access right now.</p>
      {submit}
      <p class="staff__note">On the team? Ask a community director to give you staff access.</p>
    </form>""")


s = screen("admin-forbidden", "page", "Staff only", route="(any admin route, on a 403 to a read)", group=G,
           source="Derived from the Sign In frame layout.",
           not_applicable={"loading": "Renders without data.", "empty": "Not a collection.", "error": "This page is itself the refusal."})


@s("default", "403 to a read (L2-047 AC1): staff without access now, such as a role taken away; the heading takes focus; Sign out.")
def _():
    return forbidden()


@s("submitting", "Sign out pressed (L2-047 AC2): \"Signing out…\", button disabled; then Staff sign in.")
def _():
    return forbidden(busy=True)


# ===========================================================================
# System pages in the admin shell (L2-043)
# ===========================================================================
from screens_member import NA_SYSTEM, REFERENCE, server_error_text, system  # noqa: E402

s = screen("admin-not-found", "page", "Page not found (admin)", route="/** (admin)", group=G,
           source="Derived: the member not-found page in the admin shell.", not_applicable=NA_SYSTEM)


@s("default", "404 in the admin console: ways to the dashboard and to events.")
def _():
    return admin_shell("", system("404", "Page not found", "That link may be old, or the page has moved. Everything else is right where you left it.",
                                  f'<a class="btn btn--primary btn--sm" href="{href("admin-dashboard")}">Go to dashboard</a><a class="btn btn--secondary btn--sm" href="{href("admin-events")}">Manage events</a>',
                                  ic="compass", container=False))


s = screen("admin-server-error", "page", "Something went wrong (admin)", route="(any admin route, on a 5xx)", group=G,
           source="Derived: the member server-error page in the admin shell.", not_applicable=NA_SYSTEM)


def admin_server_error(reference: str | None) -> str:
    return admin_shell("", system("500", "Something went wrong", server_error_text(reference),
                                  f'<a class="btn btn--primary btn--sm" href="{href("admin-dashboard")}">{icon("rotate-cw")}Try again</a><a class="btn btn--secondary btn--sm" href="{href("admin-dashboard")}">Go to dashboard</a>',
                                  ic="alert-circle", container=False))


@s("default", "500 in the admin console: our fault, try again, with a reference code.")
def _():
    return admin_server_error(REFERENCE)


@s("no-reference", "500 in the admin console without a reference.")
def _():
    return admin_server_error(None)


# ===========================================================================
# Dashboard
# ===========================================================================
def queue_items(include=True) -> str:
    items = []
    for a in APPLICATIONS:
        items.append((False, f'{a["name"]} applied to list services', f'{a["role"]} · {a["submitted"]}', href("admin-services")))
    for m in MEMBERS:
        if m["status"] == "Flagged":
            items.append((True, f'{m["name"]} was reported', m["note"], href("admin-members", "flagged")))
    lis = "".join(f"""<li>
              <span class="queue__icon{' queue__icon--flag' if flag else ''}">{icon("flag" if flag else "heart-handshake", "icon--lg")}</span>
              <div class="queue__body"><p class="queue__title">{t}</p><p class="queue__meta">{m}</p></div>
              <a class="btn btn--secondary btn--xs" href="{to}">Review<span class="visually-hidden"> {t}</span></a>
            </li>""" for flag, t, m, to in items)
    return f'<ul class="queue">{lis}</ul>', len(items)


def community() -> str:
    return f"""<section class="min-w-0" aria-labelledby="community-title">
            <h2 class="display section-title" id="community-title">Community</h2>
            <div class="stat-hero">
              <p class="stat-hero__label">{icon("users")} Members</p>
              <p class="stat-hero__value">2,431</p>
              <p class="stat-hero__sub">+86 joined in April</p>
            </div>
            <dl class="stat-grid">
              <div class="stat"><dt>Registrations, April</dt><dd>221</dd></div>
              <div class="stat"><dt>Live listings</dt><dd>5</dd></div>
            </dl>
          </section>"""


def fill_list() -> str:
    lis = []
    for e in EVENTS:
        pct = round(e["going"] / e["capacity"] * 100)
        lis.append(f"""<li>
              <div class="event-row__date"><p class="event-row__month">{e["month"]}</p><p class="event-row__day">{e["day"]}</p></div>
              <div class="mini-row__body"><p class="mini-row__name">{e["title"]}</p><p class="mini-row__text">{e["place"]}</p></div>
              <div class="fill">
                <div class="fill__nums"><span class="fill__count">{e["going"]} / {e["capacity"]}</span><span class="fill__pct{' fill__pct--high' if pct >= 80 else ''}">{pct}%</span></div>
                <meter class="fill__meter" min="0" max="{e["capacity"]}" value="{e["going"]}" aria-label="{e["title"]}: {e["going"]} of {e["capacity"]} registered"></meter>
              </div>
            </li>""")
    return f'<ul class="fill-list">{"".join(lis)}</ul>'


def dashboard(*, queue: str | None = None, count: str = "4", upcoming: str | None = None, stats: str | None = None) -> str:
    q, n = queue_items()
    return f"""{admin_header(f"Morning, {ADMIN['first']}", "Here's what needs you today.")}
        <div class="split split--dashboard">
          <section class="min-w-0" aria-labelledby="attention-title">
            <h2 class="display section-title" id="attention-title">Needs attention <span class="section-title__count">{count}</span></h2>
            {queue if queue is not None else q}
          </section>
          {stats if stats is not None else community()}
        </div>
        <section class="mt-12" aria-labelledby="upcoming-title">
          <div class="section-head">
            <h2 class="display section-title" id="upcoming-title">Upcoming events</h2>
            <a class="text-link" href="{href("admin-events")}">Manage {icon("arrow-right")}</a>
          </div>
          {upcoming if upcoming is not None else fill_list()}
        </section>"""


s = screen("admin-dashboard", "page", "Dashboard", route="/admin", group=G, source=SRC + "Dashboard (r8vPpenwCG88cBh4QH43ce)")


@s("default", "What needs a decision today (3 applications, 1 report), community numbers and how full each event is.")
def _():
    return admin_shell("admin-dashboard", dashboard())


@s("loading", "Dashboard loading: queue rows, the member count and the fill list as skeletons.")
def _():
    row = ('<li><span class="skeleton skeleton--icon-tile"></span>'
           '<div class="queue__body skeleton-stack"><span class="skeleton skeleton--text w-80"></span><span class="skeleton skeleton--text-sm w-55"></span></div>'
           '<span class="skeleton skeleton--button-xs"></span></li>')
    stats = ('<section><h2 class="display section-title">Community</h2><span class="skeleton skeleton--stat"></span>'
             '<div class="stat-grid"><span class="skeleton skeleton--tile"></span><span class="skeleton skeleton--tile"></span></div></section>')
    fills = ('<ul class="fill-list">' + ('<li><span class="skeleton skeleton--date"></span><div class="skeleton-stack"><span class="skeleton skeleton--text w-55"></span>'
             '<span class="skeleton skeleton--text-sm w-40"></span></div><div class="fill skeleton-stack"><span class="skeleton skeleton--text-sm w-90"></span></div></li>') * 4 + '</ul>')
    body = dashboard(queue=f'<ul class="queue">{row * 4}</ul>', count="", upcoming=fills, stats=stats)
    return admin_shell("admin-dashboard", loading_region("Loading dashboard", body))


@s("empty", "Nothing needs attention: \"all caught up\" with what will show here; the rest of the dashboard stays.")
def _():
    q = '<p class="note-card">You\'re all caught up. New applications and member reports show up here as they come in.</p>'
    return admin_shell("admin-dashboard", dashboard(queue=q, count="0"), counts={"admin-services": 0, "admin-members": 0})


@s("error", "Dashboard failed to load: heading stays, retry in place.")
def _():
    body = admin_header(f"Morning, {ADMIN['first']}", "Here's what needs you today.") + error_block(
        "The dashboard didn't load", "We couldn't reach the server. Nothing you approved or published is lost.", retry="default.html", ref="CF-A1D6")
    return admin_shell("admin-dashboard", body)


@s("partial", "Upcoming events failed while the queue loaded: retry in place under that heading.")
def _():
    up = f"""<div class="inline-error" role="alert">{icon("alert-circle")}<div class="inline-error__body">
              <p class="inline-error__title">Upcoming events didn't load.</p><p>The queue above is up to date.</p>
              <button type="button" data-mock-href="default.html">Try again</button></div></div>"""
    return admin_shell("admin-dashboard", dashboard(upcoming=up))


# ===========================================================================
# Manage events
# ===========================================================================
def new_event_button() -> str:
    return f'<button class="btn btn--primary btn--md" type="button" data-mock-href="{href("event-editor")}">{icon("plus")}New event</button>'


def ev_tabs(active: str, counts=(5, 4, 1)) -> str:
    names = [("All", href("admin-events"), counts[0]), ("Published", href("admin-events", "published"), counts[1]), ("Draft", href("admin-events", "draft"), counts[2])]
    return '<nav class="tabs" aria-label="Filter events">' + "".join(
        f'<a class="tabs__tab" href="{h}"{CUR if n == active else ""}>{n} <span class="tabs__count">{c}</span></a>'
        for n, h, c in names) + "</nav>"


def ev_rows(which: str) -> list[dict]:
    rows = [dict(e, status="Published") for e in EVENTS] + [DRAFT_EVENT]
    return [r for r in rows if which == "All" or r["status"] == which]


def ev_table(rows) -> str:
    trs = "".join(f"""<tr>
                <td><p class="table__strong">{r["title"]}</p><p class="table__sub">{r["place"]}</p></td>
                <td class="table__nowrap">{r["month"]} {r["day"]} · {r["time"]}</td>
                <td class="table__nowrap"><span class="table__strong">{r["going"]}</span><span class="muted"> / {r["capacity"]}</span></td>
                <td><span class="status status--{r["status"].lower()}">{r["status"]}</span></td>
                <td class="table__end"><button class="row-link" type="button" data-mock-href="{href("event-editor", "edit")}">Edit<span class="visually-hidden"> {r["title"]}</span></button></td>
              </tr>""" for r in rows)
    return f"""<div class="table-wrap">
          <table class="table">
            <caption class="visually-hidden">Events</caption>
            <thead><tr><th scope="col">Event</th><th scope="col">Date</th><th scope="col">Registered</th><th scope="col">Status</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>
            <tbody>{trs}</tbody>
          </table>
        </div>"""


def manage_events(body: str, active: str = "All", counts=(5, 4, 1)) -> str:
    return admin_header("Events", "Published events appear in the member app right away.", new_event_button()) + "\n" + ev_tabs(active, counts) + "\n" + body


def table_skeleton(cols: int, rows: int = 5) -> str:
    tr = "<tr>" + "".join('<td><span class="skeleton skeleton--text w-80"></span></td>' for _ in range(cols)) + "</tr>"
    return f'<div class="table-wrap"><table class="table"><caption class="visually-hidden">Loading</caption><tbody>{tr * rows}</tbody></table></div>'


s = screen("admin-events", "page", "Manage events", route="/admin/events", group=G, source=SRC + "Manage Events (3Gt51yvnjf2gmVsCj7JPsC)")


@s("default", "Every event with date, registrations and status; New event opens the drawer.")
def _():
    return admin_shell("admin-events", manage_events(ev_table(ev_rows("All"))))


@s("published", "Published tab: the four live events.")
def _():
    return admin_shell("admin-events", manage_events(ev_table(ev_rows("Published")), "Published"))


@s("draft", "Draft tab: Whole Life Retreat, not yet visible to members.")
def _():
    return admin_shell("admin-events", manage_events(ev_table(ev_rows("Draft")), "Draft"))


@s("loading", "Events table loading: skeleton rows in the same table frame.")
def _():
    return admin_shell("admin-events", manage_events(loading_region("Loading events", table_skeleton(5)), counts=("", "", "")).replace('<span class="tabs__count"></span>', ""))


@s("empty", "No events at all: explains publishing and offers New event.")
def _():
    return admin_shell("admin-events", manage_events(empty_block(
        "No events yet", "Create the first one. It appears in the member app as soon as you publish it, with a group chat if you want one.",
        f'<button class="btn btn--primary btn--sm" type="button" data-mock-href="{href("event-editor")}">{icon("plus")}New event</button>'), counts=(0, 0, 0)))


@s("error", "Events failed to load: tabs stay; retry in place.")
def _():
    return admin_shell("admin-events", manage_events(error_block("Events didn't load", "We couldn't reach the server. Try again in a moment.", retry="default.html", ref="CF-A2E4")))


# ===========================================================================
# Manage services
# ===========================================================================
def application_cards(decided: dict | None = None) -> str:
    decided = decided or {}
    cards = []
    for a in APPLICATIONS:
        d = decided.get(a["id"])
        if d == "approved":
            foot = f'<p class="decision decision--approved" role="status">{icon("check")}Approved, now listed</p>'
        elif d == "declined":
            foot = '<p class="decision decision--declined" role="status">Declined</p>'
        else:
            foot = (f'<div class="btn-grid"><button class="btn btn--secondary btn--sm" type="button" data-mock-href="{href("admin-services", "decided")}">Decline<span class="visually-hidden"> {a["name"]}</span></button>'
                    f'<button class="btn btn--primary btn--sm" type="button" data-mock-href="{href("admin-services", "decided")}">Approve<span class="visually-hidden"> {a["name"]}</span></button></div>')
        cards.append(f"""<li class="application">
              <div class="application__head">{avatar(a["initials"])}<div class="mini-row__body"><p class="mini-row__name">{a["name"]}</p><p class="mini-row__text">{a["submitted"]}</p></div></div>
              <p class="application__role">{a["role"]}</p>
              <p class="application__creds">{a["credentials"]}</p>
              <div class="application__spacer"></div>
              {foot}
            </li>""")
    return f'<ul class="applications">{"".join(cards)}</ul>'


def listings_table() -> str:
    trs = "".join(f"""<tr>
                <td><div class="table__person">{service_avatar(sv, "md")}<div><p class="table__strong">{sv["name"]}</p><p class="table__sub">{sv["role"]}</p></div></div></td>
                <td>{sv["category"]}</td>
                <td class="table__nowrap">{sv["price"]}</td>
                <td class="table__nowrap muted">Mar 2026</td>
                <td class="table__end"><button class="row-link" type="button" data-mock-href="{href("listing-editor")}">Edit<span class="visually-hidden"> {sv["name"]}</span></button></td>
              </tr>""" for sv in SERVICES)
    return f"""<div class="table-wrap table-wrap--flush">
            <table class="table table--wide">
              <caption class="visually-hidden">Live listings</caption>
              <thead><tr><th scope="col">Professional</th><th scope="col">Category</th><th scope="col">Rate</th><th scope="col">Verified</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>
              <tbody>{trs}</tbody>
            </table>
          </div>"""


def manage_services(apps: str, count: str, listings: str | None = None, listing_count: str = "5") -> str:
    action = f'<button class="btn btn--primary btn--md" type="button" data-mock-href="{href("listing-editor")}">{icon("plus")} Add listing</button>'
    count_html = f' <span class="section-title__count">{count}</span>' if count else ""
    lc = f' <span class="section-title__count--muted">{listing_count}</span>' if listing_count else ""
    return f"""{admin_header("Services", "Every professional is checked before members can see them.", action)}
        <section class="mt-section" aria-labelledby="apps-title">
          <h2 class="display section-title" id="apps-title">Applications{count_html}</h2>
          {apps}
        </section>
        <section class="mt-12" aria-labelledby="listings-title">
          <h2 class="display section-title" id="listings-title">Live listings{lc}</h2>
          {listings if listings is not None else listings_table()}
        </section>"""


s = screen("admin-services", "page", "Manage services", route="/admin/services", group=G, source=SRC + "Manage Services (jKqAWK6384okr35PyGC6Le)")


@s("default", "Three applications waiting for Approve or Decline, then the five live listings.")
def _():
    return admin_shell("admin-services", manage_services(application_cards(), "3"))


@s("decided", "After deciding two: Hannah approved and listed, Samuel declined, Lena still waiting.")
def _():
    return admin_shell("admin-services", manage_services(application_cards({"a1": "approved", "a2": "declined"}), "1"), counts={"admin-services": 1})


@s("no-applications", "No applications waiting (the prototype's empty queue); listings still shown.")
def _():
    return admin_shell("admin-services", manage_services('<p class="note-card">No applications waiting. New ones show up here and on the dashboard.</p>', ""), counts={"admin-services": 0})


@s("loading", "Applications and listings loading as skeletons.")
def _():
    card = ('<li class="application skeleton-stack"><div class="application__head"><span class="skeleton skeleton--avatar"></span><div class="mini-row__body skeleton-stack">'
            '<span class="skeleton skeleton--text w-80"></span><span class="skeleton skeleton--text-sm w-40"></span></div></div><span class="skeleton skeleton--text w-90"></span>'
            '<span class="skeleton skeleton--text-sm w-55"></span><span class="skeleton skeleton--button-block skeleton--button-block-sm"></span></li>')
    body = manage_services(f'<ul class="applications">{card * 3}</ul>', "", table_skeleton(5).replace("table-wrap", "table-wrap table-wrap--flush"), "")
    return admin_shell("admin-services", loading_region("Loading services", body))


@s("empty", "No applications and no listings yet: explains vetting and offers Add listing.")
def _():
    body = manage_services('<p class="note-card">No applications waiting. New ones show up here and on the dashboard.</p>', "",
                           empty_block("No listings yet", "Add a professional you've checked yourself, or approve an application when one comes in.",
                                       f'<button class="btn btn--primary btn--sm" type="button" data-mock-href="{href("listing-editor")}">{icon("plus")}Add listing</button>', tight=True).replace("<h2", "<h3").replace("</h2>", "</h3>"), "0")
    return admin_shell("admin-services", body, counts={"admin-services": 0})


@s("error", "Services failed to load: retry in place.")
def _():
    body = admin_header("Services", "Every professional is checked before members can see them.") + error_block(
        "Services didn't load", "We couldn't reach the server. Applications you already decided are saved.", retry="default.html", ref="CF-A3S5")
    return admin_shell("admin-services", body)


# ===========================================================================
# Members
# ===========================================================================
def member_search(value: str = "") -> str:
    v = f' value="{value}"' if value else ""
    return f"""<form class="search" role="search">
            <label class="visually-hidden" for="member-search">Search members</label>
            {icon("search", "search__icon")}
            <input class="search__input" id="member-search" type="search" placeholder="Search name, email or church"{v}>
          </form>"""


def report_banner(m: dict) -> str:
    return f"""<div class="report" role="region" aria-label="Report about {m["name"]}">
          <div class="report__body">
            <p class="report__label">Reported by 4 members</p>
            <p class="report__text">{m["name"]}: {m["note"]}</p>
          </div>
          <div class="btn-row">
            <button class="btn btn--on-brand btn--sm" type="button" data-mock-href="{href("admin-toast", "info")}">Dismiss</button>
            <button class="btn btn--inverse btn--sm" type="button" data-mock-href="{href("admin-toast", "with-action")}">Suspend</button>
          </div>
        </div>"""


STATUS_LINKS = [("All", href("admin-members")), ("Active", href("admin-members", "active")), ("Flagged", href("admin-members", "flagged")), ("Suspended", href("admin-members", "suspended"))]


def member_tabs(active: str) -> str:
    return '<nav class="tabs" aria-label="Filter members">' + "".join(
        f'<a class="tabs__tab" href="{h}"{CUR if n == active else ""}>{n}</a>' for n, h in STATUS_LINKS) + "</nav>"


def member_table(rows) -> str:
    trs = "".join(f"""<tr>
                <td><div class="table__person">{avatar(m["initials"], size="table")}<div class="mini-row__body"><p class="table__strong">{m["name"]}</p><p class="table__sub">{m["email"]}</p></div></div></td>
                <td class="muted">{m["church"] if m["church"] != "—" else '<span aria-label="Not given">—</span>'}</td>
                <td class="table__nowrap">{m["joined"]}</td>
                <td class="table__num">{m["events"]}</td>
                <td><span class="status status--{m["status"].lower()}">{m["status"]}</span></td>
              </tr>""" for m in rows)
    return f"""<div class="table-wrap">
          <table class="table table--wider">
            <caption class="visually-hidden">Members</caption>
            <thead><tr><th scope="col">Member</th><th scope="col">Church</th><th scope="col">Joined</th><th scope="col">Events</th><th scope="col">Status</th></tr></thead>
            <tbody>{trs}</tbody>
          </table>
        </div>"""


def members_page(body: str, active: str = "All", *, search: str = "", show_report: bool = True) -> str:
    flagged = [m for m in MEMBERS if m["status"] == "Flagged"]
    reports = "".join(report_banner(m) for m in flagged) if show_report else ""
    return admin_header("Members", "2,431 members · 86 joined this month", member_search(search)) + reports + member_tabs(active) + body


s = screen("admin-members", "page", "Members", route="/admin/members", group=G, source=SRC + "Members (tPxu6npHD6a6sbs4ZYxPji)")


@s("default", "The open report first (Kevin Brooks), then every member with church, joined date, events and status.")
def _():
    return admin_shell("admin-members", members_page(member_table(MEMBERS)))


@s("active", "Active tab.")
def _():
    return admin_shell("admin-members", members_page(member_table([m for m in MEMBERS if m["status"] == "Active"]), "Active"))


@s("flagged", "Flagged tab: the reported member, report still on top.")
def _():
    return admin_shell("admin-members", members_page(member_table([m for m in MEMBERS if m["status"] == "Flagged"]), "Flagged"))


@s("suspended", "Suspended tab: Tyler Simmons.")
def _():
    return admin_shell("admin-members", members_page(member_table([m for m in MEMBERS if m["status"] == "Suspended"]), "Suspended"))


@s("no-results", "Search matched nobody: says what was searched and how to widen it.")
def _():
    body = empty_block("No members match “Jessica”", "Check the spelling, or search by email or home church instead.",
                       '<a class="btn btn--primary btn--sm" href="default.html">Clear search</a>')
    return admin_shell("admin-members", members_page(body, search="Jessica"))


@s("loading", "Members table loading: skeleton rows.")
def _():
    return admin_shell("admin-members", members_page(loading_region("Loading members", table_skeleton(5, 7)), show_report=False))


@s("empty", "No members yet (a fresh community): explains where members come from.")
def _():
    body = admin_header("Members", "0 members") + member_tabs("All") + empty_block(
        "No members yet", "Members appear here when they create a profile in the app. Share the landing page to invite your first ones.",
        f'<a class="btn btn--primary btn--sm" href="{href("landing")}">Open the landing page</a>')
    return admin_shell("admin-members", body, counts={"admin-members": 0, "admin-services": 0})


@s("error", "Members failed to load: retry in place.")
def _():
    body = admin_header("Members", "") + error_block("Members didn't load", "We couldn't reach the server. Try again in a moment.", retry="default.html", ref="CF-A4M8")
    return admin_shell("admin-members", body)
