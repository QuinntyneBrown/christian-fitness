# User journeys

Every user journey expected for Christian Fitness, member web app and admin web app, ordered by
value added. Effort is days for one developer to deliver the journey end to end: backend
handler and API, Angular screen, and acceptance tests (ATDD). Each journey also carries its share
of the cross-cutting requirements in `specs/L2.md` (security, performance, accessibility,
telemetry), so those are not listed on their own.

**% complete:** 29% (4 of 30 journeys; 26 of 91 days: journeys 2, 3, 9 and 20 are done, journey 1 has 11 of its 13 days, journey 18 has 1 of its 3 days, and journey 30 has 1 of its 2 days)

| #   | Journey                          | App    | Description                                                                                                        | Effort (days) |
| --- | -------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ | ------------- |
| 1   | Scaffold the apps                | Both   | Workspace, clean-architecture backend, auth, telemetry, test fixtures, CI and the shared design-system components. | 13            |
| 2   | ✅ Join the community            | Member | Create a member account with name, email and password.                                                             | 3             |
| 3   | ✅ Sign in and out               | Member | Sign in securely, with lockout, suspension refusal and return-to-route.                                            | 3             |
| 4   | Browse and filter events         | Member | Find upcoming events by type, date and location.                                                                   | 3             |
| 5   | View an event                    | Member | See an event's details, place, time and spots left.                                                                | 2             |
| 6   | Register for an event            | Member | Claim a spot within capacity; full events refuse registration.                                                     | 3             |
| 7   | Cancel a registration            | Member | Give up a spot so someone else can take it.                                                                        | 1             |
| 8   | Discover from the landing page   | Member | Visitors see the community, upcoming events and professionals, then join.                                          | 2             |
| 9   | ✅ Staff sign-in with two-step   | Admin  | Only staff sign in, verified by a second step.                                                                     | 4             |
| 10  | Create and edit events           | Admin  | Staff draft an event and edit its details in a dialog.                                                             | 4             |
| 11  | Publish and cancel events        | Admin  | Staff make a draft event visible or cancel it.                                                                     | 2             |
| 12  | Chat in an event group           | Member | Registered members message their event group in real time.                                                         | 6             |
| 13  | See my home                      | Member | Next events, unread messages and suggested events at a glance.                                                     | 3             |
| 14  | Message a member directly        | Member | Hold a private real-time conversation with another member.                                                         | 3             |
| 15  | Pick up conversations            | Member | List group and direct conversations, newest first, with unread counts.                                             | 2             |
| 16  | Browse professionals             | Member | Find vetted Christian professionals by category.                                                                   | 3             |
| 17  | Book a professional              | Member | Request a booking or message a professional from their listing.                                                    | 3             |
| 18  | Build my profile                 | Member | View and edit name, bio, church, interests and goals.                                                              | 3             |
| 19  | View a member's profile          | Member | See another member's public profile from a chat or event.                                                          | 1             |
| 20  | ✅ Reset a forgotten password    | Member | Request a reset link by email and choose a new password.                                                           | 3             |
| 21  | Review professional applications | Admin  | Staff approve or decline applications, oldest first.                                                               | 3             |
| 22  | Apply to be listed               | Member | A member applies to be listed as a professional.                                                                   | 2             |
| 23  | Edit and remove listings         | Admin  | Staff edit a published listing or remove it with confirmation.                                                     | 2             |
| 24  | View event registrations         | Admin  | Staff see who registered for an event and capacity used.                                                           | 2             |
| 25  | Report a message or member       | Member | Report a harmful message so staff can review the sender.                                                           | 2             |
| 26  | Find members                     | Admin  | Staff search members and filter by Active, Flagged or Suspended.                                                   | 2             |
| 27  | Flag, suspend and reinstate      | Admin  | Staff change a member's status, with a reason recorded.                                                            | 3             |
| 28  | Watch the dashboard              | Admin  | Staff see community activity and the work awaiting them.                                                           | 3             |
| 29  | Staff roles and audit            | Admin  | Moderators only moderate; every staff change is audited.                                                           | 3             |
| 30  | Recover from errors and offline  | Both   | Clear not-found, server-error and offline screens with a way back.                                                 | 2             |

## Notes

- **Order.** Scaffolding comes first: every later journey builds on it. Members must be able
  to join, find events and turn up before anything else adds value; staff publishing events
  comes next because there is nothing to find without it.
  Community (chat, home) follows, then services, then moderation and staff insight.
- **Apply to be listed** (22) is in L2-026 but has no mock yet; it needs one before
  implementation.
- **Totals.** 18 member journeys (48 days), 10 admin journeys (28 days) and 2 shared
  (15 days): 91 days in all.
