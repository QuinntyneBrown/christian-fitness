"""Shared building blocks for the Christian Fitness mocks: registry, document skeleton,
icons, brand seal, avatars, member and admin shells, skeletons and states."""
from __future__ import annotations

from html import escape

from cf_data import ADMIN, IMAGE_SIZES, ME

PROJECT = "Christian Fitness"
CUR = ' aria-current="page"'
FOLDERS = {"page": "pages", "dialog": "dialogs", "notification": "notifications"}

# ---------------------------------------------------------------------------
# Registry: every screen registers its states; build_mocks.py writes the files
# and the manifest from it.
# ---------------------------------------------------------------------------
SCREENS: dict[str, dict] = {}


def screen(sid: str, kind: str, title: str, *, route: str | None = None, opens_from: str | None = None,
           source: str | None = None, group: str = "Member app", not_applicable: dict | None = None,
           description: str = ""):
    entry = SCREENS.setdefault(sid, {
        "id": sid, "kind": kind, "title": title, "route": route, "opens_from": opens_from, "source": source,
        "group": group, "not_applicable": not_applicable or {}, "description": description, "states": {},
    })

    def state(name: str, desc: str):
        def wrap(fn):
            entry["states"][name] = {"render": fn, "description": desc}
            return fn
        return wrap
    return state


def href(sid: str, state: str = "default", fragment: str = "") -> str:
    kind = SCREENS[sid]["kind"] if sid in SCREENS else "page"
    return f"../../{FOLDERS[kind]}/{sid}/{state}.html{('#' + fragment) if fragment else ''}"


ASSETS = "../../assets"


def image(name: str, cls: str, alt: str = "") -> str:
    w, h = IMAGE_SIZES[name]
    return f'<img class="{cls}" src="{ASSETS}/images/{name}.jpg" alt="{escape(alt)}" width="{w}" height="{h}">'


# ---------------------------------------------------------------------------
# Document skeleton and mock bar
# ---------------------------------------------------------------------------
def document(sid: str, state: str, body: str) -> str:
    s = SCREENS[sid]
    st = s["states"][state]
    desc = st["description"]
    source = f'\n<meta name="mock:source" content="{escape(s["source"])}">' if s.get("source") else ""
    links = "\n".join(
        f'    <li><a href="{name}.html"{CUR if name == state else ""}>{name}</a></li>'
        for name in s["states"]
    )
    return f"""<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(s["title"])} · {state} — {PROJECT} mocks</title>
<meta name="mock:kind" content="{s["kind"]}">
<meta name="mock:screen" content="{sid}">
<meta name="mock:state" content="{state}">{source}
<meta name="description" content="{escape(desc)}">
<link rel="stylesheet" href="{ASSETS}/tokens.css">
<link rel="stylesheet" href="{ASSETS}/ui.css">
<link rel="stylesheet" href="{ASSETS}/mock.css">
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
{body}
<nav class="mock-bar" aria-label="Mock navigation">
  <a class="mock-bar__home" href="../../index.html" aria-label="All mocks">⌂</a>
  <span class="mock-bar__screen">{escape(s["title"])}</span>
  <ul class="mock-bar__states">
{links}
  </ul>
  <button type="button" data-theme-toggle aria-pressed="false">☾ Dark</button>
  <button type="button" data-chrome-toggle aria-label="Hide mock chrome">×</button>
</nav>
<script src="{ASSETS}/mock.js"></script>
</body>
</html>
"""


def note(text: str, pos: str = "top: 5rem; right: 1rem;") -> str:
    return f'<p class="mock-note" style="{pos}">{text}</p>'


# ---------------------------------------------------------------------------
# Icons (Lucide 0.577, 24-unit grid, 2px stroke, currentColor)
# ---------------------------------------------------------------------------
ICONS = {
    "arrow-right": '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    "arrow-left": '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    "check": '<path d="M20 6 9 17l-5-5"/>',
    "map-pin": '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    "message-circle": '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    "search": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    "calendar-days": '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',
    "heart-handshake": '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"/><path d="m18 15-2-2"/><path d="m15 18-2-2"/>',
    "home": '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    "user": '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    "calendar-plus": '<path d="M8 2v4"/><path d="M16 2v4"/><path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"/><path d="M3 10h18"/><path d="M16 19h6"/><path d="M19 16v6"/>',
    "clock": '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    "badge-check": '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
    "send": '<path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z"/><path d="M6 12h16"/>',
    "church": '<path d="M10 9h4"/><path d="M12 7v5"/><path d="M14 22v-4a2 2 0 0 0-4 0v4"/><path d="M18 22V5.618a1 1 0 0 0-.553-.894l-4.553-2.277a2 2 0 0 0-1.788 0L6.553 4.724A1 1 0 0 0 6 5.618V22"/><path d="m18 7 3.447 1.724a1 1 0 0 1 .553.894V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.618a1 1 0 0 1 .553-.894L6 7"/>',
    "pencil": '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    "lock": '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    "plus": '<path d="M5 12h14"/><path d="M12 5v14"/>',
    "x": '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    "flag": '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
    "users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    "layout-dashboard": '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    "log-out": '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    "alert-circle": '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    "alert-triangle": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    "info": '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    "circle-check": '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    "wifi-off": '<path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/>',
    "rotate-cw": '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
    "mail": '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    "smartphone": '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
    "loader": '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>',
    "undo": '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>',
    "compass": '<path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/><circle cx="12" cy="12" r="10"/>',
    "shield": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    "wrench": '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
}


def icon(name: str, cls: str = "") -> str:
    return f'<svg class="icon{(" " + cls) if cls else ""}" viewBox="0 0 24 24" aria-hidden="true">{ICONS[name]}</svg>'


# ---------------------------------------------------------------------------
# Brand
# ---------------------------------------------------------------------------
RING_TEXT = "CHRISTIAN FITNESS · HEALTH · ENERGY · ABUNDANT LIFE · "


def seal(size: str, *, light: bool = False, uid: str = "cf-seal", decorative: bool = False) -> str:
    """size: lockup | signin (small: thick ring, big cross) · verse | hero (lettering on the ring)."""
    cls = f"seal seal--{size}{' seal--light' if light else ''}"
    a11y = 'aria-hidden="true"' if decorative else 'role="img" aria-label="Christian Fitness"'
    if size in ("lockup", "signin"):
        inner = ('<circle class="seal__ring" cx="100" cy="100" r="96" stroke-width="7"/>'
                 '<rect class="seal__cross" x="88" y="38" width="24" height="128" rx="2"/>'
                 '<rect class="seal__cross" x="56" y="70" width="88" height="22" rx="2"/>')
    else:
        inner = (f'<defs><path id="{uid}" d="M100,100 m-76.5,0 a76.5,76.5 0 1,1 153,0 a76.5,76.5 0 1,1 -153,0"/></defs>'
                 '<circle class="seal__ring" cx="100" cy="100" r="96" stroke-width="3"/>'
                 '<circle class="seal__ring" cx="100" cy="100" r="66" stroke-width="1.5"/>'
                 f'<text class="seal__text"><textPath href="#{uid}" startOffset="0" textLength="478" lengthAdjust="spacing">{RING_TEXT}</textPath></text>'
                 '<rect class="seal__cross" x="92" y="54" width="16" height="96" rx="1.5"/>'
                 '<rect class="seal__cross" x="68" y="78" width="64" height="15" rx="1.5"/>')
    return f'<svg class="{cls}" viewBox="0 0 200 200" {a11y}>{inner}</svg>'


def lockup(to: str, *, light: bool = False) -> str:
    return (f'<a class="lockup{" lockup--light" if light else ""}" href="{to}">'
            f'{seal("lockup", light=light, decorative=True)}<span class="lockup__name">Christian Fitness</span></a>')


def avatar(initials: str, *, group: bool = False, size: str = "", photo: str | None = None) -> str:
    mods = (" avatar--group" if group else "") + (f" avatar--{size}" if size else "")
    if photo:
        return image(photo, f"avatar{mods}")
    return f'<span class="avatar{mods}" aria-hidden="true">{escape(initials)}</span>'


def service_avatar(s: dict, size: str = "") -> str:
    return avatar(s["initials"], size=size, photo=s.get("image"))


# ---------------------------------------------------------------------------
# Shells
# ---------------------------------------------------------------------------
NAV = [("home", "Home", "home"), ("events", "Events", "calendar-days"), ("services", "Services", "heart-handshake"),
       ("messages", "Messages", "message-circle")]


def member_shell(active: str, content: str, *, unread: int = 4, fill: bool = False, banner: str = "",
                 after: str = "", inert: bool = False) -> str:
    def cur(k):
        return ' aria-current="page"' if active == k else ""
    links = []
    for key, label, _ in NAV:
        badge = (f' <span class="count-badge" aria-label="{unread} unread">{unread}</span>'
                 if key == "messages" and unread else "")
        links.append(f'<a class="app-nav__link" href="{href(key)}"{cur(key)}>{label}{badge}</a>')
    tabs = []
    for key, label, ic in NAV + [("profile", "Profile", "user")]:
        dot = (f'<span class="tab-bar__dot" aria-hidden="true"></span><span class="visually-hidden">, {unread} unread</span>'
               if key == "messages" and unread else "")
        tabs.append(f'<a class="tab-bar__item" href="{href(key)}"{cur(key)}>{icon(ic, "icon--lg")}{label}{dot}</a>')
    shell = f"""<div class="app{' app--fill' if fill else ''}">
  <header class="app-header">
    <div class="app-header__inner">
      {lockup(href("home"))}
      <nav class="app-nav" aria-label="Primary">
        {''.join(links)}
      </nav>
      <a class="profile-button" href="{href("profile")}" aria-label="Your profile"{cur("profile")}>{ME["initials"]}</a>
      <button class="btn btn--ghost app-header__signout" type="button">Sign out</button>
    </div>
  </header>
  {banner}
  <main id="main" class="app__main">
{content}
  </main>
  <nav class="tab-bar" aria-label="Primary, mobile">
    {''.join(tabs)}
  </nav>
</div>"""
    if inert:
        shell = f'<div inert aria-hidden="true">\n{shell}\n</div>'
    return shell + ("\n" + after if after else "")


ADMIN_NAV = [("admin-dashboard", "Dashboard", "layout-dashboard", 0), ("admin-events", "Events", "calendar-days", 0),
             ("admin-services", "Services", "heart-handshake", 3), ("admin-members", "Members", "users", 1)]


# The areas a Moderator opens (L2-019 AC5; ADR 0020); an Admin opens all four.
MODERATOR_AREAS = ("admin-dashboard", "admin-members")


def admin_shell(active: str, content: str, *, after: str = "", inert: bool = False, counts: dict | None = None,
                staff: dict | None = None) -> str:
    counts = counts or {}
    staff = staff or ADMIN
    items = []
    for key, label, ic, n in ADMIN_NAV:
        if staff["role"] == "Moderator" and key not in MODERATOR_AREAS:
            continue
        n = counts.get(key, n)
        cur = ' aria-current="page"' if key == active else ""
        what = "applications waiting" if key == "admin-services" else "report to review" if n == 1 else "reports to review"
        badge = f'<span class="admin-nav__count" aria-label="{n} {what}">{n}</span>' if n else ""
        items.append(f'<a class="admin-nav__item" href="{href(key)}"{cur}>{icon(ic, "icon--md")}{label}{badge}</a>')
    shell = f"""<div class="admin">
  <aside class="admin__sidebar">
    <div class="admin__brand">
      {seal("lockup", light=True, decorative=True)}
      <div>
        <p class="admin__brand-name">Christian Fitness</p>
        <p class="admin__brand-sub">Admin console</p>
      </div>
    </div>
    <nav class="admin-nav" aria-label="Admin">
      {''.join(items)}
    </nav>
    <div class="admin__user">
      <span class="admin__user-avatar" aria-hidden="true">{staff["initials"]}</span>
      <div class="admin__user-body">
        <p class="admin__user-name">{staff["name"]}</p>
        <p class="admin__user-role">{staff["role"]}</p>
      </div>
      <button class="admin__signout" type="button" aria-label="Sign out">{icon("log-out")}</button>
    </div>
  </aside>
  <main id="main" class="admin__main">
    <div class="admin__page">
{content}
    </div>
  </main>
</div>"""
    if inert:
        shell = f'<div inert aria-hidden="true">\n{shell}\n</div>'
    return shell + ("\n" + after if after else "")


def admin_header(title: str, sub: str = "", action: str = "") -> str:
    sub_html = f'<p class="subtitle">{sub}</p>' if sub else ""
    return f"""<div class="page-head page-head--wrap">
  <div>
    <h1 class="display admin-title">{title}</h1>
    {sub_html}
  </div>
  {action}
</div>"""


# ---------------------------------------------------------------------------
# States
# ---------------------------------------------------------------------------
def loading_region(label: str, inner: str) -> str:
    return f'<div aria-busy="true" aria-live="polite"><p class="visually-hidden">{label}</p>{inner}</div>'


def error_block(title: str, text: str, *, retry: str, back: tuple[str, str] | None = None, ref: str = "") -> str:
    back_html = f'<a class="btn btn--secondary btn--sm" href="{back[1]}">{back[0]}</a>' if back else ""
    ref_html = f'<p class="error-state__ref">Reference {ref}</p>' if ref else ""
    return f"""<div class="error-state" role="alert">
  <span class="error-state__icon">{icon("alert-circle")}</span>
  <div>
    <h2 class="display empty-state__title">{title}</h2>
    <p class="empty-state__text">{text}</p>
    <div class="empty-state__actions">
      <a class="btn btn--primary btn--sm" href="{retry}">{icon("rotate-cw")}Try again</a>
      {back_html}
    </div>
    {ref_html}
  </div>
</div>"""


def empty_block(title: str, text: str, action: str, *, tag: str = "h2", tight: bool = False) -> str:
    return f"""<div class="empty-state{' empty-state--tight' if tight else ''}">
  <{tag} class="display empty-state__title">{title}</{tag}>
  <p class="empty-state__text">{text}</p>
  {f'<div class="empty-state__actions">{action}</div>' if action else ''}
</div>"""


def toast(kind: str, title: str, text: str = "", *, action: tuple[str, str] | None = None, icon_name: str | None = None,
          role: str | None = None) -> str:
    ic = icon_name or {"info": "info", "success": "circle-check", "warning": "alert-triangle", "danger": "alert-circle"}[kind]
    text_html = f'<p class="toast__text">{text}</p>' if text else ""
    act = f'<a class="toast__action" href="{action[1]}">{action[0]}</a>' if action else ""
    role_attr = f' role="{role}"' if role else ""
    return f"""<div class="toast toast--{kind}"{role_attr}>
      {icon(ic)}
      <div class="toast__body"><p class="toast__title">{title}</p>{text_html}{act}</div>
      <button class="icon-button icon-button--sm toast__close" type="button" aria-label="Dismiss">{icon("x")}</button>
    </div>"""


def toast_region(*toasts: str, admin: bool = False) -> str:
    polite = [t for t in toasts if 'role="alert"' not in t]
    alerts = [t for t in toasts if 'role="alert"' in t]
    cls = "toast-region" + (" toast-region--admin" if admin else "")
    return (f'<section class="{cls}" aria-label="Notifications">'
            f'<div role="status" aria-live="polite">{"".join(polite)}</div>'
            f'{"".join(alerts)}</section>')


def banner(kind: str, icon_name: str, text: str, *, action: tuple[str, str] | None = None, dismiss: bool = True,
           role: str = "status") -> str:
    act = f'<a class="banner__action" href="{action[1]}">{action[0]}</a>' if action else ""
    close = (f'<button class="icon-button icon-button--sm banner__close" type="button" aria-label="Dismiss">{icon("x")}</button>'
             if dismiss else "")
    return f"""<div class="banner banner--{kind}" role="{role}">
    <div class="banner__inner">{icon(icon_name)}<p class="banner__text">{text}</p>{act}{close}</div>
  </div>"""


def field(label: str, name: str, value: str = "", *, type_: str = "text", hint: str = "", error: str = "",
          autocomplete: str = "", optional: bool = False, readonly: bool = False, extra: str = "", required: bool = False,
          cls: str = "input") -> str:
    fid = f"f-{name}"
    described = []
    hint_html = err_html = ""
    if error:
        err_html = f'<span class="field__error" id="{fid}-error">{error}</span>'
        described.append(f"{fid}-error")
    elif hint:
        hint_html = f'<span class="field__hint" id="{fid}-hint">{hint}</span>'
        described.append(f"{fid}-hint")
    attrs = [f'class="{cls}"', f'id="{fid}"', f'name="{name}"', f'type="{type_}"']
    if value:
        attrs.append(f'value="{escape(value)}"')
    if autocomplete:
        attrs.append(f'autocomplete="{autocomplete}"')
    if described:
        attrs.append(f'aria-describedby="{" ".join(described)}"')
    if error:
        attrs.append('aria-invalid="true"')
    if readonly:
        attrs.append("readonly")
    if required:
        attrs.append("required")
    if extra:
        attrs.append(extra)
    opt = ' <span class="field__optional">(optional)</span>' if optional else ""
    return (f'<div class="field"><label class="field__label" for="{fid}">{label}{opt}</label>'
            f'<input {" ".join(attrs)}>{err_html}{hint_html}</div>')


def textarea(label: str, name: str, value: str, *, rows: int = 4, error: str = "", hint: str = "", optional: bool = False,
             readonly: bool = False) -> str:
    fid = f"f-{name}"
    desc = f"{fid}-error" if error else (f"{fid}-hint" if hint else "")
    sub = (f'<span class="field__error" id="{fid}-error">{error}</span>' if error
           else f'<span class="field__hint" id="{fid}-hint">{hint}</span>' if hint else "")
    opt = ' <span class="field__optional">(optional)</span>' if optional else ""
    attrs = f'class="textarea" id="{fid}" name="{name}" rows="{rows}"'
    if desc:
        attrs += f' aria-describedby="{desc}"'
    if error:
        attrs += ' aria-invalid="true"'
    if readonly:
        attrs += " readonly"
    return (f'<div class="field"><label class="field__label" for="{fid}">{label}{opt}</label>'
            f'<textarea {attrs}>{escape(value)}</textarea>{sub}</div>')


def select(label: str, name: str, options: list[str], selected: str, *, disabled: bool = False) -> str:
    opts = "".join(f'<option{" selected" if o == selected else ""}>{escape(o)}</option>' for o in options)
    return (f'<div class="field"><label class="field__label" for="f-{name}">{label}</label>'
            f'<select class="select" id="f-{name}" name="{name}"{" disabled" if disabled else ""}>{opts}</select></div>')


def error_summary(title: str, items: list[tuple[str, str]], aid: str = "error-summary") -> str:
    lis = "".join(f'<li><a href="#{target}">{text}</a></li>' for text, target in items)
    return f"""<div class="form-alert" id="{aid}" role="alert" tabindex="-1" aria-labelledby="{aid}-title">
  {icon("alert-circle")}
  <div><p class="form-alert__title" id="{aid}-title">{title}</p><ul class="form-alert__list">{lis}</ul></div>
</div>"""


def form_alert(title: str, text: str, *, kind: str = "", ic: str = "alert-circle", role: str = "alert") -> str:
    k = f" form-alert--{kind}" if kind else ""
    return f"""<div class="form-alert{k}" role="{role}" tabindex="-1">
  {icon(ic)}
  <div><p class="form-alert__title">{title}</p><p>{text}</p></div>
</div>"""


def busy_label(text: str) -> str:
    return f'{icon("loader", "icon--spin")}{text}'
