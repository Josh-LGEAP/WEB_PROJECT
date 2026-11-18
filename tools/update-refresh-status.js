#!/usr/bin/env node
/*
 * Writes app/refresh-status.json: the latest Power BI refresh of every dataset
 * in api/config/dashboards.json, read with YOUR OWN signed-in Azure CLI account.
 *
 * Two ways to publish the result:
 *
 *   A) Git (needs a push and a Deploy Production run):
 *        az login
 *        node tools/update-refresh-status.js
 *        git add app/refresh-status.json && git commit -m "Update refresh status" && git push
 *
 *   B) Azure Blob (no push, no deploy; TEST and production update at once):
 *        az login
 *        node tools/update-refresh-status.js --upload
 *      Uploads to https://<account>.blob.core.windows.net/<container>/<blob>
 *      (defaults below, override with REFRESH_BLOB_ACCOUNT / _CONTAINER / _NAME).
 *      Your account needs "Storage Blob Data Contributor" on the storage account.
 *      app/refresh-status.json is left untouched in this mode.
 *
 * The portal shows this data whenever the /api/refreshes backend has no data
 * (see app/app.js). It is a snapshot: it is only as fresh as the last run.
 * Read-only towards Power BI: it only calls GET .../refreshes?$top=10.
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const PBI = 'https://api.powerbi.com/v1.0/myorg';
const CONCURRENCY = 4;
const UPLOAD = process.argv.includes('--upload');
const BLOB = {
  account: process.env.REFRESH_BLOB_ACCOUNT || 'lgeapbop',
  container: process.env.REFRESH_BLOB_CONTAINER || 'bi-portal',
  name: process.env.REFRESH_BLOB_NAME || 'refresh-status/refresh-status.json'
};

function uploadToBlob(file) {
  try {
    execSync(
      `az storage blob upload --account-name ${BLOB.account} --container-name ${BLOB.container} ` +
      `--name "${BLOB.name}" --file "${file}" --auth-mode login --overwrite ` +
      `--content-type application/json --content-cache-control no-cache -o none`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    console.log(`Uploaded to https://${BLOB.account}.blob.core.windows.net/${BLOB.container}/${BLOB.name}`);
  } catch (e) {
    console.error('Blob upload failed. Check "az login" and the Storage Blob Data Contributor role.\n' + (e.stderr || e.message));
    process.exit(1);
  }
}

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
  const file = path.join(root, 'app/refresh-status.json');

  if (UPLOAD) {
    // generatedAt = when this check ran, so the portal can tell the data is current.
    const tmp = path.join(os.tmpdir(), 'bop-refresh-status.json');
    fs.writeFileSync(tmp, JSON.stringify({ generatedAt: new Date().toISOString(), items: sorted }, null, 2) + '\n');
    uploadToBlob(tmp);
    fs.rmSync(tmp, { force: true });
    return;
  }

  // Do not rewrite the file when nothing changed, so repeated runs create no
  // needless commits or deployments.
  try {
    const previous = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!failures.length && JSON.stringify(previous.items) === JSON.stringify(sorted)) {
      console.log('\nNo change since the last snapshot; app/refresh-status.json was not rewritten.');
      return;
    }
  } catch { /* no previous snapshot */ }

  const out = { generatedAt: new Date().toISOString(), items: sorted };
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  console.log(`\nWrote app/refresh-status.json (${Object.keys(items).length} datasets, ${failures.length} failed)`);
}

main();
