// Backend for the Power BI dashboard portal.
// The Static Web App (PowerBI-List) already exists and is NOT redeployed here.
targetScope = 'resourceGroup'

@description('Short name used to derive resource names.')
param appName string = 'bopportal'

@description('Location for the Function App and storage.')
param location string = resourceGroup().location

@description('Existing Static Web App to link the Functions backend to.')
param staticWebAppName string = 'PowerBI-List'

@description('Entra tenant id.')
param tenantId string = subscription().tenantId

var suffix = uniqueString(resourceGroup().id)
var storageName = toLower('st${appName}${suffix}')
var funcName = '${appName}-api-${suffix}'
var planName = '${appName}-plan'
var kvName = toLower('kv-${appName}-${substring(suffix, 0, 8)}')

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

resource tables 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = {
  name: '${storageName}/default/refreshstate'
  dependsOn: [ storage ]
}

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${appName}-logs'
  location: location
  properties: { sku: { name: 'PerGB2018' }, retentionInDays: 30 }
}

resource insights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${appName}-ai'
  location: location
  kind: 'web'
  properties: { Application_Type: 'web', WorkspaceResourceId: logs.id }
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  sku: { name: 'Y1', tier: 'Dynamic' }
  properties: { reserved: true }
}

resource func 'Microsoft.Web/sites@2023-12-01' = {
  name: funcName
  location: location
  kind: 'functionapp,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'Node|20'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }
        { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '~20' }
        { name: 'AzureWebJobsStorage__accountName', value: storage.name }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: insights.properties.ConnectionString }
        { name: 'STORAGE_ACCOUNT_NAME', value: storage.name }
        { name: 'STATE_TABLE', value: 'refreshstate' }
        { name: 'AZURE_TENANT_ID', value: tenantId }
        { name: 'REFRESH_POLL_CRON', value: '0 */15 * * * *' }
        { name: 'STALE_AFTER_HOURS', value: '26' }
        { name: 'REGISTRY_SOURCE', value: 'sharepoint' }
        // AAD_CLIENT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET, SP_SITE_ID and
        // SP_LIST_ID are set post-deploy (secret via Key Vault reference).
      ]
    }
  }
}

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: kvName
  location: location
  properties: {
    tenantId: tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
    enableSoftDelete: true
  }
}

var storageTableContributor = '/subscriptions/${subscription().subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3'
var storageBlobOwner = '/subscriptions/${subscription().subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
var kvSecretsUser = '/subscriptions/${subscription().subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/4633458b-17de-408a-b874-0445c86b69e6'

resource raTable 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, func.id, 'table')
  scope: storage
  properties: {
    roleDefinitionId: storageTableContributor
    principalId: func.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource raBlob 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, func.id, 'blob')
  scope: storage
  properties: {
    roleDefinitionId: storageBlobOwner
    principalId: func.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource raKv 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(kv.id, func.id, 'secrets')
  scope: kv
  properties: {
    roleDefinitionId: kvSecretsUser
    principalId: func.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource swa 'Microsoft.Web/staticSites@2023-12-01' existing = { name: staticWebAppName }

resource link 'Microsoft.Web/staticSites/linkedBackends@2023-12-01' = {
  parent: swa
  name: 'api'
  properties: { backendResourceId: func.id, region: location }
}

output functionAppName string = func.name
output functionAppUrl string = 'https://${func.properties.defaultHostName}'
output keyVaultName string = kv.name
output storageAccountName string = storage.name
