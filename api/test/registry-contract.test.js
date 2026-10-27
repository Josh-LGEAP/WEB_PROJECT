const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const registry = require(path.join(__dirname, '../../app/modules/report-hub/bop-report-hub.registry.json'));

test('Report Hub declares KAM and GTM as additive tabs', () => {
  const ids = new Set(registry.tabs.map(tab => tab.id));
  assert.equal(ids.has('kam'), true);
  assert.equal(ids.has('gtm'), true);
  assert.equal(ids.has('dashboard'), false);
});

test('every report has three link fields and an individual policy', () => {
  registry.reports.forEach(report => {
    assert.equal(typeof report.id, 'string');
    assert.equal(typeof report.authorization?.policyId, 'string');
    assert.equal(Object.hasOwn(report.links, 'reportHtml'), true);
    assert.equal(Object.hasOwn(report.links, 'tutorialHtml'), true);
    assert.equal(Object.hasOwn(report.links, 'rawExcel'), true);
  });
});

test('KAM BSR report preserves confirmed and unconfirmed metadata', () => {
  const report = registry.reports.find(item => item.id === 'kam-bsr-traffic-light');
  assert.ok(report);
  assert.equal(report.links.reportHtml, null);
  assert.equal(report.links.rawExcel, null);
  assert.equal(report.links.tutorialHtml, '/api/report-resource?reportId=kam-bsr-traffic-light&resource=tutorialHtml');
  assert.equal(report.rawExcel.fileNameCandidate, 'LG AV NOVEMBER 2026 20-10-26.xlsx');
});

test('Report HTML is disabled for the exact registry reason: its URL is null', () => {
  const report = registry.reports.find(item => item.id === 'kam-bsr-traffic-light');
  assert.equal(report.links.reportHtml, null);
  assert.equal(Boolean(report.links.reportHtml), false);
});

test('Report Hub defines separate HTML-preview and download action behaviours', () => {
  const source = require('node:fs').readFileSync(
    path.join(__dirname, '../../app/modules/report-hub/bop-report-hub.js'),
    'utf8'
  );
  assert.equal(source.includes("behavior === 'html-preview'"), true);
  assert.equal(source.includes("link.target = '_blank'"), true);
  assert.equal(source.includes("link.rel = 'noopener noreferrer'"), true);
  assert.equal(source.includes("behavior === 'download'"), true);
  assert.equal(source.includes("link.setAttribute('download', '')"), true);
});
