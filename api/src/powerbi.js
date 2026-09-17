const { pbiToken } = require('./auth');

const PBI = 'https://api.powerbi.com/v1.0/myorg';

async function pbiGet(path) {
  const res = await fetch(`${PBI}${path}`, {
    headers: { Authorization: `Bearer ${await pbiToken()}` }
  });
  if (res.status === 429) {
    const retry = Number(res.headers.get('retry-after') || 30);
    const err = new Error(`Throttled, retry after ${retry}s`);
    err.retryAfter = retry;
    err.throttled = true;
    throw err;
  }
  if (!res.ok) throw new Error(`Power BI ${res.status} on ${path}: ${await res.text()}`);
  return res.json();
}

/**
 * Latest refresh for one dataset. Returns null when the dataset has no refresh
 * history (DirectQuery / live connection) rather than inventing a timestamp.
 */
async function latestRefresh(groupId, datasetId) {
  const data = await pbiGet(`/groups/${groupId}/datasets/${datasetId}/refreshes?$top=1`);
  const r = data.value && data.value[0];
  if (!r) return null;
  return {
    status: r.status,                          // Completed | Failed | Unknown (in progress) | Disabled
    startTime: r.startTime || null,
    endTime: r.endTime || null,
    refreshType: r.refreshType || null,
    error: r.serviceExceptionJson || null
  };
}

/** Small concurrency limiter - the refreshes endpoint throttles hard on fan-out. */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        try {
          out[i] = await fn(items[i]);
        } catch (e) {
          out[i] = { error: e.message, throttled: !!e.throttled };
        }
      }
    })
  );
  return out;
}

module.exports = { latestRefresh, mapLimit, pbiGet };
