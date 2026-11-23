# View a profile

## Overview

A *profile* is the page that describes one member to the community. This feature
covers the Profile screen at `/profile`, which shows a member their own profile, and
the view of another member's profile. It belongs to the member-profile subsystem.

- **own profile** — profile of the signed-in member, with every field
- **public profile** — subset of another member's profile: name, initials, bio and
  interests, plus home church only when that member chose to show it
- **initials avatar** — avatar that shows a member's initials in place of a photo

The own profile shows name, initials avatar, city, join date, bio, home church,
goals, interests and upcoming registered events. With no registered events it shows
an empty state that links to Events. The public profile never shows email, and shows
home church only when its owner made it visible (L2-006).

## Description

Slice 18.1 builds the own profile (L2-005 AC1, AC2;
[ADR 0013](../../../adr/0013-view-my-profile.md)); slice 19.1 builds the public
profile (AC3). Editing, and the Edit profile button and "Add a bio" action that open
it, come with slice 18.2 ([edit own profile](../edit-profile/README.md)); the mock's
Groups section comes with group membership (slice 12.3).

- **`ProfilePage`** — routed, lazy page at `/profile` in `projects/web`, a child of
  `MemberShell`, titled "Profile · Christian Fitness". It binds `PROFILE_SERVICE` to
  `HttpProfileService` on its own `providers`, so the client lives only while the
  screen does. Its `state` signal is `loading`, `loaded` or `failed`:
  - `loading` — the mock's skeletons inside `aria-busy="true"`, with a visually
    hidden "Loading profile" heading;
  - `loaded` — `ProfileHero` (initials avatar from `initialsOf`, name as the `h1`,
    "Member since …", then home church and city when present), the About, "Goals this
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
- **`AppHeader`** — gains the mock's `profile-button`: the signed-in member's
  initials, labelled "Your profile", linking to `/profile`, with
  `aria-current="page"` while Profile shows. A plain click emits `navigate`, so
  `MemberShell` moves the router without a reload; the shell reads the name once from
  `SESSION_SERVICE`.
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
  to, soonest first, with `now` from `TimeProvider`. Until registration exists (slice
  6.1) the reader is `NoRegistrationsYet`, which answers none, so every member sees
  the empty "Going to"; slice 6.1 replaces it with a query of `Registration` rows of
  upcoming, published events. It logs nothing: home church and bio are never in a
  log or span (L2-033 AC2).
- **`Member`** — gains `City` (at most 100 characters), `Bio` (at most 300) and
  `Goals` (at most 5 of at most 80), empty for every member until slice 18.2 lets
  them be edited (migration `AddMemberProfile`).

The answer of `GET /api/profile/me` is

| Field            | Type                    | Notes                                                    |
|------------------|-------------------------|----------------------------------------------------------|
| `name`           | string                  | Full name                                                |
| `city`           | string or null          | Null until the member gives one (slice 18.2)            |
| `joinedAt`       | string (ISO 8601)       | When the account was created                             |
| `bio`            | string or null          | Null until the member writes one                         |
| `homeChurch`     | string or null          | Optional, sensitive; shown only to its owner here        |
| `goals`          | string[]                | Up to 5                                                  |
| `interests`      | string[]                | Interest keys (`running`, `strength`, …)                 |
| `upcomingEvents` | `{ eventId, title, startsAt, imageUrl }[]` | Soonest first; `imageUrl` may be null |

The public profile (slice 19.1):

- **`MemberProfilePage`** — routed page for another member, matching the mock
  `pages/profile/member.html`. The route path is not listed in the mock manifest;
  `/members/:id` is proposed, `<TO SUPPLY>` for confirmation.
- **`GetPublicProfileHandler`** — returns `PublicProfileDto` with name, initials, bio
  and interests. It adds `homeChurch` only when `Member.ShowHomeChurch` is true, and
  never includes email (L2-005 AC3). The DTO has no email field by construction.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-005` | `L1-003` | Given a signed-in member, when they open Profile, then it shows their name, initials avatar, city, join date, bio, home church, goals, interests and their upcoming registered events; with no registered events the events area shows an empty state with a link to Events; another member's profile URL shows only that member's public fields (name, initials, bio, interests) and never their email or home church unless that member chose to show it (acceptance criteria 1–3). |

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

The handler reads only the caller's member record and registrations; the page shows every own field and an empty state with a link to Events when nothing is registered (`L2-005`).

![Sequence diagram for member views own profile](diagrams/sequence-view-own-profile.png)

### Behaviour — view another member's profile

The public projection omits email by construction and adds home church only when its owner chose to show it (`L2-005` AC3).

![Sequence diagram for member views another member's profile](diagrams/sequence-view-member-profile.png)
