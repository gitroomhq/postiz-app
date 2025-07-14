import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Role, SubscriptionTier } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';

@Injectable()
export class OrganizationRepository {
  constructor(
    private _organization: PrismaRepository<'organization'>,
    private _userOrg: PrismaRepository<'userOrganization'>,
    private _user: PrismaRepository<'user'>
  ) {}

  getOrgByApiKey(api: string) {
    return this._organization.model.organization.findFirst({
      where: {
        apiKey: api,
      },
      include: {
        subscription: {
          select: {
            subscriptionTier: true,
            totalChannels: true,
            isLifetime: true,
          },
        },
      },
    });
  }

  getCount() {
    return this._organization.model.organization.count();
  }

  getUserOrg(id: string) {
    return this._userOrg.model.userOrganization.findFirst({
      where: {
        id,
      },
      select: {
        user: true,
        organization: {
          include: {
            users: {
              select: {
                id: true,
                disabled: true,
                role: true,
                userId: true,
              },
            },
            subscription: {
              select: {
                subscriptionTier: true,
                totalChannels: true,
                isLifetime: true,
              },
            },
          },
        },
      },
    });
  }

  getImpersonateUser(name: string) {
    return this._userOrg.model.userOrganization.findMany({
      where: {
        user: {
          OR: [
            {
              name: {
                contains: name,
              },
            },
            {
              email: {
                contains: name,
              },
            },
            {
              id: {
                contains: name,
              },
            },
          ],
        },
      },
      select: {
        id: true,
        organization: {
          select: {
            id: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  updateApiKey(orgId: string) {
    return this._organization.model.organization.update({
      where: {
        id: orgId,
      },
      data: {
        apiKey: AuthService.fixedEncryption(makeId(20)),
      },
    });
  }

  async getOrgsByUserId(userId: string) {
    return this._organization.model.organization.findMany({
      where: {
        users: {
          some: {
            userId,
          },
        },
      },
      include: {
        users: {
          where: {
            userId,
          },
          select: {
            disabled: true,
            role: true,
          },
        },
        subscription: {
          select: {
            subscriptionTier: true,
            totalChannels: true,
            isLifetime: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async getOrgById(id: string) {
    return this._organization.model.organization.findUnique({
      where: {
        id,
      },
    });
  }

  async addUserToOrg(
    userId: string,
    id: string,
    orgId: string,
    role: 'USER' | 'ADMIN'
  ) {
    const checkIfInviteExists = await this._user.model.user.findFirst({
      where: {
        inviteId: id,
      },
    });

    if (checkIfInviteExists) {
      return false;
    }

    const checkForSubscription =
      await this._organization.model.organization.findFirst({
        where: {
          id: orgId,
        },
        select: {
          subscription: true,
        },
      });

    if (
      process.env.STRIPE_PUBLISHABLE_KEY &&
      checkForSubscription?.subscription?.subscriptionTier ===
        SubscriptionTier.STANDARD
    ) {
      return false;
    }

    const create = await this._userOrg.model.userOrganization.create({
      data: {
        role,
        userId,
        organizationId: orgId,
      },
    });

    await this._user.model.user.update({
      where: {
        id: userId,
      },
      data: {
        inviteId: id,
      },
    });

    return create;
  }

  async createOrgAndUser(
    body: Omit<CreateOrgUserDto, 'providerToken'> & { providerId?: string },
    hasEmail: boolean,
    ip: string,
    userAgent: string
  ) {
    return this._organization.model.organization.create({
      data: {
        name: body.company,
        apiKey: AuthService.fixedEncryption(makeId(20)),
        allowTrial: true,
        isTrailing: true,
        users: {
          create: {
            role: Role.SUPERADMIN,
            user: {
              create: {
                activated: body.provider !== 'LOCAL' || !hasEmail,
                email: body.email,
                password: body.password
                  ? AuthService.hashPassword(body.password)
                  : '',
                providerName: body.provider,
                providerId: body.providerId || '',
                timezone: 0,
                ip,
                agent: userAgent,
              },
            },
          },
        },
      },
      select: {
        id: true,
        users: {
          select: {
            user: true,
          },
        },
      },
    });
  }

  getOrgByCustomerId(customerId: string) {
    return this._organization.model.organization.findFirst({
      where: {
        paymentId: customerId,
      },
    });
  }

  async getTeam(orgId: string) {
    return this._organization.model.organization.findUnique({
      where: {
        id: orgId,
      },
      select: {
        users: {
          select: {
            role: true,
            user: {
              select: {
                email: true,
                id: true,
              },
            },
          },
        },
      },
    });
  }

  getAllUsersOrgs(orgId: string) {
    return this._organization.model.organization.findUnique({
      where: {
        id: orgId,
      },
      select: {
        users: {
          select: {
            user: {
              select: {
                email: true,
                id: true,
              },
            },
          },
        },
      },
    });
  }

  async deleteTeamMember(orgId: string, userId: string) {
    return this._userOrg.model.userOrganization.delete({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
    });
  }

  disableOrEnableNonSuperAdminUsers(orgId: string, disable: boolean) {
    return this._userOrg.model.userOrganization.updateMany({
      where: {
        organizationId: orgId,
        role: {
          not: Role.SUPERADMIN,
        },
      },
      data: {
        disabled: disable,
      },
    });
  }
}
