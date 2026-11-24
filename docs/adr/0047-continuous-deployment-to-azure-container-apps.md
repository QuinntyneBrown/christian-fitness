# 0047. Continuous deployment: every green commit to `main` goes to Azure Container Apps

## Status

Accepted, 24 November 2026 (the first deployment).

## Context

L2-041 fixes the order of a release (`cf migrate`, `cf seed`, then the API and the two apps) and
leaves the host and the pipeline to "the first deployment, in its own ADR". `docs/operations/settings.md`
adds what the host must do: serve both apps as static files with four response headers, put
`/api/` on the same origin as each app behind a reverse proxy that passes WebSocket upgrades, give
the API the client's address in `X-Forwarded-For`, keep the Data Protection keys and event images
on storage that outlives a restart, and run one API instance while the chat hub has no backplane.
The owner's other systems are on Azure and the domain is `christian.fitness`.

## Decision

- **Host: Azure Container Apps, one app, one replica, two containers.** `web` is nginx
  (`frontend/Dockerfile`): it serves the member app for `www.christian.fitness`, the admin app for
  `admin.christian.fitness`, redirects the bare domain to `www`, sends the four headers with every
  file and passes `/api/` (WebSockets included) to `api` on `127.0.0.1:5000`. `api` is the backend
  image (`backend/Dockerfile`). Only nginx's port is behind the ingress, so the proxy alone reaches
  the API, and nginx overwrites `X-Forwarded-For` with the address the ingress saw. Two origins
  keep the staff session off the member app's origin; one replica is the limit the chat hub and
  the in-memory mail queue set today.
- **One backend image holds the API and the `cf` CLI.** A Container Apps job, started by the
  pipeline before the apps are updated, runs `release.sh` (`cf migrate`, then `cf seed`) from the
  image about to be served, as the schema owner. The API signs in as `cf_api`, a role that may
  read and write rows and nothing else.
- **State:** PostgreSQL Flexible Server (ADR 0004); an Azure Files share mounted at `/data` for
  `DataProtection__KeysPath` and `Images__Directory`; settings as environment variables, the secret
  ones from the container app's secrets.
- **Email:** Azure Communication Services over SMTP (`smtp.azurecomm.net`, ADR 0010's relay),
  sending as `no-reply@christian.fitness` from the verified domain.
- **Pipeline: `.github/workflows/deploy.yml`, a second workflow.** It runs when `CI` completes
  green for a push to `main` (and by hand), so CI keeps its read-only token, its five minutes and
  no secret (L2-042 AC4, ADR 0005). It builds and pushes both images tagged with the commit, runs
  the release job and waits for it, applies `tools/deploy/containerapp.yaml` as one new revision,
  waits for the revision's probes and then asks the member app for its page and the API for an
  answer that needs the database. A failure at any step fails the run and leaves the previous
  revision serving. Releases run one at a time and are never cancelled part-way.
- **No stored credential.** The workflow signs in with GitHub's OIDC token as a user-assigned
  managed identity that trusts only this repository's `main` (the token's subject carries the
  owner's and the repository's permanent ids) and may change only the system's resource group. The repository holds three identifiers as
  variables and no secret. `azure/login`, the one third-party action, is pinned to a commit.
- **The resources are made by `tools/deploy/provision.sh`,** run once from Azure Cloud Shell; it
  prints the DNS records and the repository variables, and nothing secret.

## Consequences

- A migration must leave the running revision working until the new one takes over (add before
  remove), because the release job runs first.
- A second replica needs a SignalR backplane, a shared mail queue and a look at the address-keyed
  rate limits before `maxReplicas` is raised.
- Rolling back is activating the previous revision (`az containerapp revision activate`) or
  running `Deploy` by hand on an earlier commit; a migration is not rolled back by either.
- `cf two-step <email>` is run by a person (docs/operations/deployment.md): its link is a secret
  that no pipeline log may hold.
