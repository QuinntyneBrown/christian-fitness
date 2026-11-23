# 56 · Slice 1.5: Design-system feedback, overlays and content

The second of three slices added to journey 1, "Scaffold the apps", so that every component of
`docs/design-system/components/` is built once in the components library and reused (AGENTS.md).
This slice builds the feedback, overlay and content components: alert, banner, inline message,
toast and toast region, the dialog and drawer shells, the menu button, empty state, skeleton, the
error page's staff card, card, event card, date badge, description list, list, stat, table,
pagination, accordion, tabs and the message thread with its composer (L2-048, ADR 0017). No screen
uses them yet; slice 1.6 moves the screens onto them. The folder number, 56, is the one its prompt
gave.

- **Film:** [`56-slice-1-5-design-system-feedback-overlays-and-content.mp4`](56-slice-1-5-design-system-feedback-overlays-and-content.mp4),
  1920×1080, 30 fps, 1 min 36 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-048 (AC1 to AC7); ADR 0017.

## Run sheet

| At   | Bars | Scene       | Picture                                                                 | Headline                          |
| ---- | ---- | ----------- | ----------------------------------------------------------------------- | --------------------------------- |
| 0:00 | 4    | `hook`      | The library's counts over the aurora                                    | Built once, **reused.**           |
| 0:08 | 6    | `catalogue` | The twenty-one component names                                          | Twenty-one **components.**        |
| 0:20 | 6    | `feedback`  | A form alert, a status message and two toasts, with their roles         | Heard, **not just seen.**         |
| 0:32 | 6    | `overlays`  | The dialog shell and a menu whose focus walks down with the keys        | Overlays that **return focus.**   |
| 0:44 | 6    | `content`   | Tabs with `aria-current`, pagination with a gap, a table with a caption | Real links, **real tables.**      |
| 0:56 | 6    | `tests`     | The unit-test summary and the rules broken on purpose                   | Proven **through the page.**      |
| 1:08 | 5    | `budget`    | Both apps' initial totals against the budget                            | Nothing **grew.**                 |
| 1:18 | 4    | `next`      | What slice 1.6 and the first dialog and toast bring                     | Screens use **the components.**   |
| 1:26 | 5    | `close`     | The name over the aurora                                                | Christian Fitness                 |

A wipe in a brand colour marks each change of act (into `feedback`, `tests` and `close`); inside an
act the cuts are hard.

## What it proves, and what it does not

- **Drawn, not shot:** no screen composes these components yet, so the film draws them in the
  design system's tokens with the words and roles the components render, and the README's
  standard allows drawn diagrams for a slice with no screen. They are not screenshots.
- The counts are what the commands said, saved by [`shots.ts`](shots.ts) with
  `record.mjs --commands` to `shots/captures.js`: the twenty-one component folders, each also a
  design-system page, and the exports of `public-api.ts`; the summary `ng test components`
  printed; and the initial totals of `ng build web` and `ng build admin` with the budget of
  `angular.json`.
- The rules broken on purpose are those of the slice's lessons-learned entry; each turned its own
  unit test red and was restored.
- It leaves out, though they are built: the banner, inline message, drawer, empty states,
  skeletons, cards, event card, description list, lists, stats, accordion, the message thread and
  composer, and the staff error card; and the 162 behaviour specs, which ran green unchanged.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`):

```shell
node tools/video-record/record.mjs docs/videos/56-slice-1-5-design-system-feedback-overlays-and-content --commands
python tools/video-audio/film_audio.py docs/videos/56-slice-1-5-design-system-feedback-overlays-and-content
node tools/video-build/build.mjs docs/videos/56-slice-1-5-design-system-feedback-overlays-and-content --crf 24
```
