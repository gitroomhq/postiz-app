import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { HttpException, Injectable } from '@nestjs/common';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { AddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/add.team.member.dto';
import { AdminAddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/admin.add.team.member.dto';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import dayjs from 'dayjs';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { Organization, ShortLinkPreference } from '@prisma/client';
import { AutopostService } from '@gitroom/nestjs-libraries/database/prisma/autopost/autopost.service';

@Injectable()
export class OrganizationService {
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

  async inviteTeamMember(orgId: string, body: AddTeamMemberDto) {
    const timeLimit = dayjs().add(2, 'day').format('YYYY-MM-DD HH:mm:ss');
    const id = makeId(5);
    const url =
      process.env.FRONTEND_URL +
      `/?org=${AuthService.signJWT({ ...body, orgId, timeLimit, id })}`;
    if (body.sendEmail) {
      await this._notificationsService.sendEmail(
        body.email,
        'You have been invited to join an organization',
        `You have been invited to join an organization. Click <a href="${url}">here</a> to join.<br />The link will expire in 2 days.`
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
