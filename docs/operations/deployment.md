# Deployment

How Christian Fitness is released and where it runs (ADR 0047). Every setting is in
[`settings.md`](settings.md).

## Future retention and access-log controls

[ADR 0062](../adr/0062-personal-data-erasure-and-retention.md) requires the deployment slice to
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
