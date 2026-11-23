# Lessons learned

One entry per slice of [journeys.detailed.md](journeys.detailed.md), added before the slice
merges. Read this file before starting a slice and apply what fits.

Each entry records what slowed the slice, the new lessons it taught and how earlier lessons
worked when applied. Newest entries go at the bottom.

**% complete:** 43% (23 of 57 slices; 39 of 91 days)

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

## Slice 9.3: Idle expiry and forbidden

**What slowed it**

- The first design answered `session_expired` for any cookie the API could not accept, which
  broke slice 3.1's test that a signed-out copy of a cookie is refused `unauthenticated`. Only a
  session the ticket store finds expired says `session_expired` now; an unknown or signed-out key
  stays `unauthenticated`. Running the whole backend suite after the first green caught it.
- The forbidden screen first opened with `skipLocationChange`, as the server-error screen does,
  and the address bar kept the area staff were leaving, because the refused request is the guard's
  for the area they were moving to. `browserUrl` set to the navigation in flight fixed it, and the
  requirement's wording followed.
- The mock's forbidden screen sent staff "Back to the app", a link to another origin that left the
  admin session open, and named the signed-in email; the sign-in mock said the account was locked
  for 30 minutes until another admin unlocked it and disabled Sign in, which slice 3.2's pause does
  not do. The mock and ADR 0016 were corrected before code: Sign out, and "Sign-in paused for 15
  minutes".
- Slices 20.2 and 18.1 merged while this one was open, taking ADRs 0014 and 0015; this slice's ADR
  became 0016 in the record, the code comments, the designs, the mocks and the film, which was
  filmed and built again with the counts after the rebase.
- Apostrophes in a quoted heredoc failed the parse twice more; edit specs written by the editor tool
  and applied by a script that asserts every match took every edit after that.

**New lessons**

- ASP.NET Core's sliding expiration renews a cookie only after half its lifetime, so a request at
  10 minutes and another 25 minutes later would end a 30-minute session. Setting `ShouldRenew` in
  `OnCheckSlidingExpiration` renews on every request: a strict idle rule, proved by exactly that
  pair of requests.
- `ITicketStore.RetrieveAsync(key, HttpContext, ct)` lets the store mark the request when it finds an
  expired session, so `OnRedirectToLogin` can tell an expired session from a missing one without a
  second lookup or a claim.
- `canActivateChild` on the shell re-checks the session on every move between areas, which is what
  lets an idle expiry or a role taken away show on the next screen rather than at the next reload.
- `:empty` on a layout's fields wrapper drops its gap when a screen projects no fields, without an
  input or a class.
- Move a shared rule's window check into the shared credential check: the member and staff handlers
  then pause together with no second count, and a refused attempt cannot stretch the pause.

**How earlier lessons worked**

- "Read the initial total after each new Angular API, and diff `--stats-json`" (30.1 to 9.2): the
  admin initial total went from 257.70 kB to 258.98 kB, all of it in the two interceptors and the
  route table; the forbidden screen is a 1.59 kB lazy chunk.
- "Navigation state, read only from the navigation that set it" (9.2) carried "Your session
  expired" to Staff sign in; a reload does not bring it back, which ADR 0016 records.
- "`AttemptWindow` for any feature's own count" (20.1, 9.2) fitted the staff pause unchanged.
- "Prove a rule red by breaking it alone" (1.1 to 9.2): the renewal, the expired mark, the staff
  handler forgetting failures, the window's count and each interceptor's registration turned the
  right tests red; "touch the restored file" (9.2) kept MSBuild honest.
- "A gate in a fixture handler" (2.1 to 9.2) gave "Signing out…" with no clock; the backend moved a
  `FakeTimeProvider` past 29, 30 and 15 minutes, never sleeping.

## Slice 1.5: Design-system feedback, overlays and content

**What slowed it**

- The components library had no test target, and `@angular/cdk` is not installed although the
  dialog, drawer and menu pages assume it. ADR 0017 adds a Vitest target, makes the dialog and
  drawer presentation shells for the CDK Dialog a later screen installs, and builds the menu
  button without the CDK.
- `angular-eslint`'s inline-declarations rule refused the host components that project content in
  specs; lint now allows inline templates in `*.spec.ts` only.
- happy-dom's `textContent` joins adjacent elements with no space and includes `aria-hidden`
  text, so asserting a link's accessible name needed a small helper that walks the text nodes
  outside `aria-hidden`.
- Prettier rewraps a short interpolation inside `<caption>` onto its own lines, so the caption's
  text gains whitespace; assert trimmed text where the markup is formatted.
- Each component stylesheet repeated the `:focus-visible` outline the reset already gives every
  control, which pushed the menu's stylesheet 75 bytes over its 3 kB budget.
- Breaking the toast region's focus-out check left every test green: the spec only moved focus
  out of the region. A case for focus moving between two toasts was added and proved red.
- A coordinator rebase landed mid-slice ("every design-system component is built once and
  reused"), which this slice already followed.

**New lessons**

- A slice with no screen proves its components through the DOM with TestBed: roles, names, focus,
  keys and outputs, never structure or snapshots; Playwright takes over when a screen composes
  them.
- A component whose rules must reach its rows renders the rows itself (a `TemplateRef` input),
  since encapsulated styles do not reach projected content.
- A native `<details>` reports its state through the `toggle` event; drive it in a test by
  clicking its `<summary>`, not by setting `open` and dispatching a synthetic event.
- Leave focus rings to the foundations' `:focus-visible`; a component overrides only the colour
  where its background needs it.
- A navigation component renders real links and emits `navigate` only for a plain click, so new
  tabs and Back keep working.

**How earlier lessons worked**

- "Diff the initial total after each new Angular API" (30.1 to 9.3): both apps' initial totals
  stayed at 261.59 kB and 258.98 kB with and without this slice, checked by building the base's
  error page in place and restoring it.
- "Prove a rule red by breaking it alone" (1.1 to 9.3): every new spec failed first for its missing
  component, and the tone roles, the busy guard, the menu's disabled check, `nextMenuIndex`'s
  wrap, `fillOf`'s 90 % mark, the pagination gaps, the event card's count, the composer's trim and
  the toast region's focus-out (after its new case) each turned their own test red when broken
  alone.
- "Write prose with the editor tool, apply edits with a script that asserts every match" (9.3)
  kept every docs and spec edit to one attempt.
- "Shared fixture: run the whole suite after touching a shared flow" (2.1): the error page's new
  variant ran under all 162 behaviour specs, green.

## Slice 1.4: Design-system primitives and form controls

**What slowed it**

- The button's stylesheet passed the 3 kB component-style warning once it carried the page's eight
  variants and five sizes. Moving padding and the hover colour into component tokens
  (`--btn-pad-y`, `--btn-pad-x`, `--btn-fg-hover`) cut it to 3.28 kB; the rest has no real seam, so
  the warning went to 3.5 kB with ADR 0018 giving the reason, and the error stayed at 4 kB.
- `label-has-associated-control` cannot follow an input through `ngTemplateOutlet`, so the checkbox
  writes its input in both branches instead of sharing one template. The slot rule (declare each
  `ng-content` once) still holds: the input is not a slot.
- `happy-dom` returns `textarea.rows` as a string; the test reads the attribute instead.
- An Escape handler on the tooltip's anchor `span` failed `interactive-supports-focus`. The handlers
  went on the component's host, which the button's events reach by bubbling.
- Slice 1.5 merged while this one was open, with the same components test target, ADR 0017 and
  the stat page's fill meter. The rebase kept its target and took ADR 0018, and this slice's
  `cf-meter` was dropped for its `cf-fill`, so the meter is built once.
- Apostrophes in quoted heredocs failed the parse again; every edit after the first went through a
  script written with the editor tool that asserts each match.

**New lessons**

- A design-system rule that styles several blocks at once (`.input, .select, .textarea`, or the
  checkbox and radio option row) becomes a Sass mixin in the library (`_control.scss`,
  `_choice.scss`) included under each block, which keeps every stylesheet encapsulated without a
  global rule.
- When no screen uses a component yet, the acceptance test is a TestBed test through the CLI's
  `@angular/build:unit-test` builder, with a host component whose template is its own
  `.spec.html` (the lint rule forbids inline templates). Test one behaviour per case: keyboard,
  output, ARIA state, focus or timer, never markup.
- A small `breakcheck.py` that applies `[file, old, new]` cases one at a time, runs the suite,
  lists the failing tests and restores the file made honest red cheap: 60-odd guards across five
  sub-slices, each seen to turn the right test red.
- One form-field wrapper (label or fieldset and legend, optional marker, hint or error, and a pure
  `fieldDescribedBy`) let six controls share their accessible name and description without
  repeating markup.
- `[attr.class]` with whole class strings keeps a component off the class-binding runtime, and a
  `host` style binding (`--progress`) feeds a CSS width without an inline `style` in a template.

**How earlier lessons worked**

- "Read the initial total after each new Angular API" (30.1 to 9.3): `linkedSignal`, `DestroyRef`
  and `DOCUMENT` were already paid for; both apps' initial totals stayed at 261.59 kB and 258.98 kB
  through all five sub-slices, which is the proof that the one barrel tree-shakes.
- "Prove a rule red by breaking it alone" (1.1 to 9.3) ran as the breakcheck script after every
  sub-slice.
- "Keep the mocks' BEM classes" held every page object unchanged: the text field gained the form
  field's `field-row` and all 162 behaviour specs still passed.
- "A free port per worktree" (CF_WEB_PORT 4520, CF_ADMIN_PORT 4521) kept the e2e runs clear of the
  paused worktrees.

## Slice 1.6: Design-system layout, navigation and migration

**What slowed it**

- The first session stalled after the shells and the navigation components, with about 95 files of
  uncommitted migration on disk. A second session picked the worktree up from `git status`, ran the
  whole regression (lint, format, unit, build, 164 behaviour specs) before touching anything, found
  it green, and committed it as one step. Long uncommitted stretches are the risk: commit each green
  migration, not the whole slice.
- Encapsulated styles do not reach projected columns, so the design system's
  `.split > * { min-width: 0 }` could not be copied; `cf-split` writes `minmax(0, …)` tracks
  instead (ADR 0019).
- Moving the alert's sentence into a projected wrapper changed one locator in four page objects
  (`.form-alert__title + p` to `.form-alert__text`), and an alert link named "email" made
  `getByLabel('Email')` ambiguous until it was `exact`. Every assertion stayed as it was.
- Forgetting 30.1's "always pass `encoding='utf-8', newline='
'`" let Python's text mode write
  CRLF into the docs; `.gitattributes` (`eol=lf`) normalised them on commit.
- The film's first frames failed with "Cannot read properties of undefined (reading 'start')": the
  film asked for a second line in scenes that have one. `--frame` on every scene catches it in
  seconds, before the long build.

**New lessons**

- A migration slice proves itself with the existing behaviour specs: break one library component
  (an alert that drops its projected text) and watch the specs of every screen that uses it fail
  for that reason, then restore it.
- Look for markup repeated across screens even when it is not a component of its own: the busy
  button's spinning loader icon was drawn by seven screens; `cf-button busy` now draws it, with a
  component test seen red first.
- Keep a component's selector when it moves folders (`cf-auth-layout`, `cf-staff-layout`,
  `cf-admin-layout` into `layout/`): no screen changes, and the diff shows only the move.
- Compare the library's folders with `docs/design-system/components/*.html` by name; the only
  folder without a page should be a composite built from library components (`profile-hero`).

**How earlier lessons worked**

- "Read the initial total after each new Angular API" (30.1 to 1.5): the shells and screens that
  compose the new components are lazy, so both apps stayed at 261.59 kB and 258.98 kB.
- "Keep the mocks' BEM classes" (1.1 to 1.5): the library components kept the design-system block
  names, so all 164 behaviour specs passed with four locator changes.
- "A free port per worktree" (CF_WEB_PORT 4361, CF_ADMIN_PORT 4362) kept the e2e runs and the film
  clear of the paused worktrees.

## Slice 29.1: Admin and Moderator roles

**What slowed it**

- No admin endpoint but the staff session existed on `main`, and slice 10.1's events endpoint was
  being built beside this one, so AC1 could not be proved on a real Events, Services, Members or
  Dashboard endpoint. Probe controllers in the test assembly, added to one fixture's host with
  `AddApplicationPart`, go through the same convention, policies, handler and refusal writer.
- The design named a claims transformation and `[Authorize]` per controller; the first runs on
  every authentication of both schemes and the second can be forgotten. A requirement per staff
  area, read from where the controller is routed, replaced both (ADR 0020).
- The first edit script for the frontend was a quoted heredoc holding "doesn't"; Git Bash failed
  the parse and nothing was applied. Scripts written by the editor tool and run from a file took
  every edit after that, as slices 2.1 to 9.3 had found.
- A breaking script run from the scratchpad failed to build: the analysers' code-style rules
  read the `.editorconfig` of the working directory's tree. Running it with `cwd` set to
  `backend/` fixed it.
- The slice paused while slices 1.4 to 1.6 merged ADRs 0017 to 0019 and moved every screen onto
  the components library. The rebase renumbered this slice's ADR to 0020 (only in the files this
  slice added, since `main` cites ADR 0017 for its own decision) and kept main's busy button in
  the forbidden page; the role-filtered items already flowed through the library's
  `cf-admin-layout` and `cf-sidebar-navigation`, so nothing was duplicated and no spec changed.
  The film's close-ups reach the sidebar through `AdminShell.sidebar`, not a selector of its own.

**New lessons**

- An `AuthorizationHandler` that fails with `AuthorizationFailureReason(this, code)` and an
  `IAuthorizationMiddlewareResultHandler` that passes the code to `ProblemCodes.Override` before
  the default handler forbids give a policy's 403 its own ProblemDetails `code` without writing
  the body anywhere else.
- Fail closed for areas nobody has named yet: a route segment the convention does not know is
  `Unlisted`, Admins only, so a slice that forgets to name its area cannot open it to Moderators.
- A guard's `RedirectCommand` takes `browserUrl` in its navigation options, so a refused area can
  show its screen while the address bar keeps the URL asked for, with no navigation state to read.
- Route data, not navigation state, is the simplest carrier for a screen's variant when a reload of
  the kept address must show it again: `/admins-only` is the forbidden page with
  `{ reason: 'role' }` and its own title.
- Importing a `domain` helper into a guard bound in the routes moves it into `main`: `canManage`
  and `currentAdminArea` cost 0.7 kB of the 0.95 kB this slice added.

**How earlier lessons worked**

- "Read the initial total after each new Angular API, and diff `--stats-json`" (30.1 to 9.3): the
  base was saved before the first change; the admin total went from 258.98 kB to 259.93 kB, under
  the 260 kB warning, and the diff named `admin-areas.ts` (0.70 kB), the route (0.21 kB), the
  interceptor (0.20 kB) and the guard (0.11 kB). `RedirectCommand` was already in the router.
- "Prove a rule red by breaking it alone" (1.1 to 9.3), with a script that swaps one line, runs the
  tests and restores it: the role read from the claim, a Moderator managing events, the missing
  code override, `Unlisted` mapped to the console and a missing role allowed each turned the right
  backend tests red; the interceptor's code check and screen list, the guard's role and
  `browserUrl`, and the Moderator's areas turned the right unit tests red.
- "A rule computed in both stacks shares one inline case table" (2.2, 20.1): `canManage` and
  `StaffAccess` hold the same eight rows with the same reasons.
- "A guard on a parent route changes every spec that opens a child" (3.1, 9.1): the guard now
  reads the role, so the whole Playwright suite ran again; the default Admin session kept every
  earlier spec green.
- "Use free ports" (3.2, 18.1): the specs ran on 4520/4521 beside the two other sessions.

## Slice 10.1: Create a draft event

**What slowed it**

- The first CDK Dialog cost the admin initial bundle 14 kB of `@angular/core` and 2 kB of rxjs
  although the dialog, its fields and the CDK all load on first use: the parts of core that create
  a component in a portal, and the async scheduler behind the overlay's scroll handling, sit in
  modules `main` already holds, and esbuild cannot split a module between chunks. A build with the
  dialog's import stubbed out showed the page alone cost 2.6 kB, so the rest was the CDK's. The
  budget rose to 280/290 kB with that reason in ADR 0021.
- Slices 1.4, 1.5 and 1.6 merged while this one was paused and built all 46 design-system
  components once, with AGENTS.md now forbidding screen-specific duplicates. The rebase took
  main's side of every shared component, deleted this slice's `event-table`, `select-field`,
  `textarea-field` and `toast-region`, and reworked both screens onto the library; the ADR became
  0020, then 0021 once slice 29.1 merged first with its own 0020. The library lacked only the
  Registered `count` cell, a skeleton row count and a number field's `min`, each added with a
  component test seen red first.
- Slice 29.1 merged just before this one, so its Events area policy (Admins only) already covered
  `api/admin/events` through the route convention; this slice swapped 29.1's events probe for the
  real endpoint and added a Moderator's refused `POST`, both seen red by mapping `events` to the
  Dashboard area for one run.
- Slices 18.1 and 9.3 merged while this one was open and took ADRs 0015 and 0016, so this slice's
  ADR became 0017 in the record and 42 comment lines; a script renumbered only the lines this
  branch added, since 18.1's files already said "ADR 0015" for their own record. The generated
  mock index and coverage table conflicted and were rebuilt from the merged generator, and the
  `AddEvents` migration was regenerated after 18.1's `AddMemberProfile`.
- 9.3's 30-minute staff idle timeout signed out this slice's clock test, which moved the API's clock
  an hour to turn an ahead start into a past one. It now starts 10 minutes ahead and moves 20.
- A quoted Git Bash heredoc with "Couldn't" in its Angular template failed to parse again and wrote
  none of the files; they went through the editor tool.

**New lessons**

- CDK Overlay loads its own structural styles when the first overlay opens, so a lazy dialog needs
  no global `@use` of `overlay-prebuilt.css`. A shell that draws its own scrim and fixed panel
  (`cf-drawer`) opens with `hasBackdrop: false` and a pane of `100%` by `100%` (`maxWidth: '100%'`
  too, since CDK Dialog caps it at 80vw): with a content-sized pane the `role="dialog"` element
  has an empty box and Playwright calls it hidden.
- A toast region that reports `paused` from both the pointer and focus must combine them: the
  pointer leaving while focus is still on Dismiss resumed the timers until the region kept both
  flags. Only an e2e spec that hovered, focused and then moved the pointer away caught it; the
  composed screens also showed that the Save draft button sits where the toast appears, so the
  timing spec moves the pointer away first.
- CDK Dialog's `aria-modal` is `false` unless `ariaModal: true` is set, and its `autoFocus` takes a
  selector (`'#f-title'`), so focus can start on a form's first field instead of Close.
- Setting `disableClose` on the dialog's ref while a save is on its way keeps Escape and the scrim
  from losing the answer; only a spec that presses both during the gate proves it, since the happy
  path passes either way.
- Load a dialog by a dynamic `import()` of a file whose exported function calls
  `injector.get(Dialog).open(...)`, passing the page's injector: the CDK stays out of the page's
  chunk, and the dialog gets the screen-scoped tokens bound on the routed component.
- An element's box is still moving during a slide-in, so a size check polls it
  (`expect.poll(() => box()).toEqual(...)`) until it settles; a single `boundingBox()` read the
  phone drawer at 31 px from the edge.
- A store with timers (`ToastStore`) unit-tests with `vi.useFakeTimers()` and
  `vi.getTimerCount()`: the count proves a dismissed or pushed-out toast cleared its timer and that
  `ngOnDestroy` left none.

**How earlier lessons worked**

- "Read the initial total after each new Angular API, and diff `--stats-json`" (30.1 to 9.3) found
  the CDK's share at once; after the rebase a clean worktree of `origin/main` gave the new base,
  258.98 kB, against this slice's 277.48 kB after the move to the library; on top of 29.1's
  259.93 kB it is 278.29 kB.
- "Prove a rule red by breaking it alone" (1.1 to 9.3): on the backend, the gap offset, the
  `fieldCodes` filter, the 100-event limit, the order, the draft filter, the `>` of `start_in_past`
  and the title trim each turned the right test red. On the frontend, `restoreFocus`, the toast's
  lifetime and the list reload after a save did; the `disableClose` break passed until the saving
  spec pressed Escape and the scrim.
- "A gate in a fixture handler" (2.1 to 9.3) gave "Saving…" and the list's skeleton rows with no
  clock; Playwright's clock moved only the toast's 6 seconds.
- "Rebase onto origin/main before the PR" (20.2, 9.3) brought two merged slices into the branch
  before the docs and film were written, so they carry the final numbers.

## Slice 26.1: Find members

**What slowed it**

- It ran far out of order (row 53 of 57), in a fresh cloud container with no .NET SDK and the usual
  download hosts refused; the SDK came out of Microsoft's own container image
  (`mcr.microsoft.com/dotnet/sdk:10.0`), layer by layer. The pre-installed Chromium was a build
  older than the pinned Playwright asks for, so the first e2e run failed on every spec in 2 ms;
  a link from the build it wanted to the one installed fixed it without touching the config.
- The design left the sort order, "events attended", the search delay and the pagination
  `<TO SUPPLY>`, named a `MemberTable` the library now forbids, and the mock searched by home
  church, counted "joined this month" and drew no pages. All of it was settled in the mock, L2-028
  and ADR 0022 before code.
- Nothing registers, reports, flags or suspends yet. Events attended went behind
  `IRegistrationReader.CountsForAsync`, which answers none until 6.1; statuses were set through the
  store in tests; the report banner stays in the mock for 25.1 and 27.1.
- A table test read `tbody td` with the default row action on, so every second cell was the
  action's; the failure looked like the new cell not rendering.
- `URLSearchParams` writes a space as `+` and Angular's router as `%20`: the links and the address
  bar disagreed until `memberListHref` encoded with `encodeURIComponent`.
- An `<a>` with `aria-disabled` and no `href` is not a link to `getByRole`; the page object reaches
  the unavailable Previous and Next by their label.
- Graphviz could not be installed, so only the sequence diagram was rendered again; the class and
  component sources are updated and their images still show the earlier design.

**New lessons**

- When the URL is a list's state, keep the field's text apart from the URL's term: the field is the
  person's while they type (a trailing space stays), and the URL overwrites it only when it names
  a different search. A spec that types "grace " catches a field bound straight to the URL.
- A paged list answers two counts, the community's and the matches', and the page it answered;
  the screen shows the answered page, so a stale `?page=9` cannot strand anyone on an empty list.
- Keep pagination in place while its next page loads, keyed by the list it belongs to (tab and
  search), so focus is not lost with the link that was pressed and one list's pages never stand
  under another.
- Read a URL through one pure function that cannot produce a question the API refuses (unknown
  status to all, a long search cut, a bad page to 1): the API's refusals then need no screen.
- `aria-label` on a `<span>` names nothing; an empty cell is a dash with `aria-hidden` beside
  visually hidden words, and a page object that drops `aria-hidden` nodes reads the row as
  assistive technology does.
- A break that leaves every test green may be telling you the line is redundant: clearing the
  field in Clear search was already done by the URL, and the line went.
- A dev server kept running lets a break-check script run 25 Playwright breaks in a few minutes;
  give each run a short timeout, since a broken rule otherwise waits out every assertion.

**How earlier lessons worked**

- "A registration reader that answers none yet" (18.1) took a second method without a new
  abstraction, and its fake proved the pass-through and that the page asks once.
- "A test helper that forces state the product cannot set yet writes through EF Core's entry"
  (3.2) set Flagged and Suspended with no domain method nobody calls.
- "Read the initial total after each new Angular API, and diff `--stats-json`" (30.1 to 10.1): the
  base was saved first; the diff named `debounceTime` (0.44 kB), `afterNextRender` (0.44 kB) and
  the route. 278.29 kB became 278.96 kB, under the 280 kB warning, so no budget moved.
- "Prove a rule red by breaking it alone" with `breakcheck` (1.4): 18 backend breaks, 20 in the
  domain helpers and 25 on the page each turned the right tests red, but for the redundant line
  above; the telemetry test went red when the controller logged the search term.
- "A rule with a table of cases gets a direct test, one case per row": the handler's 25 search
  rows and 15 validator rows, and the helpers' tables in `domain`.
- "A gate in a fixture handler" (2.1) gave the loading states and the pages held in place, with no
  clock; the 300 ms wait is proved by counting the questions asked, not by sleeping.
- "A class, not a record, for anything personal" (2.1): the query and the row DTO are classes, so
  no generated `ToString` can print a search term, an email or a home church.
- "Keep the mocks' BEM classes" (1.6): the page object reads `table__person`, `table__strong`,
  `table__sub`, `status`, `tabs__tab` and `pagination__link` as the mock writes them.

## Slice 29.2: Audit staff changes

**What slowed it**

- The design put who and which record on the command and read the actor from the session. Neither
  holds for the commands on `main`: the second sign-in step is anonymous until its code is checked,
  sign-out ends the session the actor would be read from, and a created record's id exists only
  in its handler. A scoped `AuditTrail` the handler fills, opened and enforced by the behaviour,
  replaced both (ADR 0021).
- Slice 10.1's create-event command merged first, so the branch was rebased onto it and the audit
  extended to `event.created`; its handler lost its own save, since the behaviour's single save
  must commit the draft and its entry together.
- Rebasing met two ADR 0021s (events and audit): the audit's is renumbered 0023, and every
  reference was checked line by line, since the two numbers sat in the same files.
- The 26.1 handler test built its own host without a `TimeProvider`, and 40 cases failed to
  resolve `AuditTrail`; the host now registers one.
- Every request builds every open behaviour, so the audit behaviour's `ILogger` and `AuditTrail`
  broke 30 handler tests whose hosts had no logging: `AddApplication` now calls `AddLogging()`.
  Running the whole backend suite after the first green caught it, as in 9.3.
- An OpenTelemetry `LogRecord` from the in-memory exporter has no `FormattedMessage` unless asked;
  the test waited on it, timed out and named only templates. Match on `Body` (the template) and the
  attribute's value.
- A breaking change that made the awaited log never arrive left the run waiting behind a later
  restore in the same command; the background job was stopped and the file restored by hand. A
  break should keep what the test awaits and add the fault beside it.
- Six behaviour specs failed in the first full run with the dev server's HMR websocket dropping
  under the load of three sessions; the same six passed alone with one worker. Nothing of the
  frontend had changed.

**New lessons**

- Put the audit entry on the request's `DbContext` before the handler's own save, and the change and
  its entry commit together with no transaction; the behaviour's save afterwards catches only an
  entry whose change went elsewhere (the ticket store's own scope).
- A marker with an explicit interface member (`string IAuditableCommand.AuditAction => …`) keeps a
  command's metadata out of model binding and out of its JSON.
- Fail closed on a forgotten call: an auditable command whose handler records nothing fails, so the
  next slice's first acceptance test says so.
- A behaviour's own rules are a table of cases best proved with requests local to the test
  assembly; the requirement itself is proved through the API on real commands.

**How earlier lessons worked**

- "Prove a rule red by breaking it alone" (1.1 to 29.1): recording before the code was checked, the
  behaviour's missing save, the missing record check and a member id in the log each turned the
  right tests red; the missing save also failed the sign-in acceptance test, since sessions are
  saved by the ticket store.
- "A breaking script run from the scratchpad fails the analysers" (29.1): the breaks ran in
  `backend/`; one still tripped CA1873 (an argument built for a log), and a plain variable fixed it.
- "Regenerate your migration after theirs" (prompt): `AddEvents` landed first, so `AddAuditEntries` was
  deleted and regenerated on main's snapshot (`dotnet ef` with Infrastructure as the startup
  project, since the CLI one has no Design package).
- "Use free ports" (3.2 to 29.1): specs and shots ran on 4530/4531 beside two other sessions.

## Slice 18.2: Edit my profile

**What slowed it**

- A second rebase, onto slices 10.1, 26.1 and 29.2: the ADR became 0024 (0021 to 0023 were taken),
  `AddHomeChurchVisibility` was deleted and regenerated after `AddAuditEntries`, the mock coverage
  matrix and `index.html` were merged by hand (the generator writes neither), and the 26.1 handler
  test's `Profiles.` prefix began to name the new test namespace, so it takes a `using` instead.
  The film's slide still says ADR 0021; it was rendered before the renumbering.

- The slice was paused mid-film while slices 1.4 to 1.6 put every design-system component in the
  library and AGENTS.md made reusing them mandatory. Its own `cf-dialog` (a native `<dialog>`),
  `cf-text-area`, `cf-check` and changes to `cf-text-field` and `cf-text-link` duplicated library
  components; the rebase took the library's side of every one, deleted the duplicates and
  rebuilt the dialog from library parts.
- The first draft had avoided a CDK Dialog because it grew `main` by 14.9 kB. Measured again on
  the new `main` with a `--stats-json` diff: 15.5 kB (view queries, `afterNextRender`, RxJS's
  async scheduler, and `linkedSignal` from the library textarea), 261.59 kB to 277.05 kB, past
  the 275 kB error budget. With the library's shell made for a CDK Dialog and slice 10.1 raising
  the admin budget for the same cost, the member budget rose to 280/290 kB (ADR 0021).
- CDK Dialog's defaults fought the library shell: `ariaModal` is false unless set, and the
  container had no size (the shell's panel is `position: fixed`), so Playwright called the
  `role="dialog"` element hidden. Sizing the container to the viewport fixed both checks.
- With the CDK hiding the page behind from assistive technology, role locators on Profile stopped
  matching while the dialog was open; the specs check the page after Cancel instead.
- The design left the refusal code `<TO SUPPLY>`, the mock had no control for the home church
  visibility AC4 requires, and its only refusal was a cleared name. Requirement, ADR, design and
  mock (`invalid-limits`, `refused`) were aligned before code.
- `HasDefaultValue(false)` on a bool made EF treat it as store-generated; the migration was
  regenerated without it.

**New lessons**

- Before building a component, look in `frontend/projects/components/src/` first; a rebase that
  meets a library twin keeps the library's and deletes the slice's.
- Open a CDK Dialog around the library's `cf-dialog` with `hasBackdrop: false`, `ariaModal: true`,
  `ariaLabelledBy` the shell's title id, a viewport-sized container, `autoFocus` on the first
  field and `disableClose`, handling Escape from `keydownEvents` so a busy save can refuse it.
- Keep `@angular/cdk/dialog` in the dialog's own file with an `open…` function, imported by the
  screen with `import()`: neither the CDK nor the dialog lands in the screen's chunk.
- Wrap the shell in one `<form>` so Enter in a field and the footer's submit button share a submit.
- Serve an owner-only write at a URL that names the owner, and refuse every other id, unknown and
  malformed ones included, with the same 403 before reading anything.

**How earlier lessons worked**

- "Read the initial total after each new Angular API, and diff `--stats-json`" (30.1 to 1.6): a
  base build in a throwaway worktree of `origin/main` named the cost by module in one diff.
- "One rule table in both stacks" (ADR 0008, 2.2): `UpdateProfileValidator` and `validateProfile`
  carry the same 21 rows; breaking the trim, the limits, the goal precedence and the blank-line
  rule each turned a row red in both suites.
- "Prove a rule red by breaking it alone" (1.1 to 1.6): dropping `ariaModal` and the busy guard in
  `dismiss` each turned its own spec red after the rework.
- "A gate in a fixture handler" (2.1) gave the busy state with no clock.
- "Keep the mocks' BEM classes" (1.1 to 1.6): the library kept `dialog`, `field-grid`, `check`,
  `interest` and `form-alert`, so the page object changed two locators.
## Slice 27.1: Flag and suspend

**What slowed it**

- No mock drew a flag, suspend or note control, and the design left the dialog, the code of an
  illegal transition, self-flagging and whether a Moderator may suspend an Admin `<TO SUPPLY>`. A
  new dialog mock (`moderate-member`, seven states), the row's note and action, two toasts,
  L2-029 AC5 to AC9 and ADR 0025 settled them before code.
- Suspension meant nothing for staff: staff sign-in never looked at the status, and a password
  step taken before the suspension could still be finished with its code. Both were found by
  writing the acceptance test for "an Admin suspends signed-in staff" first.
- Drawing the pagination behind the new dialog broke eight mock links: its `href="default.html"`
  only resolved from its own folder. Mock fragments reused across folders take `href(...)`.
- The library's checkbox had no id, so an error summary could not move focus to the
  confirmation, and its error belongs to a group: the confirmation became a one-box
  `cf-checkbox-group` with a legend, and the mock followed.
- Extending the contract first left the admin app not compiling, so the first e2e run waited
  three minutes for a dev server that never came up; build the app before starting Playwright
  after a contract change.
- A spec read the table's notes before the rows had rendered and saw none; every read through
  `evaluateAll` waits on a count first.
- Graphviz is still missing here: the two sequence diagrams were rendered again, the class and
  component images were not, and the design says so.

- It was built on a branch stacked on slice 26.1 while slices 26.1, 29.2 and 18.2 merged. The
  rebase took main's audit (ADR 0023): both commands became auditable, with tests seen red
  first; this slice's ADR went from 0023 to 0025, renumbered only on the lines the slice adds,
  since main cites 0023 for the audit in the same files; `AddMemberModerationNote` was deleted and
  generated again after `AddHomeChurchVisibility`; the film took number 51 and was recorded and
  built again with the counts after the rebase.

**New lessons**

- A status change that must lock someone out has three doors to close, in one save: the sessions
  that exist, the sign-in still waiting for its second step, and every sign-in endpoint. Test each
  door with a credential obtained before the change.
- One row action that opens a dialog which asks what to do scales better than a button per
  transition: the table keeps one action column, each status offers only what it allows, and the
  next slice's Reinstate needs no new column.
- An error summary that must take focus on every failed press is drawn inside an `@for` over a
  one-item list whose item changes each press, so the alert is a new instance each time.
- After a change that reloads a list, the control that opened the dialog is gone, so CDK's
  `restoreFocus` has nothing to return to: send focus to the list's region when the new rows
  arrive, and leave `restoreFocus` for the paths that change nothing.
- A refusal the screen itself prevents (a missing note) still gets its server code and test; the
  screen maps anything unexpected to the generic failure rather than trusting itself.
- Write the same transition table twice, as the domain's `TryFlag`/`TrySuspend` rows and as
  `moderationActionsOf` in the app, each with one case per row, so the screen never offers what
  the API refuses.

**How earlier lessons worked**

- "A class, not a record, for anything personal" (2.1): the commands and the request body carry
  the note and are classes; a temporary log of the note turned the telemetry test red.
- "Ending sessions in the same transaction needs no new store" (20.2): `ISessionRevocation`
  ended a suspended member's sessions in both apps unchanged.
- "A policy's refusal code" (29.1): `forbidden_role` was reused for a Moderator moderating staff,
  so the dialog needed no new kind of answer.
- "Load a dialog by a dynamic `import()` of a file whose function opens it with the page's
  injector" and "`disableClose` while a save is on its way" (10.1) carried over whole: the dialog
  is a 19.5 kB lazy chunk and the initial total stayed at 278.96 kB.
- "Prove a rule red by breaking it alone" with `breakcheck` (1.4, 26.1): 18 backend breaks, 15 in
  the moderation helpers and 29 in the dialog, page and service.
- "A gate in a fixture handler" (2.1) gave "Saving…" with Escape, Close and the scrim pressed
  during it.
- "Fail closed on a forgotten call" (29.2) worked as promised: with the marker on the commands and
  no call in the handlers, every moderation answered 500 until `ModerationTarget.Audit` recorded
  the entry.
- "A test helper that forces state through EF Core's entry" (3.2) is no longer needed for
  Flagged and Suspended: the API sets them now, and the older helpers still work.
