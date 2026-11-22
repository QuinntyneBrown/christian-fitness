# 0001. Angular 22 workspace: two apps, three source libraries

## Status

Accepted, 22 November 2026 (slice 1.1).

## Context

`AGENTS.md` mandates one Angular workspace in `frontend/` with the applications `web` (members)
and `admin` (staff), the libraries `components`, `domain` and `api`, and Playwright in
`frontend/e2e/`. It asks for current Angular: standalone, signals, `OnPush`, zoneless, one
selector prefix, file per type, and tight initial-bundle budgets (L2-035).

## Decision

- **Angular 22.3** (the current stable release on 22 November 2026), created with
  `npx @angular/cli@latest new frontend --create-application=false`, then
  `ng generate application web|admin --prefix=cf --style=scss --routing --ssr=false` and
  `ng generate library components|domain|api --prefix=cf`. TypeScript 6.0 and the
  `@angular/build:application` builder (esbuild).
- **Defaults kept, not restated.** In Angular 22, standalone components, zoneless change
  detection and `OnPush` are the defaults, so no component sets `changeDetection` and
  `app.config.ts` has no zone provider. angular-eslint's
  `prefer-on-push-component-change-detection` refuses `ChangeDetectionStrategy.Eager`.
- **Libraries are compiled from source.** The libraries are not built or published on their own:
  `tsconfig.json` maps `@cf/components`, `@cf/domain` and `@cf/api` to each library's
  `src/public-api.ts`, and each app's build compiles what it imports, so tree shaking and lazy
  chunks work across the boundary and there is no library build step. Their `build` targets are
  removed from `angular.json`.
- **No unit-test target yet.** The CLI's unit-test builder (Vitest) refuses a run with no spec
  file, and no library has a helper yet. The first slice that adds a helper to `domain` adds its
  `test` target, `"builder": "@angular/build:unit-test"` with
  `"buildTarget": "web:build:development"` and `"tsConfig": "projects/domain/tsconfig.spec.json"`
  (checked in slice 1.1 with a throwaway spec), plus `vitest` as a dev dependency and an
  `npm test` script. Unit tests run locally, not in CI (AGENTS.md).
- **Selector prefix `cf`**; class names omit it (`App`, `StartPage`).
- **Foundations per app.** Each app's `src/styles.scss` loads `src/foundations/`: a byte-for-byte
  copy of `docs/design-system/tokens/tokens.css` (excluded from Prettier so it stays identical)
  and of the self-hosted woff2 fonts at the same relative path, a reset taken from the design
  system's foundations, and utilities. The builder fingerprints the fonts into `media/`.
- **Budgets** (the `production` configuration of each app): `initial` 220 kB warning and 250 kB
  error, `anyComponentStyle` 2 kB warning and 4 kB error. Slice 1.1 measured an initial total of
  212.29 kB for each app (192.26 kB JavaScript, 20.02 kB CSS).
- **Playwright** lives in the workspace (`frontend/playwright.config.ts`, specs in `frontend/e2e/`),
  one project per app (`web` on port 4310, `admin` on 4311; `CF_WEB_PORT` and `CF_ADMIN_PORT`
  override them), Chromium only, each app started with `ng serve`.

## Consequences

- One `npm ci` installs everything the frontend needs; `npm run build` builds both apps and fails
  on an error budget.
- A library cannot be consumed outside this workspace without adding a build target first.
- The two copies of `tokens.css` must be refreshed together whenever the design system changes;
  `diff docs/design-system/tokens/tokens.css frontend/projects/web/src/foundations/tokens/tokens.css`
  shows drift.
