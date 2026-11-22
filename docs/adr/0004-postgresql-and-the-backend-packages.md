# 0004. PostgreSQL, and the packages of the backend skeleton

## Status

Accepted, 22 November 2026 (slice 1.2).

## Context

Slice 1.2 creates the clean-architecture backend that `AGENTS.md` describes: `Domain`,
`Application` (MediatR handlers, FluentValidation validators), `Infrastructure` (EF Core,
migrations), `Api` and `Cli`. The detailed designs left the database engine open
(`EF Core; engine <TO SUPPLY>`), and the first migration cannot be written without one. Two of the
libraries the rules name changed their terms recently: MediatR 13 and later need a commercial
licence key, and the OpenTelemetry EF Core instrumentation is still a pre-release package.

## Decision

- **PostgreSQL**, through `Npgsql.EntityFrameworkCore.PostgreSQL` 10, is the production database.
  It is free and open source, runs on every host and every cloud, has first-class EF Core support
  (migrations, `xmin` concurrency tokens for slice 6.2, case-insensitive collations for emails),
  and a local server is one container. Tests never use it: they run on EF Core InMemory, one store
  per fixture, as `AGENTS.md` requires.
- **Keys** are `Guid.CreateVersion7()`, which the designs' opaque ids allow and PostgreSQL's
  `uuid` indexes well.
- **MediatR 12.5.0**, the last release under the Apache 2.0 licence. Moving to 13 or later needs a
  licence key and a new ADR.
- **FluentValidation 12** with its dependency-injection extensions.
- **OpenTelemetry**: the stable `OpenTelemetry.Extensions.Hosting`,
  `OpenTelemetry.Instrumentation.AspNetCore` and `OpenTelemetry.Exporter.OpenTelemetryProtocol`
  packages, and `OpenTelemetry.Exporter.InMemory` in the API tests. The pre-release EF Core
  instrumentation is left out until a slice queries the database from a request.
- **Versions** are pinned once, in `backend/Directory.Packages.props` (central package
  management), and `dotnet-ef` is a local tool in `backend/dotnet-tools.json` (`dotnet tool restore`).

## Consequences

- `cf migrate` needs a reachable PostgreSQL server and `ConnectionStrings__Default`
  (`docs/operations/settings.md`); the API and its tests do not.
- Behaviour InMemory cannot show (unique-index violations, concurrency conflicts) is injected
  through `IAppDbContext` in tests, as `AGENTS.md` already says.
- A later switch of engine means regenerating the migrations; nothing above `Infrastructure`
  names the provider.
