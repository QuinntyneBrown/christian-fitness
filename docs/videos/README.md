# Christian Fitness videos

One folder per video. The text files are the source; the media is generated from them.

Every slice of [`docs/journeys.detailed.md`](../journeys.detailed.md) ends by making one: a short
narrated film of what the slice built, as it now works, with music under the voice. This page is
the standard those films are held to. Where it differs from the defaults of the `creating-videos`
skill (edge-tts, burned-in captions, slide decks of bullets), this page wins
([ADR 0003](../adr/0003-video-tooling.md)).

| #   | Video                                                                    | Runtime | What it is                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | [Slice 1.1: Frontend workspace](01-slice-1-1-frontend-workspace/README.md) | 1:34    | One Angular workspace with the member app and the admin app and three libraries; the dependency direction ESLint enforces; both apps booting with their titles; 212 kB of 250; the e2e fixture that refuses what it does not answer. |
| 02  | [Slice 1.2: Backend skeleton](02-slice-1-2-backend-skeleton/README.md)     | 1:34    | Five clean-architecture projects; the API closed by default with 401 ProblemDetails and a code for every error; anonymous health that says only its status; spans kept to route, method and status; `cf migrate` and an idempotent `cf seed`. |
| 03  | [Slice 1.3: CI pipeline](03-slice-1-3-ci-pipeline/README.md)               | 1:30    | GitHub Actions on every push and pull request to `main`: two sparse jobs side by side, lint to behaviour specs and a backend built with warnings as errors; under 40 s warm against a five-minute timeout; four runs broken on purpose, each failing at the step that broke. |

## What every video is

- **Narrated.** A pleasant, warm voice explains what is on screen. The voice is Kokoro-82M from
  Hugging Face (`onnx-community/Kokoro-82M-v1.0-ONNX`), run locally with `kokoro-onnx`: free, no
  key, downloaded once into `.cache/kokoro` (or taken from the Hugging Face cache). The voice is
  `af_heart`; `"voice"` in `narration.json` picks another. No paid or hosted speech service, and
  no other engine unless an ADR says why.
- **Set to soca.** An engaging soca track plays from the first frame to the last, turned down
  under the voice and up between lines. See [Music](#music).
- **No captions burned in.** Nothing is burned into the picture. `captions.vtt` is written beside
  the MP4, so a player can show captions to someone who needs them. `--captions` burns them in
  when a video asks for it.
- **Picture-led.** Screenshots of the running apps carry the film; where a slice has no screen
  (a workspace, a pipeline, a rule no screen shows), drawn diagrams in the brand's colours do. A
  slide holds a headline of two to six words with one word in the accent colour, a number or a
  label; it never transcribes the narration. The frame is always full: a screenshot or a diagram
  takes at least 60 % of the width, over a field of a brand colour, never a small picture on an
  empty background.
- **Moving.** Scenes change with designed transitions, on the beat of the music.
- **True.** It shows and says only what the branch does, in the words of `docs/specs/`. If it
  quotes the product's purpose, it quotes `AGENTS.md` word for word: "a Christian community for
  health in body and spirit".

**Format:** 1920×1080, 30 fps, H.264 with AAC audio, **60 to 100 seconds**, **under about 8 MB**
(CRF 23 to 26), because one film is committed per slice and the repository does not use Git LFS.

## Brand on screen

Every colour is a token of [`docs/design-system/tokens/tokens.css`](../design-system/tokens/tokens.css)
and every word is set in its self-hosted faces, which `slides.html` loads by linking that file.

| Role               | Token                                                       | Use in a film                                       |
| ------------------ | ----------------------------------------------------------- | --------------------------------------------------- |
| Brand              | `--palette-bordeaux-700` (`#6c1d36`)                        | The accent word, wipes, a field for a whole act     |
| Second brand       | `--palette-borealis-300` (`#9cc3e8`)                        | The accent on bordeaux, a light field               |
| Ink and canvas     | `--palette-stone-950`, `--palette-stone-50`                 | Dark and light fields                               |
| Blush              | `--palette-bordeaux-50`                                     | A soft field                                        |
| Display face       | `--font-family-display`, Barlow Condensed, italic, upper case | Headlines and the wordmark, as in the brand lockup |
| Text face          | `--font-family-sans`, Barlow                                | Kickers, ledes, labels                              |

The fields are `.field--canvas`, `.field--blush`, `.field--bordeaux`, `.field--borealis` and
`.field--ink` in [`assets/film.css`](assets/film.css).

## Folder

```
docs/videos/NN-slice-S-S-topic/
  narration.json     the lines, their scenes and the voice                     (written)
  film.js            the scenes: markup and the functions that move it         (written)
  slides.html        the page that plays the film                              (written)
  shots.ts           which states of the apps to open and what to save         (written)
  README.md          what the video shows, its run sheet, what it proves       (written)
  script.md          the transcript                                            (written)
  shots/             the screenshots, PNG at double density                    (generated, committed)
  timing.js          the scene grid and the lines in film time, read by the deck (generated, committed)
  captions.vtt       captions in film time, a sidecar file                     (generated, committed)
  NN-slice-S-S-topic.mp3   voice and ducked music                              (generated, committed)
  NN-slice-S-S-topic.mp4   the film                                            (generated, committed)
```

`NN` is the next free video number; `S-S` is the slice's ID in `docs/journeys.detailed.md`
(`1-1` for slice 1.1). `narration.wav` and anything under `.cache/` are never committed.

## Tools

The scripts live in `tools/` ([ADR 0003](../adr/0003-video-tooling.md)), ported from the sibling
repository `popkin` by slice 1.1 and reused and improved by every later film. None of them is part
of a test run or of CI.

| Tool                  | What it does                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tools/video-record/` | Opens the apps in Chromium (or, with `--backend`, starts the API; with `--commands`, starts nothing) and runs a folder's `shots.ts`, saving `shots/`. |
| `tools/video-audio/`  | Speaks `narration.json` with Kokoro, fits each line to its scene, mixes the music under it, writes the MP3, `captions.vtt` and the timing the film reads. |
| `tools/video-build/`  | Opens `slides.html`, seeks it frame by frame, and encodes the MP4 with ffmpeg. `--check` prints the schedule, `--frame <seconds> <png>` saves one frame, `--captions` burns captions in. |

They need Node with the Playwright copy in `frontend/node_modules` (`npm ci` in `frontend/`),
Python 3.10 or later with `kokoro-onnx` and `numpy`, and ffmpeg with libx264 (`FFMPEG_PATH`
overrides). From the repository root:

```shell
node tools/video-record/record.mjs docs/videos/NN-slice-S-S-topic             # --backend or --commands for a slice with no screen
python tools/video-audio/film_audio.py docs/videos/NN-slice-S-S-topic
node tools/video-build/build.mjs docs/videos/NN-slice-S-S-topic --check
node tools/video-build/build.mjs docs/videos/NN-slice-S-S-topic --crf 24
```

## Screenshots

- **From the running apps, never from the mocks.** `shots.ts` uses the shared fixture and the page
  objects of `frontend/e2e/`: it imports `test` from `frontend/e2e/fixtures/test.ts` and opens each
  screen through its page object. Every `/api/**` request is answered by a handler, as in every
  spec; no backend and no database runs.
- **A slice with no screen films what its backend says.** `record.mjs --backend` starts the API as
  built (no database) instead of the apps; `shots.ts` calls it and runs `cf`, checks each answer and
  saves it with `capture(name, value)` to `shots/captures.js`, which `slides.html` loads before
  `film.js`. The film sets those words in its terminals as they were said, never typed-in copies,
  and draws the rest (slice 1.2).
- **A slice whose system is neither an app nor the API films what its commands say.**
  `record.mjs --commands` starts nothing; `shots.ts` runs `gh`, `git` or `dotnet` with `spawnSync`,
  checks what they said and saves it with `capture(name, value)` (slice 1.3 reads its own CI runs
  with `gh run view`).
- **It is not a test and not a sweep.** `tools/video-record/` only borrows Playwright to drive
  Chromium. It never sets `CF_SWEEPS`, compares nothing and is not run by `npm run e2e` or CI.
- **Every form factor the slice changes.** Take each key state at 390 px (XS), 768 px (M),
  1024 px (L) and 1440 px (XL), at double density, in the light theme, and one state in the dark
  theme. A slice whose screens are the same from M upward takes the phone and one desktop size.
- **Close-ups.** Small text is unreadable at 1080p. Save a `detail` shot of the region the line is
  about and enlarge that, instead of zooming a full-page screenshot.
- **Vary the layout.** No two scenes in a row share a layout or a background. Acts change colour.
- **Frames.** `film.js` draws the device around a screenshot: a phone for XS, a tablet for M, a
  browser window for L and XL.

## Slides and motion

- **Every pixel is a pure function of film time.** `slides.html` plays live against the MP3 and
  exposes `seek(seconds)`; the builder seeks it frame by frame. Nothing uses CSS animation, CSS
  transition, `setTimeout` or `Math.random()` without a seed.
- **Cut to the music.** The track's tempo sets the film's grid (`tools/video-audio/tempo.py`). A
  scene is a whole number of bars; cuts, word rises and transitions start on a beat.
- **Transitions are designed, and few.** A change of act gets a wipe in a brand colour; inside an
  act, cut hard. One flourish a scene is enough.
- **Do not let a frame drift for a whole scene.** A still that slowly zooms doubles the file size.
  Move, then hold.
- **WebGL is in scope** (the aurora that opens and closes a film): its time uniform is the film
  clock, randomness is seeded, and the builder stops if a context cannot be created.

## Narration

- About 150 words a minute. Two sentences a scene is plenty; leave a beat of music between lines.
- Second person, warm, concrete. No filler, no marketing tone. It must make sense with eyes closed.
- Suggested shape: a hook in the first six seconds; who the slice is for; the slice on screen
  (most of the film); one card for what the tests prove that no screen shows; one card for what is
  left, if anything; the close, with the name.

## Music

- **The track.** [`assets/music/en-la-playa-soca.mp3`](assets/music/en-la-playa-soca.mp3),
  _En La Playa – Trinidad and Tobago Soca_ by JuliusH, Pixabay Content License, 120 BPM, first
  beat at 0.27 s ([credits](assets/music/CREDITS.md)). A later film may reuse it or add another
  instrumental soca track from Pixabay Music with its row in `CREDITS.md` (title, artist, the
  track's Pixabay URL, the date it was downloaded and the licence).
- **Mix.** One bar of music alone before the first word. Under the voice the music sits about 14
  to 18 dB below it; between lines it comes back up. End with three seconds of music alone, faded
  out. The mix is normalised to about −16 LUFS.
- **If no licensed track is available,** do not synthesise a substitute and do not use a track of
  unknown licence. Build the film with the voice alone, write "Music: pending" at the top of the
  video's `README.md`, and say so in the pull request.

## Check before committing

- `ffprobe -v error -show_entries format=duration:stream=codec_name,width,height <mp4>` gives
  1920×1080, `h264` and `aac`, and a duration between 60 and 100 seconds that matches the MP3;
  the file is under about 8 MB.
- Save one frame per scene with `--frame` and look at each: nothing clipped, small text readable,
  no blank frame, fonts are Barlow and Barlow Condensed.
- Listen to the first and last ten seconds and to one line in the middle: the voice is clear over
  the music and nothing cuts off.
- Add the video's row to the table at the top of this page.
