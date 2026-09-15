import {
  PrismaRepository,
  PrismaTransaction,
} from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Provider, Role, ShortLinkPreference } from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import { Injectable } from '@nestjs/common';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { isBillingEnabled } from '@gitroom/helpers/utils/billing.enabled';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';

@Injectable()
export class OrganizationRepository {
  constructor(
    private _organization: PrismaRepository<'organization'>,
    private _userOrg: PrismaRepository<'userOrganization'>,
    private _user: PrismaRepository<'user'>,
    private _transaction: PrismaTransaction
  ) {}

  /**
   * Clears the trial flag without going through Stripe.
   *
   * For an organization Stripe has no trialing subscription for — a founding
   * member, whose entitlement is a local row — this is the only thing that can
   * end the trial. Nothing else writes the flag on this path.
   */
  endTrial(id: string) {
    return this._organization.model.organization.update({
      where: { id },
      data: { isTrailing: false },
    });
  }

  createMaxUser(id: string, name: string, saasName: string, email: string) {
    return this._organization.model.organization.create({
      select: {
        id: true,
        apiKey: true,
      },
      data: {
        name: name ? `${name}###${id}` : `Unnamed User###${id}`,
        apiKey: AuthService.fixedEncryption(makeId(20)),
        isTrailing: false,
        subscription: {
          create: {
            totalChannels: 1000000,
            // Self-host / no-billing bootstrap: top sellable tier (AGENCY).
            subscriptionTier: 'AGENCY',
            isLifetime: true,
            period: 'YEARLY',
          },
        },
        users: {
          create: {
            role: Role.SUPERADMIN,
            user: {
              create: {
                activated: true,
                email: email
                  ? email.split('@').join(`+${saasName}@`)
                  : `${saasName}+` + makeId(10) + '@no-reply.invalid',
                name: name ? `${name}###${id}` : `Unnamed User###${id}`,
                providerName: 'LOCAL',
                password: AuthService.hashPassword(makeId(500)),
                timezone: 0,
              },
            },
          },
        },
      },
    });
  }

  getOrgByApiKey(api: string) {
    return this._organization.model.organization.findFirst({
      where: {
        apiKey: api,
        deletedAt: null,
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
            // The same fields `getOrgsByUserId` selects: this is what an
            // impersonated request carries as `req.org`, and `/user/self`
            // (cancelAt) and `checkCredits` (createdAt) read them from there.
            subscription: {
              select: {
                subscriptionTier: true,
                totalChannels: true,
                isLifetime: true,
                createdAt: true,
                cancelAt: true,
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
        OR: [
          {
            organizationId: {
              contains: name,
            },
          },
          {
            organization: {
              OR: [
                {
                  paymentId: {
                    equals: name,
                  },
                },
                {
                  subscription: {
                    identifier: {
                      equals: name,
                    },
                  },
                },
                {
                  Integration: {
                    some: {
                      id: name,
                    },
                  },
                },
                {
                  post: {
                    some: {
                      id: name,
                    },
                  },
                },
              ],
            },
          },
          {
            user: {
              OR: [
                {
                  name: {
                    contains: name,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: name,
                    mode: 'insensitive',
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
        ],
      },
      select: {
        id: true,
        role: true,
        disabled: true,
        organization: {
          select: {
            id: true,
            name: true,
            paymentId: true,
            deletedAt: true,
            subscription: {
              select: {
                subscriptionTier: true,
                identifier: true,
                isLifetime: true,
                period: true,
                cancelAt: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            activated: true,
            providerName: true,
            deletedAt: true,
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
        deletedAt: null,
        users: {
          some: {
            userId,
          },
        },
      },
      // `auth.middleware.ts:92` falls back to `organization[0]` when the request
      // carries no `showorg`, and without an order Postgres is free to return
      // these in any order it likes. With one organization that never showed;
      // the moment a second one existed here, a signed-in account resolved to
      // the *new, empty* workspace on its own and every screen turned into the
      // checkout paywall. Oldest first makes the default the one the account
      // started with, which is what the fallback was always assumed to mean.
      orderBy: {
        createdAt: 'asc',
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
            cancelAt: true,
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

  getOrgByIdWithSubscription(id: string) {
    return this._organization.model.organization.findUnique({
      where: {
        id,
      },
      include: {
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

  getUsersByEmail(email: string) {
    return this._user.model.user.findMany({
      where: {
        email,
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

    const duplicate = await this.findOrgMemberByEmailOfUser(orgId, userId);
    if (duplicate) {
      throw new Error('EMAIL_ALREADY_IN_ORG');
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

    // Block invites when the org's plan does not include team members.
    // Orgs with no subscription row are left alone (FREE path).
    const subscribedTier =
      checkForSubscription?.subscription?.subscriptionTier;
    if (
      isBillingEnabled() &&
      subscribedTier &&
      !pricing[subscribedTier]?.team_members
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
    mustActivate: boolean,
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
                activated: body.provider !== 'LOCAL' || !mustActivate,
                email: body.email,
                password: body.password
                  ? AuthService.hashPassword(body.password)
                  : '',
                providerName: body.provider,
                providerId: body.providerId || '',
                timezone: 0,
                ip,
                agent: userAgent,
                ...(body.provider !== Provider.LOCAL && body.providerId
                  ? {
                      identities: {
                        create: {
                          provider: body.provider,
                          providerAccountId: body.providerId,
                        },
                      },
                    }
                  : {}),
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

  async setStreak(organizationId: string, type: 'start' | 'end') {
    try {
      await this._organization.model.organization.update({
        where: {
          id: organizationId,
          ...(type === 'start'
            ? {
                streakSince: null,
              }
            : {}),
        },
        data: {
          ...(type === 'end' ? { streakSince: null } : {}),
          ...(type === 'start' ? { streakSince: new Date() } : {}),
        },
      });
    } catch (err) {}
  }

  async getTeam(orgId: string) {
    return this._organization.model.organization.findUnique({
      where: {
        id: orgId,
      },
      select: {
        users: {
          where: {
            disabled: false,
          },
          select: {
            role: true,
            user: {
              select: {
                email: true,
                id: true,
                name: true,
                providerName: true,
                sendSuccessEmails: true,
                sendFailureEmails: true,
                sendStreakEmails: true,
              },
            },
          },
        },
      },
    });
  }

  countSuperAdmins(orgId: string) {
    return this._userOrg.model.userOrganization.count({
      where: {
        organizationId: orgId,
        role: Role.SUPERADMIN,
        disabled: false,
        user: { deletedAt: null },
      },
    });
  }

  getMembership(orgId: string, userId: string) {
    return this._userOrg.model.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            deletedAt: true,
          },
        },
      },
    });
  }

  async findOrgMemberByEmail(orgId: string, email: string) {
    return this._userOrg.model.userOrganization.findFirst({
      where: {
        organizationId: orgId,
        user: {
          deletedAt: null,
          email: {
            equals: email,
            mode: 'insensitive',
          },
        },
      },
    });
  }

  async findOrgMemberByEmailOfUser(orgId: string, userId: string) {
    const user = await this._user.model.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { email: true },
    });
    if (!user?.email) {
      return null;
    }
    return this._userOrg.model.userOrganization.findFirst({
      where: {
        organizationId: orgId,
        userId: { not: userId },
        user: {
          deletedAt: null,
          email: {
            equals: user.email,
            mode: 'insensitive',
          },
        },
      },
    });
  }

  updateMemberRole(orgId: string, userId: string, role: Role) {
    return this._userOrg.model.userOrganization.update({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
      data: { role },
    });
  }

  transferOwnership(orgId: string, fromUserId: string, toUserId: string) {
    return this._transaction.model.$transaction([
      this._userOrg.model.userOrganization.update({
        where: {
          userId_organizationId: {
            userId: toUserId,
            organizationId: orgId,
          },
        },
        data: { role: Role.SUPERADMIN },
      }),
      this._userOrg.model.userOrganization.update({
        where: {
          userId_organizationId: {
            userId: fromUserId,
            organizationId: orgId,
          },
        },
        data: { role: Role.ADMIN },
      }),
    ]);
  }

  updateOrganizationName(orgId: string, name: string) {
    return this._organization.model.organization.update({
      where: { id: orgId },
      data: { name },
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
                sendSuccessEmails: true,
                sendFailureEmails: true,
              },
            },
          },
        },
      },
    });
  }

  deleteOrganization(orgId: string) {
    return this._organization.model.organization.update({
      where: {
        id: orgId,
      },
      data: {
        deletedAt: new Date(),
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

  getShortlinkPreference(orgId: string) {
    return this._organization.model.organization.findUnique({
      where: {
        id: orgId,
      },
      select: {
        shortlink: true,
      },
    });
  }

  updateShortlinkPreference(orgId: string, shortlink: ShortLinkPreference) {
    return this._organization.model.organization.update({
      where: {
        id: orgId,
      },
      data: {
        shortlink,
      },
    });
  }
}
