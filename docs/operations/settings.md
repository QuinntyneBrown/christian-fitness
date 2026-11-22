# Settings

Every setting a deployed Christian Fitness system needs, by the process that reads it. A change
that adds or changes a setting edits this page in the same change (L2-041 AC3).

Settings are ordinary .NET configuration: set them as environment variables (a `:` in a key is
written `__`), never in a committed file. Secrets (passwords, connection strings) come from the
host's secret store. No setting is logged.

## API (`ChristianFitness.Api`)

| Setting                       | Required | Purpose                                                                                                   | Example                                                                     |
| ----------------------------- | -------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `ConnectionStrings__Default`  | Yes      | The PostgreSQL database (ADR 0004). The API reads and writes it and checks it for readiness; it never migrates it. | `Host=db;Port=5432;Database=christian_fitness;Username=cf_api;Password=…` |
| `ASPNETCORE_ENVIRONMENT`      | No       | `Production` (the default when unset) or `Development`.                                                   | `Production`                                                                |
| `ASPNETCORE_URLS`             | No       | Where the API listens.                                                                                    | `http://+:8080`                                                             |
| `DataProtection__KeysPath`   | Yes, with more than one instance or across restarts | The folder that keeps the ASP.NET Core Data Protection keys protecting the member session cookie (ADR 0007). Shared, persistent storage, readable and writable by every API instance. The same keys protect the antiforgery tokens (ADR 0009). Unset, the keys live in memory and every restart signs every member out. | `/var/lib/christian-fitness/keys` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No       | The OpenTelemetry collector. When set, traces, metrics and logs are exported to it by OTLP; when unset, nothing leaves the process and logs go to the console only. | `http://otel-collector:4317`                                                |
| `OTEL_SERVICE_NAME`           | No       | The service name on every span, metric and log. Defaults to `christian-fitness-api`.                      | `christian-fitness-api`                                                     |
| `Logging__LogLevel__Default`  | No       | The lowest log level written. Defaults to `Information`. `Microsoft.AspNetCore` stays at `Warning` whatever this says, because its request logs carry query strings. | `Warning`                                                                   |

## CLI (`ChristianFitness.Cli`, built as `cf`)

`cf migrate` applies the pending EF Core migrations; `cf seed` inserts the seed data that is
missing and changes nothing on a second run. The API never migrates on startup: run `migrate`,
then `seed`, then start the API.

| Setting                      | Required          | Purpose                                                                                                     | Example                                                                     |
| ---------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `ConnectionStrings__Default` | Yes               | The PostgreSQL database to migrate and seed, with a role that may change the schema.                       | `Host=db;Port=5432;Database=christian_fitness;Username=cf_owner;Password=…` |
| `Seed__StaffEmail`           | For `cf seed`     | The email of the first staff account, an Admin. A second run with the same email changes nothing.          | `admin@example.org`                                                         |
| `Seed__StaffPassword`        | For `cf seed`     | Its first password, stored only as a PBKDF2 hash. Change it after the first sign-in.                         | from the secret store                                                       |
| `Seed__StaffName`            | For `cf seed`     | Its display name.                                                                                           | `Community Admin`                                                           |

A missing `Seed__*` setting stops `cf seed` with exit code 2, naming the setting, before anything
is written. A missing connection string stops either command with exit code 2.

## Static host (the built member and admin apps)

The apps are static files (`ng build`), served by any host that can set response headers; the
deployment journey (L2-041) chooses it. The API sets the same protections on its own responses
(L2-030 AC4, ADR 0009). The host sends, with every file:

| Header                      | Value                                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`   | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'` |
| `X-Content-Type-Options`    | `nosniff`                                                                                                                               |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                                                                                                       |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`                                                                                                   |

Scripts come only from the app's own files: the production build turns off Angular's inline
critical CSS, whose `onload` handler `script-src 'self'` would block. Angular sets component
styles at run time, hence `'unsafe-inline'` for styles only. `/api/` is served from the same
origin as the app (a reverse proxy in front of both), so the session and antiforgery cookies,
which are `SameSite` and `__Host-` prefixed, reach the API.
