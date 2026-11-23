# 09 · Slice 9.1: Staff sign-in and admin shell

The first slice of journey 9, "Staff sign-in with two-step": staff sign in to the admin app at
`/sign-in` with their work email and password and land on the Dashboard in the admin layout,
with their name and role in the sidebar. A member without a staff role is refused with "This
account isn't on the team"; wrong credentials get one message, "Email or password is incorrect",
that names neither field. The sidebar's four areas (stand-ins until their slices) open without a
page reload and carry `aria-current="page"`; below 1024 px the sidebar becomes a band whose links
scroll within it, with a 44 px Sign out that ends the session on the server. A staff route opened
without a session goes to sign in, and a 5xx opens the admin server-error screen. On the API,
every endpoint under `api/admin` needs the `Staff` policy and its own `__Host-cf-admin` cookie
(ADR 0011).

- **Film:** [`09-slice-9-1-staff-sign-in-and-admin-shell.mp4`](09-slice-9-1-staff-sign-in-and-admin-shell.mp4),
  1920×1080, 30 fps, 1 min 28 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-018 (AC1 to AC4, AC6), L2-021 (AC1, AC2), L2-043 (AC4); ADR 0011.

## Run sheet

| At   | Bars | Scene    | Picture                                                                        | Headline                     |
| ---- | ---- | -------- | ------------------------------------------------------------------------------ | ---------------------------- |
| 0:00 | 4    | `hook`   | Staff sign in at 1440 px and 390 px over the aurora                            | Staff **only.**              |
| 0:08 | 5    | `signin` | The "Signing in…" card, Staff sign in at 768 px and the Dashboard at 1440 px   | Straight **in.**             |
| 0:18 | 5    | `refuse` | "This account isn't on the team", close up and at 390 px; the generic message  | Members **turned away.**     |
| 0:28 | 5    | `shell`  | Events at 1440 px after a click from the Dashboard, the navigation close up    | Four areas, **one click.**   |
| 0:38 | 5    | `band`   | The band close up, Services at 390 px and 768 px, Sign out's measured size     | A band, **not a maze.**      |
| 0:48 | 4    | `guard`  | `/events` landing on sign in; the server-error screen after a 500              | No session, **no entry.**    |
| 0:56 | 5    | `api`    | The 401 and 403 `not_staff` answers and the staff cookie the API tests assert  | Every endpoint **guarded.**  |
| 1:06 | 3    | `proof`  | The test counts the runners printed and the admin initial total                | Red, then **green.**         |
| 1:12 | 3    | `left`   | Slice 9.2's second step, slice 3.2's lockout and slice 9.3's idle expiry       | Two steps, **then lockout.** |
| 1:18 | 5    | `close`  | The name over the aurora                                                       | Christian Fitness            |

A wipe in a brand colour marks each change of act (into `shell`, `proof` and `close`); inside an
act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running admin app, taken by [`shots.ts`](shots.ts)
  through the page objects `AdminStaffSignInPage`, `AdminShell` and `AdminServerErrorPage` with
  the shared fixture of `frontend/e2e/fixtures/test.ts` answering the antiforgery token, Dana's
  staff session, 403 `not_staff`, 401 `invalid_credentials`, 401 for no session, 500 and 204 for
  sign-out, after checking the alerts' titles and focus, that no field is marked, the token sent
  with sign-in and sign-out, the current area, that the click to Events did not reload the page,
  the band's one row with no sideways page scroll, Sign out's 44 px size and the redirect from
  `/events` to `/sign-in`. No backend and no database ran.
- **Drawn, not shot:** the API's answers (what `StaffAccessTests` and `StaffSignInTests` assert:
  401 with no data for no session or a member's, 403 `not_staff` with no cookie, and the
  `__Host-cf-admin` cookie's attributes). The test counts and the initial total are what
  `npm test`, `npx playwright test --list`, `dotnet test` and `ng build admin` printed
  (`shots/captures.js`).
- It leaves out, though they are built: the keyboard-only sign-in and navigation, the dark theme
  (shot, not shown), the failed state, a staff role removed since sign-in refused on the next
  session check, and the shared credential check that makes a wrong password take as long for a
  staff account as for a member. The second step is slice 9.2's, the lockout slice 3.2's, the
  idle expiry slice 9.3's and the real Dashboard slice 28.1's.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`); `CF_WEB_PORT` and `CF_ADMIN_PORT` pick free ports:

```shell
node tools/video-record/record.mjs docs/videos/09-slice-9-1-staff-sign-in-and-admin-shell
python tools/video-audio/film_audio.py docs/videos/09-slice-9-1-staff-sign-in-and-admin-shell
node tools/video-build/build.mjs docs/videos/09-slice-9-1-staff-sign-in-and-admin-shell --crf 24
```
