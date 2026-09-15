export type OrgRole = 'USER' | 'ADMIN' | 'SUPERADMIN';

export const roleLevel = (role: OrgRole | string) =>
  role === 'USER' ? 0 : role === 'ADMIN' ? 1 : 2;

/** Delete / change-role: strictly higher than the target (peers are forbidden). */
export const canMutateMember = (
  myRole: OrgRole | string,
  targetRole: OrgRole | string
) => roleLevel(myRole) > roleLevel(targetRole);

export const canChangeRole = (args: {
  myRole: OrgRole | string;
  targetRole: OrgRole | string;
  nextRole: string;
}) => {
  if (args.nextRole !== 'USER' && args.nextRole !== 'ADMIN') {
    return false;
  }
  if (args.targetRole === 'SUPERADMIN') {
    return false;
  }
  return canMutateMember(args.myRole, args.targetRole);
};

export const isLastSuperAdmin = (
  superAdminCount: number,
  targetRole: OrgRole | string
) => targetRole === 'SUPERADMIN' && superAdminCount <= 1;

export const canLeaveWorkspace = (args: {
  myRole: OrgRole | string;
  superAdminCount: number;
}) => !isLastSuperAdmin(args.superAdminCount, args.myRole);

export const canTransferOwnership = (args: {
  myRole: OrgRole | string;
  targetRole: OrgRole | string;
  confirm: boolean;
}) =>
  !!args.confirm &&
  args.myRole === 'SUPERADMIN' &&
  args.targetRole === 'ADMIN';
