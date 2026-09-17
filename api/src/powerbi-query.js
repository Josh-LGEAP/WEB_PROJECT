const { pbiToken } = require('./auth');
const PBI = 'https://api.powerbi.com/v1.0/myorg';
const MAX_ROWS = Number(process.env.PBI_QUERY_MAX_ROWS || 1000);

async function executeDax(workspaceId, datasetId, dax) {
  if (!workspaceId || !datasetId || !dax) throw new Error('workspaceId, datasetId and dax are required');
  if (!/^\s*EVALUATE\b/i.test(dax)) throw new Error('Only read-only DAX queries beginning with EVALUATE are allowed');
  const res = await fetch(`${PBI}/groups/${encodeURIComponent(workspaceId)}/datasets/${encodeURIComponent(datasetId)}/executeQueries`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await pbiToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries: [{ query: dax }], serializerSettings: { includeNulls: true } })
  });
  if (!res.ok) throw new Error(`Power BI ${res.status}: ${await res.text()}`);
  const payload = await res.json();
  const rows = payload.results?.[0]?.tables?.[0]?.rows || [];
  return rows.slice(0, MAX_ROWS);
}
module.exports = { executeDax };
