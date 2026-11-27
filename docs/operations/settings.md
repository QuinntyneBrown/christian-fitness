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
| `ASPNETCORE_FORWARDEDHEADERS_ENABLED` | Yes, behind the reverse proxy | `true` makes the API read the client's address from the `X-Forwarded-For` the proxy appends (and the scheme from `X-Forwarded-Proto`). The limit of 5 account creations per address per hour counts by that address (L2-034 AC2, ADR 0012); unset behind a proxy, every visitor shares the proxy's address. It trusts whichever peer sends the header, so set it only when the proxy alone can reach the API. | `true` |
| `DataProtection__KeysPath`   | Yes, with more than one instance or across restarts | The folder that keeps the ASP.NET Core Data Protection keys protecting the member and staff session cookies (ADR 0007, ADR 0011). Shared, persistent storage, readable and writable by every API instance. The same keys protect the antiforgery tokens (ADR 0009). Unset, the keys live in memory and every restart signs every member and staff member out. | `/var/lib/christian-fitness/keys` |
| `Exports__Directory`         | Yes, with more than one instance or across restarts | The folder that keeps members' data archives (L2-066 AC1, AC2; ADR 0117), one .zip per request named by a new key. The scheduler writes an archive within a minute of the request and deletes it 7 days after; the API streams it only to the session of the member it was made for. Shared, persistent storage on the `/data` share (ADR 0047), readable and writable by every API instance, and private: no web server may serve it. Unset, archives live in `exports` next to the application and are lost with it. | `/data/exports` |
| `Feedback__ScreenshotDirectory` | Yes, with more than one instance or across restarts | The folder that keeps the screenshots members add to feedback, one file per screenshot named by a new key and the extension its content gave (L2-063 AC4, ADR 0109). Shared, persistent storage, readable and writable by every API instance, and private: no web server may serve it, as screenshots are for staff only (L2-063 AC10). Unset, they live in `feedback-screenshots` next to the application and are lost with it. | `/var/lib/christian-fitness/feedback-screenshots` |
| `Images__Directory`           | Yes, with more than one instance or across restarts | The folder that keeps event images, one file per image named by its key (ADR 0025). Shared, persistent storage, readable and writable by every API instance. Unset, images live in `images` next to the application and are lost with it. Images are public by key: `GET /api/events/images/{key}` serves them to anyone. | `/var/lib/christian-fitness/images` |
| `MemberApp__BaseUrl`         | Yes, outside Development | The member app's public address. Every link in an email starts with it, and so does every Community Pick caption's event link (`/e/<id>`, ADR 0098) (the reset link is `{MemberApp__BaseUrl}/reset-password#token=…`); it is never taken from a request's `Host` header (ADR 0010). Defaults to `http://localhost:4200` in Development. | `https://www.christian.fitness` |
| `StoryShell__Url`            | Yes, for story link previews | Where the API reads the member app's built `index.html` (L2-061 AC11; ADR 0105): the static host of the same replica, read the first time a story's address is requested and kept for the life of the process, so the shell always matches the assets that host serves. `GET /stories/{slug}` fills it with the story's title, description, Open Graph and Twitter tags and canonical link (absolute, from `MemberApp__BaseUrl`). Unset or unreadable, that endpoint answers 503 and nginx serves its own shell, so the story still opens but shares without a preview. | `http://127.0.0.1:8080/index.html` |
| `AdminApp__BaseUrl`          | Yes, for staff Google sign-in | The admin app's public address. Google returns a staff sign-in to `{AdminApp__BaseUrl}/api/admin/session/google/callback`, the address registered with the Google client (ADR 0099). Unset, the address is the request's own origin, which only suits Development. | `https://admin.christian.fitness` |
| `Google__ClientId`           | Yes, for Google sign-in | The OAuth client of "Continue with Google" in both apps (L2-049; ADR 0099). The client registers both callback addresses, `{MemberApp__BaseUrl}/api/session/google/callback` and `{AdminApp__BaseUrl}/api/admin/session/google/callback`, and a local one per app in Development. Unset, every Google start is refused `google_unavailable` (503) and the email form still works. | `1234-abc.apps.googleusercontent.com` |
| `Google__ClientSecret`       | Yes, with `Google__ClientId` | The OAuth client's secret, from the secret store; never logged. The server alone exchanges Google's code with it. Unset, Google starts are refused `google_unavailable`. | (secret) |
| `Google__StaffDomain`        | Yes, for staff Google sign-in | The team's Google Workspace domain. Staff sign-in asks Google to offer only its accounts (`hd`) and checks it again on the server. Unset, staff Google sign-in is refused `google_unavailable`; members are unaffected. | `christian.fitness` |
| `Email__Smtp__Host`           | Yes, outside Development | The SMTP relay that delivers email (ADR 0010). Mail is queued in the API and delivered after the answer. Unset in Development, no mail is sent: messages are kept in memory only. To see them locally, run a mail catcher such as Mailpit and point this at it. | `smtp.sendgrid.net` |
| `Email__Smtp__Port`           | No       | The relay's port. Defaults to `587` (STARTTLS); `465` uses TLS from the start.                             | `587`                                                                       |
| `Email__Smtp__UseTls`         | No       | Whether TLS is required. Defaults to `true`; set `false` only for a local mail catcher.                    | `true`                                                                      |
| `Email__Smtp__UserName`       | If the relay asks | The relay's user name. Unset, the API sends without authenticating.                                | `apikey`                                                                    |
| `Email__Smtp__Password`       | If the relay asks | The relay's password or API key, from the secret store.                                           | from the secret store                                                       |
| `Email__From`                 | Yes, outside Development | The sender of every email, a mailbox the relay may send as.                                      | `Christian Fitness <no-reply@christian.fitness>`                             |
| `Organisation__PostalAddress` | Yes, outside Development | The organisation's postal address, which every newsletter email's footer names under "Christian Fitness" with its Unsubscribe link (L2-058 AC4; ADR 0110). The API, and `cf announce-legal-change`, refuse to start without it outside Development, naming it with the other missing email settings. In Development it reads "Postal address not set (development)". | `2091 Hurontario Street, Mississauga, Ontario, L5A 4E6` |
| `Email__ReplyTo`              | No       | The staff mailbox set as Reply-To on feedback replies. Unset, a member cannot answer by email (ADR 0070).  | `hello@christianfitness.ca`                                                 |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No       | The OpenTelemetry collector. When set, traces, metrics and logs are exported to it by OTLP; when unset, nothing leaves the process and logs go to the console only. | `http://otel-collector:4317`                                                |
| `OTEL_SERVICE_NAME`           | No       | The service name on every span, metric and log. Defaults to `christian-fitness-api`.                      | `christian-fitness-api`                                                     |
| `Logging__LogLevel__Default`  | No       | The lowest log level written. Defaults to `Information`. `Microsoft.AspNetCore` stays at `Warning` whatever this says, because its request logs carry query strings. | `Warning`                                                                   |

Outside Development the API refuses to start, naming each one, while `Email__Smtp__Host`,
`Email__From` or `MemberApp__BaseUrl` is missing, so a deployed system never drops mail silently.

## Settings for the new designs

These settings are required by the designs and are not yet implemented. Set them when those
features are deployed; values are not hard-coded.

| Setting | Required | Purpose |
| --- | --- | --- |
| `Email__MaxPerMinute` | For the newsletter sender | The SMTP relay's sending limit per minute; the operator supplies the relay's limit. A whole number above 0. While this or `Email__MaxPerDay` is unset, a scheduled issue starts at its time but no issue email leaves; it goes out once both are set (L2-070 AC7; ADR 0070). |
| `Email__MaxPerDay` | For the newsletter sender | The SMTP relay's sending limit in any 24 hours; the operator supplies the relay's limit. A whole number above 0. |

The relay limits govern the newsletter sender's rate and capacity; neither has a default. The
staff Google Workspace domain is `christian.fitness`; legal enquiries go to
`privacy@christian.fitness`. Every newsletter and marketing email footer names Christian Fitness
and uses `Organisation:PostalAddress`, which is implemented with the API's settings above
(journey 27).

## CLI (`ChristianFitness.Cli`, built as `cf`)

`cf migrate` applies the pending EF Core migrations; `cf seed` inserts the seed data that is
missing and changes nothing on a second run. The API never migrates on startup: run `migrate`,
then `seed`, then start the API. The five starting bylines are added only while there are no
bylines and no Admin has ever added, edited or removed one, so a byline an Admin removed is not brought back
(ADR 0094).

`cf seed` creates the first Admin from `Seed__AdminEmail` with no password: staff sign in only
with Google Workspace, and that Admin's first Google sign-in binds the account (L2-018, L2-049
AC15, ADR 0100). Staff passwords and two-step verification belong to Google Workspace, where the
team must enforce two-step verification for every account in the domain (L2-046 AC2); the
application has no password or code of its own for staff.

| Setting                      | Required          | Purpose                                                                                                     | Example                                                                     |
| ---------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `ConnectionStrings__Default` | Yes               | The PostgreSQL database to migrate and seed, with a role that may change the schema.                       | `Host=db;Port=5432;Database=christian_fitness;Username=cf_owner;Password=…` |
| `Seed__AdminEmail`           | For `cf seed`     | The first Admin's Google Workspace account, in the team's domain. A second run with the same email, in any case, changes nothing. | `admin@christian.fitness`                                                   |
| `Seed__AdminName`            | No                | The first Admin's display name. Defaults to `Christian Fitness Admin`.                                     | `Dana Reyes`                                                                |
| `Seed__DirectorySamples`     | No                | `true` adds the mocks' eleven sample directory listings beside the Christian Fitness team listing, which is always seeded, and the mocks' connections between them, which each profile's Connected lists (ADR 0082, ADR 0087). Leave it unset in production, so the directory shows only listings staff checked. | `true` on a demonstration system |

`cf migrate` installs the `pg_trgm` extension for the directory's search index (ADR 0082); it is a
trusted extension, so the schema owner may create it without a superuser. Azure Database for
PostgreSQL also requires it in the server parameter `azure.extensions` (`PG_TRGM`), or
`CREATE EXTENSION` fails; the Deploy workflow adds it before migrating (docs/operations/deployment.md).

A missing `Seed__AdminEmail` does not stop `cf seed`: it names the setting on standard error, makes
no Admin and seeds the rest, so a release goes through before staff Google sign-in is set up
(ADR 0111); set it and run the release again to make the first Admin. A missing connection string
stops either command with exit code 2.

## Static host (the built member and admin apps)

The apps are static files (`ng build`), served by any host that can set response headers. The
deployed system uses nginx in the API's replica (`frontend/deploy/`, ADR 0047;
[`deployment.md`](deployment.md) says where each setting on this page is set). The API sets the same protections on its own responses
(L2-030 AC4, ADR 0009). The host sends, with every file:

| Header                      | Value                                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`   | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'` |
| `X-Content-Type-Options`    | `nosniff`                                                                                                                               |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                                                                                                       |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`                                                                                                   |

Scripts come only from the app's own files: the production build turns off Angular's inline
critical CSS (`optimization.styles.inlineCritical: false` in `angular.json`), whose inline
`<script>` that swaps the stylesheet in `script-src 'self'` would block. Angular sets component
styles at run time, hence `'unsafe-inline'` for styles only. `/api/` is served from the same
origin as the app (a reverse proxy in front of both), so the session and antiforgery cookies,
which are `SameSite` and `__Host-` prefixed, reach the API.

## Group chat (slice 12.1; ADR 0039)

The event group chat is a SignalR hub at `/api/chat`, reached from the member app on the same origin. The
reverse proxy in front of the API must pass WebSocket upgrades (`Upgrade` and `Connection` headers) for
`/api/chat`; SignalR falls back to long polling if it does not. `connect-src 'self'` already covers the
WebSocket. Messages are delivered by the one API instance that holds the connection, so a deployment with
more than one instance needs a SignalR backplane before the chat is scaled out; none is configured.

## Legal document releases

Publish the material-change summary in the member index as a meta element named
`cf-privacy-change` or `cf-terms-change`, with the ISO effective date in `content`
and a plain-language summary in `data-summary`. Register that date in both legal
schedules. Keep the current text in place until the effective date.
Before replacing it, retain its complete text, effective date and current-version
link in `frontend/projects/web/public/legal/<document>/<yyyy-mm-dd>.html`. On
the effective date release the new page text, retain both schedules and remove
the expired notice metadata. Check the dated address with JavaScript disabled.

At least 30 days ahead, run `cf announce-legal-change privacy yyyy-mm-dd` or
`cf announce-legal-change terms yyyy-mm-dd` with the existing SQL, SMTP,
`MemberApp__BaseUrl` and `Organisation__PostalAddress` settings. The command awaits each SMTP
submission. Use one operator per announcement. If delivery is interrupted, reconcile SMTP delivery
records before repeating the command to avoid duplicate mail.

Configure the Google OAuth consent screen's Privacy Policy URL as
https://www.christian.fitness/privacy and Terms of Service URL as
https://www.christian.fitness/terms when provisioning the member OAuth client.
