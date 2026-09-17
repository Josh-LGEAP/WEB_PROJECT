const { app } = require('@azure/functions');

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async () => ({ jsonBody: { ok: true, at: new Date().toISOString() } })
});
