# 13 · Slice 29.2: Audit staff changes

The second and last slice of journey 29, "Staff roles and audit". Every staff command that changes
data carries a marker, `IAuditableCommand`, and passes through one MediatR pipeline behaviour: when
it succeeds, an audit entry records who made the change, what it was, which record it changed and
when; a refused or failed command records none, and an auditable command whose handler names no
record fails. The handler names the person and the record through the request's `AuditTrail`, which
adds the entry to the same unit of work as the change. The entry holds identifiers only, and
telemetry hears the action's name only. On `main` the staff commands are the staff session's, so
starting and ending a staff session are the first audited changes (L2-019 AC3; ADR 0021).

- **Film:** [`13-slice-29-2-audit-staff-changes.mp4`](13-slice-29-2-audit-staff-changes.mp4),
  1920×1080, 30 fps, 1:34. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-019 AC3, L2-033 AC2; ADR 0021.

## Run sheet

| At   | Bars | Scene       | Picture                                                                     | Headline                      |
| ---- | ---- | ----------- | --------------------------------------------------------------------------- | ----------------------------- |
| 0:00 | 5    | `hook`      | The Dashboard in dark over the aurora; who, what, which record, when        | Every change, **on record.**  |
| 0:10 | 5    | `signin`    | "Enter your code" at 1440 px, the Dashboard at 390 px, the entry's fields  | Signed in, **written down.**  |
| 0:20 | 4    | `signout`   | The Dashboard with Sign out, and the `staff_session.ended` entry            | Signed out, **too.**          |
| 0:28 | 4    | `refused`   | A wrong code refused on "Enter your code"                                   | No change, **no entry.**      |
| 0:36 | 6    | `pipeline`  | The pipeline drawn: controller, validation, audit, handler, database        | One step, **every command.**  |
| 0:48 | 4    | `forget`    | The behaviour's cases as `dotnet test` passed them                          | Forget, **and fail.**         |
| 0:56 | 4    | `table`     | The `AuditEntries` columns from the migration's SQL                         | Identifiers **only.**         |
| 1:04 | 4    | `telemetry` | The audit log's template and its one attribute                              | The action, **nothing more.** |
| 1:12 | 3    | `proof`     | The audit tests and the backend total `dotnet test` printed                 | Red, then **green.**          |
| 1:18 | 3    | `left`      | `event.created`: one marker and one call for the next staff command         | One marker, **one call.**     |
| 1:24 | 5    | `close`     | The name over the aurora                                                    | Christian Fitness             |

A wipe in a brand colour marks each change of act (into `pipeline`, `proof` and `close`); inside an
act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running admin app, taken by [`shots.ts`](shots.ts)
  through the page objects `AdminStaffSignInPage`, `AdminTwoStepPage` and `AdminShell` with the
  shared fixture of `frontend/e2e/fixtures/test.ts` answering the password step, the code and Sign
  out, after checking the code screen's heading, the Dashboard, the refusal under the field and the
  return to Staff sign in. No backend and no database ran for them: the slice changes no screen,
  and they show the commands it audits.
- **Drawn, not shot:** the audit entries' fields are the `AuditEntry` columns, not a row read from a
  database; the behaviour's cases and the test counts are what `dotnet test` printed, and the
  columns what `dotnet ef migrations script` printed (`shots/captures.js`). The log line is the
  behaviour's template and the one attribute the telemetry test asserts.
- It leaves out, though they are built: the second save that commits a session's entry, and the
  version 7 ids. Nothing reads the trail yet, and no event command existed on `main` when the film
  was made.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`); `CF_WEB_PORT` and `CF_ADMIN_PORT` pick free ports:

```shell
node tools/video-record/record.mjs docs/videos/13-slice-29-2-audit-staff-changes
python tools/video-audio/film_audio.py docs/videos/13-slice-29-2-audit-staff-changes
node tools/video-build/build.mjs docs/videos/13-slice-29-2-audit-staff-changes --crf 24
```
