#!/usr/bin/env bash
# Creates everything the Deploy workflow releases into (ADR 0047; docs/operations/deployment.md).
# Run once, in Azure Cloud Shell (bash), signed in to the subscription that will hold the system:
#
#   ./provision.sh            every resource, then prints the DNS records and repository variables
#   ./provision.sh domains    after the DNS records exist: verifies the email domain, links it and
#                             binds www, admin and the bare domain with managed certificates
#
# It is safe to run again: an existing resource is left as it is, and the database passwords are
# made anew only while the app or the release job is still to be created. Nothing secret is printed.
set -euo pipefail

REPOSITORY=QuinntyneBrown/christian-fitness
DOMAIN=christian.fitness
LOCATION=canadacentral
RG=rg-christian-fitness
REGISTRY=crchristianfitness
ENVIRONMENT=cae-christian-fitness
APP=ca-christian-fitness
RELEASE_JOB=caj-christian-fitness-release
POSTGRES=psql-christian-fitness
DATABASE=christian_fitness
STORAGE=stchristianfitness
SHARE=cfdata
APP_IDENTITY=id-christian-fitness-app
DEPLOY_IDENTITY=id-christian-fitness-deploy
ACS=acs-christian-fitness
EMAIL_SERVICE=acs-email-christian-fitness
SMTP_APP=christian-fitness-smtp
STAFF_EMAIL=${STAFF_EMAIL:-quinntynebrown@gmail.com}
STAFF_NAME=${STAFF_NAME:-Quinntyne Brown}
PLACEHOLDER=docker.io/nginxinc/nginx-unprivileged:1.29-alpine

az config set extension.use_dynamic_install=yes_without_prompt extension.dynamic_install_allow_preview=true --only-show-errors
SUBSCRIPTION=$(az account show --query id --output tsv)
TENANT=$(az account show --query tenantId --output tsv)
secret() { openssl rand -base64 36 | tr -d '/+=\n' | cut -c1-32; }
exists() { "$@" --output none 2>/dev/null; }

domains() {
  echo "== Host names and managed certificates"
  for host in "www.$DOMAIN" "admin.$DOMAIN" "$DOMAIN"; do
    method=CNAME
    [ "$host" = "$DOMAIN" ] && method=HTTP
    az containerapp hostname add --resource-group "$RG" --name "$APP" --hostname "$host" --output none 2>/dev/null || true
    az containerapp hostname bind --resource-group "$RG" --name "$APP" --environment "$ENVIRONMENT" \
      --hostname "$host" --validation-method "$method" --output none || echo "   $host: not bound yet"
  done
  az containerapp hostname list --resource-group "$RG" --name "$APP" --query '[].[name, bindingType]' --output tsv

  echo "== Email domain: verify, sender, link"
  email_domain() { az communication email domain "$@" --resource-group "$RG" --email-service-name "$EMAIL_SERVICE" --domain-name "$DOMAIN"; }
  for kind in Domain SPF DKIM DKIM2; do
    email_domain initiate-verification --verification-type "$kind" --output none 2>/dev/null || true
  done
  # The four checks finish on their own time; linking is refused until every one has.
  for _ in $(seq 1 30); do
    states=$(email_domain show --query 'verificationStates.[Domain.status, SPF.status, DKIM.status, DKIM2.status]' --output tsv | tr '\n\t' '  ')
    echo "   Domain, SPF, DKIM, DKIM2: $states"
    [ "$(echo "$states" | tr -s ' ' '\n' | grep -c '^Verified$')" = 4 ] && break
    sleep 10
  done
  email_domain sender-username create --sender-username no-reply --username no-reply --display-name "Christian Fitness" --output none
  domain_id=$(email_domain show --query id --output tsv)
  az communication update --resource-group "$RG" --name "$ACS" --linked-domains "$domain_id" --output none &&
    echo "   $DOMAIN is linked: mail can be sent as no-reply@$DOMAIN" ||
    echo "   Not linked yet: run this step again once all four checks say Verified."
}

if [ "${1:-}" = "domains" ]; then
  domains
  exit 0
fi

echo "== Resource group and providers"
az group create --name "$RG" --location "$LOCATION" --output none
for provider in Microsoft.App Microsoft.OperationalInsights Microsoft.ContainerRegistry Microsoft.DBforPostgreSQL Microsoft.Storage Microsoft.Communication Microsoft.ManagedIdentity; do
  az provider register --namespace "$provider" --wait --output none
done

echo "== Registry and identities"
exists az acr show --name "$REGISTRY" --resource-group "$RG" ||
  az acr create --name "$REGISTRY" --resource-group "$RG" --location "$LOCATION" --sku Basic --admin-enabled false --output none
registry_id=$(az acr show --name "$REGISTRY" --resource-group "$RG" --query id --output tsv)
for identity in "$APP_IDENTITY" "$DEPLOY_IDENTITY"; do
  az identity create --name "$identity" --resource-group "$RG" --location "$LOCATION" --output none
done
app_identity_id=$(az identity show --name "$APP_IDENTITY" --resource-group "$RG" --query id --output tsv)
app_principal=$(az identity show --name "$APP_IDENTITY" --resource-group "$RG" --query principalId --output tsv)
deploy_principal=$(az identity show --name "$DEPLOY_IDENTITY" --resource-group "$RG" --query principalId --output tsv)
deploy_client=$(az identity show --name "$DEPLOY_IDENTITY" --resource-group "$RG" --query clientId --output tsv)
rg_id=$(az group show --name "$RG" --query id --output tsv)
# The replica pulls images; the workflow pushes them and changes this resource group, nothing else.
az role assignment create --assignee-object-id "$app_principal" --assignee-principal-type ServicePrincipal --role AcrPull --scope "$registry_id" --output none
az role assignment create --assignee-object-id "$deploy_principal" --assignee-principal-type ServicePrincipal --role Contributor --scope "$rg_id" --output none
az role assignment create --assignee-object-id "$deploy_principal" --assignee-principal-type ServicePrincipal --role AcrPush --scope "$registry_id" --output none
# GitHub's OIDC token for a run on main is the workflow's only credential. Its subject names the
# owner and the repository with their permanent ids, so a renamed or re-created namesake never matches.
owner_id=$(curl -fsSL "https://api.github.com/repos/$REPOSITORY" | jq -r .owner.id)
repository_id=$(curl -fsSL "https://api.github.com/repos/$REPOSITORY" | jq -r .id)
az identity federated-credential create --name github-main --identity-name "$DEPLOY_IDENTITY" --resource-group "$RG" \
  --issuer https://token.actions.githubusercontent.com --audiences api://AzureADTokenExchange --output none \
  --subject "repo:${REPOSITORY%/*}@$owner_id/${REPOSITORY#*/}@$repository_id:ref:refs/heads/main"

echo "== PostgreSQL"
# 0.0.0.0 is Azure's "services inside Azure" rule: the replica, the release job and Cloud Shell.
exists az postgres flexible-server show --name "$POSTGRES" --resource-group "$RG" ||
  az postgres flexible-server create --name "$POSTGRES" --resource-group "$RG" --location "$LOCATION" \
    --tier Burstable --sku-name Standard_B1ms --storage-size 32 --version 17 \
    --admin-user cf_owner --admin-password "$(secret)" \
    --public-access 0.0.0.0 --yes --output none
exists az postgres flexible-server db show --server-name "$POSTGRES" --resource-group "$RG" --name "$DATABASE" ||
  az postgres flexible-server db create --server-name "$POSTGRES" --resource-group "$RG" --name "$DATABASE" --output none
host="$POSTGRES.postgres.database.azure.com"
# The passwords live only in the app's and the job's secrets. While either is still to be made,
# both roles get new ones here; afterwards they are never read back or changed.
owner_password=""
api_password=""
if ! exists az containerapp show --name "$APP" --resource-group "$RG" ||
  ! exists az containerapp job show --name "$RELEASE_JOB" --resource-group "$RG"; then
  owner_password=$(secret)
  api_password=$(secret)
  az postgres flexible-server update --name "$POSTGRES" --resource-group "$RG" --admin-password "$owner_password" --output none
  # The API's own role: rows only, never the schema (docs/operations/settings.md).
  PGPASSWORD="$owner_password" psql "host=$host dbname=$DATABASE user=cf_owner sslmode=require" --quiet --set ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cf_api') THEN CREATE ROLE cf_api LOGIN; END IF;
END \$\$;
ALTER ROLE cf_api PASSWORD '$api_password';
GRANT CONNECT ON DATABASE $DATABASE TO cf_api;
GRANT USAGE ON SCHEMA public TO cf_api;
ALTER DEFAULT PRIVILEGES FOR ROLE cf_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cf_api;
ALTER DEFAULT PRIVILEGES FOR ROLE cf_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO cf_api;
SQL
fi

echo "== Storage for the Data Protection keys and event images"
exists az storage account show --name "$STORAGE" --resource-group "$RG" ||
  az storage account create --name "$STORAGE" --resource-group "$RG" --location "$LOCATION" --sku Standard_LRS \
    --kind StorageV2 --min-tls-version TLS1_2 --allow-blob-public-access false --output none
storage_key=$(az storage account keys list --account-name "$STORAGE" --resource-group "$RG" --query '[0].value' --output tsv)
az storage share-rm create --storage-account "$STORAGE" --resource-group "$RG" --name "$SHARE" --quota 5 --output none

echo "== Email (Azure Communication Services)"
exists az communication show --name "$ACS" --resource-group "$RG" ||
  az communication create --name "$ACS" --resource-group "$RG" --location global --data-location Canada --output none
exists az communication email show --name "$EMAIL_SERVICE" --resource-group "$RG" ||
  az communication email create --name "$EMAIL_SERVICE" --resource-group "$RG" --location global --data-location Canada --output none
exists az communication email domain show --domain-name "$DOMAIN" --email-service-name "$EMAIL_SERVICE" --resource-group "$RG" ||
  az communication email domain create --domain-name "$DOMAIN" --email-service-name "$EMAIL_SERVICE" --resource-group "$RG" \
    --location global --domain-management CustomerManaged --output none
acs_id=$(az communication show --name "$ACS" --resource-group "$RG" --query id --output tsv)
# SMTP signs in as an Entra application that may send through this one resource.
smtp_client=$(az ad app list --display-name "$SMTP_APP" --query '[0].appId' --output tsv)
if [ -z "$smtp_client" ]; then
  smtp_client=$(az ad app create --display-name "$SMTP_APP" --sign-in-audience AzureADMyOrg --query appId --output tsv)
  sleep 20
fi
exists az ad sp show --id "$smtp_client" || { az ad sp create --id "$smtp_client" --output none; sleep 20; }
smtp_principal=$(az ad sp show --id "$smtp_client" --query id --output tsv)
az role assignment create --assignee-object-id "$smtp_principal" --assignee-principal-type ServicePrincipal \
  --role "Communication and Email Service Owner" --scope "$acs_id" --output none
smtp_password=""
if ! exists az containerapp show --name "$APP" --resource-group "$RG"; then
  smtp_password=$(az ad app credential reset --id "$smtp_client" --years 2 --query password --output tsv --only-show-errors)
fi
smtp_username="$ACS.$smtp_client.$TENANT"

echo "== Container Apps environment, app and release job"
exists az containerapp env show --name "$ENVIRONMENT" --resource-group "$RG" ||
  az containerapp env create --name "$ENVIRONMENT" --resource-group "$RG" --location "$LOCATION" --output none
az containerapp env storage set --name "$ENVIRONMENT" --resource-group "$RG" --storage-name "$SHARE" \
  --azure-file-account-name "$STORAGE" --azure-file-account-key "$storage_key" --azure-file-share-name "$SHARE" \
  --access-mode ReadWrite --output none

if ! exists az containerapp show --name "$APP" --resource-group "$RG"; then
  az containerapp create --name "$APP" --resource-group "$RG" --environment "$ENVIRONMENT" \
    --image "$PLACEHOLDER" --ingress external --target-port 8080 --transport auto \
    --min-replicas 1 --max-replicas 1 \
    --user-assigned "$app_identity_id" --registry-server "$REGISTRY.azurecr.io" --registry-identity "$app_identity_id" \
    --secrets "db-connection=Host=$host;Port=5432;Database=$DATABASE;Username=cf_api;Password=$api_password;SSL Mode=Require" \
              "smtp-username=$smtp_username" "smtp-password=$smtp_password" \
    --output none
elif [ -n "$api_password" ]; then
  az containerapp secret set --name "$APP" --resource-group "$RG" --output none \
    --secrets "db-connection=Host=$host;Port=5432;Database=$DATABASE;Username=cf_api;Password=$api_password;SSL Mode=Require"
fi

if ! exists az containerapp job show --name "$RELEASE_JOB" --resource-group "$RG"; then
  az containerapp job create --name "$RELEASE_JOB" --resource-group "$RG" --environment "$ENVIRONMENT" \
    --trigger-type Manual --replica-timeout 600 --replica-retry-limit 0 --parallelism 1 --replica-completion-count 1 \
    --image "$PLACEHOLDER" --cpu 0.25 --memory 0.5Gi \
    --user-assigned "$app_identity_id" --registry-server "$REGISTRY.azurecr.io" --registry-identity "$app_identity_id" \
    --secrets "db-owner-connection=Host=$host;Port=5432;Database=$DATABASE;Username=cf_owner;Password=$owner_password;SSL Mode=Require" \
              "seed-staff-password=$(secret)" \
    --env-vars "ConnectionStrings__Default=secretref:db-owner-connection" "Seed__StaffEmail=$STAFF_EMAIL" \
               "Seed__StaffPassword=secretref:seed-staff-password" "Seed__StaffName=$STAFF_NAME" \
    --command /app/release.sh \
    --output none
elif [ -n "$owner_password" ]; then
  az containerapp job secret set --name "$RELEASE_JOB" --resource-group "$RG" --output none \
    --secrets "db-owner-connection=Host=$host;Port=5432;Database=$DATABASE;Username=cf_owner;Password=$owner_password;SSL Mode=Require"
fi

fqdn=$(az containerapp show --name "$APP" --resource-group "$RG" --query properties.configuration.ingress.fqdn --output tsv)
verification=$(az containerapp show --name "$APP" --resource-group "$RG" --query properties.customDomainVerificationId --output tsv)
static_ip=$(az containerapp env show --name "$ENVIRONMENT" --resource-group "$RG" --query properties.staticIp --output tsv)

cat <<TEXT

== Repository variables (Settings > Secrets and variables > Actions > Variables)
AZURE_CLIENT_ID        $deploy_client
AZURE_TENANT_ID        $TENANT
AZURE_SUBSCRIPTION_ID  $SUBSCRIPTION

== DNS records for $DOMAIN
CNAME  www          $fqdn
CNAME  admin        $fqdn
A      @            $static_ip
TXT    asuid.www    $verification
TXT    asuid.admin  $verification
TXT    asuid        $verification
TEXT
az communication email domain show --domain-name "$DOMAIN" --email-service-name "$EMAIL_SERVICE" --resource-group "$RG" \
  --query 'verificationRecords.*.[type, name, value]' --output tsv | sed 's/^/ /'
echo
echo "Add them, then run: $0 domains"
