# 05 · Slice 2.1: Join with valid details

The first slice of journey 2, "Join and set up a profile", and the first through every layer: a
visitor fills in the Join screen from the mock, `POST /api/account/join` (anonymous) creates the
account with only a PBKDF2 hash of the password and signs it in with the `__Host-cf-session`
cookie, and the member lands on a Home stand-in greeted by first name (ADR 0007). Home church is
optional and a blank one is stored as none. The member app now provides `HttpClient` with the
server-error interceptor, so a 5xx while Home loads opens "Something went wrong" (ADR 0006).

- **Film:** [`05-slice-2-1-join-with-valid-details.mp4`](05-slice-2-1-join-with-valid-details.mp4),
  1920×1080, 30 fps, 1 min 30 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-003 (AC1, AC4, AC5), L2-030 (AC1, AC2), L2-033 (AC1, AC2), L2-043
  AC4 and L2-035 (the initial budget); ADRs 0006 and 0007.

## Run sheet

| At   | Bars | Scene         | Picture                                                                          | Headline                      |
| ---- | ---- | ------------- | -------------------------------------------------------------------------------- | ----------------------------- |
| 0:00 | 4    | `hook`        | The filled Join screen at 1440 px and Home at 390 px over the aurora             | Join. **Signed in.**          |
| 0:08 | 5    | `join`        | The Join screen at 1440 px and 390 px with Grace's details, Running and Strength | Create your **profile.**      |
| 0:18 | 4    | `optional`    | A close-up of the blank Home church field beside the body the form sent          | Faith details, **optional.**  |
| 0:26 | 4    | `submitting`  | The submitting state and a close-up of the busy button                           | Busy, **not stuck.**          |
| 0:34 | 4    | `home`        | The Home stand-in, dark at 1440 px and light at 390 px                           | Welcome, **Grace.**           |
| 0:42 | 5    | `api`         | The request, the hash and the cookie's attributes                                | One request, **signed in.**   |
| 0:52 | 5    | `servererror` | The server-error screen at `/home` after a 500 to `GET /api/session`             | Interceptor, **switched on.** |
| 1:02 | 4    | `budget`      | 255 kB filling a bar to the 260 kB warning and the 275 kB error                  | Paid **once.**                |
| 1:10 | 3    | `proof`       | The test counts the runners printed                                              | Red, then **green.**          |
| 1:16 | 3    | `left`        | The refusals of slice 2.2                                                        | Join **refusals.**            |
| 1:22 | 4    | `close`       | The name over the aurora                                                         | Christian Fitness             |

A wipe in a brand colour marks each change of act (into `api`, `budget` and `close`); inside an
act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running member app, taken by [`shots.ts`](shots.ts)
  through the page objects `WebJoinPage`, `WebHomePage` and `WebServerErrorPage` with the shared
  fixture of `frontend/e2e/fixtures/test.ts` answering `/api/account/join` and `/api/session`,
  after checking the pressed interests, the busy button, the greeting and the server-error
  screen's address. No backend and no database ran. The submitting state is held by a join
  answer that waits until the shot is taken.
- **Drawn, not shot:** the request body (what the page sent, captured by the fixture), the hash
  and cookie card (the attributes the API tests `JoinTests` assert), the budget bar (255.1 kB is
  the initial total `ng build web` printed) and the refusals to come. The test counts are what
  `npm test`, `npx playwright test --list` and `dotnet test` printed (`shots/captures.js`).
- It leaves out, though they are built: joining by keyboard, the 44 px coarse-pointer target of
  an interest, the telemetry tests (no name, email or church in a span or log), and the 4xx and
  write cases of the interceptor. Validation and the error state are slice 2.2's; antiforgery,
  security headers and the sign-in guard are slice 3.1's.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`):

```shell
node tools/video-record/record.mjs docs/videos/05-slice-2-1-join-with-valid-details
python tools/video-audio/film_audio.py docs/videos/05-slice-2-1-join-with-valid-details
node tools/video-build/build.mjs docs/videos/05-slice-2-1-join-with-valid-details --crf 24
```
