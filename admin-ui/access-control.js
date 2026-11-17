const { readAccessControl, writeAccessControl } = require('./db');

const ROLE_PERMISSIONS = {
  owner: ['*'],
  admin: [
    'workspace.view', 'workspace.manage', 'channels.view', 'channels.manage',
    'posts.view', 'posts.create', 'posts.edit', 'posts.publish', 'analytics.view',
    'team.view', 'team.manage', 'ai.generate', 'brands.view', 'brands.manage', 'analytics.view', 'approvals.view', 'approvals.manage', 'growth.view',
  ],
  editor: ['workspace.view', 'channels.view', 'posts.view', 'posts.create', 'posts.edit', 'posts.publish', 'ai.generate', 'brands.view', 'approvals.view', 'approvals.manage', 'growth.view'],
  analyst: ['workspace.view', 'channels.view', 'posts.view', 'analytics.view', 'brands.view', 'approvals.view', 'growth.view'],
  viewer: ['workspace.view', 'channels.view', 'posts.view', 'brands.view'],
};

const ROLE_LABELS = {
  owner: 'Owner', admin: 'Admin', editor: 'Editor', analyst: 'Analyst', viewer: 'Viewer',
};

function normalEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getPermissions(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer;
}

function can(member, permission) {
  const permissions = getPermissions(member?.role);
  return permissions.includes('*') || permissions.includes(permission);
}

function findMember(data, user) {
  const email = normalEmail(user?.email);
  return data.members.find((member) =>
    (user?.id && member.postizUserId === user.id) ||
    (email && normalEmail(member.email) === email)
  );
}


const WORKSPACE_TENANT = '_workspace';

function memberTenantIds(member) {
  return Array.isArray(member?.tenantIds) ? member.tenantIds.filter(Boolean) : [];
}

function canAccessTenant(member, tenantId) {
  const ids = memberTenantIds(member);
  const id = tenantId || WORKSPACE_TENANT;
  if (!ids.length) {
    if (member?.role === 'owner') return true;
    return id === WORKSPACE_TENANT;
  }
  return ids.includes(id);
}

function publicMember(member) {
  return {
    id: member.id,
    email: member.email,
    name: member.name || member.email,
    postizUserId: member.postizUserId || null,
    role: member.role,
    roleLabel: ROLE_LABELS[member.role] || ROLE_LABELS.viewer,
    channelIds: Array.isArray(member.channelIds) ? member.channelIds : [],
    tenantIds: Array.isArray(member.tenantIds) ? member.tenantIds : [],
    active: member.active !== false,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}

function bootstrapOrResolve(user) {
  const data = readAccessControl();
  let member = findMember(data, user);

  // The first authenticated Postiz account initializes the local workspace safely as owner.
  if (!member && data.members.length === 0 && user?.email) {
    member = {
      id: `member_${Date.now()}`,
      email: normalEmail(user.email),
      name: user.name || user.email,
      postizUserId: user.id || null,
      role: 'owner',
      channelIds: [],
      tenantIds: [],
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.members.push(member);
    writeAccessControl(data);
  }

  if (member && user?.id && !member.postizUserId) {
    member.postizUserId = user.id;
    member.name = user.name || member.name;
    member.updatedAt = new Date().toISOString();
    writeAccessControl(data);
  }

  return member ? publicMember(member) : null;
}

function updateMembers(mutator) {
  const data = readAccessControl();
  mutator(data.members);
  return writeAccessControl(data);
}

module.exports = {
  ROLE_PERMISSIONS,
  ROLE_LABELS,
  WORKSPACE_TENANT,
  can,
  getPermissions,
  publicMember,
  bootstrapOrResolve,
  updateMembers,
  normalEmail,
  memberTenantIds,
  canAccessTenant,
};
