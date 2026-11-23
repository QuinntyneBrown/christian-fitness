# 0023. Flag and suspend members: one moderation dialog, a note on the member, refusals by code, and who may moderate whom

## Status

Accepted, 23 November 2026 (slice 27.1).

## Context

Slice 27.1 lets staff flag or suspend a member from the Members screen with a recorded reason
(L2-029 AC1, AC2, AC4). Reinstating is slice 27.2. The design left open the dialog's name and
states (no mock drew a flag, suspend or note control), the code of an illegal transition, how
sessions end, whether staff may flag themselves, and whether a Moderator may suspend an Admin.
Audit of staff changes (slice 29.2) and reports (25.1) are not built; nothing registers for
events before 6.1, and no SignalR connection exists before 12.1.

## Decision

- **Two endpoints under `api/admin/members`,** in the Members staff area, so Admins and Moderators
  reach them (ADR 0020): `POST {id}/flag` with `{ note }` and `POST {id}/suspend` with
  `{ note, confirmed }`. Each sends one command and answers the member's row as the list does,
  now with `note`.
- **The note is the recorded reason.** It is required, trimmed, at most 500 characters, stored on
  the member as `ModerationNote` and answered in the list, where the row shows it under the
  status as text. A later flag or suspension replaces it. It is never logged or put on a span.
  Who changed the status and when is the audit entry of slice 29.2, which applies to these
  commands without changing them.
- **The transition table is the domain's.** `Member.TryFlag` moves Active to Flagged;
  `Member.TrySuspend` moves Active or Flagged to Suspended; anything else changes nothing and
  the handler refuses with 409 `status_conflict`. An id that names no member is 404
  `member_not_found`.
- **A refused body names each field's code** in `fieldCodes`, as events do (ADR 0021):
  `note_required`, `note_too_long`, and for suspending `confirmation_required` when `confirmed`
  is not true.
- **Nobody moderates their own account.** L2-029 AC4 names suspension; flagging oneself is refused
  the same way, with 403 `cannot_moderate_self`, since the code speaks of moderating.
- **Only an Admin moderates staff.** A Moderator who flags or suspends an account that holds a
  staff role is refused with 403 `forbidden_role`, the code a role already answers with
  (ADR 0020): a Moderator must not be able to lock the Admins out.
- **Suspending ends every session in the same save,** through `ISessionRevocation` (ADR 0014),
  which removes the member's rows of `Sessions`, member app and admin app alike, and removes any
  pending admin sign-in. A suspended member is refused at sign-in already (L2-004 AC4); staff
  sign-in now refuses a suspended account the same way, 403 `account_suspended`, after the right
  password. The Staff sign in screen shows its existing "We couldn't sign you in" for it.
  Refusing registration (L2-011 AC6) is slice 6.1's, and closing live connections 12.1's.
- **One dialog, "Moderate a member"** (mock `dialogs/moderate-member`): a CDK Dialog rendering the
  library's dialog, loaded on the first Moderate. Every row that can be moderated has one action,
  "Moderate", named after its member; a Suspended row has none until 27.2 adds Reinstate. For an
  Active member the dialog offers Flag (chosen first, the milder) or Suspend as radios; for a
  Flagged member only suspension, and its title says so. The note is required; suspending also
  needs the confirmation checkbox. The dialog checks both before sending and names each in an
  error summary; while the answer is on its way the fields hold still and Escape, Close and the
  scrim wait. It closes with the changed member; the page shows a toast ("Priya Nair flagged")
  and loads the list again.
- **Refusals in the dialog, by code:** `cannot_moderate_self` and `forbidden_role` each have their
  sentence; `status_conflict` and `member_not_found` say the member changed and to close and look
  again; anything else is "Couldn't save the change", with the note kept.
- **The library's table gains two things:** a row can have no action (`noAction`), and a custom
  cell can carry a muted second line (`sub`), which the status cell uses for the note.

## Consequences

- Slice 27.2 adds Reinstate to the same dialog and transition table, and decides whether it
  clears the note.
- Slice 25.1's report banner can open this dialog for its Suspend.
- A suspended Admin cannot use the admin app; reinstating them needs another Admin, or `cf seed`.
