# 0024. Edit my profile: an owner-only write by member id, one rule table in both stacks, and a CDK Dialog composed from the library and loaded on first use

## Status

Accepted, 23 November 2026 (slice 18.2).

## Context

Slice 18.2 lets a signed-in member edit their name, city, bio, home church, goals and interests in
a dialog opened from Profile (L2-006). Slice 18.1 (ADR 0015) built the screen and gave `Member`
its city, bio and goals columns, with L2-006 AC3's limits, empty for everyone.

Four things were open. The design left the refusal code for another member's profile
`<TO SUPPLY>` (AC5), and the only profile endpoint, `GET /api/profile/me`, names no member, so no
request could even ask to change someone else's. The mock had no control for AC4's home church
visibility, and its hint ("Only shown on your profile") contradicted it. The mock's only refusal
was a cleared name, though AC3's limits can be broken in the dialog too. And this is the member
app's first dialog: CDK was not installed, and the initial bundle stood at 261.59 kB against a
263 kB warning budget.

## Decision

- **The write is `PUT /api/members/{memberId}/profile`**, the profile as a resource of its member,
  and sends one `UpdateProfileCommand` with the route's id. Its handler refuses any id that is not
  the session's member with HTTP 403 and code `forbidden`, before it reads or writes anything, and
  answers the same for an id that names nobody, so the answer reveals nothing (L2-006 AC5,
  L2-031 AC3). The code is the one the fallback and staff policies already give a 403, so a
  client sees one code for "not yours". A valid change answers 200 with the saved `OwnProfileDto`,
  so the screen shows what the server stored, trimmed and all (AC2).
- **`OwnProfileDto` gains `memberId` and `showHomeChurch`**, so the screen knows which URL to
  write and the dialog opens with the current choice (AC1). Reading stays at `/api/profile/me`.
- **`Member.ShowHomeChurch`**, false for every member (migration `AddHomeChurchVisibility`), is
  set only by the dialog's "Show my home church to other members" checkbox, unchecked by default
  (AC4). The public profile (slice 19.1) reads it; nothing shows another member's profile yet.
  The church field's hint says "Hidden from other members unless you show it".
- **One rule table, in both stacks**, as Join's (ADR 0008): name required and at most 100
  characters, city at most 100, home church at most 120, bio at most 300, at most 5 goals of at
  most 80 characters each, interests from the list. Lengths are counted after trimming; a blank
  city, home church or bio is stored as none, and blank goal lines are dropped before counting.
  `UpdateProfileValidator` refuses with `field_too_long` for any length and `too_many_goals` for
  the count (AC3); with both, `field_too_long` wins, as it already wins over
  `validation_failed`. `validateProfile` in `@cf/domain` checks the same rows before sending, so
  the dialog names each field (mock `invalid`, `invalid-limits`; AC6). A refusal from the server
  shows the generic "Some of your changes weren't accepted" (mock `refused`); no answer, or a 5xx,
  shows "We couldn't save your changes" (mock `failed`), since the server-error screen is only for
  a failed GET (ADR 0006). Either way the dialog keeps every value (AC7).
- **The dialog is a CDK Dialog, loaded on first use, composed only from `@cf/components`.**
  `@angular/cdk` joins the frontend at the version slice 10.1 uses (`^22.3.0`).
  `edit-profile-dialog.ts` is the only file that imports `@angular/cdk/dialog`; it exports
  `EditProfileDialog` and `openEditProfileDialog`, and `ProfilePage` imports that file with
  `import()` the first time Edit profile or "Add a bio" is chosen, so neither the CDK nor the
  dialog's controls are in the screen's chunk. `openEditProfileDialog` passes the screen's
  `Injector`, so the dialog uses the screen's `PROFILE_SERVICE`, and `ProfilePage` closes the
  dialog by its ref when the screen is destroyed. The dialog renders the library's `cf-dialog`
  shell (ADR 0017) with `cf-form-layout`, `cf-text-field`, `cf-checkbox`, `cf-textarea`,
  `cf-interest-list` and `cf-interest`, `cf-alert` and `cf-button`, inside one `<form>` so Enter
  in a field submits. Following the shell's contract, it opens with no CDK backdrop (the shell
  draws the scrim), `ariaLabelledBy` set to the title's id, `ariaModal`, the container sized to
  the viewport so the element named by the title is where the dialog shows, focus starting in
  Full name and returning to the opener, and `disableClose`: Escape (from the ref's
  `keydownEvents`), Close and the scrim all go through the dialog's `dismiss`, which ignores them
  while a save is on its way. While saving, Cancel is disabled and Close stays enabled but does
  nothing, as the mock's `busy` state and the design system's dialog page show.
- **The member app's initial budget rises to 280 kB (warning) and 290 kB (error)**, as slice
  10.1 raised the admin app's. Measured with a `--stats-json` diff against `main`: the dialog's
  chunk is lazy (75.7 kB), but the parts of `@angular/core` that CDK Dialog needs to create a
  component in a portal (view queries, `afterNextRender`; about 13 kB) and RxJS's async scheduler
  (about 3 kB) are bundled with the rest of their modules, which `main` already holds; the
  library textarea's `linkedSignal` adds about 1 kB. The initial total goes from 261.59 kB to
  277.05 kB, past the old 275 kB error budget. The cost is paid once: every later dialog in the
  member app reuses it. The previous draft of this slice avoided it with the platform's modal
  `<dialog>`, but that duplicated the library's dialog shell and departed from AGENTS.md's CDK
  Dialog rule; the library-first mandate and the CDK rule now decide it.
- **No new presentation component.** `cf-profile-hero` gains an action slot for Edit profile, and
  the empty About section's "Add a bio" is a `cf-button` with the `link` variant, since it opens
  a dialog rather than going anywhere (the mock's `text-link` button became `btn btn--link`).

## Consequences

- `@angular/cdk` is a dependency of the frontend; a later dialog or drawer reuses it and the
  part of `@angular/core` now in `main`.
- The dialog closes with the screen, so it cannot outlive a navigation.
- A member's own id is in the profile answer. Ids are opaque version-7 GUIDs, and the session
  answer already carries the same id.
- A request to another member's profile with an invalid body is refused 400 by the validation
  behaviour before the handler can say 403; either way nothing changes.
- Until slice 19.1 the visibility choice is stored and shown back to its owner only.
