# 0025. Edit an event: one body for create and edit, a going count behind the reader, an optional image kept by key and a file-field component

## Status

Accepted, 23 November 2026 (slice 10.2).

## Context

Slice 10.2 lets staff edit an event, shows the server's field refusals on the fields, and takes the
event's image (L2-022 AC3, AC4, AC7 to AC10). The design left `IImageStore` "chosen in 10.2" and
said `image_required` joins the create rules then. Three things were missing: the event editor mock
has no image field and the design system has no file input; the mock's edit state offers "Move to
drafts", which no requirement covers; and there is no `Registration` yet (slice 6.1), so "the number
going" has nothing to count.

## Decision

- **One body, two commands.** `EventFields` is the editor's fields (title, category, Toronto date and
  time, place, area, price in cents, capacity, summary and an optional `imageKey`). `CreateEventCommand`
  and `UpdateEventCommand` both carry it, and one validator, `EventFieldsValidator<T>`, holds the rules
  and codes of ADR 0021. `PUT /api/admin/events/{id}` answers 200 with the `AdminEventDto`; an unknown
  id answers 404 `not_found`; `GET /api/admin/events/{id}` answers the editor's values as
  `AdminEventDetailDto` (the Toronto date and time, not the instant). Editing never changes the status:
  publishing is slice 11.1.
- **A start in the past.** Creating refuses one (`start_in_past`). Editing refuses it only when the
  date or time changed, so staff can fix the place of an event that has begun. The handler decides,
  since only it has the stored start, and refuses with the same `validation_failed` and `fieldCodes`
  as the validator.
- **Going comes from the reader.** `IRegistrationReader` gains `GoingAsync(eventId)`; the stand-in
  `NoRegistrationsYet` answers 0 until slice 6.1 replaces it. Lowering capacity below it is refused
  with 409 `capacity_below_going`, which the editor shows on Capacity. The acceptance test replaces the
  reader with one that answers a number, as ADR 0022 does for member counts.
- **The image is optional and kept by key.** `POST /api/admin/events/images` takes one multipart
  file (`file`), checks its first bytes (JPEG, PNG or WebP, never the name or the content type the
  client claims) and its size (5 MB), saves it through `IImageStore` and answers 201 with
  `{ imageKey }`; anything else is 400 `validation_failed` with `fieldCodes.image` = `image_invalid`.
  Create and edit send the key; an unknown key is the same refusal. `image_required` is not added:
  L2-022 AC2 does not list a missing image as a refusal, and every event before this slice has none.
  Uploading is an audited staff change (`event_image.uploaded`, record type `EventImage`).
- **Storage.** `FileSystemImageStore` keeps each image as `{key}` in the directory named by the
  setting `Images:Directory` (documented in `docs/operations`); a key is a new GUID plus the extension
  its signature gave, so no client text reaches a path. An image uploaded and never saved stays on
  disk; a sweep of unreferenced images is out of scope until storage is a concern. Anyone may read one:
  `GET /api/events/images/{key}` is `[AllowAnonymous]` and serves it with its type, `nosniff` and a
  one-year immutable cache, since the landing page and member events show them.
- **The editor's states.** Edit opens from the table's Edit action, which loads the event by id (the
  dialog shows the loading skeleton from the drawer, and a failed load closes it with a toast).
  Invalid shows each `fieldCodes` entry on its field with `aria-invalid` and an error summary; failed
  is a generic alert; both keep what was typed. The mock's "Move to drafts" is dropped: no requirement
  moves a published event back to draft.
- **A `file-field` component.** The image field needs a file input, which the design system lacks. It
  is added once, as design-system page `file-field` and library component `file-field/`: a native file
  input hidden beside a "Choose image" button, the chosen name and Remove, with `field__hint` and
  `field__error` as the other fields. `FileField` emits the chosen `File`; the dialog uploads it, since
  a component takes no service.
- **Edit toast.** "Changes saved" joins the admin toasts (`admin-toast/changes-saved`).

## Consequences

- Slice 6.1 swaps `NoRegistrationsYet` for a real reader; `capacity_below_going` then follows from
  the tests written here.
- Deployments set `Images:Directory` to a writable, persistent path; without it the API stores
  images under `images/` next to the application.
- Images are public by key, and a key is unguessable but not secret; an event's image is not
  personal data.
