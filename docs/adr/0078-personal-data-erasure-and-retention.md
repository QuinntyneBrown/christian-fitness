# 0078. Personal data: hard erasure, bounded retention and durable unsubscribe links

## Status

Accepted, 24 November 2026. This decision describes work to be built, not behaviour already deployed.

## Context

Members can download their data or request deletion (`L2-066`). The Privacy Policy must match
what the system actually does (`L2-067` AC8). The grace period, shared conversations, operational
records and unsubscribe links need explicit rules before those features are built.

## Decision

- **Deletion and erasure.** A request hides the account and ends sessions immediately; it can be
  restored during the 30-day grace period. At 30 days the scheduled erasure deletes the `Member`
  row and data belonging only to that member, including profile, preferences, follows,
  registrations, subscriptions, images, suggestions and feedback. File copies and export archives
  are removed too. The email can then join as new.
- **Messages.** From the request, group and direct messages authored by the deleting member show
  the author as "A former member". At erasure, their text is erased in place, the author is
  "Deleted member", and the message reads "Message removed". The row remains to preserve the
  thread. Messages received from others remain intact for those other people; the deleting member
  cannot access them. Detach erased member identifiers from retained messages and read markers.
- **Download.** The private .zip contains `README` and one JSON file each for profile, preferences,
  registrations, follows, messages, feedback and subscriptions. Suggestions and legal acceptance
  belong in the profile section. Messages contain only those sent by the requesting member, with
  the display names of the other participants, not their email addresses, ids, profiles or messages.
  The authenticated link lasts seven days.
- **Audit.** Amend [ADR 0023](0023-audit-staff-changes.md): auditable member commands record the
  member's id as actor just as staff commands do. At erasure remove that id from retained audit
  entries, including any record identifier that identifies the deleted member; retain the
  remaining action and time for the period below. Only Admins can read the trail through
  `cf audit`; Moderators and ordinary members cannot.
- **Deletion attempts.** At most five deletion attempts per member per rolling hour, including
  invalid and refused attempts; the sixth and subsequent attempts receive HTTP 429
  `too_many_attempts`. The limit must not rely on the request succeeding.

### Retention

The scheduled work in issue #77 purges due records at least daily. Periods start at the events
below; account erasure takes precedence for data belonging only to the member. Retained shared
records must not retain an erased member's identity or erased message text.

| Data | Retention and disposition |
|---|---|
| Member account and exclusively owned data | Erase after the 30-day deletion grace period; restore cancels erasure. |
| Sent messages | Keep the thread row; erase text and identity at account erasure. Received messages remain with their authors. |
| Export archive | Delete seven days after ready, or immediately on deletion request. |
| Decided listing suggestions, including contact emails | Purge 12 months after decision, or earlier on the submitter's erasure. |
| Audit entries | Purge two years after `OccurredAt`; erase a deleted member's identifying references at account erasure. |
| Decided message reports | Purge 12 months after decision; detach the erased member's identity at account erasure. |
| Declined professional applications and associated declined listings | Purge 12 months after decline, or earlier when exclusively owned by an erased member. Live listings removed by staff remain hard-deleted as in ADR 0056. |
| Never-confirmed Pending subscriptions | Purge 30 days after the most recent request; a new request resets that time. |
| Unsubscribed addresses | Purge within 30 days of unsubscribe unless subscribed again (`L2-058` AC6). |

- **Unsubscribe tokens and keys.** Unsubscribe links have no time expiry. Use a cryptographically
  random opaque token for each email, storing only its hash linked to the subscription, not a Data
  Protection payload: removing old keys must not invalidate an outstanding link. Retain token
  hashes while the subscription exists, including across resubscription of that record. Once the subscription
  is purged, the link is an idempotent no-op; it cannot identify a later, newly created subscription.
  Data Protection keys are retained for 90 days after they cease being used for new protection;
  operators must account for the maximum lifetime of all other protected payloads before removal.
- **Access logs.** Configure nginx access logging with an explicit format using `$uri`, never
  `$request`, `$request_uri`, `$args` or other query-bearing fields. Ingress access logs must omit
  query strings too; if the ingress cannot guarantee this, disable its access logs or use an ingress
  that can. Verify both layers before deployment. Never log token-bearing bodies or headers.

## Consequences

The scheduler, CLI authorization, storage and token changes are future implementation slices; the
policy must not be published as deployed until they are true. A purged subscription cannot be
reidentified from an old link, while an extant subscription's link survives key rotation. Retained
audit entries and reports lose the deleted member's identifying references.
