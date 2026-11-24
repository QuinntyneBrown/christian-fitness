# 0053. Request a booking

## Status

Accepted, 24 November 2026 (slice 17.2).

## Context

The booking dialog (mock `dialogs/request-booking`) asks for a kind, when it suits the member and an
optional message, and its success says "We've started the conversation for you". The design left the
request's storage, delivery, limits and codes to supply.

## Decision

- **Delivery is a direct message.** `POST /api/services/{id}/booking-requests` with
  `{ kind, when, message? }` composes one text ("Booking request: <kind label>", "When: ...", then the
  message) and sends it with the direct-message command of slice 14.1 from the member to the listing's
  professional. No booking table exists: the message is the record, and a request has no status
  (confirming a time happens in Messages). Answer 201 `{ memberId }`; Messages opens
  `/messages/{memberId}`.
- **Kinds** are `one-on-one`, `small-group`, `intro-call`; any other is 400 `validation_failed` on `kind`.
- **Limits** count trimmed text: `when` required, at most 200 (`field_too_long` over); `message` at most
  1,000. The composed text therefore stays under the 2,000 of a message. One table, in
  `RequestBookingValidator` and `validateBooking`.
- **Refusals.** Unknown listing 404 `service_not_found`; a listing that publishes a contact link 409
  `professional_not_linked` (so the card offers Request a booking only without one); a suspended
  professional or the caller's own listing 403 `recipient_unavailable` (ADR 0043, 0052). A suspended
  caller is refused by the session. The dialog shows one sentence for `recipient_unavailable` ("<first
  name> can't take booking requests right now.", no mock) and the mock's `failed` message otherwise.
- **Telemetry.** The command is a class, so its words never print; nothing is logged.
- **Dialog.** Opened by `ProfessionalContact.requestBooking` on both card layouts, imported on first
  use, closed by its ref before Go to messages navigates. Go to messages is a button, not a link, so
  the dialog can close first.

## Consequences

Staff cannot yet list booking requests; that would need a table. No migration is added.
