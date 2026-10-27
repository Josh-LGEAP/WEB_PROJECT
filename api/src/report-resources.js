const config = require('../config/report-resources.json');

const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

function getReportResource(reportId, resourceName) {
  if (!SAFE_ID.test(String(reportId || '')) || !SAFE_ID.test(String(resourceName || ''))) return null;
  const report = config.reports?.[reportId];
  const resource = report?.resources?.[resourceName];
  if (!report?.policyId || !resource) return null;
  if (!resource.accountName || !resource.containerName || !resource.blobName) return null;
  return {
    reportId,
    resourceName,
    policyId: report.policyId,
    accountName: resource.accountName,
    containerName: resource.containerName,
    blobName: resource.blobName,
    contentType: resource.contentType || undefined,
    contentDisposition: resource.contentDisposition || 'inline',
    sasMinutes: Math.min(15, Math.max(1, Number(resource.sasMinutes) || 5))
  };
}

module.exports = { getReportResource };