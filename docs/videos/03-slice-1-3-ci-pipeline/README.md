# 03 · Slice 1.3: CI pipeline

The third and last slice of journey 1, "Scaffold the apps": continuous integration on GitHub
Actions. [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml) runs on every push to
`main` and every pull request against it, in two jobs side by side, each on a sparse checkout of
its own folder: `Frontend` (npm ci, lint, format check, build of both apps within their budgets,
Playwright behaviour specs on Chromium) and `Backend` (restore, build with warnings as errors, the
acceptance tests through the API). npm, NuGet and the Playwright browser are cached, each job stops
at five minutes, and nothing is retried.

- **Film:** [`03-slice-1-3-ci-pipeline.mp4`](03-slice-1-3-ci-pipeline.mp4), 1920×1080, 30 fps,
  1 min 30 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-042 (AC1 to AC4: what CI runs, failing at the step that broke, under
  five minutes with caches, no secret and no database), with ADR 0005.

## Run sheet

| At   | Bars | Scene      | Picture                                                                                        | Headline                        |
| ---- | ---- | ---------- | ---------------------------------------------------------------------------------------------- | ------------------------------- |
| 0:00 | 4    | `hook`     | The two jobs of the last green run and their seconds, over the aurora                          | Every change, **checked.**      |
| 0:08 | 5    | `trigger`  | `push` and `pull_request` to `main` branching into the two jobs and their sparse checkouts     | Two jobs, **side by side.**     |
| 0:18 | 6    | `frontend` | The `Frontend` job's steps and seconds in the green run, the specs last                        | Lint to **specs.**              |
| 0:30 | 5    | `backend`  | The `Backend` job's steps and seconds, and the `Passed!` line of the acceptance tests          | Warnings are **errors.**        |
| 0:40 | 5    | `fast`     | The cold first run (91 s) and the warm run (36 s) against the 300 s timeout                    | Under **five minutes.**         |
| 0:50 | 5    | `lint`     | The red lint run: `Lint` failed, every later step skipped, and the ESLint error it printed     | Broken **on purpose.**          |
| 1:00 | 6    | `more`     | What the three other red runs printed: CS0219, the title the spec expected, three failed tests | Each fails **where it breaks.** |
| 1:12 | 4    | `green`    | Both jobs green again after the revert                                                         | Green **again.**                |
| 1:20 | 5    | `close`    | The name over the aurora                                                                       | Christian Fitness               |

A wipe in a brand colour marks each change of act (into `frontend`, `lint` and `close`); inside an
act the cuts are hard.

## What it proves, and what it does not

- The slice has no screen and no endpoint, so the film is drawn. Its terminals hold GitHub's own
  words: [`shots.ts`](shots.ts), run by `record.mjs --commands`, read the runs of pull request #4
  with `gh run view` (jobs, steps, conclusions, seconds) and `gh run view --log-failed` (why each
  red run failed), checked that each failed at the expected step, and saved them to
  `shots/captures.js`, which the film reads.
- The runs: the cold first run
  [45040854893](https://github.com/QuinntyneBrown/christian-fitness/actions/runs/45040854893);
  lint broken [45041046230](https://github.com/QuinntyneBrown/christian-fitness/actions/runs/45041046230);
  a compiler warning [45041314433](https://github.com/QuinntyneBrown/christian-fitness/actions/runs/45041314433);
  a title and an endpoint broken [45041472511](https://github.com/QuinntyneBrown/christian-fitness/actions/runs/45041472511);
  green again [45041635582](https://github.com/QuinntyneBrown/christian-fitness/actions/runs/45041635582).
  The backend's test step was still named `Test` in the red run; it is `Acceptance tests` now.
- **Drawn, not captured:** the trigger diagram and the bar chart, whose numbers are the captured
  job seconds.
- It leaves out, though they are built: the cancelled older runs (concurrency), the
  `playwright-report` artifact kept when the specs fail, the read-only token, and the format check
  and the budgets failing, which were not broken on purpose in this slice.

## Build it again

From the repository root, with `npm ci` done in `frontend/`, an authenticated `gh` and the tools
set up (`docs/videos/README.md`):

```shell
node tools/video-record/record.mjs docs/videos/03-slice-1-3-ci-pipeline --commands
python tools/video-audio/film_audio.py docs/videos/03-slice-1-3-ci-pipeline
node tools/video-build/build.mjs docs/videos/03-slice-1-3-ci-pipeline --crf 24
```
