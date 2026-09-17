# Deploys the portal backend into the existing BOP resource group.
$ErrorActionPreference = 'Stop'

$Subscription = 'a4829f2c-413a-43cb-8e81-18ceac66be81'
$ResourceGroup = 'BOP'
$StaticWebApp  = 'PowerBI-List'

az account set --subscription $Subscription

Write-Host 'Deploying backend infrastructure...' -ForegroundColor Cyan
$out = az deployment group create `
  --resource-group $ResourceGroup `
  --template-file "$PSScriptRoot/main.bicep" `
  --parameters staticWebAppName=$StaticWebApp `
  --query properties.outputs -o json | ConvertFrom-Json

Write-Host "Function App : $($out.functionAppName.value)"
Write-Host "Key Vault    : $($out.keyVaultName.value)"
Write-Host "Storage      : $($out.storageAccountName.value)"
Write-Host ''
Write-Host 'Next: run entra-setup.ps1, then set the app settings it prints.' -ForegroundColor Yellow
