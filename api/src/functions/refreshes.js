const { app } = require('@azure/functions');
const { all } = require('../state');
const { principalFrom } = require('../auth');

const STALE_HOURS = Number(process.env.STALE_AFTER_HOURS || 26);

function health(entry) {
  if (!entry) return 'unknown';
  if (entry.status === 'Failed') return 'failed';
  if (entry.status === 'Unknown') return 'running';
  if (!entry.endTime) return 'unknown';
  const ageH = (Date.now() - Date.parse(entry.endTime)) / 3_600_000;
  if (ageH <= STALE_HOURS) return 'fresh';
  if (ageH <= STALE_HOURS * 2) return 'aging';
  return 'stale';
}

app.http('refreshes', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    if (!principalFrom(request)) return { status: 401, jsonBody: { error: 'Not authenticated' } };
    try {
      const state = await all();
      const items = Object.fromEntries(
        Object.entries(state).map(([id, e]) => [id, { ...e, health: health(e) }])
      );
      return { jsonBody: { polled: Object.keys(items).length, items } };
    } catch (e) {
      context.error('refreshes failed', e);
      return { status: 502, jsonBody: { error: 'Refresh state unavailable' } };
    }
  }
});
