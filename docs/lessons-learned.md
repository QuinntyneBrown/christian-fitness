# Lessons learned

One entry per slice of [journeys.detailed.md](journeys.detailed.md), added before the slice
merges. Read this file before starting a slice and apply what fits.

Each entry records what slowed the slice, the new lessons it taught and how earlier lessons
worked when applied. Newest entries go at the bottom.

**% complete:** 7% (4 of 54 slices; 6 of 83 days)

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

## Slice 1.3: CI pipeline

**What slowed it**

- A workflow cannot be proved before it exists, and `pull_request` runs only for a pull request:
  the draft pull request was opened at the first commit of the workflow, so every later push ran
  CI and the red runs could be watched on it.
- `git revert -q` is not an option; the command printed its usage and reverted nothing, so the
  next push carried the lint error again and a second red run went by before it was noticed.
  Read the commit a revert makes (`git log -1`) before pushing.
- `git add` of a file already removed with `git rm` fails the whole command, and the commit after
  it then never ran; a chained `&&` hid that until the run list showed the old run.
- The Playwright traces were uploaded on any failure, lint included; the upload now runs only when
  the behaviour-spec step itself failed.
- PlantUML wrote the em dash of a diagram title as mojibake until it was given `-charset UTF-8`.

**New lessons**

- Prove a CI check red with a throwaway commit on the pull request that breaks exactly that check
  (an unused constant for lint, an unused local for warnings as errors, a changed title for a
  spec, an endpoint closed for an API test), watch the run fail at that step for that reason, then
  revert it and check the tree equals the last green commit (`git diff <green> --stat` is empty).
- Sparse checkout (`actions/checkout` with `sparse-checkout: frontend`) keeps each job to its own
  folder, so a spec or a test that reads a file outside its project fails in CI, as AGENTS.md
  warns, instead of passing by luck.
- The ubuntu runner already has Chromium's system libraries: `npx playwright install --only-shell
  chromium` without `--with-deps` is enough, and with the browser cached by the Playwright
  version the step is skipped.
- With warm caches a run is under 40 s (frontend 36 s, backend 34 s, side by side); the cold
  first run was 91 s, most of it `npm ci`. A five-minute `timeout-minutes` on each job makes the
  five-minute rule fail loudly instead of drifting.
- A film for a slice whose system is GitHub Actions captures `gh run view` with
  `record.mjs --commands` (no app, no API), so the jobs, steps, seconds and log lines on screen are
  GitHub's own.

**How earlier lessons worked**

- "Prove a lint or budget rule red with a throwaway file, then restore it; never commit the
  throwaway" (1.1) had to bend: CI only sees what is pushed, so the throwaway was committed to the
  branch and reverted there; the squash merge leaves no trace of it on `main`.
- "`.gitattributes` with `eol=lf`" (1.1) kept the workflow and the rendered docs LF on Windows.
- "A slice with no screen still films the running system" (1.2) carried over: the film's
  terminals hold what the CI runs said, not typed-in copies.

## Slice 30.1: Not found and server error

**What slowed it**

- The initial bundle grew past the 220 kB warning with a slice that adds only two lazy screens.
  Diffing `--stats-json` inputs against the base showed the cost was in `main`, from the first
  use of Angular features: a view query (about 8 kB), class bindings (about 4.6 kB) and
  `withComponentInputBinding` (2.4 kB). Each was replaced (`ElementRef` and `querySelector`, one
  `[attr.class]` binding, the route snapshot). What remained came from Angular's chunk optimizer,
  which switches on with the third lazy route: about 2 kB more raw, about 1 kB less transferred.
  The warning budget went to 225 kB with that reason (ADR 0006).
- `provideHttpClient` costs about 20 kB of the initial bundle, and no screen calls the API yet,
  so the interceptor could not be registered without paying for nothing. It lives tested but
  unregistered in `domain`; the first data-loading slice registers it.
- The unit-test builder needs a DOM even for pure helpers: it failed until `happy-dom` was
  installed.
- Python's `read_text`/`write_text` on Windows used cp1252 and CRLF: a "·" became mojibake, which
  Prettier turned into U+FFFD. Always pass `encoding='utf-8', newline='\n'`.
- The keyboard spec raced the first render: Tab was pressed before the heading had focus. Await
  `toBeFocused()` on the heading before pressing a key.
- No admin mock existed for the error screens; they were added to the mock generator before code.

**New lessons**

- Read the initial total after the first use of any Angular template feature, not just a new
  API: a `viewChild`, a `[class.x]` binding or router input binding each grows `main` even when
  only a lazy component uses it.
- A screen reached with `skipLocationChange` can read its query parameters once from the
  `ActivatedRoute` snapshot: every arrival creates the page anew.
- Error-screen actions are plain `<a href>` links: a whole-document load is the right recovery
  after a failure, and it costs no router code.
- A reference a member can quote comes from the server (`CF-` and the first eight hex digits of
  the trace id), so an operator finds the request by it; the client only checks its shape and
  never shows a value it did not accept.
- A pure helper with a table of cases is tested with `it.each`, one row per case, and each guard
  is proved red by breaking that guard alone.

**How earlier lessons worked**

- "Prove a rule red with a throwaway change, then restore it" (1.1, 1.2) caught a weak test: the
  404's exact-keys test was only honest after `>= 500` was broken to `>= 400` and it failed.
- "Correlate a server span by sending a `traceparent` with a known trace id" (1.2) gave the
  reference test a fixed expected value, `CF-4BF92F35`.
- "Read the initial total after each new Angular API" (AGENTS.md) turned out to need
  `--stats-json` diffs to find where the bytes went; reading the total alone only said that they
  had gone.
- "CI only sees what is pushed" (1.3) did not apply: every red here was local.
