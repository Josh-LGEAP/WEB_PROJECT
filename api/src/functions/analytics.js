const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');
const readline = require('readline');

const ACCOUNT = process.env.ANALYTICS_STORAGE_ACCOUNT || 'lgeapbop';
const CONTAINER = process.env.ANALYTICS_CONTAINER || 'bi-portal';
const BLOB_NAME = process.env.ANALYTICS_BLOB_NAME || 'store_sellout_au.csv';
const CACHE_MINUTES = Number(process.env.ANALYTICS_CACHE_MINUTES || 15);

let cache = { expires: 0, payload: null };
// FIX #1: single-flight guard. When cache is empty/expired and multiple
// requests land concurrently, they all await this SAME promise instead of
// each independently downloading + parsing the CSV (which is what caused
// the two overlapping "Functions.analytics" invocations -> OOM/exit 137).
let inFlightPromise = null;

function splitPipe(line) {
  return line.split(',').map(v => v.trim());
}
function number(v) {
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
function topEntries(map, limit = 10) {
  return [...map.entries()]
    .map(([name, value]) => ({ name, value: round2(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/**
 * FIX #2: stream + parse line-by-line using readline instead of:
 *   1) buffering the whole blob into a Buffer[]
 *   2) Buffer.concat() into one big Buffer
 *   3) .toString('utf8') into one big string
 *   4) text.split(/\r?\n/) into an array of every line
 * That old 4-step pipeline held ~3-4x the raw file size in memory at once.
 * Here we only ever hold one line at a time plus the small running
 * aggregate Maps (byWeek/byChannel/byState/byModel/byPg), so peak memory
 * no longer scales with file size.
 */
async function loadAndSummarize() {
  const service = new BlobServiceClient(
    `https://${ACCOUNT}.blob.core.windows.net`,
    new DefaultAzureCredential()
  );
  const client = service.getContainerClient(CONTAINER).getBlobClient(BLOB_NAME);
  const response = await client.download();

  const lastModified = response.lastModified ? response.lastModified.toISOString() : null;
  const etag = response.etag || null;

  const rl = readline.createInterface({
    input: response.readableStreamBody,
    crlfDelay: Infinity
  });

  let headers = null;
  let idx = null;
  let headerChecked = false;

  let sellOutQty = 0, sellOutAmt = 0, displayQty = 0, sellableQty = 0;
  let validRows = 0, maxDate = '';
  const byWeek = new Map(), byChannel = new Map(), byState = new Map(), byModel = new Map(), byPg = new Map();
  const filters = { channels: new Set(), states: new Set(), pgs: new Set() };

  const required = ['YYYYMMDD', 'CHANNEL_NAME', 'SUB_CHANNEL_NAME', 'State', 'MODEL_SUFFIX_CODE', 'PG', 'SELL_OUT_QTY', 'SELL_OUT_AMT', 'DISPLAY_QTY', 'SELLABLE_QTY', 'N_YEAR_WEEK_YYYY-WWW'];

  let lineNo = -1;
  for await (const rawLine of rl) {
    lineNo++;
    const line = rawLine.replace(/^\uFEFF/, '');
    if (!line.trim()) continue;

    if (!headerChecked) {
      headers = splitPipe(line);
      idx = Object.fromEntries(headers.map((h, i) => [h, i]));
      const missing = required.filter(c => idx[c] === undefined);
      if (missing.length) throw new Error(`Missing columns: ${missing.join(', ')}`);
      headerChecked = true;
      continue;
    }

    if (/^-+(\+-+)+$/.test(line)) continue;
    const v = splitPipe(line);
    if (v.length < headers.length - 1) continue;

    validRows++;
    const qty = number(v[idx.SELL_OUT_QTY]);
    const amt = number(v[idx.SELL_OUT_AMT]);
    const disp = number(v[idx.DISPLAY_QTY]);
    const sellable = number(v[idx.SELLABLE_QTY]);
    const date = v[idx.YYYYMMDD] || '';
    const week = v[idx['N_YEAR_WEEK_YYYY-WWW']] || 'Unknown';
    const channel = v[idx.CHANNEL_NAME] || 'Unknown';
    const state = v[idx.State] || 'Unknown';
    const model = v[idx.MODEL_SUFFIX_CODE] || 'Unknown';
    const pg = v[idx.PG] || 'Unknown';

    sellOutQty += qty; sellOutAmt += amt; displayQty += disp; sellableQty += sellable;
    if (date > maxDate) maxDate = date;
    byWeek.set(week, (byWeek.get(week) || 0) + amt);
    byChannel.set(channel, (byChannel.get(channel) || 0) + amt);
    byState.set(state, (byState.get(state) || 0) + amt);
    byModel.set(model, (byModel.get(model) || 0) + qty);
    byPg.set(pg, (byPg.get(pg) || 0) + amt);
    filters.channels.add(channel); filters.states.add(state); filters.pgs.add(pg);
  }

  if (!headerChecked) throw new Error('CSV has no header row');
  if (validRows === 0) throw new Error('CSV has no data rows');

  return {
    source: { account: ACCOUNT, container: CONTAINER, blob: BLOB_NAME, lastModified, etag },
    generatedAt: new Date().toISOString(),
    latestDataDate: maxDate || null,
    rowCount: validRows,
    kpis: { sellOutQty: round2(sellOutQty), sellOutAmt: round2(sellOutAmt), displayQty: round2(displayQty), sellableQty: round2(sellableQty) },
    weeklySellOutAmt: [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value: round2(value) })),
    topChannels: topEntries(byChannel),
    topStates: topEntries(byState),
    topModels: topEntries(byModel),
    productGroups: topEntries(byPg),
    filters: {
      channels: [...filters.channels].sort(),
      states: [...filters.states].sort(),
      pgs: [...filters.pgs].sort()
    }
  };
}

app.http('analytics', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'analytics',
  handler: async (request, context) => {
    try {
      const refresh = request.query.get('refresh') === '1';
      if (!refresh && cache.payload && Date.now() < cache.expires) {
        return { jsonBody: cache.payload };
      }

      // FIX #1 (continued): if a load is already in progress, piggy-back on
      // it instead of starting a second concurrent download+parse.
      if (!inFlightPromise) {
        inFlightPromise = loadAndSummarize()
          .then((payload) => {
            cache = { payload, expires: Date.now() + CACHE_MINUTES * 60_000 };
            return payload;
          })
          .finally(() => { inFlightPromise = null; });
      }

      const payload = await inFlightPromise;
      return { headers: { 'Cache-Control': 'private, max-age=60' }, jsonBody: payload };
    } catch (e) {
      context.error('analytics failed', e);
      return { status: 502, jsonBody: { error: 'Analytics data unavailable', detail: e.message } };
    }
  }
});
