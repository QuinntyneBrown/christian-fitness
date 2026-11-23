# 0024. Reinstate members: no note, the earlier note cleared, and the same dialog

## Status

Accepted, 23 November 2026 (slice 27.2).

## Context

Slice 27.2 lets staff return a Flagged or Suspended member to Active (L2-029 AC3), completing the
transition table of ADR 0023. That record left to this slice whether reinstating clears the
moderation note. Audit of staff changes (slice 29.2) is not built.

## Decision

- **`POST /api/admin/members/{id}/reinstate`,** with no body, in the Members staff area. It sends
  one `ReinstateMemberCommand` and answers the member's row. `Member.TryReinstate` moves Flagged
  or Suspended to Active; an Active member is refused with 409 `status_conflict`. The checks of
  ADR 0023 apply unchanged: 404 `member_not_found`, 403 `cannot_moderate_self` (a Flagged staff
  member does not clear their own flag), and 403 `forbidden_role` for a Moderator and a staff
  account.
- **Reinstating asks for no note and clears the earlier one.** The note says why a member is
  Flagged or Suspended; on an Active member it would be a reason for nothing. The history of who
  did what and why belongs to the audit of slice 29.2, which records these commands; until then
  the earlier reason is gone once a member is reinstated, and the dialog says so before it is
  done.
- **Nothing else is restored.** A reinstated member signs in again with their password; the
  sessions a suspension ended stay ended.
- **The same dialog.** Every row now has Moderate. A Flagged member is offered Reinstate (chosen
  first, the milder) or Suspend; a Suspended member only Reinstate, with no choice and no field:
  the dialog says what will happen in an info alert and focus starts on the dialog itself, so its
  name and description are read. Reinstate sends at once; the toast says "reinstated".

## Consequences

- Journey 27 is complete: every transition of the table has a control.
- Slice 29.2 gives reinstating, like flagging and suspending, an audit entry without changing the
  commands; it may then keep the cleared reasons.
