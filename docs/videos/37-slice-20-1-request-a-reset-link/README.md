# 37 · Slice 20.1: Request a reset link

The first slice of journey 20, "Reset a forgotten password": "Forgot your password?" under the
password field on Sign in opens `/forgot-password`, where a member enters the email they joined
with. The button reads "Sending…", then the form gives way to "Check your email", naming the email
as typed, with "Back to sign in" and "send it again". The API answers 202 with no body whether or
not an account has the email; a registered one gets one email with a link to `/reset-password`
that works once and expires in 30 minutes, and only the SHA-256 hash of its token is stored. A
malformed email is named before anything is sent; a failure keeps the email; one account gets at
most three links an hour (ADR 0010). The film is numbered by the slice's row in
`docs/journeys.detailed.md`, as its prompt asked, since it was made while rows 8 to 36 were still
being built.

- **Film:** [`37-slice-20-1-request-a-reset-link.mp4`](37-slice-20-1-request-a-reset-link.mp4),
  1920×1080, 30 fps, 1 min 32 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-044 (AC1 to AC8); ADR 0010.

## Run sheet

| At   | Bars | Scene     | Picture                                                                        | Headline                     |
| ---- | ---- | --------- | ------------------------------------------------------------------------------ | ---------------------------- |
| 0:00 | 4    | `hook`    | Forgot password at 1440 px and "Check your email" at 390 px over the aurora     | A way **back in.**           |
| 0:08 | 4    | `link`    | The link under the password field, Sign in at 390 px, the form at 768 px        | Forgot your **password?**    |
| 0:16 | 5    | `send`    | The "Sending…" form and "Check your email" at 1440 px                           | Check your **email.**        |
| 0:26 | 5    | `secret`  | The same 202 for a member's email and an unknown one                           | Never says **who.**          |
| 0:36 | 5    | `email`   | The email and what is stored                                                   | Thirty **minutes.**          |
| 0:46 | 4    | `invalid` | The summary and field error, close up and at 390 px                            | Named **first.**             |
| 0:54 | 4    | `failed`  | "We couldn't send the email", close up and at 390 px and 1440 px               | Try again, **nothing lost.** |
| 1:02 | 4    | `limit`   | Four requests in an hour, the fourth not sent                                  | Three **an hour.**           |
| 1:10 | 3    | `proof`   | The test counts the runners printed and the initial total                      | Red, then **green.**         |
| 1:16 | 3    | `left`    | Slice 20.2's link, used once within 30 minutes                                 | Choose a **new password.**   |
| 1:22 | 5    | `close`   | The name over the aurora                                                       | Christian Fitness            |

A wipe in a brand colour marks each change of act (into `invalid`, `proof` and `close`); inside an
act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running member app, taken by [`shots.ts`](shots.ts)
  through the page objects `WebSignInPage` and `WebForgotPasswordPage` with the shared fixture of
  `frontend/e2e/fixtures/test.ts` answering the antiforgery token, 202 for the reset request and
  503, after checking the headings, the body and token sent, that a malformed email sent nothing,
  the field marked invalid and the kept email. No backend and no database ran.
- **Drawn, not shot:** the two 202 answers (what `PasswordResetDisclosureTests` asserts: same
  status, headers and bytes, no email for an unknown address), the email and the stored hash
  (`PasswordResetRequestTests`), and the window (`PasswordResetDisclosureTests` with a
  `FakeTimeProvider`). The test counts and the initial total are what `npm test`,
  `npx playwright test --list`, `dotnet test` and `ng build web` printed (`shots/captures.js`).
- It leaves out, though they are built: the keyboard-only request and resend, the dark theme
  (shot, not shown), the SMTP delivery tested against a local SMTP listener, the start-up refusal
  without mail settings, and the telemetry tests (no email, token or link in a span or log).
  Choosing the new password is slice 20.2's.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`); `CF_WEB_PORT` and `CF_ADMIN_PORT` pick free ports:

```shell
node tools/video-record/record.mjs docs/videos/37-slice-20-1-request-a-reset-link
python tools/video-audio/film_audio.py docs/videos/37-slice-20-1-request-a-reset-link
node tools/video-build/build.mjs docs/videos/37-slice-20-1-request-a-reset-link --crf 24
```
