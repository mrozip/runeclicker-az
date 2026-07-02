# Terraform Azure Infrastructure

This directory is intended to run from GitHub Actions only. It provisions the Azure footprint for Runeclicker:

- Azure resource group
- Azure Static Web App on the Free SKU

It intentionally does not create an App Service Plan, database, storage account, CDN, or other paid runtime dependency.

## GitHub Actions

The workflow is `.github/workflows/terraform.yml`.

Manual runs can plan, apply, destroy, and optionally bootstrap the remote state storage account before Terraform runs.

Terraform uses GitHub Actions OpenID Connect with Azure. No client secret is required.

The Terraform state storage account is a separate GitHub Actions backend dependency. It is not part of the website hosting resource group and is not used for static website hosting.

Terraform does not run automatically for pull requests or pushes to `main`. The normal PR and merge path updates the existing Azure Static Web App through `.github/workflows/azure-static-web-apps.yml`.

## Sandbox Apply

To test a new Azure resource group and Static Web App from GitHub without touching production state, run the `Terraform` workflow manually with:

| Input | Example |
| --- | --- |
| `operation` | `apply` |
| `bootstrap_state` | `true` on the first run only |
| `resource_group_name` | `rg-runeclicker-app-sbx` |
| `static_web_app_name` | `swa-runeclicker-app-sbx` |
| `state_key` | `runeclicker/sbx/app.tfstate` |
| `location` | `eastus2` |
| `sku` | `Free` |

Use the same `state_key`, `resource_group_name`, and `static_web_app_name` with `operation=destroy` to remove the sandbox resources.

## Required GitHub Variables

Set these as repository or `terraform` environment variables in GitHub:

| Variable | Description |
| --- | --- |
| `AZURE_CLIENT_ID` | Client ID of the Azure app registration or managed identity used by GitHub Actions. |
| `AZURE_TENANT_ID` | Azure tenant ID. |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID. |
| `TF_STATE_STORAGE_ACCOUNT_NAME` | Globally unique storage account name for Terraform state. |

Optional variables:

| Variable | Default |
| --- | --- |
| `TF_STATE_RESOURCE_GROUP_NAME` | `rg-runeclicker-state-shared` |
| `TF_STATE_CONTAINER_NAME` | `tfstate` |
| `TF_STATE_LOCATION` | `eastus2` |

Resource names, location, SKU, and state key are provided by required workflow inputs with sandbox-safe defaults.

## Azure Setup

Create an Azure app registration or managed identity for GitHub Actions and configure a federated credential for the GitHub environment named `terraform`.

The identity needs:

- Contributor permission for the subscription or target resource group where the Static Web App will be created.
- Storage Blob Data Contributor permission for the Terraform state storage account.
- Owner or User Access Administrator permission only for the first manual run if you use the workflow's `bootstrap_state` option to assign the storage data-plane role.

Run the Terraform workflow manually with `bootstrap_state` enabled once to create the Azure Storage backend from GitHub. After that, manual Terraform runs use the remote backend.

Keep the deployment workflow secret pointed at the existing production Static Web App:

```text
AZURE_STATIC_WEB_APPS_API_TOKEN
```

Do not replace it with a sandbox deployment token unless you intentionally want the deployment workflow to target that sandbox app.

After applying the production Static Web App, retrieve the sensitive Terraform output or use the Azure portal deployment token and store it as the GitHub Actions secret above. Treat Terraform state as sensitive because it contains the Static Web App deployment token.

## Configuration

The default configuration creates:

| Setting | Default |
| --- | --- |
| Resource group | `rg-runeclicker-app-prod` |
| Static Web App | `swa-runeclicker-app-prod` |
| Location | `eastus2` |
| SKU | `Free` |
