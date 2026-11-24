# 0054. Edit a listing

## Status

Accepted, 24 November 2026 (slice 23.1).

## Context

The design (admin-services, edit and remove listings) left the edit's field rules, its refusal code and
the screen's behaviour to supply. The mock `listing-editor` is an "Add listing" drawer with a checkbox and
a Massage category, and the Manage Services mock draws a "Live listings" table with Edit on each row.

## Decision

- **Endpoints, Admins only.** `GET /api/admin/services/listings` answers `{ total, listings }`, the live
  listings in name order, at most 50 with a true total, each with its fields and the contact link itself
  (`contactUrl`, or null) so the editor can show it. `PUT /api/admin/services/listings/{id}` replaces
  every editable field and answers the listing as saved. Both sit under `api/admin/services`, whose
  policy admits Admins only (ADR 0020): a Moderator gets 403 `forbidden_role`.
- **Fields and rules.** Name (the name as members read it, at most 100 like a member name), role (80),
  category (one of the five, exact name), where (80), price (60), credentials (200), about (300), all
  required and counted trimmed; contact link optional (blank clears it), an absolute http or https
  address of at most 2,000 characters with a host and no credentials (the rule of ADR 0052, now one
  method on `ServiceListing`). Each refusal is 400 `validation_failed` with `fieldCodes` by field
  (`name_required`, `name_too_long`, `category_invalid`, `contact_link_invalid`, and so on); sentences
  never repeat a value. The member app's names for the fields stay: the API's `price` is the mock's Rate.
- **Missing listing.** 404 `service_not_found`, the code of ADR 0051; no new code.
- **Audit.** `UpdateListingCommand` is an `IAuditableCommand` named `listing.updated`; the entry is the
  actor, the action, `ServiceListing`, the id and the time, as for every staff change (ADR 0023), so no
  text is kept. The command is a class, so its values never print; nothing is logged.
- **Mock.** The mock gains hand-written states `listing-editor/edit` (title "Edit listing", the five real
  categories, a Contact link field, no verification checkbox, Cancel and Save changes) and
  `edit-invalid` (a bad contact link). `default`, `invalid`, `busy` and `failed` remain the Add listing
  drawer, which no slice builds yet. The busy and failed states of the edit reuse the event editor's
  words ("Saving…", "Couldn't save the changes").
- **Screen.** The Live listings table uses the library `table` with Edit on each row; the page loads the
  queue and the listings together (one loading and one error state, as the mocks draw). The editor is a
  CDK Dialog rendering the `drawer`, imported on the first Edit. A saved change shows the "Changes
  saved" toast and reloads the list with its rows kept, so focus returns to the row's Edit. A listing
  found gone closes the editor, says so in a toast and reloads. The table shows no Add listing or
  Remove control: Add listing has no requirement and Remove is slice 23.2; the empty state therefore
  has no action. Avatar initials follow the library component, not the mock's hand-written ones.
- **Members** see the change on the next read of `GET /api/services`, which already serves the stored
  fields; nothing in the member app changes.

## Consequences

An edit is a full replace, so two staff editing at once overwrite each other (last write wins); the audit
trail shows who saved last. The name is editable here, so it can differ from the member's account name.
No migration is added.
