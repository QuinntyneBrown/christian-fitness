# 01 · Slice 1.1: Frontend workspace

The first slice of journey 1, "Scaffold the apps": one Angular 22 workspace in `frontend/` with
the member app (`web`) and the admin app (`admin`), the `components`, `domain` and `api`
libraries, ESLint keeping the dependency direction, Prettier, tight initial budgets, the design
system's foundations in each app, and Playwright with the shared fixture. Both apps boot to an
empty `main` landmark under their own title, "Christian Fitness" and "Christian Fitness Admin".

- **Film:** [`01-slice-1-1-frontend-workspace.mp4`](01-slice-1-1-frontend-workspace.mp4),
  1920×1080, 30 fps, 1 min 34 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-035 (AC1: the 250 kB error budget; AC2: every route lazy), L2-038
  (AC6: the title and one `main` landmark; AC5 and AC2 through the foundations' reduced motion and
  focus outline, not shown), and the workspace rules of `AGENTS.md` (ADR 0001, ADR 0002).

## Run sheet

| At   | Bars | Scene         | Picture                                                                                         | Headline                       |
| ---- | ---- | ------------- | ----------------------------------------------------------------------------------------------- | ------------------------------ |
| 0:00 | 4    | `hook`        | Both apps in browser windows, light and dark, with their tabs, over the aurora                  | Two apps. **One workspace.**   |
| 0:08 | 6    | `tree`        | The workspace tree, row by row                                                                  | Five projects, **one home.**   |
| 0:20 | 6    | `direction`   | web and admin over components, domain and api; the type-only arrow; the lint error              | One **direction.**             |
| 0:32 | 6    | `boot`        | The member app at 1440 px and 390 px, then the admin app in the dark theme                      | Both apps **boot.**            |
| 0:44 | 5    | `foundations` | Five brand tokens and the two faces                                                             | Brand, **built in.**           |
| 0:54 | 5    | `budget`      | 212 kB filling a bar to the 220 kB warning and the 250 kB error                                 | Lazy by **default.**           |
| 1:04 | 6    | `fixture`     | The three things that fail a spec                                                               | No backend. Nothing **slips.** |
| 1:16 | 4    | `proof`       | The boot specs reading "Web" and "Admin", then 2 passed                                         | Red, then **green.**           |
| 1:24 | 5    | `close`       | The name over the aurora                                                                        | Christian Fitness              |

A wipe in a brand colour marks each change of act (into `direction`, `budget` and `close`);
inside an act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running apps, taken by [`shots.ts`](shots.ts) through
  the page objects `WebStartPage` and `AdminStartPage` with the shared fixture of
  `frontend/e2e/fixtures/test.ts`, after checking each title and the one `main` landmark. No
  backend and no database ran. The screens are empty by design: no mock draws a screen for this
  slice; the landing page (slice 8.1) and staff sign-in (slice 9.1) replace them.
- **Drawn, not shot:** the tree, the dependency diagram, the budget bar and the fixture's three
  refusals. The lint error is the text `npm run lint` printed for a throwaway `api` file importing
  `domain`; the red lines are what the boot specs printed before the titles were set; 212.29 kB
  is the initial total `ng build` printed for each app.
- It leaves out, though they are built: the angular-eslint rules on inline templates and styles,
  `ViewEncapsulation.None` and `OnPush`; the `@sweep` tag that keeps sweeps out of the default
  run; the `api` handlers a spec registers; and the reset's focus outline.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`):

```shell
node tools/video-record/record.mjs docs/videos/01-slice-1-1-frontend-workspace
python tools/video-audio/film_audio.py docs/videos/01-slice-1-1-frontend-workspace
node tools/video-build/build.mjs docs/videos/01-slice-1-1-frontend-workspace --crf 24
```
