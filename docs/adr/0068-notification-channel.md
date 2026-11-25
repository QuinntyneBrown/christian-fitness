# 0068. Notification channel: an in-app inbox now, web push later

## Status

Accepted, 24 November 2026 (issue 13 of the new-mocks blockers, #76).

## Context

Preferences promised notifications "on your phone and in the app", but nothing sends one and no
bell or inbox was drawn. Event reminders, a followed host's new dates (`L2-064` AC4) and a
cancelled series date all need a channel (`docs/mocks/README.md`, open question 1). The choice is
web push, an in-app inbox, or both.

## Decision

- **An in-app inbox now; web push is a later ADR.** Web push needs a service worker, a permission
  prompt, a push service and per-device subscriptions, and the apps have none of them. The inbox
  needs only what is built.
- **The bell.** The member top bar shows a bell before the profile button: no badge when nothing is
  unread, the count when one to nine are, and `9+` above nine. The accessible name carries the
  number ("Notifications, 12 unread"), the badge is `aria-hidden`, and the target is at least
  44 × 44 px. It links to the Notifications screen (`/notifications`, lazy loaded).
- **The Notifications screen.** Newest first, with "Mark all as read" and a link to the Notifications
  section of Preferences. An unread row has a dot, a bold title and the visually hidden word
  "Unread", so colour is not the only carrier. States: default, many (the 9+ bell), loading, empty
  and error.
- **Transport.** A notification arrives over the existing SignalR connection through the shared
  real-time client (ADR 0039), never a new connection. The client keeps a bounded list of the
  latest 50. The server persists a notification for 30 days and then drops it. No log, metric or
  span carries a notification's text.
- **What notifies**, each kind with its own switch in Preferences:
  1. an event reminder 24 hours before an event the member is going to;
  2. a cancelled event the member is registered for;
  3. a cancelled series date in a series the member joined;
  4. new dates from a host the member follows (`L2-064` AC4).

  Chat replies do not notify: they stay as the unread dots and counts on Messages.
- **Preferences copy.** "On your phone and in the app." becomes "In the app, on the bell. Chat
  messages show as unread dots on Messages." Switch names are `notify-reminders`,
  `notify-cancelled-events`, `notify-cancelled-dates` and `notify-follows`. The earlier Messages and
  "Changes to your events" switches are gone. Until the senders are built, the switches are stored
  only.

## Consequences

- The mocks gain `notifications` (five states) and the bell in the member top bar; Preferences and
  the delete-account dialog show the new rows.
- Behaviour is built later in ATDD slices: a notification store and API contract, the SignalR event,
  the 30-day retention, and a sender for each kind that reads `Allows`.
- The bell and the notification row are not yet design-system components; they are added to the
  design system and the components library (`bell`, `notification-row`) when the first slice builds
  them.
- Web push, and any email for these kinds, need their own ADR.
