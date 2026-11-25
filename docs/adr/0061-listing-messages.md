# 0061. Listing messages go to the owner

## Status

Accepted, 24 November 2026.

## Context

L2-055 opens a direct conversation from a listing, but a conversation is between two members
(ADR 0043). An organization, company or ministry is not itself a member. L2-065 also defaults
"Let anyone message me" to off, which would otherwise prevent a member outside the owner's groups
from contacting a professional through a listing.

## Decision

- The recipient is the listing's owner; for an organization, company or ministry this is the member
  who claimed it. The rule applies to published listings in both Directory and Services.
- A published listing with no owner, including a staff-managed or unclaimed listing, hides Message.
  Its published website or contact is offered where available; if neither exists, no contact action
  is invented. A request to start a conversation through an ownerless listing is refused with
  `listing_unreachable`. Unknown or unpublished listings retain their not-found behaviour.
- A member starting a conversation through Message on a published, claimed listing is exempt from
  the owner's "Let anyone message me" setting. Publication is the owner's choice to be contactable
  through the listing. Other attempts to start a conversation remain subject to L2-065; replies,
  blocking, suspended or unavailable members and self-contact retain the ordinary rules.
- The server verifies the published listing and its current owner when applying the exception; a
  member id alone is not evidence that the conversation was started through a listing. Since
  opening a direct conversation stores nothing (ADR 0043), the listing context must also accompany
  the first send and be checked there. Once a conversation exists, the normal rules for an open
  conversation apply.

## Consequences

- L2-014, L2-055 and L2-065 describe the same exception and the no-owner refusal.
- ADR 0053 describes the existing Services slice; its contact-link precedence and
  `professional_not_linked` stand-in must be reconciled with this decision when the behaviour is
  built. This ADR does not decide whether Services and Directory use one record or how claims work.
- The profile mock includes the no-owner state. No messaging behaviour is implemented by this ADR.
