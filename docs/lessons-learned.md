# Lessons learned

One entry per slice of [journeys.detailed.md](journeys.detailed.md), added before the slice
merges. Read this file before starting a slice and apply what fits.

Each entry records what slowed the slice, the new lessons it taught and how earlier lessons
worked when applied. Newest entries go at the bottom.

**% complete:** 2% (1 of 54 slices; 2 of 83 days)

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
