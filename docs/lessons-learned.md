# Lessons learned

One entry per slice of the first release, and one per journey of [journeys.md](journeys.md) since,
added before it merges. Read this file before starting a journey and apply what fits.

Each entry records what slowed the work, the new lessons it taught and how earlier lessons
worked when applied. Newest entries go at the bottom.
**% complete:** 69% (25 of 36 journeys; 77 of 113 days)

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

## Slice 10.2: Edit an event

**What slowed it**

- The mock had no image field and the design system no file input, and the mock's "Move to
  drafts" had no requirement: both were settled in ADR 0025 (a `file-field` component built once;
  the action dropped) before any code, which was the right order but cost the first day.
- "The number going" has no source until slice 6.1, so `IRegistrationReader.GoingAsync` answers 0
  and the acceptance test swaps in a reader that answers a number, as ADR 0022 did for counts.
- `UseAntiforgeryTokens` writes a token cookie on every `/api/` response, and the cookie made the
  image GET `no-store`; the public image path is now exempt. Two mutations were silently not
  compiled (analyzers refuse an unread parameter and unreachable code), so a "mutation green" was a
  stale build: the mutated source must build before its result means anything.
- After a save the list reloaded behind a skeleton, which destroyed the row's Edit button and lost
  the focus the dialog had just returned to; the reload after an edit now keeps the rows.

**New lessons**

- Judge an upload by its first bytes, never by its name or content type, and keep it under a key
  the server makes (GUID plus the extension the bytes gave) so no client text reaches a path.
- Edit and create share one body, one validator and one editor; a rule that needs the stored state
  (a start already in the past may stay) lives in the handler, which still answers the same
  `validation_failed` with `fieldCodes`.
- A field refusal is data (`fieldCodes`) the screen maps to its own words in a domain helper with a
  case table; the server's sentences are never shown.
- `happy-dom` lacks `FileList.item()`; index with `files?.[0]`.
- Make a library button focusable by an error summary's link by giving it an optional `buttonId`,
  not by wrapping a native button the component would have to restyle.

**How earlier lessons worked**

- "Prove a rule red by breaking it alone" (1.1 to 1.6): breaking the start-in-past, the capacity
  floor and the image signature each turned only their own tests red.
- "A gate in a fixture handler" (2.1) gave the saving state with no clock.
- "Keep the mocks' BEM classes" (1.1 to 1.6): the new `file-field` kept the mock's classes, so the
  page object's locators came straight from the mock.
- "Read the initial total after each new API" (30.1): no new core API; the admin initial total
  stayed at 279.20 kB and the editor stays in its lazy chunk.

## Slice 11.1: Publish an event

**What slowed it**

- The mock drew Publish only on a new event, so a saved draft could not be published, and its
  failure was a danger toast with a Try again action the toast store cannot carry. ADR 0026 added
  the mock states `edit-draft` and `publish-failed` and moved the failure into the drawer.
- Two backend classes (`PublishEventTests`, and slice 10.2's `EditEventRulesTests`) each had a test
  that advanced the class's shared `FakeTimeProvider` past the retreat's start, so every sibling
  that created the retreat failed or not by run order. A test that moves the clock gets a class of
  its own; the 10.2 one was fixed here.
- A spec that answered an event's GET with a 500 raced the global server-error screen (a 5xx to a
  GET opens it, L2-043); the mock's "couldn't reach the server" is a no-answer, so the spec aborts
  the request.

**New lessons**

- Publish is "save, then publish" with the saved id kept in the dialog: a retry updates the draft,
  never creates a second event, and closing after a failed publish returns the saved draft.
- The dialog closes with a result (`event` and `outcome`) and the page words the toast from a
  tested helper, so the dialog never knows about toasts.
- Handle Escape from `keydownEvents` with `disableClose` so a save in flight, or a saved draft,
  decides what the editor closes with.

**How earlier lessons worked**

- "A test that moves the clock gets its own class" is new here; "A class's tests share a store and a
  clock in any order" (AGENTS.md) predicted the failure.
- "Prove a rule red by breaking it alone" (1.1 to 1.6): the draft-only and start-in-past rules each
  turned only their own tests red.
- "A gate in a fixture handler" (2.1) gave the Publishing… state with no clock.
- "Read the initial total after each new API" (30.1): no new core API; the initial total stayed at
  279.20 kB.

## Slice 4.1: Browse upcoming events

**What slowed it**

- The design left the window bound, the cursor's error code and the empty-image case open, and the
  mock had a search box and an "Only events I'm going to" toggle that L2-009 never asks for. ADR
  0027 settled each (200 events, `cursor_invalid`, a bundled photo per category) and left the search
  box and toggle unbuilt until a requirement states them.
- `EventFieldCodes.All` is the filter for `fieldCodes`, so the new `cursor_invalid` had to join it
  before the 400 carried the code; the first run answered a bare `validation_failed`.
- The shell only knew "Profile is current". It now reads the address into a place (home, events,
  profile), and Events stays current on an event under it.
- A long heredoc of several files made the shell reject the whole command and run nothing; one
  Write per file was the reliable way.

**New lessons**

- A paged list asks for 21 to know whether more remain, orders by start then id, and its cursor
  is the last start and id, so events with the same start split across pages with none lost.
- Tests that count rows share a store, so each count (45 in pages, exactly 20, 21 tied) lives in
  its own class.
- The end of the list is one `IntersectionObserver` in a directive that is only in the DOM while a
  next page can be asked for, so it is released with the page and with the last page.
- A bounded feed that stops at a cap and says so loses no card the member scrolled past.

**How earlier lessons worked**

- "A test that moves the clock gets its own class" (11.1): the same rule, for counts, kept the paging
  classes order-independent.
- "A 5xx to a GET opens the server-error screen" (11.1): the spec's failures abort the request.
- "Read the initial total after each new API" (30.1): `IntersectionObserver` is not an Angular API;
  the page is a lazy route, and the initial totals stayed at 277.39 kB (web) and 279.20 kB (admin).
- "Keep the mocks' BEM classes": the page object read `.event-card__title` and the rest from the mock.

## Slice 27.1: Flag and suspend

**What slowed it**

- No mock drew a flag, suspend or note control, and the design left the dialog, the code of an
  illegal transition, self-flagging and whether a Moderator may suspend an Admin `<TO SUPPLY>`. A
  new dialog mock (`moderate-member`, seven states), the row's note and action, two toasts,
  L2-029 AC5 to AC9 and ADR 0028 settled them before code.
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
  first; this slice's ADR went from 0023 to 0025, and to 0028 when main took 0025 to 0027 for slices 10.2, 11.1 and 4.1; renumbered only on the lines the slice adds,
  since main cites 0023 for the audit in the same files; `AddMemberModerationNote` was deleted and
  generated again after `AddHomeChurchVisibility`, and again after main's `AddEventImage`; the film took number 51 and was recorded and
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

## Slice 27.2: Reinstate

**What slowed it**

- Little: slice 27.1 had left the dialog, the target checks, the row action and the fixture
  ready for a third action. The one open decision, whether reinstating clears the note, was
  settled in ADR 0029 before code, with the mock's new states.
- A stub written only to make the tests compile (`TryReinstate() => false`) failed the build:
  CA1822 wants a method that touches no instance data to be static, as slice 20.2 warned. The
  red was the build's, and the rule's own red came from breaking it afterwards.
- A fourth kind of alert in the dialog (what reinstating means, an info alert) matched the page
  object's `.form-alert` locator; it now names the error summary and the refusal apart from it.
- The refusal sentences said "flag or suspend"; with a third action they say "moderate", in the
  helper, its table, the specs and the mock together.
- It was rebased with slice 27.1 onto slices 29.2 and 18.2: reinstating became an audited command
  (`member.reinstated`), its ADR went from 0024 to 0026 and then to 0029 (main took 0025 to 0027), and the film took number 52 and was
  recorded and built again. Files that conflicted only because 27.1's ADR number had changed
  beside them were taken whole from the slice and renumbered again, except the mock generator,
  which main had also changed and which took the slice's edit by script instead.

**New lessons**

- A dialog with nothing to fill in starts focus on the dialog itself (`autoFocus: 'dialog'`), so
  its name and description are read before the one button that acts; focusing that button would
  make Enter act before anything was heard.
- When a choice changes, forget what the last press found missing: the problems belonged to the
  other choice, and a spec that switches back after a failed press proves it.
- An action that needs no body sends none (`null`), and the fixture records `null`; a spec that
  expects exactly that catches a client that starts sending `{}`.
- Clearing a reason is a decision to state on screen before it happens, not only in an ADR: the
  dialog and the option's description both say the note is cleared.

**How earlier lessons worked**

- "One row action that opens a dialog which asks what to do" (27.1) paid at once: Reinstate
  needed no new column, button or screen, only a third option and a status's list.
- "Write the same transition table twice, one case per row" (27.1): three rows were added to the
  domain's table and three to `moderationActionsOf`, and the dialog followed them.
- "A status change that must lock someone out closes three doors" (27.1), read backwards:
  reinstating opens only sign-in; a test holds a session cookie from before the suspension and
  shows it stays ended.
- "Prove a rule red by breaking it alone" (1.4 to 27.1): five backend breaks and nine in the
  helper, dialog and service. One stayed green: `focusOnShow` set to false on the info alert,
  because the CDK's own focus on the dialog runs after it and wins either way. It is kept as a
  stated precaution, not a proven rule.
- "Read the initial total after each new Angular API" (30.1): unchanged at 278.96 kB; the dialog's
  chunk grew from 19.5 kB to 20.5 kB.

## Slice 4.2: Filter events

**What slowed it**

- L2-009 AC2 originally described category filters as `aria-pressed="true"` buttons while the design
  system (`chip.html`) and mocks draw filter chips as links with `aria-current="page"`, missed the
  Retreat chip, and worded Clear filter as "Show all events". ADR 0030 settled the link address
  (`/events?category=<name>`), added Retreat to the mock and aligned Clear filter before the screen
  was wired.
- `ListEventsValidator` was `internal` from slice 4.1, which broke direct validator testing in
  `ChristianFitness.Application.Tests`, and an inline `new[]` in the theory tripped CA1861; making
  the validator `public` and moving the expected error array to a `static readonly` field fixed both.
- `cf-chip-bar` lacked the design system's `margin-top: var(--space-6)`, leaving the filter bar flush
  against the page heading until added to `chip-bar.scss`.
- Slices 27.1 and 27.2 merged onto `main` mid-slice and took ADRs 0028 and 0029, so this slice's ADR
  renumbered cleanly from 0028 to 0030 across the record, the design and the code comments during
  rebase.

**New lessons**

- Filter chips that update the query string stay real `<a>` links: `cf-chip` prevents default and
  emits `navigate` only on a plain primary click (`isPlainClick`), so Ctrl-click and middle-click
  still open a new tab while plain clicks and Enter navigate without reloading the document.
- Resetting `EventFeed` whenever `queryParamMap` changes ensures a cursor from one category is never
  sent to another, while browser Back and direct links restore the filter from the URL alone.

**How earlier lessons worked**

- "Read a URL through one pure function that cannot produce a question the API refuses" (26.1) and
  "A rule computed in both stacks shares one inline case table" (2.2): `eventCategoryOf` in `domain`
  and `ListEventsValidatorTests` share the same 11 rows, turning unknown or mistyped categories in
  the URL into All (`null`) while the API still refuses bad direct requests with `category_invalid`.
- "Prove a rule red by breaking it alone" with `breakcheck` (1.4, 26.1): 10 single-line breaks across
  the handler, validator, `EventFieldCodes.All`, `cf-chip`, `eventCategoryOf`, `eventCategoryChips`,
  `HttpEventsService`, `loadMore` and the no-results branch each turned its target test red.
- "Read the initial total after each new Angular API" (30.1): `ActivatedRoute` and `Router` were
  already in `main`; the member initial bundle stayed at 277.39 kB (0 bytes added to `main`).
- "No log, metric or span carries a query string" (1.2, 26.1): `EventsTelemetryTests` proved neither
  `?category=workshop` nor a refused `?category=secretcategoryprobe` reaches any span tag or log.

## Slice 5.1: Event detail

**What slowed it**

- The Git Bash tool failed to parse a command whose quoted heredoc held an apostrophe in prose
  ("member's"), so nothing in it ran; the files went through the editor tool, as 1.2 warned.
- A page object's `title` locator clashed with `ErrorScreen.title()` (the document title), a
  type error found only when the spec compiled; the locator became `eventTitle`.
- Facts render the term and detail as `dt` and `dd` with no space between, so the spec matches them
  with `\s*` rather than a literal space.
- L2-010 asks for a registration action and "You're going" before registration exists; the mock's
  schedule, avatars and "Waitlist open" have no data. ADR 0031 records what is left out.

**New lessons**

- An unknown event route passes its not-found spec at once, because the wildcard route already shows
  "Page not found"; the proof is breaking the 404 branch alone, which sends the screen to "didn't load".
- `eventImageSrc` and `priceOf` moved out of the card view so list and detail never word a picture or
  a price twice.

**How earlier lessons worked**

- "Prove a rule red by breaking it alone" (1.1 to 4.2): dropping the `Published` filter turned the
  draft test red, and a 404 check changed to a status that never comes turned the not-found spec red.
- "A screen's service goes on its routed component's providers" (4.1): `EVENTS_SERVICE` is provided on
  the detail page, so the client goes with the screen.

## Slice 6.1: Register for an event

**What slowed it**

- The slice list gives the full event and the last-place race to slice 6.2 and chat membership to
  slices 12.x, while L2-011 and L2-010 AC3 name them; ADR 0032 records what is left out (the chat link,
  "This event is full" on the page, the race) and the paid-event wording, which no requirement gives.
- Three test doubles of `IAppDbContext` (two race fixtures, one unreachable-database fixture) each
  needed the new `Registrations` set before anything compiled.
- `dotnet ef` refused the Api project as the startup project (no Design package); the Infrastructure
  project works as both.
- A quoted heredoc with an apostrophe failed to parse again (1.2, 5.1); the test file went through the
  editor tool. A TypeScript string with "You're" in single quotes cost a run of a spec that did not parse.

**New lessons**

- Replacing a placeholder reader (`NoRegistrationsYet`) with a real one changes its lifetime: the real
  reader needs the scoped `AppDbContext`, so the singleton registration became scoped; tests that
  swap the reader with `RemoveAll` were unaffected.
- A suspended member's session ends, so `account_suspended` is only reachable on register when the
  stored status changes behind a live session; the test sets the status through the store and
  keeps the cookie.

**How earlier lessons worked**

- "Prove a rule red by breaking it alone" (1.1 to 5.1): removing the suspended check, the capacity
  check, the idempotence check and the reserved status each turned exactly its own test red.
- "Read the initial total after each new Angular API" (30.1): no new API was used; `main` grew 0.16 kB.
- "A screen's service goes on its routed component's providers" (4.1): `register` joined the service
  already provided on the detail page.

## Slice 6.2: Full events

**What slowed it**

- The deterministic race test first failed with two registrations, then a retry answered OK: EF InMemory
  enforces a concurrency token but is not transactional, so it writes the new registration before it
  refuses the event's stale version, and the retry found the member's own leaked registration. A probe
  with two contexts proved the token itself works.
- A python edit script opened a file for writing before encoding its content (a check mark) and
  emptied it; restore from git and open files as UTF-8 on Windows.
- The apostrophe in a TypeScript test title ("You're") broke the parse again (1.2, 5.1, 6.1).

**New lessons**

- A last-place rule needs a row both savers must change: `Event.RegistrationVersion` is a concurrency
  token bumped by `TakePlace()` in the same save as the registration, so PostgreSQL refuses the second
  save whole (ADR 0033). A unique index on (event, member) cannot stop two different members.
- Prove it in two parts: the handler's answer to a lost race (the store stands in for the winner and
  raises `DbUpdateConcurrencyException`, as in the join race) and the token itself (two contexts read one
  event, the second save is refused). A real `Task.WhenAll` of two requests proves nothing on InMemory.
- After a refused save the handler detaches its registration and reloads the event before deciding again.
- The page learns "full" from the 409 `event_full` itself (`isEventFull`) and shows the event at capacity.

**How earlier lessons worked**

- "InMemory raises no `DbUpdateException`, so inject it" (6.1): applied unchanged to the version conflict.
- "Prove a rule red by breaking it alone" (1.1 to 6.1): removing the token mapping turned the version test red.
- "A screen's service goes on its routed component's providers" (4.1): nothing new; `register` was already there.

## Slice 7.1: Cancel a registration

**What slowed it**

- The detail design left three questions open (no dialog mock, a 24-hour cut-off in the mock copy, no refund
  rule) and the group chat does not exist yet; ADR 0034 settles them by the requirement's exact words:
  a dialog mock was added, only `now >= StartsAt` refuses, nothing is refunded and chat leaving waits for 12.x.
- The started-event test needs the clock to move, but the class shares one `FakeTimeProvider`: the event
  starts one hour out and the test advances one hour, while every other test uses events three days out.
- The first expected spots figure was worked from the wrong number (60, not 59); work it from the fixture.
- The Python edit script emptied nothing this time because the edits went through the Edit tool and Node
  `replace` with a presence check, as 6.2 advised.

**New lessons**

- A `cf-button` host cannot take `autoFocus` by id (the id sits on the host, not the inner button); the CDK
  Dialog's `autoFocus` selector names the inner `.btn--secondary` instead.
- The dialog makes the call through the screen's `EVENTS_SERVICE` and closes with the updated event, so the
  page needs no cancel state of its own; its code and the CDK Dialog load on first use (`main` grew 0.16 kB).
- `Event.ReleasePlace()` bumps the same `RegistrationVersion` as `TakePlace()`, so cancel and register
  racing for one place share the 6.2 token; on a conflict the handler resets its row and decides again.

**How earlier lessons worked**

- "Prove a rule red by breaking it alone" (1.1 to 6.2): disabling the `StartsAt` check turned only the
  `event_started` test red.
- "InMemory is not transactional" (6.2): no real race was run; the token's proof from 6.2 covers it.
- "A screen's service goes on its routed component's providers" (4.1): `cancelRegistration` joined the
  service already provided on the detail page.

## Slice 11.2: Cancel an event

**What slowed it**

- The design named a confirmation dialog, a refusal code and a group chat notice but no mock; the chat
  does not exist until 12.x. ADR 0035 added the mocks (`cancel-event`, `edit-published`, the
  `event-cancelled` toast, Profile `cancelled`), the code `event_not_published`, and left the notice to 12.x.
- "Registered members see it cancelled" had no screen to land on: Event detail answers 404 for an
  unpublished event, so the Profile "Going to" row keeps the event, marked Cancelled and not a link.
- `git checkout src` to undo one deliberate break reverted every tracked backend edit of the slice, not just
  the break; the edits were replayed from the script. Undo a mutation with the inverse edit, never a checkout.
- CI caught a race local runs hid: a dialog opened after a dynamic import was not yet on screen when the spec
  pressed Escape, so the Escape closed the editor beneath. Wait for the dialog to be visible before a key press.
- A quoted shell command with an apostrophe inside `node -e` failed to parse and silently skipped the files
  written after it; large files go through the editor tool.

**New lessons**

- A new enum value changes no EF model when the enum has no conversion: `has-pending-model-changes` was not
  needed, but check the column mapping before assuming.
- The cancel bumps `RegistrationVersion` (ADR 0033), and the handler saves itself in a retry loop because the
  audit entry is saved with the change; a loser reloads and refuses `event_not_published` if it lost.
- A `cf-going-item` that is conditionally a link or a plain row puts its content in one `ng-template`
  shown in both branches (the slot rule), so the badge and picture are declared once.
- Adding a field to an exact-keys contract test (`cancelled` on the Profile) is an intended change to that
  test; the second existing test that listed the editor's footer buttons changed for the same reason.

**How earlier lessons worked**

- "Prove a rule red by breaking it alone" (1.1 to 7.1): disabling the published check turned only the
  refusal and audit tests red.
- "Use the Edit tool, not Python scripts" (7.1): edits went through Edit or Node `replace` with a presence check.
- "Work expected values from the fixture" (7.1): the 38 registered members in the dialog text come from the
  bootcamp fixture; a unit test covers 0, 1 and many.
- "Read the initial total after each new API" (30.1): no new core API; the admin total stayed 279.20 kB and the
  dialog loads on first Cancel event.

## Slice 24.1: View event registrations

**What slowed it**

- The design named a page, a CSV export, a page size and a refusal code but no mock; ADR 0036 added the mock
  (`admin-event-registrations`), reached from a View registrations button in the published event's editor
  so the table needed no second row action, and left the CSV to its own slice.
- The staff list still answered `going: 0` (a stand-in from before slice 6.1), so the table and the new page
  could not agree; the list now reads `GoingForAsync`.
- The first use of `cf-progress-bar` grew admin `main` by 4.4 kB (279.20 to 283.76, over the 280 budget): its
  host `[style.--progress]` binding pulls the style-binding runtime. It now writes the property in
  `ngOnChanges` and `main` grew 0.2 kB. Found by building with and without the component.
- A member cookie on `/api/admin/*` answers 401, not 403, like nobody (ADR 0011); the first expectation was wrong.
- A fixture 500 sends the admin app to the server-error screen (interceptor); an error state is reached by an
  aborted request or a 400, as in the events spec.
- The first CI run was cancelled at the 5-minute limit: the behaviour specs already took 2m44 on main, so four new specs
  and a slow runner tipped it. A redundant breadcrumb spec was dropped (3m48 after); count a slice's new specs against the budget.
- A `sed` that restored a mutation left a stray token; undo with the Edit tool and a unique string.

**New lessons**

- Check a new library component's host bindings before first use: a host `style` binding costs the whole
  styling runtime in `main`, a direct `style.setProperty` does not.
- Names are rendered as text: the spec registers a member named `<b>Priya</b> Nair` and sees it literally.
- A member's answer is exactly `name` and `registeredAt`; the exact-keys assertion proves no contact or
  faith detail ever joins it.

**How earlier lessons worked**

- "Prove a rule red by breaking it alone" (1.1 to 11.2): reversing the order turned the list test red, and a
  percent of 0 turned the page spec red; each was undone with the inverse edit.
- "Read the initial total after each new Angular API" (30.1): this is what caught the progress bar.
- "Use the Edit tool, not scripts" (7.1, 11.2): a quoting mistake in a `node -e` command did it again; the Edit tool fixed it.
- "Wait for a lazy dialog before a key press" (11.2): the new spec presses no key; it waits for the button to be visible.

## Slice 8.1: Landing with upcoming events

**What slowed it**

- The landing mock draws a floating event card and "2,400+ members" that no data feeds; both are left out
  (ADR 0037) rather than invented. The empty mock's words differed from L2-001 AC3, so the mock and its
  generator took the requirement's words.
- `UpcomingEventDto` already named the profile's upcoming list in `@cf/api`; the landing one is `LandingEventDto`.
- Landing is now the first route, so the shared fixture's signed-in default sent every spec that opens `/`
  to Home: the boot spec still passed by title, but one sign-out spec ended on `/home` and needed the
  session to end when its delayed sign-out answered. The fixture answers the new public request with an empty list.
- A Git Bash heredoc with an apostrophe in a spec failed again and wrote nothing; the Write tool was used.

**New lessons**

- An anonymous endpoint answers its own DTO with exact keys (`id`, `title`, `category`, `startsAt`, `place`):
  no going, price, capacity or member detail. One test class per scenario gives each its own store.
- A guard on `/` that fails open (any session error shows the page) keeps the public page up when the
  session read fails; breaking it to `false` turned five specs red.
- Hero, band and verse have no design-system page, so they are page-scoped BEM blocks in the page stylesheet,
  with their numbers taken from the design system's `components.css`.

**How earlier lessons worked**

- "Read the initial total after each new API" (30.1): the lazy landing chunk is 13.6 kB; `main` is 277.7 kB, under 280.
- "Undo with the inverse edit" (10.1 on): both mutations were reverted with `sed` of the same unique text and the diff checked.
- "Count a slice's new specs against the CI budget" (24.1): six specs, no redundant ones added.

## Slice 19.1: View a member's profile

**What slowed it**

- The mock draws Message, Groups, goals and "Going to", but L2-005 AC3 allows only name, initials, bio and
  interests (and a shown home church), so ADR 0038 records what is left out and the screen is smaller than the mock.
- A `node -e` edit with an apostrophe and a `cat > file` with no input hung or failed again; the Write and Edit tools were used.
- `ProfileHero` always drew its meta line, an empty paragraph for a member with no join date; it is now conditional.

**New lessons**

- A hidden field is an absent key (`WhenWritingNull`), so the exact-keys assertion proves absence; a null would hide it.
- The 404 for a malformed id is the same answer as for an unknown one, so the API reveals nothing.
- Two specs cover the slice (public fields with church hidden then shown on one test, and a failed load).

**How earlier lessons worked**

- "Prove a rule red by breaking it alone": showing the church always turned the backend key test red, and a null church turned the spec red; both undone with the inverse edit.
- "Read the initial total after each new API": `main` 277.83 kB, under 280; no host style bindings added.
- "Count a slice's new specs against the CI budget" (24.1): only two specs added.

## Slice 12.1: Real-time group chat

**What slowed it**

- The first real-time slice needed three new pieces at once: a hub the handlers could stay behind (`IChatChannel`, so no
  `IHubContext` in Application), a real SignalR client in the backend tests, and a stand-in hub for Playwright. ADR 0039
  records them; messages are delivered live and not stored, since history is 12.2.
- Nothing in the mocks draws the chat alone: the messages mock is the whole inbox. The screen is the library's `thread`
  and `composer` under a page-scoped head, and the conversation list stays with slice 15.1.
- The new route alone grew the initial total from 277.83 to 279.14 kB, though `@microsoft/signalr` is its own lazy chunk
  (56 kB): the route entry is 0.17 kB, the rest is Angular core code the bundler now shares with the chat chunk. An A/B build
  with the route removed, and a diff of the `main` inputs in `browser-stats.json`, found it. It is under the 280 budget.
- A shell heredoc with an apostrophe failed again, and a heredoc with a stray `python3` hung for two minutes; every file
  with prose went through the Write tool afterwards.
- `/tmp` in Git Bash is not the `/tmp` Node sees; scratch files for a Node script go in the scratchpad path.

**New lessons**

- A hub refusal is an answer: `ChatAnswer { code, title, memberId }`. The caller's own id comes back in the join answer, so
  the page needs no second request to know which messages are "mine".
- Test a SignalR hub with `HubConnectionBuilder`, `Transports = LongPolling` and `HttpMessageHandlerFactory = _ =>
factory.Server.CreateHandler()`, passing the session cookie in `Headers["Cookie"]`. A `Channel<T>` read with a linked
  timeout gives "waits for X" failures with no sleep, and a member who should receive nothing is proved by another member
  of the same chat receiving first, then checking the first one's channel is empty.
- Pass the caller's id from `Context.UserIdentifier` into the request: `IHttpContextAccessor` is not dependable on long
  polling, and the hub still checks nothing.
- Playwright: `page.routeWebSocket` plus a POST handler for `/api/chat/negotiate` is enough to run the real `@microsoft/signalr`
  client; answer the handshake `{}` + `\u001e`, answer each invocation with a type 3 completion, push type 1 frames.
- A failed negotiate or start must reset the connection's start promise, or "Try again" would reuse the failure.

**How earlier lessons worked**

- "Read the initial total after each new API" (30.1): this caught the 1.3 kB; "watch host style bindings" (24.1): none added.
- "Prove a rule red by breaking it alone" (1.1 to 19.1): a constant group name turned only the other-chat test red; treating
  every message as someone else's turned the spec red; slicing the window from the front turned three unit cases red. Each was
  undone with the inverse edit.
- "Count a slice's new specs against the CI budget" (24.1): two specs (live flow from the event; not registered).
- "Use the Edit and Write tools" (7.1 on): followed after the two shell mishaps above.

## Slice 12.2: Chat history and failed sends

**What slowed it**

- The precondition came first: the Frontend job took 4 m 54 s and the web initial total was 279.14 kB against 280. The job's
  time was the Playwright step (3 m 24 s): the runner has four cores, so Playwright used two workers, and both apps were
  compiled a second time by `ng serve` after `npm run build` had built them. CI now serves the build (`e2e/static-server.mjs`,
  `CF_SERVE_BUILT=1`), runs four workers, and a person's local run still uses `ng serve`. Locally the whole suite went from
  1 m 45 s on a dev server to under 1 m 10 s of spec time on the built one, and the dev server was the cause of a run of
  `ERR_ABORTED` failures when it was rebuilding. The bundle: `main` is 258.8 kB of which 6.8 kB is ours; a shared
  `titled()` for the route titles saved 0.25 kB in each app, and nothing else in `main` was avoidable without raising a budget.
- EF Core InMemory generates no value for a non-key column, so a `ValueGeneratedOnAdd` sequence for message order was 0 for every
  message in the tests while PostgreSQL would number them. Order and paging use the instant, then the id; tests advance
  `FakeTimeProvider` between sends. The migration was removed and made again after the model changed.
- A first use of `firstValueFrom` in the lazy chat page moved 0.18 kB into `main` (the bundler shares it with the router). A
  local `once()` over `takeUntilDestroyed` costs nothing in `main`; it was found by reading the total after the change.
- Two of the new specs were wrong, not the code: the thread asks for earlier messages by itself when scrolled to the top, so a
  spec that scrolled up and then clicked loaded twice; and a page of 50 from a store of 260 leaves messages still to load, so
  the window ends at "Message 210", not "Message 200".
- A shell heredoc with an apostrophe failed again ("didn't" in a script); that script went through the Write tool.

**New lessons**

- A spec that proves the reader keeps their place checks that the message that was first is in the viewport and a message from
  the loaded page is not; without the scroll adjustment the first one is pushed out of view and the spec turns red.
- A stored history needs the fake hub to answer the history route too, or every chat spec fails on an unanswered request: the
  fixture installs it by default with an empty list.
- A send that fails is a thread entry of its own (`unsent-N`), not a flag on a window message, so the 200-message window never
  holds a message the server has not confirmed.
- Reading the initial total after each change caught the rxjs helper at once; the stats diff would have named it.

**How earlier lessons worked**

- "Read the initial total after each new API" (30.1 to 24.1): named `firstValueFrom` immediately.
- "Prove a rule red by breaking it alone" (1.1 to 12.1): turning the scroll adjustment off turned the place-keeping spec red;
  undone with the inverse edit. Removing the participant check in the history handler would not build (unreachable code under
  warnings as errors), so the 403 test was proved by being written before the endpoint existed.
- "Wait for what is lazily opened" (earlier slices): the specs wait on the title and the message count, never on time.
- "Use the Edit and Write tools" (7.1 on): followed except for the one script above.
- "Count a slice's new specs against the CI budget" (24.1): six specs added (four history, two failed sends); the run is now
  faster than before the slice.

## Slice 12.3: Group membership

**What slowed it**

- The deferred work was larger than the row: 7.1 and 11.2 had left leaving the chat and a cancelled-event notice to this
  slice. A SignalR group needs a connection id to remove, and a cancel arrives over HTTP, so `HubChatChannel` keeps a map from
  member and event to connection ids (dropped in `OnDisconnectedAsync`). ADR 0041 records it with the notice design.
- No mock drew a cancelled chat: `messages/cancelled` was added first (the design system's info alert in place of the composer).
- Shell mishaps: a pipe in a Prettier call hit "Resource temporarily unavailable" forks once; rerun without it passed.

**New lessons**

- The registration already was the membership, so no table: leaving is "remove this member's connections from the group", and
  the history and join checks needed no change except one shared `ChatMembership.SeatAsync` that also reports `cancelled`.
- Prove a member left with a second member as the witness: the other member receives first, then the leaver's inbox is empty.
- A new hub push (`EventCancelled`) needs the fake hub's `cancelEvent`, and a new history field needs the fixture's default, or
  every chat spec would read `undefined`.
- Lazy chat code costs `main` nothing: both initial totals stayed under 280 kB (web 279.25 kB); `cf-alert` was already in the library.

**How earlier lessons worked**

- "Prove a rule red by breaking it alone" (1.1 to 12.2): the two new API tests failed before the code for the right reasons
  (Grace received after leaving; no `EventCancelled` arrived); the two specs failed on the missing notice.
- "Read the initial total after each new API" (30.1 to 12.2): no new Angular API was used in `main`.
- "Use the Edit and Write tools" (7.1 on): mostly followed; a few multi-file edits went through Node snippets that threw on a
  missing match, and none failed.

## Slice 15.1: Conversation list

**What slowed it**

- The design assumed a `Conversation` entity, but 12.1 to 12.3 made an event's chat out of the event and its registrations. ADR
  0042 keeps that: a conversation is described by `GET /api/conversations` (`kind`, `id`), so direct messages (14.1) add a
  branch, not a table. The read marker is the only new table (`ChatReadMarkers`, an instant per member and event).
- Four test doubles of `IAppDbContext` (the race and unreachable-database tests) each needed the new `DbSet` line; the build named
  them at once.
- `dotnet ef migrations add` needs the Infrastructure project as the startup project here (the Api and Cli projects do not
  reference the Design package).
- The first Playwright run failed to compile: `memberCountLabel` already existed in the domain library's admin members file, and
  `export *` makes a clash an error. Search the barrel before naming a helper.
- Prettier run over `../docs/mocks` rewrote ten mock files; they were restored from `HEAD` and the one-line additions redone.
  Run Prettier only on `projects` and `e2e`.
- Rows are plain `<a href>` links across the library, so a click on a row is a full page load. A "mark read when the member
  leaves" hook on the chat page never ran in a spec; marking as messages arrive (one request in flight, one more if needed)
  does not depend on how the member leaves.

**New lessons**

- Compare an unread count with an instant, and advance `FakeTimeProvider` between the open and the next message in a test: a
  message sent in the same tick as the marker is not unread by `>`.
- Bound a list that is built from several queries by choosing the window first (order the cheap per-member rows, take 50) and
  computing the counts and last messages for those 50 only.
- A fixture default for a new call (`POST .../chat/read`) goes in `FakeChatHub.install`, so every chat spec stays answered.
- Pin the browser's clock with `page.clock.setFixedTime` for any screen that shows "today", "Yesterday" or a weekday.
- Initial bundle: no change (web 279.01 kB, admin 279.25 kB, under 280); the page, the service and the helper are lazy.

**How earlier lessons worked**

- "Prove a rule red by breaking it alone" (1.1 to 12.3): removing the "not my own messages" condition turned only the own-message test
  red; undone with the inverse edit. The new API tests failed first on 404, the specs on the missing screen.
- "EF InMemory generates no value; order by sent time and advance the fake clock" (12.2): every send in the new tests advances it.
- "Read the initial total after each new API" (30.1 to 12.3): no new Angular API in `main`.
- "Use the Edit and Write tools" (7.1 on): followed; two small Node replace snippets asserted every match.
- "Count a slice's new specs against the CI budget" (24.1): six specs (list, open chat, read as it arrives, empty, failed and
  retry, header destination), each short.

## Slice 14.1: Direct messages

**What slowed it**

- A shell command that began `cat > /tmp/x` hung the harness for two minutes and applied none of the edits chained after it. Use the Edit and Write tools, one change per call; two throwaway Node replace scripts also failed on regex and quote escaping and were abandoned.
- The conversation is the pair, so the "conversation id" differs per viewer. Keying each pushed message by the other member's id (`Clients.User` to both sides) let the existing page filter by id with no group and no join bookkeeping.
- Four test doubles of `IAppDbContext` each needed the new `DbSet` line, as for 15.1.
- A direct row's last-message lookup is one query per partner (at most 50); a correlated subquery was not worth its risk here.
- Side by side at LG (L2-015 AC3) is still deferred: it needs the list and the thread in one routed shell, and group chats live outside it (ADR 0043).

**New lessons**

- Reuse a generic key column rather than a table: `ChatReadMarkers` holds the other member's id for a direct chat, so unread counts and the marker rule come free.
- Refuse unknown, suspended and own ids with one code so the answer reveals nothing; prove each with a loop over the three ids and break the Suspended condition alone to see only that test fail.
- A route `data` flag plus an optional `direct` argument on the two contracts served both chat kinds without a second page; the fixture needed only wider URL regexes and target names.
- Initial bundle: web 279.14 kB (was 279.01), admin 279.25 kB, both under 280; the page, the service and the route are lazy.

**How earlier lessons worked**

- "Prove a rule red by breaking it alone" (1.1 to 15.1): removing the Suspended check failed only the unavailable test; undone with the inverse edit.
- "Advance `FakeTimeProvider` between sends" (15.1): every `SayAsync` advances it, so ordering and unread are by instant.
- "Pin the browser clock for screens that show time" (15.1): the new spec pins it.
- "Count a slice's new specs against the CI budget" (24.1): three short specs.

## Slice 13.1: Next and suggested events

**What slowed it**

- The design left the suggestion order and the interest to category rule open; ADR 0044 fixes them (soonest first, one table in the domain with a direct test per row).
- The mock's `.next-event` block had no design-system page, so the library got a `next-event` component named after the block, and `event-row` a `loading` form for the mock's skeleton rows.
- A command that began with `cat > /dev/null` hung the harness for two minutes and none of its edits ran. Use the Edit and Write tools, one change per call, and never read stdin.
- One admin Members spec failed once in the full parallel run and passed alone and on the rerun; it is load-sensitive, not caused by this slice.

**New lessons**

- A landing page is a shared flow: the fixture now answers `GET /api/home` by default, or every sign-in and join spec would fail on an unanswered request.
- A Playwright link by name matches the picture link too: the card's media link is "{title} details", so the page object asks for `Details` with `exact: true`.
- Bound two sibling lists in the database (soonest first, take 1 and take 3) and count going for the at most four events in one question.
- Initial bundle: web 279.12 kB (was 279.14), admin 279.25 kB, both under 280; the page, the service and the helper are lazy.

**How earlier lessons worked**

- "Prove a rule red by breaking it alone" (1.1 to 14.1): dropping the "not already going" condition failed only the suggestion test; adding a day to "in N days" failed three domain cases. Each was undone with the inverse edit.
- "Read the initial total after each new API" (30.1 to 14.1): no new Angular API in `main`.
- "A fixture default for a new call" (15.1): the `GET /api/home` default.
- "Use the Edit and Write tools" (7.1 on): followed except for the one hung command above.
- "Count a slice's new specs against the CI budget" (24.1): four short specs.

## Slice 13.2: Unread messages on home

**What slowed it**

- `MemberShell`, `HomePage` and `MessagesPage` all read `GET /api/conversations`: if both the shell and `/messages` called `CONVERSATIONS.list()` independently on arrival, the `messages.spec.ts` failure-and-retry test saw two requests instead of one. Providing `MemberInbox` on `MemberShell` let the header badge, the mobile tab bar, Home's Messages aside and Messages share one request per navigation (ADR 0045).
- In `TabBar`, `<span class="visually-hidden">, 4 unread</span>` is `position: absolute`, which WAI-ARIA accessible-name computation treats as out-of-flow and separates with a space (`"Messages , 4 unread"`); `tab-bar.spec.ts` had masked that with `.replace(/ ,/g, ',')`. Rendering `<span aria-hidden="true">{{ item.label }}</span>` alongside `<span class="visually-hidden">{{ item.label }}, {{ unread() }} unread</span>` gives `"Messages, 4 unread"` in both the unit test and Chromium.
- Under `CF_SERVE_BUILT=1`, `boot.spec.ts` raced `redirectSignedInGuard` on `/` because the default fixture signs Grace in and redirects `/` to `/home`; answering `401` on `GET /api/session` in `boot.spec.ts` keeps `/` on the start route deterministically.

**New lessons**

- Any `position: absolute` child (such as `.visually-hidden`) is blockified in WAI-ARIA `accname` and gets spaces inserted around it; put the full accessible phrase inside `.visually-hidden` and mark the visual label `aria-hidden="true"` when punctuation joins them.
- When a layout shell and its child pages need the same bounded list (`GET /api/conversations`), scope one small state service to the shell's `providers` and refresh it on route changes after entry so initial open fires one request.
- Initial bundle: web 279.49 kB, admin 279.25 kB, both under 280 kB; `MemberInbox` and the Home aside stay in lazy chunks.

**How earlier lessons worked**

- "A fixture default for a new call" (15.1, 13.1): adding `GET /api/conversations` (`[]`) and `unreadCount: 0` to `api-handlers.ts` kept every signed-in spec green.
- "Pin the browser clock for screens that show time" (15.1): `home-messages.spec.ts` pins `MESSAGES_NOW` in UTC.
- "Prove a rule red by breaking it alone" (1.1 to 13.1): `breakcheck` verified own-message exclusion, direct unread addition, the three-row cap and partial-state retry each fail when broken and pass when restored.
- "Count a slice's new specs against the CI budget" (24.1): four focused specs.

## Slice 30.2: Offline

**What slowed it**

- Navigating to an unvisited route while offline fails on the lazy JS chunk (`import(...)`) before any `HttpClient` request runs, and `/offline` itself cannot download its own lazy chunk once the network is gone. Warming `import('../pages/offline/offline-page')` when `MemberShell` or `AdminShell` mounts online caches the chunk ahead of time, and `withNavigationErrorHandler(offlineNavigationErrorHandler)` redirects offline chunk failures with `RedirectCommand` so Angular does not log an unhandled navigation error (ADR 0046).
- Angular Router's `browserUrl` option writes `{ ɵrouterUrl: '/offline?from=...' }` into `window.history.state`, which Chromium preserves across a same-URL `<a href="/events">` reload, causing "Try again" to boot back into `/offline` even after reconnecting. Using `skipLocationChange: true` and `window.history.replaceState(null, '', retry)` in `OfflinePage` keeps the destination URL in the address bar with `null` history state so "Try again" loads the route cleanly.
- `withNavigationErrorHandler` and `offlineInterceptor` nudged the admin initial bundle 272 bytes past 280 kB (`280.27 kB`); deduplicating `failedRouteOf` and `isApiUrl` across the error interceptors and sharing the `forbidden` loader in `admin/app.routes.ts` brought both initial bundles back under budget (web 279.81 kB, admin 279.90 kB).
- Running `docs/mocks/tools/build_mocks.py` wiped hand-added mocks from earlier slices because it calls `shutil.rmtree` on `pages/`, `dialogs/` and `notifications/`; those directories were restored from `HEAD` and only the four offline mocks and index files were updated.

**New lessons**

- Never pass `browserUrl` to a screen whose recovery link is a plain `<a href>` to that same URL: Chromium keeps `history.state` on same-URL reloads and Angular Router boots into `history.state.ɵrouterUrl`. Use `skipLocationChange: true` plus `history.replaceState(null, '', url)`.
- An offline fallback route must warm its lazy chunk while online (`if (network.online()) void import(...)`), or the browser cannot fetch the error screen when connectivity drops.
- In Playwright's shared fixture, `route.fulfill` bypasses `context.setOffline(true)` unless the route handler aborts backend requests with `'internetdisconnected'` while offline.

**How earlier lessons worked**

- "Read the initial total after each new API" (30.1, 12.2): caught the 272-byte admin budget warning immediately and guided sharing the interceptor helpers so both apps stayed under 280 kB without raising a budget.
- "Prove a rule red by breaking it alone" (1.1 to 13.1): `breakcheck` verified `returnPathOf('/offline')`, `navigator.onLine === false` in `offlineInterceptor`, and `DestroyRef` listener cleanup in `NetworkStatus`.
- "Count a slice's new specs against the CI budget" (24.1): five member specs and two admin specs.

## Slice 22.1: Apply to be listed

**What slowed it**

- The Services page did not exist and the member navigation has no Services entry, so the slice added a minimal lazy `/services` page (heading, subtitle, button) and the specs open it by address; slice 16.1 owns the list and the nav entry (ADR 0000).
- A new `IAppDbContext` DbSet broke four hand-written test doubles (join and reset races, last place race, unreachable database); each needed one more property.
- `dotnet ef migrations add` runs with the Infrastructure project as the startup project here; the Api project has no design-time package.
- The initial web bundle measures 280.21 kB on this machine before any change, over the 280 kB warning the lessons record as under (279.81); the slice's route cost 90 bytes after sharing the event-chat loader between its two routes, so it was left alone and no budget raised.
- Shell here-documents holding C# and Python with apostrophes and `$` failed to parse; the Write tool is safer for source files.

**New lessons**

- A new member route costs bytes in `main` (the route object and a chunk name): share an existing loader between routes that load the same page before touching a budget.
- Compare the initial total against a build of the unchanged tree on the same machine, not against the figure in an earlier entry.
- Two or more `[slot=foot]` nodes under one `@else` raise NG8011: give each slot node its own `@if`.
- Initial bundle: web 280.30 kB (280.21 before on the same machine, +90 bytes), admin 279.93 kB; the page, dialog, service and rules are lazy chunks.

**How earlier lessons worked**

- "Read the initial total after each new API" (30.1 to 30.2): the +90 bytes was seen at once and the loader sharing trimmed it.
- "Prove a rule red by breaking it alone" (1.1 to 30.2): replacing the Pending filter with `true` failed exactly the declined and approved re-apply cases and passed again when restored.
- "Count a slice's new specs against the CI budget" (24.1): eight member specs in one file.
- "A fixture default for a new call" (15.1, 13.1): the page makes no call on load, so no default was needed.

## Slice 21.1: Application queue

**What slowed it**

- The Services area already had its policy (Admins only) and the admin app a stand-in page, so the backend slice was one query, one controller and the acceptance tests; the Moderator refusal came free from the area convention and is proved by a test.
- A test that inserts rows straight into the store must give them real applicants: the queue joins members for the name, so rows with a random member id vanish. Join one member through the API and reuse its id.
- A skeleton card that carries the real card's class (`application`) is counted by the page object's locator while loading; the skeleton carries a `--loading` modifier and the locator excludes it.
- A `500` answered by a fixture opens the server-error screen, not the page's own error state; the error spec answers with `abort`, as the registrations and members specs do.
- A new lazy page with its own `HttpClient` service added 410 bytes to the admin `main` (279.93 to 280.34 kB, 339 bytes over the 280 kB warning, under the 290 kB error). Bisecting by stubbing showed the route costs about 40 bytes (sharing a loader), a stub page 120, and the service importing `HttpClient` about 380; the page template, `Avatar`, the rxjs pipeline, `track` form and `catchError` cost nothing. No budget was raised (ADR 0049).
- A heavy parallel run of the whole suite failed five unrelated offline, sign-out and two-step specs on this machine; they pass in a smaller run.
- A command that began with a heredoc holding an apostrophe failed to parse; the Write tool is safer.

**New lessons**

- Bisect a bundle regression by stubbing, not by reading: replace the page with an empty component, then restore one import at a time; one build is about a minute.
- Keep a list endpoint honest when capped: serve `total` beside the at most 50 rows, so a heading count never silently equals the cap.
- A relative time ("2 days ago") is a pure helper with one table of cases and a pinned browser clock in the spec.
- Initial bundle: web 280.30 kB (unchanged), admin 280.34 kB (279.93 before on the same machine, +410 bytes); the page, service, contract and helper are lazy.

**How earlier lessons worked**

- "Compare the initial total against a build of the unchanged tree on the same machine" (22.1): the +410 bytes was measured with a stash build, not read from the previous entry.
- "Prove a rule red by breaking it alone" (1.1 to 22.1): replacing the Pending filter with `true` failed exactly the decided-application test and passed again when restored.
- "A fixture default for a new call" (15.1, 13.1): `GET /api/admin/services/applications` answers an empty queue, so the shell specs that open `/services` stay green.
- "Count a slice's new specs against the CI budget" (24.1): six short specs in one file.
- "Use the Edit and Write tools" (7.1 on): followed except for two heredoc commands that failed to parse.

## Slice 21.2: Approve or decline

**What slowed it**

- The mocks drew Decline as a button straight to the `decided` state, with no reason field, though L2-025 AC3 needs a reason. A dialog mock (`decline-application`, five states) and a page `failed` state came first, written into the generator sources and rendered one screen at a time by importing the generator modules, never by its full build, so only the two Decline buttons and the mock bar of the sibling states changed.
- A new table made four test doubles of `IAppDbContext` stop compiling (`ServiceListings`), as slice 22.1's did; each is one line.
- `dotnet ef` needs a startup project that references `Microsoft.EntityFrameworkCore.Design`: the Infrastructure project is both project and startup (the CLI is not).
- A staff session in the API tests does not survive an hour on the fake clock; advance by a minute between signing in and the request that needs the clock.
- A JSON `null` is a property: a decline answering `listingId: null` has the same three keys as an approval, so the shape test lists all three rather than two.
- The shared alert's sentence sits in `.form-alert__text`, not a `<p>`; the page objects locate it by that class.
- Two heredocs holding apostrophes failed to parse again; edit scripts went through the Write tool.

**New lessons**

- An action that removes its own button needs a place for focus: the card's decision line takes it (`tabindex="-1"`, after the next render) and a spec asserts it.
- A dialog that can learn the thing it was opened for is already decided closes with a result the page acts on (`stale`), not with an error: the page reloads the queue and the dialog never needs to know how.
- A decision that two staff race for is refused with a code, not a message: 409 `application_decided` (and 404 for a missing one) maps to one sentence on both screens.
- A secret-ish free text (the reason) is a class command, trimmed once, kept in one column and absent from every response, audit entry and log; the 400 names the field's code only.
- Initial bundle: web 280.30 kB (unchanged), admin 280.35 kB (280.34 before, +10 bytes); the dialog, its helpers and the decision code are lazy.

**How earlier lessons worked**

- "Prove a rule red by breaking it alone" (1.1 to 21.1): letting any status pass the Pending check failed exactly the four decided-twice cases; sending the untrimmed reason failed exactly the trimmed-reason spec; both passed again when restored.
- "A gate in a fixture handler" (2.1): the approving and declining states are held by a gate, with no clock and no sleep.
- "Bisect a bundle regression by stubbing" (21.1) was not needed: the first build was already within 10 bytes.
- "Count a slice's new specs against the CI budget" (24.1): twelve short specs in one file.
- "A fixture default for a new call" (15.1, 13.1): the decisions are POSTs a spec answers; no default was needed.
- "Use the Edit and Write tools" (7.1 on): followed except for two heredoc commands that failed to parse.

## Slice 16.1: Browse professionals

**What slowed it**

- The design system has no `service-row` or `service-detail` page, only their CSS in `components.css`, and the mock's row borrowed `mini-row__*` classes of another block. Both became library components from `Avatar`, `Card`, `DescriptionList` and `Skeleton`, each with its own BEM elements, so the page object locates `service-row__name`, not `mini-row__name`.
- The mocks draw "Request a booking" and "Message" on the card, which are slices 17.1 and 17.2; an inert button is a control that does nothing, so the card omits them (ADR 0051).
- The mocks have no state for a category with nobody in it; it reuses the empty state, as Events does, and the ADR records the stand-in.
- The listing entity has no public constructor (`Publish` is internal), so the cap test builds listings through `ProfessionalApplication.TryApprove`, the public way a listing is made, instead of widening the domain.
- A Python edit script that wrote a file holding a non-ASCII tick failed on the Windows code page after it had already truncated the file; read and write with `encoding='utf-8'` and restore with `git checkout`.
- Three shell heredocs holding an apostrophe failed to parse again; every file went through the Write tool.

**New lessons**

- A shell component added to the member navigation changes every spec that counts the bars' links: grep for the old list (`'Home', 'Events', 'Messages'`) and the item counts before running the suite.
- One query serving both the row and the card needs no second request, so choosing a row is a navigation that changes only `?selected=`; only a new category asks again, and the page tracks that with one flag and the last category.
- A date shown by month and year needs a table of cases at a month boundary in the community's zone (04:30 UTC on April 1 is April in Toronto, 03:30 is still March).
- Initial bundle: web 280.30 kB (unchanged), admin 280.35 kB (unchanged); the page, its two components and the client are lazy.

**How earlier lessons worked**

- "Prove a rule red by breaking it alone" (1.1 to 21.2): replacing the category filter with `true` failed exactly the one category test and passed again when restored; the browse spec failed all eleven cases before the page existed, each for the missing rows.
- "Keep a list endpoint honest when capped" (21.1): `total` beside the 50 rows, proved with 52 listings.
- "A fixture default for a new call" (15.1, 13.1, 21.1): `GET /api/services` answers nobody listed, so the apply spec that opens `/services` stays green.
- "Count a slice's new specs against the CI budget" (24.1): eleven short specs in one file.
- "Use the Edit and Write tools" (7.1 on): followed except for three heredoc commands that failed to parse.

## Slice 16.2: Listing detail

**What slowed it**

- The web `main` grew 130 bytes with one more route (280.43 kB against 280.30). A barrel that re-exported both Services pages made it worse (280.77); letting the loader return a module's `default` export (`loadComponent: () => import('./pages/x')`) removes the `.then((m) => m.X)` of each route, so converting the new page and five existing ones brought it to 280.21 kB with no budget raised (ADR 0052).
- No mock draws the screen; it is the `selected` card under the Event detail back link, recorded in the ADR.
- Choosing between "card beside the list" and "its own screen" is a viewport rule, so the row's click handler asks `matchMedia('(min-width: 64rem)')` and the card beside the list is hidden below LG by CSS.
- A shell heredoc holding Python with backslash-regexes warned on the Windows shell; small edits through scripts that assert every match worked.

**New lessons**

- Prefer `default` exports on routed components: the route is shorter and `main` is smaller, which is cheaper than raising a budget.
- A barrel for two lazy pages can grow `main`; measure before sharing a loader.
- A listing's own address must work on reload, so it asks for itself rather than reading the list's state.
- Initial bundle: web 280.21 kB (280.30 before, -90 bytes), admin 280.35 kB (unchanged).

**How earlier lessons worked**

- "Compare the initial total against a build of the unchanged tree" (22.1) and "Bisect by stubbing" (21.1): the 130-byte route cost was seen at once.
- "A fixture default for a new call" (15.1 on): `GET /api/services/{id}` answers 404 by default; no spec visits it without answering.
- "Prove a rule red by breaking it alone": the new specs failed for the missing screen and the missing endpoint (a stub answering 404 for every id) before the code.
- "Count a slice's new specs against the CI budget" (24.1): four short specs.

## Slice 17.1: Message or contact

**What slowed it**

- The design assumed a `Conversation` entity and a nullable `ProfessionalMemberId`; the system has neither (a direct conversation is the pair of members, and every listing has its applicant's `MemberId`). "Linked" became "has no contact link", with a new nullable `ContactUrl`, and `startConversation` answers the professional's member id (ADR 0053).
- A component output named `message` is a DOM event name and fails `no-output-native`; the outputs are `startMessage` and `openContact`.
- A link that must not be in the page until chosen cannot be an anchor, so Contact is a button that asks, re-checks http or https and calls `window.open(..., 'noopener,noreferrer')`; a spec records `window.open` with an init script, so no request leaves localhost.
- Shell heredocs holding C# or TypeScript with quotes failed to parse; every file went through the Write tool.

**New lessons**

- Add a stub that compiles (a domain method returning false) before the acceptance test, so the first red is for behaviour and not for a missing symbol.
- One rule in both stacks (an http or https contact link) shares one table of rows; breaking the frontend check alone failed exactly the `ftp` row.
- Listing and list rows serve a flag, never the link; the test searches the raw bodies for the host.
- Initial bundle: web 280.21 kB (unchanged), admin 280.35 kB (unchanged); the client methods, the contact class and the card's buttons ride in the lazy pages.

**How earlier lessons worked**

- "Prove a rule red by breaking it alone" (1.1 to 16.2): ignoring the contact-link guard failed exactly the Message-refused test; restored, green.
- "A fixture default for a new call" (15.1 on): the POST and the contact-link GET are answered by the specs that press the buttons; no default was needed, and `hasContactLink: false` joined every fixture listing.
- "Count a slice's new specs against the CI budget" (24.1): six short specs in one file.
- "Prefer `default` exports" (16.2): no new route, so no growth.
- "Use the Edit and Write tools" (7.1 on): followed except for two heredoc commands that failed to parse.

## Slice 17.2: Request a booking

**What slowed it**

- The design and L2 had no booking request at all (only Message and Contact); L2-014 gained AC3 to AC5 and ADR 0054 records the choice to deliver the request as a direct message with no new table or migration.
- The services client returned raw `HttpErrorResponse`s, so the dialog could not branch on `recipient_unavailable`; the new client method maps errors with `apiErrorOf` like the applications client. The spec failed for exactly that before the fix.
- A Python script that reopened a UTF-8 doc with the default Windows encoding emptied `journeys.detailed.md`; `git checkout` restored it. Pass `encoding='utf-8'` or use the Edit tool.
- Shell heredocs holding quotes failed to parse again; files went through the Write tool.

**New lessons**

- Reuse a handler through MediatR (`ISender`) when a feature is a different front door to an existing action: the booking request reused the direct-message rules and refusals unchanged.
- A stub handler returning an empty answer compiles under warnings-as-errors only with no unread constructor parameters, so the first red was for behaviour (12 of 13 failed, the 401 passed).
- Initial bundle: web 280.21 kB (unchanged), admin 280.35 kB (unchanged); the dialog and its code load on first use.

**How earlier lessons worked**

- "Add a stub that compiles before the acceptance test" (17.1): followed.
- "Prove a rule red by breaking it alone": showing Request a booking for contact-link listings failed exactly the absence spec; restored.
- "A fixture default for a new call" (15.1 on): the POST is answered by the specs that open the dialog; no default needed.
- "Count a slice's new specs against the CI budget" (24.1): nine short specs in one file.

## Slice 23.1: Edit a listing

**What slowed it**

- The listing editor mock was an "Add listing" drawer (a Massage category, a verification checkbox, no contact link), so two hand-written states, `edit` and `edit-invalid`, were added and the manifest, index and README updated by hand (ADR 0055). The mock table's initials ("ML") differ from the library avatar's rule ("MR"); the spec reads names and roles, not initials.
- `forkJoin` in the page pushed 411 bytes of rxjs into `main` and took admin to 280.64 kB. Diffing `browser-stats.json` of the base and the change named it; `combineLatest`, already paid for by the Events page, restored 280.35 kB.
- One rule had to live in two places (the contact link check in `ServiceListing.TrySetContactUrl` and the new validator), so it became one static method both call.
- Shell heredocs holding quotes failed to parse again (a comment with an apostrophe emptied a whole command); files went through the Write tool and edits through scripts in the scratchpad.

**New lessons**

- A stub that compiles must not leave an unread constructor parameter (warnings are errors): the first stub handler dropped `IAppDbContext` and gained it back with the real code. The first red was for behaviour (13 of 20 failed; the refusals passed because the route already existed).
- A bundle regression in an unrelated chunk shows in `main` inputs: diff `--stats-json` of the base (stash with `-u`, build, pop) against the change.
- A theory that builds an account per row needs a unique email per row, not one per code (two rows shared a code and collided with 409).
- Initial bundle: web 280.21 kB (unchanged), admin 280.35 kB (unchanged); the dialog, its fields and the table rows ride in lazy chunks.

**How earlier lessons worked**

- "Add a stub that compiles before the acceptance test" (17.1, 17.2): followed.
- "A fixture default for a new call" (15.1 on): `GET /api/admin/services/listings` got an empty default, so every earlier spec that opens Services still passes (428 specs).
- "Prove a rule red": the e2e spec ran against the page without the section first and failed for the missing table before the section was restored.
- "Use the Edit and Write tools" (7.1 on): followed except for the failed heredocs above.
- "Count a slice's new specs against the CI budget" (24.1): ten short specs in one file; the full run took 1.6 minutes.

## Slice 23.2: Remove a listing

**What slowed it**

- The design drew a soft delete (`IsPublished`, `RemovedAt`) the code never had, and every member call already reads the listing table, so a hard delete (ADR 0056) made all of them answer 404 with no filter to forget and no migration. The sequence and class diagrams still draw the soft delete; PlantUML is not installed here, so they were not re-rendered and the design README says to read them with the ADR.
- No mock drew Remove, so a `remove-listing` dialog (default, busy, failed) was composed by hand from the edit mock and the cancel-event dialog, the Remove button was added to the Manage Services table mock rows, and the manifest, index and README were edited by hand.
- The library `table` allowed one row action; it gained an optional `secondActionLabel` and `secondAction`.
- A third separate `import()` in the Services page grew `main` by 90 bytes (admin 280.44 kB), whatever the module held (an empty module cost 160). Re-exporting `openRemoveListing` from the editor's lazy module, so the page imports both dialogs in one place, restored 280.35 kB. The cause inside esbuild's chunk graph was not found.
- Rows behind an open dialog are hidden from role queries (the page is `aria-hidden`), so a spec cannot count them until the dialog closes; Escape pressed before the dialog has focus is lost, so a spec waits for "Keep listing" to be focused first.
- Heredocs holding an apostrophe failed to parse again; files went through the Write tool and edit scripts through files in the scratchpad.

**New lessons**

- A stub handler that only returns, for an auditable command, fails with 500 (no audit entry recorded), which is a behavioural red: 3 of 4 failed and the Moderator refusal passed because the route and policy already existed.
- When the design and the code disagree on soft or hard delete, check what every reader of the table does before choosing; the simpler delete removed a whole class of "forgot the filter" bugs and made AC5 of the Services list (a removed listing is not shown) true by construction, proved by the new API test.
- Initial bundle: web 280.21 kB (unchanged), admin 280.35 kB (unchanged).

**How earlier lessons worked**

- "Add a stub that compiles before the acceptance test" (17.1 to 23.1): followed; the first red was for behaviour in both stacks (the e2e specs failed to find the Remove button, the API tests got 500 for 204).
- "A bundle regression shows in `main` inputs: diff `--stats-json` of the base" (23.1): used again; the diff showed only router and common noise, so bisecting by stubbing the import found the cause.
- "A fixture default for a new call" (15.1 on): no default needed; the DELETE is answered by `answerListings`, which the specs that press Remove use.
- "Count a slice's new specs against the CI budget" (24.1): six short specs in one file.

## Slice 8.2: Landing with professionals

**What slowed it**

- The landing mock drew no professionals list, so the four states were extended by hand (a Python edit of the four HTML files; `build_mocks.py` was not run) and the L2 acceptance criteria 5 to 7 and the design were added (ADR 0057).
- `@defer` took web to 289.86 kB (a 9.6 kB runtime), `on idle` still 288.11 kB, and `viewChild` plus `ViewContainerRef` in the page 280.89 kB. Only a small directive using `inject(ElementRef)`, `inject(ViewContainerRef)` and an `IntersectionObserver` held 280.21 kB, so AGENTS.md's "`@defer` below the fold" was met in spirit (code and data load only near the viewport) and the departure is in the ADR.
- The library avatar's initials for "Marcus Lee, RD" are "MR" (the last word), not the mock's "ML"; the fixture uses "Marcus Lee".
- A 5xx opens the server-error screen, so the failure spec uses 404, as the events spec does.
- Running `dotnet test` while the full Playwright run was going starved the browsers: four unrelated specs timed out and passed alone. Run the two apart.

**New lessons**

- The first use of `@defer` costs about 8 to 10 kB of `main` even in a lazy route; check the initial total before choosing it, and prefer queries-free `inject` of `ElementRef` and `ViewContainerRef` in a directive.
- A stub query that compiles must read its constructor parameter (warnings are errors): the first red was for behaviour (empty list against three names).
- Initial bundle: web 280.21 kB (unchanged), admin 280.35 kB (unchanged).

**How earlier lessons worked**

- "Add a stub that compiles before the acceptance test" (17.1 to 23.2): followed; the e2e red was run with the component hidden from the template, four specs failing for the missing rows and messages.
- "A bundle regression shows in `main` inputs" (23.1): the `_debug_node-chunk` size pointed at core runtime, not at the page.
- "A fixture default for a new call" (15.1 on): the shared fixture answers `/api/public/services/featured` with an empty list; the whole suite (434 specs) was run.
- "Count a slice's new specs against the CI budget" (24.1): four short specs in the landing file.

## Slice 25.1: Report a message

**What slowed it**

- No mock drew a Report action or dialog, and the design left the reason's limit, the error codes and the repeat report (it said "returns success") `<TO SUPPLY>`. Five hand-written dialog states over the Messages thread, a `message__report` button in the thread mock and the design-system `message` page, L2-017 AC3 to AC6 and ADR 0058 settled them before code. `build_mocks.py` was not run; a Python script that asserted every match wrote only new mock files and edited the two thread mocks, the manifest, the index and the README in place.
- The repeat report is refused `already_reported` (409), not answered with success: "never twice" and a dialog that must not claim a report was sent both need the code. The design's diagrams still show success; PlantUML is not installed here, so the README says to read them with the ADR.
- The README matrix of dialogs has one column per state name, so the mock's "duplicate" state became `refused`, an existing column, rather than a new column in every row.
- The library dialog's `successHeading` already draws the confirmation, so the design's toast was not built; the page needs no toast region and `main` did not grow (web 280.21 kB, admin 280.35 kB, both unchanged).
- `dotnet ef migrations add` failed with the Api project as startup (it lacks the Design package); the Infrastructure project as startup worked.
- A shared-fixture run of the whole suite under load failed three unrelated specs (home messages, landing, admin edit event) that passed alone; run again, not retried in CI.

**New lessons**

- A message id is enough to find which table a message is in when both tables use v7 GUIDs: one route `POST /api/messages/{id}/reports` served group and direct messages, and an unknown message and one outside the caller's conversations share `message_not_found` so the answer reveals nothing.
- Reuse the status rule, not the endpoint: `Member.TryFlag` from 27.1 flags only an Active sender, so a Suspended sender stays suspended and a reinstated member is not flagged again by the same reporter (the repeat is refused first). The staff Members list then showed "Reported by a member" with no staff-side change.
- A unique index on (reporter, message) guards the race, and the handler turns the `DbUpdateException` into `already_reported` only after checking the row exists, as `EmailTaken` does.
- A slot-bearing dialog footer needs one `@if` per `[slot=foot]` node (NG8011), so a "finished" computed drives Done and the Cancel and Report pair separately.

**How earlier lessons worked**

- "Add a stub that compiles before the acceptance test" (17.1 to 8.2): followed; the entity, `DbSet`, migration, controller and an empty handler existed first, so nine of ten API tests failed for behaviour (201 with no row, no flag), and the e2e run failed because no dialog opened.
- "Prove a rule red by breaking it alone" (1.1 to 23.2): removing the `TryFlag` call failed four tests, removing the membership check failed only the outsider test, a logged reason failed both telemetry cases, and showing Report on my own message failed only the group spec; each undone.
- "A class, not a record, for anything personal" (2.1, 27.1): the command and the body are classes; the telemetry test proves neither the reason nor the text reaches a span or log.
- "Load a dialog by a dynamic `import()` of a file whose function opens it with the page's injector" (10.1): the dialog is a lazy chunk and the initial total did not move.
- "Count a slice's new specs against the CI budget" (24.1): six short specs in one file.

## Slice 28.1: Community activity

**What slowed it**

- The mock drew April totals, not a weekly series, and the design left the length, the week rule and the endpoint `<TO SUPPLY>`. ADR 0059 settled eight Monday-start UTC weeks; the Community activity section was added to five mock states by a script that asserted its anchor once per file (`build_mocks.py` was not run), and the mock's `partial` state became this section's error.
- The shell specs, the boot spec and L2-021 all expect an h1 "Dashboard", so the page keeps it rather than the mock's greeting.
- A 5xx opens the server-error screen (8.2's lesson again), so the failing-request spec uses 404.
- `FakeTimeProvider` cannot go back, and a staff session idles out after days of advance: the "new week" test advances before it signs in.
- One full Playwright run failed one unrelated web spec (home, then landing) under load; each passed alone and in the next full run.

**New lessons**

- Staff accounts are members and join at the fake time, so every activity test counts Dana in the current week; the case table adds her instead of avoiding her.
- Week boundaries need a case at each edge (Monday 00:00, the second before, the first week's start, the second before that, now, a later instant); removing the upper bound alone failed five cases.
- A section rendered with library parts (table, skeleton region, empty state) cost no initial bundle: admin 280.32 kB, under 280.35 kB.

**How earlier lessons worked**

- "Add a stub that compiles before the acceptance test" (17.1 to 25.1): followed; the handler returned no weeks, so 11 of 12 API tests failed for behaviour and all five e2e specs failed for the missing section.
- "Prove a rule red by breaking it alone" (1.1 to 25.1): dropping the registrations' upper bound failed five cases; restored.
- "A fixture default for a new call" (15.1 on): the shared fixture answers eight quiet weeks, so every admin spec that lands on the Dashboard stays green; the whole suite was run.
- "Count a slice's new specs against the CI budget" (24.1): five short specs in one file.

## Slice 28.2: Work awaiting staff

**What slowed it**

- The route-prefix policy (ADR 0020) admits a Moderator to the whole Dashboard area, so "no applications for a Moderator" could not be a route rule; the handler reads the caller's staff role and leaves the `applications` key out (ADR 0060), which the Moderator test proves by exact keys.
- The mock's `queue` block has no design-system component, and "2 days ago" needs a clock. The rows became a page composite of library `list`, `button` and `link` parts with the page's own BEM block, and the line shows an absolute UTC day. The mock gained an `attention-error` state for this section's own failure.
- The existing page object's `.empty-state` and `.error-state` locators matched both sections once the page held two; they were scoped to their section by its `aria-labelledby`.
- A heading locator by role found the empty state's `h2` too; the section's title is found by id.
- The shell tool refused long commands that mixed heredocs with quotes; files were written with the file tools instead.
- Journeys 1, 6, 7, 11, 12, 14 and 24 had every slice done but stood unticked in `journeys.md`; they were reconciled with this last slice.

**New lessons**

- A section on a shared page fails and loads on its own: one subject and one signal per section, so Try again asks for that section alone, and a spec fails one request and checks the other section still shows.
- Read a locator's text only after a count has waited for the rows to render; reading `evaluateAll` straight after `open()` raced the render.
- A list whose second list shares a page (the "All N" links) must not match the row locator: rows are found by the row's own class.
- Moderator absence is a contract rule: the API leaves the key out and the client treats a missing list as none, so no screen branches on a role name.

**How earlier lessons worked**

- "Add a stub that compiles before the acceptance test" (17.1 to 28.1): followed; the stub answered nothing, so three of four API tests failed for the missing keys and all nine new e2e specs failed for the missing section, with the five older specs green.
- "Prove a rule red by breaking it alone" (1.1 to 28.1): treating every role as a Moderator in the handler failed the Admin test alone; restored.
- "A fixture default for a new call" (15.1 on): the shared fixture answers nothing waiting, so every admin spec that lands on the Dashboard stays green; the whole suite was run.
- "Section rendered with library parts costs no initial bundle" (28.1): admin stayed at 280.32 kB.

## Follow-up: offline flake and stale diagrams

**What slowed it**

- The offline specs failed about 1 run in 140 under load (`--repeat-each` with 8 or more workers), always the admin "navigating offline" spec, with `Failed to fetch dynamically imported module` for the offline screen's chunk. The shell warms that chunk with a fire-and-forget `import()` when it mounts online; the spec only waited for the Dashboard heading, so under load it called `setOffline(true)` while the chunk or its static imports were still downloading, the fixture then aborted them, and `/offline` could never open. Reproduced at 2 to 3 failures per 280 runs with 8 to 16 workers; none at 4 workers.
- A first fix (wait until no static request is in flight) still failed: a chunk's own imports are requested only after it has been parsed, so the in-flight count reads zero between the chunk and its dependencies.
- A second, rarer failure was a late `Failed to load resource: net::ERR_INTERNET_DISCONNECTED` console error logged after the spec had gone back online, which the fixture no longer treated as an answered request.
- The other timeouts reported under load (forgot-password-refusals, home-messages, landing, remove-listing, edit-event) did not fail at 4 workers on a built app; they are machine load (Chromium and the dev server share the box with other work), not a timing assumption in the product.
- A run of 16 workers on this machine was ten times slower than 8, so the stress was lowered rather than the machine blamed.

**New lessons**

- A warm-up the product starts must say when it is done: each shell sets `data-offline-ready` on its host once the offline chunk resolves, and the shared fixture waits for it before `context.setOffline(true)` (no sleep, no retry, assertion unchanged). Observing the network from outside cannot know the module graph is complete.
- Judge a lazy-chunk race by the hashed chunk's content (`grep` the build for its text), not by guessing which route failed.
- A browser console line about a refused request can arrive after the toggle back online; keep the allowance for the whole test once it has gone offline, never for a spec that did not.
- Re-rendering PlantUML is part of the slice that changes the behaviour: five diagrams and two README caveats ("read with ADR ...") went stale because PlantUML was not installed at the time; `java -jar C:\tools\plantuml.jar -charset UTF-8` via `render_puml.py` works.

**How earlier lessons worked**

- "Warm the offline chunk while online" (30.2): right, but only half: it needs an observable completion.
- "A heavy parallel run failed unrelated offline specs" (21.1): that was this race, not an unrelated cause.

## Follow-up: initial bundles under budget and the home spec race

**What slowed it**

- After the 13-slice landing the initial totals were web 280.21 kB and admin 280.32 kB, over the 280 kB warning (the 290 kB error limit and every budget unchanged). The app's own code in `main` is only about 7 kB; the rest is Angular, so the cut had to come from duplication and from code a lazy screen alone needs, 0.3 kB at a time. `ng build <app> --stats-json` and summing `bytesInOutput` of the `main` output's inputs found it.
- Result: web 279.67 kB, admin 279.98 kB. What moved: `HttpAccountService` is bound on the three pages that use `ACCOUNT_SERVICE` (join, forgot password, reset password) instead of in the web `app.config.ts`, so it ships in their lazy chunks (the guards use only the session service, which stays); every route loads a default-exported page (`import('./x')`, the 13 stragglers that still wrote `.then((m) => m.X)`); `api-error.ts` shares one `isRecordOf` and the domain shares one `pathOf` and `isApiUrl(url, prefix)` instead of six copies of the same split and `new URL` test.
- Converting routes to default exports alone shrank admin by 230 bytes but grew web by 120 (chunk bookkeeping moved), so each change was measured on both apps, not assumed.
- Home "With nothing to suggest" never failed again: 100 repeats at 4 workers while the whole suite ran on other ports (the first run of the follow-up) passed 100 of 100, and its waits are already events (the next-event title, then absences). The two failures seen in the two full runs were others: `edit-listing` "with nobody listed" waited 5 s while a lazy chunk and `/api/admin/session` each took 6.9 s to answer (the trace shows both stalled at the same moment, then everything answered within 80 ms, so the machine, not the page, paused), and `report-message` "Cancel and Escape" pressed Escape right after the click that opens the dialog, before it was attached.

**New lessons**

- A page-level `keyboard.press` after a click that opens a CDK dialog races the dialog's attachment. Reproduced (1 of 20) by throttling the CPU 40 times over CDP and dispatching the click; every dialog page object's `pressEscape` now waits for its dialog first, and 60 of 60 pass under the same throttle.
- Reading a trace's network file for per-request `time` tells a stalled machine (several requests slow together) from a slow product (one request slow).
- Measure bundle changes on both apps; a change that helps one can cost the other.

**How earlier lessons worked**

- "Section rendered with library parts costs no initial bundle" (28.1) and "Initial bundle: diff `--stats-json`" (AGENTS.md): the stats diff found the savings; the lazily bound service follows "scope state to its use".
- "The other timeouts reported under load are machine load" (offline follow-up): confirmed for `edit-listing` by the trace; not for `report-message`, which was a real race.

## Journey 4: Search events and see mine

**What slowed it**

- The 36-journey `journeys.md` the issue cites was not on `main` when the work started (it came
  with #187 mid-journey, which also removed `journeys.detailed.md`); the slices were numbered 4.1 to
  4.3 under the new journey and the table was ticked after the rebase.
- L2-075 and L2-076 left the parameter names, the wait, the history and the no-results precedence
  open, and the design still called both "future work". ADR 0081 settled them before any code.
- The worktree-isolation guard refused long shell commands that mixed heredocs, pipes and git;
  edit scripts went into the scratchpad and ran as one plain `python` call each. A refused command
  that also held a `git checkout -- file` would have thrown away the uncommitted slice; breaks are
  now reverted from a copy, never from git.
- The first blank-search API test assumed events from other tests in the class's store and failed
  when it ran first; it now adds its own.

**New lessons**

- `debounceTime` from `rxjs` lands in `main` (the barrel is already there), about 0.44 kB. A plain
  `setTimeout` cleared on each key and on destroy kept the web initial total at 279.67 kB.
- When several filters share one no-results state, put the wording and its precedence in one pure
  helper with a row per combination (`eventsNoResults`); the page shows what it returns.
- A filter that must use the session's member is proven by sending another member's id under the
  names a client might try (`memberId`, `member`) and asserting the caller's own list.
- A "Try again" that re-asks must re-ask the same selection; a spec that fails the search request
  and counts what Try again sent catches a reset selection.
- A controller passes the raw `going` text on; the query object reads "exactly `true`", so the
  rule has one case table in each stack (`ListEventsGoingTests`, `eventGoingOf`).

**How earlier lessons worked**

- "Keep the field's text apart from the URL's term" (26.1): the field keeps " SUNRISE " while the
  address holds `q=SUNRISE`, and a chip does not rewrite it; the spec asserts both.
- "Read a URL through one pure function" (26.1, 4.2): `eventListQueryOf` turns an unknown category,
  blank text and any `going` but `true` into unset, so the screen never asks a question the API
  narrows differently.
- "A rule computed in both stacks shares one inline case table" (2.2, 4.2): the search trim and the
  `going` reading each have the same rows in xUnit and Vitest.
- "Prove a rule red by breaking it alone" (1.4 on): breaks to the handler's lower-casing, the
  per-key timer reset, the service's `going`, the wording order, Try again's query and the focus
  after clearing each turned the intended test red; restored.
- "Read the initial total after each new API" (30.1): the library `checkbox` and `search-field` and
  the new domain helpers cost `main` nothing; 279.67 kB before and after.

## Journey 14: Get notifications in the app

**What slowed it**

- The real-time client lived on the chat screen's `providers` and stopped when the member left it,
  so nothing could change the bell live. ADR 0083 moved it to the member shell before any code was
  written. That meant every member spec now opens a hub socket, and the shared fixture had to
  answer it.
- The Messages row and the event page's chat link load the chat as a full page, not through the
  router. The first "one connection" spec counted two negotiations because of the reload, not
  because of a second client. It now opens the chat by its address and leaves through the bell.
- A pushed notification sent right after `negotiate` was answered could arrive before the
  handshake and be lost. The hub fake now counts the handshakes it answered (`opened`), and specs
  wait on that count.
- The shared scratchpad is shared with other agents: another session overwrote a dev-server log,
  and a Python heredoc with `\/` lost its escapes. Edit scripts now go in `scratchpad/j164/` as
  files with raw strings.
- A busy machine (several agents running suites at once) failed four specs by timeout in one full
  run. Run alone and with `--repeat-each 3`, they all passed.

**New lessons**

- To make one real-time client serve two contracts, provide the class once and bind both tokens
  with `useExisting`. Bind it where its lifetime belongs (the shell), and a screen that only
  subscribes releases its own subscriptions with `takeUntilDestroyed`, never the connection.
- A connection owned by the shell can be destroyed while it is still starting, for example when a
  5xx sends the member to the server-error screen. Calling `stop()` then makes SignalR log "Failed
  to start the HttpConnection before stop() was called", and the fixture counts that as a page
  error. Stop the connection only once it is up; until then `start` stops it after it connects.
- Give every page a default hub socket with `context.routeWebSocket`. A spec's own
  `page.routeWebSocket` (`FakeChatHub`) takes precedence, so existing chat specs needed no change.
  Answer pings in the default too, or a long spec can hit the client's server timeout.
- `[class.x]` on one element pulled about 4.3 kB of `@angular/core` debug code into `main` (web
  279.76 kB became 284.10 kB). `[attr.class]` with a ternary cost nothing. Diff the `--stats-json`
  inputs of `main` before and after a template binding the app has not used yet.
- A component in the library may import only `@cf/api`, so a presentation helper (`bellBadge`,
  `bellLabel`) lives beside its component, not in `@cf/domain`.
- Retention with no scheduler (ADR 0069): filter on read and delete the member's expired rows on
  each write, so the table never grows without a reader seeing the rule.

**How earlier lessons worked**

- "Read the initial total after each new API" (30.1, 4): it caught the `[class.x]` cost at once.
  The web initial total ended at 279.74 kB, from 279.67 kB, after the route entry and the shell's
  providers.
- "Prove a rule red by breaking it alone" (1.4 on): removing `connection.stop()` turned the
  sign-out spec red (closed 0), the 50-row cap turned its unit rows red, and the screen and live
  specs failed for the missing bell, route and connection before the code existed. Each was
  restored.
- "The worktree-isolation guard refuses long shell commands" (4): plain commands and script files
  kept the rebase and the edits moving.

## Journey 5: Browse the directory

**What slowed it**

- The requirement, design and mocks disagreed on five points (anonymous reads against the design's 401, a collation PostgreSQL cannot `LIKE` before 18, a cap of 100 against `L2-009`'s 200, a hosting count before events had hosts, sample people in production). Each was settled in ADR 0082 before any code; the mock was regenerated for the 200 cap.
- A test folder named `Directory` put `ChristianFitness.Api.Tests.Directory` in scope of an older test that calls `System.IO.Directory`; the folder became `DirectoryListings`.
- Ordering by an enum stored as a string sorts alphabetically on PostgreSQL but by value on InMemory, so the tests would have passed and production would not. A stored `KindOrder` integer orders both alike.
- Npgsql may translate `string.Contains(parameter)` to `strpos`, which a trigram index cannot serve; the search is an explicit, escaped `EF.Functions.Like`, and an `r_n` case proves `_` is literal.
- The worktree guard refused shell commands that `cd` to a computed path or mix git with other steps; honest-red breaks were made with small edit scripts and restored from a scratchpad copy, and git ran alone from the worktree root.
- Other agents shared the machine: CPU stood at 100% and unrelated specs (event detail, admin server error) failed once each in full runs and passed 3 of 3 alone. Another agent's dev-server log also landed in a same-named scratchpad file, so logs got slice-specific names.
- The first CI run showed both apps 4.4 kB over main's initial totals, admin included, though admin uses nothing of the directory. A local "base" for admin had been measured with this branch's library changes in place, so the growth was first misread as a Windows-against-Linux difference. Reverting the library changes one folder at a time found it: the first `[class.x]` binding in the codebase (`search--wide`, then `chip-bar--scroll` and `listing-row__hosting--some`) pulls Angular's styling instructions into `main` of every app that reaches the component. Each became an `[attr.class]` string, as the library's other components already compose theirs; admin is back to main's 279.98 kB. Web is 280.10 kB: the new lazy route costs 0.30 kB (measured by reverting `app.routes.ts` alone) and the two listing-row tokens 0.05 kB, so it is 0.1 kB over the 280 kB warning, well under the 290 kB error. Copying the design system's whole `tokens.css` would have added 0.62 kB of unused tokens, so only the two were added.

**New lessons**

- A screen built ahead of a slice's spec makes the spec pass at once: break the rule each test names (one break per test, or interacting breaks hide one another, as dropping the kind on search hid the Clear-search break) and watch each fail.
- `fastForward` past a debounce after one keystroke, then type the second, proves a one-character search is never sent; asserting only the final request does not.
- A rate-limit test pins its own client address (`ApiFactory.ClientAddressHeader`) while the shared fixture gives every other request a random one, so a limit test never starves its neighbours in the collection.
- Let the status-code page write a limiter's 429: `OnRejected` sets `Retry-After` and overrides the ProblemDetails code, so the refusal has the same shape as every other.
- Never bind `[class.x]` in a library component: compose the class string and bind `[attr.class]`. One such binding anywhere an app reaches adds about 4.3 kB to that app's initial bundle. Measure a base by checking out the base's files, never by a build that already holds the change.
- A cursor over a name puts the name last and splits with a count, so a `|` in a name cannot break it.

**How earlier lessons worked**

- "Prove a rule red by breaking it alone" (1.1 on): each backend rule (status filter, hosting `>`, seed publish, escape, signed-in exemption, minimum length) failed exactly its tests; restored.
- "A fixture default for a new call" (15.1 on): `GET /api/directory` answers nobody listed by default, and the six-item navigation changed three older specs and the tab-bar unit test, found by grepping for the five-item lists.
- "Measure bundle changes on both apps" (bundle follow-up) and "the first use of an `@angular/core` API can grow `main`" (AGENTS.md): applied too late. Admin's growth with no admin code was the signal; comparing CI's totals with main's run of the same base caught it before merge.

## Journey 1: Read the Privacy Policy and Terms

**What slowed it**

- The mocks described newsletter preferences, followed listings and a scheduled deletion process before those journeys shipped. Checking the cancellation handler also found that a member may cancel until the event starts.
- A class binding on the contents links brought Angular styling code into the initial member bundle. Comparing the source maps located it in the styling instructions.

**New lessons**

- Publish only practices supported by the current release. Preserve the first edition at its permanent address and read it with JavaScript disabled to verify archival hosting.
- Service notice mail from a short-lived CLI must await SMTP delivery. Test the full 30-day interval against the UTC instant a new version takes effect.

**How earlier lessons worked**

- Native links with the complete path and fragment kept the keyboard contents test green. Binding the class attribute and lazy-loading the other member routes reduced the initial build from 279.67 kB to 277.81 kB without changing budgets.
- A fake clock and different effective dates for the two documents proved that the server chooses both versions at Join, independently of values submitted by the browser.

## Journey 17: Suggest a listing

**What slowed it**

- The ADR was written as 0084, then the member-header fix took 0084 and journey 1 took 0085 on main, so it is 0086, renamed everywhere twice. `docs/adr/README.md` is outside Prettier's reach and main's table is no longer column-aligned, so each rebase conflict was settled by taking main's file and appending the one row.
- Journey 1 moved the member routes from `app.routes.ts` into a lazy `member-app.routes.ts` and added a migration timestamped after this branch's. On rebase the route went to the new file, and the migration was removed and generated again from main's snapshot, so it sorts after `AddLegalAcceptance`.
- The validator, the suspension check and the daily limit were written with slice 2's handler, so slice 3's API tests passed at once. Each rule was then broken alone by a script (suspension, the limit of 5, the host's dot, Myself's email, the church limit, https only), each failed exactly its own case, and each was restored from the copy the script held.
- The thanks panel could not take focus in `ngAfterViewInit`: its content is projected into an `@if` branch of `cf-form-page`, which is not attached until the next render. `afterNextRender` focuses it, and the initial total did not move.
- Playwright's `check()` on a choice chip's visually hidden radio is intercepted by its label, so the page object clicks the label, as a person does.
- `ng serve` on Windows sometimes missed a new export in a library's `public-api.ts` and reported it missing; touching the file re-ran the build.
- Handing Prettier a folder (`../docs/adr`) rewrote six unrelated ADRs. They were restored, and only named files were formatted after that.

**New lessons**

- Check `origin/main` and open PRs for the next ADR number right before each commit that adds one, not when the ADR is drafted. Parallel journeys take numbers in the meantime.
- A rule that answers a client with a code is one row in a case table in both directions: the API test sends the value and expects `{ field: code }` by exact keys, and the domain helper maps the same code to its sentence. The boundary rows ("at the limit is stored") catch an off-by-one that the refusal rows alone pass.
- A rolling window is proven at its edge: advance a `FakeTimeProvider` to one tick before the first attempt is a day old (still refused), then one tick more (allowed).
- A component that focuses projected content waits for `afterNextRender`. A content child inside a parent's `@if` is not in the DOM in the child's own view hooks.

**How earlier lessons worked**

- "Never bind `[class.x]`" (5): no class or style bindings were added. Before the last rebase web's initial total was 280.13 kB, main's 280.10 kB plus 0.03 kB for the new route entry; the screen, the service and `afterNextRender` all stayed lazy (checked by grepping `main-*.js`). On journey 1's base it is 278.15 kB, under the warning.
- "Break each rule alone" (5): applied to every backend rule of slice 3 and to the screen's failed and sending states in slice 2.
- "The worktree-isolation guard refuses long shell commands" (4, 5): edits went through script files and `git` ran alone from the worktree root.

## Journey 6: View a listing's profile

**What slowed it**

- The ADR was drafted as 0084, renamed 0085 when the member-header fix took 0084, and renamed again to 0087 at the final rebase because journeys 1 and 17 had taken 0085 and 0086 in the meantime. Only lines in the branch's own changed files were renumbered, by a script that listed every hit before writing, so journey 1's ADR 0085 references stayed untouched.
- Journey 1 moved the member routes into `member-app.routes.ts` and journey 17 added a migration, so on rebase the route moved to the new file, the snapshot was taken from main and `AddListingConnections` was generated again so it sorts after `AddListingSuggestions`.
- `IAppDbContext` has four hand-written test doubles (two join races, last place, unreachable database). A new `DbSet` breaks all four, and a parallel journey adding its own set conflicts in each; both sides were kept.
- A slice-4 change to `ListingProfileDto` broke the domain library's spec fixture, and it was found only in slice 5, because only the e2e and component tests had been run after slice 4. Run `npm test` (both libraries) after every contract change, not only the suite closest to the change.
- The first cross-link test passed with the "published only" filter removed: the draft it relied on was never the oldest, since the factory stamped a draft's `ListedAt` at the fixed clock and ignored `listedAt`. The factory now backdates any status, and the test fails without the filter.
- An object literal in `[ngTemplateOutletContext]` and an `@let` each pulled Angular core code into the initial `main`. Precomputing contexts in a `computed`, as `cf-list` already did, kept `main` flat. The one lasting cost is the `--size-column-date` design-system token the hosting row needs, 0.03 kB in `styles.css`.
- Python heredocs in Git Bash turned `"\n"` inside a string into a real newline twice. Edits with escapes went into script files or the Edit tool.

**New lessons**

- An e2e test that clicks a link and expects the next URL also passes when the link reloads the whole app. Prove in-app routing with a component test: a plain click is prevented and emitted, a modified click is left to the browser. Here `MiniRow` (`routed`) and `ServiceDetail` got that test.
- A component that other screens use as a plain link (`MiniRow` on Home and Messages) takes routing only by an opt-in input, so its existing consumers keep their behaviour without changes.
- When a slice needs a state the mocks do not draw (a failed Message), add the mock state (`listing-profile/message-failed`) and point the design at it before writing the screen.
- To find which slice grew the initial bundle, check out an earlier commit's `frontend/projects` into the working tree, build, compare `main-*.js` and `styles-*.css` separately, then check out `HEAD` again. A change that leaves `main` alone but grows the total is in the global styles. Commit first: checking `HEAD` out again also discards uncommitted edits under that path, which happened once here and had to be redone. Move aside new files that do not compile against the older libraries.

**How earlier lessons worked**

- "Check `origin/main` and open PRs for the next ADR number right before each commit that adds one" (17): it was checked, and still overtaken by two merges before the push. Checking again at the final rebase caught it.
- "Never bind `[class.x]`" (5): no class or style bindings; `[attr.class]` strings throughout. After the rebase web's initial total is 278.18 kB, main's 278.15 kB plus the 0.03 kB token; `main-*.js` is byte-for-byte the same size, since the route now sits in the lazy `member-app.routes.ts`.
- "Break each rule alone" (5, 17): the Toronto listed year, the published filters on the profile, on connections and on Services' directory link, http websites, the owner check on Message and the routing guards each failed exactly their own tests when broken, and were restored.

## Journey 8: Follow a listing

**What slowed it**

- The requirement, design and design system disagreed on three points: the design's table said the button reads "Following" while `L2-056` AC1 keeps "Follow"; the design system said "Busy: none" while AC8 asks for `aria-disabled`; and its row button fell short of 44 px. ADR 0088 settled them, and how "60 an hour" is counted when an unfollow deletes its row, before any code.
- The screens could not know whether the member already follows a listing: the anonymous directory and profile reads carry no caller. `ICurrentMember` gained `SignedInId`, so one read serves both, and both DTOs gained `following`.
- A new `DbSet` again broke the four hand-written `IAppDbContext` doubles, and this journey's own race double made five. A small script that inserts the set after a known line in each kept the two additions mechanical.
- The worktree guard refused every command that wrote a script with a heredoc and ran it in one go, even with no git in it. Scripts went into the scratchpad through the Write tool and ran as a separate plain command.
- Slice 2 built the rollback for every failure, so slice 3's refusal rows (403 and 429) passed at once in the browser. Making the store skip its rollback for 403 and 429 turned exactly those two rows red; restored.

**New lessons**

- A rolling-hour limit on an action that deletes its own row needs a log of its own: `ListingFollowChanges` holds one row per accepted change, the refusal is not logged, and each accepted change deletes the member's rows older than the hour, so the log never holds more than the limit and needs no scheduler.
- A class that moves a `FakeTimeProvider` takes its own `IClassFixture<DirectoryFactory>` rather than the collection's shared clock, so the other directory classes keep their fixed "now".
- A toggle that is `aria-disabled` while in flight is pressed in a spec by focus and key (`pressFollowByKey`), since Playwright's click waits on `aria-disabled`; asserting the request count after Enter and Space proves the second press did nothing.
- `hasTouch` with `isMobile` makes `(pointer: coarse)` match in Chromium, so a coarse-pointer target can be measured from `getComputedStyle(button, '::after')`; without it the same spec reads the drawn 36 px and fails, which is the honest red.
- A page object helper two screens share (`readFollow`) belongs in `page-objects/shared/`, not imported from one screen's page object into another's.

**How earlier lessons worked**

- "Never bind `[class.x]`" (5) and "an `@let` or an object literal in a template grows `main`" (6): the button composes its class with `[attr.class]` and the rows read the store's map with `?.` and `??`; web's initial total stayed 278.21 kB through all four slices (main's 278.18 kB plus the 0.03 kB `--size-column-follow` token), admin 279.98 kB.
- "Break each rule alone" (5, 17): the race catch, the pruning, the window's `>`, the limit of 60, the suspension check, the in-flight guard and the refusal rollback each failed exactly their own tests when broken, and were restored from a scratchpad copy.
- "Run `npm test` after every contract change" (6): the three domain fixtures that build a row or profile DTO were updated in slice 1, when `following` joined the contracts.
- "Check `origin/main` and open PRs for the next ADR number right before each commit" (17): checked before the first commit and again at the rebase.

## Journey 7: See who hosts an event

**What slowed it**

- Journeys 5 and 6 had already built two of the four planned slices: `Event.HostListingId` with
  its backfill migration and default (ADR 0082), and the profile's Hosting section (ADR 0087). The
  journey became the editor's Host picker, its refusal and the "Hosted by" card; reading what
  `main` held before planning saved redoing the migration.
- The mock drew the host matches as `pick-card` links to other mock states. Inside a form a
  choice is a button, so the design system's `pick-list` page and the `host-searching` mock gained
  the button form before the library's `PickCards` was built (ADR 0089).
- The API test host's InMemory store had no team listing, so any event read through its host
  would have failed in every older test. `ApiFactory.CreateHost` now adds it, as the migration
  guarantees in a real database; every existing API test stayed green.
- Every member event answer (read, register, cancel) builds `EventDetailDto`, so the host had to
  join all three handlers, not only `GetEventQuery`; an API test registers and cancels to prove
  the card survives both.
- A wait loop grepping `ng serve`'s log for "Local:" never ended: the line carries colour codes
  between "Local" and the colon.

**New lessons**

- A search a refusal names by its top-level code (`query_too_long`) is not a `fieldCodes` entry:
  `ProblemCodes` promotes it. Read how an existing rule is answered before writing the ADR's
  wording for a copy of it.
- A rule that reads the store (a host must be a Listed listing) belongs in the validator with an
  `IAppDbContext`, so it is refused with the other fields' codes in one answer; its direct test
  gives the validator an InMemory `AppDbContext` holding one listing per status.
- A live region that starts empty is kept in the page but out of the flow (`:empty { position:
absolute }`), not `display: none`, so a later sentence is announced and an empty one adds no gap.

**How earlier lessons worked**

- "Never bind `[class.x]`" (5): `pick-cards` composes its class with `[attr.class]`; the initial
  totals stayed at main's after every slice: web 278.18 kB (278.21 kB once rebased on journey
  8's token) and admin 279.98 kB.
- "A `setTimeout` cleared on each key and on destroy, not `debounceTime`" (4): the Host search
  waits 250 ms that way.
- "Prove in-app routing with a component test" (6): `HostCard` has one; the e2e test only proves
  the profile opens.
- "Break each rule alone" (5, 17): removing the Listed filter and the limit of 10 failed exactly
  the search tests, and removing the focus return failed the choosing spec; each was restored.
- "Check `origin/main` and open PRs for the next ADR number right before each commit" (17): 0088
  was free at the first commit, but journey 8's PR (#196) had taken it by the push, so this ADR
  became 0089. Check again just before pushing too, not only before committing.

## Journey 18: Review listing suggestions

**What slowed it**

- Three journeys merged while it ran. Journeys 6 and 8 took ADRs 0087 and 0088 and added three
  migrations that sorted between this branch's four, and journey 7 took 0089 and built
  `PickCards` in its button form while this branch built its link form. The rebase renumbered
  this ADR to 0090 on only the lines the branch added (journey 6's own "ADR 0087" stayed),
  replaced the four migrations with one generated after main's, added the new DbSets to main's
  new fake context (`FollowRaceTests`), and merged the two `PickCards` into one component with
  both forms and one `picked` output.
- A counts test that made one waiting and one decided suggestion passed with the rule inverted:
  in a shared store the two counts were equal. It now measures the count before, after a
  suggestion arrives and after it is decided.
- The shell's counts first cost `main` 410 B: `adminNavOf` sat in `admin-areas.ts` and the counts
  call on the staff session service, both already in `main`. Moving each to a file and a
  service only the lazy shell imports brought it back to 10 B.
- `queryParamMap` emits synchronously, so Listed never loaded until its reload subscription was
  made before the address subscription.

**New lessons**

- An honest red needs bad data by construction: when the rule's two outcomes give equal numbers,
  the test passes with the rule broken. Measure a change (before, after) rather than a total.
- Read the `main` chunk's inputs (`--stats-json`) after a change to a shell or a guard: a helper
  added to a file `main` already imports is paid for at start-up, even when only a lazy screen
  calls it. A new file, or a service the lazy component provides itself, keeps it out.
- When `main` gains a component this branch also builds, merge them into one in the rebase, with
  the other side's spec kept and the new form's cases added, rather than keeping either copy.
- A purge that deletes rows with dependents removes the dependents too, even when the database
  cascades: InMemory cascades only tracked rows.
- Angular keeps the whitespace before an `@if` inside text, so a title with an optional tag reads
  "Name ". Wrap the text in its own span, so only whitespace-only nodes sit between elements and
  Angular drops them.

**How earlier lessons worked**

- "Check `origin/main` and open PRs for the next ADR number right before each commit and again
  before pushing" (7): checked at each rebase, and 0087, then 0090, held.
- "Regenerate a migration that sorts before main's" (8): one `AddSuggestionReview` after main's
  three, built on main's snapshot, replaced four.
- "Break each rule alone" (5, 17): the check count, the Waiting filter, the oldest-first order,
  the page size, the 90-day window and the nav refresh each failed exactly their tests, and
  each was restored.
- "Read the initial total after each build" (5): admin's initial is 280.38 kB, 400 B over main's
  279.98 kB, for the Listings route, its area and two tokens. It is past the 280 kB warning; the
  budget was not raised.

## CI: one critical acceptance path per feature

**What slowed it**

- CI ran every behaviour spec (610), so each journey made it slower: the Frontend job reached
  4m58s against the five-minute timeout, 3m21s of it in specs. AGENTS.md already asked for one
  critical acceptance path per feature, but only `join-age.spec.ts` carried `@critical`.

**New lessons**

- CI runs `npm run e2e:critical` (`playwright test --grep @critical`): one happy-path test per
  feature, in each app the feature touches, tagged `{ tag: '@critical' }`. The first set is 40
  tests (25 member, 15 admin) and runs in about 25 s locally on two workers.
- Every new journey tags its one critical path in the same change, the single test that proves
  the feature's main happy path end to end; the rest of its specs run locally with `npm run e2e`
  before it merges. `npx playwright test --grep @critical --list` shows the set.
- Adding the tag to a test whose title and callback share a line makes Prettier re-indent its
  body; that is the house form (`join-age.spec.ts`), so expect a re-indented diff and rebase it.

**How earlier lessons worked**

- "Count a slice's new specs against the CI budget" (24.1) is retired: new specs no longer cost
  CI time, only the one critical path does.

## Journey 9: Manage event series

**What slowed it**

- Two journeys merged under it: #198 took ADR 0090 and rewrote the admin navigation (Listings with
  a count, `adminNavOf`) and pick cards, and #199 re-indented 39 specs. The rebase needed the
  series ADR renumbered to 0091 on every added line (but not the lines naming main's 0090), the
  navigation merged into one `adminNavOf` with groups, and the migration regenerated after main's.
- Measuring main's initial bundle meant checking out main's `frontend/projects` in the worktree
  and deleting the branch's new files, then restoring with `git checkout HEAD -- frontend`.
- Two dev servers outlived their task and held 4500 and 4501 until stopped by process id.

**New lessons**

- A dialog that saves a record the page shows should hand back the answer and the page should
  show it in place (`showSaved`), not ask for the list again: a reload redraws the card, drops the
  button that opened the dialog, and CDK's restored focus lands on `body`. The focus check in the
  e2e test caught it.
- A wall-clock check in the browser (a start after now) needs `page.clock.setFixedTime` at the
  mocks' today; the mocks' dates are already past by the real clock, so the happy path fails
  without it. `setFixedTime` leaves timers running, so zoneless rendering is unaffected.
- Toronto date and time to an instant in TypeScript: take the wall clock as UTC, subtract the
  offset `Intl` gives at that guess, then once more at the result, so a guess across a clock
  change settles. Test both sides of each change.
- A new nullable field on a shared DTO (`AdminEventDto.series`) breaks the exact-keys test of
  every endpoint that answers it; add it there with a null assertion, which is the contract change,
  not a weakening.
- One editor dialog serves New series and Edit details by its data (`series` present or not):
  heading, subtitle, button words, failure heading and the default-host request all branch on it,
  and the page object takes the dialog's name.

**How earlier lessons worked**

- "Check `origin/main` and open PRs for the next ADR number right before each commit" (7): the
  first check said 0090 was free; #198 merged it an hour later. Checking again at the rebase
  caught it, and 0091 held.
- "Regenerate a migration that sorts before main's" (8): `AddEventSeries` regenerated after
  `AddSuggestionReview`, with identical content.
- "Break each rule alone" (5, 17): the drop-in rule, the sessions-to-come filter, the capacity
  floor, the past-start and end-after-start rules (API and app) each failed exactly their tests
  and were restored.
- "Read the initial total after each build" (5): admin's initial is 280.52 kB against main's
  280.38 kB, +0.14 kB for the series route (116 B) and its area entry (82 B). The editor and Add
  a date are lazy chunks loaded on first use; the budget was not raised.

## Journey 19: Claim a listing

**What slowed it**

- Journey 9 merged ADR 0091 while this journey held it, so the claim ADR became 0092 at the
  rebase. A script renumbered only files that do not name 0091 on main, and the two that do
  (`RefusalCodes.cs`, the ADR index) were edited by hand. `AddClaimVoidedAt` was generated again
  on main's model, after `AddEventSeries`.
- Slice 1 built the signed-out expired, claimed and "couldn't check" states with no tests. When
  slice 5 tested them, the "couldn't check" stand-ins on both pages proved unreachable:
  `serverErrorInterceptor` already opens the server-error screen for a GET that fails with a 5xx.
  They were removed, and the tests assert the app's server-error screen with its Try again.
- The worktree guard refuses compound git commands, heredocs in the same command as git, loops
  that name git, and `complete`. Edit scripts went to the scratchpad and git ran alone.
- The design-system and mock generators rewrite every page with CRLF and reproduce earlier drift
  (follow-button, pick-list, the series mocks). Only the touched pages were staged; the rest were
  restored.

**New lessons**

- A break for an honest red must compile. `@case ('nf')` against a typed `@switch` failed the dev
  server's build, so it kept serving the old bundle and every test "passed". Change text, not
  types, or read the server log before trusting a green run.
- A test that moves a shared `FakeTimeProvider` past 14 days also expires the sessions it signed
  in before. Sign members and staff in after the clock moves.
- Telemetry allows only a fixed list of span tags, so `Activity.Current?.SetTag(token)` is not a
  break the leak test can see. Logging the token is, and it failed exactly the case it touched.
- A component that only takes inputs and outputs grows a follow-up action as inputs plus an output
  (`resendable`, `resending`, `resend`), not as a projected button: the page keeps the request,
  and the component keeps its foot layout.
- One shared helper (`ClaimLinkDelivery`) for "issue a link and send it the way approval did"
  made the resend handler small and kept approval's tests green unchanged.

**How earlier lessons worked**

- "Check `origin/main` and open PRs for the next ADR number right before each commit": 0091 was
  free at the first commit and taken by journey 9 before the push; the check at the rebase caught
  it.
- "Regenerate a migration that sorts before main's": mine already sorted after main's, but its
  Designer described a model without `EventSeries`, so it was regenerated anyway. The content is
  identical, and `has-pending-model-changes` is clean.
- "Break each rule alone": used/expired order, the 14-day boundary (`>=` to `>`), voiding on
  resend, both answers disabled while busy, and the expired and 404 outcomes each failed exactly
  their tests and were restored.
- "Read the initial total after each build": web stayed 278.21 kB through every slice; admin's
  280.52 kB is main's after journey 9, and admin `main` contains none of the resend code.

## Journey 10: Browse event series

**What slowed it**

- Journey 19 merged ADR 0092 while this journey held it. The series ADR became 0093 before its
  first commit, and the ADR index conflicted at the rebase; both rows were kept.
- Slice 2 made every slice 1 spec fail on an unanswered `GET /api/events/series`: an
  unanswered request answers 501, and the interceptor turns a 5xx into the server-error screen.
  The shared fixture now answers the count and the list empty by default.
- The worktree guard refused `cd` followed by git in one command, and Python on Windows wrote CRLF,
  so a later replace missed. Files are read and written with `newline=''`, and prettier runs after
  each scripted edit.
- `seriesCadenceText` lived in the admin series view; the member card needed it too. It moved to
  its own `series-cadence.ts`, so the member app imports no admin code.

**New lessons**

- A list that keeps "only the first session of each series" belongs before the cursor, over the
  already filtered set. Then "Only events I'm going to" shows the session the member holds, not
  the series' next one. The test proves this with a place at a later date.
- A session's number counts cancelled dates, because it is its place among all the dates. The
  first break, counting only sessions that were not cancelled, still passed. The test registered
  for a session before the cancelled date. Moving the test to a session after it made the break
  fail.
- When the switch clears filters, the search needs no special handling: it is one more query
  parameter. But `onSearch` must build the address for the view it is in, or typing in the Series
  view jumps back to By date.

**How earlier lessons worked**

- "Check origin/main and open PRs for the ADR number": it caught 0092 before the first commit.
- "Answer common endpoints in the shared fixture by default": it fixed slice 1's specs at once
  after slice 2. Every new default is listed in the fixture's doc comment.
- "Read the initial total after each build": web stayed 278.21 kB and admin 280.52 kB through all
  four slices. The Series view, the segmented control and the series row load only with the
  Events route.
- "Break each rule alone": these breaks each failed their own tests and were restored:
  - the count's published and to-come filters
  - the list's member filter, cap and order
  - `joined` matched case-insensitively
  - the search address for the series view
  - Show all series keeping a filter
  - the session number

## Journey 21: Manage bylines

**What slowed it**

- Journey 19 merged ADR 0092 while this journey held it, so the bylines ADR became 0093 before
  the first commit; journey 10 then merged its own 0093 after the PR was open, so it became 0094.
  A scratchpad script renumbered the files that named it each time, and the ADR index was merged
  by hand at each rebase. `AddBylines` was generated again after `AddClaimVoidedAt`.
- Stories do not exist yet, but L2-077 AC7 needs "a story uses this byline". A minimal `Story`
  (id, byline, headline) with a restricted key carries the count and the refusal; journey 22
  extends it rather than adding a second table (ADR 0094).
- The seed must not bring back bylines an Admin removed. "No bylines" alone would, so it also
  looks for any `Byline` audit entry.
- Adding Stories to the navigation changed the Admin's nav lists, groups and hrefs asserted in
  three shell specs, and the group count in a fourth. Grep every spec for the old list first.
- Routing `stories` and `stories/bylines` as two entries in `app.routes.ts` cost the admin initial
  bundle 300 bytes; one `loadChildren` for the area cost 140, which is the Stories nav item.

**New lessons**

- EF InMemory orders strings culture-aware, so `OrderBy(NameKey)` and `OrderBy(Name)` give the
  same rows and an order break cannot fail through the API. Prove the order by the unit-tested
  list helper the screen uses (`withByline`), and say so in the test.
- The page behind a CDK Dialog is `inert`, so `getByRole('main')` finds nothing while a dialog is
  open. Assert the page after the dialog closes.
- A break for an honest red must compile with the analysers: `throw;` in a catch that names its
  exception failed the build, and the filter showed no test at all. A typed
  `InvalidOperationException` kept the build and failed both race tests.
- A refusal that names one field the user can see (409 `byline_name_taken`) goes on that field
  alone, while a check that names several draws the summary too, as the `refused` and `invalid`
  mocks show.

**How earlier lessons worked**

- "Check `origin/main` and open PRs for the next ADR number right before each commit": the check
  caught 0092 before anything was pushed, but not 0093, which journey 10 took while this PR was
  open. Check again before every push, not only before the commit that adds the ADR.
- "Regenerate a migration that sorts before main's": `AddBylines` was generated on main's model
  after the rebase, and `AppDbContextModelSnapshot.cs` was taken from main first.
- "The worktree guard refuses compound git commands": git ran alone, and edits went through the
  scratchpad scripts or the Edit tool.
- "Read the initial total after each build": web stayed 278.21 kB; admin went from main's
  280.52 kB to 280.66 kB for the Stories nav item, with every Bylines screen and dialog lazy.

## Journey 20: Edit my listing

**What slowed it**

- The ADR number moved twice. Journey 10 merged 0093 and journey 21 took 0094 while this journey
  was open, so the coordinator assigned 0095. Each renumber touched about 25 files of code
  comments and docs. The index row conflicted at each rebase; both rows were kept. A sweep that
  runs before an untracked test file is staged misses that file.
- The requirement, the mock and the design disagreed on the name limit (100 or 120), on a kind
  control (the dialog has none) and on Focus (drawn read-only). ADR 0095 settled each before the
  first slice.
- Running the design-system and mock generators rewrote every page with CRLF, and pulled in drift
  from other journeys' generator changes. Only the pages this journey touched were kept, as LF.
- The worktree guard refused heredocs and compound git commands. Edit scripts went to the
  scratchpad, and a small `break.py` did each honest-red swap and restore.
- A first break of the photo upload's owner check also failed the "owns nothing" case. The cause
  was the test: `ClearAsync` keeps audit rows, so an earlier case's audited upload leaked in. The
  absence check is now scoped to the member.
- A break that does not compile (`saved === saved`) stops `ng serve` from rebuilding. The spec
  then times out somewhere else, so the break proves nothing. Breaks must still type-check.

**New lessons**

- A field whose codes are new must join the `fieldCodes` whitelist in `ProblemCodes`. Otherwise the
  refusal arrives with no `fieldCodes`, and the test fails with a `KeyNotFoundException`, not a
  wrong code.
- A dialog that stays open after a save (the review alert) must hand the saved result back however
  it closes. It sets `disableClose` and maps Escape from `keydownEvents` to its own close.
  Otherwise the CDK closes with `undefined` and the page drops the save.
- A component in a table cell must not borrow the table's `row-link`: encapsulation means it would
  not get the style anyway. The change line's buttons became `listed-cell__action`, and the mock
  and design-system page now use that class.
- A DTO or command that carries a contact email is a class, not a record, so no generated
  `ToString` can print it. The telemetry test proves the rest: a span event carrying the email made
  it fail.

**How earlier lessons worked**

- "Check origin/main and open PRs for the ADR number": it found 0093 and 0094 taken. The
  coordinator's assigned number ended the race; ask for one when several journeys run at once.
- "Break each rule alone": each of these breaks failed its own tests and was restored:
  - the owner check, the six-tag limit and the published-only photo upload
  - the in-place profile update and the field-versus-generic alert
  - Remove photo, and the review alert's close result
  - the same-change-keeps-its-date row, and "nothing waiting"
  - the staff save dropping a waiting name, the Listed row update and the staff Focus field
- "Read the initial total after each build": web stayed 278.21 kB and admin 280.52 kB. The
  editor, the dialog and the Listed change line all load with their lazy routes.
- "`ng serve` misses library changes on Windows": touching each `public-api.ts` after a contract
  change kept the dev servers current.

## Journey 11: View an event series

**What slowed it**

- The ADR number collided twice. It began as 0094, and the coordinator then assigned 0096. The
  renumber touched about 15 files. At the rebase, the index row conflicted in two commits: in the
  first, both rows were kept; in the second, the old 0094 row was dropped for the 0096 row.
- Journey 20 merged mid-journey and moved the profile read into a static `ListingProfile.OfAsync`
  that the owner's save shares. The Hosting helper became static and takes the context. Main's new
  owner fixtures also needed `series: []`, and only the build after the rebase showed it.
- `EventDetailDto` extends `EventSummaryDto`, which already had a `series?` tag for the By date
  list (journey 10). The detail's `series` is a different shape (the card), so the detail extends
  `Omit<EventSummaryDto, 'series'>`. The e2e fixture's `EventDetail` does the same.
- A `npm test` result read through `grep` printed nothing when the build failed, and a fixture
  missing `series` slipped past one regression run. The exit status showed it.
- The hosted-series row needed `category` for its fallback picture, which the ADR had left out.
  The ADR was corrected in the same slice.
- The worktree guard refused heredocs mixed with `cd` and git. Edit scripts went to the
  scratchpad, and a `breaks.py` applied each break, waited for `ng serve` to rebuild, ran the spec
  and restored the file.

**New lessons**

- When a detail DTO extends a list DTO, check whether the field you add already exists on the
  base with another shape. If it does, `Omit` it, and say so in both contracts.
- Read every regression check by its exit status, written to a log in the scratchpad, never
  through a pipe. That rule is already in AGENTS.md; this journey broke it once and paid for it.
- A button on a tinted card (`series-card__action`, `--btn-bg: surface`) cannot reach the button's
  own token, because `.btn` sets `--btn-bg` itself. A wrapper span that paints the surface keeps the
  look without changing the shared button. Admin, already over its warning, gains nothing.
- To measure a bundle against main without a second worktree, check out main's
  `frontend/projects` over the tree, build that one app, then check out `HEAD` again. Commit
  first, so nothing of yours is lost.

**How earlier lessons worked**

- "Ask the coordinator for the ADR number": it ended the race, though only after the first
  number had spread through the code.
- "Prove in-app routing with a component test": `session-list` and `series-card` each have a
  plain-click and a modified-click case. The e2e sets a `window` flag before the click to prove
  the page was not reloaded.
- "Break each rule alone": each of these breaks failed its own test and was restored:
  - the route, the 404, the sticky aside, retry and host routing
  - "Not recorded", counting cancelled dates as to go, and Details only on the next date
  - the joined panel and "Series full"; `SeriesPlaces` ignoring cancelled or past sessions, or
    going below 0
  - the card never shown, the card's link reloading, and Cancelled unmarked
  - series after one-offs under Hosting, and series rows leading to the event page
- One break passed at first: ignoring `joined` on the card. The joined test only clicked the link
  and never read its words. It now asserts "View series", and the break fails it.
- "Read the initial total after each build": web stayed at 278.21 kB through every slice. Admin
  read 280.52 kB before the rebase and 280.66 kB after. A build of main's own sources gave
  280.66 kB, so the growth is main's, not this journey's.

## Journey 12: Join and leave a series

**What slowed it**

- The journey changed hands mid-slice. Slice 2's API work was on disk, uncommitted and already
  green, so its acceptance tests proved nothing until each rule was broken alone (the route, the
  held filter, the series price, the cancelled filter); every break failed its own test.
- The scratchpad is shared by every agent of a session. Another journey's `brk.py` replaced this
  one's mid-run, and two dev servers wrote the same `web-serve.log`, so a failed rebuild read as a
  success. Scripts and logs now live in a folder named for the journey.
- A `npm run e2e` against `ng serve` failed three unrelated specs on the Vite client's WebSocket
  (`ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`). The same specs pass against the built apps, as
  CI serves them (`CF_SERVE_BUILT=1`), which the full runs then used.
- Heredocs holding `\r\n`, `’` or `won't` broke in the Bash tool; file contents went through the
  Write tool and small Python edit scripts instead.

**New lessons**

- A page object that extends `ErrorScreen` inherits `action(name)`; a locator named `action`
  shadows it and fails another spec with "is not a function". Name screen locators for what they
  are (`panelButton`).
- Leaving a group must also take the member's open connections out of the hub group. The membership
  rule alone refuses their next Join and Send but still pushes messages to a connection that
  joined earlier; a test with a second member sending after the leave caught it.
- A race test for a multi-row write can stand in the rival through the `IAppDbContext` decorator:
  commit the rival's join in a second scope, then throw `DbUpdateConcurrencyException`. Breaking
  the retry, the forget step and the concurrency token each failed a different test.
- A download's text is read with `download.createReadStream()`, never from a path; the iCalendar
  helper has its own case table (escaping, folding at 75 octets, which states are written).
- A mock state added through the generator (`joined-drop-in`) changes only the series pages' state
  bars, the manifest, the index and the README matrix; the generator wrote LF this time.

**How earlier lessons worked**

- "Break each rule alone": every new rule failed its own test, among them the suspended and full
  refusals, the repeat join, the past-session filter on leave, the cancelled places on leave, the
  dialog's focus and failure, the kept-price note and All dates.
- "Read every regression check by its exit status, written to a log": it caught a missing import
  that a stale bundle hid, and a lint error on a type imported only for a doc comment.
- "Read the initial total after each build": web stayed 278.21 kB through every slice; the plan
  options, the calendar helper and the dialog load with the series route or on first use.

## Journey 22: Write and publish stories

**What slowed it**

- The journey was seven slices across two apps' worth of surface: the Stories list, the editor
  with autosave and `story_changed`, the preview, the five status actions, the lead image and the
  Dashboard rows. The context ran out mid-journey; the slice commits and their ADR sections were
  what carried it over.
- The text field's link prefix and the story's runs went through `ngTemplateOutlet` with an
  object-literal context, and plain runs sat in an `ng-container`. Each pulled Angular runtime
  code into `main` (web +0.47 kB, admin +0.42 kB), found only at the end. A diff of the
  `--stats-json` inputs named `_debug_node-chunk` and `_pending_tasks-chunk`, and a diff of the
  `ɵɵ` instructions in development builds named `ɵɵdomElementContainerStart`.
- The crop dialog has no mock, so the lead image uses a centre 16:9 crop, a stand-in recorded in
  ADR 0097. The server keeps the upload whole and the page crops it.
- `dotnet ef migrations add` writes CRLF with a BOM, so an edit script with an LF anchor wrote
  nothing. The analysers also refuse its `new string[0]` default (CA1825).
- `npm run e2e` against `ng serve` failed `legal-change.spec.ts` on the Vite client's WebSocket
  again. One rerun used a port that another session's server held (`reuseExistingServer`). On
  free ports against the built apps (`CF_SERVE_BUILT=1`) the spec passes.

**New lessons**

- To find what grew `main`, diff the `ɵɵ` instructions in two development builds
  (`-c development`, `grep -o "ɵɵ[a-zA-Z0-9]*"`). The new instruction names the template feature.
  Measure main with the branch's new files moved aside, or its old imports fail to build.
- In library templates, write a repeated fragment as a small component, such as `cf-story-runs`,
  or repeat the markup in each branch. A template outlet with an object context and an
  `ng-container` both cost initial bytes once any initial screen uses them.
- An image's size is read from its header bytes (PNG IHDR, the WebP VP8, VP8L and VP8X chunks,
  the JPEG SOF walk) with one case table. A VP8L header is shorter than VP8's, so the minimum
  length is checked per chunk.
- A store action that changes status saves pending edits first (submit and return) or sends the
  fields with it (publish and update). A failed field check comes back as `validation_failed`
  with field codes, which mark the fields and name only the missing ones.
- A Dashboard count shared with other tests of the class is read before and after the test's
  writes (`InReviewCountAsync`). The test's rows sit before anything the others add.

**How earlier lessons worked**

- "Break each rule alone": every status action, the lead rule, the image checks and the Dashboard
  order failed their own tests when broken, through the `brk.py` and `brkb.py` scripts in a folder
  named for the journey.
- "Read the initial total after each build" caught the growth only at the end. It should be read
  after each slice, against main, not against the previous slice.
- "Run the full suite against the built apps": the Vite WebSocket failures did not recur there.

## Journey 3: Staff sign in with Google Workspace

**What slowed it**

- Journey 2 built the shared Google pieces (the OpenID Connect schemes, the external cookie, the
  identity reader, the account match) at the same time. Its commits were cherry-picked unchanged
  as they were pushed, and the staff finish waited for its identity reader; the staff-only slices
  (session key, 12 hours, seed, the screen against fixtures, the docs) went first.
- Every admin API test signed in through the password-and-code helper, so the removal had to wait
  until a Google helper (`Staff.SignInWithGoogleAsync`) could replace it. A regex rewrote the 37
  call sites, asserting the count in each file before writing.
- A commit picked up the previous slice's message file. One message file per commit, written just
  before it, and `git show --stat HEAD` after every commit, caught it before the push.

**New lessons**

- Signing in again with a live cookie reused the server-side session key (ASP.NET Core's cookie
  handler renews the key it read from the request), so a copied cookie inherited the new session.
  A sign-in now signs the old session out and signs in through a fresh handler; one API test per
  app proves the old cookie answers 401.
- Sliding expiration moves `IssuedUtc`, so a maximum session age needs its own item in the
  ticket (`cf.signedInAt`); a ticket without it counts as past the maximum, which covers sessions
  issued before the change without a backfill.
- A `[class.x]` binding was the admin app's first, and pulled 4.3 kB of `@angular/core` into
  `main` from a lazy component. Bisecting the new template by deleting one binding at a time found
  it; an `[attr.class]` computed, already paid for by the Google mark, kept the initial total at
  279.03 kB.
- An unmatched path meets the fallback policy, which reads the member session, so an absent admin
  endpoint answers 401 even to staff. Proving a route is gone needs both sessions on the request,
  and then answers 404 or 405.
- Google's `hd` claim, checked on the server, decides the staff domain; the email's own domain is
  not checked, so test staff keep their `@example.org` emails and a Workspace's secondary domains
  work.
- The email fallback of an account match must bind only an account with no Google subject yet;
  otherwise another Google account with the same email takes the account over. A staff test and a
  member test each break it alone.

**How earlier lessons worked**

- "Read the initial total after each build" caught the 4.3 kB at once, and diffing
  `--stats-json` inputs against the base build named the module.
- "Break each rule alone": the domain check, the chooser on "Try another Google account", the
  finish on return, the 12-hour boundary, the seed's empty password and the account match each
  failed their own test.
- "Serve the built apps for e2e" (`CF_SERVE_BUILT=1`) on free ports kept the runs clear of other
  sessions' servers.

## Journey 2: Join and sign in with Google

**What slowed it**

- Journey 3 built staff sign-in on the same handler at the same time and cherry-picked this
  journey's first four commits. When its PR merged first, the rebase could not recognise them
  (their conflicts had been resolved on the other branch), so `git rebase --onto origin/main
<last shared commit>` replayed only this journey's later slices, and the migration was left out
  of the slice commit and generated after the rebase, after journey 3's.
- An ASP.NET Core quirk cost a round: the ProblemDetails exception handler clears the response's
  headers, so a cookie deleted before a refusal was lost; `Response.OnStarting` deletes it.
- A fake `at_hash` in the fake Google's ID token failed every callback against the real access
  token check; the claim is left out.
- The machine ran out of memory with two `ng serve` servers, Playwright and `dotnet test`
  running together (fork failures); the dev servers were stopped and the built apps served instead.

**New lessons**

- A single-page app cannot follow an XHR's redirect to Google: the start answers `{location}` and
  the page leaves with `location.assign`. The OpenID Connect handler builds the address (state,
  nonce, PKCE) when its challenge is captured instead of sent.
- The handler checks `state`, nonce and the token but not the attempt's age, which lives in a
  correlation cookie the browser keeps; the server stores the start time in the properties and
  refuses an older answer against `TimeProvider`, so a `FakeTimeProvider` test proves it.
- Items the handler keeps in the authentication properties (`cf.*`, the redirect address for the
  code) travel into the external cookie unless removed in `OnTokenValidated`; a test asserting the
  cookie's exact items caught them.
- A telemetry test whose breaks only add span tags passes anyway: the redaction processor keeps
  only the allowed tags. Breaking it honestly means logging the secret, which the analysers refuse
  without a pragma.
- A passwordless account must be checked against the fixed hash, or Identity's hasher fails an
  empty hash at once and the timing tells which emails joined with Google; a recording hasher in
  the handler's test proves which hash was checked.
- The requirement's exact words beat the code's: "Enter your name." carries a full stop that the
  other Join messages do not, and both stacks now say it.

**How earlier lessons worked**

- "Break each rule alone" (scripted, one break per build) proved each Join with Google rule, the
  photo host and scheme checks, the passwordless check and the telemetry test; two breaks that did
  not compile were rewritten until they did.
- "Read the initial total after each build" and the `--stats-json` inputs showed nothing of Join
  in `main`; the total stayed under the 280 kB budget.
- "Serve the built apps for e2e" kept the full run clear of Vite's HMR socket.

## Journey 15: Cancel and restore series dates

**What slowed it**

- The context ran out mid-journey, after slice 1. The slice commits, ADR 0103 and the journey's
  scratchpad folder (`j15/`, with `brk.py` and `brkui.py`) carried it over.
- Measuring the bundle by checking out `origin/main` into the worktree pulled in another
  journey's newer files, because worktrees share origin refs and main had moved. Measure against
  the branch's base commit, not `origin/main`.
- `brk.py` printed nothing when a break did not compile, because it kept only test summary
  lines. It now prints the tail of the output when no line matches.
- `dotnet test --filter` on a freshly added test file sometimes found no tests until the project
  was rebuilt. An exit status of 0 with "No test matches" is not a pass.

**New lessons**

- A system notice (the series chat line) is added in the same unit of work as the change and
  pushed only after the save, so a failure leaves neither. Post it only when the Christian
  Fitness account exists, because the chat history looks up author names in Members.
- A row that changes its action (Cancel date becomes Restore) keeps one button, so focus comes
  back to the same element after the dialog closes or the request answers.
- A read that answers "holds a place" must also check the date's state. Cancelling keeps
  registrations (so a restore can hold them again), so `held` is the registration and not
  cancelled.
- A danger toast on a screen whose toast store has no tone is chosen by its title, through a
  domain helper (`isRestoreFailedTitle`), as manage-listings already did.

**How earlier lessons worked**

- "Break each rule alone": the started check, the series filter, the counts, the audit, the
  notification fan-out, the chat push, the restore's started check and notice, the domain's
  standalone and starting-now rows, the busy state and the danger tone each failed their own
  test.
- "Read the initial total after each slice, against the base": web 278.26 kB and admin 279.04 kB
  stayed flat. The dialog loads on the first Cancel date.
- "Run the full suite against the built apps" (`CF_SERVE_BUILT=1`, free ports) was used for the
  final run.

## Journey 23: Schedule stories

**What slowed it**

- The context ran out after the backend slices; the slice commits, the summary and the scratch
  scripts in the journey's folder carried the frontend slice over.
- The worktree guard refuses compound shell commands and `cd` before git, so every edit went
  through a Python script in the scratchpad with an exact-match assert, and git ran alone. A
  heredoc holding a Python string with an apostrophe broke the shell's quoting; the Write tool
  was the way out for a whole file.
- The machine ran short of memory: `ng serve` for both apps died (exit 127, a Rust allocation
  failure), Playwright workers crashed, and one backend test host ran out of memory. Building the
  apps and serving them with `CF_SERVE_BUILT=1` on free ports with two workers was steady.
- InMemory raises `ArgumentException`, not `DbUpdateException`, on a duplicate key, so the lease
  race double throws `DbUpdateException` itself, as PostgreSQL would.
- Journeys 2 and 3 merged first: `ApiFactory` conflicted on its usings and its background-service
  comment, the migration was regenerated on main's snapshot, and the generated race double still
  listed the two-step tables journey 3 removed.

**New lessons**

- A `BackgroundService` that needs a `PeriodicTimer` on a `FakeTimeProvider` creates it in
  `StartAsync`: .NET 10 runs `ExecuteAsync` on the thread pool, so a timer made there may miss the
  test's first `Advance`. An event raised after each tick (`Ticked`) lets a test await the tick
  through a channel with a timeout instead of sleeping.
- A rule that is also enforced by a catch-up step (a past-due story read as Published, then
  refused) does not go red through the API when only one guard is broken. Break both to see the
  acceptance test fail, and prove each guard alone with its own direct test.
- A read-time effective status in a `GROUP BY` and a `WHERE` is one conditional expression
  (`Status == Scheduled && PublishAt <= now ? Published : Status`), which EF Core turns into a
  `CASE`; the tests prove it on InMemory only.
- A store keeps a choice that is not saved (When, its date and time) across saves and actions
  unless the story's own state says otherwise: a Scheduled story shows its time, and one that
  stops being Scheduled goes back to "now".
- To measure the initial bundle against the base without stashing, commit the slice, check out the
  previous commit's `frontend/projects`, build, and check out `HEAD` again.

**How earlier lessons worked**

- "Break each rule alone" proved the domain guard, the catch-up, the past-time check, the list's
  counts, the lease expiry, the held check, the interval, the audit, the lease race and the
  store's three new rules, through `brk.py` and `brk3.py`.
- "Read the initial total after each slice, against main": both apps' initial totals are the same
  as the base (admin 279.04 kB, web 278.26 kB); the new code is in the editor's lazy chunk.
- "Run the full suite against the built apps": the 386 admin specs passed on built apps.
- "Regenerate a colliding migration on main's snapshot" worked as written; the snapshot diff was
  only the slice's 28 lines.

## Journey 13: Drop in on series dates

**What slowed it**

- The context ran out twice; the slice commits, the summaries and the journey's scratchpad
  scripts (`rep.py` edits with exact-match asserts, `brk.py` for e2e breaks, `brkb.py` for API
  breaks, `ubrk.py` for unit breaks) carried the work over.
- `dotnet test --no-build --filter` right after a build said "No test matches" about one run in
  three; `brkb.py` now runs the filter again until a summary line appears. One break
  (`true || …`) gave "No test matches" every time and was replaced by an equivalent one.
- Playwright workers crashed with 0xC0000409 at the default worker count; two or three workers on
  the built apps (`node e2e/static-server.mjs` on free ports) were steady.
- Slices 2 and 3 could not be committed apart: the booked panel replaced Sign up for a member
  holding a date, so join-series' "join after dropping in" needed Change dates first. They went
  in one commit with slice 4, which shared the same files.
- Journey 15 merged first and made a cancelled date's place a kept registration; the rebase
  conflicted on `GetSeriesQuery` (`held` became "registration and not cancelled"), and the new
  handler had to keep places at cancelled dates instead of giving them up on a change.

**New lessons**

- A set-shaped endpoint (`PUT …/drop-ins` with every date to hold) makes add, remove and "all or
  none" one handler and one retry loop; the client sends what it shows and never a diff.
- A refusal that names things carries numbers in an extension (`sessions: [6]`) and the screen
  words them; `RefusalException.Extensions` already existed for ADR 0099.
- A page-object locator for "the panel's button" must name the primary button once a second
  button (Cancel) can share the block, or every spec using it hits a strict-mode violation.
- A fixture that says "joined" must hold the places a joined member holds; Couch to 5K said joined
  with no date to come held, which the new "You're in for 0 of 5" wording exposed.
- When a later journey changes what `held` means, every handler that removes registrations must be
  checked against it after the rebase, with a test that holds a place at a cancelled date.

**How earlier lessons worked**

- "Break each rule alone": each guard of the handler (full, capacity, price, started, cancelled,
  repeated, suspended only when adding, no drop-in price, the chat leave, the joined price), each
  page rule (register vs join, the full text, busy, booked, change mode, the dialog's Escape and
  full close, Cancel, marks, the confirmation) and each domain row failed its own test.
- "Measure the initial bundle against the base": web stayed at 278.46 kB, measured by checking
  out `origin/main`'s `frontend/projects` (and removing the new dialog folder, which a checkout
  leaves behind) and restoring `HEAD`. The Stop going dialog loads on first use.
- "Run the full suite against the built apps" was used for each slice's last run.

## Journey 24: Read a story

**What slowed it**

- The context ran out twice; the slice commits and the summary carried the work over, and the
  rebase onto journey 23 was resumed mid-way.
- Journey 23 merged first and changed the same story code: `PutStoryAsync` gained parameters on
  both sides, `StoryAnswers.Of` took `now`, and a past-due Scheduled story now reads as Published.
  The story page, Keep reading, the shell and the read count all looked for `Status == Published`
  only, so a due story was missing from each until one `PublishedStories.At(db, now)` query served
  all four. Every hand-written `IAppDbContext` double needed both new sets.
- The story component grew past the 4 kB component-style budget in slice 3, and only the
  production build said so; Keep reading and the Weekly box became `cf-story-more` and
  `cf-story-subscribe` inside `story/`, as `cf-story-runs` already was.
- Docker was not running, so the nginx story location was reviewed but not run through `nginx -t`.

**New lessons**

- After rebasing onto a journey that changes what a status means at read time, grep every query
  of that status in the new code, not only the conflicted files: the compiler caught `Of(story)`
  but not `Status == Published`.
- Build the production app after any slice that adds styles to an existing component: the
  development server does not enforce `anyComponentStyle`.
- A read counter for anonymous visitors works without a cookie: a per-browser log of hashed story
  ids in local storage with a 24-hour window, and per-day tallies on the server with a concurrency
  token and a retry, so a race adds rather than overwrites.
- Playwright's `history.length` counts the initial `about:blank`; a `replaceState` leaves it at 2.

**How earlier lessons worked**

- "Regenerate a colliding migration on main's snapshot" worked again: take main's snapshot, drop
  the slice's migration, regenerate and convert to LF.
- "Honest red" caught a weak reads spec: the first version passed with the window check broken, and
  reading another story after the in-window reload made it fail for the right reason.
- "Read the initial total after each slice": web stayed at 278.49 kB against main's 278.46 kB; the
  story page, its reads and Keep reading are in the lazy chunk.

## Journey 32: Make a Community Pick

**What slowed it**

- The journey changed hands after the first agent stalled for hours with nothing committed past
  slice 2. Its `ng serve` processes for both apps were still running in the worktree and held
  `node_modules` open, so `npm ci` failed with `EBUSY`; listing the processes whose command line
  named the worktree and stopping them cleared it.
- Main moved twice during the journey (journeys 2, 3, 12, 15, 22 and 23). Each rebase replayed the
  first, stale migration commit and needed the migration generated again after main's newest one,
  and every `IAppDbContext` test double added since (the series race, the lease race) needed the
  new `DbSet`. Journey 3 also removed `Staff.SignInWithCodeAsync`, which the pick tests used.
- The design-system generator rewrites every page with CRLF; only the page that changed was kept.

**New lessons**

- A clipboard read in Playwright on Windows answers `\r\n` line ends; the page object turns them
  back into `\n` before comparing with the caption the page wrote.
- A lazily imported module is proven lazy by the scripts the page loads: collect each script
  response's text and look for a call only that module makes (`toBlob`) before and after the
  action. A static import of the renderer failed it at once.
- An output named after a DOM event (`copy`) fails angular-eslint's `no-output-native`; the
  caption's output is `copyCaption`.
- A row of `cf-table` can carry a quiet link before its action (`quietLink`), followed in the app
  through `navigate`; "Make it a pick" uses it rather than a second table.
- An "upcoming" rule in a list read with the real clock needs `page.clock.setFixedTime` in the
  spec, since the cast's fixtures are dated April 2026; `setFixedTime` keeps timers running, so
  zoneless rendering is unaffected.

**How earlier lessons worked**

- "Break each rule alone": the singular spot, the Slack `|` escape and the date's day each failed
  their own caption case; the Copied timer, the past-event filter on "Make it a pick", Join's kept
  return address, the guard's Join redirect and the lazy renderer each failed their own spec.
- "Read the initial total against main, not the previous slice": admin 279.12 kB against main's
  279.11 kB (the Community Pick navigation item, as ADR 0098 expects) and web 278.46 kB, the same
  as main.
- "Serve the built apps for e2e on free ports" (`CF_SERVE_BUILT=1`): the full run of 880 specs
  passed with no Vite socket failures.

## Journey 16: Record event attendance

**What slowed it**

- The context ran out once; the slice commits, the summary and the scratchpad scripts (`rep.py`,
  `brkb.py`, `brkui.py` for e2e breaks on the built apps, and a new `brku.py` for unit breaks)
  carried the work over.
- The worktree guard refused any Bash call that mixed `git` with other commands or edited files
  through a long pipeline; git ran alone, and edits went through `rep.py` or the Edit tool.
- A Moderator opening the Attendance tab saw "Admins only": the client guard decides by the first
  path segment, so `events/:id/attendance` needed its own rule (`canOpen`) beside the server's
  full-template area (ADR 0106).
- Two unit breaks passed at first: restoring a failed box to "the opposite of what it shows" and a
  looser attendance path. Each got a row that tells the two apart (a box ticked twice before its
  save failed; a Moderator at `/events/attendance`).

**New lessons**

- A staff area narrower than a route's first segment is matched on the full route template on the
  server, and the client guard needs the same rule; a test of each role at that path covers both.
- A tick that saves itself needs one request per row in flight: a tick made while it is busy is
  sent when the first answers, so the last tick wins and a failure restores the last saved value,
  not the opposite of the box.
- A page that recomputes its table rows on every tick redraws every box; keep the rows tied to the
  loaded list and read each box's state through a lookup signal, so a tick redraws one box.
- A checkbox in a table whose visible label repeats on every row ("Came") needs an accessible name
  that says whose box it is (`aria-label="Came: <name>"`); the design system's checkbox gained
  `ariaLabel` and `busy` rather than the page adding attributes.
- A new nullable field on a DTO the member reads breaks every exact-keys test of it; add the key
  there and assert the null in the same change.

**How earlier lessons worked**

- "Break each rule alone": each handler guard (started, registered, unchanged, the race retry,
  who recorded it, the audit action, the count's event filter), each tracker rule, each page rule
  (busy, the danger toast, the per-row name) and each series row and progress case failed its own
  test.
- "Measure the initial bundle": before the rebase, admin stayed at 279.11 kB and web at
  278.46 kB, as on main. After the rebase onto journeys 24 and 32 they read 279.12 kB and
  278.49 kB. The page, its tracker and the toast region load with the route.
- "Run the full suite against the built apps" with two workers was steady.

## Journey 26: Follow stories by RSS

**What slowed it**

- The output cache is shared by every test of a class, and the story tests put stories straight in
  the store, which evicts nothing. A rate-limit test that read `/feed` 120 times on an empty store
  kept an empty feed for the next test, and an unpublish test kept a Training feed for the
  conditional test. CI then ran the cache tests in another order and the unpublish test read the
  Training feed the conditional test had kept. Every test that puts stories straight in the store
  now evicts every feed before its first read (`StoryFeeds.EvictAllAsync`).
- Two break runs did not compile: removing the eviction call left the handler's `feeds` parameter
  unread (CS9113, analysers run on every build). The break replaces the call with `_ = feeds;`.
- The full e2e run on two workers failed two specs this journey does not touch
  (`event-chat` "Earlier messages" and the admin Stories skeleton); both passed alone on one
  worker while other sessions' builds and test hosts shared the machine.
- The worktree guard refused heredocs that wrote files and multi-command lines; the Write tool and
  small Python edit scripts with exact-match asserts did the edits.

**New lessons**

- A conditional-request rule has two paths: the output cache answers 304 itself for a kept feed,
  so an API test that only repeats a kept request passes with the handler's rule broken. Evict
  first to prove the handler's comparison, then repeat after a 200 to prove the cache's.
- A `Last-Modified` taken as the newest of a feed's items can go back when an item leaves it
  (unpublished or moved), and a reader sending only `If-Modified-Since` would get a wrong 304. Take
  it over every story that has ever gone out; the fake clock must move on before the change, or
  every change lands in the same second.
- An endpoint outside `/api` sets no antiforgery cookie, because `UseAntiforgeryTokens` adds it
  only to `/api` answers; widening that check alone turned the no-cookie assertion red.
- A footer variant's link text read through `allTextContents()` keeps the space between the icon
  and the word; trim it in the page object.

**How earlier lessons worked**

- "Break each rule alone": the published filter (future and due Scheduled stories), raw summary
  markup, the section filter, the 30-story limit, the Pros feed, the rate limit, the antiforgery
  path, the validators, the output cache, each eviction (publish, update's old section, unpublish,
  the clock) and the unpublished `Last-Modified` each failed their own test.
- "After rebasing onto a journey that changes what a status means at read time, grep every query":
  the feed reads through `PublishedStories.At`, so a due Scheduled story is in it at its time.
- "Read the initial total after each slice, against the base": web stayed at 278.49 kB and admin
  at 279.11 kB; the footer's news variant reuses the `@if` blocks the footer already paid for.
- Docker was not running again, so the two nginx feed locations were reviewed, not run through
  `nginx -t`.
