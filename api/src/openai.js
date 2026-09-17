const { tokenFor } = require('./auth');

function endpoint() {
  const value = String(process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/$/, '');
  if (!value) throw new Error('AZURE_OPENAI_ENDPOINT is not configured');
  return value;
}

async function aoaiResponse({ input, jsonSchema, maxOutputTokens = 1800 }) {
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  if (!deployment) throw new Error('AZURE_OPENAI_DEPLOYMENT is not configured');
  const token = await tokenFor('https://cognitiveservices.azure.com/.default');
  const body = { model: deployment, input, max_output_tokens: maxOutputTokens };
  if (jsonSchema) {
    body.text = { format: { type: 'json_schema', name: jsonSchema.name, strict: true, schema: jsonSchema.schema } };
  }
  const res = await fetch(`${endpoint()}/openai/v1/responses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Azure OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.output_text || (data.output || []).flatMap(x => x.content || []).find(x => x.type === 'output_text')?.text;
  if (!text) throw new Error('Azure OpenAI returned no text');
  return { text, responseId: data.id || null };
}
module.exports = { aoaiResponse };
