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
| `DataProtection__KeysPath`   | Yes, with more than one instance or across restarts | The folder that keeps the ASP.NET Core Data Protection keys protecting the member session cookie (ADR 0007). Shared, persistent storage, readable and writable by every API instance. Unset, the keys live in memory and every restart signs every member out. | `/var/lib/christian-fitness/keys` |
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
