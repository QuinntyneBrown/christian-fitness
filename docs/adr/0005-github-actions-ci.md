# 0005. GitHub Actions CI: two sparse jobs, five-minute timeouts, no retries

## Status

Accepted, 22 November 2026 (slice 1.3).

## Context

`AGENTS.md` asks for CI on GitHub Actions that is always green, under five minutes, never retried,
and that runs lint, build and one critical acceptance path per feature while unit tests run
locally. L2-042 states what it checks. The repository holds two stacks, `frontend/` (Angular,
Playwright) and `backend/` (.NET 10), which share no build step.

## Decision

- **One workflow,** `.github/workflows/ci.yml`, on every push to `main`, every pull request against
  it and by hand (`workflow_dispatch`). A newer run for the same ref cancels the older one. The
  token is read-only (`contents: read`) and no secret is used.
- **Two jobs side by side,** `frontend` and `backend`, on `ubuntu-latest`. Each checks out only its
  own folder (sparse checkout), so a spec or a test that reads a file outside its project fails in
  CI as `AGENTS.md` warns.
- **A five-minute timeout on each job.** A run that would break the five-minute rule fails and is
  fixed, never waited out. Measured on this slice: about 1 min 30 s with cold caches and under
  45 s with warm ones.
- **Caches:** npm through `actions/setup-node` (keyed by `package-lock.json`); the Playwright
  headless Chromium in `~/.cache/ms-playwright`, keyed by the installed `@playwright/test`
  version and downloaded only on a miss (`--only-shell`, the only browser the specs use; the
  runner image already has its system libraries); NuGet in `$NUGET_PACKAGES`, keyed by
  `Directory.Packages.props` and every `*.csproj`.
- **Behaviour specs run against `ng serve`,** as `playwright.config.ts` already says, rather than a
  second server for the production build: both apps compile in seconds and it keeps one way to run
  the specs, locally and in CI.
- **The backend runs only its acceptance tests through the API** (`ChristianFitness.Api.Tests`);
  `ChristianFitness.Application.Tests` is compiled with warnings as errors but run locally, as
  unit tests are.
- **No retries anywhere:** `retries: 0` in `playwright.config.ts` and no re-run step. When the
  specs fail, their traces are kept as the `playwright-report` artifact for seven days.
- **Actions are pinned to their major version** (`actions/checkout@v5`, `actions/setup-node@v5`,
  `actions/setup-dotnet@v5`, `actions/cache@v4`, `actions/upload-artifact@v4`). They are GitHub's
  own; a third-party action, if one is ever added, is pinned to a commit SHA.

## Consequences

- A new check joins the job of its stack as its own named step, so a failure names it.
- A slice that makes CI slower than five minutes splits a job (for example the specs into their own
  job) rather than raising the timeout.
- Branch protection (requiring `Frontend` and `Backend` before merging) is set in the repository's
  settings by its owner; the workflow does not need it to run.
