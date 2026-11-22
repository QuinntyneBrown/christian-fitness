# 0002. eslint-plugin-boundaries enforces the dependency direction

## Status

Accepted, 22 November 2026 (slice 1.1).

## Context

`AGENTS.md` says libraries depend one way and never import an app, presentation components use
no app service, token or router, and ESLint enforces the boundaries. The workspace is a plain
Angular CLI workspace, not Nx, so `@nx/enforce-module-boundaries` is not available, and
`no-restricted-imports` cannot tell a relative import into another project from one inside it.

## Decision

Use **eslint-plugin-boundaries** (v7, rule `boundaries/dependencies`) in
`frontend/eslint.config.js`, resolving the `@cf/*` path aliases with
`eslint-import-resolver-typescript`:

| From                        | May import                                                                        |
| --------------------------- | --------------------------------------------------------------------------------- |
| `web`, `admin` (type `app`) | `components`, `domain`, `api`                                                     |
| `components`                | `api`, **type imports only** (`import type`): no token, service or other value    |
| `domain`                    | `api`                                                                             |
| `api`                       | nothing in the workspace                                                          |

The default is `disallow`, so an app importing the other app, or any library importing an app,
is an error. Imports inside one project are not checked. A new library is added to
`boundaries/elements` and to this table in the same change.

The same config also enforces, through angular-eslint: the `cf` selector prefix, no inline
`template` or `styles` (`component-max-inline-declarations` at 0), no `style` attribute in a
template, no `ViewEncapsulation.None`, `OnPush`, and the template accessibility rules. Prettier
owns format (`eslint-config-prettier` comes last).

## Consequences

- `npm run lint` (`eslint .`) fails on a wrong-way import and names both element types. In slice
  1.1 a throwaway file for each forbidden direction failed (`api` to `domain`, a value import from
  `api` in `components`, `domain` to an app, `web` to `admin`) while the allowed imports passed.
- Type-only imports from `api` keep DTO types available to presentation components while tokens
  stay out of them.
