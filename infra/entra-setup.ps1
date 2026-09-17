param(
  # Supply an app id created for you by an Entra administrator to skip creation.
  [string]$AppId
)

# Creates the Entra app registration used for (a) user sign-in on the Static Web App
# and (b) the service principal that reads Power BI refresh history and the registry.
$ErrorActionPreference = 'Stop'

$DisplayName   = 'BOP Dashboard Portal'
$StaticWebApp  = 'PowerBI-List'
$ResourceGroup = 'BOP'

$swaHost = az staticwebapp show -n $StaticWebApp -g $ResourceGroup --query defaultHostname -o tsv
$redirect = "https://$swaHost/.auth/login/aad/callback"
Write-Host "Redirect URI: $redirect" -ForegroundColor Cyan

if ($AppId) { $appId = $AppId } else {
$appId = az ad app create `
  --display-name $DisplayName `
  --sign-in-audience AzureADMyOrg `
  --web-redirect-uris $redirect `
  --query appId -o tsv 2>$null

}

if (-not $appId) {
  Write-Host ''
  Write-Host 'App registration could not be created.' -ForegroundColor Red
  Write-Host 'Your account lacks the Application Developer role in Entra ID, or'
  Write-Host 'the tenant blocks self-service app registration. Ask an Entra'
  Write-Host 'administrator to create it, then re-run this script with -AppId:'
  Write-Host ''
  Write-Host "  .\entra-setup.ps1 -AppId <existing app id>" -ForegroundColor Yellow
  Write-Host ''
  Write-Host "Redirect URI the app must have: $redirect"
  exit 1
}

az ad sp create --id $appId 2>$null | Out-Null

# Power BI Service resource id
$pbi = '00000009-0000-0000-c000-000000000000'
# Microsoft Graph resource id
$graph = '00000003-0000-0000-c000-000000000000'

# Delegated: Dataset.Read.All, Report.Read.All
az ad app permission add --id $appId --api $pbi --api-permissions `
  '7f33e027-4039-419b-938e-2f8ca153e68e=Scope' `
  '4ae1bf56-f562-4747-b7bc-2fa0874ed46f=Scope'

# Application: Graph Sites.Read.All (registry list) + Files.Read.All (tile images)
az ad app permission add --id $appId --api $graph --api-permissions `
  '332a536c-c7ef-4017-ab91-336970924f0d=Role' `
  '01d4889c-1287-42c6-ac1f-5d1e02578ef6=Role'

$secret = az ad app credential reset --id $appId --years 2 --query password -o tsv

Write-Host ''
Write-Host "AAD_CLIENT_ID / AZURE_CLIENT_ID : $appId" -ForegroundColor Green
Write-Host "Client secret (store in Key Vault NOW, it is not shown again):" -ForegroundColor Yellow
Write-Host $secret
Write-Host ''
Write-Host 'MANUAL STEPS THAT CANNOT BE SCRIPTED:' -ForegroundColor Magenta
Write-Host '1. Grant admin consent:  az ad app permission admin-consent --id ' $appId
Write-Host '2. Power BI Admin Portal > Tenant settings > Developer settings >'
Write-Host '   "Service principals can use Fabric APIs" -> enable for a security group'
Write-Host '   containing this service principal.'
Write-Host '3. Add the service principal as Viewer on the workspaces holding the'
Write-Host '   reports: "(BOP) Reports Share" and "(TEMP) Reports".'
Write-Host '4. Store the secret:'
Write-Host '   az keyvault secret set --vault-name <kv> --name portal-client-secret --value <secret>'
