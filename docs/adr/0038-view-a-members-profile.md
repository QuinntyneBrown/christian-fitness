# 0038. View a member's profile

## Status

Accepted, 23 November 2026 (slice 19.1).

## Context

L2-005 AC3 says another member's profile URL shows only name, initials, bio and interests, and never
email or home church unless its owner chose to show it. The mock `profile/member` also draws a Message
button, goals, "Going to" and Groups, which AC3 does not allow or which belong to later slices.

## Decision

- **`GET /api/members/{id}/profile`** answers `{ name, bio, interests }` plus `homeChurch` only when
  `ShowHomeChurch` is true; a hidden church is an absent key, not null. An unknown or malformed id is 404
  `not_found`. The DTO has no email, city, goals or join date field.
- **Route `/members/:id`**, lazy `MemberProfilePage`, binds `PROFILE_SERVICE` on its own providers.
- **Left out of the mock:** Message (slice 14.1), Groups (12.3), goals, city, join date and "Going to"
  (not public fields under AC3). No screen links here yet; chat and event screens will.
- `ProfileHero` shows its meta line only when given.

## Consequences

- A refusal or no answer shows one generic "This profile didn't load" message.
