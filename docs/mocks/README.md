# Christian Fitness — HTML mocks

Every page, dialog and notification of the member web app and the admin console, in every
state, as static HTML that opens from disk. These mocks are the source of truth for the UI
(see `AGENTS.md`); `docs/design-system/` is extracted from them.

**Source design.** The Magic Patterns OS
<https://www.magicpatterns.com/os/rCJdLHom5zs5XuG3YFh2Pu>, canvas _Web App_: prototype
_Christian Fitness_ (Landing, Story, Join, Member Sign In, Google Account Chooser, Home, Events,
Event Detail, Event Series, Directory, Listing Profile, Suggest a Listing, Services, Messages,
Profile, Manage Preferences, Subscribe, Newsletter, Feedback, Privacy Policy, Terms of Service) and
prototype _Admin Console_ (Sign In, Dashboard, Manage Stories, Story Editor, Manage Newsletter,
Manage Events, Manage Event Series, Community Pick, Manage Listings, Manage Services, Members,
Feedback Inbox). Those 33 frames are reproduced at parity: same layout, spacing, type, colour, copy
and data, rebuilt as BEM + tokens instead of Tailwind. Last synced with the frames of 24 Nov 2026
(18:54 UTC): the story page, feedback, preferences, the legal pages, suggesting a listing, and the
console's publishing and community screens with its grouped navigation.
Each mock names its frame in `<meta name="mock:source">`;
screens and states the prototype doesn't draw are marked _Derived_ and built from its parts.

## How to open

- Open `index.html` from disk; it lists every screen with a link to each state.
- Each mock has a bar at the bottom: sibling states, a light/dark toggle (or press `t`), and `×`
  to hide the bar and notes.
- `?theme=dark` or `?theme=light` forces a theme; `?chrome=0` hides the mock bar and notes, leaving
  exactly what the product shows.
- Buttons that lead to another state (Register, Request a booking, New event, Approve…) open that
  state's mock, so the product can be clicked through.

## Cast and catalog

Used in every mock; reuse it in new ones. Source: the prototype's `shared/cf/data.ts`,
`shared/cf/news.ts` and `shared/cf/admin/data.ts`.

<!--
TODAY     Wednesday, April 15, 2026, 8:45 AM, Toronto ("Good morning"; Sunrise 5K is in 3 days)
MEMBER    Grace Thompson (GT) @gracet · grace.thompson@gmail.com · Grace Fellowship, Scarborough ·
          Toronto, ON · member since January 2026 · goals: half marathon in the fall, strength
          twice a week, sleep before 11 · into: Running, Strength, Basketball, Nutrition
OTHER     Michael Chen (MC) @mchenruns · Toronto Chinese Baptist · Sunrise 5K pacer (member view)
EVENTS    Easter Sunrise 5K · Sat Apr 18 6:45 AM · Martin Goodman Trail · Free · 142/200 · going
          Couch to 5K: Week 3 · Tue Apr 21 6:30 PM · Humber Bay Park East · Free · 31/40 · going · session 3 of 8
          Saturday Park Bootcamp · Sat Apr 25 8:00 AM · Trillium Park · $10 · 38/50
          Women's Hoops & Devotion Night · Thu Apr 30 7:00 PM · St. Lawrence CRC · Free · 24/30 · going
          Stretch & Pray: Mobility Morning · Wed May 6 9:30 AM · Grace Fellowship Hall · Free · 17/25
          Whole Life Retreat (draft) · May 22 4:00 PM · Muskoka Woods, Rosseau · $340 · 0/60
SERVICES  Danielle Okafor (trainer, East York, from $70) · Marcus Lee, RD (dietitian, virtual, $95)
          Ruth Abernathy (physio, Etobicoke, $110) · Tasha Grant (basketball coach, North York, from $45)
          Rev. James Whitfield (faith & wellness counsellor, Midtown, sliding scale)
CHATS     Sunrise 5K Crew (18, 3 unread) · Danielle Okafor · Women's Hoops (26, 1 unread) · Michael Chen
STAFF     Dana Reyes (DR), Community director, dana@christian.fitness (Admin) ·
          Joel Mensah (JM), Moderator, joel@christian.fitness
MEMBERS   2,431 total, +86 in April · Kevin Brooks Flagged (supplements in 3 chats, 4 reports) ·
          Tyler Simmons Suspended (spam, Apr 4) · Priya Nair, Adaeze Kalu, Jordan Reid Active
APPLY     Hannah Bergstrom (RMT) · Samuel Osei (strength coach) · Lena Park, RD (sports dietitian)
SERIES    Couch to 5K Run Club (8 Tuesdays, Apr 7 – May 26, Free, joined, came to 2 of 2) ·
          Saturday Park Bootcamp (8 Saturdays, $64 for all 8 or $10 each) ·
          Women's Hoops & Devotion (last Thursday of the month, Jan – Jun, Free)
LISTINGS  12 in six kinds. Grace follows Lakeshore Runners Fellowship, Grace Fellowship Move Ministry and
          Danielle Okafor. Hosts: Christian Fitness (Sunrise 5K), Lakeshore Runners (Couch to 5K),
          Danielle Okafor (Bootcamp), Faith & Footwork (Hoops), Grace Fellowship Move Ministry (Stretch & Pray).
          Northline Athletic is the one listing that is not verified.
NEWS      10 stories in six sections; lead: the West End church basement gym (Community, Naomi Clarke).
          The Abundant Weekly, No. 48, Saturday April 11, 2026, every Saturday 7 AM, 6,800 readers.
STORIES   Each opens at /stories/<slug>. The lead (the basement gym, 6 min read) points to St. Paul's Sports
          Ministry; "Why your rest day…" has no summary and points nowhere.
CONSOLE   Stories: 8 (1 in review: "Fasting and training", Priya Raman; 1 draft; 1 scheduled; 5 published).
          Newsletter: issue #49 goes out Sat Apr 18, 7:00 AM; #45 to #48 sent.
          Suggestions: Eastside Ladies Who Lift (from Adaeze Kalu, 1 of 4 checks) · Coach Marcus Delaney
          (self-submitted, 3 of 4) · Rooted Physio (from Jordan Reid, 0 of 4).
          Feedback: 4 notes, 2 new (Michael Chen's bug, Adaeze Kalu's correction), 1 replied, 1 resolved.
          Navigation counts: Stories 1 · Listings 3 · Services 3 · Members 1 · Feedback 2.
GOOGLE    Member: grace.thompson@gmail.com (has a profile) · grace@gracefellowship.ca (none yet).
          Staff: dana@christian.fitness (Admin) · dana.reyes@gmail.com (wrong domain) ·
          events@christian.fitness (the team's domain, no console role)
-->

|                  |                                                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Today            | Wednesday, April 15, 2026, 8:45 AM, Toronto                                                                                                                                        |
| Signed-in member | Grace Thompson, Grace Fellowship, Scarborough                                                                                                                                      |
| Staff            | Dana Reyes, Community director (Admin) · Joel Mensah, Moderator                                                                                                                    |
| Events           | Easter Sunrise 5K (Apr 18, going) · Saturday Park Bootcamp (Apr 25) · Women's Hoops & Devotion Night (Apr 30, going) · Stretch & Pray (May 6) · Whole Life Retreat (draft, May 22) |
| Professionals    | Danielle Okafor · Marcus Lee, RD · Ruth Abernathy · Tasha Grant · Rev. James Whitfield                                                                                             |
| Conversations    | Sunrise 5K Crew · Danielle Okafor · Women's Hoops · Michael Chen                                                                                                                   |

## Assets

- `assets/tokens.css`, `assets/ui.css`: forward (`@import`) to the design system's
  [`tokens/tokens.css`](../design-system/tokens/tokens.css) and
  [`assets/components.css`](../design-system/assets/components.css), the single source of truth
  for tokens and components; fonts are self-hosted there. See [the design system](../design-system/README.md).
- `assets/images/`: the prototype's ten photos, downloaded so nothing loads from a CDN.
- `assets/mock.css`, `assets/mock.js`: the mock bar, notes, theme switch and click-through; not product UI.

## Editing the mocks

The HTML under `pages/`, `dialogs/` and `notifications/` is generated by `tools/` so the shells,
cast and components stay identical in every file. Change the generator, never one HTML file:

```sh
python3 docs/mocks/tools/build_mocks.py                       # rewrite the generator's mocks + manifest.json
python3 docs/mocks/tools/build_mocks.py landing join          # or only the screens named
python3 .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks --write   # gallery, coverage, checks
python3 .claude/skills/writing-html-mocks/scripts/screenshot_mocks.py docs/mocks      # PNGs in .cache/ (never commit)
```

**The generator is behind for some screens.** Later slices changed these in their HTML only:
Messages, Profile, the admin Dashboard, the event and listing editors, Decline an application and
the admin toasts, plus five screens the generator never had (the event registrations page and the
Cancel a registration, Cancel an event, Remove a listing and Report a message dialogs).
`build_mocks.py` leaves all of them alone (`HAND_EDITED` there, `HAND_WRITTEN` in `cf_ui.py`).
Change those in their HTML until each is ported back; a change to the member shell (the
navigation, say) must be made in the generator and in those files.

## Decisions where the prototype is silent or conflicts with the rules

- **Dark theme.** The prototype is light only. Dark keeps the brand: warm near-black surfaces,
  Bordeaux brightened to `#8f2a4a` for buttons, accent text in rose `#f0a8bf`, Borealis focus rings.
- **Focus ring.** The prototype outlines the lockup in Borealis, which is 1.9:1 on white. Focus is
  Bordeaux on light surfaces and Borealis on dark ones (admin sidebar, brand panels, dark theme).
- **Touch targets.** Filter chips, small buttons, the profile avatar and row links are 36 px tall
  in the prototype. They keep that look; on touch screens an invisible hit area extends each to
  44 × 44 px (`AGENTS.md`).
- **Errors are Bordeaux.** The prototype marks field errors in Bordeaux, not red; danger states
  follow it and always carry text (and an icon outside fields), never colour alone.
- **Undo instead of confirmations.** "Can't make it", Suspend and Dismiss act at once in the
  prototype. They stay instant and show a toast with Undo, since each is reversible.
- **Member sign in.** Drawn by the Member Sign In frame: a card with Continue with Google above
  the email form. Forgot and reset password, which the prototype does not draw, keep the Join layout.
- **Wrong password.** The frame says "That password doesn't match. If you joined with Google, use
  Continue with Google above." That tells a stranger the email has an account, so the mock keeps
  the one generic message (L2-004 AC2) and adds the Google hint to it for every email alike.
- **Google's account chooser.** It is Google's page; the product never renders it. It is mocked
  (group "Google (not built)") only so the three sign-in flows click through, in the product's own
  neutrals instead of Google's colours and type.
- **Google did not finish.** The prototype has no state for an error at Google or an answer that
  fails its checks; `google-failed` was added to Sign in and Join, and `error` to Staff sign in.
- **Staff sign in.** Google Workspace only, as the Sign In frame now draws it. The password form
  and the code screen are gone (`admin-two-step` was removed; L2-046 is withdrawn). The frame's
  "Ask an owner to add you under Members" reads "Ask an Admin to add you to the team": the roles
  are Admin and Moderator (L2-019) and the Members screen manages members, not staff.
- **Landing.** A news front page now. Stories do not open: the prototype has no story page (see
  the open questions). The earlier "Meet our professionals" section is gone with the old layout.
- **Series, full.** The frame offers "Join the waitlist"; there is no waitlist (L2-011 AC2), so a
  full series says "Series full", the every-session choice is unavailable and dates can still be
  picked. A full event still reads "This event is full".
- **Series and paid.** No online payment yet (L2-011 AC5): a paid series or drop-in is reserved and
  the panel says to pay the host in person.
- **Leave the series.** Instant in the frame; it opens a confirmation dialog, as cancelling a
  registration does (ADR 0034).
- **Follow.** Instant, both ways, with no confirmation, as the frame draws it; a failure puts the
  button back and shows a toast (`directory/follow-failed`).
- **Newsletter confirmation and unsubscribe.** The frame stops at "Check your inbox". The states
  after the emailed links (`confirmed`, `link-expired`, `unsubscribed`) and `limited` were added
  to Subscribe; Canada's anti-spam law needs the consent and the one-step unsubscribe (L2-058).
- **Events category.** The frames' filter has no Retreat chip; it is kept, since Retreat is a
  category events can have (L2-009 AC2).
- **Admin navigation.** Grouped as the frames draw it (Publish, Gather, Community), ten links. A
  Moderator still sees only Dashboard and Members (L2-019), with no group names; whether a
  Moderator should also open Feedback is an open question.
- **Admin sidebar on desktop.** The stylesheet laid the sidebar out as the phone band at every
  width (the seal collapsed and the signed-in person sat under the brand). It is a column again
  at 1024 px and wider: brand, links, person at the foot.
- **Story page.** Public, as the frame draws it. Its next-step card leads to an event or listing,
  which need an account, so a visitor is taken to sign in and returned.
- **Feedback: Send is never disabled.** The frame disables Send until something is typed; the mock
  keeps it enabled and says what is missing (`feedback/invalid`), so nobody is left guessing.
- **Radio cards.** "Who are you suggesting?" and "What's it about?" use the design system's
  radio card (`choice choice-card`) with its visible radio button, not the frame's hidden one;
  the kind of listing is a radio group drawn as chips.
- **Preferences: switches and saving.** Switches are the design system's `switch`. Nothing saves
  until Save, as drawn; `saving`, `failed` and `download-requested` were added.
- **Delete account.** A button with nothing behind it in the frame; it opens a confirmation dialog
  that asks for the word "delete" (`delete-account`).
- **Join names the terms.** Join now says that creating a profile accepts the Terms of Service
  and Privacy Policy, with links (L2-067 AC5); the Join frame does not draw this line.
- **Story editor.** A screen of its own, not a drawer. Publish with no headline shows `invalid`;
  `saving`, `failed`, `loading` and `error` were added.
- **Cancel a series date.** Instant in the frame, but it notifies members and refunds, so it opens
  a confirmation dialog (`cancel-session`), as cancelling an event does (ADR 0035).
- **Community Pick graphics.** Drawn in HTML over the event photo to stand for the PNGs the product
  will render; the frame's exact artwork (`components/PickArt.tsx`) is the reference for the build.
- **Listing checks.** Real tick boxes with labels in place of the frame's round toggle buttons.
- **Dashboard queue.** The Dashboard mock is hand-edited (ADR 0060); the three new lines (story in
  review, suggestions, feedback) were added to its `default` and `partial` states, and the
  Moderator's queue is unchanged.
- **Phone tab bar.** Six tabs now (Directory added), still at least 44 px each at 360 px wide.
- **Member profile view.** The prototype's `view=member` shows Grace's own data with a Message
  button; the `member` state shows Michael Chen instead, at `/members/:id`.
- **Event full.** The prototype's `full` state reuses the event's counts; the mock shows Saturday
  Park Bootcamp at 50 of 50.
- **Edit profile, Request a booking, Add listing.** Buttons in the prototype with no screen behind
  them; each opens a dialog or drawer built from the prototype's form fields and the New event
  drawer. `AGENTS.md` rules out inline forms.

- **Notifications.** A bell sits in the top bar before the profile button: no badge, a count, or
  `9+` above nine, with the number in its accessible name. It opens the Notifications screen
  (`default`, `many`, `loading`, `empty`, `error`): five kinds of row are drawn (reminder 24 hours
  before, cancelled event, cancelled series date, new dates from a followed host), each with a
  dot, bold title and the word "Unread" when unread. Chat replies stay as Messages' unread dots.
  Preferences reads "In the app" and has one switch per kind (ADR 0061).

## Open questions

1. ~~**Notification centre.**~~ Resolved by ADR 0061: an in-app inbox now (a bell in the top bar
   and a Notifications screen), web push later. See "Notifications" under the decisions above.
2. ~~**11 px labels.**~~ Closed: the phone tab bar and date badges are 12 px, the smallest step
   in the design system.
3. ~~**Admin console shape.**~~ Closed: `AGENTS.md` mandates two apps, Web (members) and Admin
   (staff).
4. **Home church.** Preferences sets who sees the whole profile; should home church have its own
   switch, since it is sensitive (L2-033)?
5. **Services and the directory.** Danielle Okafor, Tasha Grant and Rev. James Whitfield are both a
   Services professional and a directory listing, with different copy, and the console has both
   Services (applications) and Listings (suggestions). One record or two? One review or two?
6. **Messaging an organization.** A listing's Message button opens a direct conversation. For an
   organization, company or ministry, who receives it?
7. **Who writes stories.** The editor shows a writer's note and "Sent back to Priya", but the
   bylines (Priya Raman, Naomi Clarke, Marcus Bell) are not staff, and staff roles are Admin and
   Moderator. Do writers get accounts and a role, or do Admins write under any byline?
8. **Moderators.** Which of the new areas may a Moderator open? The mocks give them none; Feedback
   is the likely one.
9. **Claiming a listing.** Approving a suggestion "sends them a link to claim and publish their
   listing". That screen, and how a listing's owner edits it afterwards, are not drawn.
10. **Buttons with nothing behind them.** New series, Edit details and Add a date (Event series),
    Edit (Listed), and Preview (story editor) have no screen or drawer in the frames.
11. **Declining a suggestion.** Instant in the frame, with no reason; declining an application asks
    for one (L2-025 AC3). Should this?
12. **What the legal pages promise.** They state things the system must then do: data stored in
    Canada and encrypted at rest, refunds for paid events (there is no online payment yet, L2-011
    AC5), cancelling up to 48 hours ahead (the event page says 24), a minimum age of 16, and
    receipts kept seven years. Each needs to be true, or the text changed, before launch.
13. **Newsletter preferences without an account.** A subscriber who is not a member still has only
    Unsubscribe; Preferences is for members. Is that enough?
14. **Add-on emails.** Event alerts, the training plan and the devotion "send on their own
    schedules"; nothing in the console writes or schedules them.

## Coverage

<!-- coverage:start -->

Legend: ✅ mock exists · ➖ not applicable (reason in manifest) · ❌ missing

### Pages

| Screen | default | loading | empty | error | section | section-empty | events-error | redirecting | google | google-submitting | google-failed | invalid | invalid-fields | refused | limited | submitting | google-no-account | suspended | failed | success | unchecked | partial | offline | series | series-joined | series-empty | series-loading | series-error | loading-more | more-error | capped | no-results | filtered | going | session | unregistered | registering | reserved | full | selected | list | direct | draft | send-failed | cancelled | history | member | no-reference | wrong-domain | no-access | session-expired | role | moderator | attention-error | published | tab-empty | decided | no-applications | active | flagged | not-joined | joining | joined | drop-in-none | drop-in | booked | search | follow-failed | person | one-off | unverified | confirmed | link-expired | unsubscribed | copied | link-copied | plain | vetting | join | staff | vetting-unavailable | self | broken | correction | unsaved | saving | saved | download-requested | many | new | scheduled | approved | test-sent | date-cancelled | pick | creating | facebook | whatsapp | slack | ready | approving | declined | listed | replying | replied | resolved | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Landing (`landing`) | [✅](pages/landing/default.html) | [✅](pages/landing/loading.html) | [✅](pages/landing/empty.html) | [✅](pages/landing/error.html) | [✅](pages/landing/section.html) | [✅](pages/landing/section-empty.html) | [✅](pages/landing/events-error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Join (`join`) | [✅](pages/join/default.html) | ➖ | ➖ | [✅](pages/join/error.html) |  |  |  | [✅](pages/join/redirecting.html) | [✅](pages/join/google.html) | [✅](pages/join/google-submitting.html) | [✅](pages/join/google-failed.html) | [✅](pages/join/invalid.html) | [✅](pages/join/invalid-fields.html) | [✅](pages/join/refused.html) | [✅](pages/join/limited.html) | [✅](pages/join/submitting.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Sign in (`sign-in`) | [✅](pages/sign-in/default.html) | ➖ | ➖ | [✅](pages/sign-in/error.html) |  |  |  | [✅](pages/sign-in/redirecting.html) |  |  | [✅](pages/sign-in/google-failed.html) | [✅](pages/sign-in/invalid.html) |  |  |  | [✅](pages/sign-in/submitting.html) | [✅](pages/sign-in/google-no-account.html) | [✅](pages/sign-in/suspended.html) | [✅](pages/sign-in/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Forgot password (`forgot-password`) | [✅](pages/forgot-password/default.html) | ➖ | ➖ | [✅](pages/forgot-password/error.html) |  |  |  |  |  |  |  | [✅](pages/forgot-password/invalid.html) |  |  | [✅](pages/forgot-password/limited.html) | [✅](pages/forgot-password/submitting.html) |  |  |  | [✅](pages/forgot-password/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reset password (`reset-password`) | [✅](pages/reset-password/default.html) | [✅](pages/reset-password/loading.html) | ➖ | [✅](pages/reset-password/error.html) |  |  |  |  |  |  |  | [✅](pages/reset-password/invalid.html) |  |  |  | [✅](pages/reset-password/submitting.html) |  |  | [✅](pages/reset-password/failed.html) | [✅](pages/reset-password/success.html) | [✅](pages/reset-password/unchecked.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Home (`home`) | [✅](pages/home/default.html) | [✅](pages/home/loading.html) | [✅](pages/home/empty.html) | [✅](pages/home/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/home/partial.html) | [✅](pages/home/offline.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Events (`events`) | [✅](pages/events/default.html) | [✅](pages/events/loading.html) | [✅](pages/events/empty.html) | [✅](pages/events/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/events/series.html) | [✅](pages/events/series-joined.html) | [✅](pages/events/series-empty.html) | [✅](pages/events/series-loading.html) | [✅](pages/events/series-error.html) | [✅](pages/events/loading-more.html) | [✅](pages/events/more-error.html) | [✅](pages/events/capped.html) | [✅](pages/events/no-results.html) | [✅](pages/events/filtered.html) | [✅](pages/events/going.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Event detail (`event-detail`) | [✅](pages/event-detail/default.html) | [✅](pages/event-detail/loading.html) | ➖ | [✅](pages/event-detail/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/event-detail/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/event-detail/session.html) | [✅](pages/event-detail/unregistered.html) | [✅](pages/event-detail/registering.html) | [✅](pages/event-detail/reserved.html) | [✅](pages/event-detail/full.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Services (`services`) | [✅](pages/services/default.html) | [✅](pages/services/loading.html) | [✅](pages/services/empty.html) | [✅](pages/services/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/services/filtered.html) |  |  |  |  |  |  | [✅](pages/services/selected.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Messages (`messages`) | [✅](pages/messages/default.html) | [✅](pages/messages/loading.html) | [✅](pages/messages/empty.html) | [✅](pages/messages/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/messages/list.html) | [✅](pages/messages/direct.html) | [✅](pages/messages/draft.html) | [✅](pages/messages/send-failed.html) | [✅](pages/messages/cancelled.html) | [✅](pages/messages/history.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Profile (`profile`) | [✅](pages/profile/default.html) | [✅](pages/profile/loading.html) | [✅](pages/profile/empty.html) | [✅](pages/profile/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/profile/cancelled.html) |  | [✅](pages/profile/member.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Page not found (`not-found`) | [✅](pages/not-found/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Something went wrong (`server-error`) | [✅](pages/server-error/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/server-error/no-reference.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Offline (`offline`) | [✅](pages/offline/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Staff sign in (`admin-sign-in`) | [✅](pages/admin-sign-in/default.html) | ➖ | ➖ | [✅](pages/admin-sign-in/error.html) |  |  |  | [✅](pages/admin-sign-in/redirecting.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-sign-in/wrong-domain.html) | [✅](pages/admin-sign-in/no-access.html) | [✅](pages/admin-sign-in/session-expired.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Staff only (`admin-forbidden`) | [✅](pages/admin-forbidden/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-forbidden/submitting.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-forbidden/role.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Page not found (admin) (`admin-not-found`) | [✅](pages/admin-not-found/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Something went wrong (admin) (`admin-server-error`) | [✅](pages/admin-server-error/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-server-error/no-reference.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Offline (admin) (`admin-offline`) | [✅](pages/admin-offline/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Dashboard (`admin-dashboard`) | [✅](pages/admin-dashboard/default.html) | [✅](pages/admin-dashboard/loading.html) | [✅](pages/admin-dashboard/empty.html) | [✅](pages/admin-dashboard/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-dashboard/partial.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-dashboard/moderator.html) | [✅](pages/admin-dashboard/attention-error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Manage events (`admin-events`) | [✅](pages/admin-events/default.html) | [✅](pages/admin-events/loading.html) | [✅](pages/admin-events/empty.html) | [✅](pages/admin-events/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-events/draft.html) |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-events/published.html) | [✅](pages/admin-events/tab-empty.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Event registrations (`admin-event-registrations`) | [✅](pages/admin-event-registrations/default.html) | [✅](pages/admin-event-registrations/loading.html) | [✅](pages/admin-event-registrations/empty.html) | [✅](pages/admin-event-registrations/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Manage services (`admin-services`) | [✅](pages/admin-services/default.html) | [✅](pages/admin-services/loading.html) | [✅](pages/admin-services/empty.html) | [✅](pages/admin-services/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-services/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-services/decided.html) | [✅](pages/admin-services/no-applications.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Members (`admin-members`) | [✅](pages/admin-members/default.html) | [✅](pages/admin-members/loading.html) | [✅](pages/admin-members/empty.html) | [✅](pages/admin-members/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-members/suspended.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-members/no-results.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-members/tab-empty.html) |  |  | [✅](pages/admin-members/active.html) | [✅](pages/admin-members/flagged.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Event series (`event-series`) | [✅](pages/event-series/default.html) | [✅](pages/event-series/loading.html) | ➖ | [✅](pages/event-series/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/event-series/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/event-series/full.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/event-series/not-joined.html) | [✅](pages/event-series/joining.html) | [✅](pages/event-series/joined.html) | [✅](pages/event-series/drop-in-none.html) | [✅](pages/event-series/drop-in.html) | [✅](pages/event-series/booked.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Directory (`directory`) | [✅](pages/directory/default.html) | [✅](pages/directory/loading.html) | [✅](pages/directory/empty.html) | [✅](pages/directory/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/directory/no-results.html) | [✅](pages/directory/filtered.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/directory/search.html) | [✅](pages/directory/follow-failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Listing profile (`listing-profile`) | [✅](pages/listing-profile/default.html) | [✅](pages/listing-profile/loading.html) | ➖ | [✅](pages/listing-profile/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/listing-profile/person.html) | [✅](pages/listing-profile/one-off.html) | [✅](pages/listing-profile/unverified.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Subscribe (`subscribe`) | [✅](pages/subscribe/default.html) | ➖ | ➖ | [✅](pages/subscribe/error.html) |  |  |  |  |  |  |  | [✅](pages/subscribe/invalid.html) |  |  | [✅](pages/subscribe/limited.html) | [✅](pages/subscribe/submitting.html) |  |  |  | [✅](pages/subscribe/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/subscribe/confirmed.html) | [✅](pages/subscribe/link-expired.html) | [✅](pages/subscribe/unsubscribed.html) | [✅](pages/subscribe/copied.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Newsletter (`newsletter`) | [✅](pages/newsletter/default.html) | [✅](pages/newsletter/loading.html) | ➖ | [✅](pages/newsletter/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Story (`story`) | [✅](pages/story/default.html) | [✅](pages/story/loading.html) | ➖ | [✅](pages/story/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/story/link-copied.html) | [✅](pages/story/plain.html) | [✅](pages/story/vetting.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Google account chooser (`google-account-chooser`) | [✅](pages/google-account-chooser/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/google-account-chooser/join.html) | [✅](pages/google-account-chooser/staff.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Suggest a listing (`suggest-listing`) | [✅](pages/suggest-listing/default.html) | ➖ | ➖ | [✅](pages/suggest-listing/error.html) |  |  |  |  |  |  |  | [✅](pages/suggest-listing/invalid.html) |  |  |  | [✅](pages/suggest-listing/submitting.html) |  |  |  | [✅](pages/suggest-listing/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/suggest-listing/vetting-unavailable.html) | [✅](pages/suggest-listing/self.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Send feedback (`feedback`) | [✅](pages/feedback/default.html) | ➖ | ➖ | [✅](pages/feedback/error.html) |  |  |  |  |  |  |  | [✅](pages/feedback/invalid.html) |  |  |  | [✅](pages/feedback/submitting.html) |  |  |  | [✅](pages/feedback/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/feedback/broken.html) | [✅](pages/feedback/correction.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Preferences (`preferences`) | [✅](pages/preferences/default.html) | [✅](pages/preferences/loading.html) | ➖ | [✅](pages/preferences/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/preferences/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/preferences/unsubscribed.html) |  |  |  |  |  |  |  |  |  |  | [✅](pages/preferences/unsaved.html) | [✅](pages/preferences/saving.html) | [✅](pages/preferences/saved.html) | [✅](pages/preferences/download-requested.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Privacy Policy (`privacy`) | [✅](pages/privacy/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Terms of Service (`terms`) | [✅](pages/terms/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Notifications (`notifications`) | [✅](pages/notifications/default.html) | [✅](pages/notifications/loading.html) | [✅](pages/notifications/empty.html) | [✅](pages/notifications/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/notifications/many.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Manage stories (`admin-stories`) | [✅](pages/admin-stories/default.html) | [✅](pages/admin-stories/loading.html) | [✅](pages/admin-stories/empty.html) | [✅](pages/admin-stories/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-stories/filtered.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Story editor (`admin-story-editor`) | [✅](pages/admin-story-editor/default.html) | [✅](pages/admin-story-editor/loading.html) | ➖ | [✅](pages/admin-story-editor/error.html) |  |  |  |  |  |  |  | [✅](pages/admin-story-editor/invalid.html) |  |  |  |  |  |  | [✅](pages/admin-story-editor/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-story-editor/draft.html) |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-story-editor/published.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-story-editor/saving.html) |  |  |  | [✅](pages/admin-story-editor/new.html) | [✅](pages/admin-story-editor/scheduled.html) | [✅](pages/admin-story-editor/approved.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Manage newsletter (`admin-newsletter`) | [✅](pages/admin-newsletter/default.html) | [✅](pages/admin-newsletter/loading.html) | ➖ | [✅](pages/admin-newsletter/error.html) |  |  |  |  |  |  |  | [✅](pages/admin-newsletter/invalid.html) |  |  |  | [✅](pages/admin-newsletter/submitting.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-newsletter/scheduled.html) |  | [✅](pages/admin-newsletter/test-sent.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Manage event series (`admin-series`) | [✅](pages/admin-series/default.html) | [✅](pages/admin-series/loading.html) | [✅](pages/admin-series/empty.html) | [✅](pages/admin-series/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-series/selected.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-series/date-cancelled.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Community Pick (`admin-community-pick`) | [✅](pages/admin-community-pick/default.html) | [✅](pages/admin-community-pick/loading.html) | [✅](pages/admin-community-pick/empty.html) | [✅](pages/admin-community-pick/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-community-pick/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-community-pick/pick.html) | [✅](pages/admin-community-pick/creating.html) | [✅](pages/admin-community-pick/facebook.html) | [✅](pages/admin-community-pick/whatsapp.html) | [✅](pages/admin-community-pick/slack.html) |  |  |  |  |  |  |  |  |
| Manage listings (`admin-listings`) | [✅](pages/admin-listings/default.html) | [✅](pages/admin-listings/loading.html) | [✅](pages/admin-listings/empty.html) | [✅](pages/admin-listings/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-listings/unchecked.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-listings/approved.html) |  |  |  |  |  |  |  | [✅](pages/admin-listings/ready.html) | [✅](pages/admin-listings/approving.html) | [✅](pages/admin-listings/declined.html) | [✅](pages/admin-listings/listed.html) |  |  |  |  |
| Feedback inbox (`admin-feedback`) | [✅](pages/admin-feedback/default.html) | [✅](pages/admin-feedback/loading.html) | [✅](pages/admin-feedback/empty.html) | [✅](pages/admin-feedback/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-feedback/correction.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-feedback/replying.html) | [✅](pages/admin-feedback/replied.html) | [✅](pages/admin-feedback/resolved.html) |  |

### Dialogs

| Screen | default | busy | invalid | failed | success | refused | invalid-limits | edit | edit-saving | edit-invalid | edit-failed | edit-draft | edit-published | publish-failed | image-invalid | saving | suspend | flagged | flagged-suspend | suspended | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Request a booking (`request-booking`) | [✅](dialogs/request-booking/default.html) | [✅](dialogs/request-booking/busy.html) | [✅](dialogs/request-booking/invalid.html) | [✅](dialogs/request-booking/failed.html) | [✅](dialogs/request-booking/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Report a message (`report-message`) | [✅](dialogs/report-message/default.html) | [✅](dialogs/report-message/busy.html) | ➖ | [✅](dialogs/report-message/failed.html) | [✅](dialogs/report-message/success.html) | [✅](dialogs/report-message/refused.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Apply to be listed (`apply-to-be-listed`) | [✅](dialogs/apply-to-be-listed/default.html) | [✅](dialogs/apply-to-be-listed/busy.html) | [✅](dialogs/apply-to-be-listed/invalid.html) | [✅](dialogs/apply-to-be-listed/failed.html) | [✅](dialogs/apply-to-be-listed/success.html) | [✅](dialogs/apply-to-be-listed/refused.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Edit profile (`edit-profile`) | [✅](dialogs/edit-profile/default.html) | [✅](dialogs/edit-profile/busy.html) | [✅](dialogs/edit-profile/invalid.html) | [✅](dialogs/edit-profile/failed.html) |  | [✅](dialogs/edit-profile/refused.html) | [✅](dialogs/edit-profile/invalid-limits.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Event editor (`event-editor`) | [✅](dialogs/event-editor/default.html) | [✅](dialogs/event-editor/busy.html) | [✅](dialogs/event-editor/invalid.html) | [✅](dialogs/event-editor/failed.html) |  |  |  | [✅](dialogs/event-editor/edit.html) | [✅](dialogs/event-editor/edit-saving.html) | [✅](dialogs/event-editor/edit-invalid.html) | [✅](dialogs/event-editor/edit-failed.html) | [✅](dialogs/event-editor/edit-draft.html) | [✅](dialogs/event-editor/edit-published.html) | [✅](dialogs/event-editor/publish-failed.html) | [✅](dialogs/event-editor/image-invalid.html) | [✅](dialogs/event-editor/saving.html) |  |  |  |  |  |
| Listing editor (`listing-editor`) | [✅](dialogs/listing-editor/default.html) | [✅](dialogs/listing-editor/busy.html) | [✅](dialogs/listing-editor/invalid.html) | [✅](dialogs/listing-editor/failed.html) |  |  |  | [✅](dialogs/listing-editor/edit.html) |  | [✅](dialogs/listing-editor/edit-invalid.html) |  |  |  |  |  |  |  |  |  |  |  |
| Cancel a registration (`cancel-registration`) | [✅](dialogs/cancel-registration/default.html) | [✅](dialogs/cancel-registration/busy.html) | ➖ | [✅](dialogs/cancel-registration/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Cancel an event (`cancel-event`) | [✅](dialogs/cancel-event/default.html) | [✅](dialogs/cancel-event/busy.html) | ➖ | [✅](dialogs/cancel-event/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Remove a listing (`remove-listing`) | [✅](dialogs/remove-listing/default.html) | [✅](dialogs/remove-listing/busy.html) | ➖ | [✅](dialogs/remove-listing/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Moderate a member (`moderate-member`) | [✅](dialogs/moderate-member/default.html) | [✅](dialogs/moderate-member/busy.html) | [✅](dialogs/moderate-member/invalid.html) | [✅](dialogs/moderate-member/failed.html) |  | [✅](dialogs/moderate-member/refused.html) |  |  |  |  |  |  |  |  |  |  | [✅](dialogs/moderate-member/suspend.html) | [✅](dialogs/moderate-member/flagged.html) | [✅](dialogs/moderate-member/flagged-suspend.html) | [✅](dialogs/moderate-member/suspended.html) |  |
| Decline an application (`decline-application`) | [✅](dialogs/decline-application/default.html) | [✅](dialogs/decline-application/busy.html) | [✅](dialogs/decline-application/invalid.html) | [✅](dialogs/decline-application/failed.html) |  | [✅](dialogs/decline-application/refused.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Leave a series (`leave-series`) | [✅](dialogs/leave-series/default.html) | [✅](dialogs/leave-series/busy.html) | ➖ | [✅](dialogs/leave-series/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Delete your account (`delete-account`) | [✅](dialogs/delete-account/default.html) | [✅](dialogs/delete-account/busy.html) | [✅](dialogs/delete-account/invalid.html) | [✅](dialogs/delete-account/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Cancel a series date (`cancel-session`) | [✅](dialogs/cancel-session/default.html) | [✅](dialogs/cancel-session/busy.html) | ➖ | [✅](dialogs/cancel-session/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

### Notifications

| Screen | info | success | warning | danger | with-action | stacked | persistent | draft-saved | changes-saved | event-cancelled | load-failed | member-flagged | member-suspended | member-reinstated | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Toast (`toast`) | [✅](notifications/toast/info.html) | [✅](notifications/toast/success.html) | [✅](notifications/toast/warning.html) | [✅](notifications/toast/danger.html) | [✅](notifications/toast/with-action.html) | [✅](notifications/toast/stacked.html) |  |  |  |  |  |  |  |  |  |
| Banner (`banner`) | [✅](notifications/banner/info.html) | [✅](notifications/banner/success.html) | [✅](notifications/banner/warning.html) | [✅](notifications/banner/danger.html) |  |  | [✅](notifications/banner/persistent.html) |  |  |  |  |  |  |  |  |
| Admin toast (`admin-toast`) | [✅](notifications/admin-toast/info.html) | [✅](notifications/admin-toast/success.html) | [✅](notifications/admin-toast/warning.html) | [✅](notifications/admin-toast/danger.html) | [✅](notifications/admin-toast/with-action.html) | [✅](notifications/admin-toast/stacked.html) |  | [✅](notifications/admin-toast/draft-saved.html) | [✅](notifications/admin-toast/changes-saved.html) | [✅](notifications/admin-toast/event-cancelled.html) | [✅](notifications/admin-toast/load-failed.html) | [✅](notifications/admin-toast/member-flagged.html) | [✅](notifications/admin-toast/member-suspended.html) | [✅](notifications/admin-toast/member-reinstated.html) |  |

<!-- coverage:end -->
