# 04 · Slice 30.1: Not found and server error

The first slice of journey 30, "Recover from errors and offline": in both apps, a URL no route
matches lazy-loads a "Page not found" screen, and the `server-error` route shows "Something went
wrong" with the reference the API gave and a way back. Both use the design system's error-page
block from `components`. Every 5xx ProblemDetails from the API now carries a `reference`
(`CF-` and the first eight hex digits of the trace id). The interceptor that opens the
server-error screen is built and tested in `domain`; the first screen that loads data registers
it (ADR 0006).

- **Film:** [`04-slice-30-1-not-found-and-server-error.mp4`](04-slice-30-1-not-found-and-server-error.mp4),
  1920×1080, 30 fps, 1 min 32 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-043 (AC1 to AC7), L2-035 (the initial budget) and L2-032 AC3 (text
  rendered as text); ADR 0006.

## Run sheet

| At   | Bars | Scene         | Picture                                                                              | Headline                        |
| ---- | ---- | ------------- | ------------------------------------------------------------------------------------ | ------------------------------- |
| 0:00 | 4    | `hook`        | The member not-found screen and the admin server-error screen (dark) over the aurora | Lost? **A way back.**           |
| 0:08 | 5    | `notfound`    | The member not-found screen at 1440 px with its title and URL, and at 390 px         | Page **not found.**             |
| 0:18 | 4    | `waysback`    | A close-up of the two links and where they go                                        | Two **ways back.**              |
| 0:26 | 4    | `admin`       | The admin not-found screen, dark at 1440 px and light at 390 px                      | Staff too, **same words.**      |
| 0:34 | 5    | `servererror` | The member server-error screen at 1440 px and 390 px                                 | Our fault, **try again.**       |
| 0:44 | 5    | `reference`   | The reference sentence beside the traceparent and the 500 ProblemDetails             | Quote it. **Find it.**          |
| 0:54 | 4    | `guard`       | A crafted link's screen: no reference sentence, Try again to `/`                     | No words **but ours.**          |
| 1:02 | 4    | `budget`      | 220 kB filling a bar to the 225 kB warning and the 250 kB error                      | Loaded when **needed.**         |
| 1:10 | 4    | `proof`       | The test counts the runners printed                                                  | Red, then **green.**            |
| 1:18 | 3    | `left`        | A GET 500, the interceptor, `/server-error`                                          | Ready, **waiting.**             |
| 1:24 | 4    | `close`       | The name over the aurora                                                             | Christian Fitness               |

A wipe in a brand colour marks each change of act (into `servererror`, `budget` and `close`);
inside an act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running apps, taken by [`shots.ts`](shots.ts) through
  the page objects `WebNotFoundPage`, `AdminNotFoundPage`, `WebServerErrorPage` and
  `AdminServerErrorPage` with the shared fixture of `frontend/e2e/fixtures/test.ts`, after
  checking the focused heading, the links and the reference sentence. No backend and no database
  ran. The server-error screen is opened as the interceptor opens it: `/server-error` with
  `reference` and `from`.
- **Drawn, not shot:** the traceparent and ProblemDetails card (its values are those of the API
  test `the 500 carries a reference from its trace id`), the link targets, the budget bar
  (220.4 kB is the initial total `ng build` printed) and the interceptor's path. The test counts
  are what `npm test`, `npx playwright test --list` and `dotnet test` printed
  (`shots/captures.js`).
- It leaves out, though they are built: the admin server-error screen (shot, not shown), the
  44 px coarse-pointer target of a small button, and the screen for a reference that is missing
  rather than crafted. The interceptor is not shown working in a
  running app: no screen loads data yet.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`):

```shell
node tools/video-record/record.mjs docs/videos/04-slice-30-1-not-found-and-server-error
python tools/video-audio/film_audio.py docs/videos/04-slice-30-1-not-found-and-server-error
node tools/video-build/build.mjs docs/videos/04-slice-30-1-not-found-and-server-error --crf 24
```
