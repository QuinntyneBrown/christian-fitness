# 0114. Email and notification preferences

## Status

Accepted, 27 November 2026. Builds on [ADR 0083](0083-notifications-in-the-app.md) and
[ADR 0110](0110-subscribe-to-the-newsletter.md).

## Context

Journey 33 builds Preferences with its first two sections (`L2-064`). The design
(`preferences/set-email-and-notification-preferences`) left the leave question to supply, and the
mock's notification switches differ from the requirement's.

## Decision

- **The requirement names the notification switches.** `L2-064` AC4 lists Event reminders,
  Messages, New dates from listings you follow and Changes to your events. The mock draws
  "Cancelled events" and "Cancelled series dates" and no Messages. The screen follows the
  requirement: "Changes to your events" covers both cancellations (`EventCancelled`,
  `SeriesDateCancelled`). The mock is to be redrawn.
- **Messages is kept, and stops nothing yet.** No notification kind exists for a message: unread
  messages show as dots on Messages. The switch is stored so the choice is there when messages
  notify.
- **`MemberPreferences`** is one row per member, deleted with the member. A member with no row has
  the defaults, every notification on, so nobody is backfilled. `INotifier` asks
  `Allows(kind)` and answers nothing for a kind switched off: no sender reads preferences.
- **The email switches are the account address's subscription.** `NewsletterSubscription` gains
  `Weekly`, `EventAlerts`, `TrainingPlan` and `Devotion`. Any switch saved on subscribes the address
  at once, with no confirmation email, and records the time and the source "Preferences, signed
  in" when it was not already subscribed. All four off unsubscribes it as an Unsubscribe link does.
  A Pending or Unsubscribed address reads as every switch off. An address that confirms by link, or
  was subscribed before this change, has the Weekly on (the migration sets it).
- **An issue goes only where the Weekly is on.** The desk's count of readers and the send both
  leave out an address subscribed only to an extra.
- **Saving is one request.** `PUT /api/preferences` carries every setting on the page and saves
  once. It is the member's own choice, so it is not an audited staff change.
- **Leaving with unsaved changes** asks "You have unsaved changes. Leave without saving?" with the
  browser's own confirmation on a move inside the app (a route guard), and the browser's own
  question on a link that loads a page or a closed tab (`beforeunload`). No dialog code is loaded.
- **Only the sections that exist are listed.** The section list names Email and Notifications;
  Privacy, Suggestions and Your data join it with journeys 34 to 36.

## Consequences

- The three extras can be switched on, and nothing sends them: each says "Not sending yet."
- Most links in the member app load a page rather than move inside it, so the browser's own
  question is the one most members will meet.
- The web app's initial bundle reads 279.07 kB against 279.05 kB: the leave guard's two domain
  names are referenced from the lazily loaded route table.
