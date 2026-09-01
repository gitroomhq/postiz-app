import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { HttpException, Injectable } from '@nestjs/common';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { AddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/add.team.member.dto';
import { AdminAddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/admin.add.team.member.dto';
import { UpdateTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/update.team.member.dto';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import dayjs from 'dayjs';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { Organization, Role, ShortLinkPreference, User } from '@prisma/client';
import { AutopostService } from '@gitroom/nestjs-libraries/database/prisma/autopost/autopost.service';
import { IntegrationRepository } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.repository';

// Shared org-role hierarchy used everywhere a caller's role needs to be
// compared against a target member's role (delete/edit team members).
const roleLevel = (role: Role | string) =>
  role === Role.USER ? 0 : role === Role.ADMIN ? 1 : 2;

@Injectable()
export class OrganizationService {
  constructor(
    private _organizationRepository: OrganizationRepository,
    private _notificationsService: NotificationService,
    private _integrationRepository: IntegrationRepository
  ) {}
  async createOrgAndUser(
    body: Omit<CreateOrgUserDto, 'providerToken'> & { providerId?: string },
    ip: string,
    userAgent: string
  ) {
    return this._organizationRepository.createOrgAndUser(
      body,
      this._notificationsService.hasEmailProvider(),
      ip,
      userAgent
    );
  }

  async getCount() {
    return this._organizationRepository.getCount();
  }

  async createMaxUser(id: string, name: string, saasName: string, email: string) {
    return this._organizationRepository.createMaxUser(id, name, saasName, email);
  }

  addUserToOrg(
    userId: string,
    id: string,
    orgId: string,
    role: 'USER' | 'ADMIN'
  ) {
    return this._organizationRepository.addUserToOrg(userId, id, orgId, role);
  }

  getOrgById(id: string) {
    return this._organizationRepository.getOrgById(id);
  }

  getOrgByIdWithSubscription(id: string) {
    return this._organizationRepository.getOrgByIdWithSubscription(id);
  }

  getOrgByApiKey(api: string) {
    return this._organizationRepository.getOrgByApiKey(api);
  }

  async hasSuperAdminUser(orgId: string) {
    return !!(await this._organizationRepository.getSuperAdminUser(orgId));
  }

  getUserOrg(id: string) {
    return this._organizationRepository.getUserOrg(id);
  }

  getOrgsByUserId(userId: string) {
    return this._organizationRepository.getOrgsByUserId(userId);
  }

  updateApiKey(orgId: string) {
    return this._organizationRepository.updateApiKey(orgId);
  }

  getTeam(orgId: string) {
    return this._organizationRepository.getTeam(orgId);
  }

  async setStreak(organizationId: string, type: 'start' | 'end') {
    return this._organizationRepository.setStreak(organizationId, type);
  }

  getOrgByCustomerId(customerId: string) {
    return this._organizationRepository.getOrgByCustomerId(customerId);
  }

  async inviteTeamMember(org: Organization, user: User, body: AddTeamMemberDto) {
    const timeLimit = dayjs().add(2, 'day').format('YYYY-MM-DD HH:mm:ss');
    const id = makeId(5);
    const url =
      process.env.FRONTEND_URL +
      `/?org=${AuthService.signJWT({ ...body, orgId: org.id, timeLimit, id })}`;
    if (body.sendEmail) {
      const inviter = user.name
        ? `${user.name} (${user.email})`
        : user.email;
      await this._notificationsService.sendEmail(
        body.email,
        `${user.name || user.email} invited you to join "${org.name}"`,
        `${inviter} has invited you to join the "${org.name}" team.<br /><a href="${url}">Accept the invitation</a> to get started.<br />The link will expire in 2 days.`
      );
    }
    return { url };
  }

  async addTeamMemberByEmail(org: Organization, body: AdminAddTeamMemberDto) {
    const tier =
      // @ts-ignore
      org?.subscription?.subscriptionTier ||
      (!process.env.STRIPE_PUBLISHABLE_KEY ? 'ULTIMATE' : 'FREE');

    if (!pricing[tier].team_members) {
      throw new HttpException(
        'The organization plan does not include team members',
        400
      );
    }

    const users = await this._organizationRepository.getUsersByEmail(
      body.email
    );
    if (!users.length) {
      throw new HttpException('No Postiz account found for this email', 400);
    }

    if (users.length > 1) {
      throw new HttpException(
        'Multiple accounts exist for this email (different login providers)',
        400
      );
    }

    const [user] = users;

    const userOrgs = await this._organizationRepository.getOrgsByUserId(
      user.id
    );
    if (userOrgs.some((current) => current.id === org.id)) {
      throw new HttpException(
        'User is already a member of this organization',
        400
      );
    }

    const added = await this._organizationRepository.addUserToOrg(
      user.id,
      makeId(5),
      org.id,
      body.role as 'USER' | 'ADMIN'
    );

    if (!added) {
      throw new HttpException(
        'Could not add the user to the organization',
        400
      );
    }

    return { added: true };
  }

  async deleteTeamMember(org: Organization, userId: string) {
    const userOrgs = await this._organizationRepository.getOrgsByUserId(userId);
    const findOrgToDelete = userOrgs.find((orgUser) => orgUser.id === org.id);
    if (!findOrgToDelete) {
      throw new HttpException('User is not part of this organization', 404);
    }

    // @ts-ignore
    const myLevel = roleLevel(org.users[0].role);
    // @ts-ignore
    const userLevel = roleLevel(findOrgToDelete.users[0].role);

    // Strictly greater: also blocks removing a peer (same level) and
    // removing yourself (comparing your own level to itself).
    if (myLevel <= userLevel) {
      throw new HttpException(
        'You do not have permission to delete this user',
        403
      );
    }

    return this._organizationRepository.deleteTeamMember(org.id, userId);
  }

  async updateTeamMember(
    org: Organization,
    actorUserId: string,
    targetUserId: string,
    body: UpdateTeamMemberDto
  ) {
    if (targetUserId === actorUserId) {
      throw new HttpException(
        'Use your personal settings to edit your own name',
        403
      );
    }

    const userOrgs = await this._organizationRepository.getOrgsByUserId(
      targetUserId
    );
    const targetOrg = userOrgs.find((orgUser) => orgUser.id === org.id);
    if (!targetOrg) {
      throw new HttpException('User is not part of this organization', 404);
    }

    // @ts-ignore
    const myLevel = roleLevel(org.users[0].role);
    // @ts-ignore
    const userLevel = roleLevel(targetOrg.users[0].role);

    if (myLevel <= userLevel) {
      throw new HttpException(
        'You do not have permission to edit this user',
        403
      );
    }

    // Only a super admin can change roles, regardless of what the client
    // sends - the DTO already rejects SUPERADMIN as a target role.
    if (body.role && myLevel < 2) {
      throw new HttpException(
        "Only a super admin can change a team member's role",
        403
      );
    }

    return this._organizationRepository.updateTeamMember(org.id, targetUserId, {
      name: body.name,
      role: body.role as Role | undefined,
    });
  }

  disableOrEnableNonSuperAdminUsers(orgId: string, disable: boolean) {
    return this._organizationRepository.disableOrEnableNonSuperAdminUsers(
      orgId,
      disable
    );
  }

  getShortlinkPreference(orgId: string) {
    return this._organizationRepository.getShortlinkPreference(orgId);
  }

  updateShortlinkPreference(orgId: string, shortlink: ShortLinkPreference) {
    return this._organizationRepository.updateShortlinkPreference(
      orgId,
      shortlink
    );
  }

  async createOrgForUser(userId: string, name: string) {
    const cap = process.env.MAX_ORGS_PER_USER
      ? Number(process.env.MAX_ORGS_PER_USER)
      : 10;

    const existing = await this._organizationRepository.getOrgsByUserId(
      userId
    );
    if (existing.length >= cap) {
      throw new HttpException(
        `You can create up to ${cap} organizations`,
        400
      );
    }

    return this._organizationRepository.createOrgForUser(userId, name);
  }

  async renameOrganization(userId: string, orgId: string, name: string) {
    const orgs = await this._organizationRepository.getOrgsByUserId(userId);
    const target = orgs.find((org) => org.id === orgId);

    // Same "ADMIN or SUPERADMIN" bar as every other org-management action
    // (Sections.ADMIN), just resolved against the target org instead of the
    // currently selected one, since @CheckPolicies only sees the latter.
    // Also reject a membership that's disabled in this org even if the
    // caller is authenticated via another, still-enabled org.
    // @ts-ignore
    if (
      !target ||
      target.users[0].disabled ||
      target.users[0].role === Role.USER
    ) {
      throw new HttpException(
        'You do not have permission to rename this organization',
        403
      );
    }

    return this._organizationRepository.renameOrganization(orgId, name);
  }

  // Split in three so the controller can cancel Stripe billing (via
  // PaymentService) between the atomic guard and the destructive cleanup -
  // PaymentService can't be injected here directly, it depends on
  // SubscriptionService which already depends back on OrganizationService.
  async assertCanDeleteOrganization(userId: string, orgId: string) {
    const orgs = await this._organizationRepository.getOrgsByUserId(userId);
    const target = orgs.find((org) => org.id === orgId);

    // @ts-ignore
    if (
      !target ||
      target.users[0].disabled ||
      target.users[0].role === Role.USER
    ) {
      throw new HttpException(
        'You do not have permission to delete this organization',
        403
      );
    }

    const team = await this._organizationRepository.getTeam(orgId);
    if (team?.users?.some((member) => member.user.id !== userId)) {
      throw new HttpException(
        'Please remove your team members before deleting this organization',
        400
      );
    }
  }

  // Atomically confirms this isn't the user's last organization and marks it
  // deleted before any destructive cleanup runs.
  softDeleteOrganizationIfNotLast(userId: string, orgId: string) {
    return this._organizationRepository.deleteOrganizationIfNotLast(
      userId,
      orgId
    );
  }

  restoreOrganization(orgId: string) {
    return this._organizationRepository.restoreOrganization(orgId);
  }

  finalizeOrganizationDeletion(orgId: string) {
    return this._integrationRepository.deleteIntegrationsForAccount(orgId);
  }
}
