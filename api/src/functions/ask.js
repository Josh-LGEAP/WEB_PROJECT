const { app } = require('@azure/functions');
const { principalFrom } = require('../auth');
const { getRegistry } = require('../registry');
const { modelConfig } = require('../analytics-config');
const { executeDax } = require('../powerbi-query');
const { aoaiResponse } = require('../openai');

const planSchema = { name: 'dax_plan', schema: { type: 'object', additionalProperties: false, required: ['dax','reason'], properties: { dax: { type: 'string' }, reason: { type: 'string' } } } };

app.http('ask', {
  methods: ['POST'], authLevel: 'anonymous',
  handler: async (request, context) => {
    const principal = principalFrom(request);
    const allowLocalUnauthenticated =
      process.env.ALLOW_LOCAL_UNAUTHENTICATED === 'true';

    if (!principal && !allowLocalUnauthenticated) {
      return {
        status: 401,
        jsonBody: {
          error: 'Not authenticated'
        }
      };
    }
    try {
      const { datasetId, question } = await request.json();
      if (!datasetId || !String(question || '').trim()) return { status: 400, jsonBody: { error: 'datasetId and question are required' } };
      const dashboard = (await getRegistry()).find(x => x.datasetId === datasetId);
      if (!dashboard?.workspaceId) return { status: 404, jsonBody: { error: 'Dataset is not registered' } };
      const model = modelConfig(datasetId);
      if (!model) return { status: 409, jsonBody: { error: 'This dataset has no AI semantic-model configuration yet' } };
      const planner = await aoaiResponse({
        jsonSchema: planSchema,
        input: [
          { role: 'system', content: `You generate one read-only Power BI DAX query. It must begin with EVALUATE, use only the supplied model metadata, return at most 100 rows with TOPN when appropriate, and never use unsupported tables, columns, or measures. Model metadata: ${JSON.stringify(model)}` },
          { role: 'user', content: String(question).slice(0, 2000) }
        ]
      });
      const plan = JSON.parse(planner.text);
      const rows = await executeDax(dashboard.workspaceId, datasetId, plan.dax);
      const answer = await aoaiResponse({
        maxOutputTokens: 1200,
        input: [
          { role: 'system', content: 'Answer the business question concisely using only the supplied Power BI query result. State when the result is empty. Do not invent values.' },
          { role: 'user', content: `Question: ${question}\nDataset: ${dashboard.name}\nRows: ${JSON.stringify(rows)}` }
        ]
      });
      return { jsonBody: { answer: answer.text, dataset: dashboard.name, dax: plan.dax, rows, responseId: answer.responseId } };
    } catch (e) {
      context.error('ask failed', e);
      return { status: 502, jsonBody: { error: e.message } };
    }
  }
});
