const { app } = require('@azure/functions');
const { getRegistry } = require('../registry');
const { principalFrom } = require('../auth');

app.http('registry', {
  methods: ['GET'],
  authLevel: 'anonymous', // Static Web Apps enforces auth in front of this
  handler: async (request, context) => {
    if (!principalFrom(request)) return { status: 401, jsonBody: { error: 'Not authenticated' } };
    try {
      const rows = await getRegistry({ force: request.query.get('refresh') === '1' });
      return {
        jsonBody: {
          generatedAt: new Date().toISOString(),
          count: rows.length,
          dashboards: rows
        }
      };
    } catch (e) {
      context.error('registry failed', e);
      return { status: 502, jsonBody: { error: 'Registry unavailable' } };
    }
  }
});
