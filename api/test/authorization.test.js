const test = require('node:test');
const assert = require('node:assert/strict');
const { canAccess, assertAccess } = require('../src/authorization/policy');

test('authenticated role can access the current KAM report policy', () => {
  const principal = { userDetails: 'user@contoso.com', userRoles: ['anonymous', 'authenticated'] };
  assert.deepEqual(assertAccess(principal, 'report', 'report.kam-bsr-traffic-light.read'), {
    allowed: true,
    reason: 'allowed'
  });
});

test('missing principal is denied', () => {
  assert.equal(canAccess(null, { allowedRoles: ['authenticated'] }), false);
});

test('denied role overrides an allowed role', () => {
  const principal = { userRoles: ['authenticated', 'suspended'] };
  assert.equal(canAccess(principal, { allowedRoles: ['authenticated'], deniedRoles: ['suspended'] }), false);
});

test('unknown policies fail closed', () => {
  assert.deepEqual(assertAccess({ userRoles: ['authenticated'] }, 'report', 'missing'), {
    allowed: false,
    reason: 'policy-not-found'
  });
});
