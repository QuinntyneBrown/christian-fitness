# 0032. Register for an event: one registration per member and event, with chat and the full-event page left to later slices

## Status

Accepted, 23 November 2026 (slice 6.1).

## Context

L2-011 asks a member to register for an event (AC1), refuses a full event (AC2, AC3), makes a repeat
registration idempotent (AC4), records a paid event's registration as reserved with a page that states
how to pay (AC5) and refuses a suspended member (AC6). L2-010 AC1 and AC3 ask the detail screen for the
registration action, "You're going" and a link to the event's group chat. The slice list gives the full
event and the simultaneous-request rule to slice 6.2 and chat membership to slices 12.x; no
conversation exists yet, and the web app has no Messages route to link to.

## Decision

- **`Registration`** is an entity of its own (event, member, status `Confirmed` for a free event or
  `Reserved` for a paid one, created at), with a unique index on (event, member). Going is the count of
  a published event's registrations; `NoRegistrationsYet` is replaced by a reader over them.
- **`POST /api/events/{id}/registrations`** sends one command and answers the event as the detail read
  does (200), whether the registration is new or already there (AC4 changes nothing). Refusals:
  404 `event_not_found` (unknown or unpublished), 403 `account_suspended` (AC6, checked on the stored
  status, as the session may outlive a suspension), 409 `event_full` (AC2).
- **`GET /api/events/{id}`** gains `registration`: `confirmed`, `reserved` or `null` for the caller.
- **Slice 6.1 covers L2-011 AC1 (without the group chat), AC2 (the API refusal only), AC4, AC5, AC6**
  and L2-010 AC1 and AC3 (without the chat link). Slice 6.2 adds the "This event is full" page and
  the last-place race; slice 12.3 adds group membership and the chat link. The mock's group chat
  button and avatar stack stay in the mock for those slices.
- **Paid copy.** No requirement words the payment instructions, so the page says "Your spot is
  reserved. Pay the Christian Fitness team at the event; online payment is not available yet." until
  the team supplies the real words. The mock states `reserved` and `failed` were added for this.
- **Failure.** Any failure of the request shows a generic "We couldn't register you" message above the
  button, which stays usable; the screen branches on no code in this slice.

## Consequences

- `IAppDbContext` gains `Registrations`; a migration adds the table.
- The member's profile "upcoming events" and "events attended" counts now read real registrations.
