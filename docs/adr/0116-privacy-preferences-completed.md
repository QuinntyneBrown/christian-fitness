# 0116. Privacy and suggestion preferences, completed

## Status

Accepted, 27 November 2026. Completes journey 34; builds on
[ADR 0115](0115-privacy-and-suggestion-preferences.md), [ADR 0075](0075-public-profiles-and-privacy.md)
and [ADR 0076](0076-home-suggestion-order.md).

## Context

ADR 0115 left two parts of `L2-065` unbuilt: attendee lists (AC4) and a visitor's profile page
(AC13). Checking every criterion of the journey's requirements found four more gaps: Edit profile
still set "Show my home church" (`L2-006` AC4, `L2-065` AC10); a refused profile showed a generic
error, not the not-found view (`L2-065` AC2); a followed listing's events ranked first whether
or not they were new (`L2-056` AC7); and the chat said nothing about `messages_restricted`. Journey
33's `L2-064` AC1 also lacked Preferences on the member's own profile.

## Decision

- **A visitor's profile page.** `/members/:id` is routed twice, as stories are (ADR 0105): first
  for a visitor (`signedOutGuard`, route data `visitor`) under the masthead with the news sections
  and the footer, then inside the member shell. The visitor's page reads
  `GET /api/public/members/{id}` and shows name, initials, bio and interests, with "Join to message"
  leading to Join; it never shows a church, whatever an answer holds. Either page shows the
  not-found view at the profile's address for a 404, which a hidden profile answers as an unknown
  id does; no answer at all is still "This profile didn't load".
- **"Show my home church" is Preferences' alone.** Edit profile has no switch, its request carries
  no `showHomeChurch`, and the API ignores one an older page still sends, so saving the profile
  keeps the choice Preferences made.
- **Attendee lists.** An event's answer gains `attendees`: up to five members going, by name, in
  the order they took their places, leaving out each member who switched "Show me on attendee
  lists" off. `going` still counts everyone. One helper, `AttendeeList`, applies the rule for every
  list that names attendees to members; the register and cancel answers carry it too. The event
  page draws the design system's avatar stack under the count with "Michael, Danielle and 140
  others", the first two by first name and the rest counted (`attendeeLabelOf`). With nobody to
  name, only the count shows. The series page mock draws no stack, so it has none. Staff still see
  every member in an event's registrations. No screen shows a host its attendees, so "the host
  still sees them" has nothing to act on yet.
- **A followed listing's new events.** An event records `PublishedAt` when it is published (a
  series session when it is created). Opening an event's page records an `EventView` for the
  member, once. On Home, an event of a followed listing ranks as followed only when it was
  published after the member followed the listing and they have not opened it. Events published
  before this change have no publish time and never count as new.
- **`messages_restricted` in the chat.** A direct chat whose join is refused with this code says
  "This member only takes messages from people in their groups." under "You can't message this
  member", with no composer.
- **Preferences from Profile.** The member's own profile has Preferences beside Edit profile, as
  the mock draws it.

## Consequences

- The migration `AddEventViewsAndPublishedAt` adds the `Events.PublishedAt` column (empty for
  existing events) and the `EventViews` table. It has not been run against a real database.
- Opening an event writes a row the first time; a second opening at the same moment that loses
  the race is let go.
- `Event.Publish` now takes the time of publishing.
