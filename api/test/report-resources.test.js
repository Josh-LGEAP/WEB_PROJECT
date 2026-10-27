const test = require('node:test');
const assert = require('node:assert/strict');
const { getReportResource } = require('../src/report-resources');

test('tutorial resource maps to the private Blob and report policy', () => {
  assert.deepEqual(getReportResource('kam-bsr-traffic-light', 'tutorialHtml'), {
    reportId: 'kam-bsr-traffic-light',
    resourceName: 'tutorialHtml',
    policyId: 'report.kam-bsr-traffic-light.read',
    accountName: 'lgeapbop',
    containerName: 'bi-portal',
    blobName: 'kam/bsr-traffic/BSR_TrafficLight_Report_Video_Tutorial.html',
    contentType: 'text/html; charset=utf-8',
    contentDisposition: 'inline',
    sasMinutes: 5
  });
});

test('Report HTML remains unavailable because no server resource is registered', () => {
  assert.equal(getReportResource('kam-bsr-traffic-light', 'reportHtml'), null);
});

test('arbitrary report and resource identifiers fail closed', () => {
  assert.equal(getReportResource('../secret', 'tutorialHtml'), null);
  assert.equal(getReportResource('kam-bsr-traffic-light', '../tutorialHtml'), null);
});