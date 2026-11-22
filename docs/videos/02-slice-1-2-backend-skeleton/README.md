# 02 · Slice 1.2: Backend skeleton

The second slice of journey 1, "Scaffold the apps": the .NET 10 backend in `backend/`, five
clean-architecture projects (`Domain`, `Application`, `Infrastructure`, `Api`, `Cli`) and two test
projects. The API requires a session by default, answers every error as ProblemDetails with a
`code`, keeps `/health`, `/health/live` and `/health/ready` anonymous, and records OpenTelemetry
spans by route template with nothing personal. The `cf` command line migrates PostgreSQL and seeds
the first staff account; the API never migrates.

- **Film:** [`02-slice-1-2-backend-skeleton.mp4`](02-slice-1-2-backend-skeleton.mp4), 1920×1080,
  30 fps, 1 min 34 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** _En La Playa – Trinidad and Tobago Soca_ by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-031 (AC1: the fallback policy), L2-032 (AC2 and AC4: ProblemDetails
  and their codes), L2-033 (AC2: nothing personal in telemetry), L2-040 (AC1 and AC2: telemetry and
  health) and L2-041 (AC1 and AC2: the CLI migrates, the seed is idempotent), with ADR 0004.

## Run sheet

| At   | Bars | Scene       | Picture                                                                                  | Headline                         |
| ---- | ---- | ----------- | ---------------------------------------------------------------------------------------- | -------------------------------- |
| 0:00 | 4    | `hook`      | What the API said to `/health/live` and to `/api/members/me`, over the aurora            | One API. **Closed by default.**  |
| 0:08 | 6    | `layers`    | Api and Cli over Infrastructure, Application and Domain, revealed as they are named      | Five projects, **one direction.** |
| 0:20 | 6    | `health`    | The captured answers of `/health/live` (200 Healthy) and `/health/ready` (503 Unhealthy) | Status, **nothing more.**        |
| 0:32 | 6    | `fallback`  | The captured 401 ProblemDetails, its `code` lit                                          | Closed by **default.**           |
| 0:44 | 4    | `errors`    | The four codes of `ProblemCodes`, 500 last                                               | Every error, **a code.**         |
| 0:52 | 6    | `telemetry` | The tags the instrumentation set on a span, the five dropped struck through              | Route, **not URL.**              |
| 1:04 | 6    | `migrate`   | The captured `cf` usage and `cf seed` refusal; the seed run twice, 1 then 0              | Migrate, then **seed.**          |
| 1:16 | 4    | `proof`     | Three red assertions, then 8 and 13 passed                                               | Red, then **green.**             |
| 1:24 | 5    | `close`     | The name over the aurora                                                                 | Christian Fitness                |

A wipe in a brand colour marks each change of act (into `health`, `telemetry` and `close`); inside
an act the cuts are hard.

## What it proves, and what it does not

- The slice has no screen, so the film is drawn. Its terminals hold the backend's own words:
  [`shots.ts`](shots.ts), run by `record.mjs --backend`, started the API as built with no database
  (port 1), called it with Playwright's request context, ran `cf` with `dotnet run`, checked each
  answer and saved it to `shots/captures.js`, which the film reads. The 401's `traceId` is the one
  that run returned.
- **Drawn, not captured:** the project diagram, the table of codes, and the span's tags, which are
  the tags `TelemetryTests` printed for `GET /health?email=…&token=…` with the redaction processor
  taken out. The red lines are what `dotnet test` printed before each rule was built or after it
  was broken on purpose; 8 and 13 are the passing counts of the two test projects.
- **Not shown, because no PostgreSQL server ran:** `cf migrate` applying `InitialCreate`, and
  `cf seed` writing to a real database. The idempotent seed is proved by `SeedRunnerTests` on EF
  Core InMemory.
- It leaves out, though they are built: the 404 and 500 acceptance tests through a stand-in
  session, readiness failing through an injected `IAppDbContext`, and the logs held at `Warning`
  for `Microsoft.AspNetCore`.

## Build it again

From the repository root, with `npm ci` done in `frontend/`, the .NET 10 SDK and the tools set up
(`docs/videos/README.md`):

```shell
node tools/video-record/record.mjs docs/videos/02-slice-1-2-backend-skeleton --backend
python tools/video-audio/film_audio.py docs/videos/02-slice-1-2-backend-skeleton
node tools/video-build/build.mjs docs/videos/02-slice-1-2-backend-skeleton --crf 24
```
