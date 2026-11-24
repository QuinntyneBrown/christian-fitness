"""Member web app: an event series, the directory and a listing's profile.
Layout and copy follow the Magic Patterns prototype "Christian Fitness" frames Event Series, Directory and Listing Profile."""
from __future__ import annotations

from cf_data import EV, KIND_BLURB, KIND_PLURAL, LISTING_KINDS, LISTINGS, LS, SR, hosted_by
from cf_ui import (CUR, busy_label, empty_block, error_block, form_alert, href, icon, image, listing_mark, loading_region,
                   member_shell, screen, verified_badge)
from overlays import dialog, over_member
from screens_member import SRC, ev_link, host_card, series_link, session_meter


# ===========================================================================
# Event series
# ===========================================================================
def session_row(x: dict, *, joined: bool, pickable: bool, picked: tuple) -> str:
    past, cancelled, nxt = x["status"] == "past", x["status"] == "cancelled", x["status"] == "next"
    mod = " session-row--next" if nxt else " session-row--past" if past else " session-row--cancelled" if cancelled else ""
    if pickable and not past and not cancelled:
        end = (f'<label class="check"><input class="check__box" type="checkbox" name="dates" value="{x["n"]}"'
               f'{" checked" if x["n"] in picked else ""}> <span>Drop in<span class="visually-hidden"> on {x["weekday"]}, {x["month"]} {x["day"]}</span></span></label>')
    elif past:
        end = (f'<span class="session-row__came">{icon("check")}You came</span>' if x["attended"]
               else f'<span class="session-row__status">{"Missed" if joined else "Done"}</span>')
    elif cancelled:
        end = '<span class="session-row__status">Cancelled</span>'
    elif x["event"]:
        end = f'<a class="btn btn--secondary btn--xs" href="{ev_link(EV[x["event"]])}">Details<span class="visually-hidden"> of session {x["n"]}</span> {icon("arrow-right", "icon--xs")}</a>'
    else:
        end = ""
    return f"""<li class="session-row{mod}">
              <div class="session-row__date" aria-hidden="true"><span class="session-row__month">{x["month"]}</span><span class="session-row__day">{x["day"]}</span></div>
              <div class="session-row__body">
                <p class="session-row__meta">Session {x["n"]} · {x["weekday"]}<span class="visually-hidden">, {x["month"]} {x["day"]}</span>{" · Next up" if nxt else ""}</p>
                <p class="session-row__topic">{x["topic"]}</p>
              </div>
              <div class="session-row__end">{end}</div>
            </li>"""


def plan_option(value: str, title: str, note: str, price: str, *, on: bool, disabled: bool = False) -> str:
    return f"""<label class="plan-option">
                  <input class="plan-option__input" type="radio" name="plan" value="{value}"{" checked" if on else ""}{" disabled" if disabled else ""}>
                  <span class="plan-option__body"><span class="plan-option__title">{title}</span><span class="plan-option__note">{note}</span></span>
                  <span class="plan-option__price">{price}</span>
                </label>"""


def series_panel(sr: dict, mode: str, picked: tuple) -> str:
    """mode: joined | join | joining | failed | drop | booking | booked | full"""
    remaining = [x for x in sr["sessions"] if x["status"] in ("next", "upcoming")]
    past = sum(1 for x in sr["sessions"] if x["status"] == "past")
    attended = sum(1 for x in sr["sessions"] if x["attended"])
    paid = sr["series_price"] != "Free"
    if mode == "joined":
        pay = ('<p class="register__note">Your spot is reserved. Pay the host at your first session; online payment is not available yet.</p>'
               if paid else "")
        return f"""<p class="register__confirmed" role="status">{icon("check", "icon--lg")}You're in for every session</p>
              {pay}
              <div class="series-progress">
                <p class="series-progress__head"><span class="series-progress__label">Your progress</span><span class="series-progress__count">Came to {attended} of {past}</span></p>
                {session_meter(sr, mine=True)}
              </div>
              <div class="btn-grid mt-3">
                <button class="btn btn--secondary btn--sm" type="button" data-mock-href="{href("toast", "info")}">{icon("calendar-plus")}All dates</button>
                <a class="btn btn--secondary btn--sm" href="{href("messages")}">{icon("message-circle")}Group chat</a>
              </div>
              <button class="btn btn--quiet mt-3" type="button" data-mock-href="{href("leave-series")}">Leave the series</button>"""
    if mode == "booked":
        n = len(picked)
        pay = f' Pay {sr["drop_in"]} to the host at each session; online payment is not available yet.' if sr["drop_in"] != "Free" else ""
        return f"""<p class="register__confirmed" role="status">{icon("check", "icon--lg")}Registered for {n} {"date" if n == 1 else "dates"}</p>
              <p class="register__note register__note--start">Sessions {", ".join(str(i) for i in sorted(picked))}. You can add more dates any time.{pay}</p>
              <a class="btn btn--quiet mt-3" href="{href("event-series", "drop-in")}">Change dates</a>"""
    full = mode == "full"
    drop = mode in ("drop", "booking") or full
    n = len(picked)
    drop_note = (f"{n} picked below" if n else "Tick dates in the list") if drop else "Come when you can"
    if drop:
        label = f'Register for {n} {"date" if n == 1 else "dates"}' if n else "Pick a date first"
        target = href("event-series", "booked")
    else:
        label, target = "Join the series", href("event-series", "joined")
    busy = mode in ("joining", "booking")
    if busy:
        label = busy_label("Joining…" if mode == "joining" else "Registering…")
    disabled = ' disabled aria-busy="true"' if busy else " disabled" if drop and not n else ""
    error = ('<p class="register__error" role="alert">We couldn\'t sign you up. Try again in a moment.</p>' if mode == "failed" else "")
    spots = "Series full" if full else f'{sr["capacity"] - sr["enrolled"]} of {sr["capacity"]} spots left'
    every_note = "Every place in the series is taken" if full else "Your spot is held each week"
    return f"""<div class="register__head"><h2 class="series-panel__title">Sign up</h2><p class="register__spots">{spots}</p></div>
              <fieldset class="plan-list">
                <legend class="visually-hidden">How would you like to come?</legend>
                {plan_option("all", f"Every session ({len(remaining)} left)", every_note, sr["series_price"], on=not drop, disabled=full or busy)}
                {plan_option("drop", "Pick dates to drop in", drop_note, "Free" if sr["drop_in"] == "Free" else f'{sr["drop_in"]} each', on=drop, disabled=busy)}
              </fieldset>
              <div class="register__state">
                {error}<button class="btn btn--primary btn--lg btn--block" type="button"{disabled} data-mock-href="{target}">{label}</button>
                <p class="register__note">One group chat for the whole series.</p>
              </div>"""


def series_page(sr: dict, mode: str, picked: tuple = ()) -> str:
    joined = mode == "joined"
    pickable = mode in ("drop", "booking", "full")
    remaining = sum(1 for x in sr["sessions"] if x["status"] in ("next", "upcoming"))
    past = sum(1 for x in sr["sessions"] if x["status"] == "past")
    rows = "".join(session_row(x, joined=joined, pickable=pickable, picked=picked) for x in sr["sessions"])
    return f"""    <div class="container page--detail">
      <a class="back-link" href="{href("events", "series")}">{icon("arrow-left")} All events</a>
      {image(sr["image"], "banner-image banner-image--wide")}
      <div class="split split--detail">
        <div>
          <p class="eyebrow eyebrow--icon">{icon("repeat")}{sr["category"]} series · {len(sr["sessions"])} sessions</p>
          <h1 class="display detail-title">{sr["title"]}</h1>
          <dl class="facts">
            <div class="facts__item">{icon("calendar-plus", "facts__icon")}<div><dt>{sr["cadence"]}, {sr["time"]}</dt><dd>{sr["range"]}</dd></div></div>
            <div class="facts__item">{icon("map-pin", "facts__icon")}<div><dt>{sr["place"]}</dt><dd>{sr["area"]}, Toronto</dd></div></div>
          </dl>
          <p class="prose lead series-summary">{sr["summary"]}</p>
          <section class="block-section" aria-labelledby="sessions-title">
            <div class="section-head">
              <h2 class="display section-title" id="sessions-title">Sessions</h2>
              <p class="section-head__note">{past} done · {remaining} to go</p>
            </div>
            <ol class="list-ruled session-list">{rows}</ol>
          </section>
        </div>
        <aside class="sticky-aside" aria-label="Sign up">
          <div class="card card--pad-sm">
              {series_panel(sr, mode, picked)}
          </div>
          {host_card(sr["host"], kind=False)}
        </aside>
      </div>
    </div>"""


C25K, BOOTCAMP = SR["couch-to-5k"], SR["park-bootcamp"]

s = screen("event-series", "page", "Event series", route="/events/series/:id", source=SRC + "Event Series (ojTg9D89s5DPcdkwWkUxKm)",
           not_applicable={"empty": "One series, not a collection; a missing series is the not-found page."})


@s("default", "Couch to 5K Run Club, which Grace has joined: every session with what happened or what is next, her progress, all dates, group chat and \"Leave the series\".")
def _():
    return member_shell("events", series_page(C25K, "joined"))


@s("not-joined", "Saturday Park Bootcamp, not joined: sign up for every remaining session at the series price, or pick dates to drop in.")
def _():
    return member_shell("events", series_page(BOOTCAMP, "join"))


@s("joining", "Join the series pressed: button busy, the two options read-only until the spot is confirmed.")
def _():
    return member_shell("events", series_page(BOOTCAMP, "joining"))


@s("joined", "A paid series just joined: \"You're in for every session\", how to pay, progress, all dates and group chat.")
def _():
    return member_shell("events", series_page(dict(BOOTCAMP, joined=True, enrolled=39), "joined"))


@s("failed", "Join the series pressed but the request failed: a generic message above the button, which stays usable.")
def _():
    return member_shell("events", series_page(BOOTCAMP, "failed"))


@s("drop-in-none", "\"Pick dates to drop in\" chosen, nothing ticked yet: each open date gets a Drop in tick box and the button reads \"Pick a date first\".")
def _():
    return member_shell("events", series_page(BOOTCAMP, "drop"))


@s("drop-in", "Two dates ticked (sessions 4 and 6): the button reads \"Register for 2 dates\".")
def _():
    return member_shell("events", series_page(BOOTCAMP, "drop", (4, 6)))


@s("booked", "Registered for the two dates: which sessions, how to pay, and \"Change dates\".")
def _():
    return member_shell("events", series_page(BOOTCAMP, "booked", (4, 6)))


@s("full", "Every place in the series is taken: \"Series full\", the every-session option is unavailable, and dates can still be picked to drop in; no waitlist.")
def _():
    return member_shell("events", series_page(dict(BOOTCAMP, enrolled=50), "full"))


@s("loading", "Series loading: banner, title, facts, session rows and the sign-up panel as skeletons.")
def _():
    row = ('<li class="session-row"><span class="skeleton skeleton--date"></span><div class="session-row__body skeleton-stack">'
           '<span class="skeleton skeleton--text-sm w-30"></span><span class="skeleton skeleton--text w-80"></span></div></li>')
    body = f"""    <div class="container page--detail">
      <a class="back-link" href="{href("events", "series")}">{icon("arrow-left")} All events</a>
      <span class="skeleton skeleton--image-banner"></span>
      <div class="split split--detail">
        <div class="skeleton-stack">
          <span class="skeleton skeleton--text-sm w-30"></span>
          <h1 class="visually-hidden">Loading series</h1>
          <span class="skeleton skeleton--title-lg"></span>
          <div class="facts"><span class="skeleton skeleton--text w-80"></span><span class="skeleton skeleton--text w-80"></span></div>
          <span class="skeleton skeleton--text w-90"></span>
          <ol class="list-ruled session-list block-section">{row * 4}</ol>
        </div>
        <div class="card card--pad-sm skeleton-stack sticky-aside"><span class="skeleton skeleton--title w-30"></span><span class="skeleton skeleton--button-block"></span><span class="skeleton skeleton--button-block"></span><span class="skeleton skeleton--text-sm w-80"></span></div>
      </div>
    </div>"""
    return member_shell("events", loading_region("Loading series", body))


@s("error", "Series failed to load: back link stays; retry or return to all events.")
def _():
    body = f"""    <div class="container page--detail">
      <a class="back-link" href="{href("events", "series")}">{icon("arrow-left")} All events</a>
      <h1 class="visually-hidden">Event series</h1>
      {error_block("This series didn't load", "We couldn't reach Christian Fitness. Your place, if you have one, is safe.", retry="default.html", back=("All events", href("events", "series")), ref="CF-S5T3")}
    </div>"""
    return member_shell("events", body)


# --- Leave the series (dialog) -------------------------------------------------
def leave_series(*, busy: bool = False, failed: bool = False) -> str:
    alert = ('<div class="dialog__alert">' + form_alert("We couldn't take you out of the series", "You still have your place. Try again in a moment.") + "</div>"
             if failed else "")
    keep = f'<button class="btn btn--secondary btn--grow" type="button" data-mock-href="{href("event-series")}"{" disabled" if busy else " autofocus"}>Stay in the series</button>'
    leave = (f'<button class="btn btn--primary btn--grow" type="submit" disabled aria-busy="true">{busy_label("Leaving…")}</button>' if busy
             else f'<button class="btn btn--primary btn--grow" type="submit" data-mock-href="{href("event-series", "not-joined")}">Leave the series</button>')
    body = f"""{alert}<p class="prose">Your place at the 5 sessions still to come goes back to other members, and you leave the series' group chat. You can join again while places are left.</p>"""
    return over_member("events", series_page(C25K, "joined"),
                       dialog("Leave the series?", body, keep + leave, sub="Couch to 5K Run Club · every Tuesday to May 26"))


s = screen("leave-series", "dialog", "Leave a series", opens_from="event-series",
           source="Derived: the Event Series frame's \"Leave the series\" action, confirmed in a dialog as cancelling a registration is (ADR 0034).",
           not_applicable={"invalid": "A confirmation with nothing to type."})


@s("default", "Confirm leaving: what is given up and that joining again is possible; focus starts on \"Stay in the series\".")
def _():
    return leave_series()


@s("busy", "Leave the series pressed: button busy, the other disabled.")
def _():
    return leave_series(busy=True)


@s("failed", "Leaving failed: a message in the dialog; the member still has their place.")
def _():
    return leave_series(failed=True)


# ===========================================================================
# Directory
# ===========================================================================
PROFILE_STATE = {"lakeshore-runners": "default", "okafor": "person", "cf-team": "one-off", "northline": "unverified"}


def listing_link(l: dict) -> str:
    return href("listing-profile", PROFILE_STATE.get(l["id"], "default"))


def follow_button(l: dict, *, big: bool = False, following: bool | None = None) -> str:
    on = l["following"] if following is None else following
    cls = "follow follow--lg" if big else "follow"
    return (f'<button class="{cls}" type="button" aria-pressed="{"true" if on else "false"}">'
            f'{icon("check") if on else ""}{"Following" if on else "Follow"}<span class="visually-hidden"> {l["name"]}</span></button>')


def listing_row(l: dict) -> str:
    sr, ev = hosted_by(l["id"])
    hosting = len(sr) + len(ev)
    hosting_html = (f'<span class="listing-row__hosting listing-row__hosting--some">{hosting} hosting</span>' if hosting
                    else '<span class="listing-row__hosting">No events yet</span>')
    return f"""<li class="listing-row">
            <a class="listing-row__link" href="{listing_link(l)}">
              {listing_mark(l)}
              <span class="listing-row__body">
                <span class="listing-row__name"><span>{l["name"]}</span>{verified_badge() if l["verified"] else ''}</span>
                <span class="listing-row__tagline">{l["tagline"]}</span>
                <span class="listing-row__area listing-row__area--inline">{icon("map-pin", "icon--xs")}{l["area"]}</span>
              </span>
              <span class="listing-row__area listing-row__area--col">{icon("map-pin")}<span>{l["area"]}</span></span>
              {hosting_html}
            </a>
            {follow_button(l)}
          </li>"""


def kind_chips(active: str, counts: dict | None = None) -> str:
    chips = []
    for k in ["All"] + LISTING_KINDS:
        n = (counts or {}).get(k, len(LISTINGS) if k == "All" else sum(1 for l in LISTINGS if l["kind"] == k))
        link = href("directory") if k == "All" else href("directory", "filtered")
        chips.append(f'<a class="chip" href="{link}"{CUR if k == active else ""}>{KIND_PLURAL[k]}<span class="chip__count">{n}</span></a>')
    return f'<nav class="chip-bar chip-bar--scroll" aria-label="Filter the directory by kind">{"".join(chips)}</nav>'


def directory_page(body: str, *, active: str = "All", search: str = "", counts: dict | None = None) -> str:
    value = f' value="{search}"' if search else ""
    return f"""    <div class="container page">
      <div class="page-head">
        <div>
          <h1 class="display page-title">Directory</h1>
          <p class="subtitle subtitle--measure">The churches, clubs, coaches and companies behind every event. Follow one to see their new dates first.</p>
        </div>
        <form class="search search--wide" role="search">
          <label class="visually-hidden" for="directory-search">Search the directory</label>
          {icon("search", "search__icon")}
          <input class="search__input" id="directory-search" type="search" placeholder="Search names, areas, sports"{value}>
        </form>
      </div>
      {kind_chips(active, counts)}
{body}
    </div>"""


def groups(listings, *, headed: bool = True) -> str:
    out = []
    for k in LISTING_KINDS:
        items = [l for l in listings if l["kind"] == k]
        if not items:
            continue
        head = (f'<div class="directory-group__head"><h2 class="display section-title">{KIND_PLURAL[k]}</h2>'
                f'<p class="directory-group__blurb">{KIND_BLURB[k]}</p></div>' if headed else "")
        out.append(f'<section class="directory-group">{head}<ul class="card card--list">{"".join(listing_row(l) for l in items)}</ul></section>')
    return f'<div class="directory-groups">{"".join(out)}</div>'


s = screen("directory", "page", "Directory", route="/directory", source=SRC + "Directory (tuLevfQerEwXUKLKRDMz4P)")


@s("default", "Every listing grouped by kind (organizations, people, instructors, ambassadors, companies, church ministries): name, verified mark, tagline, area, what it hosts and Follow.")
def _():
    return member_shell("directory", directory_page(groups(LISTINGS)))


@s("filtered", "Instructors chosen: one ungrouped list of the two instructors; the chip counts stay.")
def _():
    return member_shell("directory", directory_page(groups([l for l in LISTINGS if l["kind"] == "Instructor"], headed=False), active="Instructor"))


@s("search", "\"running\" typed: listings whose name, tagline, area or focus match, still grouped by kind.")
def _():
    hits = [l for l in LISTINGS if any("running" in t.lower() for t in [l["name"], l["tagline"], l["area"], *l["focus"]])]
    return member_shell("directory", directory_page(groups(hits), search="running"))


@s("no-results", "\"aquafit\" typed: nothing matches; Clear search and Suggest a listing.")
def _():
    return member_shell("directory", directory_page(empty_block(
        "No one by that name yet", "Nothing in the directory matches “aquafit”. Know someone who should be listed? Our team checks every suggestion.",
        f'<a class="btn btn--primary btn--sm" href="default.html">Clear search</a>'
        '<button class="btn btn--secondary btn--sm" type="button">Suggest a listing</button>', tag="p"),
        search="aquafit"))


@s("loading", "Directory loading: two groups of row skeletons; the heading, search and kind chips are already there.")
def _():
    row = ('<li class="listing-row"><div class="listing-row__link"><span class="skeleton skeleton--avatar skeleton--square"></span>'
           '<div class="listing-row__body skeleton-stack"><span class="skeleton skeleton--text w-40"></span>'
           '<span class="skeleton skeleton--text-sm w-80"></span></div></div><span class="skeleton skeleton--button-sm"></span></li>')
    group = f'<section class="directory-group"><span class="skeleton skeleton--title w-20"></span><ul class="card card--list">{row * 3}</ul></section>'
    return member_shell("directory", directory_page(loading_region("Loading the directory", f'<div class="directory-groups">{group * 2}</div>'),
                                                    counts={k: "…" for k in ["All"] + LISTING_KINDS}))


@s("empty", "Derived: no listings published yet: says so and points to events.")
def _():
    return member_shell("directory", directory_page(empty_block(
        "No listings yet", "Churches, clubs, coaches and companies appear here once our team has checked them.",
        f'<a class="btn btn--primary btn--sm" href="{href("events")}">Browse events</a>'), counts={k: 0 for k in ["All"] + LISTING_KINDS}))


@s("error", "Directory failed to load: the heading, search and kind chips stay; retry in place.")
def _():
    return member_shell("directory", directory_page(error_block(
        "The directory didn't load", "We couldn't reach Christian Fitness. Check your connection and try again.", retry="default.html", ref="CF-L8D1"),
        counts={k: "…" for k in ["All"] + LISTING_KINDS}))


@s("follow-failed", "Derived: Follow pressed but the request failed: the button goes back to Follow and a toast says so.")
def _():
    toast = ('<section class="toast-region" aria-label="Notifications"><div class="toast toast--danger" role="alert">' + icon("alert-circle") +
             '<div class="toast__body"><p class="toast__title">We couldn\'t follow Faith &amp; Footwork</p><p class="toast__text">Try again in a moment.</p></div>'
             '<button class="icon-button icon-button--sm toast__close" type="button" aria-label="Dismiss">' + icon("x") + '</button></div></section>')
    return member_shell("directory", directory_page(groups(LISTINGS)), after=toast)


# ===========================================================================
# Listing profile
# ===========================================================================
def hosting_rows(l: dict) -> str:
    sr_list, ev_list = hosted_by(l["id"])
    if not sr_list and not ev_list:
        return f'<p class="hosting__empty">{l["name"]} isn\'t hosting anything right now. Follow to hear when they post a date.</p>'
    rows = []
    for sr in sr_list:
        nxt = next((x for x in sr["sessions"] if x["status"] == "next"), None)
        left = sum(1 for x in sr["sessions"] if x["status"] in ("next", "upcoming"))
        when = f'Next: {nxt["weekday"]} {nxt["month"]} {nxt["day"]}, {sr["time"]}' if nxt else sr["range"]
        rows.append(f"""<li><a class="hosting-row" href="{series_link(sr)}">
                {image(sr["image"], "hosting-row__image")}
                <span class="hosting-row__body">
                  <span class="hosting-row__meta">{icon("repeat", "icon--xs")}Series · {sr["cadence"]}</span>
                  <span class="display hosting-row__title">{sr["title"]}</span>
                  <span class="hosting-row__sub">{when} · {left} sessions left</span>
                </span>
                {icon("arrow-right", "hosting-row__arrow")}
              </a></li>""")
    for e in ev_list:
        rows.append(f"""<li><a class="hosting-row" href="{ev_link(e)}">
                {image(e["image"], "hosting-row__image")}
                <span class="hosting-row__body">
                  <span class="hosting-row__meta">{e["category"]} · {e["weekday"]} {e["month"]} {e["day"]}</span>
                  <span class="display hosting-row__title">{e["title"]}</span>
                  <span class="hosting-row__sub">{e["time"]} · {e["place"]}</span>
                </span>
                {icon("arrow-right", "hosting-row__arrow")}
              </a></li>""")
    return f'<ul class="hosting">{"".join(rows)}</ul>'


def profile_page(l: dict) -> str:
    sr_list, ev_list = hosted_by(l["id"])
    hosting = len(sr_list) + len(ev_list)
    verified = f'<span class="listing-head__verified">· {icon("badge-check")} Verified</span>' if l["verified"] else ""
    website = (f'<div class="key-facts__row"><dt>{icon("globe")}Website</dt><dd><a class="inline-link" href="https://{l["website"]}" rel="noopener noreferrer" target="_blank">{l["website"]}<span class="visually-hidden"> (opens in a new tab)</span></a></dd></div>'
               if l["website"] else "")
    links = "".join(f"""<li><a class="mini-row" href="{listing_link(LS[i])}">
                  {listing_mark(LS[i], "sm")}
                  <span class="mini-row__body"><span class="mini-row__name">{LS[i]["name"]}</span><span class="mini-row__text">{rel} · {LS[i]["kind"]}</span></span>
                </a></li>""" for i, rel in l["links"])
    connected = (f"""<section aria-labelledby="connected-title">
            <h2 class="display section-title section-title--sm" id="connected-title">Connected</h2>
            <ul class="mini-list">{links}</ul>
          </section>""" if links else "")
    focus = "".join(f'<li class="tag tag--outline">{f}</li>' for f in l["focus"])
    return f"""    <div class="container page--detail">
      <a class="back-link" href="{href("directory")}">{icon("arrow-left")} Directory</a>
      <header class="listing-head">
        <div class="listing-head__who">
          {listing_mark(l, "xl")}
          <div class="listing-head__body">
            <p class="eyebrow listing-head__kind">{l["kind"]}{verified}</p>
            <h1 class="display detail-title listing-head__name">{l["name"]}</h1>
            <p class="subtitle">{l["tagline"]}</p>
          </div>
        </div>
        <div class="listing-head__actions">
          {follow_button(l, big=True)}
          <a class="btn btn--secondary btn--md" href="{href("messages", "direct")}">Message</a>
        </div>
      </header>
      <div class="split split--detail">
        <div>
          <section aria-labelledby="hosting-title">
            <h2 class="display section-title" id="hosting-title">Hosting{f' <span class="section-title__count section-title__count--muted">{hosting}</span>' if hosting else ''}</h2>
            {hosting_rows(l)}
          </section>
          <section class="block-section" aria-labelledby="about-title">
            <h2 class="display section-title" id="about-title">About</h2>
            <p class="prose lead">{l["about"]}</p>
            <ul class="tag-list">{focus}</ul>
          </section>
        </div>
        <aside class="aside-stack aside-stack--tight sticky-aside" aria-label="About this listing">
          <dl class="key-facts">
            <div class="key-facts__row"><dt>{icon("map-pin")}Area</dt><dd>{l["area"]}</dd></div>
            {website}
            <div class="key-facts__row"><dt>Followers</dt><dd>{l["followers"]:,}</dd></div>
            <div class="key-facts__row"><dt>On Christian Fitness</dt><dd>{l["since"]}</dd></div>
          </dl>
          {connected}
        </aside>
      </div>
    </div>"""


s = screen("listing-profile", "page", "Listing profile", route="/directory/:id", source=SRC + "Listing Profile (oR6CsZL1vhGPQiDNwDDXGr)",
           not_applicable={"empty": "One listing, not a collection; a listing that hosts nothing is the unverified state, and a missing listing is the not-found page."})


@s("default", "Lakeshore Runners Fellowship, an organization Grace follows: what it hosts (a series), about, focus, area, website, followers and connected listings.")
def _():
    return member_shell("directory", profile_page(LS["lakeshore-runners"]))


@s("person", "Danielle Okafor, an instructor: a round photo instead of a squared mark; she hosts the Saturday Park Bootcamp series.")
def _():
    return member_shell("directory", profile_page(LS["okafor"]))


@s("one-off", "Christian Fitness, hosting a one-off event (the Easter Sunrise 5K) and not yet followed: the primary Follow button.")
def _():
    return member_shell("directory", profile_page(LS["cf-team"]))


@s("unverified", "Northline Athletic, a company that is not verified and hosts nothing: no Verified mark, and the Hosting section says so.")
def _():
    return member_shell("directory", profile_page(LS["northline"]))


@s("loading", "Listing loading: the mark, name, hosting rows and facts as skeletons.")
def _():
    body = f"""    <div class="container page--detail">
      <a class="back-link" href="{href("directory")}">{icon("arrow-left")} Directory</a>
      <header class="listing-head">
        <div class="listing-head__who"><span class="skeleton skeleton--avatar-2xl skeleton--square"></span>
          <div class="listing-head__body skeleton-stack"><span class="skeleton skeleton--text-sm w-20"></span><h1 class="visually-hidden">Loading listing</h1>
          <span class="skeleton skeleton--title-lg"></span><span class="skeleton skeleton--text w-55"></span></div></div>
      </header>
      <div class="split split--detail">
        <div class="skeleton-stack"><span class="skeleton skeleton--title w-20"></span><span class="skeleton skeleton--block skeleton--tile"></span>
          <span class="skeleton skeleton--text w-90"></span><span class="skeleton skeleton--text w-80"></span></div>
        <div class="skeleton-stack"><span class="skeleton skeleton--text w-80"></span><span class="skeleton skeleton--text w-80"></span><span class="skeleton skeleton--text w-80"></span></div>
      </div>
    </div>"""
    return member_shell("directory", loading_region("Loading listing", body))


@s("error", "Listing failed to load: back link stays; retry or return to the directory.")
def _():
    body = f"""    <div class="container page--detail">
      <a class="back-link" href="{href("directory")}">{icon("arrow-left")} Directory</a>
      <h1 class="visually-hidden">Listing</h1>
      {error_block("This listing didn't load", "We couldn't reach Christian Fitness. Check your connection and try again.", retry="default.html", back=("Directory", href("directory")), ref="CF-L3P6")}
    </div>"""
    return member_shell("directory", body)
