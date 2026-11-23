# 53 · Slice 26.1: Find members

Journey 26, "Find members", in one slice, and the admin app's second screen with data. The
Members page lists the members newest joined first, 25 to a page: initials, name and email, home
church ("Not given" when there is none), the day they joined in Toronto, events attended and a
status badge, under the number of members in the community. All, Active, Flagged and Suspended
are tabs that are links; the search waits 300 ms after the last key and looks in names and emails,
never in a home church; the address names the tab, the search and the page, so Back, a reload and
a shared link show the same list. A search nobody matches names the term and offers Clear search;
a status with nobody says so; skeleton rows stand in while members load and an error state offers
Try again. Above 25 matches the pages keep the tab and the search, and a new page moves focus to
the table. Every part on screen is the components library's; the table gained a person cell and
words for an empty cell. `GET /api/admin/members` answers the page, the matches and the
community's size, refuses what it cannot answer with 400 `validation_failed`, and records no
search term, email or home church (ADR 0022).

- **Film:** [`53-slice-26-1-find-members.mp4`](53-slice-26-1-find-members.mp4), 1920×1080, 30 fps,
  1 min 34 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-028 (AC1 to AC6); ADR 0022.

## Run sheet

| At   | Bars | Scene    | Picture                                                                              | Headline                           |
| ---- | ---- | -------- | ------------------------------------------------------------------------------------ | ---------------------------------- |
| 0:00 | 4    | `hook`   | The Members page at 1440 px and at 390 px                                            | Any member, **found.**             |
| 0:08 | 5    | `list`   | The seven members of the cast in a community of 2,431, at 1440 px                    | Everyone, **in a table.**          |
| 0:18 | 4    | `tabs`   | The Flagged tab at 768 px; the Suspended tab at 1440 px with its address             | A tab for **each status.**         |
| 0:26 | 5    | `search` | "grace" in the search with its one member; the two questions the fixture recorded    | Five letters, **one question.**    |
| 0:36 | 4    | `none`   | "No members match “Jessica”" at 1440 px, and close up with Clear search              | Nobody? **It says so.**            |
| 0:44 | 5    | `pages`  | Page 2 of sixty members at 1440 px and 390 px; the pagination close up               | Page **by page.**                  |
| 0:54 | 4    | `states` | Skeleton rows at 1440 px; "Members didn't load" with Try again, close up             | Loading, or **try again.**         |
| 1:02 | 5    | `api`    | The answer's counts and a refusal, and a search's span, as the API tests assert      | One answer, **nothing logged.**    |
| 1:12 | 3    | `proof`  | The test counts the runners printed, the admin initial total and the page's chunk    | Red, then **green.**               |
| 1:18 | 3    | `left`   | Slices 25.1 and 27.1: Flag, Suspend, Reinstate                                       | Then, **moderate.**                |
| 1:24 | 5    | `close`  | The name over the aurora                                                             | Christian Fitness                  |

A wipe in a brand colour marks each change of act (into `search`, `proof` and `close`); inside an
act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running admin app, taken by [`shots.ts`](shots.ts)
  through the page object `AdminMembersPage` with the shared fixture of
  `frontend/e2e/fixtures/test.ts` answering Dana's staff session and, from
  `frontend/e2e/fixtures/admin-members.ts`, the mocks' seven members in a community of 2,431,
  filtered and paged as the API does, sixty members for the pages, a gate for the skeleton rows
  and an aborted request for the error state. Each shot checks what the screen says first: the
  rows and the count, the current tab and its address, the one member "grace" leaves and the
  questions asked, the no-results words, the range and the current page, focus on the table. No
  backend and no database ran.
- **Drawn, not shot:** the two questions are the ones the fixture recorded while "grace" was typed
  a key at a time; the answer's counts, the refusal and the span are drawn from what
  `SearchAdminMembersTests` and `MembersTelemetryTests` assert. The test counts, the initial total
  and the page's chunk are what `npm test`, `npx playwright test --list`, `dotnet test` and
  `ng build admin` printed (`shots/captures.js`).
- It leaves out, though they are built: the dark theme and the tab-empty state (shot, not shown),
  Escape clearing the search, a tab keeping the search, the pages staying in place while the next
  one loads, a page past the last answering the last, and names and terms shown as text. Events
  attended is 0 for everyone until slice 6.1 registers members; the report banner, flagging and
  suspending are slices 25.1 and 27.1.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`); `CF_WEB_PORT` and `CF_ADMIN_PORT` pick free ports:

```shell
node tools/video-record/record.mjs docs/videos/53-slice-26-1-find-members
python tools/video-audio/film_audio.py docs/videos/53-slice-26-1-find-members
node tools/video-build/build.mjs docs/videos/53-slice-26-1-find-members --crf 24
```
