const { app } = require('@azure/functions');
const { getRegistry } = require('../registry');
const { latestRefresh, mapLimit } = require('../powerbi');
const state = require('../state');

app.timer('refreshPoller', {
  schedule: process.env.REFRESH_POLL_CRON || '0 */15 * * * *',
  runOnStartup: false,
  handler: async (_timer, context) => {
    await state.ensure();
    const rows = (await getRegistry({ force: true })).filter(r => r.datasetId && r.workspaceId);

    // Deduplicate: several reports commonly sit on one semantic model.
    const targets = [...new Map(rows.map(r => [r.datasetId, r])).values()];

    const results = await mapLimit(targets, 4, async r => {
      const latest = await latestRefresh(r.workspaceId, r.datasetId);
      await state.put(r.datasetId, latest || { status: 'NoHistory' });
      return { datasetId: r.datasetId, status: latest ? latest.status : 'NoHistory' };
    });

    const failed = results.filter(r => r && r.error).length;
    context.log(`Polled ${targets.length} semantic models, ${failed} errored`);
  }
});
