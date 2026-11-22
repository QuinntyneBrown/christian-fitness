# 06 · Slice 2.2: Join refusals

The second and last slice of journey 2, "Join the community": the Join screen names each invalid
field before anything is sent, with an error summary that takes focus and links to each field;
a taken email (compared case-insensitively) is named on the email field with "Sign in instead?";
a body the API refuses shows a generic "Check your details", and a server that does not answer
shows "We couldn't create your profile", with everything typed kept. The API checks the same
rule table in a MediatR validation behaviour and answers 400 with a code (`field_too_long` or
`validation_failed`) and field errors, or 409 `email_taken`, also when the unique index catches a
race (ADR 0008).

- **Film:** [`06-slice-2-2-join-refusals.mp4`](06-slice-2-2-join-refusals.mp4), 1920×1080, 30 fps,
  1 min 32 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-003 (AC2, AC3, AC6), L2-032 (AC1, AC3); ADR 0008.

## Run sheet

| At   | Bars | Scene     | Picture                                                                                  | Headline                     |
| ---- | ---- | --------- | ---------------------------------------------------------------------------------------- | ---------------------------- |
| 0:00 | 4    | `hook`    | The invalid fields at 1440 px and the taken email at 390 px over the aurora              | Say what **to fix.**         |
| 0:08 | 5    | `fields`  | The Join screen naming three fields, at 1440 px and 390 px                               | Each field, **named.**       |
| 0:18 | 4    | `summary` | Close-ups of the error summary and of Password, focused by its link                      | One link, **one field.**     |
| 0:26 | 5    | `taken`   | The taken email at 1440 px and a close-up of its message and link                        | Already **a member?**        |
| 0:36 | 4    | `failed`  | The generic refusal and the failed state at 390 px and 1440 px, the form kept            | Nothing **lost.**            |
| 0:44 | 5    | `api`     | The 400 and 409 ProblemDetails the API tests assert                                      | Checked **twice.**           |
| 0:54 | 4    | `rules`   | The rule table, the two validators and the race answered 409                             | One table, **two stacks.**   |
| 1:02 | 4    | `text`    | Home greeting a name that holds markup as characters                                     | Text stays **text.**         |
| 1:10 | 3    | `proof`   | The test counts the runners printed and the initial total                                | Red, then **green.**         |
| 1:16 | 3    | `left`    | Sign-in, where "Sign in instead?" will lead                                              | Sign in, **sign out.**       |
| 1:22 | 5    | `close`   | The name over the aurora                                                                 | Christian Fitness            |

A wipe in a brand colour marks each change of act (into `api`, `proof` and `close`); inside an
act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running member app, taken by [`shots.ts`](shots.ts)
  through the page objects `WebJoinPage` and `WebHomePage` with the shared fixture of
  `frontend/e2e/fixtures/test.ts` answering `/api/account/join` with 409 `email_taken`, 400
  `field_too_long`, 503 or Grace's session, after checking the summary's links and focus, the
  taken email's message, the alerts' titles and the kept values. No backend and no database ran.
- **Drawn, not shot:** the 400 and 409 bodies (what `JoinValidationTests` and
  `JoinRefusalTests` assert), the rule table (ADR 0008; the row count is what `dotnet test`
  printed for `CreateAccountValidatorTests`) and the race card (`JoinRaceTests`). The test
  counts and the initial total are what `npm test`, `npx playwright test --list`, `dotnet test`
  and `ng build web` printed (`shots/captures.js`).
- It leaves out, though they are built: the unreadable body refused without repeating it, null
  fields named instead of a 500, the telemetry tests (nothing personal in a span or log for a
  refusal), the over-length rows of the form, and the coarse-pointer height of the summary's
  links. Sign-in itself, where "Sign in instead?" leads, is slice 3.1's.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`); `CF_WEB_PORT` and `CF_ADMIN_PORT` pick free ports:

```shell
node tools/video-record/record.mjs docs/videos/06-slice-2-2-join-refusals
python tools/video-audio/film_audio.py docs/videos/06-slice-2-2-join-refusals
node tools/video-build/build.mjs docs/videos/06-slice-2-2-join-refusals --crf 24
```
