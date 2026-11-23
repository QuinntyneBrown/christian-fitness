# 08 · Slice 3.2: Sign-in protections

The second slice of journey 3, "Sign in and out": five failed sign-ins for one email within 15
minutes pause sign-in, and the next attempt is refused 429 `too_many_attempts`, even with the
right password, until the oldest failure leaves the window; an unknown email pauses too. A
suspended member who gives the right password is refused 403 `account_suspended` and told to
contact the team. A visitor sent to sign in from a member route is returned to it afterwards, and
a return address that is not a path inside the app opens Home. Carried over from slice 2.2, the
sixth account created from one address in an hour is refused 429 `rate_limited` (ADR 0011).

- **Film:** [`08-slice-3-2-sign-in-protections.mp4`](08-slice-3-2-sign-in-protections.mp4),
  1920×1080, 30 fps, 1:28. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-004 (AC3, AC4, AC6), L2-034 (AC2); ADR 0011.

## Run sheet

| At   | Bars | Scene       | Picture                                                                           | Headline                          |
| ---- | ---- | ----------- | --------------------------------------------------------------------------------- | --------------------------------- |
| 0:00 | 5    | `hook`      | The paused screen at 1440 px and the suspended one at 390 px over the aurora      | Guard **the door.**               |
| 0:10 | 5    | `paused`    | "Sign-in paused for 15 minutes" and its "Reset your password", at 768 and 390 px | Five tries, **then a pause.**     |
| 0:20 | 5    | `window`    | The 15-minute window sliding past five failures a minute apart, and the 429       | Fifteen minutes, **sliding.**     |
| 0:30 | 4    | `suspended` | "Your account is suspended" close up and at 1440 px                               | Suspended, **and told.**          |
| 0:38 | 5    | `return`    | `/home?welcome=back`, the sign-in screen with its `returnUrl`, then Home again     | Right back **where you were.**    |
| 0:48 | 4    | `crafted`   | A `returnUrl` to another site, signed in at 390 px, landing on `/home`            | Never **off-site.**               |
| 0:56 | 5    | `join`      | "Too many new profiles" close up and at 390 px, and the 429 `rate_limited`        | Five **an hour.**                 |
| 1:06 | 3    | `proof`     | The test counts the runners printed and the initial total                         | Red, then **green.**              |
| 1:12 | 3    | `left`      | Slice 9.1: staff sign-in, the admin shell, members refused                        | Staff **sign-in.**                |
| 1:18 | 5    | `close`     | The name over the aurora                                                          | Christian Fitness                 |

A wipe in a brand colour marks each change of act (into `return`, `proof` and `close`); inside an
act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running member app, taken by [`shots.ts`](shots.ts)
  through the page objects `WebSignInPage`, `WebHomePage` and `WebJoinPage` with the shared fixture
  of `frontend/e2e/fixtures/test.ts` answering 429 `too_many_attempts`, 403 `account_suspended`,
  a visitor's 401 then Grace's session, and 429 `rate_limited`, after checking each alert's title,
  that no field is marked and the button stays enabled, the address the guard sent the visitor
  to (`/sign-in?returnUrl=%2Fhome%3Fwelcome%3Dback`), where sign-in landed (`/home?welcome=back`),
  and that a `returnUrl` to `https://evil.example/home` landed on `/home`. No backend and no
  database ran.
- **Drawn, not shot:** the window's timeline (what `SignInLockoutTests` asserts: five failures a
  minute apart pause at 14 minutes after the first and sign in at 15), the 429 for an unknown
  email, and the join limit's 429 and its count per IPv4 address or IPv6 /64
  (`JoinRateLimitTests`). The test counts and the initial total are what `npm test`,
  `npx playwright test --list`, `dotnet test` and `ng build web` printed (`shots/captures.js`).
- It leaves out, though they are built: a sign-in clearing the email's failures, the failures
  stored as a SHA-256 of the email and pruned as the window passes, attempts during the pause not
  lengthening it, a suspended member's wrong password getting the generic answer, refused joins
  not counting towards the limit, the dark theme (shot, not shown) and
  `ASPNETCORE_FORWARDEDHEADERS_ENABLED` for the proxy.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`); `CF_WEB_PORT` and `CF_ADMIN_PORT` pick free ports:

```shell
node tools/video-record/record.mjs docs/videos/08-slice-3-2-sign-in-protections
python tools/video-audio/film_audio.py docs/videos/08-slice-3-2-sign-in-protections
node tools/video-build/build.mjs docs/videos/08-slice-3-2-sign-in-protections --crf 24
```
