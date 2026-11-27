# 0118. Delete my account

## Status

Accepted, 27 November 2026. Builds journey 36 (`L2-066` AC4 to AC9 and AC11, `L2-074` AC12);
follows [ADR 0078](0078-personal-data-erasure-and-retention.md), the scheduler of
[ADR 0069](0069-scheduled-work.md) and [ADR 0117](0117-download-my-data.md), which built the
other half of the same design.

## Context

The design ([download and delete data](../detailed-designs/preferences/download-and-delete-data/README.md))
sends `DELETE /api/account` with a body, runs erasure daily or by `cf erase-accounts`, and leaves
open how a daily run keeps the 30-day promise. It closes a deleting member's hub connections with a
new `DisconnectMemberAsync`, checks the confirmation word in a validator although ADR 0078 counts
refused attempts, and leaves a professional's applications and listings `<TO SUPPLY>`. It does not
say how an erased member's messages keep the conversations of others apart, what an audit entry
keeps, what happens to a directory listing the member owns, or what Sign in shows when a restore
fails. The mocks draw Preferences' "Delete account" with `pref__delete`, a secondary button in
danger colours that the button component does not have, and Sign in's deleting notice without the
Google mark and without the form.

## Decision

- **Endpoints.** `POST /api/account/deletion` with `{ "confirm": "delete" }` (204): a body on
  `DELETE` is not dependable through proxies and clients. `POST /api/account/restore` (email and
  password) and `POST /api/account/restore/google` (the identity the Google callback kept) are
  anonymous and answer the session. `GET /api/preferences` now answers `accountEmail`, which the
  dialog names under its title.
- **The word and the rate.** The handler records each attempt before it checks anything
  (`AccountDeletionAttempt`, migration `AddAccountDeletion`), so a wrong word, a staff account and a
  failure all count: five an hour, and the sixth is refused 429 `too_many_attempts` without being
  counted. The word is "delete" in any case with spaces trimmed, on both stacks. A validator could
  not count refused attempts, so there is none. A staff member is refused 403 `staff_account`.
- **At deletion.** In one unit of work: `DeletionRequestedAt` is set, registrations at events that
  have not started and every series place are removed (the places go back; registrations at past
  events stay until erasure), the account's subscription is unsubscribed (and stays so after a
  restore), password resets and data exports go, every session ends and `account.deletion_requested`
  is audited. Then the archive files are deleted, the caller's cookie is signed out, every hub
  connection of the member leaves every chat group (`IChatChannel.LeaveAllAsync`) and the
  deletion-requested email is sent. The sockets are not aborted: a deleting member holds no seat, so
  every hub call of theirs is refused, and no connection of theirs receives a message.
- **While deleting.** The member is left out of profiles, attendee lists, group chats and direct
  chats; their messages show as "A former member"; a reply to their feedback is refused 409
  `member_deleting` (`L2-074` AC12), before anything is sent. Their partner can still read an
  earlier direct thread but not send to it. A past event's going count still includes their kept
  registration. Sign-in by password or by Google is refused 409 `account_deleting` with the
  `account` and `erasesAt`; Sign in shows the notice of mock `sign-in/deleting` in place of Google
  and the form, and restoring audits `account.restored`.
- **Erasure.** `EraseAccountsCommand` runs on every scheduler tick (30 seconds, under its lease),
  at most 10 accounts a tick, oldest first, each in its own unit of work, and the deletion-done
  email goes once it is saved. An account is erased within a minute of its 30 days and never
  sooner; a missed tick's accounts stay due. No `cf erase-accounts` command is added.
- **What erasure keeps for others.** Each erased member gets one new random id that names nobody.
  Their sent messages keep their place in others' conversations under it, emptied (`""`, shown as
  "Message removed" by "Deleted member"); received direct messages, others' read markers of the
  conversation and message reports move to the same id, so each partner's conversation stays one
  thread. Audit entries keep the action and the time, with the member's id replaced by the empty
  id. A directory listing the member owned is released to no owner, not deleted: it describes an
  organisation others follow. Professional applications and service listings are deleted with the
  rest of what the member alone owns (ADR 0078's table), and so are their feedback notes with the
  staff replies kept with them, and the photo and screenshot files.
- **The dialog.** A CDK Dialog loaded on first use from Preferences, with the screen's
  `DATA_SERVICE`; focus starts on "Keep my account". A wrong word marks the field and sends nothing.
  Success closes the dialog by its ref and lands on the front page, signed out.
- **States and components the mocks do not draw.** `cf-button` gains the `danger-outline` variant
  (`btn--secondary btn--danger-outline`, the tokens of `pref__delete`). `cf-sso-notice` gains
  `plain` (the account without the Google mark) and `cf-sign-in-layout` gains `formless` (no form).
  A restore that fails shows Sign in's existing "We couldn't sign you in" alert above the notice,
  which stays. Restoring is a service of the Sign in screen's own (`ACCOUNT_RESTORE_SERVICE`), so
  the initial bundle does not carry it.
- **Admin feedback.** Only the refusal is built; the inbox's "A former member" name for a deleting
  member's note is left to a later change.
- **Privacy address.** The emails name `privacy@christian.fitness`, the app's real address, where the
  mocks say `christianfitness.ca`.
- **Telemetry and settings.** The clock logs how many accounts it erased, never whose. No span,
  metric or log carries an email, a name or a message. No new setting is needed: erasure uses the
  scheduler, the email sender and the stores already configured.

## Consequences

A deleting member disappears at once and comes back by signing in within 30 days. Their partners'
threads stay readable after erasure without naming anyone. A deleting member's open socket stays
open, idle and refused, until the browser closes it. The button's stylesheet stays over its
3.5 kB warning (it was over before). A past event's going count is one too many for up to 30 days.
