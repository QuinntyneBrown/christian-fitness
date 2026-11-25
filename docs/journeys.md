# User journeys

The journeys that build the new features in the specs (`specs/L1.md` L1-017 to L1-023, `specs/L2.md`
L2-049 to L2-080, and the amended L2-001 to L2-048), their detailed designs and their mocks, for the
member web app and the admin web app. They are listed **in the order they should be implemented**:
each journey builds only on journeys above it and on what the first 30 journeys already delivered.
Effort is days for one developer to deliver the journey end to end: backend handler and API,
Angular screen, and acceptance tests (ATDD). Each journey also carries its share of the
cross-cutting requirements in `specs/L2.md` (security, performance, accessibility, telemetry,
audit), so those are not listed on their own.

**% complete:** 39% (14 of 36 journeys; 40 of 113 days)

| #   | Journey                                | App    | Description                                                                                                    | Effort (days) |
| --- | -------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- | ------------- |
| 1   | ✅ Read the Privacy Policy and Terms   | Member | Static Privacy and Terms pages; Join confirms age 16+ and records the versions accepted.                       | 3             |
| 2   | Join and sign in with Google           | Member | Sign up, finish a profile and sign in with Google, completed on the server (OIDC, PKCE).                       | 4             |
| 3   | Staff sign in with Google Workspace    | Admin  | Staff sign in only with a team-domain Google account; the staff password and two-step are removed.             | 3             |
| 4   | ✅ Search events and see mine          | Member | Search Events by title and show only the events I'm going to.                                                  | 2             |
| 5   | ✅ Browse the directory                | Member | Find the organizations, people and ministries behind events, by kind and by search.                            | 3             |
| 6   | ✅ View a listing's profile            | Member | See what a listing hosts and is connected to, and message its owner.                                           | 3             |
| 7   | ✅ See who hosts an event              | Both   | Every event has a required host listing, chosen in the event editor and shown on the event.                    | 3             |
| 8   | ✅ Follow a listing                    | Member | Follow or unfollow a listing from the directory or its profile.                                                | 2             |
| 9   | ✅ Manage event series                 | Admin  | Staff create a series, edit its details and add dated sessions under the regrouped console navigation.         | 5             |
| 10  | ✅ Browse event series                 | Member | A Series view on Events lists programs by next session, with progress and filters.                             | 3             |
| 11  | View an event series                   | Member | A series page with its sessions, host and sign-up panel; session events show their series.                     | 3             |
| 12  | Join and leave a series                | Member | Hold a place at every remaining session and join the series' one group chat, or leave it.                      | 4             |
| 13  | Drop in on series dates                | Member | Register for chosen dates of a series and change them later.                                                   | 3             |
| 14  | ✅ Get notifications in the app        | Member | A bell with an unread count and a Notifications screen, fed over the existing real-time connection.            | 3             |
| 15  | Cancel and restore series dates        | Both   | Staff cancel or restore a session; members holding a place are told in chat and by notification.               | 2             |
| 16  | Record event attendance                | Both   | Staff tick who came; members see "You came", "Missed" and "Came to n of m" on the series.                      | 3             |
| 17  | ✅ Suggest a listing                   | Member | A member suggests someone, or themselves, for the directory.                                                   | 2             |
| 18  | ✅ Review listing suggestions          | Admin  | Staff record the four checks, approve or decline, edit listings; the sender hears back from Christian Fitness. | 4             |
| 19  | ✅ Claim a listing                     | Member | The listed party opens a claim link and publishes their own listing, or says it isn't them.                    | 3             |
| 20  | ✅ Edit my listing                     | Both   | An owner edits their listing; name and kind changes wait for staff approval.                                   | 2             |
| 21  | ✅ Manage bylines                      | Admin  | Admins add, edit and remove the names stories run under.                                                       | 2             |
| 22  | Write and publish stories              | Admin  | Admins list, write, review, preview, publish, update and unpublish stories.                                    | 5             |
| 23  | Schedule stories                       | Admin  | A scheduled story publishes itself within a minute, run by the console's scheduler.                            | 2             |
| 24  | Read a story                           | Member | Anyone reads a published story at its own address, with link previews and a correction link.                   | 4             |
| 25  | Read the news front page               | Member | The landing page becomes a news front page: sections, top stories, the rail and most read.                     | 3             |
| 26  | Follow stories by RSS                  | Member | RSS feeds of all stories and of each section, cached and rate limited.                                         | 2             |
| 27  | Subscribe to the newsletter            | Member | Anyone subscribes without an account, confirms by email and unsubscribes in one click.                         | 4             |
| 28  | Build and send the newsletter          | Admin  | Staff build the weekly issue from stories and events, test it, schedule it and send it.                        | 5             |
| 29  | Read the newsletter on the web         | Member | The latest and earlier issues read on the web as the email did.                                                | 2             |
| 30  | Send feedback                          | Member | Send an idea, a problem, a correction or thanks from any page, with an optional screenshot.                    | 3             |
| 31  | Answer feedback                        | Admin  | Staff read, reply to, resolve and reopen feedback in an inbox.                                                 | 3             |
| 32  | Make a Community Pick                  | Both   | Staff pick an event and make branded images and captions for four platforms; `/e/<id>` links land on it.       | 4             |
| 33  | Set email and notification preferences | Member | Choose which emails and in-app notifications to get, saved together from a save bar.                           | 3             |
| 34  | Set privacy and suggestion preferences | Member | Choose who sees my profile, lists me and messages me, and what orders Home's suggestions.                      | 4             |
| 35  | Download my data                       | Member | Request a .zip of my data and download it from a private link.                                                 | 3             |
| 36  | Delete my account                      | Member | Delete my account, restore it within 30 days, and have it erased after.                                        | 4             |

## Where each journey is specified

Read the requirement's exact words before a slice; this table points to them, the detailed design
under `detailed-designs/` and the mocks under `mocks/` (pages, dialogs and notifications).

| #   | Requirements                                                             | Detailed design                                                   | Mocks                                                                   |
| --- | ------------------------------------------------------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | L2-067; L2-003 AC5, AC12                                                 | legal/read-privacy-policy-and-terms                               | privacy, terms, join                                                    |
| 2   | L2-049 AC1–14; L2-003 AC7–11; L2-004 AC2, AC7–11                         | member-access/sign-in-with-google                                 | join, sign-in, google-account-chooser                                   |
| 3   | L2-018; L2-046; L2-049 AC15; ADR 0074                                    | admin-access/admin-sign-in                                        | admin-sign-in                                                           |
| 4   | L2-075; L2-076                                                           | events/browse-events                                              | events                                                                  |
| 5   | L2-054; L2-008 AC1–2; ADR 0071, 0077                                     | directory/browse-directory                                        | directory                                                               |
| 6   | L2-055; L2-014 AC1–2, AC6; ADR 0061, 0066, 0087                          | directory/view-listing-profile                                    | listing-profile                                                         |
| 7   | L2-010 AC4; L2-022 AC1, AC11–12; ADR 0067                                | events/view-event-detail, admin-events/create-and-edit-events     | event-detail, event-editor                                              |
| 8   | L2-056 AC1–6, AC8–9                                                      | directory/follow-listing                                          | directory, listing-profile, toast                                       |
| 9   | L2-071 AC1–3, AC6–8, AC10–16; L2-019; L2-021; ADR 0064, 0079, 0080       | admin-events/manage-event-series, admin-access/navigate-admin-app | admin-series, series-editor, add-session                                |
| 10  | L2-050; L2-009 AC1, AC11                                                 | events/browse-event-series                                        | events                                                                  |
| 11  | L2-051; L2-010 AC5–6; L2-055 AC2                                         | events/view-event-series                                          | event-series, event-detail, listing-profile                             |
| 12  | L2-052 AC1–9; ADR 0080                                                   | events/join-and-leave-series                                      | event-series, leave-series                                              |
| 13  | L2-053                                                                   | events/drop-in-on-series-dates                                    | event-series, stop-dates                                                |
| 14  | ADR 0068                                                                 | preferences/set-email-and-notification-preferences                | notifications                                                           |
| 15  | L2-071 AC4–5, AC9; L2-052 AC10                                           | admin-events/manage-event-series                                  | admin-series, cancel-session                                            |
| 16  | L2-080; L2-051 AC3; L2-052 AC3                                           | admin-events/record-attendance                                    | admin-event-attendance, event-series                                    |
| 17  | L2-062 AC1–8, AC10–11                                                    | directory/suggest-listing                                         | suggest-listing                                                         |
| 18  | L2-073; L2-062 AC9; L2-014 AC8; ADR 0065                                 | admin-directory/review-listing-suggestions                        | admin-listings, decline-application, directory-listing-editor, messages |
| 19  | L2-078                                                                   | directory/claim-listing                                           | claim-listing                                                           |
| 20  | L2-079                                                                   | directory/edit-listing                                            | owner-listing-editor, listing-profile, admin-listings                   |
| 21  | L2-077                                                                   | publishing/write-review-publish-story                             | admin-bylines, byline-editor, remove-byline                             |
| 22  | L2-068; L2-069 (not AC4)                                                 | publishing/manage-stories, publishing/write-review-publish-story  | admin-stories, admin-story-editor, admin-story-preview                  |
| 23  | L2-069 AC2, AC4; ADR 0069                                                | publishing/write-review-publish-story                             | admin-story-editor                                                      |
| 24  | L2-061; L2-034 AC4–5; ADR 0072, 0073                                     | news/read-story                                                   | story                                                                   |
| 25  | L2-001; L2-002                                                           | member-access/view-landing-page                                   | landing                                                                 |
| 26  | L2-060                                                                   | news/publish-rss-feeds                                            | subscribe                                                               |
| 27  | L2-057; L2-058; ADR 0070                                                 | news/subscribe-to-newsletter, news/confirm-and-unsubscribe        | subscribe                                                               |
| 28  | L2-070                                                                   | publishing/build-and-schedule-newsletter                          | admin-newsletter                                                        |
| 29  | L2-059                                                                   | news/read-newsletter-on-web                                       | newsletter                                                              |
| 30  | L2-063; L2-008 AC5                                                       | feedback/send-feedback                                            | feedback                                                                |
| 31  | L2-074                                                                   | feedback/read-feedback-inbox                                      | admin-feedback                                                          |
| 32  | L2-072                                                                   | admin-events/make-community-pick                                  | admin-community-pick, admin-events                                      |
| 33  | L2-064                                                                   | preferences/set-email-and-notification-preferences                | preferences, leave-unsaved                                              |
| 34  | L2-065; L2-005 AC3–4; L2-006 AC4; L2-007 AC1; L2-056 AC7; ADR 0075, 0076 | preferences/set-privacy-and-suggestion-preferences                | preferences, profile, home                                              |
| 35  | L2-066 AC1–3, AC10                                                       | preferences/download-and-delete-data                              | preferences, download, email-download-ready                             |
| 36  | L2-066 AC4–9, AC11; ADR 0078                                             | preferences/download-and-delete-data                              | delete-account, email-deletion-requested, email-deletion-done, sign-in  |

## Notes

- **Order.** Accounts come first: the legal pages (1) are linked from every Join and sign-in
  screen, Google sign-in (2) needs them, and staff sign-in (3) moves to Google before any new
  console area is built, so no new area is tested against the password and two-step flow ADR 0074
  removes. The directory (5–8) comes before series because every event and series needs a host
  listing (ADR 0067). Staff create series (9) before members browse, join and drop in (10–13). The
  in-app inbox (14) lands just before the first thing that notifies (15). Attendance (16) follows
  so the series page can say who came. Suggestions, review and claiming (17–20) grow the
  directory past its seed. Bylines (21) come before stories, stories (22–24) before the news front
  page (25), feeds (26) and the newsletter (27–29). Feedback (30–31) follows stories so a story's
  "Send a correction" and the inbox's "Open the story" work from the start. Preferences (33–36)
  come last because their switches govern the emails, notifications, follows and messages built
  above them.
- **Shared pieces land with their first user.** Each is built in the first journey that needs it
  and reused after: the directory seed and the Listed "Christian Fitness" team listing (5),
  `public-reads` rate limiting (5, then every public read), the grouped admin navigation and
  ADR 0064's Moderator table (9, gaining each area and its count as it is built), the series
  conversation scope for chat (12), the Christian Fitness system account (18), `PublishingClock`
  and its database lease (23, reused by 27, 28, 35 and 36), and the member footer links (each
  link added when its page exists).
- **The Dashboard grows with the work it shows.** L2-020's tiles and "Needs attention" gain each
  line in the journey that creates that work: listing suggestions (18), stories in review (22),
  an unscheduled newsletter issue (28) and new feedback (31).
- **Design-system components to build in the library first** (none exists yet), each in the
  first journey that uses it: `google-button`, `sso-notice` (2–3); `segmented-control` (4 or 10);
  `listing-row`, `follow-button` (5); `host-card` (6–7); `side-navigation` (9); `series-card`
  (10); `session-list`, `plan-option`, `choice-card` (11–13); `suggestion`, `steps` (17–18);
  `review-card` (18); `section-heading`, `dropzone` (19–22); `editor`, `prose` (22); `story` (24);
  `masthead`, `newsletter-box` (25); `feed-list` (26); `issue` (29); `feedback-row` (31);
  `pick-art`, `pick-list` (32); `preference-row`, `save-bar` (33).
- **Not built here.** Web push (ADR 0068 leaves it to a later ADR), the newsletter's add-on emails
  (L2-057 AC2, L2-070 AC11), online payment (L2-052 AC4) and members checking themselves in
  (L2-080).
- **Totals.** 23 member journeys (70 days), 9 admin journeys (32 days) and 4 shared (11 days):
  113 days in all. The 30 journeys before these are all done (91 days); git history holds their
  table.
