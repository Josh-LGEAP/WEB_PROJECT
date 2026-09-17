const { ClientSecretCredential, DefaultAzureCredential } = require('@azure/identity');
let cached;
function credential() {
  if (cached) return cached;
  const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET } = process.env;
  cached = AZURE_CLIENT_SECRET ? new ClientSecretCredential(AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET) : new DefaultAzureCredential();
  return cached;
}
const tokens = new Map();
async function tokenFor(scope) {
  const hit = tokens.get(scope);
  if (hit && hit.expiresOnTimestamp - Date.now() > 120000) return hit.token;
  const t = await credential().getToken(scope);
  tokens.set(scope, { token: t.token, expiresOnTimestamp: t.expiresOnTimestamp });
  return t.token;
}
const pbiToken = () => tokenFor(process.env.PBI_SCOPE || 'https://analysis.windows.net/powerbi/api/.default');
const graphToken = () => tokenFor(process.env.GRAPH_SCOPE || 'https://graph.microsoft.com/.default');
function principalFrom(request) {
  const header = request.headers.get('x-ms-client-principal');
  if (!header) return null;
  try { return JSON.parse(Buffer.from(header, 'base64').toString('utf8')); } catch { return null; }
}
module.exports = { pbiToken, graphToken, tokenFor, principalFrom };
