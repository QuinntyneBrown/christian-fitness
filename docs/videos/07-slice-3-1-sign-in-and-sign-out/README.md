# 07 · Slice 3.1: Sign in and sign out

The first slice of journey 3, "Sign in and out": a registered member signs in at `/sign-in` with
their email and password and lands on Home; wrong credentials get one message, "Email or password
is incorrect", that names neither field; a failure shows "We couldn't sign you in" with what was
typed kept. Signed in, the member shell's header offers Sign out, a 44 px target at every
viewport, which ends the session on the server (a replayed cookie is refused). A member route
opened without a session goes to sign in. Every state-changing request carries an antiforgery
token, and every API response carries the security headers (ADR 0009).

- **Film:** [`07-slice-3-1-sign-in-and-sign-out.mp4`](07-slice-3-1-sign-in-and-sign-out.mp4),
  1920×1080, 30 fps, 1 min 26 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-004 (AC1, AC2, AC5), L2-008 (AC4), L2-030 (AC3, AC4), L2-032 (AC1);
  ADR 0009.

## Run sheet

| At   | Bars | Scene     | Picture                                                                              | Headline                      |
| ---- | ---- | --------- | ------------------------------------------------------------------------------------ | ----------------------------- |
| 0:00 | 4    | `hook`    | Sign in at 1440 px and Home at 390 px over the aurora                                | Welcome **back.**             |
| 0:08 | 5    | `signin`  | Sign in at 768 px, the "Signing in…" form and Home at 1440 px                        | Straight **to Home.**         |
| 0:18 | 5    | `wrong`   | The wrong-credentials alert, close up and at 390 px                                  | Never says **which.**         |
| 0:28 | 4    | `failed`  | "We couldn't sign you in", close up and at 390 px and 1440 px                        | Try again, **nothing lost.**  |
| 0:36 | 5    | `signout` | The header at 390 px, its measured size, and the sign-out answers                    | Sign out, **for real.**       |
| 0:46 | 4    | `guard`   | `/home` landing on sign in after signing out                                         | Members **only.**             |
| 0:54 | 5    | `protect` | The 400 `antiforgery_failed` and the security headers the API tests assert           | Only you **act.**             |
| 1:04 | 3    | `proof`   | The test counts the runners printed and the initial total                            | Red, then **green.**          |
| 1:10 | 3    | `left`    | Slice 3.2's codes and the return to the route asked for                              | Sign-in **protections.**      |
| 1:16 | 5    | `close`   | The name over the aurora                                                             | Christian Fitness             |

A wipe in a brand colour marks each change of act (into `signout`, `proof` and `close`); inside
an act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running member app, taken by [`shots.ts`](shots.ts)
  through the page objects `WebSignInPage`, `WebHomePage` and `WebMemberShell` with the shared
  fixture of `frontend/e2e/fixtures/test.ts` answering the antiforgery token, Grace's session,
  401 `invalid_credentials`, 503, and 204 for sign-out, after checking the alerts' titles, that no
  field is marked, the kept values, the token sent with sign-in and sign-out, the Sign out
  button's 44 px height and the redirect from `/home` to `/sign-in`. No backend and no database
  ran.
- **Drawn, not shot:** the sign-out answers (what `SignOutTests` asserts: 204, a replayed cookie
  refused 401, another session still open), the 400 `antiforgery_failed` (`AntiforgeryTests`) and
  the headers (`SecurityHeadersTests`). The test counts and the initial total are what
  `npm test`, `npx playwright test --list`, `dotnet test` and `ng build web` printed
  (`shots/captures.js`).
- It leaves out, though they are built: the keyboard-only sign-in and sign-out, the dark theme
  (shot, not shown), the unknown email verified against a fixed hash so it takes as long as a
  wrong password, the telemetry tests (no email or password in a span or log), the expired
  sessions cleaned up, and the production build with no inline script for the static host's CSP.
  The lockout, the suspended refusal and the return to the route asked for are slice 3.2's.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`); `CF_WEB_PORT` and `CF_ADMIN_PORT` pick free ports:

```shell
node tools/video-record/record.mjs docs/videos/07-slice-3-1-sign-in-and-sign-out
python tools/video-audio/film_audio.py docs/videos/07-slice-3-1-sign-in-and-sign-out
node tools/video-build/build.mjs docs/videos/07-slice-3-1-sign-in-and-sign-out --crf 24
```
