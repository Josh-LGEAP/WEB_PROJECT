<#
.SYNOPSIS
  Collects the latest Power BI refresh times and publishes them to git.

.DESCRIPTION
  1. Runs tools/update-refresh-status.js with your signed-in Azure CLI account.
  2. If app/refresh-status.json changed, commits it and pushes to origin/main.
     The push redeploys the TEST site automatically.
  3. Production is NOT deployed by this script: run GitHub Actions ->
     "Deploy Production" -> "Run workflow" afterwards.

.EXAMPLE
  az login
  .\tools\publish-refresh-status.ps1            # collect, commit, push
  .\tools\publish-refresh-status.ps1 -NoPush    # collect and commit only
#>
param([switch]$NoPush)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

$branch = (git branch --show-current)
if ($branch -ne 'main') { throw "Switch to the main branch first (current: $branch)." }

az account show --query id -o tsv *> $null
if ($LASTEXITCODE -ne 0) { throw 'Not signed in to Azure CLI. Run "az login" first.' }

node tools/update-refresh-status.js
if ($LASTEXITCODE -ne 0) { throw 'Collecting refresh status failed; nothing was committed.' }

$changed = git status --porcelain -- app/refresh-status.json
if (-not $changed) {
  Write-Host 'refresh-status.json is already up to date. Nothing to commit.' -ForegroundColor Green
  return
}

git add app/refresh-status.json
git commit -m ("Update refresh status (" + (Get-Date -Format 'yyyy-MM-dd HH:mm') + ")")
if ($LASTEXITCODE -ne 0) { throw 'git commit failed.' }

if ($NoPush) {
  Write-Host 'Committed locally. Run "git push origin main" when ready.' -ForegroundColor Yellow
  return
}

git push origin main
if ($LASTEXITCODE -ne 0) { throw 'git push failed. Run "git pull --rebase origin main" and retry.' }

Write-Host ''
Write-Host 'Pushed. TEST is deploying. For production run: GitHub -> Actions -> Deploy Production -> Run workflow.' -ForegroundColor Green
