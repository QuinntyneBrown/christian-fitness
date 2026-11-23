# 55 · Slice 1.4: Design-system primitives and form controls

The first of three slices that build every design-system component once, in
`frontend/projects/components`, under its design-system name (L2-038 AC7, ADR 0018). This one
builds the primitives and form controls: button (with icon button and button row), link, form
field, text field (with search field), textarea, select, checkbox (with checkbox group), radio
group, switch, form layout, chip (with chip bar, interest, interest list and tag), badge (status,
count badge, unread dot), avatar (with avatar stack), divider, spinner, progress bar,
tooltip, skip link and brand lockup (with seal). Each keeps its page's BEM block, variants, sizes
and states, carries its states as ARIA attributes and has a component test for each behaviour.
No screen moves onto them yet; slice 1.6 does that.

- **Film:** [`55-slice-1-4-design-system-primitives-and-form-controls.mp4`](55-slice-1-4-design-system-primitives-and-form-controls.mp4),
  1920×1080, 30 fps, 1 min 24 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-038 (AC2, AC3, AC7), L2-039; ADR 0018.

## Run sheet

| At   | Bars | Scene      | Picture                                                                        | Headline                         |
| ---- | ---- | ---------- | ------------------------------------------------------------------------------ | -------------------------------- |
| 0:00 | 5    | `hook`     | Sign in at 1440 px and 390 px over the aurora                                  | Built once, **used everywhere.** |
| 0:10 | 4    | `why`      | The nineteen component names of the slice                                      | One name, **one component.**     |
| 0:18 | 4    | `actions`  | Button variants and an external link, drawn; "Signing in…" close up            | Eight variants, **five sizes.**  |
| 0:26 | 5    | `fields`   | The password field's error close up, its ARIA, and Join at 1440 px and 390 px  | Label, hint **and error.**       |
| 0:36 | 4    | `choices`  | Checkboxes, radios, a switch and interest toggles, drawn with their attributes | State as **attributes.**         |
| 0:44 | 4    | `display`  | A chip bar, statuses, a count badge and an avatar stack, drawn                 | Say it **in words.**             |
| 0:52 | 4    | `feedback` | The spinner's delay, a progress bar, a tooltip and the skip link               | Wait, show, **skip.**            |
| 1:00 | 4    | `proof`    | The test counts the runners printed and both apps' initial totals              | Red, then **green.**             |
| 1:08 | 3    | `left`     | Slices 1.5 and 1.6                                                             | Then the **screens.**            |
| 1:14 | 5    | `close`    | The name over the aurora                                                       | Christian Fitness                |

A wipe in a brand colour marks each change of act (into `fields`, `proof` and `close`); inside an
act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running member app, taken by [`shots.ts`](shots.ts)
  through the page objects `WebSignInPage` and `WebJoinPage` with the shared fixture of
  `frontend/e2e/fixtures/test.ts` answering every request (Grace's session held until the busy
  button was saved), after checking "Welcome back", "Signing in…" with `aria-busy="true"`, and each
  join field's error with `aria-invalid` and its `aria-describedby`. They show the two library
  components screens already used, completed here: `cf-text-field`, now composed of
  `cf-form-field`, and `cf-button`. No backend and no database ran.
- **Drawn, not shot:** every other component, after its design-system page, with the attributes
  its component tests assert; no screen composes them until slice 1.6. The test counts and the
  initial totals are what `npm test`, `npx playwright test --list` and `npm run build` printed
  (`shots/captures.js`).
- It leaves out, though they are built: the icon button, button row, search field (Escape clears),
  textarea counter (announced after a pause, an error past the limit), select, checkbox group,
  form layout, tag, unread dot, divider and brand lockup. The meter is slice 1.5's `cf-fill`;
  moving the screens and removing their duplicates is slice 1.6's.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`); `CF_WEB_PORT` and `CF_ADMIN_PORT` pick free ports:

```shell
node tools/video-record/record.mjs docs/videos/55-slice-1-4-design-system-primitives-and-form-controls
python tools/video-audio/film_audio.py docs/videos/55-slice-1-4-design-system-primitives-and-form-controls
node tools/video-build/build.mjs docs/videos/55-slice-1-4-design-system-primitives-and-form-controls --crf 24
```
