# 54 · Slice 27.1: Flag and suspend

The first slice of journey 27, "Flag, suspend and reinstate". On the admin Members page every
Active or Flagged row has one action, "Moderate", and shows its moderation note under its status.
Moderate opens a dialog, a CDK Dialog loaded on first use: an Active member can be flagged (chosen
first) or suspended, a Flagged one only suspended. A note is required, and a suspension must be
confirmed; what is missing is named in a summary that takes focus and beside each field, and
nothing is sent. While the change is on its way the dialog holds still. Afterwards a toast says
what happened, the list loads again and focus goes to the table. `POST
/api/admin/members/{id}/flag` and `/suspend` keep the note on the member and answer their row; a
suspension ends every session and pending admin sign-in in the same save, and sign-in then
refuses the account in both apps. Nobody moderates their own account, only an Admin moderates
staff, and each refusal has its own code (ADR 0023).

- **Film:** [`54-slice-27-1-flag-and-suspend.mp4`](54-slice-27-1-flag-and-suspend.mp4),
  1920×1080, 30 fps, 1 min 34 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-029 (AC1, AC2, AC4 to AC9); ADR 0023.

## Run sheet

| At   | Bars | Scene     | Picture                                                                          | Headline                        |
| ---- | ---- | --------- | -------------------------------------------------------------------------------- | ------------------------------- |
| 0:00 | 4    | `hook`    | The dialog on Suspend at 1440 px; a Flagged member's dialog at 390 px            | Always with **a reason.**       |
| 0:08 | 4    | `rows`    | The Members page at 1440 px; Kevin Brooks's row with its note, close up          | One action, **one note.**       |
| 0:16 | 5    | `flag`    | The dialog on Flag with a note; the request the fixture recorded                 | Flag, **the milder step.**      |
| 0:26 | 4    | `flagged` | The list after the flag; the toast and Priya Nair's row, close up                | Flagged, **and noted.**         |
| 0:34 | 5    | `suspend` | The dialog on Suspend, note and confirmation; the request the fixture recorded   | Suspend **asks twice.**         |
| 0:44 | 4    | `invalid` | The error summary naming the note and the confirmation                           | Two things **to fix.**          |
| 0:52 | 5    | `ends`    | What one save removes, and both sign-ins refused, as the API tests assert        | Every session **ends.**         |
| 1:02 | 5    | `who`     | The four refusals and their codes, as the API tests assert                       | Refused, **by code.**           |
| 1:12 | 3    | `proof`   | The test counts the runners printed, the initial total and the dialog's chunk    | Red, then **green.**            |
| 1:18 | 3    | `left`    | Slice 27.2: back to Active                                                       | Then, **reinstate.**            |
| 1:24 | 5    | `close`   | The name over the aurora                                                         | Christian Fitness               |

A wipe in a brand colour marks each change of act (into `suspend`, `proof` and `close`); inside an
act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running admin app, taken by [`shots.ts`](shots.ts)
  through the page objects `AdminMembersPage` and `ModerateMemberDialog` with the shared fixture
  of `frontend/e2e/fixtures/test.ts` answering Dana's staff session, the mocks' cast of members
  and each flag or suspension as the API does. Each shot checks what the screen says first: the
  notes and the six Moderate actions, the dialog's name and its chosen action, "2 things to fix",
  the toast's words, the changed status and note, and that a suspended row has no action. No
  backend and no database ran.
- **Drawn, not shot:** the two requests are the ones the fixture recorded; what a suspension
  removes, the refused sign-ins and the four refusal codes are drawn from what
  `ModerateMemberTests` asserts. The test counts, the initial total and the dialog's chunk are
  what `npm test`, `npx playwright test --list`, `dotnet test` and `ng build admin` printed
  (`shots/captures.js`).
- It leaves out, though they are built: "Saving…" with Escape, Close and the scrim waiting, the
  refusals' sentences in the dialog, Cancel giving focus back to the row, the note's counter,
  the dark theme (shot, not shown), and the note and names shown as text. Reinstating is slice
  27.2; the audit entry is 29.2's; refusing a suspended member's registration is 6.1's.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`); `CF_WEB_PORT` and `CF_ADMIN_PORT` pick free ports:

```shell
node tools/video-record/record.mjs docs/videos/54-slice-27-1-flag-and-suspend
python tools/video-audio/film_audio.py docs/videos/54-slice-27-1-flag-and-suspend
node tools/video-build/build.mjs docs/videos/54-slice-27-1-flag-and-suspend --crf 24
```
