# 38 · Slice 20.2: Choose a new password

The second and last slice of journey 20, "Reset a forgotten password": the emailed link opens
`/reset-password`, which reads the token from the link's fragment, takes it out of the address bar
and checks it ("Checking your link…") before naming the account. Two matching passwords of at
least 8 characters are saved through "Saving…" to "Password saved"; saving spends every unused
link of the member and ends every session, this browser's included, and signs nobody in. A used,
expired or unknown link shows "This link has expired" with "Send a new link"; a short or
mismatched password is named first; a failure keeps both fields; two saves with one link cannot
both win (ADR 0012). The film is numbered by the slice's row in `docs/journeys.detailed.md`, as its
prompt asked, since it was made while rows 8 to 36 were still being built.

- **Film:** [`38-slice-20-2-choose-a-new-password.mp4`](38-slice-20-2-choose-a-new-password.mp4),
  1920×1080, 30 fps, 1 min 38 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-045 (AC1 to AC7); ADR 0012.

## Run sheet

| At   | Bars | Scene        | Picture                                                                    | Headline                     |
| ---- | ---- | ------------ | -------------------------------------------------------------------------- | ---------------------------- |
| 0:00 | 4    | `hook`       | The form at 1440 px and "Password saved" at 390 px over the aurora          | A new **password.**          |
| 0:08 | 5    | `open`       | "Checking your link…" close up, the form at 768 px and 390 px               | Checked **first.**           |
| 0:18 | 5    | `token`      | The link's fragment, the body it travels in, the address bar after          | Out of the **address bar.**  |
| 0:28 | 5    | `save`       | "Saving…" close up and "Password saved" at 1440 px                          | Password **saved.**          |
| 0:38 | 5    | `everywhere` | Every session of the member answering 401, another member's 200             | Signed out **everywhere.**   |
| 0:48 | 5    | `once`       | The 410 and "This link has expired" at 1440 px and 390 px                   | Works **once.**              |
| 0:58 | 4    | `invalid`    | The summary and the confirm field's error, close up and at 390 px           | Named **first.**             |
| 1:06 | 4    | `failed`     | "We couldn't save your password", close up and at 390 px and 1440 px        | Try again, **nothing lost.** |
| 1:14 | 4    | `race`       | Two saves with one link: the first 204, the second 410                      | Never **twice.**             |
| 1:22 | 3    | `proof`      | The test counts the runners printed and the initial total                   | Red, then **green.**         |
| 1:28 | 5    | `close`      | The name over the aurora                                                    | Christian Fitness            |

A wipe in a brand colour marks each change of act (into `invalid`, `proof` and `close`); inside an
act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running member app, taken by [`shots.ts`](shots.ts)
  through the page object `WebResetPasswordPage` with the shared fixture of
  `frontend/e2e/fixtures/test.ts` answering the antiforgery token, the link's check, 204 for the
  save, 410 `reset_link_expired` and 503, after checking the headings, the bodies and token sent,
  the address bar without the token, that a mismatch sent nothing, and the kept passwords. No
  backend and no database ran.
- **Drawn, not shot:** the ended sessions (`PasswordResetCompleteTests`: both cookies of the member
  answer 401 afterwards, another member's 200), the single use and the 410 for used, expired and
  unknown links (`PasswordResetRefusalTests`, with a `FakeTimeProvider`) and the race
  (`PasswordResetRaceTests`). The test counts and the initial total are what `npm test`,
  `npx playwright test --list`, `dotnet test` and `ng build web` printed (`shots/captures.js`).
- It leaves out, though they are built: the keyboard-only save, the dark theme (shot, not shown),
  the failed check with "Try again", the 400 for a short password, the other links of the account
  stopping, and the telemetry test (no token, password or email in a span or log). A per-address
  limit on reset requests is not built: it waits for L2-034's rate limiting (ADR 0012).

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`); `CF_WEB_PORT` and `CF_ADMIN_PORT` pick free ports:

```shell
node tools/video-record/record.mjs docs/videos/38-slice-20-2-choose-a-new-password
python tools/video-audio/film_audio.py docs/videos/38-slice-20-2-choose-a-new-password
node tools/video-build/build.mjs docs/videos/38-slice-20-2-choose-a-new-password --crf 24
```
