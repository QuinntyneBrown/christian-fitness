"""Member web app: public pages, auth, signed-in screens and system pages.
Layout and copy follow the Magic Patterns prototype "Christian Fitness" frame for frame."""
from __future__ import annotations

from cf_data import (CONVERSATIONS, CV, EV, EVENT_CATEGORIES, EVENTS, INTERESTS, ME, MICHAEL, SCHEDULE,
                     SERVICE_CATEGORIES, SERVICES, SV)
from cf_ui import (CUR, avatar, busy_label, document, empty_block, error_block, error_summary, field, form_alert, href,
                   icon, image, loading_region, lockup, member_shell, note, screen, seal, service_avatar, banner)

SRC = "Magic Patterns · prototype Christian Fitness · frame "


def ev_link(e: dict) -> str:
    return href("event-detail", "default" if e["registered"] else "unregistered")


def conv_link(c: dict) -> str:
    return href("messages", {"okafor": "direct"}.get(c["id"], "default"))


def svc_link(s: dict) -> str:
    return href("services", {"lee": "selected"}.get(s["id"], "default"))


# ===========================================================================
# Landing
# ===========================================================================
def landing(coming: str) -> str:
    first = EVENTS[0]
    return f"""<div class="site">
  <header class="site-header">
    {lockup(href("landing"))}
    <div class="site-header__actions">
      <a class="btn btn--ghost site-header__signin" href="{href("sign-in")}">Sign in</a>
      <a class="btn btn--primary" href="{href("join")}">Join free</a>
    </div>
  </header>
  <main id="main">
    <section class="hero" aria-labelledby="hero-title">
      <div>
        <h1 class="display hero__title" id="hero-title">Life to the full.</h1>
        <p class="hero__lead">A Christian community for health in body and spirit. Find events, train with friends, and meet professionals who share your faith.</p>
        <div class="hero__actions">
          <a class="btn btn--primary btn--lg" href="{href("join")}">Join the community {icon("arrow-right")}</a>
          <p class="hero__proof"><strong>2,400+</strong> members across the GTA</p>
        </div>
      </div>
      <div class="hero__media">
        {image("run", "hero__image", "A group running together along the Toronto waterfront at sunrise")}
        <div class="hero__float">
          <div class="date-tile" aria-hidden="true"><span class="date-tile__month">{first["month"]}</span><span class="date-tile__day">{first["day"]}</span></div>
          <div>
            <p class="hero__float-title">{first["title"]}</p>
            <p class="hero__float-meta"><span class="visually-hidden">{first["weekday"]}, {first["month"]} {first["day"]} · </span>{first["going"]} going · {first["price"]}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="band" aria-labelledby="coming-title">
      <div class="band__inner">
        <div>
          <h2 class="display band__title" id="coming-title">Coming up</h2>
          <p class="subtitle">Runs, workouts and gatherings posted by our team every week.</p>
          {coming}
        </div>
        <div class="band__aside">
          <div>
            <h3 class="display band__point-title">Train together</h3>
            <p class="band__point-text">Build a profile, find people at your pace, and keep each other going in group chats for every event.</p>
          </div>
          <div>
            <h3 class="display band__point-title">Trusted professionals</h3>
            <p class="band__point-text">Trainers, dietitians, physios and counsellors, each one vetted and listed by our team.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="verse" aria-label="Scripture">
      <div class="verse__inner">
        {seal("verse", light=True, uid="landing-seal")}
        <blockquote>
          <p class="verse__quote">“I came that they may have life and have it abundantly.”</p>
          <cite class="verse__cite">John 10:10</cite>
        </blockquote>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <p>© 2026 Christian Fitness · Toronto</p>
    <p>Health · Energy · Abundant life</p>
  </footer>
</div>"""


def landing_rows() -> str:
    rows = "".join(f"""<li><a class="event-row event-row--lg" href="{href("join")}">
            <div class="event-row__date"><p class="event-row__month">{e["month"]}</p><p class="event-row__day">{e["day"]}</p></div>
            <div class="event-row__body"><p class="event-row__title">{e["title"]}</p><p class="event-row__meta">{e["weekday"]} {e["time"]} · {e["place"]}</p></div>
            {icon("arrow-right", "event-row__arrow")}
          </a></li>""" for e in EVENTS[:3])
    return f'<ul class="list-ruled mt-8-list">{rows}</ul>'


s = screen("landing", "page", "Landing", route="/", source=SRC + "Landing (m6TmegBz1WUe34iTU1vouC)", group="Public")


@s("default", "Public landing page: hero, the next three events, what members get, and John 10:10.")
def _():
    return landing(landing_rows().replace("mt-8-list", "landing-list"))


@s("loading", "Landing while upcoming events load: the hero is static; the event list shows three skeleton rows.")
def _():
    row = ('<li class="event-row event-row--lg"><span class="skeleton skeleton--date"></span>'
           '<div class="event-row__body skeleton-stack"><span class="skeleton skeleton--text w-55"></span>'
           '<span class="skeleton skeleton--text-sm w-80"></span></div></li>')
    return landing(loading_region("Loading upcoming events", f'<ul class="list-ruled landing-list">{row * 3}</ul>'))


@s("empty", "Landing when no events are posted yet: the list explains and points to joining.")
def _():
    return landing(f"""<div class="empty-inline landing-list">
            <p class="empty-inline__text">New runs and workouts are posted every week. Join free and we'll let you know when the next one is up.</p>
            <p class="empty-inline__action"><a class="text-link" href="{href("join")}">Join to hear first {icon("arrow-right")}</a></p>
          </div>""")


@s("error", "Landing when upcoming events fail to load: the rest of the page works; the list offers a retry.")
def _():
    return landing(f"""<div class="inline-error landing-list" role="alert">
            {icon("alert-circle")}
            <div class="inline-error__body"><p class="inline-error__title">Upcoming events didn't load.</p><p>Check your connection, then try again.</p>
            <button type="button" data-mock-href="default.html">Try again</button></div>
          </div>""")


# ===========================================================================
# Auth layout (Join, Sign in, Forgot / Reset password)
# ===========================================================================
def auth(form: str) -> str:
    points = "".join(f'<li>{icon("check")}{t}</li>' for t in [
        "Register for runs, workouts and retreats", "Chat with your event groups", "Book vetted Christian professionals"])
    return f"""<div class="auth">
  <aside class="auth__brand" aria-label="Christian Fitness">
    {lockup(href("landing"), light=True)}
    <div class="auth__mark">
      {seal("hero", light=True, uid="auth-seal")}
      <p class="display auth__claim">Health in body and spirit, together.</p>
    </div>
    <ul class="auth__points">{points}</ul>
  </aside>
  <main id="main" class="auth__main">
{form}
  </main>
</div>"""


def interests(picked=("Running", "Strength"), disabled: bool = False) -> str:
    d = " disabled" if disabled else ""
    chips = "".join(f'<button class="interest" type="button" aria-pressed="{"true" if i in picked else "false"}"{d}>{i}</button>'
                    for i in INTERESTS)
    return f'<fieldset><legend class="field__legend">What are you into?</legend><div class="interest-list">{chips}</div></fieldset>'


def join_form(*, email_error: str = "", busy: bool = False, alert: str = "", errors: dict | None = None,
              values: dict | None = None) -> str:
    ro = busy
    errors = errors or {}
    v = {"name": ME["name"], "email": ME["email"], "password": "abundantlife", "church": ME["church"], **(values or {})}
    email_err = email_error or errors.get("email", "")
    submit = (f'<button class="btn btn--primary btn--lg btn--block auth__submit" type="submit" disabled aria-busy="true">{busy_label("Creating your profile…")}</button>'
              if busy else '<button class="btn btn--primary btn--lg btn--block auth__submit" type="submit">Create profile</button>')
    return f"""    <form class="auth__form" action="{href("home")}" novalidate>
      <h1 class="display auth__title">Create your profile</h1>
      <p class="auth__lead">Free for everyone. Takes about a minute.</p>
      {alert}
      <div class="auth__fields">
        {field("Full name", "name", v["name"], autocomplete="name", error=errors.get("name", ""), readonly=ro)}
        {field("Email", "email", v["email"], type_="email", autocomplete="email", error=email_err, readonly=ro)}
        {field("Password", "password", v["password"], type_="password", autocomplete="new-password", hint="At least 8 characters", error=errors.get("password", ""), readonly=ro)}
        {field("Home church", "church", v["church"], hint="Optional — helps you find people nearby", error=errors.get("church", ""), readonly=ro)}
        {interests(disabled=busy)}
      </div>
      {submit}
      <p class="auth__alt">Already a member? <a href="{href("sign-in")}">Sign in</a></p>
    </form>"""


s = screen("join", "page", "Join", route="/join", source=SRC + "Join (owKTeNTEtw5hx1TDVR7CTy)", group="Public",
           not_applicable={"loading": "Static form; nothing loads before it renders.",
                           "empty": "A form, not a collection."})


@s("default", "Create a profile: name, email, password, optional home church and interests.")
def _():
    return auth(join_form())


@s("invalid", "The email already has an account: inline error under Email with a way to sign in.")
def _():
    return auth(join_form(email_error=f'An account with this email already exists. <a class="inline-link" href="{href("sign-in")}">Sign in instead?</a>'))


JOIN_FIELD_ERRORS = {"name": "Enter your full name", "email": "Enter an email address like name@example.com",
                     "password": "Use at least 8 characters"}


@s("invalid-fields", "Fields left empty or malformed: a summary above the form links to each one, and each field says what to fix. Nothing is sent.")
def _():
    summary = '<div class="auth__alert">' + error_summary("Check your details", [
        (JOIN_FIELD_ERRORS["name"], "f-name"), (JOIN_FIELD_ERRORS["email"], "f-email"),
        (JOIN_FIELD_ERRORS["password"], "f-password")]) + "</div>"
    return auth(join_form(alert=summary, errors=JOIN_FIELD_ERRORS,
                          values={"name": "", "email": "grace.thompson@gmail", "password": "abc"}))


@s("refused", "The server refused the details (a field too long, say): a generic message above the form; everything typed is kept.")
def _():
    return auth(join_form(alert='<div class="auth__alert">' + form_alert(
        "Check your details", "Some of your details weren't accepted. Check each field and try again.") + "</div>"))


@s("submitting", "Create profile pressed: button busy and disabled, fields read-only, no layout shift.")
def _():
    return auth(join_form(busy=True))


@s("error", "The server did not respond: a message above the form; everything typed is kept.")
def _():
    return auth(join_form(alert='<div class="auth__alert">' + form_alert(
        "We couldn't create your profile", "Our servers didn't respond. Everything you typed is still here, so try again in a moment.") + "</div>"))


# --- Sign in -----------------------------------------------------------------
def signin_form(*, invalid: bool = False, busy: bool = False, locked: bool = False, failed: bool = False) -> str:
    alert = ""
    if invalid:
        # L2-004 AC2: one generic message that names neither field, so no field is marked invalid.
        alert = '<div class="auth__alert">' + form_alert(
            "Email or password is incorrect", "Check both and try again.") + "</div>"
    if failed:
        alert = '<div class="auth__alert">' + form_alert(
            "We couldn't sign you in", "Something went wrong on our side. Try again in a moment.") + "</div>"
    if locked:
        alert = '<div class="auth__alert">' + form_alert(
            "Sign-in paused for 15 minutes",
            f'Too many attempts, so we paused sign-in to keep your account safe. <a class="inline-link" href="{href("forgot-password")}">Reset your password</a> to get back in now.') + "</div>"
    submit = (f'<button class="btn btn--primary btn--lg btn--block auth__submit" type="submit" disabled aria-busy="true">{busy_label("Signing in…")}</button>'
              if busy else f'<button class="btn btn--primary btn--lg btn--block auth__submit" type="submit"{" disabled" if locked else ""}>Sign in</button>')
    return f"""    <form class="auth__form" action="{href("home")}" novalidate>
      <h1 class="display auth__title">Welcome back</h1>
      <p class="auth__lead">Sign in to see your events and messages.</p>
      {alert}
      <div class="auth__fields">
        {field("Email", "email", ME["email"], type_="email", autocomplete="email", readonly=busy)}
        <div>
          {field("Password", "password", "abundantlife", type_="password", autocomplete="current-password", readonly=busy)}
          <p class="field__hint"><a class="text-link" href="{href("forgot-password")}">Forgot your password?</a></p>
        </div>
      </div>
      {submit}
      <p class="auth__alt">New here? <a href="{href("join")}">Create a profile</a></p>
    </form>"""


s = screen("sign-in", "page", "Sign in", route="/sign-in", group="Public",
           source="Derived: the prototype's Sign in links go straight to Home; this screen uses the Join layout.",
           not_applicable={"loading": "Static form.", "empty": "A form, not a collection."})


@s("default", "Member sign in with email and password, a reset link and a way to join.")
def _():
    return auth(signin_form())


@s("invalid", "Wrong email or password: one generic message above the form (focused) that names neither field.")
def _():
    return auth(signin_form(invalid=True).replace('tabindex="-1"', 'tabindex="-1" autofocus', 1))


@s("submitting", "Sign in pressed: button busy, fields read-only.")
def _():
    return auth(signin_form(busy=True))


@s("error", "Too many attempts: sign-in paused, with a reset link to get back in now.")
def _():
    return auth(signin_form(locked=True))


@s("failed", "The server failed or did not answer: a message above the form; what was typed stays.")
def _():
    return auth(signin_form(failed=True).replace('tabindex="-1"', 'tabindex="-1" autofocus', 1))


# --- Forgot password -----------------------------------------------------------
def forgot(*, invalid: bool = False, busy: bool = False, failed: bool = False) -> str:
    alert = ""
    if invalid:
        alert = '<div class="auth__alert">' + error_summary("Check your email address", [("Enter an email address like name@example.com", "f-email")]).replace('tabindex="-1"', 'tabindex="-1" autofocus') + "</div>"
    if failed:
        alert = '<div class="auth__alert">' + form_alert("We couldn't send the email", "Something went wrong on our side. Try again in a minute.") + "</div>"
    value = "grace.thompson@gmail" if invalid else ME["email"]
    submit = (f'<button class="btn btn--primary btn--lg btn--block auth__submit" type="submit" disabled aria-busy="true">{busy_label("Sending…")}</button>'
              if busy else '<button class="btn btn--primary btn--lg btn--block auth__submit" type="submit">Send reset link</button>')
    return auth(f"""    <form class="auth__form" action="success.html" novalidate>
      <h1 class="display auth__title">Reset your password</h1>
      <p class="auth__lead">Enter the email you joined with and we'll send a link to choose a new one.</p>
      {alert}
      <div class="auth__fields">
        {field("Email", "email", value, type_="email", autocomplete="email", error="Enter an email address like name@example.com" if invalid else "", readonly=busy)}
      </div>
      {submit}
      <p class="auth__alt"><a href="{href("sign-in")}">Back to sign in</a></p>
    </form>""")


s = screen("forgot-password", "page", "Forgot password", route="/forgot-password", group="Public",
           source="Derived from the Join layout.", not_applicable={"loading": "Static form.", "empty": "A form, not a collection."})


@s("default", "Ask for a password reset link by email.")
def _():
    return forgot()


@s("invalid", "The email is incomplete: summary and inline error.")
def _():
    return forgot(invalid=True)


@s("submitting", "Send reset link pressed: busy button.")
def _():
    return forgot(busy=True)


@s("success", "Link sent: says where it went, how long it lasts, and how to resend.")
def _():
    return auth(f"""    <div class="auth__form">
      <h1 class="display auth__title">Check your email</h1>
      <p class="auth__lead">If an account exists for <strong>{ME["email"]}</strong>, a reset link is on its way. It expires in 30 minutes.</p>
      <a class="btn btn--secondary btn--lg btn--block auth__submit" href="{href("sign-in")}">Back to sign in</a>
      <p class="auth__alt">Didn't get it? Check your spam folder or <button class="auth__alt-action" type="button" data-mock-href="submitting.html">send it again</button>.</p>
    </div>""")


@s("error", "Sending failed: message above the form; the email stays filled in.")
def _():
    return forgot(failed=True)


# --- Reset password -----------------------------------------------------------
def reset(*, invalid: bool = False, busy: bool = False) -> str:
    alert = ('<div class="auth__alert">' + error_summary("Your passwords don't match", [("Type the same password in both fields", "f-confirm")]).replace('tabindex="-1"', 'tabindex="-1" autofocus') + "</div>") if invalid else ""
    submit = (f'<button class="btn btn--primary btn--lg btn--block auth__submit" type="submit" disabled aria-busy="true">{busy_label("Saving…")}</button>'
              if busy else '<button class="btn btn--primary btn--lg btn--block auth__submit" type="submit">Save password</button>')
    return auth(f"""    <form class="auth__form" action="success.html" novalidate>
      <h1 class="display auth__title">Choose a new password</h1>
      <p class="auth__lead">For {ME["email"]}.</p>
      {alert}
      <div class="auth__fields">
        {field("New password", "password", "graceandgrit", type_="password", autocomplete="new-password", hint="At least 8 characters", readonly=busy)}
        {field("Confirm new password", "confirm", "graceandgrt", type_="password", autocomplete="new-password", error="Type the same password in both fields" if invalid else "", readonly=busy)}
      </div>
      {submit}
    </form>""")


s = screen("reset-password", "page", "Reset password", route="/reset-password", group="Public",
           source="Derived from the Join layout.", not_applicable={"loading": "Static form.", "empty": "A form, not a collection."})


@s("default", "Choose and confirm a new password from the emailed link.")
def _():
    return reset()


@s("invalid", "Passwords don't match: summary and inline error on the confirm field.")
def _():
    return reset(invalid=True)


@s("submitting", "Save password pressed: busy button.")
def _():
    return reset(busy=True)


@s("success", "Password saved: one clear next step.")
def _():
    return auth(f"""    <div class="auth__form">
      <h1 class="display auth__title">Password saved</h1>
      <p class="auth__lead">You can sign in with your new password now. We've signed you out on your other devices.</p>
      <a class="btn btn--primary btn--lg btn--block auth__submit" href="{href("sign-in")}">Sign in</a>
    </div>""")


@s("error", "The link has expired: explains and offers a new one.")
def _():
    return auth(f"""    <div class="auth__form">
      <h1 class="display auth__title">This link has expired</h1>
      <p class="auth__lead">Reset links last 30 minutes, and each one works once. Ask for a new one and use it right away.</p>
      <a class="btn btn--primary btn--lg btn--block auth__submit" href="{href("forgot-password")}">Send a new link</a>
      <p class="auth__alt"><a href="{href("sign-in")}">Back to sign in</a></p>
    </div>""")


# ===========================================================================
# Home
# ===========================================================================
def home_rows(events) -> str:
    out = []
    for e in events:
        end = ('<span class="event-row__end event-row__end--going">Going</span>' if e["registered"]
               else f'<span class="event-row__end">{e["price"]}</span>')
        out.append(f"""<li><a class="event-row" href="{ev_link(e)}">
              <div class="event-row__date"><p class="event-row__month">{e["month"]}</p><p class="event-row__day">{e["day"]}</p></div>
              <div class="event-row__body"><p class="event-row__title">{e["title"]}</p><p class="event-row__meta">{e["weekday"]} {e["time"]} · {e["area"]}</p></div>
              {end}
            </a></li>""")
    return f'<ul class="list-ruled mt-3">{"".join(out)}</ul>'


def mini_conversations(convs) -> str:
    items = []
    for c in convs:
        unread = c["unread"] > 0
        dot = f'<span class="unread-dot" role="img" aria-label="{c["unread"]} unread"></span>' if unread else ""
        items.append(f"""<li><a class="mini-row" href="{conv_link(c)}">
                {avatar(c["initials"], group=c.get("group", False))}
                <div class="mini-row__body">
                  <p class="mini-row__top"><span class="mini-row__name{' mini-row__name--unread' if unread else ''}">{c["name"]}</span><span class="mini-row__time">{c["time"]}</span></p>
                  <p class="mini-row__text{' mini-row__text--unread' if unread else ''}">{c["last"]}</p>
                </div>{dot}
              </a></li>""")
    return f'<ul class="mini-list">{"".join(items)}</ul>'


def mini_pros() -> str:
    items = "".join(f"""<li><a class="mini-row" href="{svc_link(sv)}">
                {service_avatar(sv)}
                <div class="mini-row__body"><p class="mini-row__name">{sv["name"]}</p><p class="mini-row__text">{sv["role"]} · {sv["where"]}</p></div>
              </a></li>""" for sv in SERVICES[:3])
    return f'<ul class="mini-list">{items}</ul>'


def next_event_card() -> str:
    e = EV["sunrise-5k"]
    return f"""<article class="next-event" aria-labelledby="next-title">
            <a class="next-event__media" href="{href("event-detail")}" aria-label="{e["title"]} details">
              {image(e["image"], "next-event__image")}
              <span class="next-event__pill">You're going · in 3 days</span>
            </a>
            <div class="next-event__body">
              <div class="next-event__info">
                <p class="next-event__when">{e["weekday"]}, {e["month"]} {e["day"]} · {e["time"]}</p>
                <h2 class="display next-event__title" id="next-title">{e["title"]}</h2>
                <p class="place">{icon("map-pin")}<span>{e["place"]}</span></p>
              </div>
              <div class="btn-row">
                <a class="btn btn--secondary btn--sm" href="{href("messages")}">{icon("message-circle")}Group chat</a>
                <a class="btn btn--primary btn--sm" href="{href("event-detail")}">Details</a>
              </div>
            </div>
          </article>"""


def home(*, greeting: str = "Good morning, Grace", next_card: str | None = None, rows: str | None = None,
         messages: str | None = None, pros: str | None = None) -> str:
    rest = [e for e in EVENTS if e["id"] != "sunrise-5k"]
    return f"""    <div class="container page">
      <h1 class="display page-title--greeting">{greeting}</h1>
      <div class="split split--home">
        <div>
          {next_card if next_card is not None else next_event_card()}
          <div class="section-head mt-section">
            <h2 class="display section-title">Coming up</h2>
            <a class="text-link" href="{href("events")}">All events {icon("arrow-right")}</a>
          </div>
          {rows if rows is not None else home_rows(rest)}
        </div>
        <aside class="aside-stack" aria-label="Messages and professionals">
          <section aria-labelledby="home-messages">
            <div class="section-head">
              <h2 class="display section-title" id="home-messages">Messages</h2>
              <a class="text-link" href="{href("messages")}">Open</a>
            </div>
            {messages if messages is not None else mini_conversations(CONVERSATIONS[:3])}
          </section>
          <section class="divided-section" aria-labelledby="home-pros">
            <div class="section-head">
              <h2 class="display section-title" id="home-pros">New professionals</h2>
              <a class="text-link" href="{href("services")}">Browse</a>
            </div>
            {pros if pros is not None else mini_pros()}
          </section>
        </aside>
      </div>
    </div>"""


def sk_rows(n: int, *, end: bool = True) -> str:
    row = ('<li class="event-row"><span class="skeleton skeleton--date"></span><div class="event-row__body skeleton-stack">'
           '<span class="skeleton skeleton--text w-55"></span><span class="skeleton skeleton--text-sm w-40"></span></div>'
           + ('<span class="skeleton skeleton--text-sm"></span>' if end else "") + '</li>')
    return f'<ul class="list-ruled mt-3">{row * n}</ul>'


def sk_mini(n: int, square: bool = False) -> str:
    row = (f'<li class="mini-row"><span class="skeleton skeleton--avatar{" skeleton--square" if square else ""}"></span>'
           '<div class="mini-row__body skeleton-stack"><span class="skeleton skeleton--text w-55"></span><span class="skeleton skeleton--text-sm w-90"></span></div></li>')
    return f'<ul class="mini-list">{row * n}</ul>'


s = screen("home", "page", "Home", route="/home", source=SRC + "Home (crjWXYxkk9Vzfuqk7tYafn)")


@s("default", "Signed-in home: Grace's next event, more coming up, recent messages and new professionals.")
def _():
    return member_shell("home", home())


@s("loading", "Home while it loads: the greeting is known; every section shows layout-matching skeletons.")
def _():
    card = ('<div class="next-event"><span class="skeleton skeleton--block skeleton--image-16x8"></span>'
            '<div class="next-event__body"><div class="next-event__info skeleton-stack u-grow">'
            '<span class="skeleton skeleton--text-sm w-40"></span><span class="skeleton skeleton--title-lg"></span>'
            '<span class="skeleton skeleton--text w-55"></span></div><div class="btn-row"><span class="skeleton skeleton--button"></span>'
            '<span class="skeleton skeleton--button skeleton--button-sm"></span></div></div></div>')
    content = home(next_card=card, rows=sk_rows(3), messages=sk_mini(3, True), pros=sk_mini(3))
    return member_shell("home", loading_region("Loading your home page", content))


@s("empty", "A new member with no registrations or messages yet: each personal section says what to do next.")
def _():
    card = f"""<div class="empty-card">
            <h2 class="display empty-card__title">No events yet</h2>
            <p class="empty-card__text">Find a run, workout or gathering near you. Your next one will show here, with its group chat one tap away.</p>
            <div class="empty-card__actions"><a class="btn btn--primary btn--sm" href="{href("events")}">Browse events</a></div>
          </div>"""
    rows = home_rows([dict(e, registered=False) for e in EVENTS[:3]])
    msgs = '<div class="empty-inline"><p class="empty-inline__text">No messages yet. Register for an event and you\'ll join its group chat.</p></div>'
    return member_shell("home", home(greeting="Welcome, Grace", next_card=card, rows=rows, messages=msgs), unread=0)


@s("error", "Home failed to load: the shell and greeting stay; a retry and a way to the events list.")
def _():
    content = f"""    <div class="container page">
      <h1 class="display page-title--greeting">Good morning, Grace</h1>
      {error_block("Your home page didn't load", "We couldn't reach Christian Fitness. Check your connection and try again.", retry="default.html", back=("Browse events", href("events")), ref="CF-H7Q2")}
    </div>"""
    return member_shell("home", content, unread=0)


@s("partial", "Messages failed to load while everything else worked: the section offers a retry in place.")
def _():
    msgs = f"""<div class="inline-error" role="alert">{icon("alert-circle")}<div class="inline-error__body">
              <p class="inline-error__title">Messages didn't load.</p><p>Your events are up to date.</p>
              <button type="button" data-mock-href="default.html">Try again</button></div></div>"""
    return member_shell("home", home(messages=msgs), unread=0)


@s("offline", "No connection: cached home with an offline banner; chat is unavailable until reconnected.")
def _():
    b = banner("warning", "wifi-off", "<strong>You're offline.</strong> Showing what was saved at 8:42 AM. We'll refresh when you're back.", dismiss=False)
    return member_shell("home", home(), banner=b)


# ===========================================================================
# Events
# ===========================================================================
def chip_bar(active: str, going: bool, links: dict | None = None) -> str:
    links = links or {}
    chips = "".join(
        f'<a class="chip" href="{links.get(c, "#")}"{CUR if c == active else ""}>{c}</a>'
        if links else f'<button class="chip" type="button" aria-pressed="{"true" if c == active else "false"}">{c}</button>'
        for c in EVENT_CATEGORIES)
    return f"""<div class="chip-bar" role="group" aria-label="Filter events">
          {chips}
          <span class="chip-bar__divider" aria-hidden="true"></span>
          <label class="check"><input class="check__box" type="checkbox"{" checked" if going else ""}> Only events I'm going to</label>
        </div>"""


CAT_LINKS = {"All": href("events"), "Run": href("events", "filtered"), "Workshop": href("events", "no-results"),
             "Workout": href("events", "filtered"), "Basketball": href("events", "filtered"), "Mobility": href("events", "filtered")}


def event_card(e: dict) -> str:
    left = e["capacity"] - e["going"]
    left_html = f'<span class="event-card__left"> · {left} spots left</span>' if left <= 10 else ""
    going = '<span class="going-pill">Going</span>' if e["registered"] else ""
    return f"""<li><a class="event-card" href="{ev_link(e)}">
            <div class="event-card__media">
              {image(e["image"], "event-card__image")}
              <div class="date-badge" aria-hidden="true"><span class="date-badge__month">{e["month"]}</span><span class="date-badge__day">{e["day"]}</span></div>
              {going}
            </div>
            <div class="event-card__body">
              <p class="event-card__meta">{e["category"]} · <span class="visually-hidden">{e["month"]} {e["day"]}, </span>{e["weekday"]} {e["time"]}</p>
              <h2 class="display event-card__title">{e["title"]}</h2>
              <p class="place place--sm">{icon("map-pin")}<span>{e["place"]}</span></p>
              <div class="event-card__spacer"></div>
              <div class="event-card__foot"><span class="event-card__going">{e["going"]} going{left_html}</span><span class="event-card__price">{e["price"]}</span></div>
            </div>
          </a></li>"""


def events_page(body: str, *, active: str = "All", going: bool = False, search: str = "") -> str:
    value = f' value="{search}"' if search else ""
    return f"""    <div class="container page">
      <div class="page-head">
        <div>
          <h1 class="display page-title">Events</h1>
          <p class="subtitle">Posted by the Christian Fitness team. Free unless marked.</p>
        </div>
        <form class="search" role="search">
          <label class="visually-hidden" for="event-search">Search events</label>
          {icon("search", "search__icon")}
          <input class="search__input" id="event-search" type="search" placeholder="Search events"{value}>
        </form>
      </div>
      {chip_bar(active, going, {k: v for k, v in CAT_LINKS.items()})}
{body}
    </div>"""


def grid(evts) -> str:
    return f'<ul class="event-grid">{"".join(event_card(e) for e in evts)}</ul>'


s = screen("events", "page", "Events", route="/events", source=SRC + "Events (uawpB3NVofSGDh6DhtRnY1)")


@s("default", "All upcoming events as cards with date, category, place, how many are going and price.")
def _():
    return member_shell("events", events_page(grid(EVENTS)))


@s("loading", "Events loading: four card skeletons in the same grid.")
def _():
    card = ('<li><div class="event-card"><span class="skeleton skeleton--block skeleton--image-16x9"></span><div class="event-card__body skeleton-stack">'
            '<span class="skeleton skeleton--text-sm w-40"></span><span class="skeleton skeleton--title"></span><span class="skeleton skeleton--text w-55"></span>'
            '<div class="event-card__spacer"></div><span class="skeleton skeleton--text-sm w-80"></span></div></div></li>')
    return member_shell("events", events_page(loading_region("Loading events", f'<ul class="event-grid">{card * 4}</ul>')))


@s("empty", "No events posted at all yet: explains the weekly rhythm and points home.")
def _():
    return member_shell("events", events_page(empty_block(
        "No events yet", "The team posts runs, workouts and gatherings every week. They'll show up here as soon as they're live.",
        f'<a class="btn btn--primary btn--sm" href="{href("home")}">Back to home</a>')))


@s("error", "Events failed to load: filters stay; retry in place.")
def _():
    return member_shell("events", events_page(error_block(
        "Events didn't load", "We couldn't reach Christian Fitness. Check your connection and try again.", retry="default.html", ref="CF-E3K9")))


@s("no-results", "Workshop filter with nothing posted: the prototype's \"Nothing here yet\" state, filters still visible.")
def _():
    return member_shell("events", events_page(empty_block(
        "Nothing here yet", "No workshop events right now. New ones are posted every week.",
        '<a class="btn btn--primary btn--sm" href="default.html">Show all events</a>', tag="p"), active="Workshop"))


@s("filtered", "Run filter: only the Easter Sunrise 5K.")
def _():
    return member_shell("events", events_page(grid([e for e in EVENTS if e["category"] == "Run"]), active="Run"))


@s("going", "\"Only events I'm going to\" ticked: Grace's two registrations.")
def _():
    return member_shell("events", events_page(grid([e for e in EVENTS if e["registered"]]), going=True))


# ===========================================================================
# Event detail
# ===========================================================================
def register_panel(e: dict, mode: str) -> str:
    """mode: registered | open | full | registering"""
    full = mode == "full"
    spots = "Waitlist open" if full else f'{e["capacity"] - e["going"]} of {e["capacity"]} spots left'
    if mode == "registered":
        action = f"""<div class="register__state">
                <p class="register__confirmed" role="status">{icon("check", "icon--lg")}You're registered</p>
                <div class="btn-grid mt-3">
                  <button class="btn btn--secondary btn--sm" type="button" data-mock-href="{href("toast", "info")}">{icon("calendar-plus")}Calendar</button>
                  <a class="btn btn--secondary btn--sm" href="{href("messages")}">{icon("message-circle")}Group chat</a>
                </div>
                <button class="btn btn--quiet mt-3" type="button" data-mock-href="{href("toast", "with-action")}">Can't make it</button>
              </div>"""
    else:
        label = {"open": "Register", "full": "Join the waitlist", "registering": busy_label("Registering…")}[mode]
        busy = ' disabled aria-busy="true"' if mode == "registering" else ""
        target = href("toast", "success") if mode == "open" else href("event-detail", "full")
        note_text = ("We'll message you if a spot opens up." if full else "You'll be added to the event's group chat.")
        action = f"""<div class="register__state">
                <button class="btn btn--primary btn--lg btn--block" type="button"{busy} data-mock-href="{target}">{label}</button>
                <p class="register__note">{note_text}</p>
              </div>"""
    going = e["going"]
    stack = "".join(avatar(i, size="sm") for i in ["MC", "DO", "PN", "AK", "JR"])
    return f"""<aside class="sticky-aside" aria-label="Registration">
            <div class="card card--pad-sm">
              <div class="register__head"><p class="register__price">{e["price"]}</p><p class="register__spots">{spots}</p></div>
              {action}
              <div class="register__going">
                <p class="register__count">{going} going</p>
                <div class="avatar-stack">{stack}<span class="avatar-stack__label">Michael, Danielle and {going - 2} others</span></div>
              </div>
            </div>
            <p class="posted-by">Posted by the Christian Fitness team</p>
          </aside>"""


def detail(e: dict, mode: str) -> str:
    schedule = ""
    if e["id"] == "sunrise-5k":
        items = "".join(f'<li><span class="schedule__time">{t}</span><span class="schedule__what">{w}</span></li>' for t, w in SCHEDULE)
        schedule = f"""<section class="block-section" aria-labelledby="schedule-title">
              <h2 class="display section-title" id="schedule-title">Schedule</h2>
              <ol class="schedule">{items}</ol>
            </section>"""
    return f"""    <div class="container page--detail">
      <a class="back-link" href="{href("events")}">{icon("arrow-left")} All events</a>
      {image(e["image"], "banner-image")}
      <div class="split split--detail">
        <div>
          <p class="eyebrow">{e["category"]}</p>
          <h1 class="display detail-title">{e["title"]}</h1>
          <dl class="facts">
            <div class="facts__item">{icon("clock", "facts__icon")}<div><dt>{e["weekday"]}, {e["month"]} {e["day"]}</dt><dd>{e["time"]} · about 90 minutes</dd></div></div>
            <div class="facts__item">{icon("map-pin", "facts__icon")}<div><dt>{e["place"]}</dt><dd>{e["area"]}, Toronto</dd></div></div>
          </dl>
          <section class="block-section" aria-labelledby="about-title">
            <h2 class="display section-title" id="about-title">About</h2>
            <p class="prose lead">{e["summary"]}</p>
            <p class="prose--muted">All paces welcome. Our volunteers will be wearing Bordeaux shirts at the meeting point. If you need to cancel, please do so 24 hours ahead so someone on the waitlist can take your place.</p>
          </section>
          {schedule}
        </div>
        {register_panel(e, mode)}
      </div>
    </div>"""


s = screen("event-detail", "page", "Event detail", route="/events/:id", source=SRC + "Event Detail (bMot5Cj5p1yCN4wNfWDvdc)",
           not_applicable={"empty": "One event, not a collection; a missing event is the not-found page."})


@s("default", "Easter Sunrise 5K, which Grace is registered for: confirmation, calendar, group chat and \"Can't make it\".")
def _():
    return member_shell("events", detail(EV["sunrise-5k"], "registered"))


@s("unregistered", "Saturday Park Bootcamp, not registered yet: one primary Register button.")
def _():
    return member_shell("events", detail(EV["park-bootcamp"], "open"))


@s("registering", "Register pressed: button busy until the spot is confirmed.")
def _():
    return member_shell("events", detail(EV["park-bootcamp"], "registering") + note(
        "The panel swaps to \"You're registered\" with a 180 ms fade and 4 px rise (none under reduced motion), then the success toast appears.",
        "top: 30rem; right: 1rem;"))


@s("full", "Saturday Park Bootcamp at capacity (50 of 50): waitlist open, Join the waitlist.")
def _():
    return member_shell("events", detail(dict(EV["park-bootcamp"], going=50), "full"))


@s("loading", "Event detail loading: banner, title, facts and registration panel as skeletons.")
def _():
    body = f"""    <div class="container page--detail">
      <a class="back-link" href="{href("events")}">{icon("arrow-left")} All events</a>
      <span class="skeleton skeleton--image-banner"></span>
      <div class="split split--detail">
        <div class="skeleton-stack">
          <span class="skeleton skeleton--text-sm w-20"></span>
          <h1 class="visually-hidden">Loading event</h1>
          <span class="skeleton skeleton--title-lg"></span>
          <span class="skeleton skeleton--title w-40"></span>
          <div class="facts"><span class="skeleton skeleton--text w-80"></span><span class="skeleton skeleton--text w-80"></span></div>
          <div class="block-section skeleton-stack"><span class="skeleton skeleton--text w-90"></span><span class="skeleton skeleton--text w-80"></span><span class="skeleton skeleton--text w-55"></span></div>
        </div>
        <div class="card card--pad-sm skeleton-stack sticky-aside"><span class="skeleton skeleton--title w-30"></span><span class="skeleton skeleton--button-block"></span><span class="skeleton skeleton--text-sm w-80"></span></div>
      </div>
    </div>"""
    return member_shell("events", loading_region("Loading event", body))


@s("error", "Event failed to load: back link stays; retry or return to all events.")
def _():
    body = f"""    <div class="container page--detail">
      <a class="back-link" href="{href("events")}">{icon("arrow-left")} All events</a>
      <h1 class="visually-hidden">Event</h1>
      {error_block("This event didn't load", "We couldn't reach Christian Fitness. Your registration, if you have one, is safe.", retry="default.html", back=("All events", href("events")), ref="CF-D4M1")}
    </div>"""
    return member_shell("events", body)


# ===========================================================================
# Services
# ===========================================================================
def svc_chips(active: str) -> str:
    links = {"All": href("services"), "Nutrition": href("services", "filtered")}
    chips = "".join(f'<a class="chip" href="{links.get(c, href("services", "filtered"))}"{CUR if c == active else ""}>{c}</a>'
                    for c in SERVICE_CATEGORIES)
    return f'<div class="chip-bar" role="group" aria-label="Filter professionals">{chips}</div>'


def svc_list(items, current: str) -> str:
    rows = "".join(f"""<li><a class="service-row" href="{svc_link(sv)}"{' aria-current="true"' if sv["id"] == current else ''}>
              {service_avatar(sv, "xl")}
              <div class="mini-row__body"><p class="mini-row__name">{sv["name"]}</p><p class="mini-row__text">{sv["role"]} · {sv["where"]}</p></div>
              <span class="service-row__price">{sv["price"]}</span>
            </a></li>""" for sv in items)
    return f'<ul class="card card--list" aria-label="Professionals">{rows}</ul>'


def svc_detail(sv: dict) -> str:
    av = image(sv["image"], "avatar avatar--2xl avatar--photo-square") if sv.get("image") else avatar(sv["initials"], size="2xl")
    return f"""<article class="card card--pad sticky-aside" aria-labelledby="svc-name">
            <div class="service-detail__head">
              {av}
              <div class="mini-row__body">
                <p class="eyebrow">{sv["role"]}</p>
                <h2 class="display service-detail__name" id="svc-name">{sv["name"]}</h2>
                <p class="service-detail__where">{icon("map-pin")} {sv["where"]}</p>
              </div>
            </div>
            <p class="lead service-detail__about">{sv["about"]}</p>
            <dl class="spec-list">
              <div><dt>Credentials</dt><dd>{sv["credentials"]}</dd></div>
              <div><dt>Rate</dt><dd>{sv["price"]}</dd></div>
            </dl>
            <p class="verified">{icon("badge-check")} Verified by Christian Fitness, March 2026</p>
            <div class="actions-split">
              <button class="btn btn--primary btn--md btn--grow" type="button" data-mock-href="{href("request-booking")}">Request a booking</button>
              <a class="btn btn--secondary btn--md btn--grow" href="{href("messages", "direct")}">Message</a>
            </div>
          </article>"""


def services_page(body: str, active: str = "All") -> str:
    return f"""    <div class="container page">
      <h1 class="display page-title">Services</h1>
      <p class="subtitle subtitle--narrow">Christian professionals, each one checked and listed by our team.</p>
      {svc_chips(active)}
{body}
    </div>"""


s = screen("services", "page", "Services", route="/services", source=SRC + "Services (ahxe4g3aviYzxvXrWbnCHB)")


@s("default", "All five vetted professionals; Danielle Okafor selected with her details, rate and booking actions.")
def _():
    return member_shell("services", services_page(f'<div class="split split--services">{svc_list(SERVICES, "okafor")}{svc_detail(SV["okafor"])}</div>'))


@s("selected", "Marcus Lee, RD selected from the full list.")
def _():
    return member_shell("services", services_page(f'<div class="split split--services">{svc_list(SERVICES, "lee")}{svc_detail(SV["lee"])}</div>'))


@s("filtered", "Nutrition filter: one professional, selected.")
def _():
    items = [x for x in SERVICES if x["category"] == "Nutrition"]
    return member_shell("services", services_page(f'<div class="split split--services">{svc_list(items, "lee")}{svc_detail(SV["lee"])}</div>', "Nutrition"))


@s("loading", "Services loading: list rows and the detail card as skeletons.")
def _():
    row = ('<li class="service-row"><span class="skeleton skeleton--avatar-xl"></span><div class="mini-row__body skeleton-stack">'
           '<span class="skeleton skeleton--text w-55"></span><span class="skeleton skeleton--text-sm w-80"></span></div></li>')
    det = ('<div class="card card--pad skeleton-stack sticky-aside"><div class="service-detail__head"><span class="skeleton skeleton--avatar-2xl"></span>'
           '<div class="mini-row__body skeleton-stack"><span class="skeleton skeleton--text-sm w-40"></span><span class="skeleton skeleton--title"></span></div></div>'
           '<span class="skeleton skeleton--text w-90"></span><span class="skeleton skeleton--text w-80"></span><span class="skeleton skeleton--button-block"></span></div>')
    return member_shell("services", services_page(loading_region("Loading professionals", f'<div class="split split--services"><ul class="card card--list">{row * 5}</ul>{det}</div>')))


@s("empty", "No professionals listed yet: explains vetting and points to events.")
def _():
    return member_shell("services", services_page(empty_block(
        "No professionals yet", "Every trainer, dietitian, physio and counsellor is checked by our team before they're listed. The first ones are on their way.",
        f'<a class="btn btn--primary btn--sm" href="{href("events")}">Browse events</a>')))


@s("error", "Services failed to load: retry in place.")
def _():
    return member_shell("services", services_page(error_block(
        "Professionals didn't load", "We couldn't reach Christian Fitness. Check your connection and try again.", retry="default.html", ref="CF-S8N2")))


# ===========================================================================
# Messages
# ===========================================================================
def conv_list(active: str | None, *, shown: bool, items=None) -> str:
    items = CONVERSATIONS if items is None else items
    rows = []
    for c in items:
        on = c["id"] == active
        unread = c["unread"] > 0
        pill = f'<span class="count-pill" aria-label="{c["unread"]} unread">{c["unread"]}</span>' if unread and not on else ""
        rows.append(f"""<li><a class="conversation" href="{conv_link(c)}"{' aria-current="true"' if on else ''}>
                {avatar(c["initials"], group=c.get("group", False))}
                <div class="mini-row__body">
                  <p class="mini-row__top"><span class="mini-row__name{' mini-row__name--unread' if unread else ''}">{c["name"]}</span><span class="mini-row__time">{c["time"]}</span></p>
                  <p class="mini-row__text{' mini-row__text--unread' if unread else ''}">{c["last"]}</p>
                </div>{pill}
              </a></li>""")
    return f"""<aside class="inbox__list{' inbox__list--shown' if shown else ''}" aria-labelledby="inbox-title">
          <h1 class="display inbox__title" id="inbox-title">Messages</h1>
          <ul class="inbox__items">{''.join(rows)}</ul>
        </aside>"""


def thread(c: dict, *, shown: bool, extra=(), draft: str = "", failed: bool = False) -> str:
    sub = (f'{c["members"]} members · Event group' if c.get("group") else "Personal trainer" if c["id"] == "okafor" else "Member")
    msgs = list(c["messages"]) + list(extra)
    items = ['<li class="thread__day">Today</li>']
    for i, (who, author, text, time) in enumerate(msgs):
        mine = who == "me"
        last_failed = failed and i == len(msgs) - 1
        auth = f'<p class="message__author">{author}</p>' if author and c.get("group") else ""
        foot = (f'<p class="message__error" role="alert">{icon("alert-circle", "icon--xs")}Not sent. <button type="button" data-mock-href="default.html">Try again</button></p>'
                if last_failed else f'<p class="message__time">{time}</p>')
        items.append(f"""<li class="message{' message--mine' if mine else ''}{' message--failed' if last_failed else ''}"><div class="message__wrap">{auth}
              <p class="message__bubble">{text}</p>{foot}</div></li>""")
    value = f' value="{draft}"' if draft else ""
    disabled = "" if draft else " disabled"
    return f"""<section class="thread{' thread--shown' if shown else ''}" aria-label="Conversation with {c["name"]}">
          <header class="thread__head">
            <a class="icon-button icon-button--sm thread__back" href="list.html" aria-label="Back to conversations">{icon("arrow-left", "icon--lg")}</a>
            {avatar(c["initials"], group=c.get("group", False), size="md")}
            <div class="mini-row__body"><p class="thread__name">{c["name"]}</p><p class="thread__sub">{sub}</p></div>
          </header>
          <ol class="thread__messages" aria-live="polite" data-scroll-end>{''.join(items)}</ol>
          <form class="composer">
            <label class="visually-hidden" for="composer">Message {c["name"]}</label>
            <input class="composer__input" id="composer" placeholder="Message {c["name"]}" autocomplete="off"{value}>
            <button class="composer__send" type="submit" aria-label="Send"{disabled}>{icon("send", "icon--lg")}</button>
          </form>
        </section>"""


def inbox(inner: str) -> str:
    return f"""    <div class="inbox">
      <div class="inbox__panel">
        {inner}
      </div>
    </div>"""


s = screen("messages", "page", "Messages", route="/messages", source=SRC + "Messages (4oNENb1MqEPprMu7oidNUV)")
NEW_MSG = ("me", None, "Yes! I'll bring my Bluetooth speaker.", "Now")


@s("default", "Sunrise 5K Crew group chat open; on phones the thread fills the screen with a back button.")
def _():
    return member_shell("messages", inbox(conv_list("sunrise-crew", shown=False) + thread(CV["sunrise-crew"], shown=True)), fill=True)


@s("list", "Conversation list as phones show it after Back; on desktop it matches default.")
def _():
    return member_shell("messages", inbox(conv_list("sunrise-crew", shown=True) + thread(CV["sunrise-crew"], shown=False)), fill=True)


@s("direct", "A one-to-one conversation with Danielle Okafor, personal trainer.")
def _():
    return member_shell("messages", inbox(conv_list("okafor", shown=False) + thread(CV["okafor"], shown=True)), fill=True)


@s("draft", "A message typed and ready: Send is enabled.")
def _():
    return member_shell("messages", inbox(conv_list("sunrise-crew", shown=False) + thread(CV["sunrise-crew"], shown=True, draft=NEW_MSG[2])), fill=True) + note(
        "Enter sends. The message appears at once with \"Sending…\"; the composer clears and keeps focus.", "bottom: 6rem; right: 1rem;")


@s("send-failed", "The last message didn't send: it stays in the thread, marked, with Try again.")
def _():
    return member_shell("messages", inbox(conv_list("sunrise-crew", shown=False) + thread(CV["sunrise-crew"], shown=True, extra=[NEW_MSG], failed=True)), fill=True)


@s("loading", "Messages loading: conversation rows and bubbles as skeletons.")
def _():
    row = ('<li class="conversation"><span class="skeleton skeleton--avatar"></span><div class="mini-row__body skeleton-stack">'
           '<span class="skeleton skeleton--text w-55"></span><span class="skeleton skeleton--text-sm w-90"></span></div></li>')
    lst = f'<aside class="inbox__list inbox__list--shown" aria-labelledby="inbox-title"><h1 class="display inbox__title" id="inbox-title">Messages</h1><ul class="inbox__items">{row * 4}</ul></aside>'
    th = ('<section class="thread" aria-label="Loading conversation"><div class="thread__head"><span class="skeleton skeleton--avatar"></span>'
          '<div class="mini-row__body skeleton-stack"><span class="skeleton skeleton--text w-40"></span><span class="skeleton skeleton--text-sm w-55"></span></div></div>'
          '<ol class="thread__messages" data-scroll-end><li class="message"><span class="skeleton skeleton--bubble"></span></li><li class="message"><span class="skeleton skeleton--bubble"></span></li>'
          '<li class="message message--mine"><span class="skeleton skeleton--bubble skeleton--bubble-short"></span></li></ol></section>')
    return member_shell("messages", loading_region("Loading messages", inbox(lst + th)), fill=True)


@s("empty", "No conversations yet: explains where chats come from and points to events.")
def _():
    body = f"""<div class="inbox__list inbox__list--shown inbox__list--full">
          <div class="inbox__notice">
            {empty_block("No messages yet", "Register for an event and you'll join its group chat. You can also message a professional from Services.", f'<a class="btn btn--primary btn--sm" href="{href("events")}">Browse events</a>', tag="h1", tight=True)}
          </div>
        </div>"""
    return member_shell("messages", inbox(body), fill=True, unread=0)


@s("error", "Messages failed to load: retry in place; the rest of the app still works.")
def _():
    body = f"""<div class="inbox__list inbox__list--shown inbox__list--full">
          <div class="inbox__notice">
            <h1 class="display inbox__title inbox__title--flush">Messages</h1>
            {error_block("Messages didn't load", "We couldn't reach the chat service. New messages are safe and will appear when you're reconnected.", retry="default.html", ref="CF-M2X7")}
          </div>
        </div>"""
    return member_shell("messages", inbox(body), fill=True, unread=0)


# ===========================================================================
# Profile
# ===========================================================================
def profile(p: dict, *, self_view: bool, going=None, groups=None, empty: bool = False) -> str:
    going = [e for e in EVENTS if e["registered"]] if going is None else going
    groups = [c for c in CONVERSATIONS if c.get("group")] if groups is None else groups
    if self_view:
        action = f'<button class="btn btn--secondary profile-hero__action" type="button" data-mock-href="{href("edit-profile")}">{icon("pencil")} Edit profile</button>'
    else:
        action = f'<a class="btn btn--primary btn--wide profile-hero__action" href="{href("messages")}">Message</a>'
    if empty:
        about = f"""<div class="empty-inline"><p class="empty-inline__text">Add a short bio so people at events know who you are.</p>
            <p class="empty-inline__action"><button class="text-link" type="button" data-mock-href="{href("edit-profile")}">Add a bio</button></p></div>"""
        goals = '<div class="empty-inline"><p class="empty-inline__text">What are you working toward this year? Goals you add show here.</p></div>'
        tags = '<div class="empty-inline"><p class="empty-inline__text">No interests yet.</p></div>'
    else:
        about = f'<p class="prose lead">{p["bio"]}</p>'
        goals = f'<ul class="goals">{"".join(f"<li>{g}</li>" for g in p["goals"])}</ul>'
        tags = '<div class="tag-list">' + "".join(f'<span class="tag">{i}</span>' for i in p["interests"]) + '</div>'
    if going:
        going_html = '<ul class="going-list">' + "".join(f"""<li><a class="going-item" href="{ev_link(e)}">
                  {image(e["image"], "going-item__image")}
                  <div class="mini-row__body"><p class="going-item__date">{e["weekday"]}, {e["month"]} {e["day"]}</p><p class="mini-row__name">{e["title"]}</p></div>
                </a></li>""" for e in going) + "</ul>"
    else:
        going_html = f'<div class="empty-inline"><p class="empty-inline__text">Not going to anything yet.</p><p class="empty-inline__action"><a class="text-link" href="{href("events")}">Browse events {icon("arrow-right")}</a></p></div>'
    if groups:
        groups_html = '<ul class="mini-list">' + "".join(f"""<li><a class="mini-row" href="{conv_link(c)}">
                  {avatar(c["initials"], group=True, size="md")}
                  <span class="mini-row__name u-grow">{c["name"]}</span><span class="mini-row__end">{c["members"]} members</span>
                </a></li>""" for c in groups) + "</ul>"
    else:
        groups_html = '<div class="empty-inline"><p class="empty-inline__text">Event group chats you join show here.</p></div>'
    church = f'<span>{icon("church")}{p["church"]}</span>' if p.get("church") else ""
    return f"""    <section class="profile-hero">
      <div class="profile-hero__inner">
        <span class="profile-hero__avatar" aria-hidden="true">{p["initials"]}</span>
        <div class="profile-hero__body">
          <h1 class="display page-title">{p["name"]}</h1>
          <p class="profile-hero__meta">{p["handle"]} · {p["joined"]}</p>
          <div class="profile-hero__facts">{church}<span>{icon("map-pin")}{p["city"]}</span></div>
        </div>
        {action}
      </div>
    </section>
    <div class="container page">
      <div class="split split--profile split--flush">
        <div>
          <h2 class="display section-title">About</h2>
          {about}
          <h2 class="display section-title mt-section">Goals this year</h2>
          {goals}
          <h2 class="display section-title mt-section">Into</h2>
          {tags}
        </div>
        <aside class="aside-stack" aria-label="Events and groups">
          <section aria-labelledby="going-title"><h2 class="display section-title" id="going-title">Going to</h2>{going_html}</section>
          <section aria-labelledby="groups-title"><h2 class="display section-title" id="groups-title">Groups</h2>{groups_html}</section>
        </aside>
      </div>
    </div>"""


s = screen("profile", "page", "Profile", route="/profile", source=SRC + "Profile (mcTAGhbYY6BhJ9YfwMksWP)")


@s("default", "Grace's own profile: bio, goals, interests, events she's going to and her groups, with Edit profile.")
def _():
    return member_shell("profile", profile(ME, self_view=True))


@s("member", "Another member's profile (Michael Chen) at /members/:id: Message replaces Edit profile.")
def _():
    return member_shell("profile", profile(MICHAEL, self_view=False, going=[EV["sunrise-5k"]], groups=[CV["sunrise-crew"]]))


@s("loading", "Profile loading: header and sections as skeletons.")
def _():
    body = """    <section class="profile-hero"><div class="profile-hero__inner"><span class="skeleton skeleton--avatar-profile"></span>
      <div class="profile-hero__body skeleton-stack"><h1 class="visually-hidden">Loading profile</h1><span class="skeleton skeleton--title-lg w-50"></span><span class="skeleton skeleton--text w-40"></span><span class="skeleton skeleton--text w-55"></span></div></div></section>
    <div class="container page"><div class="split split--profile split--flush">
      <div class="skeleton-stack"><span class="skeleton skeleton--title w-20"></span><span class="skeleton skeleton--text w-90"></span><span class="skeleton skeleton--text w-80"></span></div>
      <div class="skeleton-stack"><span class="skeleton skeleton--title w-30"></span><span class="skeleton skeleton--tile"></span><span class="skeleton skeleton--tile"></span></div>
    </div></div>"""
    return member_shell("profile", loading_region("Loading profile", body))


@s("empty", "A brand-new profile: each empty section says what goes there; Edit profile is the one action.")
def _():
    p = dict(ME, church="", joined="Member since today")
    return member_shell("profile", profile(p, self_view=True, going=[], groups=[], empty=True), unread=0)


@s("error", "Profile failed to load: retry in place.")
def _():
    body = f"""    <div class="container page">
      <h1 class="display page-title">Profile</h1>
      {error_block("Your profile didn't load", "We couldn't reach Christian Fitness. Check your connection and try again.", retry="default.html", back=("Back to home", href("home")), ref="CF-P5R3")}
    </div>"""
    return member_shell("profile", body, unread=0)


# ===========================================================================
# System pages
# ===========================================================================
def system(code: str, title: str, text: str, actions: str, *, ic: str, container: bool = True) -> str:
    block = f"""      <div class="empty-state empty-state--system">
        <p class="system__code" aria-hidden="true">{code}</p>
        <h1 class="display page-title system__title" tabindex="-1">{title}</h1>
        <p class="empty-state__text">{text}</p>
        <div class="empty-state__actions">{actions}</div>
      </div>"""
    # The admin shell's page area already pads the content; the member shell needs the container.
    return f"""    <div class="container page">
{block}
    </div>""" if container else block


# The server-error reference: CF- and the first eight hex digits of the request's trace id (L2-043 AC3).
REFERENCE = "CF-4BF92F35"
SERVER_ERROR_TEXT = "That's on us, not you, and we've been notified. Try again in a moment."


def server_error_text(reference: str | None) -> str:
    return SERVER_ERROR_TEXT + (f" If it keeps happening, quote reference {reference}." if reference else "")


NA_SYSTEM = {"loading": "A system page renders without loading data.", "empty": "Not a collection.", "error": "This page is itself the error state."}

s = screen("not-found", "page", "Page not found", route="/**", group="System", source="Derived: system page in the member shell.", not_applicable=NA_SYSTEM)


@s("default", "404: the link is old or the page moved; ways home and to events.")
def _():
    return member_shell("", system("404", "Page not found", "That link may be old, or the page has moved. Everything else is right where you left it.",
                                   f'<a class="btn btn--primary btn--sm" href="{href("home")}">Go to home</a><a class="btn btn--secondary btn--sm" href="{href("events")}">Browse events</a>', ic="compass"))


s = screen("server-error", "page", "Something went wrong", route="(any, on a 500)", group="System", source="Derived: system page in the member shell.", not_applicable=NA_SYSTEM)


def member_server_error(reference: str | None) -> str:
    # Try again is a link: it loads the URL that failed again from the server (L2-043 AC6).
    return member_shell("", system("500", "Something went wrong", server_error_text(reference),
                                   f'<a class="btn btn--primary btn--sm" href="{href("home")}">{icon("rotate-cw")}Try again</a><a class="btn btn--secondary btn--sm" href="{href("home")}">Go to home</a>', ic="alert-circle"))


@s("default", "500: our fault, we've been told, try again; with a reference code for support.")
def _():
    return member_server_error(REFERENCE)


@s("no-reference", "500 without a reference (the response carried none): the same page without the reference sentence.")
def _():
    return member_server_error(None)


s = screen("offline", "page", "Offline", route="(any, no connection and nothing cached)", group="System", source="Derived: system page in the member shell.", not_applicable=NA_SYSTEM)


@s("default", "No connection and nothing saved to show: what still works and a retry.")
def _():
    return member_shell("", system("Offline", "You're offline", "Check your Wi-Fi or data. Messages you write and registrations you make will send when you're back online.",
                                   f'<button class="btn btn--primary btn--sm" type="button" data-mock-href="{href("home")}">{icon("rotate-cw")}Try again</button>', ic="wifi-off"),
                        unread=0)
