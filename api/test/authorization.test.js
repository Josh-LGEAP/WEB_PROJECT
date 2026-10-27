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

test('Entra group object ID is accepted only when present in trusted principal claims', () => {
  const principal = {
    userRoles: ['authenticated'],
    claims: [{ typ: 'groups', val: '11111111-2222-3333-4444-555555555555' }]
  };
  assert.equal(canAccess(principal, {
    allowedRoles: [],
    allowedUsers: [],
    entraGroupObjectIds: ['11111111-2222-3333-4444-555555555555']
  }), true);
});
