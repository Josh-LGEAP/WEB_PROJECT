const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const manifest = require(path.join(root, 'qa/dashboard-baseline-manifest.json'));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const fileHash = relativePath => sha256(fs.readFileSync(path.join(root, relativePath)));

test('Dashboard core files remain byte-identical to the original package', () => {
  for (const [relativePath, expectedHash] of Object.entries(manifest.coreFileSha256)) {
    assert.equal(fileHash(relativePath), expectedHash, `${relativePath} changed`);
  }
});

test('all original Dashboard tile assets remain byte-identical', () => {
  for (const [relativePath, expectedHash] of Object.entries(manifest.tileAssetSha256)) {
    assert.equal(fileHash(relativePath), expectedHash, `${relativePath} changed`);
  }
});

test('Dashboard names, URLs, Power BI IDs, order and visibility remain unchanged', () => {
  const registry = require(path.join(root, 'app/registry.json'));
  const projection = registry.dashboards.map(item => ({
    order: item.order,
    name: item.name,
    category: item.category,
    url: item.url,
    image: item.image,
    workspaceId: item.workspaceId,
    datasetId: item.datasetId,
    visible: item.visible,
    archived: item.archived
  }));
  assert.deepEqual(projection, manifest.dashboardRegistryProjection);
  assert.equal(projection.length, manifest.dashboardCount);
  assert.equal(projection.filter(item => item.url.startsWith('https://app.powerbi.com/')).length, manifest.powerBiLinkCount);
});

test('original Dashboard DOM block and navigation control remain unchanged', () => {
  const html = fs.readFileSync(path.join(root, 'app/index.html'), 'utf8');
  const start = html.indexOf('    <section class="statusbar"');
  const end = html.indexOf('    <div id="ai-page"', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  assert.equal(sha256(html.slice(start, end)), manifest.dashboardMarkupSha256);
  assert.equal(html.includes(manifest.dashboardNavMarkup), true);
  assert.equal(html.includes('id="bop-report-hub-kam-page" class="bop-report-hub" data-bop-report-hub-tab="kam" hidden'), true);
  assert.equal(html.includes('id="bop-report-hub-gtm-page" class="bop-report-hub" data-bop-report-hub-tab="gtm" hidden'), true);
  assert.ok(html.indexOf('src="app.js"') < html.indexOf('src="modules/report-hub/bop-report-hub.js"'));
});

test('Report Hub selectors and identifiers do not collide with Dashboard namespace', () => {
  const css = fs.readFileSync(path.join(root, 'app/modules/report-hub/bop-report-hub.css'), 'utf8');
  const javascript = fs.readFileSync(path.join(root, 'app/modules/report-hub/bop-report-hub.js'), 'utf8');
  for (const forbidden of ['.tile{', '.grid{', '.topnav{', '.toolbar{', '.statusbar{', '#content', '#search']) {
    assert.equal(css.includes(forbidden), false, `module CSS contains legacy selector ${forbidden}`);
  }
  assert.equal(/window\.[A-Za-z_$][\w$]*\s*=/.test(javascript), false, 'module creates a global assignment');
  assert.equal(javascript.trimStart().startsWith('(() => {'), true, 'module is not isolated in an IIFE');
});

test('Coming Soon module is isolated and intercepts only AI and Analytics', () => {
  const css = fs.readFileSync(path.join(root, 'app/modules/coming-soon/bop-coming-soon.css'), 'utf8');
  const javascript = fs.readFileSync(path.join(root, 'app/modules/coming-soon/bop-coming-soon.js'), 'utf8');
  assert.equal(javascript.trimStart().startsWith('(() => {'), true);
  assert.equal(/window\.[A-Za-z_$][\w$]*\s*=/.test(javascript), false);
  assert.equal(javascript.includes("'nav-ai'"), true);
  assert.equal(javascript.includes("'nav-analytics'"), true);
  assert.equal(javascript.includes("PAGE_BY_NAV[button.id]"), true);
  assert.equal(css.includes('.tile{'), false);
  assert.equal(css.includes('.grid{'), false);
  assert.equal(css.includes('#content'), false);
});
