"""Public pages around the news: Subscribe (newsletter and RSS), the newsletter's web version, and Google's
account chooser, which is Google's page and is drawn only so the sign-in flows can be clicked through.
Layout and copy follow the Magic Patterns prototype frames Subscribe, Newsletter and Google Account Chooser."""
from __future__ import annotations

from urllib.parse import quote

from cf_data import FEEDS, GOOGLE_MEMBER, GOOGLE_STAFF, MEMBER_EVENTS, NEWSLETTER, ST, STORIES, STORY_BODY
from cf_ui import busy_label, error_block, form_alert, google_g, href, icon, image, loading_region, lockup, screen, seal
from screens_member import SRC, ev_link, story_link

N = NEWSLETTER


# ===========================================================================
# Subscribe
# ===========================================================================
def subscribe_form(*, invalid: bool = False, busy: bool = False, failed: bool = False, limited: bool = False,
                   email: str = "grace.thompson@gmail.com") -> str:
    alert = ""
    if failed:
        alert = form_alert("We couldn't subscribe you", "Something went wrong on our side. Your email is still here, so try again in a moment.")
    if limited:
        alert = form_alert("Too many sign-ups", "Too many addresses were added from this network in the last hour. Try again later.")
    error = ('<p class="field__error" id="f-email-error">That email doesn’t look right. Check for a typo and try again.</p>'
             if invalid else "")
    submit = (f'<button class="btn btn--primary btn--lg" type="submit" disabled aria-busy="true">{busy_label("Subscribing…")}</button>'
              if busy else '<button class="btn btn--primary btn--lg" type="submit">Subscribe free</button>')
    value = "grace.thompson@gmail" if invalid else email
    return f"""<form class="subscribe__form" action="success.html" novalidate>
            {alert}
            <label class="field__label" for="f-email">Email address</label>
            <div class="subscribe__row">
              <input class="input input--pill input--lg" id="f-email" name="email" type="email" autocomplete="email" value="{value}" placeholder="you@example.com"{' aria-invalid="true" aria-describedby="f-email-error"' if invalid else ''}{" readonly" if busy else ""}>
              {submit}
            </div>
            {error}
            <p class="subscribe__note">One click to unsubscribe, and we never share your address.</p>
          </form>"""


def subscribe_panel(icon_name: str, title: str, text: str, actions: str) -> str:
    return f"""<div class="subscribe__panel" role="status" tabindex="-1">
            {icon(icon_name, "subscribe__panel-icon")}
            <h2 class="subscribe__panel-title">{title}</h2>
            <p class="subscribe__panel-text">{text}</p>
            <div class="subscribe__panel-actions">{actions}</div>
          </div>"""


def feeds(copied: str = "") -> str:
    rows = []
    for i, label, url, count in FEEDS:
        done = copied == i
        copy = (f'<button class="btn btn--secondary btn--sm feed__copy" type="button">{icon("check" if done else "copy")}'
                f'{"Copied" if done else "Copy URL"}<span class="visually-hidden"> of the {label} feed</span></button>')
        rows.append(f"""<li class="feed{' feed--all' if i == 'all' else ''}">
              <div class="feed__body">
                <p class="feed__name">{label} <span class="feed__count">{count}</span></p>
                <p class="feed__url">{url}</p>
              </div>
              <div class="feed__actions">
                {copy}
                <a class="btn btn--neutral btn--sm" href="https://feedly.com/i/subscription/feed/{quote(url, safe='')}" target="_blank" rel="noopener noreferrer">Open in Feedly<span class="visually-hidden"> the {label} feed (opens in a new tab)</span></a>
              </div>
            </li>""")
    live = '<p class="visually-hidden" role="status">Feed address copied</p>' if copied else '<p class="visually-hidden" role="status"></p>'
    return f'<ul class="feed-list">{"".join(rows)}</ul>{live}'


def subscribe(main: str, *, copied: str = "") -> str:
    lead, more = STORIES[0], STORIES[1:3]
    briefs = "".join(f'<li><p class="story__section">{x["section"]}</p><p class="issue-preview__brief">{x["title"]}</p></li>' for x in more)
    return f"""<div class="site">
  <header class="masthead masthead--plain">
    <div class="masthead__bar">
      {lockup(href("landing"))}
      <a class="btn btn--ghost masthead__back" href="{href("landing")}">{icon("arrow-left")}Back to news</a>
    </div>
  </header>
  <main id="main">
    <section class="subscribe">
      <div class="subscribe__main">
        <h1 class="display detail-title">{N["name"]}</h1>
        <p class="subscribe__lead">The week in Christian fitness across the GTA: the stories worth reading, the events worth showing up for, and one verse to carry into your training. {N["cadence"]}.</p>
        <div class="subscribe__state">
          {main}
        </div>
      </div>
      <aside class="issue-preview" aria-labelledby="preview-title">
        <div class="issue-preview__head">
          <h2 class="display rule-title rule-title--inline" id="preview-title">Latest issue</h2>
          <p class="issue-preview__no">No. {N["issue"]}</p>
        </div>
        {image(lead["image"], "issue-preview__image")}
        <p class="issue-preview__lead">{lead["title"]}</p>
        <ul class="list-ruled issue-preview__list">{briefs}</ul>
        <a class="text-link issue-preview__more" href="{href("newsletter")}">Read the full issue {icon("arrow-right")}</a>
      </aside>
    </section>
    <section class="rss" id="rss" aria-labelledby="rss-title">
      <div class="rss__inner">
        <div>
          <h2 class="display rss__title" id="rss-title">{icon("rss", "rss__icon")}Prefer RSS?</h2>
          <p class="rss__text">Follow every story, or just the sections you care about, in Feedly, Inoreader, NetNewsWire or any reader. No email or account needed.</p>
        </div>
        {feeds(copied)}
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <p>© 2026 Christian Fitness · Toronto</p>
    <p>Health · Energy · Abundant life</p>
  </footer>
</div>"""


s = screen("subscribe", "page", "Subscribe", route="/subscribe", source=SRC + "Subscribe (prZo9PZRE912z1ogbLVetQ)", group="Public",
           not_applicable={"loading": "The form and the feed list are static, and the latest issue preview arrives with the page.",
                           "empty": "A form and a fixed list of feeds, not a collection."})


@s("default", "Subscribe to The Abundant Weekly by email with optional extras, see the latest issue, or follow by RSS: one feed for everything and one per section.")
def _():
    return subscribe(subscribe_form())


@s("invalid", "The email is malformed: the field is marked and says what to fix; nothing is sent.")
def _():
    return subscribe(subscribe_form(invalid=True))


@s("submitting", "Subscribe pressed: \"Subscribing…\", button disabled, the email and extras read-only.")
def _():
    return subscribe(subscribe_form(busy=True))


@s("success", "The address was taken: \"Check your inbox\" names it and says to tap the confirmation link; nothing is sent until then.")
def _():
    return subscribe(subscribe_panel(
        "mail-check", "Check your inbox",
        'We sent a confirmation link to <strong>grace.thompson@gmail.com</strong>. Tap it and your first issue arrives Saturday morning.',
        f'<a class="btn btn--primary" href="{href("newsletter")}">Read last week’s issue {icon("arrow-right")}</a>'
        '<a class="btn btn--ghost subscribe__panel-alt" href="default.html">Use a different email</a>').replace('tabindex="-1"', 'tabindex="-1" autofocus'))


@s("confirmed", "Derived: the confirmation link was followed: \"You're subscribed\" with when the first issue arrives.")
def _():
    return subscribe(subscribe_panel(
        "circle-check", "You're subscribed",
        'The Abundant Weekly will arrive at <strong>grace.thompson@gmail.com</strong> on Saturday at 7 AM.',
        f'<a class="btn btn--primary" href="{href("newsletter")}">Read last week’s issue {icon("arrow-right")}</a>').replace('tabindex="-1"', 'tabindex="-1" autofocus'))


@s("link-expired", "Derived: the confirmation link is older than 7 days, was already used or is unknown: says so and offers the form again.")
def _():
    return subscribe('<div class="subscribe__alert">' + form_alert(
        "That link has expired", "Confirmation links last 7 days. Enter your email again and we'll send a new one.") + "</div>"
        + subscribe_form(email=""))


@s("unsubscribed", "Derived: Unsubscribe followed from an issue: done at once without signing in, with a way back.")
def _():
    return subscribe(subscribe_panel(
        "circle-check", "You're unsubscribed",
        'We won\'t email <strong>grace.thompson@gmail.com</strong> again. Changed your mind? You can subscribe again any time.',
        '<a class="btn btn--secondary" href="default.html">Subscribe again</a>').replace('tabindex="-1"', 'tabindex="-1" autofocus'))


@s("error", "The server failed or did not answer: a message above the form; the email and extras stay.")
def _():
    return subscribe(subscribe_form(failed=True).replace('tabindex="-1"', 'tabindex="-1" autofocus', 1))


@s("limited", "Derived: too many sign-ups from one network in an hour: a message above the form (focused); the email stays.")
def _():
    return subscribe(subscribe_form(limited=True).replace('tabindex="-1"', 'tabindex="-1" autofocus', 1))


@s("copied", "Copy URL pressed on the All stories feed: the button reads \"Copied\" for a moment and a status message says so.")
def _():
    return subscribe(subscribe_form(), copied="all")


# ===========================================================================
# Newsletter (the web version of an issue)
# ===========================================================================
def issue_page(inner: str) -> str:
    return f"""<div class="issue-page">
  <div class="issue-page__bar">
    <a class="back-link" href="{href("landing")}">{icon("arrow-left")} Christian Fitness</a>
    <span>Issue {N["issue"]} · web version</span>
  </div>
  <main id="main">
{inner}
  </main>
</div>"""


def issue(*, unpublished: bool = False) -> str:
    lead, more = STORIES[0], STORIES[1:]
    briefs = "".join(f"""<li class="headline">
            <div class="headline__body">
              <p class="story__section">{x["section"]}</p>
              <h3 class="headline__title">{x["title"]}</h3>
              <p class="story__meta">{x["author"]}</p>
            </div>
            {image(x["image"], "headline__image")}
          </li>""" for x in ((more[3], more[5]) if unpublished else (more[2], more[3], more[5])))
    week = "".join(f"""<li class="event-row">
            <div class="event-row__date"><p class="event-row__month">{e["month"]}</p><p class="event-row__day">{e["day"]}</p></div>
            <div class="event-row__body"><p class="event-row__title event-row__title--wrap">{e["title"]}</p><p class="event-row__meta">{e["weekday"]} {e["time"]} · {e["area"]} · {e["price"]}</p></div>
          </li>""" for e in MEMBER_EVENTS[:4])
    return f"""    <article class="issue">
      <header class="issue__masthead">
        <p class="issue__brand">{seal("lockup", light=True, decorative=True)}<span>Christian Fitness</span></p>
        <h1 class="display issue__title">{N["name"]}</h1>
        <p class="issue__date">No. {N["issue"]} · {N["date"]}</p>
      </header>
      <div class="issue__body">
        <section class="issue__section">
          <p class="issue__greeting">Morning, Grace.</p>
          <p class="issue__text">Spring finally showed up, and so did you: 142 of you have signed up for the Easter Sunrise 5K, our biggest start line yet. This week we went inside a West End church basement that became a neighbourhood gym, and asked Coach Danielle Okafor how to train hard without the guilt.</p>
          <p class="issue__signoff">Naomi Clarke, editor</p>
        </section>
        <section class="issue__section" aria-labelledby="issue-lead">
          <p class="story__section">The big story · {lead["section"]}</p>
          {image(lead["image"], "issue__image")}
          <h2 class="issue__lead-title" id="issue-lead">{lead["title"]}</h2>
          <p class="issue__text">{lead["dek"]}</p>
          <a class="btn btn--primary issue__action" href="{href("story")}">Read the story</a>
        </section>
        <section class="issue__section" aria-labelledby="issue-calendar">
          <h2 class="display rule-title" id="issue-calendar">On the calendar</h2>
          <ul class="list-divided">{week}</ul>
          <a class="inline-link issue__more" href="{href("landing")}">See every event</a>
        </section>
        <section class="issue__section" aria-labelledby="issue-briefs">
          <h2 class="display rule-title" id="issue-briefs">Worth your time</h2>
          <ul class="headline-list headline-list--plain">{briefs}</ul>
        </section>
        <section class="issue__verse" aria-label="Scripture">
          <blockquote>
            <p class="issue__quote">“Do you not know that your bodies are temples of the Holy Spirit?”</p>
            <cite class="issue__cite">1 Corinthians 6:19</cite>
          </blockquote>
        </section>
      </div>
      <footer class="issue__footer">
        <p>You’re getting this because you subscribed at christianfitness.ca. Know someone who’d like it? Forward it on.</p>
        <p class="issue__links">
          <a href="{href("subscribe")}">Manage preferences</a>
          <a href="{href("subscribe", "default", "rss")}">Follow by RSS</a>
          <a href="{href("subscribe")}">Unsubscribe</a>
        </p>
        <p>Christian Fitness · Toronto, ON</p>
      </footer>
    </article>"""


s = screen("newsletter", "page", "Newsletter", route="/newsletter", source=SRC + "Newsletter (62CNnfd3SQy5AKXEw2f5Qj)", group="Public",
           not_applicable={"empty": "One issue, not a collection; before the first issue is sent the route is the not-found page."})


@s("default", "The web version of the latest issue, as the email reads: the editor's note, the big story, the week's events, three more stories, a verse, and the footer with preferences, RSS and Unsubscribe.")
def _():
    return issue_page(issue())


@s("unpublished", "A story was unpublished after sending: the web issue hides it; the sent email is unchanged.")
def _():
    return issue_page(issue(unpublished=True))


@s("loading", "The issue is loading: the viewer bar is there; the issue shows as skeletons.")
def _():
    sk = ('<div class="issue"><div class="issue__body skeleton-stack"><h1 class="visually-hidden">Loading the newsletter</h1>'
          '<span class="skeleton skeleton--title-lg"></span><span class="skeleton skeleton--text w-40"></span>'
          '<span class="skeleton skeleton--block skeleton--image-16x9"></span><span class="skeleton skeleton--title"></span>'
          '<span class="skeleton skeleton--text w-90"></span><span class="skeleton skeleton--text w-80"></span></div></div>')
    return issue_page(loading_region("Loading the newsletter", sk))


@s("error", "The issue failed to load: retry, or go back to the news.")
def _():
    return issue_page('<div class="issue"><div class="issue__body"><h1 class="visually-hidden">Newsletter</h1>' + error_block(
        "This issue didn't load", "We couldn't reach Christian Fitness. Check your connection and try again.", retry="default.html",
        back=("Back to news", href("landing")), ref="CF-N6W4") + "</div></div>")


# ===========================================================================
# Story
# ===========================================================================
LISTING_STATE = {"lakeshore-runners": "default", "okafor": "person", "cf-team": "one-off", "northline": "unverified"}


def story_shell(inner: str) -> str:
    return f"""<div class="site">
  <header class="masthead">
    <div class="masthead__bar">
      {lockup(href("landing"))}
      <div class="site-header__actions">
        <a class="btn btn--ghost site-header__signin" href="{href("sign-in")}">Sign in</a>
        <a class="btn btn--primary" href="{href("join")}">Join free</a>
      </div>
    </div>
  </header>
  <main id="main">
{inner}
  </main>
</div>"""


def story_page(st: dict, *, copied: bool = False) -> str:
    body = STORY_BODY.get(st["id"], [])
    paras = "".join(f'<blockquote class="story__quote"><p>{p[2:]}</p></blockquote>' if p.startswith("> ") else f"<p>{p}</p>" for p in body)
    related = ""
    if st.get("related"):
        kind, rid, label = st["related"]
        to = (href("event-detail", "default" if rid == "sunrise-5k" else "unregistered") if kind == "event"
              else href("listing-profile", LISTING_STATE.get(rid, "default")))
        related = f"""<a class="story-next" href="{to}">
            <span class="story-next__body"><span class="story-next__label">{'From this story' if kind == 'event' else 'In the directory'}</span><span class="story-next__title">{label}</span></span>
            {icon("arrow-right", "icon--lg story-next__arrow")}
          </a>"""
    same = [x for x in STORIES if x["id"] != st["id"] and x["section"] == st["section"]]
    rest = [x for x in STORIES if x["id"] != st["id"] and x["section"] != st["section"]]
    more = "".join(f"""<li><a class="story-card" href="{story_link(x)}">
            {image(x["image"], "story-card__image")}
            <span class="story__section story-card__section">{x["section"]}</span>
            <span class="story-card__title">{x["title"]}</span>
            <span class="story__meta">{x["author"]} · {x["ago"]}</span>
          </a></li>""" for x in (same + rest)[:3])
    copy = (f'<button class="btn btn--secondary btn--sm" type="button">{icon("check" if copied else "link-2")}'
            f'{"Link copied" if copied else "Copy link"}</button>')
    return f"""    <article class="story">
      <header class="story__head">
        <a class="back-link" href="{href("landing")}">{icon("arrow-left")} All stories</a>
        <p class="story__section story__kicker">{st["section"]}</p>
        <h1 class="story__title">{st["title"]}</h1>
        {f'<p class="story__dek">{st["dek"]}</p>' if st.get("dek") else ''}
        <div class="story__byline">
          <div class="story__byline-body"><p class="story__author">{st["author"]}</p><p class="story__when">{st["ago"]} · {st.get("read", "2 min read")}</p></div>
          {copy}
          <p class="visually-hidden" role="status">{"Link copied" if copied else ""}</p>
        </div>
      </header>
      <figure class="story__figure">{image(st["image"], "story__image")}</figure>
      <div class="story__body">
        {paras}
        {related}
        <p class="story__correct">{icon("message-square-warning")} Spotted a mistake? <a class="inline-link" href="{href("feedback", "correction")}">Send a correction</a></p>
      </div>
    </article>
    <section class="story-more" aria-labelledby="more-title">
      <div class="story-more__inner">
        <h2 class="display river__title" id="more-title">Keep reading</h2>
        <ul class="story-more__list">{more}</ul>
      </div>
    </section>
    <section class="story-subscribe" aria-labelledby="story-subscribe-title">
      <div class="story-subscribe__inner">
        <div>
          <h2 class="display story-subscribe__title" id="story-subscribe-title">{N["name"]}</h2>
          <p class="story-subscribe__text">Stories like this one, and the week’s events. {N["cadence"]}.</p>
        </div>
        <a class="btn btn--inverse btn--md" href="{href("subscribe")}">Subscribe free</a>
      </div>
    </section>"""


s = screen("story", "page", "Story", route="/stories/:slug", source=SRC + "Story (hGiAndA4Pcm2AdLB2FBgU2)", group="Public",
           not_applicable={"empty": "One story, not a collection; a missing or unpublished story is the not-found page."})


@s("default", "A story anyone can read: section, headline, summary, author, age and reading time, Copy link, the lead image, the text with a pull quote, the one next step it points to, a way to send a correction, three more stories and the newsletter.")
def _():
    return story_shell(story_page(ST["basement-gym"]))


@s("link-copied", "Copy link pressed: the button reads \"Link copied\" for a moment and a status message says so.")
def _():
    return story_shell(story_page(ST["basement-gym"], copied=True))


@s("plain", "A story with no summary and nothing to point to: no next-step card; the default reading time shows.")
def _():
    return story_shell(story_page(dict(ST["sabbath-rest"], read="4 min read")))


@s("loading", "Story loading: the masthead is there; the headline, image and text show as skeletons.")
def _():
    sk = ('<div class="story"><div class="story__head skeleton-stack"><h1 class="visually-hidden">Loading story</h1>'
          '<span class="skeleton skeleton--text-sm w-20"></span><span class="skeleton skeleton--title-lg"></span>'
          '<span class="skeleton skeleton--title-lg w-80"></span><span class="skeleton skeleton--text w-40"></span></div>'
          '<div class="story__figure"><span class="skeleton skeleton--block skeleton--image-16x9"></span></div>'
          '<div class="story__body skeleton-stack"><span class="skeleton skeleton--text w-90"></span>'
          '<span class="skeleton skeleton--text w-90"></span><span class="skeleton skeleton--text w-80"></span></div></div>')
    return story_shell(loading_region("Loading story", sk))


@s("error", "Story failed to load: retry, or go back to all stories.")
def _():
    return story_shell('<div class="story"><div class="story__head"><h1 class="visually-hidden">Story</h1>' + error_block(
        "This story didn't load", "We couldn't reach Christian Fitness. Check your connection and try again.", retry="default.html",
        back=("All stories", href("landing")), ref="CF-T2Y7") + "</div></div>")


# ===========================================================================
# Google's account chooser (not a product screen)
# ===========================================================================
def chooser(app: str, accounts: list, targets: dict, cancel: str) -> str:
    rows = "".join(f"""<li><button class="google-chooser__account" type="button" data-mock-href="{targets[email]}">
              <span class="google-chooser__avatar" aria-hidden="true">{name[0]}</span>
              <span class="google-chooser__who"><span class="google-chooser__name">{name}</span><span class="google-chooser__email">{email}</span></span>
            </button></li>""" for name, email in accounts)
    return f"""<main id="main" class="google-chooser">
  <div class="google-chooser__card">
    <div>
      {google_g("xl")}
      <h1 class="google-chooser__title">Choose an account</h1>
      <p class="google-chooser__app">to continue to <span class="google-chooser__app-name">{seal("lockup", decorative=True)}{app}</span></p>
    </div>
    <div>
      <ul class="google-chooser__list">
        {rows}
        <li><button class="google-chooser__account" type="button"><span class="google-chooser__avatar google-chooser__avatar--icon" aria-hidden="true">{icon("user-plus")}</span><span class="google-chooser__name">Use another account</span></button></li>
      </ul>
      <p class="google-chooser__consent">To continue, Google will share your name, email address and profile picture with {app}. Before using this app, you can review its privacy policy and terms of service.</p>
      <div class="google-chooser__foot"><a class="btn btn--ghost" href="{cancel}">Cancel</a></div>
    </div>
  </div>
</main>
<p class="mock-note" style="top: 1rem; right: 1rem;">Google's page, not ours: the product never renders it. It is here so the sign-in flows can be clicked through. Each account leads to a different outcome.</p>"""


s = screen("google-account-chooser", "page", "Google account chooser", route="accounts.google.com (Google's page)", group="Google (not built)",
           source=SRC + "Google Account Chooser (cCCABXkHgk7aXUuDe5vWN5); Google's own screen, drawn for click-through only.",
           not_applicable={"loading": "Google's page; the product does not draw it.", "empty": "Google's page; the product does not draw it.",
                           "error": "Google's page; what the product shows when Google fails is the google-failed state of Sign in, Join and Staff sign in."})


@s("default", "From member Sign in: the Gmail account has a profile (Home); the church account has none (Sign in says so).")
def _():
    t = {GOOGLE_MEMBER[0][1]: href("home"), GOOGLE_MEMBER[1][1]: href("sign-in", "google-no-account")}
    return chooser("Christian Fitness", GOOGLE_MEMBER, t, href("sign-in"))


@s("join", "From Join: either account comes back to \"Finish your profile\".")
def _():
    t = {email: href("join", "google") for _, email in GOOGLE_MEMBER}
    return chooser("Christian Fitness", GOOGLE_MEMBER, t, href("join"))


@s("staff", "From Staff sign in: the work account opens the console; the Gmail account is the wrong domain; the shared inbox has no console role.")
def _():
    t = {GOOGLE_STAFF[0][1]: href("admin-dashboard"), GOOGLE_STAFF[1][1]: href("admin-sign-in", "wrong-domain"),
         GOOGLE_STAFF[2][1]: href("admin-sign-in", "no-access")}
    return chooser("Christian Fitness Admin", GOOGLE_STAFF, t, href("admin-sign-in"))
