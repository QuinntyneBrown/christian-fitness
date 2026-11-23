# 57 · Slice 1.6: Design-system layout, navigation and migration

The last of three slices that build every design-system component once, in
`frontend/projects/components`, under its design-system name (L2-038 AC7, ADR 0019). This one
builds the layout primitives (container, split, stack, cluster, grid) and the page shells, the top
bar, footer, sidebar navigation, tab bar and breadcrumb, then moves every built screen onto the
library and deletes the fourteen screen-specific copies earlier slices had made. Both shells now
start with the skip link (L2-038 AC8).

- **Film:** [`57-slice-1-6-design-system-layout-navigation-and-migration.mp4`](57-slice-1-6-design-system-layout-navigation-and-migration.mp4),
  1920×1080, 30 fps, 1 min 22 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-008 (AC1, AC4), L2-021 (AC1, AC2), L2-038 (AC2, AC7, AC8), L2-039;
  ADR 0019.

## Run sheet

| At   | Bars | Scene     | Picture                                                                                  | Headline                       |
| ---- | ---- | --------- | ---------------------------------------------------------------------------------------- | ------------------------------ |
| 0:00 | 5    | `hook`    | The profile at 1440 px and 390 px over the aurora                                        | Every screen, **one library.** |
| 0:10 | 5    | `removed` | The fourteen removed folders and what replaced each, as the file system said            | 14 copies **gone.**            |
| 0:20 | 4    | `member`  | Home with "Skip to content" focused, and the top bar close up                            | Skip first, **then the bar.**  |
| 0:28 | 5    | `admin`   | Events with the skip link at 1440 px, the band at 768 px and 390 px, and dark            | Sidebar, **then a band.**      |
| 0:38 | 5    | `profile` | The profile in dark, its skeleton at 390 px and its empty state close up                 | Composed, **not copied.**      |
| 0:48 | 4    | `forms`   | Sign in's alert close up, Join's interest list at 390 px, the busy button's attributes   | Same parts, **every form.**    |
| 0:56 | 4    | `ready`   | The tab bar, breadcrumb and footer, drawn with the attributes their tests assert         | Ready **when needed.**         |
| 1:04 | 4    | `proof`   | The test counts the runners printed and both apps' initial totals                        | Nothing **grew.**              |
| 1:12 | 5    | `close`   | The name over the aurora                                                                 | Christian Fitness              |

A wipe in a brand colour marks each change of act (into `member`, `profile`, `proof` and
`close`); inside an act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running member and admin apps, taken by
  [`shots.ts`](shots.ts) through the page objects `WebHomePage`, `WebMemberShell`,
  `WebProfilePage`, `WebSignInPage`, `WebJoinPage` and `AdminShell` with the shared fixture of
  `frontend/e2e/fixtures/test.ts` answering every request (Grace's session and profile, a held
  profile, a 404, a refused sign-in, Dana's staff session), after checking each screen's words,
  `aria-current`, `aria-pressed`, `role="alert"`, the focused skip link, the band in one row below
  LG and no sideways scroll. The events' photos are the mocks', served at a local path for the take
  only. No backend and no database ran.
- The removed folders, their replacements and the one remaining composite (`profile-hero`) are
  what the file system said; the test counts and initial totals are what `npm test`,
  `npx playwright test --list` and `npm run build` printed (`shots/captures.js`).
- **Drawn, not shot:** the tab bar, breadcrumb and footer, which no screen shows yet (the member
  shell passes no destinations until Events, Services or Messages exist, ADR 0019); their
  behaviour is proven by component tests.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`); `CF_WEB_PORT` and `CF_ADMIN_PORT` pick free ports:

```shell
node tools/video-record/record.mjs docs/videos/57-slice-1-6-design-system-layout-navigation-and-migration
python tools/video-audio/film_audio.py docs/videos/57-slice-1-6-design-system-layout-navigation-and-migration
node tools/video-build/build.mjs docs/videos/57-slice-1-6-design-system-layout-navigation-and-migration --crf 24
```
