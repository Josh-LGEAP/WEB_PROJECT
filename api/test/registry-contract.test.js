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
  assert.equal(report.links.tutorialHtml, 'https://lgeapbop.blob.core.windows.net/bi-portal/kam/bsr-traffic/BSR_TrafficLight_Report_Video_Tutorial.html');
  assert.equal(report.rawExcel.fileNameCandidate, 'LG AV NOVEMBER 2026 20-10-26.xlsx');
});
