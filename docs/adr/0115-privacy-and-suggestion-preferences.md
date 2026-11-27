# 0115. Privacy and suggestion preferences

## Status

Accepted, 27 November 2026; journey 34 is partly built (see "Not built yet"), and
[ADR 0116](0116-privacy-preferences-completed.md) completes it. Builds on
[ADR 0075](0075-public-profiles-and-privacy.md), [ADR 0076](0076-home-suggestion-order.md)
and [ADR 0114](0114-email-and-notification-preferences.md).

## Context

Journey 34 lets a member choose who sees and messages them and what orders Home's suggestions
(`L2-065`), and makes each choice hold in the features it governs. The design
(`preferences/set-privacy-and-suggestion-preferences`) left one default to supply and one rule
that could not be built as written.

## Decision

- **Defaults.** A member with no saved preferences has: profile for Members, home church not
  shown, on attendee lists, messages from their groups only, no area. "Show me on attendee lists"
  is on by default, as the mock draws it.
- **Where each setting lives.** Visibility, the attendee switch, the messaging switch and the area
  are on `MemberPreferences`. The interests and "Show my home church" stay the profile's own
  (`Member.Interests`, `Member.ShowHomeChurch`); Preferences reads and saves them with the rest.
  An unknown visibility, area or interest is `validation_failed` naming `privacy.visibility`,
  `suggestions.area` or `suggestions.interests`, and nothing is saved.
- **Who opens a profile.** `GET /api/members/{id}/profile` answers the member themselves, any
  signed-in member unless it is Just my groups, and then only a member who shares a group chat;
  otherwise the 404 `not_found` of an unknown id. `GET /api/public/members/{id}`, anonymous and
  under `public-reads`, answers an Anyone profile with name, bio and interests only; a malformed
  or unknown id and a profile that is not Anyone get the same 404.
- **A shared group** is one event with its own chat where both hold a place, whatever the event's
  status, or one series chat both are in. Leaving ends it.
- **Who may start a conversation.** With "Let anyone message me" off, joining, sending and reading
  a conversation answer `messages_restricted` unless the two share a group or the conversation is
  already open. The profile answer carries `messagesRestricted`, and the profile says "<first
  name> only takes messages from people in their groups." in place of Message.
- **Listing owners take messages from anyone.** The design asks the server to verify, per request,
  that a conversation was started from Message on a published, claimed listing. The hub's methods
  carry only a member id, so that context cannot be verified. Instead, a member who owns a
  published directory listing, or a service listing, may be written to by anyone: the same people
  who could open the listing and press Message. Booking requests reach them the same way.
- **The suggestion area of an event** is one of the eight areas or none, which is GTA-wide. Staff
  choose it in the event editor, which sends `suggestionArea` only when one is chosen; one off the
  list is `suggestion_area_invalid`. Every existing event is GTA-wide until staff choose.
- **Home's order** is a pure function (`HomeSuggestions.Rank`) with one test case per row: the
  member's area or GTA-wide before another area; within each, a followed listing's events, then
  those matching an interest, then the rest; ties by date. With no area chosen, the first step is
  skipped. Every published event to come that the member is not going to is a candidate, so an
  event matching no interest can now be suggested, last.
- **Interest toggles** show a check mark as well as colour while pressed.

## Not built yet

Both are built now; ADR 0116 records how.

- **Attendee lists.** No screen names or pictures an event's attendees to other members; only
  counts are served. "Show me on attendee lists" is stored, and the first feature that lists
  attendees must leave out members who switched it off (`L2-065` AC4).
- **A visitor's profile page.** The API serves an Anyone profile to a visitor; `/members/:id` in
  the member app still sits behind the member guard, so a visitor is sent to sign in
  (`L2-065` AC13).

## Consequences

- Two members who share no group can no longer start a conversation by default. Tests of how
  messages travel switch the recipient's "Let anyone message me" on first.
- Existing events are GTA-wide until staff choose an area in the event editor ("Suggestion area",
  where no choice is GTA-wide), so the area step orders nothing for them yet. A series' sessions
  have no area choice of their own.
