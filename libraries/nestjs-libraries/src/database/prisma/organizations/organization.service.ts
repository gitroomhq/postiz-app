import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { AddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/add.team.member.dto';
import { AdminAddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/admin.add.team.member.dto';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import dayjs from 'dayjs';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { Organization, Role, ShortLinkPreference, User } from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import { AutopostService } from '@gitroom/nestjs-libraries/database/prisma/autopost/autopost.service';
import { isEmailActivationRequired } from '@gitroom/helpers/utils/activation.required';
import { isBillingEnabled } from '@gitroom/helpers/utils/billing.enabled';
import {
  canChangeRole,
  canLeaveWorkspace,
  canMutateMember,
  canTransferOwnership,
  isLastSuperAdmin,
} from '@gitroom/nestjs-libraries/database/prisma/organizations/team-roles';

@Injectable()
export class OrganizationService {
  private readonly _logger = new Logger(OrganizationService.name);

  constructor(
    private _organizationRepository: OrganizationRepository,
    private _notificationsService: NotificationService
  ) {}
  async createOrgAndUser(
    body: Omit<CreateOrgUserDto, 'providerToken'> & { providerId?: string },
    ip: string,
    userAgent: string
  ) {
    return this._organizationRepository.createOrgAndUser(
      body,
      // Must match the condition /auth/register answers with, or the row says
      // the account needs activating while the response waves it through.
      isEmailActivationRequired() &&
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

  endTrial(orgId: string) {
    return this._organizationRepository.endTrial(orgId);
  }

  addUserToOrg(
    userId: string,
    id: string,
    orgId: string,
    role: 'USER' | 'ADMIN'
  ) {
    return this._organizationRepository.addUserToOrg(userId, id, orgId, role).catch(
      (err) => {
        if (err instanceof Error && err.message === 'EMAIL_ALREADY_IN_ORG') {
          throw new HttpException(
            'A member with this email is already in the workspace',
            409
          );
        }
        throw err;
      }
    );
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
    if (body.email) {
      const existing = await this._organizationRepository.findOrgMemberByEmail(
        org.id,
        body.email
      );
      if (existing) {
        throw new HttpException(
          'A member with this email is already in the workspace',
          409
        );
      }
    }

    const timeLimit = dayjs().add(2, 'day').format('YYYY-MM-DD HH:mm:ss');
    const id = makeId(5);
    // The three fields the invite actually needs, named rather than spread.
    // `{ ...body }` copied whatever else the caller sent: the global
    // ValidationPipe runs with `transform: true` and no `whitelist`, so
    // undeclared keys survive into the DTO instance. This endpoint returns the
    // signed URL in its response even when `sendEmail` is false, which turned
    // it into a way for any org admin to obtain a token signed with
    // `JWT_SECRET` carrying claims of their choosing — and several
    // unauthenticated endpoints in this app authorize on nothing more than
    // "signed with JWT_SECRET". `orgId` and `id` being written after the spread
    // is what kept that from being cross-tenant; that is a narrow margin to
    // rely on.
    const url =
      process.env.FRONTEND_URL +
      `/?org=${AuthService.signJWT({
        email: body.email,
        role: body.role,
        orgId: org.id,
        timeLimit,
        id,
      })}`;
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
    // Self-host without Stripe: every feature via the top sellable tier,
    // whatever Subscription row is left. Same test as the rest of billing.
    const tier = !isBillingEnabled()
      ? 'AGENCY'
      : // @ts-ignore
        org?.subscription?.subscriptionTier || 'FREE';

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
      throw new HttpException('No PostQueen account found for this email', 400);
    }

    if (users.length > 1) {
      throw new HttpException(
        'Multiple accounts exist for this email (different login providers)',
        400
      );
    }

    const [user] = users;

    const duplicateEmail = await this._organizationRepository.findOrgMemberByEmail(
      org.id,
      user.email
    );
    if (duplicateEmail) {
      throw new HttpException(
        'A member with this email is already in the workspace',
        409
      );
    }

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

  async deleteTeamMember(org: Organization, userId: string, callerUserId: string) {
    const userOrgs = await this._organizationRepository.getOrgsByUserId(userId);
    const findOrgToDelete = userOrgs.find((orgUser) => orgUser.id === org.id);
    if (!findOrgToDelete) {
      throw new HttpException('User is not part of this organization', 400);
    }

    // @ts-ignore
    const myRole = org.users[0].role;
    const userRole = findOrgToDelete.users[0].role;

    if (userId === callerUserId) {
      throw new HttpException('Use leave workspace to remove yourself', 400);
    }

    if (!canMutateMember(myRole, userRole)) {
      throw new HttpException(
        'You do not have permission to delete this user',
        403
      );
    }

    const superAdminCount =
      await this._organizationRepository.countSuperAdmins(org.id);
    if (isLastSuperAdmin(superAdminCount, userRole)) {
      throw new HttpException(
        'The last Super Admin cannot be removed',
        400
      );
    }

    return this._organizationRepository.deleteTeamMember(org.id, userId);
  }

  async changeTeamRole(
    org: Organization,
    userId: string,
    role: 'USER' | 'ADMIN'
  ) {
    const membership = await this._organizationRepository.getMembership(
      org.id,
      userId
    );
    if (!membership || membership.disabled || membership.user.deletedAt) {
      throw new HttpException('User is not part of this organization', 400);
    }

    // @ts-ignore
    const myRole = org.users[0].role;
    if (
      !canChangeRole({
        myRole,
        targetRole: membership.role,
        nextRole: role,
      })
    ) {
      throw new HttpException(
        'You do not have permission to change this role',
        403
      );
    }

    return this._organizationRepository.updateMemberRole(
      org.id,
      userId,
      role as Role
    );
  }

  async transferOwnership(
    org: Organization,
    callerUserId: string,
    targetUserId: string,
    confirm: boolean
  ) {
    const target = await this._organizationRepository.getMembership(
      org.id,
      targetUserId
    );
    if (!target || target.disabled || target.user.deletedAt) {
      throw new HttpException('User is not part of this organization', 400);
    }

    // @ts-ignore
    const myRole = org.users[0].role;
    if (
      !canTransferOwnership({
        myRole,
        targetRole: target.role,
        confirm,
      })
    ) {
      throw new HttpException('Ownership can only be transferred to an Admin', 400);
    }

    await this._organizationRepository.transferOwnership(
      org.id,
      callerUserId,
      targetUserId
    );
    return { transferred: true };
  }

  async leaveWorkspace(org: Organization, userId: string) {
    const membership = await this._organizationRepository.getMembership(
      org.id,
      userId
    );
    if (!membership) {
      throw new HttpException('User is not part of this organization', 400);
    }

    const superAdminCount =
      await this._organizationRepository.countSuperAdmins(org.id);
    if (
      !canLeaveWorkspace({
        myRole: membership.role,
        superAdminCount,
      })
    ) {
      throw new HttpException(
        'The last Super Admin cannot leave the workspace',
        400
      );
    }

    return this._organizationRepository.deleteTeamMember(org.id, userId);
  }

  async updateOrganizationName(org: Organization, name: string) {
    // @ts-ignore
    if (org.users[0].role !== 'SUPERADMIN') {
      throw new HttpException('Only a Super Admin can rename the workspace', 403);
    }

    return this._organizationRepository.updateOrganizationName(org.id, name);
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
}
