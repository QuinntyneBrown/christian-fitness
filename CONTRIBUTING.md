# Contributing to Christian Fitness

Thank you for your interest in contributing. This document explains how to report issues,
propose changes and get a pull request merged.

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report a bug:** open a GitHub issue with steps to reproduce, the expected and actual
  behaviour, and your browser or OS.
- **Suggest a feature:** open an issue describing the problem it solves for members or
  staff. Large changes should be discussed before any code is written.
- **Improve the docs:** requirements, designs, mocks and the design system live in `docs/`.
- **Submit code:** see the workflow below.

## Before you start

Read [AGENTS.md](AGENTS.md). It is the single source of engineering rules for this
repository (folder structure, frontend and backend conventions, testing, lazy loading and
memory). A departure from it needs an architecture decision record in `docs/adr/`.

## Development workflow

Every change to user-facing product code needs, in this order:

1. A **requirement** in `docs/specs/`.
2. A **detailed design** in `docs/detailed-designs/`.
3. A **mock** in `docs/mocks/` for any visible change.

Then implement in small slices using acceptance-test-driven development:

1. Write Given-When-Then acceptance criteria for the slice.
2. Write the acceptance test (backend: through the API; frontend: Playwright with page
   objects) and watch it fail for the expected reason.
3. Implement only that slice.
4. Refactor while green and run the regression checks.

Documentation, mocks and test-only changes are exempt from this flow.

## Pull requests

1. Fork the repository and create a branch from `main`
   (for example `feat/event-registration` or `fix/chat-scroll`).
2. Keep each pull request focused on one slice or concern.
3. Make sure lint, build and tests pass locally:

   ```sh
   cd frontend && npm run lint && npm run build && npm test && npx playwright test
   cd backend && dotnet build && dotnet test
   ```

4. Write clear commit messages in the imperative mood (`Add event registration endpoint`).
5. Open the pull request against `main`, link the related issue and describe what changed
   and how you verified it.
6. CI must be green. A maintainer reviews every pull request before merging.

## Coding standards

- Prettier and angular-eslint own frontend formatting and linting; CI fails on either.
- Backend follows clean architecture; business rules live in handlers and domain services.
- Meet WCAG 2.2 AA: every interaction works by touch and keyboard, and colour is never the
  only carrier of a state.
- Never log contact details, tokens, message text or faith details.

## Licensing

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
