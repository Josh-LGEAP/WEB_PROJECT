const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');

// The dashboard list lives in three places that must never drift apart:
//   app/app.js            EMBEDDED  (browser fallback when /api/registry fails)
//   app/registry.json                (committed snapshot)
//   api/config/dashboards.json       (served by /api/registry when REGISTRY_SOURCE=static)
function embedded() {
  const source = fs.readFileSync(path.join(root, 'app/app.js'), 'utf8');
  const match = source.match(/const EMBEDDED = (\[[\s\S]*?\n\]);/);
  assert.ok(match, 'EMBEDDED array not found in app/app.js');
  return JSON.parse(match[1]);
}

test('EMBEDDED, app/registry.json and api/config/dashboards.json list the same dashboards', () => {
  const fromApp = embedded();
  const fromSnapshot = require(path.join(root, 'app/registry.json')).dashboards;
  const fromApi = require(path.join(root, 'api/config/dashboards.json')).dashboards;
  assert.deepEqual(fromSnapshot, fromApp);
  assert.deepEqual(fromApi, fromApp);
});

test('registry.json count matches the number of dashboards', () => {
  const snapshot = require(path.join(root, 'app/registry.json'));
  assert.equal(snapshot.count, snapshot.dashboards.length);
});

test('every dashboard has a Power BI link and a unique order', () => {
  const { dashboards } = require(path.join(root, 'api/config/dashboards.json'));
  for (const d of dashboards) {
    assert.match(d.url, /^https:\/\/app\.powerbi\.com\//, `${d.name} link`);
    assert.ok(d.name && d.category, 'name and category are required');
  }
  const orders = dashboards.map(d => d.order);
  assert.equal(new Set(orders).size, orders.length, 'order values must be unique');
});

test('static registry source returns every visible dashboard', async () => {
  const previous = process.env.REGISTRY_SOURCE;
  process.env.REGISTRY_SOURCE = 'static';
  try {
    const { getRegistry } = require('../src/registry');
    const rows = await getRegistry({ force: true });
    const expected = require(path.join(root, 'api/config/dashboards.json')).dashboards;
    assert.equal(rows.length, expected.length);
    assert.deepEqual(rows.map(r => r.name), expected.map(d => d.name));
  } finally {
    if (previous === undefined) delete process.env.REGISTRY_SOURCE;
    else process.env.REGISTRY_SOURCE = previous;
  }
});
