# Deployment

How Christian Fitness is released and where it runs (ADR 0047). Every setting is in
[`settings.md`](settings.md).

## Future retention and access-log controls

[ADR 0078](../adr/0078-personal-data-erasure-and-retention.md) requires the deployment slice to
configure nginx access logs with an explicit format using `$uri`, not `$request`, `$request_uri`
or `$args`. The ingress must also omit query strings; disable its access logs or replace the ingress
if it cannot guarantee this. Verify both layers with a non-secret test query before enabling
token-bearing unsubscribe links. Do not log request bodies or token-bearing headers. This is a
deployment requirement, not a claim that the current configuration already provides it.

Retain Data Protection keys for 90 days after retirement and verify that no other protected payload
needs them longer before removing them. Unsubscribe tokens must not depend on these keys.

| Address                            | Serves                                   |
| ---------------------------------- | ---------------------------------------- |
| `https://www.christian.fitness`    | the member app, and its `/api/`          |
| `https://admin.christian.fitness`  | the admin app, and its `/api/`           |
| `https://christian.fitness`        | a redirect to `www`                      |

## Planned public feed routing

ADR 0072 specifies a future change to the nginx configuration copied by `frontend/Dockerfile`
from `frontend/deploy/`. It is not deployed yet. The member app's server will proxy exact
`/feed` and regex `~ ^/[a-z0-9-]+/feed$` to the API before the `static.conf` include, its regex
locations and the SPA fallback, preserving the request path and forwarding the client address
and scheme as for `/api/`. Thus `/events/feed`
reaches the API, not the SPA's `events/:id`; an unknown section receives the API's 404.

The API will output-cache each rendered feed for 15 minutes, evict affected entries by tag on
publication, unpublication or edits to published stories, and send
`Cache-Control: public, max-age=900`. Reader and intermediary caches can retain a fresh response
after API eviction until its 900-second lifetime ends. Requests reaching the API, including cache
hits, count against the `public-reads` per-IP limit (L2-034); a shared cache does not guarantee
that a shared IP stays below it. The API remains reachable only through the trusted proxy.

## A release

A commit reaches `main`; `CI` runs; when it is green, `Deploy` (`.github/workflows/deploy.yml`):

1. builds `christian-fitness-backend` (API and `cf`) and `christian-fitness-frontend` (nginx with
   both apps) and pushes them to the registry, tagged with the commit;
2. adds the extensions the migrations create (`POSTGRES_EXTENSIONS`, today `PG_TRGM`) to the
   database server's `azure.extensions` allow-list, keeping any already there;
3. starts the release job, which runs `cf migrate`, then `cf seed`, and waits for it;
4. applies `tools/deploy/containerapp.yaml` as a new revision and waits for its probes;
5. asks the new revision for the member app's page and for `/api/public/events/upcoming`.

A step that fails stops the run; the previous revision keeps serving. To release again, run
`Deploy` by hand (Actions > Deploy > Run workflow). To go back, activate the previous revision:

```sh
az containerapp revision list -g rg-christian-fitness -n ca-christian-fitness -o table
az containerapp revision activate -g rg-christian-fitness -n ca-christian-fitness --revision <name>
```

## Story shell (planned, ADR 0073)

The story-preview slice will configure the member nginx host to proxy `/stories/*` to the
anonymous API shell endpoint before the SPA fallback. The API container must have the built
member `index.html`, copied into the image or mounted read-only, and read it once at startup.
Release that shell and nginx's hashed frontend assets from the same build and revision; otherwise
the shell can reference assets that are not present. The API must not silently serve a stale or
mismatched shell if it is unavailable. The endpoint serves metadata for published stories, a
301 for their former slugs, and a 404 shell for unknown or unpublished slugs. It uses
`MemberApp__BaseUrl` for absolute preview URLs. Shell and redirect responses use
`Cache-Control: no-store`, and nginx retains the member app's security headers. This routing
and shell provisioning are not deployed yet.

## What runs where (resource group `rg-christian-fitness`, Canada Central)

| Resource                                  | Purpose                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| `ca-christian-fitness` (container app)    | One replica: `web` (nginx, port 8080, behind the ingress) and `api` (port 5000, reached only by nginx) |
| `caj-christian-fitness-release` (job)     | `cf migrate` and `cf seed`, as the schema owner `cf_owner`              |
| `psql-christian-fitness`                  | PostgreSQL; database `christian_fitness`; the API signs in as `cf_api`  |
| `stchristianfitness`, share `cfdata`      | Mounted at `/data`: `keys` (Data Protection) and `images` (event images) |
| `crchristianfitness`                      | The image registry                                                      |
| `acs-christian-fitness` and its email service | Outgoing mail by SMTP as `no-reply@christian.fitness`               |
| `id-christian-fitness-deploy`             | The identity GitHub signs in as (OIDC, `main` only; Contributor on this group) |
| `id-christian-fitness-app`                | The identity the replica pulls images with                              |

The secret settings are secrets of the container app (`db-connection`, `smtp-username`,
`smtp-password`) and of the job (`db-owner-connection`). To change one:
`az containerapp secret set`, then run `Deploy` so a new revision reads it.

## Scheduled work

[ADR 0069](../adr/0069-scheduled-work.md) chooses a hosted scheduler in the API container, not
another Container Apps job. `PublishingClock` runs in every API replica from journey 23
([ADR 0104](../adr/0104-schedule-stories.md)); it needs no setting. Every 30 seconds it takes
or renews the `publishing-clock` row of the `SchedulerLeases` table for 60 seconds, then
publishes the Scheduled stories whose time has come, oldest first, at most 100 a tick, each
audited `story.published`. A replica that cannot take the lease skips the tick; after a stopped
replica's lease expires (at most 60 seconds), another takes it over. After a restart or missed
tick, due stories are picked up again, and every admin read already shows them as Published.

To see who holds the lease, read `SchedulerLeases` (`Holder` is the machine name and a random
id per process; `Fence` counts changes of holder). Deleting the row is safe: the next tick
makes it again. A failed tick is logged as `A publishing clock tick failed` with the
exception's type only, and the next tick tries again.

Still planned: the scheduler starts scheduled newsletter issues, and daily jobs run newsletter upkeep (purging
unsubscribed addresses), data exports and account erasures. `cf export-data` and
`cf erase-accounts` remain manual commands when implemented, coordinated with scheduled runs.
The release job still runs only migrations and seed. Add-on emails have no trigger yet
([#90](https://github.com/QuinntyneBrown/christian-fitness/issues/90)).

The scheduler stops when the API or database is unavailable; an outage can delay maintenance,
exports and email. The lease does not remove ADR 0047's other single-replica constraints. Document
any scheduler settings and operational recovery procedures alongside their implementation.

## The first staff account

`cf seed` creates the first Admin from the job's `Seed__AdminEmail` (and optional
`Seed__AdminName`), set by `tools/deploy/provision.sh` from `ADMIN_EMAIL` and `ADMIN_NAME`. It
has no password: the Admin signs in at the admin app with "Sign in with Google", using that
Google Workspace account, and the first sign-in binds it (ADR 0100). Staff sign-in needs the
Google client and the team's domain (`Google__ClientId`, `Google__ClientSecret`,
`Google__StaffDomain`) on the container app; while any is missing, Staff sign in says "Sign-in
isn't set up yet" and nobody can open the console.

Two-step verification for staff is Google Workspace's: enforce 2-Step Verification for every
account in the `christian.fitness` domain in the Google Admin console (Security, Authentication,
2-Step Verification, "Enforcement" on) before giving anyone a console role (L2-046 AC2). The
application asks for no code of its own. Further staff are added by an Admin in the console;
removing someone from the Workspace domain ends their console access at their next sign-in, and
a staff session ends after 12 hours whatever they do.

## Making it all again

`tools/deploy/provision.sh` creates every resource above and prints the DNS records and the three
repository variables (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`).
`tools/deploy/provision.sh domains` then verifies the email domain and binds the host names.

## DNS (`christian.fitness`, at the registrar)

| Type  | Host                                  | Value                                                    |
| ----- | ------------------------------------- | -------------------------------------------------------- |
| CNAME | `www`, `admin`                        | the container app's own host name                        |
| A     | `@`                                   | the environment's static address                         |
| TXT   | `asuid`, `asuid.www`, `asuid.admin`   | the app's custom-domain verification id                  |
| TXT   | `@`                                   | the email domain's verification value, and one SPF record: `v=spf1 include:spf.protection.outlook.com include:spf.efwd.registrar-servers.com -all` (Azure verifies SPF only when it ends in `-all`) |
| CNAME | `selector1-azurecomm-prod-net._domainkey`, `selector2-azurecomm-prod-net._domainkey` | the email domain's DKIM targets |
| MX    | `@`                                   | the registrar's mail forwarding (incoming mail only)     |
