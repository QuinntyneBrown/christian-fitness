# 52 · Slice 27.2: Reinstate

The second and last slice of journey 27, "Flag, suspend and reinstate". Every row of the admin
Members page now has "Moderate". For a Flagged member the moderation dialog offers Reinstate,
chosen first, or Suspend; for a Suspended member only reinstating, with no choice and no field:
the dialog says what will happen and focus starts on the dialog itself. Reinstating asks for no
note and sends at once; a toast says the member is Active again and the list shows their status
without the earlier note. `POST /api/admin/members/{id}/reinstate` takes no body, returns a
Flagged or Suspended member to Active and clears the note; an Active member is refused with
`status_conflict`, and the rules of flagging and suspending hold (ADR 0029). A reinstated member
signs in again; the sessions a suspension ended stay ended.

- **Film:** [`52-slice-27-2-reinstate.mp4`](52-slice-27-2-reinstate.mp4), 1920×1080, 30 fps,
  1 min 24 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-029 (AC3, AC4, AC6, AC7); ADR 0029.

## Run sheet

| At   | Bars | Scene       | Picture                                                                        | Headline                      |
| ---- | ---- | ----------- | ------------------------------------------------------------------------------ | ----------------------------- |
| 0:00 | 4    | `hook`      | A Suspended member's dialog at 1440 px; a Flagged member's at 390 px           | Back to **Active.**           |
| 0:08 | 5    | `flagged`   | Kevin Brooks's dialog on Reinstate; the request the fixture recorded, no body  | Reinstate **comes first.**    |
| 0:18 | 4    | `done`      | His row before, Flagged with its note, and after, Active with none             | The note **is cleared.**      |
| 0:26 | 5    | `suspended` | Tyler Simmons's dialog: what reinstating means, and one button                 | It says what **it means.**    |
| 0:36 | 4    | `back`      | The list after; the toast, close up                                            | Active **again.**             |
| 0:44 | 5    | `api`       | Sign-in open again, an old cookie still refused, as the API tests assert       | Sign-in **opens again.**      |
| 0:54 | 4    | `who`       | The two refusals that carry over, with their codes                             | The same **rules.**           |
| 1:02 | 3    | `proof`     | The test counts the runners printed, the initial total and the dialog's chunk  | Red, then **green.**          |
| 1:08 | 3    | `left`      | The three statuses of journey 27                                               | Journey 27, **complete.**     |
| 1:14 | 5    | `close`     | The name over the aurora                                                       | Christian Fitness             |

A wipe in a brand colour marks each change of act (into `suspended`, `proof` and `close`); inside
an act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running admin app, taken by [`shots.ts`](shots.ts)
  through the page objects `AdminMembersPage` and `ModerateMemberDialog` with the shared fixture
  of `frontend/e2e/fixtures/test.ts` answering Dana's staff session, the mocks' cast of members
  and each reinstatement as the API does. Each shot checks what the screen says first: seven
  Moderate actions, the dialog's name, Reinstate chosen and no note field, focus on the dialog
  for a Suspended member, the toast's words, and the row Active with no note. No backend and no
  database ran.
- **Drawn, not shot:** the request is the one the fixture recorded; the reopened sign-in, the old
  cookie still refused, `status_conflict` and the two carried-over refusals are drawn from what
  `ReinstateMemberTests` asserts. The test counts, the initial total and the dialog's chunk are
  what `npm test`, `npx playwright test --list`, `dotnet test` and `ng build admin` printed
  (`shots/captures.js`).
- It leaves out, though they are built: Suspend chosen for a Flagged member, switching back to
  Reinstate after a failed press, a refused reinstatement's sentence, and the dark theme (shot,
  not shown). The audit entry each change leaves (ADR 0023) is recorded but not shown.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`); `CF_WEB_PORT` and `CF_ADMIN_PORT` pick free ports:

```shell
node tools/video-record/record.mjs docs/videos/52-slice-27-2-reinstate
python tools/video-audio/film_audio.py docs/videos/52-slice-27-2-reinstate
node tools/video-build/build.mjs docs/videos/52-slice-27-2-reinstate --crf 24
```
