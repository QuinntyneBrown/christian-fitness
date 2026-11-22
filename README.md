<p align="center">
  <img src="docs/assets/logo.svg" alt="Christian Fitness logo" width="120" height="120">
</p>

<h1 align="center">Christian Fitness</h1>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
</p>

Christian Fitness is a Christian community for health in body and spirit in the Greater
Toronto Area. It is delivered as two web apps:

- **Web app (members):** find and register for events (runs, workouts, basketball,
  mobility, workshops, retreats), keep going together in event group chats and direct
  messages, build a profile, and book vetted Christian professionals (trainers,
  dietitians, physiotherapists, counsellors).
- **Admin web app (staff):** publish and manage events, review professionals'
  applications and listings, and moderate members.

> **Status:** early development. Requirements, HTML mocks and the design system are in
> `docs/`. Application code (`frontend/`, `backend/`) is being built in incremental slices.

## Contents

- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Security](#security)
- [Support](#support)
- [License](#license)

## Architecture

| Layer    | Technology                                                                    |
| -------- | ----------------------------------------------------------------------------- |
| Frontend | Angular (standalone, signals, `OnPush`, zoneless), CDK, Playwright for E2E    |
| Backend  | .NET clean architecture: Domain, Application (MediatR), Infrastructure (EF Core), Api (controllers, SignalR) |
| Telemetry| OpenTelemetry                                                                 |
| CI       | GitHub Actions: lint, build and one critical acceptance path per feature      |

## Repository layout

```text
├── frontend/          Angular workspace
│   ├── projects/
│   │   ├── web/       member app
│   │   ├── admin/     admin app
│   │   ├── components/ presentation components
│   │   ├── domain/    pure rules and helpers
│   │   └── api/       contracts: DTOs, service interfaces, injection tokens
│   └── e2e/           Playwright specs, page objects and the shared fixture
├── backend/
│   ├── src/           ChristianFitness.{Domain,Application,Infrastructure,Api,Cli}
│   └── tests/         ChristianFitness.{Application,Api}.Tests
└── docs/              specs, detailed designs, mocks, design system, ADRs
```

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) LTS and npm
- [.NET SDK](https://dotnet.microsoft.com/download) (current LTS)
- Git

### Clone

```sh
git clone https://github.com/QuinntyneBrown/christian-fitness.git
cd christian-fitness
```

### Browse the mocks and design system

The mocks and design system are static HTML. Serve the `docs` folder and open it in a
browser:

```sh
npx http-server docs -p 8080
# then open http://localhost:8080/mocks/ or http://localhost:8080/design-system/
```

### Frontend

```sh
cd frontend
npm ci
npx playwright install chromium   # once, for the end-to-end specs
npm start                         # the member app on http://localhost:4200
npm run start:admin               # the admin app on http://localhost:4201
npm run lint                      # ESLint, including the dependency direction (docs/adr/0002)
npm run format:check              # Prettier
npm run build                     # both apps, failing beyond the angular.json budgets
npm run e2e                       # Playwright behaviour specs; serves both apps on 4310 and 4311
CF_SWEEPS=1 npx playwright test --grep @sweep   # visual, responsive, a11y and heap sweeps, on request
```

### Backend (once `backend/` lands)

```sh
cd backend
dotnet build
dotnet test
dotnet run --project src/ChristianFitness.Cli -- migrate   # the API never migrates on startup
dotnet run --project src/ChristianFitness.Api
```

## Documentation

| Path                     | Contents                                     |
| ------------------------ | -------------------------------------------- |
| `docs/specs/`            | L1 and L2 requirements                       |
| `docs/detailed-designs/` | Per-feature software design documents        |
| `docs/mocks/`            | HTML mocks for every screen and state        |
| `docs/design-system/`    | Tokens, foundations, components and patterns |
| `docs/adr/`              | Architecture decision records                |
| `AGENTS.md`              | Engineering rules for people and AI agents   |

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue
or pull request. Everyone taking part is expected to follow the
[Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Please do not report security vulnerabilities through public GitHub issues. See
[SECURITY.md](SECURITY.md).

## Support

See [SUPPORT.md](SUPPORT.md) for how to get help.

## License

Copyright (c) 2026 Quinntyne Brown. Licensed under the [MIT License](LICENSE).
