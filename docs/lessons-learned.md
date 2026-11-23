# Lessons learned

One entry per slice of [journeys.detailed.md](journeys.detailed.md), added before the slice
merges. Read this file before starting a slice and apply what fits.

Each entry records what slowed the slice, the new lessons it taught and how earlier lessons
worked when applied. Newest entries go at the bottom.

**% complete:** 23% (13 of 54 slices; 19 of 83 days)

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

## Slice 9.1: Staff sign-in and admin shell

**What slowed it**

- The mocks and the requirement disagreed twice: the sign-in `invalid` state named the password
  (against L2-018 AC3), and L2-021 AC2 asked for a menu button while the design system and every
  admin mock draw a scrolling band that hid Sign out. Both were settled in the mock, the design
  system and L2 before any code, with ADR 0011 saying why.
- The first antiforgery selector also chose the staff scheme for every `/api/admin` path, which
  made the `Staff` policy convention impossible to see fail: with it removed, the member-session
  tests still passed. Dropping that branch left the selector on `/api/antiforgery` alone and gave
  the convention a test that goes red.
- Moving the sidebar's user block into the layout pushed its stylesheet past the 3 kB component
  budget; `AdminUser` became its own component, which was the right seam anyway.
- Apostrophes inside a quoted Git Bash heredoc ended the quoting and the whole command failed to
  parse, twice, before anything ran; prose files went through the editor tool after that.
- The design-system and mock builders write CRLF on Windows; their output was normalised before
  staging.

**New lessons**

- A second app on the same host needs its own cookie scheme and name: the dev servers share
  `localhost`, so one cookie would let a member session and a staff session replace each other.
- Put an authorization rule that must hold for a whole area in a convention keyed on the route
  prefix, and prove it with a request that only the convention can refuse (a member session on an
  admin endpoint).
- A credential check shared by two sign-ins (`MemberCredentials`) means the lockout another slice
  adds covers both without either slice touching the other's handler.
- A shell that hands plain clicks to the router keeps real `href`s; a spec that marks the
  document and checks the mark after the click proves there was no reload.
- Shots of a small region need no padding when the region sits against another colour: the
  padding brought in a strip of the page beside the sidebar.

**How earlier lessons worked**

- "Read the initial total after each new Angular API, and diff `--stats-json`" (30.1, 2.1, 2.2,
  3.1): the base was saved first; the diff put 24.2 kB in `@angular/common` (the client) and
  11.5 kB in `@angular/core`, which justified the budget raise in ADR 0011 to 260/275 kB, as the
  member app's was.
- "A guard on a parent route changes every spec that opens a child" (3.1): the shared fixture
  answers `GET /api/admin/session` as signed in by default, and the boot, not-found and
  server-error specs were run again with it.
- "Prove a rule red by breaking it alone" (1.1 to 3.1): breaking `preventDefault`, the
  `NavigationEnd` update, the server-error interceptor, the convention, the selector and the role
  check each failed the specs or tests meant to catch them.
- "A gate in a fixture handler" (2.1, 3.1) gave the signing-in and signing-out states without a
  clock.

## Slice 3.2: Sign-in protections

**What slowed it**

- The account creation limit could not use ASP.NET Core's rate-limiting middleware: its limiters
  count requests (a visitor who mistyped five times could create nothing), and they keep their own
  clock, so the hour passing could only be proved by waiting. A lease in the handler on
  `TimeProvider` counts accounts created and is tested with `FakeTimeProvider` (ADR 0012).
- Every older API test that joins shares one in-memory server, and the in-memory server gives a
  request no remote address, so a per-address limit would have refused the sixth join of every
  test class. The base fixture's startup filter now gives each request a random IPv6 address
  unless the test names one in `X-Test-Client-Address`.
- ASP.NET Core has no default ProblemDetails `type` for 429, so the first 429 answered without one
  and the exact-keys assertion caught it; the exception handler sets RFC 6585's.
- `dotnet ef migrations add` wrote a composite index's columns as `new[] { … }`, which CA1861
  refuses with warnings as errors; a `static readonly` field in the migration fixed it, as
  `new string[0]` was fixed in slice 2.1.
- A new `returnPathOf` in `domain` clashed with the server-error screen's helper of the same name
  through `export *`; the build named it ("Ambiguous import"). The rule they share became
  `isAppPath`, and the sign-in one `signInReturnPathOf`.
- The first wording of the pause ("ends 15 minutes after the fifth failure") was wrong for a
  sliding window: with failures a minute apart it ends when the oldest is 15 minutes old. The API
  test that spaced the failures out found it before the code did.
- The mock's paused state disabled the submit button, which would also have refused a member who
  corrected a mistyped email; the mock was corrected before code.
- Git Bash heredocs mangled backslashes in a TypeScript regex and in Python edit scripts again;
  every file holding a backslash went through the editor tool.
- Slice 20.1 merged while this one was finishing, and the rebase touched everything shared: both
  had taken ADR 0010 (this one became 0011, with every reference in code renumbered by the lines
  this branch added), both added a `DbSet` and a migration (mine was dated before theirs, so it
  was deleted and generated again after theirs), both changed `ApiFactory`, and the sign-in
  screen had gained "Forgot your password?". Then slice 9.1 merged with ADR 0011 (this one became
  0012, sparing the two added lines that cite 9.1's), its own `RefusalKind.Forbidden`, and the
  credential check moved into `MemberCredentials`, which staff sign-in shares; the member
  `SignInHandler` now wraps that check with the window and the suspension, so staff sign-in kept
  its behaviour. The video was shot again after each rebase.

**New lessons**

- A limit per email must answer an unknown email the same way as a known one, or the pause
  itself tells which emails have accounts; and a refused attempt must not be recorded, or anyone
  can keep a member out for as long as they keep trying.
- Tell a suspended member only after the right password: a wrong password keeps the generic
  answer, so the status is not a way to learn about an account.
- A test helper that forces state the product cannot set yet (a suspended member before slice
  27.1) can write through EF Core's `Entry(...).Property(...)`, leaving the domain without a
  method nobody calls.
- A test of a sliding window spaces its events out (a minute apart) and checks both sides of the
  edge; events at one instant cannot tell a sliding window from a fixed one.
- A per-address limit for IPv6 keys by the /64, since one host is usually given a whole /64.
- After a rebase, look for what the other slice made that this one deferred or duplicated: 20.1's
  `/forgot-password` let the paused message carry the mock's "Reset your password" (deferred
  until then), and its `AttemptWindow` replaced this slice's own window constants.
- A migration generated on a branch is regenerated after a rebase that brings an earlier-merged
  migration dated later, so the model snapshot and the order of migrations agree.
- Behind a reverse proxy, `ASPNETCORE_FORWARDEDHEADERS_ENABLED=true` is ASP.NET Core's own switch
  for the client's address; it trusts any peer, so it belongs where only the proxy reaches the
  API, and it is a setting the deployment must know (`docs/operations/settings.md`).

**How earlier lessons worked**

- "Read the initial total after each new Angular API, and diff `--stats-json`" (30.1, 2.1, 2.2,
  3.1): the base stats were saved before the first change; the diff showed `createUrlTree` in the
  guard (53 bytes) and the shared `isAppPath` moving from one file to another. The total went from
  258.23 kB to 258.32 kB, and after the rebase from main's 258.50 kB to 258.59 kB.
- "Prove a rule red by breaking it alone" (1.1, 30.1, 2.1, 2.2, 3.1) was applied with a script
  that swaps one line, runs the test project and restores it: the limit, the window's edge, the
  clearing on success, the pruning, the suspension's place, the lease's release, the /64, the
  IPv4 mapping, and the return-path check (all six crafted addresses turned red).
- "A record's `ToString` prints every property" (2.1, 2.2): the limiter's `Lease`, which holds the
  client address, is a class.
- "Write edit scripts to files, not heredocs" (1.2, 2.1, 2.2, 3.1) applied again, and was broken
  again where a backslash was involved.
- "Use free ports" (AGENTS.md): with other sessions running specs at the same time, the specs and
  the take used ports of their own (`CF_WEB_PORT`), since Playwright reuses a server already on a
  port.

## Slice 9.2: Two-step verification

**What slowed it**

- The mock drew more than one day could hold: "Trust this browser for 30 days", backup codes, and
  no screen to set an authenticator up or for a step that expired or was locked. The checkbox and
  the backup link left the mock, an operator's `cf two-step` replaced a setup screen, and the
  sign-in mock gained three endings, all in ADR 0013, before any code.
- Clearing the step cookie on a refusal did nothing: the refusal is thrown after the cookie is
  cleared, and the exception handler clears every header set before it, as slice 3.1 found for
  security headers. The cookie is now expired in `Response.OnStarting`. The API tests that read
  `Set-Cookie` on the refusals caught it.
- A script that broke a guard and restored the file with `cp` and `mv` left the restored file
  older than the last build, so MSBuild kept the broken assembly and a later run failed for no
  reason in the source. The restore now touches the file.
- Restoring `history.state` on a reload brought Staff sign in's "Sign in again" notice back on a
  fresh visit; only an imperative navigation with a previous navigation counts now.
- Apostrophes in a quoted Git Bash heredoc failed the parse once more (a design README edit),
  and a chained command went on to commit without the edit; the amend fixed it, and the editor
  tool took every prose script after that.

**New lessons**

- A second step is a pending sign-in, not a half session: a short-lived challenge with only its
  token's hash stored, named by its own `__Host-` cookie, and no session cookie until the code is
  right. No policy, claim or scheme had to change, and every admin endpoint stayed closed.
- Count wrong codes per account, not per challenge, and check the window before the code: a new
  password step must not reset the count, and a full window must say nothing about a guess.
- RFC 6238's appendix vectors, cut to 6 digits, make a domain table any implementation can be
  checked against; drift and reuse are rows too, so breaking `>` to `>=` turns exactly the reuse
  rows red.
- Navigation state is a clean way to carry a reason from one screen to the next without a query
  string anyone can craft, but read it only from the navigation that set it.
- Focusing a field that is already on screen needs no view query or `afterNextRender`: a DOM lookup
  on the host in the error callback costs nothing in `main`.

**How earlier lessons worked**

- "Read the initial total after each new Angular API, and diff `--stats-json`" (30.1 to 9.1): the
  base was saved before the first change; the diff put the whole growth, 0.23 kB, in the route
  table and the service method. `currentNavigation()` and the new template features cost nothing
  in `main`; the code screen is a 2.35 kB lazy chunk.
- "`AttemptWindow` for any feature's own count" (20.1) fitted without a change: the failure
  table, the window's `Since` and `IsFull` were all the slice needed.
- "Prove a rule red by breaking it alone" (1.1 to 9.1): the window check, the expiry, the failure
  record, the window's boundary, the used step, the not-set-up check, the field's focus, the
  ending guard and a span event carrying the code each turned the right tests red.
- "A gate in a fixture handler" (2.1, 3.1, 9.1) gave "Verifying…" with no clock; the backend
  moved a `FakeTimeProvider` past the 5-minute and 15-minute thresholds, never sleeping.
- "Security headers written in `OnStarting` survive the exception handler" (3.1) was the fix for
  the step cookie, once the failure was understood.

## Slice 20.2: Choose a new password

**What slowed it**

- It was built out of order again, beside slices 3.2, 9.1 and 9.2, and all three merged while it
  was open. They took ADRs 0011, 0012 and 0013 in turn, so this slice's ADR was renumbered three
  times, ending at 0014, in the record, the design, the code comments and the film (rebuilt each
  time its kicker changed); 9.2 also took L2-046, after this slice's L2-045. Each rebase met the
  other slice's new `RefusalKind` (`Forbidden`, then `TooManyRequests`), codes and service
  registrations in the same lines as this slice's `Gone`, `reset_link_expired` and session
  revocation, all kept side by side; 3.2 also added `SignInFailures` to `IAppDbContext`, which
  this slice's race decorator then had to implement, a break the merge itself never showed.
- Slice 3.2's rate limiting landing mid-slice brought the per-address limit on reset requests into
  scope (L2-034 AC3), with its own requirement, mock state (`forgot-password/limited`), design and
  diagrams, tests and a rebuilt film's proof scene, after the slice had looked finished.
- The mock named the account above the fields ("For grace.thompson@gmail.com."), which the token
  alone cannot do: a second endpoint checks the link first. That brought three mock states the
  mocks lacked (`loading`, `failed`, `unchecked`), drawn before code.
- The screen's code was written in the same sitting as its happy-path spec, so the refusal spec
  passed at once and proved nothing. Each guard was broken in turn by a script (no-token state,
  check refusal, form check, failure alert, save refusal, `replaceState`, the empty last line,
  `aria-busy`); one break deleted the `if` of an `else if` chain and failed the build instead of
  a test, so it was redone as a changed condition.
- A Git Bash heredoc holding Python with "don't" failed to parse, as slices 1.2 to 20.1 warned;
  the edit scripts went through the editor tool.

**New lessons**

- Single use under a race is an EF Core concurrency token on `UsedAt`: the database updates the
  reset only while it is still unused, and `DbUpdateConcurrencyException` becomes the refusal.
  EF Core InMemory checks concurrency tokens, so a decorator of `IAppDbContext` that spends the
  link from another scope just before the real save reproduces the race with no sleeping.
- Ending sessions in the same transaction as the password change needs no new store: an
  Application contract whose Infrastructure implementation removes `Sessions` rows through the
  request's scoped `AppDbContext` (the same instance as `IAppDbContext`) leaves them for the
  handler's one `SaveChanges`.
- A token in a fragment is read once from `ActivatedRoute.snapshot.fragment` and dropped with
  `Location.replaceState`, which `main` already pays for: the whole screen cost the initial bundle
  0.45 kB, all of it the route and the two service methods.
- A breaking script must leave the code compiling: change a condition (`=== 'nothing'`), never
  delete half of a chain. Analysers count as compiling: an unread primary-constructor parameter
  (CS9113) or a member that turns static (CA1822) fails the build, so pass the value through a
  condition, or run that one break with `-p:RunAnalyzers=false`.
- A second limit on the same key reuses the first one's window by moving it into an abstract base
  (`AddressRateLimiter`) whose subclasses set the limit; each is its own singleton, and a test that
  fills one and asks the other proves they count apart (the break was a `static` map).
- A limit that must reveal nothing counts every request and gives none back: the reset limit
  takes its lease before the email is looked up, so the answer depends only on the address.

**How earlier lessons worked**

- "Read the initial total after each new Angular API, and diff `--stats-json`" (30.1 to 20.1): the
  base stats were saved before the first change; `@switch`, `Location` and `computed` were
  already paid for.
- "Prove a rule red by breaking it alone" (1.1 to 20.1) caught nothing weak this time but was the
  only proof for the specs written after the screen; the expiry boundary (`<` to `<=`), the used
  check and the logged token each turned the right backend tests red.
- "A rule computed in both stacks shares one inline case table" (2.2, 20.1): the new password's
  rows sit in `new-password-rules.spec.ts` and `CompletePasswordResetValidatorTests.cs`.
- "A gate in a fixture handler" (2.1) gave "Checking your link…" and "Saving…" and the film's
  busy shots with no clock.
- "Rebase onto origin/main before the PR" applied twice and paid off: the second fetch found
  slice 3.2 merged, so its client address and sliding window were reused for the per-address
  reset limit instead of recording it for later, and its new `IAppDbContext` member surfaced in
  this slice's own test double before CI did.

## Slice 18.1: View my profile

**What slowed it**

- It ran out of order, before any event or registration exists. The "Going to" list was built
  against `IRegistrationReader`, whose only implementation answers none until slice 6.1; the API
  tests prove the pass-through with a fake reader and the screen's specs with the fixture.
- The mocks drew a handle (`@gracet`) no requirement defines, a city for a member Join never asked
  for one, and a reference in an error state only a 4xx or no answer can reach (a 4xx carries no
  reference). The mock generator was corrected before code.
- The first component-level `providers` added 2.3 kB of `@angular/core` to `main`, past the 260 kB
  warning; a `--stats-json` diff named it in one build, and removing the line once confirmed it.
  The warning budget went to 263 kB with that reason (ADR 0015).
- Git Bash heredocs failed again on an apostrophe in a template ("didn't"); every component went
  through the editor tool, as slices 1.2 to 3.2 warned.
- A commit took the next sub-slice's spec with it because the spec was edited before the commit;
  stage named paths only after the step's tests are run, not after the next step has begun.

- Slices 9.2 and 20.2 merged while this one was open, taking ADRs 0013 and 0014 and adding
  migrations. Each rebase renumbered our ADR (now 0015, changed only on the lines this slice
  added) and regenerated `AddMemberProfile` on the merged snapshot, so the migrations stay in
  order and each Designer model is complete.

**New lessons**

- Read every date on screen in the community's time zone (`America/Toronto`), not UTC or the
  browser's: a table with rows either side of midnight in Toronto and UTC proves it, and the
  "same UTC day" break turned exactly those rows red.
- `page.clock.setFixedTime` fixes `Date` without pausing timers, so a "today" rule can be specified
  in Playwright without the stalls a paused clock brings.
- An event picture in a spec can be a `data:` URI: it never leaves the page, so the fixture's
  off-localhost and console-error checks stay quiet without a fake image server.
- A screen-scoped client is bound in the routed component's `providers`; that is a one-time cost
  in `main` that later screens reuse, unlike binding it in `app.config.ts`, which keeps it alive.

**How earlier lessons worked**

- "Read the initial total after each new Angular API, and diff `--stats-json`" (30.1 to 3.2): the
  base stats were saved before the first change, so the 2.3 kB were named at once.
- "A test helper that forces state the product cannot set yet can write through EF Core's
  `Entry(...).Property(...)`" (3.2): the city, bio and goals that only slice 18.2 edits were set
  that way, with no domain method nobody calls.
- "Prove a rule red by breaking it alone" (1.1 to 3.2): the member lookup, the clock passed to the
  reader, the events passed through, a logged home church, the avatar's `preventDefault`, an
  `[innerHTML]` name, the Toronto day and the unknown interest key each turned the right test red.
- "A gate in a fixture handler" (2.1) gave the loading state with no clock and no sleep.
- "Use free ports" (3.2): the specs ran on 4410/4411 beside the two other sessions.
