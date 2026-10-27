const { app } = require('@azure/functions');
const { DefaultAzureCredential } = require('@azure/identity');
const {
  BlobServiceClient,
  BlobSASPermissions,
  SASProtocol,
  generateBlobSASQueryParameters
} = require('@azure/storage-blob');
const { principalFrom } = require('../auth');
const { assertAccess } = require('../authorization/policy');
const { getReportResource } = require('../report-resources');

const credentials = new Map();
const services = new Map();

function serviceFor(accountName) {
  if (!services.has(accountName)) {
    const credential = new DefaultAzureCredential();
    credentials.set(accountName, credential);
    services.set(
      accountName,
      new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential)
    );
  }
  return services.get(accountName);
}

async function signedBlobUrl(resource) {
  const service = serviceFor(resource.accountName);
  const startsOn = new Date(Date.now() - 60_000);
  const expiresOn = new Date(Date.now() + resource.sasMinutes * 60_000);
  const delegationKey = await service.getUserDelegationKey(startsOn, expiresOn);
  const sas = generateBlobSASQueryParameters(
    {
      containerName: resource.containerName,
      blobName: resource.blobName,
      permissions: BlobSASPermissions.parse('r'),
      protocol: SASProtocol.Https,
      startsOn,
      expiresOn,
      contentType: resource.contentType,
      contentDisposition: resource.contentDisposition
    },
    delegationKey,
    resource.accountName
  ).toString();
  const blob = service
    .getContainerClient(resource.containerName)
    .getBlobClient(resource.blobName);
  return `${blob.url}?${sas}`;
}

app.http('reportResource', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'report-resource',
  handler: async (request, context) => {
    const principal = principalFrom(request);
    if (!principal) return { status: 401, jsonBody: { error: 'Not authenticated' } };

    const reportId = request.query.get('reportId');
    const resourceName = request.query.get('resource');
    const resource = getReportResource(reportId, resourceName);
    if (!resource) return { status: 404, jsonBody: { error: 'Report resource is not registered' } };

    const access = assertAccess(principal, 'report', resource.policyId);
    if (!access.allowed) return { status: 403, jsonBody: { error: 'Access denied' } };

    try {
      const location = await signedBlobUrl(resource);
      return {
        status: 302,
        headers: {
          Location: location,
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer'
        }
      };
    } catch (error) {
      context.error('report resource signing failed', {
        reportId,
        resourceName,
        message: error.message
      });
      return {
        status: 502,
        jsonBody: {
          error: 'Report resource is unavailable',
          detail: 'Verify the Function managed identity and Blob RBAC assignments.'
        }
      };
    }
  }
});

module.exports = { signedBlobUrl };