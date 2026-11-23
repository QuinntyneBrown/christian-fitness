# 27 · Slice 18.2: Edit my profile

The second and last slice of journey 18, "Build my profile": Edit profile in the profile's hero,
and "Add a bio" on a new profile, open the Edit profile dialog with the member's current values,
focus in Full name. The dialog is a CDK Dialog composed only from the components library: the
`cf-dialog` shell, form layout, text fields, checkbox, textareas, interest toggles, alert and
buttons. The home church stays hidden from other members unless "Show my home church to other
members" is ticked. Save changes sends `PUT /api/members/{memberId}/profile`, shows "Saving…"
with the fields held still, then closes the dialog and shows the profile as the server saved it. A
cleared name, a bio over 300 characters or a sixth goal is named before anything is sent; a
refusal or no answer keeps the dialog open with a generic message and every value typed. The API
refuses another member's profile with 403 `forbidden` and a profile over its limits with
`field_too_long` or `too_many_goals` (ADR 0024). The film is numbered by the slice's row in
`docs/journeys.detailed.md` when its prompt was written.

- **Film:** [`27-slice-18-2-edit-my-profile.mp4`](27-slice-18-2-edit-my-profile.mp4),
  1920×1080, 30 fps, 1 min 28 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-006 (AC1 to AC7), L2-031 AC3, L2-033; ADR 0024.

## Run sheet

| At   | Bars | Scene     | Picture                                                                    | Headline                |
| ---- | ---- | --------- | -------------------------------------------------------------------------- | ----------------------- |
| 0:00 | 4    | `hook`    | The dialog at 1440 px and 390 px over the aurora                           | Yours to **change.**    |
| 0:08 | 5    | `open`    | Edit profile in the hero, "Add a bio", the dialog at 768 px                | Edit **profile.**       |
| 0:18 | 4    | `church`  | Home church and City, close up, and the "Show my home church" checkbox     | Hidden **by default.**  |
| 0:26 | 5    | `save`    | "Saving…" close up, the saved profile at 1440 px and 390 px                | Saved, **at once.**     |
| 0:36 | 5    | `limits`  | The error summary at 1440 px and 390 px, with its three lines              | Named **first.**        |
| 0:46 | 5    | `refused` | The refused and failed alerts close up, at 390 px and 1440 px              | Nothing **lost.**       |
| 0:56 | 5    | `private` | The API's answers for Grace's id, another id, limits and no session        | Only **yours.**         |
| 1:06 | 3    | `proof`   | The test counts the runners printed and the initial total                  | Red, then **green.**    |
| 1:12 | 3    | `left`    | Slice 19.1's public profile                                                | Another **member's profile.** |
| 1:18 | 5    | `close`   | The name over the aurora                                                   | Christian Fitness       |

A wipe in a brand colour marks each change of act (into `limits`, `proof` and `close`); inside an
act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running member app, taken by [`shots.ts`](shots.ts)
  through the page objects `WebProfilePage` and `WebEditProfileDialog` with the shared fixture of
  `frontend/e2e/fixtures/test.ts` answering the session, `GET /api/profile/me` with the e2e
  profiles and each save with the profile as saved, a held answer, a 400 and a 503, after checking
  the focused name, the unticked checkbox, the hint, "Saving…", the saved facts, the summary's
  three lines and both alerts. No backend and no database ran.
- **Drawn, not shot:** the API's answers (what `EditProfileTests` and `EditProfileRefusalTests`
  assert) and the absence of personal data in spans (`ProfileTelemetryTests`). The test counts
  and the initial total are what `npm test`, `npx playwright test --list`, `dotnet test` and
  `ng build web` printed (`shots/captures.js`).
- It leaves out, though they are built: the keyboard-only edit, Cancel, Close, Escape and the
  scrim closing without a change, markup in a name shown as text, and a goal over 80 characters.
  Another member's view of the home church is slice 19.1's.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`); `CF_WEB_PORT` and `CF_ADMIN_PORT` pick free ports:

```shell
node tools/video-record/record.mjs docs/videos/27-slice-18-2-edit-my-profile
python tools/video-audio/film_audio.py docs/videos/27-slice-18-2-edit-my-profile
node tools/video-build/build.mjs docs/videos/27-slice-18-2-edit-my-profile --crf 24
```
