# Set privacy and suggestion preferences

## Overview

Christian Fitness is a Christian community for health in body and spirit in the Greater Toronto Area. The preferences subsystem lets a member choose who can see and message them and what is used to suggest events and stories for them (`L1-019`), and so protects their personal data (`L1-013`).

This feature covers the Privacy and Suggestions sections of the Preferences screen (mock `docs/mocks/pages/preferences/`) and, more importantly, how each setting is enforced by the features it governs. The screen, its draft and its save bar are designed in [set email and notification preferences](../set-email-and-notification-preferences/README.md); a privacy or suggestion change uses that save bar (`L2-065` AC8).

- **profile visibility** — who can open a member's profile: Anyone (including visitors who are not signed in), Members (anyone signed in) or Just my groups; Members for a new member
- **shared group** — event chat both members still belong to, including a past or cancelled event; leaving ends that shared group ([ADR 0061](../../../adr/0061-public-profiles-and-privacy.md)). A series chat joins this once series exist (`L2-052`).
- **attendee list** — names or pictures of the members going to an event or series, as the event page's `avatar-stack` draws them ("Michael, Danielle and 140 others")
- **open conversation** — direct conversation in which at least one message has already been sent between the two members
- **suggestion area** — one of Toronto East, Toronto West, Downtown Toronto, Scarborough, North York, Mississauga, Brampton and Durham
- **not-found view** — the screen and the 404 `not_found` answer that an unknown id gives, so a refused profile reveals nothing (`L2-031` AC3)

## Description

### Settings and storage

- **`MemberPreferences`** — the entity of the sibling feature holds `Visibility` (`ProfileVisibility`: `Anyone`, `Members`, `JustMyGroups`), `ShowOnAttendeeLists`, `LetAnyoneMessage` and `Area` (`SuggestionArea`, none until chosen). `DefaultsFor` gives `Members` (AC1) and `LetAnyoneMessage = false` (AC5). The default of `ShowOnAttendeeLists` is not stated by `L2-065`; the mock shows it on, which is `<TO SUPPLY>` until confirmed.
- **Interests** — the Interests toggles are `Member.Interests`, the profile's own list (AC7, `L2-006`). `SavePreferencesHandler` writes them through a new `Member.ChangeInterests`, with the keys of `Interests.All` checked by `SavePreferencesValidator`, as `UpdateProfileValidator` checks them.
- **Home church** — the existing `Member.ShowHomeChurch` remains the single stored choice; Preferences reads and saves it with the other settings. "Show my home church" defaults off, is independent of visibility, and permits disclosure only to signed-in viewers admitted to the profile. Edit profile no longer changes it; existing choices are preserved (AC10, `L2-033` AC5).
- **Screen parts** — the Privacy section composes `radio-group` ("Who can see your profile", three choices with descriptions) and three `preference-row` switches ("Show my home church", "Show me on attendee lists", "Let anyone message me"). The Suggestions section composes `select` ("Your area") and the `chip` library's `interest` toggles with `aria-pressed` and a check mark as well as colour (AC6); `interestLabel` in `@cf/domain` names each key.
- **Telemetry** — no span, metric or log carries a visibility, an area, an interest or a switch's value (AC9, `L2-033` AC2). Handlers that enforce a setting record no reason for a refusal beyond its code.

### Enforcement: who can see a profile (AC2, AC3)

- **`GetPublicProfileHandler`** (existing, `Application/Profiles/GetPublicProfileQuery.cs`) shall read the target's `MemberPreferences` and the viewer. It answers the profile when the viewer is the member, or when the visibility is `Anyone`; `Members` when a viewer is signed in; `JustMyGroups` when the viewer shares a group with the member. Otherwise it throws the same `RefusalException(not_found)` an unknown id does. A member whose account is being deleted is not found ([download and delete data](../download-and-delete-data/README.md)).
- **What is answered** — the authenticated `PublicProfileDto` has name, bio, interests and home church only where `ShowHomeChurch` is set; it never includes email. The anonymous projection has only name, bio and interests, with no church key regardless of the switch (AC3, AC10, `L2-033` AC5).
- **Anonymous access** — `GET /api/public/members/{id}` is `[AllowAnonymous]`, under `public-reads` (issue #80), and answers only an Anyone profile; all other or unknown ids get the same 404. `/members/:id` removes the member guard and chooses public masthead and "Join to message" without a session, or the current member page with one ([ADR 0061](../../../adr/0061-public-profiles-and-privacy.md)).
- **`GroupMembership.ShareAGroupAsync(db, a, b)`** — new helper in `Application/Chat/` beside `ChatMembership`. It checks current membership of both in one event chat, irrespective of past or cancelled event status; leaving ends membership. The profile and messaging rules both call it (AC11).
- **Staff** — the admin console's member screens (`SearchMembersQuery` and the moderation commands) do not read the visibility, so staff see a member either way (AC2).

### Enforcement: who can message a member (AC5)

- **`DirectChat.MayStartAsync(db, sender, recipient)`** — new rule in `Application/Chat/DirectChat.cs`. A conversation may start when the recipient's `LetAnyoneMessage` is on, when the two share a group, or when the conversation is already open (a `DirectMessage` exists between the pair in either direction). Otherwise the answer is `messages_restricted`, a new code in `RefusalCodes`.
- **Handlers that shall read it** — `JoinDirectHandler` and `SendDirectMessageHandler` answer `ChatAnswer.Refused("messages_restricted")` over the hub, as a hub refusal is an answer and never an exception; `GetDirectHistoryHandler` answers 403 ProblemDetails with that code over REST. An open conversation stays open, so its history and new messages are unaffected.
- **Contacting a professional** — `StartProfessionalConversationHandler` and `RequestBookingHandler` (which sends through `SendDirectMessageCommand`) reach a professional's member account. With messaging off by default, every professional would refuse new contact. Whether a published listing's contact is exempt is an open question.
- **Screen** — `PublicProfileDto` gains `messagesRestricted` for a signed-in viewer, so the profile's Message action says that the member only takes messages from people in their groups; the chat page shows the same text when a join answers `messages_restricted`. No mock draws this text yet.

### Enforcement: attendee lists (AC4)

- No attendee list exists in the code: `EventDetailDto` carries only `Going`. The event page mock (`docs/mocks/pages/event-detail/`) draws an `avatar-stack`, and the series designs (`L2-050`, `L2-051`) will draw more. Each query that names or pictures attendees shall exclude members whose `ShowOnAttendeeLists` is off and still count them in going, through `IRegistrationReader`, which shall gain one attendee method so every list applies the rule in one place.
- `GetEventRegistrationsQuery` (staff, `L2-024`) is unaffected: staff still see every member. A host's view of its attendees is not built and no requirement places it yet.

### Enforcement: suggestions (AC6, AC7)

- **`GetHomeHandler`** (existing) suggests the three soonest published events of the categories the member's interests name (`InterestCategories.For`). It shall order events of the member's area and interests first. `Event.Area` is free text of at most 100 characters, not one of the eight suggestion areas, so the match needs a rule (open question).
- **Landing stories** — AC7 asks the landing page to order stories for the member, but `L2-001` AC8 sends a signed-in member from `/` to Home; see Open questions.

### Open questions

- **Messaging a professional or listing.** With "Let anyone message me" off for every new member, `L2-014` and `L2-055` AC6 contact would be refused. An ADR should decide whether a conversation started from a published listing is exempt.
- **Area matching.** Events record a free-text area. Either events gain a suggestion area, or a mapping table relates places to areas; an ADR is needed. How the area, interests and followed listings (`L2-056` AC7) combine in Home's order is not stated.
- **Landing order.** `L2-065` AC7 and `L2-001` AC8 contradict each other for a signed-in member; the requirement needs correcting.
- **Interest list.** The mock lists Running, Strength, Basketball, Nutrition, Mobility, Walking, Retreats and Pickleball; `Interests.All` holds running, strength, basketball, walking-groups, mobility, nutrition, cycling and retreats. Pickleball is missing from the code and Cycling from the mock.
- **Privacy Policy wording.** The policy mock says hosts see the name and email of people registered; no host access exists in the code, and `L2-065` AC4 says only that hosts still see attendees (see [read the Privacy Policy and Terms](../../legal/read-privacy-policy-and-terms/README.md)).

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier. The L2 specification states its requirements as acceptance criteria; the text below condenses those criteria faithfully.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-065` | `L1-019`, `L1-013` | Profile visibility defaults to Members; restricted profiles return not found. Anyone permits anonymous public fields, never email or home church. "Show my home church" defaults off and applies only to admitted signed-in viewers. A shared event chat counts while both belong, including after the event or cancellation. The anonymous endpoint and unguarded page follow ADR 0061. Attendee, messaging, suggestion, save and telemetry rules remain as stated in AC4–AC9. |
| `L2-031` | `L1-013` | 2, 3. Another member's private data shall be refused with 403 or 404 and no data, and guessing ids shall reveal nothing. |
| `L2-033` | `L1-013` | 2, 5. No log, metric or span shall contain personal data; home church shall never be shown or returned anonymously. |

## Diagrams

### System context

Members and visitors reach member profiles and messages in Christian Fitness; each member's privacy settings decide what the others see and who may start a conversation.

![C4 system context: set privacy and suggestion preferences](diagrams/c4-context.png)

### Containers

The Member web app saves the settings through the API; the API's profile, chat and home handlers read them from the database on every request.

![C4 container view: set privacy and suggestion preferences](diagrams/c4-container.png)

### Components

`SavePreferencesHandler` writes `MemberPreferences` and the member's interests. `GetPublicProfileHandler`, the direct-chat handlers, the attendee reader and `GetHomeHandler` read them, with `GroupMembership` deciding whether two members share a group.

![C4 component view: set privacy and suggestion preferences](diagrams/c4-component.png)

### Class structure

`MemberPreferences` holds the visibility, the two switches and the area; the enforcing handlers depend on it and on `GroupMembership`.

![Class diagram: set privacy and suggestion preferences](diagrams/class.png)

### Behaviour — open a member's profile

The handler answers the public fields only when the visibility admits the viewer; any other case is the not-found answer an unknown id gives.

![Sequence diagram: open a member's profile under its visibility](diagrams/sequence-view-profile.png)

### Behaviour — start a direct conversation

Joining or sending to a member who accepts messages only from their groups is refused with `messages_restricted` unless the two share a group or already have a conversation.

![Sequence diagram: start a direct conversation under the messaging setting](diagrams/sequence-start-conversation.png)

### Behaviour — attendee list and suggestions

An attendee list names only the members who show themselves, while going counts everyone; Home suggests the member's area and interests first.

![Sequence diagram: attendee list and suggestions](diagrams/sequence-attendees-and-suggestions.png)
