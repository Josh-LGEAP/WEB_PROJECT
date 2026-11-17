#!/usr/bin/env node
/*
 * Writes app/refresh-status.json: the latest Power BI refresh of every dataset
 * in api/config/dashboards.json, read with YOUR OWN signed-in Azure CLI account.
 *
 *   az login
 *   node tools/update-refresh-status.js
 *   git add app/refresh-status.json && git commit -m "Update refresh status" && git push
 *
 * The portal shows this file whenever the /api/refreshes backend has no data
 * (see app/app.js). It is a snapshot: it is only as fresh as the last run.
 * Read-only: it only calls GET .../refreshes?$top=1 on Power BI.
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const PBI = 'https://api.powerbi.com/v1.0/myorg';
const CONCURRENCY = 4;

function token() {
  try {
    return execSync(
      'az account get-access-token --resource https://analysis.windows.net/powerbi/api --query accessToken -o tsv',
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    ).trim();
  } catch (e) {
    console.error('Could not get a Power BI token. Run "az login" first.\n' + (e.stderr || e.message));
    process.exit(1);
  }
}

async function latestRefresh(accessToken, workspaceId, datasetId, attempt = 1) {
  const res = await fetch(`${PBI}/groups/${workspaceId}/datasets/${datasetId}/refreshes?$top=10`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (res.status === 429 && attempt < 4) {
    await new Promise(r => setTimeout(r, Number(res.headers.get('retry-after') || 10) * 1000));
    return latestRefresh(accessToken, workspaceId, datasetId, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const history = (await res.json()).value || [];
  const latest = history[0];
  if (!latest) return { status: 'NoHistory' };
  // History is newest first. The newest attempt may have failed or still be
  // running, so also keep when the data last refreshed successfully.
  const lastSuccess = history.find(r => r.status === 'Completed');
  return {
    status: latest.status,
    refreshType: latest.refreshType || null,
    startTime: latest.startTime || null,
    endTime: latest.endTime || null,
    lastSuccessTime: lastSuccess?.endTime || null
  };
}

async function main() {
  const { dashboards } = require(path.join(root, 'api/config/dashboards.json'));
  const targets = [...new Map(
    dashboards.filter(d => d.workspaceId && d.datasetId).map(d => [d.datasetId, d])
  ).values()];

  const accessToken = token();
  const items = {};
  const failures = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, async () => {
    while (cursor < targets.length) {
      const d = targets[cursor++];
      try {
        items[d.datasetId] = await latestRefresh(accessToken, d.workspaceId, d.datasetId);
        console.log(`ok    ${d.name}  ${items[d.datasetId].status}  ${items[d.datasetId].endTime || ''}`);
      } catch (e) {
        failures.push(`${d.name}: ${e.message}`);
        console.error(`FAIL  ${d.name}: ${e.message}`);
      }
    }
  }));

  if (!Object.keys(items).length) {
    console.error('No dataset could be read; refresh-status.json was not changed.');
    process.exit(1);
  }
  const sorted = Object.fromEntries(Object.entries(items).sort(([a], [b]) => a.localeCompare(b)));
  const out = { generatedAt: new Date().toISOString(), items: sorted };
  fs.writeFileSync(path.join(root, 'app/refresh-status.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`\nWrote app/refresh-status.json (${Object.keys(items).length} datasets, ${failures.length} failed)`);
}

main();
