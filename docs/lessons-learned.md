# Lessons learned

One entry per slice of [journeys.detailed.md](journeys.detailed.md), added before the slice
merges. Read this file before starting a slice and apply what fits.

Each entry records what slowed the slice, the new lessons it taught and how earlier lessons
worked when applied. Newest entries go at the bottom.

**% complete:** 16% (8 of 54 slices; 13 of 83 days)

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

## Slice 2.1: Join with valid details

**What slowed it**

- The first screen that calls the API grew the initial bundle by 33 kB, past the error budget,
  not only the warning. Diffing `--stats-json` inputs of `main` against a build of `origin/main`
  (a second, throwaway worktree with its own `npm ci`) named each part: `HttpClient` 21 kB, the
  first `@for` 5.4 kB, `ngTemplateOutlet` 3.3 kB, the form's bindings about 3.6 kB. A failing
  error budget writes no stats file: raise the error budget in a scratch copy of `angular.json`
  to measure, then restore it.
- Chromium logs every 4xx and 5xx response as a console error ("Failed to load resource"), and
  the shared fixture counted it as a page error, so a spec that answers 500 on purpose failed for
  the wrong reason. The fixture now skips that log for a backend request a handler answered.
- An HTTP error with no `error` callback reaches Angular's global error handler as "ERROR
  HttpErrorResponse", which the fixture rightly fails; the write that fails needs its own error
  path even before its failed state is designed.
- `dotnet ef migrations add` wrote `new string[0]` for a primitive collection's default, which
  CA1825 refuses with warnings as errors; and adding `FrameworkReference Microsoft.AspNetCore.App`
  to Infrastructure made two package references redundant (NU1510, also an error).
- A Git Bash heredoc holding Python with an apostrophe in a string ("scheme's") failed to parse
  and ran nothing, as slice 1.2 warned; edits with prose went into a script file instead.

**New lessons**

- A record's generated `ToString` prints every property: a command that carries a password or a
  faith detail is a class, so nothing personal can reach a log by accident.
- Test a `Secure` cookie through `WebApplicationFactory` with an `https://localhost` base address
  and `HandleCookies = false`, reading `Set-Cookie` and sending `Cookie` by hand; the assertions
  then see exactly what the API set.
- `__Host-` cookies need `Secure`, path `/` and no domain; a test that lists the attributes
  catches a scheme option that drops one.
- Emulated encapsulation does not reach projected content: lay out projected fields with `gap` on
  the slot's wrapper, and put a style a projected node needs (a spinning icon) in the global
  utilities.
- Split a component whose stylesheet passes the 2 kB warning along a real seam (the brand panel
  apart from the form) before raising the budget; raise it only for what is left.
- A gate (`new Promise` resolved by the test) in a fixture handler holds a request in flight, so
  a busy state is asserted without any clock or sleep.

**How earlier lessons worked**

- "Read the initial total after each new Angular API, and diff `--stats-json`" (30.1) found the
  cost in minutes; reading the total alone would have said only that 33 kB had gone.
- "Prove a rule red by breaking it alone" (1.1, 30.1) was applied to the submitting state (the
  disabled, busy and read-only bindings each removed in turn), the cookie's persistence, the
  blank home church, the distinct interests and a span event carrying the email.
- "Correlate a server span by its `traceparent`" (1.2) carried over to the join's telemetry test.
- "Always pass `encoding='utf-8', newline='\n'`" (30.1) kept the "…" and "—" of the copy intact.

## Slice 2.2: Join refusals

**What slowed it**

- `[ApiController]` answered a body with `null` fields before any validator ran: MVC treats a
  non-nullable `string` property as required and writes its own 400, with code `error` and
  MVC's own sentences. `SuppressImplicitRequiredAttributeForNonNullableReferenceTypes` lets the
  nulls reach the validator; `InvalidModelStateResponseFactory` refuses a body that cannot be read
  at all without repeating any of it.
- The mock generator rewrote every mock with CRLF on Windows, so `git status` listed 137 changed
  files with no change in them; stripping `\r` from the regenerated files left only the eight
  real changes.
- A Git Bash heredoc holding Python with an apostrophe in a string failed again, as slices 1.2
  and 2.1 warned; the edit scripts went into files written by the editor tool.
- An error summary's `<a href="#f-name">` resolves against `<base href="/">`, so a plain click
  would load `/` instead of moving to the field: the link prevents the default and focuses the
  field by id.

**New lessons**

- A rule computed in both stacks is easiest to keep aligned as one table copied into both
  suites with the same rows and the same `why`; breaking one guard in each stack (the trim, the
  dot in the domain) proved each row honest.
- EF Core InMemory has no unique index: a decorator of `IAppDbContext` that saves a rival row
  from another scope and then throws `DbUpdateException` reproduces the race PostgreSQL would
  refuse, with no sleeping.
- A telemetry test for refusals shares the fixture's log snapshot with the other tests of its
  class: logging an attempted value turned two of them red, which is the point; assert over the
  whole snapshot, not one request's lines.
- `:empty` ignores comment nodes, so a slot wrapper whose only child is an `@if` anchor collapses
  with `display: none` and leaves no gap above the fields.
- The first `computed` in a lazy component still costs `main` about 0.85 kB of signal code, and
  a helper used by a service bound in `app.config.ts` is in `main` too (`apiErrorOf`, 0.45 kB):
  both read from a `--stats-json` diff of `main`'s inputs against the base.

**How earlier lessons worked**

- "Read the initial total after each new Angular API, and diff `--stats-json`" (30.1, 2.1) named
  the 1.1 kB at once: the base stats were saved before the first change, so no second worktree
  was needed.
- "A record's `ToString` prints every property" (2.1) carried over: the new `RefusalException`
  carries only the code as its message, never a value from the request.
- "Prove a rule red by breaking it alone" (1.1, 30.1, 2.1) was applied to the race catch, the
  unreadable-body factory, the implicit-required switch, the alert's focus, the summary link's
  `preventDefault`, the email pattern, the trim, and an `[innerHTML]` greeting.
- "A gate in a fixture handler" (2.1) was not needed: every refusal is a single answer, and the
  specs await the response with `submitAndAwaitAnswer`.

## Slice 3.1: Sign in and sign out

**What slowed it**

- "Ends the session on the server" (L2-004 AC5) is not what cookie sign-out does: the cookie
  held the whole ticket, so a copy kept from before sign-out stayed valid. A replay test caught
  it, and sessions moved to a `Sessions` table behind an `ITicketStore`.
- `AutoValidateAntiforgeryTokenAttribute` is silently inert with `AddControllers`: its filter
  needs MVC's view services. Our own `IAsyncAuthorizationFilter` calling `IsRequestValidAsync`
  replaced it, and every test sent without a token turned red at once, as it should.
- Antiforgery with `SecurePolicy = Always` throws on a plain-HTTP request, which the in-memory
  test server (and a TLS-ending proxy) sends; a `CookieBuilder` that always sets `Secure` kept
  the `__Host-` cookies valid without refusing to run.
- The mocks' sign-in `invalid` state marked the password field with "That email and password
  don't match", against the requirement's words and leaking that the email exists; the mock was
  corrected before any code.
- A 1,024-character password limit on sign-in was planned, then dropped: Join has no maximum, so
  such a member could never have signed in. A rule in one endpoint must be checked against the
  endpoint that created the data.
- Angular 22's Beasties swaps the critical stylesheet in with an inline `<script>`, not an
  `onload` attribute: a grep for `onload` found nothing and nearly let the change go; reading the
  built `index.html` found it.
- With a guard on the first navigation, `router.url` is still `/` when the guard's request
  fails, so the server-error screen's "Try again" pointed at `/`. The interceptor now reads the
  navigation in flight.
- An unquoted Git Bash heredoc expanded a template literal's `${…}` and the whole command
  failed to parse; specs go through the editor tool.

**New lessons**

- A guard on a parent route changes every spec that opens a child: the shared fixture now
  answers `GET /api/session` as signed in and `GET /api/antiforgery` with a token by default, and
  the one spec that asserted a 401 on Home now asserts the redirect.
- A handler in the API tests that fetches the antiforgery token the way the browser does keeps
  older tests honest without each one knowing about the token.
- Set `HttpContext.User` when signing in or out, so a token issued in the same response belongs
  to the new identity; a test that signs out with the sign-in response's token proves it.
- HSTS is never sent to `localhost`; test it with a base address on another host.
- Security headers written in `Response.OnStarting` survive the exception handler, which clears
  headers set before it.

**How earlier lessons worked**

- "Read the initial total after each new Angular API, and diff `--stats-json`" (30.1, 2.1, 2.2):
  the base stats were saved before the first change; the diff named the interceptor, the guard
  and rxjs `last` (0.15 kB). The total went from 256.21 kB to 258.23 kB, under the 260 kB warning.
- "Prove a rule red by breaking it alone" (1.1, 30.1, 2.1, 2.2) found that the always-Secure
  builder and the identity change each guard a different test, and that the guard's 401 check is
  what keeps a 5xx off the sign-in screen.
- "A gate in a fixture handler" (2.1) gave the submitting and signing-out states a held answer
  with no clock and no sleep.
- "Write edit scripts to files, not heredocs" (1.2, 2.1, 2.2) applied again: the one heredoc used
  for a spec failed.

## Slice 20.1: Request a reset link

**What slowed it**

- It was built out of order, beside slices 3.2 and 9.1, so nothing could be borrowed from 3.2's
  failed sign-in window. The rule was made a stateless Domain record, `AttemptWindow(Limit,
  Period)`, fed by each feature's own count, so 3.2 can share it whatever store it picks.
- `dotnet ef migrations add` wrote a composite index as `new[] { … }`, which CA1861 refuses with
  warnings as errors; a `.editorconfig` in `Persistence/Migrations` turns CA1861 off for generated
  migrations only.
- An email needs settings production cannot run without, but every API test starts the host in
  `Production`: the shared `ApiFactory` now sets a dummy SMTP host, sender and member-app address,
  replaces `IEmailSender` with a recorder and removes the dispatcher, so no background service
  runs in the shared host.
- `{{ altLink() }}` followed by `{{ altEnd() }}` on the next line rendered "again ." : the
  newline between an element and an interpolation becomes a space. The closing words sit on the
  element's line, with Prettier's `</button\n>` form.
- A spec that aborted the request with `page.route(...).abort()` failed in the shared fixture:
  Chromium logs `net::ERR_FAILED` as a console error. A 503 answer covers "the server failed".
- Git Bash heredocs failed twice more on apostrophes (`'invalid'|'failed'` in a PlantUML file);
  the files went through the editor tool, as slices 1.2 to 3.1 warned.

**New lessons**

- An endpoint that must not reveal whether an account exists answers the same status, headers
  and bytes in every case, and never waits for a mail server: queue the email
  (`Channel` + `BackgroundService`) and let the handler return. Test it by comparing two
  responses' bodies and header names, and prove it red by making the unknown case throw.
- A reset token goes in the link's fragment (`#token=`), which no browser sends to a server or in
  a `Referer`; the link's origin comes from configuration, never the `Host` header.
- A MailKit sender is testable without a mail server: a 60-line `TcpListener` that speaks EHLO,
  MAIL, RCPT, DATA and QUIT, awaited through a channel with a timeout that names what was awaited.
- A component whose two shapes differ by their root element (a `<form>` or a `<div>`) keeps its
  slots in one `<ng-template>` shown by `ngTemplateOutlet` in both branches, as AGENTS.md asks,
  and an empty slot wrapper hides itself with `:empty`.
- A notice that replaces a form takes focus on its heading in `ngAfterViewInit`; rendering it as a
  second instance in an `@else` makes every arrival a new instance, so focus moves every time.

**How earlier lessons worked**

- "Read the initial total after each new Angular API, and diff `--stats-json`" (30.1 to 3.1): base
  stats saved before the first change named the whole growth at once, 0.27 kB from the route and
  the service method; `ngTemplateOutlet` and `computed` were already paid for.
- "A rule computed in both stacks shares one inline case table" (2.2): the reset email rule's
  table sits in `email-rule.spec.ts` and `RequestPasswordResetValidatorTests.cs` row for row.
- "Prove a rule red by breaking it alone" (1.1 to 3.1) found a weak table: breaking the refusal
  mapping to `status >= 400` passed until a row with a 500 and `validation_failed` was added.
  The window's boundary (`>` to `>=`), the stored hash, the dispatcher's catch, the recorder's
  bound, the summary, the field reset, the notice's focus and a logged link each turned the right
  tests red.
- "A telemetry test shares the fixture's log snapshot" (2.2): one temporary log of the link turned
  all three reset telemetry tests red, refusals included.
- "A gate in a fixture handler" (2.1) gave the "Sending…" state and the film's busy shot with no
  clock and no sleep.
