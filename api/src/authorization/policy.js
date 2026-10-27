const path = require('path');

const POLICY_FILES = {
  tab: path.join(__dirname, '../../config/permissions/tabs.permissions.json'),
  report: path.join(__dirname, '../../config/permissions/reports.permissions.json')
};

function normalise(values) {
  return new Set((values || []).map(value => String(value).trim().toLowerCase()).filter(Boolean));
}

function principalGroups(principal) {
  const groups = new Set();
  for (const value of principal?.groupIds || []) groups.add(String(value).trim().toLowerCase());
  for (const claim of principal?.claims || []) {
    const type = String(claim.typ || claim.type || '').toLowerCase();
    if (type === 'groups' || type.endsWith('/groups') || type.endsWith('/groupsid')) {
      const value = claim.val ?? claim.value;
      if (Array.isArray(value)) value.forEach(item => groups.add(String(item).trim().toLowerCase()));
      else if (value) groups.add(String(value).trim().toLowerCase());
    }
  }
  groups.delete('');
  return groups;
}

function canAccess(principal, policy = {}) {
  if (!principal) return false;
  const roles = normalise(principal.userRoles);
  const identity = String(principal.userDetails || '').trim().toLowerCase();
  const deniedRoles = normalise(policy.deniedRoles);
  if ([...deniedRoles].some(role => roles.has(role))) return false;

  const allowedUsers = normalise(policy.allowedUsers);
  if (identity && allowedUsers.has(identity)) return true;

  const allowedGroups = normalise(policy.entraGroupObjectIds);
  const groups = principalGroups(principal);
  if ([...allowedGroups].some(groupId => groups.has(groupId))) return true;

  const allowedRoles = normalise(policy.allowedRoles);
  if (!allowedRoles.size && !allowedUsers.size && !allowedGroups.size) return false;
  return [...allowedRoles].some(role => roles.has(role));
}

function getPolicy(scope, policyId) {
  const file = POLICY_FILES[scope];
  if (!file) throw new Error(`Unknown permission scope: ${scope}`);
  // The JSON files are deployment configuration and are intentionally kept
  // outside app/ so they are not served as static browser assets.
  const config = require(file);
  return config.policies?.[policyId] || null;
}

function assertAccess(principal, scope, policyId) {
  const policy = getPolicy(scope, policyId);
  if (!policy) return { allowed: false, reason: 'policy-not-found' };
  return canAccess(principal, policy)
    ? { allowed: true, reason: 'allowed' }
    : { allowed: false, reason: 'forbidden' };
}

module.exports = { canAccess, getPolicy, assertAccess, principalGroups };
