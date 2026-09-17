const { app } = require('@azure/functions');
const { principalFrom } = require('../auth');
const { getRegistry } = require('../registry');
const { analyticsConfig } = require('../analytics-config');
const { executeDax } = require('../powerbi-query');

app.http('analyticsQuery', {
  methods: ['POST'], authLevel: 'anonymous',
  handler: async (request, context) => {
    if (!principalFrom(request)) return { status: 401, jsonBody: { error: 'Not authenticated' } };
    try {
      const { datasetId } = await request.json();
      const dashboard = (await getRegistry()).find(x => x.datasetId === datasetId);
      if (!dashboard?.workspaceId) return { status: 404, jsonBody: { error: 'Dataset is not registered' } };
      const cfg = analyticsConfig(datasetId);
      if (!cfg) return { status: 409, jsonBody: { error: 'This dataset has no Quick Analytics query configuration yet' } };
      const output = {};
      for (const [key, item] of Object.entries(cfg)) output[key] = await executeDax(dashboard.workspaceId, datasetId, item.dax);
      return { jsonBody: { dataset: dashboard.name, visuals: output } };
    } catch (e) {
      context.error('analyticsQuery failed', e);
      return { status: 502, jsonBody: { error: e.message } };
    }
  }
});
