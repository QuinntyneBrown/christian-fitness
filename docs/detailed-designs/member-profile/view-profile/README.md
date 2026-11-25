# View a profile

## Overview

A *profile* is the page that describes one member to the community. This feature
covers the Profile screen at `/profile`, which shows a member their own profile, and
the view of another member's profile. It belongs to the member-profile subsystem.

- **own profile** — profile of the signed-in member, with every field
- **public profile** — name, initials, bio and interests; an admitted signed-in
  viewer may also see home church when its owner chose to show it
- **initials avatar** — avatar that shows a member's initials in place of a photo

The own profile shows name, initials avatar, city, join date, bio, home church,
goals, interests and upcoming registered events, with two actions: "Edit profile",
which opens the edit dialog, and "Preferences", which opens the member's preferences
at `/preferences` ([set email and notification preferences](../../preferences/set-email-and-notification-preferences/README.md);
`L2-064`). With no registered events it shows an empty state that links to Events. The public profile never shows email, and shows
home church only to admitted signed-in members when its owner made it visible in Preferences
(`L2-065` AC10); anonymous visitors never receive it (`L2-033` AC5).

## Description

Slice 18.1 built the own profile (L2-005 AC1, AC2;
[ADR 0015](../../../adr/0015-view-my-profile.md)); slice 19.1 built the public
profile (AC3). Slice 18.2 added the Edit profile button and the "Add a bio" action
that open the edit dialog ([edit own profile](../edit-profile/README.md)). The
amended `L2-005` AC1 adds the Preferences action beside Edit profile; it is the next
slice of this feature and lands with the Preferences screen. The mock's Groups
section comes with group membership (slice 12.3).

- **`ProfilePage`** — routed, lazy page at `/profile` in `projects/web`, a child of
  `MemberShell`, titled "Profile · Christian Fitness". It binds `PROFILE_SERVICE` to
  `HttpProfileService` on its own `providers`, so the client lives only while the
  screen does. Its `state` signal is `loading`, `loaded` or `failed`:
  - `loading` — the mock's skeletons inside `aria-busy="true"`, with a visually
    hidden "Loading profile" heading;
  - `loaded` — `ProfileHero` (initials avatar from `initialsOf`, name as the `h1`,
    "Member since …", then home church and city when present) with two nodes in its
    `[slot=action]`: the secondary `Button` "Edit profile", which opens the edit
    dialog, and the secondary `Button` "Preferences" with `href="/preferences"`, which
    renders as a link (`L2-005` AC1; mock `profile-hero__action`). The About, "Goals this
    year" and Into sections, and the "Going to" section as a `GoingList`. Each empty
    section shows the mock's `empty-inline` sentence; an empty "Going to" adds
    "Browse events", a link to `/events` (L2-005 AC2);
  - `failed` — a 4xx answer or no answer: the mock's `error-state` with "Your profile
    didn't load", **Try again**, which asks again in place, and **Back to home**
    (`/home`). A 5xx shows the server-error screen instead (L2-043 AC4, AC5).
- **`ProfileHero`, `GoingList`, `TagList`, `EmptyInline`, `ProfileSkeleton`** —
  presentation components in `components` (inputs only), each one encapsulated BEM
  stylesheet named as in the design system. Every name, bio, goal, church, city and
  event title is rendered as text.
- **`TopBar`** — the shell's top bar carries the mock's `profile-button`: the
  signed-in member's initials, labelled "Your profile", linking to `/profile`, with
  `aria-current="page"` while Profile or Preferences shows
  ([navigate the member app](../../member-home/navigate-member-app/README.md)). A
  plain click emits `navigate`, so `MemberShell` moves the router without a reload;
  the shell reads the name once from `SESSION_SERVICE`.
- **`initialsOf`, `memberSinceOf`, `goingDateOf`, `interestLabelsOf`** — pure helpers
  in `domain` with unit tests: the avatar's initials; "today" when the member joined
  on today's date in Toronto, otherwise the month and year ("January 2026"); an
  event's day as "Sat, Apr 18" in Toronto time; interest keys as their labels, in the
  order given, unknown keys left out.
- **`ProfileApi` / `PROFILE_SERVICE`** — contract and token in `api`; `own()` answers
  `OwnProfileDto`. `HttpProfileService` calls `GET /api/profile/me` and holds no
  state.
- **`ProfileController`** — `GET /api/profile/me` sends one `GetOwnProfileQuery`. It
  takes no member id: the member is the session's (`ICurrentMember`), so nobody can
  ask for another member's own profile. A visitor is refused 401 by the fallback
  policy.
- **`GetOwnProfileHandler`** — reads the caller's `Member` and asks
  `IRegistrationReader.UpcomingForAsync(memberId, now)` for the events they are going
  to, soonest first, with `now` from `TimeProvider`. The reader is
  `DatabaseRegistrations` in Infrastructure, which queries the `Registration` rows of
  upcoming, published events. It logs nothing: home church and bio are never in a
  log or span (L2-033 AC2).
- **`Member`** — holds `City` (at most 100 characters), `Bio` (at most 300) and
  `Goals` (at most 5 of at most 80) (migration `AddMemberProfile`), edited through
  [edit own profile](../edit-profile/README.md).

The answer of `GET /api/profile/me` is

| Field            | Type                    | Notes                                                    |
|------------------|-------------------------|----------------------------------------------------------|
| `name`           | string                  | Full name                                                |
| `city`           | string or null          | Null until the member gives one                          |
| `joinedAt`       | string (ISO 8601)       | When the account was created                             |
| `bio`            | string or null          | Null until the member writes one                         |
| `homeChurch`     | string or null          | Optional, sensitive; shown only to its owner here        |
| `goals`          | string[]                | Up to 5                                                  |
| `interests`      | string[]                | Interest keys (`running`, `strength`, …)                 |
| `upcomingEvents` | `{ eventId, title, startsAt, imageUrl }[]` | Soonest first; `imageUrl` may be null |

The public profile (slice 19.1):

- **`MemberProfilePage`** — `/members/:id` no longer has a member guard. With a session it uses the member shell and `pages/profile/member.html`; without one it uses the public masthead and `pages/profile/public.html`, with "Join to message" linking to Join. Both show name, initials, About and Into; an admitted signed-in viewer can also see a shared home church.
- **Authenticated read** — `GET /api/members/{id}/profile` enforces visibility, returns name, bio and interests, and adds `homeChurch` only when `Member.ShowHomeChurch` is true. Email is never included.
- **Anonymous read** — `GET /api/public/members/{id}` is `[AllowAnonymous]`, under `public-reads` (issue #80). It returns only name, bio and interests for Anyone; a malformed, unknown or restricted id gets the same 404 `not_found`. Neither email nor home church is present ([ADR 0061](../../../adr/0061-public-profiles-and-privacy.md)).

### Open questions

- **Code behind the requirement.** `ProfilePage` renders only Edit profile in the
  hero; the Preferences link is work for the next slice, and its route `/preferences`
  does not exist yet.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-005` | `L1-003` | Own profile shows the member's fields, actions and events; another visible profile shows name, initials, bio and interests, with home church only to admitted signed-in viewers when enabled. A visitor sees the public masthead and "Join to message", never email or home church (AC1–AC4). |
| `L2-064` | `L1-019` | Given a signed-in member, when they choose Preferences on their own profile, then `/preferences` shall open (acceptance criterion 1). |
| `L2-065` | `L1-019`, `L1-013` | Profile visibility, shared group membership, the anonymous endpoint and home church switch follow AC1–AC3 and AC10–AC13. |
| `L2-033` | `L1-013` | Home church shall never be shown or returned anonymously (AC5). |

## Diagrams

### System context

The member reaches Christian Fitness over HTTPS; the system exports telemetry to an OpenTelemetry collector.

![C4 system context for view a profile](diagrams/c4-context.png)

### Containers

The Member web app calls the Christian Fitness API, which reads and writes the Christian Fitness database. The Christian Fitness CLI applies migrations and seed data; the API does not migrate on startup.

![C4 container view for view a profile](diagrams/c4-container.png)

### Components

The components below are the parts this slice touches in the Member web app and the Christian Fitness API; each controller sends one MediatR request.

![C4 component view for view a profile](diagrams/c4-component.png)

### Class structure

The class diagram shows the frontend contract and its HTTP implementation, the request and handler types and the domain entities they read or change.

![Class diagram for view a profile](diagrams/class-structure.png)

### Behaviour — view own profile

The handler reads only the caller's member record and registrations. The page shows every own field with Edit profile and Preferences, and an empty state with a link to Events when nothing is registered (`L2-005` AC1, AC2).

![Sequence diagram for member views own profile](diagrams/sequence-view-own-profile.png)

### Behaviour — view another member's profile

The public projection omits email by construction and adds home church only when its owner chose to show it (`L2-005` AC3).

![Sequence diagram for member views another member's profile](diagrams/sequence-view-member-profile.png)
