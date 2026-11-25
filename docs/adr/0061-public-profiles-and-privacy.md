# 0061. Public profiles and privacy

## Status

Accepted, 24 November 2026.

## Context

Preferences offers Anyone, but the member profile route and endpoint currently require a session.
Home church is sensitive faith data, and event chats can outlive their events.

## Decision

- **Anonymous read.** `GET /api/public/members/{id}` is `[AllowAnonymous]` and uses the
  `public-reads` rate limit (issue #80). It returns only `name`, `bio` and `interests` for
  an Anyone profile. An unknown, malformed or non-Anyone id returns the same 404
  `not_found`; the response never contains email or home church, even when sharing is on.
- **Page.** `/members/:id` drops `memberAuthGuard`. Without a session it uses the public
  masthead, the anonymous endpoint and public fields, with a "Join to message" action.
  With a session it uses the member page and authenticated profile endpoint, enforcing
  Anyone, Members and Just my groups visibility. Staff access remains in the admin app.
- **Home church.** "Show my home church" moves from Edit profile to Preferences. It is
  off by default, independent of profile visibility, and permits the church to be shown
  only to signed-in viewers who can see the profile. It is never returned anonymously.
  This supersedes ADR 0038's projection for anonymous viewers and the edit control in
  ADR 0024.
- **Shared group.** Both members must still belong to the same event chat. A past or
  cancelled event still counts while both belong; leaving the chat ends that shared
  group for the pair. The same rule governs profile visibility and new messages.

## Consequences

- Anonymous and authenticated reads need separate projections and authorization; a
  public response cannot reuse a projection that includes a visible home church.
- Existing `ShowHomeChurch` data must retain its value when control of the setting moves
  to Preferences. The old edit-profile request must not change it.
- The public-read limiter's quota and operating details are decided in issue #80.
