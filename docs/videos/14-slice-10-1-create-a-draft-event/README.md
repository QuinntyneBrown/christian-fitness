# 14 · Slice 10.1: Create a draft event

The first slice of journey 10, "Create and edit events", and the admin app's first screen with
data. The Events page lists every event soonest first under All, Published and Draft with their
counts: title over place, the start in Toronto ("May 22 · 4:00 PM"), going / capacity and the
status, with skeleton rows while it loads, an empty state with New event, a tab-empty sentence and
an error state with Try again. New event opens the event editor, a CDK Dialog drawer imported on
first use, focus on Title. Save draft sends the fields to `POST /api/admin/events`; while it waits
the button reads "Saving…", the fields hold still and Escape and the scrim wait; then the drawer
closes, the "Draft saved" toast leaves after 6 seconds and the list shows the draft. The API
checks every field's limits and answers a refusal with 400 `validation_failed` and each field's
own code in `fieldCodes`; a start is a Toronto date and time that must be after the API's clock
(ADR 0017).

- **Film:** [`14-slice-10-1-create-a-draft-event.mp4`](14-slice-10-1-create-a-draft-event.mp4),
  1920×1080, 30 fps, 1 min 34 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-022 (AC1, AC2, AC5, AC6); ADR 0017.

## Run sheet

| At   | Bars | Scene    | Picture                                                                           | Headline                         |
| ---- | ---- | -------- | --------------------------------------------------------------------------------- | -------------------------------- |
| 0:00 | 4    | `hook`   | The list with the draft and its toast at 1440 px, the editor at 390 px            | New event, **kept as a draft.**  |
| 0:08 | 5    | `list`   | The five events of the cast at 1440 px                                            | Soonest **first.**               |
| 0:18 | 4    | `tabs`   | The Draft tab at 768 px; "Nothing published yet" at 1440 px                       | Every tab **counts.**            |
| 0:26 | 5    | `editor` | The filled editor drawer at 1440 px and full width at 390 px                      | The event **editor.**            |
| 0:36 | 4    | `saving` | The request Save draft sent; "Saving…" with the fields read-only, close up        | Saving…                          |
| 0:44 | 5    | `saved`  | The list with Whole Life Retreat as a draft; the toast close up                   | Draft **saved.**                 |
| 0:54 | 4    | `states` | "No events yet" at 1440 px; "Events didn't load" with Try again, close up         | Empty, or **try again.**         |
| 1:02 | 5    | `api`    | A refusal's `fieldCodes`, and a Toronto start in UTC, as the API tests assert     | A code for **every field.**      |
| 1:12 | 3    | `proof`  | The test counts the runners printed, the admin initial total and the editor chunk | Red, then **green.**             |
| 1:18 | 3    | `left`   | Slice 10.2: Edit, each field named, an image                                      | Edit an **event.**               |
| 1:24 | 5    | `close`  | The name over the aurora                                                          | Christian Fitness                |

A wipe in a brand colour marks each change of act (into `editor`, `proof` and `close`); inside an
act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running admin app, taken by [`shots.ts`](shots.ts)
  through the page objects `AdminEventsPage` and `EventEditorDialog` with the shared fixture of
  `frontend/e2e/fixtures/test.ts` answering Dana's staff session, the mocks' cast of events from
  `frontend/e2e/fixtures/admin-events.ts` (the four published ones until the draft is saved), an
  aborted request for the error state, and 201 with Whole Life Retreat for Save draft, held by a
  gate until "Saving…" was saved. Each shot checks what the screen says first: the rows, the tab
  counts and the current tab, the `?status=draft` address, focus on Title, "Saving…" on a disabled
  button, the toast's words. No backend and no database ran.
- **Drawn, not shot:** the request is the one the fixture recorded; the refusal and the Toronto
  start are drawn from what `CreateEventRefusalTests` and `EventScheduleTests` assert. The test
  counts, the initial total and the editor's chunk are what `npm test`,
  `npx playwright test --list`, `dotnet test` and `ng build admin` printed (`shots/captures.js`).
- It leaves out, though they are built: the skeleton rows, the generic alert after a refused save
  with the fields editable again, Dismiss on the toast, Escape, Close and the scrim giving focus
  back to New event, a blank price sent as free, and names shown as text. Editing, the per-field
  invalid state and the image are slice 10.2's; Publish is 11.1's.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`); `CF_WEB_PORT` and `CF_ADMIN_PORT` pick free ports:

```shell
node tools/video-record/record.mjs docs/videos/14-slice-10-1-create-a-draft-event
python tools/video-audio/film_audio.py docs/videos/14-slice-10-1-create-a-draft-event
node tools/video-build/build.mjs docs/videos/14-slice-10-1-create-a-draft-event --crf 24
```
