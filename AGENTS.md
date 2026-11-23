# Christian Fitness

Christian Fitness is "a Christian community for health in body and spirit" in the Greater
Toronto Area, delivered as two web apps:

- **Web app** (members): find and register for events (runs, workouts, basketball, mobility,
  workshops, retreats), keep going together in event group chats and direct messages, build a
  profile, and book Christian professionals the team has vetted (trainers, dietitians, physios,
  counsellors).
- **Admin web app** (staff): publish and manage events, approve or decline professionals'
  applications and manage their listings, and moderate members (Active, Flagged, Suspended).

## Folder structure (mandated)

```text
├── frontend/                Angular workspace: angular.json, ESLint, Prettier, Playwright
│   ├── projects/
│   │   ├── web/             member app: app.config.ts, routes, pages, dialogs
│   │   ├── admin/           admin app, same shape as web
│   │   ├── components/      presentation components (inputs/outputs only, BEM)
│   │   ├── domain/          pure rules and helpers, with unit tests
│   │   └── api/             contracts: DTO types, service interfaces, injection tokens
│   └── e2e/                 Playwright specs, page-objects/, fixtures/
├── backend/
│   ├── src/                 *.Domain, *.Application, *.Infrastructure, *.Api, *.Cli
│   └── tests/               *.Application.Tests, *.Api.Tests (* = ChristianFitness)
├── tools/                   video-record/, video-audio/, video-build/: make the slice films
└── docs/                    specs/, detailed-designs/, mocks/, design-system/, adr/, videos/
```

Apps use `components`, `domain` and `api`; the other two use only `api`. New folders go here.

## Prefer best practice

Choose the platform's established best practice (Angular, .NET, Playwright, WCAG) over the
expedient way. A departure needs an ADR giving its reason. If a rule here or in an ADR conflicts
with best practice, say so and propose the correction; do not work around it silently.

## Frontend

- **Dependency direction.** Libraries depend one way and never import an app; `app.config.ts` is
  the composition root and binds every token. ESLint enforces the boundaries, and a new library
  joins this rule and them in the same change. Prefer small libraries that lazy-load on their
  own. A third application needs an ADR.
- Prettier and angular-eslint own format and lint; CI fails on either. Current Angular:
  standalone, signals for state, `OnPush`, zoneless. Selectors use one prefix; names omit it.
- **Presentation lives in a components library**: inputs and outputs only, no app service, token
  or router. Pages and dialogs that orchestrate stay in the app.
- **Every design-system component is built once and reused (mandatory).** Each component in
  `docs/design-system/components/` is implemented in the components library under its
  design-system name (`components/src/<name>/`), with that page's block name, anatomy, variants,
  states and tokens. Screens compose those components. Before writing markup, find the
  design-system component for it; if it is missing, build it in the library first. Never create
  a component that duplicates or renames one (no `form-alert` for `alert`, no `app-header` for
  `top-bar`). A composite with no design-system equivalent is built from library components.
- **File per type**: `name.ts` + `name.html` + `name.scss` with `templateUrl`/`styleUrl`; no
  inline `template`, `styles` or `style` attribute.
- **One encapsulated BEM stylesheet per component**, never `ViewEncapsulation.None`. The block is
  named as in the design system; a state assistive technology must know is an attribute
  (`aria-current`, `aria-invalid`, `aria-pressed`, `disabled`) and is styled through it. Never
  style another block. Keep the mocks' BEM classes: e2e locators depend on them.
- Global styles are foundations only (tokens, `@font-face`, reset, utilities). Read tokens by
  role, never hex. Fonts are bundled and self-hosted, never from a CDN.
- **Declare each `ng-content` slot once**: a component rendering `<a>` or `<button>` by condition
  puts its slots in one `<ng-template>` shown by `ngTemplateOutlet` in both branches; a consumer
  puts one `@if` on each `[slot=…]` node (NG8011).
- Logic with many cases (a store, a tracker, a pure helper) lives in a service or helper with
  unit tests, never in a component. Each service has a contract and an injection token that
  components depend on; a real-time client is one, and no component opens its own connection.
- **No inline forms or hand-rolled modals**: editing opens a CDK Dialog or a screen.
- A contract refuses with an error `code` a screen branches on; the user sees a generic message.
  User-supplied names and error strings are rendered as text, never as HTML.
- Every interaction works by touch and by keyboard; touch targets are at least 44 × 44 px;
  colour is never the only carrier of a state.

## Backend

Clean architecture: `Domain` (entities, zero deps) ← `Application` (MediatR handlers,
validators, DTOs, `IAppDbContext`) ← `Infrastructure` (EF Core, migrations, auth) ← `Api`
(controllers, SignalR hubs).

- Business rules live in handlers and domain services; a controller or hub method checks
  nothing and sends one MediatR request.
- The API does not migrate on startup; a CLI command does. Seed data is idempotent.
- Endpoints require authentication by default (fallback policy); `[AllowAnonymous]` is explicit.
  Admin console endpoints require a staff authorization policy.
- Errors are ProblemDetails with a `code` extension where a client branches on them.
- Telemetry is OpenTelemetry. No log, metric or span carries a contact detail, a token, message
  text, a query string or a body; a route is recorded as its template.
- A person sees and changes only their own data and the groups they belong to. Home church and
  other faith details are optional, sensitive personal data, never required and never logged.
- A setting a deployed system needs is documented in the same change.

**Backend tests.** No real database: EF Core InMemory, one store per fixture, faults injected
through `IAppDbContext`. Never sleep: await an event with a timeout that names what did arrive,
or advance `FakeTimeProvider`. Hub tests connect a real SignalR client to the in-memory server.
The acceptance test through the API proves each slice; a rule with a table of cases also gets a
direct test of the domain type or handler, one case per row.

## E2E (Playwright) and CI (GitHub Actions)

- No real backend or database: fixtures answer API and hub requests. An unanswered request, a
  request off localhost or a page error fails the spec.
- One page object per screen or dialog owns the selectors; no selector in a test. Specs import
  `test`/`expect` from the shared fixture. Chromium only.
- Only behaviour specs run by default. Visual, responsive, accessibility and heap sweeps are kept
  current but run only when a person asks; update baselines only after an intended mock change.
- Unit tests advance a fake clock for time-driven rules; never sleep.
- CI is always green and under 5 minutes; a flaky or slow check is fixed or removed, never
  retried. It runs lint, build and one critical acceptance path per feature; unit tests run locally.

## Lazy loading and memory (the top frontend priority)

The app stays as smooth after an hour on a low-power device as at the start; this outranks every
other frontend rule. A change that grows the initial bundle or leaks memory is not done.

- **Load only what is needed now.** Every route uses `loadComponent`/`loadChildren`; heavy or
  below-the-fold UI uses `@defer`; large libraries (maps, video, charts) and feature libraries are
  imported dynamically. Keep `angular.json` budgets tight; raising one needs a stated reason.
- **Release everything you acquire** when its owner is destroyed: subscriptions
  (`takeUntilDestroyed`), timers, `requestAnimationFrame` loops, listeners, observers,
  `AbortController`s, object URLs, media elements and SignalR handlers.
- **Bound what grows.** Session data (chat messages, event and member lists) uses a fixed-size
  or windowed buffer, or is persisted and dropped.
- **Scope state to its use.** A screen's services go on its routed component's `providers`
  (route providers outlive the visit), not in `root` unless the whole app shares them.
- **Prove it.** A heavily allocating feature keeps a stable heap over repeated visits (on request).

## Incremental implementation and ATDD (mandatory for product code)

Every change to user-impacting product code (the app, its libraries, the backend) needs a
requirement, a detailed design and a mock first. Mocks, designs, the design system, docs,
test-only changes and a marketing site are exempt and get no tests.

Invoke and follow the `implementing-incrementally` skill, with ATDD: small slices, one at a time.
For each, write Given-When-Then criteria, write the acceptance test (backend: through the API;
frontend: Playwright with page objects), see it fail for the expected reason, implement only that
slice, refactor green and run the regression checks. No bulk implementation, no tests added
afterwards, no weakening tests. Keep requirement, design, mock, tests and code aligned. Never
write architecture tests (structure, naming, banned APIs, traceability); tests prove behaviour.

Before a slice of `docs/journeys.detailed.md`, read `docs/lessons-learned.md` and apply what
fits; before it merges, add its entry (what slowed it, new lessons, how earlier ones worked) and
update **% complete** there and in `docs/journeys.md`.

## Development

- **Workspace.** A worktree and its own `npm ci` per slice, never a symlinked `node_modules`;
  stage named paths; never stash or overwrite another session's work; use a free port.
- **Shell.** Judge a command by its exit status, never through a pipe; `cd` to absolute paths;
  quote zsh globs; BSD `sed` has no `\b` and macOS no `timeout`.
- **Edit scripts.** Take old text from the file as it is now (formatters rewrap), assert every
  match in every file before writing any, and never commit in the same command.
- **Before code.** Check what earlier slices built; the requirement's exact words beat a plan's
  summary; find the screen that hosts new UI; add a missing mock state, or record a stand-in in
  an ADR, rather than invent.
- **Honest red.** A test that passes at once or came after the code proves nothing until you
  break the rule, watch it fail for that reason and restore it. Work expected values from the
  fixture's numbers, make bad data bad by construction, and prove an absence by exact keys.
- **Initial bundle.** The first use of an `@angular/core` or CDK API, even in lazy code
  (`effect`, `@defer`, `afterNextRender`, `rxResource`, Dialog), can grow `main`: read the
  initial total after each, diff `--stats-json` inputs against the base, and reuse what is paid for.
- **Angular.** A lazily created component needs its tokens bound where it is created. Use
  `booleanAttribute` for attribute inputs; never name an output for a DOM event; whitespace
  between elements is dropped (`&ngsp;`); a ref on a component host needs `read: ElementRef`;
  close a CDK Dialog by its ref before navigating; sibling routes share a connection only
  through their parent.
- **Shared fixture.** It answers guards and common endpoints by default; a new guard, default or
  call in a shared flow means grepping its specs and running the whole suite. Fixture failures
  are handlers; await every fixture call; fake third-party scripts at their URL; read no file
  outside the project (CI checks out sparsely).
- **Playwright's clock.** A paused clock stalls zoneless rendering, lazy loads, navigation and
  SignalR: step frames with `toPass({ intervals: [0], timeout })` and resume before navigating.
  `fastForward` fires each timer once. Pin times to the installed clock, in UTC. Playwright waits
  on `aria-disabled`: reach such a control by focus and key.
- **Backend tests.** A class's tests share a store and a `FakeTimeProvider` in any order: start
  past rate windows, keep background services out of the shared host, advance to each threshold.
  InMemory raises no `DbUpdateException`, so inject it. Analysers run on tests too.
- **Contracts.** A hub refusal is an answer with a `code`, never a thrown exception (SignalR hides
  its message). Serve numbers as fields, never words. A rule computed in both stacks shares one
  inline case table and tolerance in both suites.
- **Shots.** Check screens against the richest mock and every value a component can receive;
  render every diagram touched; create media and heavy resources only when first wanted.
