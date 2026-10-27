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
  assert.equal(report.name, 'BSR Traffic Light');
  assert.equal(report.createdBy, 'Created by JohnPaul OConnor');
  assert.equal(Object.hasOwn(report, 'status'), false);
  assert.equal(report.links.reportHtml, 'https://lgeapbop.blob.core.windows.net/bi-portal/kam/bsr-traffic/BSR Traffic Light Report.html');
  assert.equal(report.links.rawExcel, null);
  assert.equal(report.links.tutorialHtml, 'https://lgeapbop.blob.core.windows.net/bi-portal/kam/bsr-traffic/BSR_TrafficLight_Report_Video_Tutorial.html');
  assert.equal(report.rawExcel.fileNameCandidate, 'LG AV NOVEMBER 2026 20-10-26.xlsx');
});

test('current public Tutorial bypasses the Function proxy while private migration config remains available', () => {
  const report = registry.reports.find(item => item.id === 'kam-bsr-traffic-light');
  assert.equal(report.links.tutorialHtml.startsWith('https://lgeapbop.blob.core.windows.net/'), true);
  assert.equal(report.links.tutorialHtml.includes('/api/report-resource'), false);
  assert.equal(report.authorization.enforcement, 'ui-only-for-public-links;api-required-for-private-resources');
});

test('Report HTML is enabled by the exact user-supplied public Blob URL', () => {
  const report = registry.reports.find(item => item.id === 'kam-bsr-traffic-light');
  assert.equal(report.links.reportHtml, 'https://lgeapbop.blob.core.windows.net/bi-portal/kam/bsr-traffic/BSR Traffic Light Report.html');
  assert.equal(Boolean(report.links.reportHtml), true);
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
