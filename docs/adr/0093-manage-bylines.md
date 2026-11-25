# 0093. Manage bylines

## Status

Accepted, 25 November 2026 (journey 21, issue 171). Builds on ADR 0020, ADR 0023, ADR 0025,
ADR 0064, ADR 0090 and ADR 0091.

## Context

Journey 21 builds the first Stories code: the console's Bylines screen (`L2-077`), its editor
and its Remove dialog, at the head of the news journeys (writing and publishing stories comes
next, in issue 172). No story code existed: no `Story`, no `Byline`, no Stories area in the
admin app and no `stories` staff area in the API. The requirement, design and mocks left these
open:

- "How many stories use it" and "no story can lose its byline" need stories, which the next
  journey writes. AC5 (an edit shows on every story) and AC8 (the editor's Byline field) need the
  story pages and the editor.
- The Bylines page sits under Stories (`/stories/bylines`) and its mock has a "Stories" back
  link, but there is no Stories list yet.
- AC2 says a second seed run "changes no byline an Admin has edited or removed"; the design's
  "only when the byline table is empty" would put the five back once an Admin removed them all.
- The design names the commands and codes but not the name's length, the field codes, how a name
  "without regard to case" is compared and stored, where the photo is served, or the toasts'
  words for an added byline.

## Decision

- **Navigation.** `ADMIN_AREAS` gains `stories`, "Stories", at `/stories`, in the Publish group
  (ADR 0091), which therefore now shows for an Admin. Until the Stories list exists, the
  `stories` route redirects to `stories/bylines`, and the Bylines page draws no "Stories" back
  link, which would lead to itself; the journey that builds the list adds both back. `canManage`
  keeps `stories` from a Moderator, so the guard shows "Admins only" at the address asked for.
- **Staff area.** `StaffArea` gains `Publishing` for the `stories` route segment (the design's
  name; the newsletter joins it later), which `StaffAccess.Allows` opens to Admins only, so a
  Moderator is refused 403 `forbidden_role` (`L2-077` AC10).
- **Endpoints.** Under `api/admin/stories/bylines`, each sending one MediatR request: `GET` (every
  byline in name order), `POST` (add, 201), `PUT {id}`, `DELETE {id}` (204) and `POST photos`
  (201 with the key).
- **Model.** `Byline` in `ChristianFitness.Domain/News`: `Id`, `Name` (trimmed, up to 80
  characters), `NameKey` (the trimmed name lower-cased invariantly, unique), `Bio` (trimmed, up to
  200 characters, required), `PhotoKey` (optional) and `CreatedAt`. Case is the only thing ignored:
  "Zoë" and "Zoe" are two names. The list is ordered by `NameKey`, then `Id`.
- **Stories, ahead of their journey.** A minimal `Story` (`Id`, `BylineId`, `Headline`,
  `CreatedAt`) is added so that each byline's count is real and the database keeps every story's
  byline: `Story.BylineId` is a required foreign key with `ON DELETE RESTRICT`. Nothing in this
  journey writes a story; the tests put them in the store. Issue 172 extends the same entity and
  table with the editor's fields rather than creating its own.
- **Refusals.** 400 `validation_failed` with `fieldCodes`: `name_required`, `name_too_long`,
  `bio_required`, `bio_too_long` and `photo_invalid` (on `photoKey`, a key not stored, or on an
  upload that is not a JPEG, PNG or WebP up to 5 MB, judged by its first bytes as in ADR 0025).
  409 `byline_name_taken` when another byline's `NameKey` matches; the dialog marks the name with
  "A byline called <name> already exists". 409 `byline_in_use` when any story holds the byline,
  checked in the handler's unit of work, and again by the database's restriction, whose
  `DbUpdateException` is answered with the same code; likewise a name race on the unique index is
  answered `byline_name_taken`. An unknown byline is 404 `not_found`.
- **Answers.** A byline is `{ id, name, bio, photoKey, stories }`, `stories` the number of
  stories that hold it (a number, worded by the app: "Not used yet", "1 story", "<n> stories").
  The list is `{ bylines }`. Bylines are a staff-kept list of tens, so it is not paged.
- **Seed.** One `BylineSeed` adds Naomi Clarke, Priya Raman, Marcus Bell, Pastor Ruth Adeyemi and
  CF Team with the mocks' bios and fixed ids, only when no byline exists and no audit entry names a
  `Byline`. So it runs once on a new deployment, and never again once an Admin has changed,
  removed or added any byline (audit entries are never deleted, ADR 0023).
- **Photo.** Chosen in the dialog, uploaded at once and saved with the byline by its key (as the
  listing photo is, ADR 0090), through `IImageStore`. No screen of this journey shows it: the table
  draws initials as the mock does. The story page that shows a byline's photo serves it.
- **Remove.** The page knows each byline's count. With none, Remove asks "Remove <name>?" with
  "Keep it" and "Remove byline"; with any, the dialog reads "Can't remove <name>", says how many
  stories use it, offers only Close and sends nothing. A 409 `byline_in_use` (a story took it while
  the dialog was open) shows "A story now uses this byline" and keeps the dialog.
- **Toasts.** "Byline saved" with "Admins can choose <name> in the story editor." after Add and
  Edit, and "Byline removed" with "<name> is no longer in the story editor's list.", as the
  `saved` and `removed` mocks draw them. After a save the page shows the answer in place (ADR
  0091); after a removal it drops the row.
- **Audit and telemetry.** `byline.created`, `byline.updated` and `byline.removed`, recorded as
  `Byline` with its id, and `byline_photo.uploaded` against the key's GUID; no log, span or metric
  carries a name or bio.

## Consequences

- Issue 172 extends `Story`, adds the Stories list (and with it the nav's target and the back
  link) and the editor's Byline field in name order, and proves `L2-077` AC5 and AC8.
- A Byline's photo is stored but not shown until a story page shows bylines.
- An Admin's navigation now has a Publish group with Stories.
