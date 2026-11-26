# 10 · Slice 9.2: Two-step verification

> **Retired.** ADR 0100 removed the staff password and two-step code that this film shows (journey
> 3, staff sign in with Google Workspace). Its `shots.ts` imports page objects that no longer exist
> and is kept only as the record of that slice; it cannot be rerun.

The second slice of journey 9, "Staff sign-in with two-step": after the right password, staff are
not signed in yet. The API answers 202 with no body and a short pending sign-in named by its own
`__Host-cf-admin-step` cookie, and the admin app opens "Enter your code" at `/sign-in/verify`.
Staff enter the 6-digit code from their authenticator app (TOTP, RFC 6238, one 30-second step of
drift either side, spaces allowed); the button reads "Verifying…" and the Dashboard opens. A wrong
or already used code is said under the field, which keeps the code and takes focus. Five wrong
codes in 15 minutes end the pending sign-in with "Too many codes tried" (429 `too_many_attempts`,
counted with slice 20.1's `AttemptWindow`); after 5 minutes it ends with "Sign in again" (401
`two_step_expired`). Staff without an authenticator are told "Two-step verification isn't set up"
(403 `two_step_not_set_up`), and an operator sets one up with `cf two-step <email>`. No code,
secret or cookie is recorded in any log or span (ADR 0013).

- **Film:** [`10-slice-9-2-two-step-verification.mp4`](10-slice-9-2-two-step-verification.mp4),
  1920×1080, 30 fps, 1 min 20 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-046 (AC1 to AC8), L2-018 (AC1); ADR 0013.

## Run sheet

| At   | Bars | Scene     | Picture                                                                           | Headline                       |
| ---- | ---- | --------- | --------------------------------------------------------------------------------- | ------------------------------ |
| 0:00 | 5    | `hook`    | Enter your code at 1440 px and 390 px over the aurora                             | Two **steps.**                 |
| 0:10 | 5    | `code`    | The "Verifying…" card, the code screen at 768 px and the Dashboard at 1440 px     | Six digits, **then in.**       |
| 0:20 | 5    | `wrong`   | "That code doesn't match…" under the field, close up and at 390 px                | Not that **code.**             |
| 0:30 | 5    | `endings` | "Too many codes tried" and "Sign in again" close up; Staff sign in at 1440 px     | Five tries, **five minutes.**  |
| 0:40 | 4    | `setup`   | "Two-step verification isn't set up" and `cf two-step`                            | Ask an **Admin.**              |
| 0:48 | 5    | `api`     | The 202 and step cookie, and the three refusals the API tests assert              | Pending, **not signed in.**    |
| 0:58 | 3    | `proof`   | The test counts the runners printed, the admin initial total and the lazy chunk   | Red, then **green.**           |
| 1:04 | 3    | `left`    | Slice 9.3's idle expiry and forbidden screen                                      | Idle **expiry.**               |
| 1:10 | 5    | `close`   | The name over the aurora                                                          | Christian Fitness              |

A wipe in a brand colour marks each change of act (into `api`, `proof` and `close`); inside an
act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running admin app, taken by [`shots.ts`](shots.ts)
  through the page objects `AdminStaffSignInPage`, `AdminTwoStepPage` and `AdminShell` with the
  shared fixture of `frontend/e2e/fixtures/test.ts` answering the antiforgery token, 202 for the
  password step, Dana's staff session for the right code, 401 `invalid_code`, 429
  `too_many_attempts`, 401 `two_step_expired` and 403 `two_step_not_set_up`, after checking the
  field's `one-time-code` and `numeric` hints, "Verifying…" and the disabled button, the code and
  token sent, the field's error, `aria-invalid`, kept value and focus, and each alert's title and
  focus. No backend and no database ran.
- **Drawn, not shot:** the API's answers (what `TwoStepTests`, `TwoStepRefusalTests` and
  `TwoStepTelemetryTests` assert) and `cf two-step`'s words, from the CLI's source, with the secret
  hidden. The test counts, the initial total and the code screen's chunk are what `npm test`,
  `npx playwright test --list`, `dotnet test` and `ng build admin` printed (`shots/captures.js`).
- It leaves out, though they are built: the keyboard-only code entry, the dark theme (shot, not
  shown), the failed state, a neighbouring step's code with spaces, a new password step replacing
  the pending one, and the RFC 6238 test vectors. There is no "Trust this browser" and no backup
  codes (ADR 0013). The idle expiry and the forbidden screen are slice 9.3's.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`); `CF_WEB_PORT` and `CF_ADMIN_PORT` pick free ports:

```shell
node tools/video-record/record.mjs docs/videos/10-slice-9-2-two-step-verification
python tools/video-audio/film_audio.py docs/videos/10-slice-9-2-two-step-verification
node tools/video-build/build.mjs docs/videos/10-slice-9-2-two-step-verification --crf 24
```
