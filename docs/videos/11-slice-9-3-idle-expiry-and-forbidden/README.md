# 11 · Slice 9.3: Idle expiry and forbidden

The last slice of journey 9, "Staff sign-in with two-step". A staff session now ends after 30
minutes without a request: every request renews it for 30 more minutes (the cookie handler's
`OnCheckSlidingExpiration` renews on each one, not only after half its lifetime), and the first
request after 30 quiet minutes is answered 401 `session_expired`, the session row deleted and the
cookie expired. The admin app checks the session on every move between areas, so the next move
opens Staff sign in with "Your session expired". A read the API refuses 403 shows "Staff only" in
place of the screen, its heading focused and the URL staff opened or were moving to in the address
bar, with a Sign out button that reads "Signing out…" while it waits. Five wrong passwords in 15
minutes now pause staff sign-in too, counted with the member app's failures in slice 3.2's
`SignInFailures` table: "Sign-in paused for 15 minutes", 429 `too_many_attempts` (ADR 0016).

- **Film:** [`11-slice-9-3-idle-expiry-and-forbidden.mp4`](11-slice-9-3-idle-expiry-and-forbidden.mp4),
  1920×1080, 30 fps, 1 min 30 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-018 (AC3, AC5), L2-004 (AC3), L2-047 (AC1, AC2); ADR 0016.

## Run sheet

| At   | Bars | Scene       | Picture                                                                        | Headline                    |
| ---- | ---- | ----------- | ------------------------------------------------------------------------------ | --------------------------- |
| 0:00 | 5    | `hook`      | "Your session expired" on Staff sign in at 1440 px and 390 px over the aurora  | Half an hour, **then out.** |
| 0:10 | 5    | `idle`      | The Dashboard, and the session's answers after 29 and 30 idle minutes          | Thirty quiet **minutes.**   |
| 0:20 | 5    | `notice`    | "Your session expired" close up, at 768 px and at 1440 px dark                 | Your session **expired.**   |
| 0:30 | 5    | `forbidden` | "Staff only" at 1440 px with `/members` in the address bar, and at 390 px      | Staff **only.**             |
| 0:40 | 4    | `signout`   | "Signing out…" close up; "Staff only" at 768 px and 1440 px dark               | Signing **out.**            |
| 0:48 | 5    | `paused`    | "Sign-in paused for 15 minutes" close up, at 1440 px and 390 px                | Paused in **both apps.**    |
| 0:58 | 5    | `api`       | The renewal on every request and the shared pause, as the API tests assert     | Every request **counts.**   |
| 1:08 | 3    | `proof`     | The test counts the runners printed, the admin initial total and the lazy chunk | Red, then **green.**        |
| 1:14 | 3    | `left`      | Slice 29.1's Admin and Moderator roles                                         | Staff **roles.**            |
| 1:20 | 5    | `close`     | The name over the aurora                                                       | Christian Fitness           |

A wipe in a brand colour marks each change of act (into `forbidden`, `proof` and `close`); inside
an act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running admin app, taken by [`shots.ts`](shots.ts)
  through the page objects `AdminShell`, `AdminStaffSignInPage` and `AdminForbiddenPage` with the
  shared fixture of `frontend/e2e/fixtures/test.ts` answering Dana's staff session until it
  expires (then 401 `session_expired`) or her role is taken away (then 403 `not_staff`), 204 for
  signing out, and 429 `too_many_attempts` for the paused sign-in, after checking each alert's
  title, text and focus, the `/sign-in` and `/members` addresses, the "Staff only" title and
  focused heading, "Signing out…" and the disabled button, and Sign in left enabled while paused.
  No backend and no database ran.
- **Drawn, not shot:** the API's answers, from what `StaffIdleExpiryTests` and
  `StaffSignInLockoutTests` assert. The test counts, the initial total and the forbidden screen's
  chunk are what `npm test`, `npx playwright test --list`, `dotnet test` and `ng build admin`
  printed (`shots/captures.js`).
- It leaves out, though they are built: a failed sign-out leaving "Staff only" with Sign out
  enabled, Sign out by keyboard, a write's 403 left to its screen (L2-047 AC3), member failures
  pausing staff sign-in and the other way round, and the sliding 15-minute window. A reload after
  the session expired shows Staff sign in without the notice (ADR 0016). Per-request role checks
  and the Moderator role are slice 29.1's.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`); `CF_WEB_PORT` and `CF_ADMIN_PORT` pick free ports:

```shell
node tools/video-record/record.mjs docs/videos/11-slice-9-3-idle-expiry-and-forbidden
python tools/video-audio/film_audio.py docs/videos/11-slice-9-3-idle-expiry-and-forbidden
node tools/video-build/build.mjs docs/videos/11-slice-9-3-idle-expiry-and-forbidden --crf 24
```
