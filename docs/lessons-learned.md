# Lessons learned

One entry per slice of [journeys.detailed.md](journeys.detailed.md), added before the slice
merges. Read this file before starting a slice and apply what fits.

Each entry records what slowed the slice, the new lessons it taught and how earlier lessons
worked when applied. Newest entries go at the bottom.

**% complete:** 5% (2 of 54 slices; 4 of 83 days)

## Slice 1.1: Frontend workspace

**What slowed it**

- The Angular 22 CLI generates libraries as source packages but points the `tsconfig.json`
  paths at `./dist/<name>`, and adds `build` and `test` targets that need a build step and at
  least one spec. The paths were remapped to each `src/public-api.ts` and the targets removed
  (ADR 0001).
- The unit-test builder refuses a run with no spec file, even with `passWithNoTests` in a Vitest
  config, because it fails before Vitest starts. A library's test target needs a `buildTarget`
  (an app's development build).
- `npm run format` reformatted the copied `tokens.css`, which then differed from the design
  system. Vendored copies go in `.prettierignore` before the first format run.
- eslint-plugin-boundaries v7 renamed its rule to `boundaries/dependencies` with `policies`, and
  deprecated `mode` on elements; older examples on the web no longer apply.

**New lessons**

- Angular 22 makes `OnPush` the default and angular-eslint's
  `prefer-on-push-component-change-detection` already refuses `Eager`; do not add a rule or a
  `changeDetection` line for it.
- With `provideBrowserGlobalErrorListeners`, an uncaught error reaches the console, not
  Playwright's `pageerror`; the shared fixture counts console errors as page errors.
- Prove a lint or budget rule red with a throwaway file or a lowered budget, then restore it;
  never commit the throwaway (no architecture tests).
- Repository line endings: `.gitattributes` with `* text=auto eol=lf` keeps Prettier's LF check
  green on Windows checkouts.
- Barlow Condensed ships italic only up to 600: ask for `italic 600`, or the browser synthesises
  a fake bold.

**How earlier lessons worked**

- None yet: this is the first slice.

## Slice 1.2: Backend skeleton

**What slowed it**

- ASP.NET Core instrumentation already writes `url.query` as `?email=Redacted&token=Redacted`:
  the values go but the keys stay, with `url.path`, `server.address` and others. Only an
  allow-list of tags kept what the rule allows. The hosting diagnostics' `Request starting` and
  `Request finished` logs carry the full URL; `Microsoft.AspNetCore` is held at `Warning` in code,
  because `appsettings.json` alone can be overridden.
- With `TreatWarningsAsErrors` and `latest-recommended` analysers, test names with underscores
  (CA1707), a collection type's name (CA1710) and `ToLowerInvariant` (CA1308) fail the build;
  `backend/tests/.editorconfig` turns CA1707 off for tests only.
- `dotnet new tool-manifest` on .NET 10 writes `dotnet-tools.json` at the folder root, not in
  `.config/`.
- No PostgreSQL server was available locally (Docker was not running), so `cf migrate` was not run
  against a real database; the migration was checked with `dotnet ef migrations
  has-pending-model-changes` and the CLI's refusals by running it.
- In Git Bash, a quoted heredoc containing an apostrophe in a comment ("member's") failed to parse
  in this harness; files with prose went through the editor tool instead.
- The film runtime gave each scene's `<section>` the scene's name as its `id`, so a scene called
  `errors` took the style of the runtime's `#errors` box and rendered blank. Scene ids are now
  prefixed `scene-`.

**New lessons**

- To swap EF Core's provider in a test fixture, remove both `DbContextOptions<AppDbContext>` and
  `IDbContextOptionsConfiguration<AppDbContext>` (EF Core 9 and later) before
  `UseInMemoryDatabase`, or Npgsql and InMemory are both configured.
- An authorization fallback policy also covers paths no endpoint matches: an anonymous caller gets
  401 for any unknown path, so the existence of an endpoint cannot be probed. Prove "unknown
  endpoint" refusals that way before any controller exists.
- `UseStatusCodePages` with `AddProblemDetails` gives every bodiless 4xx and 5xx a ProblemDetails;
  a cookie scheme's `OnRedirectToLogin` and `OnRedirectToAccessDenied` set only the status, and
  the code comes from one `ProblemCodes.ForStatus` table.
- To reach the 500 path before any handler exists, a test authentication scheme that throws on a
  header value is enough; the exception handler is the only thing between it and the client.
- Correlate a server span with its request by sending a `traceparent` header with a known trace
  id, and await the exported span through a collection that completes a waiter on `Add`, naming
  what did arrive on timeout. No sleeping.
- MediatR 13 and later need a licence key: stay on 12.5.0 (Apache 2.0) unless an ADR says
  otherwise (ADR 0004).
- A slice with no screen still films the running system: `record.mjs --backend` starts the API and
  `capture()` saves what it says, so the film's terminals hold real words.

**How earlier lessons worked**

- "Prove a rule red with a throwaway change, then restore it" (1.1) carried over to the backend:
  removing `.AllowAnonymous()`, `UseStatusCodePages`, the redaction processor, the log filter and
  the seed's key check each turned the right tests red. The log test passed at first because
  `appsettings.json` also held the level; only taking out both showed it failing.
- "`.gitattributes` with `eol=lf`" (1.1) normalised the `dotnet new` and `dotnet ef` output, which
  is written with CRLF on Windows.
- The frontend checks (lint, format, build with budgets, e2e) stayed green untouched, as expected
  for a backend-only slice.
