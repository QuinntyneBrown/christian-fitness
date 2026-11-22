# 0003. Narrated films made with local tools

## Status

Accepted, 22 November 2026 (slice 1.1).

## Context

Each slice ends with a short narrated film of what it built (`docs/videos/README.md`). The
`creating-videos` skill defaults to edge-tts, an online service, and to burned-in captions. The
owner's sibling repository `popkin` already has three small tools and a standard that make films
from screenshots of the running app, with a local voice and music.

## Decision

- Port `tools/video-record`, `tools/video-audio` and `tools/video-build` from `popkin` into
  `tools/` here, adapted to this repository: the Playwright copy is the one in
  `frontend/node_modules`, a film's `shots.ts` imports the fixtures and page objects of
  `frontend/e2e`, and the film runtime checks that Barlow and Barlow Condensed from the design
  system have loaded.
- **Voice:** Kokoro-82M (`onnx-community/Kokoro-82M-v1.0-ONNX`) run locally with `kokoro-onnx`,
  voice `af_heart`. Free, no key, no hosted service. Not edge-tts: a film should not depend on an
  online service, and Kokoro is the voice of the sibling repositories' films.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH (Pixabay Content License),
  copied with its credit row from `popkin`.
- **No burned-in captions**; `captions.vtt` is written beside the MP4.
- **Size:** 30 fps, CRF 23 to 26, 60 to 100 seconds, under about 8 MB, because one film is
  committed per slice and the repository does not use Git LFS.

## Consequences

- Making a film needs Node and the frontend's `npm ci`, Python 3.10 or later with `kokoro-onnx`
  and `numpy`, and ffmpeg with libx264. The model (about 310 MB) is downloaded once into
  `.cache/`, which is never committed.
- The tools are not part of any test run or of CI.
