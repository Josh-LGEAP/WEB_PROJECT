const test = require('node:test');
const assert = require('node:assert/strict');
const { getReportResource } = require('../src/report-resources');

test('future private tutorial resource maps to the Blob and report policy', () => {
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

test('future private Report HTML resource remains unregistered while public URL is active', () => {
  assert.equal(getReportResource('kam-bsr-traffic-light', 'reportHtml'), null);
});

test('arbitrary report and resource identifiers fail closed', () => {
  assert.equal(getReportResource('../secret', 'tutorialHtml'), null);
  assert.equal(getReportResource('kam-bsr-traffic-light', '../tutorialHtml'), null);
});