# 12 · Slice 29.1: Admin and Moderator roles

The first slice of journey 29, "Staff roles and audit". Staff are Admins or Moderators. Every
admin endpoint belongs to an area (the staff session, Dashboard, Members, Events, Services) taken
from where it is routed, and each area's policy reads the staff member's role from the database on
every request, so a role changed while someone works takes effect on their next request. Admins
may use every area; Moderators the session, the Dashboard and Members. An area no slice has named
yet is Admins only. A refused request is 403 with the code `forbidden_role`. In the admin app the
sidebar navigation of the components library lists only the areas the role opens, and Events or
Services opened by a Moderator show "Admins only" in their place, with the address kept, the
heading focused and "Go to dashboard" (L2-019; ADR 0020).

- **Film:** [`12-slice-29-1-admin-and-moderator-roles.mp4`](12-slice-29-1-admin-and-moderator-roles.mp4),
  1920×1080, 30 fps, 1 min 28 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-019 (AC1, AC2, AC4, AC5); ADR 0020.

## Run sheet

| At   | Bars | Scene        | Picture                                                                        | Headline                 |
| ---- | ---- | ------------ | ------------------------------------------------------------------------------ | ------------------------ |
| 0:00 | 5    | `hook`       | An Admin's Dashboard at 1440 px and a Moderator's in dark, over the aurora     | Two roles, **one console.** |
| 0:10 | 5    | `nav`        | The Admin's and the Moderator's sidebars close up, and the Moderator at 390 px | Only their **areas.**    |
| 0:20 | 5    | `adminsonly` | "Admins only" at 1440 px with `/events` in the address bar, and at 768 px      | Admins **only.**         |
| 0:30 | 4    | `back`       | The "Admins only" card close up, the Dashboard it leads to, and 390 px         | Back to **work.**        |
| 0:38 | 5    | `demoted`    | An Admin's Dashboard, then "Admins only" on `/services` after the role changed | The next **move.**       |
| 0:48 | 5    | `api`        | Six of the API tests' rows: role, endpoint and status                          | A rule **per area.**     |
| 0:58 | 4    | `table`      | The role and area table both stacks share                                      | One **table.**           |
| 1:06 | 3    | `proof`      | The test counts the runners printed and the admin initial total                | Red, then **green.**     |
| 1:12 | 3    | `left`       | Slice 29.2's audit: who, what, which record, when                              | Audit every **change.**  |
| 1:18 | 5    | `close`      | The name over the aurora                                                       | Christian Fitness        |

A wipe in a brand colour marks each change of act (into `api`, `proof` and `close`); inside an
act the cuts are hard.

## What it proves, and what it does not

- The app pictures are screenshots of the running admin app, taken by [`shots.ts`](shots.ts)
  through the page objects `AdminShell` and `AdminForbiddenPage` with the shared fixture of
  `frontend/e2e/fixtures/test.ts` answering Joel's Moderator session, or Dana's Admin session until
  her role becomes Moderator, after checking the navigation's items and role, the "Admins only"
  heading, its focus, its link, the kept address and the title. No backend and no database ran.
- **Drawn, not shot:** the API rows are the `StaffRoleTests` cases `dotnet test` reported passing,
  through probe endpoints in the test assembly that go through the real convention, policies and
  refusal writer; the table is the one `StaffAccess` and `canManage` both test row by row. The
  counts and the initial total are what `npm test`, `npx playwright test --list`, `dotnet test`
  and `ng build admin` printed (`shots/captures.js`).
- It leaves out, though they are built: a read refused `forbidden_role` showing "Admins only"
  through the forbidden interceptor, Go to dashboard by keyboard, and the band below 1024 px. No
  Events or Services endpoint existed yet, so the API is proved on probes; the audit of staff
  changes (L2-019 AC3) is slice 29.2's.

## Build it again

From the repository root, with `npm ci` done in `frontend/` and the tools set up
(`docs/videos/README.md`); `CF_WEB_PORT` and `CF_ADMIN_PORT` pick free ports:

```shell
node tools/video-record/record.mjs docs/videos/12-slice-29-1-admin-and-moderator-roles
python tools/video-audio/film_audio.py docs/videos/12-slice-29-1-admin-and-moderator-roles
node tools/video-build/build.mjs docs/videos/12-slice-29-1-admin-and-moderator-roles --crf 24
```
