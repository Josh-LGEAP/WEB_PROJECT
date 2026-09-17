const { TableClient } = require('@azure/data-tables');
const { DefaultAzureCredential } = require('@azure/identity');

const PARTITION = 'refresh';
let client;

function table() {
  if (client) return client;
  const account = process.env.STORAGE_ACCOUNT_NAME;
  const name = process.env.STATE_TABLE || 'refreshstate';
  client = new TableClient(
    `https://${account}.table.core.windows.net`,
    name,
    new DefaultAzureCredential()
  );
  return client;
}

async function put(datasetId, payload) {
  await table().upsertEntity(
    {
      partitionKey: PARTITION,
      rowKey: datasetId,
      polledAt: new Date().toISOString(),
      payload: JSON.stringify(payload)
    },
    'Replace'
  );
}

async function all() {
  const out = {};
  for await (const e of table().listEntities({
    queryOptions: { filter: `PartitionKey eq '${PARTITION}'` }
  })) {
    out[e.rowKey] = { polledAt: e.polledAt, ...JSON.parse(e.payload) };
  }
  return out;
}

module.exports = { put, all, ensure: () => table().createTable().catch(() => {}) };
