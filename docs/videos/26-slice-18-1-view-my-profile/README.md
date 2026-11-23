# 26 · Slice 18.1: View my profile

The first slice of journey 18, "Build my profile": the member's initials in the header open the
lazy `/profile` screen without a reload, marked `aria-current="page"`. It shows the member's name,
initials avatar, "Member since …", home church and city when given, bio, goals, interests and
"Going to", the events they registered for, soonest first, dated by the Toronto calendar day. A new
profile shows the mock's empty sentences and "Not going to anything yet." with "Browse events". A
skeleton holds the page's shape while it loads; a 4xx answer shows "Your profile didn't load" with
Try again (a 5xx opens the server-error screen). `GET /api/profile/me` takes the member from the
session, never from the address, and logs nothing personal (ADR 0013). Event registration is
slice 6.1's, so "Going to" reads from a registrations query that answers none yet. The film is
numbered by the slice's row in `docs/journeys.detailed.md`, as its prompt asked, since it was made
while earlier rows were still being built.

- **Film:** [`26-slice-18-1-view-my-profile.mp4`](26-slice-18-1-view-my-profile.mp4),
  1920×1080, 30 fps, 1 min 26 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-005 (AC1, AC2); ADR 0013.

## Run sheet

| At   | Bars | Scene     | Picture                                                                   | Headline                 |
| ---- | ---- | --------- | ------------------------------------------------------------------------- | ------------------------ |
| 0:00 | 4    | `hook`    | The profile at 1440 px and 390 px over the aurora                          | A page of **your own.**  |
| 0:08 | 4    | `avatar`  | The header on Home, then on Profile with the avatar marked current         | Your **initials.**       |
| 0:16 | 5    | `profile` | The profile at 390 px, 768 px and 1440 px dark                             | All of **you.**          |
| 0:26 | 4    | `going`   | "Going to", close up, with the two dates the screen showed                 | Going **to.**            |
| 0:34 | 5    | `empty`   | A new profile at 390 px and its "Going to" empty state                     | Nothing **yet.**         |
| 0:44 | 5    | `states`  | The skeleton at 1440 px, "Your profile didn't load" close up and at 390 px | Try **again.**           |
| 0:54 | 5    | `private` | The API's answers for two sessions and none                                | Only **yours.**          |
| 1:04 | 3    | `proof`   | The test counts the runners printed and the initial total                  | Red, then **green.**     |
| 1:10 | 3    | `left`    | Slice 18.2's Edit profile                                                  | Edit your **profile.**   |
| 1:16 | 5    | `close`   | The name over the aurora                                                   | Christian Fitness        |

A wipe in a brand colour marks each change of act (into `empty`, `proof` and `close`); inside an
act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running member app, taken by [`shots.ts`](shots.ts)
  through the page objects `WebHomePage`, `WebMemberShell` and `WebProfilePage` with the shared
  fixture of `frontend/e2e/fixtures/test.ts` answering the session and `GET /api/profile/me` with
  the e2e profiles, a held answer and a 404, after checking the name, "Member since …", the
  interests, the two events, the empty state's link and the error heading. The events' photos
  are the mocks' pictures, served at a local path for the take. No backend and no database ran.
- **Drawn, not shot:** the API's answers for two sessions and none (what `OwnProfileTests`
  asserts) and the absence of personal data in spans and logs (`ProfileTelemetryTests`). The
  test counts and the initial total are what `npm test`, `npx playwright test --list`,
  `dotnet test` and `ng build web` printed (`shots/captures.js`).
- It leaves out, though they are built: the keyboard path to the avatar, a profile with no
  church or city, markup in a bio shown as text, unknown interests dropped and the 5xx case.
  Editing is slice 18.2's; events a member is going to arrive with slice 6.1.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`); `CF_WEB_PORT` and `CF_ADMIN_PORT` pick free ports:

```shell
node tools/video-record/record.mjs docs/videos/26-slice-18-1-view-my-profile
python tools/video-audio/film_audio.py docs/videos/26-slice-18-1-view-my-profile
node tools/video-build/build.mjs docs/videos/26-slice-18-1-view-my-profile --crf 24
```
