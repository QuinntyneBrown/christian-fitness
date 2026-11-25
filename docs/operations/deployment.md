# Deployment

How Christian Fitness is released and where it runs (ADR 0047). Every setting is in
[`settings.md`](settings.md).

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
2. starts the release job, which runs `cf migrate`, then `cf seed`, and waits for it;
3. applies `tools/deploy/containerapp.yaml` as a new revision and waits for its probes;
4. asks the new revision for the member app's page and for `/api/public/events/upcoming`.

A step that fails stops the run; the previous revision keeps serving. To release again, run
`Deploy` by hand (Actions > Deploy > Run workflow). To go back, activate the previous revision:

```sh
az containerapp revision list -g rg-christian-fitness -n ca-christian-fitness -o table
az containerapp revision activate -g rg-christian-fitness -n ca-christian-fitness --revision <name>
```

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
`smtp-password`) and of the job (`db-owner-connection`, `seed-staff-password`). To change one:
`az containerapp secret set`, then run `Deploy` so a new revision reads it.

## Scheduled work (planned)

[ADR 0069](../adr/0069-scheduled-work.md) chooses a hosted scheduler in the API container, not
another Container Apps job. It is not implemented yet: deploying the current release does not
run these jobs. Once built, each API replica ticks every 30 seconds with `TimeProvider` and takes
a short PostgreSQL lease before running due work. A replica without the lease skips the tick;
after a restart or missed tick, due work is picked up again.

The scheduler publishes due stories and starts scheduled newsletter issues; a past-due Scheduled
story also reads as Published before the status write. Daily jobs run newsletter upkeep (purging
unsubscribed addresses), data exports and account erasures. `cf export-data` and
`cf erase-accounts` remain manual commands when implemented, coordinated with scheduled runs.
The release job still runs only migrations and seed. Add-on emails have no trigger yet
([#90](https://github.com/QuinntyneBrown/christian-fitness/issues/90)).

The scheduler stops when the API or database is unavailable; an outage can delay maintenance,
exports and email. The lease does not remove ADR 0047's other single-replica constraints. Document
any scheduler settings and operational recovery procedures alongside their implementation.

## The first staff account

`cf seed` creates it from the job's `Seed__*` settings. Read its first password, sign in at the
admin app and change it:

```sh
az containerapp job secret show -g rg-christian-fitness -n caj-christian-fitness-release \
  --secret-name seed-staff-password --query value -o tsv
```

Staff cannot sign in until `cf two-step` has been run for them. Its link is a secret: run it
yourself, in Cloud Shell, where nobody else reads the terminal.

```sh
az containerapp exec -g rg-christian-fitness -n ca-christian-fitness --container api \
  --command "dotnet /app/cli/cf.dll two-step <email>"
```

`exec` runs in the API's container, whose connection is `cf_api`; `two-step` only writes rows.

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
