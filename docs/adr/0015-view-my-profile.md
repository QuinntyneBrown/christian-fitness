# 0015. View my profile: one own-profile endpoint, a registration reader that answers none yet, and a screen-scoped client

## Status

Accepted, 23 November 2026 (slice 18.1).

## Context

Slice 18.1 shows a signed-in member their own profile (L2-005 AC1) and an empty state with a link
to Events when they are going to nothing (AC2). The public profile (AC3) is slice 19.1 and editing
is slice 18.2.

It runs early, beside the event slices: the accounts and sign-in it needs are merged, but no event,
registration or group chat exists yet. `Member` holds a name, email, home church, interests and
join date; city, bio and goals have no column, since only the Edit profile dialog (18.2) sets them.

The mocks drew three things no requirement asks for: a handle under the name (`@gracet`), a city
for a brand-new member (Join does not ask for one), and a reference ("CF-P5R3") in the profile's
own error state, which L2-043 shows only for a 5xx, and a 5xx opens the server-error screen
instead (L2-043 AC4). They also draw the Edit profile button, the empty bio's "Add a bio" action
and a Groups section.

## Decision

- **One endpoint, `GET /api/profile/me`**, sends one `GetOwnProfileQuery` and answers
  `OwnProfileDto`: `name`, `city`, `joinedAt`, `bio`, `homeChurch`, `goals`, `interests` (keys) and
  `upcomingEvents` (`eventId`, `title`, `startsAt`, `imageUrl`). A field the member has not given
  is `null` (or an empty list). The URL takes no member id: the member is the session's, so no
  request can read another member's own profile. A visitor is refused 401 by the fallback policy.
- **`Member` gains `City` (100), `Bio` (300) and `Goals` (5 of 80) now**, empty for everyone
  (migration `AddMemberProfile`), so this screen shows every field AC1 lists and slice 18.2 only
  adds the edit. The lengths are L2-006 AC3's.
- **Upcoming events come from `IRegistrationReader`** (Application), asked with the member's id
  and `now` from `TimeProvider`. Until registration exists its implementation is
  `NoRegistrationsYet` (Infrastructure), which answers none; slice 6.1 replaces it with a query of
  upcoming, published events the member registered for, soonest first. The API tests prove the
  handler passes the reader's events through with a fake reader; the screen's specs prove the
  list with the fixture.
- **The screen** is `ProfilePage` at `/profile`, a lazy child of `MemberShell`. It binds
  `PROFILE_SERVICE` on its own `providers`, so the client is created with the screen and goes with
  it, and stays out of the initial bundle. Its states are the mock's: skeletons while loading
  (`aria-busy`), the profile, an `empty-inline` sentence for each empty section, and for a 4xx or no
  answer "Your profile didn't load" with Try again (asks again in place) and Back to home. A 5xx is
  the server-error screen's (L2-043 AC4).
- **Dates are read in Toronto time** (`America/Toronto`), where the community meets: "Member
  since January 2026", or "Member since today" on the day the member joined, as the empty mock
  says; an event's day is "Sat, Apr 18". Interest keys are shown as the Join screen's labels.
- **The header gains the profile avatar** (`profile-button`): the member's initials, labelled
  "Your profile", `aria-current="page"` on Profile. A plain click moves the router without a
  reload, as the admin navigation does (ADR 0011). It shows at every viewport, as the design
  system draws it; the bottom bar comes with the first of the other destinations.
- **The mocks were corrected before code**: the handle was removed (no requirement defines one),
  a new member's profile shows no city, and the error state no reference.

## Consequences

- Every member sees "Not going to anything yet." with Browse events until slice 6.1 changes the
  reader; nothing on the screen changes then.
- "Browse events" (`/events`) and a "Going to" row (`/events/{id}`) are links to screens slices 4.1
  and 5.1 build; until then they open the not-found screen. They load the whole document, as the
  error screens' links do.
- The Edit profile button and "Add a bio" come with slice 18.2, which builds the dialog they open;
  the Groups section comes with group membership (slice 12.3). The mock keeps them, as the end
  state.
- The member app's warning budget for the initial bundle goes from 260 kB to 263 kB (the error
  budget stays 275 kB). A `--stats-json` diff of `main` against the base put 2.3 kB of the growth in
  `@angular/core`: the first component that declares `providers` brings Angular's providers
  feature into `main`, where core lives. Binding the client in `app.config.ts` instead would have
  cost 0.2 kB but kept a screen's service alive for the whole session, against AGENTS.md's "scope
  state to its use"; every later screen's services reuse what is now paid for.
- The shell asks `GET /api/session` a second time, after the guard, for the avatar's initials, as
  the admin shell does; a failure leaves the avatar without letters.
