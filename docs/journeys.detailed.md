# Detailed journeys

Every journey in [journeys.md](journeys.md) cut into vertical slices of 1 to 3 days. Each slice
is end to end (API, screen, acceptance test) and ships on its own. Slices are listed in
dependency order: each one builds only on slices above it, so work can go straight down the
table. A slice ID is its root journey's number followed by the slice's position in that journey.

**% complete:** 23% (13 of 54 slices; 19 of 83 days)

| #   | Slice | Root journey                        | Name                          | Description                                                                          | Effort (days) |
| --- | ----- | ----------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------ | ------------- |
| 1   | 1.1   | 1 Scaffold the apps                 | ✅ Frontend workspace         | Web, admin and libraries with lint boundaries, budgets and Playwright fixture.       | 2             |
| 2   | 1.2   | 1 Scaffold the apps                 | ✅ Backend skeleton           | Clean-architecture projects, migrate CLI, auth fallback, telemetry, health endpoint. | 2             |
| 3   | 1.3   | 1 Scaffold the apps                 | ✅ CI pipeline                | Lint, build and acceptance specs run on every push.                                  | 1             |
| 4   | 30.1  | 30 Recover from errors and offline  | ✅ Not found and server error | Unknown routes and server failures show a screen with a way back.                    | 1             |
| 5   | 2.1   | 2 Join the community                | ✅ Join with valid details    | A visitor creates an account and lands signed in.                                    | 2             |
| 6   | 2.2   | 2 Join the community                | ✅ Join refusals              | Invalid fields and a taken email are refused with clear messages.                    | 1             |
| 7   | 3.1   | 3 Sign in and out                   | ✅ Sign in and sign out       | Members sign in with a secure session cookie and sign out.                           | 2             |
| 8   | 3.2   | 3 Sign in and out                   | ✅ Sign-in protections        | Lockout after failures, suspended refusal, redirect back after sign-in.              | 1             |
| 9   | 9.1   | 9 Staff sign-in with two-step       | ✅ Staff sign-in and admin shell | Staff sign in to the admin layout; members are refused.                              | 2             |
| 10  | 9.2   | 9 Staff sign-in with two-step       | ✅ Two-step verification      | Staff confirm sign-in with a second-step code.                                       | 1             |
| 11  | 9.3   | 9 Staff sign-in with two-step       | Idle expiry and forbidden     | Idle admin sessions expire; forbidden actions show the forbidden screen.             | 1             |
| 12  | 29.1  | 29 Staff roles and audit            | Admin and Moderator roles     | Staff policies allow Admins everything and Moderators only moderation.               | 1             |
| 13  | 29.2  | 29 Staff roles and audit            | Audit staff changes           | Every staff change records who, what, which record and when.                         | 2             |
| 14  | 10.1  | 10 Create and edit events           | Create a draft event          | Staff list events and create a draft in the event editor.                            | 2             |
| 15  | 10.2  | 10 Create and edit events           | Edit an event                 | Staff edit an event, with invalid and failed save states.                            | 2             |
| 16  | 11.1  | 11 Publish and cancel events        | Publish an event              | Staff publish a draft so members can find it.                                        | 1             |
| 17  | 4.1   | 4 Browse and filter events          | Browse upcoming events        | Members see published upcoming events, soonest first.                                | 2             |
| 18  | 4.2   | 4 Browse and filter events          | Filter events                 | Filter by type, date and location, with a no-results state.                          | 1             |
| 19  | 5.1   | 5 View an event                     | Event detail                  | Members see an event's details, place, time and spots left.                          | 2             |
| 20  | 6.1   | 6 Register for an event             | Register for an event         | Members claim a spot and the event shows them as going.                              | 2             |
| 21  | 6.2   | 6 Register for an event             | Full events                   | A full event refuses registration, even under simultaneous requests.                 | 1             |
| 22  | 7.1   | 7 Cancel a registration             | Cancel a registration         | Members give up their spot and it frees for others.                                  | 1             |
| 23  | 11.2  | 11 Publish and cancel events        | Cancel an event               | Staff cancel an event and registered members see it cancelled.                       | 1             |
| 24  | 24.1  | 24 View event registrations         | View event registrations      | Staff see who registered and how much capacity is used.                              | 2             |
| 25  | 8.1   | 8 Discover from the landing page    | Landing with upcoming events  | Visitors see the community and upcoming events, and can join.                        | 1             |
| 26  | 18.1  | 18 Build my profile                 | ✅ View my profile            | Members see their profile and the events they registered for.                        | 1             |
| 27  | 18.2  | 18 Build my profile                 | Edit my profile               | Members edit name, bio, optional church, interests and goals.                        | 2             |
| 28  | 19.1  | 19 View a member's profile          | View a member's profile       | Members see another member's public profile, never private details.                  | 1             |
| 29  | 12.1  | 12 Chat in an event group           | Real-time group chat          | Registered members send and receive event group messages live.                       | 3             |
| 30  | 12.2  | 12 Chat in an event group           | Chat history and failed sends | Older messages load in a bounded window; failed sends can retry.                     | 2             |
| 31  | 12.3  | 12 Chat in an event group           | Group membership              | Only registered members join; cancelling a registration leaves the group.            | 1             |
| 32  | 15.1  | 15 Pick up conversations            | Conversation list             | Members see their conversations, newest first, with unread counts.                   | 2             |
| 33  | 14.1  | 14 Message a member directly        | Direct messages               | Members start a private conversation from a profile and chat live.                   | 3             |
| 34  | 13.1  | 13 See my home                      | Next and suggested events     | Home shows a member's next events and suggested events.                              | 2             |
| 35  | 13.2  | 13 See my home                      | Unread messages on home       | Home shows unread messages, with partial and empty states.                           | 1             |
| 36  | 30.2  | 30 Recover from errors and offline  | Offline                       | Losing the network shows an offline banner and screen.                               | 1             |
| 37  | 20.1  | 20 Reset a forgotten password       | ✅ Request a reset link       | Members request a reset email without revealing which emails exist.                  | 2             |
| 38  | 20.2  | 20 Reset a forgotten password       | ✅ Choose a new password      | A valid, unexpired link sets a new password once.                                    | 1             |
| 39  | 22.1  | 22 Apply to be listed               | Apply to be listed            | A member applies as a professional; a pending application is refused.                | 2             |
| 40  | 21.1  | 21 Review professional applications | Application queue             | Staff see pending applications, oldest first, or an empty state.                     | 1             |
| 41  | 21.2  | 21 Review professional applications | Approve or decline            | Approving publishes a listing; declining records a reason.                           | 2             |
| 42  | 16.1  | 16 Browse professionals             | Browse professionals          | Members see vetted professionals and filter by category.                             | 2             |
| 43  | 16.2  | 16 Browse professionals             | Listing detail                | Members open a professional's listing with credentials and price.                    | 1             |
| 44  | 17.1  | 17 Book a professional              | Message or contact            | Members message a linked professional or open their contact link.                    | 1             |
| 45  | 17.2  | 17 Book a professional              | Request a booking             | Members send a booking request from the booking dialog.                              | 2             |
| 46  | 23.1  | 23 Edit and remove listings         | Edit a listing                | Staff edit a listing and members see the change.                                     | 1             |
| 47  | 23.2  | 23 Edit and remove listings         | Remove a listing              | Staff remove a listing with confirmation; conversations remain.                      | 1             |
| 48  | 8.2   | 8 Discover from the landing page    | Landing with professionals    | Visitors see trusted professionals on the landing page.                              | 1             |
| 49  | 25.1  | 25 Report a message or member       | Report a message              | Members report a message; the sender is flagged, never twice.                        | 2             |
| 50  | 26.1  | 26 Find members                     | Find members                  | Staff search members and filter by Active, Flagged or Suspended.                     | 2             |
| 51  | 27.1  | 27 Flag, suspend and reinstate      | Flag and suspend              | Staff flag or suspend a member with a recorded reason.                               | 2             |
| 52  | 27.2  | 27 Flag, suspend and reinstate      | Reinstate                     | Staff reinstate a flagged or suspended member to Active.                             | 1             |
| 53  | 28.1  | 28 Watch the dashboard              | Community activity            | Staff see members, registrations and messages over recent weeks.                     | 2             |
| 54  | 28.2  | 28 Watch the dashboard              | Work awaiting staff           | Dashboard shows pending applications and flagged members to handle.                  | 1             |

## Why this order

- **Foundations first.** Scaffolding, error screens, accounts and staff sign-in come before
  anything that needs a signed-in person. Roles and audit (12–13) land before the first staff
  change, so no admin action has to be retrofitted later.
- **Events before members can browse them.** Staff create and publish events (14–16) before
  members browse, view and register (17–22). Cancelling an event (23) waits until there are
  registrations it affects.
- **Profiles before messaging.** Profiles (26–28) come before chat, so a direct message can start
  from a member's profile (33). Home (34–35) waits for the events and unread counts it shows.
- **Applications before listings.** Members apply (39) and staff approve (40–41) before members
  can browse what was approved (42–45). The landing page's professionals section (48) waits
  for listings to exist.
- **Moderation before the dashboard.** Reports (49) produce flagged members, staff act on them
  (50–52), and the dashboard (53–54) shows the work those slices create.
- **Apply to be listed** (39) has no mock yet; one is needed before it starts.
