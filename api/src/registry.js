const { graphToken } = require('./auth');

const GRAPH = 'https://graph.microsoft.com/v1.0';
const TTL_MS = 5 * 60 * 1000;
let cache = { at: 0, rows: null };

async function graphGet(path) {
  const res = await fetch(`${GRAPH}${path}`, {
    headers: { Authorization: `Bearer ${await graphToken()}` }
  });
  if (!res.ok) throw new Error(`Graph ${res.status} on ${path}: ${await res.text()}`);
  return res.json();
}

/**
 * Pulls the registry from the SharePoint list.
 * Internal column names differ from their display names - SharePoint reserves
 * "Order" (hence Order0) and strips the capital from "Show on Page" (ShowonPage).
 */
async function fromSharePoint() {
  const { SP_SITE_ID, SP_LIST_ID } = process.env;
  const data = await graphGet(
    `/sites/${SP_SITE_ID}/lists/${SP_LIST_ID}/items?expand=fields&$top=200`
  );
  return data.value.map(i => {
    const f = i.fields || {};
    return normalise({
      order: f.Order0,
      name: f.Title,
      category: f.Category,
      description: f.Description,
      url: hyperlink(f.PowerBILink),
      image: f.TileImage,
      owner: person(f.Owner ?? f.OwnerLookupId),
      workspaceId: f.WorkspaceId,
      datasetId: f.DatasetId,
      show: f.ShowonPage,
      archived: f.Archived
    });
  });
}

/** Hyperlink columns arrive as { Url, Description }, plain text columns as a string. */
const hyperlink = v => (v && typeof v === 'object' ? v.Url : v);

/**
 * Person columns come back as a lookup. Graph exposes only OwnerLookupId (a
 * numeric site-user id) unless the field is expanded, so an unresolved lookup
 * renders as nothing rather than as a meaningless number. Switch the column to
 * plain text in SharePoint if the owner name must appear on the tile.
 */
function person(v) {
  if (v == null) return '';
  if (typeof v === 'object') return v.LookupValue || v.Title || v.email || '';
  return typeof v === 'number' ? '' : v;
}

/** Pulls the registry from the Excel table in OneDrive/SharePoint. */
async function fromExcel() {
  const { GRAPH_DRIVE_ID, GRAPH_ITEM_ID, REGISTRY_TABLE_NAME } = process.env;
  const base = `/drives/${GRAPH_DRIVE_ID}/items/${GRAPH_ITEM_ID}/workbook/tables/${REGISTRY_TABLE_NAME}`;
  const [cols, rows] = await Promise.all([
    graphGet(`${base}/columns?$select=name`),
    graphGet(`${base}/rows?$select=values&$top=500`)
  ]);
  const idx = Object.fromEntries(cols.value.map((c, n) => [c.name, n]));
  const at = (v, col) => v[idx[col]];
  return rows.value.map(r => {
    const v = r.values[0];
    return normalise({
      order: at(v, 'Order'),
      name: at(v, 'Dashboard Name'),
      category: at(v, 'Category'),
      description: at(v, 'Description'),
      url: at(v, 'Power BI Link (URL)'),
      image: at(v, 'Tile Image File Name'),
      owner: at(v, 'Owner'),
      workspaceId: at(v, 'Workspace Id'),
      datasetId: at(v, 'Dataset Id'),
      show: at(v, 'Show on Page'),
      archived: at(v, 'Archived')
    });
  });
}

const truthy = v => v === true || String(v).trim().toLowerCase() === 'yes' || String(v).trim().toLowerCase() === 'true';

function normalise(r) {
  return {
    order: Number(r.order) || 999,
    name: String(r.name || '').trim(),
    category: String(r.category || 'Uncategorised').trim(),
    description: String(r.description || '').trim(),
    url: String(r.url || '').trim(),
    image: String(r.image || '').trim(),
    owner: String(r.owner || '').trim(),
    workspaceId: String(r.workspaceId || '').trim(),
    datasetId: String(r.datasetId || '').trim(),
    visible: truthy(r.show),
    archived: truthy(r.archived)
  };
}

/** Registry rows, cached in-process. Invalid rows are dropped, not guessed at. */
async function getRegistry({ force = false } = {}) {
  if (!force && cache.rows && Date.now() - cache.at < TTL_MS) return cache.rows;
  const rows = (process.env.REGISTRY_SOURCE === 'excel' ? await fromExcel() : await fromSharePoint())
    .filter(r => r.visible && !r.archived && r.name && /^https:\/\/app\.powerbi\.com\//i.test(r.url))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  cache = { at: Date.now(), rows };
  return rows;
}

module.exports = { getRegistry };
