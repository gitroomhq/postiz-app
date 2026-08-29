import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { HttpException, Injectable } from '@nestjs/common';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { IntegrationRepository } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.repository';
import { AddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/add.team.member.dto';
import { AdminAddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/admin.add.team.member.dto';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import dayjs from 'dayjs';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { Organization, Role, ShortLinkPreference, User } from '@prisma/client';

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

  async createOrgForUser(userId: string, name: string) {
    const maxOrgs = Number(process.env.MAX_ORGS_PER_USER) || 10;
    const enabledOrgs = (
      await this._organizationRepository.getOrgsByUserId(userId)
    ).filter((item) => !item.users[0].disabled);

    if (enabledOrgs.length >= maxOrgs) {
      throw new HttpException(
        `You can create up to ${maxOrgs} organizations`,
        400
      );
    }

    return this._organizationRepository.createOrgForUser(userId, name);
  }

  async updateOrganizationName(userId: string, orgId: string, name: string) {
    const org = await this.getUserOrgById(userId, orgId);
    if (org.users[0].role !== Role.SUPERADMIN) {
      throw new HttpException(
        'You do not have permission to rename this organization',
        400
      );
    }

    return this._organizationRepository.updateOrganizationName(orgId, name);
  }

  async getOrgToDelete(userId: string, orgId: string) {
    const orgs = await this._organizationRepository.getOrgsByUserId(userId);
    const org = orgs.find((item) => item.id === orgId && !item.users[0].disabled);
    if (!org) {
      throw new HttpException('Organization not found', 400);
    }
    if (org.users[0].role !== Role.SUPERADMIN) {
      throw new HttpException(
        'You do not have permission to delete this organization',
        400
      );
    }

    const enabledOrgs = orgs.filter((item) => !item.users[0].disabled);
    if (enabledOrgs.length === 1) {
      throw new HttpException(
        'You cannot delete your only organization. Delete your account instead',
        400
      );
    }

    const team = await this._organizationRepository.getTeam(org.id);
    if (
      team?.users?.some(
        (member) => member.user.id !== userId && !member.disabled
      )
    ) {
      throw new HttpException(
        'Please remove your team members before deleting this organization',
        400
      );
    }

    return org;
  }

  async deleteOwnedOrganization(orgId: string, userId: string) {
    await this._integrationRepository.deleteIntegrationsForAccount(orgId);
    const deleted =
      await this._organizationRepository.deleteOrganizationIfNotLast(
        orgId,
        userId
      );

    if (!deleted) {
      throw new HttpException(
        'Could not delete the organization, please refresh the page and try again',
        400
      );
    }

    return deleted;
  }

  private async getUserOrgById(userId: string, orgId: string) {
    const orgs = await this._organizationRepository.getOrgsByUserId(userId);
    const org = orgs.find((item) => item.id === orgId && !item.users[0].disabled);
    if (!org) {
      throw new HttpException('Organization not found', 400);
    }

    return org;
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
      throw new Error('User is not part of this organization');
    }

    // @ts-ignore
    const myRole = org.users[0].role;
    const userRole = findOrgToDelete.users[0].role;
    const myLevel = myRole === 'USER' ? 0 : myRole === 'ADMIN' ? 1 : 2;
    const userLevel = userRole === 'USER' ? 0 : userRole === 'ADMIN' ? 1 : 2;

    if (myLevel < userLevel) {
      throw new Error('You do not have permission to delete this user');
    }

    return this._organizationRepository.deleteTeamMember(org.id, userId);
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
